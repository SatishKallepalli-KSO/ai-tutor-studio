/** Persist recent + saved custom practice questions (local + optional cloud sync). */

export type CustomQuestionRecord = {
  id: string
  trackId: string
  topicId?: string
  prompt: string
  title?: string
  saved: boolean
  lastUsedAt: string
  createdAt: string
  cloudId?: number
  lastScore?: number
  attemptCount?: number
}

const KEY = 'ats_custom_questions_v1'
const MAX_RECENT = 40
const MAX_SAVED = 60

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `cq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function readAll(): CustomQuestionRecord[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as CustomQuestionRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(rows: CustomQuestionRecord[]) {
  localStorage.setItem(KEY, JSON.stringify(rows))
}

function trimList(rows: CustomQuestionRecord[]): CustomQuestionRecord[] {
  const saved = rows
    .filter((r) => r.saved)
    .sort((a, b) => Date.parse(b.lastUsedAt) - Date.parse(a.lastUsedAt))
    .slice(0, MAX_SAVED)
  const recent = rows
    .filter((r) => !r.saved)
    .sort((a, b) => Date.parse(b.lastUsedAt) - Date.parse(a.lastUsedAt))
    .slice(0, MAX_RECENT)
  return [...saved, ...recent]
}

export function listCustomQuestions(opts?: {
  trackId?: string
  topicId?: string | null
}): CustomQuestionRecord[] {
  let rows = readAll()
  if (opts?.trackId) rows = rows.filter((r) => r.trackId === opts.trackId)
  if (opts?.topicId) {
    rows = rows.filter((r) => (r.topicId || '') === opts.topicId)
  }
  return rows.sort(
    (a, b) => Date.parse(b.lastUsedAt) - Date.parse(a.lastUsedAt),
  )
}

export function getCustomQuestion(id: string): CustomQuestionRecord | null {
  return readAll().find((r) => r.id === id) ?? null
}

export function upsertCustomQuestion(input: {
  id?: string
  trackId: string
  topicId?: string | null
  prompt: string
  title?: string
  saved?: boolean
  cloudId?: number
  lastScore?: number
  attemptCount?: number
}): CustomQuestionRecord {
  const prompt = input.prompt.trim()
  const all = readAll()
  const now = new Date().toISOString()
  const existing = input.id ? all.find((r) => r.id === input.id) : undefined
  const row: CustomQuestionRecord = {
    id: existing?.id ?? input.id ?? newId(),
    trackId: input.trackId,
    topicId: input.topicId || undefined,
    prompt,
    title: (input.title ?? existing?.title ?? '').trim() || undefined,
    saved: input.saved ?? existing?.saved ?? false,
    lastUsedAt: now,
    createdAt: existing?.createdAt ?? now,
    cloudId: input.cloudId ?? existing?.cloudId,
    lastScore: input.lastScore ?? existing?.lastScore,
    attemptCount: input.attemptCount ?? existing?.attemptCount ?? 0,
  }
  const next = trimList([row, ...all.filter((r) => r.id !== row.id)])
  writeAll(next)
  return row
}

export function touchCustomQuestion(id: string): CustomQuestionRecord | null {
  const row = getCustomQuestion(id)
  if (!row) return null
  return upsertCustomQuestion(row)
}

export function renameCustomQuestion(
  id: string,
  title: string,
): CustomQuestionRecord | null {
  const row = getCustomQuestion(id)
  if (!row) return null
  return upsertCustomQuestion({ ...row, title: title.trim() })
}

export function setCustomQuestionSaved(
  id: string,
  saved: boolean,
): CustomQuestionRecord | null {
  const row = getCustomQuestion(id)
  if (!row) return null
  return upsertCustomQuestion({ ...row, saved })
}

export function recordCustomAttemptLocal(
  id: string,
  score: number,
): CustomQuestionRecord | null {
  const row = getCustomQuestion(id)
  if (!row) return null
  return upsertCustomQuestion({
    ...row,
    lastScore: score,
    attemptCount: (row.attemptCount ?? 0) + 1,
  })
}

export function deleteCustomQuestion(id: string): void {
  writeAll(readAll().filter((r) => r.id !== id))
}

/** Merge cloud rows into local (cloud wins on same client_id). */
export function mergeCloudCustomQuestions(
  cloud: Array<{
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
  }>,
): CustomQuestionRecord[] {
  const byId = new Map(readAll().map((r) => [r.id, r]))
  for (const c of cloud) {
    const prev = byId.get(c.client_id)
    byId.set(c.client_id, {
      id: c.client_id,
      trackId: c.track_id,
      topicId: c.topic_id || undefined,
      prompt: c.prompt,
      title: c.title || undefined,
      saved: c.saved,
      lastUsedAt: c.last_used_at,
      createdAt: c.created_at || prev?.createdAt || c.last_used_at,
      cloudId: c.id,
      lastScore: c.last_score ?? prev?.lastScore,
      attemptCount: c.attempt_count ?? prev?.attemptCount ?? 0,
    })
  }
  const next = trimList([...byId.values()])
  writeAll(next)
  return next
}

export function defaultCustomTitle(prompt: string): string {
  const clean = prompt.replace(/\s+/g, ' ').trim()
  if (clean.length <= 48) return clean
  return `${clean.slice(0, 45)}…`
}
