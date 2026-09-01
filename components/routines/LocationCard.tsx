'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { geocodePlace } from '@/lib/weather'
import type { Database, LocationMode } from '@/lib/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

export default function LocationCard({ profile }: { profile: Profile }) {
  const router = useRouter()
  const supabase = createClient()
  const [mode, setMode] = useState<LocationMode>(profile.location_mode)
  const [place, setPlace] = useState(profile.manual_place ?? '')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const hasCoords = profile.latitude != null && profile.longitude != null

  async function saveMode(next: LocationMode) {
    setMode(next)
    setError(null)
    const { error } = await supabase
      .from('profiles')
      .update({ location_mode: next, updated_at: new Date().toISOString() })
      .eq('id', profile.id)
    if (error) setError(error.message)
    router.refresh()
  }

  async function useMyLocation() {
    setBusy(true)
    setError(null)
    setStatus('Asking the browser for your location…')
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
          maximumAge: 5 * 60 * 1000,
        })
      )
      const { error } = await supabase
        .from('profiles')
        .update({
          location_mode: 'auto',
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)
      if (error) throw new Error(error.message)
      setStatus(
        `Saved: ${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)}`
      )
      router.refresh()
    } catch (e) {
      setStatus(null)
      setError(e instanceof Error ? e.message : 'Could not get your location')
    }
    setBusy(false)
  }

  async function lookUpPlace() {
    if (!place.trim()) return
    setBusy(true)
    setError(null)
    setStatus('Looking up…')
    try {
      const hit = await geocodePlace(place.trim())
      if (!hit) {
        setStatus(null)
        setError(`No match for “${place.trim()}”`)
        setBusy(false)
        return
      }
      const label = hit.admin1 ? `${hit.name}, ${hit.admin1}` : hit.name
      const { error } = await supabase
        .from('profiles')
        .update({
          location_mode: 'manual',
          manual_place: label,
          latitude: hit.latitude,
          longitude: hit.longitude,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)
      if (error) throw new Error(error.message)
      setPlace(label)
      setStatus(`Saved: ${label}`)
      router.refresh()
    } catch (e) {
      setStatus(null)
      setError(e instanceof Error ? e.message : 'Lookup failed')
    }
    setBusy(false)
  }

  return (
    <section className="loc-card">
      <h2 className="loc-title">Location</h2>
      <p className="loc-sub">
        Used to fetch the day&rsquo;s weather when your routine checks it.
      </p>

      <div className="loc-modes">
        <button
          className={`loc-mode${mode === 'auto' ? ' selected' : ''}`}
          onClick={() => saveMode('auto')}
        >
          Auto
        </button>
        <button
          className={`loc-mode${mode === 'manual' ? ' selected' : ''}`}
          onClick={() => saveMode('manual')}
        >
          Manual
        </button>
      </div>

      {mode === 'auto' ? (
        <div className="loc-row">
          <button className="loc-btn" style={{ flex: 1 }} disabled={busy} onClick={useMyLocation}>
            Use my location
          </button>
        </div>
      ) : (
        <div className="loc-row">
          <input
            value={place}
            placeholder="City name"
            onChange={(e) => setPlace(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && lookUpPlace()}
          />
          <button className="loc-btn" disabled={busy} onClick={lookUpPlace}>
            Look up
          </button>
        </div>
      )}

      {error && <p className="loc-status" style={{ color: 'var(--ink)', fontWeight: 700 }}>{error}</p>}
      {!error && status && <p className="loc-status">{status}</p>}
      {!error && !status && (
        <p className="loc-status">
          {mode === 'manual' && profile.manual_place
            ? `Currently: ${profile.manual_place}`
            : hasCoords
              ? `Currently: ${profile.latitude!.toFixed(3)}, ${profile.longitude!.toFixed(3)}`
              : 'No location saved yet.'}
        </p>
      )}
    </section>
  )
}
