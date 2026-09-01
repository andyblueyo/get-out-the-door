'use client'

// Preview drawer: scenario overrides (weather / day / ask answers) driving a
// live, scaled ticket through the same walk() the checklist uses.

import { useMemo, useState } from 'react'
import Ticket from '@/components/ticket/Ticket'
import { walk } from '@/lib/routine/walk'
import { summarizeWeather } from '@/lib/weather'
import type { Answers, RoutineGraph, WeatherFacts } from '@/lib/routine/types'

const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

export default function PreviewDrawer({ graph }: { graph: RoutineGraph }) {
  const [precip, setPrecip] = useState(10)
  const [high, setHigh] = useState(75)
  const [low, setLow] = useState(58)
  const [weekday, setWeekday] = useState(() => new Date().getDay())
  const [answers, setAnswers] = useState<Answers>({})

  const askNodes = graph.nodes.filter((n) => n.type === 'ask')

  const weather: WeatherFacts = useMemo(
    () => ({
      precipProbability: precip,
      tempMaxF: high,
      tempMinF: low,
      code: precip >= 50 ? 63 : precip >= 20 ? 3 : 0,
    }),
    [precip, high, low]
  )

  const result = useMemo(
    () => walk(graph, { weather, weekday }, answers),
    [graph, weather, weekday, answers]
  )

  const askById = new Map(graph.nodes.map((n) => [n.id, n]))
  const pending = result.pendingAsks
    .map((id) => ({ id, label: askById.get(id)?.label ?? '' }))
    .filter((a) => a.label)

  function cycleAnswer(id: string) {
    setAnswers((prev) => {
      const current = prev[id]
      const next = { ...prev }
      if (current === undefined) next[id] = true
      else if (current === true) next[id] = false
      else delete next[id]
      return next
    })
  }

  return (
    <aside className="drawer">
      <h2 className="drawer-title">Preview</h2>

      <div className="drawer-section">
        <h3>Weather</h3>
        <label className="drawer-field">
          <span>Rain %</span>
          <input
            type="number"
            min={0}
            max={100}
            value={precip}
            onChange={(e) => setPrecip(Number(e.target.value))}
          />
        </label>
        <label className="drawer-field">
          <span>High °F</span>
          <input type="number" value={high} onChange={(e) => setHigh(Number(e.target.value))} />
        </label>
        <label className="drawer-field">
          <span>Low °F</span>
          <input type="number" value={low} onChange={(e) => setLow(Number(e.target.value))} />
        </label>
      </div>

      <div className="drawer-section">
        <h3>Day</h3>
        <div className="drawer-days">
          {DAY_LABELS.map((label, i) => (
            <button
              key={label}
              className={`day-toggle${weekday === i ? ' on' : ''}`}
              onClick={() => setWeekday(i)}
            >
              {label[0]}
            </button>
          ))}
        </div>
      </div>

      {askNodes.length > 0 && (
        <div className="drawer-section">
          <h3>Questions</h3>
          {askNodes.map((n) => {
            const a = answers[n.id]
            return (
              <button key={n.id} className="drawer-ask" onClick={() => cycleAnswer(n.id)}>
                <span className="drawer-ask-label">{n.label || '(untitled)'}</span>
                <span className="drawer-ask-value">
                  {a === undefined ? '—' : a ? 'YES' : 'NO'}
                </span>
              </button>
            )
          })}
        </div>
      )}

      <div className="drawer-ticket">
        <Ticket
          dateLabel={DAY_LABELS[weekday]}
          weatherLabel={summarizeWeather(weather)}
          checkNo="Nº 0000"
          items={result.items}
          asks={pending}
          minRows={5}
          signOff="thank you, have a good day"
        />
      </div>
    </aside>
  )
}
