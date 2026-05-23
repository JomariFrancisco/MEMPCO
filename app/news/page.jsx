'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Navbar from '@/components/Navbar/Navbar';
import Footer from '@/components/Footer/Footer';
import { createClient } from '@/lib/supabase/client';
import {
  getMarketingPostBuckets,
  listPublishedMarketingPosts,
} from '@/lib/marketing/marketingPosts';
import './news.css';

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

const getSafeImageSrc = (value) => {
  if (typeof value !== 'string') return null;

  const trimmedValue = value.trim();

  return trimmedValue ? trimmedValue : null;
};

function StoryImage({
  src,
  alt,
  className,
  loading = 'lazy',
}) {
  const safeSrc = getSafeImageSrc(src);

  if (!safeSrc) {
    return (
      <div
        className={`${className} np-image-placeholder`}
        role="img"
        aria-label={alt || 'Story image not available'}
      >
        <span>No image available</span>
      </div>
    );
  }

  return (
    <img
      src={safeSrc}
      alt={alt || 'Story image'}
      className={className}
      loading={loading}
      decoding="async"
    />
  );
}

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
  const [newsItems, setNewsItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const getCategoryCount = (cat) =>
    cat === 'All'
      ? newsItems.length
      : newsItems.filter((item) => item.category === cat).length;

  const filteredItems = useMemo(() => {
    if (activeCategory === 'All') return newsItems;
    return newsItems.filter((item) => item.category === activeCategory);
  }, [activeCategory, newsItems]);

  const storyBuckets = useMemo(
    () => getMarketingPostBuckets(filteredItems),
    [filteredItems]
  );

  const featured = storyBuckets.featured;
  const latestStories = storyBuckets.latest;
  const moreStories = storyBuckets.more;

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
    let cancelled = false;

    const loadPosts = async () => {
      try {
        const posts = await listPublishedMarketingPosts();

        if (!cancelled) {
          setNewsItems(posts);
        }
      } catch {
        if (!cancelled) {
          setNewsItems([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadPosts();

    const handleReload = () => {
      void loadPosts();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void loadPosts();
      }
    };

    window.addEventListener('focus', handleReload);
    window.addEventListener('pageshow', handleReload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const supabase = createClient();

    const channel = supabase
      .channel('news-page-marketing-posts-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'marketing_posts',
        },
        () => {
          void loadPosts();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      window.removeEventListener('focus', handleReload);
      window.removeEventListener('pageshow', handleReload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      supabase.removeChannel(channel);
    };
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
  }, [activeCategory, newsItems]);

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
                  <strong>{loading ? '...' : newsItems.length}</strong>
                  <span>Stories</span>
                </div>
                <div className="np-hero-stat-sep" aria-hidden="true" />
                <div className="np-hero-stat">
                  <strong>{new Date().getFullYear()}</strong>
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
                    <span className="np-tab-count">
                      {loading ? '...' : getCategoryCount(cat)}
                    </span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          <div className="np-hero-scroll-hint" aria-hidden="true">
            <ChevronDown />
          </div>
        </section>

        {loading && (
          <section className="np-latest-section np-reveal np-reveal--visible">
            <div className="np-wrap">
              <div className="np-empty">Loading News & Events...</div>
            </div>
          </section>
        )}

        {!loading && newsItems.length === 0 && (
          <section className="np-latest-section np-reveal np-reveal--visible">
            <div className="np-wrap">
              <header className="np-section-head">
                <div>
                  <span className="np-label">Content Library</span>
                  <h2 className="np-section-title">No published stories yet</h2>
                </div>
              </header>

              <p className="np-empty">
                Add a published post from the Marketing Admin. Once published, it will
                automatically appear on this News & Events page and the homepage section.
              </p>
            </div>
          </section>
        )}

        {!loading && featured && (
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
                  <StoryImage
                    src={featured.image}
                    alt={featured.title}
                    className="np-spotlight-image"
                    loading="eager"
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

        {!loading && newsItems.length > 0 && (
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
                    <article className="np-news-card" key={item.id || item.title}>
                      <button
                        type="button"
                        className="np-news-card-image-wrap np-image-button"
                        onClick={() => openArticle(item)}
                        aria-label={`Open article: ${item.title}`}
                      >
                        <StoryImage
                          src={item.image}
                          alt={item.title}
                          className="np-news-card-image"
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
        )}

        {!loading && moreStories.length > 0 && (
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
                  <article className="np-more-card" key={item.id || item.title}>
                    <button
                      type="button"
                      className="np-more-card-image-wrap np-image-button"
                      onClick={() => openArticle(item)}
                      aria-label={`Open article: ${item.title}`}
                    >
                      <StoryImage
                        src={item.image}
                        alt={item.title}
                        className="np-more-card-image"
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
              <span aria-hidden="true">&times;</span>
            </button>

            <div className="np-modal-image-side">
              <button
                type="button"
                className="np-modal-image-button"
                onClick={() => setIsImageExpanded(true)}
                aria-label="View full image"
              >
                <StoryImage
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
                {Array.isArray(selectedArticle.fullArticle) &&
                selectedArticle.fullArticle.length > 0 ? (
                  selectedArticle.fullArticle.map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))
                ) : (
                  <p>No full article content has been added yet.</p>
                )}
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
              <span aria-hidden="true">&times;</span>
            </button>

            <StoryImage
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
