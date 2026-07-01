import Link from 'next/link';
import Navbar from '@/components/Navbar/Navbar';
import Footer from '@/components/Footer/Footer';
import { HISTORY } from '../aboutData';
import '../about-pages.css';

export default function HistoryPage() {
  return (
    <><Navbar /><main className="ad-page">
      <header className="ad-hero"><div className="ad-shell">
        <nav className="ad-breadcrumb"><Link href="/about">About</Link><span>/</span><span>History</span></nav>
        <p className="ad-kicker">History & Milestones</p>
        <h1 className="ad-title">The MEMPCO <em>journey.</em></h1>
        <p className="ad-lead">A timeline of the cooperative’s growth, service expansion, and continuing commitment to members.</p>
      </div></header>
      <section className="ad-content"><div className="ad-shell ad-history">
        {HISTORY.map(([period, title, description]) => (
          <article className="ad-history-item" key={`${period}-${title}`}>
            <time>{period}</time><div><h2>{title}</h2><p>{description}</p></div>
          </article>
        ))}
      </div></section>
    </main><Footer /></>
  );
}
