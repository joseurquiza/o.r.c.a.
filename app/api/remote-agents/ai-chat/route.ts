import {
  ToolLoopAgent,
  createAgentUIStreamResponse,
  tool,
  stepCountIs,
  type UIMessage,
} from "ai"
import { z } from "zod"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const maxDuration = 60

// AI Agent for remote browser control
const browserControlAgent = new ToolLoopAgent({
  model: "openai/gpt-4o",
  instructions: `You are ORCA, an AI assistant that helps users control remote browsers.
You can view what's on the page, click elements, scroll, and navigate.
When users ask you to interact with a page, use your tools to accomplish their goals.
Always describe what you see and what actions you're taking.`,

  tools: {
    getPageElements: tool({
      description: "Get all clickable elements currently visible on the remote browser page",
      inputSchema: z.object({
        agentId: z.string().describe("The remote agent ID to query"),
      }),
      execute: async ({ agentId }) => {
        const { data: elements, error } = await supabase
          .from("remote_agent_elements")
          .select("*")
          .eq("agent_id", agentId)
          .order("element_index", { ascending: true })
          .limit(50)

        if (error) {
          return { success: false, error: error.message }
        }

        const { data: agent } = await supabase
          .from("remote_agents")
          .select("current_url, current_title")
          .eq("agent_id", agentId)
          .single()

        return {
          success: true,
          url: agent?.current_url || "unknown",
          title: agent?.current_title || "Unknown Page",
          elementsCount: elements?.length || 0,
          elements: elements?.map((el) => ({
            index: el.element_index,
            tag: el.tag_name,
            text: el.text_content?.slice(0, 100) || "",
            selector: el.selector,
            href: el.href,
            type: el.element_type,
          })),
        }
      },
    }),

    clickElement: tool({
      description: "Click on an element on the remote browser page",
      inputSchema: z.object({
        agentId: z.string().describe("The remote agent ID"),
        selector: z.string().describe("CSS selector of the element to click"),
        elementText: z.string().nullable().describe("Text of the element for confirmation"),
      }),
      execute: async ({ agentId, selector, elementText }) => {
        const { data, error } = await supabase
          .from("remote_agent_commands")
          .insert({
            agent_id: agentId,
            command_type: "CLICK_ELEMENT",
            command_data: { selector, text: elementText },
            status: "pending",
          })
          .select()
          .single()

        if (error) {
          return { success: false, error: error.message }
        }

        return {
          success: true,
          message: `Command sent to click "${elementText || selector}"`,
          commandId: data.id,
        }
      },
    }),

    scroll: tool({
      description: "Scroll the remote browser page up or down",
      inputSchema: z.object({
        agentId: z.string().describe("The remote agent ID"),
        direction: z.enum(["up", "down"]).describe("Direction to scroll"),
        amount: z.number().default(300).describe("Pixels to scroll"),
      }),
      execute: async ({ agentId, direction, amount }) => {
        const scrollY = direction === "down" ? amount : -amount

        const { data, error } = await supabase
          .from("remote_agent_commands")
          .insert({
            agent_id: agentId,
            command_type: "SCROLL",
            command_data: { x: 0, y: scrollY },
            status: "pending",
          })
          .select()
          .single()

        if (error) {
          return { success: false, error: error.message }
        }

        return {
          success: true,
          message: `Scrolling ${direction} by ${amount}px`,
          commandId: data.id,
        }
      },
    }),

    navigate: tool({
      description: "Navigate the remote browser to a new URL",
      inputSchema: z.object({
        agentId: z.string().describe("The remote agent ID"),
        url: z.string().url().describe("The URL to navigate to"),
      }),
      execute: async ({ agentId, url }) => {
        const { data, error } = await supabase
          .from("remote_agent_commands")
          .insert({
            agent_id: agentId,
            command_type: "NAVIGATE",
            command_data: { url },
            status: "pending",
          })
          .select()
          .single()

        if (error) {
          return { success: false, error: error.message }
        }

        return {
          success: true,
          message: `Navigating to ${url}`,
          commandId: data.id,
        }
      },
    }),

    typeText: tool({
      description: "Type text into a focused input field on the remote browser",
      inputSchema: z.object({
        agentId: z.string().describe("The remote agent ID"),
        text: z.string().describe("Text to type"),
        selector: z.string().nullable().describe("Optional selector to focus first"),
      }),
      execute: async ({ agentId, text, selector }) => {
        const { data, error } = await supabase
          .from("remote_agent_commands")
          .insert({
            agent_id: agentId,
            command_type: "TYPE_TEXT",
            command_data: { text, selector },
            status: "pending",
          })
          .select()
          .single()

        if (error) {
          return { success: false, error: error.message }
        }

        return {
          success: true,
          message: `Typing "${text.slice(0, 20)}${text.length > 20 ? "..." : ""}"`,
          commandId: data.id,
        }
      },
    }),

    getAgentStatus: tool({
      description: "Check the status and connection state of a remote agent",
      inputSchema: z.object({
        agentId: z.string().describe("The remote agent ID to check"),
      }),
      execute: async ({ agentId }) => {
        const { data: agent, error } = await supabase
          .from("remote_agents")
          .select("*")
          .eq("agent_id", agentId)
          .single()

        if (error || !agent) {
          return { success: false, error: "Agent not found" }
        }

        const lastSeenAgo = Date.now() - new Date(agent.last_seen).getTime()
        const isOnline = lastSeenAgo < 60000 // 60 seconds

        return {
          success: true,
          name: agent.agent_name,
          status: agent.status,
          isOnline,
          lastSeenAgo: Math.round(lastSeenAgo / 1000),
          currentUrl: agent.current_url,
          currentTitle: agent.current_title,
          elementsCount: agent.elements_count,
        }
      },
    }),
  },

  stopWhen: stepCountIs(15),
})

export async function POST(req: Request) {
  const { messages, agentId }: { messages: UIMessage[]; agentId?: string } = await req.json()

  // Inject agent context into the conversation
  const systemContext = agentId
    ? `\nThe user is controlling remote agent: ${agentId}. Use this ID when calling tools.`
    : "\nNo remote agent is currently selected. Ask the user to select one first."

  // Create a modified agent with context
  const contextualAgent = new ToolLoopAgent({
    ...browserControlAgent,
    instructions: browserControlAgent.instructions + systemContext,
  })

  return createAgentUIStreamResponse({
    agent: contextualAgent,
    uiMessages: messages,
  })
}
