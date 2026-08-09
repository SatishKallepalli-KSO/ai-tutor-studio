import { Link } from 'react-router-dom'
import { AdSlot } from './AdSlot'
import { Shell } from './Shell'
import { TrustStats } from './TrustStats'
import { PRODUCT_STATS } from './productStats'
import './App.css'

export function InvestorsPage() {
  return (
    <Shell>
      <article className="company-page investors-page">
        <section className="company-hero reveal">
          <p className="eyebrow">Kallepalli Labs</p>
          <h1>
            Partner &amp; invest
            <span>Help candidates win the loop.</span>
          </h1>
          <p className="hero-lede">
            Open to partners and investors who care about interview outcomes —
            not logo-wall theater. AI Tutor Studio is a shipping, voice-first
            practice product under Kallepalli Labs.
          </p>
          <div className="hero-cta">
            <a className="btn primary" href="mailto:hello@kallepallilabs.com">
              Email hello@kallepallilabs.com
            </a>
            <Link className="btn ghost" to="/company">
              Company overview
            </Link>
            <Link className="btn ghost" to="/compare">
              Competitive fit
            </Link>
          </div>
        </section>

        <TrustStats variant="panel" className="reveal" />

        <section className="company-partner-strip reveal" aria-label="Built with">
          <p className="company-tech-label">Technology stack</p>
          <ul className="company-logo-row">
            {[
              { name: 'OpenAI', role: 'Coaching' },
              { name: 'Stripe', role: 'Billing' },
              { name: 'Snowflake', role: 'Curriculum' },
            ].map((item) => (
              <li key={item.name}>
                <span>
                  {item.name}
                  <em className="company-logo-role">{item.role}</em>
                </span>
              </li>
            ))}
          </ul>
          <p className="muted company-tech-note">
            Technology partners only — we do not claim venture backing we don’t
            have.
          </p>
        </section>

        <section className="company-section reveal">
          <p className="eyebrow">The pitch</p>
          <h2>Practice that matches how hiring works.</h2>
          <p className="company-copy">
            Most prep tools optimize for typed answers or puzzle volume. Hiring
            panels still reward ownership stories, tradeoffs, and calm spoken
            delivery. AI Tutor Studio targets that gap: curriculum, voice, and
            coaching — freemium to learn, Pro when the loop matters.
          </p>
        </section>

        <section className="company-section reveal">
          <p className="eyebrow">What’s real today</p>
          <h2>Shipped surface. Clear ICP. Honest story.</h2>
          <ul className="company-list">
            <li>
              <strong>Product surface</strong>
              <span>
                {PRODUCT_STATS.tracksCount} tracks, study docs, voice practice,
                feedback, auth, Stripe-ready billing, plus Agentic (
                {PRODUCT_STATS.agenticVideosCount}) and Snowflake (
                {PRODUCT_STATS.snowflakeVideosCount}) video paths.
              </span>
            </li>
            <li>
              <strong>Clear ICP</strong>
              <span>
                Staff &amp; EM candidates, Java → AI / Python switchers, and
                Data Engineer → Snowflake learners.
              </span>
            </li>
            <li>
              <strong>Differentiated loop</strong>
              <span>
                Curriculum → speak → coach — closer to the interview room than
                generic chat or coding-only drills. See the{' '}
                <Link to="/compare">comparison page</Link> for fair tradeoffs.
              </span>
            </li>
            <li>
              <strong>Honest company story</strong>
              <span>
                Independent Kallepalli Labs product. Partner slots labeled openly
                until filled — no fabricated VC endorsements or vanity user
                counts.
              </span>
            </li>
          </ul>
          <p className="muted company-tech-note">
            Learner counts shown above come from the live API when connected;
            otherwise we show product counts we can prove from the shipped
            curriculum.
          </p>
        </section>

        <section className="company-section reveal">
          <p className="eyebrow">How to engage</p>
          <h2>Partners, advisors, capital</h2>
          <div className="company-audience">
            <div>
              <strong>Distribution partners</strong>
              <p>
                Bootcamps, communities, and hiring brands that want a
                practice-native placement — not spammy ads in the hero.
              </p>
            </div>
            <div>
              <strong>Advisors</strong>
              <p>
                Interviewing, GTM, AI product, or design advisors — open slots
                on the company page until named.
              </p>
            </div>
            <div>
              <strong>Investors</strong>
              <p>
                Early conversations welcome. We’ll share product demo, roadmap,
                and what capital would accelerate — without invented rounds.
              </p>
            </div>
          </div>
        </section>

        <section className="company-cta-band reveal">
          <div>
            <p className="eyebrow">Next step</p>
            <h2>Start with a conversation.</h2>
            <p className="company-copy">
              Reach Satish at Kallepalli Labs. Mention whether you’re a partner,
              advisor, or investor so we can send the right materials.
            </p>
          </div>
          <div className="hero-cta">
            <a className="btn primary" href="mailto:hello@kallepallilabs.com">
              hello@kallepallilabs.com
            </a>
            <Link className="btn ghost" to="/">
              Try AI Tutor Studio
            </Link>
          </div>
        </section>

        <AdSlot
          id="investors-footer"
          variant="banner"
          className="company-ad"
          headline="Partner introductions"
          detail="Reserved below the pitch — never above the brand ask."
        />
      </article>
    </Shell>
  )
}
