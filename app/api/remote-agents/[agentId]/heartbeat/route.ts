import { type NextRequest, NextResponse } from "next/server"
import { authenticateAgentRequest } from "@/lib/agents/auth"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest, { params }: { params: { agentId: string } }) {
  const { agentId } = params
  const ctx = await authenticateAgentRequest(request, { agentId })
  if (!ctx) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  let body: { status?: string; currentUrl?: string }
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from("remote_agents")
    .update({
      status: typeof body.status === "string" ? body.status : "active",
      current_url: typeof body.currentUrl === "string" ? body.currentUrl : null,
      last_seen: new Date().toISOString(),
    })
    .eq("agent_id", agentId)
    .eq("org_id", ctx.orgId)

  if (error) {
    return NextResponse.json({ success: false, error: "Failed to update heartbeat" }, { status: 500 })
  }
  return NextResponse.json({ success: true, timestamp: new Date().toISOString() })
}
