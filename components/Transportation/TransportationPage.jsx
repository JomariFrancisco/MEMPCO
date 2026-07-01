import './TransportationPage.css';

const serviceAreas = [
  {
    id: 'service-overview',
    kicker: '01 · Overview',
    title: 'Service coverage',
    text: 'Vehicle coverage, service areas, and availability will be published here.',
    label: 'Coverage',
  },
  {
    id: 'booking-coordination',
    kicker: '02 · Scheduling',
    title: 'Booking coordination',
    text: 'Reservation steps, schedules, and pick-up arrangements will be organized here.',
    label: 'Booking',
  },
  {
    id: 'guidelines-reminders',
    kicker: '03 · Guidelines',
    title: 'Travel guidance',
    text: 'Member requirements, service rules, and travel reminders will be listed here.',
    label: 'Guidance',
  },
];

const processCards = [
  { step: '01', title: 'Send an inquiry', text: 'Ask about the service and intended trip.' },
  { step: '02', title: 'Coordinate details', text: 'Confirm the schedule, route, and member requirements.' },
  { step: '03', title: 'Receive confirmation', text: 'Final arrangements will be confirmed by MEMPCO.' },
];

function TransportIcon() {
  return (
    <svg viewBox="0 0 240 180" aria-hidden="true">
      <path d="M50 118h140l-14-48c-3-11-12-18-23-18H87c-11 0-20 7-23 18l-14 48Z" />
      <path d="M42 118h156v22H42z" />
      <path d="M73 52 58 93M167 52l15 41M75 93h90" />
      <circle cx="76" cy="142" r="15" />
      <circle cx="164" cy="142" r="15" />
      <path d="M31 86h22M187 86h22M92 72h56" />
    </svg>
  );
}

export default function TransportationPage() {
  return (
    <div className="tp">
      <section className="tp-section tp-hero" aria-labelledby="tp-heading">
        <div className="tp-inner tp-hero-grid">
          <div className="tp-hero-copy">
            <nav className="tp-breadcrumb" aria-label="Breadcrumb">
              <span>Services</span><span>/</span><span>Allied Services</span><span>/</span>
              <span className="tp-breadcrumb-active">Transportation</span>
            </nav>

            <p className="tp-eyebrow">MEMPCO Allied Services</p>
            <h1 className="tp-hero-title" id="tp-heading">
              Transportation
              <span>Service.</span>
            </h1>
            <p className="tp-hero-tagline">
              A dedicated page for member transportation support, scheduling, and
              service guidance. Full operational details are coming soon.
            </p>

            <div className="tp-hero-links">
              {serviceAreas.map((item) => (
                <a href={`#${item.id}`} className="tp-hero-link" key={item.id}>
                  <span>{item.kicker}</span>
                  <strong>{item.title}</strong>
                </a>
              ))}
            </div>
          </div>

          <div className="tp-hero-visual" aria-label="Transportation service preview">
            <div className="tp-visual-mark"><TransportIcon /></div>
            <p className="tp-visual-kicker">Transportation support</p>
            <h2>Member mobility, coordinated clearly.</h2>
            <div className="tp-visual-grid">
              <div><strong>Inquiry</strong><span>Service availability</span></div>
              <div><strong>Schedule</strong><span>Trip coordination</span></div>
              <div><strong>Confirm</strong><span>Final arrangements</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="tp-section tp-stats" aria-label="Transportation status">
        <div className="tp-inner tp-stats-grid">
          <div><strong>01</strong><span>Allied service</span></div>
          <div><strong>03</strong><span>Service stages</span></div>
          <div><strong>Member</strong><span>Focused support</span></div>
          <div><strong>Soon</strong><span>Full service details</span></div>
        </div>
      </section>

      <section className="tp-section tp-overview" aria-labelledby="tp-overview-heading">
        <div className="tp-inner">
          <div className="tp-section-head">
            <p className="tp-section-kicker">Service overview</p>
            <h2 className="tp-section-title" id="tp-overview-heading">
              Transportation information, organized clearly.
            </h2>
            <p className="tp-section-text">
              Each part of the service will have a defined place for coverage,
              scheduling, requirements, and member guidance.
            </p>
          </div>

          <div className="tp-overview-grid">
            {serviceAreas.map((item) => (
              <article className="tp-overview-card" id={item.id} key={item.id}>
                <span>{item.kicker}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <strong>{item.label} · Coming soon</strong>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="tp-section tp-process" aria-labelledby="tp-process-heading">
        <div className="tp-inner">
          <div className="tp-section-head">
            <p className="tp-section-kicker">Service flow</p>
            <h2 className="tp-section-title" id="tp-process-heading">
              A simple three-step coordination process.
            </h2>
          </div>
          <div className="tp-process-grid">
            {processCards.map((card) => (
              <article className="tp-process-card" key={card.step}>
                <span>{card.step}</span>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="tp-section tp-note" aria-labelledby="tp-note-heading">
        <div className="tp-inner">
          <div className="tp-note-inner">
            <p>Transportation service</p>
            <h2 id="tp-note-heading">Complete service information is coming soon.</h2>
            <span>Contact MEMPCO for current transportation inquiries and coordination.</span>
          </div>
        </div>
      </section>
    </div>
  );
}
