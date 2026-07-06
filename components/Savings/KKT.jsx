import Image from 'next/image'
import './KKT.css'

/* ─── data ─────────────────────────────────────────── */
const stats = [
  {
    value: '2 years',
    label: 'Minimum locked-in period',
  },
  {
    value: 'Php 5M',
    label: 'Maximum deposit allowed',
    accent: true,
  },
  {
    value: 'Guided',
    label: 'Calculation method applies',
  },
]

const features = [
  {
    label: 'Minimum two-year lock-in',
    desc:  'KKT is designed for members who can keep funds placed for at least two years.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
        <polyline points="17 6 23 6 23 12"/>
      </svg>
    ),
  },
  {
    label: 'Calculation method applies',
    desc:  'Returns follow the product calculation method used by MEMPCO for this special savings account.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
  },
  {
    label: 'Maximum deposit of Php 5M',
    desc:  'Members can place up to Php 5,000,000 for bigger long-term savings goals.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10"/>
        <line x1="2" y1="12" x2="22" y2="12"/>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
    ),
  },
]

const cards = [
  {
    num:   '01',
    title: 'Lock-in period',
    text:  'KKT Special Savings has a minimum locked-in period of two years, making it better suited for long-term goals.',
  },
  {
    num:   '02',
    title: 'Deposit limit',
    text:  'Members may deposit up to Php 5,000,000 into a KKT account, depending on product guidelines and branch confirmation.',
  },
  {
    num:   '03',
    title: 'Calculation',
    text:  'The applicable calculation method is explained by MEMPCO during account opening so members understand the placement terms.',
  },
]

const whyCards = [
  {
    num:   '01',
    title: 'Protect what you worked for',
    text:  'Your sacrifices deserve a savings program that works as hard as you do. KKT gives your income a safe, growing home.',
  },
  {
    num:   '02',
    title: 'Build real, long-term wealth',
    text:  'With a two-year lock-in and a Php 5M maximum deposit, KKT is built for members planning beyond short-term savings.',
  },
  {
    num:   '03',
    title: 'Trust the cooperative',
    text:  'MEMPCO is built by members, for members. Your money stays in the community and grows with it.',
  },
]

/* ─── component ────────────────────────────────────── */
export default function KKT() {
  return (
    <div className="kkt">

      {/* ══ 1. HERO ══════════════════════════════════════ */}
      <section className="kkt-section kkt-hero" aria-labelledby="kkt-heading">
        <div className="kkt-inner">

          {/* breadcrumb */}
          <nav className="kkt-breadcrumb" aria-label="Breadcrumb">
            <span>Services</span>
            <span className="kkt-breadcrumb-sep">/</span>
            <span>Savings</span>
            <span className="kkt-breadcrumb-sep">/</span>
            <span className="kkt-breadcrumb-active">KKT Special Savings</span>
          </nav>

          {/* headline */}
          <span className="kkt-eyebrow">MEMPCO Savings Program</span>
          <h1 className="kkt-hero-title" id="kkt-heading">
            Kinabukasan <em>Ko To.</em>
          </h1>
          <p className="kkt-hero-subtitle">
            KKT Special Savings
          </p>
          <p className="kkt-hero-tagline">
            An easy way to save for the future.<br />
            Built for members with long-term savings goals.
          </p>

          {/* product image */}
          <div className="kkt-product-stage">
            <Image
              src="/Savings/KKTPassbook.png"
              alt="MEMPCO KKT Special Savings Passbook"
              width={900}
              height={700}
              className="kkt-product-img"
              priority
            />
          </div>

        </div>
      </section>

      {/* ══ 2. STATS BAR ═════════════════════════════════ */}
      <section className="kkt-section kkt-stats" aria-label="Key figures">
        <div className="kkt-inner">
          <div className="kkt-stats-grid">
            {stats.map((s) => (
              <div className="kkt-stat" key={s.label}>
                <span className="kkt-stat-value">{s.value}</span>
                <span className="kkt-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 3. DETAILS ═══════════════════════════════════ */}
      <section className="kkt-section kkt-details" aria-labelledby="kkt-details-heading">
        <div className="kkt-inner">
          <div className="kkt-details-grid">

            {/* left — copy + features */}
            <div>
              <p className="kkt-details-kicker">The program</p>
              <h2 className="kkt-details-title" id="kkt-details-heading">
                Savings built for<br /><em>future plans.</em>
              </h2>
              <p className="kkt-details-body">
                KKT Special Savings is designed for members who want to build
                money for the future through a longer-term savings commitment.
              </p>
              <p className="kkt-details-body">
                Funds are placed for a <strong>minimum of two years</strong>,
                with a maximum deposit of <strong>Php 5,000,000</strong> and
                a product calculation method explained during account opening.
              </p>

              <ul className="kkt-feature-list">
                {features.map((f) => (
                  <li className="kkt-feature-item" key={f.label}>
                    <div className="kkt-feature-icon" aria-hidden="true">
                      {f.icon}
                    </div>
                    <div>
                      <p className="kkt-feature-name">{f.label}</p>
                      <p className="kkt-feature-desc">{f.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* right — stacked info cards */}
            <div className="kkt-detail-cards" aria-label="Program details">
              {cards.map((c) => (
                <div className="kkt-detail-card" key={c.num}>
                  <p className="kkt-detail-card-num">{c.num}</p>
                  <p className="kkt-detail-card-title">{c.title}</p>
                  <p className="kkt-detail-card-text">{c.text}</p>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ══ 4. LONG-TERM SAVINGS CALLOUT ═══════════════════════════════ */}
      <section className="kkt-section kkt-callout" aria-label="Message for long-term savers">
        <div className="kkt-inner">
          <p className="kkt-callout-kicker">For long-term savers</p>
          <blockquote className="kkt-callout-quote">
            &ldquo;Future plans need money that is protected, separated, and
            allowed to grow through steady saving discipline.&rdquo;
          </blockquote>
          <p className="kkt-callout-sub">
            MEMPCO&apos;s KKT Special Savings helps members set aside funds for
            goals that need patience and commitment.
          </p>
        </div>
      </section>

      {/* ══ 5. WHY CHOOSE ════════════════════════════════ */}
      <section className="kkt-section kkt-why" aria-labelledby="kkt-why-heading">
        <div className="kkt-inner">
          <p className="kkt-why-kicker">Why KKT</p>
          <h2 className="kkt-why-title" id="kkt-why-heading">
            Your future, <em>secured.</em>
          </h2>

          <div className="kkt-why-grid">
            {whyCards.map((c) => (
              <div className="kkt-why-card" key={c.num}>
                <p className="kkt-why-card-num">{c.num}</p>
                <p className="kkt-why-card-title">{c.title}</p>
                <p className="kkt-why-card-text">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  )
}
