import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { getWorker, setWorkerStatus, deleteWorker } from "@/lib/actions/workers"
import { getConnections, PROVIDER_CATALOG } from "@/lib/actions/connections"
import { runSupportWorker } from "@/lib/workers/support-runtime"
import { createClient } from "@/lib/supabase/server"
import { getCurrentOrgId } from "@/lib/orgs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bot, Play, Pause, Trash2, Activity, Inbox, ArrowLeft } from "lucide-react"

export const dynamic = "force-dynamic"

async function runNow(workerId: string) {
  "use server"
  await runSupportWorker(workerId)
  redirect(`/workers/${workerId}`)
}

async function toggleStatus(workerId: string, current: "active" | "paused") {
  "use server"
  await setWorkerStatus(workerId, current === "active" ? "paused" : "active")
}

async function destroy(workerId: string) {
  "use server"
  await deleteWorker(workerId)
  redirect("/workers")
}

export default async function WorkerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const worker = await getWorker(id)
  if (!worker) notFound()

  const connections = await getConnections()
  const assigned = connections.filter((c) => worker.connection_ids?.includes(c.id))

  const supabase = await createClient()
  const orgId = await getCurrentOrgId()
  const { data: recentLog } = await supabase
    .from("audit_log")
    .select("*")
    .eq("org_id", orgId)
    .eq("worker_id", id)
    .order("created_at", { ascending: false })
    .limit(15)

  const { count: pendingCount } = await supabase
    .from("approvals")
    .select("*", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("worker_id", id)
    .eq("status", "pending")

  const isActive = worker.status === "active"

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/workers">
            <ArrowLeft className="h-4 w-4 mr-1" />
            All workers
          </Link>
        </Button>
      </div>

      <header className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Bot className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">{worker.name}</h1>
              {isActive ? (
                <Badge className="bg-green-600">Active</Badge>
              ) : (
                <Badge variant="secondary">Paused</Badge>
              )}
            </div>
            <p className="text-muted-foreground capitalize">{worker.template} worker</p>
          </div>
        </div>
        <div className="flex gap-2">
          <form action={toggleStatus.bind(null, worker.id, worker.status as "active" | "paused")}>
            <Button type="submit" variant="outline" size="sm">
              {isActive ? <><Pause className="h-4 w-4 mr-1" />Pause</> : <><Play className="h-4 w-4 mr-1" />Activate</>}
            </Button>
          </form>
          <form action={runNow.bind(null, worker.id)}>
            <Button type="submit" size="sm">
              <Activity className="h-4 w-4 mr-1" />
              Run now
            </Button>
          </form>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total runs</div>
            <div className="text-3xl font-semibold tabular-nums">{worker.total_runs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Actions taken</div>
            <div className="text-3xl font-semibold tabular-nums">{worker.total_actions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <Inbox className="h-3.5 w-3.5" />
              Awaiting approval
            </div>
            <div className="text-3xl font-semibold tabular-nums flex items-center gap-2">
              {pendingCount ?? 0}
              {(pendingCount ?? 0) > 0 && (
                <Button asChild size="sm" variant="link" className="text-xs">
                  <Link href="/inbox">Review</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Job description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{worker.job_description}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tools &amp; permissions</CardTitle>
          <CardDescription>Assigned connections and per-tool approval mode.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {assigned.length === 0 ? (
            <p className="text-sm text-muted-foreground">No connections assigned. <Link href="/connections" className="underline">Connect a tool</Link>.</p>
          ) : (
            <div className="space-y-2">
              {assigned.map((c) => {
                const provider = PROVIDER_CATALOG.find((p) => p.id === c.provider)
                return (
                  <div key={c.id} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <div className="text-sm font-medium">{provider?.name}</div>
                      <div className="text-xs text-muted-foreground">{c.account_email}</div>
                    </div>
                    <Badge variant="outline" className="text-xs">{c.status}</Badge>
                  </div>
                )
              })}
            </div>
          )}

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Per-tool approval mode</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(worker.tool_permissions || {}).map(([tool, mode]) => (
                <div key={tool} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span className="font-mono text-xs">{tool}</span>
                  <Badge variant={mode === "approve" ? "default" : mode === "auto" ? "secondary" : "destructive"} className="text-xs">
                    {mode === "approve" ? "Approve required" : mode === "auto" ? "Autonomous" : "Blocked"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Recent activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!recentLog || recentLog.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet. Click &quot;Run now&quot; to give the worker a job.</p>
          ) : (
            <ul className="space-y-2">
              {recentLog.map((log: any) => (
                <li key={log.id} className="flex items-start justify-between gap-3 border-b pb-2 last:border-0 last:pb-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="text-xs font-mono">{log.event_type}</Badge>
                      {log.tool_name && <span className="text-xs text-muted-foreground">{log.tool_name}</span>}
                    </div>
                    {log.input_summary && <p className="text-xs text-muted-foreground mt-0.5 truncate">{log.input_summary}</p>}
                    {log.output_summary && <p className="text-xs mt-0.5 truncate">{log.output_summary}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(log.created_at).toLocaleTimeString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <form action={destroy.bind(null, worker.id)}>
          <Button type="submit" variant="ghost" size="sm" className="text-destructive">
            <Trash2 className="h-4 w-4 mr-1" />
            Fire worker
          </Button>
        </form>
      </div>
    </div>
  )
}
