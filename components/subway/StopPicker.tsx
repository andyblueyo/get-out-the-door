'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { findStation, nearestStations, searchStations } from '@/lib/subway/stations'
import type { GtfsDirection, TrackedLine } from '@/lib/subway/types'
import type { Database } from '@/lib/database.types'
import '@/app/routines/routines.css'
import './picker.css'

type Profile = Database['public']['Tables']['profiles']['Row']
type Mode = 'auto' | 'manual'

function sameLine(a: TrackedLine, route: string, stopId: string) {
  return a.route === route && a.stopId === stopId
}

export default function StopPicker({ profile }: { profile: Profile }) {
  const router = useRouter()
  const supabase = createClient()

  const hasCoords = profile.latitude != null && profile.longitude != null
  const [mode, setMode] = useState<Mode>(hasCoords ? 'auto' : 'manual')
  const [query, setQuery] = useState('')
  const [selectedStationId, setSelectedStationId] = useState<string | null>(
    profile.subway_stop_id
  )
  const [trackedLines, setTrackedLines] = useState<TrackedLine[]>(profile.subway_lines ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nearby = useMemo(
    () => (hasCoords ? nearestStations(profile.latitude!, profile.longitude!, 5) : []),
    [hasCoords, profile.latitude, profile.longitude]
  )
  const results = useMemo(() => searchStations(query), [query])
  const listed = mode === 'auto' ? nearby : results
  const station = selectedStationId ? findStation(selectedStationId) : undefined

  function pickStation(id: string) {
    if (id !== selectedStationId) setTrackedLines([])
    setSelectedStationId(id)
  }

  function toggleLine(route: string, stopId: string) {
    setTrackedLines((prev) =>
      prev.some((l) => sameLine(l, route, stopId))
        ? prev.filter((l) => !sameLine(l, route, stopId))
        : [...prev, { route, stopId, direction: 'S' as GtfsDirection }]
    )
  }

  function setDirection(route: string, stopId: string, direction: GtfsDirection) {
    setTrackedLines((prev) =>
      prev.map((l) => (sameLine(l, route, stopId) ? { ...l, direction } : l))
    )
  }

  async function save() {
    if (!station) return
    setSaving(true)
    setError(null)
    const { error } = await supabase
      .from('profiles')
      .update({
        subway_stop_id: station.id,
        subway_stop_name: station.name,
        subway_lines: trackedLines,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id)
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    router.push('/routines')
    router.refresh()
  }

  return (
    <main className="routines-page">
      <nav className="page-chrome">
        <Link href="/routines">&larr; routines</Link>
      </nav>

      <section className="loc-card picker-card">
        <h2 className="loc-title">Subway stop</h2>
        <p className="loc-sub">so you don&rsquo;t miss it</p>

        <div className="loc-modes">
          <button
            className={`loc-mode${mode === 'auto' ? ' selected' : ''}`}
            onClick={() => setMode('auto')}
          >
            Nearest stop
          </button>
          <button
            className={`loc-mode${mode === 'manual' ? ' selected' : ''}`}
            onClick={() => setMode('manual')}
          >
            Choose a stop
          </button>
        </div>

        {mode === 'auto' && !hasCoords && (
          <p className="loc-status">
            No location saved yet — <Link href="/routines">set one above</Link>, or search for a
            stop instead.
          </p>
        )}

        {mode === 'manual' && (
          <input
            className="picker-search"
            value={query}
            placeholder="Search stops&hellip;"
            onChange={(e) => setQuery(e.target.value)}
          />
        )}

        {listed.length > 0 && (
          <div className="picker-list">
            {listed.map((s) => (
              <button
                key={s.id}
                className={`picker-station${s.id === selectedStationId ? ' selected' : ''}`}
                onClick={() => pickStation(s.id)}
              >
                <span className="picker-dot" aria-hidden />
                <span className="picker-station-info">
                  <span className="picker-station-name">{s.name}</span>
                  <span className="picker-station-sub">
                    {[...new Set(s.platforms.flatMap((p) => p.routes))].join(' · ')}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}

        {station && (
          <>
            <div className="picker-trains-head">Trains at {station.name}</div>
            <div className="picker-lines">
              {station.platforms.flatMap((platform) =>
                platform.routes.map((route) => {
                  const tracked = trackedLines.find((l) => sameLine(l, route, platform.stopId))
                  return (
                    <div className="picker-line-row" key={`${route}-${platform.stopId}`}>
                      <button
                        className="picker-line-toggle"
                        onClick={() => toggleLine(route, platform.stopId)}
                      >
                        <span className={`picker-box${tracked ? ' checked' : ''}`} aria-hidden />
                        <span className="picker-line-badge">{route}</span>
                        <span className="picker-line-name">{route} train</span>
                      </button>
                      {tracked && (
                        <div className="picker-directions">
                          <button
                            className={tracked.direction === 'N' ? 'selected' : ''}
                            onClick={() => setDirection(route, platform.stopId, 'N')}
                          >
                            {platform.north}
                          </button>
                          <button
                            className={tracked.direction === 'S' ? 'selected' : ''}
                            onClick={() => setDirection(route, platform.stopId, 'S')}
                          >
                            {platform.south}
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            <div className="picker-preview">
              <div className="picker-preview-head">You&rsquo;ll see</div>
              {trackedLines.length === 0 && (
                <p className="loc-status">No trains selected yet.</p>
              )}
              {trackedLines.map((l) => {
                const platform = station.platforms.find((p) => p.stopId === l.stopId)
                const label = l.direction === 'N' ? platform?.north : platform?.south
                return (
                  <div className="picker-preview-row" key={`${l.route}-${l.stopId}`}>
                    <span className="picker-line-badge small">{l.route}</span>
                    <span>{label}</span>
                  </div>
                )
              })}
            </div>

            {error && <p className="loc-status" style={{ color: 'var(--ink)', fontWeight: 700 }}>{error}</p>}
            <button className="loc-btn" style={{ width: '100%' }} disabled={saving} onClick={save}>
              Save
            </button>
          </>
        )}
      </section>
    </main>
  )
}
