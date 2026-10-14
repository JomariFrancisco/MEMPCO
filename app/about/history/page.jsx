import Link from 'next/link';
import Navbar from '@/components/Navbar/Navbar';
import Footer from '@/components/Footer/Footer';
import { HISTORY } from '../aboutData';
import '../about-pages.css';
import './history.css';

export default function HistoryPage() {
  return (
    <>
      <Navbar />
      <main className="ad-page ad-history-page">
        <header className="ad-history-hero">
          <div className="ad-shell">
            <nav className="ad-breadcrumb" aria-label="Breadcrumb">
              <Link href="/about">About</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page">History &amp; Milestones</span>
            </nav>
            <p className="ad-kicker">About MEMPCO</p>
            <h1 className="ad-title">History &amp; Milestones</h1>
          </div>
        </header>

        <section className="ad-history-overview" aria-labelledby="history-overview-title">
          <div className="ad-shell ad-history-overview-inner">
            <div className="ad-history-overview-copy">
              <p className="ad-history-section-label">The MEMPCO Journey</p>
              <h2 id="history-overview-title">Shaped by our members.</h2>
              <p>
                From its early microfinance work supporting women entrepreneurs in Zamboanga City to a broader
                range of cooperative services, MEMPCO&apos;s journey has followed the needs and aspirations of
                its members.
              </p>
            </div>
            <figure className="ad-history-anniversary">
              <img
                src="/Hero/24Years%26Logo.png"
                alt="MEMPCO, 24 years in service"
                loading="lazy"
              />
            </figure>
          </div>
        </section>

        <section className="ad-history-timeline-section" aria-labelledby="history-timeline-title">
          <div className="ad-shell">
            <header className="ad-history-timeline-header">
              <p className="ad-history-section-label">Milestones</p>
              <h2 id="history-timeline-title">The journey, year by year.</h2>
            </header>

            <ol className="ad-history-timeline">
              {HISTORY.map(([period, title, description]) => (
                <li className="ad-history-entry" key={`${period}-${title}`}>
                  <time className="ad-history-year">{period}</time>
                  <div className="ad-history-entry-copy">
                    <h3>{title}</h3>
                    <p>{description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
