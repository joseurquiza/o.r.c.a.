"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Copy, ExternalLink, ArrowLeft } from "lucide-react"
import { useState, useEffect } from "react"
import Link from "next/link"

interface DebugInfo {
  currentDomain: string
  expectedRedirectUri: string
  clientId: string | null
  clientIdConfigured: boolean
  clientSecretConfigured: boolean
  authUrl: string
}

export default function DebugOAuth() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    const currentDomain = window.location.origin
    const expectedRedirectUri = `https://v0-orca-three.vercel.app/auth/google/callback`
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || null

    // Create the auth URL that would be generated
    const authUrl = clientId
      ? `https://accounts.google.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(expectedRedirectUri)}&scope=${encodeURIComponent("https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile")}&response_type=code&access_type=offline&prompt=consent`
      : ""

    setDebugInfo({
      currentDomain,
      expectedRedirectUri,
      clientId,
      clientIdConfigured: !!clientId,
      clientSecretConfigured: !!process.env.GOOGLE_CLIENT_SECRET,
      authUrl,
    })
  }, [])

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    } catch (error) {
      console.error("Failed to copy:", error)
    }
  }

  const testDirectOAuth = () => {
    if (debugInfo?.authUrl) {
      window.open(debugInfo.authUrl, "_blank")
    }
  }

  if (!debugInfo) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
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
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">OAuth Debug Tool</h1>
          <p className="text-gray-600 mt-1">Diagnose Google OAuth configuration issues</p>
        </div>
      </div>

      {/* Current Configuration */}
      <Card className="mb-8 border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Current Configuration</CardTitle>
          <CardDescription>Your current OAuth setup details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium">Current Domain</div>
                <div className="text-sm text-gray-600">{debugInfo.currentDomain}</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => copyToClipboard(debugInfo.currentDomain, "domain")}>
                {copied === "domain" ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium">Expected Redirect URI</div>
                <div className="text-sm text-gray-600 font-mono">{debugInfo.expectedRedirectUri}</div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(debugInfo.expectedRedirectUri, "redirect")}
              >
                {copied === "redirect" ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium">Client ID</div>
                <div className="text-sm text-gray-600 font-mono">
                  {debugInfo.clientId ? `${debugInfo.clientId.substring(0, 20)}...` : "Not configured"}
                </div>
              </div>
              <Badge
                variant={debugInfo.clientIdConfigured ? "default" : "secondary"}
                className={debugInfo.clientIdConfigured ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
              >
                {debugInfo.clientIdConfigured ? "Configured" : "Missing"}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium">Client Secret</div>
                <div className="text-sm text-gray-600">Hidden for security</div>
              </div>
              <Badge
                variant={debugInfo.clientSecretConfigured ? "default" : "secondary"}
                className={debugInfo.clientSecretConfigured ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
              >
                {debugInfo.clientSecretConfigured ? "Configured" : "Missing"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Diagnostic Tests */}
      <Card className="mb-8 border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Diagnostic Tests</CardTitle>
          <CardDescription>Run these tests to identify the issue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Test 1: Direct OAuth URL */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-medium">Test 1: Direct OAuth URL</h4>
                <p className="text-sm text-gray-600">Test the OAuth URL directly in a new tab</p>
              </div>
              <Button
                onClick={testDirectOAuth}
                disabled={!debugInfo.clientIdConfigured}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Test Direct URL
              </Button>
            </div>
            {debugInfo.authUrl && (
              <div className="mt-3 p-2 bg-gray-50 rounded text-xs font-mono break-all">{debugInfo.authUrl}</div>
            )}
          </div>

          {/* Test 2: Client ID Validation */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-medium">Test 2: Client ID Format</h4>
                <p className="text-sm text-gray-600">Verify your Client ID format</p>
              </div>
              <Badge
                variant={
                  debugInfo.clientId && debugInfo.clientId.endsWith(".apps.googleusercontent.com")
                    ? "default"
                    : "secondary"
                }
                className={
                  debugInfo.clientId && debugInfo.clientId.endsWith(".apps.googleusercontent.com")
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }
              >
                {debugInfo.clientId && debugInfo.clientId.endsWith(".apps.googleusercontent.com")
                  ? "Valid Format"
                  : "Invalid Format"}
              </Badge>
            </div>
            <div className="text-sm text-gray-600">
              Client ID should end with <code>.apps.googleusercontent.com</code>
            </div>
          </div>

          {/* Test 3: API Status Check */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-medium">Test 3: API Status</h4>
                <p className="text-sm text-gray-600">Check if Google Calendar API is enabled</p>
              </div>
              <Button asChild variant="outline">
                <a
                  href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Check API Status
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Common Issues */}
      <Card className="mb-8 border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="text-amber-900">Common Issues & Solutions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-amber-800">
          <div>
            <strong>1. Wrong OAuth Client Type:</strong>
            <ul className="ml-4 mt-1 space-y-1">
              <li>• Make sure you created a "Web application" OAuth client, not "Desktop" or "Mobile"</li>
              <li>• Desktop/Mobile clients have different redirect URI requirements</li>
            </ul>
          </div>

          <div>
            <strong>2. Multiple OAuth Clients:</strong>
            <ul className="ml-4 mt-1 space-y-1">
              <li>• You might have multiple OAuth clients in your project</li>
              <li>• Make sure you're using the Client ID from the correct "Web application" client</li>
              <li>• Check that the redirect URI is added to the RIGHT OAuth client</li>
            </ul>
          </div>

          <div>
            <strong>3. Project Mismatch:</strong>
            <ul className="ml-4 mt-1 space-y-1">
              <li>• Verify you're in the correct Google Cloud project</li>
              <li>• The Client ID should match the project where you added the redirect URI</li>
            </ul>
          </div>

          <div>
            <strong>4. OAuth Consent Screen:</strong>
            <ul className="ml-4 mt-1 space-y-1">
              <li>• Make sure the OAuth consent screen is configured</li>
              <li>• For testing, you can use "Internal" if you have a Google Workspace</li>
              <li>• For "External", you may need to verify your app or add test users</li>
            </ul>
          </div>

          <div>
            <strong>5. Redirect URI Exact Match:</strong>
            <ul className="ml-4 mt-1 space-y-1">
              <li>• The redirect URI must match EXACTLY (including trailing slashes)</li>
              <li>• Check for typos in the domain name</li>
              <li>• Ensure you're using HTTPS, not HTTP</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Step-by-Step Verification */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900">Step-by-Step Verification</CardTitle>
          <CardDescription className="text-blue-700">Follow these steps to verify your setup</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-blue-800">
          <div className="space-y-2">
            <div className="font-medium">1. Go to Google Cloud Console Credentials:</div>
            <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700">
              <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Credentials Page
              </a>
            </Button>
          </div>

          <div>
            <div className="font-medium">2. Find your OAuth 2.0 Client ID:</div>
            <div className="ml-4 mt-1">
              • Look for a client with type "Web application"
              <br />• The Client ID should start with your project number
              <br />• It should end with <code>.apps.googleusercontent.com</code>
            </div>
          </div>

          <div>
            <div className="font-medium">3. Click "Edit" on the Web application client</div>
          </div>

          <div>
            <div className="font-medium">4. Verify the redirect URI is listed exactly as:</div>
            <div className="ml-4 mt-1 p-2 bg-blue-100 rounded font-mono text-xs">{debugInfo.expectedRedirectUri}</div>
          </div>

          <div>
            <div className="font-medium">5. Copy the Client ID and verify it matches:</div>
            <div className="ml-4 mt-1 p-2 bg-blue-100 rounded font-mono text-xs">
              Current: {debugInfo.clientId || "Not configured"}
            </div>
          </div>

          <div>
            <div className="font-medium">6. Test the OAuth flow:</div>
            <div className="ml-4 mt-1">
              <Button onClick={testDirectOAuth} size="sm" className="bg-blue-600 hover:bg-blue-700">
                Test OAuth Flow
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
