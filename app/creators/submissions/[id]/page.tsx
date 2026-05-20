import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, ExternalLink, Github, Link2 } from "lucide-react"
import { getCurrentCreator } from "@/lib/actions/creators"
import { getSubmissionForCreator, submitSubmissionForReview, withdrawSubmission } from "@/lib/actions/submissions"
import { StatusBadge } from "@/components/store/status-badge"
import { ScorePill } from "@/components/store/score-pill"
import { ChecksList } from "@/components/store/checks-list"

export const dynamic = "force-dynamic"

export default async function CreatorSubmissionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const creator = await getCurrentCreator()
  if (!creator) redirect("/creators")

  const data = await getSubmissionForCreator(id)
  if (!data) notFound()
  const { submission, checks } = data

  const canSubmit = submission.status === "draft" || submission.status === "changes_requested"
  const canWithdraw = ["submitted", "in_review", "changes_requested"].includes(submission.status)

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-4xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/creators">
          <ArrowLeft className="h-4 w-4 mr-2" />
          All submissions
        </Link>
      </Button>

      <header className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-3xl font-bold text-balance">{submission.name}</h1>
          <StatusBadge status={submission.status} />
          {submission.readiness_score !== null && <ScorePill score={submission.readiness_score} />}
        </div>
        {submission.tagline && <p className="text-muted-foreground">{submission.tagline}</p>}
        <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
          <Badge variant="outline" className="font-mono">
            {submission.source_type}
          </Badge>
          {submission.category && <span>{submission.category}</span>}
          <span>·</span>
          <span>{submission.pricing_model ?? "free"}</span>
          {submission.price_usd ? <span>${submission.price_usd}</span> : null}
        </div>
      </header>

      {submission.review_notes && (
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900">
          <CardHeader>
            <CardTitle className="text-base">Reviewer notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{submission.review_notes}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Source</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            {submission.source_type === "github" && submission.github_url && (
              <a
                href={submission.github_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-primary hover:underline break-all"
              >
                <Github className="h-4 w-4 flex-shrink-0" />
                {submission.github_url}
              </a>
            )}
            {submission.source_type === "live_url" && submission.live_url && (
              <a
                href={submission.live_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-primary hover:underline break-all"
              >
                <Link2 className="h-4 w-4 flex-shrink-0" />
                {submission.live_url}
              </a>
            )}
            {submission.source_type === "bundle" && submission.bundle_filename && (
              <span className="font-mono text-xs">{submission.bundle_filename}</span>
            )}
            {submission.github_branch && (
              <div className="text-xs text-muted-foreground">Branch: {submission.github_branch}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Manifest</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted rounded p-3 overflow-x-auto max-h-48">
              {JSON.stringify(submission.manifest ?? {}, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle>Review checks</CardTitle>
              <CardDescription>
                Automated production-readiness signals. Submitting for review re-runs these.
              </CardDescription>
            </div>
            {submission.readiness_score !== null && <ScorePill score={submission.readiness_score} />}
          </div>
        </CardHeader>
        <CardContent>
          {checks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No checks yet. Submit for review to run the suite.
            </p>
          ) : (
            <ChecksList checks={checks} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What happens next</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3 leading-relaxed text-muted-foreground">
          {submission.status === "draft" && (
            <p>
              Hit <strong>Submit for review</strong>. We&apos;ll run automated checks and a human reviewer
              will sign off, request changes, or reject — typically within a few business days.
            </p>
          )}
          {submission.status === "submitted" && (
            <p>You&apos;re in the queue. A reviewer will pick this up shortly.</p>
          )}
          {submission.status === "in_review" && (
            <p>A reviewer is actively looking at your app. Hang tight.</p>
          )}
          {submission.status === "changes_requested" && (
            <p>Address the reviewer&apos;s notes above and resubmit when ready.</p>
          )}
          {submission.status === "approved" && submission.app_id && (
            <p>
              Approved! Your app is live in the store.{" "}
              <Link href="/store" className="text-primary hover:underline">
                View the catalog
                <ExternalLink className="h-3 w-3 inline ml-1" />
              </Link>
            </p>
          )}
          {submission.status === "rejected" && (
            <p>
              This submission was not approved. You can address the feedback and create a new submission.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2 flex-wrap">
        {canSubmit && (
          <form
            action={async () => {
              "use server"
              await submitSubmissionForReview(id)
            }}
          >
            <Button type="submit">Submit for review</Button>
          </form>
        )}
        {canWithdraw && (
          <form
            action={async () => {
              "use server"
              await withdrawSubmission(id)
            }}
          >
            <Button type="submit" variant="outline">
              Withdraw
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
