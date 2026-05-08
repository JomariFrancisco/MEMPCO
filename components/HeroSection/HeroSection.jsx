'use client';

import { useEffect, useRef, useState } from 'react';
import './HeroSection.css';

/* ── Constants ─────────────────────────────────────────────────── */

const FIRST_VISUAL_VISIBLE_MS = 5000;
const VISUAL_FADE_MS = 900;
const SECOND_SLIDE_VISIBLE_MS = 10500;

const SERVICE_TAGS = [
  'Savings & Credit',
  'Allied Services',
  'Cooperative Laboratory',
];

const MARQUEE_ITEMS = [
  'Regular Savings',
  "KKT — Kinabukasan Ko'To",
  'Time Deposit',
  'Business Loan',
  'Providential Loan',
  'Insurance',
  'Transportation',
  'Funeral Services',
  'Wellness & Diagnostics',
  'Aflatoun Savings',
  'Youth Savings',
];

const TAGLINE_PHRASES = [
  'Helping people help themselves.',
  'Serving Zamboanga since 2002.',
  'Community-driven financial growth.',
  'Empowering micro-entrepreneurs.',
];

const HERO_VISUALS = {
  anniversary: {
    src: '/Hero/24Years&Logo.png',
    alt: 'MEMPCO — 24 Years in Service',
    imageClass: 'hero__visual-image hero__visual-image--anniversary',
  },
  logo: {
    src: '/Logos/LOGO 1.png',
    alt: 'MEMPCO Logo',
    imageClass: 'hero__visual-image hero__visual-image--logo',
  },
};

const SECOND_HERO = {
  backgroundSrc: '/Funeral/FuneralBG.png',
  logoSrc: '/Services/LHFDM.svg',
  logoAlt: 'La Hermosa Funeraria De MEMPCO Logo',
  eyebrow: 'MEMPCO Allied Service',
  tagline: 'Where memories are forever',
  title: 'La Hermosa Funeraria De MEMPCO',
  description:
    'A compassionate funeral service support created to help members and families receive dignified, reliable, and well-coordinated assistance during life’s most delicate moments.',
  details:
    'Guided by care, respect, and the cooperative spirit of service, La Hermosa Funeraria De MEMPCO provides meaningful support when it matters most.',
  highlights: ['Compassionate care', 'Dignified assistance', 'Family-centered service'],
};

/* ── Particle system ───────────────────────────────────────────── */

