'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar/Navbar'
import Footer from '@/components/Footer/Footer'
import './management.css'

/* ─── Data ──────────────────────────────────────────────── */

const ceo = {
  id: 'ceo',
  initials: 'ESD',
  name: 'Eleonor Santiago-Dillena',
  title: 'Chief Executive Officer',
  label: 'Executive Leadership',
  category: 'Executive Management',
  photo: '',
}

const execSec = {
  id: 'exec-sec',
  initials: 'LJB',
  name: 'Liezl Jade A. Bernardo',
  title: 'Executive Secretary',
  label: 'Office of the CEO',
  category: 'Executive Support',
  photo: '',
}

const audit = {
  id: 'audit',
  initials: 'SSS',
  name: 'Sherrydee-Ann S. Sarabi',
  title: 'Audit',
  label: 'Internal Audit',
  category: 'Governance & Assurance',
  photo: '',
}

const divisions = [
  {
    id: 'div-1',
    initials: 'MSE',
    name: 'Melodyna S. Erica',
    title: 'Chief Finance & Admin Officer',
    label: 'Division 01',
    category: 'Finance & Administration',
    photo: '',
    reports: [
      {
        id: 'js',
        initials: 'JS',
        name: 'Jonathan Sumampat',
        title: 'Information Communication & Technology',
        label: 'Div 01',
        category: 'Department Leadership',
        photo: '',
      },
      {
        id: 'jsp',
        initials: 'JSP',
        name: 'Jennylyn S. Paragas',
        title: 'Finance',
        label: 'Div 01',
        category: 'Department Leadership',
        photo: '',
      },
      {
        id: 'jsa',
        initials: 'JSA',
        name: 'Jonalyn S. Andrade',
        title: 'Accounting',
        label: 'Div 01',
        category: 'Department Leadership',
        photo: '',
      },
      {
        id: 'jet',
        initials: 'JET',
        name: 'Jubie E. Tanudra',
        title: 'Admin & General Support Services',
        label: 'Div 01',
        category: 'Department Leadership',
        photo: '',
      },
      {
        id: 'rrt',
        initials: 'RRT',
        name: 'Richard R. Torlao',
        title: 'Marketing',
        label: 'Div 01',
        category: 'Department Leadership',
        photo: '',
      },
      {
        id: 'ctb',
        initials: 'CTB',
        name: 'Cecelyn T. Balagtas',
        title: 'MRDSS',
        label: 'Div 01',
        category: 'Department Leadership',
        photo: '',
      },
      {
        id: 'amv',
        initials: 'AMV',
        name: 'Alma M. Vidal',
        title: 'Enterprise Development Services',
        label: 'Div 01',
        category: 'Department Leadership',
        photo: '',
      },
    ],
  },
  {
    id: 'div-2',
    initials: 'ESA',
    name: 'Evelyn S. Alvarez',
    title: 'Chief Operating Officer – Savings & Credit',
    label: 'Division 02',
    category: 'Savings & Credit Operations',
    photo: '',
    reports: [
      {
        id: 'ebd',
        initials: 'EBD',
        name: 'Erwin B. Dumagay',
        title: 'Area Manager 1',
        label: 'Div 02',
        category: 'Area Operations',
        photo: '',
      },
      {
        id: 'frf',
        initials: 'FRF',
        name: 'Finlan R. Flores',
        title: 'Area Manager 2',
        label: 'Div 02',
        category: 'Area Operations',
        photo: '',
      },
      {
        id: 'jvo',
        initials: 'JVO',
        name: 'John Verlie O. Empeynado',
        title: 'Miles Program',
        label: 'Div 02',
        category: 'Program Operations',
        photo: '',
      },
    ],
  },
  {
    id: 'div-3',
    initials: 'MLT',
    name: 'Ma. Lovella P. Torlao',
    title: "Chief People's Legal & Compliance Officer",
    label: 'Division 03',
    category: 'People, Legal & Compliance',
    photo: '',
    reports: [
      {
        id: 'gra',
        initials: 'GRA',
        name: 'Atty.Grace Angelie R. Asio-Salih',
        title: 'Legal & Compliance',
        label: 'Div 03',
        category: 'Department Leadership',
        photo: '',
      },
      {
        id: 'cth',
        initials: 'CTH',
        name: 'Candy T. Hofileña',
        title: 'Human Resource & Development',
        label: 'Div 03',
        category: 'Department Leadership',
        photo: '',
      },
      {
        id: 'ivm',
        initials: 'IVM',
        name: 'Ibie V. Maxian',
        title: 'Human Resource & Development Supervisor',
        label: 'Div 03',
        category: 'Department Leadership',
        photo: '',
      },
    ],
  },
  {
    id: 'div-4',
    initials: 'ALI',
    name: 'Anna Lisa E. Isa',
    title: 'Chief Operating Officer for Allied Services',
    label: 'Division 04',
    category: 'Allied Services Operations',
    photo: '',
    reports: [
      {
        id: 'sib',
        initials: 'AAM',
        name: 'Aries A. Minimo',
        title: 'Funeral Services',
        label: 'Div 04',
        category: 'Service Operations',
        photo: '',
      },
      {
        id: 'rld',
        initials: 'RLD',
        name: 'Remelier L. Deloña',
        title: 'Transport Services',
        label: 'Div 04',
        category: 'Service Operations',
        photo: '',
      },
      {
        id: 'aam',
        initials: 'SIB',
        name: 'Sheena I. Bajao',
        title: 'Coop Assurance Services',
        label: 'Div 04',
        category: 'Service Operations',
        photo: '',
      },
    ],
  },
]

