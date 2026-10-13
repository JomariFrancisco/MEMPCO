import Image from 'next/image'
import './YouthandKids.css'
import '../ProductPage/ProductPage.css'
import ProductSupportSection from '../ProductPage/ProductSupportSection'

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

/* ─── component ────────────────────────────────────── */
export default function YouthandKids() {
  return (
    <div className="yk mem-product-page">

      {/* ══ 1. HERO ══════════════════════════════════════ */}
      <section className="yk-section yk-hero mem-product-hero" aria-labelledby="yk-heading">
        <div className="yk-inner mem-product-hero__inner">
          <div className="mem-product-hero__copy">

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
              Teach children to start saving early.<br />
              A simple account for young savers.
            </p>
          </div>

          {/* product image */}
          <div className="mem-product-hero__media">
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

        </div>
      </section>

      {/* ══ 2. STATS BAR ═════════════════════════════════ */}
      <section className="yk-section yk-stats mem-product-stats" aria-label="Key figures">
        <div className="yk-inner mem-product-stats__inner">
          <div className="yk-stats-grid mem-product-stats__grid mem-product-stats__grid--three">
            {stats.map((s) => (
              <div className="yk-stat mem-product-stats__item" key={s.label}>
                <span className="yk-stat-value mem-product-stats__value">{s.value}</span>
                <span className="yk-stat-label mem-product-stats__label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ProductSupportSection
        id="yk-support"
        kicker="Youth Savings"
        title={<>Small deposits. <em>Big futures.</em></>}
        description="Children of MEMPCO members can begin with a Php 50 membership fee and a Php 50 initial deposit, earn 3% interest per annum, and receive additional deposits from parents or guardians anytime."
        supportTitle="Questions about Youth Savings?"
        supportText="Visit a branch or contact our team for account-opening details and ways family members can contribute."
      />

    </div>
  )
}
