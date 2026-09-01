'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { START_ID } from '@/lib/routine/walk'
import type {
  BranchLabel,
  NodeType,
  RoutineEdge,
  RoutineGraph,
  RoutineNode,
} from '@/lib/routine/types'
import type { Database } from '@/lib/database.types'
import StepNode, {
  defaultNode,
  outHandlePoint,
  startOutPoint,
  START_H,
  START_POS,
  START_W,
} from './StepNode'
import EdgesLayer, { type ConnectingState } from './EdgesLayer'
import Palette from './Palette'
import PreviewDrawer from './PreviewDrawer'

type Routine = Database['public']['Tables']['routines']['Row']

const CANVAS_W = 2400
const CANVAS_H = 1600
const GRID = 9

const snap = (v: number) => Math.max(0, Math.round(v / GRID) * GRID)
const uid = (prefix: string) => `${prefix}${crypto.randomUUID().slice(0, 8)}`

type Selection = { kind: 'node' | 'edge'; id: string } | null
type SaveState = 'saved' | 'dirty' | 'saving' | 'error'

export default function Builder({ routine }: { routine: Routine }) {
  const supabase = useMemo(() => createClient(), [])
  const [nodes, setNodes] = useState<RoutineNode[]>(routine.graph?.nodes ?? [])
  const [edges, setEdges] = useState<RoutineEdge[]>(routine.graph?.edges ?? [])
  const [name, setName] = useState(routine.name)
  const [selection, setSelection] = useState<Selection>(null)
  const [connecting, setConnecting] = useState<ConnectingState | null>(null)
  const [showPreview, setShowPreview] = useState(true)
  const [saveState, setSaveState] = useState<SaveState>('saved')

  const scrollRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const firstRender = useRef(true)

  const graph: RoutineGraph = useMemo(() => ({ nodes, edges }), [nodes, edges])

  // ---- autosave -------------------------------------------------------------

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    setSaveState('dirty')
    const timer = setTimeout(async () => {
      setSaveState('saving')
      const { error } = await supabase
        .from('routines')
        .update({
          name,
          graph: { nodes, edges },
          updated_at: new Date().toISOString(),
        })
        .eq('id', routine.id)
      setSaveState(error ? 'error' : 'saved')
    }, 1200)
    return () => clearTimeout(timer)
  }, [nodes, edges, name, routine.id, supabase])

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (saveState !== 'saved') e.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [saveState])

  // ---- helpers ---------------------------------------------------------------

  const toCanvas = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return { x: clientX - rect.left, y: clientY - rect.top }
  }, [])

  function updateNode(id: string, patch: Partial<RoutineNode>) {
    setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, ...patch } : n)))
  }

  function addNode(type: NodeType) {
    const scroll = scrollRef.current
    const baseX = (scroll?.scrollLeft ?? 0) + 280
    const baseY = (scroll?.scrollTop ?? 0) + 100
    const jitter = (nodes.length % 6) * 27
    const node = defaultNode(type, snap(baseX + jitter), snap(baseY + jitter), uid('n'))
    setNodes((ns) => [...ns, node])
    setSelection({ kind: 'node', id: node.id })
  }

  function deleteSelection() {
    if (!selection) return
    if (selection.kind === 'node') {
      const id = selection.id
      setNodes((ns) => ns.filter((n) => n.id !== id))
      setEdges((es) => es.filter((e) => e.from !== id && e.to !== id))
    } else {
      const id = selection.id
      setEdges((es) => es.filter((e) => e.id !== id))
    }
    setSelection(null)
  }

  // ---- keyboard ---------------------------------------------------------------

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        deleteSelection()
      }
      if (e.key === 'Escape') setConnecting(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  // ---- node dragging ------------------------------------------------------------

  function onNodePointerDown(e: React.PointerEvent, node: RoutineNode) {
    const target = e.target as HTMLElement
    if (target.closest('input, select, button, .sn-handle')) return
    e.preventDefault()
    setSelection({ kind: 'node', id: node.id })

    const start = toCanvas(e.clientX, e.clientY)
    const offX = start.x - node.x
    const offY = start.y - node.y
    const id = node.id

    function onMove(ev: PointerEvent) {
      const p = toCanvas(ev.clientX, ev.clientY)
      updateNode(id, { x: snap(p.x - offX), y: snap(p.y - offY) })
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  // ---- connecting ----------------------------------------------------------------

  function startConnect(from: string, branch: BranchLabel | null, e: React.PointerEvent) {
    e.preventDefault()
    const origin =
      from === START_ID
        ? startOutPoint()
        : outHandlePoint(nodes.find((n) => n.id === from)!, branch as BranchLabel)
    const cursor = toCanvas(e.clientX, e.clientY)
    setConnecting({ from, branch, x: origin.x, y: origin.y, cx: cursor.x, cy: cursor.y })

    function onMove(ev: PointerEvent) {
      const p = toCanvas(ev.clientX, ev.clientY)
      setConnecting((c) => (c ? { ...c, cx: p.x, cy: p.y } : c))
    }
    function onUp(ev: PointerEvent) {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      const el = document.elementFromPoint(ev.clientX, ev.clientY)
      const targetId = el?.closest('[data-node-id]')?.getAttribute('data-node-id')
      setConnecting(null)
      if (!targetId || targetId === from || targetId === START_ID) return
      setEdges((es) => {
        // One edge per branch handle (replace); START allows fan-out but no dupes.
        const kept =
          from === START_ID
            ? es.filter((x) => !(x.from === from && x.to === targetId))
            : es.filter((x) => !(x.from === from && x.fromBranch === branch))
        return [...kept, { id: uid('e'), from, fromBranch: branch, to: targetId }]
      })
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  // ---- render -----------------------------------------------------------------

  const hasEdge = (from: string, branch: BranchLabel) =>
    edges.some((e) => e.from === from && e.fromBranch === branch)
  const hasIn = (to: string) => edges.some((e) => e.to === to)
  const startConnected = edges.some((e) => e.from === START_ID)

  const statusText = {
    saved: 'saved',
    dirty: 'unsaved',
    saving: 'saving…',
    error: 'save failed — retrying on next change',
  }[saveState]

  return (
    <div className="builder">
      <header className="builder-header">
        <Link className="builder-back" href="/routines">
          &larr; Routines
        </Link>
        <input
          className="builder-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Routine name"
        />
        <span className={`builder-status${saveState === 'error' ? ' error' : ''}`}>
          {statusText}
        </span>
        <span className="builder-spacer" />
        <button
          className="builder-toggle"
          onClick={() => setShowPreview((v) => !v)}
          aria-pressed={showPreview}
        >
          Preview
        </button>
      </header>

      <div className="builder-main">
        <Palette onAdd={addNode} />

        <div className="canvas-scroll" ref={scrollRef}>
          <div
            className="canvas"
            ref={canvasRef}
            style={{ width: CANVAS_W, height: CANVAS_H }}
            onPointerDown={(e) => {
              if (e.target === canvasRef.current) setSelection(null)
            }}
          >
            <EdgesLayer
              width={CANVAS_W}
              height={CANVAS_H}
              nodes={nodes}
              edges={edges}
              selectedEdgeId={selection?.kind === 'edge' ? selection.id : null}
              onSelectEdge={(id) => setSelection({ kind: 'edge', id })}
              connecting={connecting}
            />

            <div
              className="start-node"
              style={{
                left: START_POS.x,
                top: START_POS.y,
                width: START_W,
                height: START_H,
              }}
            >
              Start
              <span
                className={`sn-handle out${startConnected ? ' filled' : ''}`}
                onPointerDown={(e) => {
                  e.stopPropagation()
                  startConnect(START_ID, null, e)
                }}
              />
            </div>

            {nodes.map((node) => (
              <StepNode
                key={node.id}
                node={node}
                selected={selection?.kind === 'node' && selection.id === node.id}
                hasYes={hasEdge(node.id, 'yes')}
                hasNo={hasEdge(node.id, 'no')}
                hasIn={hasIn(node.id)}
                onPointerDownNode={(e) => onNodePointerDown(e, node)}
                onStartConnect={(branch, e) => startConnect(node.id, branch, e)}
                onChange={(patch) => updateNode(node.id, patch)}
              />
            ))}
          </div>
        </div>

        {showPreview && <PreviewDrawer graph={graph} />}
      </div>
    </div>
  )
}
