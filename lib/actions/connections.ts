"use server"

import { createClient } from "@/lib/supabase/server"
import { getCurrentOrgId } from "@/lib/orgs"
import { revalidatePath } from "next/cache"

export interface Connection {
  id: string
  provider: string
  account_email: string | null
  account_name: string | null
  account_picture: string | null
  status: string
  last_error: string | null
  connected_at: string
  scopes: string[] | null
}

export async function getConnections(): Promise<Connection[]> {
  const supabase = await createClient()
  const orgId = await getCurrentOrgId()

  const { data, error } = await supabase
    .from("connections")
    .select("id, provider, account_email, account_name, account_picture, status, last_error, connected_at, scopes")
    .eq("org_id", orgId)
    .order("connected_at", { ascending: false })

  if (error) {
    console.error("[v0] getConnections error:", error)
    return []
  }
  return data || []
}

export async function disconnectConnection(connectionId: string) {
  const supabase = await createClient()
  const orgId = await getCurrentOrgId()

  const { error } = await supabase
    .from("connections")
    .delete()
    .eq("id", connectionId)
    .eq("org_id", orgId)

  if (error) throw new Error(error.message)
  revalidatePath("/connections")
  return { success: true }
}

/**
 * Provider catalog: what can be connected, and what each provides.
 * Status = 'available' (we have an OAuth flow) | 'soon' (placeholder)
 */
export const PROVIDER_CATALOG = [
  {
    id: "gmail",
    name: "Gmail",
    description: "Read inbox, draft replies, send email, manage labels",
    tools: ["read_inbox", "read_email", "draft_reply", "send_email", "label_email"],
    connectUrl: "/api/gmail/connect",
    status: "available" as const,
  },
  {
    id: "slack",
    name: "Slack",
    description: "Read channels, post messages, DM teammates, manage threads",
    tools: ["read_channel", "post_message", "send_dm"],
    connectUrl: null,
    status: "soon" as const,
  },
  {
    id: "notion",
    name: "Notion",
    description: "Search, read, and append to pages and databases",
    tools: ["search_pages", "read_page", "append_block", "create_page"],
    connectUrl: null,
    status: "soon" as const,
  },
  {
    id: "zendesk",
    name: "Zendesk",
    description: "Read tickets, reply to customers, set priorities, escalate",
    tools: ["read_tickets", "reply_ticket", "set_priority", "escalate"],
    connectUrl: null,
    status: "soon" as const,
  },
  {
    id: "linear",
    name: "Linear",
    description: "Create issues, update status, comment, assign",
    tools: ["create_issue", "update_issue", "add_comment"],
    connectUrl: null,
    status: "soon" as const,
  },
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Read/write contacts, deals, log activities",
    tools: ["read_contact", "update_contact", "log_activity", "create_deal"],
    connectUrl: null,
    status: "soon" as const,
  },
]
