"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { CheckCircle, XCircle, Settings, ExternalLink, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useState, useEffect } from "react"
import { Link } from "@/components/ui/link"

interface IntegrationStatus {
  google: {
    clientId: boolean
    clientSecret: boolean
    configured: boolean
  }
  microsoft: {
    clientId: boolean
    clientSecret: boolean
    configured: boolean
  }
  slack: {
    clientId: boolean
    clientSecret: boolean
    configured: boolean
  }
}

// Integration definitions
const integrations = [
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Manage calendar events and appointments",
    icon: "📅",
    requiresSetup: true,
    setupInstructions: "Configure Google OAuth credentials in environment variables",
    provider: "google" as keyof IntegrationStatus,
  },
  {
    id: "google-classroom",
    name: "Google Classroom",
    description: "Manage classes, assignments, and student data",
    icon: "📚",
    requiresSetup: true,
    setupInstructions: "Configure Google Classroom API credentials",
    provider: "google" as keyof IntegrationStatus,
  },
  {
    id: "microsoft-teams",
    name: "Microsoft Teams",
    description: "Communication and collaboration platform",
    icon: "💬",
    requiresSetup: true,
    setupInstructions: "Configure Microsoft Graph API credentials",
    provider: "microsoft" as keyof IntegrationStatus,
  },
  {
    id: "slack",
    name: "Slack",
    description: "Team communication and notifications",
    icon: "📢",
    requiresSetup: true,
    setupInstructions: "Configure Slack App credentials and OAuth",
    provider: "slack" as keyof IntegrationStatus,
  },
]

