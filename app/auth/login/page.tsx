"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Bot } from "lucide-react"
import { useState, useTransition } from "react"
import { signInWithPassword, signUpWithPassword } from "@/lib/actions/auth"
import Link from "next/link"

export default function Login() {
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<"signin" | "signup">("signin")
  const [pending, startTransition] = useTransition()

  function onSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const action = mode === "signin" ? signInWithPassword : signUpWithPassword
      const res = await action(formData)
      if (res?.error) setError(res.error)
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Bot className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">{mode === "signin" ? "Welcome back" : "Create your workspace"}</CardTitle>
          <CardDescription>
            {mode === "signin"
              ? "Sign in to your Orca workspace"
              : "Each new account gets its own private workspace"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form action={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Working..." : mode === "signin" ? "Sign in" : "Create account"}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              {mode === "signin" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button type="button" className="underline" onClick={() => setMode("signup")}>
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button type="button" className="underline" onClick={() => setMode("signin")}>
                    Sign in
                  </button>
                </>
              )}
            </div>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            <Link href="/store" className="underline">
              Browse the store
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
