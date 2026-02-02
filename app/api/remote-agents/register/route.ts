import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { agentId, userAgent, currentUrl } = await request.json()

    if (!agentId) {
      return NextResponse.json({ error: "Agent ID is required" }, { status: 400 })
    }

    // Check if agent exists
    const { data: existingAgent, error: fetchError } = await supabase
      .from("remote_agents")
      .select("*")
      .eq("id", agentId)
      .single()

    if (fetchError || !existingAgent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    // Update agent status to active
    const { error: updateError } = await supabase
      .from("remote_agents")
      .update({
        status: "active",
        current_url: currentUrl,
        last_seen: new Date().toISOString(),
        user_agent: userAgent,
      })
      .eq("id", agentId)

    if (updateError) {
      console.error("Supabase error:", updateError)
      return NextResponse.json({ error: "Failed to register agent" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Agent registered successfully",
      agentId,
    })
  } catch (error) {
    console.error("Error registering agent:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
