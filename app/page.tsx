import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bot, Inbox, Plug, ArrowRight, Sparkles, Activity } from "lucide-react"
import { getWorkers } from "@/lib/actions/workers"
import { getConnections } from "@/lib/actions/connections"
import { getPendingApprovals } from "@/lib/actions/approvals"

export const dynamic = "force-dynamic"

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

export default async function Home() {
  const [workers, connections, pending] = await Promise.all([
    getWorkers(),
    getConnections(),
    getPendingApprovals(),
  ])

  const activeWorkers = workers.filter((w) => w.status === "active")
  const totalActions = workers.reduce((sum, w) => sum + (w.total_actions || 0), 0)

  const empty = workers.length === 0 && connections.length === 0

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-5xl space-y-8">
      <header>
        <p className="text-sm text-muted-foreground">{greeting()},</p>
        <h1 className="text-3xl md:text-4xl font-bold text-balance mt-1">
          {empty
            ? "Hire your first AI worker."
            : `${pending.length} ${pending.length === 1 ? "action awaits" : "actions await"} your approval.`}
        </h1>
      </header>

      {empty ? (
        <Card>
          <CardHeader>
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Welcome to Orca</CardTitle>
            <CardDescription>
              Orca is a platform for hiring AI workers that do real work in your tools — with you in the loop. Start by
              connecting Gmail and hiring a Support Worker.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/connections">
                <Plug className="h-4 w-4 mr-2" />
                Connect Gmail
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/workers/new">
                <Bot className="h-4 w-4 mr-2" />
                Hire a worker
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-6">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Active workers</div>
                <div className="text-3xl font-semibold tabular-nums mt-1">{activeWorkers.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Connections</div>
                <div className="text-3xl font-semibold tabular-nums mt-1">{connections.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Actions taken</div>
                <div className="text-3xl font-semibold tabular-nums mt-1">{totalActions}</div>
              </CardContent>
            </Card>
            <Card className={pending.length > 0 ? "border-amber-400" : undefined}>
              <CardContent className="pt-6">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">Awaiting approval</div>
                <div className="text-3xl font-semibold tabular-nums mt-1">{pending.length}</div>
              </CardContent>
            </Card>
          </div>

          {/* Pending approvals teaser */}
          {pending.length > 0 && (
            <Card className="border-amber-400/50 bg-amber-50/40 dark:bg-amber-950/20">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                      <Inbox className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                    </div>
                    <div>
                      <CardTitle>Approvals waiting</CardTitle>
                      <CardDescription>Your workers proposed actions and want your sign-off.</CardDescription>
                    </div>
                  </div>
                  <Button asChild size="sm">
                    <Link href="/inbox">
                      Review
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {pending.slice(0, 3).map((a) => (
                  <div key={a.id} className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className="font-mono text-xs">{a.action_type}</Badge>
                    <span className="truncate">{a.action_summary}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Workers */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Your workers
              </h2>
              <Button asChild variant="ghost" size="sm">
                <Link href="/workers">
                  View all
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {workers.slice(0, 4).map((w) => (
                <Link key={w.id} href={`/workers/${w.id}`} className="block">
                  <Card className="hover:border-primary/50 transition-colors h-full">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base truncate">{w.name}</CardTitle>
                        <Badge variant={w.status === "active" ? "default" : "secondary"} className="text-xs">
                          {w.status}
                        </Badge>
                      </div>
                      <CardDescription className="line-clamp-2">{w.job_description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          {w.total_runs} runs
                        </span>
                        <span>·</span>
                        <span>{w.total_actions} actions</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
              <Link href="/workers/new" className="block">
                <Card className="border-dashed hover:border-primary/50 transition-colors h-full">
                  <CardHeader className="flex-row items-center gap-3 space-y-0">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Hire another worker</CardTitle>
                      <CardDescription className="text-xs">Pick a template &amp; assign tools</CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
