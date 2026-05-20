import { streamText, generateText, Output, tool } from "ai"
import { z } from "zod"

// Enhanced AI SDK usage with structured outputs (AI SDK v6)
export async function POST(req: Request) {
  const { messages, mode } = await req.json()

  if (mode === "structured") {
    const { output } = await generateText({
      model: "openai/gpt-4o",
      output: Output.object({
        schema: z.object({
          intent: z.enum(["calendar", "email", "task", "question"]),
          confidence: z.number().min(0).max(1),
          parameters: z.object({
            title: z.string().optional(),
            date: z.string().optional(),
            time: z.string().optional(),
            description: z.string().optional(),
          }),
          suggestedActions: z.array(z.string()),
        }),
      }),
      prompt: `Analyze this user request: ${messages[messages.length - 1].content}`,
    })

    return Response.json(output)
  }

  // Streaming with tools (v6 tool() helper + execute)
  const result = streamText({
    model: "openai/gpt-4o",
    system: `You are an intelligent K-12 educational assistant with access to multiple tools.`,
    messages,
    tools: {
      createCalendarEvent: tool({
        description: "Create calendar events",
        inputSchema: z.object({
          title: z.string(),
          startTime: z.string(),
          endTime: z.string(),
          description: z.string().optional(),
        }),
        execute: async (args) => handleCalendarEvent(args),
      }),
      sendEmail: tool({
        description: "Send emails to students/parents",
        inputSchema: z.object({
          to: z.string(),
          subject: z.string(),
          body: z.string(),
        }),
        execute: async (args) => handleEmailSend(args),
      }),
      automateWebTask: tool({
        description: "Automate web browser tasks",
        inputSchema: z.object({
          action: z.enum(["click", "fill", "navigate", "extract"]),
          target: z.string(),
          value: z.string().optional(),
        }),
        execute: async (args) => handleBrowserAutomation(args),
      }),
      analyzeStudentData: tool({
        description: "Analyze student performance data",
        inputSchema: z.object({
          dataType: z.enum(["grades", "attendance", "behavior"]),
          timeframe: z.string(),
          studentId: z.string().optional(),
        }),
        execute: async (args) => handleDataAnalysis(args),
      }),
    },
  })

  return result.toUIMessageStreamResponse()
}

async function handleBrowserAutomation(args: any) {
  const response = await fetch("http://localhost:3000/api/extension/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      command: {
        type: args.action.toUpperCase() + "_ELEMENT",
        selector: args.target,
        value: args.value,
      },
    }),
  })
  return await response.json()
}

async function handleDataAnalysis(args: any) {
  return {
    success: true,
    analysis: `Analyzed ${args.dataType} data for ${args.timeframe}`,
    insights: ["Performance trending upward", "Attendance rate: 95%", "No behavioral concerns"],
  }
}

async function handleCalendarEvent(_args: any) {
  return { success: true, message: "Calendar event created" }
}

async function handleEmailSend(_args: any) {
  return { success: true, message: "Email sent" }
}
