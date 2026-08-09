import { Link } from 'react-router-dom'
import { AdSlot } from './AdSlot'
import { Shell } from './Shell'
import { TrustStats } from './TrustStats'
import { PRODUCT_STATS } from './productStats'
import './App.css'

const TECH_PARTNERS = [
  { name: 'OpenAI', role: 'AI coaching models' },
  { name: 'Stripe', role: 'Billing' },
  { name: 'Snowflake', role: 'Career path curriculum' },
  { name: 'React', role: 'Web product' },
  { name: 'FastAPI', role: 'API platform' },
] as const

const OPEN_SLOTS = [
  {
    role: 'Partner',
    blurb: 'Distribution, hiring, or learning partners — seat open.',
  },
  {
    role: 'Advisor',
    blurb: 'Interviewing, GTM, or AI product advisors welcome.',
  },
  {
    role: 'Design partner',
    blurb: 'Early design / brand collaborators — label reserved.',
  },
] as const

export function CompanyPage() {
  return (
    <Shell>
      <article className="company-page">
        <section className="company-hero reveal">
          <p className="eyebrow">Kallepalli Labs</p>
          <h1>
            AI Tutor Studio
            <span>Win the interview loop.</span>
          </h1>
          <p className="hero-lede">
            An independent product company building voice-first interview prep
            for Staff, EM, and stack-switch candidates. Study. Speak. Get
            coached — with a Free path to train and Pro when the loop matters.
          </p>
          <div className="hero-cta">
            <Link className="btn primary" to="/">
              Try the product
            </Link>
            <Link className="btn ghost" to="/compare">
              Compare tools
            </Link>
            <Link className="btn ghost" to="/investors">
              Partner &amp; invest
            </Link>
          </div>
        </section>

        <TrustStats variant="panel" className="reveal" />

        <section className="company-partner-strip reveal" aria-label="Built with">
          <p className="company-tech-label">Technology stack</p>
          <ul className="company-logo-row" aria-label="Technology partners">
            {TECH_PARTNERS.map((item) => (
              <li key={item.name}>
                <span>
                  {item.name}
                  <em className="company-logo-role">{item.role}</em>
                </span>
              </li>
            ))}
          </ul>
          <p className="muted company-tech-note">
            Integration &amp; curriculum partners — not investors. No fabricated
            VC logos or Fortune-500 customer claims.
          </p>
        </section>

        <section className="company-section reveal" id="mission">
          <p className="eyebrow">Mission</p>
          <h2>Help serious engineers sound like the role.</h2>
          <p className="company-copy">
            Interview loops reward ownership stories, tradeoff judgment, and
            calm delivery under time. We build the practice system around that
            — not puzzle farms, not generic chat wrappers.
          </p>
        </section>

        <section className="company-section reveal" id="product">
          <p className="eyebrow">Product</p>
          <h2>Practice the way panels hear you.</h2>
          <p className="company-copy">
            {PRODUCT_STATS.tracksCount} interview &amp; language tracks, plus
            Agentic ({PRODUCT_STATS.agenticVideosCount} videos) and Snowflake (
            {PRODUCT_STATS.snowflakeVideosCount} videos) libraries — curriculum
            first, mic answers second, coaching on substance and delivery.
          </p>
          <div className="company-snapshot">
            <div>
              <strong>Study</strong>
              <p>Topic docs for Staff, EM, switches, and languages.</p>
            </div>
            <div>
              <strong>Speak</strong>
              <p>Voice-first drills with timing pressure, not typed essays.</p>
            </div>
            <div>
              <strong>Coach</strong>
              <p>Feedback on content and delivery before the onsite.</p>
            </div>
          </div>
        </section>

        <section className="company-section reveal" id="team">
          <p className="eyebrow">Team</p>
          <h2>Built by Kallepalli Labs</h2>
          <p className="company-copy">
            Founded by <strong>Satish Kallepalli</strong> — engineering manager
            and AI architect by background. We ship practical AI products for
            people competing in real hiring loops. Credibility means ownership,
            shipping, and honest partner language — not invented headcount or
            backing.
          </p>
          <div className="hero-cta" style={{ marginTop: '1rem' }}>
            <Link className="btn ghost" to="/about">
              About the lab
            </Link>
            <a className="btn ghost" href="mailto:hello@kallepallilabs.com">
              Contact
            </a>
          </div>
        </section>

        <section className="company-section reveal" id="why-now">
          <p className="eyebrow">Why now</p>
          <h2>Interviews got harder. Prep stayed typed.</h2>
          <p className="company-copy">
            Panels still judge spoken clarity, ownership stories, and judgment
            under time. Candidates need curriculum, voice, and coaching in one
            loop — built for that gap.
          </p>
        </section>

        <section className="company-section reveal" id="open-slots">
          <p className="eyebrow">Open slots</p>
          <h2>Partner seats, labeled honestly.</h2>
          <ul className="company-slot-row">
            {OPEN_SLOTS.map((slot) => (
              <li key={slot.role}>
                <em>{slot.role}</em>
                <span>{slot.blurb}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="company-section reveal" id="contact">
          <p className="eyebrow">Contact</p>
          <h2>Talk to the team.</h2>
          <p className="company-copy">
            Product questions, partnerships, and investor conversations go to
            the same inbox. Mention whether you’re a candidate, partner, or
            investor so we can respond with the right materials.
          </p>
          <div className="hero-cta" style={{ marginTop: '1rem' }}>
            <a className="btn primary" href="mailto:hello@kallepallilabs.com">
              hello@kallepallilabs.com
            </a>
            <Link className="btn ghost" to="/investors">
              Partner &amp; invest
            </Link>
          </div>
        </section>

        <section className="company-cta-band reveal" id="partner">
          <div>
            <p className="eyebrow">Partner &amp; invest</p>
            <h2>Help set the practice standard.</h2>
            <p className="company-copy">
              Advisors, distribution partners, and early investors welcome. No
              invented round announcements — just a clear conversation.
            </p>
          </div>
          <div className="hero-cta">
            <Link className="btn primary" to="/investors">
              Investor relations
            </Link>
            <Link className="btn ghost" to="/compare">
              See how we compare
            </Link>
          </div>
        </section>

        <AdSlot
          id="company-footer"
          variant="banner"
          className="company-ad"
          headline="Hiring &amp; learning partners"
          detail="Below-fold placement only — company story stays brand-first above."
        />
      </article>
    </Shell>
  )
}
