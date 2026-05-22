import { type NextRequest, NextResponse } from "next/server"
import { exchangeCodeForTokens, GoogleCalendarClient } from "@/lib/google-auth"

/**
 * Calendar OAuth callback. We do NOT echo tokens back through the URL; that
 * would put long-lived OAuth credentials in the browser history, the
 * referrer chain, and any analytics tools. The /create-agent page should
 * either be a server-rendered page that reads tokens from the database, or
 * it should call a server action to start a session.
 *
 * For now we exchange the code, verify a profile lookup works, and then
 * redirect to /create-agent with only a non-sensitive success flag.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")

  if (error) {
    const redirectUrl = new URL("/create-agent", request.url)
    redirectUrl.searchParams.set("error", error)
    return NextResponse.redirect(redirectUrl)
  }

  if (!code) {
    const redirectUrl = new URL("/create-agent", request.url)
    redirectUrl.searchParams.set("error", "no_code")
    return NextResponse.redirect(redirectUrl)
  }

  try {
    const tokens = await exchangeCodeForTokens(code)
    // Verify the credentials actually work before declaring success.
    const calendarClient = new GoogleCalendarClient(tokens.access_token, tokens.refresh_token)
    await calendarClient.getUserInfo()

    // TODO: persist tokens to the database keyed off the authenticated user.
    // Tokens are intentionally NOT included in the redirect URL.
    const redirectUrl = new URL("/create-agent", request.url)
    redirectUrl.searchParams.set("google_connected", "true")
    if (state) redirectUrl.searchParams.set("state", state)
    return NextResponse.redirect(redirectUrl)
  } catch (err) {
    console.error("[v0] /auth/google/callback error:", err)
    const redirectUrl = new URL("/create-agent", request.url)
    redirectUrl.searchParams.set("error", "oauth_failed")
    return NextResponse.redirect(redirectUrl)
  }
}
