import { streamText } from "ai"
import { openai } from "@ai-sdk/openai"

// AI SDK with vision capabilities
export async function POST(req: Request) {
  const { messages, screenshot } = await req.json()

  const result = await streamText({
    model: openai("gpt-4o"), // GPT-4 Vision
    messages: [
      ...messages,
      {
        role: "user",
        content: [
          { type: "text", text: "What do you see on this screen? What actions can I take?" },
          {
            type: "image",
            image: screenshot, // Base64 screenshot from extension
          },
        ],
      },
    ],
    tools: {
      identifyElements: {
        description: "Identify clickable elements on screen",
        parameters: {
          type: "object",
          properties: {
            elements: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  text: { type: "string" },
                  action: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
  })

  return result.toDataStreamResponse()
}
