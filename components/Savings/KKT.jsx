import Image from 'next/image'
import './KKT.css'
import '../ProductPage/ProductPage.css'
import ProductSupportSection from '../ProductPage/ProductSupportSection'

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

/* ─── component ────────────────────────────────────── */
export default function KKT() {
  return (
    <div className="kkt mem-product-page">

      {/* ══ 1. HERO ══════════════════════════════════════ */}
      <section className="kkt-section kkt-hero mem-product-hero" aria-labelledby="kkt-heading">
        <div className="kkt-inner mem-product-hero__inner">
          <div className="mem-product-hero__copy">

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
          </div>

          {/* product image */}
          <div className="mem-product-hero__media">
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

        </div>
      </section>

      {/* ══ 2. STATS BAR ═════════════════════════════════ */}
      <section className="kkt-section kkt-stats mem-product-stats" aria-label="Key figures">
        <div className="kkt-inner mem-product-stats__inner">
          <div className="kkt-stats-grid mem-product-stats__grid mem-product-stats__grid--three">
            {stats.map((s) => (
              <div className="kkt-stat mem-product-stats__item" key={s.label}>
                <span className="kkt-stat-value mem-product-stats__value">{s.value}</span>
                <span className="kkt-stat-label mem-product-stats__label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ProductSupportSection
        id="kkt-support"
        kicker="KKT Special Savings"
        title={<>Savings built for <em>future plans.</em></>}
        description="KKT is designed for members who can set funds aside for at least two years. Deposits may reach Php 5,000,000; MEMPCO explains the applicable calculation method when the account is opened."
        supportTitle="Questions about KKT?"
        supportText="Visit a branch or contact our team to review the calculation method, account terms, and current requirements."
      />

    </div>
  )
}
