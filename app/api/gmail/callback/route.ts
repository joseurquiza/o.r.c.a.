import { type NextRequest, NextResponse } from "next/server"
import { exchangeGmailCode, gmailScopes } from "@/lib/google-auth"
import { GmailClient } from "@/lib/gmail-client"
import { createClient } from "@/lib/supabase/server"
import { getCurrentOrgId } from "@/lib/orgs"
import { encryptToken } from "@/lib/crypto/tokens"

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

  // Require an authenticated user/org before we accept and persist tokens.
  const orgId = await getCurrentOrgId()
  if (!orgId) {
    const url = new URL("/auth/login", request.url)
    url.searchParams.set("next", returnPath)
    return NextResponse.redirect(url)
  }

  try {
    const tokens = await exchangeGmailCode(code)

    // Use freshly-issued plaintext tokens for the userInfo lookup, then store
    // only ciphertext in the database.
    const client = new GmailClient(tokens.access_token, tokens.refresh_token)
    const userInfo = await client.getUserInfo()

    const supabase = await createClient()

    const encryptedAccess = encryptToken(tokens.access_token)
    const encryptedRefresh = encryptToken(tokens.refresh_token)
    const expiresAt = Date.now() + tokens.expires_in * 1000

    // 1. Write to the new connections table (AI Worker platform)
    const { error: connError } = await supabase.from("connections").upsert(
      {
        org_id: orgId,
        provider: "gmail",
        account_email: userInfo.email,
        account_name: userInfo.name,
        account_picture: userInfo.picture,
        access_token: encryptedAccess,
        refresh_token: encryptedRefresh,
        token_expires_at: expiresAt,
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
        org_id: orgId,
        gmail_email: userInfo.email,
        gmail_refresh_token: encryptedRefresh,
        gmail_access_token: encryptedAccess,
        token_expires_at: expiresAt,
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
