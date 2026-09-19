// Combines live arrivals with a walk-time estimate into what the ticket and
// the picker's preview print. Pure — no React, no fetch, no Supabase — so it
// can be unit tested directly, same as lib/routine/walk.ts.

import type { Arrival, SubwayLineDisplay, SubwaySectionData, TrackedLine } from './types'

export interface BuildSubwaySectionOptions {
  stopName: string
  tracked: TrackedLine[]
  /** label for each tracked line's direction, keyed by `${route}:${direction}` */
  directionLabels: Record<string, string>
  arrivals: Arrival[]
  walkMinutes: number | null
  showWalk: boolean
  showLeaveBy: boolean
}

/** First arrival the walk actually allows catching, else the last known one. */
function catchableMinutes(times: number[], walkMinutes: number): number {
  const catchable = times.find((t) => t >= walkMinutes)
  return catchable ?? times[times.length - 1]
}

export function buildSubwaySection(opts: BuildSubwaySectionOptions): SubwaySectionData {
  const walk = opts.showWalk || opts.showLeaveBy ? opts.walkMinutes : null

  const lines: SubwayLineDisplay[] = opts.tracked.map((t) => {
    const times = opts.arrivals
      .filter((a) => a.route === t.route && a.stopId === t.stopId && a.direction === t.direction)
      .map((a) => a.minutesAway)
      .sort((a, b) => a - b)
      .slice(0, 2)

    let leaveInMinutes: number | null = null
    if (opts.showLeaveBy && walk != null && times.length > 0) {
      leaveInMinutes = catchableMinutes(times, walk) - walk
    }

    return {
      route: t.route,
      directionLabel: opts.directionLabels[`${t.route}:${t.direction}`] ?? '',
      times,
      leaveInMinutes,
    }
  })

  let leaveBy: SubwaySectionData['leaveBy'] = null
  if (opts.showLeaveBy) {
    const soonest = lines
      .filter((l) => l.leaveInMinutes != null)
      .reduce<SubwayLineDisplay | null>(
        (best, l) => (!best || l.leaveInMinutes! < best.leaveInMinutes! ? l : best),
        null
      )
    if (soonest) {
      leaveBy = {
        route: soonest.route,
        directionLabel: soonest.directionLabel,
        leaveInMinutes: soonest.leaveInMinutes!,
      }
    }
  }

  return {
    stopName: opts.stopName,
    walkMinutes: opts.showWalk ? opts.walkMinutes : null,
    lines,
    leaveBy,
  }
}
