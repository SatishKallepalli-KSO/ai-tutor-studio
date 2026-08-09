import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  SNOWFLAKE_PATH,
  allPathVideos,
  embedUrl,
  loadVideoProgress,
  saveVideoProgress,
  type PathVideo,
} from './snowflakePath'
import { AdSlot } from './AdSlot'
import { track } from './analytics'
import { Shell } from './Shell'
import './App.css'

export function SnowflakePathPage() {
  const videos = useMemo(() => allPathVideos(), [])
  const [activeId, setActiveId] = useState(videos[0]?.id ?? '')
  const [done, setDone] = useState<Set<string>>(() => new Set())
  const [query, setQuery] = useState('')
  const [phaseFilter, setPhaseFilter] = useState<string>('all')

  useEffect(() => {
    setDone(loadVideoProgress())
  }, [])

  const filteredPhases = useMemo(() => {
    const q = query.trim().toLowerCase()
    return SNOWFLAKE_PATH.map((phase) => {
      if (phaseFilter !== 'all' && phase.id !== phaseFilter) {
        return { ...phase, videos: [] as PathVideo[] }
      }
      const vids = phase.videos.filter((v) => {
        if (!q) return true
        return (
          v.title.toLowerCase().includes(q) ||
          v.channel.toLowerCase().includes(q) ||
          v.why.toLowerCase().includes(q)
        )
      })
      return { ...phase, videos: vids }
    }).filter((p) => p.videos.length > 0)
  }, [query, phaseFilter])

  const filteredVideos = useMemo(
    () => filteredPhases.flatMap((p) => p.videos),
    [filteredPhases],
  )

  const active =
    filteredVideos.find((v) => v.id === activeId) ??
    videos.find((v) => v.id === activeId) ??
    filteredVideos[0] ??
    videos[0]

  useEffect(() => {
    if (!active) return
    if (filteredVideos.length && !filteredVideos.some((v) => v.id === active.id)) {
      setActiveId(filteredVideos[0].id)
    }
  }, [filteredVideos, active])

  const activePhase = SNOWFLAKE_PATH.find((p) =>
    p.videos.some((v) => v.id === active?.id),
  )
  const doneCount = [...done].filter((id) => videos.some((v) => v.id === id))
    .length
  const pct = videos.length
    ? Math.round((doneCount / videos.length) * 100)
    : 0

  function toggleDone(id: string) {
    setDone((prev) => {
      const next = new Set(prev)
      const markingDone = !next.has(id)
      if (markingDone) {
        next.add(id)
        track('snowflake_video_complete', {
          path: '/snowflake-path',
          properties: { video_id: id },
        })
      } else {
        next.delete(id)
      }
      saveVideoProgress(next)
      return next
    })
  }

  function goNext() {
    const list = filteredVideos.length ? filteredVideos : videos
    const idx = list.findIndex((v) => v.id === active?.id)
    const next = list[idx + 1]
    if (next) setActiveId(next.id)
  }

  return (
    <Shell wide>
      <section className="path-hero reveal">
        <p className="eyebrow">AI Tutor Studio · Career switch</p>
        <h1>Data Engineer → Snowflake + Agentic AI</h1>
        <p className="hero-lede">
          {videos.length} validated free YouTube courses &amp; playlists: DE
          foundations → Snowflake core → Streams/Snowpark/dbt → Cortex AI →
          Cortex Agents &amp; MCP. Search the library, watch in the player, mark
          complete, then drill answers on Studio paths.
        </p>
        <div className="path-progress-head">
          <div>
            <strong>
              {doneCount}/{videos.length} marked done
            </strong>
            <span className="muted"> · {pct}% of library</span>
          </div>
          <div className="progress-bar path-bar" aria-hidden="true">
            <span style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="path-filters">
          <input
            type="search"
            className="path-search"
            placeholder="Search title or channel…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search videos"
          />
          <select
            className="path-phase-select"
            value={phaseFilter}
            onChange={(e) => setPhaseFilter(e.target.value)}
            aria-label="Filter by phase"
          >
            <option value="all">All phases</option>
            {SNOWFLAKE_PATH.map((p) => (
              <option key={p.id} value={p.id}>
                Phase {p.step}: {p.title}
              </option>
            ))}
          </select>
        </div>
        <p className="muted path-filter-meta">
          Showing {filteredVideos.length} of {videos.length}
        </p>
        <div className="hero-cta">
          <a className="btn primary" href="#player">
            Continue the path
          </a>
          <Link className="btn ghost" to="/">
            Practice on Studio paths
          </Link>
          <Link className="btn ghost" to="/agentic-path">
            Backend → AI Engineer
          </Link>
        </div>
      </section>

      <AdSlot
        id="snowflake-below-hero"
        variant="banner"
        headline="Data platform partners"
        detail="Sponsored strip for tools that complement the Snowflake + Agentic path."
      />

      <div className="path-layout" id="player">
        <aside className="path-sidebar reveal">
          <AdSlot
            id="snowflake-sidebar"
            variant="sidebar"
            headline="Learning partners"
            detail="Compact placement beside the Snowflake video curriculum."
          />
          {filteredPhases.length === 0 && (
            <p className="muted">No videos match that search.</p>
          )}
          {filteredPhases.map((phase) => (
            <div key={phase.id} className="path-phase">
              <div className="path-phase-head">
                <span className="pill">Phase {phase.step}</span>
                <strong>{phase.title}</strong>
                <p>
                  {phase.blurb} · {phase.videos.length} items
                </p>
              </div>
              {phase.videos.map((video, i) => (
                <button
                  key={video.id}
                  type="button"
                  className={
                    video.id === active?.id
                      ? 'path-video-item active'
                      : 'path-video-item'
                  }
                  onClick={() => setActiveId(video.id)}
                >
                  <span className="path-video-idx">
                    {done.has(video.id) ? '✓' : `${phase.step}.${i + 1}`}
                  </span>
                  <span className="path-video-meta">
                    <strong>{video.title}</strong>
                    <em>
                      {video.channel} · {video.duration}
                    </em>
                  </span>
                </button>
              ))}
            </div>
          ))}
        </aside>

        <div className="path-main reveal">
          {active && (
            <>
              <div className="path-player panel">
                <div className="video-frame">
                  <iframe
                    key={active.id}
                    title={active.title}
                    src={embedUrl(active)}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
                <div className="path-player-body">
                  <p className="pill">
                    Phase {activePhase?.step}: {activePhase?.title}
                  </p>
                  <h2>{active.title}</h2>
                  <p className="muted">
                    {active.channel} · {active.duration}
                  </p>
                  <p className="lede">{active.why}</p>
                  {activePhase && (
                    <p className="java-bridge">
                      <strong>Interview angle:</strong> {activePhase.careerTip}
                    </p>
                  )}
                  <div className="actions">
                    <button
                      type="button"
                      className={
                        done.has(active.id) ? 'btn ghost' : 'btn primary'
                      }
                      onClick={() => toggleDone(active.id)}
                    >
                      {done.has(active.id)
                        ? 'Marked complete'
                        : 'Mark complete'}
                    </button>
                    <button type="button" className="btn ghost" onClick={goNext}>
                      Next →
                    </button>
                    <a
                      className="btn ghost"
                      href={active.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open on YouTube
                    </a>
                  </div>
                </div>
              </div>

              <div className="panel path-checklist">
                <h3>After watching, speak it back here</h3>
                <ul>
                  <li>
                    <Link to="/">Staff / EM loops</Link> — ownership &amp;
                    architecture narratives
                  </li>
                  <li>
                    <Link to="/agentic-path">Backend → AI Engineer</Link> — agents,
                    tools, and production AI habits
                  </li>
                  <li>
                    <a href={`${import.meta.env.BASE_URL}product/`}>
                      Product docs
                    </a>{' '}
                    — architecture leave-behind for managers
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>

      <section className="panel path-map reveal">
        <h3>Full library by phase</h3>
        <ol className="path-map-list">
          {SNOWFLAKE_PATH.map((phase) => (
            <li key={phase.id}>
              <strong>
                {phase.step}. {phase.title}
              </strong>
              <span className="muted"> ({phase.videos.length})</span>
              <ul>
                {phase.videos.map((v: PathVideo) => (
                  <li key={v.id}>
                    <button
                      type="button"
                      className="linkish"
                      onClick={() => {
                        setActiveId(v.id)
                        setPhaseFilter('all')
                        setQuery('')
                        document
                          .getElementById('player')
                          ?.scrollIntoView({ behavior: 'smooth' })
                      }}
                    >
                      {v.title}
                    </button>
                    <span className="muted"> — {v.channel}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>
    </Shell>
  )
}
