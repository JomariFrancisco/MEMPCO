'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar/Navbar';
import Footer from '@/components/Footer/Footer';
import './about.css';

const HERO_PANELS = [
  ['01', 'Member-Centered Identity', 'MEMPCO exists to serve its members through trust, shared ownership, and practical cooperative support.'],
  ['02', 'Reliable Service System', 'From savings and loans to allied services, MEMPCO delivers support designed for real member needs.'],
  ['03', 'Community-Based Growth', 'Its work strengthens livelihoods, opportunity, and long-term local impact.'],
];

const ABOUT_LINKS = [
  ['/about/history', 'History', 'Follow MEMPCO’s development from its microfinance origins to its expanding cooperative services.'],
  ['/about/vision-mission-core-values', 'Vision, Mission & Core Values', 'Read the principles and values that guide MEMPCO’s service and leadership.'],
  ['/about/awards', 'Awards', 'Explore institutional recognitions received for cooperative excellence and impact.'],
  ['/about/member-stories', 'Member Stories', 'Discover verified experiences and stories from the MEMPCO community.'],
];

export default function About() {
  const [heroIn, setHeroIn] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setHeroIn(true), 60);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <>
      <Navbar />
      <main className="ao-page">
        <section className="ao-hero">
          <div className="ao-hero-grid" aria-hidden="true" />
          <div className="ao-hero-glow" aria-hidden="true" />
          <div className={`ao-hero-shell${heroIn ? ' is-in' : ''}`}>
            <div className="ao-hero-copy">
              <p className="ao-eyebrow">About MEMPCO</p>
              <h1 className="ao-hero-title">Built on <em>Trust.</em></h1>
              <p className="ao-hero-sub">
                MEMPCO uplifts the social and economic condition of its members
                through trusted financial products, allied services, and
                community-centered growth.
              </p>
              <div className="ao-hero-actions">
                <Link href="/services" className="ao-hero-cta ao-hero-cta--solid">
                  Explore Our Services
                </Link>
              </div>
            </div>
            <div className="ao-hero-panel">
              {HERO_PANELS.map(([number, title, text]) => (
                <article className="ao-hero-panel-card" key={number}>
                  <span className="ao-hero-panel-num">{number}</span>
                  <h3 className="ao-hero-panel-title">{title}</h3>
                  <p className="ao-hero-panel-text">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="ao-section ao-overview-links">
          <div className="ao-shell">
            <div className="ao-section-intro">
              <p className="ao-section-kicker">Explore MEMPCO</p>
              <h2 className="ao-section-title">Learn more about the <em>cooperative.</em></h2>
            </div>
            <div className="ao-overview-links-grid">
              {ABOUT_LINKS.map(([href, title, text], index) => (
                <Link href={href} className="ao-overview-link-card" key={href}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                  <strong>View page →</strong>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
