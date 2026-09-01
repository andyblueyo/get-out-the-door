import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SignOutButton from '@/components/SignOutButton'

// Temporary checkpoint page (build-order phase 2). Replaced by the checklist
// ticket in phase 7. The visible-row counts exist to verify RLS from a
// browser: a session must only ever see its own rows.
export default async function Home() {
  const supabase = await createClient()

  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (!claims) redirect('/login')

  const [profilesRes, routinesRes] = await Promise.all([
    supabase.from('profiles').select('id, display_name, created_at'),
    supabase.from('routines').select('id', { count: 'exact', head: true }),
  ])

  const profiles = profilesRes.data ?? []
  const ownProfile = profiles.find((p) => p.id === claims.sub)
  const queryError = profilesRes.error?.message ?? routinesRes.error?.message

  return (
    <main className="ticket-page">
      <div className="ticket">
        <header className="ticket-header">
          <h1 className="ticket-title">Threshold</h1>
          <p className="ticket-flourish">before you go</p>
        </header>
        <div className="ticket-body">
          <p className="ticket-section-label">Account check</p>
          {queryError && <p className="form-error">{queryError}</p>}
          <dl style={{ margin: '0 0 18px' }}>
            <div className="check-row">
              <dt>Signed in as</dt>
              <dd>{typeof claims.email === 'string' ? claims.email : claims.sub}</dd>
            </div>
            <div className="check-row">
              <dt>Profile row</dt>
              <dd>{ownProfile ? (ownProfile.display_name ?? '(no name)') : 'MISSING'}</dd>
            </div>
            <div className="check-row">
              <dt>Profiles visible</dt>
              <dd>{profiles.length}</dd>
            </div>
            <div className="check-row">
              <dt>Routines visible</dt>
              <dd>{routinesRes.count ?? 0}</dd>
            </div>
          </dl>
          <SignOutButton />
          <p className="ticket-footer">
            Routines and the day&apos;s ticket arrive in the next build phase.
          </p>
        </div>
      </div>
    </main>
  )
}
