'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setPending(false)
      return
    }
    router.push('/')
    router.refresh()
  }

  return (
    <main className="ticket-page">
      <div className="ticket">
        <header className="ticket-header">
          <h1 className="ticket-title">gtfotd</h1>
          <p className="ticket-flourish">get the *heck out the door</p>
        </header>
        <div className="ticket-body">
          <p className="ticket-section-label">Sign in</p>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="form-error">{error}</p>}
            <button className="btn" type="submit" disabled={pending}>
              {pending ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <p className="ticket-footer">
            No account? <Link href="/signup">Sign up</Link>
          </p>
        </div>
      </div>
    </main>
  )
}
