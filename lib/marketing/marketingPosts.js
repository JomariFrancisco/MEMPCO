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
  scheduled_at,
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
  body,
  image_url,
  status,
  scheduled_at,
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

const STATIC_AWARD_POSTS = [
  {
    slug: 'award-diamond-awards-regional-awardee-2025',
    title: 'Diamond Awards Regional Awardee',
    category: 'Awards',
    content_type: 'award',
    excerpt: 'Recognized as a Distinguished Institution and Mover of National Development Regional Awardee.',
    body: {
      paragraphs: ['Recognized as a Distinguished Institution and Mover of National Development Regional Awardee.'],
      organization: 'Land Bank of the Philippines',
    },
    image_url: '/About/Awards/diamond-awards.png',
    status: 'published',
    featured: false,
    placement: 'more',
    display_order: 0,
    published_at: '2025-12-04T01:00:00.000Z',
  },
  {
    slug: 'award-most-outstanding-primary-cooperative-2025',
    title: 'Most Outstanding Primary Cooperative',
    category: 'Awards',
    content_type: 'award',
    excerpt: 'First placer in the Large Cooperative Category during the 2025 Cooperative Month Celebration.',
    body: {
      paragraphs: ['First placer in the Large Cooperative Category during the 2025 Cooperative Month Celebration.'],
      organization: '7th Marciano Aquino Coop Gawad Parangal',
    },
    image_url: '/About/Awards/coop-gawad-parangal.png',
    status: 'published',
    featured: false,
    placement: 'more',
    display_order: 0,
    published_at: '2025-12-03T01:00:00.000Z',
  },
  {
    slug: 'award-aurora-awards-2025',
    title: 'Aurora Awards 2025',
    category: 'Awards',
    content_type: 'award',
    excerpt: 'Received multiple recognitions for risk readiness, share capital structure, and loan-loss provision.',
    body: {
      paragraphs: ['Received multiple recognitions for risk readiness, share capital structure, and loan-loss provision.'],
      organization: 'NATCCO Network',
    },
    image_url: '/About/Awards/aurora-awards-2025.png',
    status: 'published',
    featured: false,
    placement: 'more',
    display_order: 0,
    published_at: '2025-12-02T01:00:00.000Z',
  },
  {
    slug: 'award-champion-for-climate-action-2025',
    title: 'Champion for Climate Action',
    category: 'Awards',
    content_type: 'award',
    excerpt: 'Recognized for sustainability impact and climate-conscious cooperative action.',
    body: {
      paragraphs: ['Recognized for sustainability impact and climate-conscious cooperative action.'],
      organization: 'CLIMBS',
    },
    image_url: '/About/Awards/climbs-climate-action.png',
    status: 'published',
    featured: false,
    placement: 'more',
    display_order: 0,
    published_at: '2025-12-01T01:00:00.000Z',
  },
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
      organization: '',
      awardYear: '',
      eventDate: '',
      eventLocation: '',
      registrationUrl: '',
      announcementPriority: 'standard',
      expiresAt: '',
      scheduledAt: '',
      eventEndDate: '',
      imageAlt: '',
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
      organization: body.organization || '',
      awardYear: body.awardYear || body.year || '',
      eventDate: body.eventDate || '',
      eventEndDate: body.eventEndDate || '',
      eventLocation: body.eventLocation || '',
      registrationUrl: body.registrationUrl || '',
      announcementPriority: body.announcementPriority || 'standard',
      expiresAt: body.expiresAt || '',
      imageAlt: body.imageAlt || '',
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
    organization: '',
    awardYear: '',
    eventDate: '',
    eventLocation: '',
    registrationUrl: '',
    announcementPriority: 'standard',
    expiresAt: '',
    eventEndDate: '',
    imageAlt: '',
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
  const scheduledTime = row.scheduled_at ? new Date(row.scheduled_at).getTime() : 0;
  const scheduleIsLive = row.status === 'scheduled' && scheduledTime > 0 && scheduledTime <= Date.now();
  const status = scheduleIsLive ? 'published' : row.status || 'draft';
  const publishedAt = row.published_at || (scheduleIsLive ? row.scheduled_at : '');

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category || 'News',
    type: row.content_type || 'news',
    excerpt: row.excerpt || '',
    fullArticle: body.fullArticle,
    organization: body.organization,
    awardYear: body.awardYear,
    eventDate: body.eventDate,
    eventEndDate: body.eventEndDate,
    eventLocation: body.eventLocation,
    registrationUrl: body.registrationUrl,
    announcementPriority: body.announcementPriority,
    expiresAt: body.expiresAt,
    imageAlt: body.imageAlt,
    externalUrl: body.externalUrl,
    republishedAt: body.republishedAt,
    editedAt: body.editedAt,
    storyRole: body.storyRole,
    storyLocation: body.storyLocation,
    tags: body.tags,
    image: row.image_url || '',
    status,
    scheduledAt: row.scheduled_at || '',
    featured: placement === 'featured',
    placement,
    displayOrder: Number(row.display_order || 0),
    date: publishedAt
      ? new Date(publishedAt).toLocaleDateString('en-PH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : '',
    publishedAt,
    createdBy: row.created_by || '',
    updatedBy: row.updated_by || '',
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
};

const toPostPayload = (post, user) => {
  const placement = normalizePlacement(post.placement, Boolean(post.featured));
  const fullArticle = Array.isArray(post.fullArticle) ? post.fullArticle : post.body || [];
  const body = {
    paragraphs: fullArticle,
    videoUrl: post.externalUrl || '',
    republishedAt: post.republishedAt || '',
    editedAt: post.editedAt || '',
    organization: post.organization || '',
    awardYear: post.awardYear || '',
    eventDate: post.eventDate || '',
    eventEndDate: post.eventEndDate || '',
    eventLocation: post.eventLocation || '',
    registrationUrl: post.registrationUrl || '',
    announcementPriority: post.announcementPriority || 'standard',
    expiresAt: post.expiresAt || '',
    imageAlt: post.imageAlt || '',
    role: post.storyRole || '',
    location: post.storyLocation || '',
    tags: Array.isArray(post.tags) ? post.tags : [],
  };

  return {
    slug: post.slug?.trim() || slugify(post.title),
    title: post.title?.trim() || 'Untitled Post',
    category: post.category || 'News',
    content_type: post.type || post.contentType || 'news',
    excerpt: post.excerpt?.trim() || '',
    body,
    image_url: post.image || post.imageUrl || '',
    status: post.status || 'draft',
    scheduled_at: post.scheduledAt || null,
    featured: placement === 'featured',
    placement,
    display_order: Number(post.displayOrder || post.display_order || 0),
    published_at:
      post.status === 'scheduled'
        ? post.scheduledAt || null
        : post.status === 'published'
        ? post.publishedAt || new Date().toISOString()
        : post.publishedAt || null,
    updated_by: user?.id || null,
  };
};

const demoteExistingFeaturedPosts = async ({
  supabase,
  savedPostId,
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
    .neq('id', savedPostId || '00000000-0000-0000-0000-000000000000')
    .in('content_type', ['news', 'event', 'announcement'])
    .in('status', ['published', 'scheduled'])
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
    .or(`status.eq.published,and(status.eq.scheduled,scheduled_at.lte.${new Date().toISOString()})`)
    .neq('content_type', 'member_story')
    .neq('content_type', 'award')
    .order('featured', { ascending: false })
    .order('placement', { ascending: true })
    .order('display_order', { ascending: true })
    .order('published_at', { ascending: false });

  if (error) throw new Error(error.message || 'Unable to load marketing posts.');

  const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return sortMarketingPosts((data || [])
    .map(mapPostRow)
    .filter((post) => {
      const isWithinDisplayWindow = !post.expiresAt || post.expiresAt.slice(0, 10) >= todayKey;
      const isCurrentEvent = post.type !== 'event' || !post.eventEndDate || post.eventEndDate.slice(0, 10) >= todayKey;
      return isWithinDisplayWindow && isCurrentEvent;
    }));
}

export async function listPublishedAwardPosts() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('marketing_posts')
    .select(MARKETING_POST_COLUMNS)
    .or(`status.eq.published,and(status.eq.scheduled,scheduled_at.lte.${new Date().toISOString()})`)
    .eq('content_type', 'award')
    .order('published_at', { ascending: false });

  if (error) throw new Error(error.message || 'Unable to load award posts.');

  return sortMarketingPosts((data || []).map(mapPostRow));
}

export async function listPublishedMemberStories() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('marketing_posts')
    .select(MARKETING_POST_COLUMNS)
    .or(`status.eq.published,and(status.eq.scheduled,scheduled_at.lte.${new Date().toISOString()})`)
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

export async function ensureCurrentStaticAwardPosts(user) {
  const supabase = createClient();
  const rows = STATIC_AWARD_POSTS.map((post) => ({
    ...post,
    updated_by: user?.id || null,
    created_by: user?.id || null,
  }));

  const { data, error } = await withTimeout(
    supabase
      .from('marketing_posts')
      .upsert(rows, { onConflict: 'slug' })
      .select(MARKETING_POST_COLUMNS),
    'Award records took too long to import. Please refresh and try again.'
  );

  if (error) throw new Error(error.message || 'Unable to import award records.');

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

  if (['published', 'scheduled'].includes(payload.status) && payload.placement === 'featured' && ['news', 'event', 'announcement'].includes(payload.content_type)) {
    await demoteExistingFeaturedPosts({
      supabase,
      savedPostId: post.id || '',
      userId: user?.id || null,
    });
  }

  const query = post.id
    ? supabase.from('marketing_posts').update(payload).eq('id', post.id)
    : supabase.from('marketing_posts').insert(payload);

  const { data, error } = await query.select(MARKETING_POST_COLUMNS).single();

  if (error) throw new Error(error.message || 'Unable to save marketing post.');

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

export async function uploadMarketingImage(file, user) {
  if (!file || !user?.id) throw new Error('Sign in again before uploading an image.');
  const supabase = createClient();
  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const objectId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const path = `${user.id}/${objectId}.${extension}`;
  const { error } = await supabase.storage
    .from('marketing-media')
    .upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: false });

  if (error) throw new Error(error.message || 'Unable to upload this image.');
  return supabase.storage.from('marketing-media').getPublicUrl(path).data.publicUrl;
}

export async function deleteMarketingPost(id) {
  const supabase = createClient();

  const { error } = await supabase.from('marketing_posts').delete().eq('id', id);

  if (error) throw new Error(error.message || 'Unable to delete marketing post.');
}
