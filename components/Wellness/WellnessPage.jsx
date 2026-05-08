import './WellnessPage.css';

const wellnessSections = [
  {
    id: 'service-overview',
    chip: 'Overview',
    meta: 'Coming soon',
    eyebrow: 'Wellness Service',
    title: 'Service Overview',
    desc: 'Coming soon...',
    accent: 'Coming soon...',
    panelLabel: 'Service',
    panelValue: 'Wellness',
    panelSub: 'Coming soon...',
    details: [
      { name: 'Coverage', note: null, value: 'Coming soon...' },
      { name: 'Availability', note: null, value: 'Coming soon...' },
      { name: 'Programs', note: null, value: 'Coming soon...' },
      { name: 'Requirements', note: null, value: 'Coming soon...' },
    ],
  },
  {
    id: 'services-and-support',
    chip: 'Support',
    meta: 'Coming soon',
    eyebrow: 'Programs & Support',
    title: 'Services and Support',
    desc: 'Coming soon...',
    accent: 'Coming soon...',
    panelLabel: 'Focus',
    panelValue: 'Care',
    panelSub: 'Coming soon...',
    details: [
      { name: 'Consultation', note: null, value: 'Coming soon...' },
      { name: 'Member Support', note: null, value: 'Coming soon...' },
      { name: 'Wellness Activities', note: null, value: 'Coming soon...' },
      { name: 'Program Access', note: null, value: 'Coming soon...' },
    ],
  },
  {
    id: 'guidelines-and-reminders',
    chip: 'Guidelines',
    meta: 'Coming soon',
    eyebrow: 'Guidelines & Reminders',
    title: 'Guidelines and Reminders',
    desc: 'Coming soon...',
    accent: 'Coming soon...',
    panelLabel: 'Guide',
    panelValue: 'Health',
    panelSub: 'Coming soon...',
    details: [
      { name: 'Policies', note: null, value: 'Coming soon...' },
      { name: 'Member Guidance', note: null, value: 'Coming soon...' },
      { name: 'Service Notes', note: null, value: 'Coming soon...' },
      { name: 'Program Rules', note: null, value: 'Coming soon...' },
    ],
  },
];

const stats = [
  { value: '01', label: 'Wellness Service' },
  { value: 'MEMPCO', label: 'Allied Service' },
  { value: 'Soon', label: 'Full details' },
  { value: 'Soon', label: 'Program info' },
];

const processCards = [
  {
    step: '01',
    title: 'Inquiry',
    text: 'Coming soon...',
  },
  {
    step: '02',
    title: 'Coordination',
    text: 'Coming soon...',
  },
  {
    step: '03',
    title: 'Participation',
    text: 'Coming soon...',
  },
];

export default function WellnessPage() {
  return (
    <div className="wp">
      <section className="wp-section wp-hero" aria-labelledby="wp-heading">
        <div className="wp-inner">
          <nav className="wp-breadcrumb" aria-label="Breadcrumb">
            <span>Services</span>
            <span className="wp-breadcrumb-sep">/</span>
            <span>Allied Services</span>
            <span className="wp-breadcrumb-sep">/</span>
            <span className="wp-breadcrumb-active">Wellness</span>
          </nav>

          <span className="wp-eyebrow">MEMPCO Allied Services</span>

          <h1 className="wp-hero-title" id="wp-heading">
            Wellness.
            <br />
            <span className="accent">For members.</span>
          </h1>

          <p className="wp-hero-tagline">
            Coming soon...
          </p>

          <div className="wp-section-chips">
            {wellnessSections.map((section) => (
              <a href={`#${section.id}`} className="wp-section-chip" key={section.id}>
                <span className="wp-section-chip-name">{section.chip}</span>
                <span className="wp-section-chip-meta">{section.meta}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="wp-section wp-stats" aria-label="Key figures">
        <div className="wp-inner">
          <div className="wp-stats-grid">
            {stats.map((stat, index) => (
              <div className="wp-stat" key={index}>
                <span className="wp-stat-value">{stat.value}</span>
                <span className="wp-stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="wp-section wp-intro" aria-label="Wellness introduction">
        <div className="wp-inner">
          <p className="wp-intro-kicker">Wellness Support</p>
          <h2 className="wp-intro-title">Wellness service details are on the way.</h2>
          <p className="wp-intro-sub">
            Coming soon...
          </p>
        </div>
      </section>

      <section className="wp-section wp-details" aria-label="Wellness details">
        <div className="wp-inner">
          {wellnessSections.map((section) => (
            <article className="wp-detail-card" id={section.id} key={section.id}>
              <div className="wp-detail-header">
                <div className="wp-detail-header-left">
                  <p className="wp-detail-eyebrow">{section.eyebrow}</p>
                  <h2 className="wp-detail-title">{section.title}</h2>
                  <p className="wp-detail-desc">{section.desc}</p>
                  <span className="wp-detail-accent">{section.accent}</span>
                </div>

                <div className="wp-detail-panel">
                  <span className="wp-detail-panel-label">{section.panelLabel}</span>
                  <span className="wp-detail-panel-value">{section.panelValue}</span>
                  <span className="wp-detail-panel-sub">{section.panelSub}</span>
                </div>
              </div>

              <div className="wp-detail-list">
                <div className="wp-detail-list-label" aria-hidden="true">
                  <span>Detail</span>
                  <span>Information</span>
                </div>

                {section.details.map((detail, index) => (
                  <div className="wp-detail-row" key={index}>
                    <div>
                      <p className="wp-detail-name">{detail.name}</p>
                      {detail.note && <p className="wp-detail-note">{detail.note}</p>}
                    </div>
                    <p className="wp-detail-value">{detail.value}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="wp-section wp-process" aria-labelledby="wp-process-heading">
        <div className="wp-inner">
          <p className="wp-process-kicker">Process</p>
          <h2 className="wp-process-title" id="wp-process-heading">
            Service flow coming soon.
          </h2>

          <div className="wp-process-grid">
            {processCards.map((card, index) => (
              <div className="wp-process-card" key={index}>
                <p className="wp-process-step">{card.step}</p>
                <p className="wp-process-card-title">{card.title}</p>
                <p className="wp-process-card-text">{card.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="wp-section wp-note" aria-labelledby="wp-note-heading">
        <div className="wp-inner">
          <div className="wp-note-inner">
            <p className="wp-note-kicker">Wellness</p>
            <h2 className="wp-note-title" id="wp-note-heading">
              Full wellness information
              <br />
              is coming soon...
            </h2>
            <p className="wp-note-text">
              Coming soon...
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}