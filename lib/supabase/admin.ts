import "server-only"
import { createClient } from "@supabase/supabase-js"

/**
 * Service-role Supabase client. Use ONLY in server code that has already
 * authenticated the caller and verified ownership of the data being accessed
 * (e.g. signed agent secret, verified user + org membership). Never expose to
 * unauthenticated requests.
 */
export function createAdminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
  if (!url || !key) {
    throw new Error("Supabase admin client requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
