"use client"

import { useEffect, useState, useTransition } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Mail, Sparkles, AlertCircle, CheckCircle2, Clock, Trash2, RefreshCw, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import {
  getEmailAgents,
  getEmailSummaries,
  runEmailAnalysis,
  disconnectEmailAgent,
} from "@/lib/actions/email-agent"
import { ScheduleCard } from "@/components/schedule-card"

interface EmailAgent {
  id: string
  gmail_email: string
  user_name: string | null
  user_picture: string | null
  connected_at: string
  last_run_at: string | null
  active: boolean
}

interface ActionItem {
  task: string
  priority: "high" | "medium" | "low"
  dueDate: string | null
  relatedEmail: string | null
}

interface ImportantEmail {
  from: string
  subject: string
  reason: string
}

interface EmailSummary {
  id: string
  summary_text: string
  action_items: ActionItem[]
  important_emails: ImportantEmail[]
  email_count: number
  hours_analyzed: number
  created_at: string
}

export default function EmailAgentPage() {
  const searchParams = useSearchParams()
  const [agents, setAgents] = useState<EmailAgent[]>([])
  const [summaries, setSummaries] = useState<EmailSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  const activeAgent = agents[0]

  useEffect(() => {
    if (searchParams.get("connected") === "true") {
      toast.success("Gmail connected successfully")
    }
    if (searchParams.get("error")) {
      toast.error(`Connection failed: ${searchParams.get("error")}`)
    }
    refresh()
  }, [searchParams])

  const refresh = async () => {
    setLoading(true)
    const agentsRes = await getEmailAgents()
    if (agentsRes.success) {
      setAgents(agentsRes.agents as EmailAgent[])
      if (agentsRes.agents[0]) {
        const summariesRes = await getEmailSummaries(agentsRes.agents[0].id)
        if (summariesRes.success) {
          setSummaries(summariesRes.summaries as EmailSummary[])
        }
      }
    }
    setLoading(false)
  }

  const handleConnect = () => {
    window.location.href = "/api/gmail/connect"
  }

  const handleRunAnalysis = () => {
    if (!activeAgent) return
    startTransition(async () => {
      toast.info("Analyzing your emails...")
      const result = await runEmailAnalysis(activeAgent.id, 24)
      if (result.success) {
        toast.success(`Analyzed ${result.emailCount || 0} emails`)
        await refresh()
      } else {
        toast.error(result.error || "Analysis failed")
      }
    })
  }

  const handleDisconnect = () => {
    if (!activeAgent) return
    if (!confirm("Disconnect Gmail? Your summaries will be deleted.")) return
    startTransition(async () => {
      const result = await disconnectEmailAgent(activeAgent.id)
      if (result.success) {
        toast.success("Gmail disconnected")
        setAgents([])
        setSummaries([])
      }
    })
  }

  const latestSummary = summaries[0]
  const priorityColor = {
    high: "bg-red-100 text-red-800 border-red-200",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
    low: "bg-gray-100 text-gray-700 border-gray-200",
  }

  return (
    <div className="container max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Mail className="h-7 w-7" />
            Email Agent
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Orca reads your inbox and surfaces what matters most.
          </p>
        </div>
        {activeAgent && (
          <div className="flex gap-2">
            <Button onClick={handleRunAnalysis} disabled={isPending}>
              <Sparkles className={`h-4 w-4 mr-2 ${isPending ? "animate-pulse" : ""}`} />
              {isPending ? "Analyzing..." : "Run Analysis"}
            </Button>
            <Button variant="outline" onClick={refresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        )}
      </div>

      {!activeAgent && !loading && (
        <Card>
          <CardHeader>
            <CardTitle>Connect Your Gmail</CardTitle>
            <CardDescription>
              Sign in with Google to let Orca analyze your inbox. We only request read-only access.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Read-only access to your emails
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                AI-generated daily summaries
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Prioritized action items extracted automatically
              </div>
            </div>
            <Button onClick={handleConnect} size="lg">
              <Mail className="h-4 w-4 mr-2" />
              Sign in with Google
            </Button>
          </CardContent>
        </Card>
      )}

      {activeAgent && (
        <>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {activeAgent.user_picture ? (
                    <img
                      src={activeAgent.user_picture || "/placeholder.svg"}
                      alt={activeAgent.user_name || ""}
                      className="h-10 w-10 rounded-full"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <Mail className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium truncate">{activeAgent.user_name || activeAgent.gmail_email}</p>
                    <p className="text-sm text-muted-foreground truncate">{activeAgent.gmail_email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="hidden sm:flex">
                    <Clock className="h-3 w-3 mr-1" />
                    {activeAgent.last_run_at
                      ? `Last run ${new Date(activeAgent.last_run_at).toLocaleString()}`
                      : "Never run"}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={handleDisconnect} disabled={isPending}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <ScheduleCard agentType="email" agentRef={activeAgent.id} />

          {latestSummary && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Today&apos;s Summary
                  </CardTitle>
                  <CardDescription>
                    Analyzed {latestSummary.email_count} emails from the last {latestSummary.hours_analyzed}h
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="leading-relaxed">{latestSummary.summary_text}</p>
                </CardContent>
              </Card>

              {latestSummary.action_items?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      Action Items
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {latestSummary.action_items.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                        <Badge className={priorityColor[item.priority]}>{item.priority}</Badge>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{item.task}</p>
                          {item.relatedEmail && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              From: {item.relatedEmail}
                            </p>
                          )}
                          {item.dueDate && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Due: {new Date(item.dueDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {latestSummary.important_emails?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Important Emails
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {latestSummary.important_emails.map((email, idx) => (
                      <div key={idx} className="p-3 rounded-lg border bg-card">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium">{email.subject}</p>
                          <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </div>
                        <p className="text-sm text-muted-foreground">From: {email.from}</p>
                        <p className="text-sm mt-2">{email.reason}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {!latestSummary && !isPending && (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No analysis yet. Click &quot;Run Analysis&quot; to scan your inbox.</p>
              </CardContent>
            </Card>
          )}

          {summaries.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Past Summaries</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {summaries.slice(1).map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="text-sm font-medium">
                        {new Date(s.created_at).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s.email_count} emails, {s.action_items?.length || 0} action items
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
