'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

export default function SubwayCard({ profile }: { profile: Profile }) {
  const router = useRouter()
  const supabase = createClient()
  const [enabled, setEnabled] = useState(profile.subway_enabled)
  const [showWalk, setShowWalk] = useState(profile.subway_show_walk)
  const [showLeaveBy, setShowLeaveBy] = useState(profile.subway_show_leave_by)
  const [error, setError] = useState<string | null>(null)

  async function save(patch: Partial<Pick<Profile, 'subway_enabled' | 'subway_show_walk' | 'subway_show_leave_by'>>) {
    setError(null)
    const { error } = await supabase
      .from('profiles')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', profile.id)
    if (error) setError(error.message)
    router.refresh()
  }

  const routeList = (profile.subway_lines ?? []).map((l) => l.route)
  const uniqueRoutes = [...new Set(routeList)]

  return (
    <section className="loc-card">
      <h2 className="loc-title">Subway</h2>
      <p className="loc-sub">Printed on your ticket each morning, based on the stop you pick.</p>

      <div className="subway-switch-row">
        <span className="subway-switch-label">Show subway times</span>
        <div className="subway-switch">
          <button
            className={enabled ? 'selected' : ''}
            onClick={() => {
              setEnabled(true)
              void save({ subway_enabled: true })
            }}
          >
            On
          </button>
          <button
            className={!enabled ? 'selected' : ''}
            onClick={() => {
              setEnabled(false)
              void save({ subway_enabled: false })
            }}
          >
            Off
          </button>
        </div>
      </div>

      <div className={`subway-subrows${enabled ? '' : ' disabled'}`}>
        <div className="subway-switch-row subway-sub">
          <div>
            <div className="subway-sub-label">Walk time</div>
            <div className="subway-sub-desc">Minutes from here to the stop.</div>
          </div>
          <div className="subway-switch small">
            <button
              disabled={!enabled}
              className={showWalk ? 'selected' : ''}
              onClick={() => {
                setShowWalk(true)
                void save({ subway_show_walk: true })
              }}
            >
              On
            </button>
            <button
              disabled={!enabled}
              className={!showWalk ? 'selected' : ''}
              onClick={() => {
                setShowWalk(false)
                void save({ subway_show_walk: false })
              }}
            >
              Off
            </button>
          </div>
        </div>

        <div className="subway-switch-row subway-sub">
          <div>
            <div className="subway-sub-label">Leave-by time</div>
            <div className="subway-sub-desc">Latest time to leave and still catch it.</div>
          </div>
          <div className="subway-switch small">
            <button
              disabled={!enabled}
              className={showLeaveBy ? 'selected' : ''}
              onClick={() => {
                setShowLeaveBy(true)
                void save({ subway_show_leave_by: true })
              }}
            >
              On
            </button>
            <button
              disabled={!enabled}
              className={!showLeaveBy ? 'selected' : ''}
              onClick={() => {
                setShowLeaveBy(false)
                void save({ subway_show_leave_by: false })
              }}
            >
              Off
            </button>
          </div>
        </div>
      </div>

      <Link href="/routines/subway" className="loc-btn" style={{ display: 'block', textAlign: 'center' }}>
        Choose stop &amp; trains
      </Link>

      {error && <p className="loc-status" style={{ color: 'var(--ink)', fontWeight: 700 }}>{error}</p>}
      {!error && (
        <p className="loc-status">
          {profile.subway_stop_name
            ? `Currently: ${profile.subway_stop_name}${uniqueRoutes.length ? ` · ${uniqueRoutes.join(', ')}` : ''}`
            : 'No stop chosen yet.'}
        </p>
      )}
    </section>
  )
}