export default function Integrations() {
  const [editingIntegration, setEditingIntegration] = useState<string | null>(null)
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch integration status from API
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch("/api/integrations/status")
        if (response.ok) {
          const status = await response.json()
          setIntegrationStatus(status)
        }
      } catch (error) {
        console.error("Failed to fetch integration status:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStatus()
  }, [])

  const getIntegrationStatus = (integration: any) => {
    if (!integrationStatus) return { connected: false, hasClientId: false, hasClientSecret: false }

    const providerStatus = integrationStatus[integration.provider]
    return {
      connected: providerStatus?.configured || false,
      hasClientId: providerStatus?.clientId || false,
      hasClientSecret: providerStatus?.clientSecret || false,
    }
  }

  const connectedCount = integrations.filter((i) => getIntegrationStatus(i).connected).length
  const availableCount = integrations.filter((i) => !getIntegrationStatus(i).connected).length

  const handleTestConnection = async (integration: any) => {
    if (integration.provider === "google") {
      // Test Google OAuth by redirecting to test page
      window.open("/test-oauth", "_blank")
    } else {
      alert(`${integration.name} testing not yet implemented`)
    }
  }

  const handleConfigure = (integration: any) => {
    if (integration.provider === "google") {
      // Redirect to create agent page where they can actually connect
      window.location.href = "/create-agent"
    } else {
      alert(`${integration.name} configuration not yet implemented`)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="grid gap-6 md:grid-cols-3 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">API Integrations</h1>
        <p className="text-gray-600 mt-1">Manage connections to external platforms and services</p>
      </div>

      {/* Production Notice */}
      <Alert className="mb-8 border-amber-200 bg-amber-50">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <strong>Production Environment:</strong> All integrations require proper OAuth configuration and real API
          credentials. No demo or mock connections are available.
        </AlertDescription>
      </Alert>

      {/* Stats */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Integrations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{integrations.length}</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Ready</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{connectedCount}</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Setup Required</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{availableCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Integrations List */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-900">Available Integrations</h2>
        <div className="grid gap-6">
          {integrations.map((integration) => {
            const status = getIntegrationStatus(integration)

            return (
              <Card key={integration.id} className="border-0 shadow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{integration.icon}</span>
                      <div>
                        <CardTitle className="text-lg text-gray-900">{integration.name}</CardTitle>
                        <CardDescription className="text-gray-600">{integration.description}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {status.connected ? (
                        <Badge className="gap-1 bg-green-100 text-green-800 hover:bg-green-100">
                          <CheckCircle className="h-3 w-3" />
                          Ready
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <XCircle className="h-3 w-3" />
                          Setup Required
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setEditingIntegration(editingIntegration === integration.id ? null : integration.id)
                        }
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {editingIntegration === integration.id && (
                  <CardContent className="border-t pt-6">
                    <div className="space-y-6">
                      {/* Setup Instructions */}
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">Setup Instructions</h4>
                        <p className="text-sm text-blue-800 mb-3">{integration.setupInstructions}</p>

                        {integration.provider === "google" && (
                          <div className="space-y-2 text-sm text-blue-800">
                            <div>1. Go to Google Cloud Console</div>
                            <div>2. Enable Google Calendar API</div>
                            <div>3. Create OAuth 2.0 credentials</div>
                            <div>
                              4. Add redirect URI:{" "}
                              <code className="bg-blue-100 px-1 rounded">
                                https://your-domain.vercel.app/auth/google/callback
                              </code>
                            </div>
                            <div>5. Environment variables are configured in v0</div>
                          </div>
                        )}
                      </div>

                      {/* Configuration Status */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label>Integration Status</Label>
                          <Badge
                            variant={status.connected ? "default" : "secondary"}
                            className={status.connected ? "bg-green-100 text-green-800" : ""}
                          >
                            {status.connected ? "Ready" : "Not Configured"}
                          </Badge>
                        </div>

                        {integration.provider === "google" && (
                          <div className="space-y-2">
                            <Label>Google OAuth Status</Label>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="secondary"
                                className={
                                  status.hasClientId ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                }
                              >
                                {status.hasClientId ? "Client ID Configured" : "Client ID Missing"}
                              </Badge>
                              <Badge
                                variant="secondary"
                                className={
                                  status.hasClientSecret ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                }
                              >
                                {status.hasClientSecret ? "Client Secret Configured" : "Client Secret Missing"}
                              </Badge>
                            </div>
                          </div>
                        )}

                        {integration.provider === "microsoft" && (
                          <div className="space-y-2">
                            <Label>Microsoft OAuth Status</Label>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="secondary"
                                className={
                                  status.hasClientId ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                }
                              >
                                {status.hasClientId ? "Client ID Configured" : "Client ID Missing"}
                              </Badge>
                              <Badge
                                variant="secondary"
                                className={
                                  status.hasClientSecret ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                }
                              >
                                {status.hasClientSecret ? "Client Secret Configured" : "Client Secret Missing"}
                              </Badge>
                            </div>
                          </div>
                        )}

                        {integration.provider === "slack" && (
                          <div className="space-y-2">
                            <Label>Slack OAuth Status</Label>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="secondary"
                                className={
                                  status.hasClientId ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                }
                              >
                                {status.hasClientId ? "Client ID Configured" : "Client ID Missing"}
                              </Badge>
                              <Badge
                                variant="secondary"
                                className={
                                  status.hasClientSecret ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                }
                              >
                                {status.hasClientSecret ? "Client Secret Configured" : "Client Secret Missing"}
                              </Badge>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestConnection(integration)}
                          disabled={!status.connected}
                        >
                          Test Connection
                        </Button>
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => handleConfigure(integration)}
                        >
                          {status.connected ? "Use Integration" : "Configure"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      </div>

      {/* Setup Help */}
      <Card className="mt-8 border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900">Need Help Setting Up Integrations?</CardTitle>
          <CardDescription className="text-blue-700">
            Each integration requires proper API credentials and OAuth configuration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-blue-800">
            <div>• All integrations require real API credentials from the respective service providers</div>
            <div>• OAuth applications must be configured with proper redirect URIs</div>
            <div>• Environment variables are managed in the v0 platform</div>
            <div>• Use the "Configure" button to set up user connections</div>
          </div>
          <Button className="mt-4 bg-blue-600 hover:bg-blue-700" size="sm" asChild>
            <Link href="/setup-guide">
              <ExternalLink className="h-4 w-4 mr-2" />
              Complete Setup Guide
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
