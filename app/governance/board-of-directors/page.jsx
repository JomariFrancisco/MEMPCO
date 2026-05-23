'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar/Navbar'
import Footer from '@/components/Footer/Footer'
import './board-of-directors.css'

const directors = [
  {
    id: 1,
    name: 'Nelida Villanueva Alegre',
    position: 'Chairperson',
    term: 'Current Term',
    committee: 'Board of Directors',
    image: '',
    shortDescription:
      "Provides overall leadership to the Board and ensures governance decisions remain aligned with the cooperative's long-term direction.",
    fullDescription:
      'The Chairperson leads the Board of Directors in establishing strategic direction, promoting sound governance, and ensuring that Board actions remain aligned with the mission, vision, and long-term priorities of the cooperative.',
  },
  {
    id: 2,
    name: 'Barbara Perez Saavedra',
    position: 'V-Chairperson',
    term: 'Current Term',
    committee: 'Board of Directors',
    image: '',
    shortDescription:
      'Supports the Chairperson and helps sustain leadership continuity, policy oversight, and effective Board coordination.',
    fullDescription:
      'The Vice Chairperson assists the Chairperson in Board leadership, supports governance continuity, and helps maintain alignment across priorities, committees, and institutional decisions.',
  },
  {
    id: 3,
    name: 'Armeline Bernardo Epan',
    position: 'Director',
    term: 'Current Term',
    committee: 'Board of Directors',
    image: '',
    shortDescription:
      "Contributes to policy oversight, strategic discussion, and member-centered leadership within the Board.",
    fullDescription:
      'As a Director, this Board member contributes to strategic planning, policy review, governance oversight, and decisions that support responsible cooperative growth.',
  },
  {
    id: 4,
    name: 'Marivic Reyes Rubio',
    position: 'Director',
    term: 'Current Term',
    committee: 'Board of Directors',
    image: '',
    shortDescription:
      'Supports Board deliberations, responsible governance, and decisions that protect the interests of members.',
    fullDescription:
      'As a Director, this Board member helps guide cooperative priorities through collaborative governance, accountability, and member-focused decision-making.',
  },
  {
    id: 5,
    name: 'Marilyn Laranjo Tee',
    position: 'Director',
    term: 'Current Term',
    committee: 'Board of Directors',
    image: '',
    shortDescription:
      'Promotes transparent, accountable, and service-oriented leadership as part of the Board.',
    fullDescription:
      'As a Director, this Board member supports governance review, strategic direction, and cooperative decisions grounded in transparency and accountability.',
  },
  {
    id: 6,
    name: 'Ma. Lileth Lledo Mendoza',
    position: 'Director',
    term: 'Current Term',
    committee: 'Board of Directors',
    image: '',
    shortDescription:
      'Supports policy development, strategic discussion, and member-centered leadership within the Board.',
    fullDescription:
      'As a Director, this Board member contributes to strategic planning, policy review, and member-focused governance while supporting responsible institutional growth.',
  },
  {
    id: 7,
    name: 'Florepess Oblimar Naval',
    position: 'Director',
    term: 'Current Term',
    committee: 'Board of Directors',
    image: '',
    shortDescription:
      'Contributes to collaborative governance and supports Board initiatives that strengthen service and sustainability.',
    fullDescription:
      'As a Director, this Board member helps guide the cooperative through collaborative governance and decisions that uphold service quality, accountability, and sustainability.',
  },
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
        <button type="button" className="bod-modal-close" onClick={onClose} aria-label="Close modal">
          &times;
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

              <div className="bod-hero-aside">
                <span className="bod-aside-kicker">Board Mandate</span>
                <h3>Formal governance oversight for member-centered growth.</h3>
                <p>
                  The Board provides policy direction, institutional accountability,
                  and long-term stewardship for the cooperative.
                </p>
              </div>
            </div>

            <div className="bod-hero-metrics" aria-label="Board overview">
              <div>
                <h3>{String(directors.length).padStart(2, '0')}</h3>
                <p>Board Members</p>
              </div>

              <div>
                <h3>{String(directors.filter((director) => director.position === 'Director').length).padStart(2, '0')}</h3>
                <p>Directors</p>
              </div>

              <div>
                <h3>01</h3>
                <p>Shared Mission</p>
              </div>

              <div>
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
              <h2>Leadership <em>Hierarchy</em></h2>
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

      </main>

      <Footer />
    </>
  )
}
