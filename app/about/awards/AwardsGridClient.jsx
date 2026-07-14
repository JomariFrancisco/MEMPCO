'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { listPublishedAwardPosts } from '@/lib/marketing/marketingPosts';

const getAwardYear = (award) => {
  if (award.year) return award.year;

  const date = new Date(award.publishedAt || award.updatedAt || award.createdAt || '');
  return Number.isNaN(date.getTime()) ? 'Current' : String(date.getFullYear());
};

const getAwardDescription = (award) =>
  award.description ||
  award.excerpt ||
  award.fullArticle?.[0] ||
  'Recognition received by MEMPCO for cooperative service and institutional performance.';

const normalizeAwardPost = (post) => ({
  year: getAwardYear(post),
  title: post.title,
  organization: post.organization || 'Current Recognition',
  description: getAwardDescription(post),
  image: post.image,
});

function AwardCard({ award }) {
  return (
    <article className="ad-card">
      {award.image ? (
        <img src={award.image} alt={award.title} className="ad-award-image" loading="lazy" decoding="async" />
      ) : (
        <div className="ad-award-image ad-award-image-placeholder" role="img" aria-label={`${award.title} image not available`}>
          <span>No image available</span>
        </div>
      )}
      <span className="ad-card-label">{award.year} - {award.organization}</span>
      <h2>{award.title}</h2>
      <p>{award.description}</p>
    </article>
  );
}

export default function AwardsGridClient({ fallbackAwards = [] }) {
  const [awardPosts, setAwardPosts] = useState([]);

  useEffect(() => {
    let cancelled = false;
    let supabase = null;
    let channel = null;

    const loadAwards = async () => {
      try {
        const posts = await listPublishedAwardPosts();

        if (!cancelled) {
          setAwardPosts(posts);
        }
      } catch {
        if (!cancelled) {
          setAwardPosts([]);
        }
      }
    };

    void loadAwards();

    try {
      supabase = createClient();
      channel = supabase
        .channel('awards-page-marketing-posts-sync')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'marketing_posts',
          },
          () => {
            void loadAwards();
          }
        )
        .subscribe();
    } catch {
      channel = null;
    }

    return () => {
      cancelled = true;
      if (supabase && channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const awards = useMemo(
    () => (awardPosts.length ? awardPosts.map(normalizeAwardPost) : fallbackAwards),
    [awardPosts, fallbackAwards]
  );

  return (
    <div className="ad-shell ad-awards-grid">
      {awards.map((award) => (
        <AwardCard award={award} key={`${award.year}-${award.title}`} />
      ))}
    </div>
  );
}
