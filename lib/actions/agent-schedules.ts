"use server"

import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

const getAdminClient = () =>
  createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })

export interface AgentSchedule {
  id: string
  agent_type: string
  agent_ref: string
  enabled: boolean
  run_time: string
  timezone: string
  last_run_at: string | null
  next_run_at: string | null
  last_status: string | null
  last_error: string | null
}

// Compute the next UTC timestamp at which "HH:mm" in `timezone` will occur.
export function computeNextRunAt(runTime: string, timezone: string): Date {
  const [hh, mm] = runTime.split(":").map(Number)
  const now = new Date()

  // Get current time in the target timezone
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  const parts = fmt.formatToParts(now)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value || 0)

  const tzYear = get("year")
  const tzMonth = get("month")
  const tzDay = get("day")
  const tzHour = get("hour") === 24 ? 0 : get("hour")
  const tzMinute = get("minute")

  // Determine if today's run-time is still in future for this tz
  const todayMins = tzHour * 60 + tzMinute
  const targetMins = hh * 60 + mm

  // Build a UTC date that represents (tzYear-tzMonth-tzDay HH:mm) in the target tz
  // by computing offset between tz wall clock and UTC right now.
  const utcNow = now.getTime()
  const tzWallNowAsUtc = Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute)
  const tzOffsetMs = tzWallNowAsUtc - utcNow // positive if tz ahead of UTC

  const dayOffset = todayMins < targetMins ? 0 : 1
  const targetWallUtc = Date.UTC(tzYear, tzMonth - 1, tzDay + dayOffset, hh, mm)
  return new Date(targetWallUtc - tzOffsetMs)
}

export async function getSchedule(agentType: string, agentRef: string) {
  const supabase = getAdminClient()
  const { data } = await supabase
    .from("agent_schedules")
    .select("*")
    .eq("agent_type", agentType)
    .eq("agent_ref", agentRef)
    .maybeSingle()
  return data as AgentSchedule | null
}

export async function upsertSchedule(input: {
  agentType: string
  agentRef: string
  enabled: boolean
  runTime: string
  timezone: string
}) {
  const supabase = getAdminClient()
  const nextRun = input.enabled ? computeNextRunAt(input.runTime, input.timezone).toISOString() : null

  const { error } = await supabase
    .from("agent_schedules")
    .upsert(
      {
        agent_type: input.agentType,
        agent_ref: input.agentRef,
        enabled: input.enabled,
        run_time: input.runTime,
        timezone: input.timezone,
        next_run_at: nextRun,
      },
      { onConflict: "agent_type,agent_ref" },
    )

  if (error) return { success: false, error: error.message }
  revalidatePath("/agents/email")
  revalidatePath("/agents")
  revalidatePath("/")
  return { success: true }
}

export async function getAllSchedules() {
  const supabase = getAdminClient()
  const { data } = await supabase
    .from("agent_schedules")
    .select("*")
    .order("next_run_at", { ascending: true, nullsFirst: false })
  return (data || []) as AgentSchedule[]
}
