import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './auth'
import { BRAND, PERSONAS, type Persona } from './brand'
import { usePersona } from './persona'
import { Shell } from './Shell'

export function LoginPage() {
  const { login } = useAuth()
  const { setPersona } = usePersona()
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
      const user = await login(email.trim(), password)
      const next =
        user.persona === 'recruiter' || user.persona === 'learner'
          ? user.persona
          : 'learner'
      await setPersona(next)
      navigate(PERSONAS[next].homePath)
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
          <p className="eyebrow">{BRAND.product}</p>
          <h1>Welcome back</h1>
          <p className="muted">
            Continue as a learner or recruiter — your role shapes what you see.
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
  const { setPersona } = usePersona()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [persona, setLocalPersona] = useState<Persona>('learner')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await register(name.trim(), email.trim(), password, persona)
      await setPersona(persona)
      navigate(PERSONAS[persona].homePath)
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
          <p className="eyebrow">{BRAND.product}</p>
          <h1>Create your account</h1>
          <p className="muted">
            Choose your role so we show Learn or Hire first. You can switch
            anytime in the header.
          </p>
          {error && <div className="banner error">{error}</div>}

          <fieldset className="persona-pick">
            <legend>I am here to…</legend>
            <label className={persona === 'learner' ? 'active' : ''}>
              <input
                type="radio"
                name="persona"
                value="learner"
                checked={persona === 'learner'}
                onChange={() => setLocalPersona('learner')}
              />
              <strong>{PERSONAS.learner.label}</strong>
              <span>{PERSONAS.learner.blurb}</span>
            </label>
            <label className={persona === 'recruiter' ? 'active' : ''}>
              <input
                type="radio"
                name="persona"
                value="recruiter"
                checked={persona === 'recruiter'}
                onChange={() => setLocalPersona('recruiter')}
              />
              <strong>{PERSONAS.recruiter.label}</strong>
              <span>{PERSONAS.recruiter.blurb}</span>
            </label>
          </fieldset>

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
            {loading
              ? 'Creating…'
              : persona === 'recruiter'
                ? 'Create recruiter account'
                : 'Create learner account'}
          </button>
          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </form>
      </div>
    </Shell>
  )
}
