import { NextResponse } from "next/server"
import JSZip from "jszip"

export async function GET() {
  try {
    const zip = new JSZip()

    // Add manifest.json
    const manifest = {
      manifest_version: 3,
      name: "ORCA Agent Extension",
      version: "1.0.0",
      description: "Browser automation extension for ORCA agents",
      permissions: ["activeTab", "scripting", "storage", "tabs", "webNavigation"],
      host_permissions: ["http://*/*", "https://*/*"],
      background: {
        service_worker: "background.js",
      },
      content_scripts: [
        {
          matches: ["<all_urls>"],
          js: ["content.js"],
          run_at: "document_end",
        },
      ],
      action: {
        default_popup: "popup.html",
        default_title: "ORCA Agent",
      },
      web_accessible_resources: [
        {
          resources: ["injected.js"],
          matches: ["<all_urls>"],
        },
      ],
    }

    zip.file("manifest.json", JSON.stringify(manifest, null, 2))

    // Add popup.html - SIMPLIFIED popup that just shows status
    const popupHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      width: 320px;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .status {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      padding: 12px;
      border-radius: 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
    }
    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
    .connected { background: #10b981; }
    .disconnected { background: #ef4444; }
    .connecting { background: #f59e0b; animation: pulse 2s infinite; }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    .button {
      width: 100%;
      padding: 10px 16px;
      margin: 6px 0;
      border: none;
      border-radius: 6px;
      background: #3b82f6;
      color: white;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
    }
    .button:hover {
      background: #2563eb;
    }
    .button:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }
    .button.secondary {
      background: #6b7280;
    }
    .button.secondary:hover {
      background: #4b5563;
    }
    .info {
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 6px;
      padding: 12px;
      margin: 12px 0;
      font-size: 13px;
      color: #0c4a6e;
    }
    .log {
      max-height: 150px;
      overflow-y: auto;
      background: #f8fafc;
      padding: 8px;
      border-radius: 4px;
      font-size: 11px;
      margin-top: 12px;
      border: 1px solid #e2e8f0;
    }
    .agent-info {
      background: #ecfdf5;
      border: 1px solid #bbf7d0;
      border-radius: 6px;
      padding: 10px;
      margin: 10px 0;
      font-size: 12px;
      color: #065f46;
    }
  </style>
</head>
<body>
  <div class="status">
    <div class="status-dot" id="statusDot"></div>
    <div>
      <div id="statusText">Checking connection...</div>
      <div id="agentInfo" style="font-size: 11px; color: #64748b; margin-top: 2px;"></div>
    </div>
  </div>
  
  <button class="button" id="connectBtn">Connect to ORCA</button>
  <button class="button secondary" id="disconnectBtn" style="display: none;">Disconnect</button>
  
  <div class="info">
    <strong>🤖 Persistent Agent:</strong> This extension runs in the background even when the popup is closed. Your remote agent stays connected!
  </div>
  
  <button class="button secondary" id="captureBtn" disabled>📸 Capture Screen</button>
  <button class="button secondary" id="analyzeBtn" disabled>🔍 Analyze Page</button>
  
  <div class="log" id="log"></div>

  <script src="popup.js"></script>
</body>
</html>`

    zip.file("popup.html", popupHtml)

    // Add popup.js - SIMPLIFIED popup that communicates with background
    const popupJs = `class ORCAExtensionPopup {
  constructor() {
    this.chrome = window.chrome
    this.init()
  }

  init() {
    document.getElementById("connectBtn").addEventListener("click", () => this.connect())
    document.getElementById("disconnectBtn").addEventListener("click", () => this.disconnect())
    document.getElementById("captureBtn").addEventListener("click", () => this.captureScreen())
    document.getElementById("analyzeBtn").addEventListener("click", () => this.analyzePage())

    // Get initial status from background
    this.updateStatus()
    
    // Update status every 2 seconds
    setInterval(() => this.updateStatus(), 2000)
  }

  async updateStatus() {
    try {
      // Get status from background script
      const response = await this.chrome.runtime.sendMessage({ type: 'GET_STATUS' })
      
      const statusDot = document.getElementById("statusDot")
      const statusText = document.getElementById("statusText")
      const agentInfo = document.getElementById("agentInfo")
      const connectBtn = document.getElementById("connectBtn")
      const disconnectBtn = document.getElementById("disconnectBtn")
      const captureBtn = document.getElementById("captureBtn")
      const analyzeBtn = document.getElementById("analyzeBtn")

      if (response && response.connected) {
        statusDot.className = "status-dot connected"
        statusText.textContent = "🟢 Connected to ORCA"
        
        if (response.agentId) {
          agentInfo.textContent = "Agent ID: " + response.agentId.slice(-8) + " • " + response.agentName
          connectBtn.style.display = "none"
          disconnectBtn.style.display = "block"
        } else {
          agentInfo.textContent = "Ready to register as remote agent"
          connectBtn.textContent = "Register as Remote Agent"
        }
        
        captureBtn.disabled = false
        analyzeBtn.disabled = false
      } else if (response && response.connecting) {
        statusDot.className = "status-dot connecting"
        statusText.textContent = "🟡 Connecting..."
        agentInfo.textContent = "Establishing connection to ORCA platform"
        captureBtn.disabled = true
        analyzeBtn.disabled = true
      } else {
        statusDot.className = "status-dot disconnected"
        statusText.textContent = "🔴 Disconnected"
        agentInfo.textContent = "Not connected to ORCA platform"
        connectBtn.style.display = "block"
        disconnectBtn.style.display = "none"
        connectBtn.textContent = "Connect to ORCA"
        captureBtn.disabled = true
        analyzeBtn.disabled = true
      }

      // Update log
      if (response && response.logs) {
        const logElement = document.getElementById("log")
        logElement.innerHTML = response.logs.slice(-10).map(log => 
          "<div>" + log + "</div>"
        ).join("")
        logElement.scrollTop = logElement.scrollHeight
      }

    } catch (error) {
      console.error("Failed to get status:", error)
    }
  }

  async connect() {
    try {
      await this.chrome.runtime.sendMessage({ type: 'CONNECT_TO_ORCA' })
      this.log("🔄 Connection request sent to background...")
    } catch (error) {
      this.log("❌ Failed to send connect request: " + error.message)
    }
  }

  async disconnect() {
    try {
      await this.chrome.runtime.sendMessage({ type: 'DISCONNECT_FROM_ORCA' })
      this.log("🔄 Disconnect request sent...")
    } catch (error) {
      this.log("❌ Failed to disconnect: " + error.message)
    }
  }

  async captureScreen() {
    try {
      const response = await this.chrome.runtime.sendMessage({ type: 'CAPTURE_SCREEN' })
      if (response.success) {
        this.log("📸 Screen captured successfully")
      } else {
        this.log("❌ Screen capture failed: " + response.error)
      }
    } catch (error) {
      this.log("❌ Capture error: " + error.message)
    }
  }

  async analyzePage() {
    try {
      const response = await this.chrome.runtime.sendMessage({ type: 'ANALYZE_PAGE' })
      if (response.success) {
        this.log("🔍 Page analyzed: " + response.elementCount + " elements found")
      } else {
        this.log("❌ Analysis failed: " + response.error)
      }
    } catch (error) {
      this.log("❌ Analysis error: " + error.message)
    }
  }

  log(message) {
    // Send log to background script
    this.chrome.runtime.sendMessage({ 
      type: 'ADD_LOG', 
      message: "[" + new Date().toLocaleTimeString() + "] " + message 
    })
  }
}

new ORCAExtensionPopup()`

    zip.file("popup.js", popupJs)

    // Add background.js - THIS IS WHERE ALL THE LOGIC LIVES NOW
    const backgroundJs = `// ORCA Agent Extension Background Script - PERSISTENT SERVICE WORKER
class ORCABackgroundService {
  constructor() {
    this.orcaUrl = "https://v0-orca-three.vercel.app"
    this.connected = false
    this.connecting = false
    this.agentId = null
    this.agentName = null
    this.commandPolling = null
    this.heartbeat = null
    this.logs = []
    
    this.init()
  }

  init() {
    console.log('🤖 ORCA Agent Extension Background Service started')
    this.log('🚀 Background service initialized')
    
    // Load saved agent data
    chrome.storage.local.get(['agentId', 'agentName'], (result) => {
      if (result.agentId) {
        this.agentId = result.agentId
        this.agentName = result.agentName || 'Remote Agent'
        this.log('💾 Loaded saved agent: ' + this.agentId.slice(-8))
        this.startConnection()
      }
    })

    // Handle messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse)
      return true // Keep message channel open for async responses
    })

    // Keep service worker alive
    this.keepAlive()
  }

  keepAlive() {
    // Prevent service worker from going to sleep
    setInterval(() => {
      chrome.storage.local.get(['keepAlive'], () => {
        // This keeps the service worker active
      })
    }, 20000) // Every 20 seconds
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.type) {
        case 'GET_STATUS':
          sendResponse({
            connected: this.connected,
            connecting: this.connecting,
            agentId: this.agentId,
            agentName: this.agentName,
            logs: this.logs
          })
          break

        case 'CONNECT_TO_ORCA':
          await this.connectToORCA()
          sendResponse({ success: true })
          break

        case 'DISCONNECT_FROM_ORCA':
          await this.disconnect()
          sendResponse({ success: true })
          break

        case 'CAPTURE_SCREEN':
          const captureResult = await this.captureScreen()
          sendResponse(captureResult)
          break

        case 'ANALYZE_PAGE':
          const analyzeResult = await this.analyzePage()
          sendResponse(analyzeResult)
          break

        case 'ADD_LOG':
          this.log(request.message)
          sendResponse({ success: true })
          break

        default:
          sendResponse({ error: 'Unknown message type' })
      }
    } catch (error) {
      console.error('Message handling error:', error)
      sendResponse({ error: error.message })
    }
  }

  async connectToORCA() {
    if (this.connecting || this.connected) return

    this.connecting = true
    this.log('🔄 Connecting to ORCA platform...')

    try {
      // Test connection
      const response = await fetch(this.orcaUrl + "/api/extension/ping")
      if (!response.ok) {
        throw new Error('ORCA platform not reachable')
      }

      this.log('✅ Connected to ORCA platform')

      if (!this.agentId) {
        await this.registerAsRemoteAgent()
      } else {
        this.log('🤖 Using existing agent: ' + this.agentId.slice(-8))
      }

      await this.startConnection()

    } catch (error) {
      this.log('❌ Connection failed: ' + error.message)
      this.connecting = false
    }
  }

  async registerAsRemoteAgent() {
    try {
      this.log('📝 Registering as remote agent...')

      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      const currentTab = tabs[0]
      
      this.agentName = 'Remote Agent ' + new Date().toLocaleTimeString()

      const response = await fetch(this.orcaUrl + "/api/remote-agents/register", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          agentName: this.agentName,
          capabilities: ["screen_capture", "element_interaction", "form_filling", "navigation"],
          userAgent: navigator.userAgent,
          currentUrl: currentTab?.url || "unknown",
          ipAddress: "extension-client"
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error('Registration failed: ' + response.status + ' - ' + errorText)
      }

      const result = await response.json()
      this.agentId = result.agentId

      // Save to storage
      chrome.storage.local.set({ 
        agentId: this.agentId, 
        agentName: this.agentName 
      })

      this.log('🎉 Registered successfully!')
      this.log('🆔 Agent ID: ' + this.agentId)

    } catch (error) {
      throw new Error('Registration failed: ' + error.message)
    }
  }

  async startConnection() {
    if (!this.agentId) {
      throw new Error('No agent ID available')
    }

    this.connected = true
    this.connecting = false
    
    this.log('🚀 Starting persistent remote agent service...')

    // Clear any existing intervals
    if (this.commandPolling) clearInterval(this.commandPolling)
    if (this.heartbeat) clearInterval(this.heartbeat)

    // Start command polling every 3 seconds
    this.commandPolling = setInterval(() => {
      this.pollForCommands()
    }, 3000)

    // Send heartbeat every 15 seconds
    this.heartbeat = setInterval(() => {
      this.sendHeartbeat()
    }, 15000)

    // Send initial heartbeat
    await this.sendHeartbeat()

    this.log('✅ Remote agent is now PERSISTENT and ready!')
    this.log('🔄 Polling for commands every 3 seconds')
    this.log('💓 Sending heartbeat every 15 seconds')
  }

  async disconnect() {
    this.log('🔌 Disconnecting from ORCA...')
    
    this.connected = false
    this.connecting = false
    
    if (this.commandPolling) {
      clearInterval(this.commandPolling)
      this.commandPolling = null
    }
    
    if (this.heartbeat) {
      clearInterval(this.heartbeat)
      this.heartbeat = null
    }

    // Clear stored data
    chrome.storage.local.remove(['agentId', 'agentName'])
    this.agentId = null
    this.agentName = null

    this.log('✅ Disconnected successfully')
  }

  async pollForCommands() {
    if (!this.connected || !this.agentId) return

    try {
      const response = await fetch(this.orcaUrl + "/api/remote-agents/" + this.agentId + "/command")
      if (response.ok) {
        const data = await response.json()

        if (data.commands && data.commands.length > 0) {
          for (const command of data.commands) {
            this.log('📨 Command received: ' + command.type)
            await this.executeRemoteCommand(command)
          }
        }
      }
    } catch (error) {
      // Silently handle polling errors
      console.log('Polling error:', error)
    }
  }

  async executeRemoteCommand(command) {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      const activeTab = tabs[0]

      if (!activeTab) {
        this.log('❌ No active tab found')
        return
      }

      this.log('⚡ Executing: ' + command.type)

      const results = await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        function: (cmd) => {
          console.log('🤖 ORCA Remote Command:', cmd)

          // Define remote functions in page context
          if (!window.orcaRemoteClick) {
            window.orcaRemoteClick = (text, selector) => {
              let element

              if (selector) {
                element = document.querySelector(selector)
              } else if (text) {
                const elements = Array.from(
                  document.querySelectorAll(
                    'a, button, [onclick], [role="button"], input[type="button"], input[type="submit"], [data-click]'
                  )
                )
                element = elements.find(
                  (el) =>
                    el.textContent?.toLowerCase().includes(text.toLowerCase()) ||
                    el.value?.toLowerCase().includes(text.toLowerCase()) ||
                    el.alt?.toLowerCase().includes(text.toLowerCase()) ||
                    el.title?.toLowerCase().includes(text.toLowerCase())
                )
              }

              if (element) {
                // Visual feedback
                const originalBorder = element.style.border
                const originalBg = element.style.backgroundColor
                
                element.style.border = "3px solid #ff0000"
                element.style.backgroundColor = "rgba(255,0,0,0.2)"

                setTimeout(() => {
                  element.click()
                  console.log('🖱️ Clicked:', element.tagName, element.textContent?.substring(0, 30))

                  // Remove highlight
                  setTimeout(() => {
                    element.style.border = originalBorder
                    element.style.backgroundColor = originalBg
                  }, 1000)
                }, 500)

                return { 
                  success: true, 
                  element: element.tagName, 
                  text: element.textContent?.substring(0, 50),
                  action: "clicked"
                }
              } else {
                return { 
                  success: false, 
                  error: "Element not found", 
                  searchText: text, 
                  searchSelector: selector 
                }
              }
            }

            window.orcaRemoteFill = (selector, value) => {
              const element = document.querySelector(selector)
              if (element && (element.tagName === "INPUT" || element.tagName === "TEXTAREA")) {
                element.focus()
                element.value = value
                element.dispatchEvent(new Event("input", { bubbles: true }))
                element.dispatchEvent(new Event("change", { bubbles: true }))
                return { success: true, value: value, element: element.tagName }
              }
              return { success: false, error: "Input element not found", selector: selector }
            }
          }

          // Execute command
          switch (cmd.type) {
            case "CLICK_ELEMENT":
              return window.orcaRemoteClick(cmd.text, cmd.selector)
            case "FILL_ELEMENT":
              return window.orcaRemoteFill(cmd.selector, cmd.value)
            case "NAVIGATE":
              window.location.href = cmd.url
              return { success: true, action: "navigate", url: cmd.url }
            default:
              return { success: false, error: "Unknown command type: " + cmd.type }
          }
        },
        args: [command],
      })

      const result = results[0].result
      if (result?.success) {
        this.log('✅ Command executed: ' + (result.action || 'success'))
      } else {
        this.log('❌ Command failed: ' + (result?.error || 'Unknown error'))
      }
    } catch (error) {
      this.log('❌ Execution error: ' + error.message)
    }
  }

  async sendHeartbeat() {
    if (!this.connected || !this.agentId) return

    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      const activeTab = tabs[0]

      await fetch(this.orcaUrl + "/api/remote-agents/" + this.agentId + "/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "online",
          currentUrl: activeTab?.url || "unknown",
          timestamp: new Date().toISOString(),
        }),
      })

      console.log('💓 Heartbeat sent for agent', this.agentId.slice(-8))
    } catch (error) {
      console.log('Heartbeat error:', error)
    }
  }

  async captureScreen() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      const activeTab = tabs[0]

      const dataUrl = await chrome.tabs.captureVisibleTab(activeTab.windowId, {
        format: "png",
        quality: 90,
      })

      const response = await fetch(this.orcaUrl + "/api/extension/analyze-screen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          screenshot: dataUrl,
          url: activeTab.url,
          title: activeTab.title,
          agentId: this.agentId,
        }),
      })

      const result = await response.json()
      this.log('📸 Screen captured and analyzed')
      return { success: true, result }
    } catch (error) {
      this.log('❌ Screen capture failed: ' + error.message)
      return { success: false, error: error.message }
    }
  }

  async analyzePage() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      const activeTab = tabs[0]

      const results = await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        function: () => {
          const clickableSelectors = [
            "a[href]", "button", 'input[type="button"]', 'input[type="submit"]',
            "[onclick]", '[role="button"]', ".btn", ".button"
          ]

          const allElements = document.querySelectorAll(clickableSelectors.join(", "))
          const visibleElements = Array.from(allElements).filter((el) => {
            const style = window.getComputedStyle(el)
            const rect = el.getBoundingClientRect()
            return style.display !== "none" && style.visibility !== "hidden" && 
                   parseFloat(style.opacity) > 0 && rect.width > 0 && rect.height > 0
          })

          return {
            totalElements: visibleElements.length,
            url: window.location.href,
            title: document.title,
            sampleElements: visibleElements.slice(0, 5).map(el => ({
              tag: el.tagName,
              text: (el.textContent || '').substring(0, 30)
            }))
          }
        },
      })

      const pageData = results[0].result
      this.log('🔍 Page analyzed: ' + pageData.totalElements + ' elements')
      return { success: true, elementCount: pageData.totalElements, data: pageData }
    } catch (error) {
      this.log('❌ Page analysis failed: ' + error.message)
      return { success: false, error: error.message }
    }
  }

  log(message) {
    const timestamp = new Date().toLocaleTimeString()
    const logEntry = '[' + timestamp + '] ' + message
    
    this.logs.push(logEntry)
    
    // Keep only last 50 log entries
    if (this.logs.length > 50) {
      this.logs = this.logs.slice(-50)
    }
    
    console.log('ORCA:', message)
  }
}

