"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, AlertCircle, ExternalLink } from "lucide-react"
import Link from "next/link"

interface IntegrationStatus {
  name: string
  status: "connected" | "disconnected" | "error"
  lastChecked: string
}

export function APIAccessSummary() {
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchIntegrationStatus = async () => {
      try {
        const response = await fetch("/api/integrations/status")
        const data = await response.json()
        setIntegrations(data.integrations || [])
      } catch (error) {
        console.error("Error fetching integration status:", error)
        // Mock data for demo
        setIntegrations([
          {
            name: "Google OAuth",
            status: "connected",
            lastChecked: "2 minutes ago",
          },
          {
            name: "Remote Extension",
            status: "connected",
            lastChecked: "1 minute ago",
          },
          {
            name: "Webhook API",
            status: "disconnected",
            lastChecked: "5 minutes ago",
          },
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchIntegrationStatus()
  }, [])

  const getStatusIcon = (status: IntegrationStatus["status"]) => {
    switch (status) {
      case "connected":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "disconnected":
        return <XCircle className="h-4 w-4 text-gray-400" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-600" />
    }
  }

  const getStatusBadge = (status: IntegrationStatus["status"]) => {
    switch (status) {
      case "connected":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            Remote Connected
          </Badge>
        )
      case "disconnected":
        return <Badge variant="secondary">Disconnected</Badge>
      case "error":
        return <Badge variant="destructive">Error</Badge>
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Remote API Access</CardTitle>
          <CardDescription>Remote integration status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                <div className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Remote API Access</CardTitle>
        <CardDescription>Remote integration and authentication status</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {integrations.map((integration) => (
            <div key={integration.name} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getStatusIcon(integration.status)}
                <div>
                  <p className="text-sm font-medium">{integration.name}</p>
                  <p className="text-xs text-gray-500">Last checked {integration.lastChecked}</p>
                </div>
              </div>
              {getStatusBadge(integration.status)}
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t">
          <Link href="/integrations">
            <Button variant="outline" size="sm" className="w-full bg-transparent">
              <ExternalLink className="h-4 w-4 mr-2" />
              Manage Remote Integrations
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
