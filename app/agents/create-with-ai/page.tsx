"use client"

import { useState } from "react"
import { useCompletion } from "@ai-sdk/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

// AI-powered agent creation
export default function CreateAgentWithAI() {
  const [description, setDescription] = useState("")

  const { completion, complete, isLoading } = useCompletion({
    api: "/api/agents/generate-config",
  })

  const handleGenerate = () => {
    complete(`Create an agent configuration for: ${description}`)
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>🤖 AI-Powered Agent Creation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Describe what you want your agent to do... e.g., 'Help teachers manage student assignments and send progress reports to parents'"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />

          <Button onClick={handleGenerate} disabled={isLoading} className="w-full">
            {isLoading ? "Generating..." : "Generate Agent Configuration"}
          </Button>

          {completion && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium mb-2">Generated Configuration:</h3>
              <pre className="text-sm whitespace-pre-wrap">{completion}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
