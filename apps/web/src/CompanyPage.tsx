import { Link } from 'react-router-dom'
import { AdSlot } from './AdSlot'
import { Shell } from './Shell'
import './App.css'

const TECH_PARTNERS = [
  'OpenAI',
  'Stripe',
  'Snowflake',
  'React',
  'FastAPI',
] as const

const OPEN_SLOTS = [
  {
    role: 'Partner',
    blurb: 'Distribution, hiring, or learning partners — slot open.',
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
            coached.
          </p>
          <div className="hero-cta">
            <Link className="btn primary" to="/">
              Try the product
            </Link>
            <Link className="btn ghost" to="/investors">
              Partner &amp; invest
            </Link>
          </div>
        </section>

        <section className="company-partner-strip reveal" aria-label="Built with">
          <p className="company-tech-label">Built with</p>
          <ul className="company-logo-row" aria-label="Technology partners">
            {TECH_PARTNERS.map((name) => (
              <li key={name}>
                <span>{name}</span>
              </li>
            ))}
          </ul>
          <p className="muted company-tech-note">
            Stack &amp; integration partners — not investors. No fabricated VC
            logos.
          </p>
        </section>

        <section className="company-section reveal" id="product">
          <p className="eyebrow">Product</p>
          <h2>Practice the way panels hear you.</h2>
          <p className="company-copy">
            Structured curricula, mic answers, and coaching on substance plus
            delivery. Free paths to train; Pro when Staff/EM depth and unlimited
            coaching matter.
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

        <section className="company-section reveal" id="story">
          <p className="eyebrow">Company story</p>
          <h2>Built by Kallepalli Labs</h2>
          <p className="company-copy">
            Founded by <strong>Satish Kallepalli</strong>. We ship practical AI
            products for people competing in real hiring loops — not another
            generic chatbot wrapper. Credibility means ownership, shipping, and
            honest partner language.
          </p>
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
            <a className="btn ghost" href="mailto:hello@kallepallilabs.com">
              hello@kallepallilabs.com
            </a>
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
