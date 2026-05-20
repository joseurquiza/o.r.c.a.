import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowRight, Plus, Sparkles } from "lucide-react"
import { getCurrentCreator, signInAsCreator, signOutCreator } from "@/lib/actions/creators"
import { getMySubmissions } from "@/lib/actions/submissions"
import { StatusBadge } from "@/components/store/status-badge"
import { ScorePill } from "@/components/store/score-pill"

export const dynamic = "force-dynamic"

export default async function CreatorsHome() {
  const creator = await getCurrentCreator()

  if (!creator) {
    return (
      <div className="container mx-auto p-4 md:p-8 max-w-2xl">
        <header className="mb-8">
          <p className="text-sm text-muted-foreground">Creator Portal</p>
          <h1 className="text-3xl md:text-4xl font-bold text-balance mt-1">
            Submit your AI app for review.
          </h1>
          <p className="text-muted-foreground mt-3 leading-relaxed">
            We&apos;ll run automated security, observability, and production-readiness checks on your code,
            a human reviewer will sign off, and we&apos;ll either deploy it for you or help you stand up your
            own infra. Approved apps are listed in the Orca Store.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Sign in as a creator</CardTitle>
            <CardDescription>
              We use your email to identify your submissions. No password yet — magic-link auth coming.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={async (fd) => {
                "use server"
                await signInAsCreator(fd)
              }}
              className="grid gap-4"
            >
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required placeholder="you@example.com" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="displayName">Display name (optional)</Label>
                <Input id="displayName" name="displayName" placeholder="Jane Builder" />
              </div>
              <Button type="submit" className="w-fit">
                Continue
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 grid gap-3 md:grid-cols-3">
          <FeaturePill title="Submit any source" body="GitHub repo, code bundle, or live URL." />
          <FeaturePill title="Production review" body="Security, observability, billing, auth checks." />
          <FeaturePill title="Managed deploy" body="We deploy or stand up your infra for you." />
        </div>
      </div>
    )
  }

  const submissions = await getMySubmissions()

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-5xl space-y-8">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm text-muted-foreground">Creator Portal</p>
          <h1 className="text-3xl md:text-4xl font-bold text-balance mt-1">
            {submissions.length === 0 ? "Submit your first app." : `Your submissions`}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Signed in as <span className="font-mono">{creator.email}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/creators/new">
              <Plus className="h-4 w-4 mr-2" />
              New submission
            </Link>
          </Button>
          <form
            action={async () => {
              "use server"
              await signOutCreator()
            }}
          >
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </header>

      {submissions.length === 0 ? (
        <Card>
          <CardHeader>
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Ready when you are</CardTitle>
            <CardDescription>
              Submit a GitHub repo, upload a bundle, or point at a live URL. We&apos;ll handle the rest.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/creators/new">
                Start submission
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {submissions.map((s) => (
            <Link key={s.id} href={`/creators/submissions/${s.id}`} className="block">
              <Card className="hover:border-primary/50 transition-colors">
                <CardContent className="pt-6 flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate">{s.name}</h3>
                      <StatusBadge status={s.status} />
                      {s.readiness_score !== null && <ScorePill score={s.readiness_score} />}
                    </div>
                    {s.tagline && (
                      <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{s.tagline}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2 flex-wrap">
                      <Badge variant="outline" className="font-mono text-xs">
                        {s.source_type}
                      </Badge>
                      {s.category && <span>{s.category}</span>}
                      <span>·</span>
                      <span>updated {new Date(s.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function FeaturePill({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{body}</div>
    </div>
  )
}
