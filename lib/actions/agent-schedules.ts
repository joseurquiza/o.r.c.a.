"use server"

import { createClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { computeNextRunAt } from "@/lib/scheduling"

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
