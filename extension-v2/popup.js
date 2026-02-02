// ORCA Extension v2 - Modern Popup Script

document.addEventListener("DOMContentLoaded", async () => {
  const statusDot = document.getElementById("statusDot")
  const statusText = document.getElementById("statusText")
  const statusDetail = document.getElementById("statusDetail")
  const errorMessage = document.getElementById("errorMessage")
  const connectForm = document.getElementById("connectForm")
  const connectedView = document.getElementById("connectedView")
  const agentIdInput = document.getElementById("agentIdInput")
  const connectBtn = document.getElementById("connectBtn")
  const disconnectBtn = document.getElementById("disconnectBtn")
  const connectedAgentId = document.getElementById("connectedAgentId")
  const lastHeartbeat = document.getElementById("lastHeartbeat")

  // Declare chrome variable
  const chrome = window.chrome;

  // Load saved agent ID
  const saved = await chrome.storage.local.get(["agentId"])
  if (saved.agentId) {
    agentIdInput.value = saved.agentId
  }

  // Get initial state from background
  chrome.runtime.sendMessage({ action: "getState" }, (state) => {
    if (state) {
      updateUI(state)
    }
  })

  // Listen for state updates from background
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "CONNECTION_STATE_UPDATE") {
      updateUI(message.state)
    }
  })

  function updateUI(state) {
    // Reset classes
    statusDot.className = "status-dot"
    errorMessage.classList.add("hidden")

    switch (state.status) {
      case "connected":
        statusDot.classList.add("connected")
        statusText.textContent = "Connected"
        statusDetail.textContent = "Receiving commands from ORCA"
        connectForm.classList.add("hidden")
        connectedView.classList.remove("hidden")
        connectedAgentId.textContent = truncateId(state.agentId)

        if (state.lastHeartbeat) {
          const ago = Math.round((Date.now() - state.lastHeartbeat) / 1000)
          lastHeartbeat.textContent = ago < 60 ? `${ago}s ago` : `${Math.round(ago / 60)}m ago`
        }
        break

      case "connecting":
        statusDot.classList.add("connecting")
        statusText.textContent = "Connecting..."
        statusDetail.textContent = "Establishing connection to ORCA"
        connectBtn.disabled = true
        connectBtn.textContent = "Connecting..."
        break

      case "error":
        statusDot.classList.add("error")
        statusText.textContent = "Connection Error"
        statusDetail.textContent = state.lastError || "Failed to connect"
        connectForm.classList.remove("hidden")
        connectedView.classList.add("hidden")
        connectBtn.disabled = false
        connectBtn.textContent = "Retry Connection"

        if (state.lastError) {
          errorMessage.textContent = state.lastError
          errorMessage.classList.remove("hidden")
        }
        break

      default: // disconnected
        statusText.textContent = "Disconnected"
        statusDetail.textContent = "Enter an Agent ID to connect"
        connectForm.classList.remove("hidden")
        connectedView.classList.add("hidden")
        connectBtn.disabled = false
        connectBtn.textContent = "Connect to ORCA"
    }
  }

  function truncateId(id) {
    if (!id || id.length < 20) return id
    return `${id.slice(0, 10)}...${id.slice(-8)}`
  }

  // Connect button handler
  connectBtn.addEventListener("click", async () => {
    const agentId = agentIdInput.value.trim()

    if (!agentId) {
      errorMessage.textContent = "Please enter an Agent ID"
      errorMessage.classList.remove("hidden")
      return
    }

    // Validate format
    if (!agentId.startsWith("remote_") && !agentId.match(/^[a-zA-Z0-9_-]+$/)) {
      errorMessage.textContent = "Invalid Agent ID format"
      errorMessage.classList.remove("hidden")
      return
    }

    // Save agent ID
    await chrome.storage.local.set({ agentId })

    // Clear any previous error
    errorMessage.classList.add("hidden")

    // Update UI to connecting state
    updateUI({ status: "connecting" })

    // Send connect message to background
    chrome.runtime.sendMessage({ action: "connect", agentId }, (response) => {
      if (chrome.runtime.lastError) {
        updateUI({
          status: "error",
          lastError: chrome.runtime.lastError.message,
        })
        return
      }

      if (!response.success) {
        updateUI({
          status: "error",
          lastError: response.error,
        })
      }
    })
  })

  // Disconnect button handler
  disconnectBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "disconnect" }, () => {
      updateUI({ status: "disconnected" })
    })
  })

  // Handle Enter key in input
  agentIdInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      connectBtn.click()
    }
  })

  // Update heartbeat display periodically
  setInterval(() => {
    chrome.runtime.sendMessage({ action: "getState" }, (state) => {
      if (state && state.status === "connected" && state.lastHeartbeat) {
        const ago = Math.round((Date.now() - state.lastHeartbeat) / 1000)
        lastHeartbeat.textContent = ago < 60 ? `${ago}s ago` : `${Math.round(ago / 60)}m ago`
      }
    })
  }, 5000)
})
