import './CareProgram.css';

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
  { value: '₱200K', label: 'Maximum loan amount' },
  { value: '7', label: 'Key program features' },
  { value: 'Group', label: 'Lending support model' },
  { value: 'Character', label: 'Basis for lending' },
];

export default function CareProgram() {
  return (
    <div className="cp">
      {/* HERO */}
      <section className="cp-section cp-hero" aria-labelledby="cp-heading">
        <div className="cp-inner">
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
            <span className="accent">Helping Help Themselves.</span>
          </h1>

          <p className="cp-hero-tagline">
            MEMPCO&apos;s flagship initiative designed to empower micro-entrepreneurs
            by providing access to sustainable and responsible financing. Supporting
            members in building resilient livelihoods, strengthening businesses, and
            improving quality of life.
          </p>

          <div className="cp-hero-badge-row">
            <span className="cp-hero-badge">Micro-Entrepreneur Focused</span>
            <span className="cp-hero-badge">Character-Based Financing</span>
            <span className="cp-hero-badge">Up to ₱200,000</span>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="cp-section cp-stats" aria-label="Key figures">
        <div className="cp-inner">
          <div className="cp-stats-grid">
            {stats.map((item) => (
              <div className="cp-stat" key={item.label}>
                <span className="cp-stat-value">{item.value}</span>
                <span className="cp-stat-label">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT THE PROGRAM */}
      <section className="cp-section cp-about" aria-labelledby="cp-about-heading">
        <div className="cp-inner">
          <p className="cp-section-kicker">About the program</p>
          <h2 className="cp-section-title" id="cp-about-heading">
            Anchored on empowering micro-entrepreneurs.
          </h2>
          <p className="cp-section-text">
            The CARE Program supports members in building resilient livelihoods through
            sustainable, responsible financing. At its core is the CARE Loan Facility — a
            character-based financing solution tailored to meet the needs of small and
            growing enterprises.
          </p>
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
              Accessible and flexible funding to help members start, sustain, or expand
              their businesses. Promotes responsible borrowing through a structured
              approach that combines financial support with discipline and capacity
              development.
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
                  A character-based financing solution tailored to meet the needs of
                  small and growing enterprises. Members not only access capital but also
                  develop the discipline, skills, and confidence for long-term financial
                  independence.
                </p>
              </div>
              <div className="cp-amount-highlight">
                <span className="cp-amount-label">Loan Amount</span>
                <span className="cp-amount-value">Up to ₱200,000</span>
                <span className="cp-amount-sub">
                  Based on capacity, repayment performance,<br />and business needs
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

      {/* NOTE / CTA */}
      <section className="cp-section cp-note" aria-labelledby="cp-note-heading">
        <div className="cp-inner">
          <div className="cp-note-inner">
            <p className="cp-note-kicker">Apply with MEMPCO</p>
            <h2 className="cp-note-title" id="cp-note-heading">
              Ready to build your livelihood<br />with the CARE Program?
            </h2>
            <p className="cp-note-text">
              For updated requirements, application review, and final loan terms,
              coordinate directly with MEMPCO. Final approval and eligibility evaluation
              may vary depending on borrower profile and loan assessment.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
