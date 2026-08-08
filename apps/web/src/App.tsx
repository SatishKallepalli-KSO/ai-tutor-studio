import { useEffect, useMemo, useState } from 'react'
import { api, type Feedback, type Track, type TutorQuestion } from './api'
import { getTopic, topicsForTrack, type Topic } from './curriculum'
import './App.css'

type Step = 'tracks' | 'learn' | 'practice'

export default function App() {
  const [tracks, setTracks] = useState<Track[]>([])
  const [trackId, setTrackId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<TutorQuestion[]>([])
  const [topicId, setTopicId] = useState<string | null>(null)
  const [questionId, setQuestionId] = useState<string | null>(null)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [step, setStep] = useState<Step>('tracks')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  useEffect(() => {
    api
      .tracks()
      .then(setTracks)
      .catch((err: Error) => setError(err.message))
  }, [])

  async function selectTrack(id: string) {
    setError(null)
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
    const id = forTopicId ?? topicId
    if (id) {
      setTopicId(id)
      const qs = questions.filter((q) => q.topic_id === id)
      setQuestionId(qs[0]?.id ?? questions[0]?.id ?? null)
    }
    setFeedback(null)
    setAnswer('')
    setStep('practice')
  }

  async function submitAnswer() {
    if (!trackId || !questionId || !answer.trim()) return
    setLoading(true)
    setError(null)
    setFeedback(null)
    try {
      const result = await api.feedback({
        track_id: trackId as Track['id'],
        question_id: questionId,
        answer: answer.trim(),
      })
      setFeedback(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Feedback failed')
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
        <p className="tagline">
          One-stop shop: topic docs first, then mock answers with AI feedback —
          Staff, EM, Java→AI, and language tracks.
        </p>
      </header>

      {error && <div className="banner error">{error}</div>}

      {step === 'tracks' && (
        <section className="section">
          <h2>Choose a track</h2>
          <div className="track-grid">
            {tracks.map((item) => {
              const count = topicsForTrack(item.id).length
              return (
                <button
                  key={item.id}
                  className="track-card"
                  onClick={() => selectTrack(item.id)}
                  disabled={loading}
                >
                  <span className="pill">{item.audience}</span>
                  <strong>{item.title}</strong>
                  <p>{item.summary}</p>
                  <span className="meta">{count} topics · docs + practice</span>
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
              }}
            >
              ← All tracks
            </button>
            <h2>{track.title}</h2>
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
                        Practice this topic
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
                {topicQuestions.length === 0 && (
                  <p className="muted">No practice questions for this topic yet.</p>
                )}
                {topicQuestions.map((q) => (
                  <button
                    key={q.id}
                    className={q.id === questionId ? 'q-item active' : 'q-item'}
                    onClick={() => {
                      setQuestionId(q.id)
                      setFeedback(null)
                      setAnswer('')
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
                    <p className="pill">{question.category}</p>
                    <h3>{question.prompt}</h3>
                    <p className="muted">Hints</p>
                    <ul>
                      {question.hints.map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                    <label className="answer-label" htmlFor="answer">
                      Your answer
                    </label>
                    <textarea
                      id="answer"
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder="Write like you'd speak in an interview (90–120 seconds)…"
                      rows={10}
                    />
                    <div className="actions">
                      <button
                        className="btn primary"
                        onClick={submitAnswer}
                        disabled={loading || !answer.trim()}
                      >
                        {loading ? 'Coaching…' : 'Get AI feedback'}
                      </button>
                    </div>
                  </>
                )}

                {feedback && (
                  <div className="feedback">
                    <div className="score">
                      <span>{feedback.score}/5</span>
                      <p>{feedback.summary}</p>
                      <small>Provider: {feedback.provider}</small>
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
        AI Tutor Studio · study docs → practice answers → get coached (works
        offline in rubric mode)
      </footer>
    </div>
  )
}
