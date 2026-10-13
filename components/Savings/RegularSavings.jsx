import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import './RegularSavings.css'

/* ─── data ─────────────────────────────────────────── */
const stats = [
  { value: 'Php', num: '100', label: 'Minimum opening deposit' },
  { value: 'Php', num: '100', label: 'Maintaining balance' },
  { value: '3%',  num: null,  label: 'Interest per annum' },
]

/* ─── component ────────────────────────────────────── */
export default function RegularSavings() {
  return (
    <div className="rs">

      {/* ══ 1. HERO ══════════════════════════════════════ */}
      <section className="rs-section rs-hero" aria-labelledby="rs-heading">
        <div className="rs-inner">
          <div className="rs-hero-layout">
            <div className="rs-hero-copy">
              <nav className="rs-breadcrumb" aria-label="Breadcrumb">
                <span>Services</span>
                <span className="rs-breadcrumb-sep">/</span>
                <span>Savings</span>
                <span className="rs-breadcrumb-sep">/</span>
                <span className="rs-breadcrumb-active">Regular Savings</span>
              </nav>

              <span className="rs-eyebrow">MEMPCO Savings Program</span>
              <h1 className="rs-hero-title" id="rs-heading">
                Regular <em>Savings.</em>
              </h1>
              <p className="rs-hero-tagline">
                A simple place to begin your MEMPCO savings journey.
              </p>
            </div>

            <div className="rs-product-stage">
              <Image
                src="/Savings/RegularSavingsPassbook.png"
                alt="MEMPCO Regular Savings Passbook"
                width={900}
                height={700}
                className="rs-product-img"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* ══ 2. STATS BAR ═════════════════════════════════ */}
      <section className="rs-section rs-stats" aria-label="Key figures">
        <div className="rs-inner">
          <div className="rs-stats-grid">
            {stats.map((s) => (
              <div className="rs-stat" key={s.label}>
                <span className="rs-stat-value">
                  {s.value && !s.num && s.value}
                  {s.value && s.num && <><span>{s.value}</span> {s.num}</>}
                  {!s.value && s.num && s.num}
                </span>
                <span className="rs-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 3. DETAILS ═══════════════════════════════════ */}
      <section className="rs-section rs-details" aria-labelledby="rs-details-heading">
        <div className="rs-inner">
          <div className="rs-details-grid">

            {/* Account activity */}
            <div className="rs-details-copy">
              <p className="rs-details-kicker">Account activity</p>
              <h2 className="rs-details-title" id="rs-details-heading">
                One-year <em>dormancy policy.</em>
              </h2>
              <p className="rs-details-body">
                Keep your account active through regular savings activity.
              </p>
            </div>

            <aside className="rs-help-panel" aria-label="Account assistance">
              <p className="rs-help-kicker">MEMPCO support</p>
              <h3 className="rs-help-title">Questions about your account?</h3>
              <p className="rs-help-text">
                Visit a branch or contact our team for assistance with Regular Savings.
              </p>
              <div className="rs-help-links">
                <Link href="/branches" className="rs-help-link">
                  Find a branch <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
                <Link href="/contact-details" className="rs-help-link">
                  Contact MEMPCO <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </aside>

          </div>
        </div>
      </section>

    </div>
  )
}
