"use server"

import { createClient } from "@/lib/supabase/server"
import { getCreatorEmail, setCreatorEmail, clearCreatorEmail } from "@/lib/store/identity"
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

export async function getOrCreateCreatorByEmail(email: string, displayName?: string): Promise<Creator> {
  const supabase = await createClient()
  const normalized = email.trim().toLowerCase()

  const { data: existing } = await supabase
    .from("store_creators")
    .select("*")
    .eq("email", normalized)
    .maybeSingle()

  if (existing) return existing as Creator

  const { data: created, error } = await supabase
    .from("store_creators")
    .insert({ email: normalized, display_name: displayName ?? normalized.split("@")[0] })
    .select("*")
    .single()

  if (error || !created) throw new Error(error?.message || "Could not create creator")
  return created as Creator
}

export async function getCurrentCreator(): Promise<Creator | null> {
  const email = await getCreatorEmail()
  if (!email) return null
  const supabase = await createClient()
  const { data } = await supabase
    .from("store_creators")
    .select("*")
    .eq("email", email.toLowerCase())
    .maybeSingle()
  return (data as Creator | null) ?? null
}

export async function signInAsCreator(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const displayName = String(formData.get("displayName") ?? "").trim() || undefined
  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email" }
  }
  await getOrCreateCreatorByEmail(email, displayName)
  await setCreatorEmail(email)
  revalidatePath("/creators")
  return { success: true }
}

export async function signOutCreator() {
  await clearCreatorEmail()
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
