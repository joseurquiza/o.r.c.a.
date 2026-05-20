import { createClient } from "@/lib/supabase/server"

/**
 * Returns the current org. For now we have a single seeded "default" org;
 * when we add real auth this will read the org from the session.
 */
export async function getCurrentOrgId(): Promise<string> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", "default")
    .single()

  if (error || !data) {
    // Bootstrap if missing
    const { data: created, error: insertError } = await supabase
      .from("organizations")
      .insert({ name: "My Workspace", slug: "default" })
      .select("id")
      .single()
    if (insertError || !created) {
      throw new Error("Could not resolve organization")
    }
    return created.id
  }

  return data.id
}
