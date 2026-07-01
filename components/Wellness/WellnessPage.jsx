import './WellnessPage.css';

const serviceAreas = [
  {
    id: 'service-overview',
    kicker: '01 · Overview',
    title: 'Wellness coverage',
    text: 'Program coverage, availability, and member access details will be published here.',
    label: 'Coverage',
  },
  {
    id: 'services-and-support',
    kicker: '02 · Support',
    title: 'Programs and support',
    text: 'Consultation, wellness activities, and support options will be organized here.',
    label: 'Programs',
  },
  {
    id: 'guidelines-and-reminders',
    kicker: '03 · Guidelines',
    title: 'Member guidance',
    text: 'Requirements, program notes, and participation reminders will be listed here.',
    label: 'Guidance',
  },
];

const processCards = [
  { step: '01', title: 'Make an inquiry', text: 'Ask about available wellness and diagnostic support.' },
  { step: '02', title: 'Coordinate access', text: 'Confirm the program, schedule, and requirements.' },
  { step: '03', title: 'Receive guidance', text: 'MEMPCO will provide the final participation details.' },
];

function WellnessIcon() {
  return (
    <svg viewBox="0 0 220 190" aria-hidden="true">
      <path d="M110 158S39 117 39 67c0-25 19-42 42-42 14 0 24 7 29 18 6-11 16-18 30-18 23 0 41 17 41 42 0 50-71 91-71 91Z" />
      <path d="M66 94h25l12-29 17 56 13-27h22" />
      <circle cx="110" cy="95" r="80" />
    </svg>
  );
}

export default function WellnessPage() {
  return (
    <div className="wp">
      <section className="wp-section wp-hero" aria-labelledby="wp-heading">
        <div className="wp-inner wp-hero-grid">
          <div className="wp-hero-copy">
            <nav className="wp-breadcrumb" aria-label="Breadcrumb">
              <span>Services</span><span>/</span><span>Allied Services</span><span>/</span>
              <span className="wp-breadcrumb-active">Wellness</span>
            </nav>

            <p className="wp-eyebrow">MEMPCO Allied Services</p>
            <h1 className="wp-hero-title" id="wp-heading">
              Wellness &amp;
              <span>Diagnostics.</span>
            </h1>
            <p className="wp-hero-tagline">
              A dedicated page for member wellness programs, diagnostic support,
              and participation guidance. Full service details are coming soon.
            </p>

            <div className="wp-hero-links">
              {serviceAreas.map((item) => (
                <a href={`#${item.id}`} className="wp-hero-link" key={item.id}>
                  <span>{item.kicker}</span>
                  <strong>{item.title}</strong>
                </a>
              ))}
            </div>
          </div>

          <div className="wp-hero-visual" aria-label="Wellness and diagnostics preview">
            <div className="wp-visual-mark"><WellnessIcon /></div>
            <p className="wp-visual-kicker">Wellness support</p>
            <h2>Member care, presented with clarity.</h2>
            <div className="wp-visual-grid">
              <div><strong>Inquire</strong><span>Available support</span></div>
              <div><strong>Coordinate</strong><span>Program access</span></div>
              <div><strong>Participate</strong><span>Member guidance</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="wp-section wp-stats" aria-label="Wellness status">
        <div className="wp-inner wp-stats-grid">
          <div><strong>01</strong><span>Allied service</span></div>
          <div><strong>03</strong><span>Service stages</span></div>
          <div><strong>Member</strong><span>Focused care</span></div>
          <div><strong>Soon</strong><span>Full program details</span></div>
        </div>
      </section>

      <section className="wp-section wp-overview" aria-labelledby="wp-overview-heading">
        <div className="wp-inner">
          <div className="wp-section-head">
            <p className="wp-section-kicker">Service overview</p>
            <h2 className="wp-section-title" id="wp-overview-heading">
              Wellness information, organized clearly.
            </h2>
            <p className="wp-section-text">
              Each part of the service will have a defined place for programs,
              access, requirements, and member guidance.
            </p>
          </div>

          <div className="wp-overview-grid">
            {serviceAreas.map((item) => (
              <article className="wp-overview-card" id={item.id} key={item.id}>
                <span>{item.kicker}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <strong>{item.label} · Coming soon</strong>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="wp-section wp-process" aria-labelledby="wp-process-heading">
        <div className="wp-inner">
          <div className="wp-section-head">
            <p className="wp-section-kicker">Service flow</p>
            <h2 className="wp-section-title" id="wp-process-heading">
              A simple three-step support process.
            </h2>
          </div>
          <div className="wp-process-grid">
            {processCards.map((card) => (
              <article className="wp-process-card" key={card.step}>
                <span>{card.step}</span>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="wp-section wp-note" aria-labelledby="wp-note-heading">
        <div className="wp-inner">
          <div className="wp-note-inner">
            <p>Wellness &amp; diagnostics</p>
            <h2 id="wp-note-heading">Complete program information is coming soon.</h2>
            <span>Contact MEMPCO for current wellness and diagnostic inquiries.</span>
          </div>
        </div>
      </section>
    </div>
  );
}
