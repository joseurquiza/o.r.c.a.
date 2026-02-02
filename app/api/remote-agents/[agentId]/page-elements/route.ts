import { type NextRequest, NextResponse } from "next/server"

// Global storage for remote agent data (shared with analyze endpoint)
const globalAgentData = new Map()

export async function POST(request: NextRequest, { params }: { params: { agentId: string } }) {
  try {
    const agentId = params.agentId
    console.log("📋 Page elements API called for agent:", agentId)

    const body = await request.json()
    console.log("📦 Page elements request:", {
      url: body.url,
      title: body.title,
      elementsCount: body.elements?.length || 0,
    })

    // Validate and store elements
    if (!body.elements || !Array.isArray(body.elements)) {
      return NextResponse.json({ success: false, error: "Invalid elements data" }, { status: 400 })
    }

    // Store the page elements data
    const pageData = {
      agentId: agentId,
      url: body.url,
      title: body.title,
      elements: body.elements,
      timestamp: body.timestamp || new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    }

    globalAgentData.set(agentId, pageData)
    console.log("💾 Stored page elements for agent:", agentId)

    return NextResponse.json({
      success: true,
      message: "Page elements stored successfully",
      elementsCount: body.elements.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Page elements API error:", error)
    return NextResponse.json({ success: false, error: "Failed to store page elements" }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: { params: { agentId: string } }) {
  try {
    const agentId = params.agentId
    console.log("📖 Getting page elements for agent:", agentId)
    console.log("🔧 Available agents:", Array.from(globalAgentData.keys()))

    // Get stored data for this agent
    const agentData = globalAgentData.get(agentId)

    if (!agentData || !agentData.elements) {
      console.log("❌ No elements found for agent:", agentId)
      console.log("🔧 Agent data exists:", !!agentData)
      console.log("🔧 Elements exist:", !!agentData?.elements)
      console.log("🔧 Elements count:", agentData?.elements?.length || 0)

      return NextResponse.json({
        elements: [],
        message: "No page elements available for this agent",
        debug: {
          agentId: agentId,
          requestedAgentId: agentId,
          totalAgentsWithData: globalAgentData.size,
          availableAgents: Array.from(globalAgentData.keys()),
          agentDataExists: !!agentData,
          elementsExist: !!agentData?.elements,
          elementsCount: agentData?.elements?.length || 0,
        },
      })
    }

    console.log("✅ Found elements for agent:", agentId, "- Count:", agentData.elements.length)

    return NextResponse.json({
      elements: agentData.elements,
      url: agentData.url,
      title: agentData.title,
      timestamp: agentData.timestamp,
      lastUpdated: agentData.lastUpdated,
      debug: {
        agentId: agentId,
        elementsCount: agentData.elements.length,
        totalAgentsWithData: globalAgentData.size,
        lastUpdated: agentData.lastUpdated,
      },
    })
  } catch (error) {
    console.error("❌ Get page elements error:", error)
    return NextResponse.json(
      {
        elements: [],
        error: "Failed to retrieve page elements",
        debug: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      },
      { status: 500 },
    )
  }
}
