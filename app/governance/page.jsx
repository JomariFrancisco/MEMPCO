'use client'

import Link from 'next/link'
import Navbar from '@/components/Navbar/Navbar'
import Footer from '@/components/Footer/Footer'
import './governance.css'

const boardPositions = [
  'Chairperson',
  'Vice Chairperson',
  'Board Secretary',
  'Treasurer',
  'Auditor',
  'Board Member (2)',
]

const managementPositions = [
  'Chief Executive Officer (1)',
  'Division Chief (4)',
  'Area Manager (2)',
  'Branch / Unit Manager (12)',
]

const areaOneBranches = [
  'Central Office',
  'Curuan Branch',
  'Canelar Branch',
  'Veterans Branch',
  'Culianan Branch',
  'Ayala Branch',
  'Nunez Extension Branch',
  'Vitali Satellite Office',
  'La Hermosa Funeraria',
]

const areaTwoBranches = [
  'Ipil Branch',
  'Dipolog Branch',
  'Pagadian Branch',
]

export default function Governance() {
  return (
    <>
      <Navbar />

      <main className="gov-page">
        <section className="gov-hero">
          <div className="gov-container">
            <div className="gov-breadcrumb">
              <Link href="/about">About</Link>
              <span>/</span>
              <span>Governance</span>
            </div>

            <div className="gov-hero-content">
              <span className="gov-eyebrow">Governance Overview</span>

              <h1>
                Governance <em>Overview</em>
              </h1>

              <p className="gov-hero-subtitle">
                A simple overview of leadership positions and branch coverage across
                the cooperative.
              </p>

              <p className="gov-hero-description">
                This page presents MEMPCO governance in a cleaner and more direct
                format by showing only the key positions in the Board and
                Management, together with the branch network under each area.
              </p>

              <div className="gov-hero-actions">
                <Link
                  href="/governance/board-of-directors"
                  className="gov-primary-btn"
                >
                  View Board Of Directors
                </Link>

                <Link
                  href="/governance/management"
                  className="gov-secondary-btn"
                >
                  View Management
                </Link>
              </div>

              <div className="gov-stats">
                <div className="gov-stat-card">
                  <h3>06</h3>
                  <p>Board Positions</p>
                </div>

                <div className="gov-stat-card">
                  <h3>04</h3>
                  <p>Management Roles</p>
                </div>

                <div className="gov-stat-card">
                  <h3>09</h3>
                  <p>Area 1 Branches</p>
                </div>

                <div className="gov-stat-card">
                  <h3>03</h3>
                  <p>Area 2 Branches</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="gov-section" id="positions-overview">
          <div className="gov-container">
            <div className="gov-section-heading">
              <span className="gov-section-tag">Positions</span>
              <h2>Leadership Positions</h2>
              <p>
                A direct summary of the positions under the Board of Directors and
                Management.
              </p>
            </div>

            <div className="gov-simple-grid">
              <article className="gov-list-card">
                <div className="gov-card-head">
                  <span className="gov-card-tag">Board of Directors</span>
                  <h3>Board Positions</h3>
                </div>

                <ul className="gov-list">
                  {boardPositions.map((item) => (
                    <li key={item} className="gov-list-item">
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>

              <article className="gov-list-card">
                <div className="gov-card-head">
                  <span className="gov-card-tag">Management</span>
                  <h3>Management Positions</h3>
                </div>

                <ul className="gov-list">
                  {managementPositions.map((item) => (
                    <li key={item} className="gov-list-item">
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </div>
          </div>
        </section>

        <section className="gov-section gov-section--soft" id="branches-overview">
          <div className="gov-container">
            <div className="gov-section-heading">
              <span className="gov-section-tag">Branches</span>
              <h2>Branch Network</h2>
              <p>
                The branch and unit coverage under Area 1 and Area 2.
              </p>
            </div>

            <div className="gov-simple-grid">
              <article className="gov-list-card">
                <div className="gov-card-head gov-card-head--split">
                  <div>
                    <span className="gov-card-tag">Area 1</span>
                    <h3>09 Branches / Units</h3>
                  </div>
                  <span className="gov-count-pill">09</span>
                </div>

                <ul className="gov-list">
                  {areaOneBranches.map((branch) => (
                    <li key={branch} className="gov-list-item">
                      <span>{branch}</span>
                    </li>
                  ))}
                </ul>
              </article>

              <article className="gov-list-card">
                <div className="gov-card-head gov-card-head--split">
                  <div>
                    <span className="gov-card-tag">Area 2</span>
                    <h3>03 Branches / Units</h3>
                  </div>
                  <span className="gov-count-pill">03</span>
                </div>

                <ul className="gov-list">
                  {areaTwoBranches.map((branch) => (
                    <li key={branch} className="gov-list-item">
                      <span>{branch}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}