import { type NextRequest, NextResponse } from "next/server"
import { exchangeCodeForTokens, GoogleCalendarClient } from "@/lib/google-auth"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")

  console.log("OAuth callback received:", { code: !!code, state, error })

  if (error) {
    console.error("OAuth error:", error)
    const redirectUrl = new URL("/create-agent", request.url)
    redirectUrl.searchParams.set("error", error)
    redirectUrl.searchParams.set("error_description", searchParams.get("error_description") || "OAuth failed")
    return NextResponse.redirect(redirectUrl)
  }

  if (!code) {
    console.error("No authorization code received")
    const redirectUrl = new URL("/create-agent", request.url)
    redirectUrl.searchParams.set("error", "no_code")
    redirectUrl.searchParams.set("error_description", "No authorization code received")
    return NextResponse.redirect(redirectUrl)
  }

  try {
    console.log("Exchanging code for tokens...")

    // Exchange authorization code for tokens
    const tokens = await exchangeCodeForTokens(code)
    console.log("Tokens received:", {
      access_token: !!tokens.access_token,
      refresh_token: !!tokens.refresh_token,
      expires_in: tokens.expires_in,
    })

    // Get user info to verify the connection
    const calendarClient = new GoogleCalendarClient(tokens.access_token, tokens.refresh_token)
    const userInfo = await calendarClient.getUserInfo()
    console.log("User info:", { email: userInfo.email, name: userInfo.name })

    // Store tokens securely (in production, use database)
    const tokenData = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + tokens.expires_in * 1000,
      scope: tokens.scope,
    }

    // Redirect back to create-agent with success
    const redirectUrl = new URL("/create-agent", request.url)
    redirectUrl.searchParams.set("google_connected", "true")
    redirectUrl.searchParams.set("user_email", userInfo.email)
    redirectUrl.searchParams.set("user_name", userInfo.name || userInfo.email)
    redirectUrl.searchParams.set("token_data", btoa(JSON.stringify(tokenData)))

    if (state) {
      redirectUrl.searchParams.set("state", state)
    }

    console.log("Redirecting to create-agent with success")
    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    console.error("OAuth callback error:", error)
    const redirectUrl = new URL("/create-agent", request.url)
    redirectUrl.searchParams.set("error", "oauth_failed")
    redirectUrl.searchParams.set("error_description", error instanceof Error ? error.message : "Unknown error")
    return NextResponse.redirect(redirectUrl)
  }
}
