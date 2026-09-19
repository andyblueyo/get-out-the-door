'use client'

// "Where the list comes from": a read-only copy of the routine builder with a
// working preview drawer. Nodes, edges and palette copy are the builder's own
// components, so this stays in step with node variant changes in StepNode.tsx.

import { useState } from 'react'
import EdgesLayer from '@/components/builder/EdgesLayer'
import { PALETTE } from '@/components/builder/Palette'
import StepNode, {
  ITEM_H,
  START_H,
  START_POS,
  START_W,
  inHandlePoint,
  nodeHeight,
  outHandlePoint,
} from '@/components/builder/StepNode'
import Ticket from '@/components/ticket/Ticket'
import { evalWeather, START_ID, walk } from '@/lib/routine/walk'
import { summarizeWeather } from '@/lib/weather'
import type {
  Answers,
  BranchLabel,
  DayNodeConfig,
  RoutineNode,
  WeatherFacts,
  WeatherNodeConfig,
} from '@/lib/routine/types'
import { CHECK_NO, CLEAR, DEMO_CANVAS, DEMO_GRAPH, FRIDAY, RAINY, SATURDAY } from './demo'
import '@/app/routines/[id]/builder.css'

/** Which branch a node takes this morning — the same rules walk() applies. */
function branchTaken(
  node: RoutineNode,
  weather: WeatherFacts,
  weekday: number,
  answers: Answers
): BranchLabel | null {
  let outcome: boolean | null = null
  if (node.type === 'weather') outcome = evalWeather(node.config as WeatherNodeConfig, weather)
  else if (node.type === 'day') outcome = ((node.config as DayNodeConfig).days ?? []).includes(weekday)
  else if (node.type === 'ask') outcome = typeof answers[node.id] === 'boolean' ? answers[node.id] : null
  return outcome === null ? null : outcome ? 'yes' : 'no'
}

const nodeById = (id: string) => DEMO_GRAPH.nodes.find((n) => n.id === id)!

export default function RoutineDemo() {
  const [rainy, setRainy] = useState(true)
  const [friday, setFriday] = useState(true)
  const [answers, setAnswers] = useState<Answers>({})
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  const weather = rainy ? RAINY : CLEAR
  const day = friday ? FRIDAY : SATURDAY
  const { items, pendingAsks } = walk(DEMO_GRAPH, { weather, weekday: day.weekday }, answers)
  const reached = new Set(items.map((i) => i.id))
  const taken = (id: string) => branchTaken(nodeById(id), weather, day.weekday, answers)

  const rows = items.map((item) => ({ ...item, checked: !!checked[item.id] }))
  const allSet = rows.length > 0 && rows.every((r) => r.checked)
  const asks = pendingAsks.map((id) => ({ id, label: nodeById(id).label }))

  const hasEdge = (from: string, branch: BranchLabel) =>
    DEMO_GRAPH.edges.some((e) => e.from === from && e.fromBranch === branch)
  const hasIn = (to: string) => DEMO_GRAPH.edges.some((e) => e.to === to)

  function cycleAnswer(id: string) {
    setAnswers((prev) => {
      const next = { ...prev }
      if (prev[id] === undefined) next[id] = true
      else if (prev[id] === true) next[id] = false
      else delete next[id]
      return next
    })
  }

  // margin notes on the canvas, anchored to real handle/edge positions
  const rainNo = outHandlePoint(nodeById('rain'), 'no')
  const umbrella = nodeById('umbrella')
  const tornAt = { x: umbrella.x + 127, y: umbrella.y }

  return (
    <>
      <div className="lp-demo-window">
        <div className="builder-header">
          <span className="builder-back">&larr; Routines</span>
          <span className="builder-name lp-demo-name">Leaving the apartment</span>
          <span className="builder-status">saved</span>
          <span className="builder-spacer" />
          <span className="builder-toggle lp-demo-pressed">Preview</span>
        </div>

        <div className="lp-demo-main">
          <div className="palette">
            <p className="palette-title">Nodes</p>
            {PALETTE.map((entry) => (
              <div key={entry.type} className={`pal-item${entry.type === 'item' ? ' torn' : ''}`}>
                <span className="pal-item-title">{entry.title}</span>
                <span className="pal-item-hint">{entry.hint}</span>
              </div>
            ))}
          </div>

          <div className="canvas-scroll">
            <div className="canvas" style={DEMO_CANVAS}>
              <EdgesLayer
                width={DEMO_CANVAS.width}
                height={DEMO_CANVAS.height}
                nodes={DEMO_GRAPH.nodes}
                edges={DEMO_GRAPH.edges}
                edgeClassName={(e) =>
                  e.from === START_ID || taken(e.from) === e.fromBranch ? undefined : 'off'
                }
              />

              <svg className="lp-canvas-notes" width={DEMO_CANVAS.width} height={DEMO_CANVAS.height} aria-hidden>
                <path
                  className="lp-canvas-lead"
                  d={`M ${rainNo.x + 6} ${rainNo.y} H ${rainNo.x + 24} V ${rainNo.y + 26} H ${rainNo.x + 44}`}
                />
                <path className="lp-canvas-lead" d={`M ${tornAt.x} ${tornAt.y} V ${tornAt.y - 16}`} />
                <rect className="lp-canvas-lead-end" x={tornAt.x - 2.5} y={tornAt.y - 2.5} width={5} height={5} />
              </svg>

              <div
                className="start-node"
                style={{ left: START_POS.x, top: START_POS.y, width: START_W, height: START_H }}
              >
                Start
                <span className="sn-handle out filled" />
              </div>

              {DEMO_GRAPH.nodes.map((node) => (
                <StepNode
                  key={node.id}
                  node={node}
                  readOnly
                  hasYes={hasEdge(node.id, 'yes')}
                  hasNo={hasEdge(node.id, 'no')}
                  hasIn={hasIn(node.id)}
                  taken={node.type === 'item' ? null : taken(node.id)}
                  dimmed={node.type === 'item' && !reached.has(node.id)}
                />
              ))}

              <p className="lp-canvas-note" style={{ left: rainNo.x + 50, top: rainNo.y + 18, width: 230 }}>
                Open square: this branch grabs nothing.
              </p>
              <p className="lp-canvas-note" style={{ left: tornAt.x - 80, top: tornAt.y - 68, width: 168 }}>
                Dashed top: torn off the pad. Items print on the ticket.
              </p>
            </div>
          </div>

          <aside className="drawer">
            <p className="drawer-title">Preview</p>

            <div className="drawer-section">
              <h3>Weather</h3>
              <div className="lp-seg">
                <button aria-pressed={rainy} onClick={() => setRainy(true)}>
                  Rain {RAINY.precipProbability}%
                </button>
                <button aria-pressed={!rainy} onClick={() => setRainy(false)}>
                  Clear {CLEAR.precipProbability}%
                </button>
              </div>
            </div>

            <div className="drawer-section">
              <h3>Day</h3>
              <div className="lp-seg">
                <button aria-pressed={friday} onClick={() => setFriday(true)}>
                  Fri
                </button>
                <button aria-pressed={!friday} onClick={() => setFriday(false)}>
                  Sat
                </button>
              </div>
            </div>

            <div className="drawer-section">
              <h3>Questions</h3>
              <button className="drawer-ask" onClick={() => cycleAnswer('gym')}>
                <span className="drawer-ask-label">{nodeById('gym').label}</span>
                <span className="drawer-ask-value">
                  {answers.gym === undefined ? '—' : answers.gym ? 'YES' : 'NO'}
                </span>
              </button>
            </div>

            <div className="lp-demo-well">
              <div className="lp-demo-scale">
                <Ticket
                  dateLabel={day.dateLabel}
                  weatherLabel={summarizeWeather(weather)}
                  checkNo={CHECK_NO}
                  items={rows}
                  asks={asks}
                  onToggle={(id) => setChecked((prev) => ({ ...prev, [id]: !prev[id] }))}
                  onAnswer={(id, answer) => setAnswers((prev) => ({ ...prev, [id]: answer }))}
                  allSet={allSet}
                  minRows={5}
                  signOff={allSet ? 'thank you, have a good day' : 'take your time'}
                />
              </div>
            </div>
          </aside>
        </div>
      </div>

      <MiniDiagram />
    </>
  )
}

