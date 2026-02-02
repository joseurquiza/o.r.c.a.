import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function DELETE(request: NextRequest, { params }: { params: { agentId: string } }) {
  try {
    const { agentId } = params

    const { error } = await supabase.from("remote_agents").delete().eq("id", agentId)

    if (error) {
      console.error("Supabase error:", error)
      return NextResponse.json({ error: "Failed to delete agent" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting agent:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: { params: { agentId: string } }) {
  try {
    const { agentId } = params

    const { data: agent, error } = await supabase.from("remote_agents").select("*").eq("id", agentId).single()

    if (error) {
      console.error("Supabase error:", error)
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    return NextResponse.json({ agent })
  } catch (error) {
    console.error("Error fetching agent:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
