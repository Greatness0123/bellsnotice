let supabaseClient: ReturnType<typeof createBrowserClient> | null = null

import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  if (!supabaseClient) {
    supabaseClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
  }
  return supabaseClient
}
