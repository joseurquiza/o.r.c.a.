import { type NextRequest, NextResponse } from "next/server"
import { authenticateAgentRequest } from "@/lib/agents/auth"
import { createAdminClient } from "@/lib/supabase/admin"

// GET/DELETE a single agent. Requires either:
//  - the dashboard user (Supabase session) with matching org_id, OR
//  - the agent's own per-agent secret (extension polling for itself).
export async function GET(request: NextRequest, { params }: { params: { agentId: string } }) {
  const { agentId } = params
  const ctx = await authenticateAgentRequest(request, { agentId })
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()
  const { data: agent, error } = await admin
    .from("remote_agents")
    .select("agent_id, name, description, status, current_url, last_seen, org_id, created_at")
    .eq("agent_id", agentId)
    .maybeSingle()

  if (error || !agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 })
  if (agent.org_id !== ctx.orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  // Don't leak org_id back to the extension.
  const { org_id, ...safe } = agent
  return NextResponse.json({ agent: safe })
}

export async function DELETE(request: NextRequest, { params }: { params: { agentId: string } }) {
  const { agentId } = params
  const ctx = await authenticateAgentRequest(request, { agentId })
  if (!ctx || !ctx.userId) {
    // Only signed-in users may delete; extension cannot delete itself.
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from("remote_agents")
    .delete()
    .eq("agent_id", agentId)
    .eq("org_id", ctx.orgId)
  if (error) return NextResponse.json({ error: "Failed to delete agent" }, { status: 500 })
  return NextResponse.json({ success: true })
}
