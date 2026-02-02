import { type NextRequest, NextResponse } from "next/server"
import { createGoogleAuthUrl } from "@/lib/google-auth"

export async function GET(request: NextRequest) {
  try {
    console.log("Google OAuth route called")
    console.log("Request URL:", request.url)
    console.log("Request nextUrl:", request.nextUrl)

    // Safely get search params
    let state = `oauth-${Date.now()}`

    try {
      if (request.nextUrl && request.nextUrl.searchParams) {
        const stateParam = request.nextUrl.searchParams.get("state")
        if (stateParam) {
          state = stateParam
        }
      }
    } catch (paramError) {
      console.log("Could not read search params, using default state:", paramError)
    }

    console.log("Using state:", state)

    // Check if we have the required environment variables
    if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
      console.error("NEXT_PUBLIC_GOOGLE_CLIENT_ID not configured")
      const redirectUrl = new URL("/create-agent", request.url)
      redirectUrl.searchParams.set("error", "oauth_config_error")
      redirectUrl.searchParams.set("error_description", "Google Client ID not configured")
      return NextResponse.redirect(redirectUrl)
    }

    if (!process.env.GOOGLE_CLIENT_SECRET) {
      console.error("GOOGLE_CLIENT_SECRET not configured")
      const redirectUrl = new URL("/create-agent", request.url)
      redirectUrl.searchParams.set("error", "oauth_config_error")
      redirectUrl.searchParams.set("error_description", "Google Client Secret not configured")
      return NextResponse.redirect(redirectUrl)
    }

    const authUrl = createGoogleAuthUrl(state)
    console.log("Generated auth URL:", authUrl)

    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error("Failed to create Google auth URL:", error)

    // Create a safe redirect URL
    const baseUrl = request.url ? new URL(request.url).origin : "https://v0-orca-three.vercel.app"
    const redirectUrl = new URL("/create-agent", baseUrl)
    redirectUrl.searchParams.set("error", "oauth_config_error")
    redirectUrl.searchParams.set(
      "error_description",
      error instanceof Error ? error.message : "OAuth configuration error",
    )

    return NextResponse.redirect(redirectUrl)
  }
}
