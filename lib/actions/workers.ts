"use server"

import { createClient } from "@/lib/supabase/server"
import { getCurrentOrgId } from "@/lib/orgs"
import { revalidatePath } from "next/cache"

export type WorkerTemplate = "support" | "sdr" | "onboarding" | "custom"

export interface Worker {
  id: string
  name: string
  template: string | null
  job_description: string
  system_prompt: string | null
  status: "active" | "paused" | "archived"
  connection_ids: string[]
  tool_permissions: Record<string, "approve" | "auto" | "deny">
  schedule_enabled: boolean
  schedule_cron: string | null
  schedule_timezone: string
  last_run_at: string | null
  next_run_at: string | null
  total_runs: number
  total_actions: number
  total_approvals_pending: number
  created_at: string
}

const TEMPLATES: Record<WorkerTemplate, Partial<Worker> & { defaultName: string; recommendedTools: string[] }> = {
  support: {
    defaultName: "Support Worker",
    job_description:
      "Triage incoming customer support emails, draft empathetic replies grounded in our help docs, label and route messages, and escalate angry or VIP customers to a human.",
    system_prompt:
      "You are a senior customer support agent. You read each new customer email carefully, identify intent and sentiment, and propose a reply or action. You NEVER send anything externally without operator approval. Cite specific lines from the email when reasoning. If sentiment is negative, mark for escalation.",
    tool_permissions: {
      read_inbox: "auto",
      read_email: "auto",
      label_email: "auto",
      draft_reply: "auto",
      send_email: "approve",
      escalate: "approve",
    },
    recommendedTools: ["gmail"],
  },
  sdr: {
    defaultName: "Sales SDR Worker",
    job_description:
      "Research inbound leads, draft personalized outreach grounded in their company and role, log activities to the CRM, and book meetings.",
    system_prompt:
      "You are an outbound SDR. Research the lead before drafting any message. Personalize every line. Never send outreach without operator approval.",
    tool_permissions: {
      read_inbox: "auto",
      send_email: "approve",
      log_activity: "approve",
    },
    recommendedTools: ["gmail", "hubspot"],
  },
  onboarding: {
    defaultName: "Onboarding Worker",
    job_description:
      "Welcome new signups, send the right onboarding email at the right step, follow up after N days if they stall, and notify the team when someone is stuck.",
    system_prompt:
      "You are an onboarding specialist. Send the right message at the right step. Never spam.",
    tool_permissions: {
      read_inbox: "auto",
      send_email: "approve",
      post_message: "approve",
    },
    recommendedTools: ["gmail", "slack"],
  },
  custom: {
    defaultName: "New Worker",
    job_description: "",
    system_prompt: "",
    tool_permissions: {},
    recommendedTools: [],
  },
}

export async function getWorkerTemplates() {
  return Object.entries(TEMPLATES).map(([id, t]) => ({
    id: id as WorkerTemplate,
    name: t.defaultName,
    job_description: t.job_description,
    recommendedTools: t.recommendedTools,
  }))
}

export async function getWorkers(): Promise<Worker[]> {
  const supabase = await createClient()
  const orgId = await getCurrentOrgId()
  const { data, error } = await supabase
    .from("workers")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
  if (error) {
    console.error("[v0] getWorkers error:", error)
    return []
  }
  return (data as Worker[]) || []
}

export async function getWorker(id: string): Promise<Worker | null> {
  const supabase = await createClient()
  const orgId = await getCurrentOrgId()
  const { data, error } = await supabase
    .from("workers")
    .select("*")
    .eq("id", id)
    .eq("org_id", orgId)
    .single()
  if (error) return null
  return data as Worker
}

