"use server"

import { cache } from "react"
import { createClient } from "@/lib/supabase/server"

/**
 * Authenticated identity for store creator + installer + reviewer flows.
 * Replaces the previous self-asserted cookie-based identity.
 *
 * IMPORTANT: every helper here derives identity from the verified Supabase
 * session. Caller-provided emails are NEVER trusted.
 */

async function readAuthEmail(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.email ?? null
}

export const getCurrentAuthEmail = cache(async () => readAuthEmail())

// Backwards-compatible names used throughout the codebase. Both creator and
// installer identity now derive from the authenticated user.
export async function getCreatorEmail(): Promise<string | null> {
  return readAuthEmail()
}

export async function getInstallerEmail(): Promise<string | null> {
  return readAuthEmail()
}

/**
 * No-ops kept so existing callers don't break their imports.
 * Identity is now established by signing in via Supabase Auth.
 */
export async function setCreatorEmail(_email: string): Promise<void> {
  // intentionally a no-op; sign in via /auth/login
}
export async function clearCreatorEmail(): Promise<void> {
  // intentionally a no-op; sign out via /auth/logout
}
export async function setInstallerEmail(_email: string): Promise<void> {
  // intentionally a no-op
}

/**
 * Reviewer check. Requires the authenticated user to be in
 * public.platform_reviewers or in the bootstrap REVIEWER_EMAILS env var.
 *
 * The optional `email` argument is kept for backwards compatibility but is
 * now used only as an extra constraint: it must match the *authenticated*
 * email. Callers can no longer pass an arbitrary email and become a reviewer.
 */
export async function isReviewer(email?: string | null): Promise<boolean> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !user.email) return false

  if (email && email.trim().toLowerCase() !== user.email.toLowerCase()) {
    return false
  }

  const target = user.email.toLowerCase()

  // Allowlist via env var (bootstrap)
  const envList = (process.env.REVIEWER_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  if (envList.includes(target)) return true

  // Allowlist via DB
  const { data } = await supabase
    .from("platform_reviewers")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle()
  return !!data
}