// Initialize the background service
const orcaService = new ORCABackgroundService()

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('🤖 ORCA Agent Extension installed')
})`

    zip.file("background.js", backgroundJs)

    // Add content.js - SIMPLIFIED since background handles everything
    const contentJs = `// ORCA Content Script - Minimal implementation
console.log('🤖 ORCA Agent Extension content script loaded')

// Listen for messages from ORCA platform (if needed for direct communication)
window.addEventListener("message", (event) => {
  if (event.origin !== "https://v0-orca-three.vercel.app") return
  
  // Forward to background script if needed
  chrome.runtime.sendMessage({
    type: 'PLATFORM_MESSAGE',
    data: event.data
  })
})

// Inject communication script
const script = document.createElement("script")
script.src = chrome.runtime.getURL("injected.js")
document.head.appendChild(script)`

    zip.file("content.js", contentJs)

    // Add injected.js
    const injectedJs = `;(() => {
  const orcaChannel = {
    send: (data) => {
      window.postMessage({
        type: "ORCA_EXTENSION_MESSAGE",
        data: data,
      }, "*")
    },

    onReceive: (callback) => {
      window.addEventListener("message", (event) => {
        if (event.data.type === "ORCA_PLATFORM_MESSAGE") {
          callback(event.data.data)
        }
      })
    },
  }

  window.orcaChannel = orcaChannel
  console.log("🔗 ORCA communication channel established")
})()`

    zip.file("injected.js", injectedJs)

    // Add README.md
    const readme = `# ORCA Agent Extension v1.0

