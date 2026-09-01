// Pure graph walker: (graph, conditions, answers) -> today's items.
// No React, no Supabase — unit-tested directly (walk.test.ts).

import type {
  Answers,
  AskNodeConfig,
  BranchLabel,
  DayNodeConfig,
  RoutineEdge,
  RoutineGraph,
  TicketItem,
  WalkConditions,
  WalkResult,
  WeatherFacts,
  WeatherNodeConfig,
} from './types'

export const START_ID = 'start'
export const DEFAULT_TAG = 'ALWAYS'

export function walk(
  graph: RoutineGraph,
  conditions: WalkConditions,
  answers: Answers
): WalkResult {
  const nodesById = new Map(graph.nodes.map((n) => [n.id, n]))
  const items: TicketItem[] = []
  const emitted = new Set<string>()
  const pendingAsks: string[] = []
  const pendingSet = new Set<string>()
  // Visited set makes cycles terminate and diamonds resolve once
  // (first path to reach a node wins, including its inherited tag).
  const visited = new Set<string>()

  const queue: { id: string; tag: string }[] = graph.edges
    .filter((e) => e.from === START_ID)
    .map((e) => ({ id: e.to, tag: DEFAULT_TAG }))

  while (queue.length > 0) {
    const { id, tag } = queue.shift()!
    if (visited.has(id)) continue
    visited.add(id)

    const node = nodesById.get(id)
    if (!node) continue // dangling edge — ignore

    if (node.type === 'item') {
      if (!emitted.has(node.id)) {
        emitted.add(node.id)
        items.push({ id: node.id, label: node.label, tag, checked: false })
      }
      // Items may chain unconditionally; the tag carries through.
      for (const e of outgoing(graph.edges, node.id, null)) {
        queue.push({ id: e.to, tag })
      }
      continue
    }

    let outcome: boolean | null
    if (node.type === 'ask') {
      const answer = answers[node.id]
      outcome = typeof answer === 'boolean' ? answer : null
      if (outcome === null && !pendingSet.has(node.id)) {
        pendingSet.add(node.id)
        pendingAsks.push(node.id)
      }
    } else if (node.type === 'day') {
      const cfg = node.config as DayNodeConfig
      outcome = Array.isArray(cfg.days) && cfg.days.includes(conditions.weekday)
    } else {
      outcome = evalWeather(node.config as WeatherNodeConfig, conditions.weather)
    }

    // Unanswered ask / missing weather: follow neither branch.
    if (outcome === null) continue

    const branch: BranchLabel = outcome ? 'yes' : 'no'
    const cfg = node.config as WeatherNodeConfig | DayNodeConfig | AskNodeConfig
    // The YES branch stamps the node's tag onto everything downstream;
    // the NO branch keeps whatever tag the path already carried.
    const nextTag = outcome && cfg.tag?.trim() ? cfg.tag.trim() : tag
    for (const e of outgoing(graph.edges, node.id, branch)) {
      queue.push({ id: e.to, tag: nextTag })
    }
  }

  return { items, pendingAsks }
}

/** Does this graph contain any weather nodes (i.e. does a walk need a forecast)? */
export function graphNeedsWeather(graph: RoutineGraph): boolean {
  return graph.nodes.some((n) => n.type === 'weather')
}

function outgoing(
  edges: RoutineEdge[],
  from: string,
  branch: BranchLabel | null
): RoutineEdge[] {
  return edges.filter(
    (e) => e.from === from && (branch === null || e.fromBranch === branch)
  )
}

function evalWeather(
  cfg: WeatherNodeConfig,
  weather: WeatherFacts | null
): boolean | null {
  if (!weather) return null
  const value =
    cfg.metric === 'precip'
      ? weather.precipProbability
      : cfg.metric === 'temp_max'
        ? weather.tempMaxF
        : weather.tempMinF
  return cfg.op === 'lte' ? value <= cfg.value : value >= cfg.value
}
