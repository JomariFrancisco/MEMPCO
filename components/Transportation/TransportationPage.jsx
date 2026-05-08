import './TransportationPage.css';

const transportSections = [
  {
    id: 'service-overview',
    chip: 'Overview',
    meta: 'Coming soon',
    eyebrow: 'Transportation Service',
    title: 'Service Overview',
    desc: 'Coming soon...',
    accent: 'Coming soon...',
    panelLabel: 'Service',
    panelValue: 'Transport',
    panelSub: 'Coming soon...',
    details: [
      { name: 'Coverage', note: null, value: 'Coming soon...' },
      { name: 'Availability', note: null, value: 'Coming soon...' },
      { name: 'Service Area', note: null, value: 'Coming soon...' },
      { name: 'Requirements', note: null, value: 'Coming soon...' },
    ],
  },
  {
    id: 'booking-coordination',
    chip: 'Scheduling',
    meta: 'Coming soon',
    eyebrow: 'Booking & Coordination',
    title: 'Booking and Coordination',
    desc: 'Coming soon...',
    accent: 'Coming soon...',
    panelLabel: 'Process',
    panelValue: 'Booking',
    panelSub: 'Coming soon...',
    details: [
      { name: 'Reservation', note: null, value: 'Coming soon...' },
      { name: 'Trip Schedule', note: null, value: 'Coming soon...' },
      { name: 'Pick-up Details', note: null, value: 'Coming soon...' },
      { name: 'Confirmation', note: null, value: 'Coming soon...' },
    ],
  },
  {
    id: 'guidelines-reminders',
    chip: 'Guidelines',
    meta: 'Coming soon',
    eyebrow: 'Guidelines & Reminders',
    title: 'Guidelines and Reminders',
    desc: 'Coming soon...',
    accent: 'Coming soon...',
    panelLabel: 'Guide',
    panelValue: 'Travel',
    panelSub: 'Coming soon...',
    details: [
      { name: 'Policies', note: null, value: 'Coming soon...' },
      { name: 'Member Guidance', note: null, value: 'Coming soon...' },
      { name: 'Travel Notes', note: null, value: 'Coming soon...' },
      { name: 'Service Rules', note: null, value: 'Coming soon...' },
    ],
  },
];

const stats = [
  { value: '01', label: 'Transportation Service' },
  { value: 'MEMPCO', label: 'Allied Service' },
  { value: 'Soon', label: 'Full details' },
  { value: 'Soon', label: 'Availability info' },
];

const processCards = [
  {
    step: '01',
    title: 'Inquiry',
    text: 'Coming soon...',
  },
  {
    step: '02',
    title: 'Scheduling',
    text: 'Coming soon...',
  },
  {
    step: '03',
    title: 'Confirmation',
    text: 'Coming soon...',
  },
];

export default function TransportationPage() {
  return (
    <div className="tp">
      <section className="tp-section tp-hero" aria-labelledby="tp-heading">
        <div className="tp-inner">
          <nav className="tp-breadcrumb" aria-label="Breadcrumb">
            <span>Services</span>
            <span className="tp-breadcrumb-sep">/</span>
            <span>Allied Services</span>
            <span className="tp-breadcrumb-sep">/</span>
            <span className="tp-breadcrumb-active">Transportation</span>
          </nav>

          <span className="tp-eyebrow">MEMPCO Allied Services</span>

          <h1 className="tp-hero-title" id="tp-heading">
            Transportation.
            <br />
            <span className="accent">For members.</span>
          </h1>

          <p className="tp-hero-tagline">
            Coming soon...
          </p>

          <div className="tp-section-chips">
            {transportSections.map((section) => (
              <a href={`#${section.id}`} className="tp-section-chip" key={section.id}>
                <span className="tp-section-chip-name">{section.chip}</span>
                <span className="tp-section-chip-meta">{section.meta}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="tp-section tp-stats" aria-label="Key figures">
        <div className="tp-inner">
          <div className="tp-stats-grid">
            {stats.map((stat, index) => (
              <div className="tp-stat" key={index}>
                <span className="tp-stat-value">{stat.value}</span>
                <span className="tp-stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="tp-section tp-intro" aria-label="Transportation introduction">
        <div className="tp-inner">
          <p className="tp-intro-kicker">Transportation Support</p>
          <h2 className="tp-intro-title">Transportation service details are on the way.</h2>
          <p className="tp-intro-sub">
            Coming soon...
          </p>
        </div>
      </section>

      <section className="tp-section tp-details" aria-label="Transportation details">
        <div className="tp-inner">
          {transportSections.map((section) => (
            <article className="tp-detail-card" id={section.id} key={section.id}>
              <div className="tp-detail-header">
                <div className="tp-detail-header-left">
                  <p className="tp-detail-eyebrow">{section.eyebrow}</p>
                  <h2 className="tp-detail-title">{section.title}</h2>
                  <p className="tp-detail-desc">{section.desc}</p>
                  <span className="tp-detail-accent">{section.accent}</span>
                </div>

                <div className="tp-detail-panel">
                  <span className="tp-detail-panel-label">{section.panelLabel}</span>
                  <span className="tp-detail-panel-value">{section.panelValue}</span>
                  <span className="tp-detail-panel-sub">{section.panelSub}</span>
                </div>
              </div>

              <div className="tp-detail-list">
                <div className="tp-detail-list-label" aria-hidden="true">
                  <span>Detail</span>
                  <span>Information</span>
                </div>

                {section.details.map((detail, index) => (
                  <div className="tp-detail-row" key={index}>
                    <div>
                      <p className="tp-detail-name">{detail.name}</p>
                      {detail.note && <p className="tp-detail-note">{detail.note}</p>}
                    </div>
                    <p className="tp-detail-value">{detail.value}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="tp-section tp-process" aria-labelledby="tp-process-heading">
        <div className="tp-inner">
          <p className="tp-process-kicker">Process</p>
          <h2 className="tp-process-title" id="tp-process-heading">
            Service flow coming soon.
          </h2>

          <div className="tp-process-grid">
            {processCards.map((card, index) => (
              <div className="tp-process-card" key={index}>
                <p className="tp-process-step">{card.step}</p>
                <p className="tp-process-card-title">{card.title}</p>
                <p className="tp-process-card-text">{card.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="tp-section tp-note" aria-labelledby="tp-note-heading">
        <div className="tp-inner">
          <div className="tp-note-inner">
            <p className="tp-note-kicker">Transportation</p>
            <h2 className="tp-note-title" id="tp-note-heading">
              Full transportation information
              <br />
              is coming soon...
            </h2>
            <p className="tp-note-text">
              Coming soon...
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}