import { getPendingApprovals, approveAction, denyAction } from "@/lib/actions/approvals"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Inbox, Check, X, Bot } from "lucide-react"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

export const dynamic = "force-dynamic"

async function approve(formData: FormData) {
  "use server"
  const id = formData.get("id") as string
  const editedBody = formData.get("body") as string | null
  const editedSubject = formData.get("subject") as string | null

  let editedPayload: any = undefined
  if (editedBody !== null || editedSubject !== null) {
    editedPayload = {
      body: editedBody,
      subject: editedSubject,
      to: formData.get("to"),
      threadId: formData.get("threadId") || undefined,
    }
  }
  await approveAction(id, editedPayload ? { editedPayload } : undefined)
}

async function deny(formData: FormData) {
  "use server"
  const id = formData.get("id") as string
  await denyAction(id)
}

function sentimentBadge(sentiment?: string) {
  if (!sentiment) return null
  const tone =
    sentiment === "urgent" || sentiment === "negative"
      ? "destructive"
      : sentiment === "positive"
        ? "default"
        : "secondary"
  return (
    <Badge variant={tone} className="text-xs capitalize">
      {sentiment}
    </Badge>
  )
}

export default async function InboxPage() {
  const approvals = await getPendingApprovals()

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Inbox className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Approval inbox</h1>
            <p className="text-muted-foreground">
              Every action your workers want to take. Review, edit, approve, or deny.
            </p>
          </div>
        </div>
      </header>

      {approvals.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Check className="h-6 w-6" />
            </EmptyMedia>
            <EmptyTitle>Inbox zero</EmptyTitle>
            <EmptyDescription>No actions awaiting approval. Your workers will surface anything here that needs your eyes.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-4">
          {approvals.map((a) => {
            const ctx = a.context || {}
            const payload = a.action_payload || {}
            const isReply = a.action_type === "send_email"

            return (
              <Card key={a.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                        <Bot className="h-4 w-4 text-muted-foreground" />
                        {a.workers?.name || "Worker"}
                        <span className="text-muted-foreground font-normal">wants to</span>
                        <Badge variant="outline" className="font-mono text-xs">{a.action_type}</Badge>
                        {sentimentBadge(ctx.sentiment)}
                        {a.confidence !== null && (
                          <span className="text-xs text-muted-foreground">{Math.round((a.confidence || 0) * 100)}% confidence</span>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">{a.action_summary}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Reasoning */}
                  {a.reasoning && (
                    <div className="rounded-md bg-muted/50 p-3 text-sm">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Why</div>
                      <p className="leading-relaxed">{a.reasoning}</p>
                    </div>
                  )}

                  {/* Original email context */}
                  {ctx.from && (
                    <div className="rounded-md border p-3 text-sm space-y-1">
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Original</div>
                      <div><span className="text-muted-foreground">From:</span> {ctx.from}</div>
                      <div><span className="text-muted-foreground">Subject:</span> {ctx.subject}</div>
                      {ctx.snippet && <p className="text-muted-foreground italic line-clamp-3">{ctx.snippet}</p>}
                    </div>
                  )}

                  {/* The proposed action — editable for emails */}
                  {isReply ? (
                    <form action={approve} className="space-y-3">
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="to" value={payload.to || ""} />
                      <input type="hidden" name="threadId" value={payload.threadId || ""} />
                      <div className="space-y-1">
                        <label className="text-xs uppercase tracking-wide text-muted-foreground">Subject</label>
                        <input
                          name="subject"
                          defaultValue={payload.subject || ""}
                          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs uppercase tracking-wide text-muted-foreground">
                          Reply to {payload.to}
                        </label>
                        <textarea
                          name="body"
                          defaultValue={payload.body || ""}
                          rows={8}
                          className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono leading-relaxed resize-y"
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button type="submit" formAction={deny} variant="outline" size="sm">
                          <X className="h-4 w-4 mr-1" />
                          Deny
                        </Button>
                        <Button type="submit" size="sm">
                          <Check className="h-4 w-4 mr-1" />
                          Approve &amp; send
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-3">
                      <pre className="rounded-md bg-muted/50 p-3 text-xs overflow-x-auto">
                        {JSON.stringify(payload, null, 2)}
                      </pre>
                      <div className="flex gap-2 justify-end">
                        <form action={deny}>
                          <input type="hidden" name="id" value={a.id} />
                          <Button type="submit" variant="outline" size="sm">
                            <X className="h-4 w-4 mr-1" />
                            Deny
                          </Button>
                        </form>
                        <form action={approve}>
                          <input type="hidden" name="id" value={a.id} />
                          <Button type="submit" size="sm">
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                        </form>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
