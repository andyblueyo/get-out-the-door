'use client'

import type { ReactNode } from 'react'
import type { TicketItem } from '@/lib/routine/types'
import './ticket.css'

export interface AskPrompt {
  id: string
  label: string
}

interface TicketProps {
  dateLabel: string
  weatherLabel: string
  checkNo: string
  items: TicketItem[]
  /** unanswered ask nodes, rendered as question rows above the items */
  asks?: AskPrompt[]
  onToggle?: (id: string) => void
  onAnswer?: (id: string, answer: boolean) => void
  /** centered message row (no-routine / fetching / error states) */
  message?: ReactNode
  allSet?: boolean
  footer?: ReactNode
  signOff?: string
  minRows?: number
}

export default function Ticket({
  dateLabel,
  weatherLabel,
  checkNo,
  items,
  asks = [],
  onToggle,
  onAnswer,
  message,
  allSet = false,
  footer,
  signOff = 'thank you, have a good day',
  minRows = 8,
}: TicketProps) {
  const checkedCount = items.filter((i) => i.checked).length
  const rowCount = items.length + asks.length + (message ? 2 : 0)
  const fillerCount = Math.max(0, minRows - rowCount)

  return (
    <div className="gc">
      <header className="gc-head">
        <div className="gc-title">Threshold</div>
        <div className="gc-flourish">before you go</div>
      </header>

      <div className="gc-meta">
        <div>
          <span>Date</span>
          <strong>{dateLabel}</strong>
        </div>
        <div>
          <span>Weather</span>
          <strong>{weatherLabel}</strong>
        </div>
        <div>
          <span>Check</span>
          <strong>{checkNo}</strong>
        </div>
      </div>

      <div className="gc-rows">
        {allSet && <div className="gc-stamp">All set</div>}

        {message && <div className="gc-msg">{message}</div>}

        {asks.map((ask) => (
          <div className="gc-row" key={ask.id}>
            <span className="gc-row-label">{ask.label}</span>
            {onAnswer && (
              <span className="gc-ask-btns">
                <button className="gc-ask-btn" onClick={() => onAnswer(ask.id, true)}>
                  Yes
                </button>
                <button className="gc-ask-btn" onClick={() => onAnswer(ask.id, false)}>
                  No
                </button>
              </span>
            )}
          </div>
        ))}

        {items.map((item) =>
          onToggle ? (
            <button
              key={item.id}
              className={`gc-row${item.checked ? ' checked' : ''}`}
              onClick={() => onToggle(item.id)}
              aria-pressed={item.checked}
            >
              <span className="gc-box" aria-hidden />
              <span className="gc-row-label">{item.label}</span>
              <span className="gc-row-tag">{item.tag}</span>
            </button>
          ) : (
            <div key={item.id} className={`gc-row${item.checked ? ' checked' : ''}`}>
              <span className="gc-box" aria-hidden />
              <span className="gc-row-label">{item.label}</span>
              <span className="gc-row-tag">{item.tag}</span>
            </div>
          )
        )}

        {Array.from({ length: fillerCount }, (_, i) => (
          <div className="gc-row-filler" key={`f${i}`} />
        ))}
      </div>

      <div className="gc-count">
        Items checked {checkedCount} / {items.length}
      </div>

      {footer && <div className="gc-footer">{footer}</div>}

      <div className="gc-signoff">{signOff}</div>
    </div>
  )
}
