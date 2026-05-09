import { createClient } from '@supabase/supabase-js'

// Server-only admin client — bypasses RLS. Never expose to the browser.
// Only safe to use after the caller has verified the user via supabase.auth.getUser().
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
