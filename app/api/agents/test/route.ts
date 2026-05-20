import { streamText, tool } from "ai"
import { z } from "zod"
import { GoogleCalendarClient } from "@/lib/google-auth"

// Calendar parsing function (same as before)
function parseCalendarRequest(input: string) {
  const lowerInput = input.toLowerCase()

  let summary = ""
  const patterns = [
    /(?:add|create|schedule)(?:\s+(?:a|an))?\s+(?:calendar\s+)?(?:appointment|appt|event|meeting)?\s+(?:for|to)?\s+(.+?)(?:\s+(?:on|for|at)\s+|$)/,
    /(?:to|for)\s+(.+?)(?:\s+(?:on|at|for)\s+|$)/,
    /(?:appointment|meeting|event)\s+(?:to|for)\s+(.+?)(?:\s+(?:on|at|for)\s+|$)/,
  ]

  for (const pattern of patterns) {
    const match = lowerInput.match(pattern)
    if (match && match[1]) {
      summary = match[1].trim()
      break
    }
  }

  if (!summary) {
    return null
  }

  const now = new Date()
  let eventDate = new Date(now)

  const dayMatches = lowerInput.match(
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|next\s+week)\b/,
  )
  if (dayMatches) {
    const dayName = dayMatches[1]

    if (dayName === "today") {
      eventDate = new Date(now)
    } else if (dayName === "tomorrow") {
      eventDate = new Date(now)
      eventDate.setDate(eventDate.getDate() + 1)
    } else if (dayName === "next week") {
      eventDate = new Date(now)
      eventDate.setDate(eventDate.getDate() + 7)
    } else {
      const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
      const targetDay = days.indexOf(dayName)
      const currentDay = now.getDay()

      let daysUntilTarget = targetDay - currentDay
      if (daysUntilTarget <= 0) {
        daysUntilTarget += 7
      }

      eventDate = new Date(now)
      eventDate.setDate(eventDate.getDate() + daysUntilTarget)
    }
  }

  const timeMatch = lowerInput.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/)
  if (timeMatch) {
    let hours = Number.parseInt(timeMatch[1])
    const minutes = Number.parseInt(timeMatch[2] || "0")
    const ampm = timeMatch[3]

    if (ampm === "pm" && hours !== 12) {
      hours += 12
    } else if (ampm === "am" && hours === 12) {
      hours = 0
    }

    eventDate.setHours(hours, minutes, 0, 0)
  } else {
    eventDate.setHours(14, 0, 0, 0)
  }

  const endDate = new Date(eventDate)
  endDate.setHours(endDate.getHours() + 1)

  return {
    summary: summary.charAt(0).toUpperCase() + summary.slice(1),
    start: {
      dateTime: eventDate.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  }
}

export async function POST(req: Request) {
  const { messages, agentId } = await req.json()

  if (!agentId) {
    return new Response(JSON.stringify({ error: "Agent ID is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  // In production, fetch agent config from database
  // For demo, try to get from localStorage or use default
  let agentConfig = {
    name: "Custom Agent",
    description: "An intelligent agent with custom API integrations",
    connectedAPIs: ["Google Calendar"],
    goals: "Help users accomplish tasks through connected API integrations",
    tokenData: {} as any,
    userInfo: {} as any,
  }

  // Try to get agent data from localStorage (in production, use database)
  if (typeof window !== "undefined") {
    try {
      const storedAgent = localStorage.getItem(`agent_${agentId}`)
      if (storedAgent) {
        const parsedAgent = JSON.parse(storedAgent)
        agentConfig = {
          ...agentConfig,
          ...parsedAgent,
          connectedAPIs: parsedAgent.selectedAPIs || agentConfig.connectedAPIs,
        }
      }
    } catch (error) {
      console.error("Failed to load agent config:", error)
    }
  }

  const systemPrompt = `You are ${agentConfig.name}, an AI agent for K-12 education environments.

Description: ${agentConfig.description}
Goals: ${agentConfig.goals}
Connected APIs: ${agentConfig.connectedAPIs.join(", ")}

You help users by leveraging your connected API integrations. You can:
- Create, read, and manage calendar events from natural language requests
- Parse dates and times intelligently (e.g., 'Wednesday', 'tomorrow at 2pm')
- Schedule appointments, meetings, and reminders

IMPORTANT: You only work with real, authenticated API connections. No demo or mock data is available.

Always respond in a helpful, professional manner. When creating calendar events, confirm the details with the user.

Current date/time: ${new Date().toLocaleString()}`

  const tools: any = {}

  if (agentConfig.connectedAPIs.includes("Google Calendar") || agentConfig.connectedAPIs.includes("google-calendar")) {
    tools.parseCalendarRequest = tool({
      description: "Parse a natural language calendar request into structured event data",
      inputSchema: z.object({
        input: z.string().describe("The natural language input to parse"),
      }),
      execute: async ({ input }) => {
        const parsed = parseCalendarRequest(input)
        if (parsed) {
          return {
            success: true,
            event: parsed,
            message: `Parsed calendar request: "${parsed.summary}" on ${new Date(parsed.start.dateTime).toLocaleDateString()} at ${new Date(parsed.start.dateTime).toLocaleTimeString()}`,
          }
        }
        return {
          success: false,
          message:
            "Could not parse the calendar request. Please provide more details like the event title and when it should be scheduled.",
        }
      },
    })

    tools.createCalendarEvent = tool({
      description: "Create a new calendar event in Google Calendar",
      inputSchema: z.object({
        summary: z.string().describe("The title/summary of the event"),
        description: z.string().optional().describe("Optional description of the event"),
        startDateTime: z.string().describe("Start date and time in ISO format"),
        endDateTime: z.string().describe("End date and time in ISO format"),
        location: z.string().optional().describe("Optional location of the event"),
      }),
      execute: async (args) => {
        try {
          const tokenData = agentConfig.tokenData?.["google-calendar"]
          if (!tokenData?.access_token) {
            return {
              success: false,
              error: "Google Calendar not connected",
              message:
                "This agent is not connected to Google Calendar. Please reconnect the agent with proper OAuth authentication.",
            }
          }

          const calendarClient = new GoogleCalendarClient(tokenData.access_token, tokenData.refresh_token)

          const event = {
            summary: args.summary,
            description: args.description,
            start: {
              dateTime: args.startDateTime,
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
            end: {
              dateTime: args.endDateTime,
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
            location: args.location,
          }

          const createdEvent = await calendarClient.createEvent("primary", event)

          return {
            success: true,
            event: createdEvent,
            message: `Successfully created calendar event: "${args.summary}" for ${new Date(args.startDateTime).toLocaleDateString()} at ${new Date(args.startDateTime).toLocaleTimeString()}`,
            calendarLink: createdEvent.htmlLink,
          }
        } catch (error) {
          console.error("Calendar API error:", error)
          return {
            success: false,
            error: "Failed to create calendar event",
            details: error instanceof Error ? error.message : "Unknown error",
            message:
              "Failed to create calendar event. This may be due to expired authentication tokens. Please reconnect your Google Calendar integration.",
          }
        }
      },
    })
  }

  const result = streamText({
    model: "openai/gpt-4o",
    system: systemPrompt,
    messages,
    tools: Object.keys(tools).length > 0 ? tools : undefined,
  })

  return result.toUIMessageStreamResponse()
}
