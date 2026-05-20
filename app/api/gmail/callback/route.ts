import { type NextRequest, NextResponse } from "next/server"
import { exchangeGmailCode } from "@/lib/google-auth"
import { GmailClient } from "@/lib/gmail-client"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const error = searchParams.get("error")

  if (error || !code) {
    const url = new URL("/agents/email", request.url)
    url.searchParams.set("error", error || "no_code")
    return NextResponse.redirect(url)
  }

  try {
    const tokens = await exchangeGmailCode(code)

    const client = new GmailClient(tokens.access_token, tokens.refresh_token)
    const userInfo = await client.getUserInfo()

    const supabase = await createClient()

    const { error: dbError } = await supabase
      .from("email_agents")
      .upsert(
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

    if (dbError) {
      console.error("Failed to save email agent:", dbError)
      const url = new URL("/agents/email", request.url)
      url.searchParams.set("error", "db_error")
      return NextResponse.redirect(url)
    }

    const url = new URL("/agents/email", request.url)
    url.searchParams.set("connected", "true")
    return NextResponse.redirect(url)
  } catch (err) {
    console.error("Gmail callback error:", err)
    const url = new URL("/agents/email", request.url)
    url.searchParams.set("error", "oauth_failed")
    return NextResponse.redirect(url)
  }
}
