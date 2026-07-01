import Navbar from '@/components/Navbar/Navbar'
import Footer from '@/components/Footer/Footer'
import '../membership.css'

export default function PMESPage() {
  return (
    <>
      <Navbar />

      <main className="membership-page">
        <section className="membership-hero membership-hero--simple">
          <div className="membership-shell">
            <p className="membership-label">Pre-Membership Education Seminar</p>
            <h1>PMES</h1>
            <p>
              Attend MEMPCO&apos;s pre-membership orientation to understand the
              cooperative, membership responsibilities, available services, and
              the application process before completing membership.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
