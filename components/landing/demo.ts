// Sample data for the signed-out landing page. One real RoutineGraph drives
// both the hero ticket and the builder demo, through the same walk() the
// checklist uses, so the landing page can't drift from how the app behaves.

import type { RoutineGraph, WeatherFacts } from '@/lib/routine/types'
import type { SubwaySectionData } from '@/lib/subway/types'
import { START_ID } from '@/lib/routine/walk'

export const DEMO_GRAPH: RoutineGraph = {
  nodes: [
    { id: 'keys', type: 'item', label: 'Keys, wallet, phone', config: {}, x: 225, y: 86 },
    {
      id: 'rain',
      type: 'weather',
      label: 'Rain likely',
      config: { metric: 'precip', op: 'gte', value: 40, tag: 'RAIN' },
      x: 225,
      y: 171,
    },
    {
      id: 'work',
      type: 'day',
      label: 'Work day',
      config: { days: [1, 2, 3, 4, 5], tag: 'WORK' },
      x: 225,
      y: 378,
    },
    { id: 'gym', type: 'ask', label: 'Going to the gym?', config: { tag: 'GYM' }, x: 225, y: 585 },
    { id: 'umbrella', type: 'item', label: 'Umbrella', config: {}, x: 513, y: 266 },
    { id: 'laptop', type: 'item', label: 'Laptop + charger', config: {}, x: 513, y: 473 },
    { id: 'gymbag', type: 'item', label: 'Gym bag', config: {}, x: 513, y: 646 },
  ],
  edges: [
    { id: 'e-keys', from: START_ID, fromBranch: null, to: 'keys' },
    { id: 'e-rain', from: START_ID, fromBranch: null, to: 'rain' },
    { id: 'e-work', from: START_ID, fromBranch: null, to: 'work' },
    { id: 'e-gym', from: START_ID, fromBranch: null, to: 'gym' },
    { id: 'e-umbrella', from: 'rain', fromBranch: 'yes', to: 'umbrella' },
    { id: 'e-laptop', from: 'work', fromBranch: 'yes', to: 'laptop' },
    { id: 'e-gymbag', from: 'gym', fromBranch: 'yes', to: 'gymbag' },
  ],
}

/** Canvas size that fits DEMO_GRAPH with a margin. */
export const DEMO_CANVAS = { width: 732, height: 750 }

export const RAINY: WeatherFacts = { precipProbability: 70, tempMaxF: 61, tempMinF: 52, code: 63 }
export const CLEAR: WeatherFacts = { precipProbability: 10, tempMaxF: 68, tempMinF: 55, code: 0 }

/** A sample check, so the dates are fixed rather than "today". */
export const FRIDAY = { weekday: 5, dateLabel: 'FRI, SEP 18' }
export const SATURDAY = { weekday: 6, dateLabel: 'SAT, SEP 19' }
export const CHECK_NO = 'Nº 4417'

export const HERO_SUBWAY: SubwaySectionData = {
  stopName: 'Bergen St',
  walkMinutes: 6,
  lines: [{ route: 'F', directionLabel: 'Manhattan', times: [10, 17], leaveInMinutes: 4 }],
  leaveBy: { route: 'F', directionLabel: 'Manhattan', leaveInMinutes: 4 },
}
