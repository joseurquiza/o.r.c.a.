"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { createSubmission } from "@/lib/actions/submissions"
import { AlertCircle, Github, Link2, Upload } from "lucide-react"

const CATEGORIES = [
  "AI Assistant",
  "Productivity",
  "Marketing",
  "Sales",
  "Support",
  "Developer Tools",
  "Analytics",
  "Content",
  "Other",
]

const EXAMPLE_MANIFEST = `{
  "envVars": ["OPENAI_API_KEY", "DATABASE_URL"],
  "scopes": ["gmail.read", "gmail.send"],
  "endpoints": [
    { "path": "/api/process", "method": "POST", "auth": "session" }
  ],
  "auth": "oauth-google",
  "aiModel": "openai/gpt-5-mini",
  "promptHardening": true,
  "billingProvider": "stripe",
  "observability": {
    "logs": true,
    "metrics": true,
    "errorReporting": "sentry"
  }
}`

export function SubmissionForm() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [sourceType, setSourceType] = useState<"github" | "bundle" | "live_url">("github")
  const [pricingModel, setPricingModel] = useState<"free" | "paid_install" | "subscription" | "usage_based">("free")

  function onSubmit(formData: FormData) {
    setError(null)
    formData.set("source_type", sourceType)
    formData.set("pricing_model", pricingModel)
    startTransition(async () => {
      const res = await createSubmission(formData)
      if (res.error) {
        setError(res.error)
        return
      }
      if (res.success && res.id) {
        router.push(`/creators/submissions/${res.id}`)
      }
    })
  }

  return (
    <form action={onSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2 md:col-span-2">
          <Label htmlFor="name">App name *</Label>
          <Input id="name" name="name" required placeholder="My AI App" />
        </div>
        <div className="grid gap-2 md:col-span-2">
          <Label htmlFor="tagline">Tagline</Label>
          <Input id="tagline" name="tagline" placeholder="Short description shown in the store" maxLength={140} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="category">Category</Label>
          <Select name="category">
            <SelectTrigger id="category">
              <SelectValue placeholder="Choose..." />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="pricing_model">Pricing</Label>
          <Select value={pricingModel} onValueChange={(v) => setPricingModel(v as typeof pricingModel)}>
            <SelectTrigger id="pricing_model">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="paid_install">One-time install fee</SelectItem>
              <SelectItem value="subscription">Subscription</SelectItem>
              <SelectItem value="usage_based">Usage-based</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {pricingModel !== "free" && (
          <div className="grid gap-2">
            <Label htmlFor="price_usd">Price (USD)</Label>
            <Input id="price_usd" name="price_usd" type="number" step="0.01" min="0" placeholder="9.99" />
          </div>
        )}
        <div className="grid gap-2 md:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            rows={5}
            placeholder="What does your app do? Who is it for? What problem does it solve?"
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label>Source</Label>
        <Tabs value={sourceType} onValueChange={(v) => setSourceType(v as typeof sourceType)}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="github">
              <Github className="h-4 w-4 mr-2" />
              GitHub
            </TabsTrigger>
            <TabsTrigger value="bundle">
              <Upload className="h-4 w-4 mr-2" />
              Bundle
            </TabsTrigger>
            <TabsTrigger value="live_url">
              <Link2 className="h-4 w-4 mr-2" />
              Live URL
            </TabsTrigger>
          </TabsList>
          <TabsContent value="github" className="space-y-3 pt-3">
            <div className="grid gap-2">
              <Label htmlFor="github_url">Repository URL</Label>
              <Input id="github_url" name="github_url" placeholder="https://github.com/you/your-app" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="github_branch">Branch (optional)</Label>
              <Input id="github_branch" name="github_branch" placeholder="main" />
            </div>
          </TabsContent>
          <TabsContent value="bundle" className="space-y-3 pt-3">
            <div className="grid gap-2">
              <Label htmlFor="bundle">Code bundle (.zip)</Label>
              <Input id="bundle" name="bundle" type="file" accept=".zip,.tar,.tar.gz,.tgz" />
              <p className="text-xs text-muted-foreground">
                Bundle is stored privately and only reviewed by our team.
              </p>
            </div>
          </TabsContent>
          <TabsContent value="live_url" className="space-y-3 pt-3">
            <div className="grid gap-2">
              <Label htmlFor="live_url">Live app URL</Label>
              <Input id="live_url" name="live_url" placeholder="https://your-app.com" />
              <p className="text-xs text-muted-foreground">
                For already-deployed apps you want listed in the store.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="space-y-2">
        <Label htmlFor="manifest_json">Manifest (JSON)</Label>
        <Textarea
          id="manifest_json"
          name="manifest_json"
          rows={10}
          className="font-mono text-xs"
          defaultValue={EXAMPLE_MANIFEST}
        />
        <p className="text-xs text-muted-foreground">
          Declare env vars (names only — never values), OAuth scopes, public endpoints, auth strategy, AI model,
          and observability tooling. The richer the manifest, the higher your readiness score.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 p-3 text-sm text-red-900 dark:text-red-200">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save as draft"}
        </Button>
      </div>
    </form>
  )
}
