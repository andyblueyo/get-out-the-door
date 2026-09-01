import { createBrowserClient } from '@supabase/ssr'

// createBrowserClient is already a singleton — safe to call per component.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
