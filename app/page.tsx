import { createClient } from '@/lib/supabase/server'
import ChecklistScreen from '@/components/checklist/ChecklistScreen'
import Landing from '@/components/landing/Landing'

export default async function Home() {
  const supabase = await createClient()

  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  // Signed out: the landing page. Signed in (the NFC tag's usual case): today's check.
  if (!claims) return <Landing />
  const userId = claims.sub as string

  const [profileRes, routineRes, stateRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('routines').select('*').eq('is_active', true).maybeSingle(),
    supabase.from('daily_state').select('*').eq('user_id', userId).maybeSingle(),
  ])

  return (
    <ChecklistScreen
      userId={userId}
      profile={profileRes.data ?? null}
      routine={routineRes.data ?? null}
      initialState={stateRes.data ?? null}
    />
  )
}
