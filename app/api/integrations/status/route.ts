import { NextResponse } from "next/server"

export async function GET() {
  try {
    const status = {
      google: {
        clientId: !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        clientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        configured: !!(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      },
      microsoft: {
        clientId: !!process.env.MICROSOFT_CLIENT_ID,
        clientSecret: !!process.env.MICROSOFT_CLIENT_SECRET,
        configured: !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET),
      },
      slack: {
        clientId: !!process.env.SLACK_CLIENT_ID,
        clientSecret: !!process.env.SLACK_CLIENT_SECRET,
        configured: !!(process.env.SLACK_CLIENT_ID && process.env.SLACK_CLIENT_SECRET),
      },
    }

    return NextResponse.json(status)
  } catch (error) {
    console.error("Failed to check integration status:", error)
    return NextResponse.json({ error: "Failed to check status" }, { status: 500 })
  }
}
