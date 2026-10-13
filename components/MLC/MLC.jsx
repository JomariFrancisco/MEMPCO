'use client';

import Image from 'next/image';
import Link from 'next/link';
import './MLC.css';

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.84c0-2.52 1.49-3.91 3.77-3.91 1.09 0 2.23.2 2.23.2v2.47h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.44 2.91h-2.34V22C18.34 21.24 22 17.08 22 12.06z" />
  </svg>
);

const overviewLinks = [
  {
    id: 'mlc-purpose',
    kicker: 'Purpose',
    title: 'A youth-centered platform for savings, learning, and leadership.',
    action: 'Discover MLC',
  },
  {
    id: 'mlc-catalog',
    kicker: 'Savings programs',
    title: 'Compare the school-based and non-school-based savings tracks.',
    action: 'Explore savings',
  },
  {
    id: 'mlc-qualifications',
    kicker: 'Joining MLC',
    title: 'Review eligibility and the documents to prepare before applying.',
    action: 'Check requirements',
  },
];

const heroShowcase = [
  {
    name: 'School-Based Savers',
    text: 'Aflatoun Savers and Aflateen Savers are designed for young savers in school-based settings.',
  },
  {
    name: 'Non-School-Based Savers',
    text: 'Kiddie Savers and Teen Savers support youth members outside the school-based track.',
  },
  {
    name: 'Start Early',
    text: 'It is never too early to start saving, learning responsibility, and building financial discipline.',
  },
];

const impactStats = [
  { value: '4', label: 'Membership kinds' },
  { value: '₱50', label: 'Initial deposit' },
  { value: '6–18', label: 'Eligible age' },
  { value: '2', label: 'Savings categories' },
];

const purposeCards = [
  {
    title: 'Financial Literacy',
    text: 'MLC introduces children and youth to saving, budgeting, and responsible money management through guided learning experiences.',
  },
  {
    title: 'Values Formation',
    text: 'It helps young members understand cooperation, responsibility, and participation through age-appropriate youth programs.',
  },
  {
    title: 'Leadership Growth',
    text: 'Programs and activities encourage confidence, initiative, and readiness for future school, work, and community roles.',
  },
  {
    title: 'Youth Empowerment',
    text: 'MLC creates a supportive space where young members can grow into informed, empowered, and socially aware individuals.',
  },
];

const savingsCatalog = [
  {
    id: 'aflatoun',
    theme: 'is-aflatoun',
    abbr: 'AFLATOUN',
    audience: 'School-based savers',
    title: 'Aflatoun Savings',
    description:
      'A savings pathway for school-based youth members that supports early saving habits, budgeting awareness, and values-based financial learning.',
    points: [
      'Built for younger and school-based savers',
      'Supports saving, budgeting, and financial literacy',
      'Designed around guided youth development',
      'Connects savings with responsibility and future planning',
    ],
    memberships: [
      {
        name: 'Aflatoun Savers',
        age: '6–12 y/o',
        initialDeposit: '₱50',
        membershipFee: 'None',
      },
      {
        name: 'Aflateen Savers',
        age: '13–17 y/o',
        initialDeposit: '₱50',
        membershipFee: 'None',
      },
    ],
    route: '/services/savings/aflatoun-savings',
    buttonLabel: 'View Aflatoun Savings',
  },
  {
    id: 'youth-savings',
    theme: 'is-youth',
    abbr: 'YOUTH',
    audience: 'Non-school-based savers',
    title: 'Youth Savings',
    description:
      'A youth-oriented savings pathway for non-school-based savers who are beginning to build practical saving discipline and long-term financial habits.',
    points: [
      'For non-school-based youth members',
      'Encourages disciplined saving from an early age',
      'Supports practical financial responsibility',
      'Can expand into a fuller youth savings catalog later',
    ],
    memberships: [
      {
        name: 'Kiddie Savers',
        age: '6–12 y/o',
        initialDeposit: '₱50',
        membershipFee: '₱50',
      },
      {
        name: 'Teen Savers',
        age: '13–17 y/o',
        initialDeposit: '₱50',
        membershipFee: '₱50',
      },
    ],
    route: '/services/savings/youth-savings',
    buttonLabel: 'View Youth Savings',
  },
];

