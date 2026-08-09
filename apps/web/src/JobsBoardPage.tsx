import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  ApiError,
  api,
  type JobCreateInput,
  type JobPost,
} from './api'
import { useAuth } from './auth'
import { BRAND } from './brand'
import { usePersona } from './persona'
import { Shell } from './Shell'
import './App.css'

const LOCAL_KEY = 'ats_local_jobs'

const DEMO_JOBS: JobPost[] = [
  {
    id: -1,
    title: 'Senior Backend Engineer (AI Platform)',
    company_name: 'Kallepalli Labs',
    location: 'Remote · US / India',
    employment_type: 'full-time',
    workplace: 'remote',
    description:
      'Build the learning + hiring studio: FastAPI services, practice feedback pipelines, and recruiter job workflows. You will own APIs that power Learn. Practice. Hire.',
    requirements:
      '5+ years backend · Python or Java · comfort with LLMs/APIs · strong written + spoken communication.',
    salary_range: '$160k–$210k',
    apply_url: `mailto:${BRAND.contactEmail}?subject=Senior%20Backend%20Engineer`,
    status: 'open',
    posted_by_user_id: 0,
    poster_name: 'Talent team',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_owner: false,
  },
  {
    id: -2,
    title: 'Staff Software Engineer',
    company_name: 'Example Cloud Co.',
    location: 'San Francisco, CA (Hybrid)',
    employment_type: 'full-time',
    workplace: 'hybrid',
    description:
      'Lead cross-team platform work. Interview loop includes system design and ownership narrative — candidates who practice on AI Tutor Studio are encouraged to apply.',
    requirements:
      'Staff-level impact · distributed systems · mentoring · clear panel communication.',
    salary_range: null,
    apply_url: null,
    status: 'open',
    posted_by_user_id: 0,
    poster_name: 'Recruiting',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    is_owner: false,
  },
]

function loadLocalJobs(): JobPost[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return []
    return JSON.parse(raw) as JobPost[]
  } catch {
    return []
  }
}

