'use client'

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
        title: 'Member Enterprise Development Service',
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
        title: 'Human Resource Head',
        label: 'Div 03',
        category: 'Department Leadership',
        photo: '',
      },
      {
        id: 'ivm',
        initials: 'IVM',
        name: 'Ibie V. Maxian',
        title: 'Human Resource Supervisor - EDU',
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

const chiefs = ['div-2', 'div-3', 'div-4', 'div-1'].map((id) =>
  divisions.find((division) => division.id === id)
)

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

const areaManagers = [
  divisions[1].reports.find((person) => person.id === 'ebd'),
  divisions[1].reports.find((person) => person.id === 'frf'),
]

const areaOneBranches = branchManagers.filter(({ id }) =>
  ['cu', 'ca', 'vb', 'cl', 'ay', 'vi'].includes(id)
)
const areaOneIndependentUnits = branchManagers.filter(({ id }) => ['ne', 'lh'].includes(id))
const areaTwoBranches = branchManagers.filter(({ id }) => ['ip', 'dp', 'pg'].includes(id))

/* ─── Small components ──────────────────────────────────── */

function Avatar({ item, size = 'md' }) {
  return (
    <div className={`oc-avatar oc-avatar--${size} management-node-portrait${item.photo ? ' has-photo' : ''}`}>
      {item.photo ? <img src={item.photo} alt={item.name} /> : <span>{item.initials}</span>}
    </div>
  )
}

function NodeCard({ item, size = 'md', dashed = false }) {
  return (
    <article className={`oc-node oc-node--${size}${dashed ? ' oc-node--dashed' : ''}`}>
      <Avatar item={item} size={size} />
      <p className="oc-node-title management-node-role">{item.title}</p>
      {item.name && <p className="oc-node-name">{item.name}</p>}
      <p className="oc-node-title management-node-subtitle">{item.category || item.label}</p>
    </article>
  )
}

function BranchPortrait({ item }) {
  const altText = item.name || item.label || item.title

  return (
    <div className={`branch-avatar branch-portrait${item.photo ? ' has-photo' : ''}`}>
      {item.photo ? <img src={item.photo} alt={altText} /> : <span>{item.initials}</span>}
    </div>
  )
}

function BranchCard({ branch }) {
  return (
    <article className="branch-card">
      <BranchPortrait item={branch} />
      <div className="branch-info">
        <p className="branch-title branch-role">{branch.title}</p>
        <p className="branch-label">{branch.label}</p>
        <p className="branch-title branch-subtitle">{branch.category}</p>
      </div>
    </article>
  )
}

function AreaManagerCard({ manager }) {
  return (
    <article className="branch-card area-manager-card">
      <BranchPortrait item={manager} />
      <div className="branch-info">
        <p className="branch-title branch-role">{manager.title}</p>
        <p className="branch-label">{manager.name}</p>
        <p className="branch-title branch-subtitle">{manager.category}</p>
      </div>
    </article>
  )
}

/* ─── Clean Modal ───────────────────────────────────────── */

/* ─── Page ──────────────────────────────────────────────── */

export default function ManagementPage() {
  return (
    <>
      <Navbar />

      <main className="mgmt-page">
        {/* ── Org Chart ────────────────────────────────────── */}
        <section className="oc-section" id="management-structure">
          <div className="mgmt-container">
            <div className="mgmt-breadcrumb">
              <Link href="/about">About</Link>
              <span>/</span>
              <span>Governance</span>
              <span>/</span>
              <span>Management</span>
            </div>
          </div>

          <div className="oc-section-head">
            <span className="mgmt-tag">Management Team</span>
            <h1 className="management-page-title">Management</h1>
          </div>

          <div className="oc-wrap">
            <div className="management-executive" aria-label="Chief Executive Officer">
              <NodeCard item={ceo} size="md" />
            </div>
            <div className="management-leadership-grid" aria-label="Division chiefs">
              {chiefs.map((div) => (
                <NodeCard key={div.id} item={div} size="md" />
              ))}
            </div>
          </div>
        </section>

        {/* ── Branch Managers ──────────────────────────────── */}
        <section className="branch-section">
          <div className="mgmt-container branch-container">
            <div className="mgmt-section-head">
              <span className="mgmt-tag">Branch Operations</span>
              <h2>Branch &amp; Unit <em>Managers</em></h2>
            </div>

            <div className="branch-areas">
              <section className="branch-area" aria-labelledby="area-one-title">
                <div className="branch-area-heading">
                  <span className="mgmt-tag">Area 1</span>
                  <h3 id="area-one-title">Area 1 Operations</h3>
                </div>

                <div className="area-manager-row">
                  <AreaManagerCard manager={areaManagers[0]} />
                </div>

                <div className="area-branch-group">
                  <div className="branch-grid branch-area-grid">
                    {areaOneBranches.map((branch) => <BranchCard key={branch.id} branch={branch} />)}
                  </div>
                </div>

                <div className="area-branch-group area-independent-group">
                  <h4>Other Area 1 Units</h4>
                  <div className="branch-grid branch-independent-grid">
                    {areaOneIndependentUnits.map((branch) => <BranchCard key={branch.id} branch={branch} />)}
                  </div>
                </div>
              </section>

              <section className="branch-area" aria-labelledby="area-two-title">
                <div className="branch-area-heading">
                  <span className="mgmt-tag">Area 2</span>
                  <h3 id="area-two-title">Area 2 Operations</h3>
                </div>

                <div className="area-manager-row">
                  <AreaManagerCard manager={areaManagers[1]} />
                </div>

                <div className="area-branch-group">
                  <div className="branch-grid branch-area-grid">
                    {areaTwoBranches.map((branch) => <BranchCard key={branch.id} branch={branch} />)}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </section>

        {/* ── Operational Focus ─────────────────────────────── */}
      </main>

      <Footer />
    </>
  )
}