const qualifications = [
  'Filipino citizen',
  'At least six (6) years old and not over eighteen (18) years of age',
  'Resident within the area of operation of MEMPCO',
];

const submissionRequirements = [
  'Fill out the Membership Application Form (MAF)',
  "Submit the parent's consent with data privacy consent form",
  'Bring verification documents such as birth certificate and valid IDs of the saver and parent/guardian',
];

const learningHighlights = [
  {
    date: 'January 20',
    tone: '#F6C800',
    toneSoft: 'rgba(246, 200, 0, 0.14)',
    title: 'Pre-Membership Seminar & Youth Financial Literacy Training',
    partner: 'Culianan National High School – Senior High School OJT students',
    text:
      'A full day of learning focused on cooperative principles, smart money habits, budgeting, saving, and goal-setting. The activity framed youth development as both financial and values-based formation.',
    outcomes: [
      'Introduced cooperative membership awareness',
      'Strengthened practical money management learning',
      'Connected youth participation to long-term community development',
    ],
  },
  {
    date: 'February 9',
    tone: '#FF7A1A',
    toneSoft: 'rgba(255, 122, 26, 0.14)',
    title: 'Empowering the Youth through Financial Literacy',
    partner: 'Senior High School OJTs from Ateneo de Zamboanga University',
    text:
      'The seminar equipped participants with essential knowledge on responsible money management, saving, budgeting, and informed financial decision-making as they prepare for adulthood and future careers.',
    outcomes: [
      'Promoted practical financial literacy',
      'Reinforced empowerment through education',
      'Linked youth learning with broader social development goals',
    ],
  },
  {
    date: 'February 25',
    tone: '#C65A12',
    toneSoft: 'rgba(198, 90, 18, 0.12)',
    title: 'Building Financially Smart Youth',
    partner: 'OJTs from Ayala Senior High School',
    text:
      "Shared during MEMPCO's anniversary celebration, this activity highlighted practical learning in saving, budgeting, and responsible money management while encouraging eagerness to learn and participate.",
    outcomes: [
      'Supported youth readiness for higher education and work',
      'Showed the value of investing in youth development early',
      'Aligned with financial responsibility and empowerment goals',
    ],
  },
];

const campaignMoments = [
  {
    tone: '#FF7A1A',
    toneSoft: 'rgba(255, 122, 26, 0.12)',
    date: 'August 12, 2025',
    title: 'International Youth Day',
    text:
      'MLC celebrated youth passion, creativity, and leadership, spotlighting the role of young members in shaping stronger communities and a brighter future.',
    tags: ['Youth leadership', 'Empowerment', 'Community building'],
  },
  {
    tone: '#F6C800',
    toneSoft: 'rgba(246, 200, 0, 0.14)',
    date: 'October 7, 2025',
    title: 'MLC Youth in Action for a Greener Tomorrow',
    text:
      'MLC youth members joined a coastal clean-up drive in Zamboanga City with support from MEMPCO staff, leadership, volunteers, and youth members in a shared act of concern for community.',
    tags: ['Cooperative Month', 'Youth Eco Mission', 'Environmental action'],
  },
];

const learningNetworkGroups = [
  {
    title: 'School Partners',
    items: [
      'Ayala Senior High School',
      'Ateneo de Zamboanga University OJTs',
      'Culianan National High School',
    ],
  },
  {
    title: 'Youth & Community',
    items: ['Youth members', 'Volunteers', 'Community partners'],
  },
  {
    title: 'Cooperative Guidance',
    items: ['MEMPCO staff', 'Division Chiefs', 'Board of Directors'],
  },
];

