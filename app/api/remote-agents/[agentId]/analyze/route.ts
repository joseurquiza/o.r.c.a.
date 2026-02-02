import { type NextRequest, NextResponse } from "next/server"

// Global storage for remote agent data
const globalAgentData = new Map()

export async function POST(request: NextRequest, { params }: { params: { agentId: string } }) {
  try {
    const agentId = params.agentId
    console.log("🔍 Analyze API called for agent:", agentId)

    const body = await request.json()
    console.log("📦 Request body received:", {
      url: body.url,
      title: body.title,
      elementsCount: body.elements?.length || 0,
      timestamp: body.timestamp,
    })

    // Validate request data
    if (!body.elements || !Array.isArray(body.elements)) {
      console.log("❌ Invalid elements data:", typeof body.elements)
      return NextResponse.json(
        {
          success: false,
          error: "Invalid elements data - expected array",
          received: typeof body.elements,
        },
        { status: 400 },
      )
    }

    // Transform extension data to our expected format
    const transformedElements = body.elements.map((element: any, index: number) => ({
      index: index,
      tag: element.tagName || "UNKNOWN",
      text: element.textContent || element.value || element.alt || element.title || "",
      selector: element.selector || `${element.tagName}${element.id ? "#" + element.id : ""}`,
      href: element.href || "",
      type: element.type || "",
      role: element.role || "",
      position: {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      },
    }))

    console.log("🔄 Transformed elements:", transformedElements.length)
    console.log("🔍 Sample transformed elements:", transformedElements.slice(0, 3))

    // Store in global storage
    const agentData = {
      agentId: agentId,
      url: body.url,
      title: body.title,
      elements: transformedElements,
      timestamp: body.timestamp || new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      elementsCount: transformedElements.length,
    }

    globalAgentData.set(agentId, agentData)
    console.log("💾 Stored data for agent:", agentId)
    console.log("📊 Total agents with data:", globalAgentData.size)

    // Log storage contents for debugging
    const storedData = globalAgentData.get(agentId)
    console.log("✅ Verification - stored elements count:", storedData?.elements?.length)

    return NextResponse.json({
      success: true,
      message: "Page elements analyzed and stored successfully",
      elementsProcessed: transformedElements.length,
      agentId: agentId,
      timestamp: new Date().toISOString(),
      debug: {
        receivedElements: body.elements?.length || 0,
        transformedElements: transformedElements.length,
        storedElements: storedData?.elements?.length || 0,
        totalAgentsWithData: globalAgentData.size,
      },
    })
  } catch (error) {
    console.error("❌ Analyze API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process page analysis",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest, { params }: { params: { agentId: string } }) {
  try {
    const agentId = params.agentId
    console.log("📖 Get analyze data for agent:", agentId)

    const agentData = globalAgentData.get(agentId)

    if (!agentData) {
      console.log("❌ No data found for agent:", agentId)
      return NextResponse.json({
        success: false,
        message: "No analysis data available for this agent",
        debug: {
          requestedAgent: agentId,
          totalAgentsWithData: globalAgentData.size,
          availableAgents: Array.from(globalAgentData.keys()),
        },
      })
    }

    console.log("✅ Found data for agent:", agentId, "with", agentData.elements?.length, "elements")

    return NextResponse.json({
      success: true,
      data: agentData,
      debug: {
        agentId: agentId,
        elementsCount: agentData.elements?.length || 0,
        lastUpdated: agentData.lastUpdated,
        totalAgentsWithData: globalAgentData.size,
      },
    })
  } catch (error) {
    console.error("❌ Get analyze API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve analysis data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
