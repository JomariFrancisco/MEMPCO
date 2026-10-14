import Link from 'next/link';
import Navbar from '@/components/Navbar/Navbar';
import Footer from '@/components/Footer/Footer';
import { PRINCIPLES, VALUES } from '../aboutData';
import '../about-pages.css';
import './foundation.css';

export default function PrinciplesPage() {
  return (
    <>
      <Navbar />
      <main className="ad-page ad-foundation-page">
        <header className="ad-foundation-hero">
          <div className="ad-shell">
            <nav className="ad-breadcrumb" aria-label="Breadcrumb">
              <Link href="/about">About</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page">Our Foundation</span>
            </nav>
            <p className="ad-kicker">About MEMPCO</p>
            <h1 className="ad-title">Our Foundation</h1>
          </div>
        </header>

        <section className="ad-foundation-purpose" aria-label="Vision and mission">
          <div className="ad-shell ad-foundation-purpose-grid">
            {PRINCIPLES.map((item, index) => (
              <article className="ad-foundation-principle" key={item.title}>
                <span className="ad-foundation-index">{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h2>{item.title}</h2>
                  <p>{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="ad-foundation-values" aria-labelledby="core-values-heading">
          <div className="ad-shell">
            <header className="ad-foundation-values-header">
              <p className="ad-kicker">Our Principles</p>
              <h2 id="core-values-heading">Core Values</h2>
            </header>
            <div className="ad-foundation-values-grid">
              {VALUES.map(([number, title, description]) => (
                <article className="ad-foundation-value" key={number}>
                  <span className="ad-foundation-value-number">{number}</span>
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
