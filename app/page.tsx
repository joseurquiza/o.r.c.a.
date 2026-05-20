import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Mail, Monitor, Calendar, Sparkles, ArrowRight, Clock, AlertCircle } from "lucide-react"
import { getEmailAgents, getEmailSummaries } from "@/lib/actions/email-agent"
import { getAllSchedules } from "@/lib/actions/agent-schedules"

export const dynamic = "force-dynamic"

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

export default async function Home() {
  const [emailRes, schedules] = await Promise.all([getEmailAgents(), getAllSchedules()])
  const emailAgents = emailRes.success ? emailRes.agents : []
  const activeEmail = emailAgents[0]
  const emailSchedule = schedules.find((s) => s.agent_type === "email")

  let latestSummary: any = null
  if (activeEmail) {
    const sumRes = await getEmailSummaries(activeEmail.id, 1)
    if (sumRes.success && sumRes.summaries[0]) latestSummary = sumRes.summaries[0]
  }

  const priorityColor: Record<string, string> = {
    high: "bg-destructive/10 text-destructive border-destructive/20",
    medium: "bg-amber-100 text-amber-900 border-amber-200",
    low: "bg-muted text-muted-foreground border-border",
  }

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-5xl space-y-8">
      <header>
        <p className="text-sm text-muted-foreground">{greeting()},</p>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground text-balance mt-1">
          Here&apos;s what your agents are tracking.
        </h1>
      </header>

      {/* Empty state */}
      {!activeEmail && (
        <Card>
          <CardHeader>
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Get started with your first agent</CardTitle>
            <CardDescription>
              Connect a data source and Orca will start surfacing what matters. Your email is a great place to start.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/agents/email">
                Connect Gmail
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Email briefing */}
      {activeEmail && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Email Agent</CardTitle>
                  <CardDescription className="truncate">{activeEmail.gmail_email}</CardDescription>
                </div>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/agents/email">
                  Open
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {latestSummary ? (
              <>
                <p className="leading-relaxed text-pretty">{latestSummary.summary_text}</p>

                {latestSummary.action_items?.length > 0 && (
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <AlertCircle className="h-4 w-4" />
                      Top action items
                    </div>
                    {latestSummary.action_items.slice(0, 3).map((item: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <Badge className={priorityColor[item.priority]} variant="outline">
                          {item.priority}
                        </Badge>
                        <span className="flex-1">{item.task}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground border-t">
                  <Clock className="h-3 w-3" />
                  Updated {new Date(latestSummary.created_at).toLocaleString()}
                  {emailSchedule?.enabled && (
                    <>
                      <span>·</span>
                      <span>
                        Next run {emailSchedule.next_run_at
                          ? new Date(emailSchedule.next_run_at).toLocaleString()
                          : "scheduled"}
                      </span>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">
                No analysis yet.{" "}
                <Link href="/agents/email" className="underline">
                  Run your first scan
                </Link>
                .
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Other agents teaser */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add more agents</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/agents">
              View all
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Link href="/agents/remote" className="block">
            <Card className="hover:bg-accent/50 transition-colors h-full">
              <CardHeader className="flex-row items-center gap-3 space-y-0">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <Monitor className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Browser Agent</CardTitle>
                  <CardDescription className="text-xs">
                    Watch and control a browser via the Orca extension
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
          <Card className="opacity-60 h-full">
            <CardHeader className="flex-row items-center gap-3 space-y-0">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <Calendar className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">Calendar Agent</CardTitle>
                  <Badge variant="outline" className="text-xs">
                    Soon
                  </Badge>
                </div>
                <CardDescription className="text-xs">Daily prep for your meetings</CardDescription>
              </div>
            </CardHeader>
          </Card>
        </div>
      </section>
    </div>
  )
}
