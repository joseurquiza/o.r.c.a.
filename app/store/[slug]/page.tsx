import Link from "next/link"
import { notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  Package,
  ShieldCheck,
  Activity,
  ExternalLink,
  Calendar,
} from "lucide-react"
import { getStoreAppBySlug } from "@/lib/actions/store-apps"
import { getInstallerEmail } from "@/lib/store/identity"
import { createClient } from "@/lib/supabase/server"
import { InstallButton } from "@/components/store/install-button"

export const dynamic = "force-dynamic"

export default async function StoreAppPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const data = await getStoreAppBySlug(slug)
  if (!data || data.app.status !== "live") notFound()
  const { app, version, deployment } = data

  const installerEmail = await getInstallerEmail()
  let isInstalled = false
  if (installerEmail) {
    const supabase = await createClient()
    const { data: i } = await supabase
      .from("store_app_installs")
      .select("id")
      .eq("app_id", app.id)
      .eq("user_email", installerEmail)
      .eq("status", "active")
      .maybeSingle()
    isInstalled = !!i
  }

  const creator = (app as unknown as { creator: { display_name: string | null; email: string; bio: string | null; website: string | null } | null }).creator

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-5xl space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/store">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to store
        </Link>
      </Button>

      <header className="flex items-start gap-4 flex-wrap">
        <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Package className="h-8 w-8 text-primary" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-3xl font-bold">{app.name}</h1>
            {app.featured && <Badge>Featured</Badge>}
            <Badge variant="outline" className="font-normal">
              <ShieldCheck className="h-3 w-3 mr-1" />
              Reviewed
            </Badge>
          </div>
          {app.tagline && <p className="text-muted-foreground">{app.tagline}</p>}
          <p className="text-xs text-muted-foreground">
            By <span className="font-medium">{creator?.display_name ?? creator?.email ?? "unknown"}</span>
            {app.category && <> &middot; {app.category}</>}
          </p>
        </div>
        <div className="shrink-0">
          <InstallButton
            appId={app.id}
            isInstalled={isInstalled}
            knownEmail={installerEmail}
            priceLabel={
              app.pricing_model === "free" ? "Free" : app.price_usd ? `$${app.price_usd}` : "Paid"
            }
          />
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          {app.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">About</CardTitle>
              </CardHeader>
              <CardContent className="text-sm whitespace-pre-wrap leading-relaxed">
                {app.description}
              </CardContent>
            </Card>
          )}

          {version && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">What&apos;s in this version</CardTitle>
                <CardDescription>
                  v{version.version_label} &middot; published{" "}
                  {new Date(version.published_at).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {version.changelog && (
                  <p className="whitespace-pre-wrap leading-relaxed">{version.changelog}</p>
                )}
                {version.manifest && Object.keys(version.manifest).length > 0 && (
                  <details>
                    <summary className="text-xs text-muted-foreground cursor-pointer">
                      View manifest
                    </summary>
                    <pre className="text-xs bg-muted p-3 rounded overflow-x-auto mt-2">
{JSON.stringify(version.manifest, null, 2)}
                    </pre>
                  </details>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  Installs
                </span>
                <span className="font-medium tabular-nums">{app.install_count.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Published
                </span>
                <span className="font-medium">
                  {new Date(app.published_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Pricing</span>
                <span className="font-medium">
                  {app.pricing_model === "free"
                    ? "Free"
                    : app.price_usd
                      ? `$${app.price_usd} ${app.pricing_model === "subscription" ? "/mo" : ""}`
                      : "Paid"}
                </span>
              </div>
              {deployment && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Hosting</span>
                    <Badge variant="outline" className="text-xs">
                      {deployment.deployment_type}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Health</span>
                    <Badge
                      variant={deployment.health_status === "healthy" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {deployment.health_status}
                    </Badge>
                  </div>
                  {deployment.deployed_url && (
                    <a
                      href={deployment.deployed_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline text-xs flex items-center gap-1 break-all"
                    >
                      {deployment.deployed_url}
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {creator && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">About the creator</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="font-medium">{creator.display_name ?? creator.email}</p>
                {creator.bio && (
                  <p className="text-muted-foreground leading-relaxed">{creator.bio}</p>
                )}
                {creator.website && (
                  <a
                    href={creator.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline text-xs flex items-center gap-1 break-all"
                  >
                    {creator.website}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
