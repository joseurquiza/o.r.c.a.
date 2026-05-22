import { type NextRequest, NextResponse } from "next/server"
import { authenticateAgentRequest } from "@/lib/agents/auth"
import { createAdminClient } from "@/lib/supabase/admin"

// POST: queue a command for an agent. Only the signed-in dashboard user may issue.
// GET:  agent polls for its own pending commands. Auth is the per-agent secret OR session.
export async function POST(request: NextRequest, { params }: { params: { agentId: string } }) {
  const { agentId } = params
  const ctx = await authenticateAgentRequest(request, { agentId })
  if (!ctx || !ctx.userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 })
  }

  const admin = createAdminClient()
  // Verify the agent belongs to the caller's org before queuing
  const { data: agent } = await admin
    .from("remote_agents")
    .select("agent_id, org_id")
    .eq("agent_id", agentId)
    .maybeSingle()
  if (!agent || agent.org_id !== ctx.orgId) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const { data, error } = await admin
    .from("remote_agent_commands")
    .insert({
      agent_id: agentId,
      command_type: body.type,
      command_data: body,
      status: "pending",
    })
    .select("id")
    .single()

  if (error) {
    return NextResponse.json({ success: false, error: "Failed to store command" }, { status: 500 })
  }
  return NextResponse.json({ success: true, commandId: data.id })
}

export async function GET(request: NextRequest, { params }: { params: { agentId: string } }) {
  const { agentId } = params
  const ctx = await authenticateAgentRequest(request, { agentId })
  if (!ctx) return NextResponse.json({ commands: [], error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()
  const { data: agent } = await admin
    .from("remote_agents")
    .select("agent_id, org_id")
    .eq("agent_id", agentId)
    .maybeSingle()
  if (!agent || agent.org_id !== ctx.orgId) {
    return NextResponse.json({ commands: [], error: "Forbidden" }, { status: 403 })
  }

  const { data: commands, error } = await admin
    .from("remote_agent_commands")
    .select("id, command_data")
    .eq("agent_id", agentId)
    .eq("status", "pending")
    .order("created_at", { ascending: true })

  if (error) {
    return NextResponse.json({ commands: [], error: "Failed to retrieve commands" }, { status: 500 })
  }

  if (commands && commands.length > 0) {
    const ids = commands.map((c) => c.id)
    await admin.from("remote_agent_commands").update({ status: "delivered" }).in("id", ids)
  }

  return NextResponse.json({
    commands: commands?.map((c) => c.command_data) ?? [],
    timestamp: new Date().toISOString(),
  })
}
