import Image from 'next/image'
import './RegularSavings.css'

/* ─── data ─────────────────────────────────────────── */
const stats = [
  { value: 'Php', num: '100', label: 'Minimum opening deposit' },
  { value: '4%',  num: null,  label: 'Interest per annum, tax-free' },
  { value: null,  num: 'On demand', label: 'Withdraw anytime during office hours' },
]

const features = [
  {
    label: 'Zero tax on earnings',
    desc:  'Every centavo of interest you earn goes straight to you — no deductions.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    ),
  },
  {
    label: 'Withdrawal upon demand',
    desc:  'Access your savings any time you need them during MEMPCO office hours.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="2" y="5" width="20" height="14" rx="2"/>
        <path d="M2 10h20"/>
      </svg>
    ),
  },
  {
    label: 'Open to all members',
    desc:  'Required upon membership — simple, inclusive, and immediate.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
]

const cards = [
  {
    num:   '01',
    title: 'How it works',
    text:  'Open your account with Php 100.00. Your balance earns 4% interest per annum, computed on your average daily balance and credited to your account.',
  },
  {
    num:   '02',
    title: 'Withdrawals',
    text:  'Savings may be withdrawn upon demand during MEMPCO\'s regular office hours. Simply present your passbook at the counter.',
  },
]

const whyCards = [
  {
    num:   '01',
    title: 'Build saving discipline',
    text:  'A mandatory account from day one helps every member start their financial journey on the right foot.',
  },
  {
    num:   '02',
    title: 'Grow without worry',
    text:  'At 4% per annum with no taxes, your money works for you quietly and consistently.',
  },
  {
    num:   '03',
    title: 'Accessible anytime',
    text:  'Your funds are never locked away. Withdraw when you need to — the cooperative is here to serve you.',
  },
]

/* ─── component ────────────────────────────────────── */
export default function RegularSavings() {
  return (
    <div className="rs">

      {/* ══ 1. HERO ══════════════════════════════════════ */}
      <section className="rs-section rs-hero" aria-labelledby="rs-heading">
        <div className="rs-inner">

          {/* breadcrumb */}
          <nav className="rs-breadcrumb" aria-label="Breadcrumb">
            <span>Services</span>
            <span className="rs-breadcrumb-sep">/</span>
            <span>Savings</span>
            <span className="rs-breadcrumb-sep">/</span>
            <span className="rs-breadcrumb-active">Regular Savings</span>
          </nav>

          {/* headline */}
          <span className="rs-eyebrow">MEMPCO Savings Program</span>
          <h1 className="rs-hero-title" id="rs-heading">Regular Savings.</h1>
          <p className="rs-hero-tagline">
            Simple, dependable, and tax-free.<br />
            Built for every member from day one.
          </p>

          {/* product image */}
          <div className="rs-product-stage">
            <Image
              src="/Savings/RegularSavingsPassbook.png"
              alt="MEMPCO Regular Savings Passbook"
              width={900}
              height={700}
              className="rs-product-img"
              priority
            />
          </div>

        </div>
      </section>

      {/* ══ 2. STATS BAR ═════════════════════════════════ */}
      <section className="rs-section rs-stats" aria-label="Key figures">
        <div className="rs-inner">
          <div className="rs-stats-grid">
            {stats.map((s) => (
              <div className="rs-stat" key={s.label}>
                <span className="rs-stat-value">
                  {s.value && !s.num && s.value}
                  {s.value && s.num && <><span>{s.value}</span> {s.num}</>}
                  {!s.value && s.num && s.num}
                </span>
                <span className="rs-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 3. DETAILS ═══════════════════════════════════ */}
      <section className="rs-section rs-details" aria-labelledby="rs-details-heading">
        <div className="rs-inner">
          <div className="rs-details-grid">

            {/* left — copy + feature list */}
            <div className="rs-details-copy">
              <p className="rs-details-kicker">The essentials</p>
              <h2 className="rs-details-title" id="rs-details-heading">
                Everything you need.<br />Nothing you don&apos;t.
              </h2>
              <p className="rs-details-body">
                The Regular Savings account is the foundation of your MEMPCO membership.
                Open with as little as <strong>Php 100.00</strong> and earn{' '}
                <strong>4% interest per annum</strong>, completely tax-free.
              </p>
              <p className="rs-details-body">
                It is straightforward by design — no complicated terms,
                no hidden fees, no lock-in periods.
              </p>

              <ul className="rs-feature-list">
                {features.map((f) => (
                  <li className="rs-feature-item" key={f.label}>
                    <div className="rs-feature-icon" aria-hidden="true">
                      {f.icon}
                    </div>
                    <div className="rs-feature-text">
                      <p className="rs-feature-name">{f.label}</p>
                      <p className="rs-feature-desc">{f.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* right — info cards */}
            <div className="rs-details-cards" aria-label="Product details">
              {cards.map((c) => (
                <div className="rs-detail-card" key={c.num}>
                  <p className="rs-detail-card-num">{c.num}</p>
                  <p className="rs-detail-card-title">{c.title}</p>
                  <p className="rs-detail-card-text">{c.text}</p>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ══ 4. WHY CHOOSE ════════════════════════════════ */}
      <section className="rs-section rs-why" aria-labelledby="rs-why-heading">
        <div className="rs-inner">
          <p className="rs-why-kicker">Why it matters</p>
          <h2 className="rs-why-title" id="rs-why-heading">
            Designed for real life.
          </h2>

          <div className="rs-why-grid">
            {whyCards.map((c) => (
              <div className="rs-why-card" key={c.num}>
                <p className="rs-why-card-num">{c.num}</p>
                <p className="rs-why-card-title">{c.title}</p>
                <p className="rs-why-card-text">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  )
}