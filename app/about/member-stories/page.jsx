'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Navbar from '@/components/Navbar/Navbar';
import { listPublishedMemberStories } from '@/lib/marketing/marketingPosts';
import { MEMBER_STORIES, toMemberStory } from '@/lib/memberStories';
import './member-experiences.css';

const VISIBLE_STORIES = 3;

function getVisibleStories(stories, startIndex) {
  if (stories.length <= VISIBLE_STORIES) return stories;

  return Array.from({ length: VISIBLE_STORIES }, (_, index) => {
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

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleStories = useMemo(() => {
    return getVisibleStories(stories, activeIndex);
  }, [activeIndex, stories]);

  const canRotate = stories.length > VISIBLE_STORIES;

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
        <section className="mx-testimonials" aria-label="Member testimonials">
          <div className="mx-shell">
            <div className="mx-heading">
              <span>Member Experience</span>
              <h1>Testimonials</h1>
              <p>
                Read how MEMPCO members continue to build livelihoods, support
                their families, and move forward through cooperative service.
              </p>
            </div>

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
    </>
  );
}
