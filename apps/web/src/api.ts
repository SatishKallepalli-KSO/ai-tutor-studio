import { TRACKS, localFeedback, localQuestions } from './data'

export type TrackId =
  | 'staff-interview'
  | 'em-interview'
  | 'java-to-ai'
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
}

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Request failed (${res.status})`)
  }
  return res.json() as Promise<T>
}

export const api = {
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
  }): Promise<Feedback> {
    try {
      return await request<Feedback>('/v1/tutor/feedback', {
        method: 'POST',
        body: JSON.stringify(body),
      })
    } catch {
      return localFeedback(body)
    }
  },
}
