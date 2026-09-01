// Open-Meteo integration — free, no API key. Pure fetch helpers, no React.

import type { WeatherFacts } from './routine/types'

/** What gets persisted into daily_state.weather. */
export interface StoredWeather extends WeatherFacts {
  /** short ticket meta-row string, e.g. "75° RAIN 80%" */
  summary: string
  place: string | null
  fetchedAt: string
}

export interface GeocodeHit {
  name: string
  latitude: number
  longitude: number
  admin1?: string
  country_code?: string
}

interface ForecastResponse {
  daily?: {
    precipitation_probability_max?: number[]
    temperature_2m_max?: number[]
    temperature_2m_min?: number[]
    weather_code?: number[]
  }
}

interface GeocodeResponse {
  results?: GeocodeHit[]
}

export async function fetchForecast(
  latitude: number,
  longitude: number
): Promise<WeatherFacts> {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', String(latitude))
  url.searchParams.set('longitude', String(longitude))
  url.searchParams.set(
    'daily',
    'precipitation_probability_max,temperature_2m_max,temperature_2m_min,weather_code'
  )
  url.searchParams.set('temperature_unit', 'fahrenheit')
  url.searchParams.set('timezone', 'auto')
  url.searchParams.set('forecast_days', '1')

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Open-Meteo responded ${res.status}`)
  let data: ForecastResponse
  try {
    data = (await res.json()) as ForecastResponse
  } catch {
    throw new Error('Couldn’t reach the weather service — try again.')
  }
  const daily = data?.daily
  if (!daily?.temperature_2m_max?.length) {
    throw new Error('Open-Meteo returned no daily forecast')
  }
  return {
    precipProbability: daily.precipitation_probability_max?.[0] ?? 0,
    tempMaxF: Math.round(daily.temperature_2m_max[0]),
    tempMinF: Math.round(daily.temperature_2m_min?.[0] ?? 0),
    code: daily.weather_code?.[0] ?? 0,
  }
}

export async function geocodePlace(name: string): Promise<GeocodeHit | null> {
  const url = new URL('https://geocoding-api.open-meteo.com/v1/search')
  url.searchParams.set('name', name)
  url.searchParams.set('count', '1')
  url.searchParams.set('language', 'en')
  url.searchParams.set('format', 'json')

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Geocoding responded ${res.status}`)
  let data: GeocodeResponse
  try {
    data = (await res.json()) as GeocodeResponse
  } catch {
    throw new Error('Couldn’t reach the weather service — try again.')
  }
  const hit = data?.results?.[0]
  if (!hit) return null
  return {
    name: hit.name,
    latitude: hit.latitude,
    longitude: hit.longitude,
    admin1: hit.admin1,
    country_code: hit.country_code,
  }
}

/** WMO weather code → short caps word for the ticket meta row. */
export function describeWeatherCode(code: number): string {
  if (code === 0) return 'CLEAR'
  if (code <= 2) return 'FAIR'
  if (code === 3) return 'CLOUDY'
  if (code === 45 || code === 48) return 'FOG'
  if (code >= 51 && code <= 57) return 'DRIZZLE'
  if (code >= 61 && code <= 67) return 'RAIN'
  if (code >= 71 && code <= 77) return 'SNOW'
  if (code >= 80 && code <= 82) return 'SHOWERS'
  if (code === 85 || code === 86) return 'SNOW'
  if (code >= 95) return 'STORM'
  return 'WEATHER'
}

export function summarizeWeather(facts: WeatherFacts): string {
  const desc = describeWeatherCode(facts.code)
  const precip =
    facts.precipProbability >= 20 ? ` ${facts.precipProbability}%` : ''
  return `${facts.tempMaxF}° ${desc}${precip}`
}

export function toStoredWeather(
  facts: WeatherFacts,
  place: string | null
): StoredWeather {
  return {
    ...facts,
    summary: summarizeWeather(facts),
    place,
    fetchedAt: new Date().toISOString(),
  }
}
