'use client';

import { useEffect, useRef, useState } from 'react';
import Navbar from '@/components/Navbar/Navbar';
import Footer from '@/components/Footer/Footer';
import { listOpenJobOpenings } from '@/lib/hr/hrContent';
import '../jobs/jobs.css';

const JOB_OPENINGS = [
  {
    title: 'Accounting Assistant',
    department: 'Finance',
    location: 'Veterans, Zamboanga City',
    type: 'Full-time',
    description:
      'Assist with financial records, reporting, and day-to-day accounting functions with strong attention to accuracy and compliance.',
    image: '/Career/ACCOUNTING%20ASSISTANT.png',
  },
  {
    title: 'Member Development Assistant',
    department: 'Member Development',
    location: 'Veterans, Zamboanga City',
    type: 'Full-time',
    description:
      'Support member engagement, development initiatives, and internal coordination in a structured and service-oriented environment.',
    image: '/Career/MEBER%20DEVELOPMENT%20ASSISTANT.png',
  },
  {
    title: 'Member Treasury Assistant',
    department: 'Treasury',
    location: 'Veterans, Zamboanga City',
    type: 'Full-time',
    description:
      'Assist treasury processes, maintain transaction accuracy, and support reliable financial operations for members and branches.',
    image: '/Career/MEMBER%20TREASURY%20ASSISTANT.png',
  },
  {
    title: 'MRDSS Assistant',
    department: 'MRDSS',
    location: 'Veterans, Zamboanga City',
    type: 'Full-time',
    description:
      'Provide dependable support for department operations, documentation, coordination, and member-related service workflows.',
    image: '/Career/MRDSS%20ASSISTANT.png',
  },
  {
    title: 'New Accounts Assistant',
    department: 'Accounts',
    location: 'Veterans, Zamboanga City',
    type: 'Full-time',
    description:
      'Assist in opening and processing new accounts with accuracy, professionalism, and strong attention to member-facing service.',
    image: '/Career/NEW%20ACCOUNTS%20ASSISTANT.png',
  },
];

const VALUES = [
  {
    title: 'Professional Growth',
    description:
      'Build a long-term career in a workplace that values learning, contribution, and steady development.',
  },
  {
    title: 'Collaborative Culture',
    description:
      'Work in teams that value trust, accountability, and shared excellence.',
  },
  {
    title: 'Meaningful Impact',
    description:
      'Contribute to services that directly support members and communities.',
  },
];

const HIGHLIGHTS = [
  { value: '05', label: 'Open Roles' },
  { value: 'On-site', label: 'Work Setup' },
  { value: 'Zamboanga', label: 'Primary Office' },
];

