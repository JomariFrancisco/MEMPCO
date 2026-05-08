'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import './InstitutionalPartners.css';

const PARTNERS = [
  { name: 'name', image: '/Partners/partner1.png' },
  { name: 'name', image: '/Partners/partner2.png' },
  { name: 'name', image: '/Partners/partner3.png' },
  { name: 'name', image: '/Partners/partner4.png' },
  { name: 'name', image: '/Partners/partner5.png' },
  { name: 'name', image: '/Partners/partner6.png' },
  { name: 'name', image: '/Partners/partner7.png' },
  { name: 'name', image: '/Partners/partner8.png' },
  { name: 'name', image: '/Partners/partner9.png' },
  { name: 'name', image: '/Partners/partner10.png' },
  { name: 'name', image: '/Partners/partner11.png' },
  { name: 'name', image: '/Partners/partner12.png' },
  { name: 'name', image: '/Partners/partner13.png' },
  { name: 'name', image: '/Partners/partner14.png' },
  { name: 'name', image: '/Partners/partner15.png' },
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
      x: (0.5 - (event.clientY - rect.top) / rect.height) * 12,
      y: ((event.clientX - rect.left) / rect.width - 0.5) * 12,
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

          <h2 className="partners-title">
            <span className="partners-title__main">Institutional</span>{' '}
            <span className="partners-title__accent">Partner</span>
          </h2>

          <p className="partners-subtitle">
            We collaborate with respected institutions that reinforce MEMPCO&apos;s
            credibility, service quality, and long-term value for our members.
          </p>
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

                      <div className="partner-card__content">
                        <h3>{partner.name}</h3>
                      </div>
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