import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getCurrentCreator } from "@/lib/actions/creators"
import { SubmissionForm } from "@/components/store/submission-form"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function NewSubmissionPage() {
  const creator = await getCurrentCreator()
  if (!creator) redirect("/creators")

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-3xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/creators">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to submissions
        </Link>
      </Button>

      <header>
        <p className="text-sm text-muted-foreground">New submission</p>
        <h1 className="text-3xl font-bold text-balance mt-1">Tell us about your app</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Submission details</CardTitle>
          <CardDescription>
            You can save as draft and come back. Submitting for review runs the automated check suite.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SubmissionForm />
        </CardContent>
      </Card>
    </div>
  )
}
