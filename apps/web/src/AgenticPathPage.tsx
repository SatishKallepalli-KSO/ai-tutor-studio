import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AGENTIC_PATH,
  AGENTIC_PRACTICE_TRACK,
  agenticCustomPracticeHref,
  agenticPracticeHref,
  allPathVideos,
  type PathVideo,
} from './agenticPath'
import {
  AUTO_COMPLETE_THRESHOLD,
  aggregateProgressPercent,
  formatWatchTimestamp,
  lessonProgressPercent,
  resumeSeconds,
} from './agenticProgress'
import { AdSlot } from './AdSlot'
import { AgenticPathSidebar } from './AgenticPathSidebar'
import { track } from './analytics'
import { Shell } from './Shell'
import { useAgenticVideoProgress } from './useAgenticVideoProgress'
import { YouTubePlayer } from './YouTubePlayer'
import './App.css'

export function AgenticPathPage() {
  const videos = useMemo(() => allPathVideos(), [])
  const [activeId, setActiveId] = useState(videos[0]?.id ?? '')
  const [query, setQuery] = useState('')
  const [phaseFilter, setPhaseFilter] = useState<string>('all')
  const { done, watch, markDone, toggleDone, recordProgress } =
    useAgenticVideoProgress()

  const filteredPhases = useMemo(() => {
    const q = query.trim().toLowerCase()
    return AGENTIC_PATH.map((phase) => {
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

  const activePhase = AGENTIC_PATH.find((p) =>
    p.videos.some((v) => v.id === active?.id),
  )
  const doneCount = [...done].filter((id) => videos.some((v) => v.id === id))
    .length
  const pathPct = aggregateProgressPercent(videos, done, watch)
  const pathComplete = videos.length > 0 && doneCount === videos.length
  const phaseComplete = !!activePhase?.videos.every((v) => done.has(v.id))
  const practiceHref = agenticPracticeHref(
    activePhase?.practiceTopicId ?? 'ai-agents',
  )
  const customPracticeHref = agenticCustomPracticeHref(
    activePhase?.practiceTopicId ?? 'ai-agents',
  )
  const activeLessonPct = active
    ? lessonProgressPercent(active.id, done, watch)
    : 0
  const activeResume = active ? resumeSeconds(watch[active.id]) : 0

  function goNext() {
    const list = filteredVideos.length ? filteredVideos : videos
    const idx = list.findIndex((v) => v.id === active?.id)
    const next = list[idx + 1]
    if (next) setActiveId(next.id)
  }

  return (
    <Shell wide>
      <section className="path-hero reveal">
        <p className="eyebrow">Practice Out Loud · Career switch</p>
        <h1>Backend → Agentic AI Engineer</h1>
        <p className="hero-lede">
          {videos.length} validated free YouTube courses &amp; playlists for
          backend engineers: Python for AI → LLMs → APIs &amp; vectors →
          tools/agents → RAG → LangGraph → prompting, evals &amp; production.
          Watch in the player (progress resumes), mark complete, then practice
          out loud with AI feedback on the matching Studio topics.
        </p>
        <div className="path-progress-head">
          <div>
            <strong>
              {doneCount}/{videos.length} marked done
            </strong>
            <span className="muted"> · {pathPct}% path progress</span>
          </div>
          <div
            className="progress-bar path-bar"
            role="progressbar"
            aria-valuenow={pathPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Path progress"
          >
            <span style={{ width: `${pathPct}%` }} />
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
            {AGENTIC_PATH.map((p) => (
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
          <Link
            className="btn ghost"
            to={agenticPracticeHref('ai-agents')}
            onClick={() =>
              track('agentic_practice_cta', {
                path: '/agentic-path',
                properties: {
                  source: 'hero',
                  track_id: AGENTIC_PRACTICE_TRACK,
                  topic_id: 'ai-agents',
                },
              })
            }
          >
            Practice with AI feedback
          </Link>
        </div>
      </section>

      {pathComplete && (
        <section className="panel path-practice-complete reveal" id="practice">
          <p className="pill good">Path complete</p>
          <h2>Practice with AI feedback</h2>
          <p className="lede">
            You’ve marked the Agentic AI library done. Next: speak answers on
            the Production AI Studio path — same voice/text coach used
            elsewhere — covering agents, RAG, evals, and LLM ops.
          </p>
          <div className="actions">
            <Link
              className="btn primary"
              to={agenticPracticeHref('ai-agents')}
              onClick={() =>
                track('agentic_practice_cta', {
                  path: '/agentic-path',
                  properties: {
                    source: 'path_complete',
                    track_id: AGENTIC_PRACTICE_TRACK,
                    topic_id: 'ai-agents',
                  },
                })
              }
            >
              Practice with AI feedback
            </Link>
            <Link
              className="btn ghost"
              to={agenticCustomPracticeHref('ai-agents')}
              onClick={() =>
                track('agentic_practice_cta', {
                  path: '/agentic-path',
                  properties: {
                    source: 'path_complete_custom',
                    track_id: AGENTIC_PRACTICE_TRACK,
                    topic_id: 'ai-agents',
                    custom: true,
                  },
                })
              }
            >
              Practice your own question
            </Link>
            <Link className="btn ghost" to={agenticPracticeHref('ai-rag')}>
              Start with RAG drills
            </Link>
            <Link className="btn ghost" to={agenticPracticeHref('ai-evals')}>
              Start with evals drills
            </Link>
          </div>
        </section>
      )}

      <AdSlot
        id="agentic-below-hero"
        variant="banner"
        headline="AI career partners"
        detail="Sponsored strip for tools that complement the Backend → AI Engineer path."
      />

      <div className="path-layout" id="player">
        <AgenticPathSidebar
          phases={filteredPhases}
          activeId={active?.id}
          done={done}
          watch={watch}
          onSelect={setActiveId}
        />

        <div className="path-main reveal">
          {active && (
            <>
              <div className="path-player panel">
                <YouTubePlayer
                  key={active.id}
                  video={active}
                  title={active.title}
                  startSeconds={activeResume}
                  completeThreshold={AUTO_COMPLETE_THRESHOLD}
                  onProgress={(seconds, duration) =>
                    recordProgress(active.id, seconds, duration)
                  }
                  onNearComplete={() => markDone(active.id, 'auto')}
                />
                <div className="path-player-body">
                  <p className="pill">
                    Phase {activePhase?.step}: {activePhase?.title}
                  </p>
                  <h2>{active.title}</h2>
                  <p className="muted">
                    {active.channel} · {active.duration}
                  </p>
                  <div
                    className="progress-bar path-active-bar"
                    role="progressbar"
                    aria-valuenow={activeLessonPct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Lesson watch progress"
                  >
                    <span style={{ width: `${activeLessonPct}%` }} />
                  </div>
                  <p className="path-lesson-pct muted">
                    {done.has(active.id)
                      ? 'Lesson complete'
                      : activeResume > 0
                        ? `Resumes at ${formatWatchTimestamp(activeResume)} · ${activeLessonPct}% watched`
                        : activeLessonPct > 0
                          ? `${activeLessonPct}% watched`
                          : 'Not started — progress saves as you watch'}
                  </p>
                  <p className="lede">{active.why}</p>
                  {activePhase && (
                    <p className="java-bridge">
                      <strong>Backend bridge:</strong>{' '}
                      {activePhase.backendBridge}
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

                  {(done.has(active.id) || phaseComplete) && activePhase && (
                    <div className="path-practice-step">
                      <p className="pill">
                        {phaseComplete ? 'Phase complete' : 'Next step'}
                      </p>
                      <h3>Practice with AI feedback</h3>
                      <p className="muted">
                        Speak {activePhase.practiceLabel.toLowerCase()} on the
                        Studio path — voice or text, same AI coach rubric.
                      </p>
                      <div className="actions">
                        <Link
                          className="btn primary"
                          to={practiceHref}
                          onClick={() =>
                            track('agentic_practice_cta', {
                              path: '/agentic-path',
                              properties: {
                                source: phaseComplete
                                  ? 'phase_complete'
                                  : 'video_complete',
                                phase_id: activePhase.id,
                                topic_id: activePhase.practiceTopicId,
                                video_id: active.id,
                              },
                            })
                          }
                        >
                          Practice with AI feedback
                        </Link>
                        <Link
                          className="btn ghost"
                          to={customPracticeHref}
                          onClick={() =>
                            track('agentic_practice_cta', {
                              path: '/agentic-path',
                              properties: {
                                source: phaseComplete
                                  ? 'phase_complete_custom'
                                  : 'video_complete_custom',
                                phase_id: activePhase.id,
                                topic_id: activePhase.practiceTopicId,
                                video_id: active.id,
                                custom: true,
                              },
                            })
                          }
                        >
                          Practice your own question
                        </Link>
                        {!pathComplete && (
                          <a className="btn ghost" href="#practice-map">
                            See all phase drills
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="panel path-checklist" id="practice-map">
                <h3>After watching → practice with AI feedback</h3>
                <p className="muted path-practice-lede">
                  Each Agentic phase maps to spoken drills on{' '}
                  <Link to={agenticPracticeHref()}>
                    Java → Production AI
                  </Link>
                  . Finish a phase (or a lesson), then open the matching topic.
                </p>
                <ul className="path-practice-list">
                  {AGENTIC_PATH.map((phase) => {
                    const phaseDone =
                      phase.videos.length > 0 &&
                      phase.videos.every((v) => done.has(v.id))
                    const phasePct = aggregateProgressPercent(
                      phase.videos,
                      done,
                      watch,
                    )
                    return (
                      <li key={phase.id}>
                        <span>
                          <strong>
                            Phase {phase.step}: {phase.title}
                          </strong>
                          {phaseDone ? (
                            <span className="pill done">Ready</span>
                          ) : null}
                          <em className="muted"> — {phase.practiceLabel}</em>
                          <span
                            className="progress-bar path-map-bar"
                            aria-hidden="true"
                          >
                            <span style={{ width: `${phasePct}%` }} />
                          </span>
                        </span>
                        <Link
                          className={
                            phaseDone ? 'btn primary sm' : 'btn ghost sm'
                          }
                          to={agenticPracticeHref(phase.practiceTopicId)}
                          onClick={() =>
                            track('agentic_practice_cta', {
                              path: '/agentic-path',
                              properties: {
                                source: 'practice_map',
                                phase_id: phase.id,
                                topic_id: phase.practiceTopicId,
                              },
                            })
                          }
                        >
                          Practice with AI feedback
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>

      <section className="panel path-map reveal">
        <h3>Full library by phase</h3>
        <ol className="path-map-list">
          {AGENTIC_PATH.map((phase) => (
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
