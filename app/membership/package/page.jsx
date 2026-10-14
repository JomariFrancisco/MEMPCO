import Link from 'next/link';
import Navbar from '@/components/Navbar/Navbar';
import Footer from '@/components/Footer/Footer';
import '../membership.css';

const MEMBERSHIP_PACKAGES = [
  {
    number: '01',
    name: 'Associate Membership',
    description: 'For depositors',
    items: [
      ['Membership Fee', '₱100'],
      ['Share Capital', '₱100'],
      ['Regular Savings', '₱100'],
    ],
    total: '₱300',
  },
  {
    number: '02',
    name: 'Regular Membership',
    description: 'For loan applicants',
    items: [
      ['Membership Fee', '₱100'],
      ['Share Capital', '₱1,000'],
      ['Regular Savings', '₱100'],
    ],
    total: '₱1,200',
  },
];

export default function MembershipPackagePage() {
  return (
    <>
      <Navbar />

      <main className="membership-page membership-package-page">
        <section className="membership-package-hero">
          <div className="membership-shell membership-package-hero__inner">
            <img src="/Logos/Logo.png" alt="MEMPCO" />
            <div>
              <p className="membership-label">MEMPCO Membership</p>
              <h1>Membership Package</h1>
              <p className="membership-package-hero__text">
                A clear breakdown of the initial amounts for Associate and Regular Membership.
              </p>
            </div>
          </div>
        </section>

        <section className="membership-package-section" aria-labelledby="membership-package-heading">
          <div className="membership-shell">
            <header className="membership-package-section__header">
              <p className="membership-label">Fees and inclusions</p>
              <h2 id="membership-package-heading">Choose your membership type</h2>
              <p>Each package includes a membership fee, share capital, and regular savings.</p>
            </header>

            <div className="membership-package-options">
              {MEMBERSHIP_PACKAGES.map((membershipPackage) => (
                <article className="membership-package-option" key={membershipPackage.number}>
                  <header className="membership-package-option__header">
                    <span>{membershipPackage.number}</span>
                    <div>
                      <h3>{membershipPackage.name}</h3>
                      <p>{membershipPackage.description}</p>
                    </div>
                  </header>

                  <dl className="membership-package-breakdown">
                    {membershipPackage.items.map(([label, amount]) => (
                      <div className="membership-package-breakdown__row" key={label}>
                        <dt>{label}</dt>
                        <dd>{amount}</dd>
                      </div>
                    ))}
                  </dl>

                  <div className="membership-package-total">
                    <span>Total package amount</span>
                    <strong>{membershipPackage.total}</strong>
                  </div>
                </article>
              ))}
            </div>

            <p className="membership-package-note">
              Amounts are shown as provided in the membership package guide. Please confirm current fees with your nearest MEMPCO branch before payment.
            </p>

            <div className="membership-package-next">
              <div>
                <h2>Ready to apply?</h2>
                <p>Review the application steps and prepare your documents before visiting a branch.</p>
              </div>
              <div className="membership-package-actions">
                <Link href="/membership#membership-process" className="membership-button membership-button--quiet">
                  Application steps
                </Link>
                <a
                  href="/forms/members-application-form.pdf"
                  download
                  className="membership-button membership-button--primary"
                >
                  Download application form
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
