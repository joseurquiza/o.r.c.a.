import "server-only"
import { cache } from "react"
import { createClient } from "@/lib/supabase/server"

/**
 * Returns the authenticated user's org_id. Returns null if the user is not
 * signed in or has no membership row.
 *
 * Pages and server actions MUST treat null as "not authorized" and either
 * redirect to /auth/login or throw.
 */
export const getCurrentOrgId = cache(async (): Promise<string | null> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return data.org_id as string
})

export async function requireCurrentOrgId(): Promise<string> {
  const orgId = await getCurrentOrgId()
  if (!orgId) {
    throw new Error("Not authenticated")
  }
  return orgId
}

export const getCurrentUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})

export async function requireCurrentUser() {
  const user = await getCurrentUser()
  if (!user) throw new Error("Not authenticated")
  return user
}

export const getCurrentUserAndOrg = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { user: null, orgId: null as string | null }
  const { data } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle()
  return { user, orgId: (data?.org_id as string | undefined) ?? null }
})
