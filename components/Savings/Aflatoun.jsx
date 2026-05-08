import Image from 'next/image'
import './Aflatoun.css'

/* ─── data ─────────────────────────────────────────── */
const stats = [
  {
    value: 'Php 50',
    label: 'Minimum opening deposit',
  },
  {
    value: '3%',
    label: 'Per annum once balance reaches Php 500',
  },
  {
    value: 'FREE',
    label: 'Membership — no cost to join',
  },
]

const features = [
  {
    label: 'Free membership for all children',
    desc:  'Any child can join Aflatoun at no cost — lowering the barrier so every young saver has a place to start.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: 'Social and financial education',
    desc:  'In partnership with NATCCO and DepEd-selected schools, Aflatoun teaches children real life skills alongside saving.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
  },
  {
    label: 'Earns interest from Php 500',
    desc:  'Once a child\'s balance reaches Php 500, it begins earning 3% per annum — a direct reward for consistency.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
      </svg>
    ),
  },
]

const cards = [
  {
    num:   '01',
    title: 'Who can open',
    text:  'Any child enrolled in a NATCCO or DepEd-partnered school may open an Aflatoun account. Membership is completely free.',
  },
  {
    num:   '02',
    title: 'How interest is earned',
    text:  'The account earns 3% per annum once the balance reaches Php 500 — giving children a tangible milestone to work toward.',
  },
  {
    num:   '03',
    title: 'Part of a bigger program',
    text:  'Aflatoun is a globally recognized financial education program. MEMPCO brings it to local communities in partnership with NATCCO.',
  },
]

const pillars = [
  { num: '01', name: 'Personal Exploration' },
  { num: '02', name: 'Rights and Responsibilities' },
  { num: '03', name: 'Saving and Spending' },
  { num: '04', name: 'Planning and Budgeting' },
  { num: '05', name: 'Social & Financial Enterprise' },
]

const whyCards = [
  {
    num:   '01',
    title: 'More than a passbook',
    text:  'Aflatoun combines real savings with life skills education — children learn not just to save, but why saving matters.',
  },
  {
    num:   '02',
    title: 'No cost to start',
    text:  'Free membership removes any excuse. Every child, regardless of background, can open an account and begin their journey.',
  },
  {
    num:   '03',
    title: 'Globally proven, locally delivered',
    text:  'Aflatoun is used in over 100 countries. MEMPCO brings this proven framework directly to children in the community.',
  },
]

/* ─── component ────────────────────────────────────── */
export default function Aflatoun() {
  return (
    <div className="af">

      {/* ══ 1. HERO ══════════════════════════════════════ */}
      <section className="af-section af-hero" aria-labelledby="af-heading">
        <div className="af-inner">

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
            Saving is a skill. Let&apos;s teach it early.<br />
            Life education and financial growth, together.
          </p>

          {/* product image */}
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
      </section>

      {/* ══ 2. STATS BAR ═════════════════════════════════ */}
      <section className="af-section af-stats" aria-label="Key figures">
        <div className="af-inner">
          <div className="af-stats-grid">
            {stats.map((s) => (
              <div className="af-stat" key={s.label}>
                <span className="af-stat-value">{s.value}</span>
                <span className="af-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 3. DETAILS ═══════════════════════════════════ */}
      <section className="af-section af-details" aria-labelledby="af-details-heading">
        <div className="af-inner">
          <div className="af-details-grid">

            {/* left — copy + features */}
            <div>
              <p className="af-details-kicker">The program</p>
              <h2 className="af-details-title" id="af-details-heading">
                Save money.<br />Learn life.
              </h2>
              <p className="af-details-body">
                Aflatoun is a globally recognized social and financial education
                program delivered locally by MEMPCO in partnership with{' '}
                <strong>NATCCO and DepEd-selected schools</strong>.
              </p>
              <p className="af-details-body">
                Children can open an account for as low as{' '}
                <strong>Php 50</strong> with <strong>free membership</strong>,
                and begin earning <strong>3% per annum</strong> once their
                balance reaches Php 500.
              </p>

              <ul className="af-feature-list">
                {features.map((f) => (
                  <li className="af-feature-item" key={f.label}>
                    <div className="af-feature-icon" aria-hidden="true">
                      {f.icon}
                    </div>
                    <div>
                      <p className="af-feature-name">{f.label}</p>
                      <p className="af-feature-desc">{f.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* right — stacked info cards */}
            <div className="af-detail-cards" aria-label="Program details">
              {cards.map((c) => (
                <div className="af-detail-card" key={c.num}>
                  <p className="af-detail-card-num">{c.num}</p>
                  <p className="af-detail-card-title">{c.title}</p>
                  <p className="af-detail-card-text">{c.text}</p>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

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

      {/* ══ 5. WHY CHOOSE ════════════════════════════════ */}
      <section className="af-section af-why" aria-labelledby="af-why-heading">
        <div className="af-inner">
          <p className="af-why-kicker">Why Aflatoun</p>
          <h2 className="af-why-title" id="af-why-heading">
            Education that earns.
          </h2>

          <div className="af-why-grid">
            {whyCards.map((c) => (
              <div className="af-why-card" key={c.num}>
                <p className="af-why-card-num">{c.num}</p>
                <p className="af-why-card-title">{c.title}</p>
                <p className="af-why-card-text">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  )
}