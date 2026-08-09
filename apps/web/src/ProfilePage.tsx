import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ApiError,
  api,
  type ConnectionView,
  type EducationItem,
  type ExperienceItem,
  type LearnerProfileView,
  type ProfileUpdateInput,
} from './api'
import { useAuth } from './auth'
import { BRAND } from './brand'
import { usePersona } from './persona'
import { Shell } from './Shell'
import './App.css'

const LOCAL_KEY = 'ats_local_profile'

const DEMO_PROFILE: LearnerProfileView = {
  user_id: 0,
  name: 'Alex Rivera',
  email: null,
  persona: 'learner',
  plan: 'pro',
  is_pro: true,
  headline: 'Staff Backend Engineer · Agentic AI · Open to Staff / Principal roles',
  location: 'San Francisco Bay Area · Remote OK',
  about:
    'I build durable backend platforms and practice interview narratives out loud. Currently deep on agentic AI systems, Snowflake data platforms, and Staff-level ownership stories.\n\nLooking for roles where I can ship AI products with strong engineering rigor.',
  open_to_work: true,
  current_role: 'Staff Software Engineer',
  current_company: 'Example Cloud Co.',
  skills: [
    'Python',
    'Java',
    'System design',
    'FastAPI',
    'Snowflake',
    'Agentic AI',
    'Leadership interviews',
  ],
  experience: [
    {
      title: 'Staff Software Engineer',
      company: 'Example Cloud Co.',
      location: 'Remote',
      start: '2022',
      end: 'Present',
      description:
        'Led cross-team platform work; mentored seniors; owned reliability for core services.',
    },
    {
      title: 'Senior Backend Engineer',
      company: 'Startup Labs',
      location: 'Austin, TX',
      start: '2018',
      end: '2022',
      description: 'Built APIs and data pipelines; partnered with product on hiring loops.',
    },
  ],
  education: [
    {
      school: 'State University',
      degree: 'B.S.',
      field: 'Computer Science',
      start: '2012',
      end: '2016',
    },
  ],
  target_roles: ['Staff Software Engineer', 'Principal Engineer', 'Engineering Manager'],
  website_url: 'https://satishkallepalli-kso.github.io/ai-tutor-studio/',
  linkedin_url: null,
  visibility: 'public',
  is_owner: false,
  updated_at: new Date().toISOString(),
}

function loadLocalProfile(): LearnerProfileView | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return null
    return JSON.parse(raw) as LearnerProfileView
  } catch {
    return null
  }
}

function saveLocalProfile(profile: LearnerProfileView) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(profile))
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

function emptyExperience(): ExperienceItem {
  return { title: '', company: '', location: '', start: '', end: '', description: '' }
}

function emptyEducation(): EducationItem {
  return { school: '', degree: '', field: '', start: '', end: '' }
}

type FormState = {
  name: string
  headline: string
  location: string
  about: string
  open_to_work: boolean
  current_role: string
  current_company: string
  skillsText: string
  targetRolesText: string
  website_url: string
  linkedin_url: string
  visibility: 'public' | 'private'
  experience: ExperienceItem[]
  education: EducationItem[]
}

function toForm(p: LearnerProfileView): FormState {
  return {
    name: p.name,
    headline: p.headline,
    location: p.location,
    about: p.about,
    open_to_work: p.open_to_work,
    current_role: p.current_role,
    current_company: p.current_company,
    skillsText: p.skills.join(', '),
    targetRolesText: p.target_roles.join(', '),
    website_url: p.website_url ?? '',
    linkedin_url: p.linkedin_url ?? '',
    visibility: p.visibility === 'private' ? 'private' : 'public',
    experience: p.experience.length ? p.experience.map((e) => ({ ...e })) : [emptyExperience()],
    education: p.education.length ? p.education.map((e) => ({ ...e })) : [emptyEducation()],
  }
}

