'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Ticket from '@/components/ticket/Ticket'
import { graphNeedsWeather, walk } from '@/lib/routine/walk'
import { fetchForecast, toStoredWeather, type StoredWeather } from '@/lib/weather'
import type { Database } from '@/lib/database.types'
import type { Answers, TicketItem } from '@/lib/routine/types'
import type { SubwaySectionData } from '@/lib/subway/types'
import './checklist.css'

// Train times move minute to minute, so unlike weather this is never
// persisted to daily_state — just refetched on a short interval while the
// ticket is open.
const SUBWAY_REFRESH_MS = 30_000

type Profile = Database['public']['Tables']['profiles']['Row']
type Routine = Database['public']['Tables']['routines']['Row']
type DailyRow = Database['public']['Tables']['daily_state']['Row']

interface DayState {
  local_date: string
  generated_at: string
  items: TicketItem[]
  answers: Answers
  weather: StoredWeather | null
  completed_at: string | null
}

type Phase = 'boot' | 'fetching' | 'ready' | 'error'

const DAY_MS = 24 * 60 * 60 * 1000

function localDateStr(): string {
  return new Date().toLocaleDateString('en-CA') // YYYY-MM-DD in local tz
}

// The reset rule: regenerate when completed, when the local date rolled over,
// or when the ticket is more than 24h old — whichever comes first. A routine
// switch also invalidates the ticket.
function isStale(state: DailyRow | null, routineId: string): boolean {
  if (!state) return true
  if (state.routine_id !== routineId) return true
  if (state.completed_at) return true
  if (state.local_date !== localDateStr()) return true
  if (Date.now() - Date.parse(state.generated_at) > DAY_MS) return true
  return false
}

function checkNoFrom(generatedAt: string): string {
  const n = (Math.floor(Date.parse(generatedAt) / 60000) % 9000) + 1000
  return `Nº ${n}`
}

function dateLabel(): string {
  return new Date()
    .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    .toUpperCase()
}

function getPosition(timeoutMs: number): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation unavailable'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: timeoutMs,
      maximumAge: 10 * 60 * 1000,
    })
  })
}

