import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  ApiError,
  api,
  type ChatMessageView,
  type ConnectionView,
  type MessageThread,
} from './api'
import { useAuth } from './auth'
import { usePersona } from './persona'

const LOCAL_CONN_KEY = 'ats_local_connections'
const LOCAL_MSG_KEY = 'ats_local_messages'

type LocalMsg = ChatMessageView & { peer_name?: string }

function loadLocalConnections(): ConnectionView[] {
  try {
    const raw = localStorage.getItem(LOCAL_CONN_KEY)
    return raw ? (JSON.parse(raw) as ConnectionView[]) : []
  } catch {
    return []
  }
}

function loadLocalMessages(): LocalMsg[] {
  try {
    const raw = localStorage.getItem(LOCAL_MSG_KEY)
    return raw ? (JSON.parse(raw) as LocalMsg[]) : []
  } catch {
    return []
  }
}

function saveLocalMessages(rows: LocalMsg[]) {
  localStorage.setItem(LOCAL_MSG_KEY, JSON.stringify(rows))
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

const LEARNER_TEMPLATES = [
  'Thanks for connecting — happy to share my practice readiness.',
  'I applied to your role and practiced the loop on Practice Out Loud.',
]

const RECRUITER_TEMPLATES = [
  'Hi — I saw your open-to-work profile. Interested in a quick chat about a role?',
  'Thanks for applying. Could we schedule a short screen this week?',
  'Your Staff narrative stood out. Open to a hiring conversation?',
]

/** LinkedIn-style floating messaging dock for recruiter ↔ learner chat. */
export function ChatDock() {
  const { user } = useAuth()
  const { isRecruiter } = usePersona()
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [threads, setThreads] = useState<MessageThread[]>([])
  const [peerId, setPeerId] = useState<number | null>(null)
  const [peerName, setPeerName] = useState('')
  const [messages, setMessages] = useState<ChatMessageView[]>([])
  const [body, setBody] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const meId = user?.id ?? -1

  const hideOnMessagesPage = location.pathname.includes('/messages')
  const templates = isRecruiter ? RECRUITER_TEMPLATES : LEARNER_TEMPLATES

  const refreshThreads = useCallback(async () => {
    if (!user) {
      const conns = loadLocalConnections().filter((c) => c.status === 'accepted')
      setThreads(
        conns.map((c) => ({
          peer_user_id: c.other_user_id,
          peer_name: c.other_name,
          peer_headline: c.other_headline,
          last_message: 'Start a conversation',
          last_at: c.updated_at,
          unread_count: 0,
        })),
      )
      return
    }
    try {
      setThreads(await api.listMessageThreads())
    } catch {
      const conns = loadLocalConnections().filter((c) => c.status === 'accepted')
      setThreads(
        conns.map((c) => ({
          peer_user_id: c.other_user_id,
          peer_name: c.other_name,
          peer_headline: c.other_headline,
          last_message: 'Start a conversation',
          last_at: c.updated_at,
          unread_count: 0,
        })),
      )
    }
  }, [user])

  const loadConversation = useCallback(
    async (id: number, name: string) => {
      setPeerId(id)
      setPeerName(name)
      setError('')
      try {
        if (user) {
          setMessages(await api.getMessagesWith(id))
        } else {
          throw new Error('offline')
        }
      } catch {
        const rows = loadLocalMessages()
          .filter(
            (m) =>
              (m.sender_id === meId && m.recipient_id === id) ||
              (m.sender_id === id && m.recipient_id === meId),
          )
          .map((m) => ({ ...m, mine: m.sender_id === meId }))
          .sort(
            (a, b) =>
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
          )
        setMessages(rows)
      }
    },
    [meId, user],
  )

  useEffect(() => {
    if (open) void refreshThreads()
  }, [open, refreshThreads])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  async function onSend(e: FormEvent) {
    e.preventDefault()
    if (!peerId || !body.trim()) return
    setSending(true)
    setError('')
    const text = body.trim()
    try {
      if (user) {
        await api.sendMessage({ recipient_id: peerId, body: text })
        setBody('')
        await loadConversation(peerId, peerName)
        await refreshThreads()
      } else {
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
        saveLocalMessages([...loadLocalMessages(), msg])
        setBody('')
        await loadConversation(peerId, peerName)
        await refreshThreads()
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Connect first, then message — LinkedIn-style.',
      )
    } finally {
      setSending(false)
    }
  }

  if (hideOnMessagesPage) return null

  return (
    <div className={`chat-dock${open ? ' open' : ''}`}>
      {!open ? (
        <button
          type="button"
          className="chat-dock-fab"
          onClick={() => setOpen(true)}
          aria-label="Open messaging"
        >
          Messaging
        </button>
      ) : (
        <div className="chat-dock-panel" role="dialog" aria-label="Messaging">
          <header className="chat-dock-head">
            <strong>{peerId ? peerName : 'Messaging'}</strong>
            <div className="chat-dock-head-actions">
              {peerId && (
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => {
                    setPeerId(null)
                    setMessages([])
                  }}
                >
                  Inbox
                </button>
              )}
              <Link
                className="btn ghost sm"
                to={peerId ? `/messages?with=${peerId}` : '/messages'}
                onClick={() => setOpen(false)}
              >
                Expand
              </Link>
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => setOpen(false)}
                aria-label="Close messaging"
              >
                ✕
              </button>
            </div>
          </header>

          {!peerId ? (
            <div className="chat-dock-list">
              <p className="hint-line">
                {isRecruiter
                  ? 'Chat with connected talent — Connect on Network or Profile first.'
                  : 'Chat with recruiters and peers after you connect.'}
              </p>
              {threads.length === 0 ? (
                <button
                  type="button"
                  className="btn primary sm"
                  onClick={() => {
                    setOpen(false)
                    navigate('/network')
                  }}
                >
                  Find people to message
                </button>
              ) : (
                threads.map((t) => (
                  <button
                    type="button"
                    key={t.peer_user_id}
                    className="thread-card"
                    onClick={() => void loadConversation(t.peer_user_id, t.peer_name)}
                  >
                    <div className="network-avatar sm" aria-hidden="true">
                      {initials(t.peer_name)}
                    </div>
                    <div className="thread-meta">
                      <strong>{t.peer_name}</strong>
                      <span>{t.last_message}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            <>
              <div className="chat-dock-stream">
                {messages.length === 0 && (
                  <div className="chat-templates">
                    <p className="muted center">Quick starters</p>
                    {templates.map((t) => (
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
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              {error && <p className="hint-line error">{error}</p>}
              <form className="chat-dock-composer" onSubmit={onSend}>
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
      )}
    </div>
  )
}
