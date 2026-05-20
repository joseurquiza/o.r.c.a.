import { type NextRequest, NextResponse } from "next/server"
import { exchangeGmailCode, gmailScopes } from "@/lib/google-auth"
import { GmailClient } from "@/lib/gmail-client"
import { createClient } from "@/lib/supabase/server"
import { getCurrentOrgId } from "@/lib/orgs"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const error = searchParams.get("error")
  // The state param tells us which page to return to after OAuth.
  const state = searchParams.get("state") || "connections"
  const returnPath = state === "email-agent" ? "/agents/email" : "/connections"

  if (error || !code) {
    const url = new URL(returnPath, request.url)
    url.searchParams.set("error", error || "no_code")
    return NextResponse.redirect(url)
  }

  try {
    const tokens = await exchangeGmailCode(code)

    const client = new GmailClient(tokens.access_token, tokens.refresh_token)
    const userInfo = await client.getUserInfo()

    const supabase = await createClient()
    const orgId = await getCurrentOrgId()

    // 1. Write to the new connections table (AI Worker platform)
    const { error: connError } = await supabase.from("connections").upsert(
      {
        org_id: orgId,
        provider: "gmail",
        account_email: userInfo.email,
        account_name: userInfo.name,
        account_picture: userInfo.picture,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: Date.now() + tokens.expires_in * 1000,
        scopes: gmailScopes,
        status: "active",
        last_error: null,
      },
      { onConflict: "org_id,provider,account_email" as any },
    )

    if (connError) {
      console.error("[v0] Failed to save connection:", connError)
    }

    // 2. Keep legacy email_agents table in sync for the existing email agent page
    await supabase.from("email_agents").upsert(
      {
        gmail_email: userInfo.email,
        gmail_refresh_token: tokens.refresh_token,
        gmail_access_token: tokens.access_token,
        token_expires_at: Date.now() + tokens.expires_in * 1000,
        user_name: userInfo.name,
        user_picture: userInfo.picture,
        active: true,
      },
      { onConflict: "gmail_email" },
    )

    const url = new URL(returnPath, request.url)
    url.searchParams.set("connected", "gmail")
    return NextResponse.redirect(url)
  } catch (err) {
    console.error("[v0] Gmail callback error:", err)
    const url = new URL(returnPath, request.url)
    url.searchParams.set("error", "oauth_failed")
    return NextResponse.redirect(url)
  }
}
