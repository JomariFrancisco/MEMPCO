'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar/Navbar';
import Footer from '@/components/Footer/Footer';
import '../about/about.css';

const HERO_PANELS = [
  {
    number: '01',
    title: 'Member-Centered Identity',
    text: 'MEMPCO exists to serve its members through trust, shared ownership, and practical cooperative support.',
  },
  {
    number: '02',
    title: 'Reliable Service System',
    text: 'From savings and loans to allied services, MEMPCO delivers support designed for real member needs.',
  },
  {
    number: '03',
    title: 'Community-Based Growth',
    text: 'Its work extends beyond finance by strengthening livelihoods, opportunity, and long-term local impact.',
  },
];

const HISTORY = [
  {
    period: '1999\u00A0–\u00A02001',
    title: 'Origins from PCFC',
    description:
      'MEMPCO traces its beginnings from the PCFC Grameen Model, starting with microfinancing support for women entrepreneurs in Zamboanga City.',
    highlights: [
      'Origins from PCFC Grameen Model',
      'Started microfinancing initiatives',
      'Supported women entrepreneurs in Zamboanga City',
    ],
  },
  {
    period: '2002',
    title: 'Officially Registered with CDA',
    description:
      'MEMPCO was officially registered with the Cooperative Development Authority as Micro-Entrepreneurs Multi-Purpose Cooperative and continued its microfinance loan program for small entrepreneurs.',
    highlights: [
      'Registered with the Cooperative Development Authority',
      'Established as Micro-Entrepreneurs Multi-Purpose Cooperative',
      'Continued microfinance support for small entrepreneurs',
    ],
  },
  {
    period: '2005',
    title: 'Introduction of Savings Products',
    description:
      'MEMPCO officially launched its savings products and campaign in 2005, shifting the focus from lending alone to building a culture of financial inclusion among previously unbanked members.',
    highlights: [
      'Official launch of savings products',
      'Started savings campaign in 2005',
      'Promoted financial inclusion for unbanked members',
    ],
  },
  {
    period: '2007',
    title: 'Loan Diversification & Rebranding',
    description:
      'MEMPCO expanded into regular loans and later rebranded the program as MILES, or MEMPCO Individual Livelihood Enterprise Support Program.',
    highlights: [
      'Expanded into regular loans',
      'Introduced diversified loan services',
      'Rebranded as MILES Program',
    ],
  },
  {
    period: '2009',
    title: 'Expansion',
    description:
      'MEMPCO started branch expansion across the Zamboanga Peninsula Region, increasing the physical accessibility of financial services so even remote communities could benefit from cooperative services.',
    highlights: [
      'Branch expansion across Zamboanga Peninsula',
      'Improved accessibility of financial services',
      'Reached remote communities',
    ],
  },
  {
    period: '2015',
    title: 'Agri Lending & Aflatoun Program',
    description:
      'MEMPCO officially launched the AGRI Lending Program and Aflatoun Youth Program, paving the way to address two key poverty sectors: agriculture and youth.',
    highlights: [
      'Launched AGRI Lending Program',
      'Launched Aflatoun Youth Program',
      'Focused on agriculture and youth development',
    ],
  },
  {
    period: '2018',
    title: 'Implementation of Financial Literacy Program',
    description:
      'MEMPCO strengthened its commitment to capacity building and long-term poverty reduction by equipping members with the knowledge to manage wealth and debt responsibly.',
    highlights: [
      'Implemented financial literacy initiatives',
      'Strengthened capacity building',
      'Promoted responsible wealth and debt management',
    ],
  },
  {
    period: '2020',
    title: 'Embraced Digitalization',
    description:
      'During the pandemic, MEMPCO continued providing members with opportunities to do business by creating the MEMPCOPreneurs Online Community, a virtual marketplace for members.',
    highlights: [
      'Continued member support during the pandemic',
      'Created MEMPCOPreneurs Online Community',
      'Built a virtual marketplace for members',
    ],
  },
  {
    period: '2023',
    title: 'MEDS',
    description:
      'MEMPCO established MEDS, or Member Enterprise Development Services, marking a shift toward holistic support through business development, mentorship, and enterprise sustainability beyond capital assistance.',
    highlights: [
      'Established Member Enterprise Development Services',
      'Provided business development support',
      'Strengthened mentorship and enterprise sustainability',
    ],
  },
  {
    period: '2024',
    title: 'Palengke Day',
    description:
      'MEMPCO created Palengke Day as a vital market platform for members to showcase and sell their products, strengthen networking, and increase direct market access and revenue.',
    highlights: [
      'Created a market platform for members',
      'Supported product showcasing and selling',
      'Improved market access and revenue opportunities',
    ],
  },
  {
    period: '2025',
    title: 'Opening of La Hermosa Funeraria de MEMPCO',
    description:
      'MEMPCO formally inaugurated the first-ever funeral service wholly owned and operated by a cooperative, expanding its service support for members and the wider community.',
    highlights: [
      'Opened La Hermosa Funeraria de MEMPCO',
      'First funeral service owned and operated by a cooperative',
      'Expanded member and community support services',
    ],
  },
];

