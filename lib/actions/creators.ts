"use server"

import { createClient } from "@/lib/supabase/server"
import { getCreatorEmail } from "@/lib/store/identity"
import { revalidatePath } from "next/cache"

export interface Creator {
  id: string
  email: string
  display_name: string | null
  bio: string | null
  website: string | null
  github_handle: string | null
  avatar_url: string | null
  payout_status: string
  created_at: string
}

/**
 * Look up (or create) the store_creators row for the *currently authenticated*
 * user. We never trust a caller-supplied email — that previously let anyone
 * impersonate any creator by setting a cookie.
 */
async function getOrCreateCreatorForCurrentUser(): Promise<Creator | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !user.email) return null

  const email = user.email.toLowerCase()
  const displayName =
    (user.user_metadata as { display_name?: string; full_name?: string } | null)?.display_name ??
    (user.user_metadata as { full_name?: string } | null)?.full_name ??
    email.split("@")[0]

  const { data: existing } = await supabase
    .from("store_creators")
    .select("*")
    .eq("email", email)
    .maybeSingle()
  if (existing) return existing as Creator

  const { data: created, error } = await supabase
    .from("store_creators")
    .insert({ email, display_name: displayName })
    .select("*")
    .single()
  if (error || !created) return null
  return created as Creator
}

export async function getCurrentCreator(): Promise<Creator | null> {
  // Backed by Supabase Auth: presence of a session is what makes you a creator,
  // not a self-asserted cookie. We auto-provision a store_creators row on
  // first access so existing callers don't need to change.
  const email = await getCreatorEmail()
  if (!email) return null
  return getOrCreateCreatorForCurrentUser()
}

export async function signInAsCreator(_formData: FormData) {
  // Sign-in is now handled by /auth/login (Supabase Auth). This server action
  // is kept only so existing client forms don't 404; it just upserts the
  // store_creators row for the already-authenticated user.
  const creator = await getOrCreateCreatorForCurrentUser()
  if (!creator) return { error: "Sign in via /auth/login first." }
  revalidatePath("/creators")
  return { success: true }
}

export async function signOutCreator() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath("/creators")
  return { success: true }
}

export async function updateCreatorProfile(formData: FormData) {
  const creator = await getCurrentCreator()
  if (!creator) return { error: "Not signed in" }
  const supabase = await createClient()
  const updates = {
    display_name: String(formData.get("display_name") ?? "") || null,
    bio: String(formData.get("bio") ?? "") || null,
    website: String(formData.get("website") ?? "") || null,
    github_handle: String(formData.get("github_handle") ?? "") || null,
  }
  const { error } = await supabase.from("store_creators").update(updates).eq("id", creator.id)
  if (error) return { error: error.message }
  revalidatePath("/creators")
  return { success: true }
}
