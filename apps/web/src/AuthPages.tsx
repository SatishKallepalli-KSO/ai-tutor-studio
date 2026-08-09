import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './auth'
import { Shell } from './Shell'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login(email.trim(), password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Shell>
      <div className="auth-page">
        <form className="auth-card reveal" onSubmit={onSubmit}>
          <p className="eyebrow">AI Tutor Studio</p>
          <h1>Welcome back</h1>
          <p className="muted">
            Pick up voice practice and coaching exactly where you left the loop.
          </p>
          {error && <div className="banner error">{error}</div>}
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button className="btn primary" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="auth-switch">
            New here? <Link to="/register">Create a free account</Link>
          </p>
        </form>
      </div>
    </Shell>
  )
}

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await register(name.trim(), email.trim(), password)
      navigate('/pricing')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Shell>
      <div className="auth-page">
        <form className="auth-card reveal" onSubmit={onSubmit}>
          <p className="eyebrow">AI Tutor Studio</p>
          <h1>Start practicing free</h1>
          <p className="muted">
            Free includes topic docs, starter paths, and Java → Python. Go Pro
            for Staff/EM loops and unlimited coaching.
          </p>
          {error && <div className="banner error">{error}</div>}
          <label>
            Name
            <input
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </label>
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </label>
          <button className="btn primary" type="submit" disabled={loading}>
            {loading ? 'Creating…' : 'Create free account'}
          </button>
          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </form>
      </div>
    </Shell>
  )
}
