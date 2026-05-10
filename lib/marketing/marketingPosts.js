'use client';

import { createClient } from '@/lib/supabase/client';

const MARKETING_POST_COLUMNS = `
  id,
  slug,
  title,
  category,
  content_type,
  excerpt,
  body,
  image_url,
  status,
  featured,
  placement,
  display_order,
  published_at,
  created_by,
  updated_by,
  created_at,
  updated_at
`;

const slugify = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `post-${Date.now()}`;

export const MARKETING_PLACEMENTS = [
  { value: 'featured', label: 'Featured Story' },
  { value: 'latest', label: 'Latest Stories' },
  { value: 'more', label: 'More Stories' },
];

export const MARKETING_PLACEMENT_LABELS = MARKETING_PLACEMENTS.reduce(
  (labels, placement) => ({ ...labels, [placement.value]: placement.label }),
  {}
);

const placementRank = {
  featured: 0,
  latest: 1,
  more: 2,
};

const normalizePlacement = (value, featured = false) => {
  if (value === 'featured' || value === 'latest' || value === 'more') return value;
  return featured ? 'featured' : 'more';
};

const parsePostBody = (body) => {
  if (Array.isArray(body)) {
    return {
      fullArticle: body,
      externalUrl: '',
      republishedAt: '',
      editedAt: '',
      storyRole: '',
      storyLocation: '',
      tags: [],
    };
  }

  if (body && typeof body === 'object') {
    return {
      fullArticle: Array.isArray(body.paragraphs) ? body.paragraphs : [],
      externalUrl: body.videoUrl || body.externalUrl || '',
      republishedAt: body.republishedAt || body.republished_at || '',
      editedAt: body.editedAt || body.edited_at || '',
      storyRole: body.role || body.storyRole || '',
      storyLocation: body.location || body.storyLocation || '',
      tags: Array.isArray(body.tags) ? body.tags : [],
    };
  }

  return {
    fullArticle: [],
    externalUrl: '',
    republishedAt: '',
    editedAt: '',
    storyRole: '',
    storyLocation: '',
    tags: [],
  };
};

export const sortMarketingPosts = (posts = []) =>
  [...posts].sort((a, b) => {
    const placementDelta =
      (placementRank[a.placement] ?? placementRank.more) -
      (placementRank[b.placement] ?? placementRank.more);

    if (placementDelta !== 0) return placementDelta;

    const orderDelta = (a.displayOrder || 0) - (b.displayOrder || 0);

    if (orderDelta !== 0) return orderDelta;

    return new Date(b.publishedAt || b.updatedAt || b.createdAt || 0) -
      new Date(a.publishedAt || a.updatedAt || a.createdAt || 0);
  });

export const getMarketingPostBuckets = (posts = []) => {
  const sorted = sortMarketingPosts(posts);
  const featured =
    sorted.find((post) => post.placement === 'featured') ||
    sorted.find((post) => post.featured) ||
    sorted[0] ||
    null;
  const withoutFeatured = featured
    ? sorted.filter((post) => post.id ? post.id !== featured.id : post.title !== featured.title)
    : sorted;
  const latest = withoutFeatured.filter((post) => post.placement === 'latest');
  const more = withoutFeatured.filter((post) => post.placement !== 'latest');

  return {
    featured,
    latest: latest.length ? latest : withoutFeatured.slice(0, 3),
    more: latest.length ? more : withoutFeatured.slice(3),
  };
};

