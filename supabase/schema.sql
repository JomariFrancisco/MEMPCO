-- MEMPCO portal auth schema for Supabase.
-- Run this in Supabase Dashboard > SQL Editor before using the real login module.

create extension if not exists pgcrypto;

do $$
begin
  create type public.user_role as enum ('employee', 'admin');
exception
  when duplicate_object then null;
end $$;

alter type public.user_role add value if not exists 'superadmin';
alter type public.user_role add value if not exists 'marketing_admin';
alter type public.user_role add value if not exists 'hr_admin';

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'employee',
  full_name text not null,
  employee_id text,
  department text,
  branch text,
  office text,
  designation text,
  email text not null,
  phone text,
  status text not null default 'Active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
add column if not exists role public.user_role not null default 'employee',
add column if not exists full_name text not null default 'MEMPCO User',
add column if not exists employee_id text,
add column if not exists department text,
add column if not exists branch text,
add column if not exists office text,
add column if not exists designation text,
add column if not exists email text,
add column if not exists phone text,
add column if not exists status text not null default 'Active',
add column if not exists created_at timestamptz not null default now(),
add column if not exists updated_at timestamptz not null default now();

update public.profiles
set
  role = coalesce(role, 'employee'::public.user_role),
  full_name = coalesce(nullif(full_name, ''), email, 'MEMPCO User'),
  email = coalesce(nullif(email, ''), 'missing-email-' || id::text || '@mempco.local'),
  status = coalesce(nullif(status, ''), 'Active'),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

alter table public.profiles
alter column role set default 'employee',
alter column role set not null,
alter column full_name set not null,
alter column email set not null,
alter column status set not null,
alter column created_at set not null,
alter column updated_at set not null;

create index if not exists profiles_email_idx on public.profiles (lower(email));
create index if not exists profiles_role_idx on public.profiles (role);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    role,
    full_name,
    employee_id,
    department,
    branch,
    office,
    designation,
    email,
    phone,
    status
  )
  values (
    new.id,
    'employee',
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'employee_id',
    new.raw_user_meta_data ->> 'department',
    new.raw_user_meta_data ->> 'branch',
    new.raw_user_meta_data ->> 'branch',
    new.raw_user_meta_data ->> 'designation',
    new.email,
    new.raw_user_meta_data ->> 'phone',
    'Active'
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    employee_id = excluded.employee_id,
    department = excluded.department,
    branch = excluded.branch,
    office = excluded.office,
    designation = excluded.designation,
    phone = excluded.phone;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role::text in ('admin', 'superadmin')
  );
$$;

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role::text = 'superadmin'
  );
$$;

create or replace function public.has_portal_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and (
        role::text = 'superadmin'
        or role::text = any(allowed_roles)
      )
  );
$$;

create or replace function public.is_marketing_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_portal_role(array['marketing_admin']);
$$;

create or replace function public.is_hr_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_portal_role(array['hr_admin']);
$$;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles"
on public.profiles for select
using (public.is_admin());

drop policy if exists "Users can insert own employee profile" on public.profiles;
create policy "Users can insert own employee profile"
on public.profiles for insert
with check (auth.uid() = id and role = 'employee');

drop policy if exists "Users can update own employee profile" on public.profiles;
create policy "Users can update own employee profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id and role = 'employee');

drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles"
on public.profiles for update
using (public.is_admin())
with check (public.is_admin());

-- To make your first superadmin after creating the user in Supabase Auth:
-- update public.profiles set role = 'superadmin' where email = 'your-superadmin-email@mempco.local';

-- Persistent ICT helpdesk tickets.
create sequence if not exists public.ticket_number_seq start 1;

create or replace function public.generate_ticket_id()
returns text
language sql
as $$
  select 'TCK-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.ticket_number_seq')::text, 4, '0');
$$;

