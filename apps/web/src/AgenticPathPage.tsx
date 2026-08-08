import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AGENTIC_PATH,
  allPathVideos,
  embedUrl,
  loadVideoProgress,
  saveVideoProgress,
  type PathVideo,
} from './agenticPath'
import { Shell } from './Shell'
import './App.css'

export function AgenticPathPage() {
  const videos = useMemo(() => allPathVideos(), [])
  const [activeId, setActiveId] = useState(videos[0]?.id ?? '')
  const [done, setDone] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    setDone(loadVideoProgress())
  }, [])

  const active = videos.find((v) => v.id === activeId) ?? videos[0]
  const activePhase = AGENTIC_PATH.find((p) =>
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
      if (next.has(id)) next.delete(id)
      else next.add(id)
      saveVideoProgress(next)
      return next
    })
  }

  function goNext() {
    const idx = videos.findIndex((v) => v.id === active?.id)
    const next = videos[idx + 1]
    if (next) setActiveId(next.id)
  }

  return (
    <Shell wide>
      <section className="path-hero reveal">
        <p className="eyebrow">One-stop path</p>
        <h1>Java → Agentic AI Engineer</h1>
        <p className="hero-lede">
          Ordered free YouTube curriculum: Python bridge → LLMs → tools → RAG →
          LangGraph agents → production habits. Watch in sequence, mark
          complete, then practice in our Java→AI / Java→Python tracks.
        </p>
        <div className="path-progress-head">
          <div>
            <strong>
              {doneCount}/{videos.length} videos done
            </strong>
            <span className="muted"> · {pct}% of path</span>
          </div>
          <div className="progress-bar path-bar" aria-hidden="true">
            <span style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="hero-cta">
          <a className="btn primary" href="#player">
            Start / continue
          </a>
          <Link className="btn ghost" to="/">
            Practice tracks
          </Link>
        </div>
      </section>

      <div className="path-layout" id="player">
        <aside className="path-sidebar reveal">
          {AGENTIC_PATH.map((phase) => (
            <div key={phase.id} className="path-phase">
              <div className="path-phase-head">
                <span className="pill">Phase {phase.step}</span>
                <strong>{phase.title}</strong>
                <p>{phase.blurb}</p>
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
                      <strong>Java bridge:</strong> {activePhase.javaBridge}
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
                      Next video →
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
                <h3>After this phase, practice here</h3>
                <ul>
                  <li>
                    <Link to="/">Java → Python Developer</Link> — speak the
                    syntax/OOP/FastAPI answers
                  </li>
                  <li>
                    <Link to="/">Java → Production AI</Link> — RAG / agents
                    interview prompts
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
        <h3>Full sequence (bookmark this)</h3>
        <ol className="path-map-list">
          {AGENTIC_PATH.map((phase) => (
            <li key={phase.id}>
              <strong>
                {phase.step}. {phase.title}
              </strong>
              <ul>
                {phase.videos.map((v: PathVideo) => (
                  <li key={v.id}>
                    <button
                      type="button"
                      className="linkish"
                      onClick={() => {
                        setActiveId(v.id)
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
