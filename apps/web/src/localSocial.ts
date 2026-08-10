/** Shared localStorage helpers for offline/demo social features. */

import type { ChatMessageView, ConnectionView } from './api'

export const LOCAL_CONN_KEY = 'ats_local_connections'
export const LOCAL_MSG_KEY = 'ats_local_messages'
export const LOCAL_PEOPLE_KEY = 'ats_local_people'

export type LocalMsg = ChatMessageView & { peer_name?: string }

export function loadLocalConnections(): ConnectionView[] {
  try {
    const raw = localStorage.getItem(LOCAL_CONN_KEY)
    return raw ? (JSON.parse(raw) as ConnectionView[]) : []
  } catch {
    return []
  }
}

export function saveLocalConnections(rows: ConnectionView[]) {
  localStorage.setItem(LOCAL_CONN_KEY, JSON.stringify(rows))
}

export function loadLocalMessages(): LocalMsg[] {
  try {
    const raw = localStorage.getItem(LOCAL_MSG_KEY)
    return raw ? (JSON.parse(raw) as LocalMsg[]) : []
  } catch {
    return []
  }
}

export function saveLocalMessages(rows: LocalMsg[]) {
  localStorage.setItem(LOCAL_MSG_KEY, JSON.stringify(rows))
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}
