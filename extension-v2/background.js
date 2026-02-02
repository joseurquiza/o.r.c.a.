// ORCA Extension v2 - Modern Background Script
// Uses improved connection handling and element detection

const ORCA_BASE_URL = "https://orca-git-main-jordans-projects-d18a4973.vercel.app"
const chrome = window.chrome; // Declare the chrome variable

let currentAgentId = null
let isConnected = false
let heartbeatInterval = null
let commandPollInterval = null

// Connection state management
const connectionState = {
  agentId: null,
  status: "disconnected", // disconnected | connecting | connected | error
  lastError: null,
  lastHeartbeat: null,
}

// Update connection state and notify popup
function updateConnectionState(updates) {
  Object.assign(connectionState, updates)
  chrome.runtime.sendMessage({
    type: "CONNECTION_STATE_UPDATE",
    state: connectionState,
  }).catch(() => {
    // Popup might not be open, ignore error
  })
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "connect") {
    connectToOrca(request.agentId)
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ success: false, error: error.message }))
    return true
  }

  if (request.action === "disconnect") {
    disconnect()
    sendResponse({ success: true })
    return true
  }

  if (request.action === "getState") {
    sendResponse(connectionState)
    return true
  }
})

async function connectToOrca(agentId) {
  updateConnectionState({ status: "connecting", agentId })

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    const response = await fetch(`${ORCA_BASE_URL}/api/remote-agents/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentId: agentId,
        userAgent: navigator.userAgent,
        currentUrl: tab?.url || "unknown",
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`)
    }

    if (data.success) {
      currentAgentId = agentId
      isConnected = true

      updateConnectionState({
        status: "connected",
        lastError: null,
        lastHeartbeat: Date.now(),
      })

      // Start background processes
      startHeartbeat()
      startCommandListener()

      // Analyze current page immediately
      await analyzeAndSendPageElements()

      console.log("[ORCA] Connected successfully")
      return { success: true, agentId }
    } else {
      throw new Error(data.error || "Failed to connect")
    }
  } catch (error) {
    updateConnectionState({
      status: "error",
      lastError: error.message,
    })
    console.error("[ORCA] Connection error:", error)
    throw error
  }
}

function disconnect() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval)
    heartbeatInterval = null
  }
  if (commandPollInterval) {
    clearInterval(commandPollInterval)
    commandPollInterval = null
  }

  currentAgentId = null
  isConnected = false

  updateConnectionState({
    status: "disconnected",
    agentId: null,
    lastError: null,
  })

  console.log("[ORCA] Disconnected")
}

function startHeartbeat() {
  if (heartbeatInterval) clearInterval(heartbeatInterval)

  heartbeatInterval = setInterval(async () => {
    if (!currentAgentId || !isConnected) return

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

      const response = await fetch(
        `${ORCA_BASE_URL}/api/remote-agents/${currentAgentId}/heartbeat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentUrl: tab?.url || "unknown",
            timestamp: new Date().toISOString(),
          }),
        }
      )

      if (response.ok) {
        updateConnectionState({ lastHeartbeat: Date.now() })
      } else {
        console.error("[ORCA] Heartbeat failed:", response.status)
      }
    } catch (error) {
      console.error("[ORCA] Heartbeat error:", error)
      updateConnectionState({ lastError: "Heartbeat failed" })
    }
  }, 30000) // Every 30 seconds
}

function startCommandListener() {
  if (commandPollInterval) clearInterval(commandPollInterval)

  commandPollInterval = setInterval(async () => {
    if (!currentAgentId || !isConnected) return

    try {
      const response = await fetch(
        `${ORCA_BASE_URL}/api/remote-agents/${currentAgentId}/command`
      )
      const data = await response.json()

      if (data.command) {
        console.log("[ORCA] Received command:", data.command)
        await executeCommand(data.command)
      }
    } catch (error) {
      console.error("[ORCA] Command polling error:", error)
    }
  }, 2000) // Every 2 seconds
}

async function executeCommand(command) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) {
      console.error("[ORCA] No active tab found")
      return
    }

    // Send command to content script
    await chrome.tabs.sendMessage(tab.id, {
      action: "executeCommand",
      command: command,
    })

    // Report command execution
    if (command.id) {
      await fetch(
        `${ORCA_BASE_URL}/api/remote-agents/${currentAgentId}/command/${command.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "executed",
            executedAt: new Date().toISOString(),
          }),
        }
      ).catch(() => {
        // Ignore report errors
      })
    }

    // Analyze page after command execution
    setTimeout(async () => {
      await analyzeAndSendPageElements()
    }, 1500)
  } catch (error) {
    console.error("[ORCA] Command execution error:", error)
  }
}

async function analyzeAndSendPageElements() {
  if (!currentAgentId || !isConnected) return

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) return

    // Get page elements from content script
    const elements = await chrome.tabs.sendMessage(tab.id, {
      action: "getPageElements",
    })

    if (elements && elements.length > 0) {
      const response = await fetch(
        `${ORCA_BASE_URL}/api/remote-agents/${currentAgentId}/elements`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            elements: elements,
            url: tab.url,
            title: tab.title,
            timestamp: new Date().toISOString(),
          }),
        }
      )

      if (response.ok) {
        console.log(`[ORCA] Sent ${elements.length} elements to server`)
      }
    }
  } catch (error) {
    console.error("[ORCA] Page analysis error:", error)
  }
}

// Listen for tab updates to re-analyze page
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && isConnected) {
    setTimeout(analyzeAndSendPageElements, 1000)
  }
})

// Listen for tab activation changes
chrome.tabs.onActivated.addListener(() => {
  if (isConnected) {
    setTimeout(analyzeAndSendPageElements, 500)
  }
})

// Clean up on extension suspend
chrome.runtime.onSuspend.addListener(() => {
  disconnect()
})

console.log("[ORCA] Background script v2 loaded")
