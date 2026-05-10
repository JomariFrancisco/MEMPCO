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

const mapPostRow = (row) => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  category: row.category || 'News',
  type: row.content_type || 'news',
  excerpt: row.excerpt || '',
  fullArticle: Array.isArray(row.body) ? row.body : [],
  image: row.image_url || '',
  status: row.status || 'draft',
  featured: Boolean(row.featured),
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
});

const toPostPayload = (post, user) => ({
  slug: post.slug?.trim() || slugify(post.title),
  title: post.title?.trim() || 'Untitled Post',
  category: post.category || 'News',
  content_type: post.type || post.contentType || 'news',
  excerpt: post.excerpt?.trim() || '',
  body: Array.isArray(post.fullArticle) ? post.fullArticle : post.body || [],
  image_url: post.image || post.imageUrl || '',
  status: post.status || 'draft',
  featured: Boolean(post.featured),
  published_at:
    post.status === 'published'
      ? post.publishedAt || new Date().toISOString()
      : post.publishedAt || null,
  updated_by: user?.id || null,
});

export async function listPublishedMarketingPosts() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('marketing_posts')
    .select(MARKETING_POST_COLUMNS)
    .eq('status', 'published')
    .order('featured', { ascending: false })
    .order('published_at', { ascending: false });

  if (error) throw new Error(error.message || 'Unable to load marketing posts.');

  return (data || []).map(mapPostRow);
}

export async function listMarketingPosts() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('marketing_posts')
    .select(MARKETING_POST_COLUMNS)
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message || 'Unable to load marketing posts.');

  return (data || []).map(mapPostRow);
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

  return mapPostRow(data);
}

export async function deleteMarketingPost(id) {
  const supabase = createClient();
  const { error } = await supabase.from('marketing_posts').delete().eq('id', id);

  if (error) throw new Error(error.message || 'Unable to delete marketing post.');
}
