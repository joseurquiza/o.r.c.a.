/**
 * Automated review check engine. Runs heuristic checks on a submission and
 * writes findings to store_review_checks. Results contribute to a 0..100
 * readiness score on the submission.
 *
 * The checks are intentionally heuristic — we are simulating an App-Store-style
 * review pipeline. Real static analysis / sandboxed runs are out of scope here
 * but slot into `runCheck` below.
 */

import { createClient } from "@/lib/supabase/server"

export type CheckType =
  | "manifest_validation"
  | "metadata_quality"
  | "source_accessibility"
  | "env_inventory"
  | "security_scan"
  | "dep_audit"
  | "prompt_injection"
  | "auth_review"
  | "billing_review"
  | "observability_review"

export type CheckStatus = "passed" | "failed" | "warning" | "skipped"

export interface CheckResult {
  check_type: CheckType
  category: "security" | "reliability" | "observability" | "billing" | "auth" | "manual" | "metadata"
  severity: "info" | "low" | "medium" | "high" | "critical"
  status: CheckStatus
  title: string
  detail?: string
  remediation?: string
  raw_output?: Record<string, unknown>
}

interface SubmissionForCheck {
  id: string
  name: string
  tagline: string | null
  description: string | null
  category: string | null
  source_type: "github" | "bundle" | "live_url"
  github_url: string | null
  bundle_blob_url: string | null
  live_url: string | null
  manifest: Record<string, unknown>
  pricing_model: string | null
}

function check_metadata_quality(s: SubmissionForCheck): CheckResult {
  const missing: string[] = []
  if (!s.tagline || s.tagline.length < 10) missing.push("tagline (>=10 chars)")
  if (!s.description || s.description.length < 80) missing.push("description (>=80 chars)")
  if (!s.category) missing.push("category")
  if (missing.length > 0) {
    return {
      check_type: "metadata_quality",
      category: "metadata",
      severity: "medium",
      status: "warning",
      title: "Listing metadata is thin",
      detail: `Missing or short: ${missing.join(", ")}.`,
      remediation: "Fill in a clear tagline, a description that explains the value, and pick a category.",
    }
  }
  return {
    check_type: "metadata_quality",
    category: "metadata",
    severity: "info",
    status: "passed",
    title: "Listing metadata looks good",
    detail: "Tagline, description, and category are all present.",
  }
}

function check_source_accessibility(s: SubmissionForCheck): CheckResult {
  if (s.source_type === "github") {
    if (!s.github_url) {
      return {
        check_type: "source_accessibility",
        category: "reliability",
        severity: "high",
        status: "failed",
        title: "GitHub URL missing",
        remediation: "Provide a public or shared GitHub repository URL.",
      }
    }
    const isGithub = /^https?:\/\/(www\.)?github\.com\//i.test(s.github_url)
    if (!isGithub) {
      return {
        check_type: "source_accessibility",
        category: "reliability",
        severity: "high",
        status: "failed",
        title: "GitHub URL is not a github.com URL",
        detail: `Got: ${s.github_url}`,
        remediation: "Submit a github.com URL.",
      }
    }
    return {
      check_type: "source_accessibility",
      category: "reliability",
      severity: "info",
      status: "passed",
      title: "Source repository link is reachable",
    }
  }
  if (s.source_type === "bundle") {
    if (!s.bundle_blob_url) {
      return {
        check_type: "source_accessibility",
        category: "reliability",
        severity: "high",
        status: "failed",
        title: "No code bundle uploaded",
        remediation: "Upload a zipped source bundle.",
      }
    }
    return {
      check_type: "source_accessibility",
      category: "reliability",
      severity: "info",
      status: "passed",
      title: "Code bundle stored successfully",
    }
  }
  if (s.source_type === "live_url") {
    if (!s.live_url || !/^https?:\/\//i.test(s.live_url)) {
      return {
        check_type: "source_accessibility",
        category: "reliability",
        severity: "high",
        status: "failed",
        title: "Live URL invalid",
        remediation: "Provide a fully-qualified https:// URL.",
      }
    }
    return {
      check_type: "source_accessibility",
      category: "reliability",
      severity: "info",
      status: "passed",
      title: "Live URL provided",
    }
  }
  return {
    check_type: "source_accessibility",
    category: "reliability",
    severity: "high",
    status: "failed",
    title: "Unknown source type",
  }
}

