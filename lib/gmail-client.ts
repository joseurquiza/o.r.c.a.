import { refreshAccessToken } from "@/lib/google-auth"
import { createClient } from "@/lib/supabase/server"

export interface GmailMessage {
  id: string
  threadId: string
  from: string
  to: string
  subject: string
  snippet: string
  date: string
  body: string
  unread: boolean
  important: boolean
  labels: string[]
}

export class GmailClient {
  private accessToken: string
  private refreshToken: string
  private agentId?: string

  constructor(accessToken: string, refreshToken: string, agentId?: string) {
    this.accessToken = accessToken
    this.refreshToken = refreshToken
    this.agentId = agentId
  }

  private async makeRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    })

    if (response.status === 401) {
      const tokens = await refreshAccessToken(this.refreshToken)
      this.accessToken = tokens.access_token

      if (this.agentId) {
        const supabase = await createClient()
        await supabase
          .from("email_agents")
          .update({
            gmail_access_token: tokens.access_token,
            token_expires_at: Date.now() + tokens.expires_in * 1000,
          })
          .eq("id", this.agentId)
      }

      return fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
          ...options.headers,
        },
      })
    }

    return response
  }

  async listMessages(query = "newer_than:1d", maxResults = 50): Promise<{ id: string; threadId: string }[]> {
    const params = new URLSearchParams({ q: query, maxResults: maxResults.toString() })
    const res = await this.makeRequest(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`)
    if (!res.ok) throw new Error(`Gmail listMessages failed: ${await res.text()}`)
    const data = await res.json()
    return data.messages || []
  }

  async getMessage(messageId: string): Promise<GmailMessage> {
    const res = await this.makeRequest(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    )
    if (!res.ok) throw new Error(`Gmail getMessage failed: ${await res.text()}`)
    const data = await res.json()

    const headers = data.payload?.headers || []
    const getHeader = (name: string) =>
      headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || ""

    const body = this.extractBody(data.payload)
    const labels = data.labelIds || []

    return {
      id: data.id,
      threadId: data.threadId,
      from: getHeader("From"),
      to: getHeader("To"),
      subject: getHeader("Subject"),
      snippet: data.snippet || "",
      date: getHeader("Date"),
      body: body.slice(0, 5000),
      unread: labels.includes("UNREAD"),
      important: labels.includes("IMPORTANT"),
      labels,
    }
  }

  private extractBody(payload: any): string {
    if (!payload) return ""

    if (payload.body?.data) {
      return this.decodeBase64(payload.body.data)
    }

    if (payload.parts) {
      const plain = payload.parts.find((p: any) => p.mimeType === "text/plain")
      if (plain?.body?.data) return this.decodeBase64(plain.body.data)

      const html = payload.parts.find((p: any) => p.mimeType === "text/html")
      if (html?.body?.data) {
        return this.decodeBase64(html.body.data).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")
      }

      for (const part of payload.parts) {
        const nested = this.extractBody(part)
        if (nested) return nested
      }
    }

    return ""
  }

  private decodeBase64(data: string): string {
    try {
      const normalized = data.replace(/-/g, "+").replace(/_/g, "/")
      return Buffer.from(normalized, "base64").toString("utf-8")
    } catch {
      return ""
    }
  }

  async getUserInfo() {
    const res = await this.makeRequest("https://www.googleapis.com/oauth2/v2/userinfo")
    if (!res.ok) throw new Error(`getUserInfo failed: ${await res.text()}`)
    return res.json()
  }
}
