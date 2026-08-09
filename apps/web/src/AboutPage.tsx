import { Link } from 'react-router-dom'
import { Shell } from './Shell'
import { TrustStats } from './TrustStats'
import { PRODUCT_STATS } from './productStats'
import './App.css'

export function AboutPage() {
  return (
    <Shell>
      <article className="company-page about-page">
        <section className="company-hero reveal">
          <p className="eyebrow">About</p>
          <h1>
            Kallepalli Labs
            <span>AI Tutor Studio</span>
          </h1>
          <p className="hero-lede">
            We build voice-first interview prep — study sharp topic docs, answer
            out loud, and get coached on substance plus delivery. Not another
            text chatbot. Not another coding puzzle farm.
          </p>
          <div className="hero-cta">
            <Link className="btn primary" to="/">
              Explore paths
            </Link>
            <Link className="btn ghost" to="/company">
              Company
            </Link>
            <Link className="btn ghost" to="/compare">
              Compare tools
            </Link>
          </div>
        </section>

        <TrustStats variant="strip" className="reveal" />

        <section className="company-section reveal">
          <p className="eyebrow">Mission</p>
          <h2>Help serious engineers sound like the role.</h2>
          <p className="company-copy">
            Interview loops reward clear ownership stories, tradeoff judgment,
            and calm delivery under time pressure. AI Tutor Studio is built
            around that: curriculum first, spoken practice second, coaching that
            critiques both what you said and how you said it.
          </p>
        </section>

        <section className="company-section reveal">
          <p className="eyebrow">What we build</p>
          <h2>Surfaces that mirror the loop.</h2>
          <ul className="company-list">
            <li>
              <strong>Structured study docs</strong>
              <span>
                Topic-level curricula across {PRODUCT_STATS.tracksCount} tracks
                for Staff, Engineering Manager, career switches, and language
                depth drills.
              </span>
            </li>
            <li>
              <strong>Voice practice</strong>
              <span>
                Mic-first answers with timing cues — closer to a panel than a
                typed essay.
              </span>
            </li>
            <li>
              <strong>Coaching feedback</strong>
              <span>
                Rubric-style notes on substance and delivery, with a Free path
                to train and Pro when the loop matters.
              </span>
            </li>
            <li>
              <strong>Career switch paths</strong>
              <span>
                Backend → Agentic AI ({PRODUCT_STATS.agenticVideosCount}{' '}
                validated videos) and Data Engineer → Snowflake (
                {PRODUCT_STATS.snowflakeVideosCount} videos) so switchers build
                real stack context before they interview.
              </span>
            </li>
          </ul>
        </section>

        <section className="company-section reveal">
          <p className="eyebrow">Who it’s for</p>
          <h2>Candidates who outgrew generic prep.</h2>
          <div className="company-audience">
            <div>
              <strong>Staff &amp; EM candidates</strong>
              <p>
                Narrative depth, org impact, and systems judgment — not LeetCode
                trivia alone.
              </p>
            </div>
            <div>
              <strong>Stack switchers</strong>
              <p>
                Backend → Python / AI paths plus Agentic and Snowflake curricula
                for people rebuilding signal fast.
              </p>
            </div>
            <div>
              <strong>Engineers sharpening delivery</strong>
              <p>
                Language and frontend fundamentals with spoken drills before the
                onsite.
              </p>
            </div>
          </div>
        </section>

        <section className="company-section founder-block reveal">
          <p className="eyebrow">Founder</p>
          <h2>Satish Kallepalli</h2>
          <p className="company-copy">
            Engineering manager and AI architect by background — building
            Kallepalli Labs products that turn hard interview preparation into a
            repeatable practice loop. AI Tutor Studio is the flagship: practical,
            premium, and honest about what helps candidates compete.
          </p>
          <div className="hero-cta">
            <Link className="btn ghost" to="/company">
              See company overview
            </Link>
            <Link className="btn ghost" to="/investors">
              Partner &amp; invest
            </Link>
            <a className="btn ghost" href="mailto:hello@kallepallilabs.com">
              hello@kallepallilabs.com
            </a>
          </div>
        </section>
      </article>
    </Shell>
  )
}
