import Navbar from '@/components/Navbar/Navbar'
import Footer from '@/components/Footer/Footer'
import './promos.css'

export default function PromosPage() {
  return (
    <>
      <Navbar />

      <main className="promos-page">
        <section className="promos-hero">
          <p>What&apos;s New</p>
          <h1>Promos</h1>
          <span>
            Current MEMPCO promos and special announcements will be posted here
            once official updates are available.
          </span>
        </section>
      </main>

      <Footer />
    </>
  )
}
