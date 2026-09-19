// Which GTFS-Realtime feed each subway route's trip updates come from.
// MTA groups the feeds by division, not by individual route.

export const FEED_URLS: Record<string, string> = {
  '1234567S': 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs',
  ACE: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-ace',
  BDFM: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-bdfm',
  G: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-g',
  JZ: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-jz',
  NQRW: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-nqrw',
  L: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-l',
  SI: 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-si',
}

const ROUTE_TO_FEED: Record<string, keyof typeof FEED_URLS> = {
  '1': '1234567S', '2': '1234567S', '3': '1234567S', '4': '1234567S',
  '5': '1234567S', '6': '1234567S', '6X': '1234567S', '7': '1234567S',
  '7X': '1234567S', S: '1234567S', GS: '1234567S', FS: 'ACE', H: 'ACE',
  A: 'ACE', C: 'ACE', E: 'ACE',
  B: 'BDFM', D: 'BDFM', F: 'BDFM', FX: 'BDFM', M: 'BDFM',
  G: 'G',
  J: 'JZ', Z: 'JZ',
  N: 'NQRW', Q: 'NQRW', R: 'NQRW', W: 'NQRW',
  L: 'L',
  SI: 'SI', SIR: 'SI',
}

export function feedUrlForRoute(route: string): string | undefined {
  const group = ROUTE_TO_FEED[route]
  return group ? FEED_URLS[group] : undefined
}

/** Every distinct feed URL needed to cover a set of routes. */
export function feedUrlsForRoutes(routes: string[]): string[] {
  const urls = new Set<string>()
  for (const route of routes) {
    const url = feedUrlForRoute(route)
    if (url) urls.add(url)
  }
  return [...urls]
}
