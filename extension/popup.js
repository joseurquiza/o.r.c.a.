document.addEventListener("DOMContentLoaded", () => {
  const agentIdInput = document.getElementById("agentId")
  const connectBtn = document.getElementById("connectBtn")
  const statusDiv = document.getElementById("status")
  const currentAgentDiv = document.getElementById("currentAgent")

  // Declare chrome variable
  const chrome = window.chrome

  // Load saved agent ID
  chrome.storage.local.get(["agentId", "connectionStatus"], (result) => {
    if (result.agentId) {
      agentIdInput.value = result.agentId
      updateStatus(result.connectionStatus || "disconnected")
    }
  })

  connectBtn.addEventListener("click", () => {
    const agentId = agentIdInput.value.trim()

    if (!agentId) {
      updateStatus("error", "Please enter an Agent ID")
      return
    }

    if (!agentId.startsWith("remote_")) {
      updateStatus("error", 'Invalid Agent ID format. Must start with "remote_"')
      return
    }

    updateStatus("connecting", "Connecting to ORCA...")
    connectBtn.disabled = true

    // Send message to background script
    chrome.runtime.sendMessage(
      {
        action: "connect",
        agentId: agentId,
      },
      (response) => {
        connectBtn.disabled = false

        if (response && response.success) {
          updateStatus("connected", "Connected to ORCA successfully!")
          currentAgentDiv.textContent = `Agent ID: ${agentId}`

          // Save agent ID
          chrome.storage.local.set({
            agentId: agentId,
            connectionStatus: "connected",
          })
        } else {
          updateStatus("error", response?.error || "Failed to connect to ORCA")
        }
      },
    )
  })

  function updateStatus(status, message) {
    statusDiv.textContent = message || ""
    statusDiv.className = "status " + status

    if (status === "connected") {
      connectBtn.textContent = "Connected"
      connectBtn.disabled = true
      connectBtn.style.backgroundColor = "#10b981"
    } else if (status === "connecting") {
      connectBtn.textContent = "Connecting..."
    } else {
      connectBtn.textContent = "Connect to ORCA"
      connectBtn.disabled = false
      connectBtn.style.backgroundColor = "#3b82f6"
    }
  }
})
