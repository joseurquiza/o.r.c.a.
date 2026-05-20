import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, ExternalLink, Github, Globe, Package, RefreshCw } from "lucide-react"
import { getSubmissionForReviewer } from "@/lib/actions/submissions"
import { getCreatorEmail, isReviewer } from "@/lib/store/identity"
import { StatusBadge } from "@/components/store/status-badge"
import { ScorePill } from "@/components/store/score-pill"
import { ChecksList } from "@/components/store/checks-list"
import { ReviewerActions } from "@/components/store/reviewer-actions"

export const dynamic = "force-dynamic"

export default async function ReviewerSubmissionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const email = await getCreatorEmail()
  if (!email) redirect("/creators")
  if (!(await isReviewer(email))) redirect("/review")

  const data = await getSubmissionForReviewer(id)
  if (!data) notFound()
  const { submission, checks, creator } = data

  const sourceIcon =
    submission.source_type === "github" ? Github : submission.source_type === "live_url" ? Globe : Package

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-5xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/review">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to queue
        </Link>
      </Button>

      <header className="space-y-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-3xl font-bold">{submission.name}</h1>
              <StatusBadge status={submission.status} />
            </div>
            {submission.tagline && (
              <p className="text-muted-foreground mt-1">{submission.tagline}</p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Creator: <span className="font-mono">{creator?.email ?? "unknown"}</span>
              {creator?.display_name && <> &middot; {creator.display_name}</>}
            </p>
          </div>
          <ScorePill score={submission.readiness_score} />
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                {(() => {
                  const I = sourceIcon
                  return <I className="h-4 w-4" />
                })()}
                Source
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono">{submission.source_type}</Badge>
              </div>
              {submission.github_url && (
                <a
                  href={submission.github_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline flex items-center gap-1 break-all"
                >
                  {submission.github_url}
                  {submission.github_branch && (
                    <span className="text-muted-foreground"> @ {submission.github_branch}</span>
                  )}
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              )}
              {submission.live_url && (
                <a
                  href={submission.live_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline flex items-center gap-1 break-all"
                >
                  {submission.live_url}
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              )}
              {submission.bundle_blob_url && (
                <a
                  href={submission.bundle_blob_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline flex items-center gap-1 break-all"
                >
                  {submission.bundle_filename ?? "Download bundle"}
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base">Production-readiness report</CardTitle>
                  <CardDescription>
                    {checks.length} {checks.length === 1 ? "check" : "checks"} run
                  </CardDescription>
                </div>
                <form action={`/api/review/${submission.id}/rerun`} method="post">
                  <Button type="submit" size="sm" variant="outline">
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Re-run
                  </Button>
                </form>
              </div>
            </CardHeader>
            <CardContent>
              <ChecksList checks={checks} />
            </CardContent>
          </Card>

          {submission.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Description</CardTitle>
              </CardHeader>
              <CardContent className="text-sm whitespace-pre-wrap leading-relaxed">
                {submission.description}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Manifest</CardTitle>
              <CardDescription>Endpoints, env vars, scopes declared by the creator</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
{JSON.stringify(submission.manifest ?? {}, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <ReviewerActions submission={submission} />
        </div>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Internal notes</CardTitle>
          <CardDescription>Private to reviewers. Not shown to the creator.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={`/api/review/${submission.id}/internal-notes`} method="post" className="space-y-3">
            <Label htmlFor="internal_notes" className="sr-only">Internal notes</Label>
            <Textarea
              id="internal_notes"
              name="internal_notes"
              rows={4}
              defaultValue={submission.internal_notes ?? ""}
              placeholder="Risks, follow-ups, things to ask the creator next round..."
            />
            <Input type="hidden" name="submission_id" value={submission.id} />
            <Button type="submit" size="sm" variant="outline">Save notes</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
