'use client';

import { useState } from 'react';
import './BusinessLoan.css';

const categories = [
  {
    id: 'business-loan-programs',
    kicker: 'Business loan programs',
    title: 'Business financing options for different member needs.',
    text:
      'Explore MEMPCO business loan products designed for individual entrepreneurs, community-based groups, existing depositors, and tricycle driver-operators.',
    products: [
      {
        id: 'individual-business-loan',
        abbr: 'IBL',
        name: 'Individual Business Loan',
        summary:
          'A high-capacity business financing option for members who need strong support for expansion, working capital, and long-term livelihood growth.',
        tone: '#DC2626',
        toneSoft: 'rgba(220, 38, 38, 0.10)',
        premiumLabel: 'Loan Ceiling',
        premium: 'Up to Php 5,000,000',
        period: 'business financing program',
        columns: ['Details'],
        rows: [
          { label: 'Interest Rate', values: ['1.50% to 3% per month'] },
          { label: 'Loan Amount', values: ['Php 50,000 minimum; Php 5,000,000 maximum'] },
          { label: 'Term', values: ['Flexible terms from 6 months up to 3 years'] },
          { label: 'Service Fee', values: ['4% service fee'] },
          {
            label: 'Eligibility',
            values: [
              'Must qualify with MEMPCO general lending policies; borrower must have capacity, expertise, commitment, good character, reliable payment history, good health, and willingness to pay 5% CBU included in amortization.',
            ],
          },
          {
            label: 'Requirements',
            values: [
              'Two valid photo-bearing IDs, two 2x2 photos, Business Permit/Registration, Trade Name or DTI Permit, Barangay Clearance, and Business Proposal/Feasibility Study if available.',
            ],
          },
        ],
      },
      {
        id: 'group-business-loan',
        abbr: 'GBL',
        name: 'Group Business Loan',
        summary:
          'Designed for groups of entrepreneurs within the same area who need accessible capital and a faster credibility-based evaluation process.',
        tone: '#4F6BED',
        toneSoft: 'rgba(79, 107, 237, 0.10)',
        premiumLabel: 'Loan Range',
        premium: 'Php 30,000 - Php 100,000',
        period: 'community-based financing',
        columns: ['Details'],
        rows: [
          { label: 'Interest Rate', values: ['1.50% to 3% per month'] },
          { label: 'Loan Amount', values: ['Php 30,000 minimum; Php 100,000 maximum'] },
          { label: 'Term', values: ['6 to 12 months to pay'] },
          { label: 'Service Fee', values: ['4% service fee'] },
          { label: 'Repayment', values: ['Weekly, semi-monthly, or monthly'] },
          {
            label: 'Overview',
            values: [
              'For a group of entrepreneurs in one area with common capitalization needs; group members help vouch for each other, helping speed up the CIBI process and reduce requirements compared with individual business loans.',
            ],
          },
          {
            label: 'Eligibility',
            values: [
              'Must be MIGS, Filipino, at least 18 years old and not more than 69 years old upon maturity, entrepreneur for at least 1 year, willing to form a group, and with at least 1 co-maker.',
            ],
          },
          {
            label: 'Requirements',
            values: ['Completed and signed application form plus two valid government-issued photo IDs.'],
          },
        ],
      },
      {
        id: 'back-to-back-loan',
        abbr: 'BTB',
        name: 'Back to Back Loan',
        summary:
          'A straightforward borrowing option for existing depositors who want to access business funds while leveraging their deposit relationship with MEMPCO.',
        tone: '#36A52E',
        toneSoft: 'rgba(54, 165, 46, 0.12)',
        premiumLabel: 'Loan Ceiling',
        premium: 'Up to Php 1,000,000',
        period: 'for existing depositors',
        columns: ['Details'],
        rows: [
          { label: 'Borrower Type', values: ['For existing depositors'] },
          { label: 'Interest Rate', values: ['0.83% to 1% per month'] },
          { label: 'Loan Amount', values: ['Php 5,000 minimum; Php 1,000,000 maximum'] },
          { label: 'Service Fee', values: ['2% service fee'] },
        ],
      },
      {
        id: 'ec-tricycle-loan',
        abbr: 'ECTL',
        name: 'EC Tricycle Loan',
        summary:
          'Made for qualified tricycle driver-operators who need financing for unit acquisition, sidecar improvement, or franchise-related needs.',
        tone: '#E39A18',
        toneSoft: 'rgba(227, 154, 24, 0.12)',
        premiumLabel: 'Loan Range',
        premium: 'Up to Php 200,000 per unit',
        period: 'transport livelihood financing',
        columns: ['Details'],
        rows: [
          { label: 'Interest Rate', values: ['15% interest rate per annum'] },
          { label: 'Loan Amount', values: ['Maximum of Php 200,000 per unit'] },
          { label: 'Term', values: ['Up to 5 years'] },
          { label: 'Service Fee', values: ['1% service fee'] },
          { label: 'Repayment', values: ['Daily payment, Monday to Friday only'] },
          { label: 'Savings Component', values: ['Included'] },
          {
            label: 'Loan Purpose',
            values: [
              'Acquisition of tricycle unit, acquisition or repair of sidecar, and acquisition of franchise.',
            ],
          },
          {
            label: 'Eligibility',
            values: [
              'Must be MIGS, Filipino, at least 18 years old and not more than 69 years old upon maturity, a tricycle driver-operator of Zamboanga City with active franchise, and with at least 1 co-maker.',
            ],
          },
          {
            label: 'Requirements',
            values: [
              'Completed and signed application form, two valid government-issued photo IDs, Active Franchise Certificate, OR and CR, Price Quotation, and Bill of Materials or Job Order if with sidecar repair.',
            ],
          },
        ],
      },
    ],
  },
];

