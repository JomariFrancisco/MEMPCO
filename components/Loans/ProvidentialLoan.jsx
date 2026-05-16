import './Providential.css';

const categories = [
  {
    id: 'providential-loan-programs',
    kicker: 'Providential loan programs',
    title: 'Personal, household, educational, mobility, and emergency loan support.',
    text:
      'Explore MEMPCO providential loan options designed for household needs, salary-based financing, mobility, public service support, major purchases, education, emergencies, and pension-related needs.',
    products: [
      {
        id: 'appliance-furniture-loan',
        abbr: 'AFL',
        name: 'Appliance and Furniture Loan',
        summary:
          'For the purchase of personal property or furniture for home needs.',
        tone: '#DC2626',
        toneSoft: 'rgba(220, 38, 38, 0.10)',
        premiumLabel: 'Loan Amount',
        premium: '₱5,000 – ₱30,000',
        period: 'household support',
        columns: ['Details'],
        rows: [
          { label: 'Purpose', values: ['Purchase of personal property or furniture.'] },
          { label: 'Interest Rate', values: ['2% – 4% per month'] },
          { label: 'Term', values: ['6 months to 1 year'] },
          { label: 'Mode of Payment', values: ['Weekly / Semi-Monthly / Monthly'] },
          {
            label: 'Eligibility',
            values: [
              'Must be MIGS, Filipino, at least 18 years old and not more than 69 years old upon loan maturity, and with at least 1 co-maker.',
            ],
          },
          {
            label: 'Requirements',
            values: [
              'Completed and signed application form, 2 valid government-issued photo IDs, Barangay Clearance, and Proof of Billing if applicable.',
            ],
          },
        ],
      },
      {
        id: 'salary-loan',
        abbr: 'SAL',
        name: 'Salary Loan',
        summary:
          'Designed for regular employees who need structured salary-based financing.',
        tone: '#4F6BED',
        toneSoft: 'rgba(79, 107, 237, 0.10)',
        premiumLabel: 'Loan Amount',
        premium: '₱5,000 – ₱100,000',
        period: 'employee support',
        columns: ['Details'],
        rows: [
          {
            label: 'Purpose',
            values: ['Personal financial support for employed members with regular income.'],
          },
          { label: 'Interest Rate', values: ['3% interest rate'] },
          { label: 'Term', values: ['3 to 18 months'] },
          { label: 'Mode of Payment', values: ['Salary-based repayment setup'] },
          {
            label: 'Eligibility',
            values: [
              'Must qualify under MEMPCO general lending policy, must be a regular employee, must not be due to retire or resign, must have required net take-home pay, must have an EMV-ready ATM card, and must have 2 co-makers: 1 family member and 1 co-employee.',
            ],
          },
          {
            label: 'Requirements',
            values: [
              'Two valid original photo-bearing IDs including Barangay Official ID, two 2x2 pictures, Certificate of Employment and Income, recent two months payslip, recent one month bank statement, and EMV-ready ATM card where salary is credited.',
            ],
          },
        ],
      },
      {
        id: 'motorcycle-loan',
        abbr: 'MCL',
        name: 'Motorcycle Loan',
        summary:
          'Helps members finance a motorcycle for transportation and daily mobility.',
        tone: '#36A52E',
        toneSoft: 'rgba(54, 165, 46, 0.12)',
        premiumLabel: 'Loan Amount',
        premium: '₱20,000 – ₱70,000',
        period: 'mobility support',
        columns: ['Details'],
        rows: [
          { label: 'Purpose', values: ['Purchase of a motorcycle.'] },
          { label: 'Interest Rate', values: ['2% – 4% per month'] },
          { label: 'Term', values: ['6 months to 3 years'] },
          { label: 'Mode of Payment', values: ['Weekly / Semi-Monthly / Monthly'] },
          {
            label: 'Eligibility',
            values: [
              'Must be MIGS, Filipino, at least 18 years old and not more than 69 years old upon loan maturity, and with at least 1 co-maker.',
            ],
          },
          {
            label: 'Requirements',
            values: [
              'Completed and signed application form, 2 valid government-issued photo IDs, Barangay Clearance, Proof of Billing if applicable, price quotation of motorcycle, and payment of equity/downpayment with a minimum of 10% of the purchase price.',
            ],
          },
        ],
      },
      {
        id: 'honorarium-loan',
        abbr: 'HON',
        name: 'Honorarium Loan',
        summary:
          'A multi-purpose loan intended for qualified elected or appointed barangay officials.',
        tone: '#E39A18',
        toneSoft: 'rgba(227, 154, 24, 0.12)',
        premiumLabel: 'Loan Amount',
        premium: '₱5,000 – ₱100,000',
        period: 'public service support',
        columns: ['Details'],
        rows: [
          {
            label: 'Purpose',
            values: ['Multi-purpose loan support for incumbent barangay officials.'],
          },
          { label: 'Interest Rate', values: ['3% per month'] },
          { label: 'Term', values: ['3 months to 1 year'] },
          { label: 'Mode of Payment', values: ['Monthly'] },
          {
            label: 'Eligibility',
            values: [
              'Must be MIGS, Filipino, at least 18 years old and not more than 69 years old upon loan maturity, must be an incumbent elected or appointed Barangay official in qualified positions, must not be due for election or expiration of appointment within 6 months, and with at least 1 co-maker.',
            ],
          },
          {
            label: 'Requirements',
            values: [
              'Completed and signed application form, 2 valid government-issued photo IDs, and latest 2 months payslip.',
            ],
          },
          {
            label: 'Note',
            values: ['Term should not exceed 3 months before the expiration of term of office.'],
            highlight: true,
          },
        ],
      },
      {
        id: 'vehicle-loan',
        abbr: 'VEH',
        name: 'Vehicle Loan',
        summary:
          'For the purchase of a vehicle for personal or business use.',
        tone: '#B32020',
        toneSoft: 'rgba(179, 32, 32, 0.10)',
        premiumLabel: 'Loan Amount',
        premium: 'Up to ₱1.5M',
        period: 'major asset financing',
        columns: ['Details'],
        rows: [
          {
            label: 'Purpose',
            values: ['Purchase of a vehicle for personal or business use.'],
          },
          { label: 'Interest Rate', values: ['1.25% per month'] },
          { label: 'Term', values: ['Flexible repayment terms'] },
          { label: 'Mode of Payment', values: ['Weekly / Semi-Monthly / Monthly'] },
          {
            label: 'Eligibility',
            values: [
              'Must be MIGS, Filipino, at least 18 years old and not more than 69 years old upon loan maturity, and with at least 1 co-maker.',
            ],
          },
          {
            label: 'General Requirements',
            values: [
              'Completed and signed application form, 2 valid government-issued photo IDs, Barangay Clearance, and Proof of Billing if applicable.',
            ],
          },
          {
            label: 'Other Requirements',
            values: [
              'Price Quotation for brand new units; OR and CR for 2nd hand; and Deed of Sale of previous seller and buyer for 2nd hand vehicles if the registered owner is not the current seller.',
            ],
          },
          {
            label: 'Note',
            values: [
              'For brand-new units, the maximum is ₱1.5 million. For 2nd hand vehicles not more than 5 years old, financing may be up to 100% of the appraised value.',
            ],
            highlight: true,
          },
        ],
      },
      {
        id: 'house-improvement-loan',
        abbr: 'HIL',
        name: 'House Improvement Loan',
        summary:
          'Supports members in repairing or improving their homes.',
        tone: '#2E9E36',
        toneSoft: 'rgba(46, 158, 54, 0.11)',
        premiumLabel: 'Loan Amount',
        premium: '₱20,000 – ₱150,000',
        period: 'home improvement',
        columns: ['Details'],
        rows: [
          { label: 'Purpose', values: ['House repairs and improvement.'] },
          { label: 'Interest Rate', values: ['2% – 4% per month'] },
          { label: 'Term', values: ['6 months to 2 years'] },
          { label: 'Mode of Payment', values: ['Weekly / Semi-Monthly / Monthly'] },
          {
            label: 'Eligibility',
            values: [
              'Must be MIGS, Filipino, at least 18 years old and not more than 69 years old upon loan maturity, and with at least 1 co-maker.',
            ],
          },
          {
            label: 'General Requirements',
            values: [
              'Completed and signed application form, 2 valid government-issued photo IDs, Barangay Clearance, and Proof of Billing if applicable.',
            ],
          },
          {
            label: 'Other Requirements',
            values: [
              'Bill of Materials, photo of the house and area to be improved, and photocopy of land title or SPA if lot owner is different from the applicant if applicable.',
            ],
          },
        ],
      },
      {
        id: 'instant-loan',
        abbr: 'INS',
        name: 'Instant Loan',
        summary:
          'For utilities and other emergency expenses when members need quick assistance.',
        tone: '#F28C28',
        toneSoft: 'rgba(242, 140, 40, 0.12)',
        premiumLabel: 'Loan Amount',
        premium: '₱2,000 – ₱10,000',
        period: 'emergency support',
        columns: ['Details'],
        rows: [
          { label: 'Purpose', values: ['Payment for utilities and other emergency expenses.'] },
          { label: 'Interest Rate', values: ['2% – 4% per month'] },
          { label: 'Term', values: ['3 months to 1 year'] },
          { label: 'Mode of Payment', values: ['Weekly / Semi-Monthly / Monthly'] },
          {
            label: 'Eligibility',
            values: [
              'Must be MIGS, Filipino, at least 18 years old and not more than 69 years old upon loan maturity, must be an existing member, and with at least 1 co-maker.',
            ],
          },
          {
            label: 'Requirements',
            values: [
              'Completed and signed application form and 2 valid government-issued photo IDs.',
            ],
          },
        ],
      },
      {
        id: 'education-loan',
        abbr: 'EDU',
        name: 'Education Loan',
        summary:
          'Helps fund school-related and academic expenses.',
        tone: '#5E77F0',
        toneSoft: 'rgba(94, 119, 240, 0.10)',
        premiumLabel: 'Loan Amount',
        premium: '₱5,000 – ₱100,000',
        period: 'educational support',
        columns: ['Details'],
        rows: [
          { label: 'Purpose', values: ['Financial support for educational expenses.'] },
          { label: 'Interest Rate', values: ['2% – 4% per month'] },
          { label: 'Term', values: ['6 months to 10 months'] },
          { label: 'Mode of Payment', values: ['Weekly / Semi-Monthly / Monthly'] },
          {
            label: 'Eligibility',
            values: [
              'Must be MIGS, Filipino, at least 18 years old and not more than 69 years old upon loan maturity, and with at least 1 co-maker.',
            ],
          },
          {
            label: 'Requirements',
            values: [
              'Completed and signed application form, 2 valid government-issued photo IDs, and Barangay Clearance.',
            ],
          },
        ],
      },
      {
        id: 'pension-loan',
        abbr: 'PEN',
        name: 'Pension Loan',
        summary:
          'Created for qualified SSS pensioners who need reliable additional financing.',
        tone: '#E7B81C',
        toneSoft: 'rgba(231, 184, 28, 0.12)',
        premiumLabel: 'Loan Amount',
        premium: '₱5,000 – ₱100,000',
        period: 'pensioner support',
        columns: ['Details'],
        rows: [
          {
            label: 'Purpose',
            values: ['Loan support for SSS pensioners, whether principal or beneficiary.'],
          },
          { label: 'Interest Rate', values: ['3% per month'] },
          { label: 'Term', values: ['6 months to 1 year'] },
          { label: 'Mode of Payment', values: ['Monthly'] },
          {
            label: 'Eligibility',
            values: [
              'Must be MIGS, Filipino, at least 18 years old and not more than 69 years old upon loan maturity, must be an SSS pensioner as principal or beneficiary, must not be more than 69 years old upon loan application, must be receiving pension for at least one month, and with at least 1 co-maker.',
            ],
          },
          {
            label: 'Loan Requirements',
            values: [
              'Completed and signed application form, 2 valid government-issued photo IDs, Pension Voucher/Certificate of Pension, latest bank statement/passbook, and Annual Confirmation of Pensioner if applicable.',
            ],
          },
          {
            label: 'If Borrower is a Dependent',
            values: [
              'Marriage Certificate, Certificate of No Marriage (CENOMAR), and Proof of Billing if applicable.',
            ],
          },
          {
            label: 'Note',
            values: ['Loan term must not exceed the 70th birthday of the member.'],
            highlight: true,
          },
        ],
      },
    ],
  },
];

