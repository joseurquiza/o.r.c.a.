// ORCA Extension v2 - Modern Content Script
// Improved element detection and command execution

const chrome = window.chrome; // Declare the chrome variable

console.log("[ORCA] Content script v2 loaded")

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getPageElements") {
    const elements = getClickableElements()
    sendResponse(elements)
    return true
  }

  if (request.action === "executeCommand") {
    executeCommand(request.command)
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ success: false, error: error.message }))
    return true
  }
})

function getClickableElements() {
  const elements = []
  const seen = new Set()

  // Selectors for interactive elements
  const selectors = [
    "a[href]",
    "button",
    'input:not([type="hidden"])',
    "select",
    "textarea",
    '[role="button"]',
    '[role="link"]',
    '[role="tab"]',
    '[role="menuitem"]',
    '[onclick]',
    '[tabindex]:not([tabindex="-1"])',
    ".clickable",
    "[data-clickable]",
  ]

  const allElements = document.querySelectorAll(selectors.join(", "))

  allElements.forEach((el, index) => {
    // Skip hidden elements
    const rect = el.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return

    const style = window.getComputedStyle(el)
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return

    // Skip elements outside viewport
    if (rect.bottom < 0 || rect.top > window.innerHeight) return
    if (rect.right < 0 || rect.left > window.innerWidth) return

    // Generate a unique selector
    const selector = generateSelector(el)
    if (seen.has(selector)) return
    seen.add(selector)

    // Get meaningful text content
    const textContent = getElementText(el)

    elements.push({
      index: elements.length,
      tagName: el.tagName.toLowerCase(),
      textContent: textContent,
      value: el.value || "",
      alt: el.alt || "",
      title: el.title || "",
      selector: selector,
      id: el.id || "",
      className: el.className?.toString() || "",
      href: el.href || "",
      type: el.type || "",
      role: el.getAttribute("role") || "",
      position: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      },
    })
  })

  console.log(`[ORCA] Found ${elements.length} interactive elements`)
  return elements
}

function generateSelector(el) {
  // Try ID first
  if (el.id) {
    return `#${CSS.escape(el.id)}`
  }

  // Try unique class combination
  if (el.className && typeof el.className === "string") {
    const classes = el.className.trim().split(/\s+/).filter(Boolean)
    if (classes.length > 0) {
      const classSelector = "." + classes.map(CSS.escape).join(".")
      if (document.querySelectorAll(classSelector).length === 1) {
        return classSelector
      }
    }
  }

  // Build path from ancestors
  const path = []
  let current = el

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase()

    if (current.id) {
      selector = `#${CSS.escape(current.id)}`
      path.unshift(selector)
      break
    }

    // Add nth-child for uniqueness
    const parent = current.parentElement
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (c) => c.tagName === current.tagName
      )
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1
        selector += `:nth-child(${index})`
      }
    }

    path.unshift(selector)
    current = current.parentElement
  }

  return path.join(" > ")
}

function getElementText(el) {
  // Get aria-label first
  const ariaLabel = el.getAttribute("aria-label")
  if (ariaLabel) return ariaLabel.trim()

  // Get text content, but limit depth
  const text = getTextContent(el, 0)
  if (text) return text

  // Fall back to other attributes
  return el.placeholder || el.alt || el.title || el.value || ""
}

function getTextContent(el, depth) {
  if (depth > 3) return ""

  let text = ""
  for (const child of el.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      text += child.textContent
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      text += getTextContent(child, depth + 1)
    }
  }
  return text.trim().slice(0, 200)
}

async function executeCommand(command) {
  console.log("[ORCA] Executing command:", command)

  switch (command.command_type || command.type) {
    case "CLICK_ELEMENT":
      return clickElement(command.command_data || command)

    case "SCROLL":
      return scroll(command.command_data || command)

    case "NAVIGATE":
      return navigate(command.command_data || command)

    case "TYPE_TEXT":
      return typeText(command.command_data || command)

    case "CAPTURE_SCREEN":
      return captureScreen()

    case "REFRESH_ELEMENTS":
      return { success: true, elements: getClickableElements() }

    default:
      console.warn("[ORCA] Unknown command type:", command.command_type || command.type)
      return { success: false, error: "Unknown command type" }
  }
}

function clickElement(data) {
  const { selector, text, elementIndex } = data

  let element = null

  // Try selector first
  if (selector) {
    try {
      element = document.querySelector(selector)
    } catch (e) {
      console.warn("[ORCA] Invalid selector:", selector)
    }
  }

  // Fall back to text matching
  if (!element && text) {
    const elements = getClickableElements()
    const match = elements.find(
      (el) =>
        el.textContent?.toLowerCase().includes(text.toLowerCase()) ||
        el.value?.toLowerCase().includes(text.toLowerCase())
    )
    if (match) {
      try {
        element = document.querySelector(match.selector)
      } catch (e) {
        console.warn("[ORCA] Could not find element by text")
      }
    }
  }

  if (element) {
    // Scroll into view
    element.scrollIntoView({ behavior: "smooth", block: "center" })

    // Highlight briefly
    const originalOutline = element.style.outline
    element.style.outline = "3px solid #00ff00"
    setTimeout(() => {
      element.style.outline = originalOutline
    }, 500)

    // Click after scroll animation
    setTimeout(() => {
      element.click()
    }, 300)

    return { success: true, message: "Element clicked" }
  }

  return { success: false, error: "Element not found" }
}

function scroll(data) {
  const { x = 0, y = 0 } = data
  window.scrollBy({ left: x, top: y, behavior: "smooth" })
  return { success: true, message: `Scrolled by (${x}, ${y})` }
}

function navigate(data) {
  const { url } = data
  if (url) {
    window.location.href = url
    return { success: true, message: `Navigating to ${url}` }
  }
  return { success: false, error: "No URL provided" }
}

function typeText(data) {
  const { text, selector } = data

  let element = document.activeElement

  if (selector) {
    try {
      element = document.querySelector(selector)
    } catch (e) {
      console.warn("[ORCA] Invalid selector for typing:", selector)
    }
  }

  if (element && (element.tagName === "INPUT" || element.tagName === "TEXTAREA")) {
    element.focus()
    element.value = text

    // Dispatch input event for frameworks
    element.dispatchEvent(new Event("input", { bubbles: true }))
    element.dispatchEvent(new Event("change", { bubbles: true }))

    return { success: true, message: "Text entered" }
  }

  return { success: false, error: "No input element focused" }
}

function captureScreen() {
  // Screen capture requires background script permissions
  // This is a placeholder that reports the current page state
  return {
    success: true,
    url: window.location.href,
    title: document.title,
    scrollPosition: {
      x: window.scrollX,
      y: window.scrollY,
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
  }
}
