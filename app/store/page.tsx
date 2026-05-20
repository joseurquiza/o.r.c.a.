import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Search,
  ShieldCheck,
  Sparkles,
  Package,
  Activity,
  Zap,
  ArrowRight,
} from "lucide-react"
import { listStoreApps } from "@/lib/actions/store-apps"

export const dynamic = "force-dynamic"

const categories = [
  { value: "all", label: "All" },
  { value: "productivity", label: "Productivity" },
  { value: "developer-tools", label: "Developer Tools" },
  { value: "marketing", label: "Marketing" },
  { value: "support", label: "Support" },
  { value: "research", label: "Research" },
  { value: "creative", label: "Creative" },
]

export default async function StorePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>
}) {
  const sp = await searchParams
  const apps = await listStoreApps({ category: sp.category, search: sp.q })

  const featured = apps.filter((a) => a.featured)
  const others = apps.filter((a) => !a.featured)
  const totalInstalls = apps.reduce((sum, a) => sum + (a.install_count || 0), 0)

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-brand-mesh animate-orca-shimmer" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" aria-hidden />

        <div className="relative container mx-auto px-4 md:px-8 max-w-6xl py-16 md:py-24">
          <div className="max-w-3xl space-y-5 animate-orca-rise">
            <div className="inline-flex items-center gap-2 rounded-full border bg-card/70 backdrop-blur px-3 py-1 text-xs font-medium">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 animate-orca-pulse-ring" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-foreground/80">Reviewed and monitored, just like an app store.</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-balance">
              The home for{" "}
              <span className="text-brand-gradient animate-orca-shimmer">production-ready</span>
              {" "}AI apps.
            </h1>

            <p className="text-lg text-foreground/70 max-w-2xl text-pretty leading-relaxed">
              Indie creators submit their AI apps. We run them through the same kind of review you&apos;d
              expect from Apple, Google, or Microsoft &mdash; security, reliability, billing, observability &mdash;
              then list the ones that pass.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button asChild size="lg" className="bg-brand-gradient text-white border-0 hover:opacity-90 transition-opacity">
                <Link href="#apps">
                  Browse apps
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-card/70 backdrop-blur">
                <Link href="/creators">
                  Submit your app
                </Link>
              </Button>
            </div>

            <div className="flex flex-wrap gap-6 pt-4 text-sm">
              <Stat label="Apps listed" value={apps.length.toString()} />
              <Stat label="Installs" value={totalInstalls.toLocaleString()} />
              <Stat label="Avg readiness" value="92" suffix="/100" />
            </div>
          </div>

          {/* Floating trust pills */}
          <div className="hidden md:flex absolute right-8 top-16 flex-col gap-3">
            <FloatPill icon={<ShieldCheck className="h-4 w-4" />} label="Security audited" delay="0s" />
            <FloatPill icon={<Activity className="h-4 w-4" />} label="Health monitored" delay="0.6s" />
            <FloatPill icon={<Zap className="h-4 w-4" />} label="Billing verified" delay="1.2s" />
          </div>
        </div>
      </section>

      {/* Search + filters */}
      <section className="container mx-auto px-4 md:px-8 max-w-6xl py-8 space-y-6" id="apps">
        <form action="/store" className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="Search by name, capability, or category..."
              className="pl-9 h-11"
            />
          </div>
          {sp.category && sp.category !== "all" && (
            <input type="hidden" name="category" value={sp.category} />
          )}
          <Button type="submit" size="lg" variant="secondary">
            Search
          </Button>
        </form>

        <div className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const active = (sp.category ?? "all") === c.value
            const href =
              c.value === "all"
                ? sp.q
                  ? `/store?q=${encodeURIComponent(sp.q)}`
                  : "/store"
                : sp.q
                  ? `/store?category=${c.value}&q=${encodeURIComponent(sp.q)}`
                  : `/store?category=${c.value}`
            return (
              <Link key={c.value} href={href}>
                <Badge
                  variant={active ? "default" : "outline"}
                  className={
                    active
                      ? "cursor-pointer bg-brand-gradient border-0 text-white"
                      : "cursor-pointer hover:border-primary/50 hover:text-primary transition-colors"
                  }
                >
                  {c.label}
                </Badge>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Catalog */}
      <section className="container mx-auto px-4 md:px-8 max-w-6xl pb-16 space-y-10">
        {apps.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-20 text-center space-y-4">
              <div className="h-14 w-14 rounded-2xl bg-brand-gradient flex items-center justify-center mx-auto animate-orca-float">
                <Package className="h-7 w-7 text-white" />
              </div>
              <CardTitle className="text-xl">The store is wide open.</CardTitle>
              <CardDescription className="max-w-md mx-auto leading-relaxed">
                We&apos;re reviewing the first wave of submissions right now. Want to be first in?{" "}
                <Link href="/creators/new" className="text-primary hover:underline font-medium">
                  Submit your app &rarr;
                </Link>
              </CardDescription>
            </CardContent>
          </Card>
        ) : (
          <>
            {featured.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-[hsl(var(--brand-warm))]" />
                  Featured this week
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {featured.map((a, i) => (
                    <AppCard key={a.id} app={a} large index={i} />
                  ))}
                </div>
              </section>
            )}

            <section className="space-y-4">
              {featured.length > 0 && <h2 className="text-xl font-semibold">All apps</h2>}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {others.map((a, i) => (
                  <AppCard key={a.id} app={a} index={i} />
                ))}
              </div>
            </section>
          </>
        )}
      </section>
    </div>
  )
}