const stats = [
  { value: '9', label: 'Providential loan programs' },
  { value: '₱2K', label: 'Lowest starting loan shown' },
  { value: '₱1.5M', label: 'Highest loan ceiling shown' },
  { value: '6+ Uses', label: 'Household and personal purposes' },
];

const quickGuide = [
  {
    title: 'Household and Family Needs',
    text: 'Includes appliance and furniture, house improvement, and instant loan support for daily and urgent needs.',
  },
  {
    title: 'Mobility and Assets',
    text: 'Includes motorcycle and vehicle financing for transport, livelihood, and major purchases.',
  },
  {
    title: 'Income and Public Service',
    text: 'Includes salary and honorarium loans for employees and qualified barangay officials.',
  },
  {
    title: 'Education and Pension Support',
    text: 'Includes educational financing and loan support for qualified SSS pensioners.',
  },
];

function ProvidentialTable({ product }) {
  return (
    <article
      id={product.id}
      className="pl-product-card"
      style={{
        '--accent': product.tone,
        '--accent-soft': product.toneSoft,
      }}
    >
      <div className="pl-product-topbar" />

      <div className="pl-product-header">
        <div className="pl-product-copy">
          <div className="pl-product-meta">
            <span className="pl-product-abbr">{product.abbr}</span>
            <span className="pl-product-pill">{product.summary}</span>
          </div>

          <h3 className="pl-product-name">{product.name}</h3>
        </div>

        <div className="pl-product-premium">
          <span className="pl-product-premium-label">{product.premiumLabel}</span>
          <span className="pl-product-premium-value">{product.premium}</span>
          <span className="pl-product-premium-period">{product.period}</span>
        </div>
      </div>

      <div className="pl-product-table-wrap">
        <table className="pl-product-table">
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

export default function ProvidentialLoan() {
  return (
    <div className="pl">
      <section className="pl-section pl-hero" aria-labelledby="pl-heading">
        <div className="pl-inner">
          <nav className="pl-breadcrumb" aria-label="Breadcrumb">
            <span>Services</span>
            <span className="pl-breadcrumb-sep">/</span>
            <span>Loans</span>
            <span className="pl-breadcrumb-sep">/</span>
            <span className="pl-breadcrumb-active">Providential Loan</span>
          </nav>

          <span className="pl-eyebrow">MEMPCO Loan Program</span>

          <h1 className="pl-hero-title" id="pl-heading">
            Providential Loan.<br />
            <span className="accent">For practical needs.</span>
          </h1>

          <p className="pl-hero-tagline">
            MEMPCO’s Providential Loan supports members with flexible financing
            for household needs, employee support, education, transportation,
            emergencies, and pension-related priorities.
          </p>

          <div className="pl-hero-chips">
            {categories[0].products.map((product) => (
              <a href={`#${product.id}`} className="pl-hero-chip" key={product.id}>
                <span className="pl-hero-chip-kicker">{product.abbr}</span>
                <span className="pl-hero-chip-title">{product.name}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="pl-section pl-stats" aria-label="Key figures">
        <div className="pl-inner">
          <div className="pl-stats-grid">
            {stats.map((item) => (
              <div className="pl-stat" key={item.label}>
                <span className="pl-stat-value">{item.value}</span>
                <span className="pl-stat-label">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pl-section pl-overview" aria-labelledby="pl-overview-heading">
        <div className="pl-inner">
          <p className="pl-section-kicker">Loan portfolio</p>
          <h2 className="pl-section-title" id="pl-overview-heading">
            Structured by <em>member need.</em>
          </h2>
          <p className="pl-section-text">
            This layout turns the Providential Loan page into a cleaner product
            catalog so members can compare loan options, requirements, and
            eligibility more easily.
          </p>

          <div className="pl-overview-grid">
            {quickGuide.map((item) => (
              <div className="pl-overview-card" key={item.title}>
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
          className="pl-section pl-category"
          aria-labelledby={`${category.id}-heading`}
        >
          <div className="pl-inner">
            <div className="pl-category-header">
              <div>
                <p className="pl-section-kicker">{category.kicker}</p>
                <h2 className="pl-section-title" id={`${category.id}-heading`}>
                  {category.title}
                </h2>
              </div>
              <p className="pl-section-text">{category.text}</p>
            </div>

            <div className="pl-products-stack">
              {category.products.map((product) => (
                <ProvidentialTable key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      ))}

      <section className="pl-section pl-note" aria-labelledby="pl-note-heading">
        <div className="pl-inner">
          <div className="pl-note-inner">
            <p className="pl-note-kicker">Apply with MEMPCO</p>
            <h2 className="pl-note-title" id="pl-note-heading">
              For updated requirements, approval review, and final loan terms,<br />
              <em>coordinate directly with MEMPCO.</em>
            </h2>
            <p className="pl-note-text">
              Final eligibility, documentary requirements, repayment structure,
              and approval conditions may still vary depending on the loan type
              and borrower assessment.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
