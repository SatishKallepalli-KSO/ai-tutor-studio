import { useEffect, useMemo, useState } from 'react'
import { api, type Feedback, type Track, type TutorQuestion } from './api'
import './App.css'

type Step = 'tracks' | 'plan' | 'practice'

export default function App() {
  const [tracks, setTracks] = useState<Track[]>([])
  const [trackId, setTrackId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<TutorQuestion[]>([])
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
      setQuestionId(qs[0]?.id ?? null)
      setStep('plan')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load questions')
    } finally {
      setLoading(false)
    }
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
          <h1>Practice. Get coached. Level up.</h1>
        </div>
        <p className="tagline">
        Interview prep + language tracks: Java, Python, React, TypeScript,
        JavaScript, HTML, CSS, Node.js
      </p>
      </header>

      {error && <div className="banner error">{error}</div>}

      {step === 'tracks' && (
        <section className="section">
          <h2>Choose a track</h2>
          <div className="track-grid">
            {tracks.map((item) => (
              <button
                key={item.id}
                className="track-card"
                onClick={() => selectTrack(item.id)}
                disabled={loading}
              >
                <span className="pill">{item.audience}</span>
                <strong>{item.title}</strong>
                <p>{item.summary}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {track && step !== 'tracks' && (
        <section className="section">
          <div className="section-head">
            <button className="linkish" onClick={() => setStep('tracks')}>
              ← All tracks
            </button>
            <h2>{track.title}</h2>
            <p>{track.summary}</p>
          </div>

          <div className="tabs">
            <button
              className={step === 'plan' ? 'tab active' : 'tab'}
              onClick={() => setStep('plan')}
            >
              Study plan
            </button>
            <button
              className={step === 'practice' ? 'tab active' : 'tab'}
              onClick={() => setStep('practice')}
            >
              Mock practice
            </button>
          </div>

          {step === 'plan' && (
            <div className="panel">
              <h3>Outcomes</h3>
              <ul>
                {track.outcomes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <h3>Plan</h3>
              <ol>
                {track.study_plan.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
              <button className="btn primary" onClick={() => setStep('practice')}>
                Start mock practice
              </button>
            </div>
          )}

          {step === 'practice' && (
            <div className="practice">
              <aside className="question-list">
                <h3>Questions</h3>
                {questions.map((q) => (
                  <button
                    key={q.id}
                    className={
                      q.id === questionId ? 'q-item active' : 'q-item'
                    }
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
        AI Tutor Studio · local MVP · works without OpenAI key (rubric mode)
      </footer>
    </div>
  )
}
