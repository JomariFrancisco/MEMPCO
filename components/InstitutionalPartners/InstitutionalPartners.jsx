'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import './InstitutionalPartners.css';

const PARTNERS = [
  { name: 'ACCU', image: '/Affiliates/ACCU.png', accent: '#16a34a', ink: '#14532d' },
  {
    name: 'Banco Cooperative De Zamboanga',
    image: '/Affiliates/Banco%20Cooperative%20De%20Zamboanga.png',
    accent: '#dc2626',
    ink: '#7f1d1d',
    logoScale: 1.1,
  },
  { name: 'CIMAC', image: '/Affiliates/CIMAC.png', accent: '#2563eb', ink: '#1e3a8a' },
  {
    name: 'Co-operative College of the Philippines',
    image: '/Affiliates/CO-OPERATIVE%20COLLEGE%20OF%20THE%20PH.png',
    accent: '#1d4ed8',
    ink: '#172554',
  },
  { name: 'COOP Chamber', image: '/Affiliates/COOP%20CHAMBER.png', accent: '#f97316', ink: '#7c2d12' },
  {
    name: 'Cooperative Insurance of the Philippines',
    image: '/Affiliates/COOPERATIVE%20INSURANCE%20OF%20THE%20PH.png',
    accent: '#0f766e',
    ink: '#134e4a',
  },
  { name: 'LANDBANK', image: '/Affiliates/LANDBANK.png', accent: '#15803d', ink: '#14532d' },
  { name: 'MASS-SPECC', image: '/Affiliates/MASS-SPECC.png', accent: '#7c3aed', ink: '#4c1d95' },
  { name: 'NAFE COOP', image: '/Affiliates/NAFE%20COOP.png', accent: '#2736a3', ink: '#172554' },
  { name: 'NATCO', image: '/Affiliates/NATCO.png', accent: '#f28c28', ink: '#7c2d12' },
  {
    name: 'Western Mindanao Federation of Cooperatives',
    image: '/Affiliates/WESTERN%20MINDANAO%20FEDERATION%20OF%20THE%20COOPERATIVE.png',
    accent: '#ef4444',
    ink: '#7f1d1d',
  },
  {
    name: 'Zamboanga City Cooperative Development Council',
    image: '/Affiliates/Zamboanga%20City%20Cooperative%20Development%20Council.png',
    accent: '#dc2626',
    ink: '#7f1d1d',
  },
  {
    name: 'Zamboanga City Union of Cooperatives',
    image: '/Affiliates/ZAMBOANGA%20CITY%20UNION%20OF%20COOPERATIVE.png',
    accent: '#f59e0b',
    ink: '#78350f',
  },
];

const getShuffleDelay = (offset) => {
  if (offset === -2) return '0.02s';
  if (offset === 2) return '0.10s';
  if (offset === -1) return '0.18s';
  if (offset === 1) return '0.28s';
  return '0.40s';
};

const getShuffleVars = (offset) => {
  if (offset === -2) {
    return {
      '--shuffle-x': '-220px',
      '--shuffle-y': '-170px',
      '--shuffle-rotate': '-20deg',
      '--shuffle-spin': '-16deg',
    };
  }

  if (offset === -1) {
    return {
      '--shuffle-x': '-150px',
      '--shuffle-y': '135px',
      '--shuffle-rotate': '-13deg',
      '--shuffle-spin': '-10deg',
    };
  }

  if (offset === 1) {
    return {
      '--shuffle-x': '150px',
      '--shuffle-y': '-145px',
      '--shuffle-rotate': '13deg',
      '--shuffle-spin': '10deg',
    };
  }

  if (offset === 2) {
    return {
      '--shuffle-x': '220px',
      '--shuffle-y': '145px',
      '--shuffle-rotate': '20deg',
      '--shuffle-spin': '16deg',
    };
  }

  return {
    '--shuffle-x': '0px',
    '--shuffle-y': '-190px',
    '--shuffle-rotate': '0deg',
    '--shuffle-spin': '6deg',
  };
};

