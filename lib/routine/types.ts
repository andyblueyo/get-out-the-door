// The graph vocabulary shared by the builder, the walker, and the checklist.
// This module is pure types — no React, no Supabase.

export type BranchLabel = 'yes' | 'no'

export type NodeType = 'weather' | 'day' | 'ask' | 'item'

export type WeatherMetric = 'precip' | 'temp_max' | 'temp_min'
export type WeatherOp = 'gte' | 'lte'

export interface WeatherNodeConfig {
  metric: WeatherMetric
  /** precip is %, temps are °F */
  op: WeatherOp
  value: number
  /** tag applied to items reached through this node's YES branch, e.g. RAIN */
  tag?: string
}

export interface DayNodeConfig {
  /** 0 = Sunday … 6 = Saturday */
  days: number[]
  tag?: string
}

export interface AskNodeConfig {
  tag?: string
}

// Item nodes have no config today; keep the alias so adding one isn't a refactor.
export type ItemNodeConfig = Record<string, never>

export type NodeConfig =
  | WeatherNodeConfig
  | DayNodeConfig
  | AskNodeConfig
  | ItemNodeConfig

export interface RoutineNode {
  id: string
  type: NodeType
  label: string
  config: NodeConfig
  x: number
  y: number
}

export interface RoutineEdge {
  id: string
  /** node id, or 'start' for the implicit START block */
  from: string
  /** null = unconditional (straight off START, or chained off an item) */
  fromBranch: BranchLabel | null
  to: string
}

export interface RoutineGraph {
  nodes: RoutineNode[]
  edges: RoutineEdge[]
}

/** Condensed daily forecast the walker evaluates weather nodes against. */
export interface WeatherFacts {
  /** daily max precipitation probability, % */
  precipProbability: number
  tempMaxF: number
  tempMinF: number
  /** WMO weather code */
  code: number
}

export interface TicketItem {
  id: string
  label: string
  tag: string
  checked: boolean
}

export interface WalkConditions {
  /** null = not fetched; weather nodes then resolve neither branch */
  weather: WeatherFacts | null
  /** 0 = Sunday … 6 = Saturday, in the user's local timezone */
  weekday: number
}

export type Answers = Record<string, boolean>

export interface WalkResult {
  items: TicketItem[]
  /** ask-node ids encountered without an answer; traversal stopped there */
  pendingAsks: string[]
}
