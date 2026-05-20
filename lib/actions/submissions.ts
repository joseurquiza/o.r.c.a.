"use server"

import { createClient } from "@/lib/supabase/server"
import { getCurrentCreator } from "@/lib/actions/creators"
import { getCreatorEmail, isReviewer } from "@/lib/store/identity"
import { runAutomatedChecks } from "@/lib/store/checks"
import { revalidatePath } from "next/cache"
import { put } from "@vercel/blob"

export interface Submission {
  id: string
  creator_id: string
  app_id: string | null
  name: string
  tagline: string | null
  description: string | null
  category: string | null
  icon_url: string | null
  source_type: "github" | "bundle" | "live_url"
  github_url: string | null
  github_branch: string | null
  bundle_blob_url: string | null
  bundle_filename: string | null
  live_url: string | null
  manifest: Record<string, unknown>
  status:
    | "draft"
    | "submitted"
    | "in_review"
    | "changes_requested"
    | "approved"
    | "rejected"
    | "withdrawn"
  reviewer_email: string | null
  review_notes: string | null
  internal_notes: string | null
  readiness_score: number | null
  pricing_model: "free" | "paid_install" | "subscription" | "usage_based" | null
  price_usd: number | null
  submitted_at: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export interface ReviewCheck {
  id: string
  submission_id: string
  check_type: string
  category: string
  severity: "info" | "low" | "medium" | "high" | "critical"
  status: "pending" | "running" | "passed" | "failed" | "warning" | "skipped"
  title: string
  detail: string | null
  remediation: string | null
  fixed_by_us: boolean
  raw_output: Record<string, unknown> | null
  created_at: string
}

export async function getMySubmissions(): Promise<Submission[]> {
  const creator = await getCurrentCreator()
  if (!creator) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from("store_submissions")
    .select("*")
    .eq("creator_id", creator.id)
    .order("updated_at", { ascending: false })
  return (data ?? []) as Submission[]
}

export async function getSubmissionForCreator(id: string): Promise<{
  submission: Submission
  checks: ReviewCheck[]
} | null> {
  const creator = await getCurrentCreator()
  if (!creator) return null
  const supabase = await createClient()
  const { data: submission } = await supabase
    .from("store_submissions")
    .select("*")
    .eq("id", id)
    .eq("creator_id", creator.id)
    .maybeSingle()
  if (!submission) return null
  const { data: checks } = await supabase
    .from("store_review_checks")
    .select("*")
    .eq("submission_id", id)
    .order("created_at", { ascending: true })
  return {
    submission: submission as Submission,
    checks: (checks ?? []) as ReviewCheck[],
  }
}

interface CreateSubmissionInput {
  name: string
  tagline?: string
  description?: string
  category?: string
  source_type: "github" | "bundle" | "live_url"
  github_url?: string
  github_branch?: string
  live_url?: string
  manifest_json?: string
  pricing_model?: "free" | "paid_install" | "subscription" | "usage_based"
  price_usd?: number | null
  icon_url?: string
}

export async function createSubmission(formData: FormData) {
  const creator = await getCurrentCreator()
  if (!creator) return { error: "Sign in as a creator first." }

  const input: CreateSubmissionInput = {
    name: String(formData.get("name") ?? "").trim(),
    tagline: String(formData.get("tagline") ?? "").trim() || undefined,
    description: String(formData.get("description") ?? "").trim() || undefined,
    category: String(formData.get("category") ?? "").trim() || undefined,
    source_type: (String(formData.get("source_type") ?? "github") as
      | "github"
      | "bundle"
      | "live_url"),
    github_url: String(formData.get("github_url") ?? "").trim() || undefined,
    github_branch: String(formData.get("github_branch") ?? "").trim() || undefined,
    live_url: String(formData.get("live_url") ?? "").trim() || undefined,
    manifest_json: String(formData.get("manifest_json") ?? "").trim() || undefined,
    pricing_model: (String(formData.get("pricing_model") ?? "free") as
      | "free"
      | "paid_install"
      | "subscription"
      | "usage_based"),
    price_usd: formData.get("price_usd")
      ? Number(formData.get("price_usd"))
      : null,
    icon_url: String(formData.get("icon_url") ?? "").trim() || undefined,
  }

  if (!input.name) return { error: "Name is required" }

  let manifest: Record<string, unknown> = {}
  if (input.manifest_json) {
    try {
      manifest = JSON.parse(input.manifest_json)
    } catch {
      return { error: "Manifest must be valid JSON" }
    }
  }

  // Optional bundle upload
  let bundle_blob_url: string | undefined
  let bundle_filename: string | undefined
  const bundle = formData.get("bundle") as File | null
  if (bundle && bundle.size > 0 && input.source_type === "bundle") {
    const blob = await put(`store/submissions/${creator.id}/${Date.now()}-${bundle.name}`, bundle, {
      access: "public",
      addRandomSuffix: false,
    })
    bundle_blob_url = blob.url
    bundle_filename = bundle.name
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("store_submissions")
    .insert({
      creator_id: creator.id,
      name: input.name,
      tagline: input.tagline ?? null,
      description: input.description ?? null,
      category: input.category ?? null,
      icon_url: input.icon_url ?? null,
      source_type: input.source_type,
      github_url: input.github_url ?? null,
      github_branch: input.github_branch ?? null,
      bundle_blob_url: bundle_blob_url ?? null,
      bundle_filename: bundle_filename ?? null,
      live_url: input.live_url ?? null,
      manifest,
      pricing_model: input.pricing_model ?? "free",
      price_usd: input.price_usd,
      status: "draft",
    })
    .select("id")
    .single()

  if (error || !data) return { error: error?.message || "Could not create submission" }

  revalidatePath("/creators")
  return { success: true, id: data.id }
}

export async function submitSubmissionForReview(submissionId: string) {
  const creator = await getCurrentCreator()
  if (!creator) return { error: "Sign in first" }
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from("store_submissions")
    .select("id, status, creator_id")
    .eq("id", submissionId)
    .single()

  if (!existing || existing.creator_id !== creator.id) return { error: "Not your submission" }
  if (!["draft", "changes_requested"].includes(existing.status)) {
    return { error: `Cannot submit from status ${existing.status}` }
  }

  // Run automated checks
  await runAutomatedChecks(submissionId)

  await supabase
    .from("store_submissions")
    .update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", submissionId)

  revalidatePath("/creators")
  revalidatePath(`/creators/submissions/${submissionId}`)
  revalidatePath("/review")
  return { success: true }
}

export async function withdrawSubmission(submissionId: string) {
  const creator = await getCurrentCreator()
  if (!creator) return { error: "Sign in first" }
  const supabase = await createClient()
  await supabase
    .from("store_submissions")
    .update({ status: "withdrawn", updated_at: new Date().toISOString() })
    .eq("id", submissionId)
    .eq("creator_id", creator.id)
  revalidatePath("/creators")
  revalidatePath(`/creators/submissions/${submissionId}`)
  return { success: true }
}

// ==================== REVIEWER ACTIONS ====================

export async function getReviewQueue(): Promise<Submission[]> {
  const email = await getCreatorEmail()
  if (!(await isReviewer(email))) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from("store_submissions")
    .select("*")
    .in("status", ["submitted", "in_review", "changes_requested"])
    .order("submitted_at", { ascending: true })
  return (data ?? []) as Submission[]
}

export async function getSubmissionForReviewer(id: string): Promise<{
  submission: Submission
  checks: ReviewCheck[]
  creator: { email: string; display_name: string | null } | null
} | null> {
  const email = await getCreatorEmail()
  if (!(await isReviewer(email))) return null
  const supabase = await createClient()
  const { data: submission } = await supabase
    .from("store_submissions")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (!submission) return null
  const { data: checks } = await supabase
    .from("store_review_checks")
    .select("*")
    .eq("submission_id", id)
    .order("created_at", { ascending: true })
  const { data: creator } = await supabase
    .from("store_creators")
    .select("email, display_name")
    .eq("id", (submission as Submission).creator_id)
    .maybeSingle()
  return {
    submission: submission as Submission,
    checks: (checks ?? []) as ReviewCheck[],
    creator: creator as { email: string; display_name: string | null } | null,
  }
}

export async function claimForReview(submissionId: string) {
  const email = await getCreatorEmail()
  if (!(await isReviewer(email))) return { error: "Not authorized" }
  const supabase = await createClient()
  await supabase
    .from("store_submissions")
    .update({
      status: "in_review",
      reviewer_email: email,
      updated_at: new Date().toISOString(),
    })
    .eq("id", submissionId)
  revalidatePath("/review")
  revalidatePath(`/review/${submissionId}`)
  return { success: true }
}

export async function rerunChecks(submissionId: string) {
  const email = await getCreatorEmail()
  if (!(await isReviewer(email))) return { error: "Not authorized" }
  await runAutomatedChecks(submissionId)
  revalidatePath(`/review/${submissionId}`)
  return { success: true }
}

export async function addReviewerNote(formData: FormData) {
  const email = await getCreatorEmail()
  if (!(await isReviewer(email))) return { error: "Not authorized" }
  const submissionId = String(formData.get("submission_id") ?? "")
  const internal_notes = String(formData.get("internal_notes") ?? "")
  if (!submissionId) return { error: "Missing submission" }
  const supabase = await createClient()
  await supabase
    .from("store_submissions")
    .update({ internal_notes, updated_at: new Date().toISOString() })
    .eq("id", submissionId)
  revalidatePath(`/review/${submissionId}`)
  return { success: true }
}

export async function addManualFinding(formData: FormData) {
  const email = await getCreatorEmail()
  if (!(await isReviewer(email))) return { error: "Not authorized" }
  const submissionId = String(formData.get("submission_id") ?? "")
  const title = String(formData.get("title") ?? "").trim()
  const detail = String(formData.get("detail") ?? "").trim()
  const remediation = String(formData.get("remediation") ?? "").trim()
  const category = String(formData.get("category") ?? "manual")
  const severity = String(formData.get("severity") ?? "medium")
  const status = String(formData.get("status") ?? "warning")
  if (!submissionId || !title) return { error: "Missing fields" }
  const supabase = await createClient()
  await supabase.from("store_review_checks").insert({
    submission_id: submissionId,
    check_type: "human_review_item",
    category,
    severity,
    status,
    title,
    detail: detail || null,
    remediation: remediation || null,
  })
  revalidatePath(`/review/${submissionId}`)
  return { success: true }
}

export async function requestChanges(formData: FormData) {
  const email = await getCreatorEmail()
  if (!(await isReviewer(email))) return { error: "Not authorized" }
  const submissionId = String(formData.get("submission_id") ?? "")
  const review_notes = String(formData.get("review_notes") ?? "").trim()
  if (!submissionId || !review_notes) return { error: "Notes required" }
  const supabase = await createClient()
  await supabase
    .from("store_submissions")
    .update({
      status: "changes_requested",
      review_notes,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", submissionId)
  revalidatePath(`/review/${submissionId}`)
  revalidatePath("/review")
  return { success: true }
}

export async function rejectSubmission(formData: FormData) {
  const email = await getCreatorEmail()
  if (!(await isReviewer(email))) return { error: "Not authorized" }
  const submissionId = String(formData.get("submission_id") ?? "")
  const review_notes = String(formData.get("review_notes") ?? "").trim()
  if (!submissionId) return { error: "Missing submission" }
  const supabase = await createClient()
  await supabase
    .from("store_submissions")
    .update({
      status: "rejected",
      review_notes,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", submissionId)
  revalidatePath(`/review/${submissionId}`)
  revalidatePath("/review")
  return { success: true }
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "app"
}

async function uniqueSlug(supabase: Awaited<ReturnType<typeof createClient>>, base: string): Promise<string> {
  let slug = base
  let i = 1
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data } = await supabase.from("store_apps").select("id").eq("slug", slug).maybeSingle()
    if (!data) return slug
    i += 1
    slug = `${base}-${i}`
  }
}

/**
 * Approve a submission. If submission has no app_id, create a new app + version.
 * Otherwise, push a new version to the existing app.
 */
export async function approveSubmission(formData: FormData) {
  const email = await getCreatorEmail()
  if (!(await isReviewer(email))) return { error: "Not authorized" }
  const submissionId = String(formData.get("submission_id") ?? "")
  const review_notes = String(formData.get("review_notes") ?? "").trim()
  const deployment_type =
    (String(formData.get("deployment_type") ?? "external") as
      | "managed"
      | "concierge"
      | "external")
  if (!submissionId) return { error: "Missing submission" }

  const supabase = await createClient()
  const { data: sub } = await supabase
    .from("store_submissions")
    .select("*")
    .eq("id", submissionId)
    .single()
  if (!sub) return { error: "Submission not found" }
  const submission = sub as Submission

  let appId = submission.app_id
  let versionLabel = "1.0.0"

  if (!appId) {
    const baseSlug = slugify(submission.name)
    const slug = await uniqueSlug(supabase, baseSlug)
    const { data: newApp, error: appErr } = await supabase
      .from("store_apps")
      .insert({
        creator_id: submission.creator_id,
        slug,
        name: submission.name,
        tagline: submission.tagline,
        description: submission.description,
        category: submission.category,
        icon_url: submission.icon_url,
        pricing_model: submission.pricing_model ?? "free",
        price_usd: submission.price_usd,
        status: "live",
      })
      .select("id")
      .single()
    if (appErr || !newApp) return { error: appErr?.message || "Could not create app" }
    appId = newApp.id
  } else {
    const { data: latest } = await supabase
      .from("store_app_versions")
      .select("version_label")
      .eq("app_id", appId)
      .order("published_at", { ascending: false })
      .limit(1)
    if (latest && latest[0]) {
      const parts = String(latest[0].version_label).split(".")
      const minor = Number(parts[1] ?? 0) + 1
      versionLabel = `${parts[0] ?? 1}.${minor}.0`
    }
  }

  const { data: version, error: vErr } = await supabase
    .from("store_app_versions")
    .insert({
      app_id: appId,
      submission_id: submission.id,
      version_label: versionLabel,
      manifest: submission.manifest,
      changelog: review_notes || `Approved submission ${submission.id}`,
    })
    .select("id")
    .single()
  if (vErr || !version) return { error: vErr?.message || "Could not create version" }

  await supabase
    .from("store_apps")
    .update({ current_version_id: version.id, updated_at: new Date().toISOString() })
    .eq("id", appId)

  await supabase.from("store_deployments").insert({
    app_id: appId,
    app_version_id: version.id,
    deployment_type,
    health_status: "unknown",
  })

  await supabase
    .from("store_submissions")
    .update({
      status: "approved",
      app_id: appId,
      review_notes,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", submission.id)

  revalidatePath("/review")
  revalidatePath(`/review/${submission.id}`)
  revalidatePath("/store")
  revalidatePath("/creators")
  return { success: true, appId }
}