const branchManagers = [
  {
    id: 'cu',
    initials: 'CU',
    label: 'Curuan Branch',
    title: 'Branch / Unit Manager',
    category: 'Branch Operations',
    photo: '',
  },
  {
    id: 'ca',
    initials: 'CA',
    label: 'Canelar Branch',
    title: 'Branch / Unit Manager',
    category: 'Branch Operations',
    photo: '',
  },
  {
    id: 'vb',
    initials: 'VB',
    label: 'Veterans Branch',
    title: 'Branch / Unit Manager',
    category: 'Branch Operations',
    photo: '',
  },
  {
    id: 'cl',
    initials: 'CL',
    label: 'Culianan Branch',
    title: 'Branch / Unit Manager',
    category: 'Branch Operations',
    photo: '',
  },
  {
    id: 'ay',
    initials: 'AY',
    label: 'Ayala Branch',
    title: 'Branch / Unit Manager',
    category: 'Branch Operations',
    photo: '',
  },
  {
    id: 'ne',
    initials: 'NE',
    label: 'Nunez Extension Branch',
    title: 'Branch / Unit Manager',
    category: 'Extension Branch Operations',
    photo: '',
  },
  {
    id: 'vi',
    initials: 'VI',
    label: 'Vitali Satellite Office',
    title: 'Branch / Unit Manager',
    category: 'Satellite Office Operations',
    photo: '',
  },
  {
    id: 'lh',
    initials: 'LH',
    label: 'La Hermosa Funeraria',
    title: 'Branch / Unit Manager',
    category: 'Allied Services Unit',
    photo: '',
  },
  {
    id: 'ip',
    initials: 'IP',
    label: 'Ipil Branch',
    title: 'Branch / Unit Manager',
    category: 'Branch Operations',
    photo: '',
  },
  {
    id: 'dp',
    initials: 'DP',
    label: 'Dipolog Branch',
    title: 'Branch / Unit Manager',
    category: 'Branch Operations',
    photo: '',
  },
  {
    id: 'pg',
    initials: 'PG',
    label: 'Pagadian Branch',
    title: 'Branch / Unit Manager',
    category: 'Branch Operations',
    photo: '',
  },
]

/* ─── Small components ──────────────────────────────────── */

function Avatar({ initials, size = 'md' }) {
  return <div className={`oc-avatar oc-avatar--${size}`}>{initials}</div>
}

function NodeCard({ item, size = 'md', onClick, dashed = false }) {
  return (
    <button
      type="button"
      className={`oc-node oc-node--${size}${dashed ? ' oc-node--dashed' : ''}`}
      onClick={() => onClick?.(item)}
    >
      <Avatar initials={item.initials} size={size} />
      {item.name && <p className="oc-node-name">{item.name}</p>}
      <p className="oc-node-title">{item.title}</p>
    </button>
  )
}

/* ─── Clean Modal ───────────────────────────────────────── */

