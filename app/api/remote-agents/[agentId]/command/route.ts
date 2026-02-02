import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest, { params }: { params: { agentId: string } }) {
  try {
    const { agentId } = params
    const body = await request.json()

    console.log(`📨 Sending command to agent: ${agentId}`)
    console.log("🎯 Command data:", JSON.stringify(body))

    // Store command in database
    const { data, error } = await supabase
      .from("remote_agent_commands")
      .insert({
        agent_id: agentId,
        command_type: body.type,
        command_data: body,
        status: "pending",
      })
      .select()

    if (error) {
      console.error("❌ Command storage error:", error)
      return NextResponse.json({ success: false, error: "Failed to store command" }, { status: 500 })
    }

    console.log("✅ Command stored successfully")

    return NextResponse.json({
      success: true,
      commandId: data[0].id,
      message: "Command sent successfully",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Command API error:", error)
    return NextResponse.json({ success: false, error: "Command failed" }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: { params: { agentId: string } }) {
  try {
    const { agentId } = params

    // Get pending commands for this agent
    const { data: commands, error } = await supabase
      .from("remote_agent_commands")
      .select("*")
      .eq("agent_id", agentId)
      .eq("status", "pending")
      .order("created_at", { ascending: true })

    if (error) {
      console.error("❌ Command retrieval error:", error)
      return NextResponse.json({ commands: [], error: "Failed to retrieve commands" }, { status: 500 })
    }

    // Mark commands as delivered
    if (commands && commands.length > 0) {
      const commandIds = commands.map((cmd) => cmd.id)
      await supabase.from("remote_agent_commands").update({ status: "delivered" }).in("id", commandIds)

      console.log(`📤 Delivered ${commands.length} commands to agent: ${agentId}`)
    }

    return NextResponse.json({
      commands: commands?.map((cmd) => cmd.command_data) || [],
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Command retrieval API error:", error)
    return NextResponse.json({ commands: [], error: "Command retrieval failed" }, { status: 500 })
  }
}
