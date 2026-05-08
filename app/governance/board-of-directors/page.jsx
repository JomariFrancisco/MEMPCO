'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar/Navbar'
import Footer from '@/components/Footer/Footer'
import './board-of-directors.css'

const directors = [
  {
    id: 1,
    name: 'Chairperson Name',
    position: 'Chairperson',
    term: '20XX – 20XX',
    committee: 'Executive Committee',
    image: '',
    shortDescription:
      "Provides overall leadership to the Board and ensures governance decisions remain aligned with the cooperative's long-term direction.",
    fullDescription:
      'The Chairperson leads the Board of Directors in establishing strategic direction, promoting sound governance, and ensuring that Board actions remain aligned with the mission, vision, and long-term priorities of the cooperative.',
  },
  {
    id: 2,
    name: 'Vice Chairperson Name',
    position: 'Vice Chairperson',
    term: '20XX – 20XX',
    committee: 'Executive Committee',
    image: '',
    shortDescription:
      'Supports the Chairperson and helps sustain leadership continuity, policy oversight, and effective Board coordination.',
    fullDescription:
      'The Vice Chairperson assists the Chairperson in Board leadership, supports governance continuity, and helps maintain alignment across priorities, committees, and institutional decisions.',
  },
  {
    id: 3,
    name: 'Secretary Name',
    position: 'Board Secretary',
    term: '20XX – 20XX',
    committee: 'Governance Committee',
    image: '',
    shortDescription:
      "Ensures proper documentation of meetings, resolutions, and key records of the cooperative's governance activities.",
    fullDescription:
      'The Board Secretary maintains official records, meeting minutes, Board resolutions, and governance documentation, helping preserve organizational continuity, compliance, and institutional memory.',
  },
  {
    id: 4,
    name: 'Treasurer Name',
    position: 'Treasurer',
    term: '20XX – 20XX',
    committee: 'Finance Committee',
    image: '',
    shortDescription:
      'Provides oversight on financial stewardship, accountability, and the responsible use of cooperative resources.',
    fullDescription:
      'The Treasurer supports the Board in strengthening fiscal discipline, reviewing financial direction, and promoting responsible stewardship of assets, funds, and resources.',
  },
  {
    id: 5,
    name: 'Auditor Name',
    position: 'Auditor',
    term: '20XX – 20XX',
    committee: 'Audit Committee',
    image: '',
    shortDescription:
      'Promotes accountability and strong internal control through governance review and compliance monitoring.',
    fullDescription:
      'The Auditor contributes to the integrity of governance systems by supporting oversight, transparency, accountability, and internal control across cooperative operations and decision-making.',
  },
  {
    id: 6,
    name: 'Director Name 01',
    position: 'Board Member',
    term: '20XX – 20XX',
    committee: 'Member Relations Committee',
    image: '',
    shortDescription:
      'Supports policy development, strategic discussion, and member-centered leadership within the Board.',
    fullDescription:
      'This Board Member contributes to strategic planning, policy review, committee work, and member-focused governance while supporting responsible institutional growth.',
  },
  {
    id: 7,
    name: 'Director Name 02',
    position: 'Board Member',
    term: '20XX – 20XX',
    committee: 'Education Committee',
    image: '',
    shortDescription:
      'Contributes to collaborative governance and supports Board initiatives that strengthen service and sustainability.',
    fullDescription:
      'This Board Member helps guide the cooperative through collaborative governance, committee participation, and decisions that uphold service quality, accountability, and sustainability.',
  },
]

const committees = [
  {
    title: 'Executive Committee',
    description:
      'Supports leadership continuity, strategic direction, and major governance priorities of the cooperative.',
  },
  {
    title: 'Governance Committee',
    description:
      'Promotes policy alignment, governance quality, and institutional accountability.',
  },
  {
    title: 'Finance Committee',
    description:
      'Reviews financial stewardship, fiscal discipline, and resource oversight.',
  },
  {
    title: 'Audit Committee',
    description:
      'Strengthens compliance, transparency, and internal control mechanisms.',
  },
]

const governanceFocus = [
  'Strategic Direction',
  'Policy Oversight',
  'Member-Centered Leadership',
  'Transparency & Accountability',
]

function getInitials(name) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function ChartNode({ director, avatarSize = 'md', cardWidth = 'tier-3-node', onClick }) {
  return (
    <div
      className={`bod-chart-node bod-${cardWidth}`}
      onClick={() => onClick(director)}
      onKeyDown={(e) => e.key === 'Enter' && onClick(director)}
      role="button"
      tabIndex={0}
      aria-label={`View ${director.name}'s profile`}
    >
      <div className="bod-node-card">
        <div className={`bod-node-avatar bod-node-avatar--${avatarSize}`}>
          {getInitials(director.name)}
        </div>

        <div className="bod-node-text">
          <span className="bod-node-role">{director.position}</span>
          <span className="bod-node-name">{director.name}</span>
          <span className="bod-node-committee">{director.committee}</span>
        </div>
      </div>
    </div>
  )
}

