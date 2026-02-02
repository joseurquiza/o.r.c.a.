"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Download, Chrome, Check, Copy } from 'lucide-react'
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { useState } from "react"

export default function ExtensionDownload() {
  const [copied, setCopied] = useState(false)
  const extensionDownloadUrl = "/api/extension/download"

  const handleCopyCommand = () => {
    navigator.clipboard.writeText("chrome://extensions")
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">ORCA Agent Extension</h1>
          <p className="text-gray-600 mt-1">Browser automation for your intelligent agents</p>
        </div>
      </div>

      {/* Main Card */}
      <Card className="mb-8 border-0 shadow-lg">
        <CardHeader className="text-center border-b pb-6">
          <div className="flex justify-center mb-4">
            <Chrome className="h-16 w-16 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">ORCA Agent Extension</CardTitle>
          <CardDescription className="text-lg">
            Give your agents the ability to see and interact with any website
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="flex justify-center">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 gap-2" asChild>
              <a href={extensionDownloadUrl} download="orca-agent-extension.zip">
                <Download className="h-5 w-5" />
                Download Extension (ZIP)
              </a>
            </Button>
          </div>

          <Alert className="bg-blue-50 border-blue-200">
            <AlertDescription className="text-blue-800">
              <strong>Version 1.0.0</strong> • Compatible with Chrome, Edge, and other Chromium browsers
            </AlertDescription>
          </Alert>

          <div className="border-t pt-6 mt-6">
            <h3 className="font-semibold text-lg mb-4">Installation Instructions</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Badge className="mt-0.5">1</Badge>
                <div>
                  <p className="font-medium">Download and extract the ZIP file</p>
                  <p className="text-sm text-gray-600">Save the ZIP file and extract its contents to a folder</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Badge className="mt-0.5">2</Badge>
                <div>
                  <p className="font-medium">Open Chrome Extensions page</p>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm">chrome://extensions</code>
                    <Button size="sm" variant="outline" className="h-7 px-2 bg-transparent" onClick={handleCopyCommand}>
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Paste this in your browser address bar</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Badge className="mt-0.5">3</Badge>
                <div>
                  <p className="font-medium">Enable Developer Mode</p>
                  <p className="text-sm text-gray-600">Toggle the "Developer mode" switch in the top-right corner</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Badge className="mt-0.5">4</Badge>
                <div>
                  <p className="font-medium">Load unpacked extension</p>
                  <p className="text-sm text-gray-600">
                    Click "Load unpacked" and select the folder where you extracted the ZIP file
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Badge className="mt-0.5">5</Badge>
                <div>
                  <p className="font-medium">Pin the extension</p>
                  <p className="text-sm text-gray-600">
                    Click the puzzle piece icon in Chrome toolbar and pin the ORCA Agent Extension
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-blue-600">👁️</span> Screen Capture
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Agents can see what's on screen and understand webpage content through AI vision analysis
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-blue-600">🖱️</span> Automated Interaction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Click buttons, fill forms, and navigate websites automatically based on natural language instructions
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-blue-600">🔄</span> API Integration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Seamlessly combines web automation with API access for comprehensive task completion
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Use Cases */}
      <Card className="mb-8 border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Educational Use Cases</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Student Information Systems</h4>
              <p className="text-sm text-gray-600">
                Automate data entry and retrieval across multiple educational platforms
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Report Generation</h4>
              <p className="text-sm text-gray-600">
                Extract data from various sources to compile comprehensive student reports
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Resource Booking</h4>
              <p className="text-sm text-gray-600">
                Schedule rooms, equipment, and resources across different booking systems
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Administrative Tasks</h4>
              <p className="text-sm text-gray-600">
                Automate routine administrative workflows across multiple web applications
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="text-amber-600 text-2xl">🔒</div>
            <div>
              <h4 className="font-medium text-amber-900">Security & Privacy</h4>
              <p className="text-sm text-amber-800 mt-1">
                This extension requires permissions to read and modify webpage content. It only activates when you
                explicitly use it with the ORCA platform. All data is processed locally and securely.
              </p>
              <div className="mt-3">
                <Button asChild variant="outline" size="sm" className="border-amber-300 text-amber-800 bg-transparent">
                  <Link href="/privacy-policy">View Privacy Policy</Link>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
