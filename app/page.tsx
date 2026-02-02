"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { AgentCard } from "@/components/agent-card"
import { APIAccessSummary } from "@/components/api-access-summary"
import { Bot, Plus, Activity, Zap, CheckCircle, TrendingUp, AlertCircle, Download, Chrome } from "lucide-react"
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

interface DashboardStats {
  totalAgents: number
  activeAgents: number
  totalTasks: number
  successRate: number
}

interface RecentActivity {
  id: string
  type: "agent_created" | "task_completed" | "integration_connected" | "error"
  message: string
  timestamp: string
  status: "success" | "warning" | "error"
}

export default function Dashboard() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalAgents: 0,
    activeAgents: 0,
    totalTasks: 0,
    successRate: 0,
  })
  const [activities, setActivities] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch agents
        const agentsResponse = await fetch("/api/agents")
        const agentsData = await agentsResponse.json()
        const agentsArray = Array.isArray(agentsData) ? agentsData : agentsData.agents || []
        setAgents(agentsArray)

        // Calculate stats
        const activeAgents = agentsArray.filter((agent: Agent) => agent.status === "active").length
        const totalTasks = agentsArray.reduce((sum: number, agent: Agent) => sum + agent.tasksCompleted, 0)
        const avgSuccessRate =
          agentsArray.length > 0
            ? agentsArray.reduce((sum: number, agent: Agent) => sum + agent.successRate, 0) / agentsArray.length
            : 0

        setStats({
          totalAgents: agentsArray.length,
          activeAgents,
          totalTasks,
          successRate: Math.round(avgSuccessRate),
        })

        // Mock activities for now
        setActivities([
          {
            id: "1",
            type: "agent_created",
            message: "New remote agent 'Business Automation' created",
            timestamp: "2 minutes ago",
            status: "success",
          },
          {
            id: "2",
            type: "task_completed",
            message: "Remote task completed: Form submission on client portal",
            timestamp: "5 minutes ago",
            status: "success",
          },
          {
            id: "3",
            type: "integration_connected",
            message: "Google Workspace remote integration connected",
            timestamp: "10 minutes ago",
            status: "success",
          },
        ])
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
        setAgents([])
        setStats({
          totalAgents: 0,
          activeAgents: 0,
          totalTasks: 0,
          successRate: 0,
        })
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const getActivityIcon = (type: RecentActivity["type"]) => {
    switch (type) {
      case "agent_created":
        return <Bot className="h-4 w-4" />
      case "task_completed":
        return <CheckCircle className="h-4 w-4" />
      case "integration_connected":
        return <Zap className="h-4 w-4" />
      case "error":
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: RecentActivity["status"]) => {
    switch (status) {
      case "success":
        return "text-green-600"
      case "warning":
        return "text-yellow-600"
      case "error":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading ORCA Remote Control Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ORCA Dashboard</h1>
          <p className="text-gray-600 mt-1">Omni Remote Control Assistant - Automate any workflow remotely</p>
        </div>
        <div className="flex gap-3">
          <Link href="/extension">
            <Button variant="outline" className="bg-transparent">
              <Download className="h-4 w-4 mr-2" />
              Download Extension
            </Button>
          </Link>
          <Link href="/create-agent">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Create Remote Agent
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remote Agents</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAgents}</div>
            <p className="text-xs text-muted-foreground">{stats.activeAgents} active remote agents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Controls</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeAgents}</div>
            <p className="text-xs text-muted-foreground">Remote agents currently running</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remote Tasks</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTasks}</div>
            <p className="text-xs text-muted-foreground">Total remote tasks completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.successRate}%</div>
            <Progress value={stats.successRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Extension Download Banner */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Chrome className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-blue-900">ORCA Browser Extension</h3>
                <p className="text-blue-700 mt-1">
                  Install the extension to enable remote browser control and automation
                </p>
              </div>
            </div>
            <Link href="/extension">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Download className="h-4 w-4 mr-2" />
                Download Extension
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Remote Agents */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Remote Agents</CardTitle>
              <CardDescription>Manage your remote control agents and their automation tasks</CardDescription>
            </CardHeader>
            <CardContent>
              {agents.length === 0 ? (
                <div className="text-center py-8">
                  <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Remote Agents</h3>
                  <p className="text-gray-600 mb-4">Create your first remote control agent to get started</p>
                  <div className="flex gap-3 justify-center">
                    <Link href="/extension">
                      <Button variant="outline" className="bg-transparent">
                        <Download className="h-4 w-4 mr-2" />
                        Get Extension
                      </Button>
                    </Link>
                    <Link href="/create-agent">
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Remote Agent
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {agents.map((agent) => (
                    <AgentCard key={agent.id} agent={agent} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* API Access */}
          <APIAccessSummary />

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Remote Activity</CardTitle>
              <CardDescription>Latest remote operations and events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className={`mt-1 ${getStatusColor(activity.status)}`}>{getActivityIcon(activity.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{activity.message}</p>
                      <p className="text-xs text-gray-500">{activity.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
