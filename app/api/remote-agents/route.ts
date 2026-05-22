import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// List remote agents for the authenticated user's org.
// Session-only: the dashboard UI calls this. Extension does not.
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle()
  if (!membership?.org_id) return NextResponse.json({ agents: [] })

  const { data: agents, error } = await supabase
    .from("remote_agents")
    .select("agent_id, name, description, status, current_url, last_seen, created_at")
    .eq("org_id", membership.org_id)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 })
  }
  return NextResponse.json({ agents: agents ?? [] })
}
