'use client';

import { useEffect, useRef, useState } from 'react';
import Navbar from '@/components/Navbar/Navbar';
import Footer from '@/components/Footer/Footer';
import { createJobApplication, listOpenJobOpenings } from '@/lib/hr/hrContent';
import '../jobs/jobs.css';

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

export default function Career() {
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobOpenings, setJobOpenings] = useState([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [jobLoadError, setJobLoadError] = useState('');
  const [applicationForm, setApplicationForm] = useState({
    applicantName: '',
    email: '',
    phone: '',
    resumeFile: null,
    resumeFileName: '',
    coverLetter: '',
  });
  const [applicationStatus, setApplicationStatus] = useState({ type: '', text: '' });
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
  const [isSubmittingApplication, setIsSubmittingApplication] = useState(false);

  useEffect(() => {
    if (!isApplicationModalOpen) return;

    const onKey = (event) => {
      if (event.key === 'Escape') {
        setIsApplicationModalOpen(false);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isApplicationModalOpen]);

  const showcaseAnchorRef = useRef(null);
  const showcaseStageRef = useRef(null);
  const applyAnchorRef = useRef(null);
  const resumeInputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const loadJobs = async () => {
      setIsLoadingJobs(true);
      setJobLoadError('');
      try {
        const openings = await listOpenJobOpenings();

        if (!cancelled) {
          setJobOpenings(openings);
          setSelectedJob((current) => {
            if (!current) return openings[0] || null;
            return openings.find((opening) => opening.id === current.id) || openings[0] || null;
          });
        }
      } catch (error) {
        if (!cancelled) {
          setJobOpenings([]);
          setSelectedJob(null);
          setJobLoadError(error.message || 'Unable to load open positions.');
        }
      } finally {
        if (!cancelled) setIsLoadingJobs(false);
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
    setApplicationStatus({ type: '', text: '' });
    if (typeof window !== 'undefined' && window.innerWidth <= 920) {
      requestAnimationFrame(() => scrollToAnchor(showcaseAnchorRef));
    }
  };

  const updateApplicationForm = (field, value) => {
    setApplicationForm((current) => ({ ...current, [field]: value }));
    setApplicationStatus({ type: '', text: '' });
  };

  const handleResumeChange = (event) => {
    const file = event.target.files?.[0] || null;
    setApplicationStatus({ type: '', text: '' });

    if (!file) {
      setApplicationForm((current) => ({
        ...current,
        resumeFile: null,
        resumeFileName: '',
      }));
      return;
    }

    setApplicationForm((current) => ({
      ...current,
      resumeFile: file,
      resumeFileName: file.name,
    }));
  };

  const handleApplicationSubmit = async (event) => {
    event.preventDefault();
    if (!selectedJob) {
      setApplicationStatus({
        type: 'error',
        text: 'Please select an open role before submitting your application.',
      });
      return;
    }

    setIsSubmittingApplication(true);
    setApplicationStatus({ type: '', text: '' });

    try {
      await createJobApplication({
        ...applicationForm,
        jobId: selectedJob.id || '',
        jobTitle: selectedJob.title,
      });

      setApplicationForm({
        applicantName: '',
        email: '',
        phone: '',
        resumeFile: null,
        resumeFileName: '',
        coverLetter: '',
      });
      if (resumeInputRef.current) {
        resumeInputRef.current.value = '';
      }
      setApplicationStatus({ type: '', text: '' });
      setIsApplicationModalOpen(false);
    } catch (error) {
      setApplicationStatus({
        type: 'error',
        text: error.message || 'Unable to submit application. Please try again.',
      });
    } finally {
      setIsSubmittingApplication(false);
    }
  };

  const hasOpenings = jobOpenings.length > 0;
  const selectedTitle = selectedJob?.title || (isLoadingJobs ? 'Loading openings' : 'No open roles');
  const selectedDescription =
    selectedJob?.description ||
    (jobLoadError
      ? jobLoadError
      : 'There are no published career openings at the moment. Please check back soon.');
  const selectedType = selectedJob?.type || 'Careers';
  const selectedDepartment = selectedJob?.department || 'MEMPCO';
  const selectedLocation = selectedJob?.location || 'Zamboanga';

  return (
    <>
      {!isApplicationModalOpen && <Navbar />}

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

            </div>

            <aside className="cp-hero-panel" aria-label="Hiring overview">
              <span className="cp-hero-panel-badge">Now accepting applicants</span>

              <div className="cp-hero-panel-wordmark">
                <span className="cp-hero-word cp-hero-word--outline">NOW</span>
                <span className="cp-hero-word cp-hero-word--solid">HIRING</span>
              </div>

              <div className="cp-hero-role-minimal">
                <span className="cp-hero-role-label">Featured opening</span>
                <h2 className="cp-hero-role-title">{selectedTitle}</h2>
                <p className="cp-hero-role-text">{selectedDescription}</p>

                <div className="cp-hero-role-chips">
                  <span className="cp-chip">{selectedType}</span>
                  <span className="cp-chip cp-chip--soft">{selectedDepartment}</span>
                  <span className="cp-chip cp-chip--ghost">{selectedLocation}</span>
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
                const isActive = selectedJob?.id === job.id;
                return (
                  <button
                    key={job.id || `${job.title}-${i}`}
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

            <p className="cp-tab-hint">
              {isLoadingJobs ? 'Loading roles from HR Admin' : hasOpenings ? 'Select a role to view details' : 'No roles are published right now'}
            </p>
          </aside>

          <div className="cp-showcase-col" ref={showcaseStageRef}>
            <div className="cp-showcase-head">
              <p className="cp-section-kicker">Role Details</p>
              <p className="cp-showcase-sub">
                {jobOpenings.length} positions - {selectedDepartment} - {selectedLocation}
              </p>
            </div>

            <div className="cp-showcase-main">
              <div className="cp-showcase-visual">
                {selectedJob?.image ? (
                  <img
                    src={selectedJob.image}
                    alt={`${selectedJob.title} recruitment poster`}
                    className="cp-showcase-image"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="cp-showcase-placeholder">
                    <span className="cp-placeholder-badge">
                      {isLoadingJobs ? 'Loading Openings' : hasOpenings ? 'Poster Coming Soon' : 'No Published Roles'}
                    </span>
                    <h3>{selectedTitle}</h3>
                    <p>
                      {hasOpenings
                        ? 'The role details are available. The visual job poster will be added once ready.'
                        : selectedDescription}
                    </p>
                  </div>
                )}
              </div>

              <div className="cp-showcase-details">
                <p className="cp-section-kicker">Selected Role</p>
                <h2 className="cp-showcase-title">{selectedTitle}</h2>
                <p className="cp-showcase-desc">{selectedDescription}</p>

                <div className="cp-showcase-chips">
                  <span className="cp-chip">{selectedType}</span>
                  <span className="cp-chip cp-chip--soft">{selectedDepartment}</span>
                  <span className="cp-chip cp-chip--ghost">{selectedLocation}</span>
                </div>

                <div className="cp-showcase-stats">
                  <div className="cp-showcase-stat">
                    <span className="cp-showcase-stat-label">Department</span>
                    <strong>{selectedDepartment}</strong>
                  </div>
                  <div className="cp-showcase-stat">
                    <span className="cp-showcase-stat-label">Location</span>
                    <strong>{selectedLocation}</strong>
                  </div>
                  <div className="cp-showcase-stat">
                    <span className="cp-showcase-stat-label">Employment</span>
                    <strong>{selectedType}</strong>
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
                    disabled={!hasOpenings}
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
                    Ready to apply for <em>{selectedTitle}</em> ?
                  </h3>
                  <p className="cp-apply-panel-text">
                    Move toward a career grounded in service, professionalism,
                    and meaningful contribution. Your selected role is ready for
                    the next step.
                  </p>
                </div>

                <div className="cp-apply-panel-chips">
                  <span className="cp-chip">{selectedType}</span>
                  <span className="cp-chip cp-chip--soft">{selectedDepartment}</span>
                  <span className="cp-chip cp-chip--ghost">{selectedLocation}</span>
                </div>

                <div className="cp-apply-role-card">
                  <span className="cp-apply-role-label">Selected opening</span>
                  <strong className="cp-apply-role-title">{selectedTitle}</strong>
                  <p className="cp-apply-role-desc">{selectedDescription}</p>
                </div>

                <div className="cp-apply-actions">
                  <button
                    type="button"
                    className="cp-btn cp-btn--solid"
                    onClick={() => setIsApplicationModalOpen(true)}
                    disabled={!hasOpenings}
                  >
                    Submit Application
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {isApplicationModalOpen ? (
        <div
          className="cp-application-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Submit application"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setIsApplicationModalOpen(false);
            }
          }}
        >
          <form className="cp-application-dialog" onSubmit={handleApplicationSubmit}>
            <div className="cp-application-dialog-head">
              <div>
                <p className="cp-section-kicker">Application</p>
                <h3>{selectedTitle}</h3>
                <span>{selectedDepartment} - {selectedLocation}</span>
              </div>
              <button
                type="button"
                className="cp-application-close"
                onClick={() => setIsApplicationModalOpen(false)}
                aria-label="Close application form"
              >
                &times;
              </button>
            </div>

            {applicationStatus.text ? (
              <div className={`cp-application-alert cp-application-alert--${applicationStatus.type}`}>
                {applicationStatus.text}
              </div>
            ) : null}

            <label className="cp-application-field">
              <span>Full Name</span>
              <input
                type="text"
                required
                value={applicationForm.applicantName}
                onChange={(event) => updateApplicationForm('applicantName', event.target.value)}
                placeholder="Enter your full name"
              />
            </label>

            <div className="cp-application-row">
              <label className="cp-application-field">
                <span>Email</span>
                <input
                  type="email"
                  required
                  value={applicationForm.email}
                  onChange={(event) => updateApplicationForm('email', event.target.value)}
                  placeholder="name@email.com"
                />
              </label>

              <label className="cp-application-field">
                <span>Phone</span>
                <input
                  type="tel"
                  required
                  value={applicationForm.phone}
                  onChange={(event) => updateApplicationForm('phone', event.target.value)}
                  placeholder="09XX XXX XXXX"
                />
              </label>
            </div>

            <label className="cp-application-field">
              <span>Resume Attachment</span>
              <input
                ref={resumeInputRef}
                type="file"
                required
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleResumeChange}
              />
              <small className="cp-application-file-hint">
                {applicationForm.resumeFileName || 'Accepted files: PDF, DOC, or DOCX up to 10 MB.'}
              </small>
            </label>

            <label className="cp-application-field">
              <span>Cover Letter</span>
              <textarea
                value={applicationForm.coverLetter}
                onChange={(event) => updateApplicationForm('coverLetter', event.target.value)}
                placeholder="Briefly introduce yourself and your interest in the role."
                rows={3}
              />
            </label>

            <div className="cp-application-dialog-actions">
              <button
                type="button"
                className="cp-btn cp-btn--ghost"
                onClick={() => setIsApplicationModalOpen(false)}
                disabled={isSubmittingApplication}
              >
                Cancel
              </button>
              <button type="submit" className="cp-btn cp-btn--solid" disabled={isSubmittingApplication}>
                {isSubmittingApplication ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <Footer />
    </>
  );
}
