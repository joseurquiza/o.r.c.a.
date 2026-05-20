import { streamText, tool } from "ai"
import { z } from "zod"

// AI SDK with vision capabilities (v6)
export async function POST(req: Request) {
  const { messages, screenshot } = await req.json()

  const result = streamText({
    model: "openai/gpt-4o",
    messages: [
      ...messages,
      {
        role: "user" as const,
        content: [
          { type: "text" as const, text: "What do you see on this screen? What actions can I take?" },
          {
            type: "image" as const,
            image: screenshot,
          },
        ],
      },
    ],
    tools: {
      identifyElements: tool({
        description: "Identify clickable elements on screen",
        inputSchema: z.object({
          elements: z.array(
            z.object({
              type: z.string(),
              text: z.string(),
              action: z.string(),
            }),
          ),
        }),
      }),
    },
  })

  return result.toUIMessageStreamResponse()
}
