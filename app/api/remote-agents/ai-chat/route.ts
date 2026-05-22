import {
  ToolLoopAgent,
  createAgentUIStreamResponse,
  tool,
  stepCountIs,
  type UIMessage,
} from "ai"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const maxDuration = 60

const browserControlAgent = new ToolLoopAgent({
  model: "openai/gpt-4o",
  instructions: `You are ORCA, an AI assistant that helps users control remote browsers.
You can view what's on the page, click elements, scroll, and navigate.
When users ask you to interact with a page, use your tools to accomplish their goals.
Always describe what you see and what actions you're taking.`,

  tools: {
    getPageElements: tool({
      description: "Get elements visible on the remote browser page",
      inputSchema: z.object({ agentId: z.string() }),
      execute: async ({ agentId }) => {
        const admin = createAdminClient()
        const { data: elements } = await admin
          .from("remote_agent_elements")
          .select("element_index, tag, text, selector, href, element_type")
          .eq("agent_id", agentId)
          .order("element_index", { ascending: true })
          .limit(50)
        const { data: agent } = await admin
          .from("remote_agents")
          .select("current_url")
          .eq("agent_id", agentId)
          .maybeSingle()
        return {
          success: true,
          url: agent?.current_url ?? "unknown",
          elementsCount: elements?.length ?? 0,
          elements: elements?.map((el) => ({
            index: el.element_index,
            tag: el.tag,
            text: (el.text ?? "").slice(0, 100),
            selector: el.selector,
            href: el.href,
            type: el.element_type,
          })),
        }
      },
    }),
    clickElement: tool({
      description: "Click an element on the remote browser page",
      inputSchema: z.object({
        agentId: z.string(),
        selector: z.string(),
        elementText: z.string().nullable(),
      }),
      execute: async ({ agentId, selector, elementText }) => {
        const admin = createAdminClient()
        const { data, error } = await admin
          .from("remote_agent_commands")
          .insert({ agent_id: agentId, command_type: "CLICK_ELEMENT", command_data: { selector, text: elementText }, status: "pending" })
          .select("id")
          .single()
        return error
          ? { success: false, error: error.message }
          : { success: true, commandId: data.id }
      },
    }),
    scroll: tool({
      description: "Scroll the page",
      inputSchema: z.object({
        agentId: z.string(),
        direction: z.enum(["up", "down"]),
        amount: z.number().default(300),
      }),
      execute: async ({ agentId, direction, amount }) => {
        const admin = createAdminClient()
        const y = direction === "down" ? amount : -amount
        const { data, error } = await admin
          .from("remote_agent_commands")
          .insert({ agent_id: agentId, command_type: "SCROLL", command_data: { x: 0, y }, status: "pending" })
          .select("id")
          .single()
        return error ? { success: false, error: error.message } : { success: true, commandId: data.id }
      },
    }),
    navigate: tool({
      description: "Navigate to a URL",
      inputSchema: z.object({ agentId: z.string(), url: z.string().url() }),
      execute: async ({ agentId, url }) => {
        const admin = createAdminClient()
        const { data, error } = await admin
          .from("remote_agent_commands")
          .insert({ agent_id: agentId, command_type: "NAVIGATE", command_data: { url }, status: "pending" })
          .select("id")
          .single()
        return error ? { success: false, error: error.message } : { success: true, commandId: data.id }
      },
    }),
    typeText: tool({
      description: "Type text into a focused input",
      inputSchema: z.object({
        agentId: z.string(),
        text: z.string(),
        selector: z.string().nullable(),
      }),
      execute: async ({ agentId, text, selector }) => {
        const admin = createAdminClient()
        const { data, error } = await admin
          .from("remote_agent_commands")
          .insert({ agent_id: agentId, command_type: "TYPE_TEXT", command_data: { text, selector }, status: "pending" })
          .select("id")
          .single()
        return error ? { success: false, error: error.message } : { success: true, commandId: data.id }
      },
    }),
    getAgentStatus: tool({
      description: "Check status of a remote agent",
      inputSchema: z.object({ agentId: z.string() }),
      execute: async ({ agentId }) => {
        const admin = createAdminClient()
        const { data: agent } = await admin
          .from("remote_agents")
          .select("agent_id, name, status, last_seen, current_url")
          .eq("agent_id", agentId)
          .maybeSingle()
        if (!agent) return { success: false, error: "Agent not found" }
        const lastSeenAgo = agent.last_seen ? Date.now() - new Date(agent.last_seen).getTime() : Number.POSITIVE_INFINITY
        return {
          success: true,
          name: agent.name,
          status: agent.status,
          isOnline: lastSeenAgo < 60000,
          lastSeenAgo: Math.round(lastSeenAgo / 1000),
          currentUrl: agent.current_url,
        }
      },
    }),
  },

  stopWhen: stepCountIs(15),
})

export async function POST(req: Request) {
  // Auth: require a signed-in user, and verify the agent belongs to their org.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response("Unauthorized", { status: 401 })

  const { messages, agentId }: { messages: UIMessage[]; agentId?: string } = await req.json()

  if (agentId) {
    const { data: membership } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle()
    if (!membership?.org_id) return new Response("No organization", { status: 403 })

    const admin = createAdminClient()
    const { data: agent } = await admin
      .from("remote_agents")
      .select("agent_id, org_id")
      .eq("agent_id", agentId)
      .maybeSingle()
    if (!agent || agent.org_id !== membership.org_id) {
      return new Response("Forbidden", { status: 403 })
    }
  }

  const systemContext = agentId
    ? `\nThe user is controlling remote agent: ${agentId}. Use this ID when calling tools.`
    : "\nNo remote agent is currently selected. Ask the user to select one first."

  return createAgentUIStreamResponse({
    agent: browserControlAgent,
    uiMessages: messages,
    callOptions: { system: browserControlAgent.instructions + systemContext },
  })
}
