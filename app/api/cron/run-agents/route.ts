import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { computeNextRunAt } from "@/lib/actions/agent-schedules"
import { runEmailAnalysis } from "@/lib/actions/email-agent"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  // Vercel cron sends Authorization: Bearer ${CRON_SECRET} when set.
  // We accept either no secret configured, or matching secret.
  const authHeader = request.headers.get("authorization")
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })

  const nowIso = new Date().toISOString()
  const { data: dueSchedules, error } = await supabase
    .from("agent_schedules")
    .select("*")
    .eq("enabled", true)
    .lte("next_run_at", nowIso)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results: Array<{ agent_type: string; agent_ref: string; status: string; error?: string }> = []

  for (const schedule of dueSchedules || []) {
    let status = "success"
    let errorMessage: string | null = null

    try {
      if (schedule.agent_type === "email") {
        const result = await runEmailAnalysis(schedule.agent_ref)
        if (!result.success) {
          status = "error"
          errorMessage = result.error || "Unknown error"
        }
      } else {
        status = "skipped"
        errorMessage = `Unknown agent_type: ${schedule.agent_type}`
      }
    } catch (e) {
      status = "error"
      errorMessage = e instanceof Error ? e.message : "Unknown error"
    }

    const nextRun = computeNextRunAt(schedule.run_time, schedule.timezone).toISOString()
    await supabase
      .from("agent_schedules")
      .update({
        last_run_at: nowIso,
        next_run_at: nextRun,
        last_status: status,
        last_error: errorMessage,
      })
      .eq("id", schedule.id)

    results.push({
      agent_type: schedule.agent_type,
      agent_ref: schedule.agent_ref,
      status,
      ...(errorMessage ? { error: errorMessage } : {}),
    })
  }

  return NextResponse.json({ ran: results.length, results })
}
