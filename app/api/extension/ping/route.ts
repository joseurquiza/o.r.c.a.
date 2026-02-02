import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    status: "connected",
    timestamp: new Date().toISOString(),
    platform: "ORCA Agent Platform",
  })
}
