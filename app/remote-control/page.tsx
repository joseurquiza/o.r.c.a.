"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { RefreshCw, Eye, MousePointer, Type, Navigation, Wifi, WifiOff } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { RealtimeChannel } from "@supabase/supabase-js"

interface PageElement {
  index: number
  tag: string
  text: string
  selector: string
  href?: string
  type?: string
  role?: string
  id?: string
  className?: string
  isClickable: boolean
  position?: {
    x: number
    y: number
    width: number
    height: number
  }
  detectedAt: string
}

interface ElementsResponse {
  elements: PageElement[]
  url: string
  title: string
  timestamp: string
  debug?: any
}

export default function RemoteControlPage() {
  const [agentId, setAgentId] = useState("")
  const [elements, setElements] = useState<PageElement[]>([])
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<string>("")
  const [commandLog, setCommandLog] = useState<string[]>([])
  const [customCommand, setCustomCommand] = useState("")
  const [pageInfo, setPageInfo] = useState({ url: "", title: "" })
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [realtimeConnected, setRealtimeConnected] = useState(false)
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)

  const supabase = createClient()

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    const logEntry = `[${timestamp}] ${message}`
    setCommandLog((prev) => [...prev.slice(-19), logEntry])
  }, [])

  // Subscribe to realtime updates for elements
  const subscribeToRealtime = useCallback((targetAgentId: string) => {
    // Unsubscribe from previous channel if exists
    if (channel) {
      supabase.removeChannel(channel)
    }

    addLog(`Subscribing to realtime updates for agent: ${targetAgentId.slice(-8)}`)

    const newChannel = supabase
      .channel(`agent-elements-${targetAgentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "remote_agent_elements",
          filter: `agent_id=eq.${targetAgentId}`,
        },
        (payload) => {
          addLog(`Realtime update: ${payload.eventType}`)
          // Refresh elements when changes detected
          fetchElements(targetAgentId)
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "remote_agents",
          filter: `agent_id=eq.${targetAgentId}`,
        },
        (payload) => {
          const newData = payload.new as any
          if (newData.current_url) {
            setPageInfo((prev) => ({ ...prev, url: newData.current_url }))
            addLog(`Agent navigated to: ${newData.current_url}`)
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setRealtimeConnected(true)
          addLog("Realtime connection established")
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          setRealtimeConnected(false)
          addLog(`Realtime connection: ${status}`)
        }
      })

    setChannel(newChannel)
  }, [channel, supabase, addLog])

  // Cleanup realtime subscription on unmount
  useEffect(() => {
    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [channel, supabase])

  const fetchElements = async (agentIdToUse?: string) => {
    const targetAgentId = agentIdToUse || agentId
    if (!targetAgentId) {
      addLog("No agent ID provided")
      return
    }

    setLoading(true)
    addLog(`Fetching elements for agent: ${targetAgentId.slice(-8)}`)

    try {
      const response = await fetch(`/api/remote-agents/${targetAgentId}/elements`)
      const data: ElementsResponse = await response.json()

      if (response.ok) {
        setElements(data.elements || [])
        setPageInfo({ url: data.url, title: data.title })
        setLastUpdate(data.timestamp)
        setDebugInfo(data.debug)

        addLog(`Retrieved ${data.elements?.length || 0} elements`)
        if (data.elements?.length > 0) {
          addLog(`Page: ${data.title}`)
        }
      } else {
        addLog(`Failed to fetch elements: ${response.status}`)
        setElements([])
      }
    } catch (error) {
      addLog(`Network error: ${error instanceof Error ? error.message : "Unknown error"}`)
      setElements([])
    } finally {
      setLoading(false)
    }
  }

  const sendCommand = async (command: any) => {
    if (!agentId) {
      addLog("No agent ID provided")
      return
    }

    addLog(`Sending command: ${command.type}`)

    try {
      const response = await fetch(`/api/remote-agents/${agentId}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command),
      })

      const result = await response.json()

      if (response.ok) {
        addLog(`Command sent successfully`)
        addLog(`Command ID: ${result.commandId}`)
        // With realtime, we don't need to manually refresh - updates come automatically
      } else {
        addLog(`Command failed: ${result.error}`)
      }
    } catch (error) {
      addLog(`Command error: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  const clickElement = (element: PageElement) => {
    addLog(`Clicking element: "${element.text.substring(0, 30)}..."`)
    sendCommand({
      type: "CLICK_ELEMENT",
      selector: element.selector,
      text: element.text,
      elementIndex: element.index,
    })
  }

  const sendCustomCommand = () => {
    if (!customCommand.trim()) {
      addLog("No custom command provided")
      return
    }

    try {
      const command = JSON.parse(customCommand)
      addLog(`Sending custom command: ${JSON.stringify(command)}`)
      sendCommand(command)
      setCustomCommand("")
    } catch (error) {
      addLog(`Invalid JSON in custom command: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  const connectToAgent = () => {
    if (!agentId) {
      addLog("Please enter an agent ID")
      return
    }
    fetchElements()
    subscribeToRealtime(agentId)
  }

  // Initial fetch when agent ID changes (but don't auto-subscribe)
  useEffect(() => {
    if (agentId && realtimeConnected) {
      fetchElements()
    }
  }, [agentId])

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Remote Agent Control</h1>
        <div className="flex items-center gap-2">
          <Badge variant={realtimeConnected ? "default" : "outline"} className="text-sm flex items-center gap-1">
            {realtimeConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {realtimeConnected ? "Live" : "Disconnected"}
          </Badge>
          <Badge variant="outline" className="text-sm">
            {elements.length} elements
          </Badge>
        </div>
      </div>

      {/* Agent ID Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Agent Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter Agent ID (e.g., remote_1234567890_abc123def)"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="flex-1"
            />
            <Button onClick={connectToAgent} disabled={loading || !agentId}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Connecting..." : realtimeConnected ? "Reconnect" : "Connect"}
            </Button>
          </div>

          {pageInfo.url && (
            <div className="text-sm text-muted-foreground">
              <p>
                <strong>Page:</strong> {pageInfo.title}
              </p>
              <p>
                <strong>URL:</strong> {pageInfo.url}
              </p>
              <p>
                <strong>Last Update:</strong> {new Date(lastUpdate).toLocaleString()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Elements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MousePointer className="h-5 w-5" />
              Available Elements ({elements.length})
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchElements()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {elements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No clickable elements detected</p>
              <p className="text-sm">
                The remote agent will automatically detect elements when you navigate to a webpage
              </p>
              <Button variant="outline" className="mt-4 bg-transparent" onClick={() => fetchElements()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Elements
              </Button>
            </div>
          ) : (
            <div className="grid gap-2 max-h-96 overflow-y-auto">
              {elements.map((element) => (
                <div
                  key={element.index}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-xs">
                        {element.tag}
                      </Badge>
                      {element.type && (
                        <Badge variant="outline" className="text-xs">
                          {element.type}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium truncate">
                      {element.text || element.id || element.className || "No text"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{element.selector}</p>
                    {element.href && <p className="text-xs text-blue-600 truncate">→ {element.href}</p>}
                  </div>
                  <Button size="sm" onClick={() => clickElement(element)} className="ml-2 shrink-0">
                    Click
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Custom Commands */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            Custom Commands
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Button
              variant="outline"
              onClick={() =>
                sendCommand({
                  type: "SCROLL",
                  x: 0,
                  y: 300,
                })
              }
            >
              <Navigation className="h-4 w-4 mr-2" />
              Scroll Down
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                sendCommand({
                  type: "SCROLL",
                  x: 0,
                  y: -300,
                })
              }
            >
              <Navigation className="h-4 w-4 mr-2" />
              Scroll Up
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                sendCommand({
                  type: "CAPTURE_SCREEN",
                })
              }
            >
              📸 Capture Screen
            </Button>
          </div>

          <Separator />

          <div className="space-y-2">
            <label className="text-sm font-medium">Send Custom JSON Command:</label>
            <Textarea
              placeholder='{"type": "CLICK_ELEMENT", "selector": "button.submit"}'
              value={customCommand}
              onChange={(e) => setCustomCommand(e.target.value)}
              rows={3}
            />
            <Button onClick={sendCustomCommand} disabled={!customCommand.trim()}>
              Send Custom Command
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Command Log */}
      <Card>
        <CardHeader>
          <CardTitle>Command Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 rounded-lg p-4 max-h-64 overflow-y-auto font-mono text-sm">
            {commandLog.length === 0 ? (
              <p className="text-muted-foreground">No commands executed yet...</p>
            ) : (
              commandLog.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Debug Information */}
      {debugInfo && (
        <Card>
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted/50 rounded-lg p-4 text-xs overflow-auto">{JSON.stringify(debugInfo, null, 2)}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
