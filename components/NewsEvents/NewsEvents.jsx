'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getMarketingPostBuckets,
  listPublishedMarketingPosts,
} from '@/lib/marketing/marketingPosts';
import './NewsEvents.css';

const FEATURED = {
  kicker: 'Recognition',
  date: 'May 2, 2026',
  title: 'MEMPCO Receives Share Capital Build-Up Award at NATCCO Congress',
  excerpt:
    'MEMPCO was honored with the Share Capital Build-Up Award during the 40th NATCCO General Assembly and 24th Leaders’ Congress held in Iloilo City, reflecting the trust, commitment, and collective effort of its members, officers, and stakeholders.',
  image: '/About/40th NATCCO GA.png',
  imageAlt: 'MEMPCO receives Share Capital Build-Up Award at NATCCO Congress',
  href: '/news',
  category: 'News',
  type: 'news',
  placement: 'featured',
};

const STORIES = [
  {
    kicker: 'Events',
    date: 'May 3, 2026',
    title: 'MEMPCO Joins the 124th Labor Day Job Fair',
    excerpt:
      'MEMPCO proudly took part in the 124th Labor Day Job Fair at KCC Mall de Zamboanga, supporting employment opportunities and empowering individuals toward a better and more inclusive future.',
    image: '/About/Labor Day.png',
    imageAlt: 'MEMPCO participates in the 124th Labor Day Job Fair',
    href: '/news',
    category: 'Events',
    type: 'event',
    placement: 'latest',
  },
  {
    kicker: 'Partnership',
    date: 'May 1, 2026',
    title: 'MEMPCO Participates in WMSU CareerCon and Job Fair 2026',
    excerpt:
      'MEMPCO joined CareerCon and Job Fair 2026 at the WMSU Gymnasium, supporting an initiative that connects students and graduates to future career opportunities.',
    image: '/About/CareerCon.png',
    imageAlt: 'MEMPCO participates in WMSU CareerCon and Job Fair 2026',
    href: '/news',
    category: 'Events',
    type: 'event',
    placement: 'latest',
  },
  {
    kicker: 'Sustainability',
    date: 'April 29, 2026',
    title: 'MEMPCO Recognized by CLIMBS for Service and Climate Action',
    excerpt:
      'During the 54th Annual General Assembly of CLIMBS, MEMPCO was recognized as Top Premium Producer Regional and Champion for Climate Action.',
    image: '/About/54th Climbs Annual General Assembly.png',
    imageAlt: 'MEMPCO receives CLIMBS recognition',
    href: '/news',
    category: 'News',
    type: 'news',
    placement: 'latest',
  },
];

const UPDATES = [
  {
    tag: 'Community',
    text: 'MEMPCO supports DSWD Convergence Caravan through financial wellness discussions.',
    href: '/news',
  },
  {
    tag: 'Safety',
    text: 'Fire Drill Seminars strengthen workplace preparedness at MEMPCO offices and branches.',
    href: '/news',
  },
  {
    tag: 'Green',
    text: 'Earth Day, Everyday campaign promotes sustainability and responsible daily action.',
    href: '/news',
  },
];

const FALLBACK_POSTS = [FEATURED, ...STORIES].map((story, index) => ({
  id: `fallback-${index}`,
  title: story.title,
  date: story.date,
  excerpt: story.excerpt,
  image: story.image,
  imageAlt: story.imageAlt,
  category: story.category || story.kicker || 'News',
  type: story.type || 'news',
  placement: story.placement || (index === 0 ? 'featured' : 'latest'),
  displayOrder: index,
  href: '/news',
}));

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

