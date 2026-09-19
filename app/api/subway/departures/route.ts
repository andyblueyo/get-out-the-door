import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchArrivals } from '@/lib/subway/realtime'
import { buildSubwaySection } from '@/lib/subway/predict'
import { findStation, haversineMiles, walkMinutesForMiles } from '@/lib/subway/stations'
import type { TrackedLine } from '@/lib/subway/types'

// Reads the caller's own saved stop + tracked lines from `profiles`, fetches
// live arrivals, and returns ticket-ready display data. Nothing here is
// persisted — subway times move too fast for daily_state's 24h cache.
export async function GET() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (!claims) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', claims.sub as string)
    .maybeSingle()
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })
  if (!profile?.subway_enabled || !profile.subway_stop_id) {
    return NextResponse.json({ error: 'Subway display is off' }, { status: 404 })
  }

  const station = findStation(profile.subway_stop_id)
  if (!station) {
    return NextResponse.json({ error: 'Saved stop not found' }, { status: 404 })
  }

  const tracked = (profile.subway_lines ?? []) as TrackedLine[]
  const directionLabels: Record<string, string> = {}
  for (const platform of station.platforms) {
    for (const route of platform.routes) {
      directionLabels[`${route}:N`] = platform.north
      directionLabels[`${route}:S`] = platform.south
    }
  }

  let walkMinutes: number | null = null
  if (profile.latitude != null && profile.longitude != null) {
    const miles = haversineMiles(profile.latitude, profile.longitude, station.lat, station.lon)
    walkMinutes = walkMinutesForMiles(miles)
  }

  try {
    const arrivals = await fetchArrivals(tracked)
    const section = buildSubwaySection({
      stopName: station.name,
      tracked,
      directionLabels,
      arrivals,
      walkMinutes,
      showWalk: profile.subway_show_walk,
      showLeaveBy: profile.subway_show_leave_by,
    })
    return NextResponse.json(section)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Could not reach the MTA feed' },
      { status: 502 }
    )
  }
}