const advocacyTracks = [
  {
    title: 'Quality Education',
    text: 'Youth learning sessions are built around practical knowledge that can help participants prepare for school, work, and real-life decisions.',
  },
  {
    title: 'Decent Work & Growth',
    text: 'Financial literacy and discipline support better readiness for future work opportunities and more responsible economic participation.',
  },
  {
    title: 'Reduced Inequalities',
    text: 'MLC creates accessible learning spaces that empower children and youth through guided financial understanding and cooperative support.',
  },
  {
    title: 'Concern for Community',
    text: 'Activities encourage shared responsibility, cooperative participation, and service-minded action beyond the classroom or seminar setting.',
  },
  {
    title: 'Greener Tomorrow',
    text: 'Environmental initiatives show that MLC development is not only financial, but also social, civic, and community-centered.',
  },
];

export default function MLC() {
  return (
    <div className="mlc">
      <section className="mlc-section mlc-hero" aria-labelledby="mlc-heading">
        <div className="mlc-inner mlc-hero-grid">
          <div className="mlc-hero-copy">
            <nav className="mlc-breadcrumb" aria-label="Breadcrumb">
              <span>Services</span>
              <span className="mlc-breadcrumb-sep">/</span>
              <span className="mlc-breadcrumb-active">MEMPCO Laboratory Cooperative</span>
            </nav>

            <span className="mlc-eyebrow">MEMPCO Allied Services</span>

            <h1 className="mlc-hero-title" id="mlc-heading">
              MEMPCO Laboratory
              <br />
              <span className="accent">Cooperative.</span>
            </h1>

            <p className="mlc-hero-tagline">
              A youth savings and development platform empowering young minds through saving, learning, and action.
            </p>

            <div className="mlc-hero-actions">
              <a className="mlc-hero-action primary" href="#mlc-catalog">Explore savings programs</a>
              <a className="mlc-hero-action secondary" href="#mlc-qualifications">Membership requirements</a>
            </div>
          </div>

          <div className="mlc-hero-visual" aria-label="MLC identity and quick preview">
            <div className="mlc-logo-stage">
              <Image
                src="/MLC/MLC.png"
                alt="MEMPCO Laboratory Cooperative logo"
                width={560}
                height={560}
                className="mlc-logo-image"
                priority
              />
            </div>

            <div className="mlc-showcase-grid">
              {heroShowcase.map((item) => (
                <article className="mlc-showcase-card" key={item.name}>
                  <h3>{item.name}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>

            <div className="mlc-hero-social-action">
              <a
                href="https://www.facebook.com/profile.php?id=61577495370912"
                className="mlc-facebook-link"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Visit MEMPCO Laboratory Cooperative Facebook page"
              >
                <span className="mlc-facebook-icon">
                  <FacebookIcon />
                </span>
                <span>Visit Facebook Page</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="mlc-section mlc-stats" aria-label="MLC figures and quick facts">
        <div className="mlc-inner">
          <div className="mlc-stats-grid">
            {impactStats.map((item) => (
              <div className="mlc-stat" key={item.label}>
                <span className="mlc-stat-value">{item.value}</span>
                <span className="mlc-stat-label">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mlc-section mlc-overview" aria-labelledby="mlc-overview-heading">
        <div className="mlc-inner">
          <div className="mlc-section-head">
            <div>
              <p className="mlc-section-kicker">Explore MLC</p>
              <h2 className="mlc-section-title" id="mlc-overview-heading">
                Find the right place to begin.
              </h2>
              <p className="mlc-section-text">
                Explore the savings programs, membership pathways, and youth development work of MLC.
              </p>
            </div>
          </div>

          <div className="mlc-overview-grid">
            {overviewLinks.map((item) => (
              <a className="mlc-overview-card" href={`#${item.id}`} key={item.id}>
                <span className="mlc-overview-kicker">{item.kicker}</span>
                <h3>{item.title}</h3>
                <span className="mlc-overview-action">{item.action}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section
        id="mlc-purpose"
        className="mlc-section mlc-purpose"
        aria-labelledby="mlc-purpose-heading"
      >
        <div className="mlc-inner">
          <div className="mlc-section-head">
            <div>
              <p className="mlc-section-kicker">Purpose and direction</p>
              <h2 className="mlc-section-title" id="mlc-purpose-heading">
                A youth-centered platform for savings, learning, and leadership.
              </h2>
              <p className="mlc-section-text">
                MLC is designed as both a youth savings page and a development platform,
                making it easier to present financial literacy, youth formation,
                membership pathways, and future program updates in one place.
              </p>
            </div>
          </div>

          <div className="mlc-purpose-grid">
            {purposeCards.map((item, i) => (
              <article
                className="mlc-purpose-card"
                key={item.title}
                style={{ '--card-index': String(i) }}
              >
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="mlc-catalog"
        className="mlc-section mlc-catalog"
        aria-labelledby="mlc-catalog-heading"
      >
        <div className="mlc-inner">
          <div className="mlc-section-head">
            <div>
              <p className="mlc-section-kicker">Savings catalog</p>
              <h2 className="mlc-section-title" id="mlc-catalog-heading">
                Two savings pathways for young members.
              </h2>
              <p className="mlc-section-text">
                Compare who each program serves, what it focuses on, and the membership
                options available.
              </p>
            </div>
          </div>

          <div className="mlc-program-grid">
            {savingsCatalog.map((item) => (
              <article className={`mlc-program-card ${item.theme}`} key={item.id}>
                <div className="mlc-program-topbar" />

                <div className="mlc-program-header">
                  <div className="mlc-program-meta">
                    <span className="mlc-program-abbr">{item.abbr}</span>
                    <span className="mlc-program-chip">{item.audience}</span>
                  </div>

                  <h3 className="mlc-program-title">{item.title}</h3>
                  <p className="mlc-program-desc">{item.description}</p>
                </div>

                <div className="mlc-program-body">
                  <section className="mlc-program-focus">
                    <h4>Program focus</h4>
                    <ul className="mlc-program-list">
                      {item.points.map((detail) => (
                        <li className="mlc-program-list-item" key={detail}>
                          <span className="mlc-program-list-dot" aria-hidden="true" />
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section className="mlc-program-membership">
                    <h4>Membership options</h4>
                    <div className="mlc-program-table-wrap">
                      <table className="mlc-program-table">
                        <thead>
                          <tr>
                            <th scope="col">Saver type</th>
                            <th scope="col">Age</th>
                            <th scope="col">Initial deposit</th>
                            <th scope="col">Membership fee</th>
                          </tr>
                        </thead>
                        <tbody>
                          {item.memberships.map((membership) => (
                            <tr key={membership.name}>
                              <th scope="row">{membership.name}</th>
                              <td data-label="Age">{membership.age}</td>
                              <td data-label="Initial deposit">{membership.initialDeposit}</td>
                              <td data-label="Membership fee">{membership.membershipFee}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </div>

                <div className="mlc-program-footer">
                  <Link href={item.route} className="mlc-program-button">
                    {item.buttonLabel}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="mlc-qualifications"
        className="mlc-section mlc-qualifications"
        aria-labelledby="mlc-qualifications-heading"
      >
        <div className="mlc-inner">
          <div className="mlc-section-head">
            <div>
              <p className="mlc-section-kicker">Qualifications and requirements</p>
              <h2 className="mlc-section-title" id="mlc-qualifications-heading">
                Who can join and what to prepare.
              </h2>
              <p className="mlc-section-text">
                These are the joining qualifications, submission requirements, and key
                notes from the current MLC membership material.
              </p>
            </div>
          </div>

          <div className="mlc-join-grid">
            <article className="mlc-join-card">
              <h3>Qualifications</h3>
              <ul className="mlc-join-list">
                {qualifications.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>

            <article className="mlc-join-card">
              <h3>Ready to join?</h3>
              <ul className="mlc-join-list">
                {submissionRequirements.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              <div className="mlc-join-note">
                <span>Important note</span>
                <p>LabCoop Savers are not required to pay for Share Capital Build Up.</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section
        id="mlc-highlights"
        className="mlc-section mlc-highlights"
        aria-labelledby="mlc-highlights-heading"
      >
        <div className="mlc-inner">
          <div className="mlc-section-head">
            <div>
              <p className="mlc-section-kicker">Learning highlights</p>
              <h2 className="mlc-section-title" id="mlc-highlights-heading">
                Recent seminars, youth engagement, and development-focused activities.
              </h2>
              <p className="mlc-section-text">
                These highlights translate the Facebook page content into a polished
                website format, so the page can communicate both activity and purpose.
              </p>
            </div>
          </div>

          <div className="mlc-highlight-grid">
            {learningHighlights.map((item, i) => (
              <article
                className="mlc-highlight-card"
                key={item.title}
                style={{
                  '--accent': item.tone,
                  '--accent-soft': item.toneSoft,
                  '--card-index': String(i),
                }}
              >
                <div className="mlc-highlight-topbar" />

                <div className="mlc-highlight-body">
                  <span className="mlc-highlight-date">{item.date}</span>
                  <h3>{item.title}</h3>
                  <p className="mlc-highlight-partner">{item.partner}</p>
                  <p className="mlc-highlight-text">{item.text}</p>

                  <ul className="mlc-highlight-list">
                    {item.outcomes.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>

          <div className="mlc-campaign-grid">
            {campaignMoments.map((item, i) => (
              <article
                className="mlc-campaign-card"
                key={item.title}
                style={{
                  '--accent': item.tone,
                  '--accent-soft': item.toneSoft,
                  '--card-index': String(i),
                }}
              >
                <span className="mlc-campaign-date">{item.date}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>

                <div className="mlc-campaign-tags">
                  {item.tags.map((tag) => (
                    <span className="mlc-campaign-tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mlc-section mlc-network" aria-labelledby="mlc-network-heading">
        <div className="mlc-inner">
          <div className="mlc-network-intro">
            <p className="mlc-section-kicker">Learning network</p>
            <h2 className="mlc-section-title" id="mlc-network-heading">
              Built with schools, young people, and the community.
            </h2>
            <p className="mlc-section-text">
              MLC grows through shared guidance, youth participation, and partnerships that
              connect financial learning with everyday community life.
            </p>
          </div>

          <div className="mlc-network-grid" aria-label="MLC learning network">
            {learningNetworkGroups.map((group, index) => (
              <section
                className="mlc-network-group"
                key={group.title}
                aria-labelledby={`mlc-network-group-${index}`}
                style={{ '--group-index': String(index) }}
              >
                <div className="mlc-network-group-head">
                  <span aria-hidden="true">0{index + 1}</span>
                  <h3 id={`mlc-network-group-${index}`}>{group.title}</h3>
                </div>
                <ul className="mlc-network-list">
                  {group.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </section>

      <section
        id="mlc-advocacy"
        className="mlc-section mlc-advocacy"
        aria-labelledby="mlc-advocacy-heading"
      >
        <div className="mlc-inner">
          <div className="mlc-section-head">
            <div>
              <p className="mlc-section-kicker">Advocacy and outcomes</p>
              <h2 className="mlc-section-title" id="mlc-advocacy-heading">
                What MLC helps build in every young member.
              </h2>
              <p className="mlc-section-text">
                Beyond savings, MLC supports education, work readiness, cooperative
                participation, service, and environmental awareness through youth-centered
                experiences.
              </p>
            </div>
          </div>

          <div className="mlc-advocacy-grid">
            {advocacyTracks.map((item, i) => (
              <article
                className="mlc-advocacy-card"
                key={item.title}
                style={{ '--card-index': String(i) }}
              >
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
