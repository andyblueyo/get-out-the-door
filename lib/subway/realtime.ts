// Live NYC subway arrivals from MTA's GTFS-Realtime feeds. As of the MTA's
// current developer page (https://api.mta.info/#/subwayRealTimeFeeds,
// checked live), "Accounts and API keys are no longer required to access
// these feeds" — confirmed with a keyless request against every feed group
// below. Fetched server-side (not from the browser) purely to keep the
// protobuf decoding and route/direction matching off the client, same as
// any other backend data shaping — not because of a secret.

import GtfsRealtimeBindings from 'gtfs-realtime-bindings'
import type Long from 'long'
import type { Arrival, GtfsDirection, TrackedLine } from './types'
import { feedUrlsForRoutes } from './routes'

function asNumber(time: number | Long | null | undefined): number | null {
  if (time == null) return null
  if (typeof time === 'number') return time
  // protobufjs Long instance
  return typeof time.toNumber === 'function' ? time.toNumber() : Number(time)
}

/**
 * Fetches and decodes every feed that covers `lines`, and returns the
 * upcoming arrivals for exactly those (route, stopId, direction) triples.
 * Throws if a feed request fails.
 */
export async function fetchArrivals(lines: TrackedLine[]): Promise<Arrival[]> {
  if (lines.length === 0) return []

  // route -> stopId+direction targets we care about, e.g. "635S"
  const wantByRoute = new Map<string, Set<string>>()
  for (const line of lines) {
    const set = wantByRoute.get(line.route) ?? new Set<string>()
    set.add(`${line.stopId}${line.direction}`)
    wantByRoute.set(line.route, set)
  }

  const feedUrls = feedUrlsForRoutes(lines.map((l) => l.route))
  const nowSeconds = Date.now() / 1000
  const arrivals: Arrival[] = []

  await Promise.all(
    feedUrls.map(async (url) => {
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) {
        throw new Error(`MTA feed responded ${res.status} for ${url}`)
      }
      const buffer = await res.arrayBuffer()
      const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
        new Uint8Array(buffer)
      )

      for (const entity of feed.entity) {
        const trip = entity.tripUpdate
        const routeId = trip?.trip?.routeId
        if (!routeId) continue
        const wanted = wantByRoute.get(routeId)
        if (!wanted) continue

        for (const stu of trip!.stopTimeUpdate ?? []) {
          const stopId = stu.stopId
          if (!stopId || !wanted.has(stopId)) continue
          const seconds = asNumber(stu.arrival?.time) ?? asNumber(stu.departure?.time)
          if (seconds == null) continue
          const minutesAway = Math.round((seconds - nowSeconds) / 60)
          if (minutesAway < 0) continue
          arrivals.push({
            route: routeId,
            stopId: stopId.slice(0, -1),
            direction: stopId.slice(-1) as GtfsDirection,
            minutesAway,
          })
        }
      }
    })
  )

  return arrivals.sort((a, b) => a.minutesAway - b.minutesAway)
}
