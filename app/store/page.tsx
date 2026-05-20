import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Store, Search, ShieldCheck, Sparkles, Package } from "lucide-react"
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

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-6xl space-y-8">
      <header className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Store className="h-4 w-4" />
          <span>Orca Store</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-balance">
          Production-ready AI apps from indie creators.
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Every app here passed our review for security, reliability, observability, and billing
          best practices &mdash; just like Apple, Google, or Microsoft store review.
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="font-normal">
            <ShieldCheck className="h-3 w-3 mr-1" />
            Reviewed
          </Badge>
          <Badge variant="outline" className="font-normal">Sandboxed</Badge>
          <Badge variant="outline" className="font-normal">Monitored</Badge>
        </div>
      </header>

      <form action="/store" className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Search apps..."
            className="pl-9"
          />
        </div>
        {sp.category && sp.category !== "all" && (
          <input type="hidden" name="category" value={sp.category} />
        )}
        <Button type="submit" variant="secondary">Search</Button>
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
                className="cursor-pointer hover:bg-primary/10"
              >
                {c.label}
              </Badge>
            </Link>
          )
        })}
      </div>

      {apps.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-lg">No apps yet</CardTitle>
            <CardDescription>
              The store is empty. Are you a creator?{" "}
              <Link href="/creators/new" className="text-primary hover:underline">
                Submit your app
              </Link>
              .
            </CardDescription>
          </CardContent>
        </Card>
      ) : (
        <>
          {featured.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Featured
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {featured.map((a) => (
                  <AppCard key={a.id} app={a} large />
                ))}
              </div>
            </section>
          )}

          <section className="space-y-3">
            {featured.length > 0 && <h2 className="text-lg font-semibold">All apps</h2>}
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {others.map((a) => (
                <AppCard key={a.id} app={a} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function AppCard({
  app,
  large,
}: {
  app: Awaited<ReturnType<typeof listStoreApps>>[number]
  large?: boolean
}) {
  return (
    <Link href={`/store/${app.slug}`} className="block">
      <Card className="h-full hover:border-primary/50 transition-colors">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className={large ? "text-lg" : "text-base"}>{app.name}</CardTitle>
                {app.featured && (
                  <Badge variant="default" className="text-xs">Featured</Badge>
                )}
              </div>
              <CardDescription className="line-clamp-2 mt-1">
                {app.tagline ?? "No tagline"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground flex flex-wrap items-center gap-3">
          {app.category && <Badge variant="secondary" className="text-xs">{app.category}</Badge>}
          <span>{app.install_count.toLocaleString()} installs</span>
          <span className="ml-auto font-medium text-foreground">
            {app.pricing_model === "free" ? "Free" : app.price_usd ? `$${app.price_usd}` : "Paid"}
          </span>
        </CardContent>
      </Card>
    </Link>
  )
}
