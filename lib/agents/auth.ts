import "server-only"
import type { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyAgentSecret } from "@/lib/crypto/tokens"

/**
 * Two ways to authenticate a request to /api/remote-agents/*:
 *
 *   1. Session-based (the dashboard UI calls): the user is signed in and we
 *      derive their org_id from public.org_members.
 *
 *   2. Agent-secret-based (the browser extension calls): a per-agent secret
 *      is sent as `Authorization: Bearer <secret>` or `x-agent-secret`. We
 *      look up the agent by id, compare hashes in constant time, and return
 *      the agent's stored org_id.
 *
 * Both paths return { orgId, agentId? } on success or null on failure.
 */
export type AgentAuthContext = {
  orgId: string
  userId: string | null
  // When auth was via per-agent secret, this is the agent the secret is bound to.
  authedAgentId: string | null
}

export async function authenticateAgentRequest(
  req: NextRequest,
  opts: { agentId?: string } = {},
): Promise<AgentAuthContext | null> {
  // 1) Try Supabase session
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from("org_members")
        .select("org_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle()
      if (data?.org_id) {
        return { orgId: data.org_id as string, userId: user.id, authedAgentId: null }
      }
    }
  } catch {
    // fall through to secret auth
  }

  // 2) Try per-agent secret
  const headerSecret =
    req.headers.get("x-agent-secret") ??
    (req.headers.get("authorization")?.startsWith("Bearer ")
      ? req.headers.get("authorization")!.slice("Bearer ".length).trim()
      : null)

  if (!headerSecret || !opts.agentId) return null

  const admin = createAdminClient()
  const { data: agent } = await admin
    .from("remote_agents")
    .select("agent_id, org_id, agent_secret_hash")
    .eq("agent_id", opts.agentId)
    .maybeSingle()

  if (!agent || !agent.org_id || !agent.agent_secret_hash) return null
  if (!verifyAgentSecret(headerSecret, agent.agent_secret_hash)) return null

  return { orgId: agent.org_id as string, userId: null, authedAgentId: agent.agent_id as string }
}
