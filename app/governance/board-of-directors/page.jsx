'use client'

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
    image: '/BoardOfDirectors/Nelida%20Villanueva%20Alegre.png',
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
    image: '/BoardOfDirectors/Barbara%20Perez%20Saavedra.png',
    portraitEmphasis: true,
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
    image: '/BoardOfDirectors/Armeline%20Bernardo%20Epan.png',
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
    image: '/BoardOfDirectors/Marivic%20Reyes%20Rubio.png',
    portraitEmphasis: true,
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
    image: '/BoardOfDirectors/Marilyn%20Laranjo%20Tee.png',
    portraitEmphasis: true,
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
    image: '/BoardOfDirectors/Ma.%20Lileth%20Lledo%20Mendoza.png',
    portraitEmphasis: true,
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
    image: '/BoardOfDirectors/Florepess%20Oblimar%20Naval.png',
    portraitEmphasis: true,
    shortDescription:
      'Contributes to collaborative governance and supports Board initiatives that strengthen service and sustainability.',
    fullDescription:
      'As a Director, this Board member helps guide the cooperative through collaborative governance and decisions that uphold service quality, accountability, and sustainability.',
  },
]

const officers = [
  {
    id: 'secretary',
    name: 'Milabel Juaton Rojas',
    position: 'Coop Secretary',
    term: 'Current Term',
    committee: 'Board of Directors',
  },
  {
    id: 'treasurer',
    name: 'Miraflor Rebadomia Aballe',
    position: 'Coop Treasurer',
    term: 'Current Term',
    committee: 'Board of Directors',
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

function ChartNode({ director }) {
  return (
    <div className="bod-chart-node bod-board-node">
      <div className="bod-node-card">
        <div
          className={`bod-node-avatar bod-node-avatar--md${director.image ? ' bod-node-avatar--photo' : ''}${director.portraitEmphasis ? ' bod-node-avatar--emphasized' : ''}`}
        >
          {director.image ? (
            <img src={director.image} alt={director.name} />
          ) : (
            getInitials(director.name)
          )}
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

function BoardComposition({ directors, officers }) {
  const leadership = directors.slice(0, 2)
  const boardDirectors = directors.slice(2)

  return (
    <div className="bod-chart-wrap">
      <div className="bod-chart-tier bod-chart-tier--leadership" role="group" aria-label="Chairperson and Vice Chairperson">
        {leadership.map((director) => (
          <ChartNode key={director.id} director={director} />
        ))}
      </div>

      <div className="bod-chart-tier bod-chart-tier--directors" role="group" aria-label="Five Board Directors">
        {boardDirectors.map((director) => (
          <ChartNode key={director.id} director={director} />
        ))}
      </div>

      <div className="bod-chart-tier bod-chart-tier--officers" role="group" aria-label="Cooperative Secretary and Treasurer">
        {officers.map((officer) => (
          <ChartNode key={officer.id} director={officer} />
        ))}
      </div>
    </div>
  )
}

export default function BoardOfDirectorsPage() {
  return (
    <>
      <Navbar />

      <main className="bod-page">
        <section className="bod-chart-section" id="board-composition">
          <div className="bod-container">
            <div className="bod-breadcrumb">
              <Link href="/about">About</Link>
              <span>/</span>
              <span>Governance</span>
              <span>/</span>
              <span>Board of Directors</span>
            </div>

            <div className="bod-section-heading">
              <span className="bod-section-tag">Board Composition</span>
              <h1 className="bod-board-title">Board of Directors</h1>
            </div>

            <BoardComposition directors={directors} officers={officers} />
          </div>
        </section>

      </main>

      <Footer />
    </>
  )
}
