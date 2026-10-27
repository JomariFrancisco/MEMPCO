'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import Navbar from '@/components/Navbar/Navbar';
import Footer from '@/components/Footer/Footer';
import { listPublishedMemberStories } from '@/lib/marketing/marketingPosts';
import { createClient } from '@/lib/supabase/client';
import { MEMBER_STORIES, toMemberStory } from '@/lib/memberStories';
import './member-experiences.css';

const VISIBLE_STORIES = 3;

function getVisibleStories(stories, startIndex, visibleCount) {
  if (stories.length <= visibleCount) return stories;

  return Array.from({ length: visibleCount }, (_, index) => {
    return stories[(startIndex + index) % stories.length];
  });
}

function TestimonyCard({ story }) {
  return (
    <article className="mx-testimony-card">
      <div className="mx-card-head">
        <div className="mx-avatar">
          <img src={story.image} alt={`${story.name} testimonial`} />
        </div>

        <div className="mx-member-info">
          <h2>{story.name}</h2>
          <p>{story.role}</p>
          <span>{story.location}</span>
        </div>
      </div>

      <blockquote>{story.text}</blockquote>
    </article>
  );
}

export default function MemberStoriesPage() {
  const [stories, setStories] = useState(MEMBER_STORIES);
  const [activeIndex, setActiveIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(VISIBLE_STORIES);

  useEffect(() => {
    const updateVisibleCount = () => {
      setVisibleCount(window.innerWidth <= 620 ? 1 : window.innerWidth <= 980 ? 2 : VISIBLE_STORIES);
    };

    updateVisibleCount();
    window.addEventListener('resize', updateVisibleCount);
    return () => window.removeEventListener('resize', updateVisibleCount);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadStories = async () => {
      try {
        const posts = await listPublishedMemberStories();
        const nextStories = posts.map(toMemberStory);

        if (!cancelled && nextStories.length) {
          setStories(nextStories);
          setActiveIndex(0);
        }
      } catch {
        if (!cancelled) {
          setStories(MEMBER_STORIES);
          setActiveIndex(0);
        }
      }
    };

    void loadStories();

    const reload = () => void loadStories();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') reload();
    };
    window.addEventListener('focus', reload);
    window.addEventListener('pageshow', reload);
    document.addEventListener('visibilitychange', onVisibility);
    const supabase = createClient();
    const channel = supabase
      .channel('member-stories-page-marketing-posts-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'marketing_posts' }, reload)
      .subscribe();

    return () => {
      cancelled = true;
      window.removeEventListener('focus', reload);
      window.removeEventListener('pageshow', reload);
      document.removeEventListener('visibilitychange', onVisibility);
      supabase.removeChannel(channel);
    };
  }, []);

  const visibleStories = useMemo(() => {
    return getVisibleStories(stories, activeIndex, visibleCount);
  }, [activeIndex, stories, visibleCount]);

  const canRotate = stories.length > visibleCount;

  const showPrevious = () => {
    if (!canRotate) return;
    setActiveIndex((current) => (current - 1 + stories.length) % stories.length);
  };

  const showNext = () => {
    if (!canRotate) return;
    setActiveIndex((current) => (current + 1) % stories.length);
  };

  return (
    <>
      <Navbar />

      <main className="mx-page">
        <header className="mx-page-header">
          <div className="mx-shell">
            <nav className="mx-breadcrumb" aria-label="Breadcrumb">
              <Link href="/about">About</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page">Testimonials</span>
            </nav>
            <p className="mx-page-kicker">About MEMPCO</p>
            <h1 className="mx-visually-hidden">Member testimonials</h1>
          </div>
        </header>

        <section className="mx-testimonials" aria-label="Member testimonials">
          <div className="mx-shell">
            <div className="mx-testimony-grid" aria-live="polite">
              {visibleStories.map((story) => (
                <TestimonyCard key={`${story.name}-${story.location}`} story={story} />
              ))}
            </div>

            {canRotate && (
              <div className="mx-controls" aria-label="Testimonial navigation">
                <button type="button" onClick={showPrevious} aria-label="Show previous testimonials">
                  <ChevronLeft aria-hidden="true" />
                </button>
                <button type="button" onClick={showNext} aria-label="Show next testimonials">
                  <ChevronRight aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
