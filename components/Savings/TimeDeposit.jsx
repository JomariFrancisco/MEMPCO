import Image from 'next/image'
import './TimeDeposit.css'

/* ─── data ─────────────────────────────────────────── */
const stats = [
  {
    value: '4.10% - 6.75%',
    label: 'Interest rate per annum',
  },
  {
    value: 'Php 5,000',
    label: 'Minimum account opening',
  },
  {
    value: '30 days - 1 year',
    label: 'Available placement terms',
  },
]

const features = [
  {
    label: 'Competitive fixed-term rates',
    desc:  'Earn from 4.10% to 6.75% per annum depending on the selected term and current product schedule.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
      </svg>
    ),
  },
  {
    label: 'Multiple term options',
    desc:  'Choose from 30, 60, 90, 120, 180 days, or a 1-year placement term.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8"  y1="2" x2="8"  y2="6" />
        <line x1="3"  y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    label: 'Php 5,000 minimum opening',
    desc:  'Start a Time Deposit placement with a minimum account opening of Php 5,000.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
]

const cards = [
  {
    num:   '01',
    title: 'How interest works',
    text:  'Your deposit earns from 4.10% to 6.75% per annum, based on the selected term and current product schedule.',
  },
  {
    num:   '02',
    title: 'Placement terms',
    text:  'Available terms include 30, 60, 90, 120, 180 days, and 1 year. Choose the duration that fits your savings plan.',
  },
  {
    num:   '03',
    title: 'Minimum opening',
    text:  'A Time Deposit account starts with a minimum opening placement of Php 5,000.',
  },
]

const whyCards = [
  {
    num:   '01',
    title: 'Money that stays put',
    text:  'Time Deposit removes idle cash from easy reach, giving you a structural reason to hold off on unnecessary spending.',
  },
  {
    num:   '02',
    title: 'Stronger returns, shorter wait',
    text:  'The rate range of 4.10% to 6.75% per annum gives members a clearer reason to set aside funds.',
  },
  {
    num:   '03',
    title: 'Built for intentional savers',
    text:  'If you have a goal — a purchase, an investment, a milestone — Time Deposit bridges the gap with discipline and earnings.',
  },
]

/* ─── component ────────────────────────────────────── */
export default function TimeDeposit() {
  return (
    <div className="td">

      {/* ══ 1. HERO ══════════════════════════════════════ */}
      <section className="td-section td-hero" aria-labelledby="td-heading">
        <div className="td-inner">

          {/* breadcrumb */}
          <nav className="td-breadcrumb" aria-label="Breadcrumb">
            <span>Services</span>
            <span className="td-breadcrumb-sep">/</span>
            <span>Savings</span>
            <span className="td-breadcrumb-sep">/</span>
            <span className="td-breadcrumb-active">Time Deposit</span>
          </nav>

          {/* headline */}
          <span className="td-eyebrow">MEMPCO Savings Program</span>
          <h1 className="td-hero-title" id="td-heading">Time <em>Deposit.</em></h1>
          <p className="td-hero-tagline">
            Keep money secure while earning fixed-term returns.<br />
            Let discipline do the earning.
          </p>

          {/* product image */}
          <div className="td-product-stage">
            <Image
              src="/Savings/TimeDeposit.png"
              alt="MEMPCO Time Deposit Certificate"
              width={900}
              height={700}
              className="td-product-img"
              priority
            />
          </div>

        </div>
      </section>

      {/* ══ 2. STATS BAR ═════════════════════════════════ */}
      <section className="td-section td-stats" aria-label="Key figures">
        <div className="td-inner">
          <div className="td-stats-grid">
            {stats.map((s) => (
              <div className="td-stat" key={s.label}>
                <span className="td-stat-value">{s.value}</span>
                <span className="td-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 3. DETAILS ═══════════════════════════════════ */}
      <section className="td-section td-details" aria-labelledby="td-details-heading">
        <div className="td-inner">
          <div className="td-details-grid">

            {/* left — copy + features */}
            <div>
              <p className="td-details-kicker">The program</p>
              <h2 className="td-details-title" id="td-details-heading">
                Your money, working<br /><em>while you wait.</em>
              </h2>
              <p className="td-details-body">
                Cash on hand disappears faster than we expect. MEMPCO Time
                Deposit gives your funds a secure, earning home for a fixed
                period — so the money is there when you actually need it.
              </p>
              <p className="td-details-body">
                Earn <strong>4.10% to 6.75% interest per annum</strong> on
                placements starting at <strong>Php 5,000</strong>, with terms
                from <strong>30 days to 1 year</strong>.
              </p>

              <ul className="td-feature-list">
                {features.map((f) => (
                  <li className="td-feature-item" key={f.label}>
                    <div className="td-feature-icon" aria-hidden="true">
                      {f.icon}
                    </div>
                    <div>
                      <p className="td-feature-name">{f.label}</p>
                      <p className="td-feature-desc">{f.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* right — stacked info cards */}
            <div className="td-detail-cards" aria-label="Program details">
              {cards.map((c) => (
                <div className="td-detail-card" key={c.num}>
                  <p className="td-detail-card-num">{c.num}</p>
                  <p className="td-detail-card-title">{c.title}</p>
                  <p className="td-detail-card-text">{c.text}</p>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ══ 4. PHILOSOPHY CALLOUT ════════════════════════ */}
      <section className="td-section td-callout" aria-label="The philosophy">
        <div className="td-inner">
          <p className="td-callout-kicker">The idea behind it</p>
          <blockquote className="td-callout-quote">
            &ldquo;Cash on hand usually does not last in our possession.
            Temptation is nearer than ever — a strong financial discipline
            is needed to overcome unnecessary spending.&rdquo;
          </blockquote>
          <p className="td-callout-sub">
            Time Deposit is not just a savings product. It is a commitment
            device — a structural way to protect your money from yourself
            until the right moment arrives.
          </p>
        </div>
      </section>

      {/* ══ 5. WHY CHOOSE ════════════════════════════════ */}
      <section className="td-section td-why" aria-labelledby="td-why-heading">
        <div className="td-inner">
          <p className="td-why-kicker">Why Time Deposit</p>
          <h2 className="td-why-title" id="td-why-heading">
            Discipline, <em>rewarded.</em>
          </h2>

          <div className="td-why-grid">
            {whyCards.map((c) => (
              <div className="td-why-card" key={c.num}>
                <p className="td-why-card-num">{c.num}</p>
                <p className="td-why-card-title">{c.title}</p>
                <p className="td-why-card-text">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  )
}
