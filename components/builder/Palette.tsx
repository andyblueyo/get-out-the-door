'use client'

import type { NodeType } from '@/lib/routine/types'

export const PALETTE: { type: NodeType; title: string; hint: string }[] = [
  { type: 'weather', title: 'Weather', hint: 'Branch on the forecast — rain %, high, low.' },
  { type: 'day', title: 'Day', hint: 'Branch on the day of the week.' },
  { type: 'ask', title: 'Ask', hint: 'A yes/no question each morning.' },
  { type: 'item', title: 'Item', hint: 'A thing to grab — becomes a ticket row.' },
]

export default function Palette({ onAdd }: { onAdd: (type: NodeType) => void }) {
  return (
    <aside className="palette">
      <h2 className="palette-title">Nodes</h2>
      {PALETTE.map((entry) => (
        <button
          key={entry.type}
          className={`pal-item${entry.type === 'item' ? ' torn' : ''}`}
          onClick={() => onAdd(entry.type)}
        >
          <span className="pal-item-title">{entry.title}</span>
          <span className="pal-item-hint">{entry.hint}</span>
        </button>
      ))}
      <p className="palette-help">
        Drag a square handle to a node to connect. Click a node or line, then
        press Delete to remove it.
      </p>
    </aside>
  )
}
