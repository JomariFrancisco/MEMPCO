import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import Navbar from '@/components/Navbar/Navbar'
import Footer from '@/components/Footer/Footer'
import './services.css'

const ALL_CARDS = [
  {
    id: 'regular-savings',
    pillar: '01',
    pillarLabel: 'Savings & Credit',
    eyebrow: 'Savings',
    name: 'Regular Savings',
    tagline: 'Save early for the long run.',
    desc: 'The foundation savings account for every MEMPCO member, opened with just Php 100 and designed for everyday access while earning steady savings growth.',
    details: ['Php 100 opening deposit', 'Php 100 maintaining balance', '3% interest per annum', '1-year dormancy policy'],
    image: '/Savings/RegularSavingsPassbook.png',
    imageAlt: 'Regular Savings passbook',
    href: '/services/savings/regular-savings',
    theme: 'dark',
  },
  {
    id: 'kkt',
    pillar: '01',
    pillarLabel: 'Savings & Credit',
    eyebrow: 'Savings',
    name: 'KKT - Kinabukasan Ko To',
    tagline: 'Special savings for future goals.',
    desc: 'A special savings product for members who can keep funds placed for at least two years while building toward a larger future goal.',
    details: ['Minimum 2-year lock-in', 'Maximum Php 5,000,000 deposit', 'Calculation method applies', 'For long-term savings plans'],
    image: '/Savings/KKTPassbook.png',
    imageAlt: 'KKT passbook',
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
    desc: 'A fixed-term savings option for members who want stronger returns, better spending control, and clear placement terms from 30 days to one year.',
    details: ['4.10% to 6.75% interest p.a.', 'Minimum Php 5,000 opening', '30 to 180 days or 1 year', 'Ideal for planned savings goals'],
    image: '/Savings/TimeDeposit.png',
    imageAlt: 'Time Deposit passbook',
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
    desc: 'Business financing for members who need capital for livelihood, group enterprise, existing depositor borrowing, or tricycle operations.',
    details: ['1.50% to 3% monthly interest', 'Up to Php 5,000,000 ceiling', '6 months up to 3 years', '4% service fee'],
    href: '/services/loans/business-loan',
    theme: 'dark',
  },
  {
    id: 'care-program',
    pillar: '01',
    pillarLabel: 'Savings & Credit',
    eyebrow: 'Loan',
    name: 'CARE Program',
    tagline: 'Helping members move forward.',
    desc: 'A member-focused CARE Loan facility for practical financing needs with clear amount limits, repayment terms, and service fees.',
    details: ['2.75% interest per month', 'Php 4,000 minimum loan', 'Php 200,000 maximum loan', '4 to 12 months to pay'],
    href: '/services/loans/care-program',
    theme: 'light',
  },
  {
    id: 'providential-loan',
    pillar: '01',
    pillarLabel: 'Savings & Credit',
    eyebrow: 'Loan',
    name: 'Providential Loan',
    tagline: 'For practical member needs.',
    desc: 'Loan products for salary, education, pension, vehicle, motorcycle, appliance, home improvement, honorarium, and short-term needs.',
    details: ['1.50% to 3% monthly interest options', 'Product limits from Php 10,000 to Php 1M', 'Short-term to 5-year terms', 'Service fees by product'],
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
    desc: 'A full insurance catalog covering add-on life insurance packages, family-oriented plans, loan protection, and non-life coverage for property, vehicles, and calamities.',
    details: ['15 insurance products', 'GADDDI-4: Php 1,800/year', 'Expanded Life: Php 1,890/year', 'Life, loan, and non-life coverage'],
    image: '/Services/COOPAssurance.png',
    imageAlt: 'COOP Assurance logo',
    href: '/services/insurance',
    theme: 'light',
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
    image: '/Services/LHFDM%20LOGO.png',
    imageAlt: 'La Hermosa Funeraria de MEMPCO logo',
    href: '/services/funeral',
    theme: 'red',
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
    desc: 'A youth savings program that helps children start saving early while learning financial discipline and positive money habits.',
    details: ['Php 50 initial deposit', 'Free membership fee', '3% interest per annum', 'For young savers'],
    image: '/Savings/AflatounPassbook.png',
    imageAlt: 'Aflatoun Savings passbook',
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
    details: ['Php 50 membership fee', 'Php 50 initial deposit', '3% interest per annum', 'For youth and kids savers'],
    image: '/Savings/YouthandKidsPassbook.png',
    imageAlt: 'Youth Savings passbook',
    href: '/services/savings/youth-savings',
    theme: 'red',
  },
]

const PILLARS = [
  { id: '01', label: 'Savings & Credit', count: 6 },
  { id: '02', label: 'Allied Services', count: 4 },
  {
    id: '03',
    label: 'Laboratory Cooperative',
    count: 2,
  },
]

const DEFAULT_SERVICE_IMAGE = '/Logos/Logo.png'

function ServiceCard({ card }) {
  return (
    <article className={`sp-service-card sp-service-card--${card.theme}`}>
      <div className="sp-service-card-top">
        <span className="sp-service-type">{card.eyebrow}</span>
        <img
          src={card.image || DEFAULT_SERVICE_IMAGE}
          alt=""
          aria-hidden="true"
          className="sp-service-image"
          loading="lazy"
        />
      </div>

      <h3 className="sp-service-title">{card.name}</h3>
      <p className="sp-service-tagline">{card.tagline}</p>
      <p className="sp-service-description">{card.desc}</p>

      <ul className="sp-service-details">
        {card.details.map((detail) => (
          <li key={detail}>{detail}</li>
        ))}
      </ul>

      <div className="sp-service-card-footer">
        {card.href ? (
          <Link href={card.href} className="sp-service-link">
            View service
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        ) : (
          <span className="sp-service-coming-soon">Coming soon</span>
        )}
      </div>
    </article>
  )
}

export default function Services() {
  return (
    <>
      <Navbar />

      <main className="sp">
        <header className="sp-page-header" id="top">
          <div className="sp-page-header-inner">
            <div className="sp-page-header-copy">
              <p className="sp-page-kicker">MEMPCO Services</p>
              <h1 className="sp-page-title">Our Services</h1>
            </div>
          </div>
        </header>

        <div className="sp-service-catalog" id="all-services">
          {PILLARS.map((pillar) => {
            const pillarCards = ALL_CARDS.filter((card) => card.pillar === pillar.id)

            return (
              <section
                key={pillar.id}
                className={`sp-pillar sp-pillar--${pillar.id}`}
                aria-labelledby={`pillar-title-${pillar.id}`}
              >
                <header className="sp-pillar-header">
                  <div className="sp-pillar-heading">
                    <span className="sp-pillar-number">{pillar.id}</span>
                    <div>
                      <p className="sp-pillar-kicker">Service pillar</p>
                      <h2 className="sp-pillar-title" id={`pillar-title-${pillar.id}`}>
                        {pillar.label}
                      </h2>
                    </div>
                  </div>

                  <div className="sp-pillar-meta">
                    <span>{pillarCards.length} services</span>
                  </div>
                </header>

                <div className="sp-service-grid">
                  {pillarCards.map((card) => (
                    <ServiceCard key={card.id} card={card} />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </main>

      <Footer />
    </>
  )
}