export default function NewsEvents() {
  const ref = useRef(null);
  const [posts, setPosts] = useState(FALLBACK_POSTS);

  const { featured, latest, more } = useMemo(() => getMarketingPostBuckets(posts), [posts]);
  const storyCards = latest.slice(0, 3);
  const quickUpdates = (more.length ? more : posts.filter((post) => post.id !== featured?.id).slice(3, 6))
    .slice(0, 3);

  useEffect(() => {
    const section = ref.current;
    if (!section) return;

    const items = section.querySelectorAll('[data-reveal]');

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -48px 0px',
      }
    );

    items.forEach((el, index) => {
      el.style.setProperty('--rd', `${index * 70}ms`);
      io.observe(el);
    });

    return () => io.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadPosts = async () => {
      try {
        const publishedPosts = await listPublishedMarketingPosts();

        if (!cancelled && publishedPosts.length) {
          setPosts(publishedPosts);
        }
      } catch {
        if (!cancelled) {
          setPosts(FALLBACK_POSTS);
        }
      }
    };

    loadPosts();
    window.addEventListener('focus', loadPosts);
    window.addEventListener('pageshow', loadPosts);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void loadPosts();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', loadPosts);
      window.removeEventListener('pageshow', loadPosts);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <section className="ne" ref={ref}>
      <div className="ne-glow ne-glow--a" aria-hidden="true" />
      <div className="ne-glow ne-glow--b" aria-hidden="true" />

      <div className="ne-shell">
        <header className="ne-header ne-reveal ne-reveal--up" data-reveal>
          <span className="ne-eyebrow">MEMPCO Bulletin</span>

          <h2 className="ne-title">
            News &amp; <em>Events</em>
          </h2>

          <p className="ne-subtitle">
            Stay updated with the latest MEMPCO recognitions, community
            activities, safety initiatives, partnerships, and cooperative events.
          </p>

          <Link href="/news" className="ne-header-cta">
            View all stories <ArrowIcon />
          </Link>
        </header>

        {featured && (
        <article className="ne-featured ne-reveal ne-reveal--up" data-reveal>
          <Link href="/news" className="ne-featured__visual" aria-label={featured.title}>
            <img
              src={featured.image}
              alt={featured.imageAlt || featured.title}
              className="ne-featured__image"
            />
            <div className="ne-featured__overlay" aria-hidden="true" />
            <span className="ne-featured__visual-label">Featured Story</span>
          </Link>

          <div className="ne-featured__body">
            <div className="ne-featured__meta">
              <span className="ne-kicker">{featured.category}</span>
              <span className="ne-dot" aria-hidden="true" />
              <time className="ne-date">{featured.date}</time>
            </div>

            <h3 className="ne-featured__title">{featured.title}</h3>

            <p className="ne-featured__excerpt">{featured.excerpt}</p>

            <div className="ne-featured__actions">
              <Link href="/news" className="ne-cta-btn">
                <span>Read full story</span>
                <span className="ne-cta-btn__icon" aria-hidden="true">
                  <ArrowIcon />
                </span>
              </Link>

              <Link href="/news" className="ne-ghost-btn">
                View events
              </Link>
            </div>
          </div>
        </article>
        )}

        <div className="ne-grid">
          {storyCards.map((story) => (
            <article className="ne-card ne-reveal ne-reveal--up" data-reveal key={story.title}>
              <Link href="/news" className="ne-card__image-wrap" aria-label={story.title}>
                <img
                  src={story.image}
                  alt={story.imageAlt || story.title}
                  className="ne-card__image"
                />
              </Link>

              <div className="ne-card__content">
                <div className="ne-card__top">
                  <span className="ne-kicker">{story.category}</span>
                  <time className="ne-date">{story.date}</time>
                </div>

                <h4 className="ne-card__title">{story.title}</h4>

                <p className="ne-card__excerpt">{story.excerpt}</p>

                <Link href="/news" className="ne-link">
                  Read more <ArrowIcon />
                </Link>
              </div>
            </article>
          ))}
        </div>

        <div className="ne-updates ne-reveal ne-reveal--up" data-reveal>
          <div className="ne-updates__head">
            <span className="ne-updates__label">Quick Updates</span>
            <p className="ne-updates__desc">
              More recent cooperative activities and announcements.
            </p>
          </div>

          <div className="ne-updates__list">
            {(quickUpdates.length ? quickUpdates : UPDATES).map((update, index) => (
              <Link href="/news" className="ne-update-item" key={update.id || update.title || index}>
                <span className="ne-update-item__tag">{update.category || update.tag}</span>
                <span className="ne-update-item__text">{update.title || update.text}</span>
                <span className="ne-update-item__arrow" aria-hidden="true">
                  <ArrowIcon />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
