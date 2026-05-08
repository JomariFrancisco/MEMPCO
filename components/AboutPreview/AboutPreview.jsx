'use client';

import React from 'react';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import './AboutPreview.css';

const HIGHLIGHTS = [
  {
    label: 'Our Mission',
    text: 'MEMPCO is committed to uplift the social and economic condition of the members by providing excellent financial products and services.',
  },
  {
    label: 'Our Vision',
    text: 'A strong and sustainable cooperative of highly empowered members of Mindanao.',
  },
];

const STATS = [
  { value: '24', label: 'Years of Service' },
  { value: '4',  label: 'Core Values' },
];

const VALUES = ['Passion', 'Integrity', 'Teamwork', 'Innovation'];

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2.5 7h9M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function AboutPreview() {
  const ref = useRef(null);

  useEffect(() => {
    const section = ref.current;
    if (!section) return;

    const items = section.querySelectorAll('[data-reveal]');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -48px 0px' }
    );

    items.forEach((el, i) => {
      el.style.setProperty('--rd', `${i * 80}ms`);
      io.observe(el);
    });

    return () => io.disconnect();
  }, []);

  return (
    <section className="ap" ref={ref}>
      <div className="ap-glow ap-glow--a" aria-hidden="true" />
      <div className="ap-glow ap-glow--b" aria-hidden="true" />

      <div className="ap-shell">
        <div className="ap-grid">

          {/* ── Image column ── */}
          <div className="ap-media ap-reveal ap-reveal--left" data-reveal>
            <div className="ap-image-card">
              <img
                src="/About/2.png"
                alt="MEMPCO members and community"
                className="ap-image"
              />
              <div className="ap-image-overlay" aria-hidden="true" />
            </div>

          </div>

          {/* ── Content column ── */}
          <div className="ap-content">

            <span className="ap-eyebrow ap-reveal ap-reveal--right" data-reveal>
              About MEMPCO
            </span>

            <div className="ap-title-row ap-reveal ap-reveal--right" data-reveal>
              <h2 className="ap-title">
                Cooperative.<br /><em>Built just for you.</em>
              </h2>
              <img
                src="/About/AboutLOGO.png"
                alt="MEMPCO Logo"
                className="ap-logo"
              />
            </div>

            <p className="ap-body ap-reveal ap-reveal--right" data-reveal>
              MEMPCO is committed to uplifting the social and economic condition
              of its members by providing excellent financial products and
              services that empower communities and promote sustainable growth
              across Mindanao.
            </p>

            {/* Mission / Vision highlight cards */}
            <div className="ap-highlights ap-reveal ap-reveal--right" data-reveal>
              {HIGHLIGHTS.map((h) => (
                <div className="ap-highlight" key={h.label}>
                  <span className="ap-highlight__label">{h.label}</span>
                  <p className="ap-highlight__text">{h.text}</p>
                </div>
              ))}
            </div>

            {/* Core values */}
            <div className="ap-values ap-reveal ap-reveal--right" data-reveal>
              <span className="ap-values__label">For the love of God above all, we do things with:</span>
              <div className="ap-values__pills">
                {VALUES.map((v) => (
                  <span className="ap-values__pill" key={v}>{v}</span>
                ))}
              </div>
            </div>

            {/* Stats row */}
            <div className="ap-stats ap-reveal ap-reveal--right" data-reveal>
              {STATS.map((s, i) => (
                <React.Fragment key={s.label}>
                  <div className="ap-stat">
                    <strong>{s.value}</strong>
                    <span>{s.label}</span>
                  </div>
                  {i < STATS.length - 1 && (
                    <div className="ap-stat-sep" aria-hidden="true" />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* CTA buttons */}
            <div className="ap-actions ap-reveal ap-reveal--right" data-reveal>
              <Link href="/about" className="ap-cta-btn">
                <span>Learn More</span>
                <span className="ap-cta-btn__icon" aria-hidden="true"><ArrowIcon /></span>
              </Link>
              <Link href="/services" className="ap-ghost-btn">
                Explore Services
              </Link>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
