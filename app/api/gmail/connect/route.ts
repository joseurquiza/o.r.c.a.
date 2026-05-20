import { NextResponse } from "next/server"
import { createGmailAuthUrl } from "@/lib/google-auth"

export async function GET() {
  try {
    const url = createGmailAuthUrl("email-agent")
    return NextResponse.redirect(url)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create auth URL" },
      { status: 500 },
    )
  }
}