export default function ChecklistScreen({
  userId,
  profile,
  routine,
  initialState,
}: {
  userId: string
  profile: Profile | null
  routine: Routine | null
  initialState: DailyRow | null
}) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [phase, setPhase] = useState<Phase>('boot')
  const [day, setDay] = useState<DayState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [banner, setBanner] = useState<string | null>(null)
  const [subway, setSubway] = useState<SubwaySectionData | null>(null)
  const dayRef = useRef<DayState | null>(null)
  dayRef.current = day

  const persist = useCallback(
    async (state: DayState) => {
      const { error } = await supabase.from('daily_state').upsert({
        user_id: userId,
        routine_id: routine?.id ?? null,
        local_date: state.local_date,
        generated_at: state.generated_at,
        items: state.items,
        answers: state.answers,
        weather: state.weather,
        completed_at: state.completed_at,
        updated_at: new Date().toISOString(),
      })
      if (error) setBanner(`Couldn’t save: ${error.message}`)
    },
    [supabase, userId, routine?.id]
  )

  const resolveCoords = useCallback(async (): Promise<{
    lat: number
    lon: number
    place: string | null
  }> => {
    if (profile?.location_mode === 'manual') {
      if (profile.latitude != null && profile.longitude != null) {
        return { lat: profile.latitude, lon: profile.longitude, place: profile.manual_place }
      }
      throw new Error('Set your location on the Routines page first.')
    }
    try {
      const pos = await getPosition(8000)
      // Remember the fix for next time; best-effort, don't block on it.
      void supabase
        .from('profiles')
        .update({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .then(() => {})
      return { lat: pos.coords.latitude, lon: pos.coords.longitude, place: null }
    } catch {
      if (profile?.latitude != null && profile?.longitude != null) {
        return { lat: profile.latitude, lon: profile.longitude, place: profile.manual_place }
      }
      throw new Error(
        'Location unavailable — allow location access, or set a place on the Routines page.'
      )
    }
  }, [profile, supabase, userId])

  const generate = useCallback(
    async (answers: Answers, reuseWeather: StoredWeather | null, prevItems: TicketItem[]) => {
      if (!routine) return
      setError(null)
      try {
        let weather = reuseWeather
        if (!weather && graphNeedsWeather(routine.graph)) {
          setPhase('fetching')
          const { lat, lon, place } = await resolveCoords()
          const facts = await fetchForecast(lat, lon)
          weather = toStoredWeather(facts, place)
        }
        const weekday = new Date().getDay()
        const result = walk(routine.graph, { weather, weekday }, answers)
        const prevById = new Map(prevItems.map((i) => [i.id, i]))
        const items = result.items.map((i) => ({
          ...i,
          checked: prevById.get(i.id)?.checked ?? false,
        }))
        const next: DayState = {
          local_date: localDateStr(),
          generated_at: dayRef.current && prevItems.length > 0
            ? dayRef.current.generated_at
            : new Date().toISOString(),
          items,
          answers,
          weather,
          completed_at: null,
        }
        setDay(next)
        setPhase('ready')
        await persist(next)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong')
        setPhase('error')
      }
    },
    [routine, resolveCoords, persist]
  )

  // On mount (and when the tab becomes visible again), apply the reset rule.
  useEffect(() => {
    if (!routine) return

    const ensureFresh = () => {
      const current = dayRef.current
      if (current && !isStale({ ...current, routine_id: routine.id, user_id: userId, updated_at: null }, routine.id)) {
        return
      }
      if (!current && !isStale(initialState, routine.id)) {
        setDay({
          local_date: initialState!.local_date,
          generated_at: initialState!.generated_at,
          items: initialState!.items ?? [],
          answers: initialState!.answers ?? {},
          weather: initialState!.weather ?? null,
          completed_at: initialState!.completed_at,
        })
        setPhase('ready')
        return
      }
      void generate({}, null, [])
    }

    ensureFresh()
    const onVisible = () => {
      if (document.visibilityState === 'visible') ensureFresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [routine, initialState, userId, generate])

  // Live next-train data: fetched through our own API route (never MTA
  // directly — that needs a server-side key) and refreshed on a short timer.
  useEffect(() => {
    if (!profile?.subway_enabled) {
      setSubway(null)
      return
    }
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/subway/departures')
        if (!res.ok) {
          if (!cancelled) setSubway(null)
          return
        }
        const data = (await res.json()) as SubwaySectionData
        if (!cancelled) setSubway(data)
      } catch {
        if (!cancelled) setSubway(null)
      }
    }
    void load()
    const id = setInterval(load, SUBWAY_REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [profile?.subway_enabled])

  // Pending questions are derived, not stored: re-walking with the saved
  // answers tells us which asks are still open.
  const pendingAsks = useMemo(() => {
    if (!routine || !day) return []
    const { pendingAsks } = walk(
      routine.graph,
      { weather: day.weather, weekday: new Date().getDay() },
      day.answers
    )
    const byId = new Map(routine.graph.nodes.map((n) => [n.id, n]))
    return pendingAsks
      .map((id) => ({ id, label: byId.get(id)?.label ?? '' }))
      .filter((a) => a.label)
  }, [routine, day])

  function answer(id: string, value: boolean) {
    if (!day) return
    void generate({ ...day.answers, [id]: value }, day.weather, day.items)
  }

  function toggle(id: string) {
    setDay((prev) => {
      if (!prev) return prev
      const next = {
        ...prev,
        items: prev.items.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)),
      }
      void persist(next)
      return next
    })
  }

  function done() {
    setDay((prev) => {
      if (!prev) return prev
      const next = { ...prev, completed_at: new Date().toISOString() }
      void persist(next)
      return next
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const chrome = (
    <nav className="checklist-chrome">
      <Link href="/routines">Routines</Link>
      <button onClick={signOut}>Sign out</button>
    </nav>
  )

  // ---- no routine yet -------------------------------------------------------
  if (!routine) {
    return (
      <main className="checklist-page">
        {chrome}
        <Ticket
          dateLabel={dateLabel()}
          weatherLabel="—"
          checkNo="Nº ----"
          items={[]}
          message={
            <>
              No routine yet.
              <br />
              <Link href="/routines">Build one on your laptop</Link> — then tap
              the tag on your way out.
            </>
          }
          signOff="see you at the door"
        />
      </main>
    )
  }

  // ---- fetching weather / booting ------------------------------------------
  if (phase === 'boot' || phase === 'fetching') {
    return (
      <main className="checklist-page">
        {chrome}
        <Ticket
          dateLabel={dateLabel()}
          weatherLabel="…"
          checkNo="Nº ----"
          items={[]}
          message={
            <span className="fetching-dots">
              Checking the sky<span>.</span>
              <span>.</span>
              <span>.</span>
            </span>
          }
          signOff="one moment"
        />
      </main>
    )
  }

  // ---- error ----------------------------------------------------------------
  if (phase === 'error' || !day) {
    return (
      <main className="checklist-page">
        {chrome}
        <Ticket
          dateLabel={dateLabel()}
          weatherLabel="—"
          checkNo="Nº ----"
          items={[]}
          message={error ?? 'Something went wrong.'}
          footer={
            <button className="btn btn-outline" onClick={() => void generate({}, null, [])}>
              Try again
            </button>
          }
          signOff="sorry about that"
        />
      </main>
    )
  }

  // ---- the day's ticket -----------------------------------------------------
  const completed = day.completed_at != null
  const allChecked = day.items.length > 0 && day.items.every((i) => i.checked)

  return (
    <main className="checklist-page">
      {chrome}
      {banner && <div className="checklist-error">{banner}</div>}
      <Ticket
        dateLabel={dateLabel()}
        weatherLabel={day.weather?.summary ?? '—'}
        checkNo={checkNoFrom(day.generated_at)}
        items={day.items}
        subway={subway}
        asks={completed ? [] : pendingAsks}
        onToggle={completed ? undefined : toggle}
        onAnswer={completed ? undefined : answer}
        allSet={completed || allChecked}
        message={
          day.items.length === 0 && pendingAsks.length === 0
            ? 'Nothing to grab today.'
            : undefined
        }
        footer={
          completed ? (
            <button className="btn btn-outline" onClick={() => void generate({}, null, [])}>
              Start a fresh ticket
            </button>
          ) : (
            <button className="btn" onClick={done}>
              Done — heading out
            </button>
          )
        }
        signOff={completed || allChecked ? 'thank you, have a good day' : 'take your time'}
      />
    </main>
  )
}
