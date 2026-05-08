'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Navbar from '@/components/Navbar/Navbar';
import Footer from '@/components/Footer/Footer';
import './news.css';

const NEWS_ITEMS = [
  {
    title: 'MEMPCO Receives Share Capital Build-Up Award at NATCCO Congress',
    date: 'May 2, 2026',
    excerpt:
      'MEMPCO was honored with the Share Capital Build-Up Award during the 40th NATCCO General Assembly and 24th Leaders’ Congress held in Iloilo City, reflecting the trust, commitment, and collective effort of its members, officers, and stakeholders.',
    fullArticle: [
      'MEMPCO is deeply honored to receive the Share Capital Build-Up Award during the 40th NATCCO General Assembly and 24th Leaders’ Congress held in Iloilo City.',
      'With the theme “One Year to Gold,” this recognition reflects the unwavering trust, commitment, and collective effort of our members, officers, and stakeholders in strengthening our cooperative and building a more empowered community.',
      'We extend our sincere appreciation to NATCCO for this recognition. This milestone inspires us even more to stay committed to our mission and continue creating meaningful impact as we move forward together.',
    ],
    type: 'news',
    category: 'News',
    image: '/About/40th NATCCO GA.png',
  },
  {
    title: 'MEMPCO Joins the 124th Labor Day Job Fair',
    date: 'May 3, 2026',
    excerpt:
      'MEMPCO proudly took part in the 124th Labor Day Job Fair at KCC Mall de Zamboanga, supporting employment opportunities and empowering individuals toward a better and more inclusive future.',
    fullArticle: [
      'MEMPCO proudly took part in the 124th Labor Day Job Fair, embracing this year’s theme: “Disenteng Trabaho Para sa Lahat: Iisang Hangarin, Bagong Pilipinas Sama-samang Mararating.”',
      'The event was held on May 1, 2026 at KCC Mall de Zamboanga and was led by the Department of Labor and Employment.',
      'MEMPCO remains committed to supporting employment opportunities and empowering individuals toward a better and more inclusive future.',
    ],
    type: 'event',
    category: 'Events',
    image: '/About/Labor Day.png',
  },
  {
    title: 'MEMPCO Participates in WMSU CareerCon and Job Fair 2026',
    date: 'May 1, 2026',
    excerpt:
      'MEMPCO joined CareerCon and Job Fair 2026 at the WMSU Gymnasium, supporting an initiative that connects students and graduates to future career opportunities.',
    fullArticle: [
      'MEMPCO is grateful to be part of CareerCon and Job Fair 2026, held at the Western Mindanao State University Gymnasium on April 30, 2026.',
      'We thank Western Mindanao State University for the invitation and for organizing a successful event that connects students and graduates to future opportunities.',
      'MEMPCO is honored to support this meaningful initiative for alumni and graduating students.',
    ],
    type: 'event',
    category: 'Events',
    image: '/About/CareerCon.png',
  },
  {
    title: 'MEMPCO Recognized by CLIMBS for Service and Climate Action',
    date: 'April 29, 2026',
    excerpt:
      'During the 54th Annual General Assembly of CLIMBS Life and General Insurance Cooperative, MEMPCO was recognized as Top Premium Producer Regional and Champion for Climate Action.',
    fullArticle: [
      'With humble hearts, MEMPCO shares this meaningful milestone. During the 54th Annual General Assembly of CLIMBS Life and General Insurance Cooperative in Cebu City, MEMPCO was honored to receive recognitions as Top Premium Producer Regional and Champion for Climate Action.',
      'We accept these honors with gratitude, recognizing that these achievements reflect the trust of our member-owners and the dedication of our team.',
      'MEMPCO remains committed to serving with integrity and contributing to a more sustainable and progressive community.',
    ],
    type: 'news',
    category: 'News',
    image: '/About/54th Climbs Annual General Assembly.png',
  },
  {
    title: 'Empowering Communities Through Financial Wellness',
    date: 'April 23, 2026',
    excerpt:
      'MEMPCO joined the DSWD Convergence Caravan with 4Ps beneficiaries in Zamboanga City, sharing financial wellness discussions on PMES, savings, loans, insurance, and financial literacy.',
    fullArticle: [
      'MEMPCO is grateful to the Department of Social Welfare and Development for inviting us to be part of their Convergence Caravan with 4Ps beneficiaries from different barangays in Zamboanga City.',
      'During the activity, MEMPCO shared discussions on PMES, financial wellness and management, loans, savings, and insurance services.',
      'We sincerely hope that the learnings shared will be applied and become a guide toward a more secure future. Helping people help themselves remains at the heart of this initiative.',
    ],
    type: 'event',
    category: 'Events',
    image: '/About/Financial Literacy Seminar.png',
  },
  {
    title: 'Fire Drill Seminar Strengthens Preparedness at Central Office',
    date: 'April 23, 2026',
    excerpt:
      'MEMPCO Central Office conducted a Fire Drill Seminar in partnership with the Bureau of Fire Protection – Zamboanga City Fire District to strengthen fire prevention, safety protocols, and emergency response.',
    fullArticle: [
      'MEMPCO Central Office successfully conducted a Fire Drill Seminar in partnership with the Bureau of Fire Protection – Zamboanga City Fire District.',
      'The activity equipped participants with essential knowledge on fire prevention, safety protocols, and proper emergency response, reinforcing the importance of readiness in ensuring workplace safety.',
      'MEMPCO extends its sincere gratitude to the Bureau of Fire Protection for their continuous efforts in promoting fire safety awareness and preparedness within the community.',
    ],
    type: 'event',
    category: 'Events',
    image: '/About/Central Office Fire Drill.png',
  },
  {
    title: 'Fire Drill Seminar Conducted at Culianan Branch',
    date: 'April 24, 2026',
    excerpt:
      'MEMPCO Culianan Branch participated in a Fire Drill Seminar with the Bureau of Fire Protection, helping participants gain practical knowledge and confidence in responding to emergency situations.',
    fullArticle: [
      'MEMPCO Culianan Branch successfully participated in a Fire Drill Seminar in partnership with the Bureau of Fire Protection – Zamboanga City Fire District.',
      'The seminar strengthened awareness on fire prevention, emergency response, and workplace safety. Participants were provided with valuable knowledge and practical guidance to ensure readiness during emergency situations.',
      'Through activities like these, participants are empowered with both knowledge and confidence in responding effectively during fire-related incidents.',
    ],
    type: 'event',
    category: 'Events',
    image: '/About/Culianan Fire Drill.png',
  },
  {
    title: 'Earth Day, Everyday: MEMPCO Promotes Sustainable Living',
    date: 'May 1, 2026',
    excerpt:
      'MEMPCO encourages members and communities to practice simple daily actions such as conserving water, using natural light, choosing reusable items, and proper waste segregation.',
    fullArticle: [
      'At MEMPCO, we believe that meaningful change begins with simple everyday actions.',
      'From conserving water and using natural light, to choosing reusable items and practicing proper waste segregation, each small step contributes to a healthier and more sustainable future for our communities.',
      'Let us continue working together as responsible stewards of our environment. By making mindful choices today, we help build a better tomorrow for the next generation.',
    ],
    type: 'announcement',
    category: 'Announcement',
    image: '/About/Earth Day.png',
  },
  {
    title: 'Let’s Go Green with MEMPCO Hour Level Up',
    date: 'April 28, 2026',
    excerpt:
      'In celebration of Earth Month, MEMPCO continues to encourage green habits and responsible actions through the MEMPCO Hour Level Up initiative.',
    fullArticle: [
      'In celebration of Earth Month, MEMPCO continues to encourage members, employees, and communities to take part in meaningful actions for the environment.',
      'The MEMPCO Hour Level Up initiative promotes simple but impactful habits that support sustainability and environmental responsibility.',
      'Through collective participation, MEMPCO hopes to strengthen awareness and inspire everyone to contribute to a cleaner, greener, and more sustainable future.',
    ],
    type: 'announcement',
    category: 'Announcement',
    image: '/About/MEMPCO Hour.png',
  },
];

