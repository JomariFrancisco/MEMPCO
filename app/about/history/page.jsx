import Link from 'next/link';
import Navbar from '@/components/Navbar/Navbar';
import Footer from '@/components/Footer/Footer';
import { HISTORY } from '../aboutData';
import '../about-pages.css';

export default function HistoryPage() {
  return (
    <>
      <Navbar />
      <main className="ad-page">
        <header className="ad-hero">
          <div className="ad-shell">
            <nav className="ad-breadcrumb" aria-label="Breadcrumb">
              <Link href="/about">About</Link>
              <span>/</span>
              <span>History</span>
            </nav>
            <p className="ad-kicker">History & Milestones</p>
            <h1 className="ad-title">The MEMPCO <em>journey.</em></h1>
            <p className="ad-lead">
              A timeline of the cooperative's growth, service expansion, and continuing commitment to members.
            </p>
          </div>
        </header>

        <section className="ad-content ad-history-section" aria-labelledby="history-timeline-heading">
          <div className="ad-shell">
            <div className="ad-history-intro">
              <p className="ad-kicker">Milestone Timeline</p>
              <h2 id="history-timeline-heading">From microfinance roots to expanded cooperative service.</h2>
              <p>
                Each milestone reflects how MEMPCO continued to grow its reach, strengthen member support,
                and respond to the changing needs of the communities it serves.
              </p>
            </div>

            <div className="ad-history">
              {HISTORY.map(([period, title, description], index) => (
                <article className="ad-history-item" key={`${period}-${title}`}>
                  <div className="ad-history-marker">
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <time>{period}</time>
                  </div>
                  <div className="ad-history-card">
                    <h2>{title}</h2>
                    <p>{description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
