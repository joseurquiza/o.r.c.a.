"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Send, User, Calendar, Clock, MapPin, Chrome, Download } from "lucide-react"
import Link from "next/link"
import { useChat } from "@ai-sdk/react"

export default function AgentTestConsole({ params }: { params: { id: string } }) {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/agents/test",
    body: {
      agentId: params.id,
    },
  })

  const calendarPrompts = [
    "Add calendar appointment for Wednesday to call mom",
    "Schedule a meeting with the team tomorrow at 2pm",
    "Create a reminder to pick up groceries on Friday at 5pm",
    "Add a doctor's appointment next Monday at 10:30am",
    "Schedule lunch with Sarah on Thursday at noon",
    "Create an event for the school board meeting next Tuesday at 7pm",
  ]

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Calendar className="h-8 w-8 text-blue-600" />
            Calendar Agent Test Console
          </h1>
          <p className="text-gray-600 mt-1">Test your calendar agent with natural language requests</p>
        </div>
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          Agent ID: {params.id}
        </Badge>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Chat Interface */}
        <div className="lg:col-span-2">
          <Card className="h-[600px] flex flex-col border-0 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Calendar Chat
              </CardTitle>
              <CardDescription>Ask your agent to create calendar events using natural language</CardDescription>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col p-0">
              {/* Messages */}
              <div className="flex-1 space-y-4 overflow-y-auto p-4 bg-gray-50">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50 text-blue-400" />
                      <p className="font-medium text-gray-700">Start managing your calendar</p>
                      <p className="text-sm mt-1 text-gray-500">
                        Try: "Add calendar appointment for Wednesday to call mom"
                      </p>
                    </div>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`flex gap-3 max-w-[80%] ${
                          message.role === "user" ? "flex-row-reverse" : "flex-row"
                        }`}
                      >
                        <div className="flex-shrink-0">
                          {message.role === "user" ? (
                            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                              <User className="h-4 w-4 text-white" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                              <Calendar className="h-4 w-4 text-white" />
                            </div>
                          )}
                        </div>
                        <div
                          className={`rounded-lg px-4 py-2 ${
                            message.role === "user" ? "bg-blue-500 text-white" : "bg-white border shadow-sm"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-white" />
                    </div>
                    <div className="bg-white border rounded-lg px-4 py-2 shadow-sm">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="p-4 border-t bg-white">
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <Input
                    value={input}
                    onChange={handleInputChange}
                    placeholder="e.g., Add calendar appointment for Wednesday to call mom"
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={isLoading || !input.trim()} className="bg-blue-600 hover:bg-blue-700">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Agent Info & Quick Actions */}
        <div className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Calendar Agent
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Status</p>
                <Badge className="mt-1 bg-green-100 text-green-800 hover:bg-green-100">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                  Active
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Connected APIs</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    📅 Google Calendar
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Permissions</p>
                <Badge className="mt-1 bg-blue-100 text-blue-800">Read & Write</Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Capabilities</p>
                <div className="mt-1 space-y-1">
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Clock className="h-3 w-3" />
                    <span>Smart date/time parsing</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Calendar className="h-3 w-3" />
                    <span>Event creation</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <MapPin className="h-3 w-3" />
                    <span>Location support</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* NEW: Browser Extension Card */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm text-blue-800">
                <Chrome className="h-4 w-4 text-blue-600" />
                Browser Extension
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-blue-700">
                Enable your agent to see and interact with websites by installing our browser extension.
              </p>
              <Button asChild size="sm" className="w-full bg-blue-600 hover:bg-blue-700">
                <Link href="/extension">
                  <Download className="h-3 w-3 mr-2" />
                  Download Extension
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Try These Examples</CardTitle>
              <CardDescription>Click to try these calendar requests</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {calendarPrompts.map((prompt, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-left h-auto p-3 bg-transparent hover:bg-blue-50 border-gray-200"
                  onClick={() => handleInputChange({ target: { value: prompt } } as any)}
                >
                  <div className="text-xs text-gray-700">"{prompt}"</div>
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-blue-50 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-blue-800">💡 Pro Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-xs text-blue-700">
                • Include specific days: "Wednesday", "tomorrow", "next Monday"
              </div>
              <div className="text-xs text-blue-700">• Add times: "at 2pm", "at 10:30am"</div>
              <div className="text-xs text-blue-700">
                • Be descriptive: "call mom", "team meeting", "doctor appointment"
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