export async function createWorker(input: {
  name?: string
  template: WorkerTemplate
  job_description?: string
  connection_ids?: string[]
}) {
  const supabase = await createClient()
  const orgId = await getCurrentOrgId()
  const tpl = TEMPLATES[input.template]

  const { data, error } = await supabase
    .from("workers")
    .insert({
      org_id: orgId,
      name: input.name?.trim() || tpl.defaultName,
      template: input.template,
      job_description: input.job_description?.trim() || tpl.job_description || "",
      system_prompt: tpl.system_prompt,
      tool_permissions: tpl.tool_permissions || {},
      connection_ids: input.connection_ids || [],
      status: "paused",
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath("/workers")
  return data as Worker
}

export async function updateWorker(id: string, patch: Partial<Worker>) {
  const supabase = await createClient()
  const orgId = await getCurrentOrgId()
  const { data, error } = await supabase
    .from("workers")
    .update(patch)
    .eq("id", id)
    .eq("org_id", orgId)
    .select()
    .single()
  if (error) throw new Error(error.message)
  revalidatePath("/workers")
  revalidatePath(`/workers/${id}`)
  return data as Worker
}

export async function setWorkerStatus(id: string, status: "active" | "paused" | "archived") {
  return updateWorker(id, { status })
}

export async function deleteWorker(id: string) {
  const supabase = await createClient()
  const orgId = await getCurrentOrgId()
  const { error } = await supabase.from("workers").delete().eq("id", id).eq("org_id", orgId)
  if (error) throw new Error(error.message)
  revalidatePath("/workers")
  return { success: true }
}

/**
 * Promote a store app into a per-user worker instance for the current org.
 * Pulls the worker template from the app's current_version manifest:
 *   manifest.worker = { name?, system_prompt?, job_description?, tool_permissions?, schedule_cron?, schedule_timezone? }
 *
 * Idempotent: if a worker already exists in this org for this app, returns it
 * instead of creating a duplicate.
 */
export async function promoteAppToWorker(appId: string): Promise<
  | { success: true; workerId: string; created: boolean }
  | { success: false; error: string }
> {
  if (!appId) return { success: false, error: "Missing app id" }
  const supabase = await createClient()
  const orgId = await getCurrentOrgId()

  // Existing worker for this app in this org?
  const { data: existing } = await supabase
    .from("workers")
    .select("id")
    .eq("org_id", orgId)
    .eq("source_app_id", appId)
    .maybeSingle()
  if (existing) {
    return { success: true, workerId: (existing as { id: string }).id, created: false }
  }

  // Pull app + current version manifest
  const { data: app, error: appErr } = await supabase
    .from("store_apps")
    .select("id, name, tagline, current_version_id, status")
    .eq("id", appId)
    .maybeSingle()
  if (appErr || !app) return { success: false, error: "App not found" }
  const a = app as {
    id: string
    name: string
    tagline: string | null
    current_version_id: string | null
    status: string
  }
  if (a.status !== "live") return { success: false, error: "App is not available" }

  let manifest: Record<string, unknown> = {}
  let submissionId: string | null = null
  if (a.current_version_id) {
    const { data: v } = await supabase
      .from("store_app_versions")
      .select("manifest, submission_id")
      .eq("id", a.current_version_id)
      .maybeSingle()
    if (v) {
      manifest = ((v as { manifest: Record<string, unknown> | null }).manifest ?? {}) as Record<string, unknown>
      submissionId = (v as { submission_id: string | null }).submission_id ?? null
    }
  }

  const w = (manifest.worker ?? {}) as {
    name?: string
    system_prompt?: string
    job_description?: string
    tool_permissions?: Record<string, "approve" | "auto" | "deny">
    schedule_cron?: string
    schedule_timezone?: string
    template?: string
  }

  const { data: created, error: insertErr } = await supabase
    .from("workers")
    .insert({
      org_id: orgId,
      name: w.name?.trim() || a.name,
      template: w.template || "custom",
      job_description: w.job_description?.trim() || a.tagline || "",
      system_prompt: w.system_prompt ?? null,
      tool_permissions: w.tool_permissions ?? {},
      connection_ids: [],
      status: "paused",
      schedule_enabled: !!w.schedule_cron,
      schedule_cron: w.schedule_cron ?? null,
      schedule_timezone: w.schedule_timezone ?? "UTC",
      source_app_id: a.id,
      source_app_version_id: a.current_version_id,
      source_submission_id: submissionId,
    })
    .select("id")
    .single()

  if (insertErr || !created) {
    return { success: false, error: insertErr?.message || "Could not create worker" }
  }

  revalidatePath("/workers")
  return { success: true, workerId: (created as { id: string }).id, created: true }
}