function saveLocalJobs(jobs: JobPost[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(jobs))
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const h = Math.floor(ms / 3600000)
  if (h < 1) return 'Just now'
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

const emptyForm: JobCreateInput = {
  title: '',
  company_name: '',
  location: '',
  employment_type: 'full-time',
  workplace: 'remote',
  description: '',
  requirements: '',
  salary_range: '',
  apply_url: '',
}

export function JobsBoardPage() {
  const { user } = useAuth()
  const { isRecruiter, setPersona } = usePersona()
  const [jobs, setJobs] = useState<JobPost[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  const [workplace, setWorkplace] = useState('')
  const [mineOnly, setMineOnly] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showComposer, setShowComposer] = useState(false)
  const [form, setForm] = useState<JobCreateInput>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [useLocal, setUseLocal] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (!api.apiBase) {
        const local = loadLocalJobs()
        setJobs([...local, ...DEMO_JOBS])
        setUseLocal(true)
        setActiveId((prev) => prev ?? local[0]?.id ?? DEMO_JOBS[0]?.id ?? null)
        return
      }
      const list = await api.listJobs({
        q: query || undefined,
        workplace: workplace || undefined,
        mine: mineOnly || undefined,
        status: 'open',
      })
      setUseLocal(false)
      setJobs(list.length ? list : DEMO_JOBS)
      setActiveId((prev) => {
        if (prev && list.some((j) => j.id === prev)) return prev
        return list[0]?.id ?? DEMO_JOBS[0]?.id ?? null
      })
    } catch (err) {
      const local = loadLocalJobs()
      setJobs([...local, ...DEMO_JOBS])
      setUseLocal(true)
      setError(
        err instanceof Error
          ? `${err.message} — showing local/demo jobs.`
          : 'Showing local/demo jobs.',
      )
      setActiveId((prev) => prev ?? local[0]?.id ?? DEMO_JOBS[0]?.id ?? null)
    } finally {
      setLoading(false)
    }
  }, [query, workplace, mineOnly])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return jobs.filter((j) => {
      if (workplace && j.workplace !== workplace) return false
      if (mineOnly && user && !j.is_owner && j.posted_by_user_id !== user.id) {
        if (j.id < 0) return false
      }
      if (!q) return true
      return (
        j.title.toLowerCase().includes(q) ||
        j.company_name.toLowerCase().includes(q) ||
        j.location.toLowerCase().includes(q)
      )
    })
  }, [jobs, query, workplace, mineOnly, user])

  const active =
    filtered.find((j) => j.id === activeId) ?? filtered[0] ?? null

  async function onPost(e: FormEvent) {
    e.preventDefault()
    if (!user) {
      setError('Sign in as a recruiter to post jobs.')
      return
    }
    if (!isRecruiter) {
      await setPersona('recruiter')
    }
    setSaving(true)
    setError(null)
    try {
      const payload: JobCreateInput = {
        ...form,
        salary_range: form.salary_range || null,
        apply_url: form.apply_url || null,
      }
      if (!api.apiBase || useLocal) {
        const local = loadLocalJobs()
        const job: JobPost = {
          id: Date.now(),
          title: payload.title,
          company_name: payload.company_name,
          location: payload.location || '',
          employment_type: payload.employment_type || 'full-time',
          workplace: payload.workplace || 'remote',
          description: payload.description,
          requirements: payload.requirements || '',
          salary_range: payload.salary_range ?? null,
          apply_url: payload.apply_url ?? null,
          status: 'open',
          posted_by_user_id: user.id,
          poster_name: user.name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_owner: true,
        }
        const next = [job, ...local]
        saveLocalJobs(next)
        setJobs([...next, ...DEMO_JOBS])
        setActiveId(job.id)
      } else {
        const created = await api.createJob(payload)
        await load()
        setActiveId(created.id)
      }
      setForm(emptyForm)
      setShowComposer(false)
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError('Switch to Recruiter / hiring role to post jobs.')
      } else {
        setError(err instanceof Error ? err.message : 'Could not post job')
      }
    } finally {
      setSaving(false)
    }
  }

  async function closeJob(job: JobPost) {
    if (!user || (!job.is_owner && job.posted_by_user_id !== user.id)) return
    try {
      if (!api.apiBase || useLocal || job.id < 0) {
        if (job.id < 0) return
        const local = loadLocalJobs().map((j) =>
          j.id === job.id ? { ...j, status: 'closed' } : j,
        )
        saveLocalJobs(local.filter((j) => j.status === 'open'))
        await load()
        return
      }
      await api.updateJob(job.id, { status: 'closed' })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not close job')
    }
  }

  return (
    <Shell wide>
      <section className="jobs-hero reveal">
        <div>
          <p className="eyebrow">Jobs</p>
          <h1>Job board</h1>
          <p className="hero-lede">
            LinkedIn-style listings: recruiters post roles; learners browse and
            apply. Connected to {BRAND.product} practice paths.
          </p>
        </div>
        <div className="hero-cta">
          {isRecruiter ? (
            <button
              type="button"
              className="btn primary"
              onClick={() => setShowComposer((v) => !v)}
            >
              {showComposer ? 'Close composer' : 'Post a job'}
            </button>
          ) : (
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                void setPersona('recruiter')
                setShowComposer(true)
              }}
            >
              Switch to recruiter &amp; post
            </button>
          )}
          <Link className="btn ghost" to="/for-companies">
            Hiring studio
          </Link>
        </div>
      </section>

      {error && <p className="banner error">{error}</p>}

      {showComposer && (
        <form className="jobs-composer panel reveal" onSubmit={onPost}>
          <h2>Post a job</h2>
          <p className="muted">
            {!user
              ? 'Sign in required to publish.'
              : useLocal || !api.apiBase
                ? 'API offline — saving to this browser (demo mode).'
                : 'Publishes to the live board for learners.'}
          </p>
          <div className="jobs-form-grid">
            <label>
              Job title
              <input
                required
                minLength={3}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Staff Software Engineer"
              />
            </label>
            <label>
              Company
              <input
                required
                minLength={2}
                value={form.company_name}
                onChange={(e) =>
                  setForm({ ...form, company_name: e.target.value })
                }
                placeholder="Company name"
              />
            </label>
            <label>
              Location
              <input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="City or Remote"
              />
            </label>
            <label>
              Workplace
              <select
                value={form.workplace}
                onChange={(e) =>
                  setForm({ ...form, workplace: e.target.value })
                }
              >
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">On-site</option>
              </select>
            </label>
            <label>
              Employment type
              <select
                value={form.employment_type}
                onChange={(e) =>
                  setForm({ ...form, employment_type: e.target.value })
                }
              >
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
              </select>
            </label>
            <label>
              Salary range (optional)
              <input
                value={form.salary_range || ''}
                onChange={(e) =>
                  setForm({ ...form, salary_range: e.target.value })
                }
                placeholder="$140k–$180k"
              />
            </label>
          </div>
          <label>
            Description
            <textarea
              required
              minLength={20}
              rows={5}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="What the role owns, team, impact…"
            />
          </label>
          <label>
            Requirements
            <textarea
              rows={3}
              value={form.requirements || ''}
              onChange={(e) =>
                setForm({ ...form, requirements: e.target.value })
              }
              placeholder="Must-haves and nice-to-haves"
            />
          </label>
          <label>
            Apply URL or mailto (optional)
            <input
              value={form.apply_url || ''}
              onChange={(e) => setForm({ ...form, apply_url: e.target.value })}
              placeholder="https://… or mailto:jobs@company.com"
            />
          </label>
          <div className="actions">
            <button
              className="btn primary"
              type="submit"
              disabled={saving || !user}
            >
              {saving ? 'Posting…' : 'Publish job'}
            </button>
            {!user && (
              <Link className="btn ghost" to="/register">
                Create recruiter account
              </Link>
            )}
          </div>
        </form>
      )}

      <div className="jobs-toolbar reveal">
        <input
          type="search"
          className="jobs-search"
          placeholder="Search by title, company, location…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          value={workplace}
          onChange={(e) => setWorkplace(e.target.value)}
          aria-label="Filter workplace"
        >
          <option value="">Any workplace</option>
          <option value="remote">Remote</option>
          <option value="hybrid">Hybrid</option>
          <option value="onsite">On-site</option>
        </select>
        {isRecruiter && user && (
          <label className="jobs-mine">
            <input
              type="checkbox"
              checked={mineOnly}
              onChange={(e) => setMineOnly(e.target.checked)}
            />
            My posts
          </label>
        )}
      </div>

      <div className="jobs-layout reveal">
        <aside className="jobs-list panel">
          {loading && <p className="muted">Loading jobs…</p>}
          {!loading && filtered.length === 0 && (
            <p className="muted">No jobs match. Post the first one.</p>
          )}
          {filtered.map((job) => (
            <button
              key={job.id}
              type="button"
              className={
                job.id === active?.id ? 'jobs-card active' : 'jobs-card'
              }
              onClick={() => setActiveId(job.id)}
            >
              <strong>{job.title}</strong>
              <span>{job.company_name}</span>
              <em>
                {job.location || job.workplace} · {job.employment_type} ·{' '}
                {timeAgo(job.created_at)}
              </em>
            </button>
          ))}
        </aside>

        <div className="jobs-detail panel">
          {active ? (
            <>
              <div className="jobs-detail-head">
                <div>
                  <p className="eyebrow">{active.workplace}</p>
                  <h2>{active.title}</h2>
                  <p className="jobs-company">{active.company_name}</p>
                  <p className="muted">
                    {active.location || 'Location flexible'} ·{' '}
                    {active.employment_type}
                    {active.salary_range ? ` · ${active.salary_range}` : ''}
                    {active.poster_name ? ` · Posted by ${active.poster_name}` : ''}
                  </p>
                </div>
                <div className="actions">
                  {active.apply_url ? (
                    <a
                      className="btn primary"
                      href={active.apply_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Easy apply
                    </a>
                  ) : (
                    <a
                      className="btn primary"
                      href={`mailto:${BRAND.contactEmail}?subject=${encodeURIComponent(`Application: ${active.title}`)}`}
                    >
                      Express interest
                    </a>
                  )}
                  {(active.is_owner ||
                    (user && active.posted_by_user_id === user.id)) &&
                    active.id > 0 && (
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => void closeJob(active)}
                      >
                        Close job
                      </button>
                    )}
                </div>
              </div>
              <h3>About the job</h3>
              <p className="jobs-body">{active.description}</p>
              {active.requirements && (
                <>
                  <h3>Requirements</h3>
                  <p className="jobs-body">{active.requirements}</p>
                </>
              )}
              <div className="jobs-practice-cta">
                <strong>Practice for this loop</strong>
                <p className="muted">
                  Learners can prep on Staff/EM and stack paths before applying.
                </p>
                <Link className="btn ghost sm" to="/">
                  Open learning paths
                </Link>
              </div>
            </>
          ) : (
            <p className="muted">Select a job to preview.</p>
          )}
        </div>
      </div>
    </Shell>
  )
}
