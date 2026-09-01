import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import RoutinesLedger from '@/components/routines/RoutinesLedger'
import LocationCard from '@/components/routines/LocationCard'
import SignOutButton from '@/components/SignOutButton'
import './routines.css'

export default async function RoutinesPage() {
  const supabase = await createClient()

  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (!claims) redirect('/login')
  const userId = claims.sub as string

  const [routinesRes, profileRes] = await Promise.all([
    supabase
      .from('routines')
      .select('id, name, is_active, updated_at, graph')
      .order('created_at', { ascending: true }),
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
  ])

  const routines = (routinesRes.data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    is_active: r.is_active,
    updated_at: r.updated_at,
    stepCount: r.graph?.nodes?.length ?? 0,
  }))

  return (
    <main className="routines-page">
      <nav className="page-chrome">
        <Link href="/">&larr; today&rsquo;s ticket</Link>
      </nav>

      <RoutinesLedger userId={userId} routines={routines} />

      {profileRes.data && <LocationCard profile={profileRes.data} />}

      <div className="page-chrome page-chrome-bottom">
        <SignOutButton />
      </div>
    </main>
  )
}
