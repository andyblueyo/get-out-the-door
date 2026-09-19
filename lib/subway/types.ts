// Subway vocabulary shared by the picker, the realtime fetch, and the ticket.
// Pure types — no React, no Supabase, no fetch.

/** One platform at a station complex — a single GTFS-Realtime stop_id. */
export interface StationPlatform {
  stopId: string
  routes: string[]
  /** label for the northbound/GTFS "N" direction, e.g. "Uptown" */
  north: string
  /** label for the southbound/GTFS "S" direction, e.g. "Downtown" */
  south: string
}

/** One station complex (may bundle several physical platforms, e.g. Union Sq). */
export interface Station {
  id: string
  name: string
  lat: number
  lon: number
  borough: string
  platforms: StationPlatform[]
}

export type GtfsDirection = 'N' | 'S'

/** A single line+direction a user has chosen to track at their stop. Stored in profiles.subway_lines. */
export interface TrackedLine {
  route: string
  stopId: string
  direction: GtfsDirection
}

/** A live arrival, decoded from a GTFS-Realtime feed. */
export interface Arrival {
  route: string
  stopId: string
  direction: GtfsDirection
  minutesAway: number
}

export interface SubwayLineDisplay {
  route: string
  directionLabel: string
  /** upcoming arrivals in minutes, soonest first, at most 2 */
  times: number[]
  /** minutes from now to leave and still catch the first catchable arrival, or null if none is catchable */
  leaveInMinutes: number | null
}

export interface SubwaySectionData {
  stopName: string
  /** null when "show walk time" is off, or coordinates are unavailable */
  walkMinutes: number | null
  lines: SubwayLineDisplay[]
  /** the single most time-sensitive line, shown as the hero — null when "show leave-by" is off or nothing is catchable */
  leaveBy: { route: string; directionLabel: string; leaveInMinutes: number } | null
}
