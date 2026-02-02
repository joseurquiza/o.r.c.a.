import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest, { params }: { params: { agentId: string } }) {
  try {
    const { agentId } = params
    const body = await request.json()

    console.log(`💓 Heartbeat from agent: ${agentId}`)

    // Update agent status and last seen
    const { error } = await supabase
      .from("remote_agents")
      .update({
        status: body.status || "active",
        current_url: body.currentUrl,
        last_seen: new Date().toISOString(),
      })
      .eq("agent_id", agentId)

    if (error) {
      console.error("❌ Heartbeat database error:", error)
      return NextResponse.json({ success: false, error: "Failed to update heartbeat" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Heartbeat received",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Heartbeat API error:", error)
    return NextResponse.json({ success: false, error: "Heartbeat failed" }, { status: 500 })
  }
}
