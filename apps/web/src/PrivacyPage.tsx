import { Link } from 'react-router-dom'
import { BRAND } from './brand'
import { Shell } from './Shell'
import './App.css'

const UPDATED = 'August 10, 2026'

export function PrivacyPage() {
  return (
    <Shell>
      <article className="company-page privacy-page">
        <section className="company-hero reveal">
          <p className="eyebrow">Legal</p>
          <h1>
            Privacy Policy
            <span>{BRAND.product}</span>
          </h1>
          <p className="hero-lede">
            This Privacy Policy explains how {BRAND.company} (“we”, “us”)
            collects, uses, and shares information when you use{' '}
            {BRAND.product} at {BRAND.domain} and related services.
          </p>
          <p className="muted">Last updated: {UPDATED}</p>
        </section>

        <section className="company-section reveal">
          <p className="eyebrow">1</p>
          <h2>Information we collect</h2>
          <ul className="company-list">
            <li>
              <strong>Account information</strong>
              <span>
                Name, email address, password (stored hashed), persona
                (learner/recruiter), and plan status when you register or sign
                in.
              </span>
            </li>
            <li>
              <strong>Profile &amp; product data</strong>
              <span>
                Optional profile details, learning progress, practice answers
                you submit, AI coaching feedback, jobs you post or view, and
                messages you send on the platform.
              </span>
            </li>
            <li>
              <strong>Usage &amp; device data</strong>
              <span>
                Pages visited, feature events, approximate timestamps, browser
                type, and similar diagnostics needed to operate and improve the
                service.
              </span>
            </li>
            <li>
              <strong>Payment-related data</strong>
              <span>
                If you upgrade to a paid plan, payment processing is handled by
                our payment provider. We receive confirmation of subscription
                status; we do not store full card numbers on our servers.
              </span>
            </li>
          </ul>
        </section>

        <section className="company-section reveal">
          <p className="eyebrow">2</p>
          <h2>How we use information</h2>
          <ul className="company-list">
            <li>
              <strong>Provide the service</strong>
              <span>
                Authenticate you, deliver learning paths, practice drills, AI
                feedback, jobs, messaging, and account features.
              </span>
            </li>
            <li>
              <strong>Improve &amp; secure</strong>
              <span>
                Debug issues, prevent abuse, measure product performance, and
                improve coaching quality.
              </span>
            </li>
            <li>
              <strong>Communicate</strong>
              <span>
                Send service notices (e.g. security, billing, product changes).
                Marketing emails, if any, will include an opt-out.
              </span>
            </li>
            <li>
              <strong>Legal compliance</strong>
              <span>
                Meet applicable legal obligations and enforce our terms.
              </span>
            </li>
          </ul>
        </section>

        <section className="company-section reveal">
          <p className="eyebrow">3</p>
          <h2>AI coaching &amp; third-party processors</h2>
          <p className="company-copy">
            When you request AI coaching, practice answers and related prompts
            may be sent to our AI provider (currently OpenAI) to generate
            feedback. Do not submit sensitive personal data you are not
            comfortable sharing for that purpose.
          </p>
          <p className="company-copy">
            We also use infrastructure and service providers such as hosting
            (e.g. Render), database (e.g. Neon), and payment processors (e.g.
            Stripe when enabled). They process data only as needed to provide
            their services to us.
          </p>
        </section>

        <section className="company-section reveal">
          <p className="eyebrow">4</p>
          <h2>Cookies &amp; local storage</h2>
          <p className="company-copy">
            We use essential cookies or local storage for authentication,
            preferences (such as learner/recruiter view), and learning progress.
            These are required for the product to function. We do not sell
            personal information.
          </p>
        </section>

        <section className="company-section reveal">
          <p className="eyebrow">5</p>
          <h2>Data retention</h2>
          <p className="company-copy">
            We retain account and product data while your account is active and
            for a reasonable period afterward for backups, dispute resolution,
            and legal compliance. You may request deletion of your account by
            contacting us.
          </p>
        </section>

        <section className="company-section reveal">
          <p className="eyebrow">6</p>
          <h2>Your choices &amp; rights</h2>
          <p className="company-copy">
            Depending on where you live, you may have rights to access, correct,
            delete, or export personal data, or to object to certain processing.
            Contact us to make a request. We will not discriminate against you
            for exercising privacy rights.
          </p>
        </section>

        <section className="company-section reveal">
          <p className="eyebrow">7</p>
          <h2>Children</h2>
          <p className="company-copy">
            {BRAND.product} is intended for adults and professional learners. We
            do not knowingly collect personal information from children under
            13 (or the age required by local law).
          </p>
        </section>

        <section className="company-section reveal">
          <p className="eyebrow">8</p>
          <h2>Security</h2>
          <p className="company-copy">
            We use industry-standard measures such as encrypted transport (HTTPS)
            and hashed passwords. No method of transmission or storage is 100%
            secure; please use a strong unique password.
          </p>
        </section>

        <section className="company-section reveal">
          <p className="eyebrow">9</p>
          <h2>International transfers</h2>
          <p className="company-copy">
            We may process data in the United States and other countries where
            our providers operate. By using the service, you understand your
            information may be transferred to those locations.
          </p>
        </section>

        <section className="company-section reveal">
          <p className="eyebrow">10</p>
          <h2>Changes to this policy</h2>
          <p className="company-copy">
            We may update this Privacy Policy from time to time. We will post the
            revised version on this page and update the “Last updated” date. Continued
            use after changes means you accept the updated policy.
          </p>
        </section>

        <section className="company-section reveal">
          <p className="eyebrow">11</p>
          <h2>Contact</h2>
          <p className="company-copy">
            Privacy questions or requests:{' '}
            <a href={`mailto:${BRAND.contactEmail}`}>{BRAND.contactEmail}</a>
            <br />
            Operator: {BRAND.company} · Product: {BRAND.product} (
            {BRAND.domain})
          </p>
          <div className="hero-cta" style={{ marginTop: '1.25rem' }}>
            <Link className="btn ghost" to="/">
              Back to home
            </Link>
            <Link className="btn ghost" to="/about">
              About
            </Link>
          </div>
        </section>

        <p className="muted privacy-disclaimer">
          This page is provided for transparency and does not constitute legal
          advice. Consult counsel for jurisdiction-specific requirements.
        </p>
      </article>
    </Shell>
  )
}
