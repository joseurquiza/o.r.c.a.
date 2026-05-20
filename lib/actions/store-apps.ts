"use server"

import { createClient } from "@/lib/supabase/server"
import { getInstallerEmail, setInstallerEmail } from "@/lib/store/identity"
import { revalidatePath } from "next/cache"

export interface StoreApp {
  id: string
  creator_id: string
  slug: string
  name: string
  tagline: string | null
  description: string | null
  category: string | null
  icon_url: string | null
  current_version_id: string | null
  status: "live" | "paused" | "unlisted" | "removed"
  install_count: number
  rating_avg: number | null
  rating_count: number
  pricing_model: string | null
  price_usd: number | null
  featured: boolean
  published_at: string
  updated_at: string
  creator?: { display_name: string | null; email: string } | null
}

export interface AppVersion {
  id: string
  app_id: string
  version_label: string
  changelog: string | null
  manifest: Record<string, unknown>
  published_at: string
}

export interface Deployment {
  id: string
  app_id: string
  deployment_type: "managed" | "concierge" | "external"
  provider: string | null
  deployed_url: string | null
  health_status: "healthy" | "degraded" | "down" | "unknown"
}

export async function listStoreApps(opts?: {
  category?: string
  search?: string
}): Promise<StoreApp[]> {
  const supabase = await createClient()
  let query = supabase
    .from("store_apps")
    .select("*, creator:store_creators(display_name, email)")
    .eq("status", "live")
    .order("featured", { ascending: false })
    .order("install_count", { ascending: false })
    .limit(60)
  if (opts?.category && opts.category !== "all") {
    query = query.eq("category", opts.category)
  }
  if (opts?.search) {
    query = query.ilike("name", `%${opts.search}%`)
  }
  const { data } = await query
  return (data ?? []) as StoreApp[]
}

export async function getStoreAppBySlug(slug: string): Promise<{
  app: StoreApp
  version: AppVersion | null
  deployment: Deployment | null
} | null> {
  const supabase = await createClient()
  const { data: app } = await supabase
    .from("store_apps")
    .select("*, creator:store_creators(display_name, email, bio, website)")
    .eq("slug", slug)
    .maybeSingle()
  if (!app) return null
  const a = app as StoreApp
  let version: AppVersion | null = null
  if (a.current_version_id) {
    const { data: v } = await supabase
      .from("store_app_versions")
      .select("*")
      .eq("id", a.current_version_id)
      .maybeSingle()
    version = (v as AppVersion | null) ?? null
  }
  const { data: dep } = await supabase
    .from("store_deployments")
    .select("*")
    .eq("app_id", a.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  return {
    app: a,
    version,
    deployment: (dep as Deployment | null) ?? null,
  }
}

export async function installApp(formData: FormData) {
  const appId = String(formData.get("app_id") ?? "")
  const emailRaw = String(formData.get("email") ?? "").trim().toLowerCase()
  const installer = (await getInstallerEmail()) || emailRaw
  if (!installer || !installer.includes("@")) {
    return { error: "Enter your email to install." }
  }
  if (!appId) return { error: "Missing app" }

  const supabase = await createClient()
  const { data: app } = await supabase
    .from("store_apps")
    .select("id, current_version_id, status, install_count")
    .eq("id", appId)
    .maybeSingle()
  if (!app || (app as { status: string }).status !== "live") {
    return { error: "App is not available" }
  }

  if (emailRaw && emailRaw !== (await getInstallerEmail())) {
    await setInstallerEmail(emailRaw)
  }

  const { data: existing } = await supabase
    .from("store_app_installs")
    .select("id, status")
    .eq("app_id", appId)
    .eq("user_email", installer)
    .maybeSingle()

  if (existing) {
    if ((existing as { status: string }).status !== "active") {
      await supabase
        .from("store_app_installs")
        .update({ status: "active", uninstalled_at: null })
        .eq("id", (existing as { id: string }).id)
    }
  } else {
    await supabase.from("store_app_installs").insert({
      app_id: appId,
      app_version_id: (app as { current_version_id: string | null }).current_version_id,
      user_email: installer,
      status: "active",
    })
    await supabase
      .from("store_apps")
      .update({
        install_count: ((app as { install_count: number }).install_count ?? 0) + 1,
      })
      .eq("id", appId)
  }

  revalidatePath("/store")
  revalidatePath("/store/installed")
  return { success: true }
}

export async function uninstallApp(formData: FormData) {
  const appId = String(formData.get("app_id") ?? "")
  const email = await getInstallerEmail()
  if (!email || !appId) return { error: "Missing email or app" }
  const supabase = await createClient()
  await supabase
    .from("store_app_installs")
    .update({ status: "uninstalled", uninstalled_at: new Date().toISOString() })
    .eq("app_id", appId)
    .eq("user_email", email)
  revalidatePath("/store")
  revalidatePath("/store/installed")
  return { success: true }
}

export async function getMyInstalls(): Promise<Array<StoreApp & { install_status: string }>> {
  const email = await getInstallerEmail()
  if (!email) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from("store_app_installs")
    .select("status, app:store_apps(*, creator:store_creators(display_name, email))")
    .eq("user_email", email)
    .eq("status", "active")
    .order("installed_at", { ascending: false })
  return ((data ?? []) as Array<{ status: string; app: StoreApp }>)
    .filter((r) => r.app)
    .map((r) => ({ ...r.app, install_status: r.status }))
}
