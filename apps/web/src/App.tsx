import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ApiError,
  api,
  FREE_PRACTICE_TRACKS,
  type Feedback,
  type Track,
  type TutorQuestion,
} from './api'
import { AdSlot } from './AdSlot'
import { track as trackEvent } from './analytics'
import { useAuth } from './auth'
import { AUDIENCES, BRAND } from './brand'
import { getTopic, topicsForTrack, type Topic } from './curriculum'
import { usePersona } from './persona'
import { Shell, TRACK_GROUPS } from './Shell'
import { SocialProof } from './SocialProof'
import { speakText, stopSpeaking, useSpeechAnswer } from './useSpeechAnswer'
import './App.css'

type Step = 'tracks' | 'learn' | 'practice'

function wordCount(text: string) {
  return (text.trim().match(/[a-z0-9']+/gi) ?? []).length
}

function speakSeconds(words: number) {
  return Math.max(0, Math.round((words / 140) * 60))
}

export default function App() {
  const { user, refresh } = useAuth()
  const { isRecruiter } = usePersona()
  const [params] = useSearchParams()
  const [tracks, setTracks] = useState<Track[]>([])
  const [trackId, setTrackId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<TutorQuestion[]>([])
  const [topicId, setTopicId] = useState<string | null>(null)
  const [questionId, setQuestionId] = useState<string | null>(null)
  const [answer, setAnswer] = useState('')
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text')
  const [interim, setInterim] = useState('')
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [step, setStep] = useState<Step>('tracks')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paywall, setPaywall] = useState<string | null>(null)

  const speech = useSpeechAnswer({
    onTranscript: (finalChunk, liveInterim) => {
      if (finalChunk) {
        setAnswer(
          (prev) =>
            `${prev}${prev && !prev.endsWith(' ') ? ' ' : ''}${finalChunk}`,
        )
        setInputMode('voice')
      }
      setInterim(liveInterim)
    },
  })

  const activeTrack = useMemo(
    () => tracks.find((t) => t.id === trackId) ?? null,
    [trackId, tracks],
  )
  const topics = useMemo(
    () => (trackId ? topicsForTrack(trackId) : []),
    [trackId],
  )
  const topic = useMemo(
    () => (topicId ? getTopic(topicId) ?? null : null),
    [topicId],
  )
  const topicQuestions = useMemo(() => {
    if (!topicId) return questions
    return questions.filter((q) => q.topic_id === topicId)
  }, [questions, topicId])
  const question = useMemo(
    () => questions.find((q) => q.id === questionId) ?? null,
    [questionId, questions],
  )

  const trackIsProOnly = trackId ? !FREE_PRACTICE_TRACKS.has(trackId) : false
  const canPractice =
    !!user &&
    (user.is_pro || (trackId ? FREE_PRACTICE_TRACKS.has(trackId) : false))

  const liveAnswer = interim
    ? `${answer}${answer && !answer.endsWith(' ') ? ' ' : ''}${interim}`
    : answer
  const words = wordCount(liveAnswer)
  const seconds = speakSeconds(words)
  const topicIndex = Math.max(
    0,
    topics.findIndex((t) => t.id === topicId),
  )
  const progressPct =
    topics.length > 0 ? Math.round(((topicIndex + 1) / topics.length) * 100) : 0

  useEffect(() => {
    api
      .tracks()
      .then(setTracks)
      .catch((err: Error) => setError(err.message))
  }, [])

  useEffect(() => {
    if (params.get('billing') === 'success') void refresh()
  }, [params, refresh])

  async function selectTrack(id: string) {
    setError(null)
    setPaywall(null)
    setTrackId(id)
    setFeedback(null)
    setAnswer('')
    setLoading(true)
    try {
      const qs = await api.questions(id)
      setQuestions(qs)
      const firstTopic = topicsForTrack(id)[0]
      setTopicId(firstTopic?.id ?? qs[0]?.topic_id ?? null)
      setQuestionId(qs[0]?.id ?? null)
      setStep('learn')
      trackEvent('track_open', {
        path: '/',
        properties: { track_id: id },
      })
      trackEvent('learn_open', {
        path: '/',
        properties: { track_id: id },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load questions')
    } finally {
      setLoading(false)
    }
  }

  function selectTopic(next: Topic) {
    setTopicId(next.id)
    setFeedback(null)
    setAnswer('')
    const qs = questions.filter((q) => q.topic_id === next.id)
    setQuestionId(qs[0]?.id ?? null)
    trackEvent('topic_open', {
      path: '/',
      properties: { track_id: trackId, topic_id: next.id },
    })
  }

  function goPractice(forTopicId?: string) {
    if (!user) {
      setPaywall('Sign in to practice and get feedback on your answers.')
      return
    }
    if (trackId && !user.is_pro && !FREE_PRACTICE_TRACKS.has(trackId)) {
      setPaywall(
        'This path is Pro-only. Go Pro to unlock Staff, EM, Java→AI, and advanced language drills.',
      )
      return
    }
    const id = forTopicId ?? topicId
    if (id) {
      setTopicId(id)
      const qs = questions.filter((q) => q.topic_id === id)
      setQuestionId(qs[0]?.id ?? questions[0]?.id ?? null)
    }
    setFeedback(null)
    setAnswer('')
    setPaywall(null)
    setStep('practice')
    trackEvent('practice_start', {
      path: '/',
      properties: { track_id: trackId, topic_id: id ?? topicId },
    })
  }

  async function submitAnswer() {
    if (!trackId || !questionId) return
    const spokenOrTyped = liveAnswer.trim()
    if (!spokenOrTyped) return
    if (!user) {
      setPaywall('Sign in to get feedback.')
      return
    }
    speech.stop()
    setInterim('')
    setAnswer(spokenOrTyped)
    setLoading(true)
    setError(null)
    setFeedback(null)
    setPaywall(null)
    try {
      const result = await api.feedback({
        track_id: trackId as Track['id'],
        question_id: questionId,
        answer: spokenOrTyped,
        input_mode: inputMode,
      })
      setFeedback(result)
      await refresh()
    } catch (err) {
      if (err instanceof ApiError && err.status === 402) {
        setPaywall(err.message)
      } else if (err instanceof ApiError && err.status === 401) {
        setPaywall('Sign in to get feedback on your answers.')
      } else if (!api.apiBase && user) {
        const key = `ats_fb_${new Date().toISOString().slice(0, 10)}`
        const used = Number(localStorage.getItem(key) || '0')
        if (!user.is_pro && used >= 5) {
          setPaywall(
            'Free daily coaching limit reached. Go Pro for unlimited feedback.',
          )
        } else if (
          !user.is_pro &&
          trackId &&
          !FREE_PRACTICE_TRACKS.has(trackId)
        ) {
          setPaywall('This path is Pro-only. Go Pro to unlock full access.')
        } else {
          const result = api.localFeedback({
            track_id: trackId as Track['id'],
            question_id: questionId,
            answer: spokenOrTyped,
            input_mode: inputMode,
          })
          setFeedback(result)
          if (!user.is_pro) localStorage.setItem(key, String(used + 1))
        }
      } else {
        setError(err instanceof Error ? err.message : 'Feedback failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Shell wide={step !== 'tracks'}>
      {error && <div className="banner error">{error}</div>}
      {paywall && (
        <div className="banner paywall reveal">
          <div>
            <strong>Ready for Pro?</strong>
            <p>{paywall}</p>
          </div>
          <div className="actions">
            {!user ? (
              <Link className="btn primary" to="/register">
                Create free account
              </Link>
            ) : (
              <Link className="btn primary" to="/pricing">
                See Pro plans
              </Link>
            )}
          </div>
        </div>
      )}

      {step === 'tracks' && (
        <>
          <section className="hero reveal">
            <p className="eyebrow">{BRAND.product}</p>
            <h1>
              {isRecruiter ? 'Hire practice-ready talent' : BRAND.magnet}
              <span>
                {isRecruiter
                  ? 'Secondary surface — post jobs after candidates train here.'
                  : 'Speak answers. Get coached. Walk into the loop ready.'}
              </span>
            </h1>
            <p className="hero-lede">
              {isRecruiter
                ? AUDIENCES.companies.blurb
                : BRAND.magnetSub}
            </p>
            <div className="hero-cta">
              {isRecruiter ? (
                <>
                  <Link className="btn primary" to="/jobs">
                    Browse &amp; post jobs
                  </Link>
                  <Link className="btn ghost" to="/">
                    See learner product
                  </Link>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn primary"
                    disabled={loading}
                    onClick={() => void selectTrack('staff-interview')}
                  >
                    Start Staff practice
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    disabled={loading}
                    onClick={() => void selectTrack('em-interview')}
                  >
                    Start EM practice
                  </button>
                  <a className="btn ghost" href="#paths">
                    All paths
                  </a>
                </>
              )}
            </div>
            <div className="hero-stage" aria-hidden="true">
              <div className="hero-orbit" />
              <div className="hero-panel">
                <span className="pulse-dot" />
                {isRecruiter
                  ? 'Hiring · phase 2'
                  : 'Voice practice · Staff / EM'}
                <em>
                  {isRecruiter
                    ? '“Reach candidates who already practiced out loud.”'
                    : '“I owned the migration end-to-end… latency dropped 40%.”'}
                </em>
              </div>
            </div>
          </section>

          {!isRecruiter && <SocialProof />}

          {!isRecruiter && (
            <section className="magnet-proof reveal" aria-label="Why this works">
              <div>
                <strong>1. Study the topic</strong>
                <p>Staff &amp; EM docs — ownership, conflict, design narrative.</p>
              </div>
              <div>
                <strong>2. Speak the answer</strong>
                <p>Mic or type — same pressure as a real panel screen.</p>
              </div>
              <div>
                <strong>3. Get coached</strong>
                <p>Score, gaps, stronger shape, delivery tips — free daily quota.</p>
              </div>
            </section>
          )}

          {!isRecruiter && (
            <section className="learner-path-highlights reveal" aria-label="Featured paths">
              <button
                type="button"
                className="path-banner path-banner-btn"
                disabled={loading}
                onClick={() => void selectTrack('staff-interview')}
              >
                <strong>Staff Engineer loop</strong>
                <span>Ownership · design · AI safety — practice out loud →</span>
              </button>
              <button
                type="button"
                className="path-banner path-banner-btn"
                disabled={loading}
                onClick={() => void selectTrack('em-interview')}
              >
                <strong>Engineering Manager loop</strong>
                <span>People · conflict · org narratives — speak them →</span>
              </button>
              <Link to="/agentic-path" className="path-banner muted-path">
                <strong>Also: Agentic AI path</strong>
                <span>Career switch curriculum (secondary)</span>
              </Link>
              <Link to="/snowflake-path" className="path-banner muted-path">
                <strong>Also: Snowflake path</strong>
                <span>Data Engineer → Cortex (secondary)</span>
              </Link>
            </section>
          )}

          {isRecruiter && (
            <section className="dual-audience reveal" aria-label="Who it’s for">
              <div className="dual-card">
                <p className="eyebrow">{AUDIENCES.talent.label}</p>
                <h3>{AUDIENCES.talent.title}</h3>
                <p>{AUDIENCES.talent.blurb}</p>
                <Link className="btn ghost sm" to="/">
                  Learner product
                </Link>
              </div>
              <div className="dual-card dual-card-accent">
                <p className="eyebrow">{AUDIENCES.companies.label}</p>
                <h3>{AUDIENCES.companies.title}</h3>
                <p>{AUDIENCES.companies.blurb}</p>
                <Link className="btn primary sm" to="/jobs">
                  Post a job
                </Link>
              </div>
            </section>
          )}

          <AdSlot
            id="home-below-hero"
            variant="banner"
            headline="Interview prep partners"
            detail="Partner strip under the Staff/EM magnet — not in the hero."
          />

          {isRecruiter ? (
            <section className="diff-row reveal">
              <div>
                <strong>Practice-ready talent</strong>
                <p>Candidates who train voice loops before they apply.</p>
              </div>
              <div>
                <strong>Job board</strong>
                <p>Post roles where learners already practice.</p>
              </div>
              <div>
                <strong>Network</strong>
                <p>Connect and message — phase-2 hire surface.</p>
              </div>
            </section>
          ) : (
            <section className="diff-row reveal">
              <div>
                <strong>Not another LeetCode</strong>
                <p>Oral Staff/EM narrative — not puzzle grinding.</p>
              </div>
              <div>
                <strong>Not raw ChatGPT</strong>
                <p>Curriculum + quotas + coaching product, not a blank prompt.</p>
              </div>
              <div>
                <strong>Free → Pro</strong>
                <p>Starter practice free; Staff/EM depth on Pro.</p>
              </div>
            </section>
          )}

          {isRecruiter && (
          <section className="compare reveal">
            <div className="section-title">
              <h2>Why teams look here later</h2>
              <Link className="linkish" to="/compare">
                Full comparison →
              </Link>
            </div>
            <div className="compare-table-wrap">
              <table className="compare-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>AI Tutor Studio</th>
                    <th>Coding platforms</th>
                    <th>Generic ChatGPT</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Spoken interview practice</td>
                    <td className="yes">Yes + delivery tips</td>
                    <td>Rare</td>
                    <td>DIY prompts</td>
                  </tr>
                  <tr>
                    <td>Structured topic docs</td>
                    <td className="yes">Per-path curriculum</td>
                    <td>Problems only</td>
                    <td>No curriculum</td>
                  </tr>
                  <tr>
                    <td>Staff / EM loops</td>
                    <td className="yes">Native paths</td>
                    <td>Limited</td>
                    <td>Unstructured</td>
                  </tr>
                  <tr>
                    <td>Free → Pro path</td>
                    <td className="yes">Stripe-ready</td>
                    <td>Yes</td>
                    <td>No product</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
          )}

          <section className="section paths-layout" id="paths">
            <div className="section-title">
              <h2>
                {isRecruiter
                  ? 'Paths talent trains on'
                  : 'Start with Staff or EM — then explore'}
              </h2>
              <p className="muted">
                {isRecruiter
                  ? `${tracks.length} paths learners use before they apply`
                  : 'Primary: Staff & EM voice loops · Also: languages, career switches, video paths'}
              </p>
            </div>

            <div className="paths-with-ad">
              <div className="paths-main">
                {TRACK_GROUPS.map((group) => {
                  const items = group.trackIds
                    .map((id) => tracks.find((t) => t.id === id))
                    .filter(Boolean) as Track[]
                  if (!items.length) return null
                  return (
                    <div key={group.id} className="track-group reveal">
                      <div className="track-group-head">
                        <h3>{group.title}</h3>
                        <p>{group.blurb}</p>
                      </div>
                      {group.id === 'career' && (
                        <>
                          <Link to="/agentic-path" className="path-banner">
                            <strong>Full Agentic AI video curriculum</strong>
                            <span>
                              Backend → Python for AI → LLMs → agents →
                              production →
                            </span>
                          </Link>
                          <Link to="/snowflake-path" className="path-banner">
                            <strong>
                              Data Engineer → Snowflake + Agentic AI
                            </strong>
                            <span>
                              Validated YouTube library: core → Cortex → agents
                              → interview prep →
                            </span>
                          </Link>
                        </>
                      )}
                      <div className="track-grid">
                        {items.map((item) => {
                          const count = topicsForTrack(item.id).length
                          const locked =
                            !FREE_PRACTICE_TRACKS.has(item.id) && !(user?.is_pro)
                          return (
                            <button
                              key={item.id}
                              className={`track-card ${locked ? 'locked' : ''}`}
                              onClick={() => selectTrack(item.id)}
                              disabled={loading}
                            >
                              <span className="pill-row">
                                <span className="pill">{item.audience}</span>
                                {locked ? (
                                  <span className="pill lock">Pro</span>
                                ) : (
                                  <span className="pill free">Free practice</span>
                                )}
                              </span>
                              <strong>{item.title}</strong>
                              <p>{item.summary}</p>
                              <span className="meta">
                                {count} topics · Study free · Practice{' '}
                                {locked ? 'Pro' : 'included'}
                              </span>
                              <span className="track-go">Open path →</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
              <AdSlot
                id="home-paths-sidebar"
                variant="sidebar"
                className="paths-ad"
                headline="Career switch partners"
                detail="Sidebar placement for bootcamps, certs, and hiring tools."
              />
            </div>
          </section>

          {!isRecruiter && (
            <section className="learner-jobs-strip reveal" aria-label="Open jobs">
              <div className="section-title">
                <h2>When you&apos;re ready — open jobs</h2>
                <p className="muted">
                  Secondary: browse roles recruiters post after you practice.
                </p>
              </div>
              <Link className="btn ghost" to="/jobs">
                View open jobs
              </Link>
            </section>
          )}
        </>
      )}

      {activeTrack && step !== 'tracks' && (
        <section className="workspace reveal">
          <div className="workspace-head">
            <button
              className="linkish"
              onClick={() => {
                setStep('tracks')
                setTrackId(null)
                setPaywall(null)
              }}
            >
              ← All paths
            </button>
            <div className="workspace-title">
              <h2>
                {activeTrack.title}
                {trackIsProOnly && !user?.is_pro && (
                  <span className="pill lock">Pro practice</span>
                )}
              </h2>
              <p>{activeTrack.summary}</p>
            </div>
            <div className="progress-block">
              <div className="progress-label">
                Topic {topicIndex + 1} / {topics.length || 1}
              </div>
              <div className="progress-bar" aria-hidden="true">
                <span style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          </div>

          <div className="mode-switch" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={step === 'learn'}
              className={step === 'learn' ? 'mode active' : 'mode'}
              onClick={() => setStep('learn')}
            >
              <span>01</span> Study
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={step === 'practice'}
              className={step === 'practice' ? 'mode active' : 'mode'}
              onClick={() => goPractice()}
            >
              <span>02</span> Speak &amp; coach
            </button>
          </div>

          <AdSlot
            id="learn-practice-inline"
            variant="inline"
            className="workspace-inline-ad"
            headline="Between study and the drill"
            detail="Inline partner space — swap creatives via AdSlot props later."
          />

          {step === 'learn' && (
            <div className="learn">
              <aside className="topic-list">
                <h3>Curriculum</h3>
                {topics.map((item, idx) => (
                  <button
                    key={item.id}
                    className={
                      item.id === topicId ? 'topic-item active' : 'topic-item'
                    }
                    onClick={() => selectTopic(item)}
                  >
                    <em>{String(idx + 1).padStart(2, '0')}</em>
                    <strong>{item.title}</strong>
                    <span>{item.summary}</span>
                  </button>
                ))}
                <div className="panel plan-mini">
                  <h4>Study plan</h4>
                  <ol>
                    {activeTrack.study_plan.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ol>
                </div>
                <AdSlot
                  id="learn-sidebar"
                  variant="sidebar"
                  headline="Study partners"
                  detail="Compact placement while you read the curriculum."
                />
              </aside>

              <div className="panel doc">
                {topic ? (
                  <>
                    <p className="pill">Documentation</p>
                    <h3>{topic.title}</h3>
                    <p className="lede">{topic.doc.overview}</p>

                    <h4>Key points</h4>
                    <ul className="check-list">
                      {topic.doc.keyPoints.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>

                    <h4>{topic.doc.example.title}</h4>
                    <pre className="code">{topic.doc.example.code}</pre>
                    <p className="muted note">{topic.doc.example.note}</p>

                    <div className="doc-split">
                      <div>
                        <h4>Common mistakes</h4>
                        <ul>
                          {topic.doc.commonMistakes.map((m) => (
                            <li key={m}>{m}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4>Before you practice</h4>
                        <ul>
                          {topic.doc.beforeYouPractice.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="actions sticky-actions">
                      <button
                        className="btn primary"
                        onClick={() => goPractice(topic.id)}
                      >
                        {canPractice
                          ? 'Practice this topic'
                          : trackIsProOnly
                            ? 'Unlock practice (Pro)'
                            : 'Sign in to practice'}
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="muted">Select a topic to read the docs.</p>
                )}
              </div>
            </div>
          )}

          {step === 'practice' && (
            <div className="practice">
              <aside className="question-list">
                <h3>Topics</h3>
                <button
                  className={!topicId ? 'topic-item active' : 'topic-item'}
                  onClick={() => {
                    setTopicId(null)
                    setQuestionId(questions[0]?.id ?? null)
                    setFeedback(null)
                    setAnswer('')
                  }}
                >
                  <strong>All topics</strong>
                  <span>{questions.length} questions</span>
                </button>
                {topics.map((item) => {
                  const count = questions.filter(
                    (q) => q.topic_id === item.id,
                  ).length
                  return (
                    <button
                      key={item.id}
                      className={
                        item.id === topicId ? 'topic-item active' : 'topic-item'
                      }
                      onClick={() => selectTopic(item)}
                    >
                      <strong>{item.title}</strong>
                      <span>
                        {count} question{count === 1 ? '' : 's'}
                      </span>
                    </button>
                  )
                })}

                <AdSlot
                  id="practice-sidebar"
                  variant="sidebar"
                  headline="Practice partners"
                  detail="Reserved while you queue the next spoken answer."
                />

                <h3>Queue</h3>
                {topicQuestions.map((q, idx) => (
                  <button
                    key={q.id}
                    className={q.id === questionId ? 'q-item active' : 'q-item'}
                    onClick={() => {
                      setQuestionId(q.id)
                      setFeedback(null)
                      setAnswer('')
                      setInterim('')
                      setInputMode('text')
                      speech.stop()
                      stopSpeaking()
                    }}
                  >
                    <span>
                      {q.category} · Q{idx + 1}
                    </span>
                    <strong>{q.prompt.slice(0, 72)}…</strong>
                  </button>
                ))}
              </aside>

              <div className="panel practice-main">
                {topic && (
                  <button
                    className="linkish doc-link"
                    onClick={() => setStep('learn')}
                  >
                    ← Review docs: {topic.title}
                  </button>
                )}

                {question && (
                  <>
                    <div className="question-tools">
                      <p className="pill">{question.category}</p>
                      <button
                        type="button"
                        className="btn ghost sm"
                        onClick={() => speakText(question.prompt)}
                      >
                        Hear question
                      </button>
                    </div>
                    <h3 className="prompt">{question.prompt}</h3>
                    <div className="hint-row">
                      <p className="muted">Hints</p>
                      <ul className="hint-chips">
                        {question.hints.map((h) => (
                          <li key={h}>{h}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="answer-toolbar">
                      <label className="answer-label" htmlFor="answer">
                        Your answer{' '}
                        {inputMode === 'voice' && (
                          <span className="pill voice">Voice</span>
                        )}
                      </label>
                      <div className="voice-actions">
                        {speech.listening ? (
                          <button
                            type="button"
                            className="btn danger-outline"
                            onClick={() => {
                              speech.stop()
                              setInterim('')
                            }}
                          >
                            <span className="pulse-dot" /> Stop
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn primary"
                            onClick={() => {
                              setInputMode('voice')
                              speech.start()
                            }}
                            disabled={!speech.supported}
                          >
                            Speak answer
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn ghost sm"
                          onClick={() => {
                            setAnswer('')
                            setInterim('')
                            setInputMode('text')
                            speech.stop()
                          }}
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {speech.listening && (
                      <p className="listening-bar" aria-live="polite">
                        Listening… aim for ~90–120 seconds.
                        {interim ? ` “${interim}”` : ''}
                      </p>
                    )}
                    {speech.error && (
                      <div className="banner error">{speech.error}</div>
                    )}

                    <textarea
                      id="answer"
                      value={liveAnswer}
                      onChange={(e) => {
                        setAnswer(e.target.value)
                        setInterim('')
                        if (inputMode === 'voice') setInputMode('text')
                      }}
                      placeholder="Speak or type a 90–120 second interview answer…"
                      rows={11}
                    />
                    <div className="answer-meta">
                      <span>
                        {words} words · ~{seconds}s spoken
                      </span>
                      <span
                        className={
                          seconds >= 90 && seconds <= 130 ? 'good' : 'soft'
                        }
                      >
                        Target 90–120s
                      </span>
                    </div>
                    <div className="actions">
                      <button
                        className="btn primary"
                        onClick={submitAnswer}
                        disabled={loading || !liveAnswer.trim()}
                      >
                        {loading
                          ? 'Coaching…'
                          : inputMode === 'voice'
                            ? 'Get voice + content feedback'
                            : 'Get AI feedback'}
                      </button>
                    </div>
                  </>
                )}

                {feedback && (
                  <div className="feedback reveal">
                    <div className="score-row">
                      <div
                        className="score-ring"
                        style={
                          {
                            '--p': `${(feedback.score / 5) * 100}%`,
                          } as CSSProperties
                        }
                      >
                        <strong>{feedback.score}</strong>
                        <span>/5</span>
                      </div>
                      <div>
                        <p className="score-summary">{feedback.summary}</p>
                        <small>
                          {feedback.provider}
                          {feedback.input_mode === 'voice'
                            ? ' · voice coaching'
                            : ''}
                        </small>
                      </div>
                    </div>
                    <div className="feedback-grid">
                      <div className="fb-col good">
                        <h4>Strengths</h4>
                        <ul>
                          {feedback.strengths.map((s) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="fb-col gap">
                        <h4>Gaps</h4>
                        <ul>
                          {feedback.gaps.map((g) => (
                            <li key={g}>{g}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    {!!feedback.delivery_tips?.length && (
                      <div className="delivery">
                        <h4>Spoken delivery &amp; grammar</h4>
                        <ul>
                          {feedback.delivery_tips.map((tip) => (
                            <li key={tip}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <h4>Stronger answer shape</h4>
                    <pre>{feedback.better_answer}</pre>
                    <p className="next">
                      <strong>Next drill:</strong> {feedback.next_drill}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}
    </Shell>
  )
}
