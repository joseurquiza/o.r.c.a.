import Link from "next/link"
import { getWorkers } from "@/lib/actions/workers"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bot, Plus, Pause, Play, Inbox } from "lucide-react"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

export const dynamic = "force-dynamic"

function statusBadge(status: string) {
  if (status === "active") return <Badge className="bg-green-600"><Play className="h-3 w-3 mr-1" />Active</Badge>
  if (status === "paused") return <Badge variant="secondary"><Pause className="h-3 w-3 mr-1" />Paused</Badge>
  return <Badge variant="outline">Archived</Badge>
}

export default async function WorkersPage() {
  const workers = await getWorkers()

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Bot className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Workers</h1>
            <p className="text-muted-foreground">Your AI employees. Each one has a job, tools, and rules.</p>
          </div>
        </div>
        <Button asChild>
          <Link href="/workers/new">
            <Plus className="h-4 w-4 mr-2" />
            Hire a worker
          </Link>
        </Button>
      </header>

      {workers.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Bot className="h-6 w-6" />
            </EmptyMedia>
            <EmptyTitle>No workers yet</EmptyTitle>
            <EmptyDescription>
              Hire your first AI worker to start automating real work. We&apos;ll start with a Support Worker.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/workers/new">
                <Plus className="h-4 w-4 mr-2" />
                Hire a worker
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workers.map((w) => (
            <Card key={w.id} className="flex flex-col hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="truncate">{w.name}</CardTitle>
                    <CardDescription className="line-clamp-2 mt-1">{w.job_description}</CardDescription>
                  </div>
                  {statusBadge(w.status)}
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between gap-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-2xl font-semibold tabular-nums">{w.total_runs}</div>
                    <div className="text-xs text-muted-foreground">Runs</div>
                  </div>
                  <div>
                    <div className="text-2xl font-semibold tabular-nums">{w.total_actions}</div>
                    <div className="text-xs text-muted-foreground">Actions</div>
                  </div>
                  <div>
                    <div className="text-2xl font-semibold tabular-nums flex items-center justify-center gap-1">
                      {w.total_approvals_pending}
                      {w.total_approvals_pending > 0 && <Inbox className="h-4 w-4 text-amber-500" />}
                    </div>
                    <div className="text-xs text-muted-foreground">Pending</div>
                  </div>
                </div>
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/workers/${w.id}`}>Open</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