function Modal({ leader, onClose }) {
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    setImageError(false)
  }, [leader?.id])

  const photo = leader.photo || leader.image || leader.imageUrl
  const displayName = leader.name || leader.label || 'Management Profile'
  const displayTitle = leader.title || 'Leadership Assignment'
  const displayAssignment = leader.label || leader.category || 'MEMPCO Management'
  const displayCategory = leader.category || 'Management'
  const altText = displayName

  return (
    <div className="mgmt-modal" onClick={onClose} role="dialog" aria-modal="true">
      <div className="mgmt-modal-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="mgmt-modal-close" onClick={onClose} aria-label="Close">
          &times;
        </button>

        <div className="mgmt-modal-photo-wrap">
          {photo && !imageError ? (
            <img
              className="mgmt-modal-photo"
              src={photo}
              alt={altText}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="mgmt-modal-photo-fallback">
              {leader.initials}
            </div>
          )}
        </div>

        <div className="mgmt-modal-info">
          <span className="mgmt-modal-kicker">{displayCategory}</span>
          <h2>{displayName}</h2>
          <p className="mgmt-modal-title">{displayTitle}</p>

          <div className="mgmt-modal-mini-details">
            <div>
              <span>Assignment</span>
              <strong>{displayAssignment}</strong>
            </div>

            <div>
              <span>Reference</span>
              <strong>{leader.initials}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Page ──────────────────────────────────────────────── */

export default function ManagementPage() {
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    document.body.style.overflow = selected ? 'hidden' : ''

    return () => {
      document.body.style.overflow = ''
    }
  }, [selected])

  return (
    <>
      <Navbar />

      {selected && <Modal leader={selected} onClose={() => setSelected(null)} />}

      <main className="mgmt-page">
        {/* ── Hero ─────────────────────────────────────────── */}
        <section className="mgmt-hero">
          <div className="mgmt-container">
            <div className="mgmt-breadcrumb">
              <Link href="/governance">Governance</Link>
              <span>/</span>
              <span>Management</span>
            </div>

            <div className="mgmt-hero-grid">
              <div className="mgmt-hero-copy">
                <span className="mgmt-eyebrow">Operational Leadership</span>
                <h1>
                  Executive <em>Management</em>
                </h1>

                <p className="mgmt-hero-subtitle">
                  Clear structure, coordinated execution, and member-centered operational leadership across the organization.
                </p>
                <div className="mgmt-hero-actions">
                  <a href="#management-structure" className="mgmt-btn-primary">
                    View Structure
                  </a>
                  <Link href="/governance" className="mgmt-btn-secondary">
                    View Overview
                  </Link>
                </div>
              </div>

              <div className="mgmt-hero-aside">
                <span className="mgmt-aside-kicker">Management Mandate</span>
                <h3>Coordinated execution across divisions, areas, and branches.</h3>
                <p>
                  Management translates institutional direction into organized
                  operations, accountable service delivery, and continuity across
                  all operating units.
                </p>
              </div>
            </div>

            <div className="mgmt-hero-metrics" aria-label="Management overview">
              <div>
                <h3>01</h3>
                <p>Chief Executive Officer</p>
              </div>

              <div>
                <h3>04</h3>
                <p>Division Chiefs</p>
              </div>

              <div>
                <h3>02</h3>
                <p>Area Managers</p>
              </div>

              <div>
                <h3>11</h3>
                <p>Branch / Unit Leaders</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Org Chart ────────────────────────────────────── */}
        <section className="oc-section" id="management-structure">
          <div className="oc-section-head">
            <span className="mgmt-tag">Organizational Structure</span>
            <h2>Management <em>Hierarchy</em></h2>
            <p>One Chief Executive Officer, four Division Chiefs, two Area Managers, and eleven branch-based operating units.</p>
          </div>

          <div className="oc-wrap">
            <div className="oc-row oc-row--top">
              <div className="oc-ceo-group">
                <NodeCard item={ceo} size="lg" onClick={setSelected} />

                <div className="oc-h-connector">
                  <div className="oc-h-line" />
                  <NodeCard item={execSec} size="sm" onClick={setSelected} />
                </div>
              </div>
            </div>

            <div className="oc-trunk" />

            <div className="oc-top-bar">
              <div className="oc-top-bar-line" />
            </div>

            <div className="oc-row oc-row--divs">
              {divisions.map((div) => (
                <div key={div.id} className="oc-div-col">
                  <div className="oc-leg" />
                  <NodeCard item={div} size="md" onClick={setSelected} />

                  {div.reports && div.reports.length > 0 && (
                    <>
                      <div className="oc-leg oc-leg--short" />

                      <div className={`oc-sub-row oc-sub-row--${div.reports.length}`}>
                        {div.reports.map((r) => (
                          <NodeCard key={r.id} item={r} size="xs" onClick={setSelected} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ))}

              <div className="oc-div-col oc-div-col--audit">
                <div className="oc-leg oc-leg--dashed" />
                <NodeCard item={audit} size="md" onClick={setSelected} dashed />
              </div>
            </div>
          </div>
        </section>

        {/* ── Branch Managers ──────────────────────────────── */}
        <section className="branch-section">
          <div className="mgmt-container branch-container">
            <div className="mgmt-section-head">
              <span className="mgmt-tag">Branch Operations</span>
              <h2>Branch &amp; Unit <em>Managers</em></h2>
              <p>Eleven branch and unit managers provide localized operational leadership across all service areas and satellite offices.</p>
            </div>

            <div className="branch-grid">
              {branchManagers.map((bm) => (
                <button
                  type="button"
                  key={bm.id}
                  className="branch-card"
                  onClick={() => setSelected(bm)}
                >
                  <div className="branch-avatar">{bm.initials}</div>

                  <div className="branch-info">
                    <p className="branch-label">{bm.label}</p>
                    <p className="branch-title">{bm.title}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Operational Focus ─────────────────────────────── */}
      </main>

      <Footer />
    </>
  )
}
