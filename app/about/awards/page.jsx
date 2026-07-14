import Link from 'next/link';
import Navbar from '@/components/Navbar/Navbar';
import { AWARDS } from '../aboutData';
import AwardsGridClient from './AwardsGridClient';
import '../about-pages.css';

export default function AwardsPage() {
  return (
    <>
      <Navbar />
      <main className="ad-page ad-awards-page">
        <header className="ad-hero">
          <div className="ad-shell">
            <nav className="ad-breadcrumb">
              <Link href="/about">About</Link>
              <span>/</span>
              <span>Awards</span>
            </nav>
            <p className="ad-kicker">Awards & Recognition</p>
            <h1 className="ad-title">Recognition through <em>impact.</em></h1>
            <p className="ad-lead">Institutional recognitions reflecting cooperative excellence, sustainability, and member-centered performance.</p>
          </div>
        </header>

        <section className="ad-content">
          <AwardsGridClient fallbackAwards={AWARDS} />
        </section>
      </main>
    </>
  );
}
