"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Bot, Play, Pause, Settings, MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import Link from "next/link"

interface Agent {
  id: string
  name: string
  description: string
  status: "active" | "paused" | "error"
  lastActive: string
  tasksCompleted: number
  successRate: number
}

interface AgentCardProps {
  agent: Agent
}

export function AgentCard({ agent }: AgentCardProps) {
  const getStatusBadge = (status: Agent["status"]) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Remote Active</Badge>
      case "paused":
        return <Badge variant="secondary">Paused</Badge>
      case "error":
        return <Badge variant="destructive">Error</Badge>
    }
  }

  const getStatusIcon = (status: Agent["status"]) => {
    switch (status) {
      case "active":
        return <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
      case "paused":
        return <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
      case "error":
        return <div className="w-2 h-2 bg-red-500 rounded-full"></div>
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Bot className="h-8 w-8 text-blue-600" />
            <div>
              <CardTitle className="text-lg">{agent.name}</CardTitle>
              <CardDescription>{agent.description}</CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(agent.status)}
            {getStatusBadge(agent.status)}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Remote Agent
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Play className="h-4 w-4 mr-2" />
                  Start Remote Control
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause Remote Agent
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Remote Tasks</p>
            <p className="font-semibold">{agent.tasksCompleted}</p>
          </div>
          <div>
            <p className="text-gray-500">Success Rate</p>
            <p className="font-semibold">{agent.successRate}%</p>
          </div>
          <div>
            <p className="text-gray-500">Last Active</p>
            <p className="font-semibold">{agent.lastActive}</p>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Remote Performance</span>
            <span>{agent.successRate}%</span>
          </div>
          <Progress value={agent.successRate} className="h-2" />
        </div>
        <div className="flex space-x-2 mt-4">
          <Link href={`/agents/${agent.id}/test`}>
            <Button size="sm" variant="outline" className="flex-1 bg-transparent">
              Test Remote Agent
            </Button>
          </Link>
          <Button size="sm" className="flex-1">
            {agent.status === "active" ? "Pause" : "Start"} Remote
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
