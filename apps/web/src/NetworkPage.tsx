import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ApiError,
  api,
  type ConnectionView,
  type LearnerProfileView,
} from './api'
import { useAuth } from './auth'
import { Shell } from './Shell'
import './App.css'

const LOCAL_CONN_KEY = 'ats_local_connections'
const LOCAL_PEOPLE_KEY = 'ats_local_people'

type LocalPerson = {
  user_id: number
  name: string
  headline: string
}

const DEMO_PEOPLE: LocalPerson[] = [
  {
    user_id: -101,
    name: 'Alex Rivera',
    headline: 'Staff Backend Engineer · Agentic AI',
  },
  {
    user_id: -102,
    name: 'Jordan Lee',
    headline: 'Data Engineer · Snowflake & Cortex',
  },
  {
    user_id: -103,
    name: 'Sam Okonkwo',
    headline: 'Engineering Manager · Hiring loops',
  },
  {
    user_id: -104,
    name: 'Priya Shah',
    headline: 'Recruiter · AI / Platform roles',
  },
]

function loadLocalConnections(): ConnectionView[] {
  try {
    const raw = localStorage.getItem(LOCAL_CONN_KEY)
    return raw ? (JSON.parse(raw) as ConnectionView[]) : []
  } catch {
    return []
  }
}

function saveLocalConnections(rows: ConnectionView[]) {
  localStorage.setItem(LOCAL_CONN_KEY, JSON.stringify(rows))
}

