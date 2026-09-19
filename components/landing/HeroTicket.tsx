'use client'

// The landing page's hero: a live sample ticket with margin notes pinned to
// the parts they describe. Wide screens get leader-line callouts; narrower
// ones get numbered markers and a key underneath (CSS picks which).

import { Fragment, useLayoutEffect, useRef, useState } from 'react'
import Ticket from '@/components/ticket/Ticket'
import { walk } from '@/lib/routine/walk'
import { summarizeWeather } from '@/lib/weather'
import type { Answers } from '@/lib/routine/types'
import { CHECK_NO, DEMO_GRAPH, FRIDAY, HERO_SUBWAY, RAINY } from './demo'

interface Note {
  key: string
  text: string
  find: (root: HTMLElement) => Element | null | undefined
}

// Positions are measured from the rendered ticket, not hard-coded, so they
// follow any change to ticket.css or to the rows the walk produces.
const NOTES: Note[] = [
  {
    key: 'meta',
    text: 'Date and forecast, filled in when you tap.',
    find: (root) => root.querySelector('.gc-meta'),
  },
  {
    key: 'train',
    text: 'Live trains from the MTA. New York only, for now.',
    find: (root) => root.querySelector('.gc-leave'),
  },
  {
    key: 'ask',
    text: 'If it can’t tell, it asks.',
    find: (root) => root.querySelector('.gc-ask-btns')?.closest('.gc-row'),
  },
  {
    key: 'rain',
    text: 'On today’s list because rain is 70% likely.',
    find: (root) =>
      Array.from(root.querySelectorAll('.gc-row')).find(
        (row) => row.querySelector('.gc-row-label')?.textContent === 'Umbrella'
      ),
  },
  {
    key: 'done',
    text: 'Tap when you leave. Tomorrow prints fresh.',
    find: (root) => root.querySelector('.gc-footer'),
  },
]

export default function HeroTicket() {
  const [answers, setAnswers] = useState<Answers>({})
  const [checked, setChecked] = useState<Record<string, boolean>>({ keys: true })
  const [completed, setCompleted] = useState(false)
  const [pins, setPins] = useState<Record<string, number>>({})
  const pinnedRef = useRef<HTMLDivElement>(null)

  const { items, pendingAsks } = walk(
    DEMO_GRAPH,
    { weather: RAINY, weekday: FRIDAY.weekday },
    answers
  )
  const rows = items.map((item) => ({ ...item, checked: !!checked[item.id] }))
  const allSet = completed || (rows.length > 0 && rows.every((r) => r.checked))
  const asks = pendingAsks.map((id) => ({
    id,
    label: DEMO_GRAPH.nodes.find((n) => n.id === id)?.label ?? '',
  }))

  useLayoutEffect(() => {
    const root = pinnedRef.current
    if (!root) return
    const measure = () => {
      const top = root.getBoundingClientRect().top
      const next: Record<string, number> = {}
      for (const note of NOTES) {
        const box = note.find(root)?.getBoundingClientRect()
        if (box) next[note.key] = Math.round(box.top - top + box.height / 2)
      }
      setPins(next)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(root)
    void document.fonts?.ready.then(measure)
    return () => observer.disconnect()
  }, [answers, completed])

  function reset() {
    setAnswers({})
    setChecked({})
    setCompleted(false)
  }

  return (
    <div className="lp-hero-ticket">
      <div className="lp-pinned" ref={pinnedRef}>
        <Ticket
          dateLabel={FRIDAY.dateLabel}
          weatherLabel={summarizeWeather(RAINY)}
          checkNo={CHECK_NO}
          items={rows}
          subway={HERO_SUBWAY}
          asks={asks}
          onToggle={(id) => setChecked((prev) => ({ ...prev, [id]: !prev[id] }))}
          onAnswer={(id, answer) => setAnswers((prev) => ({ ...prev, [id]: answer }))}
          allSet={allSet}
          minRows={5}
          footer={
            completed ? (
              <button className="btn btn-outline" onClick={reset}>
                Start a fresh ticket
              </button>
            ) : (
              <button className="btn" onClick={() => setCompleted(true)}>
                Done — heading out
              </button>
            )
          }
          signOff={allSet ? 'thank you, have a good day' : 'take your time'}
        />

        {NOTES.map((note, i) =>
          pins[note.key] === undefined ? null : (
            <Fragment key={note.key}>
              <p className="lp-callout" style={{ top: pins[note.key] }}>
                <span className="lp-leader" aria-hidden />
                {note.text}
              </p>
              <span className="lp-marker" style={{ top: pins[note.key] }} aria-hidden>
                {i + 1}
              </span>
            </Fragment>
          )
        )}
      </div>

      <ol className="lp-key">
        {NOTES.map((note, i) => (
          <li key={note.key}>
            <span className="lp-marker" aria-hidden>
              {i + 1}
            </span>
            {note.text}
          </li>
        ))}
      </ol>
    </div>
  )
}
