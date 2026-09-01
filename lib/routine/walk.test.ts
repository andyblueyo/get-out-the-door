import { test } from 'node:test'
import assert from 'node:assert/strict'

import { walk, START_ID } from './walk.ts'
import type {
  NodeConfig,
  NodeType,
  RoutineGraph,
  WalkConditions,
  WeatherFacts,
} from './types.ts'

// -- tiny graph-building helpers ---------------------------------------------

function node(id: string, type: NodeType, label: string, config: NodeConfig = {}) {
  return { id, type, label, config, x: 0, y: 0 }
}

let edgeSeq = 0
function edge(from: string, fromBranch: 'yes' | 'no' | null, to: string) {
  return { id: `e${++edgeSeq}`, from, fromBranch, to }
}

const DRY_TUESDAY: WalkConditions = {
  weekday: 2,
  weather: { precipProbability: 5, tempMaxF: 75, tempMinF: 60, code: 1 },
}

const rainy: WeatherFacts = { precipProbability: 85, tempMaxF: 60, tempMinF: 50, code: 63 }

// -- basics -------------------------------------------------------------------

test('item straight off START gets the ALWAYS tag', () => {
  const graph: RoutineGraph = {
    nodes: [node('keys', 'item', 'Keys')],
    edges: [edge(START_ID, null, 'keys')],
  }
  const { items, pendingAsks } = walk(graph, DRY_TUESDAY, {})
  assert.deepEqual(items, [{ id: 'keys', label: 'Keys', tag: 'ALWAYS', checked: false }])
  assert.deepEqual(pendingAsks, [])
})

test('weather YES branch stamps its tag; NO branch keeps the inherited one', () => {
  const graph: RoutineGraph = {
    nodes: [
      node('w1', 'weather', 'Rain likely', { metric: 'precip', op: 'gte', value: 40, tag: 'RAIN' }),
      node('umbrella', 'item', 'Umbrella'),
      node('sunglasses', 'item', 'Sunglasses'),
    ],
    edges: [
      edge(START_ID, null, 'w1'),
      edge('w1', 'yes', 'umbrella'),
      edge('w1', 'no', 'sunglasses'),
    ],
  }

  const wet = walk(graph, { ...DRY_TUESDAY, weather: rainy }, {})
  assert.deepEqual(wet.items, [{ id: 'umbrella', label: 'Umbrella', tag: 'RAIN', checked: false }])

  const dry = walk(graph, DRY_TUESDAY, {})
  assert.deepEqual(dry.items, [{ id: 'sunglasses', label: 'Sunglasses', tag: 'ALWAYS', checked: false }])
})

test('day node matches the local weekday', () => {
  const graph: RoutineGraph = {
    nodes: [
      node('d1', 'day', 'Weekday?', { days: [1, 2, 3, 4, 5], tag: 'WORK' }),
      node('badge', 'item', 'Badge'),
    ],
    edges: [edge(START_ID, null, 'd1'), edge('d1', 'yes', 'badge')],
  }
  assert.equal(walk(graph, DRY_TUESDAY, {}).items.length, 1)
  assert.equal(walk(graph, { ...DRY_TUESDAY, weekday: 0 }, {}).items.length, 0)
})

test('answered ask follows the answered branch with its tag', () => {
  const graph: RoutineGraph = {
    nodes: [
      node('gym', 'ask', 'Gym today?', { tag: 'GYM' }),
      node('shoes', 'item', 'Gym shoes'),
    ],
    edges: [edge(START_ID, null, 'gym'), edge('gym', 'yes', 'shoes')],
  }
  const yes = walk(graph, DRY_TUESDAY, { gym: true })
  assert.deepEqual(yes.items, [{ id: 'shoes', label: 'Gym shoes', tag: 'GYM', checked: false }])
  assert.deepEqual(yes.pendingAsks, [])

  const no = walk(graph, DRY_TUESDAY, { gym: false })
  assert.deepEqual(no.items, [])
})

// -- the four required cases --------------------------------------------------

