import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ApiError,
  api,
  type ChatMessageView,
  type MessageThread,
} from './api'
import { useAuth } from './auth'
import {
  initials,
  loadLocalConnections,
  loadLocalMessages,
  saveLocalMessages,
  type LocalMsg,
} from './localSocial'
import { usePersona } from './persona'
import { Shell } from './Shell'
import './App.css'

function timeLabel(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const sameDay = new Date().toDateString() === d.toDateString()
  return sameDay
    ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export function MessagesPage() {
  const { user } = useAuth()
  const { isRecruiter } = usePersona()
  const [params, setParams] = useSearchParams()
  const peerParam = params.get('with')
  const peerId = peerParam ? Number(peerParam) : null

  const [threads, setThreads] = useState<MessageThread[]>([])
  const [messages, setMessages] = useState<ChatMessageView[]>([])
  const [peerName, setPeerName] = useState('Conversation')
  const [peerHeadline, setPeerHeadline] = useState('')
  const [body, setBody] = useState('')
  const [offline, setOffline] = useState(false)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const meId = user?.id ?? -1

  const acceptedPeers = useMemo(() => {
    return loadLocalConnections().filter((c) => c.status === 'accepted')
  }, [threads, offline])

  const refreshThreads = useCallback(async () => {
    setError('')
    try {
      const list = await api.listMessageThreads()
      setThreads(list)
      setOffline(false)
    } catch {
      const conns = loadLocalConnections().filter((c) => c.status === 'accepted')
      const msgs = loadLocalMessages()
      const map = new Map<number, MessageThread>()
      for (const c of conns) {
        map.set(c.other_user_id, {
          peer_user_id: c.other_user_id,
          peer_name: c.other_name,
          peer_headline: c.other_headline,
          last_message: 'Say hello — start the conversation',
          last_at: c.updated_at,
          unread_count: 0,
        })
      }
      for (const m of [...msgs].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )) {
        const peer = m.sender_id === meId ? m.recipient_id : m.sender_id
        const existing = map.get(peer)
        const name =
          existing?.peer_name ||
          m.peer_name ||
          conns.find((c) => c.other_user_id === peer)?.other_name ||
          `User ${peer}`
        if (!existing || new Date(m.created_at) >= new Date(existing.last_at)) {
          map.set(peer, {
            peer_user_id: peer,
            peer_name: name,
            peer_headline: existing?.peer_headline || '',
            last_message: m.body.slice(0, 160),
            last_at: m.created_at,
            unread_count: 0,
          })
        }
      }
      setThreads(
        [...map.values()].sort(
          (a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime(),
        ),
      )
      setOffline(true)
    }
  }, [meId])

  const loadConversation = useCallback(
    async (id: number) => {
      setError('')
      try {
        const rows = await api.getMessagesWith(id)
        setMessages(rows)
        setOffline(false)
        const t = threads.find((x) => x.peer_user_id === id)
        if (t) {
          setPeerName(t.peer_name)
          setPeerHeadline(t.peer_headline)
        } else {
          try {
            const rel = await api.connectionWith(id)
            if (rel) {
              setPeerName(rel.other_name)
              setPeerHeadline(rel.other_headline)
            }
          } catch {
            setPeerName(`User ${id}`)
          }
        }
      } catch {
        const conns = loadLocalConnections().filter((c) => c.status === 'accepted')
        const peer = conns.find((c) => c.other_user_id === id)
        setPeerName(peer?.other_name || `User ${id}`)
        setPeerHeadline(peer?.other_headline || '')
        const rows = loadLocalMessages()
          .filter(
            (m) =>
              (m.sender_id === meId && m.recipient_id === id) ||
              (m.sender_id === id && m.recipient_id === meId),
          )
          .map((m) => ({ ...m, mine: m.sender_id === meId }))
          .sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
          )
        setMessages(rows)
        setOffline(true)
      }
    },
    [meId, threads],
  )

  useEffect(() => {
    void refreshThreads()
  }, [refreshThreads])

  useEffect(() => {
    if (peerId != null && !Number.isNaN(peerId)) {
      void loadConversation(peerId)
    } else {
      setMessages([])
    }
  }, [peerId, loadConversation])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function selectPeer(id: number) {
    setParams({ with: String(id) })
  }

  async function onSend(e: FormEvent) {
    e.preventDefault()
    if (!peerId || !body.trim()) return
    setSending(true)
    setError('')
    const text = body.trim()
    try {
      if (offline || !user) {
        const conns = loadLocalConnections().filter((c) => c.status === 'accepted')
        if (!conns.some((c) => c.other_user_id === peerId)) {
          throw new Error('Connect first to message')
        }
        const msg: LocalMsg = {
          id: -Date.now(),
          sender_id: meId,
          recipient_id: peerId,
          body: text,
          created_at: new Date().toISOString(),
          read_at: null,
          mine: true,
          peer_name: peerName,
        }
        const next = [...loadLocalMessages(), msg]
        saveLocalMessages(next)
        setBody('')
        await loadConversation(peerId)
        await refreshThreads()
      } else {
        await api.sendMessage({ recipient_id: peerId, body: text })
        setBody('')
        await loadConversation(peerId)
        await refreshThreads()
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err))
    } finally {
      setSending(false)
    }
  }

  return (
    <Shell wide>
      <section className="messages-page">
        <div className="page-head">
          <div>
            <h1>Chat</h1>
            <p className="page-sub">
              LinkedIn-style messaging — recruiters and learners chat after they
              connect.
            </p>
          </div>
          <Link className="btn ghost sm" to="/network">
            Network
          </Link>
        </div>

        {offline && <p className="hint-line">Saved on this device until the API is live.</p>}
        {error && <p className="profile-banner error">{error}</p>}

        <div className="messages-layout">
          <aside className="messages-threads">
            <div className="messages-threads-head">
              <strong>Inbox</strong>
            </div>
            {threads.length === 0 && (
              <div className="pad">
                <p className="muted">
                  No chats yet. Connect on Network, then message — or use Messaging
                  (bottom right).
                </p>
                <Link className="btn primary sm" to="/network">
                  Go to Network
                </Link>
              </div>
            )}
            {threads.map((t) => (
              <button
                type="button"
                key={t.peer_user_id}
                className={
                  peerId === t.peer_user_id ? 'thread-card active' : 'thread-card'
                }
                onClick={() => selectPeer(t.peer_user_id)}
              >
                <div className="network-avatar sm" aria-hidden="true">
                  {initials(t.peer_name)}
                </div>
                <div className="thread-meta">
                  <strong>
                    {t.peer_name}
                    {t.unread_count > 0 && <span className="unread-dot">{t.unread_count}</span>}
                  </strong>
                  <span>{t.last_message}</span>
                </div>
              </button>
            ))}
            {offline && acceptedPeers.length > 0 && threads.length === 0 && (
              <div className="pad stack-sm">
                {acceptedPeers.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="btn ghost sm"
                    onClick={() => selectPeer(c.other_user_id)}
                  >
                    {c.other_name}
                  </button>
                ))}
              </div>
            )}
          </aside>

          <div className="messages-pane">
            {!peerId ? (
              <div className="messages-empty">
                <p>Select a conversation</p>
                <p className="muted">
                  Recruiters message about roles; learners share readiness and
                  interview practice.
                </p>
              </div>
            ) : (
              <>
                <header className="messages-pane-head">
                  <div className="network-avatar sm" aria-hidden="true">
                    {initials(peerName)}
                  </div>
                  <div>
                    <strong>{peerName}</strong>
                    {peerHeadline && <p className="muted">{peerHeadline}</p>}
                  </div>
                  {peerId > 0 && (
                    <Link className="btn ghost sm" to={`/profile/${peerId}`}>
                      Profile
                    </Link>
                  )}
                </header>
                <div className="messages-stream">
                  {messages.length === 0 && (
                    <div className="chat-templates">
                      <p className="muted center">Quick starters</p>
                      {(isRecruiter
                        ? [
                            'Hi — I saw your open-to-work profile. Interested in a quick chat about a role?',
                            'Thanks for applying. Could we schedule a short screen this week?',
                          ]
                        : [
                            'Thanks for connecting — happy to share my practice readiness.',
                            'I applied to your role and practiced the loop on Practice Out Loud.',
                          ]
                      ).map((t) => (
                        <button
                          key={t}
                          type="button"
                          className="chat-template"
                          onClick={() => setBody(t)}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  )}
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={m.mine ? 'chat-bubble mine' : 'chat-bubble'}
                    >
                      <p>{m.body}</p>
                      <em>{timeLabel(m.created_at)}</em>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>
                <form className="messages-composer" onSubmit={onSend}>
                  <input
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder={
                      isRecruiter ? 'Message candidate…' : 'Message recruiter…'
                    }
                    maxLength={4000}
                    aria-label="Message"
                  />
                  <button
                    type="submit"
                    className="btn primary sm"
                    disabled={sending || !body.trim()}
                  >
                    Send
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </section>
    </Shell>
  )
}