function Stat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div>
      <div className="text-2xl md:text-3xl font-semibold tabular-nums">
        {value}
        {suffix && <span className="text-muted-foreground text-base">{suffix}</span>}
      </div>
      <div className="text-xs text-muted-foreground uppercase tracking-wide mt-0.5">{label}</div>
    </div>
  )
}

function FloatPill({
  icon,
  label,
  delay,
}: {
  icon: React.ReactNode
  label: string
  delay: string
}) {
  return (
    <div
      className="rounded-full border bg-card/80 backdrop-blur px-3 py-2 text-xs font-medium flex items-center gap-2 shadow-sm animate-orca-float"
      style={{ animationDelay: delay }}
    >
      <span className="text-[hsl(var(--brand-mid))]">{icon}</span>
      {label}
    </div>
  )
}

function AppCard({
  app,
  large,
  index = 0,
}: {
  app: Awaited<ReturnType<typeof listStoreApps>>[number]
  large?: boolean
  index?: number
}) {
  return (
    <Link href={`/store/${app.slug}`} className="block group animate-orca-rise" style={{ animationDelay: `${index * 60}ms` }}>
      <Card className="h-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40 relative overflow-hidden">
        {app.featured && (
          <div className="absolute inset-x-0 top-0 h-0.5 bg-brand-gradient" aria-hidden />
        )}
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-xl bg-brand-gradient flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className={large ? "text-lg" : "text-base"}>{app.name}</CardTitle>
                {app.featured && (
                  <Badge className="text-xs bg-[hsl(var(--brand-warm))] hover:bg-[hsl(var(--brand-warm))] border-0 text-white">
                    Featured
                  </Badge>
                )}
              </div>
              <CardDescription className="line-clamp-2 mt-1">
                {app.tagline ?? "No tagline"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground flex flex-wrap items-center gap-3">
          {app.category && (
            <Badge variant="secondary" className="text-xs font-normal">
              {app.category}
            </Badge>
          )}
          <span className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            {app.install_count.toLocaleString()} installs
          </span>
          <span className="ml-auto font-semibold text-foreground">
            {app.pricing_model === "free" ? "Free" : app.price_usd ? `$${app.price_usd}` : "Paid"}
          </span>
        </CardContent>
      </Card>
    </Link>
  )
}
