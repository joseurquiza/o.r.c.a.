// This script runs in the page context and can communicate with ORCA
;(() => {
  // Create communication channel with ORCA platform
  const orcaChannel = {
    send: (data) => {
      window.postMessage(
        {
          type: "ORCA_EXTENSION_MESSAGE",
          data: data,
        },
        "*",
      )
    },

    onReceive: (callback) => {
      window.addEventListener("message", (event) => {
        if (event.data.type === "ORCA_PLATFORM_MESSAGE") {
          callback(event.data.data)
        }
      })
    },
  }

  // Make available globally
  window.orcaChannel = orcaChannel

  console.log("🔗 ORCA communication channel established")
})()
