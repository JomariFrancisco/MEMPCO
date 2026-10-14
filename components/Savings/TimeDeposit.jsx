import Image from 'next/image'
import './TimeDeposit.css'
import '../ProductPage/ProductPage.css'
import ProductSupportSection from '../ProductPage/ProductSupportSection'

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

/* ─── component ────────────────────────────────────── */
export default function TimeDeposit() {
  return (
    <div className="td mem-product-page">

      {/* ══ 1. HERO ══════════════════════════════════════ */}
      <section className="td-section td-hero mem-product-hero" aria-labelledby="td-heading">
        <div className="td-inner mem-product-hero__inner">
          <div className="mem-product-hero__copy">

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
          </div>

          {/* product image */}
          <div className="mem-product-hero__media">
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

        </div>
      </section>

      {/* ══ 2. STATS BAR ═════════════════════════════════ */}
      <section className="td-section td-stats mem-product-stats" aria-label="Key figures">
        <div className="td-inner mem-product-stats__inner">
          <div className="td-stats-grid mem-product-stats__grid mem-product-stats__grid--three">
            {stats.map((s) => (
              <div className="td-stat mem-product-stats__item" key={s.label}>
                <span className="td-stat-value mem-product-stats__value">{s.value}</span>
                <span className="td-stat-label mem-product-stats__label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ProductSupportSection
        id="td-support"
        kicker="Time Deposit"
        title={<>Your money, working <em>while you wait.</em></>}
        description="Place funds for a fixed term and earn 4.10% to 6.75% interest per annum. Choose from 30, 60, 90, 120, or 180 days, or one year, with a Php 5,000 minimum placement."
        supportTitle="Questions about Time Deposit?"
        supportText="Visit a branch or contact our team to compare available terms and confirm the current rate for your placement."
      />

    </div>
  )
}
