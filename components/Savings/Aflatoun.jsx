import Image from 'next/image'
import './Aflatoun.css'
import '../ProductPage/ProductPage.css'
import ProductSupportSection from '../ProductPage/ProductSupportSection'

/* ─── data ─────────────────────────────────────────── */
const stats = [
  {
    value: 'Php 50',
    label: 'Minimum opening deposit',
  },
  {
    value: '3%',
    label: 'Interest per annum',
  },
  {
    value: 'FREE',
    label: 'Membership — no cost to join',
  },
]

const pillars = [
  { num: '01', name: 'Personal Exploration' },
  { num: '02', name: 'Rights and Responsibilities' },
  { num: '03', name: 'Saving and Spending' },
  { num: '04', name: 'Planning and Budgeting' },
  { num: '05', name: 'Social & Financial Enterprise' },
]

/* ─── component ────────────────────────────────────── */
export default function Aflatoun() {
  return (
    <div className="af mem-product-page">

      {/* ══ 1. HERO ══════════════════════════════════════ */}
      <section className="af-section af-hero mem-product-hero" aria-labelledby="af-heading">
        <div className="af-inner mem-product-hero__inner">
          <div className="mem-product-hero__copy">

            {/* breadcrumb */}
            <nav className="af-breadcrumb" aria-label="Breadcrumb">
              <span>Services</span>
              <span className="af-breadcrumb-sep">/</span>
              <span>Savings</span>
              <span className="af-breadcrumb-sep">/</span>
              <span className="af-breadcrumb-active">Aflatoun Savings</span>
            </nav>

            {/* headline */}
            <span className="af-eyebrow">MEMPCO Savings Program</span>
            <h1 className="af-hero-title" id="af-heading">Aflatoun Savings.</h1>
            <p className="af-hero-tagline">
              Teach children to start saving early.<br />
              Simple deposits and financial learning, together.
            </p>
          </div>

          {/* product image */}
          <div className="mem-product-hero__media">
            <div className="af-product-stage">
              <Image
                src="/Savings/AflatounPassbook.png"
                alt="MEMPCO Aflatoun Savings Passbook"
                width={900}
                height={700}
                className="af-product-img"
                priority
              />
            </div>
          </div>

        </div>
      </section>

      {/* ══ 2. STATS BAR ═════════════════════════════════ */}
      <section className="af-section af-stats mem-product-stats" aria-label="Key figures">
        <div className="af-inner mem-product-stats__inner">
          <div className="af-stats-grid mem-product-stats__grid mem-product-stats__grid--three">
            {stats.map((s) => (
              <div className="af-stat mem-product-stats__item" key={s.label}>
                <span className="af-stat-value mem-product-stats__value">{s.value}</span>
                <span className="af-stat-label mem-product-stats__label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ProductSupportSection
        id="af-support"
        kicker="Aflatoun Savings"
        title={<>Save money. <em>Learn life.</em></>}
        description="Aflatoun combines a child-friendly savings account with social and financial education, delivered by MEMPCO with NATCCO and DepEd-selected schools. Children can start with a Php 50 deposit, free membership, and earn 3% interest per annum."
        supportTitle="Questions about Aflatoun Savings?"
        supportText="Visit a branch or contact our team for account-opening details, school participation, and current terms."
      />

      {/* ══ 4. FIVE CORE ELEMENTS ════════════════════════ */}
      <section className="af-section af-pillars" aria-labelledby="af-pillars-heading">
        <div className="af-inner">
          <p className="af-pillars-kicker">The curriculum</p>
          <h2 className="af-pillars-title" id="af-pillars-heading">
            Five core elements.
          </h2>
          <p className="af-pillars-sub">
            Aflatoun&apos;s structured curriculum teaches children to understand
            themselves, their rights, and how to manage money wisely.
          </p>

          <div className="af-pillars-grid">
            {pillars.map((p) => (
              <div className="af-pillar-card" key={p.num}>
                <span className="af-pillar-num">{p.num}</span>
                <span className="af-pillar-name">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  )
}