create table if not exists public.tickets (
  id text primary key default public.generate_ticket_id(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  owner_email text not null,
  requester text not null,
  employee_id text,
  branch text not null,
  department text not null,
  support_category text not null,
  concern_type text not null,
  device_name text,
  contact_number text,
  impact text,
  description text not null,
  sla text not null default 'Low',
  priority text not null default 'Low',
  status text not null default 'Created',
  technician text not null default 'Unassigned',
  action_taken text not null default '',
  admin_remarks text not null default '',
  resolution text not null default '',
  saar_required boolean not null default false,
  saar_attachment jsonb,
  date_label text,
  last_employee_update text,
  admin_updated_at text,
  work_started_at text,
  work_ended_at text,
  locked_by uuid references public.profiles(id) on delete set null,
  locked_by_name text,
  locked_at timestamptz,
  lock_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tickets
add column if not exists owner_id uuid references public.profiles(id) on delete cascade,
add column if not exists owner_email text,
add column if not exists requester text,
add column if not exists employee_id text,
add column if not exists branch text,
add column if not exists department text,
add column if not exists support_category text,
add column if not exists concern_type text,
add column if not exists device_name text,
add column if not exists contact_number text,
add column if not exists impact text,
add column if not exists description text,
add column if not exists sla text not null default 'Low',
add column if not exists priority text not null default 'Low',
add column if not exists status text not null default 'Created',
add column if not exists technician text not null default 'Unassigned',
add column if not exists action_taken text not null default '',
add column if not exists admin_remarks text not null default '',
add column if not exists resolution text not null default '',
add column if not exists saar_required boolean not null default false,
add column if not exists saar_attachment jsonb,
add column if not exists date_label text,
add column if not exists last_employee_update text,
add column if not exists admin_updated_at text,
add column if not exists work_started_at text,
add column if not exists work_ended_at text,
add column if not exists locked_by uuid references public.profiles(id) on delete set null,
add column if not exists locked_by_name text,
add column if not exists locked_at timestamptz,
add column if not exists lock_expires_at timestamptz,
add column if not exists created_at timestamptz not null default now(),
add column if not exists updated_at timestamptz not null default now();

update public.tickets
set
  owner_email = coalesce(nullif(owner_email, ''), 'missing-owner-' || id || '@mempco.local'),
  requester = coalesce(nullif(requester, ''), owner_email, 'Employee'),
  branch = coalesce(nullif(branch, ''), 'Unspecified'),
  department = coalesce(nullif(department, ''), 'Unspecified'),
  support_category = coalesce(nullif(support_category, ''), 'Other ICT Support'),
  concern_type = coalesce(nullif(concern_type, ''), 'Other Technical Concern'),
  description = coalesce(description, ''),
  sla = coalesce(nullif(sla, ''), 'Low'),
  priority = coalesce(nullif(priority, ''), sla, 'Low'),
  status = coalesce(nullif(status, ''), 'Created'),
  technician = coalesce(nullif(technician, ''), 'Unassigned'),
  action_taken = coalesce(action_taken, ''),
  admin_remarks = coalesce(admin_remarks, ''),
  resolution = coalesce(resolution, ''),
  saar_required = coalesce(saar_required, false),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

alter table public.tickets
alter column owner_id set not null,
alter column owner_email set not null,
alter column requester set not null,
alter column branch set not null,
alter column department set not null,
alter column support_category set not null,
alter column concern_type set not null,
alter column description set not null,
alter column sla set not null,
alter column priority set not null,
alter column status set not null,
alter column technician set not null,
alter column action_taken set not null,
alter column admin_remarks set not null,
alter column resolution set not null,
alter column saar_required set not null,
alter column created_at set not null,
alter column updated_at set not null;

create index if not exists tickets_owner_id_idx on public.tickets (owner_id);
create index if not exists tickets_status_idx on public.tickets (status);
create index if not exists tickets_branch_idx on public.tickets (branch);
create index if not exists tickets_created_at_idx on public.tickets (created_at desc);
create index if not exists tickets_updated_at_idx on public.tickets (updated_at desc);
create index if not exists tickets_locked_by_idx on public.tickets (locked_by);
create index if not exists tickets_lock_expires_at_idx on public.tickets (lock_expires_at);

drop trigger if exists tickets_set_updated_at on public.tickets;
create trigger tickets_set_updated_at
before update on public.tickets
for each row execute function public.set_updated_at();

alter table public.tickets enable row level security;

drop policy if exists "Employees can read own tickets" on public.tickets;
create policy "Employees can read own tickets"
on public.tickets for select
using (auth.uid() = owner_id);

drop policy if exists "Admins can read all tickets" on public.tickets;
create policy "Admins can read all tickets"
on public.tickets for select
using (public.is_admin());

drop policy if exists "Employees can create own tickets" on public.tickets;
create policy "Employees can create own tickets"
on public.tickets for insert
with check (auth.uid() = owner_id);

drop policy if exists "Employees can update own tickets" on public.tickets;
create policy "Employees can update own tickets"
on public.tickets for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "Admins can update tickets" on public.tickets;
create policy "Admins can update tickets"
on public.tickets for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Superadmins can delete tickets" on public.tickets;
create policy "Superadmins can delete tickets"
on public.tickets for delete
using (public.is_superadmin());

create or replace function public.claim_ticket_lock(
  target_ticket_id text,
  locker_id uuid,
  locker_name text
)
returns public.tickets
language plpgsql
security definer
set search_path = public
as $$
declare
  locked_ticket public.tickets;
begin
  if not public.is_admin() then
    raise exception 'Only admins can claim ticket locks.';
  end if;

  if locker_id is distinct from auth.uid() then
    raise exception 'Ticket lock user does not match the current session.';
  end if;

  update public.tickets
  set
    locked_by = locker_id,
    locked_by_name = coalesce(nullif(locker_name, ''), 'IT Staff'),
    locked_at = now(),
    lock_expires_at = now() + interval '20 minutes'
  where id = target_ticket_id
    and (
      locked_by is null
      or locked_by = locker_id
      or lock_expires_at is null
      or lock_expires_at < now()
    )
  returning * into locked_ticket;

  if found then
    return locked_ticket;
  end if;

  select * into locked_ticket
  from public.tickets
  where id = target_ticket_id;

  return locked_ticket;
end;
$$;

create or replace function public.release_ticket_lock(
  target_ticket_id text,
  locker_id uuid
)
returns public.tickets
language plpgsql
security definer
set search_path = public
as $$
declare
  released_ticket public.tickets;
begin
  if not public.is_admin() then
    raise exception 'Only admins can release ticket locks.';
  end if;

  if locker_id is distinct from auth.uid() then
    raise exception 'Ticket lock user does not match the current session.';
  end if;

  update public.tickets
  set
    locked_by = null,
    locked_by_name = null,
    locked_at = null,
    lock_expires_at = null
  where id = target_ticket_id
    and locked_by = locker_id
  returning * into released_ticket;

  if found then
    return released_ticket;
  end if;

  select * into released_ticket
  from public.tickets
  where id = target_ticket_id;

  return released_ticket;
end;
$$;

-- Marketing-admin managed public news, events, and announcements.
create table if not exists public.marketing_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null default 'News',
  content_type text not null default 'news',
  excerpt text not null default '',
  body jsonb not null default '[]'::jsonb,
  image_url text,
  status text not null default 'draft',
  featured boolean not null default false,
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.marketing_posts
add column if not exists slug text,
add column if not exists title text,
add column if not exists category text not null default 'News',
add column if not exists content_type text not null default 'news',
add column if not exists excerpt text not null default '',
add column if not exists body jsonb not null default '[]'::jsonb,
add column if not exists image_url text,
add column if not exists status text not null default 'draft',
add column if not exists featured boolean not null default false,
add column if not exists published_at timestamptz,
add column if not exists created_by uuid references public.profiles(id) on delete set null,
add column if not exists updated_by uuid references public.profiles(id) on delete set null,
add column if not exists created_at timestamptz not null default now(),
add column if not exists updated_at timestamptz not null default now();

update public.marketing_posts
set
  slug = coalesce(nullif(slug, ''), id::text),
  title = coalesce(nullif(title, ''), 'Untitled Post'),
  category = coalesce(nullif(category, ''), 'News'),
  content_type = coalesce(nullif(content_type, ''), 'news'),
  excerpt = coalesce(excerpt, ''),
  body = coalesce(body, '[]'::jsonb),
  status = coalesce(nullif(status, ''), 'draft'),
  featured = coalesce(featured, false),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

alter table public.marketing_posts
alter column slug set not null,
alter column title set not null,
alter column category set not null,
alter column content_type set not null,
alter column excerpt set not null,
alter column body set not null,
alter column status set not null,
alter column featured set not null,
alter column created_at set not null,
alter column updated_at set not null;

create unique index if not exists marketing_posts_slug_idx on public.marketing_posts (lower(slug));
create index if not exists marketing_posts_status_published_idx on public.marketing_posts (status, published_at desc);
create index if not exists marketing_posts_category_idx on public.marketing_posts (category);

drop trigger if exists marketing_posts_set_updated_at on public.marketing_posts;
create trigger marketing_posts_set_updated_at
before update on public.marketing_posts
for each row execute function public.set_updated_at();

alter table public.marketing_posts enable row level security;

drop policy if exists "Published marketing posts are public" on public.marketing_posts;
create policy "Published marketing posts are public"
on public.marketing_posts for select
using (status = 'published');

drop policy if exists "Marketing admins can read all posts" on public.marketing_posts;
create policy "Marketing admins can read all posts"
on public.marketing_posts for select
using (public.is_marketing_admin());

drop policy if exists "Marketing admins can create posts" on public.marketing_posts;
create policy "Marketing admins can create posts"
on public.marketing_posts for insert
with check (public.is_marketing_admin());

drop policy if exists "Marketing admins can update posts" on public.marketing_posts;
create policy "Marketing admins can update posts"
on public.marketing_posts for update
using (public.is_marketing_admin())
with check (public.is_marketing_admin());

drop policy if exists "Marketing admins can delete posts" on public.marketing_posts;
create policy "Marketing admins can delete posts"
on public.marketing_posts for delete
using (public.is_marketing_admin());

-- HR-admin managed careers and applications.
create table if not exists public.job_openings (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  department text not null,
  location text not null,
  employment_type text not null default 'Full-time',
  description text not null default '',
  image_url text,
  status text not null default 'draft',
  display_order integer not null default 0,
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.job_openings
add column if not exists slug text,
add column if not exists title text,
add column if not exists department text,
add column if not exists location text,
add column if not exists employment_type text not null default 'Full-time',
add column if not exists description text not null default '',
add column if not exists image_url text,
add column if not exists status text not null default 'draft',
add column if not exists display_order integer not null default 0,
add column if not exists published_at timestamptz,
add column if not exists created_by uuid references public.profiles(id) on delete set null,
add column if not exists updated_by uuid references public.profiles(id) on delete set null,
add column if not exists created_at timestamptz not null default now(),
add column if not exists updated_at timestamptz not null default now();

update public.job_openings
set
  slug = coalesce(nullif(slug, ''), id::text),
  title = coalesce(nullif(title, ''), 'Untitled Opening'),
  department = coalesce(nullif(department, ''), 'Unspecified'),
  location = coalesce(nullif(location, ''), 'Unspecified'),
  employment_type = coalesce(nullif(employment_type, ''), 'Full-time'),
  description = coalesce(description, ''),
  status = coalesce(nullif(status, ''), 'draft'),
  display_order = coalesce(display_order, 0),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

alter table public.job_openings
alter column slug set not null,
alter column title set not null,
alter column department set not null,
alter column location set not null,
alter column employment_type set not null,
alter column description set not null,
alter column status set not null,
alter column display_order set not null,
alter column created_at set not null,
alter column updated_at set not null;

create unique index if not exists job_openings_slug_idx on public.job_openings (lower(slug));
create index if not exists job_openings_status_order_idx on public.job_openings (status, display_order, published_at desc);

drop trigger if exists job_openings_set_updated_at on public.job_openings;
create trigger job_openings_set_updated_at
before update on public.job_openings
for each row execute function public.set_updated_at();

alter table public.job_openings enable row level security;

drop policy if exists "Open job openings are public" on public.job_openings;
create policy "Open job openings are public"
on public.job_openings for select
using (status = 'open');

drop policy if exists "HR admins can read all job openings" on public.job_openings;
create policy "HR admins can read all job openings"
on public.job_openings for select
using (public.is_hr_admin());

drop policy if exists "HR admins can create job openings" on public.job_openings;
create policy "HR admins can create job openings"
on public.job_openings for insert
with check (public.is_hr_admin());

drop policy if exists "HR admins can update job openings" on public.job_openings;
create policy "HR admins can update job openings"
on public.job_openings for update
using (public.is_hr_admin())
with check (public.is_hr_admin());

drop policy if exists "HR admins can delete job openings" on public.job_openings;
create policy "HR admins can delete job openings"
on public.job_openings for delete
using (public.is_hr_admin());

create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.job_openings(id) on delete set null,
  job_title text not null,
  applicant_name text not null,
  email text not null,
  phone text,
  resume_url text,
  cover_letter text,
  status text not null default 'new',
  hr_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.job_applications
add column if not exists job_id uuid references public.job_openings(id) on delete set null,
add column if not exists job_title text,
add column if not exists applicant_name text,
add column if not exists email text,
add column if not exists phone text,
add column if not exists resume_url text,
add column if not exists cover_letter text,
add column if not exists status text not null default 'new',
add column if not exists hr_notes text not null default '',
add column if not exists created_at timestamptz not null default now(),
add column if not exists updated_at timestamptz not null default now();

update public.job_applications
set
  job_title = coalesce(nullif(job_title, ''), 'General Application'),
  applicant_name = coalesce(nullif(applicant_name, ''), 'Applicant'),
  email = coalesce(nullif(email, ''), 'missing-applicant-' || id::text || '@mempco.local'),
  status = coalesce(nullif(status, ''), 'new'),
  hr_notes = coalesce(hr_notes, ''),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

alter table public.job_applications
alter column job_title set not null,
alter column applicant_name set not null,
alter column email set not null,
alter column status set not null,
alter column hr_notes set not null,
alter column created_at set not null,
alter column updated_at set not null;

create index if not exists job_applications_job_id_idx on public.job_applications (job_id);
create index if not exists job_applications_status_idx on public.job_applications (status);
create index if not exists job_applications_created_at_idx on public.job_applications (created_at desc);

drop trigger if exists job_applications_set_updated_at on public.job_applications;
create trigger job_applications_set_updated_at
before update on public.job_applications
for each row execute function public.set_updated_at();

alter table public.job_applications enable row level security;

drop policy if exists "Public can submit job applications" on public.job_applications;
create policy "Public can submit job applications"
on public.job_applications for insert
with check (true);

drop policy if exists "HR admins can read job applications" on public.job_applications;
create policy "HR admins can read job applications"
on public.job_applications for select
using (public.is_hr_admin());

drop policy if exists "HR admins can update job applications" on public.job_applications;
create policy "HR admins can update job applications"
on public.job_applications for update
using (public.is_hr_admin())
with check (public.is_hr_admin());

drop policy if exists "HR admins can delete job applications" on public.job_applications;
create policy "HR admins can delete job applications"
on public.job_applications for delete
using (public.is_hr_admin());
