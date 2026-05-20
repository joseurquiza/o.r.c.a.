"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Check, Download, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { installApp, uninstallApp } from "@/lib/actions/store-apps"
import { useRouter } from "next/navigation"

export function InstallButton({
  appId,
  isInstalled,
  knownEmail,
  priceLabel,
}: {
  appId: string
  isInstalled: boolean
  knownEmail: string | null
  priceLabel: string
}) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState(knownEmail ?? "")
  const [error, setError] = useState<string | null>(null)
  const [isPending, start] = useTransition()
  const router = useRouter()

  function handleInstall() {
    setError(null)
    const fd = new FormData()
    fd.set("app_id", appId)
    fd.set("email", email)
    start(async () => {
      const r = await installApp(fd)
      if (r && "error" in r && r.error) {
        setError(r.error)
        return
      }
      setOpen(false)
      router.refresh()
    })
  }

  function handleUninstall() {
    const fd = new FormData()
    fd.set("app_id", appId)
    start(async () => {
      await uninstallApp(fd)
      router.refresh()
    })
  }

  if (isInstalled) {
    return (
      <Button variant="outline" disabled={isPending} onClick={handleUninstall}>
        {isPending ? (
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
        ) : (
          <Check className="h-4 w-4 mr-1" />
        )}
        Installed
      </Button>
    )
  }

  if (knownEmail) {
    return (
      <Button disabled={isPending} onClick={handleInstall}>
        {isPending ? (
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
        ) : (
          <Download className="h-4 w-4 mr-1" />
        )}
        Install &middot; {priceLabel}
      </Button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Download className="h-4 w-4 mr-1" />
          Install &middot; {priceLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Install this app</DialogTitle>
          <DialogDescription>
            Enter your email to track installs and access support from the creator.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <Button onClick={handleInstall} disabled={isPending || !email.includes("@")}>
          {isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
          Confirm install
        </Button>
      </DialogContent>
    </Dialog>
  )
}
