'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar/Navbar';
import Footer from '@/components/Footer/Footer';
import './membership.css';

const MEMBERSHIP_STEPS = [
  {
    number: '01',
    title: 'Prepare your requirements',
    text: 'Bring a valid government-issued ID, proof of billing, and two recent 2×2 ID pictures.',
  },
  {
    number: '02',
    title: 'Visit the main office',
    text: 'Go to the MEMPCO main office at 3D–3E HC Marketing Building, Zamboanga City, from Monday to Friday, 8:00 AM to 4:00 PM.',
  },
  {
    number: '03',
    title: 'Complete the application',
    text: 'Fill out the Member Application Form with your personal, civil status, beneficiary, spouse, employment, or business information.',
  },
  {
    number: '04',
    title: 'Pay the required fees',
    text: 'Pay the applicable membership fee and minimum initial share capital. Confirm the current amounts with the MEMPCO office before payment.',
  },
];

const PREPARATION_ITEMS = [
  'Valid government-issued ID',
  'Latest proof of billing, such as a water or electric bill',
  'Two recent 2×2 ID pictures',
  'Personal information and civil status details',
  'Spouse and beneficiary details, when applicable',
  'Employment or business information',
];

const TERMS = [
  {
    title: 'Purpose of this page',
    text: 'This page provides general information about MEMPCO membership. It does not constitute automatic approval, a binding offer, or a guarantee of membership.',
  },
  {
    title: 'Accuracy of information',
    text: 'You agree to provide complete, accurate, and current information during any membership inquiry or application. False or misleading information may result in delay, rejection, or cancellation.',
  },
  {
    title: 'Eligibility and approval',
    text: 'Membership remains subject to MEMPCO policies, documentary requirements, orientation, verification, applicable fees, and the approval process in effect at the time of application.',
  },
  {
    title: 'Privacy and data use',
    text: 'Information submitted during the membership process may be collected, reviewed, stored, and used by authorized MEMPCO personnel for verification, communication, compliance, and member administration.',
  },
  {
    title: 'Updates and official guidance',
    text: 'Requirements, fees, benefits, and procedures may change. Information provided directly by an authorized MEMPCO office takes precedence over general information shown on this page.',
  },
  {
    title: 'Member responsibilities',
    text: 'Approved members are expected to observe MEMPCO policies, fulfill applicable financial and documentary obligations, and participate responsibly in the cooperative.',
  },
];

export default function MembershipPage() {
  const [hasAgreed, setHasAgreed] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);

  useEffect(() => {
    if (isAccepted) return undefined;

    const previousBodyOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
    };
  }, [isAccepted]);

  return (
    <>
      <Navbar />

      <main className="membership-page">
        <section className="membership-hero">
          <div className="membership-shell membership-hero__inner">
            <div className="membership-hero__copy">
              <p className="membership-label">MEMPCO Membership</p>
              <h1>Become part of a cooperative built around people.</h1>
              <p className="membership-hero__text">
                Follow this practical guide to prepare your documents, visit
                the MEMPCO main office, complete your application, and begin
                the membership process.
              </p>

              <div className="membership-hero__actions">
                <a href="#membership-process" className="membership-button membership-button--quiet">
                  View the process
                </a>
              </div>
            </div>

            <div className="membership-hero__logo" aria-hidden="true">
              <img src="/Logos/Logo.png" alt="" />
            </div>
          </div>
        </section>

        <section className="membership-section" id="membership-process">
          <div className="membership-shell">
            <header className="membership-section__header">
              <p className="membership-label">Membership guide</p>
              <h2>How to Become a Member</h2>
              <p>
                Membership applications are submitted in person. Follow these
                four steps and confirm current fees or additional requirements
                with an authorized MEMPCO representative.
              </p>
            </header>

            <div className="membership-steps">
              {MEMBERSHIP_STEPS.map((step) => (
                <article className="membership-step" key={step.number}>
                  <span>{step.number}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="membership-section membership-section--soft">
          <div className="membership-shell membership-preparation">
            <div>
              <p className="membership-label">Before you visit</p>
              <h2>Membership Requirements</h2>
              <p className="membership-preparation__intro">
                Prepare the following documents and information before going
                to the MEMPCO main office.
              </p>
            </div>

            <ul className="membership-checklist">
              {PREPARATION_ITEMS.map((item) => (
                <li key={item}>
                  <span aria-hidden="true">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="membership-section membership-form-section">
          <div className="membership-shell membership-form-card">
            <div className="membership-form-card__copy">
              <p className="membership-label">Official document</p>
              <h2>Member Application Form</h2>
              <p>
                Download and print the application form, complete the required
                information, and bring it with your supporting documents to
                the MEMPCO main office.
              </p>
              <span>PDF document · 2.7 MB</span>
            </div>

            <div className="membership-form-card__actions">
              <a
                href="/forms/members-application-form.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="membership-button membership-button--quiet"
              >
                Open form
              </a>
              <a
                href="/forms/members-application-form.pdf"
                download
                className="membership-button membership-button--primary"
              >
                Download PDF
              </a>
            </div>
          </div>
        </section>

        <section className="membership-section membership-contact-section">
          <div className="membership-shell membership-contact">
            <div>
              <p className="membership-label">Main office</p>
              <h2>Visit MEMPCO in Zamboanga City</h2>
              <p className="membership-contact__details">
                3D–3E HC Marketing Building, Zamboanga City
                <br />
                Monday to Friday · 8:00 AM–4:00 PM
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {!isAccepted && (
        <div className="membership-consent" role="presentation">
          <section
            className="membership-consent__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="membership-terms-title"
            aria-describedby="membership-terms-intro"
          >
            <header className="membership-consent__header">
              <p className="membership-label">Please review</p>
              <h2 id="membership-terms-title">Membership Terms and Conditions</h2>
              <p id="membership-terms-intro">
                Read and acknowledge these terms before viewing the membership page.
              </p>
            </header>

            <div className="membership-consent__body" tabIndex="0">
              {TERMS.map((term, index) => (
                <article className="membership-term" key={term.title}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <h3>{term.title}</h3>
                    <p>{term.text}</p>
                  </div>
                </article>
              ))}
            </div>

            <footer className="membership-consent__footer">
              <label className="membership-consent__check">
                <input
                  type="checkbox"
                  checked={hasAgreed}
                  onChange={(event) => setHasAgreed(event.target.checked)}
                />
                <span>
                  I have read and agree to the Membership Terms and Conditions.
                </span>
              </label>

              <div className="membership-consent__actions">
                <Link href="/" className="membership-button membership-button--quiet">
                  Return home
                </Link>
                <button
                  type="button"
                  className="membership-button membership-button--primary"
                  disabled={!hasAgreed}
                  onClick={() => setIsAccepted(true)}
                >
                  Agree and continue
                </button>
              </div>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