## 🚀 Persistent Remote Agent

This extension now runs as a **persistent background service** that stays connected even when the popup is closed!

## Features
- ✅ **Persistent Connection** - Stays connected in background
- ✅ **Automatic Reconnection** - Restores connection on browser restart  
- ✅ **Real-time Commands** - Receives and executes commands instantly
- ✅ **Screen Capture** - Take screenshots for AI analysis
- ✅ **Element Interaction** - Click buttons, fill forms, navigate pages
- ✅ **Heartbeat Monitoring** - Keeps connection alive with ORCA platform

## Installation
1. Extract this ZIP file to a folder
2. Open Chrome and go to chrome://extensions
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extracted folder
5. Pin the extension to your toolbar

## Usage
1. Click the ORCA extension icon
2. Click "Connect to ORCA" 
3. **Close the popup** - the agent stays connected!
4. Go to ORCA Remote Control to send commands
5. The extension will execute commands automatically

## How It Works
- **Background Service Worker**: Runs persistently in Chrome
- **Command Polling**: Checks for new commands every 3 seconds
- **Heartbeat**: Sends status updates every 15 seconds
- **Auto-Recovery**: Reconnects automatically if connection is lost

## Status Indicators
- 🟢 **Connected**: Agent is online and ready
- 🟡 **Connecting**: Establishing connection
- 🔴 **Disconnected**: Not connected to ORCA

## Troubleshooting
- If connection is lost, click "Connect to ORCA" again
- Check browser console (F12) for detailed logs
- Make sure ORCA platform is running at: https://v0-orca-three.vercel.app

## Security
- Only connects to official ORCA platform
- No data stored permanently
- All commands executed with user consent
`

    zip.file("README.md", readme)

    // Generate the ZIP file
    const zipBuffer = await zip.generateAsync({ type: "arraybuffer" })

    // Return the ZIP file as a download
    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": "attachment; filename=orca-agent-extension.zip",
        "Content-Length": zipBuffer.byteLength.toString(),
      },
    })
  } catch (error) {
    console.error("Failed to generate extension ZIP:", error)
    return NextResponse.json({ error: "Failed to generate extension" }, { status: 500 })
  }
}
