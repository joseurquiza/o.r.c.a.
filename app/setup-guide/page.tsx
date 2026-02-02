"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, ExternalLink, Copy, CheckCircle, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { useState } from "react"

export default function SetupGuide() {
  const [copiedUri, setCopiedUri] = useState(false)

  const currentDomain = typeof window !== "undefined" ? window.location.origin : "https://v0-orca-three.vercel.app"
  const redirectUri = `${currentDomain}/auth/google/callback`

  const copyRedirectUri = async () => {
    try {
      await navigator.clipboard.writeText(redirectUri)
      setCopiedUri(true)
      setTimeout(() => setCopiedUri(false), 2000)
    } catch (error) {
      console.error("Failed to copy:", error)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/integrations">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Google OAuth Setup Guide</h1>
          <p className="text-gray-600 mt-1">Complete setup instructions for Google Calendar integration</p>
        </div>
      </div>

      {/* Current Domain Alert */}
      <Alert className="mb-8 border-blue-200 bg-blue-50">
        <AlertTriangle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Your current domain:</strong> {currentDomain}
          <br />
          Make sure to use this exact domain in your Google Cloud Console configuration.
        </AlertDescription>
      </Alert>

      {/* Step-by-step guide */}
      <div className="space-y-8">
        {/* Step 1 */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Badge className="bg-blue-600 text-white">1</Badge>
              <CardTitle>Go to Google Cloud Console</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Visit the Google Cloud Console and create a new project or select an existing one.
            </p>
            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Google Cloud Console
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* Step 2 */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Badge className="bg-blue-600 text-white">2</Badge>
              <CardTitle>Enable Google Calendar API</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              In the Google Cloud Console, go to "APIs & Services" → "Library" and search for "Google Calendar API".
              Enable it.
            </p>
            <Button asChild variant="outline">
              <a
                href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Enable Calendar API
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* Step 3 */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Badge className="bg-blue-600 text-white">3</Badge>
              <CardTitle>Create OAuth 2.0 Credentials</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Go to "APIs & Services" → "Credentials" and click "Create Credentials" → "OAuth 2.0 Client IDs".
            </p>
            <div className="space-y-2">
              <p className="text-sm font-medium">Configure the OAuth consent screen first if prompted:</p>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Choose "External" user type</li>
                <li>• Fill in app name: "ORCA Agent Platform"</li>
                <li>• Add your email as developer contact</li>
                <li>• Add scopes: calendar, userinfo.email, userinfo.profile</li>
              </ul>
            </div>
            <Button asChild variant="outline">
              <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Go to Credentials
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* Step 4 - Critical Redirect URI */}
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Badge className="bg-red-600 text-white">4</Badge>
              <CardTitle className="text-red-900">Add Authorized Redirect URI</CardTitle>
            </div>
            <CardDescription className="text-red-700">
              This is the most critical step - the redirect URI must match exactly!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-red-800 font-medium">
              When creating the OAuth 2.0 Client ID, you MUST add this exact redirect URI:
            </p>

            <div className="p-4 bg-white border border-red-200 rounded-lg">
              <div className="flex items-center justify-between">
                <code className="text-sm font-mono text-red-900 break-all">{redirectUri}</code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyRedirectUri}
                  className="ml-2 flex-shrink-0 bg-transparent"
                >
                  {copiedUri ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>

            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Important:</strong> The redirect URI must match exactly, including the protocol (https://) and
                path (/auth/google/callback). Any mismatch will result in a 404 error from Google.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Step 5 */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Badge className="bg-blue-600 text-white">5</Badge>
              <CardTitle>Copy Your Credentials</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">After creating the OAuth client, copy the Client ID and Client Secret.</p>
            <div className="p-4 bg-gray-50 border rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Environment Variables (already configured in v0):
              </p>
              <div className="space-y-1 text-sm font-mono text-gray-600">
                <div>NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id_here</div>
                <div>GOOGLE_CLIENT_SECRET=your_client_secret_here</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 6 */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Badge className="bg-green-600 text-white">6</Badge>
              <CardTitle className="text-green-900">Test Your Setup</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-green-800">Once you've completed the setup, test your OAuth configuration.</p>
            <div className="flex gap-3">
              <Button asChild className="bg-green-600 hover:bg-green-700">
                <Link href="/test-oauth">Test OAuth Setup</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/create-agent">Create Agent</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Troubleshooting */}
      <Card className="mt-8 border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="text-amber-900">Troubleshooting Common Issues</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-amber-800">
          <div>
            <strong>404 Error from Google:</strong>
            <ul className="ml-4 mt-1 space-y-1">
              <li>• Check that the redirect URI is added to your OAuth client</li>
              <li>• Ensure the URI matches exactly: {redirectUri}</li>
              <li>• Make sure you're using the correct Google Cloud project</li>
            </ul>
          </div>
          <div>
            <strong>Access Denied:</strong>
            <ul className="ml-4 mt-1 space-y-1">
              <li>• Complete the OAuth consent screen configuration</li>
              <li>• Add required scopes (calendar, userinfo.email, userinfo.profile)</li>
              <li>• If using a personal Gmail, you may need to verify your app</li>
            </ul>
          </div>
          <div>
            <strong>Invalid Client Error:</strong>
            <ul className="ml-4 mt-1 space-y-1">
              <li>• Double-check your Client ID and Client Secret</li>
              <li>• Ensure environment variables are set correctly</li>
              <li>• Make sure the OAuth client is for a "Web application"</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