const PRINCIPLES = [
  {
    title: 'Our Mission',
    description:
      'MEMPCO is committed to uplift the social and economic condition of the members by providing excellent financial products and services.',
  },
  {
    title: 'Our Vision',
    description:
      'A strong and sustainable cooperative of highly empowered members of Mindanao.',
  },
];

const VALUES = [
  {
    number: '01',
    title: 'Passion',
    description:
      'We serve members with dedication, care, and a deep sense of purpose.',
  },
  {
    number: '02',
    title: 'Integrity',
    description:
      'We uphold honesty, accountability, and transparency in every action.',
  },
  {
    number: '03',
    title: 'Teamwork',
    description:
      'We collaborate and support one another to achieve shared success.',
  },
  {
    number: '04',
    title: 'Innovation',
    description:
      'We continuously improve to meet changing needs with better solutions.',
  },
];

const AWARDS = [
  {
    year: '2025',
    title: 'Diamond Awards Regional Awardee',
    organization: 'Land Bank of the Philippines',
    description:
      'Recognized as one of the Distinguished Institutions and Movers of National Development Regional Awardees under the Diamond Awards.',
    tag: 'Regional Awardee',
    image: '/About/Awards/diamond-awards.png',
  },
  {
    year: '2025',
    title: '1st Placer — Large Cooperative Category',
    organization: '7th Marciano Aquino Coop Gawad Parangal',
    description:
      'Awarded Most Outstanding Primary Cooperative in Zamboanga City under the Large Cooperative Category during the 2025 Cooperative Month Celebration.',
    tag: '1st Placer',
    image: '/About/Awards/coop-gawad-parangal.png',
  },
  {
    year: '2025',
    title: 'Aurora Awards 2025',
    organization: 'NATCCO Network',
    description:
      'Received multiple recognitions including Sentinel Award for Risk Readiness, Share Capital Structure Award, and Full Provision for Loan Losses Award.',
    tag: 'Multiple Awards',
    image: '/About/Awards/aurora-awards-2025.png',
  },
  {
    year: '2025',
    title: 'Champion for Climate Action',
    organization: 'CLIMBS',
    description:
      'Recognized for sustainability impact and commitment to climate-conscious cooperative action through the Sustainability Impact Producers Award.',
    tag: 'Sustainability',
    image: '/About/Awards/climbs-climate-action.png',
  },
];

const STRUCTURE = [
  {
    eyebrow: 'Network',
    title: 'Offices',
    description:
      "Explore MEMPCO's offices and branch presence that bring cooperative services closer to members and communities.",
    items: ['Accessible locations', 'Regional presence', 'Closer member support'],
    href: '/branches',
    cta: 'View Offices',
  },
  {
    eyebrow: 'Leadership',
    title: 'Governance',
    description:
      "See the leadership and governance structure that guides MEMPCO's direction, accountability, and institutional growth.",
    items: ['Board leadership', 'Management structure', 'Institutional direction'],
    href: '/governance',
    cta: 'View Overview',
  },
];

