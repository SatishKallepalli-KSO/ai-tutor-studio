import { Link } from 'react-router-dom'
import { useAuth } from './auth'
import type { ReactNode } from 'react'

export function Shell({
  children,
  wide,
}: {
  children: ReactNode
  wide?: boolean
}) {
  const { user, loading, logout } = useAuth()
  const docsHref = `${import.meta.env.BASE_URL}product/`

  return (
    <div className={wide ? 'shell shell-wide' : 'shell'}>
      <div className="atmosphere" aria-hidden="true" />
      <div className="grid-glow" aria-hidden="true" />

      <header className="site-nav">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-text">
            <strong>AI Tutor Studio</strong>
            <em>Interview &amp; upskilling</em>
          </span>
        </Link>

        <nav className="site-links" aria-label="Primary">
          <Link to="/">Tracks</Link>
          <Link to="/agentic-path">Agentic path</Link>
          <Link to="/pricing">Pricing</Link>
          <a href={docsHref}>Docs</a>
        </nav>

        <div className="site-actions">
          {loading ? (
            <span className="plan-badge">…</span>
          ) : user ? (
            <>
              <span className={user.is_pro ? 'plan-badge pro' : 'plan-badge'}>
                {user.is_pro ? 'Pro' : 'Free'}
                {!user.is_pro && (
                  <span className="quota">
                    {user.feedback_used_today}/{user.feedback_limit_today}
                  </span>
                )}
              </span>
              {!user.is_pro && (
                <Link className="btn primary sm" to="/pricing">
                  Upgrade
                </Link>
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
                Start free
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="shell-main">{children}</main>

      <footer className="site-footer">
        <div>
          <strong>AI Tutor Studio</strong>
          <span> Voice-first interview prep · Learn → Practice → Coach</span>
        </div>
        <div className="site-footer-links">
          <Link to="/pricing">Pricing</Link>
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
    title: 'Interview loops',
    blurb: 'Staff & EM narratives that win hiring panels.',
    trackIds: ['staff-interview', 'em-interview'],
  },
  {
    id: 'career',
    title: 'Career switches',
    blurb: 'Java → Python, Java → AI, and the full Agentic video path.',
    trackIds: ['java-to-python', 'java-to-ai'],
  },
  {
    id: 'languages',
    title: 'Language & framework drills',
    blurb: 'Depth for day-to-day engineering interviews.',
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
