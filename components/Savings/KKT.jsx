import Image from 'next/image'
import './KKT.css'

/* ─── data ─────────────────────────────────────────── */
const stats = [
  {
    value: '4.5% – 7%',
    label: 'Interest per annum, tax-free',
  },
  {
    value: 'Php 5M',
    label: 'Maximum deposit allowed',
    accent: true,
  },
  {
    value: 'OFW & Families',
    label: 'Exclusively designed for overseas Filipinos',
  },
]

const features = [
  {
    label: 'Higher interest rates',
    desc:  'Earn between 4.5% and 7% per annum — significantly stronger returns than a regular savings account.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
        <polyline points="17 6 23 6 23 12"/>
      </svg>
    ),
  },
  {
    label: 'Zero tax on earnings',
    desc:  'Every peso of interest is yours — no withholding tax, no deductions.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
  },
  {
    label: 'Built for overseas Filipinos',
    desc:  'Designed specifically for OFWs and their families — people who sacrifice the most deserve savings that work hardest.',
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
    title: 'Interest tiers',
    text:  'The KKT program offers tiered interest ranging from 4.5% up to 7% per annum depending on your deposit amount — the more you save, the more you earn.',
  },
  {
    num:   '02',
    title: 'Deposit limit',
    text:  'You may deposit up to Php 5,000,000 into your KKT account, making it ideal for OFWs building long-term wealth from abroad.',
  },
  {
    num:   '03',
    title: 'Who can open',
    text:  'This program is open to Overseas Filipinos and their immediate family members who are MEMPCO members.',
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
    text:  'With rates up to 7% per annum and a Php 5M ceiling, this is a genuine wealth-building vehicle — not just a deposit account.',
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
            <span className="kkt-breadcrumb-active">KKT Wealth Building Savings</span>
          </nav>

          {/* headline */}
          <span className="kkt-eyebrow">MEMPCO Savings Program</span>
          <h1 className="kkt-hero-title" id="kkt-heading">
            Kinabukasan Ko &lsquo;To.
          </h1>
          <p className="kkt-hero-subtitle">
            KKT Wealth Building Savings
          </p>
          <p className="kkt-hero-tagline">
            For every Filipino who left home to build a better future.<br />
            Your sacrifice deserves savings that grow with you.
          </p>

          {/* product image */}
          <div className="kkt-product-stage">
            <Image
              src="/Savings/KKTPassbook.png"
              alt="MEMPCO KKT Wealth Building Savings Passbook"
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
                Savings built for<br />the sacrifices you make.
              </h2>
              <p className="kkt-details-body">
                The KKT Wealth Building Savings Program is designed for{' '}
                <strong>Overseas Filipinos and OF Families</strong> — people
                who give up time with loved ones to secure a better tomorrow.
              </p>
              <p className="kkt-details-body">
                Earn <strong>4.5% to 7% interest per annum</strong>, completely
                tax-free, on deposits of up to{' '}
                <strong>Php 5,000,000</strong>.
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

      {/* ══ 4. OFW CALLOUT ═══════════════════════════════ */}
      <section className="kkt-section kkt-callout" aria-label="Message for OFWs">
        <div className="kkt-inner">
          <p className="kkt-callout-kicker">Para sa mga OFW</p>
          <blockquote className="kkt-callout-quote">
            &ldquo;Pinaghirapan ninyo ang kita ninyo. Luha at dugo ang ipinuhunan.
            Pahalagahan ang kita at magtira para sa sarili.&rdquo;
          </blockquote>
          <p className="kkt-callout-sub">
            MEMPCO&apos;s KKT program exists to honor that sacrifice — by making
            sure every peso you send home works as hard as you do.
          </p>
        </div>
      </section>

      {/* ══ 5. WHY CHOOSE ════════════════════════════════ */}
      <section className="kkt-section kkt-why" aria-labelledby="kkt-why-heading">
        <div className="kkt-inner">
          <p className="kkt-why-kicker">Why KKT</p>
          <h2 className="kkt-why-title" id="kkt-why-heading">
            Your future, secured.
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