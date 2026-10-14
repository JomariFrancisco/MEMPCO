import Link from 'next/link'
import Navbar from '@/components/Navbar/Navbar'
import Footer from '@/components/Footer/Footer'
import './committee.css'

const committees = [
  {
    id: 'audit',
    name: 'Audit Committee',
    members: [
      'Mary Ann Betulfo Eubank',
      'Leah Flores Sulong',
      'Jocelyn Enriquez Samsula',
    ],
  },
  {
    id: 'election',
    name: 'Election Committee',
    members: [
      'Benjie Atienza Albarracin',
      'Angelita Revilla Alaban',
      'Jossie Escudero Ramillano',
    ],
  },
  {
    id: 'mediation-conciliation',
    name: 'Mediation & Conciliation Committee',
    members: [
      'Melani Bartolome Cabato',
      'Ma. Serina Pedro Nalzaro',
      'Aurora Wong Solamillo',
    ],
  },
  {
    id: 'ethics',
    name: 'Ethics Committee',
    members: [
      'Maricel Candado Batal',
      'Jocelyn Gacuma',
      'Maria Luisa Narciso Esposo',
    ],
  },
  {
    id: 'education-training',
    name: 'Education & Training Committee',
    members: [
      'Barbara Saavedra',
      'Analiza De Leon Jimenez',
      'Jocelyn Adorada Reyes',
    ],
  },
  {
    id: 'gender-development',
    name: 'Gender & Development Committee',
    members: [
      'Armeline Bernardo Epan',
      'Adeleine Ballesteros Concepcion',
    ],
  },
]

function getInitials(name) {
  const words = name.trim().split(/\s+/)
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
}

export default function CommitteePage() {
  return (
    <>
      <Navbar />

      <main className="committee-page">
        <div className="committee-page__container">
          <nav className="committee-breadcrumb" aria-label="Breadcrumb">
            <Link href="/about">About</Link>
            <span>/</span>
            <span>Governance</span>
            <span>/</span>
            <span>Committee</span>
          </nav>

          <header className="committee-page__heading">
            <span className="committee-page__eyebrow">Governance</span>
            <h1>Committee</h1>
          </header>

          <div className="committee-groups">
            {committees.map((committee) => (
              <section
                className="committee-group"
                key={committee.id}
                aria-labelledby={`committee-${committee.id}`}
              >
                <h2 id={`committee-${committee.id}`}>{committee.name}</h2>
                <div className="committee-officers-grid">
                  {committee.members.map((member) => (
                    <article className="committee-officer-card" key={member}>
                      <div className="committee-officer-card__portrait" aria-hidden="true">
                        <span>{getInitials(member)}</span>
                      </div>
                      <p className="committee-officer-card__role">Committee Member</p>
                      <h3>{member}</h3>
                      <p className="committee-officer-card__committee">{committee.name}</p>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </>
  )
}