// Phones and small tablets: one weather node and its item, plus a legend for
// the line vocabulary. The builder itself is desktop-first.
function MiniDiagram() {
  const rain: RoutineNode = { ...nodeById('rain'), x: 18, y: 18 }
  const umbrella: RoutineNode = { ...nodeById('umbrella'), x: 72, y: 234 }
  const inRain = inHandlePoint(rain)
  const yes = outHandlePoint(rain, 'yes')
  const inUmbrella = inHandlePoint(umbrella)
  const midY = Math.round((rain.y + nodeHeight(rain) + umbrella.y) / 2)
  const height = umbrella.y + ITEM_H + 27

  return (
    <div className="lp-mini">
      <div className="canvas lp-mini-canvas" style={{ height }}>
        <svg className="edges-layer" width="100%" height={height} aria-hidden>
          <path className="edge" d={`M 0 ${inRain.y} H ${inRain.x}`} />
          <path
            className="edge"
            d={`M ${yes.x} ${yes.y} H ${yes.x + 24} V ${midY} H ${umbrella.x - 27} V ${inUmbrella.y} H ${inUmbrella.x}`}
          />
        </svg>
        <StepNode node={rain} readOnly hasYes hasNo={false} hasIn taken="yes" />
        <StepNode node={umbrella} readOnly hasYes={false} hasNo={false} hasIn />
      </div>

      <ul className="lp-legend">
        <li>
          <span className="lp-legend-glyph">
            <span className="sn-handle filled" />
          </span>
          Filled square: that branch leads somewhere.
        </li>
        <li>
          <span className="lp-legend-glyph">
            <span className="sn-handle" />
          </span>
          Open square: that branch grabs nothing.
        </li>
        <li>
          <span className="lp-legend-glyph">
            <span className="lp-legend-item" />
          </span>
          Dashed top: an item. It prints on the ticket.
        </li>
      </ul>
      <p className="lp-mini-note">The builder is made for a laptop. The ticket is made for this.</p>
    </div>
  )
}
