// Google OAuth configuration
export const googleAuthConfig = {
  clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: `https://theorca.app/auth/google/callback`,
  scopes: [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
  ],
}

// Create Google Auth URL
export function createGoogleAuthUrl(state?: string) {
  if (!googleAuthConfig.clientId) {
    throw new Error("Google Client ID not configured")
  }

  const params = new URLSearchParams({
    client_id: googleAuthConfig.clientId,
    redirect_uri: googleAuthConfig.redirectUri,
    scope: googleAuthConfig.scopes.join(" "),
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    ...(state && { state }),
  })

  return `https://accounts.google.com/oauth/authorize?${params.toString()}`
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(code: string) {
  if (!googleAuthConfig.clientId || !googleAuthConfig.clientSecret) {
    throw new Error("Google OAuth credentials not configured")
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: googleAuthConfig.clientId,
      client_secret: googleAuthConfig.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: googleAuthConfig.redirectUri,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to exchange code for tokens: ${error}`)
  }

  return response.json()
}

// Refresh access token
export async function refreshAccessToken(refreshToken: string) {
  if (!googleAuthConfig.clientId || !googleAuthConfig.clientSecret) {
    throw new Error("Google OAuth credentials not configured")
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: googleAuthConfig.clientId,
      client_secret: googleAuthConfig.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to refresh token: ${error}`)
  }

  return response.json()
}

// Google Calendar API client
export class GoogleCalendarClient {
  private accessToken: string
  private refreshToken?: string

  constructor(accessToken: string, refreshToken?: string) {
    this.accessToken = accessToken
    this.refreshToken = refreshToken
  }

  private async makeRequest(url: string, options: RequestInit = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    })

    // Handle token expiration
    if (response.status === 401 && this.refreshToken) {
      try {
        const tokens = await refreshAccessToken(this.refreshToken)
        this.accessToken = tokens.access_token

        // Retry the request with new token
        return fetch(url, {
          ...options,
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
            ...options.headers,
          },
        })
      } catch (error) {
        throw new Error("Failed to refresh access token")
      }
    }

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Google Calendar API error: ${error}`)
    }

    return response
  }

  async createEvent(calendarId = "primary", event: any) {
    const response = await this.makeRequest(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`, {
      method: "POST",
      body: JSON.stringify(event),
    })

    return response.json()
  }

  async listEvents(calendarId = "primary", params: any = {}) {
    const searchParams = new URLSearchParams(params)
    const response = await this.makeRequest(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${searchParams}`,
    )

    return response.json()
  }

  async getCalendars() {
    const response = await this.makeRequest("https://www.googleapis.com/calendar/v3/users/me/calendarList")

    return response.json()
  }

  async getUserInfo() {
    const response = await this.makeRequest("https://www.googleapis.com/oauth2/v2/userinfo")

    return response.json()
  }
}
