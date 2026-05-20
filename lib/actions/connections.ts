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

// Re-exported via lib/connections-catalog.ts (cannot live here: "use server" files
// can only export async functions).

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
