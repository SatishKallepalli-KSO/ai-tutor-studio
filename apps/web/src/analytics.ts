import { getToken } from './api'

type Props = Record<string, string | number | boolean | null | undefined>

type Queued = {
  event_name: string
  path?: string
  properties?: Record<string, string | number | boolean>
}

const queue: Queued[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''

function normalizeProps(props?: Props): Record<string, string | number | boolean> | undefined {
  if (!props) return undefined
  const out: Record<string, string | number | boolean> = {}
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined) continue
    out[k] = v
  }
  return Object.keys(out).length ? out : undefined
}

async function flush() {
  if (!queue.length || !API_BASE) {
    queue.length = 0
    return
  }
  const batch = queue.splice(0, 50)
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
    await fetch(`${API_BASE}/v1/events`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ events: batch }),
      keepalive: true,
    })
  } catch {
    // Analytics must never break the product UX.
  }
}

function scheduleFlush() {
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    void flush()
  }, 800)
}

/** Fire-and-forget product analytics (batched). No-op without VITE_API_BASE. */
export function track(
  event_name: string,
  options?: { path?: string; properties?: Props },
) {
  if (!API_BASE) return
  queue.push({
    event_name,
    path: options?.path ?? (typeof window !== 'undefined' ? window.location.pathname : undefined),
    properties: normalizeProps(options?.properties),
  })
  if (queue.length >= 8) void flush()
  else scheduleFlush()
}

if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flush()
  })
  window.addEventListener('pagehide', () => {
    void flush()
  })
}
