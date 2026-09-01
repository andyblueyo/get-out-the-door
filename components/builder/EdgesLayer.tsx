'use client'

// Orthogonal connectors with square corners. Reads all geometry from
// StepNode.tsx helpers — no node measurements live here.

import type { RoutineEdge, RoutineNode } from '@/lib/routine/types'
import { START_ID } from '@/lib/routine/walk'
import {
  inHandlePoint,
  nodeHeight,
  nodeWidth,
  outHandlePoint,
  startOutPoint,
} from './StepNode'

export interface ConnectingState {
  from: string // node id or 'start'
  branch: 'yes' | 'no' | null
  x: number // start point (canvas coords)
  y: number
  cx: number // cursor (canvas coords)
  cy: number
}

function orthoPath(x1: number, y1: number, x2: number, y2: number): string {
  const mx = x2 > x1 + 36 ? Math.round((x1 + x2) / 2) : x1 + 18
  return `M ${x1} ${y1} L ${mx} ${y1} L ${mx} ${y2} L ${x2} ${y2}`
}

export default function EdgesLayer({
  width,
  height,
  nodes,
  edges,
  selectedEdgeId,
  onSelectEdge,
  connecting,
}: {
  width: number
  height: number
  nodes: RoutineNode[]
  edges: RoutineEdge[]
  selectedEdgeId: string | null
  onSelectEdge: (id: string) => void
  connecting: ConnectingState | null
}) {
  const byId = new Map(nodes.map((n) => [n.id, n]))

  return (
    <svg className="edges-layer" width={width} height={height} aria-hidden>
      {edges.map((edge) => {
        const target = byId.get(edge.to)
        if (!target) return null
        let from: { x: number; y: number }
        if (edge.from === START_ID) {
          from = startOutPoint()
        } else {
          const source = byId.get(edge.from)
          if (!source) return null
          // The builder doesn't create edges off items, but the walker supports
          // them — draw such edges from the item's right edge just in case.
          from =
            source.type === 'item' || edge.fromBranch === null
              ? { x: source.x + nodeWidth(source), y: source.y + nodeHeight(source) / 2 }
              : outHandlePoint(source, edge.fromBranch)
        }
        const to = inHandlePoint(target)
        const d = orthoPath(from.x, from.y, to.x, to.y)
        const selected = edge.id === selectedEdgeId
        return (
          <g key={edge.id}>
            <path className={`edge${selected ? ' selected' : ''}`} d={d} />
            <path
              className="edge-hit"
              d={d}
              onClick={(e) => {
                e.stopPropagation()
                onSelectEdge(edge.id)
              }}
            />
          </g>
        )
      })}

      {connecting && (
        <path
          className="edge preview"
          d={orthoPath(connecting.x, connecting.y, connecting.cx, connecting.cy)}
        />
      )}
    </svg>
  )
}
