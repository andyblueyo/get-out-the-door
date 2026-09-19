'use client'

// Step node — variant A ("banded rows"): caps band, body row, YES row, NO row.
// Variants B/C/D are live alternates, so ALL node geometry and rendering live
// in this one file. The canvas reads positions through the exported helpers —
// swapping the variant should not touch Builder.tsx or EdgesLayer.tsx.

import type {
  AskNodeConfig,
  BranchLabel,
  DayNodeConfig,
  NodeType,
  RoutineNode,
  WeatherNodeConfig,
} from '@/lib/routine/types'

export const NODE_W = 220
export const ITEM_W = 200
export const BAND_H = 26
export const BODY_H = 42
export const CONFIG_H = 34
export const BRANCH_H = 30
export const ITEM_H = 44

export const START_POS = { x: 45, y: 90 }
export const START_W = 99
export const START_H = 36

const TYPE_LABEL: Record<NodeType, string> = {
  weather: 'Weather',
  day: 'Day',
  ask: 'Ask',
  item: 'Item',
}

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

const METRIC_LABEL: Record<WeatherNodeConfig['metric'], string> = {
  precip: 'rain %',
  temp_max: 'high °F',
  temp_min: 'low °F',
}

function configHeight(type: NodeType): number {
  return type === 'weather' || type === 'day' ? CONFIG_H : 0
}

export function nodeWidth(node: RoutineNode): number {
  return node.type === 'item' ? ITEM_W : NODE_W
}

export function nodeHeight(node: RoutineNode): number {
  if (node.type === 'item') return ITEM_H
  return BAND_H + BODY_H + configHeight(node.type) + BRANCH_H * 2
}

export function outHandlePoint(node: RoutineNode, branch: BranchLabel) {
  const yesY = node.y + BAND_H + BODY_H + configHeight(node.type) + BRANCH_H / 2
  return {
    x: node.x + nodeWidth(node),
    y: branch === 'yes' ? yesY : yesY + BRANCH_H,
  }
}

export function inHandlePoint(node: RoutineNode) {
  return {
    x: node.x,
    y: node.y + (node.type === 'item' ? ITEM_H / 2 : BAND_H + BODY_H / 2),
  }
}

export function startOutPoint() {
  return { x: START_POS.x + START_W, y: START_POS.y + START_H / 2 }
}

interface StepNodeProps {
  node: RoutineNode
  selected?: boolean
  hasYes: boolean
  hasNo: boolean
  hasIn: boolean
  onPointerDownNode?: (e: React.PointerEvent) => void
  onStartConnect?: (branch: BranchLabel, e: React.PointerEvent) => void
  onChange?: (patch: Partial<RoutineNode>) => void
  /** Static rendering (landing-page demo): plain text instead of inputs, no handlers. */
  readOnly?: boolean
  /** Branch the previewed morning takes — its row is highlighted. */
  taken?: BranchLabel | null
  /** Not reached by the previewed morning. */
  dimmed?: boolean
}

