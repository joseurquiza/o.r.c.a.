import { type NextRequest, NextResponse } from "next/server"
import { createGmailAuthUrl } from "@/lib/google-auth"

export async function GET(request: NextRequest) {
  // Allow callers to choose where to return after OAuth: ?from=connections | email-agent
  const from = request.nextUrl.searchParams.get("from") || "connections"
  try {
    const url = createGmailAuthUrl(from === "email-agent" ? "email-agent" : "connections")
    return NextResponse.redirect(url)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create auth URL" },
      { status: 500 },
    )
  }
}
