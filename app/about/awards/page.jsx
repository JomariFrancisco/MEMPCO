import Link from 'next/link';
import Navbar from '@/components/Navbar/Navbar';
import Footer from '@/components/Footer/Footer';
import { AWARDS } from '../aboutData';
import '../about-pages.css';

export default function AwardsPage() {
  return (
    <><Navbar /><main className="ad-page">
      <header className="ad-hero"><div className="ad-shell">
        <nav className="ad-breadcrumb"><Link href="/about">About</Link><span>/</span><span>Awards</span></nav>
        <p className="ad-kicker">Awards & Recognition</p>
        <h1 className="ad-title">Recognition through <em>impact.</em></h1>
        <p className="ad-lead">Institutional recognitions reflecting cooperative excellence, sustainability, and member-centered performance.</p>
      </div></header>
      <section className="ad-content"><div className="ad-shell ad-awards-grid">
        {AWARDS.map((award) => <article className="ad-card" key={award.title}>
          <img src={award.image} alt={award.title} className="ad-award-image" />
          <span className="ad-card-label">{award.year} · {award.organization}</span>
          <h2>{award.title}</h2><p>{award.description}</p>
        </article>)}
      </div></section>
    </main><Footer /></>
  );
}
