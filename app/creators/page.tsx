import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ArrowRight,
  Plus,
  Sparkles,
  ShieldCheck,
  Rocket,
  GitBranch,
  Wrench,
  CircleDollarSign,
} from "lucide-react"
import { getCurrentCreator, signInAsCreator, signOutCreator } from "@/lib/actions/creators"
import { getMySubmissions } from "@/lib/actions/submissions"
import { StatusBadge } from "@/components/store/status-badge"
import { ScorePill } from "@/components/store/score-pill"

export const dynamic = "force-dynamic"

export default async function CreatorsHome() {
  const creator = await getCurrentCreator()

  if (!creator) {
    return (
      <div className="min-h-screen">
        {/* Hero */}
        <section className="relative overflow-hidden border-b">
          <div className="absolute inset-0 bg-brand-mesh animate-orca-shimmer" aria-hidden />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" aria-hidden />

          <div className="relative container mx-auto px-4 md:px-8 max-w-5xl py-16 md:py-24">
            <div className="space-y-5 max-w-2xl animate-orca-rise">
              <div className="inline-flex items-center gap-2 rounded-full border bg-card/70 backdrop-blur px-3 py-1 text-xs font-medium">
                <Rocket className="h-3.5 w-3.5 text-[hsl(var(--brand-mid))]" />
                For indie AI builders
              </div>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-balance">
                Ship your AI app like the{" "}
                <span className="text-brand-gradient animate-orca-shimmer">big platforms</span> do.
              </h1>
              <p className="text-lg text-foreground/70 leading-relaxed max-w-xl text-pretty">
                Submit your repo, bundle, or live URL. We run the same kind of review the App Store and Play Store
                run &mdash; security, observability, billing, auth &mdash; then we either deploy it for you or stand up
                your own infra. You get listed in the Orca Store.
              </p>
            </div>

            {/* Sign-in card */}
            <Card className="mt-10 max-w-xl shadow-lg border-border/60 backdrop-blur bg-card/95 animate-orca-rise" style={{ animationDelay: "120ms" }}>
              <CardHeader>
                <CardTitle>Start your submission</CardTitle>
                <CardDescription>
                  Tell us your email so we can track your apps and reviewer notes. Magic-link auth coming soon.
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
                  <Button type="submit" size="lg" className="w-fit bg-brand-gradient text-white border-0 hover:opacity-90 transition-opacity">
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* How it works */}
        <section className="container mx-auto px-4 md:px-8 max-w-5xl py-16 space-y-10">
          <div className="space-y-2 text-center max-w-2xl mx-auto">
            <Badge variant="outline" className="font-normal">How it works</Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              From repo to revenue, without DevOps.
            </h2>
            <p className="text-foreground/70 leading-relaxed">
              Four steps. We do the boring, scary, production-readiness work so you can keep building.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Step
              n="01"
              icon={<GitBranch className="h-5 w-5" />}
              title="Submit"
              body="Drop a GitHub URL, upload a bundle, or point at a live endpoint."
              delay="0ms"
            />
            <Step
              n="02"
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Automated checks"
              body="Security scans, dependency audits, prompt-injection tests, env inventory."
              delay="80ms"
            />
            <Step
              n="03"
              icon={<Wrench className="h-5 w-5" />}
              title="Production fixes"
              body="A human reviewer adds auth, rate limits, logging, and error handling where missing."
              delay="160ms"
            />
            <Step
              n="04"
              icon={<CircleDollarSign className="h-5 w-5" />}
              title="Deploy & list"
              body="Managed deploy on our infra, or concierge setup on yours. Then you go live in the Store."
              delay="240ms"
            />
          </div>
        </section>

        {/* Why */}
        <section className="container mx-auto px-4 md:px-8 max-w-5xl pb-20">
          <Card className="overflow-hidden border-border/60">
            <div className="grid md:grid-cols-2">
              <div className="p-8 md:p-12 space-y-4">
                <Badge className="bg-[hsl(var(--brand-warm))] hover:bg-[hsl(var(--brand-warm))] border-0 text-white">
                  Why creators pick Orca
                </Badge>
                <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-balance">
                  You ship the AI. We ship the production.
                </h3>
                <ul className="space-y-3 text-sm text-foreground/80">
                  <Bullet>Code-level review, not a checklist. We push fixes back to you.</Bullet>
                  <Bullet>Distribution: every approved app is featured in the Orca Store.</Bullet>
                  <Bullet>Billing built in &mdash; free, paid install, subscription, or usage-based.</Bullet>
                  <Bullet>Health monitored after launch. We page you when something breaks.</Bullet>
                </ul>
              </div>
              <div className="relative bg-brand-gradient animate-orca-shimmer min-h-[260px] flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/20" aria-hidden />
                <div className="relative text-white text-center space-y-2 p-8">
                  <Sparkles className="h-8 w-8 mx-auto animate-orca-float" />
                  <div className="text-3xl font-bold">100% reviewed</div>
                  <div className="text-sm text-white/80">Every app in the store passes our gate.</div>
                </div>
              </div>
            </div>
          </Card>
        </section>
      </div>
    )
  }

  const submissions = await getMySubmissions()

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-5xl space-y-8">
      <header className="relative overflow-hidden rounded-2xl border bg-brand-mesh animate-orca-shimmer">
        <div className="absolute inset-0 bg-gradient-to-r from-background/85 via-background/60 to-transparent" aria-hidden />
        <div className="relative p-6 md:p-8 flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Creator Portal</p>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-balance">
              {submissions.length === 0 ? "Submit your first app." : "Your submissions"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Signed in as <span className="font-mono text-foreground">{creator.email}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild className="bg-brand-gradient text-white border-0 hover:opacity-90 transition-opacity">
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
        </div>
      </header>

      {submissions.length === 0 ? (
        <Card>
          <CardHeader>
            <div className="h-12 w-12 rounded-xl bg-brand-gradient flex items-center justify-center mb-2 animate-orca-float">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <CardTitle>Ready when you are</CardTitle>
            <CardDescription className="leading-relaxed">
              Submit a GitHub repo, upload a bundle, or point at a live URL. We&apos;ll handle the rest &mdash;
              security review, production-readiness fixes, deploy, and listing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="bg-brand-gradient text-white border-0 hover:opacity-90 transition-opacity">
              <Link href="/creators/new">
                Start submission
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {submissions.map((s, i) => (
            <Link
              key={s.id}
              href={`/creators/submissions/${s.id}`}
              className="block animate-orca-rise"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <Card className="hover:border-primary/50 hover:-translate-y-0.5 transition-all duration-200">
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
                      <span>&middot;</span>
                      <span>updated {new Date(s.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0 transition-transform group-hover:translate-x-1" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function Step({
  n,
  icon,
  title,
  body,
  delay,
}: {
  n: string
  icon: React.ReactNode
  title: string
  body: string
  delay: string
}) {
  return (
    <Card
      className="relative overflow-hidden hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40 transition-all duration-200 animate-orca-rise"
      style={{ animationDelay: delay }}
    >
      <div className="absolute top-0 right-0 text-6xl font-black text-foreground/[0.04] leading-none p-2 select-none">
        {n}
      </div>
      <CardHeader>
        <div className="h-10 w-10 rounded-lg bg-brand-gradient flex items-center justify-center text-white">
          {icon}
        </div>
        <CardTitle className="text-base mt-2">{title}</CardTitle>
        <CardDescription className="leading-relaxed">{body}</CardDescription>
      </CardHeader>
    </Card>
  )
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand-gradient shrink-0" />
      <span>{children}</span>
    </li>
  )
}