function DirectorModal({ director, onClose }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="bod-modal" onClick={onClose} role="dialog" aria-modal="true">
      <div className="bod-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="bod-modal-close" onClick={onClose} aria-label="Close modal">
          ✕
        </button>

        <div className="bod-modal-image-col">
          <div className="bod-modal-portrait">
            {director.image ? (
              <img src={director.image} alt={director.name} />
            ) : (
              <span className="bod-modal-portrait-initials">
                {getInitials(director.name)}
              </span>
            )}
          </div>

          <div className="bod-modal-image-meta">
            <h3>{director.name}</h3>
            <span className="bod-modal-badge">{director.position}</span>
          </div>
        </div>

        <div className="bod-modal-info-col">
          <span className="bod-modal-badge">{director.position}</span>
          <h2>{director.name}</h2>
          <div className="bod-modal-divider" />
          <p className="bod-modal-description">{director.fullDescription}</p>

          <div className="bod-modal-meta">
            <div className="bod-modal-meta-card">
              <h4>Term</h4>
              <p>{director.term}</p>
            </div>
            <div className="bod-modal-meta-card">
              <h4>Committee</h4>
              <p>{director.committee}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function HierarchyChart({ directors, onSelect }) {
  const chair = directors[0]
  const vice = directors[1]
  const tier3 = directors.slice(2)

  const tier3Columns = {
    gridTemplateColumns: `repeat(${tier3.length}, var(--tier-3-node-width))`,
  }

  return (
    <div className="bod-chart-wrap">
      <div className="bod-chart-tier bod-chart-tier--single">
        <ChartNode
          director={chair}
          avatarSize="xl"
          cardWidth="tier-1-node"
          onClick={onSelect}
        />
      </div>

      <div className="bod-vline bod-vline--chair" />

      <div className="bod-chart-tier bod-chart-tier--single">
        <ChartNode
          director={vice}
          avatarSize="lg"
          cardWidth="tier-2-node"
          onClick={onSelect}
        />
      </div>

      <div className="bod-vline bod-vline--vice" />

      <div className="bod-tier-3-shell">
        <div className="bod-hbar" />

        <div className="bod-tier-drop-row" style={tier3Columns}>
          {tier3.map((d) => (
            <div key={d.id} className="bod-drop-leg" />
          ))}
        </div>

        <div className="bod-chart-tier bod-chart-tier--tier3" style={tier3Columns}>
          {tier3.map((d) => (
            <ChartNode
              key={d.id}
              director={d}
              avatarSize="md"
              cardWidth="tier-3-node"
              onClick={onSelect}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function BoardOfDirectorsPage() {
  const [selectedDirector, setSelectedDirector] = useState(null)
  const featuredDirector = directors[0]

  return (
    <>
      <Navbar />

      {selectedDirector && (
        <DirectorModal
          director={selectedDirector}
          onClose={() => setSelectedDirector(null)}
        />
      )}

      <main className="bod-page">
        <section className="bod-hero">
          <div className="bod-container">
            <div className="bod-breadcrumb">
              <Link href="/governance">Governance</Link>
              <span>/</span>
              <span>Board of Directors</span>
            </div>

            <div className="bod-hero-grid">
              <div className="bod-hero-copy">
                <span className="bod-eyebrow">Governance Leadership</span>

                <h1>
                  Board of <em>Directors</em>
                </h1>

                <p className="bod-hero-subtitle">
                  Strategic direction, accountable leadership, and principled
                  governance for the cooperative.
                </p>

                <div className="bod-hero-actions">
                  <a href="#leadership-hierarchy" className="bod-primary-btn">
                    View Hierarchy
                  </a>

                  <Link href="/governance" className="bod-secondary-btn">
                    View Overview
                  </Link>
                </div>
              </div>

              <div className="bod-hero-card">
                <div className="bod-hero-card-top">
                  <span className="bod-spotlight-tag">Featured Leadership</span>

                  <div className="bod-spotlight-symbol">
                    {getInitials(featuredDirector.name)}
                  </div>
                </div>

                <span className="bod-spotlight-position">
                  {featuredDirector.position}
                </span>

                <h3>{featuredDirector.name}</h3>
                <p>{featuredDirector.shortDescription}</p>

                <button
                  className="bod-card-link"
                  onClick={() => setSelectedDirector(featuredDirector)}
                >
                  View Profile →
                </button>
              </div>
            </div>

            <div className="bod-stats">
              <div className="bod-stat-card">
                <h3>{String(directors.length).padStart(2, '0')}</h3>
                <p>Board Members</p>
              </div>

              <div className="bod-stat-card">
                <h3>{String(committees.length).padStart(2, '0')}</h3>
                <p>Key Committees</p>
              </div>

              <div className="bod-stat-card">
                <h3>01</h3>
                <p>Shared Mission</p>
              </div>

              <div className="bod-stat-card">
                <h3>100%</h3>
                <p>Member-Focused</p>
              </div>
            </div>
          </div>
        </section>

        <section className="bod-chart-section" id="leadership-hierarchy">
          <div className="bod-container">
            <div className="bod-section-heading">
              <span className="bod-section-tag">Organizational Structure</span>
              <h2>Leadership Hierarchy</h2>
              <p>
                Click any board member to view their full profile. The chart
                reflects the cooperative&apos;s formal governance structure and chain
                of accountability.
              </p>
            </div>

            <HierarchyChart
              directors={directors}
              onSelect={setSelectedDirector}
            />
          </div>
        </section>

        <section className="bod-focus-section">
          <div className="bod-container">
            <div className="bod-section-heading">
              <span className="bod-section-tag">Core Governance Focus</span>
              <h2>What the Board Upholds</h2>
            </div>

            <div className="bod-focus-grid">
              {governanceFocus.map((item, index) => (
                <div className="bod-focus-card" key={index}>
                  <span className="bod-focus-number">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3>{item}</h3>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bod-committee-section">
          <div className="bod-container">
            <div className="bod-section-heading">
              <span className="bod-section-tag">Committee Structure</span>
              <h2>Governance Support Areas</h2>
            </div>

            <div className="bod-committee-grid">
              {committees.map((item, index) => (
                <div className="bod-committee-card" key={index}>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
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