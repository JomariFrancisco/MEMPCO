import Link from 'next/link';
import Navbar from '@/components/Navbar/Navbar';
import Footer from '@/components/Footer/Footer';
import { PRINCIPLES, VALUES } from '../aboutData';
import '../about-pages.css';

export default function PrinciplesPage() {
  return (
    <>
      <Navbar />
      <main className="ad-page">
        <header className="ad-hero">
          <div className="ad-shell">
            <nav className="ad-breadcrumb" aria-label="Breadcrumb">
              <Link href="/about">About</Link>
              <span>/</span>
              <span>Vision, Mission & Core Values</span>
            </nav>
            <p className="ad-kicker">Our Foundation</p>
            <h1 className="ad-title">Purpose that guides <em>service.</em></h1>
            <p className="ad-lead">
              The principles that shape MEMPCO's direction, leadership, and commitment to its members.
            </p>
          </div>
        </header>

        <section className="ad-content ad-principles">
          <div className="ad-shell">
            <div className="ad-principles-grid">
              {PRINCIPLES.map((item) => (
                <article className="ad-principle-card" key={item.title}>
                  <h2>{item.title}</h2>
                  <p>{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="ad-content ad-values" aria-labelledby="core-values-heading">
          <div className="ad-shell">
            <div className="ad-values-header">
              <p className="ad-kicker">Core Values</p>
              <h2 id="core-values-heading">The standards behind every service.</h2>
              <p>
                These values guide how MEMPCO works with members, teams, and communities every day.
              </p>
            </div>
            <div className="ad-values-grid">
              {VALUES.map(([number, title, description]) => (
                <article className="ad-value-card" key={number}>
                  <span className="ad-value-number">{number}</span>
                  <div>
                    <h3>{title}</h3>
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