function initParticles(canvas) {
  const ctx = canvas.getContext('2d');
  let w;
  let h;
  let particles;
  let raf;

  const resize = () => {
    w = canvas.width = canvas.offsetWidth;
    h = canvas.height = canvas.offsetHeight;
  };

  const rand = (min, max) => Math.random() * (max - min) + min;

  const createParticle = () => ({
    x: rand(0, w),
    y: rand(h * 0.3, h),
    r: rand(0.8, 2.2),
    vy: rand(-0.28, -0.08),
    vx: rand(-0.06, 0.06),
    opacity: rand(0.04, 0.18),
    life: 0,
    maxLife: rand(180, 360),
  });

  const reset = () => {
    resize();
    particles = Array.from({ length: 48 }, createParticle);
    particles.forEach((p) => {
      p.life = Math.random() * p.maxLife;
    });
  };

  const tick = () => {
    ctx.clearRect(0, 0, w, h);

    particles.forEach((p, i) => {
      p.life++;
      p.x += p.vx;
      p.y += p.vy;

      const progress = p.life / p.maxLife;
      const alpha = p.opacity * Math.sin(Math.PI * progress);

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220, 38, 38, ${alpha})`;
      ctx.fill();

      if (p.life >= p.maxLife) particles[i] = createParticle();
    });

    raf = requestAnimationFrame(tick);
  };

  reset();
  tick();

  const ro = new ResizeObserver(() => {
    resize();
  });

  ro.observe(canvas);

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
  };
}

/* ── Main component ────────────────────────────────────────────── */

export default function HeroSection() {
  const sectionRef = useRef(null);
  const canvasRef = useRef(null);
  const progressRef = useRef(null);

  const [activeSlide, setActiveSlide] = useState(0);
  const [activeVisual, setActiveVisual] = useState('anniversary');
  const [isVisualVisible, setIsVisualVisible] = useState(true);
  const [typedTagline, setTypedTagline] = useState('');

  /* ── Automatic hero structure carousel ─────────────────────── */
  useEffect(() => {
    const timers = [];

    const addTimer = (callback, delay) => {
      const timer = window.setTimeout(callback, delay);
      timers.push(timer);
    };

    if (activeSlide === 0) {
      setActiveVisual('anniversary');
      setIsVisualVisible(true);

      addTimer(() => {
        setIsVisualVisible(false);
      }, FIRST_VISUAL_VISIBLE_MS);

      addTimer(() => {
        setActiveVisual('logo');
        setIsVisualVisible(true);
      }, FIRST_VISUAL_VISIBLE_MS + VISUAL_FADE_MS);

      addTimer(() => {
        setIsVisualVisible(false);
      }, FIRST_VISUAL_VISIBLE_MS + VISUAL_FADE_MS + FIRST_VISUAL_VISIBLE_MS);

      addTimer(() => {
        setActiveSlide(1);
        setIsVisualVisible(true);
      }, FIRST_VISUAL_VISIBLE_MS + VISUAL_FADE_MS + FIRST_VISUAL_VISIBLE_MS + VISUAL_FADE_MS);
    } else {
      addTimer(() => {
        setActiveSlide(0);
      }, SECOND_SLIDE_VISIBLE_MS);
    }

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [activeSlide]);

  /* ── Tagline typewriter ────────────────────────────────────── */
  useEffect(() => {
    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let timerId;

    const TYPE_SPEED = 52;
    const DELETE_SPEED = 28;
    const PAUSE_AFTER_TYPING = 2200;
    const PAUSE_BEFORE_TYPING = 420;
    const START_DELAY = 450;

    const typeLoop = () => {
      const currentPhrase = TAGLINE_PHRASES[phraseIndex];

      if (!isDeleting) {
        charIndex = Math.min(charIndex + 1, currentPhrase.length);
        setTypedTagline(currentPhrase.slice(0, charIndex));

        if (charIndex === currentPhrase.length) {
          isDeleting = true;
          timerId = window.setTimeout(typeLoop, PAUSE_AFTER_TYPING);
          return;
        }

        timerId = window.setTimeout(typeLoop, TYPE_SPEED);
        return;
      }

      charIndex = Math.max(charIndex - 1, 0);
      setTypedTagline(currentPhrase.slice(0, charIndex));

      if (charIndex === 0) {
        isDeleting = false;
        phraseIndex = (phraseIndex + 1) % TAGLINE_PHRASES.length;
        timerId = window.setTimeout(typeLoop, PAUSE_BEFORE_TYPING);
        return;
      }

      timerId = window.setTimeout(typeLoop, DELETE_SPEED);
    };

    setTypedTagline('');
    timerId = window.setTimeout(typeLoop, START_DELAY);

    return () => {
      window.clearTimeout(timerId);
    };
  }, []);

  /* ── Particles ─────────────────────────────────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cleanup = initParticles(canvas);
    return cleanup;
  }, []);

  /* ── Scroll: parallax + progress ───────────────────────────── */
  useEffect(() => {
    const section = sectionRef.current;
    const fillEl = progressRef.current;
    if (!section) return;

    let rafId = 0;

    const clamp = (v, mn, mx) => Math.min(Math.max(v, mn), mx);

    const update = () => {
      const rect = section.getBoundingClientRect();
      const sectionH = Math.max(rect.height, 1);
      const progress = clamp(-rect.top / (sectionH * 0.82), 0, 1);
      const scrollRatio = clamp(-rect.top / sectionH, 0, 1);

      section.style.setProperty('--hero-bg-shift', `${(progress * 52).toFixed(1)}px`);
      section.style.setProperty('--hero-content-shift', `${(-progress * 108).toFixed(1)}px`);
      section.style.setProperty('--hero-services-shift', `${(-progress * 28).toFixed(1)}px`);
      section.style.setProperty('--hero-visual-shift', `${(-progress * 52).toFixed(1)}px`);
      section.style.setProperty('--hero-fade', `${(1 - progress * 0.72).toFixed(3)}`);
      section.style.setProperty('--hero-blur', `${(progress * 1.35).toFixed(2)}px`);
      section.style.setProperty('--hero-bg-opacity', `${Math.max(0.38, 1 - progress * 0.56).toFixed(3)}`);
      section.style.setProperty('--hero-overlay-opacity', `${Math.max(0.82, 1 - progress * 0.14).toFixed(3)}`);
      section.style.setProperty('--hero-glow-opacity', `${Math.max(0.52, 1 - progress * 0.42).toFixed(3)}`);

      if (fillEl) fillEl.style.height = `${(scrollRatio * 100).toFixed(2)}%`;
    };

    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(update);
    };

    update();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  /* ── Mouse-tracking tilt ───────────────────────────────────── */
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    let rafId = 0;
    const MAX_TILT = 3.5;

    const onMouseMove = (e) => {
      cancelAnimationFrame(rafId);

      rafId = requestAnimationFrame(() => {
        const { left, top, width, height } = section.getBoundingClientRect();
        const cx = left + width / 2;
        const cy = top + height / 2;
        const dx = (e.clientX - cx) / (width / 2);
        const dy = (e.clientY - cy) / (height / 2);
        const tiltY = dx * MAX_TILT;
        const tiltX = -dy * MAX_TILT * 0.55;

        section.style.setProperty('--tilt-x', `${tiltX.toFixed(2)}deg`);
        section.style.setProperty('--tilt-y', `${tiltY.toFixed(2)}deg`);
      });
    };

    const onMouseLeave = () => {
      cancelAnimationFrame(rafId);
      section.style.setProperty('--tilt-x', '0deg');
      section.style.setProperty('--tilt-y', '0deg');
    };

    section.addEventListener('mousemove', onMouseMove);
    section.addEventListener('mouseleave', onMouseLeave);

    return () => {
      cancelAnimationFrame(rafId);
      section.removeEventListener('mousemove', onMouseMove);
      section.removeEventListener('mouseleave', onMouseLeave);
    };
  }, []);

  const marqueeItems = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
  const currentVisual = HERO_VISUALS[activeVisual];

  return (
    <section
      ref={sectionRef}
      className={`hero ${activeSlide === 1 ? 'hero--memorial' : 'hero--main'}`}
      id="home"
      style={{ '--hero-memorial-bg': `url("${SECOND_HERO.backgroundSrc}")` }}
    >
      <div className="hero__progress" aria-hidden="true">
        <div className="hero__progress-fill" ref={progressRef} />
      </div>

      <div className="hero__bg" aria-hidden="true">
        <div className={`hero__backdrop hero__backdrop--main ${activeSlide === 0 ? 'is-active' : ''}`} />
        <div className={`hero__backdrop hero__backdrop--memorial ${activeSlide === 1 ? 'is-active' : ''}`} />
        <div className="hero__overlay" />
        <div className="hero__veil" />
        <div className="hero__grid" />
        <div className="hero__dots" />
        <div className="hero__noise" />
        <div className="hero__glow hero__glow--left" />
        <div className="hero__glow hero__glow--right" />
        <div className="hero__glow hero__glow--bottom" />
      </div>

      <canvas
        ref={canvasRef}
        className="hero__particles"
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />

      <div className="hero__container">
        <div className="hero__carousel">
          <div
            className={`hero__slide hero__slide--main ${activeSlide === 0 ? 'is-active' : ''}`}
            aria-hidden={activeSlide !== 0}
          >
            <div className="hero__content">
              <div className="hero__copy">
                <span className="hero__eyebrow" aria-hidden="true">
                  Trusted Cooperative · Zamboanga City
                </span>

                <p className="hero__tagline">
                  <span className="hero__tagline-rule" aria-hidden="true" />
                  <span className="hero__tagline-text" aria-live="polite">
                    {typedTagline}
                  </span>
                  <span className="hero__tagline-cursor" aria-hidden="true" />
                  <span className="hero__tagline-rule" aria-hidden="true" />
                </p>
              </div>

              <div className="hero__visual">
                <div className="hero__tilt-wrapper">
                  <div className={`hero__visual-stage ${isVisualVisible ? '' : 'is-hidden'}`}>
                    <img
                      src={currentVisual.src}
                      alt={currentVisual.alt}
                      className={currentVisual.imageClass}
                    />
                  </div>
                </div>
              </div>

              <div className="hero__marquee" aria-hidden="true">
                <div className="hero__marquee-track">
                  {[0, 1].map((copy) => (
                    <div key={copy} className="hero__marquee-inner">
                      {marqueeItems.map((item, i) => (
                        <span key={`${copy}-${i}`} className="hero__marquee-item">
                          {item}
                          <span className="hero__marquee-dot" />
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <div className="hero__services">
                {SERVICE_TAGS.map((label) => (
                  <span key={label} className="hero__service-chip">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div
            className={`hero__slide hero__slide--memorial ${activeSlide === 1 ? 'is-active' : ''}`}
            aria-hidden={activeSlide !== 1}
          >
            <div className="hero__memorial">
              <div className="hero__memorial-media">
                <img
                  src={SECOND_HERO.logoSrc}
                  alt={SECOND_HERO.logoAlt}
                  className="hero__memorial-logo"
                />
              </div>

              <div className="hero__memorial-copy">
                <span className="hero__memorial-eyebrow">{SECOND_HERO.eyebrow}</span>

                <p className="hero__memorial-tagline">{SECOND_HERO.tagline}</p>

                <h1 className="hero__memorial-title">{SECOND_HERO.title}</h1>

                <p className="hero__memorial-description">{SECOND_HERO.description}</p>

                <p className="hero__memorial-details">{SECOND_HERO.details}</p>

                <div className="hero__memorial-highlights" aria-label="LHFDM highlights">
                  {SECOND_HERO.highlights.map((item) => (
                    <span key={item} className="hero__memorial-highlight">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}