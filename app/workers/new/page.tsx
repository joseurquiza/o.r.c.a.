import { redirect } from "next/navigation"
import { getWorkerTemplates, createWorker, type WorkerTemplate } from "@/lib/actions/workers"
import { getConnections } from "@/lib/actions/connections"
import { PROVIDER_CATALOG } from "@/lib/connections-catalog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plug, Bot } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

async function hire(formData: FormData) {
  "use server"
  const template = formData.get("template") as WorkerTemplate
  const name = formData.get("name") as string
  const job = formData.get("job") as string
  const connectionIds = formData.getAll("connection_ids") as string[]

  const w = await createWorker({
    template,
    name,
    job_description: job,
    connection_ids: connectionIds,
  })
  redirect(`/workers/${w.id}`)
}

export default async function NewWorkerPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: WorkerTemplate }>
}) {
  const params = await searchParams
  const templates = await getWorkerTemplates()
  const connections = await getConnections()

  const selectedId = (params.template ?? "support") as WorkerTemplate
  const selected = templates.find((t) => t.id === selectedId) || templates[0]
  const recommendedSet = new Set(selected.recommendedTools)

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Hire a worker</h1>
        <p className="text-muted-foreground">
          Pick a template, give them a job description, and assign the tools they can use.
        </p>
      </header>

      {/* Template picker */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">1. Choose a template</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {templates.map((t) => {
            const active = t.id === selected.id
            return (
              <Link
                key={t.id}
                href={`/workers/new?template=${t.id}`}
                className={`block rounded-lg border p-4 transition-colors ${
                  active ? "border-primary bg-primary/5" : "hover:border-primary/40"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Bot className="h-4 w-4" />
                  <span className="font-medium">{t.name}</span>
                  {t.id === "support" && <Badge className="text-xs">Recommended</Badge>}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{t.job_description || "Custom worker."}</p>
              </Link>
            )
          })}
        </div>
      </div>

      <form action={hire} className="space-y-6">
        <input type="hidden" name="template" value={selected.id} />

        {/* Name + job */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Describe the job</CardTitle>
            <CardDescription>The worker reads this every run. Be specific about what to do and what NOT to do.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">Worker name</label>
              <input
                id="name"
                name="name"
                defaultValue={selected.name}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="job" className="text-sm font-medium">Job description</label>
              <textarea
                id="job"
                name="job"
                defaultValue={selected.job_description}
                rows={6}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-y"
              />
            </div>
          </CardContent>
        </Card>

        {/* Connections */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plug className="h-4 w-4" />
              3. Assign tools
            </CardTitle>
            <CardDescription>
              The worker can only use connections you assign. Approve-by-default for any external action.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {connections.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-center space-y-3">
                <p className="text-sm text-muted-foreground">No connections yet.</p>
                <Button asChild variant="outline" size="sm">
                  <Link href="/connections">Connect a tool</Link>
                </Button>
              </div>
            ) : (
              connections.map((c) => {
                const provider = PROVIDER_CATALOG.find((p) => p.id === c.provider)
                const recommended = recommendedSet.has(c.provider)
                return (
                  <label
                    key={c.id}
                    className="flex items-center gap-3 rounded-md border p-3 cursor-pointer hover:border-primary/40"
                  >
                    <input
                      type="checkbox"
                      name="connection_ids"
                      value={c.id}
                      defaultChecked={recommended}
                      className="h-4 w-4"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{provider?.name || c.provider}</span>
                        {recommended && <Badge variant="secondary" className="text-xs">Recommended</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{c.account_email}</p>
                    </div>
                  </label>
                )
              })
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button asChild variant="outline">
            <Link href="/workers">Cancel</Link>
          </Button>
          <Button type="submit">Hire worker</Button>
        </div>
      </form>
    </div>
  )
}
