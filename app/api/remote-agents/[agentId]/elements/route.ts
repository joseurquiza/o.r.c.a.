import { type NextRequest, NextResponse } from "next/server"
import { authenticateAgentRequest } from "@/lib/agents/auth"
import { createAdminClient } from "@/lib/supabase/admin"

const MAX_BODY_BYTES = 1_000_000 // 1 MB cap

export async function POST(request: NextRequest, { params }: { params: { agentId: string } }) {
  const { agentId } = params
  const ctx = await authenticateAgentRequest(request, { agentId })
  if (!ctx) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const len = Number(request.headers.get("content-length") ?? "0")
  if (len > MAX_BODY_BYTES) {
    return NextResponse.json({ success: false, error: "Payload too large" }, { status: 413 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 })
  }
  const { url, title, elements, timestamp } = body
  if (!Array.isArray(elements)) {
    return NextResponse.json({ success: false, error: "Elements array is required" }, { status: 400 })
  }

  const admin = createAdminClient()
  // Verify org match
  const { data: agentRow } = await admin
    .from("remote_agents")
    .select("agent_id, org_id")
    .eq("agent_id", agentId)
    .maybeSingle()
  if (!agentRow || agentRow.org_id !== ctx.orgId) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  // Replace prior snapshot for this agent+page_url
  await admin
    .from("remote_agent_elements")
    .delete()
    .eq("agent_id", agentId)
    .eq("page_url", url ?? "")

  const rows = elements.slice(0, 500).map((element: any, index: number) => ({
    agent_id: agentId,
    page_url: url ?? "unknown",
    page_title: title ?? null,
    element_index: typeof element.index === "number" ? element.index : index,
    tag: element.tagName ?? element.tag ?? null,
    text: typeof element.textContent === "string" ? element.textContent.slice(0, 2000) : null,
    selector: element.selector ?? null,
    element_id: element.id ?? null,
    class_name: element.className ?? null,
    href: element.href ?? null,
    element_type: element.type ?? null,
    role: element.role ?? null,
    is_clickable: !!element.isClickable,
    position_x: element.position?.x ?? 0,
    position_y: element.position?.y ?? 0,
    position_width: element.position?.width ?? 0,
    position_height: element.position?.height ?? 0,
    detected_at: timestamp || new Date().toISOString(),
  }))

  const { error } = await admin.from("remote_agent_elements").insert(rows)
  if (error) {
    return NextResponse.json({ success: false, error: "Failed to store elements" }, { status: 500 })
  }

  await admin
    .from("remote_agents")
    .update({ current_url: url ?? null, last_seen: new Date().toISOString() })
    .eq("agent_id", agentId)
    .eq("org_id", ctx.orgId)

  return NextResponse.json({ success: true, elementsStored: rows.length })
}

export async function GET(request: NextRequest, { params }: { params: { agentId: string } }) {
  const { agentId } = params
  const ctx = await authenticateAgentRequest(request, { agentId })
  if (!ctx) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()
  const { data: agentRow } = await admin
    .from("remote_agents")
    .select("agent_id, org_id")
    .eq("agent_id", agentId)
    .maybeSingle()
  if (!agentRow || agentRow.org_id !== ctx.orgId) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 })
  }

  const { data, error } = await admin
    .from("remote_agent_elements")
    .select("*")
    .eq("agent_id", agentId)
    .order("detected_at", { ascending: false })
    .limit(100)
  if (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch elements" }, { status: 500 })
  }

  const mostRecentUrl = data?.[0]?.page_url ?? null
  const mostRecent = (data ?? []).filter((r) => r.page_url === mostRecentUrl)
  return NextResponse.json({
    elements: mostRecent.map((el) => ({
      index: el.element_index,
      tag: el.tag,
      text: el.text,
      selector: el.selector,
      href: el.href,
      type: el.element_type,
      role: el.role,
      id: el.element_id,
      className: el.class_name,
      isClickable: el.is_clickable,
      position: {
        x: el.position_x,
        y: el.position_y,
        width: el.position_width,
        height: el.position_height,
      },
      detectedAt: el.detected_at,
    })),
    url: mostRecentUrl,
    title: mostRecent[0]?.page_title ?? null,
  })
}
