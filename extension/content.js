class ORCAContentScript {
  constructor() {
    this.orcaUrl = "https://theorca.app"
    this.init()
  }

  init() {
    // Listen for messages from ORCA platform
    window.addEventListener("message", (event) => {
      if (event.origin !== this.orcaUrl) return

      this.handleORCACommand(event.data)
    })

    // Inject communication script
    const script = document.createElement("script")
    script.src = window.chrome.runtime.getURL("injected.js")
    document.head.appendChild(script)

    console.log("🤖 ORCA Agent Extension loaded")
  }

  async handleORCACommand(command) {
    console.log("📨 Received ORCA command:", command)

    switch (command.type) {
      case "CLICK_ELEMENT":
        await this.clickElement(command.selector, command.text)
        break
      case "FILL_INPUT":
        await this.fillInput(command.selector, command.value)
        break
      case "SUBMIT_FORM":
        await this.submitForm(command.selector)
        break
      case "NAVIGATE":
        window.location.href = command.url
        break
      case "SCROLL":
        window.scrollBy(command.x || 0, command.y || 0)
        break
      case "WAIT":
        await this.wait(command.duration || 1000)
        break
      case "EXTRACT_TEXT":
        return this.extractText(command.selector)
        break
    }
  }

  async clickElement(selector, text) {
    let element

    if (selector) {
      element = document.querySelector(selector)
    } else if (text) {
      // Find element by text content
      const elements = Array.from(document.querySelectorAll('button, a, [onclick], [role="button"]'))
      element = elements.find(
        (el) =>
          el.textContent?.toLowerCase().includes(text.toLowerCase()) ||
          el.value?.toLowerCase().includes(text.toLowerCase()),
      )
    }

    if (element) {
      // Highlight element briefly
      const originalStyle = element.style.cssText
      element.style.cssText += "border: 3px solid #ff0000 !important; background: rgba(255,0,0,0.1) !important;"

      await this.wait(500)

      element.click()
      console.log("🖱️ Clicked element:", element)

      // Restore original style
      setTimeout(() => {
        element.style.cssText = originalStyle
      }, 1000)

      return { success: true, element: element.tagName }
    } else {
      console.error("❌ Element not found:", selector || text)
      return { success: false, error: "Element not found" }
    }
  }

  async fillInput(selector, value) {
    const element = document.querySelector(selector)

    if (element && (element.tagName === "INPUT" || element.tagName === "TEXTAREA")) {
      // Highlight input
      const originalStyle = element.style.cssText
      element.style.cssText += "border: 3px solid #00ff00 !important;"

      element.focus()
      element.value = value

      // Trigger input events
      element.dispatchEvent(new Event("input", { bubbles: true }))
      element.dispatchEvent(new Event("change", { bubbles: true }))

      console.log("✏️ Filled input:", selector, "with:", value)

      setTimeout(() => {
        element.style.cssText = originalStyle
      }, 1000)

      return { success: true }
    } else {
      console.error("❌ Input not found:", selector)
      return { success: false, error: "Input not found" }
    }
  }

  async submitForm(selector) {
    const form = document.querySelector(selector || "form")

    if (form) {
      form.submit()
      console.log("📤 Submitted form:", selector)
      return { success: true }
    } else {
      console.error("❌ Form not found:", selector)
      return { success: false, error: "Form not found" }
    }
  }

  extractText(selector) {
    const element = document.querySelector(selector)

    if (element) {
      const text = element.textContent || element.innerText || element.value
      console.log("📄 Extracted text:", text)
      return { success: true, text }
    } else {
      console.error("❌ Element not found for text extraction:", selector)
      return { success: false, error: "Element not found" }
    }
  }

  wait(duration) {
    return new Promise((resolve) => setTimeout(resolve, duration))
  }
}

new ORCAContentScript()
