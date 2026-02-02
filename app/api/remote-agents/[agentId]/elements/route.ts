import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(request: NextRequest, { params }: { params: { agentId: string } }) {
  try {
    const { agentId } = params
    const body = await request.json()

    console.log("📝 Elements storage request for agent:", agentId)
    console.log("📦 Request body:", JSON.stringify(body, null, 2))

    const { url, title, elements, timestamp } = body

    if (!agentId) {
      console.error("❌ Missing agentId in elements storage request")
      return NextResponse.json({ success: false, error: "Agent ID is required" }, { status: 400 })
    }

    if (!elements || !Array.isArray(elements)) {
      console.error("❌ Missing or invalid elements array")
      return NextResponse.json({ success: false, error: "Elements array is required" }, { status: 400 })
    }

    console.log(`📊 Processing ${elements.length} elements for storage`)

    // First, verify the agent exists
    const { data: agentData, error: agentError } = await supabase
      .from("remote_agents")
      .select("agent_id")
      .eq("agent_id", agentId)
      .single()

    if (agentError || !agentData) {
      console.error("❌ Agent not found:", agentError)
      return NextResponse.json({ success: false, error: "Agent not found" }, { status: 404 })
    }

    console.log("✅ Agent verified:", agentId)

    // Clear existing elements for this agent and URL
    const { error: deleteError } = await supabase
      .from("remote_agent_elements")
      .delete()
      .eq("agent_id", agentId)
      .eq("url", url)

    if (deleteError) {
      console.error("❌ Error clearing existing elements:", deleteError)
    } else {
      console.log("🗑️ Cleared existing elements for this URL")
    }

    // Prepare elements for insertion
    const elementsToInsert = elements.map((element, index) => ({
      agent_id: agentId,
      url: url || "unknown",
      title: title || "Unknown Page",
      element_index: element.index || index,
      tag_name: element.tagName || "unknown",
      text_content: element.textContent || "",
      value: element.value || "",
      alt: element.alt || "",
      title_attr: element.title || "",
      selector: element.selector || "",
      element_id: element.id || "",
      class_name: element.className || "",
      href: element.href || "",
      type: element.type || "",
      role: element.role || "",
      position_x: element.position?.x || 0,
      position_y: element.position?.y || 0,
      position_width: element.position?.width || 0,
      position_height: element.position?.height || 0,
      is_clickable: true,
      detected_at: timestamp || new Date().toISOString(),
    }))

    console.log("📋 Sample element to insert:", JSON.stringify(elementsToInsert[0], null, 2))

    // Insert elements in batches to avoid timeout
    const batchSize = 50
    let totalInserted = 0

    for (let i = 0; i < elementsToInsert.length; i += batchSize) {
      const batch = elementsToInsert.slice(i, i + batchSize)
      console.log(`📦 Inserting batch ${Math.floor(i / batchSize) + 1}: ${batch.length} elements`)

      const { data: insertData, error: insertError } = await supabase
        .from("remote_agent_elements")
        .insert(batch)
        .select("id")

      if (insertError) {
        console.error("❌ Error inserting batch:", insertError)
        console.error("❌ Failed batch data:", JSON.stringify(batch[0], null, 2))
        return NextResponse.json(
          {
            success: false,
            error: "Failed to store elements",
            details: insertError.message,
            batchIndex: Math.floor(i / batchSize),
          },
          { status: 500 },
        )
      }

      totalInserted += insertData?.length || batch.length
      console.log(`✅ Batch inserted successfully: ${insertData?.length || batch.length} elements`)
    }

    // Update agent's last seen and current URL
    const { error: updateError } = await supabase
      .from("remote_agents")
      .update({
        current_url: url,
        last_seen: new Date().toISOString(),
      })
      .eq("agent_id", agentId)

    if (updateError) {
      console.error("❌ Error updating agent:", updateError)
    } else {
      console.log("✅ Agent updated with current URL")
    }

    console.log(`🎉 Successfully stored ${totalInserted} elements in database`)

    return NextResponse.json({
      success: true,
      message: "Elements stored successfully",
      elementsStored: totalInserted,
      agentId: agentId,
      url: url,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("❌ Elements storage error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to store elements",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest, { params }: { params: { agentId: string } }) {
  try {
    const { agentId } = params

    console.log("📖 Elements retrieval request for agent:", agentId)

    if (!agentId) {
      return NextResponse.json({ success: false, error: "Agent ID is required" }, { status: 400 })
    }

    // Get the most recent elements for this agent
    const { data: elementsData, error: elementsError } = await supabase
      .from("remote_agent_elements")
      .select("*")
      .eq("agent_id", agentId)
      .order("detected_at", { ascending: false })
      .limit(100) // Limit to most recent 100 elements

    if (elementsError) {
      console.error("❌ Error fetching elements:", elementsError)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to fetch elements",
          details: elementsError.message,
        },
        { status: 500 },
      )
    }

    // Group elements by URL and get the most recent page
    const elementsByUrl = elementsData.reduce(
      (acc, element) => {
        if (!acc[element.url]) {
          acc[element.url] = []
        }
        acc[element.url].push(element)
        return acc
      },
      {} as Record<string, any[]>,
    )

    // Get the most recent URL
    const mostRecentUrl = Object.keys(elementsByUrl)[0]
    const mostRecentElements = mostRecentUrl ? elementsByUrl[mostRecentUrl] : []

    // Transform elements back to frontend format
    const transformedElements = mostRecentElements.map((element) => ({
      index: element.element_index,
      tag: element.tag_name,
      text: element.text_content || element.value || element.alt || element.title_attr || "No text",
      selector: element.selector,
      href: element.href,
      type: element.type,
      role: element.role,
      id: element.element_id,
      className: element.class_name,
      isClickable: element.is_clickable,
      position: {
        x: element.position_x,
        y: element.position_y,
        width: element.position_width,
        height: element.position_height,
      },
      detectedAt: element.detected_at,
    }))

    const responseData = {
      elements: transformedElements,
      url: mostRecentUrl || "unknown",
      title: mostRecentElements[0]?.title || "Unknown Page",
      timestamp: mostRecentElements[0]?.detected_at || new Date().toISOString(),
      debug: {
        totalElementsInDb: elementsData.length,
        uniqueUrls: Object.keys(elementsByUrl).length,
        elementsForCurrentUrl: transformedElements.length,
        agentId: agentId,
      },
    }

    console.log(`📊 Returning ${transformedElements.length} elements for agent ${agentId}`)
    console.log(`🌐 Most recent URL: ${mostRecentUrl}`)

    return NextResponse.json(responseData)
  } catch (error) {
    console.error("❌ Elements retrieval error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve elements",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
