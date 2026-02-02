"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { RealtimeChannel } from "@supabase/supabase-js"

// Types
interface RemoteAgent {
  id: number
  agent_id: string
  agent_name: string
  description?: string
  current_url?: string
  current_title?: string
  elements_count: number
  status: "pending" | "active" | "inactive"
  capabilities: string[]
  user_agent?: string
  last_seen: string
  created_at: string
  updated_at: string
}

interface PageElement {
  id: number
  agent_id: string
  element_index: number
  tag_name: string
  text_content?: string
  selector?: string
  element_id?: string
  class_name?: string
  href?: string
  element_type?: string
  role?: string
  is_clickable: boolean
  page_url?: string
  page_title?: string
  position_x: number
  position_y: number
  position_width: number
  position_height: number
  detected_at: string
}

interface RemoteCommand {
  id: number
  agent_id: string
  command_type: string
  command_data: Record<string, unknown>
  status: "pending" | "sent" | "executed" | "failed"
  created_at: string
  executed_at?: string
  result?: Record<string, unknown>
}

// Hook for subscribing to all remote agents with realtime updates
export function useRemoteAgentsRealtime() {
  const [agents, setAgents] = useState<RemoteAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    let channel: RealtimeChannel | null = null

    // Initial fetch
    async function fetchAgents() {
      const { data, error } = await supabase
        .from("remote_agents")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        setError(error.message)
      } else {
        setAgents(data || [])
      }
      setLoading(false)
    }

    fetchAgents()

    // Subscribe to realtime changes
    channel = supabase
      .channel("remote_agents_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "remote_agents",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setAgents((prev) => [payload.new as RemoteAgent, ...prev])
          } else if (payload.eventType === "UPDATE") {
            setAgents((prev) =>
              prev.map((agent) =>
                agent.agent_id === (payload.new as RemoteAgent).agent_id
                  ? (payload.new as RemoteAgent)
                  : agent
              )
            )
          } else if (payload.eventType === "DELETE") {
            setAgents((prev) =>
              prev.filter((agent) => agent.agent_id !== (payload.old as RemoteAgent).agent_id)
            )
          }
        }
      )
      .subscribe()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [])

  return { agents, loading, error }
}

// Hook for subscribing to a single agent's elements with realtime updates
export function useAgentElementsRealtime(agentId: string | null) {
  const [elements, setElements] = useState<PageElement[]>([])
  const [pageInfo, setPageInfo] = useState({ url: "", title: "" })
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<string>("")

  useEffect(() => {
    if (!agentId) {
      setElements([])
      setLoading(false)
      return
    }

    const supabase = createClient()
    let elementsChannel: RealtimeChannel | null = null
    let agentChannel: RealtimeChannel | null = null

    // Initial fetch
    async function fetchElements() {
      setLoading(true)

      // Get elements
      const { data: elementsData, error: elementsError } = await supabase
        .from("remote_agent_elements")
        .select("*")
        .eq("agent_id", agentId)
        .order("element_index", { ascending: true })

      if (elementsError) {
        console.error("Error fetching elements:", elementsError)
      } else {
        setElements(elementsData || [])
      }

      // Get agent info
      const { data: agentData } = await supabase
        .from("remote_agents")
        .select("current_url, current_title, last_seen")
        .eq("agent_id", agentId)
        .single()

      if (agentData) {
        setPageInfo({
          url: agentData.current_url || "",
          title: agentData.current_title || "",
        })
        setLastUpdate(agentData.last_seen || "")
      }

      setLoading(false)
    }

    fetchElements()

    // Subscribe to element changes
    elementsChannel = supabase
      .channel(`elements_${agentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "remote_agent_elements",
          filter: `agent_id=eq.${agentId}`,
        },
        (payload) => {
          // Refetch all elements on any change for simplicity
          // This ensures we have the complete updated list
          fetchElements()
        }
      )
      .subscribe()

    // Subscribe to agent changes (for URL/title updates)
    agentChannel = supabase
      .channel(`agent_${agentId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "remote_agents",
          filter: `agent_id=eq.${agentId}`,
        },
        (payload) => {
          const updated = payload.new as RemoteAgent
          setPageInfo({
            url: updated.current_url || "",
            title: updated.current_title || "",
          })
          setLastUpdate(updated.last_seen || "")
        }
      )
      .subscribe()

    return () => {
      if (elementsChannel) {
        supabase.removeChannel(elementsChannel)
      }
      if (agentChannel) {
        supabase.removeChannel(agentChannel)
      }
    }
  }, [agentId])

  const refresh = useCallback(async () => {
    if (!agentId) return

    const supabase = createClient()
    setLoading(true)

    const { data } = await supabase
      .from("remote_agent_elements")
      .select("*")
      .eq("agent_id", agentId)
      .order("element_index", { ascending: true })

    setElements(data || [])
    setLoading(false)
  }, [agentId])

  return { elements, pageInfo, loading, lastUpdate, refresh }
}

// Hook for subscribing to commands with realtime updates
export function useAgentCommandsRealtime(agentId: string | null) {
  const [commands, setCommands] = useState<RemoteCommand[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!agentId) {
      setCommands([])
      setLoading(false)
      return
    }

    const supabase = createClient()
    let channel: RealtimeChannel | null = null

    // Initial fetch - get recent commands
    async function fetchCommands() {
      const { data, error } = await supabase
        .from("remote_agent_commands")
        .select("*")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: false })
        .limit(20)

      if (!error) {
        setCommands(data || [])
      }
      setLoading(false)
    }

    fetchCommands()

    // Subscribe to command changes
    channel = supabase
      .channel(`commands_${agentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "remote_agent_commands",
          filter: `agent_id=eq.${agentId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setCommands((prev) => [payload.new as RemoteCommand, ...prev.slice(0, 19)])
          } else if (payload.eventType === "UPDATE") {
            setCommands((prev) =>
              prev.map((cmd) =>
                cmd.id === (payload.new as RemoteCommand).id
                  ? (payload.new as RemoteCommand)
                  : cmd
              )
            )
          }
        }
      )
      .subscribe()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [agentId])

  return { commands, loading }
}
