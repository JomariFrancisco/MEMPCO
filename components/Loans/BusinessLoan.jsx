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
        premium: 'Up to ₱5,000,000',
        period: 'business financing program',
        columns: ['Details'],
        rows: [
          { label: 'Interest Rate', values: ['2%–4%'] },
          { label: 'Term', values: ['Up to 3 years to pay'] },
          { label: 'Loan Amount', values: ['Maximum of ₱5,000,000'] },
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
        premium: '₱3,000 – ₱50,000',
        period: 'community-based financing',
        columns: ['Details'],
        rows: [
          { label: 'Interest Rate', values: ['4% per month based on diminishing principal balance'] },
          { label: 'Term', values: ['3 months to 12 months'] },
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
        premium: 'Up to ₱2,000,000',
        period: 'for existing depositors',
        columns: ['Details'],
        rows: [
          { label: 'Borrower Type', values: ['For existing depositors'] },
          { label: 'Interest Rate', values: ['1.5% per month'] },
          { label: 'Loan Amount', values: ['Maximum of ₱2,000,000'] },
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
        premium: '₱20,000 – ₱250,000',
        period: 'transport livelihood financing',
        columns: ['Details'],
        rows: [
          { label: 'Interest Rate', values: ['1.25% per month'] },
          { label: 'Term', values: ['1 to 5 years'] },
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
  { value: '₱3K', label: 'Lowest starting loan shown' },
  { value: '₱5M', label: 'Highest loan ceiling shown' },
  { value: '1–5 yrs', label: 'Longest term shown' },
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

function LoanTable({ product }) {
  return (
    <article
      id={product.id}
      className="bl-product-card"
      style={{
        '--accent': product.tone,
        '--accent-soft': product.toneSoft,
      }}
    >
      <div className="bl-product-topbar" />

      <div className="bl-product-header">
        <div className="bl-product-copy">
          <div className="bl-product-meta">
            <span className="bl-product-abbr">{product.abbr}</span>
            <span className="bl-product-pill">{product.summary}</span>
          </div>

          <h3 className="bl-product-name">{product.name}</h3>
        </div>

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
                {row.values.map((value, valueIndex) => (
                  <td key={`${product.id}-cell-${rowIndex}-${valueIndex}`}>
                    {value || '\u00A0'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

export default function BusinessLoan() {
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
              <div>
                <p className="bl-section-kicker">{category.kicker}</p>
                <h2 className="bl-section-title" id={`${category.id}-heading`}>
                  {category.title}
                </h2>
              </div>
              <p className="bl-section-text">{category.text}</p>
            </div>

            <div className="bl-products-stack">
              {category.products.map((product) => (
                <LoanTable key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      ))}

      <section className="bl-section bl-note" aria-labelledby="bl-note-heading">
        <div className="bl-inner">
          <div className="bl-note-inner">
            <p className="bl-note-kicker">Apply with MEMPCO</p>
            <h2 className="bl-note-title" id="bl-note-heading">
              For updated requirements, application review, and final loan terms,<br />
              <em>coordinate directly with MEMPCO.</em>
            </h2>
            <p className="bl-note-text">
              Final approval, pricing, eligibility evaluation, and documentary
              requirements may still vary depending on the borrower profile and
              loan assessment.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
