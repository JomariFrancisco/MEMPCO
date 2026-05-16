'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar/Navbar'
import Footer from '@/components/Footer/Footer'
import './services.css'
import InsurancePage from '@/components/Insurance/InsurancePage'

const ALL_CARDS = [
  {
    id: 'regular-savings',
    pillar: '01',
    pillarLabel: 'Savings & Credit',
    eyebrow: 'Savings',
    name: 'Regular Savings',
    tagline: 'Simple, dependable, tax-free.',
    desc: 'The foundation savings account for every MEMPCO member, opened with just ₱100 and designed for everyday accessibility and steady tax-free growth.',
    details: ['₱100 opening deposit', '4% per annum, tax-free', 'Withdrawal upon demand', 'Open to all members'],
    href: '/services/savings/regular-savings',
    theme: 'dark',
  },
  {
    id: 'kkt',
    pillar: '01',
    pillarLabel: 'Savings & Credit',
    eyebrow: 'Savings',
    name: "KKT — Kinabukasan Ko'To",
    tagline: 'Built for OFWs and families.',
    desc: 'A wealth-building savings program for Overseas Filipinos and their families, offering higher tax-free returns and long-term growth potential.',
    details: ['4.5%–7% per annum', 'Tax-free earnings', 'Up to ₱5,000,000 deposit', 'For OFWs and OF families'],
    href: '/services/savings/kkt',
    theme: 'red',
  },
  {
    id: 'time-deposit',
    pillar: '01',
    pillarLabel: 'Savings & Credit',
    eyebrow: 'Savings',
    name: 'Time Deposit',
    tagline: 'Discipline, rewarded.',
    desc: 'A fixed-term savings option for members who want stronger returns, better spending control, and flexible placements from short to longer terms.',
    details: ['Up to 6.75% per annum', '1 month to 1 year term', 'Interest credited at maturity', 'Ideal for planned savings goals'],
    href: '/services/savings/time-deposit',
    theme: 'light',
  },
  {
    id: 'business-loan',
    pillar: '01',
    pillarLabel: 'Savings & Credit',
    eyebrow: 'Loan',
    name: 'Business Loan',
    tagline: 'Financing for growth.',
    desc: 'A business financing portfolio for entrepreneurs, groups, depositors, and driver-operators who need capital for livelihood, mobility, and expansion.',
    details: ['Up to ₱5,000,000 ceiling', '4 loan program types', 'For business and livelihood use', 'Flexible terms by borrower type'],
    href: '/services/loans/business-loan',
    theme: 'dark',
  },
  {
    id: 'providential-loan',
    pillar: '01',
    pillarLabel: 'Savings & Credit',
    eyebrow: 'Loan',
    name: 'Providential Loan',
    tagline: 'For practical member needs.',
    desc: 'Flexible financing for household needs, salary support, education, mobility, emergencies, public service, and pension-related priorities.',
    details: ['9 loan program options', 'Starts from ₱2,000', 'Up to ₱1.5M ceiling', 'For personal and family needs'],
    href: '/services/loans/providential-loan',
    theme: 'red',
  },
  {
    id: 'Insurance',
    pillar: '02',
    pillarLabel: 'Allied Services',
    eyebrow: 'Protection',
    name: 'Insurance',
    tagline: 'Coverage for members and families.',
    desc: 'A full insurance catalog covering life insurance, family-oriented plans, loan protection, and non-life coverage for property, vehicles, and calamities.',
    details: ['16 insurance products', 'Life and family plans', 'Loan protection options', 'Non-life coverage available'],
    href: '/services/insurance',
    theme: 'light',
  },
  {
    id: 'Transportation',
    pillar: '02',
    pillarLabel: 'Allied Services',
    eyebrow: 'Mobility',
    name: 'Transportation',
    tagline: 'Service details coming soon.',
    desc: 'A transportation support page prepared for future service information, booking coordination, travel guidance, and member transport updates.',
    details: ['Transportation support', 'Booking coordination', 'Guidelines and reminders', 'Full details coming soon'],
    href: '/services/transportation',
    theme: 'dark',
  },
  {
    id: 'Funeral',
    pillar: '02',
    pillarLabel: 'Allied Services',
    eyebrow: 'Assistance',
    name: 'Funeral Services',
    tagline: 'Compassionate memorial support.',
    desc: 'Structured funeral and memorial assistance with service packages, chapel rates, urn viewing arrangements, add-ons, and 24/7 coordination support.',
    details: ['7 funeral packages', '5 chapel rate tiers', 'Urn viewing services', '24/7 on-call coordination'],
    href: '/services/funeral',
    theme: 'red',
  },
  {
    id: 'Wellness',
    pillar: '02',
    pillarLabel: 'Allied Services',
    eyebrow: 'Wellness',
    name: 'Wellness & Diagnostics',
    tagline: 'Wellness details coming soon.',
    desc: 'A wellness service page prepared for future care programs, consultation support, member wellness activities, and health guidance updates.',
    details: ['Wellness service', 'Programs and support', 'Guidelines and reminders', 'Full details coming soon'],
    href: '/services/wellness',
    theme: 'light',
  },
  {
    id: 'aflatoun',
    pillar: '03',
    pillarLabel: 'Laboratory Cooperative',
    eyebrow: 'Program',
    name: 'Aflatoun Savings',
    tagline: 'Save money. Learn life.',
    desc: 'A school-based youth savings program that combines financial literacy, values formation, and guided social development through the Aflatoun curriculum.',
    details: ['₱50 opening deposit', '3% per annum from ₱500', 'Free membership', 'For school-based youth savers'],
    href: '/services/savings/aflatoun-savings',
    theme: 'dark',
  },
  {
    id: 'youth-savings',
    pillar: '03',
    pillarLabel: 'Laboratory Cooperative',
    eyebrow: 'Program',
    name: 'Youth Savings',
    tagline: 'Start early. Finish strong.',
    desc: 'A youth-oriented savings account for children of members, helping young savers build discipline early through accessible deposits and steady interest earnings.',
    details: ['₱50 membership fee', '₱50 initial deposit', '3% per annum', 'For youth and kids savers'],
    href: '/services/savings/youth-savings',
    theme: 'red',
  },
]