function useHistoryCarousel(cardCount, heroRef) {
  const historyRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const activeIndexRef = useRef(0);
  const wheelLockRef = useRef(false);
  const snapLockRef = useRef(false);

  const touchStartYRef = useRef(0);

  const downExitBlockedRef = useRef(false);
  const upExitBlockedRef = useRef(false);
  const downExitTimerRef = useRef(null);
  const upExitTimerRef = useRef(null);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    const hero = heroRef.current;
    const section = historyRef.current;

    if (!hero || !section || cardCount <= 1) return;

    const viewportHeight = () =>
      window.innerHeight || document.documentElement.clientHeight;

    const clearDownExitBlock = () => {
      downExitBlockedRef.current = false;

      if (downExitTimerRef.current) {
        window.clearTimeout(downExitTimerRef.current);
        downExitTimerRef.current = null;
      }
    };

    const clearUpExitBlock = () => {
      upExitBlockedRef.current = false;

      if (upExitTimerRef.current) {
        window.clearTimeout(upExitTimerRef.current);
        upExitTimerRef.current = null;
      }
    };

    const holdDownExit = () => {
      downExitBlockedRef.current = true;

      if (downExitTimerRef.current) {
        window.clearTimeout(downExitTimerRef.current);
      }

      downExitTimerRef.current = window.setTimeout(() => {
        downExitBlockedRef.current = false;
        downExitTimerRef.current = null;
      }, 220);
    };

    const holdUpExit = () => {
      upExitBlockedRef.current = true;

      if (upExitTimerRef.current) {
        window.clearTimeout(upExitTimerRef.current);
      }

      upExitTimerRef.current = window.setTimeout(() => {
        upExitBlockedRef.current = false;
        upExitTimerRef.current = null;
      }, 220);
    };

    const clearExitBlocks = () => {
      clearDownExitBlock();
      clearUpExitBlock();
    };

    const snapToHero = () => {
      snapLockRef.current = true;
      clearExitBlocks();

      hero.scrollIntoView({
        block: 'start',
        inline: 'nearest',
        behavior: 'smooth',
      });

      window.setTimeout(() => {
        snapLockRef.current = false;
      }, 850);
    };

    const snapToHistory = (index = activeIndexRef.current, behavior = 'auto') => {
      if (behavior === 'smooth') {
        snapLockRef.current = true;
      }

      activeIndexRef.current = index;
      setActiveIndex(index);

      section.scrollIntoView({
        block: 'start',
        inline: 'nearest',
        behavior,
      });

      if (behavior === 'smooth') {
        window.setTimeout(() => {
          snapLockRef.current = false;
        }, 850);
      }
    };

    const shouldSnapFromHero = () => {
      const heroRect = hero.getBoundingClientRect();
      const historyRect = section.getBoundingClientRect();
      const vh = viewportHeight();

      return (
        heroRect.top <= 8 &&
        heroRect.bottom > vh * 0.35 &&
        historyRect.top > vh * 0.25
      );
    };

    const getHistoryState = () => {
      const rect = section.getBoundingClientRect();
      const vh = viewportHeight();

      const intersects = rect.top < vh && rect.bottom > 0;

      const mostlyLocked =
        Math.abs(rect.top) <= vh * 0.12 &&
        rect.bottom >= vh * 0.88;

      const enteringFromAbove = rect.top > 0 && rect.top <= vh * 0.42;
      const enteringFromBelow = rect.bottom < vh && rect.bottom >= vh * 0.58;

      return {
        intersects,
        mostlyLocked,
        enteringFromAbove,
        enteringFromBelow,
      };
    };

    const moveCard = (direction) => {
      const current = activeIndexRef.current;
      const next = Math.max(0, Math.min(current + direction, cardCount - 1));

      if (next === current) return current;

      activeIndexRef.current = next;
      setActiveIndex(next);

      clearExitBlocks();

      if (direction > 0 && next === cardCount - 1) {
        holdDownExit();
      }

      if (direction < 0 && next === 0) {
        holdUpExit();
      }

      return next;
    };

    const processScroll = (event, direction) => {
      if (snapLockRef.current) {
        event.preventDefault();
        return true;
      }

      if (direction > 0 && shouldSnapFromHero()) {
        event.preventDefault();
        clearExitBlocks();
        snapToHistory(0, 'smooth');
        return true;
      }

      const state = getHistoryState();

      if (!state.intersects) return false;

      const current = activeIndexRef.current;
      const isFirst = current === 0;
      const isLast = current === cardCount - 1;

      if (direction > 0 && state.enteringFromAbove) {
        event.preventDefault();
        clearExitBlocks();
        snapToHistory(0, 'smooth');
        return true;
      }

      if (direction < 0 && state.enteringFromBelow) {
        event.preventDefault();
        clearExitBlocks();
        snapToHistory(cardCount - 1, 'smooth');
        return true;
      }

      if (!state.mostlyLocked) return false;

      if (wheelLockRef.current) {
        event.preventDefault();
        snapToHistory(current, 'auto');

        if (direction > 0 && isLast) {
          holdDownExit();
        }

        if (direction < 0 && isFirst) {
          holdUpExit();
        }

        return true;
      }

      if (direction > 0 && isLast) {
        if (downExitBlockedRef.current) {
          event.preventDefault();
          snapToHistory(current, 'auto');
          holdDownExit();
          return true;
        }

        return false;
      }

      if (direction < 0 && isFirst) {
        if (upExitBlockedRef.current) {
          event.preventDefault();
          snapToHistory(current, 'auto');
          holdUpExit();
          return true;
        }

        event.preventDefault();
        snapToHero();
        return true;
      }

      event.preventDefault();
      snapToHistory(current, 'auto');

      wheelLockRef.current = true;
      moveCard(direction);

      window.setTimeout(() => {
        wheelLockRef.current = false;
      }, 680);

      return true;
    };

    const handleWheel = (event) => {
      const rawDelta =
        Math.abs(event.deltaY) >= Math.abs(event.deltaX)
          ? event.deltaY
          : event.deltaX;

      if (Math.abs(rawDelta) < 8) return;

      const direction = rawDelta > 0 ? 1 : -1;

      processScroll(event, direction);
    };

    const handleTouchStart = (event) => {
      if (!event.touches || event.touches.length === 0) return;
      touchStartYRef.current = event.touches[0].clientY;
    };

    const handleTouchMove = (event) => {
      if (!event.touches || event.touches.length === 0) return;

      const currentY = event.touches[0].clientY;
      const diff = touchStartYRef.current - currentY;

      if (Math.abs(diff) < 34) return;

      const direction = diff > 0 ? 1 : -1;
      const handled = processScroll(event, direction);

      if (handled) {
        touchStartYRef.current = currentY;
      }
    };

    const handleTouchEnd = () => {
      touchStartYRef.current = 0;
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);

      clearExitBlocks();
    };
  }, [cardCount, heroRef]);

  return {
    historyRef,
    activeIndex,
  };
}

