import Navbar from '@/components/Navbar/Navbar'
import Footer from '@/components/Footer/Footer'
import '../membership.css'

export default function MembershipPackagePage() {
  return (
    <>
      <Navbar />

      <main className="membership-page">
        <section className="membership-hero membership-hero--simple">
          <div className="membership-shell">
            <p className="membership-label">Membership Guide</p>
            <h1>Membership Package</h1>
            <p>
              Membership fees, minimum share capital, and required inclusions
              may depend on current MEMPCO policy. Please confirm the latest
              package details with the main office before applying.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
