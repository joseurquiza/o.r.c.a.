"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, ExternalLink, ArrowLeft } from "lucide-react"
import { useState, useEffect } from "react"
import Link from "next/link"

interface OAuthStatus {
  google: {
    clientId: boolean
    clientSecret: boolean
    configured: boolean
  }
}

export default function TestOAuth() {
  const [oauthStatus, setOauthStatus] = useState<OAuthStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch("/api/integrations/status")
        if (response.ok) {
          const status = await response.json()
          setOauthStatus(status)
        }
      } catch (error) {
        console.error("Failed to fetch OAuth status:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStatus()
  }, [])

  const testGoogleOAuth = () => {
    const state = `test-oauth-${Date.now()}`
    window.location.href = `/api/auth/google?state=${state}`
  }

  if (loading) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/integrations">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">OAuth Test Page</h1>
          <p className="text-gray-600 mt-1">Test your Google OAuth configuration</p>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Google OAuth Configuration</CardTitle>
          <CardDescription>Verify that your Google OAuth setup is working correctly</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Client ID</span>
              <Badge
                variant={oauthStatus?.google?.clientId ? "default" : "secondary"}
                className={oauthStatus?.google?.clientId ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
              >
                {oauthStatus?.google?.clientId ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Configured
                  </>
                ) : (
                  <>
                    <XCircle className="h-3 w-3 mr-1" />
                    Missing
                  </>
                )}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Client Secret</span>
              <Badge
                variant={oauthStatus?.google?.clientSecret ? "default" : "secondary"}
                className={
                  oauthStatus?.google?.clientSecret ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                }
              >
                {oauthStatus?.google?.clientSecret ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Configured
                  </>
                ) : (
                  <>
                    <XCircle className="h-3 w-3 mr-1" />
                    Missing
                  </>
                )}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Status</span>
              <Badge
                variant={oauthStatus?.google?.configured ? "default" : "secondary"}
                className={oauthStatus?.google?.configured ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
              >
                {oauthStatus?.google?.configured ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Ready
                  </>
                ) : (
                  <>
                    <XCircle className="h-3 w-3 mr-1" />
                    Not Ready
                  </>
                )}
              </Badge>
            </div>

            <div className="pt-2 border-t">
              <div className="text-sm text-gray-600 mb-2">
                <strong>Redirect URI:</strong>
              </div>
              <div className="text-xs text-gray-600 font-mono bg-gray-100 p-2 rounded">
                {typeof window !== "undefined" ? window.location.origin : "https://your-domain.vercel.app"}
                /auth/google/callback
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button
              onClick={testGoogleOAuth}
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={!oauthStatus?.google?.configured}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Test Google OAuth Flow
            </Button>
            {!oauthStatus?.google?.configured && (
              <p className="text-sm text-red-600 mt-2 text-center">
                OAuth configuration incomplete. Please check your environment variables.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6 border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="text-amber-800">Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-amber-800 space-y-2">
          <div>1. Go to Google Cloud Console</div>
          <div>2. Create a new project or select existing</div>
          <div>3. Enable Google Calendar API</div>
          <div>4. Create OAuth 2.0 credentials</div>
          <div>5. Add authorized redirect URI:</div>
          <div className="ml-4 font-mono text-xs bg-amber-100 p-2 rounded">
            {typeof window !== "undefined" ? window.location.origin : "https://your-domain.vercel.app"}
            /auth/google/callback
          </div>
          <div>6. Environment variables are managed in v0 platform</div>
          <div className="pt-2 space-x-2">
            <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-700">
              <Link href="/create-agent">Go to Create Agent</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/debug-oauth">Debug OAuth Issues</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
