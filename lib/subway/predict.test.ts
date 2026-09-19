import { test } from 'node:test'
import assert from 'node:assert/strict'

import { buildSubwaySection } from './predict.ts'
import type { Arrival, TrackedLine } from './types.ts'

const SIX_DOWNTOWN: TrackedLine = { route: '6', stopId: '635', direction: 'S' }
const L_MANHATTAN: TrackedLine = { route: 'L', stopId: 'L03', direction: 'N' }

const DIRECTION_LABELS = {
  '6:S': 'Downtown & Brooklyn',
  'L:N': '8 Av (Manhattan)',
}

const ARRIVALS: Arrival[] = [
  { route: '6', stopId: '635', direction: 'S', minutesAway: 5 },
  { route: '6', stopId: '635', direction: 'S', minutesAway: 14 },
  { route: 'L', stopId: 'L03', direction: 'N', minutesAway: 9 },
  { route: 'L', stopId: 'L03', direction: 'N', minutesAway: 18 },
]

test('skips an arrival the walk can\'t make and leaves on the next one', () => {
  const section = buildSubwaySection({
    stopName: '14 St-Union Sq',
    tracked: [SIX_DOWNTOWN],
    directionLabels: DIRECTION_LABELS,
    arrivals: ARRIVALS,
    walkMinutes: 6,
    showWalk: true,
    showLeaveBy: true,
  })
  assert.equal(section.lines[0].times.join(','), '5,14')
  // 5 min away < 6 min walk, so the 14-minute train is the one you can catch
  assert.equal(section.lines[0].leaveInMinutes, 8)
})

test('picks the earliest deadline across tracked lines as the hero', () => {
  const section = buildSubwaySection({
    stopName: '14 St-Union Sq',
    tracked: [SIX_DOWNTOWN, L_MANHATTAN],
    directionLabels: DIRECTION_LABELS,
    arrivals: ARRIVALS,
    walkMinutes: 6,
    showWalk: true,
    showLeaveBy: true,
  })
  assert.equal(section.leaveBy?.route, 'L')
  assert.equal(section.leaveBy?.leaveInMinutes, 3)
})

test('leave-by is omitted when the toggle is off', () => {
  const section = buildSubwaySection({
    stopName: '14 St-Union Sq',
    tracked: [SIX_DOWNTOWN],
    directionLabels: DIRECTION_LABELS,
    arrivals: ARRIVALS,
    walkMinutes: 6,
    showWalk: true,
    showLeaveBy: false,
  })
  assert.equal(section.leaveBy, null)
  assert.equal(section.lines[0].leaveInMinutes, null)
})

test('walk time is omitted when the toggle is off, even if known', () => {
  const section = buildSubwaySection({
    stopName: '14 St-Union Sq',
    tracked: [SIX_DOWNTOWN],
    directionLabels: DIRECTION_LABELS,
    arrivals: ARRIVALS,
    walkMinutes: 6,
    showWalk: false,
    showLeaveBy: false,
  })
  assert.equal(section.walkMinutes, null)
})

test('no catchable arrival falls back to the last known one', () => {
  const section = buildSubwaySection({
    stopName: '14 St-Union Sq',
    tracked: [SIX_DOWNTOWN],
    directionLabels: DIRECTION_LABELS,
    arrivals: [{ route: '6', stopId: '635', direction: 'S', minutesAway: 2 }],
    walkMinutes: 6,
    showWalk: true,
    showLeaveBy: true,
  })
  // Only arrival is closer than the walk — still reported, leave-in goes negative.
  assert.equal(section.lines[0].leaveInMinutes, -4)
})
