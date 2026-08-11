import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AmbientField } from './AmbientField'
import { FREE_PRACTICE_TRACKS } from './api'
import { useAuth } from './auth'
import { BRAND, PERSONAS, type Persona } from './brand'
import { ChatDock } from './ChatDock'
import { topicsForTrack } from './curriculum'
import {
  buildLearnSearch,
  DEFAULT_PRACTICE_TRACK,
  getResumePointer,
} from './learnProgress'
import { usePersona } from './persona'
// Hashed under /assets/ so CDN cannot reuse a poisoned /logo.png SPA HTML cache entry.
import brandMarkUrl from './assets/pol-mark.png'

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
  const [logoFailed, setLogoFailed] = useState(false)

  const practiceHref = useMemo(() => {
    const resume = getResumePointer()
    const canResume =
      !!resume &&
      (FREE_PRACTICE_TRACKS.has(resume.trackId) || !!user?.is_pro)
    const path =
      canResume && resume ? resume.trackId : DEFAULT_PRACTICE_TRACK
    const topic =
      (canResume && resume?.lastTopicId) ||
      topicsForTrack(path)[0]?.id ||
      null
    return `/${buildLearnSearch({
      path,
      mode: 'practice',
      topic,
      q: canResume && resume ? resume.lastQuestionId : null,
    })}`
  }, [user?.is_pro])

  const customPracticeHref = useMemo(() => {
    const resume = getResumePointer()
    const canResume =
      !!resume &&
      (FREE_PRACTICE_TRACKS.has(resume.trackId) || !!user?.is_pro)
    const path =
      canResume && resume ? resume.trackId : DEFAULT_PRACTICE_TRACK
    const topic =
      (canResume && resume?.lastTopicId) ||
      topicsForTrack(path)[0]?.id ||
      null
    return `/${buildLearnSearch({
      path,
      mode: 'practice',
      topic,
      custom: true,
    })}`
  }, [user?.is_pro])

  return (
    <div className={wide ? 'shell shell-wide' : 'shell'}>
      <div className="atmosphere" aria-hidden="true" />
      <AmbientField />
      <div className="grid-glow" aria-hidden="true" />
      <div className="film-grain" aria-hidden="true" />

      <header className="site-nav">
        <Link to={isRecruiter ? '/jobs' : '/'} className="brand">
          {logoFailed ? (
            <span className="brand-mark brand-mark-fallback" aria-hidden="true">
              P
            </span>
          ) : (
            <img
              className="brand-mark"
              src={brandMarkUrl}
              width={36}
              height={36}
              alt={`${BRAND.product} logo`}
              decoding="async"
              onError={() => setLogoFailed(true)}
            />
          )}
          <span className="brand-text">
            <strong>{BRAND.product}</strong>
            <em>{BRAND.tagline}</em>
          </span>
        </Link>

        <nav className="site-links" aria-label="Primary">
          {isLearner ? (
            <>
              <Link to="/">Learn</Link>
              <Link to={practiceHref}>Practice</Link>
              <Link to={customPracticeHref} title="Bring any interview question">
                Your question
              </Link>
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
          <span className="site-footer-privacy-note">
            We collect account, usage, and practice data to run coaching and
            improve the product. We do not sell personal information.{' '}
            <Link to="/privacy">Read our Privacy Policy</Link>.
          </span>
        </div>
        <div className="site-footer-links">
          <Link to="/about">About</Link>
          <Link to="/pricing">Plans</Link>
          <Link to="/for-companies">Hire</Link>
          <Link to="/company">Company</Link>
          <Link to="/privacy">Privacy</Link>
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
    id: 'ai-engineer',
    title: 'Become an AI engineer',
    blurb:
      'Production AI upskilling — RAG, agents, evals, LLM ops — plus Agentic and Snowflake video paths.',
    trackIds: ['java-to-ai', 'java-to-python'],
  },
  {
    id: 'interview',
    title: 'Interview practice',
    blurb: 'Staff & EM loops when you need the panel — speak them until they land.',
    trackIds: ['staff-interview', 'em-interview'],
  },
  {
    id: 'languages',
    title: 'Foundations & stack depth',
    blurb:
      'Language fundamentals that every AI engineer leans on day to day.',
    trackIds: [
      'python',
      'java',
      'javascript',
      'typescript',
      'react',
      'nodejs',
      'html',
      'css',
    ],
  },
]
