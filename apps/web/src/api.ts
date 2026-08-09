import { TRACKS, localFeedback, localQuestions } from './data'

export type TrackId =
  | 'staff-interview'
  | 'em-interview'
  | 'java-to-ai'
  | 'java-to-python'
  | 'java'
  | 'python'
  | 'javascript'
  | 'typescript'
  | 'react'
  | 'nodejs'
  | 'html'
  | 'css'

export type Track = {
  id: TrackId
  title: string
  audience: string
  summary: string
  outcomes: string[]
  study_plan: string[]
}

export type TutorQuestion = {
  id: string
  track_id: TrackId
  topic_id: string
  category: string
  prompt: string
  hints: string[]
  strong_answer_signals: string[]
}

export type Feedback = {
  score: number
  summary: string
  strengths: string[]
  gaps: string[]
  better_answer: string
  next_drill: string
  provider: string
  delivery_tips?: string[]
  input_mode?: 'text' | 'voice'
}

export type UserProfile = {
  id: number
  email: string
  name: string
  plan: string
  subscription_status: string
  is_pro: boolean
  is_admin?: boolean
  feedback_used_today: number
  feedback_limit_today: number | string
  free_practice_tracks: string[]
}

export type AdminOverview = {
  total_users: number
  free_users: number
  pro_users: number
  admin_users: number
  signups_last_7d: number
  signups_last_30d: number
  events_last_7d: number
  feedback_events_last_7d: number
  free_feedback_today: number
  signups_by_day: { day: string; count: number }[]
  top_features: { key: string; count: number; label?: string | null }[]
  top_paths: { key: string; count: number; label?: string | null }[]
  top_tracks: { key: string; count: number; label?: string | null }[]
  recent_users: {
    id: number
    email: string
    name: string
    plan: string
    is_pro: boolean
    is_admin: boolean
    created_at: string
  }[]
}

export type PlanCard = {
  id: string
  name: string
  price_monthly: string
  price_yearly: string
  features: string[]
  limits: Record<string, string | number>
}

export type BillingPlans = {
  plans: PlanCard[]
  stripe_enabled: boolean
  demo_upgrade_available: boolean
}

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''
const TOKEN_KEY = 'ats_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export class ApiError extends Error {
  status: number
  code?: string
  raw: unknown

  constructor(status: number, message: string, raw?: unknown, code?: string) {
    super(message)
    this.status = status
    this.raw = raw
    this.code = code
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  })

  if (!res.ok) {
    let raw: unknown = null
    let message = `Request failed (${res.status})`
    let code: string | undefined
    try {
      raw = await res.json()
      const detail = (raw as { detail?: unknown }).detail
      if (typeof detail === 'string') message = detail
      else if (detail && typeof detail === 'object' && 'message' in detail) {
        message = String((detail as { message: string }).message)
        code = (detail as { code?: string }).code
      }
    } catch {
      const text = await res.text().catch(() => '')
      if (text) message = text
    }
    throw new ApiError(res.status, message, raw, code)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  apiBase: API_BASE,

  async tracks(): Promise<Track[]> {
    try {
      return await request<Track[]>('/v1/tutor/tracks')
    } catch {
      return TRACKS
    }
  },

  async questions(trackId: string): Promise<TutorQuestion[]> {
    try {
      return await request<TutorQuestion[]>(
        `/v1/tutor/tracks/${trackId}/questions`,
      )
    } catch {
      return localQuestions(trackId)
    }
  },

  async feedback(body: {
    track_id: TrackId
    question_id: string
    answer: string
    input_mode?: 'text' | 'voice'
  }): Promise<Feedback> {
    return request<Feedback>('/v1/tutor/feedback', {
      method: 'POST',
      body: JSON.stringify({
        ...body,
        input_mode: body.input_mode ?? 'text',
      }),
    })
  },

  /** Offline/demo fallback when API is unreachable (Pages-only). */
  localFeedback(body: {
    track_id: TrackId
    question_id: string
    answer: string
    input_mode?: 'text' | 'voice'
  }): Feedback {
    return localFeedback(body)
  },

  async register(input: {
    email: string
    password: string
    name: string
  }): Promise<{ access_token: string; user: UserProfile }> {
    return request('/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  async login(input: {
    email: string
    password: string
  }): Promise<{ access_token: string; user: UserProfile }> {
    return request('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  async me(): Promise<UserProfile> {
    return request('/v1/auth/me')
  },

  async plans(): Promise<BillingPlans> {
    return request('/v1/billing/plans')
  },

  async checkout(interval: 'month' | 'year'): Promise<{ url: string; mode: string }> {
    return request('/v1/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ interval }),
    })
  },

  async portal(): Promise<{ url: string }> {
    return request('/v1/billing/portal', { method: 'POST' })
  },

  async demoUpgrade(): Promise<{ ok: boolean; user: UserProfile }> {
    return request('/v1/billing/demo-upgrade', { method: 'POST' })
  },

  async adminOverview(days = 14): Promise<AdminOverview> {
    return request(`/v1/admin/overview?days=${days}`)
  },
}

export const FREE_PRACTICE_TRACKS = new Set([
  'html',
  'css',
  'javascript',
  'python',
  'java-to-python',
])
