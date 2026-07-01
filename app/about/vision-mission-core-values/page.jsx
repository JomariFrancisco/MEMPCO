import Link from 'next/link';
import Navbar from '@/components/Navbar/Navbar';
import Footer from '@/components/Footer/Footer';
import { PRINCIPLES, VALUES } from '../aboutData';
import '../about-pages.css';

export default function PrinciplesPage() {
  return (
    <><Navbar /><main className="ad-page">
      <header className="ad-hero"><div className="ad-shell">
        <nav className="ad-breadcrumb"><Link href="/about">About</Link><span>/</span><span>Vision, Mission & Core Values</span></nav>
        <p className="ad-kicker">Our Foundation</p>
        <h1 className="ad-title">Purpose that guides <em>service.</em></h1>
        <p className="ad-lead">The principles that shape MEMPCO’s direction, leadership, and commitment to its members.</p>
      </div></header>
      <section className="ad-content"><div className="ad-shell">
        <div className="ad-grid">
          {PRINCIPLES.map((item) => <article className="ad-card" key={item.title}><span className="ad-card-label">Foundation</span><h2>{item.title}</h2><p>{item.description}</p></article>)}
          {VALUES.map(([number, title, description]) => <article className="ad-card" key={number}><span className="ad-card-label">{number} · Core Value</span><h3>{title}</h3><p>{description}</p></article>)}
        </div>
      </div></section>
    </main><Footer /></>
  );
}