function useControlledSectionSnap(sectionRefs, historyRef) {
  const snapLockRef = useRef(false);
  const touchStartYRef = useRef(0);

  useEffect(() => {
    const getViewportHeight = () =>
      window.innerHeight || document.documentElement.clientHeight;

    const getSections = () => sectionRefs.map((ref) => ref.current).filter(Boolean);

    const isHistoryActive = () => {
      const history = historyRef.current;
      if (!history) return false;

      const rect = history.getBoundingClientRect();
      const vh = getViewportHeight();

      return rect.top < vh * 0.55 && rect.bottom > vh * 0.45;
    };

    const getCurrentIndex = () => {
      const sections = getSections();
      const vh = getViewportHeight();

      let closestIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;

      sections.forEach((section, index) => {
        const rect = section.getBoundingClientRect();
        const middleIsInside =
          rect.top <= vh * 0.52 && rect.bottom >= vh * 0.48;

        if (middleIsInside) {
          const distance = Math.abs(rect.top);

          if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = index;
          }
        }
      });

      return closestIndex;
    };

    const currentSectionCanScrollNormally = (direction) => {
      const sections = getSections();
      const current = sections[getCurrentIndex()];
      const vh = getViewportHeight();

      if (!current) return false;

      const rect = current.getBoundingClientRect();
      const sectionIsTallerThanViewport = rect.height > vh + 24;

      if (!sectionIsTallerThanViewport) return false;

      if (direction > 0) {
        return rect.bottom > vh + 16;
      }

      return rect.top < -16;
    };

    const snapToSection = (index) => {
      const sections = getSections();
      const target = sections[index];

      if (!target) return;

      snapLockRef.current = true;

      target.scrollIntoView({
        block: 'start',
        inline: 'nearest',
        behavior: 'smooth',
      });

      window.setTimeout(() => {
        snapLockRef.current = false;
      }, 850);
    };

    const handleSnap = (event, direction) => {
      if (event.defaultPrevented) return;

      if (snapLockRef.current) {
        event.preventDefault();
        return;
      }

      if (isHistoryActive()) return;

      if (currentSectionCanScrollNormally(direction)) return;

      const sections = getSections();
      const currentIndex = getCurrentIndex();
      const nextIndex = Math.max(
        0,
        Math.min(currentIndex + direction, sections.length - 1)
      );

      if (nextIndex === currentIndex) return;

      event.preventDefault();
      snapToSection(nextIndex);
    };

    const handleWheel = (event) => {
      const delta =
        Math.abs(event.deltaY) >= Math.abs(event.deltaX)
          ? event.deltaY
          : event.deltaX;

      if (Math.abs(delta) < 16) return;

      const direction = delta > 0 ? 1 : -1;
      handleSnap(event, direction);
    };

    const handleTouchStart = (event) => {
      if (!event.touches || event.touches.length === 0) return;
      touchStartYRef.current = event.touches[0].clientY;
    };

    const handleTouchMove = (event) => {
      if (!event.touches || event.touches.length === 0) return;

      const currentY = event.touches[0].clientY;
      const diff = touchStartYRef.current - currentY;

      if (Math.abs(diff) < 42) return;

      const direction = diff > 0 ? 1 : -1;
      handleSnap(event, direction);

      touchStartYRef.current = currentY;
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [sectionRefs, historyRef]);
}

export default function About() {
  const [heroIn, setHeroIn] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const heroRef = useRef(null);
  const historyRef = useRef(null);
  const principlesRef = useRef(null);
  const awardsRef = useRef(null);
  const structureRef = useRef(null);
  const footerRef = useRef(null);

  const showPreviousHistory = () => {
    setActiveIndex((current) => Math.max(0, current - 1));
  };

  const showNextHistory = () => {
    setActiveIndex((current) => Math.min(HISTORY.length - 1, current + 1));
  };

  useEffect(() => {
    const timer = setTimeout(() => setHeroIn(true), 60);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const elements = document.querySelectorAll('.reveal');

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.14,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <Navbar />

      <main className="ao-page">
        <section className="ao-hero" ref={heroRef}>
          <div className="ao-hero-grid" aria-hidden="true" />
          <div className="ao-hero-glow" aria-hidden="true" />

          <div className={`ao-hero-shell${heroIn ? ' is-in' : ''}`}>
            <div className="ao-hero-copy">
              <p className="ao-eyebrow">About MEMPCO</p>

              <h1 className="ao-hero-title">
                Built on <em>Trust.</em>
              </h1>

              <p className="ao-hero-sub">
                MEMPCO is committed to uplifting the social and economic
                condition of its members by providing excellent financial
                products and services that empower communities and promote
                sustainable growth.
              </p>

              <div className="ao-hero-actions">
                <Link href="/services" className="ao-hero-cta ao-hero-cta--solid">
                  Explore Our Services
                </Link>
              </div>
            </div>

            <div className="ao-hero-panel">
              {HERO_PANELS.map((item) => (
                <article className="ao-hero-panel-card" key={item.number}>
                  <div className="ao-hero-panel-top">
                    <span className="ao-hero-panel-num">{item.number}</span>
                  </div>
                  <h3 className="ao-hero-panel-title">{item.title}</h3>
                  <p className="ao-hero-panel-text">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <div className="ao-flow">
          <div className="ao-flow__grid" aria-hidden="true" />
          <div className="ao-flow__glow ao-flow__glow--left" aria-hidden="true" />
          <div className="ao-flow__glow ao-flow__glow--right" aria-hidden="true" />

          <section
            className="ao-section ao-history-section"
            ref={historyRef}
            aria-label="History and milestone of MEMPCO"
          >
            <div className="ao-history-sticky">
              <div className="ao-history-bg-glow ao-history-bg-glow--a" aria-hidden="true" />
              <div className="ao-history-bg-glow ao-history-bg-glow--b" aria-hidden="true" />

              <div className="ao-history-stage">
                <div className="ao-history-intro">
                  <p className="ao-section-kicker">History & Milestone</p>
                  <h2 className="ao-history-main-title">Our <em>Journey</em></h2>
                  <p className="ao-history-main-copy">
                    From its early microfinancing roots to its growing service
                    network today, MEMPCO&apos;s milestones reflect a continuous
                    commitment to members, enterprise development, innovation,
                    and community impact.
                  </p>

                  <div className="ao-history-progress" aria-label="History navigation">
                    <button
                      type="button"
                      className="ao-history-arrow"
                      onClick={showPreviousHistory}
                      disabled={activeIndex === 0}
                      aria-label="View previous history milestone"
                    >
                      <svg viewBox="0 0 16 16" aria-hidden="true">
                        <path d="M10 3.5 5.5 8l4.5 4.5" />
                      </svg>
                    </button>
                    <span aria-live="polite">
                      {String(activeIndex + 1).padStart(2, '0')}
                    </span>
                    <div className="ao-history-progress-line">
                      <i
                        style={{
                          width: `${((activeIndex + 1) / HISTORY.length) * 100}%`,
                        }}
                      />
                    </div>
                    <span>{String(HISTORY.length).padStart(2, '0')}</span>
                    <button
                      type="button"
                      className="ao-history-arrow"
                      onClick={showNextHistory}
                      disabled={activeIndex === HISTORY.length - 1}
                      aria-label="View next history milestone"
                    >
                      <svg viewBox="0 0 16 16" aria-hidden="true">
                        <path d="M6 3.5 10.5 8 6 12.5" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="ao-history-viewport">
                  <div
                    className="ao-history-rail"
                    style={{
                      transform: `translate3d(${-activeIndex * 100}%, 0, 0)`,
                    }}
                    aria-live="polite"
                  >
                    {HISTORY.map((item, index) => (
                      <article
                        key={`${item.period}-${item.title}`}
                        className={`ao-history-node${
                          index === activeIndex ? ' is-active' : ''
                        }`}
                        aria-hidden={index !== activeIndex}
                        aria-current={index === activeIndex ? 'step' : undefined}
                      >
                        <div className="ao-history-node-line" aria-hidden="true">
                          <span className="ao-history-node-dot" />
                        </div>

                        <h3 className="ao-history-node-period">{item.period}</h3>
                        <p className="ao-history-node-title">{item.title}</p>
                        <p className="ao-history-node-desc">{item.description}</p>

                        <ul className="ao-history-node-list">
                          {item.highlights.map((highlight) => (
                            <li key={highlight}>{highlight}</li>
                          ))}
                        </ul>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="ao-section ao-principles-section" ref={principlesRef}>
            <div className="ao-shell">
              <div className="ao-section-intro reveal reveal-up">
                <p className="ao-section-kicker">Foundation</p>
                <h2 className="ao-section-title">Mission, Vision & <em>Core Values</em></h2>
                <p className="ao-section-description">
                  The principles that guide MEMPCO&apos;s service, leadership,
                  and commitment to its members.
                </p>
              </div>

              <div className="ao-principles-board">
                <div className="ao-principles-top">
                  {PRINCIPLES.map((item, index) => (
                    <article
                      className="ao-principle-card reveal reveal-up"
                      key={item.title}
                      style={{ '--reveal-delay': `${index * 90}ms` }}
                    >
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </article>
                  ))}
                </div>

                <div className="ao-values-heading reveal reveal-up">
                  <h3>For the love of God above all, we do things with:</h3>
                </div>

                <div className="ao-principles-values">
                  {VALUES.map((value, index) => (
                    <article
                      className="ao-principles-value-card reveal reveal-up"
                      key={value.title}
                      style={{ '--reveal-delay': `${index * 80}ms` }}
                    >
                      <div className="ao-value-number">{value.number}</div>
                      <h4>{value.title}</h4>
                      <p>{value.description}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="ao-section ao-awards-section" ref={awardsRef}>
            <div className="ao-shell">
              <div className="ao-awards-stage-topline reveal reveal-up">
                <span />
                <p>Awards & Recognition</p>
                <span />
              </div>

              <div className="ao-awards-stage-head reveal reveal-up">
                <h2>
                  <span className="ao-awards-stage-title-main">Awards &</span>{' '}
                  <em>Recognition</em>
                </h2>
                <p>
                  These recognitions reflect MEMPCO&apos;s excellence in
                  cooperative service, sustainability, institutional growth,
                  risk readiness, and member-centered performance.
                </p>
              </div>

              <div className="ao-awards-grid">
                {AWARDS.map((award, index) => {
                  let imageClass = 'ao-award-image';

                  if (index === 1) {
                    imageClass += ' ao-award-image--fit-second';
                  }

                  if (index === 2) {
                    imageClass += ' ao-award-image--zoom ao-award-image--down-third';
                  }

                  if (index === 3) {
                    imageClass += ' ao-award-image--zoom';
                  }

                  return (
                    <article
                      className="ao-award-card reveal reveal-up"
                      key={`${award.year}-${award.title}`}
                      style={{ '--reveal-delay': `${index * 90}ms` }}
                    >
                      <div className="ao-award-card-media">
                        <div className="ao-award-thumb">
                          {award.image ? (
                            <>
                              <img
                                src={award.image}
                                alt={award.title}
                                className={imageClass}
                                onError={(event) => {
                                  event.currentTarget.style.display = 'none';

                                  const fallback =
                                    event.currentTarget.parentElement?.querySelector(
                                      '.ao-award-thumb-fallback'
                                    );

                                  if (fallback) {
                                    fallback.style.display = 'inline-flex';
                                  }
                                }}
                              />
                              <span className="ao-award-thumb-fallback">
                                Award Image
                              </span>
                            </>
                          ) : (
                            <span>Award Image</span>
                          )}
                        </div>
                      </div>

                      <div className="ao-award-card-copy">
                        <span className="ao-award-card-org">
                          {award.organization}
                        </span>

                        <h3>{award.title}</h3>
                        <p>{award.description}</p>

                        <div className="ao-award-card-meta">
                          <span className="ao-award-card-year">{award.year}</span>
                          <span className="ao-award-card-tag">{award.tag}</span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="ao-section ao-structure-section" ref={structureRef}>
            <div className="ao-shell">
              <div className="ao-section-intro reveal reveal-up">
                <p className="ao-section-kicker">Structure</p>
                <h2 className="ao-section-title">Offices and <em>Governance</em></h2>
                <p className="ao-section-description">
                  Explore MEMPCO&apos;s service presence and leadership structure
                  through its offices and governance overview.
                </p>
              </div>

              <div className="ao-structure-grid">
                {STRUCTURE.map((item, index) => (
                  <article
                    className="ao-structure-card reveal reveal-up"
                    key={item.title}
                    style={{ '--reveal-delay': `${index * 100}ms` }}
                  >
                    <span className="ao-structure-card__eyebrow">
                      {item.eyebrow}
                    </span>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>

                    <ul className="ao-structure-card__list">
                      {item.items.map((listItem) => (
                        <li key={listItem}>{listItem}</li>
                      ))}
                    </ul>

                    <Link href={item.href} className="ao-structure-card__link">
                      {item.cta}
                    </Link>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>

      <div className="ao-footer-snap" ref={footerRef}>
        <Footer />
      </div>
    </>
  );
}
