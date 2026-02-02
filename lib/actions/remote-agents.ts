"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// Types
export interface RemoteAgent {
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
  ip_address?: string
  last_seen: string
  created_at: string
  updated_at: string
}

export interface PageElement {
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

export interface RemoteCommand {
  id: number
  agent_id: string
  command_type: string
  command_data: Record<string, unknown>
  status: "pending" | "sent" | "executed" | "failed"
  created_at: string
  executed_at?: string
  result?: Record<string, unknown>
}

// Create a new remote agent
export async function createRemoteAgent(name: string, description?: string) {
  const supabase = await createClient()
  
  const agentId = `remote_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  
  const { data, error } = await supabase
    .from("remote_agents")
    .insert({
      agent_id: agentId,
      agent_name: name,
      description: description || null,
      status: "pending",
      capabilities: ["screen_capture", "element_interaction", "form_filling", "navigation"],
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating agent:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/agents/remote")
  return { success: true, agent: data }
}

// Get all remote agents
export async function getRemoteAgents() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("remote_agents")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching agents:", error)
    return { success: false, error: error.message, agents: [] }
  }

  return { success: true, agents: data || [] }
}

// Get a single remote agent by ID
export async function getRemoteAgent(agentId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("remote_agents")
    .select("*")
    .eq("agent_id", agentId)
    .single()

  if (error) {
    console.error("Error fetching agent:", error)
    return { success: false, error: error.message }
  }

  return { success: true, agent: data }
}

// Delete a remote agent
export async function deleteRemoteAgent(agentId: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from("remote_agents")
    .delete()
    .eq("agent_id", agentId)

  if (error) {
    console.error("Error deleting agent:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/agents/remote")
  return { success: true }
}

// Register/connect an agent (called by extension)
export async function registerRemoteAgent(
  agentId: string, 
  userAgent?: string, 
  currentUrl?: string
) {
  const supabase = await createClient()
  
  // Verify agent exists
  const { data: existingAgent, error: fetchError } = await supabase
    .from("remote_agents")
    .select("*")
    .eq("agent_id", agentId)
    .single()

  if (fetchError || !existingAgent) {
    return { success: false, error: "Agent not found" }
  }

  // Update status to active
  const { error: updateError } = await supabase
    .from("remote_agents")
    .update({
      status: "active",
      current_url: currentUrl,
      user_agent: userAgent,
      last_seen: new Date().toISOString(),
    })
    .eq("agent_id", agentId)

  if (updateError) {
    console.error("Error registering agent:", updateError)
    return { success: false, error: updateError.message }
  }

  return { success: true, agentId }
}

// Update agent heartbeat
export async function updateAgentHeartbeat(agentId: string, currentUrl?: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from("remote_agents")
    .update({
      current_url: currentUrl,
      last_seen: new Date().toISOString(),
      status: "active",
    })
    .eq("agent_id", agentId)

  if (error) {
    console.error("Error updating heartbeat:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

// Store page elements from extension
export async function storePageElements(
  agentId: string,
  url: string,
  title: string,
  elements: Array<{
    index: number
    tagName: string
    textContent?: string
    selector?: string
    id?: string
    className?: string
    href?: string
    type?: string
    role?: string
    position?: { x: number; y: number; width: number; height: number }
  }>
) {
  const supabase = await createClient()
  
  // Verify agent exists
  const { data: agent, error: agentError } = await supabase
    .from("remote_agents")
    .select("agent_id")
    .eq("agent_id", agentId)
    .single()

  if (agentError || !agent) {
    return { success: false, error: "Agent not found" }
  }

  // Clear existing elements for this agent/URL
  await supabase
    .from("remote_agent_elements")
    .delete()
    .eq("agent_id", agentId)

  // Insert new elements
  const elementsToInsert = elements.map((el, idx) => ({
    agent_id: agentId,
    element_index: el.index || idx,
    tag_name: el.tagName || "unknown",
    text_content: el.textContent || "",
    selector: el.selector || "",
    element_id: el.id || "",
    class_name: el.className || "",
    href: el.href || "",
    element_type: el.type || "",
    role: el.role || "",
    is_clickable: true,
    page_url: url,
    page_title: title,
    position_x: el.position?.x || 0,
    position_y: el.position?.y || 0,
    position_width: el.position?.width || 0,
    position_height: el.position?.height || 0,
  }))

  const { error: insertError } = await supabase
    .from("remote_agent_elements")
    .insert(elementsToInsert)

  if (insertError) {
    console.error("Error storing elements:", insertError)
    return { success: false, error: insertError.message }
  }

  // Update agent with current URL and element count
  await supabase
    .from("remote_agents")
    .update({
      current_url: url,
      current_title: title,
      elements_count: elements.length,
      last_seen: new Date().toISOString(),
    })
    .eq("agent_id", agentId)

  return { success: true, elementsStored: elements.length }
}

// Get page elements for an agent
export async function getPageElements(agentId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("remote_agent_elements")
    .select("*")
    .eq("agent_id", agentId)
    .order("element_index", { ascending: true })

  if (error) {
    console.error("Error fetching elements:", error)
    return { success: false, error: error.message, elements: [] }
  }

  // Get agent info for URL/title
  const { data: agent } = await supabase
    .from("remote_agents")
    .select("current_url, current_title, last_seen")
    .eq("agent_id", agentId)
    .single()

  return {
    success: true,
    elements: data || [],
    url: agent?.current_url || "",
    title: agent?.current_title || "",
    timestamp: agent?.last_seen || new Date().toISOString(),
  }
}

// Send a command to an agent
export async function sendCommand(
  agentId: string,
  commandType: string,
  commandData: Record<string, unknown>
) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("remote_agent_commands")
    .insert({
      agent_id: agentId,
      command_type: commandType,
      command_data: commandData,
      status: "pending",
    })
    .select()
    .single()

  if (error) {
    console.error("Error sending command:", error)
    return { success: false, error: error.message }
  }

  return { success: true, command: data }
}

// Get pending commands for an agent (used by extension polling)
export async function getPendingCommands(agentId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("remote_agent_commands")
    .select("*")
    .eq("agent_id", agentId)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)

  if (error) {
    console.error("Error fetching commands:", error)
    return { success: false, error: error.message }
  }

  if (data && data.length > 0) {
    // Mark command as sent
    await supabase
      .from("remote_agent_commands")
      .update({ status: "sent" })
      .eq("id", data[0].id)
  }

  return { success: true, command: data?.[0] || null }
}

// Update command status after execution
export async function updateCommandStatus(
  commandId: number,
  status: "executed" | "failed",
  result?: Record<string, unknown>
) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from("remote_agent_commands")
    .update({
      status,
      executed_at: new Date().toISOString(),
      result: result || null,
    })
    .eq("id", commandId)

  if (error) {
    console.error("Error updating command status:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}
