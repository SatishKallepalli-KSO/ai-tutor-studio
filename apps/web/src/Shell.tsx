import { Link } from 'react-router-dom'
import { useAuth } from './auth'
import { BRAND, PERSONAS, type Persona } from './brand'
import { usePersona } from './persona'
import type { ReactNode } from 'react'

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
              <Link to="/jobs">Jobs</Link>
              <Link to="/agentic-path">Agentic AI</Link>
              <Link to="/snowflake-path">Snowflake</Link>
              <Link to="/pricing">Plans</Link>
              <Link to="/for-companies">Hire</Link>
              <Link to="/compare">Compare</Link>
            </>
          ) : (
            <>
              <Link to="/jobs">Jobs</Link>
              <Link to="/for-companies">Hiring studio</Link>
              <Link to="/compare">Compare</Link>
              <Link to="/company">Company</Link>
              <Link to="/">Talent view</Link>
            </>
          )}
          {user?.is_admin && <Link to="/admin">Admin</Link>}
          <a href={docsHref}>Docs</a>
        </nav>

        <div className="site-actions">
          <label className="persona-switch" title="Switch role context">
            <span className="sr-only">Role</span>
            <select
              value={persona}
              onChange={(e) => void setPersona(e.target.value as Persona)}
              aria-label="View as learner or recruiter"
            >
              <option value="learner">{PERSONAS.learner.label}</option>
              <option value="recruiter">{PERSONAS.recruiter.label}</option>
            </select>
          </label>
          {loading ? (
            <span className="plan-badge">…</span>
          ) : user ? (
            <>
              <span className={user.is_pro ? 'plan-badge pro' : 'plan-badge'}>
                {user.is_pro ? 'Pro' : 'Free'}
                {!user.is_pro && isLearner && (
                  <span className="quota">
                    {user.feedback_used_today}/{user.feedback_limit_today}
                  </span>
                )}
              </span>
              {!user.is_pro && isLearner && (
                <Link className="btn primary sm" to="/pricing">
                  Go Pro
                </Link>
              )}
              {isRecruiter && (
                <a
                  className="btn primary sm"
                  href={`mailto:${BRAND.contactEmail}?subject=Hiring%20pilot`}
                >
                  Talk to sales
                </a>
              )}
              <button
                type="button"
                className="btn ghost sm"
                onClick={logout}
                title={user.email}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link className="btn ghost sm" to="/login">
                Sign in
              </Link>
              <Link className="btn primary sm" to="/register">
                {isRecruiter ? 'Join as recruiter' : 'Start free'}
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="shell-main">{children}</main>

      <footer className="site-footer">
        <div className="site-footer-copy">
          <strong>{BRAND.product}</strong>
          <span>{BRAND.oneLiner}</span>
          <span className="site-footer-legal">{BRAND.copyright}</span>
        </div>
        <div className="site-footer-links">
          <Link to="/">Learn</Link>
          <Link to="/jobs">Jobs</Link>
          <Link to="/for-companies">Hire</Link>
          <Link to="/about">About</Link>
          <Link to="/company">Company</Link>
          <Link to="/compare">Compare</Link>
          <Link to="/investors">Partner &amp; invest</Link>
          <Link to="/pricing">Plans</Link>
          <a href={docsHref}>Product docs</a>
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
