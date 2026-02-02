"use client"

import { useState, useEffect, useCallback, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Trash2, Copy, Plus, Users, Monitor, Clock, RefreshCw, Wifi, WifiOff, Radio } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import type { RealtimeChannel } from "@supabase/supabase-js"
import {
  createRemoteAgent,
  deleteRemoteAgent,
  getRemoteAgents,
} from "@/lib/actions/remote-agents"

interface RemoteAgent {
  id: string
  name: string
  description: string
  status: "pending" | "active" | "inactive"
  current_url?: string
  last_seen?: string
  created_at: string
}

export default function RemoteAgentsPage() {
  const [agents, setAgents] = useState<RemoteAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newAgent, setNewAgent] = useState({ name: "", description: "" })
  const [realtimeConnected, setRealtimeConnected] = useState(false)
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)
  const [isPending, startTransition] = useTransition()
  const [creating, setCreating] = useState(false)

  const supabase = createClient()

  // Subscribe to realtime updates
  const subscribeToRealtime = useCallback(() => {
    if (channel) {
      supabase.removeChannel(channel)
    }

    const newChannel = supabase
      .channel("remote-agents-list")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "remote_agents",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newData = payload.new as any
            setAgents((prev) => [{
              id: newData.agent_id,
              name: newData.name,
              description: newData.description || "",
              status: newData.status,
              current_url: newData.current_url,
              last_seen: newData.last_seen,
              created_at: newData.created_at,
            }, ...prev])
          } else if (payload.eventType === "UPDATE") {
            const updatedData = payload.new as any
            setAgents((prev) =>
              prev.map((agent) =>
                agent.id === updatedData.agent_id
                  ? {
                      ...agent,
                      status: updatedData.status,
                      current_url: updatedData.current_url,
                      last_seen: updatedData.last_seen,
                    }
                  : agent
              )
            )
          } else if (payload.eventType === "DELETE") {
            const deletedData = payload.old as any
            setAgents((prev) => prev.filter((agent) => agent.id !== deletedData.agent_id))
          }
        }
      )
      .subscribe((status) => {
        setRealtimeConnected(status === "SUBSCRIBED")
      })

    setChannel(newChannel)
  }, [channel, supabase])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [channel, supabase])

  // Initial fetch and subscribe
  useEffect(() => {
    fetchAgents()
    subscribeToRealtime()
  }, [])

  const fetchAgents = async () => {
    try {
      const result = await getRemoteAgents()
      if (result.success && result.agents) {
        setAgents(result.agents)
      }
    } catch (error) {
      console.error("Error fetching agents:", error)
      toast.error("Failed to fetch agents")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAgent = async () => {
    if (!newAgent.name.trim()) {
      toast.error("Agent name is required")
      return
    }

    setCreating(true)
    startTransition(async () => {
      const result = await createRemoteAgent(newAgent.name, newAgent.description)
      setCreating(false)
      if (result.success && result.agent) {
        // Realtime will handle adding to the list
        setNewAgent({ name: "", description: "" })
        setShowCreateForm(false)
        toast.success("Agent created successfully")
      } else {
        toast.error(result.error || "Failed to create agent")
      }
    })
  }

  const handleDeleteAgent = (agentId: string) => {
    startTransition(async () => {
      const result = await deleteRemoteAgent(agentId)
      if (result.success) {
        // Realtime will handle removing from the list
        toast.success("Agent deleted successfully")
      } else {
        toast.error(result.error || "Failed to delete agent")
      }
    })
  }

  const copyAgentId = (agentId: string) => {
    navigator.clipboard.writeText(agentId)
    toast.success("Agent ID copied to clipboard")
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "inactive":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 pt-16 md:pt-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading agents...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 pt-16 md:pt-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Remote Agents</h1>
            <Badge variant={realtimeConnected ? "default" : "secondary"} className="text-xs flex items-center gap-1">
              {realtimeConnected ? <Radio className="h-3 w-3 animate-pulse" /> : <WifiOff className="h-3 w-3" />}
              {realtimeConnected ? "Live" : "Offline"}
            </Badge>
          </div>
          <p className="text-gray-600 text-sm md:text-base">Create and manage remote browser agents</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={fetchAgents} variant="outline" size="sm" className="flex items-center gap-2 bg-transparent">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Agent
          </Button>
        </div>
      </div>

      {/* Create Agent Form */}
      {showCreateForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg md:text-xl">Create New Remote Agent</CardTitle>
            <CardDescription className="text-sm">
              Create a new agent that can be controlled remotely via the browser extension
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name" className="text-sm font-medium">
                  Agent Name
                </Label>
                <Input
                  id="name"
                  placeholder="e.g., Marketing Team Browser"
                  value={newAgent.name}
                  onChange={(e) => setNewAgent((prev) => ({ ...prev, name: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="description" className="text-sm font-medium">
                  Description (Optional)
                </Label>
                <Input
                  id="description"
                  placeholder="Describe what this agent will be used for..."
                  value={newAgent.description}
                  onChange={(e) => setNewAgent((prev) => ({ ...prev, description: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={handleCreateAgent} disabled={isPending} className="flex-1 sm:flex-none">
                {isPending ? "Creating..." : "Create Agent"}
              </Button>
              <Button variant="outline" onClick={() => setShowCreateForm(false)} className="flex-1 sm:flex-none">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Setup Instructions */}
      <Card className="mb-6 bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900 text-lg">Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800">
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Create a new agent using the button above</li>
            <li>Copy the Agent ID from the agent card</li>
            <li>Install the ORCA extension on the target browser</li>
            <li>Enter the Agent ID in the extension popup</li>
            <li>Click "Connect to ORCA" to establish the connection</li>
          </ol>
        </CardContent>
      </Card>

      {/* Agents List */}
      {agents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No agents yet</h3>
            <p className="text-gray-600 text-center mb-4 text-sm md:text-base px-4">
              Create your first remote agent to start controlling browsers remotely
            </p>
            <Button onClick={() => setShowCreateForm(true)} className="w-full sm:w-auto">
              Create Your First Agent
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <Card key={agent.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{agent.name}</CardTitle>
                    <Badge className={`mt-1 ${getStatusColor(agent.status)} text-xs`}>{agent.status}</Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteAgent(agent.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {agent.description && <p className="text-sm text-gray-600 break-words">{agent.description}</p>}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">Agent ID</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyAgentId(agent.id)}
                      className="h-6 px-2 text-xs"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <code className="block text-xs bg-gray-100 p-2 rounded font-mono break-all">{agent.id}</code>
                </div>

                {agent.current_url && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Monitor className="h-3 w-3 flex-shrink-0" />
                      <span>Current URL</span>
                    </div>
                    <p className="text-xs text-blue-600 break-all">{agent.current_url}</p>
                  </div>
                )}

                <div className="space-y-1 text-xs text-gray-500">
                  {agent.last_seen && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 flex-shrink-0" />
                      <span>Last seen: {new Date(agent.last_seen).toLocaleString()}</span>
                    </div>
                  )}
                  <div>Created: {new Date(agent.created_at).toLocaleDateString()}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