function splitCsv(text: string): string[] {
  return text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function ProfilePage() {
  const { userId } = useParams()
  const { user } = useAuth()
  const { isRecruiter } = usePersona()
  const [profile, setProfile] = useState<LearnerProfileView | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<FormState | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [offline, setOffline] = useState(false)
  const [talent, setTalent] = useState<LearnerProfileView[]>([])
  const [relation, setRelation] = useState<ConnectionView | null>(null)
  const [connectBusy, setConnectBusy] = useState(false)

  const viewingId = userId ? Number(userId) : null
  const isMe = !viewingId || (user != null && viewingId === user.id)

  const refresh = useCallback(async () => {
    setError('')
    try {
      let next: LearnerProfileView
      if (isMe) {
        if (!user) {
          const local = loadLocalProfile()
          next = local ?? { ...DEMO_PROFILE, is_owner: true, name: 'Your name' }
          setOffline(true)
        } else {
          next = await api.myProfile()
          setOffline(false)
        }
      } else {
        next = await api.getProfile(viewingId!)
        setOffline(false)
      }
      setProfile(next)
      setForm(toForm(next))
    } catch {
      const local = loadLocalProfile()
      const fallback =
        local ??
        (isMe
          ? {
              ...DEMO_PROFILE,
              is_owner: true,
              name: user?.name || 'Your name',
              email: user?.email ?? null,
              user_id: user?.id ?? 0,
            }
          : DEMO_PROFILE)
      setProfile(fallback)
      setForm(toForm(fallback))
      setOffline(true)
    }

    if (isRecruiter) {
      try {
        const list = await api.listTalent({ open_to_work: true, limit: 12 })
        setTalent(list)
        setOffline(false)
      } catch {
        setTalent([DEMO_PROFILE])
      }
    }

    if (user && viewingId && viewingId !== user.id) {
      try {
        const rel = await api.connectionWith(viewingId)
        setRelation(rel)
      } catch {
        setRelation(null)
      }
    } else {
      setRelation(null)
    }
  }, [isMe, isRecruiter, user, viewingId])

  async function sendConnect() {
    if (!profile || !user || profile.user_id === user.id) return
    setConnectBusy(true)
    setError('')
    try {
      const rel = await api.sendConnectionRequest({
        addressee_id: profile.user_id,
        note: '',
      })
      setRelation(rel)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send request')
    } finally {
      setConnectBusy(false)
    }
  }

  async function acceptIncoming() {
    if (!relation) return
    setConnectBusy(true)
    try {
      const rel = await api.updateConnection(relation.id, 'accepted')
      setRelation(rel)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not accept')
    } finally {
      setConnectBusy(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [refresh])

  const canEdit = Boolean(profile?.is_owner || (isMe && (user || offline)))

  const subtitle = useMemo(() => {
    if (!profile) return ''
    const bits = [profile.current_role, profile.current_company].filter(Boolean)
    return bits.join(' · ')
  }, [profile])

  async function onSave(e: FormEvent) {
    e.preventDefault()
    if (!form || !profile) return
    setSaving(true)
    setError('')
    const payload: ProfileUpdateInput = {
      name: form.name.trim(),
      headline: form.headline.trim(),
      location: form.location.trim(),
      about: form.about.trim(),
      open_to_work: form.open_to_work,
      current_role: form.current_role.trim(),
      current_company: form.current_company.trim(),
      skills: splitCsv(form.skillsText),
      target_roles: splitCsv(form.targetRolesText),
      website_url: form.website_url.trim() || null,
      linkedin_url: form.linkedin_url.trim() || null,
      visibility: form.visibility,
      experience: form.experience.filter((x) => x.title.trim() || x.company.trim()),
      education: form.education.filter((x) => x.school.trim() || x.degree.trim()),
    }
    try {
      if (user && !offline) {
        const updated = await api.updateMyProfile(payload)
        setProfile(updated)
        setForm(toForm(updated))
      } else {
        const local: LearnerProfileView = {
          ...profile,
          ...payload,
          skills: payload.skills ?? [],
          target_roles: payload.target_roles ?? [],
          experience: payload.experience ?? [],
          education: payload.education ?? [],
          website_url: payload.website_url ?? null,
          linkedin_url: payload.linkedin_url ?? null,
          visibility: payload.visibility ?? 'public',
          name: payload.name || profile.name,
          is_owner: true,
          updated_at: new Date().toISOString(),
        }
        saveLocalProfile(local)
        setProfile(local)
        setForm(toForm(local))
        setOffline(true)
      }
      setEditing(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Shell wide>
      <section className="profile-page">
        <div className="profile-hero-row">
          <div>
            <p className="eyebrow">{isRecruiter ? 'Talent profiles' : 'Your profile'}</p>
            <h1>{isMe ? 'Learner profile' : profile?.name || 'Profile'}</h1>
            <p className="lede">
              LinkedIn-style talent card — headline, about, experience, skills, and open-to-work.
              Recruiters browse; learners own the story.
            </p>
          </div>
          <div className="profile-hero-actions">
            {canEdit && !editing && (
              <button type="button" className="btn primary" onClick={() => setEditing(true)}>
                Edit profile
              </button>
            )}
            {editing && (
              <button type="button" className="btn ghost" onClick={() => setEditing(false)}>
                Cancel
              </button>
            )}
            {!user && isMe && (
              <Link className="btn ghost" to="/register">
                Create account to sync
              </Link>
            )}
            <Link className="btn ghost" to="/network">
              My network
            </Link>
            <Link className="btn ghost" to="/messages">
              Messaging
            </Link>
            <Link className="btn ghost" to="/jobs">
              Jobs
            </Link>
          </div>
        </div>

        {offline && (
          <p className="profile-banner muted">
            Demo / local mode — edits save in this browser until the cloud API is connected.
          </p>
        )}
        {error && <p className="profile-banner error">{error}</p>}

        {!profile || !form ? (
          <p className="muted">Loading profile…</p>
        ) : editing ? (
          <form className="panel profile-editor" onSubmit={onSave}>
            <h2>Edit profile</h2>
            <div className="jobs-form-grid">
              <label>
                Full name
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </label>
              <label>
                Headline
                <input
                  value={form.headline}
                  onChange={(e) => setForm({ ...form, headline: e.target.value })}
                  placeholder="Staff Engineer · Agentic AI · Open to roles"
                />
              </label>
              <label>
                Location
                <input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </label>
              <label>
                Visibility
                <select
                  value={form.visibility}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      visibility: e.target.value as 'public' | 'private',
                    })
                  }
                >
                  <option value="public">Public (recruiters can find you)</option>
                  <option value="private">Private (only you)</option>
                </select>
              </label>
              <label>
                Current role
                <input
                  value={form.current_role}
                  onChange={(e) => setForm({ ...form, current_role: e.target.value })}
                />
              </label>
              <label>
                Current company
                <input
                  value={form.current_company}
                  onChange={(e) => setForm({ ...form, current_company: e.target.value })}
                />
              </label>
            </div>
            <label className="jobs-mine">
              <input
                type="checkbox"
                checked={form.open_to_work}
                onChange={(e) => setForm({ ...form, open_to_work: e.target.checked })}
              />
              Open to work
            </label>
            <label>
              About
              <textarea
                rows={5}
                value={form.about}
                onChange={(e) => setForm({ ...form, about: e.target.value })}
              />
            </label>
            <label>
              Skills (comma-separated)
              <input
                value={form.skillsText}
                onChange={(e) => setForm({ ...form, skillsText: e.target.value })}
              />
            </label>
            <label>
              Target roles (comma-separated)
              <input
                value={form.targetRolesText}
                onChange={(e) => setForm({ ...form, targetRolesText: e.target.value })}
              />
            </label>
            <div className="jobs-form-grid">
              <label>
                Website
                <input
                  value={form.website_url}
                  onChange={(e) => setForm({ ...form, website_url: e.target.value })}
                />
              </label>
              <label>
                LinkedIn URL
                <input
                  value={form.linkedin_url}
                  onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
                />
              </label>
            </div>

            <h3>Experience</h3>
            {form.experience.map((exp, idx) => (
              <div className="profile-edit-block" key={`exp-${idx}`}>
                <div className="jobs-form-grid">
                  <label>
                    Title
                    <input
                      value={exp.title}
                      onChange={(e) => {
                        const experience = [...form.experience]
                        experience[idx] = { ...exp, title: e.target.value }
                        setForm({ ...form, experience })
                      }}
                    />
                  </label>
                  <label>
                    Company
                    <input
                      value={exp.company}
                      onChange={(e) => {
                        const experience = [...form.experience]
                        experience[idx] = { ...exp, company: e.target.value }
                        setForm({ ...form, experience })
                      }}
                    />
                  </label>
                  <label>
                    Start
                    <input
                      value={exp.start}
                      onChange={(e) => {
                        const experience = [...form.experience]
                        experience[idx] = { ...exp, start: e.target.value }
                        setForm({ ...form, experience })
                      }}
                    />
                  </label>
                  <label>
                    End
                    <input
                      value={exp.end}
                      onChange={(e) => {
                        const experience = [...form.experience]
                        experience[idx] = { ...exp, end: e.target.value }
                        setForm({ ...form, experience })
                      }}
                    />
                  </label>
                </div>
                <label>
                  Description
                  <textarea
                    rows={2}
                    value={exp.description}
                    onChange={(e) => {
                      const experience = [...form.experience]
                      experience[idx] = { ...exp, description: e.target.value }
                      setForm({ ...form, experience })
                    }}
                  />
                </label>
              </div>
            ))}
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => setForm({ ...form, experience: [...form.experience, emptyExperience()] })}
            >
              Add experience
            </button>

            <h3>Education</h3>
            {form.education.map((edu, idx) => (
              <div className="profile-edit-block" key={`edu-${idx}`}>
                <div className="jobs-form-grid">
                  <label>
                    School
                    <input
                      value={edu.school}
                      onChange={(e) => {
                        const education = [...form.education]
                        education[idx] = { ...edu, school: e.target.value }
                        setForm({ ...form, education })
                      }}
                    />
                  </label>
                  <label>
                    Degree
                    <input
                      value={edu.degree}
                      onChange={(e) => {
                        const education = [...form.education]
                        education[idx] = { ...edu, degree: e.target.value }
                        setForm({ ...form, education })
                      }}
                    />
                  </label>
                  <label>
                    Field
                    <input
                      value={edu.field}
                      onChange={(e) => {
                        const education = [...form.education]
                        education[idx] = { ...edu, field: e.target.value }
                        setForm({ ...form, education })
                      }}
                    />
                  </label>
                  <label>
                    Years
                    <input
                      value={`${edu.start}${edu.end ? ` – ${edu.end}` : ''}`}
                      onChange={(e) => {
                        const [start, end] = e.target.value.split('–').map((s) => s.trim())
                        const education = [...form.education]
                        education[idx] = { ...edu, start: start || '', end: end || '' }
                        setForm({ ...form, education })
                      }}
                      placeholder="2012 – 2016"
                    />
                  </label>
                </div>
              </div>
            ))}
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => setForm({ ...form, education: [...form.education, emptyEducation()] })}
            >
              Add education
            </button>

            <div className="profile-editor-actions">
              <button type="submit" className="btn primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save profile'}
              </button>
            </div>
          </form>
        ) : (
          <div className="profile-layout">
            <div className="profile-main">
              <article className="panel profile-card">
                <div className="profile-cover" aria-hidden="true" />
                <div className="profile-identity">
                  <div className="profile-avatar" aria-hidden="true">
                    {initials(profile.name)}
                  </div>
                  <div className="profile-identity-text">
                    <div className="profile-name-row">
                      <h2>{profile.name}</h2>
                      {profile.open_to_work && <span className="open-badge">Open to work</span>}
                      {profile.is_pro && <span className="plan-badge pro">Pro</span>}
                    </div>
                    {profile.headline && <p className="profile-headline">{profile.headline}</p>}
                    {subtitle && <p className="profile-sub">{subtitle}</p>}
                    {profile.location && <p className="muted">{profile.location}</p>}
                    <div className="profile-links">
                      {profile.website_url && (
                        <a href={profile.website_url} target="_blank" rel="noreferrer">
                          Website
                        </a>
                      )}
                      {profile.linkedin_url && (
                        <a href={profile.linkedin_url} target="_blank" rel="noreferrer">
                          LinkedIn
                        </a>
                      )}
                      {profile.email && canEdit && <span className="muted">{profile.email}</span>}
                    </div>
                    {!isMe && user && profile.user_id > 0 && (
                      <div className="profile-connect-actions">
                        {relation?.status === 'accepted' ? (
                          <Link
                            className="btn primary sm"
                            to={`/messages?with=${profile.user_id}`}
                          >
                            Message
                          </Link>
                        ) : relation?.status === 'pending' &&
                          relation.direction === 'outgoing' ? (
                          <span className="plan-badge">Pending</span>
                        ) : relation?.status === 'pending' &&
                          relation.direction === 'incoming' ? (
                          <button
                            type="button"
                            className="btn primary sm"
                            disabled={connectBusy}
                            onClick={() => void acceptIncoming()}
                          >
                            Accept request
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn primary sm"
                            disabled={connectBusy}
                            onClick={() => void sendConnect()}
                          >
                            Connect
                          </button>
                        )}
                        <Link className="btn ghost sm" to="/network">
                          Network
                        </Link>
                      </div>
                    )}
                    {!isMe && !user && (
                      <div className="profile-connect-actions">
                        <Link className="btn primary sm" to="/login">
                          Sign in to connect
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </article>

              {profile.about && (
                <section className="panel profile-section">
                  <h3>About</h3>
                  <p className="jobs-body">{profile.about}</p>
                </section>
              )}

              {profile.target_roles.length > 0 && (
                <section className="panel profile-section">
                  <h3>Open to</h3>
                  <div className="skill-chips">
                    {profile.target_roles.map((r) => (
                      <span key={r}>{r}</span>
                    ))}
                  </div>
                </section>
              )}

              {profile.experience.length > 0 && (
                <section className="panel profile-section">
                  <h3>Experience</h3>
                  <ul className="profile-timeline">
                    {profile.experience.map((exp, i) => (
                      <li key={`${exp.company}-${i}`}>
                        <strong>{exp.title || 'Role'}</strong>
                        <span>
                          {exp.company}
                          {exp.location ? ` · ${exp.location}` : ''}
                        </span>
                        <em>
                          {[exp.start, exp.end].filter(Boolean).join(' – ') || 'Dates TBD'}
                        </em>
                        {exp.description && <p>{exp.description}</p>}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {profile.education.length > 0 && (
                <section className="panel profile-section">
                  <h3>Education</h3>
                  <ul className="profile-timeline">
                    {profile.education.map((edu, i) => (
                      <li key={`${edu.school}-${i}`}>
                        <strong>{edu.school || 'School'}</strong>
                        <span>
                          {[edu.degree, edu.field].filter(Boolean).join(' · ')}
                        </span>
                        <em>{[edu.start, edu.end].filter(Boolean).join(' – ')}</em>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {profile.skills.length > 0 && (
                <section className="panel profile-section">
                  <h3>Skills</h3>
                  <div className="skill-chips">
                    {profile.skills.map((s) => (
                      <span key={s}>{s}</span>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <aside className="profile-side">
              <section className="panel profile-section">
                <h3>Practice readiness</h3>
                <p className="muted">
                  Strengthen this profile with interview practice on {BRAND.product}.
                </p>
                <div className="profile-side-links">
                  <Link to="/">Practice tracks</Link>
                  <Link to="/agentic-path">Agentic AI path</Link>
                  <Link to="/snowflake-path">Snowflake path</Link>
                  <Link to="/jobs">Browse jobs</Link>
                </div>
              </section>

              {isRecruiter && talent.length > 0 && (
                <section className="panel profile-section">
                  <h3>Talent open to work</h3>
                  <ul className="talent-mini-list">
                    {talent.map((t) => (
                      <li key={t.user_id}>
                        <Link to={`/profile/${t.user_id}`}>
                          <strong>{t.name}</strong>
                          <span>{t.headline || t.current_role || 'Learner'}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </aside>
          </div>
        )}
      </section>
    </Shell>
  )
}
