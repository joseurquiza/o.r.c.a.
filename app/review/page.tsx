import Link from "next/link"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ShieldCheck, ArrowRight, AlertCircle } from "lucide-react"
import { getReviewQueue } from "@/lib/actions/submissions"
import { getCreatorEmail, isReviewer } from "@/lib/store/identity"
import { StatusBadge } from "@/components/store/status-badge"
import { ScorePill } from "@/components/store/score-pill"

export const dynamic = "force-dynamic"

export default async function ReviewQueuePage() {
  const email = await getCreatorEmail()
  if (!email) redirect("/creators")
  if (!(await isReviewer(email))) {
    return (
      <div className="container mx-auto p-8 max-w-2xl">
        <Card>
          <CardHeader>
            <div className="h-12 w-12 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center mb-2">
              <AlertCircle className="h-6 w-6 text-amber-700 dark:text-amber-300" />
            </div>
            <CardTitle>Reviewer access required</CardTitle>
            <CardDescription>
              Your email <span className="font-mono">{email}</span> is not in the
              configured reviewer list. Set <span className="font-mono">REVIEWER_EMAILS</span>{" "}
              to include your address.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const queue = await getReviewQueue()

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-5xl space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            <span>Reviewer console</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mt-1">Review queue</h1>
          <p className="text-muted-foreground mt-1">
            {queue.length === 0
              ? "Nothing waiting. New submissions will appear here."
              : `${queue.length} ${queue.length === 1 ? "submission" : "submissions"} waiting for review.`}
          </p>
        </div>
      </header>

      {queue.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            The queue is empty.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {queue.map((s) => (
            <Link key={s.id} href={`/review/${s.id}`} className="block">
              <Card className="hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-lg truncate">{s.name}</CardTitle>
                        <StatusBadge status={s.status} />
                        <Badge variant="outline" className="text-xs font-mono">
                          {s.source_type}
                        </Badge>
                        {s.category && (
                          <Badge variant="secondary" className="text-xs">{s.category}</Badge>
                        )}
                      </div>
                      <CardDescription className="line-clamp-1 mt-1">
                        {s.tagline || "No tagline"}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <ScorePill score={s.readiness_score} />
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground flex flex-wrap gap-4">
                  {s.submitted_at && (
                    <span>Submitted {new Date(s.submitted_at).toLocaleString()}</span>
                  )}
                  {s.reviewer_email && (
                    <span>Reviewer: <span className="font-mono">{s.reviewer_email}</span></span>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/creators">Back to my submissions</Link>
        </Button>
      </div>
    </div>
  )
}