const PILLARS = [
  { id: '01', label: 'Savings & Credit', count: 5 },
  { id: '02', label: 'Allied Services', count: 4 },
  { id: '03', label: 'Laboratory Cooperative', count: 2 },
]

function FanCarousel({ cards, activeIndex, onSelect }) {
  const n = cards.length

  const getCardStyle = (i) => {
    const offset = i - activeIndex
    const abs = Math.abs(offset)
    const isCenter = offset === 0

    const rotateZ = offset * 8
    const transX = offset * 82
    const transY = isCenter ? -8 : abs * 10
    const scale = isCenter ? 1.02 : Math.max(0.88, 1 - abs * 0.05)
    const opacity = abs > 3 ? 0 : 1
    const zIndex = n - abs

    return {
      transform: `translateX(${transX}px) rotate(${rotateZ}deg) translateY(${transY}px) scale(${scale})`,
      zIndex,
      opacity,
      transition: 'transform 0.48s cubic-bezier(0.22,1,0.36,1), opacity 0.35s ease',
    }
  }

  return (
    <div className="fan-stage">
      <div className="fan-deck">
        {cards.map((card, i) => {
          const isActive = i === activeIndex

          return (
            <button
              key={card.id}
              className={`fan-card fan-card--${card.theme}${isActive ? ' fan-card--active' : ''}`}
              style={getCardStyle(i)}
              onClick={() => onSelect(i)}
              aria-pressed={isActive}
              aria-label={`${card.name} — ${isActive ? 'active' : 'click to view'}`}
              type="button"
            >
              <div className="fc-top">
                <span className="fc-pillar-badge">{card.pillarLabel}</span>
                <span className="fc-eyebrow">{card.eyebrow}</span>
              </div>

              <div className="fc-main">
                <h3 className="fc-name">{card.name}</h3>
                <p className="fc-tagline">{card.tagline}</p>
              </div>

              <p className="fc-desc">{card.desc}</p>

              <ul className="fc-details">
                {card.details.map((d) => (
                  <li key={d}>
                    <span className="fc-detail-dot" />
                    {d}
                  </li>
                ))}
              </ul>

              <div className="fc-footer">
                {card.href ? (
                  <Link
                    href={card.href}
                    className="fc-cta"
                    tabIndex={isActive ? 0 : -1}
                    onClick={(e) => e.stopPropagation()}
                  >
                    View Service
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <path
                        d="M2 6.5h9M7.5 2.5l4 4-4 4"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Link>
                ) : (
                  <span className="fc-cta-muted">Coming soon</span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      
    </div>
  )
}

export default function Services() {
  const [heroIn, setHeroIn] = useState(false)
  const [activePillar, setActivePillar] = useState(0)
  const [activeCard, setActiveCard] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setHeroIn(true), 60)
    return () => clearTimeout(t)
  }, [])

  const handleTabClick = (i) => {
    setActivePillar(i)
  }

  const pillarCards = ALL_CARDS.filter((c) => c.pillar === PILLARS[activePillar].id)
  const centerIdx = Math.floor(pillarCards.length / 2)

  useEffect(() => {
    setActiveCard(centerIdx)
  }, [activePillar, centerIdx])

  return (
    <>
      <Navbar />

      <main className="sp">
        <section className="sp-screen sp-hero" id="top">
          <div className="sp-hero-grid" aria-hidden="true" />
          <div className="sp-hero-glow" aria-hidden="true" />

          <div className={`sp-hero-shell${heroIn ? ' is-in' : ''}`}>
            <div className="sp-hero-copy">
              <p className="sp-eyebrow">MEMPCO Services</p>

              <h1 className="sp-hero-title">
                Services built for
                <br />
                <em>everyday member needs.</em>
              </h1>

              <p className="sp-hero-sub">
                Explore MEMPCO’s complete service ecosystem — from savings and credit
                to allied support and youth-centered cooperative programs — arranged
                in a cleaner and more accessible experience.
              </p>

              <div className="sp-hero-actions">
                <a href="#carousel" className="sp-hero-cta sp-hero-cta--solid">
                  Explore Services
                </a>
                <a href="#all-services" className="sp-hero-cta sp-hero-cta--ghost">
                  View All
                </a>
              </div>

              <div className="sp-hero-meta"></div>
            </div>

            <div className="sp-hero-panel">
              {PILLARS.map((pillar) => (
                <div key={pillar.id} className="sp-hero-panel-card">
                  <div className="sp-hero-panel-top">
                    <span className="sp-hero-panel-num">{pillar.id}</span>
                    <span className="sp-hero-panel-count">{pillar.count} Services</span>
                  </div>
                  <h3 className="sp-hero-panel-title">{pillar.label}</h3>
                  <p className="sp-hero-panel-text">
                    Organized for quick browsing, better readability, and easier
                    access to the right MEMPCO service.
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="sp-screen sp-carousel-screen" id="carousel">
          <aside className="sp-tabs">
            <p className="sp-section-kicker">Service Pillars</p>

            <nav className="sp-tab-nav" role="tablist">
              {PILLARS.map((p, i) => (
                <button
                  key={p.id}
                  role="tab"
                  aria-selected={activePillar === i}
                  className={`sp-tab${activePillar === i ? ' sp-tab--active' : ''}`}
                  onClick={() => handleTabClick(i)}
                  type="button"
                >
                  <span className="sp-tab-num">{p.id}</span>

                  <div className="sp-tab-body">
                    <span className="sp-tab-label">{p.label}</span>
                    <span className="sp-tab-count">{p.count} services</span>
                  </div>
                </button>
              ))}
            </nav>

            <p className="sp-tab-hint">Tap a card to bring it forward</p>
          </aside>

          <div className="sp-carousel-col">
            <div className="sp-carousel-head">
              <p className="sp-section-kicker">{PILLARS[activePillar].label}</p>
              <p className="sp-carousel-sub">
                {pillarCards.length} services · select any card to read details
              </p>
            </div>

            <FanCarousel
              cards={pillarCards}
              activeIndex={activeCard}
              onSelect={setActiveCard}
            />
          </div>
        </section>

        <section className="sp-screen sp-list-screen" id="all-services">
          <div className="sp-list-inner">
            <header className="sp-list-header">
              <p className="sp-section-kicker">All Services</p>
              <h2 className="sp-list-title">
                <span className="sp-list-title-main">{ALL_CARDS.length}</span>{' '}
                <em>services.</em>
                <br />
                <span className="sp-list-title-main">Three</span>{' '}
                <em>pillars.</em>
              </h2>
              <p className="sp-list-sub">
                A complete reference of every MEMPCO service, organized by pillar
                for quick browsing and direct access.
              </p>
            </header>

            <div className="sp-list-columns">
              {PILLARS.map((p) => (
                <div key={p.id} className="sp-list-group">
                  <div className="sp-list-group-head">
                    <span className="sp-list-num">{p.id}</span>
                    <span className="sp-list-group-name">{p.label}</span>
                  </div>

                  {ALL_CARDS.filter((c) => c.pillar === p.id).map((c) => (
                    <div key={c.id} className="sp-list-row">
                      <span className="sp-list-eyebrow">{c.eyebrow}</span>
                      <span className="sp-list-service-name">{c.name}</span>

                      {c.href ? (
                        <Link href={c.href} className="sp-list-arrow" aria-label={`View ${c.name}`}>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path
                              d="M2.5 7h9M7.5 3.5 11 7l-3.5 3.5"
                              stroke="currentColor"
                              strokeWidth="1.3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </Link>
                      ) : (
                        <span className="sp-list-arrow sp-list-arrow--muted" aria-hidden="true">
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path
                              d="M2.5 7h9M7.5 3.5 11 7l-3.5 3.5"
                              stroke="currentColor"
                              strokeWidth="1.3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
