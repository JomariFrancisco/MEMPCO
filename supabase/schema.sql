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
  placement text not null default 'more',
  display_order integer not null default 0,
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
add column if not exists placement text not null default 'more',
add column if not exists display_order integer not null default 0,
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
  placement = case
    when coalesce(nullif(placement, ''), case when featured then 'featured' else 'more' end) in ('featured', 'latest', 'more')
      then coalesce(nullif(placement, ''), case when featured then 'featured' else 'more' end)
    else 'more'
  end,
  display_order = coalesce(display_order, 0),
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
alter column placement set not null,
alter column display_order set not null,
alter column created_at set not null,
alter column updated_at set not null;

create unique index if not exists marketing_posts_slug_idx on public.marketing_posts (lower(slug));
create index if not exists marketing_posts_status_published_idx on public.marketing_posts (status, published_at desc);
create index if not exists marketing_posts_category_idx on public.marketing_posts (category);
create index if not exists marketing_posts_placement_order_idx on public.marketing_posts (placement, display_order, published_at desc);

with seed_marketing_posts (
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
  published_at
) as (
  values
    (
      'mempco-share-capital-build-up-award-natcco',
      'MEMPCO Receives Share Capital Build-Up Award at NATCCO Congress',
      'News',
      'news',
      'MEMPCO was honored with the Share Capital Build-Up Award during the 40th NATCCO General Assembly and 24th Leaders Congress held in Iloilo City, reflecting the trust, commitment, and collective effort of its members, officers, and stakeholders.',
      jsonb_build_array(
        'MEMPCO is deeply honored to receive the Share Capital Build-Up Award during the 40th NATCCO General Assembly and 24th Leaders Congress held in Iloilo City.',
        'With the theme One Year to Gold, this recognition reflects the unwavering trust, commitment, and collective effort of our members, officers, and stakeholders in strengthening our cooperative and building a more empowered community.',
        'We extend our sincere appreciation to NATCCO for this recognition. This milestone inspires us even more to stay committed to our mission and continue creating meaningful impact as we move forward together.'
      ),
      '/About/40th NATCCO GA.png',
      'published',
      true,
      'featured',
      0,
      '2026-05-02 09:00:00+08'::timestamptz
    ),
    (
      'mempco-124th-labor-day-job-fair',
      'MEMPCO Joins the 124th Labor Day Job Fair',
      'Events',
      'event',
      'MEMPCO proudly took part in the 124th Labor Day Job Fair at KCC Mall de Zamboanga, supporting employment opportunities and empowering individuals toward a better and more inclusive future.',
      jsonb_build_array(
        'MEMPCO proudly took part in the 124th Labor Day Job Fair, embracing this years theme: Disenteng Trabaho Para sa Lahat: Iisang Hangarin, Bagong Pilipinas Sama-samang Mararating.',
        'The event was held on May 1, 2026 at KCC Mall de Zamboanga and was led by the Department of Labor and Employment.',
        'MEMPCO remains committed to supporting employment opportunities and empowering individuals toward a better and more inclusive future.'
      ),
      '/About/Labor Day.png',
      'published',
      false,
      'latest',
      1,
      '2026-05-03 09:00:00+08'::timestamptz
    ),
    (
      'mempco-wmsu-careercon-job-fair-2026',
      'MEMPCO Participates in WMSU CareerCon and Job Fair 2026',
      'Events',
      'event',
      'MEMPCO joined CareerCon and Job Fair 2026 at the WMSU Gymnasium, supporting an initiative that connects students and graduates to future career opportunities.',
      jsonb_build_array(
        'MEMPCO is grateful to be part of CareerCon and Job Fair 2026, held at the Western Mindanao State University Gymnasium on April 30, 2026.',
        'We thank Western Mindanao State University for the invitation and for organizing a successful event that connects students and graduates to future opportunities.',
        'MEMPCO is honored to support this meaningful initiative for alumni and graduating students.'
      ),
      '/About/CareerCon.png',
      'published',
      false,
      'latest',
      2,
      '2026-05-01 09:00:00+08'::timestamptz
    ),
    (
      'mempco-climbs-service-climate-action',
      'MEMPCO Recognized by CLIMBS for Service and Climate Action',
      'News',
      'news',
      'During the 54th Annual General Assembly of CLIMBS Life and General Insurance Cooperative, MEMPCO was recognized as Top Premium Producer Regional and Champion for Climate Action.',
      jsonb_build_array(
        'With humble hearts, MEMPCO shares this meaningful milestone. During the 54th Annual General Assembly of CLIMBS Life and General Insurance Cooperative in Cebu City, MEMPCO was honored to receive recognitions as Top Premium Producer Regional and Champion for Climate Action.',
        'We accept these honors with gratitude, recognizing that these achievements reflect the trust of our member-owners and the dedication of our team.',
        'MEMPCO remains committed to serving with integrity and contributing to a more sustainable and progressive community.'
      ),
      '/About/54th Climbs Annual General Assembly.png',
      'published',
      false,
      'latest',
      3,
      '2026-04-29 09:00:00+08'::timestamptz
    ),
    (
      'empowering-communities-financial-wellness',
      'Empowering Communities Through Financial Wellness',
      'Events',
      'event',
      'MEMPCO joined the DSWD Convergence Caravan with 4Ps beneficiaries in Zamboanga City, sharing financial wellness discussions on PMES, savings, loans, insurance, and financial literacy.',
      jsonb_build_array(
        'MEMPCO is grateful to the Department of Social Welfare and Development for inviting us to be part of their Convergence Caravan with 4Ps beneficiaries from different barangays in Zamboanga City.',
        'During the activity, MEMPCO shared discussions on PMES, financial wellness and management, loans, savings, and insurance services.',
        'We sincerely hope that the learnings shared will be applied and become a guide toward a more secure future. Helping people help themselves remains at the heart of this initiative.'
      ),
      '/About/Financial Literacy Seminar.png',
      'published',
      false,
      'more',
      4,
      '2026-04-23 09:00:00+08'::timestamptz
    ),
    (
      'central-office-fire-drill-seminar',
      'Fire Drill Seminar Strengthens Preparedness at Central Office',
      'Events',
      'event',
      'MEMPCO Central Office conducted a Fire Drill Seminar in partnership with the Bureau of Fire Protection - Zamboanga City Fire District to strengthen fire prevention, safety protocols, and emergency response.',
      jsonb_build_array(
        'MEMPCO Central Office successfully conducted a Fire Drill Seminar in partnership with the Bureau of Fire Protection - Zamboanga City Fire District.',
        'The activity equipped participants with essential knowledge on fire prevention, safety protocols, and proper emergency response, reinforcing the importance of readiness in ensuring workplace safety.',
        'MEMPCO extends its sincere gratitude to the Bureau of Fire Protection for their continuous efforts in promoting fire safety awareness and preparedness within the community.'
      ),
      '/About/Central Office Fire Drill.png',
      'published',
      false,
      'more',
      5,
      '2026-04-23 10:00:00+08'::timestamptz
    ),
    (
      'culianan-branch-fire-drill-seminar',
      'Fire Drill Seminar Conducted at Culianan Branch',
      'Events',
      'event',
      'MEMPCO Culianan Branch participated in a Fire Drill Seminar with the Bureau of Fire Protection, helping participants gain practical knowledge and confidence in responding to emergency situations.',
      jsonb_build_array(
        'MEMPCO Culianan Branch successfully participated in a Fire Drill Seminar in partnership with the Bureau of Fire Protection - Zamboanga City Fire District.',
        'The seminar strengthened awareness on fire prevention, emergency response, and workplace safety. Participants were provided with valuable knowledge and practical guidance to ensure readiness during emergency situations.',
        'Through activities like these, participants are empowered with both knowledge and confidence in responding effectively during fire-related incidents.'
      ),
      '/About/Culianan Fire Drill.png',
      'published',
      false,
      'more',
      6,
      '2026-04-24 09:00:00+08'::timestamptz
    ),
    (
      'earth-day-everyday-sustainable-living',
      'Earth Day, Everyday: MEMPCO Promotes Sustainable Living',
      'Announcement',
      'announcement',
      'MEMPCO encourages members and communities to practice simple daily actions such as conserving water, using natural light, choosing reusable items, and proper waste segregation.',
      jsonb_build_array(
        'At MEMPCO, we believe that meaningful change begins with simple everyday actions.',
        'From conserving water and using natural light, to choosing reusable items and practicing proper waste segregation, each small step contributes to a healthier and more sustainable future for our communities.',
        'Let us continue working together as responsible stewards of our environment. By making mindful choices today, we help build a better tomorrow for the next generation.'
      ),
      '/About/Earth Day.png',
      'published',
      false,
      'more',
      7,
      '2026-05-01 10:00:00+08'::timestamptz
    ),
    (
      'mempco-hour-level-up',
      'Lets Go Green with MEMPCO Hour Level Up',
      'Announcement',
      'announcement',
      'In celebration of Earth Month, MEMPCO continues to encourage green habits and responsible actions through the MEMPCO Hour Level Up initiative.',
      jsonb_build_array(
        'In celebration of Earth Month, MEMPCO continues to encourage members, employees, and communities to take part in meaningful actions for the environment.',
        'The MEMPCO Hour Level Up initiative promotes simple but impactful habits that support sustainability and environmental responsibility.',
        'Through collective participation, MEMPCO hopes to strengthen awareness and inspire everyone to contribute to a cleaner, greener, and more sustainable future.'
      ),
      '/About/MEMPCO Hour.png',
      'published',
      false,
      'more',
      8,
      '2026-04-28 09:00:00+08'::timestamptz
    ),
    (
      'member-story-amylita-villarosa',
      'Amylita Villarosa',
      'Member Stories',
      'member_story',
      'Once an OFW, Amylita invested her savings into building a small bakery. With business training and MEMPCO support, she expanded her livelihood and helped her children finish school.',
      jsonb_build_object(
        'paragraphs',
        jsonb_build_array(
          'Meet Amylita Villarosa, a proud entrepreneur from San Roque and the dedicated owner of her own bakery shop. Once an OFW, Amylita made the brave decision to invest her hard-earned savings into building a small bakery upon returning to the Philippines.',
          'Instead of spending it elsewhere, she chose to take business training and workshops, equipping herself with the knowledge and confidence to properly manage her venture.',
          'Through perseverance and determination, she supported her family needs, helped her children finish school, and expanded her bakery with the help and support of MEMPCO.'
        ),
        'videoUrl',
        'https://youtu.be/QwMlGNOP2gY?si=Vuc8E9pATomR654n',
        'role',
        'Bakery Shop Owner',
        'location',
        'San Roque, Zamboanga City',
        'tags',
        jsonb_build_array('#MEMPCOStories', '#CooperativePride', '#WomenInBusiness', '#OFWtoEntrepreneur')
      ),
      '/MemberStories/Amylita.png',
      'published',
      false,
      'more',
      0,
      '2026-05-04 09:00:00+08'::timestamptz
    ),
    (
      'member-story-edna-mallorca',
      'Edna Mallorca',
      'Member Stories',
      'member_story',
      'Edna started with a humble ukay-ukay and used her MEMPCO loan to venture into a junk shop business. Today, her business employs more than 10 workers and has expanded to multiple locations.',
      jsonb_build_object(
        'paragraphs',
        jsonb_build_array(
          'Meet Edna Gonzalez Mallorca, a driven entrepreneur and the proud owner of a junk shop and demolition contracting business.',
          'Her journey began with a humble ukay-ukay venture, where she earned a living and empowered others by teaching fellow MEMPCO members basic sewing and tailoring skills.',
          'With MEMPCO support, Edna ventured into the junk shop business, expanded her operations, and built a livelihood that now supports her family and more than 10 workers.'
        ),
        'videoUrl',
        'https://youtu.be/qTQaPQVCyHY?si=GyBn-USDbqnJFC8P',
        'role',
        'Junk Shop Owner',
        'location',
        'Zamboanga City',
        'tags',
        jsonb_build_array('#MEMPCOStories', '#CooperativePride', '#WomenInBusiness', '#FromHumbleBeginnings')
      ),
      '/MemberStories/Edna.png',
      'published',
      false,
      'more',
      1,
      '2026-05-04 10:00:00+08'::timestamptz
    ),
    (
      'member-story-girlee-del-rosario',
      'Girlee Del Rosario',
      'Member Stories',
      'member_story',
      'With MEMPCO support, Girlee strengthened her sari-sari store and rubber buying business, and acquired vehicles to help sustain and grow her livelihood for her family.',
      jsonb_build_object(
        'paragraphs',
        jsonb_build_array(
          'Meet Girlee Del Rosario, a passionate entrepreneur from Ipil, Zamboanga Sibugay, proudly managing her business as a rubber buyer and sari-sari store owner.',
          'Through perseverance and dedication, Girlee was able to provide for her family and steadily grow her livelihood.',
          'With MEMPCO support, she strengthened her sari-sari store and acquired a truck and a car, both essential in sustaining and growing her business.'
        ),
        'videoUrl',
        'https://youtu.be/ublDz2mWQP0?si=vUfEwHut8r9eqw6W',
        'role',
        'Rubber Buyer and Sari-Sari Store Owner',
        'location',
        'Ipil, Zamboanga Sibugay',
        'tags',
        jsonb_build_array('#MEMPCOStories', '#Entrepreneurship', '#CooperativeSuccess', '#WomenInBusiness')
      ),
      '/MemberStories/Girlee.png',
      'published',
      false,
      'more',
      2,
      '2026-05-04 11:00:00+08'::timestamptz
    )
)
insert into public.marketing_posts (
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
  published_at
)
select
  seed.slug,
  seed.title,
  seed.category,
  seed.content_type,
  seed.excerpt,
  seed.body,
  seed.image_url,
  seed.status,
  seed.featured,
  seed.placement,
  seed.display_order,
  seed.published_at
from seed_marketing_posts seed
where not exists (
  select 1
  from public.marketing_posts existing
  where lower(existing.slug) = lower(seed.slug)
);

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
