"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Bot, ArrowRight, CheckCircle, Briefcase, ShoppingCart, MessageSquare, Settings, Sparkles } from "lucide-react"
import Link from "next/link"

interface AgentTemplate {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  features: string[]
  category: "business" | "ecommerce" | "social" | "custom"
}

const agentTemplates: AgentTemplate[] = [
  {
    id: "business",
    name: "Business Remote Control",
    description: "Automate business workflows, CRM tasks, and data entry remotely",
    icon: <Briefcase className="h-6 w-6" />,
    features: ["Remote CRM automation", "Remote lead generation", "Remote data entry", "Remote report generation"],
    category: "business",
  },
  {
    id: "ecommerce",
    name: "E-commerce Remote Control",
    description: "Remote price monitoring, inventory management, and order processing",
    icon: <ShoppingCart className="h-6 w-6" />,
    features: [
      "Remote price monitoring",
      "Remote inventory tracking",
      "Remote order processing",
      "Remote competitor analysis",
    ],
    category: "ecommerce",
  },
  {
    id: "social",
    name: "Social Media Remote Control",
    description: "Remote social media management, posting, and engagement automation",
    icon: <MessageSquare className="h-6 w-6" />,
    features: ["Remote post scheduling", "Remote engagement tracking", "Remote content curation", "Remote analytics"],
    category: "social",
  },
  {
    id: "custom",
    name: "Custom Remote Agent",
    description: "Build a custom remote control agent for your specific workflow needs",
    icon: <Settings className="h-6 w-6" />,
    features: [
      "Remote custom workflows",
      "Remote API integrations",
      "Remote browser automation",
      "Remote task scheduling",
    ],
    category: "custom",
  },
]

export default function CreateAgent() {
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null)
  const [step, setStep] = useState<"template" | "configure" | "review">("template")
  const [agentConfig, setAgentConfig] = useState({
    name: "",
    description: "",
    goals: "",
    websites: "",
    schedule: "manual",
  })

  const handleTemplateSelect = (template: AgentTemplate) => {
    setSelectedTemplate(template)
    setAgentConfig({
      ...agentConfig,
      name: template.name,
      description: template.description,
    })
    setStep("configure")
  }

  const handleConfigSubmit = () => {
    setStep("review")
  }

  const handleCreateAgent = async () => {
    try {
      const response = await fetch("/api/agents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...agentConfig,
          template: selectedTemplate?.id,
          features: selectedTemplate?.features,
        }),
      })

      if (response.ok) {
        // Redirect to dashboard or agent page
        window.location.href = "/"
      }
    } catch (error) {
      console.error("Error creating agent:", error)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create Remote Agent</h1>
        <p className="text-gray-600 mt-2">Build an intelligent remote control agent to automate your workflows</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center space-x-4">
          <div className={`flex items-center space-x-2 ${step === "template" ? "text-blue-600" : "text-gray-400"}`}>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "template" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
            >
              1
            </div>
            <span className="font-medium">Choose Remote Template</span>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-400" />
          <div className={`flex items-center space-x-2 ${step === "configure" ? "text-blue-600" : "text-gray-400"}`}>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "configure" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
            >
              2
            </div>
            <span className="font-medium">Configure Remote Agent</span>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-400" />
          <div className={`flex items-center space-x-2 ${step === "review" ? "text-blue-600" : "text-gray-400"}`}>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "review" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
            >
              3
            </div>
            <span className="font-medium">Review & Deploy</span>
          </div>
        </div>
      </div>

      {/* Template Selection */}
      {step === "template" && (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Remote Agent Template</h2>
            <p className="text-gray-600">Select a template that best matches your remote automation needs</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {agentTemplates.map((template) => (
              <Card
                key={template.id}
                className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-blue-200"
                onClick={() => handleTemplateSelect(template)}
              >
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600">{template.icon}</div>
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription>{template.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {template.features.map((feature, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                    <Button className="w-full">
                      Select Remote Template
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center pt-6">
            <Link href="/agents/create-with-ai">
              <Button variant="outline" size="lg">
                <Sparkles className="h-4 w-4 mr-2" />
                Create with AI Remote Assistant
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Configuration */}
      {step === "configure" && selectedTemplate && (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Configure Your Remote Agent</h2>
            <p className="text-gray-600">
              Customize your {selectedTemplate.name.toLowerCase()} for your specific needs
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Remote Agent Details</CardTitle>
              <CardDescription>Basic information about your remote control agent</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Remote Agent Name</Label>
                <Input
                  id="name"
                  value={agentConfig.name}
                  onChange={(e) => setAgentConfig({ ...agentConfig, name: e.target.value })}
                  placeholder="e.g., Business Remote Automation"
                />
              </div>
              <div>
                <Label htmlFor="description">Remote Description</Label>
                <Textarea
                  id="description"
                  value={agentConfig.description}
                  onChange={(e) => setAgentConfig({ ...agentConfig, description: e.target.value })}
                  placeholder="Describe what this remote agent will do..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="goals">Remote Goals</Label>
                <Textarea
                  id="goals"
                  value={agentConfig.goals}
                  onChange={(e) => setAgentConfig({ ...agentConfig, goals: e.target.value })}
                  placeholder="What workflows should it control remotely? What tasks should it automate?"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="websites">Remote Target Websites</Label>
                <Input
                  id="websites"
                  value={agentConfig.websites}
                  onChange={(e) => setAgentConfig({ ...agentConfig, websites: e.target.value })}
                  placeholder="e.g., salesforce.com, gmail.com, linkedin.com"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep("template")}>
              Back to Remote Templates
            </Button>
            <Button onClick={handleConfigSubmit}>
              Continue to Review
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Review */}
      {step === "review" && selectedTemplate && (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Review Your Remote Agent</h2>
            <p className="text-gray-600">Confirm the details before deploying your remote control agent</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Remote Agent Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Remote Template</Label>
                  <p className="text-gray-900">{selectedTemplate.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Remote Agent Name</Label>
                  <p className="text-gray-900">{agentConfig.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Remote Description</Label>
                  <p className="text-gray-900">{agentConfig.description}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Remote Goals</Label>
                  <p className="text-gray-900">{agentConfig.goals}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Remote Target Websites</Label>
                  <p className="text-gray-900">{agentConfig.websites}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Remote Features</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {selectedTemplate.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-gray-900">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep("configure")}>
              Back to Configure
            </Button>
            <Button onClick={handleCreateAgent} size="lg">
              <Bot className="h-4 w-4 mr-2" />
              Deploy Remote Agent
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
