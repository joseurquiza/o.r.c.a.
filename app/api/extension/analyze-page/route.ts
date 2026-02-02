import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const pageData = await request.json()

    const analysis = {
      clickableElements: pageData.clickableElements?.length || 0,
      forms: pageData.forms?.length || 0,
      inputs: pageData.inputs?.length || 0,
      url: pageData.url,
      title: pageData.title,
      capabilities: [],
      timestamp: new Date().toISOString(),
      elementBreakdown: {
        links: pageData.clickableElements?.filter((el) => el.tag === "A").length || 0,
        buttons: pageData.clickableElements?.filter((el) => el.tag === "BUTTON").length || 0,
        inputs: pageData.clickableElements?.filter((el) => el.tag === "INPUT").length || 0,
        interactive: pageData.clickableElements?.filter((el) => el.role === "button" || el.onclick).length || 0,
      },
      sampleElements:
        pageData.clickableElements?.slice(0, 5).map((el) => ({
          tag: el.tag,
          text: el.text?.substring(0, 50) + (el.text?.length > 50 ? "..." : ""),
          selector: el.selector,
        })) || [],
    }

    // Analyze what the agent can do on this page
    if (pageData.forms?.length > 0) {
      analysis.capabilities.push("Fill and submit forms")
    }

    if (pageData.clickableElements?.length > 0) {
      analysis.capabilities.push("Click buttons and links")
    }

    if (pageData.inputs?.length > 0) {
      analysis.capabilities.push("Enter text in input fields")
    }

    if (analysis.elementBreakdown.links > 0) {
      analysis.capabilities.push("Navigate to other pages")
    }

    console.log("Page analyzed:", {
      url: analysis.url,
      title: analysis.title,
      clickableElements: analysis.clickableElements,
      breakdown: analysis.elementBreakdown,
      sampleElements: analysis.sampleElements,
    })

    return NextResponse.json(analysis)
  } catch (error) {
    console.error("Page analysis error:", error)
    return NextResponse.json({ error: "Failed to analyze page" }, { status: 500 })
  }
}