export default function InstitutionalPartners() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [shuffleDone, setShuffleDone] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [parallax, setParallax] = useState({ x: 0, y: 0, rotate: 0 });

  const sectionRef = useRef(null);
  const total = PARTNERS.length;

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(section);
        }
      },
      { threshold: 0.18, rootMargin: '0px 0px -60px 0px' }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible || shuffleDone) return;

    const timer = setTimeout(() => setShuffleDone(true), 2050);
    return () => clearTimeout(timer);
  }, [isVisible, shuffleDone]);

  useEffect(() => {
    if (!shuffleDone) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % total);
    }, 2800);

    return () => clearInterval(interval);
  }, [shuffleDone, total]);

  useEffect(() => {
    setTilt({ x: 0, y: 0 });
  }, [activeIndex]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    let frameId = null;

    const updateParallax = () => {
      const rect = section.getBoundingClientRect();
      const normalized = Math.max(
        -1,
        Math.min(
          1,
          ((rect.top + rect.height / 2) - window.innerHeight / 2) / window.innerHeight
        )
      );

      setParallax({
        x: normalized * 22,
        y: normalized * 38,
        rotate: normalized * 2.8,
      });
    };

    const requestUpdate = () => {
      if (frameId) return;

      frameId = requestAnimationFrame(() => {
        updateParallax();
        frameId = null;
      });
    };

    updateParallax();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);

    return () => {
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, []);

  const visibleCards = useMemo(() => {
    return PARTNERS.map((partner, index) => {
      let offset = index - activeIndex;

      if (offset > total / 2) offset -= total;
      if (offset < -total / 2) offset += total;

      return { ...partner, index, offset };
    }).filter((item) => Math.abs(item.offset) <= 2);
  }, [activeIndex, total]);

  const handleMouseMove = (event, offset) => {
    if (!shuffleDone || offset !== 0) return;

    const rect = event.currentTarget.getBoundingClientRect();

    setTilt({
      x: (0.5 - (event.clientY - rect.top) / rect.height) * 10,
      y: ((event.clientX - rect.left) / rect.width - 0.5) * 10,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  return (
    <section
      ref={sectionRef}
      className={`partners ${isVisible ? 'is-visible' : ''} ${shuffleDone ? 'shuffle-complete' : ''}`}
    >
      <div className="partners__shell">
        <div className="partners-header">
          <span className="partners-eyebrow">Network</span>

          <h2 className="partners-title">Affiliates</h2>
        </div>

        <div className="partners-stage-wrap">
          <div
            className="partners-stage"
            style={{
              '--parallax-x': `${parallax.x}px`,
              '--parallax-y': `${parallax.y}px`,
              '--parallax-rotate': `${parallax.rotate}deg`,
            }}
          >
            <div className="partners-stage__bg" aria-hidden="true">
              <span className="partners-orb partners-orb--one" />
              <span className="partners-orb partners-orb--two" />
              <span className="partners-orb partners-orb--three" />
            </div>

            {visibleCards.map((partner) => {
              const stateClass =
                partner.offset === 0
                  ? 'is-active'
                  : partner.offset === -1
                    ? 'is-left'
                    : partner.offset === 1
                      ? 'is-right'
                      : partner.offset === -2
                        ? 'is-far-left'
                        : 'is-far-right';

              return (
                <article
                  key={partner.index}
                  className={`partner-card ${stateClass} ${isVisible && !shuffleDone ? 'is-shuffling' : ''}`}
                  aria-hidden={partner.offset !== 0}
                  onMouseMove={(event) => handleMouseMove(event, partner.offset)}
                  onMouseLeave={handleMouseLeave}
                  style={{
                    ...getShuffleVars(partner.offset),
                    '--shuffle-delay': getShuffleDelay(partner.offset),
                    '--affiliate-accent': partner.accent,
                    '--affiliate-ink': partner.ink,
                    '--affiliate-logo-scale': partner.logoScale || 1,
                  }}
                >
                  <div className="partner-card__inner">
                    <div
                      className="partner-card__surface"
                      style={
                        partner.offset === 0
                          ? {
                              '--pointer-rotate-x': `${tilt.x}deg`,
                              '--pointer-rotate-y': `${tilt.y}deg`,
                            }
                          : undefined
                      }
                    >
                      <div className="partner-card__shine" aria-hidden="true" />
                      <div className="partner-card__glow" aria-hidden="true" />

                      <div className="partner-card__logo-wrap">
                        <img
                          src={partner.image}
                          alt={partner.name}
                          className="partner-card__logo"
                          draggable={false}
                        />
                      </div>
                    </div>

                    <div className="partner-card__content">
                      <h3>{partner.name}</h3>
                    </div>

                    {partner.offset === 0 && (
                      <div className="partner-card__reflection" aria-hidden="true" />
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