const CATEGORIES = ['All', 'News', 'Events', 'Announcement'];

const ORBIT_CATEGORIES = [
  {
    label: 'Official News',
    category: 'News',
    className: 'np-hero-float-item--news',
  },
  {
    label: 'Cooperative Events',
    category: 'Events',
    className: 'np-hero-float-item--events',
  },
  {
    label: 'Public Announcements',
    category: 'Announcement',
    className: 'np-hero-float-item--announcement',
  },
  {
    label: 'Community Updates',
    category: 'All',
    className: 'np-hero-float-item--community',
  },
];

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M2.5 7h9M8 3l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path
        d="M5.5 8.5l5.5 5.5 5.5-5.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path
        d="M6.5 6.5l9 9M15.5 6.5l-9 9"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function getTypeLabel(type) {
  if (type === 'event') return 'Event';
  if (type === 'announcement') return 'Announcement';
  return 'News';
}

export default function News() {
  const heroRef = useRef(null);

  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [isImageExpanded, setIsImageExpanded] = useState(false);
  const [pageReady, setPageReady] = useState(false);
  const [orbitRotation, setOrbitRotation] = useState(0);

  const getCategoryCount = (cat) =>
    cat === 'All'
      ? NEWS_ITEMS.length
      : NEWS_ITEMS.filter((item) => item.category === cat).length;

  const filteredItems = useMemo(() => {
    if (activeCategory === 'All') return NEWS_ITEMS;
    return NEWS_ITEMS.filter((item) => item.category === activeCategory);
  }, [activeCategory]);

  const featured = filteredItems[0] ?? NEWS_ITEMS[0];
  const latestStories = filteredItems.slice(1, 4);
  const moreStories = filteredItems.slice(4);

  const openArticle = (article) => {
    setSelectedArticle(article);
    setIsImageExpanded(false);
  };

  const closeArticle = () => {
    setSelectedArticle(null);
    setIsImageExpanded(false);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPageReady(true);
    }, 90);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const updateOrbit = () => {
      const hero = heroRef.current;
      if (!hero) return;

      const rect = hero.getBoundingClientRect();
      const viewportHeight = window.innerHeight || 1;
      const totalTravel = rect.height + viewportHeight;
      const travelled = Math.min(Math.max(viewportHeight - rect.top, 0), totalTravel);
      const progress = totalTravel > 0 ? travelled / totalTravel : 0;
      const nextRotation = progress * 95;

      setOrbitRotation((prev) =>
        Math.abs(prev - nextRotation) > 0.35 ? nextRotation : prev
      );
    };

    let ticking = false;

    const onScroll = () => {
      if (ticking) return;

      ticking = true;
      window.requestAnimationFrame(() => {
        updateOrbit();
        ticking = false;
      });
    };

    updateOrbit();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  useEffect(() => {
    const revealItems = document.querySelectorAll('.np-reveal');

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add('np-reveal--visible');
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.16,
        rootMargin: '0px 0px -10% 0px',
      }
    );

    revealItems.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, [activeCategory]);

  useEffect(() => {
    if (!selectedArticle) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (isImageExpanded) {
          setIsImageExpanded(false);
        } else {
          closeArticle();
        }
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedArticle, isImageExpanded]);

  return (
    <>
      <Navbar />

      <main className={`np${pageReady ? ' np--ready' : ''}`}>
        <div className="np-page-transition" aria-hidden="true" />

        <section className="np-hero" ref={heroRef}>
          <div className="np-hero-bg">
            <div
              className="np-hero-orbit"
              style={{ '--orbit-rotate': `${orbitRotation}deg` }}
              aria-label="Quick category filters"
            >
              {ORBIT_CATEGORIES.map((item) => (
                <span
                  className={`np-hero-float-item ${item.className}`}
                  key={item.label}
                >
                  <span className="np-hero-float-keep">
                    <button
                      type="button"
                      className={`np-hero-float${
                        activeCategory === item.category ? ' np-hero-float--active' : ''
                      }`}
                      onClick={() => setActiveCategory(item.category)}
                      aria-pressed={activeCategory === item.category}
                    >
                      <span className="np-hero-float-dot" aria-hidden="true" />
                      {item.label}
                    </button>
                  </span>
                </span>
              ))}
            </div>
          </div>

          <div className="np-wrap">
            <div className="np-hero-inner">
              <div className="np-hero-badge">
                <span className="np-hero-badge-dot" aria-hidden="true" />
                MEMPCO Updates
              </div>

              <h1 className="np-hero-title">
                <span>News &amp;</span> <em>Events</em>
              </h1>

              <p className="np-hero-sub">
                Explore official MEMPCO news, cooperative events, and public
                announcements from across the organization.
              </p>

              <div className="np-hero-stats">
                <div className="np-hero-stat">
                  <strong>{NEWS_ITEMS.length}</strong>
                  <span>Stories</span>
                </div>
                <div className="np-hero-stat-sep" aria-hidden="true" />
                <div className="np-hero-stat">
                  <strong>2026</strong>
                  <span>Latest</span>
                </div>
                <div className="np-hero-stat-sep" aria-hidden="true" />
                <div className="np-hero-stat">
                  <strong>3</strong>
                  <span>Categories</span>
                </div>
              </div>

              <nav className="np-tabs" aria-label="Filter by category">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`np-tab${activeCategory === cat ? ' np-tab--on' : ''}`}
                    onClick={() => setActiveCategory(cat)}
                  >
                    {cat}
                    <span className="np-tab-count">{getCategoryCount(cat)}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          <div className="np-hero-scroll-hint" aria-hidden="true">
            <ChevronDown />
          </div>
        </section>

        {featured && (
          <section className="np-spotlight-section np-reveal">
            <div className="np-wrap">
              <header className="np-section-head">
                <div>
                  <span className="np-label">Spotlight</span>
                  <h2 className="np-section-title">Featured Story</h2>
                </div>

                <span className="np-section-note">
                  {activeCategory === 'All' ? 'Latest Highlight' : activeCategory}
                </span>
              </header>

              <article className="np-spotlight">
                <button
                  type="button"
                  className="np-spotlight-image-wrap np-image-button"
                  onClick={() => openArticle(featured)}
                  aria-label={`Open article: ${featured.title}`}
                >
                  <img
                    src={featured.image}
                    alt={featured.title}
                    className="np-spotlight-image"
                    loading="eager"
                    decoding="async"
                  />

                  <div className="np-spotlight-overlay">
                    <span>{featured.category}</span>
                    <time>{featured.date}</time>
                  </div>
                </button>

                <div className="np-spotlight-body">
                  <div className="np-spotlight-meta">
                    <span className="np-cat-pill">{featured.category}</span>
                    <span className={`np-chip np-chip--${featured.type}`}>
                      {getTypeLabel(featured.type)}
                    </span>
                  </div>

                  <h2 className="np-spotlight-title">{featured.title}</h2>
                  <p className="np-spotlight-excerpt">{featured.excerpt}</p>

                  <button
                    type="button"
                    className="np-cta-btn"
                    onClick={() => openArticle(featured)}
                  >
                    Read Full Story <ArrowIcon />
                  </button>
                </div>
              </article>
            </div>
          </section>
        )}

        <section className="np-latest-section np-reveal">
          <div className="np-wrap">
            <header className="np-section-head">
              <div>
                <span className="np-label">Latest Stories</span>
                <h2 className="np-section-title">
                  {activeCategory === 'All' ? 'Latest News & Events' : activeCategory}
                </h2>
              </div>

              <button
                type="button"
                className="np-view-all"
                onClick={() => setActiveCategory('All')}
              >
                View all
              </button>
            </header>

            {latestStories.length > 0 ? (
              <div className="np-news-grid">
                {latestStories.map((item) => (
                  <article className="np-news-card" key={item.title}>
                    <button
                      type="button"
                      className="np-news-card-image-wrap np-image-button"
                      onClick={() => openArticle(item)}
                      aria-label={`Open article: ${item.title}`}
                    >
                      <img
                        src={item.image}
                        alt={item.title}
                        className="np-news-card-image"
                        loading="lazy"
                        decoding="async"
                      />

                      <div className="np-news-card-overlay">
                        <div className="np-news-card-overlay-meta">
                          <span className="np-news-card-kicker">{item.category}</span>
                          <time className="np-news-card-date">{item.date}</time>
                        </div>
                      </div>
                    </button>

                    <div className="np-news-card-body">
                      <h3 className="np-news-card-title">{item.title}</h3>
                      <p className="np-news-card-excerpt">{item.excerpt}</p>

                      <button
                        type="button"
                        className="np-link np-link-button np-news-card-link"
                        onClick={() => openArticle(item)}
                      >
                        Read post <ArrowIcon />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="np-empty">No latest stories in this category yet.</p>
            )}
          </div>
        </section>

        {moreStories.length > 0 && (
          <section className="np-more-section np-reveal">
            <div className="np-wrap">
              <header className="np-section-head">
                <div>
                  <span className="np-label">More Stories</span>
                  <h2 className="np-section-title">More Updates</h2>
                </div>

                <span className="np-section-note">
                  {moreStories.length} articles
                </span>
              </header>

              <div className="np-more-grid">
                {moreStories.map((item) => (
                  <article className="np-more-card" key={item.title}>
                    <button
                      type="button"
                      className="np-more-card-image-wrap np-image-button"
                      onClick={() => openArticle(item)}
                      aria-label={`Open article: ${item.title}`}
                    >
                      <img
                        src={item.image}
                        alt={item.title}
                        className="np-more-card-image"
                        loading="lazy"
                        decoding="async"
                      />

                      <div className="np-more-card-overlay">
                        <span>{item.category}</span>
                      </div>
                    </button>

                    <div className="np-more-card-body">
                      <div className="np-more-card-meta">
                        <time>{item.date}</time>
                        <span>{getTypeLabel(item.type)}</span>
                      </div>

                      <h3 className="np-more-card-title">{item.title}</h3>
                      <p className="np-more-card-excerpt">{item.excerpt}</p>

                      <button
                        type="button"
                        className="np-link np-link-button"
                        onClick={() => openArticle(item)}
                      >
                        Read article <ArrowIcon />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />

      {selectedArticle && (
        <div
          className="np-modal"
          role="dialog"
          aria-modal="true"
          aria-label={selectedArticle.title}
        >
          <button
            type="button"
            className="np-modal-backdrop"
            onClick={closeArticle}
            aria-label="Close article modal"
          />

          <article className="np-modal-panel">
            <button
              type="button"
              className="np-modal-close"
              onClick={closeArticle}
              aria-label="Close article"
            >
              <CloseIcon />
            </button>

            <div className="np-modal-image-side">
              <button
                type="button"
                className="np-modal-image-button"
                onClick={() => setIsImageExpanded(true)}
                aria-label="View full image"
              >
                <img
                  src={selectedArticle.image}
                  alt={selectedArticle.title}
                  className="np-modal-image"
                />
                <span className="np-modal-image-hint">View full image</span>
              </button>
            </div>

            <div className="np-modal-content">
              <div className="np-modal-meta">
                <span className="np-cat-pill">{selectedArticle.category}</span>
                <span
                  className={`np-chip np-chip--${selectedArticle.type} np-chip--modal`}
                >
                  {getTypeLabel(selectedArticle.type)}
                </span>
                <time className="np-meta-date">{selectedArticle.date}</time>
              </div>

              <h2 className="np-modal-title">{selectedArticle.title}</h2>

              <p className="np-modal-lead">{selectedArticle.excerpt}</p>

              <div className="np-modal-article">
                {selectedArticle.fullArticle.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </div>
          </article>
        </div>
      )}

      {selectedArticle && isImageExpanded && (
        <div
          className="np-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Full image view"
        >
          <button
            type="button"
            className="np-lightbox-backdrop"
            onClick={() => setIsImageExpanded(false)}
            aria-label="Close full image"
          />

          <div className="np-lightbox-content">
            <button
              type="button"
              className="np-lightbox-close"
              onClick={() => setIsImageExpanded(false)}
              aria-label="Close full image"
            >
              <CloseIcon />
            </button>

            <img
              src={selectedArticle.image}
              alt={selectedArticle.title}
              className="np-lightbox-image"
            />

            <div className="np-lightbox-caption">
              <span>{selectedArticle.title}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}