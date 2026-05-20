"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Check, X, RotateCcw, Hand } from "lucide-react"
import {
  approveSubmission,
  rejectSubmission,
  requestChanges,
  claimForReview,
  addManualFinding,
} from "@/lib/actions/submissions"
import type { Submission } from "@/lib/actions/submissions"
import { useRouter } from "next/navigation"

export function ReviewerActions({ submission }: { submission: Submission }) {
  const [isPending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const isOpen = ["submitted", "in_review", "changes_requested"].includes(submission.status)

  function run(fn: () => Promise<{ success?: boolean; error?: string } | void>) {
    setError(null)
    start(async () => {
      const r = await fn()
      if (r && "error" in r && r.error) {
        setError(r.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Decision</CardTitle>
          <CardDescription>
            {isOpen ? "Approve, request changes, or reject." : "This submission is closed."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {submission.status === "submitted" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              disabled={isPending}
              onClick={() => run(() => claimForReview(submission.id))}
            >
              <Hand className="h-3 w-3 mr-1" />
              Claim for review
            </Button>
          )}

          {isOpen && (
            <>
              <form
                action={(fd) => run(() => approveSubmission(fd))}
                className="space-y-2 border-t pt-3"
              >
                <Input type="hidden" name="submission_id" value={submission.id} />
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Approve & list in store
                </Label>
                <Select name="deployment_type" defaultValue="external">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="external">External (creator self-hosts)</SelectItem>
                    <SelectItem value="managed">Managed (we deploy)</SelectItem>
                    <SelectItem value="concierge">Concierge (we set up their infra)</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea
                  name="review_notes"
                  rows={2}
                  placeholder="Approval notes (becomes the version's changelog)"
                />
                <Button type="submit" size="sm" disabled={isPending} className="w-full">
                  <Check className="h-3 w-3 mr-1" />
                  Approve
                </Button>
              </form>

              <form
                action={(fd) => run(() => requestChanges(fd))}
                className="space-y-2 border-t pt-3"
              >
                <Input type="hidden" name="submission_id" value={submission.id} />
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Request changes
                </Label>
                <Textarea
                  name="review_notes"
                  rows={3}
                  required
                  placeholder="What does the creator need to fix?"
                />
                <Button type="submit" size="sm" variant="outline" disabled={isPending} className="w-full">
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Send back
                </Button>
              </form>

              <form
                action={(fd) => run(() => rejectSubmission(fd))}
                className="space-y-2 border-t pt-3"
              >
                <Input type="hidden" name="submission_id" value={submission.id} />
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Reject
                </Label>
                <Textarea
                  name="review_notes"
                  rows={2}
                  placeholder="Reason for rejection"
                />
                <Button
                  type="submit"
                  size="sm"
                  variant="destructive"
                  disabled={isPending}
                  className="w-full"
                >
                  <X className="h-3 w-3 mr-1" />
                  Reject
                </Button>
              </form>
            </>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      {isOpen && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add manual finding</CardTitle>
            <CardDescription>Things you noticed that the automated checks missed.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={(fd) => run(() => addManualFinding(fd))}
              className="space-y-2"
            >
              <Input type="hidden" name="submission_id" value={submission.id} />
              <Input name="title" required placeholder="e.g. No rate limit on /api/chat" />
              <Textarea name="detail" rows={2} placeholder="Detail" />
              <Textarea name="remediation" rows={2} placeholder="Suggested fix" />
              <div className="grid grid-cols-3 gap-2">
                <Select name="category" defaultValue="security">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="reliability">Reliability</SelectItem>
                    <SelectItem value="observability">Observability</SelectItem>
                    <SelectItem value="auth">Auth</SelectItem>
                    <SelectItem value="billing">Billing</SelectItem>
                    <SelectItem value="manual">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Select name="severity" defaultValue="medium">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
                <Select name="status" defaultValue="warning">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="passed">Passed</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" size="sm" variant="outline" disabled={isPending}>
                Add finding
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </>
  )
}