const stats = [
  { value: '4', label: 'Business loan programs' },
  { value: 'Php 5K', label: 'Lowest starting loan shown' },
  { value: 'Php 5M', label: 'Highest loan ceiling shown' },
  { value: 'Up to 5 yrs', label: 'Longest term shown' },
];

const quickGuide = [
  {
    title: 'Individual Business Loan',
    text: 'For members who need larger financing for expansion, working capital, and long-term business growth.',
  },
  {
    title: 'Group Business Loan',
    text: 'For entrepreneurs borrowing as a group with simpler evaluation and shared accountability.',
  },
  {
    title: 'Back to Back Loan',
    text: 'For existing depositors who want to borrow while leveraging their savings relationship.',
  },
  {
    title: 'EC Tricycle Loan',
    text: 'For qualified driver-operators needing support for units, sidecars, or franchise-related expenses.',
  },
];

function LoanTable({ product, isOpen, onToggle }) {
  return (
    <article
      id={product.id}
      className={`bl-product-card bl-product-card--dropdown ${isOpen ? 'is-open' : ''}`}
      style={{
        '--accent': product.tone,
        '--accent-soft': product.toneSoft,
      }}
      aria-label={`${product.name} loan product`}
    >
      <button
        id={`bl-product-header-${product.id}`}
        className="bl-product-row bl-product-toggle"
        type="button"
        aria-expanded={isOpen}
        aria-controls={`bl-product-body-${product.id}`}
        onClick={onToggle}
      >
        <span className="bl-product-dot" aria-hidden="true" />
        <span className="bl-product-abbr">{product.abbr}</span>
        <h3 className="bl-product-name">{product.name}</h3>
        <span className="bl-product-chevron" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>

      <div
        id={`bl-product-body-${product.id}`}
        className="bl-product-body"
        role="region"
        aria-labelledby={`bl-product-header-${product.id}`}
      >
        <div className="bl-product-body-inner">
          <div className="bl-product-detail-head">
            <p className="bl-product-summary">{product.summary}</p>
            <div className="bl-product-premium">
              <span className="bl-product-premium-label">{product.premiumLabel}</span>
              <span className="bl-product-premium-value">{product.premium}</span>
              <span className="bl-product-premium-period">{product.period}</span>
            </div>
          </div>

          <div className="bl-product-table-wrap">
            <table className="bl-product-table">
              <thead>
                <tr>
                  <th>Item</th>
                  {product.columns.map((column, columnIndex) => (
                    <th key={`${product.id}-col-${columnIndex}`}>{column}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {product.rows.map((row, rowIndex) => (
                  <tr
                    key={`${product.id}-row-${rowIndex}`}
                    className={row.highlight ? 'is-highlight' : undefined}
                  >
                    <td>{row.label}</td>
                    {product.columns.map((_, valueIndex) => (
                      <td key={`${product.id}-cell-${rowIndex}-${valueIndex}`}>
                        {row.values[valueIndex] || '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function BusinessLoan() {
  const [openProductId, setOpenProductId] = useState(null);

  const toggleProduct = (id) => {
    setOpenProductId((currentId) => (currentId === id ? null : id));
  };

  return (
    <div className="bl">
      <section className="bl-section bl-hero" aria-labelledby="bl-heading">
        <div className="bl-inner">
          <nav className="bl-breadcrumb" aria-label="Breadcrumb">
            <span>Services</span>
            <span className="bl-breadcrumb-sep">/</span>
            <span>Loans</span>
            <span className="bl-breadcrumb-sep">/</span>
            <span className="bl-breadcrumb-active">Business Loan</span>
          </nav>

          <span className="bl-eyebrow">MEMPCO Loan Program</span>

          <h1 className="bl-hero-title" id="bl-heading">
            Business Loan.<br />
            <span className="accent">For growth.</span>
          </h1>

          <p className="bl-hero-tagline">
            MEMPCO business loan options designed for entrepreneurs, groups,
            depositors, and driver-operators who need practical financing for
            livelihood, expansion, and income-generating activities.
          </p>

          <div className="bl-hero-chips">
            {categories[0].products.map((product) => (
              <a href={`#${product.id}`} className="bl-hero-chip" key={product.id}>
                <span className="bl-hero-chip-kicker">{product.abbr}</span>
                <span className="bl-hero-chip-title">{product.name}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="bl-section bl-stats" aria-label="Key figures">
        <div className="bl-inner">
          <div className="bl-stats-grid">
            {stats.map((item) => (
              <div className="bl-stat" key={item.label}>
                <span className="bl-stat-value">{item.value}</span>
                <span className="bl-stat-label">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bl-section bl-overview" aria-labelledby="bl-overview-heading">
        <div className="bl-inner">
          <p className="bl-section-kicker">Loan portfolio</p>
          <h2 className="bl-section-title" id="bl-overview-heading">
            Structured by <em>borrower type.</em>
          </h2>
          <p className="bl-section-text">
            This layout presents the Business Loan page as a clean product catalog
            so each loan option is easier to compare, explain, and update later.
          </p>

          <div className="bl-overview-grid">
            {quickGuide.map((item) => (
              <div className="bl-overview-card" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {categories.map((category) => (
        <section
          key={category.id}
          id={category.id}
          className="bl-section bl-category"
          aria-labelledby={`${category.id}-heading`}
        >
          <div className="bl-inner">
            <div className="bl-category-header">
              <h2 className="bl-section-title" id={`${category.id}-heading`}>
                {category.title}
              </h2>
              <p className="bl-section-text">{category.text}</p>
            </div>

            <div className="bl-products-stack">
              {category.products.map((product) => (
                <LoanTable
                  key={product.id}
                  product={product}
                  isOpen={openProductId === product.id}
                  onToggle={() => toggleProduct(product.id)}
                />
              ))}
            </div>
          </div>
        </section>
      ))}

    </div>
  );
}
