'use client'

import type { ReactNode } from 'react'
import type { TicketItem } from '@/lib/routine/types'
import type { SubwaySectionData } from '@/lib/subway/types'
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
  /** next-train block, printed above the item rows — omitted while off or loading */
  subway?: SubwaySectionData | null
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
  subway,
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
        <div className="gc-title">gtfotd</div>
        <div className="gc-flourish">get the *heck out the door</div>
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

      {subway && subway.lines.length > 0 && (
        <div className="gc-subway">
          <div className="gc-subway-head">
            <span>Next train</span>
          </div>
          <div className="gc-subway-stop">
            <span>{subway.stopName}</span>
            {subway.walkMinutes != null && (
              <span className="gc-subway-walk">{subway.walkMinutes} min walk</span>
            )}
          </div>

          {subway.leaveBy && (
            <div className="gc-leave">
              <div>
                <div className="gc-leave-label">Leave by</div>
                <div className="gc-leave-time">
                  {subway.leaveBy.leaveInMinutes <= 0
                    ? 'now'
                    : `in ${subway.leaveBy.leaveInMinutes}m`}
                </div>
              </div>
              <div className="gc-leave-line">
                <div className="gc-leave-route">{subway.leaveBy.route} train</div>
                <div className="gc-leave-dir">{subway.leaveBy.directionLabel}</div>
              </div>
            </div>
          )}

          {subway.lines.map((line) => (
            <div className="gc-train-row" key={line.route}>
              <span className="gc-train-badge">{line.route}</span>
              <span className="gc-train-dir">{line.directionLabel}</span>
              <span className="gc-train-times">
                <span className="gc-train-mins">
                  {line.times.map((t) => `${t}′`).join(' · ')}
                </span>
                {line.leaveInMinutes != null && (
                  <span className="gc-train-leave">
                    leave {line.leaveInMinutes <= 0 ? 'now' : `in ${line.leaveInMinutes}m`}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

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
