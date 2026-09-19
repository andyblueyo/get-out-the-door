// NYC subway station reference — geocoding and "nearest stop" only.
// Data is a static snapshot of the MTA's public stations dataset
// (data.ny.gov, resource 39hk-dx4f), grouped by transfer complex so e.g.
// "14 St-Union Sq" is one entry covering the 4/5/6, L, and N/Q/R/W platforms.
// Regenerate by re-fetching that dataset and grouping by complex_id.

import stationsData from './stations.json'
import type { Station } from './types'

export const STATIONS = stationsData as Station[]

const EARTH_RADIUS_MI = 3958.8

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/** Great-circle distance between two lat/lon points, in miles. */
export function haversineMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return EARTH_RADIUS_MI * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Rough walking estimate at ~3 mph, rounded up, minimum 1 minute. */
export function walkMinutesForMiles(miles: number): number {
  return Math.max(1, Math.ceil((miles / 3) * 60))
}

export function nearestStations(lat: number, lon: number, limit = 5): Station[] {
  return [...STATIONS]
    .sort(
      (a, b) =>
        haversineMiles(lat, lon, a.lat, a.lon) - haversineMiles(lat, lon, b.lat, b.lon)
    )
    .slice(0, limit)
}

export function findStation(id: string): Station | undefined {
  return STATIONS.find((s) => s.id === id)
}

export function searchStations(query: string, limit = 8): Station[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return STATIONS.filter((s) => s.name.toLowerCase().includes(q)).slice(0, limit)
}