export default function Career() {
  const [selectedJob, setSelectedJob] = useState(JOB_OPENINGS[0]);
  const [jobOpenings, setJobOpenings] = useState(JOB_OPENINGS);

  const showcaseAnchorRef = useRef(null);
  const showcaseStageRef = useRef(null);
  const applyAnchorRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const loadJobs = async () => {
      try {
        const openings = await listOpenJobOpenings();

        if (!cancelled && openings.length) {
          setJobOpenings(openings);
          setSelectedJob(openings[0]);
        }
      } catch {
        if (!cancelled) {
          setJobOpenings(JOB_OPENINGS);
          setSelectedJob(JOB_OPENINGS[0]);
        }
      }
    };

    loadJobs();

    return () => {
      cancelled = true;
    };
  }, []);

  const getNavOffset = () => {
    if (typeof window === 'undefined') return 112;
    const rootStyles = getComputedStyle(document.documentElement);
    const navSpace = parseFloat(rootStyles.getPropertyValue('--career-nav-space'));
    return Number.isNaN(navSpace) ? 112 : navSpace;
  };

  const scrollToAnchor = (ref) => {
    if (typeof window === 'undefined' || !ref.current) return;
    const navOffset = getNavOffset();
    const y = ref.current.getBoundingClientRect().top + window.scrollY - navOffset;
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
  };

  const handleSelectJob = (job) => {
    setSelectedJob(job);
    if (typeof window !== 'undefined' && window.innerWidth <= 920) {
      requestAnimationFrame(() => scrollToAnchor(showcaseAnchorRef));
    }
  };

  return (
    <>
      <Navbar />

      <main className="cp">
        {/* ── HERO ── */}
        <section className="cp-screen cp-hero" id="top">
          <div className="cp-hero-grid" aria-hidden="true" />
          <div className="cp-hero-glow" aria-hidden="true" />

          <img
            src="/Logos/Logo.png"
            alt=""
            className="cp-hero-rotating-logo"
            aria-hidden="true"
          />

          <div className="cp-hero-eyebrow-wrap">
            <div className="cp-eyebrow">
              <span className="cp-eyebrow-dot" aria-hidden="true" />
              MEMPCO Careers
            </div>
          </div>

          <div className="cp-hero-shell">
            <div className="cp-hero-copy">
              <h1 className="cp-hero-title">
                Shape your future
                <br />
                <em>with purpose.</em>
              </h1>

              <p className="cp-hero-sub">
                Explore career opportunities built around professionalism,
                growth, and meaningful service to members and communities.
              </p>

              <div className="cp-hero-actions">
                <button
                  type="button"
                  className="cp-btn cp-btn--solid"
                  onClick={() => scrollToAnchor(showcaseAnchorRef)}
                >
                  View Open Positions
                </button>
                <button
                  type="button"
                  className="cp-btn cp-btn--ghost"
                  onClick={() => scrollToAnchor(applyAnchorRef)}
                >
                  Why Join Us
                </button>
              </div>

              <div className="cp-hero-stats">
                {HIGHLIGHTS.map((h) => (
                  <div key={h.label} className="cp-hero-stat-card">
                    <span className="cp-hero-stat-value">
                      {h.label === 'Open Roles' ? String(jobOpenings.length).padStart(2, '0') : h.value}
                    </span>
                    <span className="cp-hero-stat-label">{h.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <aside className="cp-hero-panel" aria-label="Hiring overview">
              <span className="cp-hero-panel-badge">Now accepting applicants</span>

              <div className="cp-hero-panel-wordmark">
                <span className="cp-hero-word cp-hero-word--outline">NOW</span>
                <span className="cp-hero-word cp-hero-word--solid">HIRING</span>
              </div>

              <div className="cp-hero-role-minimal">
                <span className="cp-hero-role-label">Featured opening</span>
                <h2 className="cp-hero-role-title">{selectedJob.title}</h2>
                <p className="cp-hero-role-text">{selectedJob.description}</p>

                <div className="cp-hero-role-chips">
                  <span className="cp-chip">{selectedJob.type}</span>
                  <span className="cp-chip cp-chip--soft">{selectedJob.department}</span>
                  <span className="cp-chip cp-chip--ghost">{selectedJob.location}</span>
                </div>
              </div>

              <div className="cp-hero-process">
                <div className="cp-hero-process-item">
                  <span>01</span>
                  <strong>Select role</strong>
                </div>
                <div className="cp-hero-process-item">
                  <span>02</span>
                  <strong>Review details</strong>
                </div>
                <div className="cp-hero-process-item">
                  <span>03</span>
                  <strong>Apply</strong>
                </div>
              </div>
            </aside>
          </div>
        </section>

        {/* ── SHOWCASE ── */}
        <section className="cp-screen cp-showcase-screen" id="positions">
          <div
            ref={showcaseAnchorRef}
            className="cp-scroll-anchor"
            aria-hidden="true"
          />

          <aside className="cp-tabs">
            <p className="cp-section-kicker">Open Positions</p>

            <nav className="cp-tab-nav" role="tablist" aria-label="Job openings">
              {jobOpenings.map((job, i) => {
                const isActive = selectedJob.title === job.title;
                return (
                  <button
                    key={`${job.title}-${i}`}
                    role="tab"
                    aria-selected={isActive}
                    type="button"
                    className={`cp-tab${isActive ? ' cp-tab--active' : ''}`}
                    onClick={() => handleSelectJob(job)}
                  >
                    <span className="cp-tab-num">{String(i + 1).padStart(2, '0')}</span>
                    <div className="cp-tab-body">
                      <span className="cp-tab-label">{job.title}</span>
                      <span className="cp-tab-dept">{job.department}</span>
                    </div>
                  </button>
                );
              })}
            </nav>

            <p className="cp-tab-hint">Select a role to view details</p>
          </aside>

          <div className="cp-showcase-col" ref={showcaseStageRef}>
            <div className="cp-showcase-head">
              <p className="cp-section-kicker">Role Details</p>
              <p className="cp-showcase-sub">
                {jobOpenings.length} positions · {selectedJob.department} · {selectedJob.location}
              </p>
            </div>

            <div className="cp-showcase-main">
              <div className="cp-showcase-visual">
                {selectedJob.image ? (
                  <img
                    src={selectedJob.image}
                    alt={`${selectedJob.title} recruitment poster`}
                    className="cp-showcase-image"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="cp-showcase-placeholder">
                    <span className="cp-placeholder-badge">Poster Coming Soon</span>
                    <h3>{selectedJob.title}</h3>
                    <p>
                      The role details are available. The visual job poster will be added once ready.
                    </p>
                  </div>
                )}
              </div>

              <div className="cp-showcase-details">
                <p className="cp-section-kicker">Selected Role</p>
                <h2 className="cp-showcase-title">{selectedJob.title}</h2>
                <p className="cp-showcase-desc">{selectedJob.description}</p>

                <div className="cp-showcase-chips">
                  <span className="cp-chip">{selectedJob.type}</span>
                  <span className="cp-chip cp-chip--soft">{selectedJob.department}</span>
                  <span className="cp-chip cp-chip--ghost">{selectedJob.location}</span>
                </div>

                <div className="cp-showcase-stats">
                  <div className="cp-showcase-stat">
                    <span className="cp-showcase-stat-label">Department</span>
                    <strong>{selectedJob.department}</strong>
                  </div>
                  <div className="cp-showcase-stat">
                    <span className="cp-showcase-stat-label">Location</span>
                    <strong>{selectedJob.location}</strong>
                  </div>
                  <div className="cp-showcase-stat">
                    <span className="cp-showcase-stat-label">Employment</span>
                    <strong>{selectedJob.type}</strong>
                  </div>
                </div>

                <div className="cp-showcase-summary">
                  <div className="cp-showcase-summary-item">
                    <span>Environment</span>
                    <strong>Structured and professional</strong>
                  </div>
                  <div className="cp-showcase-summary-item">
                    <span>Career focus</span>
                    <strong>Long-term growth and service</strong>
                  </div>
                </div>

                <div className="cp-showcase-actions">
                  <button
                    type="button"
                    className="cp-btn cp-btn--solid"
                    onClick={() => scrollToAnchor(applyAnchorRef)}
                  >
                    Apply for this Role
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                      <path d="M2 6.5h9M7.5 2.5l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── WHY JOIN / APPLY ── */}
        <section className="cp-screen cp-apply-screen" id="apply">
          <div
            ref={applyAnchorRef}
            className="cp-scroll-anchor"
            aria-hidden="true"
          />
          <div className="cp-apply-grid" aria-hidden="true" />
          <div className="cp-apply-glow" aria-hidden="true" />

          <div className="cp-apply-shell">
            <header className="cp-apply-header">
              <p className="cp-section-kicker">Why Join MEMPCO</p>
              <h2 className="cp-apply-title">
                A workplace built for
                <br />
                <em>long-term growth.</em>
              </h2>
            </header>

            <div className="cp-apply-columns">
              <div className="cp-values-panel">
                <div className="cp-values-panel-head">
                  <p className="cp-section-kicker">Core Values</p>
                  <h3 className="cp-values-panel-title">
                    What makes the experience meaningful
                  </h3>
                  <p className="cp-values-panel-text">
                    Build a career in a workplace that values consistency,
                    professional development, teamwork, and real contribution.
                  </p>
                </div>

                <div className="cp-values-list">
                  {VALUES.map((v, i) => (
                    <article key={v.title} className="cp-value-card">
                      <span className="cp-value-index">{String(i + 1).padStart(2, '0')}</span>
                      <div className="cp-value-body">
                        <h4>{v.title}</h4>
                        <p>{v.description}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div className="cp-apply-panel">
                <div className="cp-apply-panel-top">
                  <p className="cp-section-kicker">Application</p>
                  <h3 className="cp-apply-panel-title">
                    Ready to apply for <em>{selectedJob.title}</em> ?
                  </h3>
                  <p className="cp-apply-panel-text">
                    Move toward a career grounded in service, professionalism,
                    and meaningful contribution. Your selected role is ready for
                    the next step.
                  </p>
                </div>

                <div className="cp-apply-panel-chips">
                  <span className="cp-chip">{selectedJob.type}</span>
                  <span className="cp-chip cp-chip--soft">{selectedJob.department}</span>
                  <span className="cp-chip cp-chip--ghost">{selectedJob.location}</span>
                </div>

                <div className="cp-apply-role-card">
                  <span className="cp-apply-role-label">Selected opening</span>
                  <strong className="cp-apply-role-title">{selectedJob.title}</strong>
                  <p className="cp-apply-role-desc">{selectedJob.description}</p>
                </div>

                <div className="cp-apply-actions">
                  <button type="button" className="cp-btn cp-btn--solid">
                    Submit Application
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
