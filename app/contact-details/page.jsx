import { Building2, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react'
import Navbar from '@/components/Navbar/Navbar'
import Footer from '@/components/Footer/Footer'
import './contact-details.css'

const generalEmail = 'inquiries@mempco.coop'

const contactBranches = [
  {
    name: 'Central Office',
    area: 'Area 1',
    type: 'Central Office',
    location: 'Zamboanga City',
    address: '3D3E HC Mktg. Bldg., Veterans Ave., Zamboanga City, 7000',
    phone: '(062) 991 7772',
    image: '/Branch%20Image/CENTRAL%20OFFICE.png',
    featured: true,
  },
  {
    name: 'Curuan Branch',
    area: 'Area 1',
    type: 'Branch',
    location: 'Zamboanga City',
    address: 'Riversite, Curuan, Zamboanga City, 7000',
    phone: '(062) 310-5075',
    image: '/Branch%20Image/CURUAN.png',
  },
  {
    name: 'Canelar Branch',
    area: 'Area 1',
    type: 'Branch',
    location: 'Zamboanga City',
    address: 'Unit A, B & C, Sia and Sons Bldg., Mayor Jaldon St., Canelar, Zamboanga City, 7000',
    phone: '(062) 308-5304 / (062) 993-9751',
    facility: 'With ATM Machine',
    image: '/Branch%20Image/CANELAR.png',
  },
  {
    name: 'Veterans Branch',
    area: 'Area 1',
    type: 'Branch',
    location: 'Zamboanga City',
    address: 'Door 2 & 3 Nationwide Appliance Bldg., Veterans Ave., Zamboanga City, 7000',
    phone: '(062) 993-9764 / 308-5215',
    image: '/Branch%20Image/VETERANS.png',
  },
  {
    name: 'Culianan Branch',
    area: 'Area 1',
    type: 'Branch',
    location: 'Zamboanga City',
    address: 'MEMPCO Bldg., MCLL Highway, Culianan, Zamboanga City, 7000',
    phone: '(062) 993-9756 / (062) 310-6575',
    facility: 'With ATM Machine',
    image: '/Branch%20Image/Culianan.png',
  },
  {
    name: 'Ayala Branch',
    area: 'Area 1',
    type: 'Branch',
    location: 'Zamboanga City',
    address: 'MEMPCO Bldg., Zone VI, Ayala, Zamboanga City, 7000',
    phone: '(062) 993-8665 / (062) 308-2691',
    facility: 'With ATM Machine',
    image: '/Branch%20Image/AYALA.png',
  },
  {
    name: 'Nunez Extension Branch',
    area: 'Area 1',
    type: 'Extension Branch',
    location: 'Zamboanga City',
    address: 'HC Marketing Bldg., Nunez Ext., Camino Nuevo, Zamboanga City, 7000',
    phone: '(062) 308-1243 / (062) 993-6235',
    image: '/Branch%20Image/NUNEZ.png',
  },
  {
    name: 'Vitali Satellite Office',
    area: 'Area 1',
    type: 'Satellite Office',
    location: 'Zamboanga City',
    address: 'Unit 1 & 2, Solmayor Bldg., Mialim, Vitali, Zamboanga City, 7000',
    phone: 'N/A',
    image: '/Branch%20Image/VITALI.png',
  },
  {
    name: 'La Hermosa Funeraria de MEMPCO',
    area: 'Area 1',
    type: 'Funeraria',
    location: 'Zamboanga City',
    address: 'Zone 6, Boalan (fronting Golden Haven Memorial Park), Zamboanga City, 7000',
    phone: '(062) 982 0594 / 0966-661-6662',
    image: '/Branch%20Image/LA%20HERMOSA.png',
  },
  {
    name: 'Ipil Branch',
    area: 'Area 2',
    type: 'Branch',
    location: 'Ipil, Zamboanga Sibugay',
    address: 'EG-VRYE Bldg., Purok Dahlia, Lower Taway, Ipil, Zamboanga Sibugay, 7001',
    phone: '(062) 957-3519',
    image: '/Branch%20Image/IPIL.png',
  },
  {
    name: 'Dipolog Branch',
    area: 'Area 2',
    type: 'Branch',
    location: 'Dipolog City, Zamboanga del Norte',
    address: 'RC Bldg., ORMSU Highway, Tumo, Dipolog City, Zamboanga del Norte, 7100',
    phone: '(065) 908 1059',
    image: '/Branch%20Image/DIPOLOG.png',
  },
  {
    name: 'Pagadian Branch',
    area: 'Area 2',
    type: 'Branch',
    location: 'Pagadian City, Zamboanga del Sur',
    address: 'Pescador Bldg., FS Pajares Ave., San Jose District, Pagadian City, Zamboanga del Sur, 7016',
    phone: '(062) 947-0722',
    image: '/Branch%20Image/PAGADIAN.png',
  },
]

const featuredOffice = contactBranches.find((branch) => branch.featured)
const branchCards = contactBranches.filter((branch) => !branch.featured)
const atmCount = contactBranches.filter((branch) => branch.facility).length

const statCards = [
  { value: contactBranches.length, label: 'Service locations' },
  { value: '2', label: 'Operational areas' },
  { value: atmCount, label: 'ATM-enabled branches' },
]

function getPhoneHref(phone) {
  const firstNumber = phone?.split('/')[0]?.replace(/[^\d+]/g, '')
  return firstNumber && firstNumber !== 'NA' ? `tel:${firstNumber}` : null
}

function ContactRow({ icon: Icon, label, value, href }) {
  const content = (
    <>
      <span className="contact-row-icon" aria-hidden="true">
        <Icon size={17} strokeWidth={2.2} />
      </span>
      <span className="contact-row-copy">
        <span>{label}</span>
        <strong>{value}</strong>
      </span>
    </>
  )

  return href ? (
    <a className="contact-row" href={href}>
      {content}
    </a>
  ) : (
    <div className="contact-row">{content}</div>
  )
}

function BranchVisual({ branch }) {
  if (branch.image) {
    return (
      <img
        src={branch.image}
        alt={`${branch.name} office facade`}
        className="contact-card-image"
        loading="lazy"
      />
    )
  }

  return (
    <div className="contact-card-fallback" aria-hidden="true">
      <Building2 size={34} strokeWidth={1.8} />
      <span>MEMPCO</span>
    </div>
  )
}

function BranchCard({ branch }) {
  const phoneHref = getPhoneHref(branch.phone)

  return (
    <article className="contact-card">
      <div className="contact-card-media">
        <BranchVisual branch={branch} />
        <div className="contact-card-badges">
          <span>{branch.area}</span>
          {branch.facility && <span className="is-red">ATM</span>}
        </div>
      </div>

      <div className="contact-card-body">
        <div className="contact-card-heading">
          <p>{branch.type}</p>
          <h2>{branch.name}</h2>
          <span>{branch.location}</span>
        </div>

        <div className="contact-card-details">
          <ContactRow icon={MapPin} label="Address" value={branch.address} />
          <ContactRow icon={Phone} label="Telephone" value={branch.phone} href={phoneHref} />
          <ContactRow icon={Mail} label="Email" value={generalEmail} href={`mailto:${generalEmail}`} />
        </div>
      </div>
    </article>
  )
}

export default function ContactDetailsPage() {
  return (
    <>
      <Navbar />

      <main className="contact-details-page">
        <section className="contact-details-hero">
          <div className="contact-details-hero-copy">
            <h1>Contact details</h1>
            <p>
              A clean reference for MEMPCO branch addresses, phone numbers, and
              member-service contact channels across Area 1 and Area 2.
            </p>
          </div>

          <div className="contact-hero-panel" aria-label="Primary contact details">
            <div className="contact-hero-panel-media">
              <img
                src={featuredOffice.image}
                alt={`${featuredOffice.name} building`}
                loading="eager"
              />
            </div>
            <span className="contact-hero-panel-label">
              <ShieldCheck size={16} strokeWidth={2.2} />
              Central contact
            </span>
            <h2>{featuredOffice.name}</h2>
            <ContactRow icon={MapPin} label="Main office" value={featuredOffice.address} />
            <ContactRow icon={Phone} label="Telephone" value={featuredOffice.phone} href={getPhoneHref(featuredOffice.phone)} />
            <ContactRow icon={Mail} label="Email" value={generalEmail} href={`mailto:${generalEmail}`} />
          </div>
        </section>

        <section className="contact-stats" aria-label="MEMPCO contact summary">
          {statCards.map((item) => (
            <div className="contact-stat-card" key={item.label}>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
          ))}
        </section>

        <section className="contact-directory" aria-labelledby="contact-directory-title">
          <div className="contact-directory-head">
            <p className="contact-details-kicker">Branch Contacts</p>
            <h2 id="contact-directory-title">Office directory</h2>
          </div>

          <div className="contact-details-grid" aria-label="MEMPCO branch contact details">
            {branchCards.map((branch) => (
              <BranchCard branch={branch} key={branch.name} />
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
