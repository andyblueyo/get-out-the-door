'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export interface RoutineSummary {
  id: string
  name: string
  is_active: boolean
  updated_at: string
  stepCount: number
}

export default function RoutinesLedger({
  userId,
  routines,
}: {
  userId: string
  routines: RoutineSummary[]
}) {
  const router = useRouter()
  const supabase = createClient()
  const [busy, setBusy] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function setActive(id: string) {
    setBusy(true)
    setError(null)
    const now = new Date().toISOString()
    // Deactivate first, then activate: the row count goes 1 -> 0 -> 1, which
    // never trips the one-active-per-user unique index. (Activating first
    // would transiently mean two active rows and raise 23505.)
    const off = await supabase
      .from('routines')
      .update({ is_active: false, updated_at: now })
      .eq('user_id', userId)
      .eq('is_active', true)
    if (off.error) {
      setError(off.error.message)
      setBusy(false)
      return
    }
    const on = await supabase
      .from('routines')
      .update({ is_active: true, updated_at: now })
      .eq('id', id)
    if (on.error) setError(on.error.message)
    setBusy(false)
    router.refresh()
  }

  async function createRoutine() {
    setBusy(true)
    setError(null)
    const { data, error } = await supabase
      .from('routines')
      .insert({
        user_id: userId,
        name: 'My routine',
        is_active: routines.length === 0,
      })
      .select('id')
      .single()
    setBusy(false)
    if (error || !data) {
      setError(error?.message ?? 'Could not create routine')
      return
    }
    router.push(`/routines/${data.id}`)
  }

  async function deleteRoutine(r: RoutineSummary) {
    if (!window.confirm(`Delete “${r.name}”? This can’t be undone.`)) return
    setBusy(true)
    setError(null)
    const { error } = await supabase.from('routines').delete().eq('id', r.id)
    if (error) setError(error.message)
    setBusy(false)
    router.refresh()
  }

  function startRename(r: RoutineSummary) {
    setRenamingId(r.id)
    setRenameValue(r.name)
  }

  async function commitRename() {
    const id = renamingId
    const name = renameValue.trim()
    setRenamingId(null)
    if (!id || !name) return
    const { error } = await supabase
      .from('routines')
      .update({ name, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) setError(error.message)
    router.refresh()
  }

  const fillerCount = Math.max(0, 3 - routines.length)

  return (
    <section className="ledger">
      <header className="ledger-head">
        <div className="ledger-title">Routines</div>
      </header>

      {routines.length === 0 && (
        <div className="ledger-empty">
          No routines yet — start your first one below.
        </div>
      )}

      {routines.map((r) => (
        <div className="ledger-row" key={r.id}>
          <div className="ledger-row-main">
            {renamingId === r.id ? (
              <input
                className="ledger-rename"
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename()
                  if (e.key === 'Escape') setRenamingId(null)
                }}
              />
            ) : (
              <>
                <Link className="ledger-row-name" href={`/routines/${r.id}`}>
                  {r.name}
                </Link>
                <span className="ledger-row-sub">
                  {r.stepCount} step{r.stepCount === 1 ? '' : 's'} · edited{' '}
                  {formatDate(r.updated_at)} ·{' '}
                  <button onClick={() => startRename(r)}>rename</button> ·{' '}
                  <button className="danger" onClick={() => deleteRoutine(r)}>
                    delete
                  </button>
                </span>
              </>
            )}
          </div>
          {r.is_active ? (
            <span className="ledger-active-tag">Active</span>
          ) : (
            <button
              className="ledger-set-btn"
              disabled={busy}
              onClick={() => setActive(r.id)}
            >
              Set active
            </button>
          )}
        </div>
      ))}

      {Array.from({ length: fillerCount }, (_, i) => (
        <div className="ledger-row-filler" key={i} />
      ))}

      <div className="ledger-foot">
        {error && <p className="form-error">{error}</p>}
        <button className="btn" disabled={busy} onClick={createRoutine}>
          + New routine
        </button>
      </div>
    </section>
  )
}

function formatDate(iso: string): string {
  return new Date(iso)
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    .toLowerCase()
}
