import { Link } from 'react-router-dom'
import { AUDIENCES, BRAND } from './brand'
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
            {BRAND.company}
            <span>{BRAND.product}</span>
          </h1>
          <p className="hero-lede">{BRAND.oneLiner}</p>
          <div className="hero-cta">
            <Link className="btn primary" to="/">
              Learn &amp; practice
            </Link>
            <Link className="btn ghost" to="/for-companies">
              For companies
            </Link>
            <Link className="btn ghost" to="/company">
              Company
            </Link>
          </div>
        </section>

        <TrustStats variant="strip" className="reveal" />

        <section className="company-section reveal">
          <p className="eyebrow">Mission</p>
          <h2>Close the gap between learning and hiring.</h2>
          <p className="company-copy">
            Candidates need structured practice that sounds like real screens.
            Companies need consistent interviews and clearer signals. We build
            one studio for both — not a puzzle farm, not a generic chatbot, not
            another ATS bolted onto email.
          </p>
        </section>

        <section className="dual-audience reveal">
          <div className="dual-card">
            <p className="eyebrow">{AUDIENCES.talent.label}</p>
            <h3>{AUDIENCES.talent.title}</h3>
            <p>{AUDIENCES.talent.blurb}</p>
          </div>
          <div className="dual-card dual-card-accent">
            <p className="eyebrow">{AUDIENCES.companies.label}</p>
            <h3>{AUDIENCES.companies.title}</h3>
            <p>{AUDIENCES.companies.blurb}</p>
          </div>
        </section>

        <section className="company-section reveal">
          <p className="eyebrow">What we build</p>
          <h2>Learning, practice, and hiring — connected.</h2>
          <ul className="company-list">
            <li>
              <strong>Learning paths</strong>
              <span>
                Topic curricula across {PRODUCT_STATS.tracksCount} tracks, plus
                Agentic ({PRODUCT_STATS.agenticVideosCount}) and Snowflake (
                {PRODUCT_STATS.snowflakeVideosCount}) libraries.
              </span>
            </li>
            <li>
              <strong>Spoken practice + AI coaching</strong>
              <span>
                Mic-first answers with feedback on substance and delivery —
                closer to a panel than a typed essay.
              </span>
            </li>
            <li>
              <strong>Hiring studio</strong>
              <span>
                Structured interview kits, scorecards, and readiness signals for
                companies — early access via design partners.
              </span>
            </li>
            <li>
              <strong>Freemium + Pro</strong>
              <span>
                Talent trains free on starter paths; Pro unlocks leadership loops
                and unlimited coaching. Companies partner directly with{' '}
                {BRAND.company}.
              </span>
            </li>
          </ul>
        </section>

        <section className="company-section reveal">
          <p className="eyebrow">Founder</p>
          <h2>Satish Kallepalli</h2>
          <p className="company-copy">
            Building {BRAND.product} under {BRAND.company} — focused on serious
            engineering talent and the teams that hire them.
          </p>
        </section>
      </article>
    </Shell>
  )
}
