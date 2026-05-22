"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  if (!email || !password) {
    return { error: "Email and password are required." }
  }
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: error.message }
  revalidatePath("/", "layout")
  redirect("/")
}

export async function signUpWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  if (!email || !password) {
    return { error: "Email and password are required." }
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." }
  }
  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: process.env.NEXT_PUBLIC_URL
        ? `${process.env.NEXT_PUBLIC_URL}/auth/callback`
        : undefined,
    },
  })
  if (error) return { error: error.message }
  revalidatePath("/", "layout")
  redirect("/")
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/auth/login")
}
