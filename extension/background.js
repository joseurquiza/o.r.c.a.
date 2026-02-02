// Declare chrome variable
const chrome = window.chrome

let currentAgentId = null
let isConnected = false
let heartbeatInterval = null

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "connect") {
    connectToOrca(request.agentId)
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ success: false, error: error.message }))
    return true // Keep message channel open for async response
  }
})

async function connectToOrca(agentId) {
  try {
    // Get current tab info
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    const response = await fetch("https://theorca.app/api/remote-agents/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agentId: agentId,
        userAgent: navigator.userAgent,
        currentUrl: tab?.url || "unknown",
      }),
    })

    const data = await response.json()

    if (data.success) {
      currentAgentId = agentId
      isConnected = true

      // Start heartbeat
      startHeartbeat()

      // Start listening for commands
      startCommandListener()

      console.log("Connected to ORCA successfully")
      return { success: true, agentId: agentId }
    } else {
      throw new Error(data.error || "Failed to connect")
    }
  } catch (error) {
    console.error("Connection error:", error)
    throw error
  }
}

function startHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval)
  }

  heartbeatInterval = setInterval(async () => {
    if (!currentAgentId || !isConnected) return

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

      await fetch(`https://theorca.app/api/remote-agents/${currentAgentId}/heartbeat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentUrl: tab?.url || "unknown",
          timestamp: new Date().toISOString(),
        }),
      })
    } catch (error) {
      console.error("Heartbeat error:", error)
    }
  }, 30000) // Every 30 seconds
}

function startCommandListener() {
  // Poll for commands every 2 seconds
  setInterval(async () => {
    if (!currentAgentId || !isConnected) return

    try {
      const response = await fetch(`https://theorca.app/api/remote-agents/${currentAgentId}/command`)
      const data = await response.json()

      if (data.command) {
        await executeCommand(data.command)
      }
    } catch (error) {
      console.error("Command polling error:", error)
    }
  }, 2000)
}

async function executeCommand(command) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    if (!tab) {
      console.error("No active tab found")
      return
    }

    // Execute command in content script
    await chrome.tabs.sendMessage(tab.id, {
      action: "executeCommand",
      command: command,
    })

    // Analyze page after command execution
    setTimeout(async () => {
      await analyzeAndSendPageElements()
    }, 1000)
  } catch (error) {
    console.error("Command execution error:", error)
  }
}

async function analyzeAndSendPageElements() {
  if (!currentAgentId || !isConnected) return

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    if (!tab) return

    // Get page elements from content script
    const elements = await chrome.tabs.sendMessage(tab.id, {
      action: "getPageElements",
    })

    if (elements) {
      // Send elements to server
      await fetch(`https://theorca.app/api/remote-agents/${currentAgentId}/elements`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          elements: elements,
          url: tab.url,
          timestamp: new Date().toISOString(),
        }),
      })
    }
  } catch (error) {
    console.error("Page analysis error:", error)
  }
}

// Clean up on extension unload
chrome.runtime.onSuspend.addListener(() => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval)
  }
})
