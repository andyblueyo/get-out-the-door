'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setError(null)
    const supabase = createClient()
    // display_name rides along in user metadata; the on_auth_user_created
    // trigger copies it into profiles. Never insert into profiles directly.
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    })
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
          <p className="ticket-section-label">Sign up</p>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="display-name">Name</label>
              <input
                id="display-name"
                type="text"
                autoComplete="name"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
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
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="form-error">{error}</p>}
            <button className="btn" type="submit" disabled={pending}>
              {pending ? 'Creating account…' : 'Create account'}
            </button>
          </form>
          <p className="ticket-footer">
            Have an account? <Link href="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </main>
  )
}