function loadPeople(): LocalPerson[] {
  try {
    const raw = localStorage.getItem(LOCAL_PEOPLE_KEY)
    return raw ? (JSON.parse(raw) as LocalPerson[]) : DEMO_PEOPLE
  } catch {
    return DEMO_PEOPLE
  }
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

function makeLocalRequest(
  meId: number,
  person: LocalPerson,
  note: string,
): ConnectionView {
  const now = new Date().toISOString()
  return {
    id: -Date.now(),
    requester_id: meId,
    addressee_id: person.user_id,
    status: 'pending',
    note,
    created_at: now,
    updated_at: now,
    direction: 'outgoing',
    other_user_id: person.user_id,
    other_name: person.name,
    other_headline: person.headline,
    other_persona: 'learner',
  }
}

export function NetworkPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<'connections' | 'requests' | 'discover'>('connections')
  const [connections, setConnections] = useState<ConnectionView[]>([])
  const [pending, setPending] = useState<ConnectionView[]>([])
  const [people, setPeople] = useState<LocalPerson[]>(DEMO_PEOPLE)
  const [offline, setOffline] = useState(false)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)

  const meId = user?.id ?? -1

  const refresh = useCallback(async () => {
    setError('')
    try {
      const [accepted, pendingAll] = await Promise.all([
        api.listConnections({ status: 'accepted' }),
        api.listConnections({ status: 'pending' }),
      ])
      setConnections(accepted)
      setPending(pendingAll)
      setOffline(false)
      try {
        const talent = await api.listTalent({ limit: 24 })
        setPeople(
          talent
            .filter((t: LearnerProfileView) => t.user_id !== user?.id)
            .map((t) => ({
              user_id: t.user_id,
              name: t.name,
              headline: t.headline || t.current_role || 'Learner',
            })),
        )
      } catch {
        /* keep people list */
      }
    } catch {
      const local = loadLocalConnections()
      setConnections(local.filter((c) => c.status === 'accepted'))
      setPending(local.filter((c) => c.status === 'pending'))
      setPeople(loadPeople())
      setOffline(true)
    }
  }, [user?.id])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const connectedIds = useMemo(() => {
    const ids = new Set<number>()
    for (const c of connections) ids.add(c.other_user_id)
    for (const c of pending) ids.add(c.other_user_id)
    return ids
  }, [connections, pending])

  const discover = useMemo(
    () => people.filter((p) => !connectedIds.has(p.user_id) && p.user_id !== meId),
    [people, connectedIds, meId],
  )

  const incoming = pending.filter((c) => c.direction === 'incoming')
  const outgoing = pending.filter((c) => c.direction === 'outgoing')

  async function connect(person: LocalPerson) {
    setBusyId(person.user_id)
    setError('')
    try {
      if (offline || !user) {
        const rows = loadLocalConnections()
        const req = makeLocalRequest(meId, person, note.trim())
        // Demo: auto-create a mirrored incoming accept path — keep as outgoing pending
        // and also seed one sample incoming if empty
        const next = [req, ...rows]
        if (!rows.some((r) => r.direction === 'incoming' && r.status === 'pending')) {
          const now = new Date().toISOString()
          next.push({
            id: -Date.now() - 1,
            requester_id: -102,
            addressee_id: meId,
            status: 'pending',
            note: 'Would love to connect and compare Snowflake prep notes.',
            created_at: now,
            updated_at: now,
            direction: 'incoming',
            other_user_id: -102,
            other_name: 'Jordan Lee',
            other_headline: 'Data Engineer · Snowflake & Cortex',
            other_persona: 'learner',
          })
        }
        saveLocalConnections(next)
        setNote('')
        await refresh()
      } else {
        await api.sendConnectionRequest({
          addressee_id: person.user_id,
          note: note.trim(),
        })
        setNote('')
        await refresh()
      }
      setTab('requests')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send request')
    } finally {
      setBusyId(null)
    }
  }

  async function respond(id: number, status: 'accepted' | 'declined' | 'withdrawn') {
    setBusyId(id)
    setError('')
    try {
      if (offline || !user) {
        const rows = loadLocalConnections().map((c) => {
          if (c.id !== id) return c
          return {
            ...c,
            status,
            updated_at: new Date().toISOString(),
            direction: c.direction,
          }
        })
        saveLocalConnections(rows)
        await refresh()
      } else {
        await api.updateConnection(id, status)
        await refresh()
      }
      if (status === 'accepted') setTab('connections')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update request')
    } finally {
      setBusyId(null)
    }
  }

  async function remove(id: number) {
    setBusyId(id)
    try {
      if (offline || !user) {
        saveLocalConnections(loadLocalConnections().filter((c) => c.id !== id))
        await refresh()
      } else {
        await api.deleteConnection(id)
        await refresh()
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not remove')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Shell wide>
      <section className="network-page">
        <div className="profile-hero-row">
          <div>
            <p className="eyebrow">My network</p>
            <h1>Connections</h1>
            <p className="lede">
              Send connection requests, grow your network, then message people you know —
              LinkedIn-style for talent and recruiters.
            </p>
          </div>
          <div className="profile-hero-actions">
            <Link className="btn primary" to="/messages">
              Messaging
            </Link>
            <Link className="btn ghost" to="/profile">
              Profile
            </Link>
          </div>
        </div>

        {offline && (
          <p className="profile-banner muted">
            Demo / local mode — requests and accepts save in this browser until the API is
            connected.
          </p>
        )}
        {error && <p className="profile-banner error">{error}</p>}

        <div className="network-tabs" role="tablist">
          <button
            type="button"
            className={tab === 'connections' ? 'active' : ''}
            onClick={() => setTab('connections')}
          >
            Connections ({connections.length})
          </button>
          <button
            type="button"
            className={tab === 'requests' ? 'active' : ''}
            onClick={() => setTab('requests')}
          >
            Requests ({pending.length})
          </button>
          <button
            type="button"
            className={tab === 'discover' ? 'active' : ''}
            onClick={() => setTab('discover')}
          >
            People you may know
          </button>
        </div>

        {tab === 'discover' && (
          <div className="panel network-note">
            <label>
              Optional note with request
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Hi — saw your Agentic AI path progress…"
                maxLength={300}
              />
            </label>
          </div>
        )}

        {tab === 'connections' && (
          <div className="network-grid">
            {connections.length === 0 && (
              <p className="muted">No connections yet — discover people and send a request.</p>
            )}
            {connections.map((c) => (
              <article className="panel network-card" key={c.id}>
                <div className="network-avatar" aria-hidden="true">
                  {initials(c.other_name)}
                </div>
                <div>
                  <strong>{c.other_name}</strong>
                  <p>{c.other_headline || 'Member'}</p>
                  <div className="network-card-actions">
                    <Link className="btn primary sm" to={`/messages?with=${c.other_user_id}`}>
                      Message
                    </Link>
                    {c.other_user_id > 0 && (
                      <Link className="btn ghost sm" to={`/profile/${c.other_user_id}`}>
                        Profile
                      </Link>
                    )}
                    <button
                      type="button"
                      className="btn ghost sm"
                      disabled={busyId === c.id}
                      onClick={() => void remove(c.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {tab === 'requests' && (
          <div className="network-requests">
            <section className="panel profile-section">
              <h3>Incoming</h3>
              {incoming.length === 0 && <p className="muted">No pending invitations.</p>}
              {incoming.map((c) => (
                <div className="request-row" key={c.id}>
                  <div className="network-avatar sm" aria-hidden="true">
                    {initials(c.other_name)}
                  </div>
                  <div className="request-meta">
                    <strong>{c.other_name}</strong>
                    <span>{c.other_headline}</span>
                    {c.note && <em>{c.note}</em>}
                  </div>
                  <div className="network-card-actions">
                    <button
                      type="button"
                      className="btn primary sm"
                      disabled={busyId === c.id}
                      onClick={() => void respond(c.id, 'accepted')}
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      className="btn ghost sm"
                      disabled={busyId === c.id}
                      onClick={() => void respond(c.id, 'declined')}
                    >
                      Ignore
                    </button>
                  </div>
                </div>
              ))}
            </section>
            <section className="panel profile-section">
              <h3>Outgoing</h3>
              {outgoing.length === 0 && <p className="muted">No sent requests.</p>}
              {outgoing.map((c) => (
                <div className="request-row" key={c.id}>
                  <div className="network-avatar sm" aria-hidden="true">
                    {initials(c.other_name)}
                  </div>
                  <div className="request-meta">
                    <strong>{c.other_name}</strong>
                    <span>{c.other_headline}</span>
                    {c.note && <em>{c.note}</em>}
                  </div>
                  <button
                    type="button"
                    className="btn ghost sm"
                    disabled={busyId === c.id}
                    onClick={() => void respond(c.id, 'withdrawn')}
                  >
                    Withdraw
                  </button>
                </div>
              ))}
            </section>
          </div>
        )}

        {tab === 'discover' && (
          <div className="network-grid">
            {discover.length === 0 && (
              <p className="muted">You&apos;re caught up — no new suggestions right now.</p>
            )}
            {discover.map((p) => (
              <article className="panel network-card" key={p.user_id}>
                <div className="network-avatar" aria-hidden="true">
                  {initials(p.name)}
                </div>
                <div>
                  <strong>{p.name}</strong>
                  <p>{p.headline}</p>
                  <div className="network-card-actions">
                    <button
                      type="button"
                      className="btn primary sm"
                      disabled={busyId === p.user_id}
                      onClick={() => void connect(p)}
                    >
                      Connect
                    </button>
                    {p.user_id > 0 && (
                      <Link className="btn ghost sm" to={`/profile/${p.user_id}`}>
                        View
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </Shell>
  )
}
