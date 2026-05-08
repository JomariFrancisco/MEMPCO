import Image from 'next/image'
import './YouthandKids.css'

/* ─── data ─────────────────────────────────────────── */
const stats = [
  {
    value: '3%',
    label: 'Interest per annum',
  },
  {
    value: 'Php 50',
    label: 'Membership fee to get started',
  },
  {
    value: 'Php 50',
    label: 'Initial deposit required',
  },
]

const features = [
  {
    label: 'Starts at just Php 50',
    desc:  'An initial deposit and membership fee of only Php 50 each — a barrier-free way to begin a lifelong saving habit.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    label: 'Earns 3% per annum',
    desc:  'Young savers earn interest on their balance, teaching them early that money can grow on its own.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
      </svg>
    ),
  },
  {
    label: 'Builds lifelong money habits',
    desc:  'Starting early is the single biggest advantage in personal finance. Youth Savings gives children a real head start.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
]

const cards = [
  {
    num:   '01',
    title: 'How to open',
    text:  'Any child who is a member or a dependent of a MEMPCO member may open a Youth Savings account with a Php 50 membership fee and a Php 50 initial deposit.',
  },
  {
    num:   '02',
    title: 'How interest is earned',
    text:  'The account earns 3% interest per annum, computed on the average daily balance and credited directly to the account.',
  },
  {
    num:   '03',
    title: 'A gift that grows',
    text:  'Parents and guardians can deposit on behalf of their children anytime, turning milestones like birthdays into real savings moments.',
  },
]

const whyCards = [
  {
    num:   '01',
    title: 'The earlier, the better',
    text:  'A child who saves from a young age builds an intuition for financial responsibility that carries into adulthood.',
  },
  {
    num:   '02',
    title: 'A parent\'s greatest investment',
    text:  'Giving your child a savings account teaches something no classroom can — that their future is worth protecting today.',
  },
  {
    num:   '03',
    title: 'Low cost, high impact',
    text:  'At just Php 50 to open, Youth Savings is accessible to every family — no matter where they are in their financial journey.',
  },
]

/* ─── component ────────────────────────────────────── */
export default function YouthandKids() {
  return (
    <div className="yk">

      {/* ══ 1. HERO ══════════════════════════════════════ */}
      <section className="yk-section yk-hero" aria-labelledby="yk-heading">
        <div className="yk-inner">

          {/* breadcrumb */}
          <nav className="yk-breadcrumb" aria-label="Breadcrumb">
            <span>Services</span>
            <span className="yk-breadcrumb-sep">/</span>
            <span>Savings</span>
            <span className="yk-breadcrumb-sep">/</span>
            <span className="yk-breadcrumb-active">Youth Savings</span>
          </nav>

          {/* headline */}
          <span className="yk-eyebrow">MEMPCO Savings Program</span>
          <h1 className="yk-hero-title" id="yk-heading">Youth Savings.</h1>
          <p className="yk-hero-tagline">
            The best time to start saving is childhood.<br />
            The second best time is right now.
          </p>

          {/* product image */}
          <div className="yk-product-stage">
            <Image
              src="/Savings/YouthandKidsPassbook.png"
              alt="MEMPCO Youth Savings Passbook"
              width={900}
              height={700}
              className="yk-product-img"
              priority
            />
          </div>

        </div>
      </section>

      {/* ══ 2. STATS BAR ═════════════════════════════════ */}
      <section className="yk-section yk-stats" aria-label="Key figures">
        <div className="yk-inner">
          <div className="yk-stats-grid">
            {stats.map((s) => (
              <div className="yk-stat" key={s.label}>
                <span className="yk-stat-value">{s.value}</span>
                <span className="yk-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 3. DETAILS ═══════════════════════════════════ */}
      <section className="yk-section yk-details" aria-labelledby="yk-details-heading">
        <div className="yk-inner">
          <div className="yk-details-grid">

            {/* left — copy + features */}
            <div>
              <p className="yk-details-kicker">The program</p>
              <h2 className="yk-details-title" id="yk-details-heading">
                Small deposits.<br />Big futures.
              </h2>
              <p className="yk-details-body">
                MEMPCO Youth Savings is designed for children of cooperative
                members. It gives young people their first real relationship
                with money — one built on growth, not spending.
              </p>
              <p className="yk-details-body">
                Open with as little as <strong>Php 50</strong> and earn{' '}
                <strong>3% interest per annum</strong>. Simple, accessible,
                and designed to last a lifetime.
              </p>

              <ul className="yk-feature-list">
                {features.map((f) => (
                  <li className="yk-feature-item" key={f.label}>
                    <div className="yk-feature-icon" aria-hidden="true">
                      {f.icon}
                    </div>
                    <div>
                      <p className="yk-feature-name">{f.label}</p>
                      <p className="yk-feature-desc">{f.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* right — stacked info cards */}
            <div className="yk-detail-cards" aria-label="Program details">
              {cards.map((c) => (
                <div className="yk-detail-card" key={c.num}>
                  <p className="yk-detail-card-num">{c.num}</p>
                  <p className="yk-detail-card-title">{c.title}</p>
                  <p className="yk-detail-card-text">{c.text}</p>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ══ 4. PARENT CALLOUT ════════════════════════════ */}
      <section className="yk-section yk-callout" aria-label="A message for parents">
        <div className="yk-inner">
          <p className="yk-callout-kicker">For every parent</p>
          <blockquote className="yk-callout-quote">
            &ldquo;Our way of showing love and care is by ensuring that a
            brighter future lies ahead — through proper financial management,
            starting young.&rdquo;
          </blockquote>
          <p className="yk-callout-sub">
            Youth Savings is more than an account. It is a lesson in patience,
            discipline, and the power of letting small things grow.
          </p>
        </div>
      </section>

      {/* ══ 5. WHY CHOOSE ════════════════════════════════ */}
      <section className="yk-section yk-why" aria-labelledby="yk-why-heading">
        <div className="yk-inner">
          <p className="yk-why-kicker">Why Youth Savings</p>
          <h2 className="yk-why-title" id="yk-why-heading">
            Start early. Finish strong.
          </h2>

          <div className="yk-why-grid">
            {whyCards.map((c) => (
              <div className="yk-why-card" key={c.num}>
                <p className="yk-why-card-num">{c.num}</p>
                <p className="yk-why-card-title">{c.title}</p>
                <p className="yk-why-card-text">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  )
}