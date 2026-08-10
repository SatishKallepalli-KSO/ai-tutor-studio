/** Persist Snowflake path completion locally (mirrors agentic done-set). */

const DONE_KEY = 'ats_snowflake_video_done'

export function loadVideoProgress(): Set<string> {
  try {
    const raw = localStorage.getItem(DONE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((id): id is string => typeof id === 'string'))
  } catch {
    return new Set()
  }
}

export function saveVideoProgress(done: Set<string>) {
  localStorage.setItem(DONE_KEY, JSON.stringify([...done]))
}
