import Link from 'next/link';
import './ServiceInquiryPage.css';

export default function ServiceInquiryPage({
  title,
  description,
  topics,
}) {
  return (
    <main className="allied-inquiry">
      <header className="allied-inquiry-hero">
        <div className="allied-inquiry-inner">
          <nav className="allied-inquiry-breadcrumb" aria-label="Breadcrumb">
            <Link href="/services">Services</Link>
            <span aria-hidden="true">/</span>
            <span>Allied Services</span>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{title}</span>
          </nav>

          <p className="allied-inquiry-eyebrow">MEMPCO Allied Services</p>
          <h1>{title}</h1>
          <p className="allied-inquiry-intro">{description}</p>

          <div className="allied-inquiry-actions">
            <Link className="allied-inquiry-button primary" href="/contact-details">
              Contact MEMPCO
            </Link>
            <Link className="allied-inquiry-button secondary" href="/branches">
              Find a Branch
            </Link>
          </div>

          <p className="allied-inquiry-note">
            Service details are not listed here yet. Please contact MEMPCO to confirm current information.
          </p>
        </div>
      </header>

      <section className="allied-inquiry-topics" aria-labelledby="allied-inquiry-topics-title">
        <div className="allied-inquiry-inner">
          <div className="allied-inquiry-section-head">
            <p className="allied-inquiry-kicker">Before you make plans</p>
            <h2 id="allied-inquiry-topics-title">What would you like to know?</h2>
            <p>Ask the MEMPCO team for the details that apply to your situation.</p>
          </div>

          <div className="allied-inquiry-topic-grid">
            {topics.map(({ title: topicTitle, description: topicDescription }) => (
              <article className="allied-inquiry-topic" key={topicTitle}>
                <p className="allied-inquiry-topic-label">Ask about</p>
                <h3>{topicTitle}</h3>
                <p>{topicDescription}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="allied-inquiry-contact" aria-labelledby="allied-inquiry-contact-title">
        <div className="allied-inquiry-inner allied-inquiry-contact-inner">
          <div>
            <p className="allied-inquiry-kicker">MEMPCO support</p>
            <h2 id="allied-inquiry-contact-title">Get current details directly from MEMPCO.</h2>
            <p>Our contact page can help you reach the right office for your inquiry.</p>
          </div>
          <Link className="allied-inquiry-button contact-button" href="/contact-details">
            Contact Us
          </Link>
        </div>
      </section>
    </main>
  );
}
