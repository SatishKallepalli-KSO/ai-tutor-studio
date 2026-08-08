export type TrackId = 'staff-interview' | 'em-interview' | 'java-to-ai'

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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
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
  tracks: () => request<Track[]>('/v1/tutor/tracks'),
  questions: (trackId: string) =>
    request<TutorQuestion[]>(`/v1/tutor/tracks/${trackId}/questions`),
  feedback: (body: {
    track_id: TrackId
    question_id: string
    answer: string
  }) =>
    request<Feedback>('/v1/tutor/feedback', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
}