export default function StepNode({
  node,
  selected = false,
  hasYes,
  hasNo,
  hasIn,
  onPointerDownNode,
  onStartConnect,
  onChange,
  readOnly = false,
  taken = null,
  dimmed = false,
}: StepNodeProps) {
  const isItem = node.type === 'item'
  const inTop = isItem ? ITEM_H / 2 : BAND_H + BODY_H / 2
  const tag = 'tag' in node.config ? (node.config.tag ?? '') : ''

  function setConfig(patch: object) {
    onChange?.({ config: { ...node.config, ...patch } })
  }

  const className =
    `step-node${isItem ? ' item' : ''}${selected ? ' selected' : ''}` +
    `${readOnly ? ' readonly' : ''}${dimmed ? ' dimmed' : ''}`

  return (
    <div
      className={className}
      style={{ left: node.x, top: node.y, width: nodeWidth(node) }}
      data-node-id={node.id}
      onPointerDown={readOnly ? undefined : onPointerDownNode}
    >
      {/* input handle — filled when some branch reaches this node */}
      <span
        className={`sn-handle in${hasIn ? ' filled' : ''}`}
        style={{ top: inTop }}
        aria-hidden
      />

      {!isItem && (
        <div className="sn-band">
          <span className="sn-type">{TYPE_LABEL[node.type]}</span>
          {readOnly ? (
            <span className="sn-tag">{tag}</span>
          ) : (
            <input
              className="sn-tag"
              value={tag}
              placeholder="tag"
              maxLength={8}
              onChange={(e) => setConfig({ tag: e.target.value.toUpperCase() })}
              onPointerDown={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}

      <div className="sn-body" style={isItem ? { minHeight: ITEM_H - 2 } : undefined}>
        {readOnly ? (
          <span className="sn-label">{node.label}</span>
        ) : (
          <input
            className="sn-label"
            value={node.label}
            placeholder={isItem ? 'Item…' : 'Condition…'}
            onChange={(e) => onChange?.({ label: e.target.value })}
            onPointerDown={(e) => e.stopPropagation()}
          />
        )}
      </div>

      {node.type === 'weather' &&
        (readOnly ? (
          <div className="sn-config">
            <span className="sn-static">
              {METRIC_LABEL[(node.config as WeatherNodeConfig).metric]}
            </span>
            <span className="sn-static">
              {(node.config as WeatherNodeConfig).op === 'lte' ? '≤' : '≥'}
            </span>
            <span className="sn-static">{(node.config as WeatherNodeConfig).value}</span>
          </div>
        ) : (
          <div className="sn-config" onPointerDown={(e) => e.stopPropagation()}>
            <select
              value={(node.config as WeatherNodeConfig).metric}
              onChange={(e) => setConfig({ metric: e.target.value })}
            >
              {Object.entries(METRIC_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={(node.config as WeatherNodeConfig).op}
              onChange={(e) => setConfig({ op: e.target.value })}
            >
              <option value="gte">&ge;</option>
              <option value="lte">&le;</option>
            </select>
            <input
              type="number"
              value={(node.config as WeatherNodeConfig).value}
              onChange={(e) => setConfig({ value: Number(e.target.value) })}
            />
          </div>
        ))}

      {node.type === 'day' && (
        <div
          className="sn-config"
          onPointerDown={readOnly ? undefined : (e) => e.stopPropagation()}
        >
          {DAY_LETTERS.map((letter, i) => {
            const days = (node.config as DayNodeConfig).days ?? []
            const on = days.includes(i)
            return readOnly ? (
              <span key={i} className={`day-toggle${on ? ' on' : ''}`}>
                {letter}
              </span>
            ) : (
              <button
                key={i}
                className={`day-toggle${on ? ' on' : ''}`}
                onClick={() =>
                  setConfig({
                    days: on ? days.filter((d) => d !== i) : [...days, i].sort(),
                  })
                }
              >
                {letter}
              </button>
            )
          })}
        </div>
      )}

      {!isItem && (
        <>
          <div className={`sn-branch${taken === 'yes' ? ' taken' : ''}`}>
            <span>Yes</span>
            <span
              className={`sn-handle out${hasYes ? ' filled' : ''}`}
              onPointerDown={
                readOnly
                  ? undefined
                  : (e) => {
                      e.stopPropagation()
                      onStartConnect?.('yes', e)
                    }
              }
            />
          </div>
          <div className={`sn-branch${taken === 'no' ? ' taken' : ''}`}>
            <span>No</span>
            <span
              className={`sn-handle out${hasNo ? ' filled' : ''}`}
              onPointerDown={
                readOnly
                  ? undefined
                  : (e) => {
                      e.stopPropagation()
                      onStartConnect?.('no', e)
                    }
              }
            />
          </div>
        </>
      )}
    </div>
  )
}

/** Default node payloads for the palette. */
export function defaultNode(type: NodeType, x: number, y: number, id: string): RoutineNode {
  switch (type) {
    case 'weather':
      return {
        id,
        type,
        label: 'Rain likely',
        config: { metric: 'precip', op: 'gte', value: 40, tag: 'RAIN' } satisfies WeatherNodeConfig,
        x,
        y,
      }
    case 'day':
      return {
        id,
        type,
        label: 'Work day',
        config: { days: [1, 2, 3, 4, 5], tag: 'WORK' } satisfies DayNodeConfig,
        x,
        y,
      }
    case 'ask':
      return {
        id,
        type,
        label: 'Going to the gym?',
        config: { tag: 'GYM' } satisfies AskNodeConfig,
        x,
        y,
      }
    case 'item':
      return { id, type, label: 'New item', config: {}, x, y }
  }
}
