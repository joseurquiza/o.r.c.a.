"use server"

import { createClient } from "@/lib/supabase/server"
import { getCurrentOrgId } from "@/lib/orgs"
import { revalidatePath } from "next/cache"
import { executeApprovedAction } from "@/lib/workers/executor"

export interface Approval {
  id: string
  worker_id: string
  action_type: string
  action_summary: string | null
  action_payload: any
  reasoning: string | null
  context: any
  confidence: number | null
  status: "pending" | "approved" | "edited" | "denied" | "expired" | "auto_approved"
  reviewed_by: string | null
  reviewed_at: string | null
  review_notes: string | null
  edited_payload: any | null
  executed_at: string | null
  execution_result: any | null
  execution_error: string | null
  expires_at: string | null
  created_at: string
  workers?: { id: string; name: string; template: string | null }
}

export async function getPendingApprovals(): Promise<Approval[]> {
  const supabase = await createClient()
  const orgId = await getCurrentOrgId()
  const { data, error } = await supabase
    .from("approvals")
    .select("*, workers(id, name, template)")
    .eq("org_id", orgId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
  if (error) {
    console.error("[v0] getPendingApprovals error:", error)
    return []
  }
  return (data as Approval[]) || []
}

export async function getRecentApprovals(limit = 50): Promise<Approval[]> {
  const supabase = await createClient()
  const orgId = await getCurrentOrgId()
  const { data, error } = await supabase
    .from("approvals")
    .select("*, workers(id, name, template)")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) return []
  return (data as Approval[]) || []
}

export async function approveAction(approvalId: string, opts?: { editedPayload?: any; notes?: string }) {
  const supabase = await createClient()
  const orgId = await getCurrentOrgId()

  // Fetch approval first
  const { data: approval, error: fetchError } = await supabase
    .from("approvals")
    .select("*")
    .eq("id", approvalId)
    .eq("org_id", orgId)
    .single()
  if (fetchError || !approval) throw new Error("Approval not found")

  const payload = opts?.editedPayload ?? approval.action_payload
  const status = opts?.editedPayload ? "edited" : "approved"

  // Mark approved
  await supabase
    .from("approvals")
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: "operator",
      review_notes: opts?.notes,
      edited_payload: opts?.editedPayload ?? null,
    })
    .eq("id", approvalId)

  // Execute the action
  try {
    const result = await executeApprovedAction({
      orgId,
      workerId: approval.worker_id,
      actionType: approval.action_type,
      payload,
      approvalId,
    })
    await supabase
      .from("approvals")
      .update({
        executed_at: new Date().toISOString(),
        execution_result: result,
      })
      .eq("id", approvalId)

    await supabase.from("audit_log").insert({
      org_id: orgId,
      worker_id: approval.worker_id,
      approval_id: approvalId,
      event_type: "action_executed",
      tool_name: approval.action_type,
      input_summary: approval.action_summary,
      output_summary: typeof result === "string" ? result : JSON.stringify(result).slice(0, 500),
    })
  } catch (e: any) {
    await supabase
      .from("approvals")
      .update({
        execution_error: e.message,
      })
      .eq("id", approvalId)

    await supabase.from("audit_log").insert({
      org_id: orgId,
      worker_id: approval.worker_id,
      approval_id: approvalId,
      event_type: "error",
      tool_name: approval.action_type,
      output_summary: e.message,
    })
    throw e
  }

  revalidatePath("/inbox")
  revalidatePath("/")
  return { success: true }
}

export async function denyAction(approvalId: string, notes?: string) {
  const supabase = await createClient()
  const orgId = await getCurrentOrgId()

  const { data: approval } = await supabase
    .from("approvals")
    .select("worker_id, action_type, action_summary")
    .eq("id", approvalId)
    .eq("org_id", orgId)
    .single()

  await supabase
    .from("approvals")
    .update({
      status: "denied",
      reviewed_at: new Date().toISOString(),
      reviewed_by: "operator",
      review_notes: notes,
    })
    .eq("id", approvalId)
    .eq("org_id", orgId)

  if (approval) {
    await supabase.from("audit_log").insert({
      org_id: orgId,
      worker_id: approval.worker_id,
      approval_id: approvalId,
      event_type: "action_denied",
      tool_name: approval.action_type,
      input_summary: approval.action_summary,
      output_summary: notes,
    })
  }

  revalidatePath("/inbox")
  return { success: true }
}

export async function getPendingApprovalsCount() {
  const supabase = await createClient()
  const orgId = await getCurrentOrgId()
  const { count } = await supabase
    .from("approvals")
    .select("*", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("status", "pending")
  return count ?? 0
}
