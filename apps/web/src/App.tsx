import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ApiError,
  api,
  FREE_PRACTICE_TRACKS,
  type Feedback,
  type Track,
  type TutorQuestion,
} from './api'
import { useAuth } from './auth'
import { getTopic, topicsForTrack, type Topic } from './curriculum'
import { speakText, stopSpeaking, useSpeechAnswer } from './useSpeechAnswer'
import './App.css'

type Step = 'tracks' | 'learn' | 'practice'

export default function App() {
  const { user, loading: authLoading, refresh } = useAuth()
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
        setAnswer((prev) => `${prev}${prev && !prev.endsWith(' ') ? ' ' : ''}${finalChunk}`)
        setInputMode('voice')
      }
      setInterim(liveInterim)
    },
  })

  const track = useMemo(
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
    !!user && (user.is_pro || (trackId ? FREE_PRACTICE_TRACKS.has(trackId) : false))

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
  }

  function goPractice(forTopicId?: string) {
    if (!user) {
      setPaywall('Sign in to practice and get feedback on your answers.')
      return
    }
    if (trackId && !user.is_pro && !FREE_PRACTICE_TRACKS.has(trackId)) {
      setPaywall(
        'This track is Pro-only. Upgrade to unlock Staff, EM, Java→AI, and advanced language tracks.',
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
  }

  async function submitAnswer() {
    if (!trackId || !questionId) return
    const spokenOrTyped = (
      interim
        ? `${answer}${answer && !answer.endsWith(' ') ? ' ' : ''}${interim}`
        : answer
    ).trim()
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
      } else {
        // Pages-only / API down: soft local free limits
        if (!api.apiBase && user) {
          const key = `ats_fb_${new Date().toISOString().slice(0, 10)}`
          const used = Number(localStorage.getItem(key) || '0')
          if (!user.is_pro && used >= 5) {
            setPaywall('Free daily feedback limit reached. Upgrade to Pro for unlimited coaching.')
          } else if (!user.is_pro && trackId && !FREE_PRACTICE_TRACKS.has(trackId)) {
            setPaywall('This track is Pro-only. Upgrade to unlock full access.')
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
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <div className="atmosphere" aria-hidden="true" />

      <header className="topbar">
        <div>
          <p className="eyebrow">AI Tutor Studio</p>
          <h1>Learn. Practice. Get coached.</h1>
        </div>
        <div className="topbar-actions">
          <Link className="btn ghost" to="/pricing">
            Pricing
          </Link>
          {authLoading ? null : user ? (
            <>
              <span className={user.is_pro ? 'plan-badge pro' : 'plan-badge'}>
                {user.is_pro ? 'Pro' : 'Free'}
                {!user.is_pro && (
                  <>
                    {' '}
                    · {user.feedback_used_today}/{user.feedback_limit_today} today
                  </>
                )}
              </span>
              {!user.is_pro && (
                <Link className="btn primary" to="/pricing">
                  Upgrade
                </Link>
              )}
              <AccountMenu />
            </>
          ) : (
            <>
              <Link className="btn ghost" to="/login">
                Sign in
              </Link>
              <Link className="btn primary" to="/register">
                Start free
              </Link>
            </>
          )}
        </div>
      </header>

      <p className="tagline">
        Industry-style freemium: study every topic free, practice starter tracks
        on Free, unlock Staff/EM + unlimited AI feedback on Pro.
      </p>

      {error && <div className="banner error">{error}</div>}
      {paywall && (
        <div className="banner paywall">
          <p>{paywall}</p>
          <div className="actions">
            {!user ? (
              <Link className="btn primary" to="/register">
                Create free account
              </Link>
            ) : (
              <Link className="btn primary" to="/pricing">
                View Pro plans
              </Link>
            )}
          </div>
        </div>
      )}

      {step === 'tracks' && (
        <section className="section">
          <h2>Choose a track</h2>
          <div className="track-grid">
            {tracks.map((item) => {
              const count = topicsForTrack(item.id).length
              const locked =
                !FREE_PRACTICE_TRACKS.has(item.id) && !(user?.is_pro)
              return (
                <button
                  key={item.id}
                  className="track-card"
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
                    {count} topics · docs free · practice{' '}
                    {locked ? 'Pro' : 'included'}
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {track && step !== 'tracks' && (
        <section className="section">
          <div className="section-head">
            <button
              className="linkish"
              onClick={() => {
                setStep('tracks')
                setTrackId(null)
                setPaywall(null)
              }}
            >
              ← All tracks
            </button>
            <h2>
              {track.title}{' '}
              {trackIsProOnly && !user?.is_pro && (
                <span className="pill lock">Pro practice</span>
              )}
            </h2>
            <p>{track.summary}</p>
          </div>

          <div className="tabs">
            <button
              className={step === 'learn' ? 'tab active' : 'tab'}
              onClick={() => setStep('learn')}
            >
              Learn (docs)
            </button>
            <button
              className={step === 'practice' ? 'tab active' : 'tab'}
              onClick={() => goPractice()}
            >
              Practice + AI feedback
            </button>
          </div>

          {step === 'learn' && (
            <div className="learn">
              <aside className="topic-list">
                <h3>Topics</h3>
                {topics.map((item) => (
                  <button
                    key={item.id}
                    className={
                      item.id === topicId ? 'topic-item active' : 'topic-item'
                    }
                    onClick={() => selectTopic(item)}
                  >
                    <strong>{item.title}</strong>
                    <span>{item.summary}</span>
                  </button>
                ))}
                <div className="panel plan-mini">
                  <h4>Track plan</h4>
                  <ol>
                    {track.study_plan.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ol>
                </div>
              </aside>

              <div className="panel doc">
                {topic ? (
                  <>
                    <p className="pill">Documentation</p>
                    <h3>{topic.title}</h3>
                    <p className="lede">{topic.doc.overview}</p>

                    <h4>Key points</h4>
                    <ul>
                      {topic.doc.keyPoints.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>

                    <h4>{topic.doc.example.title}</h4>
                    <pre className="code">{topic.doc.example.code}</pre>
                    <p className="muted note">{topic.doc.example.note}</p>

                    <h4>Common mistakes</h4>
                    <ul>
                      {topic.doc.commonMistakes.map((m) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>

                    <h4>Before you practice</h4>
                    <ul>
                      {topic.doc.beforeYouPractice.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>

                    <div className="actions">
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
                <h3>Filter by topic</h3>
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
                        {count} practice question{count === 1 ? '' : 's'}
                      </span>
                    </button>
                  )
                })}

                <h3>Questions</h3>
                {topicQuestions.map((q) => (
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
                    <span>{q.category}</span>
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
                        className="btn ghost"
                        onClick={() => speakText(question.prompt)}
                      >
                        Hear question
                      </button>
                    </div>
                    <h3>{question.prompt}</h3>
                    <p className="muted">Hints</p>
                    <ul>
                      {question.hints.map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
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
                            Stop listening
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
                            title={
                              speech.supported
                                ? 'Answer out loud like a real interview'
                                : 'Voice needs Chrome, Edge, or Safari'
                            }
                          >
                            Speak answer
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn ghost"
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
                        Listening… speak for ~90–120 seconds like the interview room.
                        {interim ? ` “${interim}”` : ''}
                      </p>
                    )}
                    {speech.error && (
                      <div className="banner error">{speech.error}</div>
                    )}
                    {!speech.supported && (
                      <p className="muted note">
                        Voice dictation isn’t available in this browser — type your
                        answer, or open Chrome/Edge/Safari for mic practice.
                      </p>
                    )}
                    <textarea
                      id="answer"
                      value={
                        interim
                          ? `${answer}${answer && !answer.endsWith(' ') ? ' ' : ''}${interim}`
                          : answer
                      }
                      onChange={(e) => {
                        setAnswer(e.target.value)
                        setInterim('')
                        if (inputMode === 'voice') setInputMode('text')
                      }}
                      placeholder="Speak your answer (or type) like a 90–120 second interview response…"
                      rows={10}
                    />
                    <div className="actions">
                      <button
                        className="btn primary"
                        onClick={submitAnswer}
                        disabled={
                          loading || !(answer.trim() || interim.trim())
                        }
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
                  <div className="feedback">
                    <div className="score">
                      <span>{feedback.score}/5</span>
                      <p>{feedback.summary}</p>
                      <small>
                        Provider: {feedback.provider}
                        {feedback.input_mode === 'voice' ? ' · voice coaching' : ''}
                      </small>
                    </div>
                    <div className="feedback-grid">
                      <div>
                        <h4>Strengths</h4>
                        <ul>
                          {feedback.strengths.map((s) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
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
                        <h4>Spoken delivery & grammar</h4>
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

      <footer className="footer">
        Free docs for everyone · Free practice on starter tracks · Pro for full
        interview suite + unlimited coaching
      </footer>
    </div>
  )
}

function AccountMenu() {
  const { user, logout } = useAuth()
  return (
    <button className="btn ghost" type="button" onClick={logout} title={user?.email}>
      Sign out
    </button>
  )
}
