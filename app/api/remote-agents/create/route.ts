import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { name, description } = await request.json()

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Agent name is required" }, { status: 400 })
    }

    // Generate unique agent ID
    const agentId = `remote_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`

    const { data: agent, error } = await supabase
      .from("remote_agents")
      .insert({
        id: agentId,
        name: name.trim(),
        description: description?.trim() || null,
        status: "pending",
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error("Supabase error:", error)
      return NextResponse.json({ error: "Failed to create agent" }, { status: 500 })
    }

    return NextResponse.json({ agent })
  } catch (error) {
    console.error("Error creating agent:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
