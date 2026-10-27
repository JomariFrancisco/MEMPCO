-- Marketing workflow, media storage, audit history, and public scheduling.
-- Run once in the Supabase SQL Editor before deploying the matching app code.

alter table public.marketing_posts
  add column if not exists scheduled_at timestamptz;

alter table public.marketing_posts
  drop constraint if exists marketing_posts_status_check;

alter table public.marketing_posts
  add constraint marketing_posts_status_check
  check (status in ('draft', 'in_review', 'scheduled', 'published', 'archived'));

-- Existing featured records are consolidated to one shared public spotlight
-- across News, Events, and Announcements before enforcing that rule.
with ranked as (
  select id,
         row_number() over (
           order by published_at desc nulls last, updated_at desc nulls last, created_at desc
         ) as position
  from public.marketing_posts
  where content_type in ('news', 'event', 'announcement')
    and status in ('published', 'scheduled')
    and (placement = 'featured' or featured = true)
)
update public.marketing_posts p
set placement = case when ranked.position = 1 then 'featured' else 'latest' end,
    featured = (ranked.position = 1)
from ranked
where ranked.id = p.id;

create unique index if not exists marketing_posts_single_public_feature_idx
  on public.marketing_posts ((placement))
  where placement = 'featured'
    and content_type in ('news', 'event', 'announcement')
    and status in ('published', 'scheduled');

create index if not exists marketing_posts_schedule_idx
  on public.marketing_posts (status, scheduled_at)
  where status = 'scheduled';

-- A durable before/after log allows content changes to be audited and provides
-- the data required for a later restore interface.
create table if not exists public.marketing_post_revisions (
  id bigint generated always as identity primary key,
  post_id uuid not null,
  changed_by uuid references public.profiles(id) on delete set null,
  changed_at timestamptz not null default now(),
  previous_post jsonb not null,
  next_post jsonb not null
);

create index if not exists marketing_post_revisions_post_idx
  on public.marketing_post_revisions (post_id, changed_at desc);

alter table public.marketing_post_revisions enable row level security;
drop policy if exists "Marketing admins can read post revisions" on public.marketing_post_revisions;
create policy "Marketing admins can read post revisions"
  on public.marketing_post_revisions for select
  using (public.is_marketing_admin());
grant select on public.marketing_post_revisions to authenticated;

create or replace function public.log_marketing_post_revision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.marketing_post_revisions (post_id, changed_by, previous_post, next_post)
  values (old.id, auth.uid(), to_jsonb(old), to_jsonb(new));
  return new;
end;
$$;

drop trigger if exists marketing_posts_revision_log on public.marketing_posts;
create trigger marketing_posts_revision_log
  after update on public.marketing_posts
  for each row execute function public.log_marketing_post_revision();

-- Content authors can create drafts and submit for review. Only a Super Admin
-- can create or transition posts into public/scheduled states.
drop policy if exists "Marketing admins can create posts" on public.marketing_posts;
create policy "Marketing admins can create posts"
  on public.marketing_posts for insert
  with check (
    public.is_marketing_admin()
    and (status not in ('published', 'scheduled') or public.is_superadmin())
  );

drop policy if exists "Marketing admins can update posts" on public.marketing_posts;
create policy "Marketing admins can update posts"
  on public.marketing_posts for update
  using (public.is_marketing_admin())
  with check (
    public.is_marketing_admin()
    and (status not in ('published', 'scheduled') or public.is_superadmin())
  );

drop policy if exists "Published marketing posts are public" on public.marketing_posts;
create policy "Published marketing posts are public"
  on public.marketing_posts for select
  using (
    (
      status = 'published'
      or (status = 'scheduled' and scheduled_at <= now())
    )
    and (
      content_type <> 'announcement'
      or nullif(body->>'expiresAt', '') is null
      or body->>'expiresAt' >= (now() at time zone 'Asia/Manila')::date::text
    )
    and (
      content_type <> 'event'
      or nullif(body->>'eventEndDate', '') is null
      or body->>'eventEndDate' >= (now() at time zone 'Asia/Manila')::date::text
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'marketing-media',
  'marketing-media',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read marketing media" on storage.objects;
create policy "Public can read marketing media"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'marketing-media');

drop policy if exists "Marketing admins can upload marketing media" on storage.objects;
create policy "Marketing admins can upload marketing media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'marketing-media'
    and public.is_marketing_admin()
    and public.has_valid_portal_session()
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Marketing admins can update marketing media" on storage.objects;
create policy "Marketing admins can update marketing media"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'marketing-media'
    and public.is_marketing_admin()
    and public.has_valid_portal_session()
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'marketing-media'
    and public.is_marketing_admin()
    and public.has_valid_portal_session()
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Marketing admins can delete marketing media" on storage.objects;
create policy "Marketing admins can delete marketing media"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'marketing-media'
    and public.is_marketing_admin()
    and public.has_valid_portal_session()
    and auth.uid()::text = (storage.foldername(name))[1]
  );
