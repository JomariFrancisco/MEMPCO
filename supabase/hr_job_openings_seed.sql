-- Run this in Supabase SQL Editor to convert the current static Careers
-- job postings into real HR Admin records.

create extension if not exists pgcrypto;

with seed_job_openings (
  slug,
  title,
  department,
  location,
  employment_type,
  description,
  image_url,
  status,
  display_order,
  published_at
) as (
  values
    (
      'accounting-assistant',
      'Accounting Assistant',
      'Finance',
      'Veterans, Zamboanga City',
      'Full-time',
      'Assist with financial records, reporting, and day-to-day accounting functions with strong attention to accuracy and compliance.',
      '/Career/ACCOUNTING%20ASSISTANT.png',
      'open',
      1,
      '2026-05-18 09:00:00+08'::timestamptz
    ),
    (
      'member-development-assistant',
      'Member Development Assistant',
      'Member Development',
      'Veterans, Zamboanga City',
      'Full-time',
      'Support member engagement, development initiatives, and internal coordination in a structured and service-oriented environment.',
      '/Career/MEBER%20DEVELOPMENT%20ASSISTANT.png',
      'open',
      2,
      '2026-05-18 09:05:00+08'::timestamptz
    ),
    (
      'member-treasury-assistant',
      'Member Treasury Assistant',
      'Treasury',
      'Veterans, Zamboanga City',
      'Full-time',
      'Assist treasury processes, maintain transaction accuracy, and support reliable financial operations for members and branches.',
      '/Career/MEMBER%20TREASURY%20ASSISTANT.png',
      'open',
      3,
      '2026-05-18 09:10:00+08'::timestamptz
    ),
    (
      'mrdss-assistant',
      'MRDSS Assistant',
      'MRDSS',
      'Veterans, Zamboanga City',
      'Full-time',
      'Provide dependable support for department operations, documentation, coordination, and member-related service workflows.',
      '/Career/MRDSS%20ASSISTANT.png',
      'open',
      4,
      '2026-05-18 09:15:00+08'::timestamptz
    ),
    (
      'new-accounts-assistant',
      'New Accounts Assistant',
      'Accounts',
      'Veterans, Zamboanga City',
      'Full-time',
      'Assist in opening and processing new accounts with accuracy, professionalism, and strong attention to member-facing service.',
      '/Career/NEW%20ACCOUNTS%20ASSISTANT.png',
      'open',
      5,
      '2026-05-18 09:20:00+08'::timestamptz
    )
),
updated_job_openings as (
  update public.job_openings target
  set
    title = seed.title,
    department = seed.department,
    location = seed.location,
    employment_type = seed.employment_type,
    description = seed.description,
    image_url = seed.image_url,
    status = seed.status,
    display_order = seed.display_order,
    published_at = seed.published_at,
    updated_at = now()
  from seed_job_openings seed
  where lower(target.slug) = lower(seed.slug)
  returning target.id
)
insert into public.job_openings (
  slug,
  title,
  department,
  location,
  employment_type,
  description,
  image_url,
  status,
  display_order,
  published_at
)
select
  seed.slug,
  seed.title,
  seed.department,
  seed.location,
  seed.employment_type,
  seed.description,
  seed.image_url,
  seed.status,
  seed.display_order,
  seed.published_at
from seed_job_openings seed
where not exists (
  select 1
  from public.job_openings existing
  where lower(existing.slug) = lower(seed.slug)
);
