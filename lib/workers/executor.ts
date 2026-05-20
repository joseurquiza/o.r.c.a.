"use server"

import { createClient } from "@/lib/supabase/server"
import { GmailClient } from "@/lib/gmail-client"

interface ExecuteParams {
  orgId: string
  workerId: string
  actionType: string
  payload: any
  approvalId?: string
}

/**
 * Execute an action that has been approved (or auto-approved) by an operator.
 * This is the only place where worker output reaches the outside world.
 */
export async function executeApprovedAction(params: ExecuteParams): Promise<any> {
  const { orgId, actionType, payload } = params

  switch (actionType) {
    case "send_email":
      return executeSendEmail(orgId, payload)
    case "label_email":
      return executeLabelEmail(orgId, payload)
    case "draft_reply":
      // drafting is internal — we just acknowledge
      return { drafted: true }
    case "escalate":
      return { escalated: true, reason: payload?.reason }
    default:
      throw new Error(`Unknown action_type: ${actionType}`)
  }
}

async function getGmailClient(orgId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("connections")
    .select("id, access_token, refresh_token")
    .eq("org_id", orgId)
    .eq("provider", "gmail")
    .eq("status", "active")
    .limit(1)
    .single()
  if (error || !data) throw new Error("No active Gmail connection for org")
  return new GmailClient(data.access_token!, data.refresh_token!, data.id)
}

async function executeSendEmail(orgId: string, payload: { to: string; subject: string; body: string; threadId?: string }) {
  const client = await getGmailClient(orgId)

  // Build raw RFC 2822 message
  const message = [
    `To: ${payload.to}`,
    `Subject: ${payload.subject}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    "",
    payload.body,
  ].join("\r\n")

  const raw = Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")

  // We need to call Gmail's sendMessage; expose via a small inline fetch
  // (GmailClient currently exposes only read methods; we add minimal send here).
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${(client as any).accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      raw,
      ...(payload.threadId ? { threadId: payload.threadId } : {}),
    }),
  })
  if (!res.ok) throw new Error(`Gmail send failed: ${await res.text()}`)
  return res.json()
}

async function executeLabelEmail(orgId: string, payload: { messageId: string; addLabelIds?: string[]; removeLabelIds?: string[] }) {
  const client = await getGmailClient(orgId)
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${payload.messageId}/modify`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${(client as any).accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        addLabelIds: payload.addLabelIds || [],
        removeLabelIds: payload.removeLabelIds || [],
      }),
    },
  )
  if (!res.ok) throw new Error(`Gmail label failed: ${await res.text()}`)
  return res.json()
}