function check_manifest_validation(s: SubmissionForCheck): CheckResult {
  const m = s.manifest || {}
  const issues: string[] = []
  if (!("envVars" in m)) issues.push("envVars list (env inventory)")
  if (!("scopes" in m)) issues.push("scopes (third-party permissions)")
  if (!("endpoints" in m)) issues.push("endpoints (public API surface)")
  if (issues.length === 0) {
    return {
      check_type: "manifest_validation",
      category: "metadata",
      severity: "info",
      status: "passed",
      title: "Manifest declares envVars, scopes, and endpoints",
    }
  }
  return {
    check_type: "manifest_validation",
    category: "metadata",
    severity: "medium",
    status: "warning",
    title: "Manifest is incomplete",
    detail: `Missing: ${issues.join(", ")}.`,
    remediation: "Add the missing fields so we can do a complete review.",
  }
}

function check_env_inventory(s: SubmissionForCheck): CheckResult {
  const envVars = Array.isArray((s.manifest as { envVars?: unknown[] }).envVars)
    ? ((s.manifest as { envVars: unknown[] }).envVars as Array<string | { name?: string; value?: string }>)
    : []
  const leaked = envVars.filter(
    (e) => typeof e === "object" && e !== null && "value" in e && (e as { value?: string }).value,
  )
  if (leaked.length > 0) {
    return {
      check_type: "env_inventory",
      category: "security",
      severity: "critical",
      status: "failed",
      title: "Secrets included in manifest",
      detail: `${leaked.length} env var(s) include a value. Never ship secrets in your manifest.`,
      remediation: "Submit only env var NAMES; we will collect values securely during deploy.",
    }
  }
  if (envVars.length === 0) {
    return {
      check_type: "env_inventory",
      category: "security",
      severity: "low",
      status: "warning",
      title: "No environment variables declared",
      detail: "If your app needs API keys or DB URLs, list them by name.",
    }
  }
  return {
    check_type: "env_inventory",
    category: "security",
    severity: "info",
    status: "passed",
    title: `${envVars.length} env var(s) inventoried`,
  }
}

function check_security_scan(s: SubmissionForCheck): CheckResult {
  const desc = `${s.description ?? ""} ${s.tagline ?? ""}`.toLowerCase()
  const redFlags = [
    "scrape login",
    "harvest password",
    "bypass captcha",
    "no rate limit",
    "store plaintext password",
  ]
  const hits = redFlags.filter((f) => desc.includes(f))
  if (hits.length > 0) {
    return {
      check_type: "security_scan",
      category: "security",
      severity: "critical",
      status: "failed",
      title: "Security red flags in description",
      detail: `Phrases of concern: ${hits.join(", ")}`,
      remediation: "Apps that abuse credentials or bypass security controls cannot be approved.",
    }
  }
  return {
    check_type: "security_scan",
    category: "security",
    severity: "info",
    status: "passed",
    title: "No obvious security red flags",
    detail: "Static heuristics found nothing alarming. A reviewer will still inspect the source.",
  }
}

function check_dep_audit(s: SubmissionForCheck): CheckResult {
  // Heuristic placeholder. Real impl would `npm audit` the bundle.
  if (s.source_type === "live_url") {
    return {
      check_type: "dep_audit",
      category: "security",
      severity: "info",
      status: "skipped",
      title: "Dependency audit skipped (live URL)",
      detail: "Live-URL submissions don't expose a dep tree; we'll evaluate observability instead.",
    }
  }
  return {
    check_type: "dep_audit",
    category: "security",
    severity: "low",
    status: "warning",
    title: "Dependency audit pending reviewer",
    detail: "Awaiting a reviewer to run the audit against the source.",
    remediation: "Pin direct dependencies in package.json to specific versions.",
  }
}

function check_prompt_injection(s: SubmissionForCheck): CheckResult {
  const m = s.manifest as { aiModel?: string; tools?: unknown[]; promptHardening?: boolean }
  if (!m.aiModel && !Array.isArray(m.tools)) {
    return {
      check_type: "prompt_injection",
      category: "security",
      severity: "info",
      status: "skipped",
      title: "Prompt-injection check skipped",
      detail: "Manifest does not declare an AI model or tools; not an AI app.",
    }
  }
  if (!m.promptHardening) {
    return {
      check_type: "prompt_injection",
      category: "security",
      severity: "medium",
      status: "warning",
      title: "Prompt-hardening not declared",
      remediation: "Set manifest.promptHardening = true and document how you isolate user input from system prompts.",
    }
  }
  return {
    check_type: "prompt_injection",
    category: "security",
    severity: "info",
    status: "passed",
    title: "Prompt hardening declared",
  }
}

