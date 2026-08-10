import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AmbientField } from './AmbientField'
import { useAuth } from './auth'
import { BRAND, PERSONAS, type Persona } from './brand'
import { ChatDock } from './ChatDock'
import { usePersona } from './persona'

function MoreMenu({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  return (
    <div className={`nav-more${open ? ' open' : ''}`} ref={ref}>
      <button
        type="button"
        className="nav-more-btn"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        {label}
      </button>
      {open && (
        <div className="nav-more-panel" role="menu" onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  )
}

export function Shell({
  children,
  wide,
}: {
  children: ReactNode
  wide?: boolean
}) {
  const { user, loading, logout } = useAuth()
  const { persona, setPersona, isLearner, isRecruiter } = usePersona()
  const docsHref = `${import.meta.env.BASE_URL}product/`

  return (
    <div className={wide ? 'shell shell-wide' : 'shell'}>
      <div className="atmosphere" aria-hidden="true" />
      <AmbientField />
      <div className="grid-glow" aria-hidden="true" />
      <div className="film-grain" aria-hidden="true" />

      <header className="site-nav">
        <Link to={isRecruiter ? '/jobs' : '/'} className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-text">
            <strong>{BRAND.product}</strong>
            <em>{BRAND.tagline}</em>
          </span>
        </Link>

        <nav className="site-links" aria-label="Primary">
          {isLearner ? (
            <>
              <Link to="/">Learn</Link>
              <Link to="/agentic-path">Agentic AI</Link>
              <Link to="/snowflake-path">Snowflake</Link>
              <Link to="/jobs">Jobs</Link>
              <MoreMenu label="More">
                <Link to="/network">Network</Link>
                <Link to="/messages">Chat</Link>
                <Link to="/profile">Profile</Link>
                <Link to="/pricing">Plans</Link>
                <Link to="/for-companies">For companies</Link>
                {user?.is_admin && <Link to="/admin">Admin</Link>}
                <a href={docsHref}>Docs</a>
              </MoreMenu>
            </>
          ) : (
            <>
              <Link to="/jobs">Jobs</Link>
              <Link to="/network">Network</Link>
              <Link to="/messages">Chat</Link>
              <Link to="/profile">Talent</Link>
              <MoreMenu label="More">
                <Link to="/for-companies">Hiring studio</Link>
                <Link to="/">Learner view</Link>
                {user?.is_admin && <Link to="/admin">Admin</Link>}
                <a href={docsHref}>Docs</a>
              </MoreMenu>
            </>
          )}
        </nav>

        <div className="site-actions">
          <label className="persona-switch" title="Switch role">
            <span className="sr-only">Role</span>
            <select
              value={persona}
              onChange={(e) => void setPersona(e.target.value as Persona)}
              aria-label="View as learner or recruiter"
            >
              <option value="learner">{PERSONAS.learner.short}</option>
              <option value="recruiter">{PERSONAS.recruiter.short}</option>
            </select>
          </label>
          {loading ? (
            <span className="plan-badge">…</span>
          ) : user ? (
            <>
              <Link
                className="user-chip"
                to="/profile"
                title={user.email}
              >
                <span className={user.is_pro ? 'plan-dot pro' : 'plan-dot'} />
                {user.name?.split(' ')[0] || 'You'}
              </Link>
              <button type="button" className="btn ghost sm" onClick={logout}>
                Out
              </button>
            </>
          ) : (
            <>
              <Link className="btn ghost sm" to="/login">
                Sign in
              </Link>
              <Link className="btn primary sm" to="/register">
                Get started
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="shell-main">{children}</main>

      <ChatDock />

      <footer className="site-footer">
        <div className="site-footer-copy">
          <strong>{BRAND.product}</strong>
          <span className="site-footer-legal">{BRAND.copyright}</span>
        </div>
        <div className="site-footer-links">
          <Link to="/about">About</Link>
          <Link to="/pricing">Plans</Link>
          <Link to="/for-companies">Hire</Link>
          <Link to="/company">Company</Link>
          <a href={docsHref}>Docs</a>
        </div>
      </footer>
    </div>
  )
}

export const TRACK_GROUPS: {
  id: string
  title: string
  blurb: string
  trackIds: string[]
}[] = [
  {
    id: 'interview',
    title: 'Leadership & loop readiness',
    blurb: 'Staff & EM narratives built for hiring panels — not textbook answers.',
    trackIds: ['staff-interview', 'em-interview'],
  },
  {
    id: 'career',
    title: 'Career switches',
    blurb:
      'Java → Python, Java → AI, Agentic video curriculum, plus Data Engineer → Snowflake.',
    trackIds: ['java-to-python', 'java-to-ai'],
  },
  {
    id: 'languages',
    title: 'Language & stack depth',
    blurb:
      'Sharp fundamentals for day-to-day engineering interviews and on-the-job growth.',
    trackIds: [
      'java',
      'python',
      'javascript',
      'typescript',
      'react',
      'nodejs',
      'html',
      'css',
    ],
  },
]
