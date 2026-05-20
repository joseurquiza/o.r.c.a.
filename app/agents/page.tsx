import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Mail, Monitor, Calendar, ArrowRight, Clock } from "lucide-react"
import { getEmailAgents } from "@/lib/actions/email-agent"
import { getRemoteAgents } from "@/lib/actions/remote-agents"
import { getAllSchedules } from "@/lib/actions/agent-schedules"

export const dynamic = "force-dynamic"

export default async function AgentsHubPage() {
  const [emailRes, remoteRes, schedules] = await Promise.all([
    getEmailAgents(),
    getRemoteAgents(),
    getAllSchedules(),
  ])

  const emailAgents = emailRes.success ? emailRes.agents : []
  const remoteAgents = remoteRes.success ? remoteRes.agents || [] : []
  const emailSchedule = schedules.find((s) => s.agent_type === "email")

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-6xl space-y-8">
      <header>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground text-balance">Your Agents</h1>
        <p className="text-muted-foreground mt-2 text-pretty">
          Each agent connects to a different part of your life and reports back on what matters.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Email Agent */}
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <Badge variant={emailAgents.length > 0 ? "default" : "outline"}>
                {emailAgents.length > 0 ? "Connected" : "Not connected"}
              </Badge>
            </div>
            <CardTitle>Email Agent</CardTitle>
            <CardDescription>Reads your inbox and surfaces what needs your attention.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-end gap-3">
            {emailAgents.length > 0 && (
              <div className="text-sm text-muted-foreground space-y-1">
                <div className="truncate">{emailAgents[0].gmail_email}</div>
                {emailSchedule?.enabled ? (
                  <div className="flex items-center gap-1.5 text-xs">
                    <Clock className="h-3 w-3" />
                    Daily at {emailSchedule.run_time} {emailSchedule.timezone}
                  </div>
                ) : (
                  <div className="text-xs">Manual runs only</div>
                )}
              </div>
            )}
            <Button asChild>
              <Link href="/agents/email">
                {emailAgents.length > 0 ? "Open" : "Connect Gmail"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Browser / Remote Agent */}
        <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Monitor className="h-5 w-5 text-primary" />
              </div>
              <Badge variant={remoteAgents.length > 0 ? "default" : "outline"}>
                {remoteAgents.length > 0 ? `${remoteAgents.length} active` : "Not set up"}
              </Badge>
            </div>
            <CardTitle>Browser Agent</CardTitle>
            <CardDescription>
              Watch and control a browser session through the Orca extension.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-end gap-3">
            {remoteAgents.length > 0 && (
              <div className="text-sm text-muted-foreground truncate">
                Latest: {remoteAgents[0].name}
              </div>
            )}
            <Button asChild variant={remoteAgents.length > 0 ? "default" : "outline"}>
              <Link href="/agents/remote">
                {remoteAgents.length > 0 ? "Manage" : "Set up"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Calendar (placeholder) */}
        <Card className="flex flex-col opacity-75">
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
              <Badge variant="outline">Coming soon</Badge>
            </div>
            <CardTitle>Calendar Agent</CardTitle>
            <CardDescription>Briefs you on your day and prepares context for upcoming meetings.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-end">
            <Button variant="outline" disabled>
              Soon
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