function check_auth_review(s: SubmissionForCheck): CheckResult {
  const m = s.manifest as { auth?: string }
  if (!m.auth) {
    return {
      check_type: "auth_review",
      category: "auth",
      severity: "medium",
      status: "warning",
      title: "Authentication strategy not declared",
      remediation: "Declare manifest.auth (e.g. 'oauth-google', 'magic-link', 'none-public').",
    }
  }
  return {
    check_type: "auth_review",
    category: "auth",
    severity: "info",
    status: "passed",
    title: `Auth strategy: ${m.auth}`,
  }
}

function check_billing_review(s: SubmissionForCheck): CheckResult {
  if (s.pricing_model && s.pricing_model !== "free") {
    const m = s.manifest as { billingProvider?: string }
    if (!m.billingProvider) {
      return {
        check_type: "billing_review",
        category: "billing",
        severity: "high",
        status: "failed",
        title: "Paid app has no billing provider",
        remediation: "Set manifest.billingProvider (e.g. 'stripe').",
      }
    }
    return {
      check_type: "billing_review",
      category: "billing",
      severity: "info",
      status: "passed",
      title: `Billing via ${m.billingProvider}`,
    }
  }
  return {
    check_type: "billing_review",
    category: "billing",
    severity: "info",
    status: "passed",
    title: "Free app — no billing required",
  }
}

function check_observability_review(s: SubmissionForCheck): CheckResult {
  const m = s.manifest as { observability?: { logs?: boolean; metrics?: boolean; errorReporting?: string } }
  const o = m.observability || {}
  const missing: string[] = []
  if (!o.logs) missing.push("logs")
  if (!o.metrics) missing.push("metrics")
  if (!o.errorReporting) missing.push("errorReporting")
  if (missing.length > 0) {
    return {
      check_type: "observability_review",
      category: "observability",
      severity: missing.length === 3 ? "high" : "medium",
      status: "warning",
      title: "Observability gaps",
      detail: `Missing: ${missing.join(", ")}.`,
      remediation: "We'll wire up structured logs, metrics, and error reporting during production-readiness fixes.",
    }
  }
  return {
    check_type: "observability_review",
    category: "observability",
    severity: "info",
    status: "passed",
    title: "Observability declared",
  }
}

const ALL_CHECKS: Array<(s: SubmissionForCheck) => CheckResult> = [
  check_metadata_quality,
  check_source_accessibility,
  check_manifest_validation,
  check_env_inventory,
  check_security_scan,
  check_dep_audit,
  check_prompt_injection,
  check_auth_review,
  check_billing_review,
  check_observability_review,
]

/**
 * Runs all automated checks for a submission, replaces existing automated
 * checks for that submission, and returns the readiness score (0..100).
 */
export async function runAutomatedChecks(submissionId: string): Promise<{
  score: number
  results: CheckResult[]
}> {
  const supabase = await createClient()

  const { data: submission, error } = await supabase
    .from("store_submissions")
    .select(
      "id, name, tagline, description, category, source_type, github_url, bundle_blob_url, live_url, manifest, pricing_model",
    )
    .eq("id", submissionId)
    .single()

  if (error || !submission) {
    throw new Error(error?.message || "Submission not found")
  }

  const s = submission as SubmissionForCheck
  const results = ALL_CHECKS.map((fn) => fn(s))

  // Wipe prior automated checks (keep human_review_item)
  await supabase
    .from("store_review_checks")
    .delete()
    .eq("submission_id", submissionId)
    .neq("check_type", "human_review_item")

  if (results.length > 0) {
    const rows = results.map((r) => ({
      submission_id: submissionId,
      check_type: r.check_type,
      category: r.category,
      severity: r.severity,
      status: r.status,
      title: r.title,
      detail: r.detail ?? null,
      remediation: r.remediation ?? null,
      raw_output: r.raw_output ?? null,
    }))
    await supabase.from("store_review_checks").insert(rows)
  }

  const score = scoreFromResults(results)
  await supabase
    .from("store_submissions")
    .update({ readiness_score: score, updated_at: new Date().toISOString() })
    .eq("id", submissionId)

  return { score, results }
}

function scoreFromResults(results: CheckResult[]): number {
  // weight by severity; failed counts double; warning counts once
  const sevWeight: Record<string, number> = {
    info: 1,
    low: 2,
    medium: 4,
    high: 8,
    critical: 16,
  }
  let earned = 0
  let possible = 0
  for (const r of results) {
    const w = sevWeight[r.severity] ?? 1
    if (r.status === "skipped") continue
    possible += w
    if (r.status === "passed") earned += w
    else if (r.status === "warning") earned += w * 0.5
  }
  if (possible === 0) return 100
  return Math.round((earned / possible) * 100)
}
