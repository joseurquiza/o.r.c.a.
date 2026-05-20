"use server"

import { cookies } from "next/headers"

const CREATOR_COOKIE = "orca_creator_email"
const INSTALLER_COOKIE = "orca_installer_email"

export async function getCreatorEmail(): Promise<string | null> {
  const c = await cookies()
  return c.get(CREATOR_COOKIE)?.value ?? null
}

export async function setCreatorEmail(email: string) {
  const c = await cookies()
  c.set(CREATOR_COOKIE, email, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  })
}

export async function clearCreatorEmail() {
  const c = await cookies()
  c.delete(CREATOR_COOKIE)
}

export async function getInstallerEmail(): Promise<string | null> {
  const c = await cookies()
  return c.get(INSTALLER_COOKIE)?.value ?? null
}

export async function setInstallerEmail(email: string) {
  const c = await cookies()
  c.set(INSTALLER_COOKIE, email, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  })
}

/**
 * Reviewer access. Anyone signed in as a creator on the configured reviewer
 * email is treated as a reviewer. Comma-separated list in REVIEWER_EMAILS.
 * If unset, the first creator becomes the reviewer (single-user dev mode).
 */
export async function isReviewer(email: string | null): Promise<boolean> {
  if (!email) return false
  const list = process.env.REVIEWER_EMAILS
  if (!list) return true // dev mode: any logged-in creator can review
  return list.split(",").map((s) => s.trim().toLowerCase()).includes(email.toLowerCase())
}
