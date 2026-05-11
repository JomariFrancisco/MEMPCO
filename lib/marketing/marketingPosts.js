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

const MARKETING_POST_LIST_COLUMNS = `
  id,
  slug,
  title,
  category,
  content_type,
  excerpt,
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

const SUPABASE_REQUEST_TIMEOUT_MS = 12000;

/*
  Old featured story rule:
  - If the old featured story is within this number of days, move it to Latest.
  - If older, move it to More.
*/
const LATEST_STORY_WINDOW_DAYS = 365;

const withTimeout = (promise, message) => {
  let timeoutId;

  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(message));
    }, SUPABASE_REQUEST_TIMEOUT_MS);
  });

  return Promise.race([promise, timeout]).finally(() => {
    window.clearTimeout(timeoutId);
  });
};

const slugify = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `post-${Date.now()}`;

export const MARKETING_PLACEMENTS = [
  { value: 'featured', label: 'Featured Spotlight' },
  { value: 'latest', label: 'Latest Stories Grid' },
  { value: 'more', label: 'More Updates List' },
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

const getSafeDateTime = (value) => {
  if (!value) return 0;

  const time = new Date(value).getTime();

  return Number.isFinite(time) ? time : 0;
};

const getPostTimelineDate = (post = {}) =>
  post.publishedAt ||
  post.published_at ||
  post.updatedAt ||
  post.updated_at ||
  post.createdAt ||
  post.created_at ||
  '';

const isWithinLatestStoryWindow = (post = {}) => {
  const postTime = getSafeDateTime(getPostTimelineDate(post));

  if (!postTime) return false;

  const ageInDays = (Date.now() - postTime) / (1000 * 60 * 60 * 24);

  return ageInDays <= LATEST_STORY_WINDOW_DAYS;
};

const getDemotedFeaturedPlacement = (post = {}) =>
  isWithinLatestStoryWindow(post) ? 'latest' : 'more';

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

    return (
      new Date(b.publishedAt || b.updatedAt || b.createdAt || 0) -
      new Date(a.publishedAt || a.updatedAt || a.createdAt || 0)
    );
  });

export const getMarketingPostBuckets = (posts = []) => {
  const sorted = sortMarketingPosts(posts);

  if (!sorted.length) {
    return {
      featured: null,
      latest: [],
      more: [],
    };
  }

  const featuredCandidates = sorted.filter(
    (post) => post.placement === 'featured' || post.featured
  );

  const featured = featuredCandidates[0] || null;
  const featuredId = featured?.id || null;

  const latest = [];
  const more = [];

  sorted.forEach((post) => {
    if (featuredId && post.id === featuredId) return;

    if (post.placement === 'latest') {
      latest.push({
        ...post,
        featured: false,
        placement: 'latest',
      });
      return;
    }

    if (post.placement === 'featured' || post.featured) {
      const nextPlacement = getDemotedFeaturedPlacement(post);

      if (nextPlacement === 'latest') {
        latest.push({
          ...post,
          featured: false,
          placement: 'latest',
        });
      } else {
        more.push({
          ...post,
          featured: false,
          placement: 'more',
        });
      }

      return;
    }

    more.push({
      ...post,
      featured: false,
      placement: 'more',
    });
  });

  return {
    featured,
    latest: sortMarketingPosts(latest),
    more: sortMarketingPosts(more),
  };
};

const mapPostRow = (row) => {
  const body = parsePostBody(row.body);
  const placement = normalizePlacement(row.placement, Boolean(row.featured));

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
    featured: placement === 'featured',
    placement,
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

const demoteExistingFeaturedPosts = async ({
  supabase,
  savedPostId,
  contentType,
  userId,
}) => {
  const { data: oldFeaturedPosts, error: findError } = await supabase
    .from('marketing_posts')
    .select(`
      id,
      published_at,
      updated_at,
      created_at
    `)
    .neq('id', savedPostId)
    .eq('content_type', contentType)
    .or('placement.eq.featured,featured.eq.true');

  if (findError) {
    throw new Error(findError.message || 'Unable to check existing featured stories.');
  }

  if (!oldFeaturedPosts?.length) return;

  const updateResults = await Promise.all(
    oldFeaturedPosts.map((oldPost) => {
      const nextPlacement = getDemotedFeaturedPlacement(oldPost);

      return supabase
        .from('marketing_posts')
        .update({
          featured: false,
          placement: nextPlacement,
          updated_by: userId || null,
        })
        .eq('id', oldPost.id);
    })
  );

  const failedUpdate = updateResults.find((result) => result.error);

  if (failedUpdate?.error) {
    throw new Error(failedUpdate.error.message || 'Unable to move old featured story.');
  }
};

export async function listPublishedMarketingPosts() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('marketing_posts')
    .select(MARKETING_POST_COLUMNS)
    .eq('status', 'published')
    .neq('content_type', 'member_story')
    .order('featured', { ascending: false })
    .order('placement', { ascending: true })
    .order('display_order', { ascending: true })
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
    .order('featured', { ascending: false })
    .order('placement', { ascending: true })
    .order('display_order', { ascending: true })
    .order('published_at', { ascending: false });

  if (error) throw new Error(error.message || 'Unable to load member stories.');

  return sortMarketingPosts((data || []).map(mapPostRow));
}

export async function listMarketingPosts() {
  const supabase = createClient();

  const { data, error } = await withTimeout(
    supabase
      .from('marketing_posts')
      .select(MARKETING_POST_LIST_COLUMNS)
      .order('updated_at', { ascending: false }),
    'Marketing posts took too long to load. Please refresh and try again.'
  );

  if (error) throw new Error(error.message || 'Unable to load marketing posts.');

  return sortMarketingPosts((data || []).map(mapPostRow));
}

export async function getMarketingPost(id) {
  const supabase = createClient();

  const { data, error } = await withTimeout(
    supabase
      .from('marketing_posts')
      .select(MARKETING_POST_COLUMNS)
      .eq('id', id)
      .single(),
    'Post details took too long to load. Please try opening it again.'
  );

  if (error) throw new Error(error.message || 'Unable to load marketing post.');

  return mapPostRow(data);
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

  /*
    This now applies to all content types, including member_story.
    Before, member_story was excluded, so old featured member stories stayed featured.
  */
  if (payload.placement === 'featured') {
    await demoteExistingFeaturedPosts({
      supabase,
      savedPostId: data.id,
      contentType: payload.content_type,
      userId: user?.id || null,
    });
  }

  const { data: refreshedData, error: refreshError } = await supabase
    .from('marketing_posts')
    .select(MARKETING_POST_COLUMNS)
    .eq('id', data.id)
    .single();

  if (refreshError) {
    throw new Error(refreshError.message || 'Unable to reload saved marketing post.');
  }

  return mapPostRow(refreshedData);
}

export async function deleteMarketingPost(id) {
  const supabase = createClient();

  const { error } = await supabase.from('marketing_posts').delete().eq('id', id);

  if (error) throw new Error(error.message || 'Unable to delete marketing post.');
}