import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAgentSecret } from "@/lib/crypto/tokens"

// Called by the browser extension on first run with its agentId + agent_secret.
// We verify the secret matches the stored hash before flipping the agent to active.
export async function POST(request: NextRequest) {
  let body: { agentId?: string; userAgent?: string; currentUrl?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const { agentId, userAgent, currentUrl } = body
  if (!agentId) {
    return NextResponse.json({ error: "Agent ID is required" }, { status: 400 })
  }

  const headerSecret =
    request.headers.get("x-agent-secret") ??
    (request.headers.get("authorization")?.startsWith("Bearer ")
      ? request.headers.get("authorization")!.slice(7).trim()
      : null)
  if (!headerSecret) return NextResponse.json({ error: "Missing agent secret" }, { status: 401 })

  const admin = createAdminClient()
  const { data: agent } = await admin
    .from("remote_agents")
    .select("agent_id, agent_secret_hash")
    .eq("agent_id", agentId)
    .maybeSingle()

  if (!agent || !agent.agent_secret_hash || !verifyAgentSecret(headerSecret, agent.agent_secret_hash)) {
    return NextResponse.json({ error: "Invalid agent credentials" }, { status: 401 })
  }

  const { error: updateError } = await admin
    .from("remote_agents")
    .update({
      status: "active",
      current_url: currentUrl ?? null,
      last_seen: new Date().toISOString(),
      user_agent: userAgent ?? null,
    })
    .eq("agent_id", agentId)

  if (updateError) {
    return NextResponse.json({ error: "Failed to register agent" }, { status: 500 })
  }
  return NextResponse.json({ success: true, agentId })
}
