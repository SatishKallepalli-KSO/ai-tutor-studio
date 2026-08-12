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
  persona?: 'learner' | 'recruiter'
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

/** Safe public aggregates — no emails, no admin flags. */
export type PublicStats = {
  total_users: number
  feedback_events_last_7d: number
  tracks_count: number
  generated_at: string
}

export type PlanCard = {
  id: string
  name: string
  price_monthly: string
  price_yearly: string
  features: string[]
  limits: Record<string, string | number>
}

/** Free AI feedbacks on custom questions per topic (must match server plans.py). */
export const FREE_CUSTOM_FEEDBACK_PER_TOPIC = 2

export type CustomFeedbackQuota = {
  track_id: string
  topic_id: string
  used: number
  limit: number | string
  remaining: number | string
  is_pro: boolean
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
    question_id?: string | null
    custom_prompt?: string | null
    topic_id?: string | null
    custom_question_client_id?: string | null
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
    question_id?: string | null
    custom_prompt?: string | null
    answer: string
    input_mode?: 'text' | 'voice'
  }): Feedback {
    return localFeedback(body)
  },

  async listCustomQuestions(params?: {
    track_id?: string
    topic_id?: string
  }): Promise<CloudCustomQuestion[]> {
    const sp = new URLSearchParams()
    if (params?.track_id) sp.set('track_id', params.track_id)
    if (params?.topic_id) sp.set('topic_id', params.topic_id)
    const qs = sp.toString()
    return request(`/v1/tutor/custom-questions${qs ? `?${qs}` : ''}`)
  },

  async customFeedbackQuota(params: {
    track_id: string
    topic_id?: string | null
  }): Promise<CustomFeedbackQuota> {
    const sp = new URLSearchParams()
    sp.set('track_id', params.track_id)
    if (params.topic_id) sp.set('topic_id', params.topic_id)
    return request(`/v1/tutor/custom-questions/quota?${sp.toString()}`)
  },

  async upsertCustomQuestion(input: {
    client_id: string
    track_id: string
    topic_id?: string
    prompt: string
    title?: string
    saved?: boolean
  }): Promise<CloudCustomQuestion> {
    return request('/v1/tutor/custom-questions', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  async patchCustomQuestion(
    clientId: string,
    input: {
      prompt?: string
      title?: string
      saved?: boolean
      topic_id?: string
    },
  ): Promise<CloudCustomQuestion> {
    return request(`/v1/tutor/custom-questions/${encodeURIComponent(clientId)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
  },

  async deleteCustomQuestion(clientId: string): Promise<{ ok: boolean }> {
    return request(
      `/v1/tutor/custom-questions/${encodeURIComponent(clientId)}`,
      { method: 'DELETE' },
    )
  },

  async recordCustomAttempt(input: {
    client_id: string
    track_id: string
    topic_id?: string
    prompt: string
    title?: string
    score: number
    provider?: string
    input_mode?: 'text' | 'voice'
  }): Promise<CloudCustomQuestion> {
    return request('/v1/tutor/custom-questions/attempt', {
      method: 'POST',
      body: JSON.stringify({
        ...input,
        input_mode: input.input_mode ?? 'text',
      }),
    })
  },

  async register(input: {
    email: string
    password: string
    name: string
    persona?: 'learner' | 'recruiter'
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

  async updatePersona(
    persona: 'learner' | 'recruiter',
  ): Promise<UserProfile> {
    return request('/v1/auth/me/persona', {
      method: 'PATCH',
      body: JSON.stringify({ persona }),
    })
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

  async publicStats(): Promise<PublicStats> {
    return request('/v1/stats/public')
  },

  async listJobs(params?: {
    q?: string
    workplace?: string
    mine?: boolean
    status?: 'open' | 'closed' | 'all'
  }): Promise<JobPost[]> {
    const sp = new URLSearchParams()
    if (params?.q) sp.set('q', params.q)
    if (params?.workplace) sp.set('workplace', params.workplace)
    if (params?.mine) sp.set('mine', 'true')
    if (params?.status) sp.set('status', params.status)
    const qs = sp.toString()
    return request(`/v1/jobs${qs ? `?${qs}` : ''}`)
  },

  async createJob(input: JobCreateInput): Promise<JobPost> {
    return request('/v1/jobs', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  async updateJob(
    id: number,
    input: Partial<JobCreateInput> & { status?: 'open' | 'closed' },
  ): Promise<JobPost> {
    return request(`/v1/jobs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
  },

  async deleteJob(id: number): Promise<{ ok: boolean }> {
    return request(`/v1/jobs/${id}`, { method: 'DELETE' })
  },

  async myProfile(): Promise<LearnerProfileView> {
    return request('/v1/profiles/me')
  },

  async updateMyProfile(input: ProfileUpdateInput): Promise<LearnerProfileView> {
    return request('/v1/profiles/me', {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
  },

  async getProfile(userId: number): Promise<LearnerProfileView> {
    return request(`/v1/profiles/${userId}`)
  },

  async listTalent(params?: {
    q?: string
    open_to_work?: boolean
    limit?: number
  }): Promise<LearnerProfileView[]> {
    const sp = new URLSearchParams()
    if (params?.q) sp.set('q', params.q)
    if (params?.open_to_work != null) sp.set('open_to_work', String(params.open_to_work))
    if (params?.limit) sp.set('limit', String(params.limit))
    const qs = sp.toString()
    return request(qs ? `/v1/profiles/?${qs}` : '/v1/profiles/')
  },

  async listConnections(params?: {
    status?: 'pending' | 'accepted' | 'declined' | 'all'
    direction?: 'incoming' | 'outgoing' | 'all'
  }): Promise<ConnectionView[]> {
    const sp = new URLSearchParams()
    if (params?.status) sp.set('status', params.status)
    if (params?.direction) sp.set('direction', params.direction)
    const qs = sp.toString()
    return request(qs ? `/v1/connections/?${qs}` : '/v1/connections/')
  },

  async connectionWith(userId: number): Promise<ConnectionView | null> {
    return request(`/v1/connections/with/${userId}`)
  },

  async sendConnectionRequest(input: {
    addressee_id: number
    note?: string
  }): Promise<ConnectionView> {
    return request('/v1/connections/', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  async updateConnection(
    id: number,
    status: 'accepted' | 'declined' | 'withdrawn',
  ): Promise<ConnectionView> {
    return request(`/v1/connections/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
  },

  async deleteConnection(id: number): Promise<{ ok: boolean }> {
    return request(`/v1/connections/${id}`, { method: 'DELETE' })
  },

  async listMessageThreads(): Promise<MessageThread[]> {
    return request('/v1/messages/threads')
  },

  async getMessagesWith(peerUserId: number): Promise<ChatMessageView[]> {
    return request(`/v1/messages/with/${peerUserId}`)
  },

  async sendMessage(input: {
    recipient_id: number
    body: string
  }): Promise<ChatMessageView> {
    return request('/v1/messages/', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  async createScorecard(input: {
    title: string
    summary: Record<string, unknown>
  }): Promise<{ id: string; title: string; summary: Record<string, unknown>; created_at: string }> {
    return request('/v1/scorecards', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  async getScorecard(
    id: string,
  ): Promise<{ id: string; title: string; summary: Record<string, unknown>; created_at: string }> {
    return request(`/v1/scorecards/${encodeURIComponent(id)}`)
  },
}

export type ExperienceItem = {
  title: string
  company: string
  location: string
  start: string
  end: string
  description: string
}

export type EducationItem = {
  school: string
  degree: string
  field: string
  start: string
  end: string
}

export type LearnerProfileView = {
  user_id: number
  name: string
  email?: string | null
  persona: string
  plan: string
  is_pro: boolean
  headline: string
  location: string
  about: string
  open_to_work: boolean
  current_role: string
  current_company: string
  skills: string[]
  experience: ExperienceItem[]
  education: EducationItem[]
  target_roles: string[]
  website_url: string | null
  linkedin_url: string | null
  visibility: string
  is_owner: boolean
  updated_at: string | null
}

export type ProfileUpdateInput = {
  name?: string
  headline?: string
  location?: string
  about?: string
  open_to_work?: boolean
  current_role?: string
  current_company?: string
  skills?: string[]
  experience?: ExperienceItem[]
  education?: EducationItem[]
  target_roles?: string[]
  website_url?: string | null
  linkedin_url?: string | null
  visibility?: 'public' | 'private'
}

export type ConnectionView = {
  id: number
  requester_id: number
  addressee_id: number
  status: string
  note: string
  created_at: string
  updated_at: string
  direction: 'incoming' | 'outgoing' | string
  other_user_id: number
  other_name: string
  other_headline: string
  other_persona: string
}

export type MessageThread = {
  peer_user_id: number
  peer_name: string
  peer_headline: string
  last_message: string
  last_at: string
  unread_count: number
}

export type ChatMessageView = {
  id: number
  sender_id: number
  recipient_id: number
  body: string
  created_at: string
  read_at: string | null
  mine: boolean
}

export type JobPost = {
  id: number
  title: string
  company_name: string
  location: string
  employment_type: string
  workplace: string
  description: string
  requirements: string
  salary_range: string | null
  apply_url: string | null
  status: string
  posted_by_user_id: number
  poster_name?: string | null
  created_at: string
  updated_at: string
  is_owner?: boolean
}

export type JobCreateInput = {
  title: string
  company_name: string
  location?: string
  employment_type?: string
  workplace?: string
  description: string
  requirements?: string
  salary_range?: string | null
  apply_url?: string | null
}

export type CloudCustomQuestion = {
  id: number
  client_id: string
  track_id: string
  topic_id: string
  prompt: string
  title: string
  saved: boolean
  attempt_count: number
  last_score: number | null
  last_used_at: string
  created_at: string
  updated_at: string
}

export const FREE_PRACTICE_TRACKS = new Set([
  'html',
  'css',
  'javascript',
  'python',
  'java-to-python',
])
