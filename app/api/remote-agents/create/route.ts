import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { generateAgentSecret, hashAgentSecret } from "@/lib/crypto/tokens"

// Create a remote agent. Requires a signed-in user. Returns agentId + a one-time
// agent_secret that the extension must include on every subsequent call.
export async function POST(request: NextRequest) {
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
  if (!membership?.org_id) {
    return NextResponse.json({ error: "No organization for user" }, { status: 403 })
  }

  let body: { name?: string; description?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const name = (body.name ?? "").trim()
  if (!name) return NextResponse.json({ error: "Agent name is required" }, { status: 400 })

  const agentId = `remote_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  const secret = generateAgentSecret()
  const secretHash = hashAgentSecret(secret)

  const admin = createAdminClient()
  const { data: agent, error } = await admin
    .from("remote_agents")
    .insert({
      agent_id: agentId,
      org_id: membership.org_id,
      name,
      description: (body.description ?? "").trim() || null,
      status: "pending",
      agent_secret_hash: secretHash,
      created_at: new Date().toISOString(),
    })
    .select("agent_id, name, description, status, created_at")
    .single()

  if (error) {
    console.error("[v0] remote-agents/create error:", error.message)
    return NextResponse.json({ error: "Failed to create agent" }, { status: 500 })
  }

  // The secret is returned exactly once; it cannot be retrieved later.
  return NextResponse.json({ agent, agentSecret: secret })
}
