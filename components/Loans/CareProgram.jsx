import './CareProgram.css';
import '../ProductPage/ProductPage.css';
import ProductSupportSection from '../ProductPage/ProductSupportSection';

const features = [
  {
    title: 'Character-Based Lending',
    text: 'Focuses on trust, integrity, and repayment behavior rather than collateral.',
  },
  {
    title: 'Progressive Loan Access',
    text: 'Loan amounts increase based on good repayment performance over time.',
  },
  {
    title: 'Flexible Repayment Terms',
    text: 'Designed to match the cash flow of micro-enterprises.',
  },
  {
    title: 'Group Support System',
    text: 'Encourages accountability through center-based or group lending.',
  },
  {
    title: 'Integrated Savings Component',
    text: 'Promotes financial discipline and security alongside borrowing.',
  },
  {
    title: 'Capacity-Building Support',
    text: 'Includes financial education and business development sessions.',
  },
  {
    title: 'Regular Monitoring & Guidance',
    text: 'Ensures proper utilization of funds and provides continuous member support.',
  },
];

const stats = [
  { value: '2.75%', label: 'Interest per month' },
  { value: 'Php 4K', label: 'Minimum loan amount' },
  { value: 'Php 200K', label: 'Maximum loan amount' },
  { value: '4-12 mos', label: 'Repayment term' },
];

export default function CareProgram() {
  return (
    <div className="cp mem-product-page">
      {/* HERO */}
      <section className="cp-section cp-hero mem-product-hero" aria-labelledby="cp-heading">
        <div className="cp-inner mem-product-hero__inner">
          <div className="mem-product-hero__copy">
            <nav className="cp-breadcrumb" aria-label="Breadcrumb">
              <span>Services</span>
              <span className="cp-breadcrumb-sep">/</span>
              <span>Loans</span>
              <span className="cp-breadcrumb-sep">/</span>
              <span className="cp-breadcrumb-active">CARE Program</span>
            </nav>

            <span className="cp-eyebrow">MEMPCO Flagship Initiative</span>

            <h1 className="cp-hero-title" id="cp-heading">
              CARE Program.<br />
              <span className="accent">Helping members move forward.</span>
            </h1>

            <p className="cp-hero-tagline">
              MEMPCO&apos;s CARE Program gives members a clear loan facility for
              practical financing needs, with transparent amount limits, repayment
              terms, and service fees.
            </p>
          </div>

          <div className="mem-product-hero__media">
            <div className="cp-hero-badge-row">
              <span className="cp-hero-badge">2.75% Monthly Interest</span>
              <span className="cp-hero-badge">Php 4K Minimum</span>
              <span className="cp-hero-badge">Up to Php 200K</span>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="cp-section cp-stats mem-product-stats" aria-label="Key figures">
        <div className="cp-inner mem-product-stats__inner">
          <div className="cp-stats-grid mem-product-stats__grid mem-product-stats__grid--four">
            {stats.map((item) => (
              <div className="cp-stat mem-product-stats__item" key={item.label}>
                <span className="cp-stat-value mem-product-stats__value">{item.value}</span>
                <span className="cp-stat-label mem-product-stats__label">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CARE LOAN FACILITY */}
      <section className="cp-section cp-facility" aria-labelledby="cp-facility-heading">
        <div className="cp-inner">
          <div className="cp-facility-header">
            <div>
              <p className="cp-section-kicker">Loan facility</p>
              <h2 className="cp-section-title" id="cp-facility-heading">
                CARE Loan Facility
              </h2>
            </div>
            <p className="cp-section-text">
              Accessible funding with clear loan limits and repayment terms.
              Members can review the amount, term, interest, and service fee
              before applying.
            </p>
          </div>

          {/* Loan amount card */}
          <div className="cp-amount-card">
            <div className="cp-amount-topbar" />
            <div className="cp-amount-body">
              <div className="cp-amount-copy">
                <span className="cp-amount-abbr">CARE</span>
                <h3 className="cp-amount-name">CARE Loan Facility</h3>
                <p className="cp-amount-desc">
                  A practical loan facility with 2.75% monthly interest, a 4%
                  service fee, and repayment terms from 4 to 12 months.
                </p>
              </div>
              <div className="cp-amount-highlight">
                <span className="cp-amount-label">Loan Amount</span>
                <span className="cp-amount-value">Php 4,000 - Php 200,000</span>
                <span className="cp-amount-sub">
                  2.75% monthly interest<br />4% service fee
                </span>
              </div>
            </div>
          </div>

          {/* Key features grid */}
          <div className="cp-features-wrap">
            <p className="cp-features-label">Key Features</p>
            <div className="cp-features-grid">
              {features.map((feature, i) => (
                <div className="cp-feature-card" key={feature.title}>
                  <span className="cp-feature-num">0{i + 1}</span>
                  <h3 className="cp-feature-title">{feature.title}</h3>
                  <p className="cp-feature-text">{feature.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <ProductSupportSection
        id="cp-support"
        kicker="CARE Loan Facility"
        title={<>Confirm your <em>loan terms.</em></>}
        description="The facility offers Php 4,000 to Php 200,000, 2.75% monthly interest, a 4% service fee, and 4 to 12 months to pay. Final approval and eligibility depend on borrower assessment."
        supportTitle="Questions about CARE?"
        supportText="Contact MEMPCO for current requirements, application review, and final loan terms."
      />
    </div>
  );
}
