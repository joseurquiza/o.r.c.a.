import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const agentData = await request.json()

    // Validate required fields
    if (!agentData.name || !agentData.description || !agentData.selectedAPIs?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate that all selected APIs are connected
    const unconnectedAPIs = agentData.selectedAPIs.filter((apiId: string) => !agentData.connectedIntegrations?.[apiId])

    if (unconnectedAPIs.length > 0) {
      return NextResponse.json({ error: "All selected APIs must be connected", unconnectedAPIs }, { status: 400 })
    }

    // Generate unique agent ID
    const agentId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // In production, save to database
    // For now, we'll use a simple storage mechanism
    const agent = {
      id: agentId,
      ...agentData,
      status: "active",
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
    }

    // TODO: Save to database
    // await db.agents.create(agent)

    console.log("Agent created:", {
      id: agentId,
      name: agentData.name,
      apis: agentData.selectedAPIs,
      connectedIntegrations: Object.keys(agentData.connectedIntegrations).filter(
        (key) => agentData.connectedIntegrations[key],
      ),
    })

    return NextResponse.json({
      success: true,
      agentId,
      message: "Agent created successfully",
    })
  } catch (error) {
    console.error("Failed to create agent:", error)
    return NextResponse.json({ error: "Failed to create agent" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // TODO: Fetch agents from database
    // const agents = await db.agents.findMany()

    // For now, return empty array
    return NextResponse.json({ agents: [] })
  } catch (error) {
    console.error("Failed to fetch agents:", error)
    return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 })
  }
}
