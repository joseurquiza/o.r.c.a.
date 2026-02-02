"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, ArrowLeft, ExternalLink } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { useState } from "react"

export default function SimpleOAuth() {
  const [connecting, setConnecting] = useState(false)

  const handleSimpleConnect = () => {
    setConnecting(true)

    // Direct, simple OAuth URL - no API route complexity
    const clientId = "762674978011-6hln46oua2ueji0b7ut1b088q4ofr3ft.apps.googleusercontent.com"
    const redirectUri = "https://v0-orca-three.vercel.app/auth/google/callback"
    const scopes = ["https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/userinfo.email"].join(
      " ",
    )

    const authUrl =
      `https://accounts.google.com/oauth/authorize?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `response_type=code&` +
      `access_type=offline&` +
      `prompt=consent&` +
      `state=simple-oauth-${Date.now()}`

    console.log("Simple OAuth URL:", authUrl)
    window.location.href = authUrl
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/create-agent">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Simple Google Connection</h1>
          <p className="text-gray-600 mt-1">One-click Google Calendar access</p>
        </div>
      </div>

      {/* Simple Connection Card */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Calendar className="h-16 w-16 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Connect Google Calendar</CardTitle>
          <CardDescription className="text-lg">
            Grant access to your Google Calendar so your agent can create and manage events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="border-blue-200 bg-blue-50">
            <AlertDescription className="text-blue-800">
              <strong>What you're granting access to:</strong>
              <ul className="mt-2 space-y-1">
                <li>• View and create calendar events</li>
                <li>• Access your email address for identification</li>
                <li>• No access to emails, files, or other Google services</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="text-center space-y-4">
            <Button
              onClick={handleSimpleConnect}
              disabled={connecting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6"
            >
              {connecting ? (
                "Redirecting to Google..."
              ) : (
                <>
                  <ExternalLink className="h-5 w-5 mr-2" />
                  Connect with Google
                </>
              )}
            </Button>

            <div className="text-sm text-gray-600">You'll be redirected to Google to sign in and grant permissions</div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-900 mb-2">What happens next:</h4>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  1
                </Badge>
                <span>You'll sign in to your Google account</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  2
                </Badge>
                <span>Google will ask you to grant calendar permissions</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  3
                </Badge>
                <span>You'll be redirected back to create your agent</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  4
                </Badge>
                <span>Your agent will be able to manage your calendar!</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Note */}
      <Card className="mt-6 border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="text-green-600 text-2xl">🔒</div>
            <div>
              <h4 className="font-medium text-green-900">Secure & Private</h4>
              <p className="text-sm text-green-800 mt-1">
                This uses Google's official OAuth system. Your credentials are never stored on our servers - only secure
                access tokens that you can revoke anytime from your Google Account settings.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