test('an unconnected branch produces nothing', () => {
  // YES branch has an item, NO branch grabs nothing — and the condition is false.
  const graph: RoutineGraph = {
    nodes: [
      node('w1', 'weather', 'Rain likely', { metric: 'precip', op: 'gte', value: 40 }),
      node('umbrella', 'item', 'Umbrella'),
    ],
    edges: [edge(START_ID, null, 'w1'), edge('w1', 'yes', 'umbrella')],
  }
  const { items, pendingAsks } = walk(graph, DRY_TUESDAY, {})
  assert.deepEqual(items, [])
  assert.deepEqual(pendingAsks, [])
})

test('an unanswered ask node stops that path and is reported once', () => {
  const graph: RoutineGraph = {
    nodes: [
      node('gym', 'ask', 'Gym today?', { tag: 'GYM' }),
      node('shoes', 'item', 'Gym shoes'),
      node('keys', 'item', 'Keys'),
    ],
    edges: [
      edge(START_ID, null, 'gym'),
      edge(START_ID, null, 'keys'),
      edge('gym', 'yes', 'shoes'),
    ],
  }
  const { items, pendingAsks } = walk(graph, DRY_TUESDAY, {})
  assert.deepEqual(pendingAsks, ['gym'])
  // The rest of the graph still walks.
  assert.deepEqual(items.map((i) => i.id), ['keys'])
})

test('an item reachable by two paths appears only once', () => {
  const graph: RoutineGraph = {
    nodes: [
      node('w1', 'weather', 'Rain likely', { metric: 'precip', op: 'gte', value: 40, tag: 'RAIN' }),
      node('jacket', 'item', 'Jacket'),
    ],
    edges: [
      edge(START_ID, null, 'w1'),
      edge(START_ID, null, 'jacket'), // direct path
      edge('w1', 'yes', 'jacket'), // and via the weather node
    ],
  }
  const { items } = walk(graph, { ...DRY_TUESDAY, weather: rainy }, {})
  assert.equal(items.length, 1)
  assert.equal(items[0].id, 'jacket')
})

test('a cycle in the graph does not hang the walker', () => {
  const graph: RoutineGraph = {
    nodes: [
      node('a', 'ask', 'A?'),
      node('b', 'ask', 'B?'),
      node('keys', 'item', 'Keys'),
    ],
    edges: [
      edge(START_ID, null, 'a'),
      edge('a', 'yes', 'b'),
      edge('b', 'yes', 'a'), // cycle a -> b -> a
      edge('b', 'no', 'keys'),
    ],
  }
  const { items } = walk(graph, DRY_TUESDAY, { a: true, b: false })
  assert.deepEqual(items.map((i) => i.id), ['keys'])
})

// -- defensive cases ----------------------------------------------------------

test('missing weather resolves neither branch of a weather node', () => {
  const graph: RoutineGraph = {
    nodes: [
      node('w1', 'weather', 'Rain likely', { metric: 'precip', op: 'gte', value: 40 }),
      node('umbrella', 'item', 'Umbrella'),
      node('sunglasses', 'item', 'Sunglasses'),
    ],
    edges: [
      edge(START_ID, null, 'w1'),
      edge('w1', 'yes', 'umbrella'),
      edge('w1', 'no', 'sunglasses'),
    ],
  }
  const { items } = walk(graph, { weekday: 2, weather: null }, {})
  assert.deepEqual(items, [])
})

test('dangling edges and empty graphs are harmless', () => {
  assert.deepEqual(walk({ nodes: [], edges: [] }, DRY_TUESDAY, {}), {
    items: [],
    pendingAsks: [],
  })
  const graph: RoutineGraph = {
    nodes: [],
    edges: [edge(START_ID, null, 'ghost')],
  }
  assert.deepEqual(walk(graph, DRY_TUESDAY, {}).items, [])
})

test('items chained off an item carry the tag through', () => {
  const graph: RoutineGraph = {
    nodes: [
      node('gym', 'ask', 'Gym today?', { tag: 'GYM' }),
      node('shoes', 'item', 'Gym shoes'),
      node('towel', 'item', 'Towel'),
    ],
    edges: [
      edge(START_ID, null, 'gym'),
      edge('gym', 'yes', 'shoes'),
      edge('shoes', null, 'towel'),
    ],
  }
  const { items } = walk(graph, DRY_TUESDAY, { gym: true })
  assert.deepEqual(items.map((i) => [i.id, i.tag]), [
    ['shoes', 'GYM'],
    ['towel', 'GYM'],
  ])
})