const mapPostRow = (row) => {
  const body = parsePostBody(row.body);

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category || 'News',
    type: row.content_type || 'news',
    excerpt: row.excerpt || '',
    fullArticle: body.fullArticle,
    externalUrl: body.externalUrl,
    republishedAt: body.republishedAt,
    editedAt: body.editedAt,
    storyRole: body.storyRole,
    storyLocation: body.storyLocation,
    tags: body.tags,
    image: row.image_url || '',
    status: row.status || 'draft',
    featured: Boolean(row.featured),
    placement: normalizePlacement(row.placement, Boolean(row.featured)),
    displayOrder: Number(row.display_order || 0),
    date: row.published_at
      ? new Date(row.published_at).toLocaleDateString('en-PH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : '',
    publishedAt: row.published_at || '',
    createdBy: row.created_by || '',
    updatedBy: row.updated_by || '',
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
};

const toPostPayload = (post, user) => {
  const placement = normalizePlacement(post.placement, Boolean(post.featured));
  const fullArticle = Array.isArray(post.fullArticle) ? post.fullArticle : post.body || [];
  const isMemberStory = post.type === 'member_story' || post.contentType === 'member_story';
  const body = isMemberStory
    ? {
        paragraphs: fullArticle,
        videoUrl: post.externalUrl || '',
        republishedAt: post.republishedAt || '',
        editedAt: post.editedAt || '',
        role: post.storyRole || '',
        location: post.storyLocation || '',
        tags: Array.isArray(post.tags) ? post.tags : [],
      }
    : post.republishedAt || post.editedAt
      ? {
          paragraphs: fullArticle,
          republishedAt: post.republishedAt || '',
          editedAt: post.editedAt || '',
        }
      : fullArticle;

  return {
    slug: post.slug?.trim() || slugify(post.title),
    title: post.title?.trim() || 'Untitled Post',
    category: post.category || 'News',
    content_type: post.type || post.contentType || 'news',
    excerpt: post.excerpt?.trim() || '',
    body,
    image_url: post.image || post.imageUrl || '',
    status: post.status || 'draft',
    featured: placement === 'featured',
    placement,
    display_order: Number(post.displayOrder || post.display_order || 0),
    published_at:
      post.status === 'published'
        ? post.publishedAt || new Date().toISOString()
        : post.publishedAt || null,
    updated_by: user?.id || null,
  };
};

export async function listPublishedMarketingPosts() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('marketing_posts')
    .select(MARKETING_POST_COLUMNS)
    .eq('status', 'published')
    .neq('content_type', 'member_story')
    .order('featured', { ascending: false })
    .order('published_at', { ascending: false });

  if (error) throw new Error(error.message || 'Unable to load marketing posts.');

  return sortMarketingPosts((data || []).map(mapPostRow));
}

export async function listPublishedMemberStories() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('marketing_posts')
    .select(MARKETING_POST_COLUMNS)
    .eq('status', 'published')
    .eq('content_type', 'member_story')
    .order('display_order', { ascending: true })
    .order('published_at', { ascending: false });

  if (error) throw new Error(error.message || 'Unable to load member stories.');

  return sortMarketingPosts((data || []).map(mapPostRow));
}

export async function listMarketingPosts() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('marketing_posts')
    .select(MARKETING_POST_COLUMNS)
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message || 'Unable to load marketing posts.');

  return sortMarketingPosts((data || []).map(mapPostRow));
}

export async function saveMarketingPost(post, user) {
  const supabase = createClient();
  const payload = {
    ...toPostPayload(post, user),
    created_by: post.id ? post.createdBy || null : user?.id || null,
  };

  const query = post.id
    ? supabase.from('marketing_posts').update(payload).eq('id', post.id)
    : supabase.from('marketing_posts').insert(payload);

  const { data, error } = await query.select(MARKETING_POST_COLUMNS).single();

  if (error) throw new Error(error.message || 'Unable to save marketing post.');

  if (payload.placement === 'featured' && payload.content_type !== 'member_story') {
    const { error: demoteError } = await supabase
      .from('marketing_posts')
      .update({ featured: false, placement: 'more', updated_by: user?.id || null })
      .neq('id', data.id)
      .neq('content_type', 'member_story')
      .eq('placement', 'featured');

    if (demoteError) throw new Error(demoteError.message || 'Unable to update featured story.');
  }

  return mapPostRow(data);
}

export async function deleteMarketingPost(id) {
  const supabase = createClient();
  const { error } = await supabase.from('marketing_posts').delete().eq('id', id);

  if (error) throw new Error(error.message || 'Unable to delete marketing post.');
}
