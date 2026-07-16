-- =====================================================
-- MEMPCO WEBSITE SUPABASE SCHEMA - FULL UPDATED
-- Safe to run in Supabase SQL Editor.
-- Includes:
-- 1. Portal auth/profiles
-- 2. Helpdesk tickets
-- 3. Ticket messages / conversation
-- 4. Superadmin ticket delete
-- 5. Notifications
-- 6. Other Services requests
-- 7. Marketing posts
-- 8. HR job openings and job applications
-- 9. Realtime support
-- 10. RPC/function grants
-- 11. Ticket ID gap reuse after delete
-- =====================================================

create extension if not exists pgcrypto;

-- =====================================================
-- USER ROLE ENUM
-- =====================================================

do $$
begin
  create type public.user_role as enum ('employee', 'admin');
exception
  when duplicate_object then null;
end $$;

alter type public.user_role add value if not exists 'superadmin';
alter type public.user_role add value if not exists 'marketing_admin';
alter type public.user_role add value if not exists 'hr_admin';

-- =====================================================
-- UPDATED AT FUNCTION
-- =====================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =====================================================
-- PROFILES
-- =====================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'employee',
  full_name text not null default 'MEMPCO User',
  employee_id text,
  department text,
  branch text,
  office text,
  designation text,
  email text not null,
  phone text,
  profile_photo text,
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
add column if not exists profile_photo text,
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
create unique index if not exists profiles_email_unique_idx on public.profiles (lower(email));
create unique index if not exists profiles_employee_id_unique_idx on public.profiles (lower(employee_id)) where employee_id is not null and employee_id <> '';

-- =====================================================
-- AUTO PROFILE CREATION
-- =====================================================

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
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'employee'::public.user_role),
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1), 'MEMPCO User'),
    new.raw_user_meta_data ->> 'employee_id',
    new.raw_user_meta_data ->> 'department',
    new.raw_user_meta_data ->> 'branch',
    new.raw_user_meta_data ->> 'office',
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
    office = coalesce(excluded.office, excluded.branch),
    designation = excluded.designation,
    phone = excluded.phone,
    updated_at = now();

  return new;
exception
  when invalid_text_representation then
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
      coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1), 'MEMPCO User'),
      new.raw_user_meta_data ->> 'employee_id',
      new.raw_user_meta_data ->> 'department',
      new.raw_user_meta_data ->> 'branch',
      new.raw_user_meta_data ->> 'office',
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
      office = coalesce(excluded.office, excluded.branch),
      designation = excluded.designation,
      phone = excluded.phone,
      updated_at = now();

    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- =====================================================
-- ROLE HELPERS
-- =====================================================

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
      and coalesce(status, 'Active') = 'Active'
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
      and coalesce(status, 'Active') = 'Active'
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
      and coalesce(status, 'Active') = 'Active'
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

-- =====================================================
-- USER ACCOUNT AUDIT LOGS
-- =====================================================

create table if not exists public.user_account_audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text,
  action text not null,
  summary text not null,
  changes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.user_account_audit_logs
add column if not exists user_id uuid references public.profiles(id) on delete set null,
add column if not exists actor_id uuid references public.profiles(id) on delete set null,
add column if not exists actor_name text,
add column if not exists action text not null default 'updated',
add column if not exists summary text not null default 'Account updated',
add column if not exists changes jsonb not null default '{}'::jsonb,
add column if not exists created_at timestamptz not null default now();

alter table public.user_account_audit_logs enable row level security;

drop policy if exists "Superadmins can read user audit logs" on public.user_account_audit_logs;
create policy "Superadmins can read user audit logs"
on public.user_account_audit_logs for select
using (public.is_superadmin());

drop policy if exists "Superadmins can insert user audit logs" on public.user_account_audit_logs;
create policy "Superadmins can insert user audit logs"
on public.user_account_audit_logs for insert
with check (public.is_superadmin());

create index if not exists user_account_audit_logs_user_created_idx
on public.user_account_audit_logs (user_id, created_at desc);

-- =====================================================
-- PROFILE RLS
-- =====================================================

alter table public.profiles enable row level security;

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

drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles"
on public.profiles for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Superadmins can delete profiles" on public.profiles;
create policy "Superadmins can delete profiles"
on public.profiles for delete
using (public.is_superadmin());

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.update_own_profile_photo(photo_url text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'Login required.';
  end if;

  update public.profiles
  set profile_photo = coalesce(photo_url, '')
  where id = auth.uid()
  returning * into updated_profile;

  if updated_profile.id is null then
    raise exception 'Profile was not found.';
  end if;

  return updated_profile;
end;
$$;

-- =====================================================
-- GAP-REUSE HELP DESK TICKET ID
-- Reuses the lowest missing ticket number for the current year.
-- Example: if TCK-2026-0002 was deleted, the next ticket can become TCK-2026-0002.
-- =====================================================

create sequence if not exists public.ticket_number_seq start 1;

create or replace function public.generate_ticket_id()
returns text
language plpgsql
as $$
declare
  ticket_year text := to_char(now(), 'YYYY');
  next_number integer;
begin
  select n
  into next_number
  from generate_series(1, 999999) as n
  where not exists (
    select 1
    from public.tickets t
    where t.id = 'TCK-' || ticket_year || '-' || lpad(n::text, 4, '0')
  )
  order by n
  limit 1;

  return 'TCK-' || ticket_year || '-' || lpad(coalesce(next_number, nextval('public.ticket_number_seq')::integer)::text, 4, '0');
end;
$$;

-- =====================================================
-- TICKETS
-- =====================================================

create table if not exists public.tickets (
  id text primary key default public.generate_ticket_id(),
  owner_id uuid references public.profiles(id) on delete cascade,
  owner_email text,
  ticket_code text,
  requester text,
  employee_id text,
  branch text,
  department text,
  custodian text,
  brand text,
  device_type text,
  serial_number text,
  support_category text,
  concern_type text,
  device_name text,
  contact_number text,
  impact text,
  description text,
  sla text not null default 'Low',
  priority text not null default 'Low',
  status text not null default 'Created',
  technician text not null default 'Unassigned',
  action_taken text not null default '',
  admin_remarks text not null default '',
  resolution text not null default '',
  saar_required boolean not null default false,
  saar_attachment jsonb,
  photo_attachments jsonb not null default '[]'::jsonb,
  burnout_report jsonb not null default '{}'::jsonb,
  date_label text,
  last_employee_update text,
  admin_updated_at text,
  work_started_at text,
  work_ended_at text,
  status_history jsonb not null default '[]'::jsonb,
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
add column if not exists ticket_code text,
add column if not exists requester text,
add column if not exists employee_id text,
add column if not exists branch text,
add column if not exists department text,
add column if not exists custodian text,
add column if not exists brand text,
add column if not exists device_type text,
add column if not exists serial_number text,
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
add column if not exists photo_attachments jsonb not null default '[]'::jsonb,
add column if not exists burnout_report jsonb not null default '{}'::jsonb,
add column if not exists date_label text,
add column if not exists last_employee_update text,
add column if not exists admin_updated_at text,
add column if not exists work_started_at text,
add column if not exists work_ended_at text,
add column if not exists status_history jsonb not null default '[]'::jsonb,
add column if not exists locked_by uuid references public.profiles(id) on delete set null,
add column if not exists locked_by_name text,
add column if not exists locked_at timestamptz,
add column if not exists lock_expires_at timestamptz,
add column if not exists created_at timestamptz not null default now(),
add column if not exists updated_at timestamptz not null default now();

update public.tickets t
set owner_id = p.id
from public.profiles p
where t.owner_id is null
  and t.owner_email is not null
  and lower(p.email) = lower(t.owner_email);

update public.tickets
set
  owner_email = coalesce(nullif(owner_email, ''), 'missing-owner-' || id || '@mempco.local'),
  ticket_code = nullif(ticket_code, ''),
  requester = coalesce(nullif(requester, ''), owner_email, 'Employee'),
  branch = coalesce(nullif(branch, ''), 'Unspecified'),
  department = coalesce(nullif(department, ''), 'Unspecified'),
  custodian = coalesce(custodian, ''),
  brand = coalesce(brand, ''),
  device_type = coalesce(device_type, ''),
  serial_number = coalesce(serial_number, ''),
  support_category = coalesce(nullif(support_category, ''), 'Other ICT Request'),
  concern_type = coalesce(nullif(concern_type, ''), 'Concern not listed'),
  device_name = coalesce(device_name, ''),
  contact_number = coalesce(contact_number, ''),
  impact = coalesce(impact, ''),
  description = coalesce(description, ''),
  sla = coalesce(nullif(sla, ''), 'Low'),
  priority = coalesce(nullif(priority, ''), sla, 'Low'),
  status = coalesce(nullif(status, ''), 'Created'),
  technician = coalesce(nullif(technician, ''), 'Unassigned'),
  action_taken = coalesce(action_taken, ''),
  admin_remarks = coalesce(admin_remarks, ''),
  resolution = coalesce(resolution, ''),
  saar_required = coalesce(saar_required, false),
  photo_attachments = coalesce(photo_attachments, '[]'::jsonb),
  burnout_report = coalesce(burnout_report, '{}'::jsonb),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

do $$
begin
  if not exists (select 1 from public.tickets where owner_id is null) then
    alter table public.tickets alter column owner_id set not null;
  else
    raise notice 'Some existing tickets have no owner_id. owner_id was not forced to NOT NULL.';
  end if;
end $$;

alter table public.tickets
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
alter column photo_attachments set default '[]'::jsonb,
alter column photo_attachments set not null,
alter column burnout_report set default '{}'::jsonb,
alter column burnout_report set not null,
alter column created_at set not null,
alter column updated_at set not null;

create or replace function public.prepare_ticket_for_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  active_profile public.profiles;
begin
  if TG_OP = 'INSERT' then
    if new.owner_id is null then
      new.owner_id := auth.uid();
    end if;

    select *
    into active_profile
    from public.profiles
    where id = new.owner_id;

    if active_profile.id is null then
      raise exception 'Ticket cannot be submitted because the current user profile was not found. Please log out, log in again, or ask the administrator to verify your profile.';
    end if;

    new.owner_email := coalesce(nullif(new.owner_email, ''), active_profile.email);
    new.requester := coalesce(nullif(new.requester, ''), active_profile.full_name, active_profile.email, 'Employee');
    new.employee_id := coalesce(nullif(new.employee_id, ''), active_profile.employee_id);
    new.branch := coalesce(nullif(new.branch, ''), active_profile.branch, active_profile.office, 'Unspecified');
    new.department := coalesce(nullif(new.department, ''), active_profile.department, 'Unspecified');
    new.created_at := coalesce(new.created_at, now());
  end if;

  new.support_category := coalesce(nullif(new.support_category, ''), 'Other ICT Request');
  new.concern_type := coalesce(nullif(new.concern_type, ''), 'Concern not listed');
  new.ticket_code := nullif(new.ticket_code, '');
  new.custodian := coalesce(new.custodian, '');
  new.brand := upper(coalesce(new.brand, ''));
  new.device_type := upper(coalesce(new.device_type, ''));
  new.serial_number := upper(coalesce(new.serial_number, ''));
  new.device_name := coalesce(new.device_name, '');
  new.contact_number := coalesce(new.contact_number, '');
  new.description := coalesce(new.description, '');
  new.sla := coalesce(nullif(new.sla, ''), 'Low');
  new.priority := coalesce(nullif(new.priority, ''), new.sla, 'Low');
  new.impact := coalesce(
    nullif(new.impact, ''),
    case
      when new.sla = 'Critical' then 'Server, database, or internet service is down and branch operation may stop.'
      when new.sla = 'High' then 'Server, file storage, or network issue is blocking important work.'
      when new.sla = 'Medium' then 'Work is affected but there is a workaround or the request is planned support.'
      else 'Routine request, preparation, consultation, or non-blocking assistance.'
    end
  );
  new.status := coalesce(nullif(new.status, ''), 'Created');
  new.technician := coalesce(nullif(new.technician, ''), 'Unassigned');
  new.action_taken := coalesce(new.action_taken, '');
  new.admin_remarks := coalesce(new.admin_remarks, '');
  new.resolution := coalesce(new.resolution, '');
  new.saar_required := coalesce(new.saar_required, false);
  new.photo_attachments := coalesce(new.photo_attachments, '[]'::jsonb);
  new.burnout_report := coalesce(new.burnout_report, '{}'::jsonb);
  new.updated_at := now();

  return new;
end;
$$;

drop trigger if exists tickets_prepare_for_write on public.tickets;
create trigger tickets_prepare_for_write
before insert or update on public.tickets
for each row execute function public.prepare_ticket_for_write();

drop trigger if exists tickets_set_updated_at on public.tickets;
create trigger tickets_set_updated_at
before update on public.tickets
for each row execute function public.set_updated_at();

create index if not exists tickets_owner_id_idx on public.tickets (owner_id);
create index if not exists tickets_owner_email_idx on public.tickets (lower(owner_email));
create index if not exists tickets_status_idx on public.tickets (status);
create index if not exists tickets_branch_idx on public.tickets (branch);
create index if not exists tickets_support_category_idx on public.tickets (support_category);
create index if not exists tickets_concern_type_idx on public.tickets (concern_type);
create index if not exists tickets_created_at_idx on public.tickets (created_at desc);
create index if not exists tickets_updated_at_idx on public.tickets (updated_at desc);
create index if not exists tickets_locked_by_idx on public.tickets (locked_by);
create index if not exists tickets_lock_expires_at_idx on public.tickets (lock_expires_at);
create unique index if not exists tickets_ticket_code_unique_idx on public.tickets (ticket_code) where ticket_code is not null;
create unique index if not exists tickets_burnout_branch_number_unique_idx
on public.tickets ((substring(ticket_code from '^[^-]+-[0-9]{5}')))
where support_category = 'Burnout' and ticket_code is not null;

-- =====================================================
-- TICKET RLS
-- =====================================================

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

-- =====================================================
-- TICKET LOCKING RPC
-- =====================================================

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

-- =====================================================
-- TICKET MESSAGES / END-TO-END CONVERSATION
-- =====================================================

create table if not exists public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id text not null references public.tickets(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  sender_name text not null,
  sender_email text,
  sender_role text not null default 'employee',
  message text not null default '',
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.ticket_messages
add column if not exists ticket_id text references public.tickets(id) on delete cascade,
add column if not exists sender_id uuid references public.profiles(id) on delete cascade,
add column if not exists sender_name text,
add column if not exists sender_email text,
add column if not exists sender_role text not null default 'employee',
add column if not exists message text not null default '',
add column if not exists attachments jsonb not null default '[]'::jsonb,
add column if not exists created_at timestamptz not null default now();

update public.ticket_messages
set
  sender_name = coalesce(nullif(sender_name, ''), 'MEMPCO User'),
  sender_role = coalesce(nullif(sender_role, ''), 'employee'),
  message = coalesce(message, ''),
  attachments = coalesce(attachments, '[]'::jsonb),
  created_at = coalesce(created_at, now());

alter table public.ticket_messages
alter column ticket_id set not null,
alter column sender_id set not null,
alter column sender_name set not null,
alter column sender_role set not null,
alter column message set not null,
alter column attachments set default '[]'::jsonb,
alter column attachments set not null,
alter column created_at set not null;

create index if not exists ticket_messages_ticket_id_created_at_idx on public.ticket_messages (ticket_id, created_at);
create index if not exists ticket_messages_sender_id_idx on public.ticket_messages (sender_id);

alter table public.ticket_messages enable row level security;

drop policy if exists "Ticket participants can read ticket messages" on public.ticket_messages;
create policy "Ticket participants can read ticket messages"
on public.ticket_messages for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.tickets t
    where t.id = ticket_messages.ticket_id
      and t.owner_id = auth.uid()
  )
);

drop policy if exists "Ticket participants can create ticket messages" on public.ticket_messages;
create policy "Ticket participants can create ticket messages"
on public.ticket_messages for insert
with check (
  sender_id = auth.uid()
  and (
    public.is_admin()
    or exists (
      select 1
      from public.tickets t
      where t.id = ticket_messages.ticket_id
        and t.owner_id = auth.uid()
    )
  )
);

drop policy if exists "Superadmins can delete ticket messages" on public.ticket_messages;
create policy "Superadmins can delete ticket messages"
on public.ticket_messages for delete
using (public.is_superadmin());

do $$
declare
  fk_name text;
begin
  select conname into fk_name
  from pg_constraint
  where conrelid = 'public.ticket_messages'::regclass
    and contype = 'f'
    and pg_get_constraintdef(oid) ilike '%tickets%';

  if fk_name is not null and fk_name <> 'ticket_messages_ticket_id_fkey' then
    execute format('alter table public.ticket_messages drop constraint %I', fk_name);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.ticket_messages'::regclass
      and conname = 'ticket_messages_ticket_id_fkey'
  ) then
    alter table public.ticket_messages
    add constraint ticket_messages_ticket_id_fkey
    foreign key (ticket_id)
    references public.tickets(id)
    on delete cascade;
  end if;
end $$;

-- =====================================================
-- SUPERADMIN HELP DESK DELETE
-- Deletes ticket + related conversations/notifications with no remaining helpdesk trace.
-- =====================================================

create or replace function public.delete_helpdesk_ticket(target_ticket_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_superadmin() then
    raise exception 'Only the super admin can delete tickets.';
  end if;

  delete from public.ticket_messages
  where ticket_id = target_ticket_id;

  delete from public.user_notifications
  where related_ticket_id = target_ticket_id;

  delete from public.tickets
  where id = target_ticket_id;

  return true;
end;
$$;

-- =====================================================
-- TICKET STATUS EVENTS
-- Append-only status log for reporting and backtracking.
-- =====================================================

create table if not exists public.ticket_status_events (
  id uuid primary key default gen_random_uuid(),
  ticket_id text not null references public.tickets(id) on delete cascade,
  owner_id uuid references public.profiles(id) on delete set null,
  status text not null,
  previous_status text,
  technician text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists ticket_status_events_ticket_created_idx
on public.ticket_status_events (ticket_id, created_at desc);

create index if not exists ticket_status_events_status_created_idx
on public.ticket_status_events (status, created_at desc);

alter table public.ticket_status_events enable row level security;

drop policy if exists "Ticket owners can read own status events" on public.ticket_status_events;
create policy "Ticket owners can read own status events"
on public.ticket_status_events for select
using (auth.uid() = owner_id);

drop policy if exists "Admins can read all ticket status events" on public.ticket_status_events;
create policy "Admins can read all ticket status events"
on public.ticket_status_events for select
using (public.is_admin());

drop policy if exists "System can insert ticket status events" on public.ticket_status_events;
create policy "System can insert ticket status events"
on public.ticket_status_events for insert
with check (
  public.is_admin()
  or exists (
    select 1
    from public.tickets t
    where t.id = ticket_status_events.ticket_id
      and t.owner_id = auth.uid()
  )
);

create or replace function public.record_ticket_status_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' or new.status is distinct from old.status then
    insert into public.ticket_status_events (
      ticket_id,
      owner_id,
      status,
      previous_status,
      technician,
      created_by
    )
    values (
      new.id,
      new.owner_id,
      coalesce(nullif(new.status, ''), 'Created'),
      case when TG_OP = 'UPDATE' then old.status else null end,
      nullif(new.technician, ''),
      auth.uid()
    );
  end if;

  return new;
end;
$$;

drop trigger if exists tickets_record_status_event on public.tickets;
create trigger tickets_record_status_event
after insert or update of status on public.tickets
for each row execute function public.record_ticket_status_event();

-- =====================================================
-- USER NOTIFICATIONS
-- =====================================================

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info',
  related_ticket_id text references public.tickets(id) on delete cascade,
  related_service_id text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.user_notifications
add column if not exists user_id uuid references public.profiles(id) on delete cascade,
add column if not exists title text,
add column if not exists message text,
add column if not exists type text not null default 'info',
add column if not exists related_ticket_id text references public.tickets(id) on delete cascade,
add column if not exists related_service_id text,
add column if not exists is_read boolean not null default false,
add column if not exists created_at timestamptz not null default now();

update public.user_notifications
set
  title = coalesce(nullif(title, ''), 'Notification'),
  message = coalesce(nullif(message, ''), 'You have a new notification.'),
  type = coalesce(nullif(type, ''), 'info'),
  is_read = coalesce(is_read, false),
  created_at = coalesce(created_at, now());

alter table public.user_notifications
alter column user_id set not null,
alter column title set not null,
alter column message set not null,
alter column type set not null,
alter column is_read set not null,
alter column created_at set not null;

create index if not exists user_notifications_user_id_created_at_idx on public.user_notifications (user_id, created_at desc);
create index if not exists user_notifications_related_ticket_id_idx on public.user_notifications (related_ticket_id);
create index if not exists user_notifications_is_read_idx on public.user_notifications (is_read);

alter table public.user_notifications enable row level security;

drop policy if exists "Users can read own notifications" on public.user_notifications;
create policy "Users can read own notifications"
on public.user_notifications for select
using (auth.uid() = user_id);

drop policy if exists "Admins can read all notifications" on public.user_notifications;
create policy "Admins can read all notifications"
on public.user_notifications for select
using (public.is_admin());

drop policy if exists "Users can update own notifications" on public.user_notifications;
create policy "Users can update own notifications"
on public.user_notifications for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Superadmins can delete notifications" on public.user_notifications;
create policy "Superadmins can delete notifications"
on public.user_notifications for delete
using (public.is_superadmin());

create or replace function public.create_ticket_submitted_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_notifications (
    user_id,
    title,
    message,
    type,
    related_ticket_id
  )
  values (
    new.owner_id,
    'Ticket Submitted',
    'Your ticket ' || new.id || ' has been submitted successfully and is now ready for ICT review.',
    'ticket_submitted',
    new.id
  );

  return new;
end;
$$;

drop trigger if exists ticket_submitted_notification on public.tickets;
create trigger ticket_submitted_notification
after insert on public.tickets
for each row execute function public.create_ticket_submitted_notification();

-- =====================================================
-- OTHER SERVICES
-- =====================================================

create sequence if not exists public.other_service_number_seq start 1;

create or replace function public.generate_other_service_id()
returns text
language plpgsql
as $$
declare
  service_year text := to_char(now(), 'YYYY');
  next_number integer;
begin
  select n
  into next_number
  from generate_series(1, 999999) as n
  where not exists (
    select 1
    from public.other_service_requests osr
    where osr.id = 'OS-' || service_year || '-' || lpad(n::text, 4, '0')
  )
  order by n
  limit 1;

  return 'OS-' || service_year || '-' || lpad(coalesce(next_number, nextval('public.other_service_number_seq')::integer)::text, 4, '0');
end;
$$;

create table if not exists public.other_service_requests (
  id text primary key default public.generate_other_service_id(),
  owner_id uuid references public.profiles(id) on delete cascade,
  owner_email text,
  requester text,
  employee_id text,
  branch text,
  department text,
  custodian text,
  device_name text,
  support_category text,
  remarks text not null default '',
  status text not null default 'Submitted',
  admin_remarks text not null default '',
  resolution text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.other_service_requests
add column if not exists owner_id uuid references public.profiles(id) on delete cascade,
add column if not exists owner_email text,
add column if not exists requester text,
add column if not exists employee_id text,
add column if not exists branch text,
add column if not exists department text,
add column if not exists custodian text,
add column if not exists device_name text,
add column if not exists support_category text,
add column if not exists remarks text not null default '',
add column if not exists status text not null default 'Submitted',
add column if not exists admin_remarks text not null default '',
add column if not exists resolution text not null default '',
add column if not exists created_at timestamptz not null default now(),
add column if not exists updated_at timestamptz not null default now();

update public.other_service_requests osr
set owner_id = p.id
from public.profiles p
where osr.owner_id is null
  and osr.owner_email is not null
  and lower(p.email) = lower(osr.owner_email);

update public.other_service_requests
set
  owner_email = coalesce(nullif(owner_email, ''), 'missing-owner-' || id || '@mempco.local'),
  requester = coalesce(nullif(requester, ''), owner_email, 'Employee'),
  branch = coalesce(nullif(branch, ''), 'Unspecified'),
  department = coalesce(nullif(department, ''), 'Unspecified'),
  custodian = coalesce(nullif(custodian, ''), 'Unspecified'),
  device_name = coalesce(nullif(device_name, ''), 'Unspecified'),
  support_category = coalesce(nullif(support_category, ''), 'Other Company Service'),
  remarks = coalesce(remarks, ''),
  status = coalesce(nullif(status, ''), 'Submitted'),
  admin_remarks = coalesce(admin_remarks, ''),
  resolution = coalesce(resolution, ''),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

create or replace function public.prepare_other_service_for_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  active_profile public.profiles;
begin
  if TG_OP = 'INSERT' then
    if new.owner_id is null then
      new.owner_id := auth.uid();
    end if;

    select *
    into active_profile
    from public.profiles
    where id = new.owner_id;

    if active_profile.id is null then
      raise exception 'Other Service request cannot be submitted because the current user profile was not found.';
    end if;

    new.owner_email := coalesce(nullif(new.owner_email, ''), active_profile.email);
    new.requester := coalesce(nullif(new.requester, ''), active_profile.full_name, active_profile.email, 'Employee');
    new.employee_id := coalesce(nullif(new.employee_id, ''), active_profile.employee_id);
    new.branch := coalesce(nullif(new.branch, ''), active_profile.branch, active_profile.office, 'Unspecified');
    new.department := coalesce(nullif(new.department, ''), active_profile.department, 'Unspecified');
    new.created_at := coalesce(new.created_at, now());
  end if;

  new.custodian := coalesce(nullif(new.custodian, ''), 'Unspecified');
  new.device_name := coalesce(nullif(new.device_name, ''), 'Unspecified');
  new.support_category := coalesce(nullif(new.support_category, ''), 'Other Company Service');
  new.remarks := coalesce(new.remarks, '');
  new.status := coalesce(nullif(new.status, ''), 'Submitted');
  new.admin_remarks := coalesce(new.admin_remarks, '');
  new.resolution := coalesce(new.resolution, '');
  new.updated_at := now();

  return new;
end;
$$;

drop trigger if exists other_service_requests_prepare_for_write on public.other_service_requests;
create trigger other_service_requests_prepare_for_write
before insert or update on public.other_service_requests
for each row execute function public.prepare_other_service_for_write();

drop trigger if exists other_service_requests_set_updated_at on public.other_service_requests;
create trigger other_service_requests_set_updated_at
before update on public.other_service_requests
for each row execute function public.set_updated_at();

do $$
begin
  if not exists (select 1 from public.other_service_requests where owner_id is null) then
    alter table public.other_service_requests alter column owner_id set not null;
  else
    raise notice 'Some existing Other Services rows have no owner_id. owner_id was not forced to NOT NULL.';
  end if;
end $$;

alter table public.other_service_requests
alter column owner_email set not null,
alter column requester set not null,
alter column branch set not null,
alter column department set not null,
alter column custodian set not null,
alter column device_name set not null,
alter column support_category set not null,
alter column remarks set not null,
alter column status set not null,
alter column admin_remarks set not null,
alter column resolution set not null,
alter column created_at set not null,
alter column updated_at set not null;

create index if not exists other_service_requests_owner_id_idx on public.other_service_requests (owner_id);
create index if not exists other_service_requests_status_idx on public.other_service_requests (status);
create index if not exists other_service_requests_support_category_idx on public.other_service_requests (support_category);
create index if not exists other_service_requests_created_at_idx on public.other_service_requests (created_at desc);

alter table public.other_service_requests enable row level security;

drop policy if exists "Employees can read own other service requests" on public.other_service_requests;
create policy "Employees can read own other service requests"
on public.other_service_requests for select
using (auth.uid() = owner_id);

drop policy if exists "Admins can read all other service requests" on public.other_service_requests;
create policy "Admins can read all other service requests"
on public.other_service_requests for select
using (public.is_admin());

drop policy if exists "Employees can create own other service requests" on public.other_service_requests;
create policy "Employees can create own other service requests"
on public.other_service_requests for insert
with check (auth.uid() = owner_id);

drop policy if exists "Employees can update own other service requests" on public.other_service_requests;
create policy "Employees can update own other service requests"
on public.other_service_requests for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "Admins can update other service requests" on public.other_service_requests;
create policy "Admins can update other service requests"
on public.other_service_requests for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Superadmins can delete other service requests" on public.other_service_requests;
create policy "Superadmins can delete other service requests"
on public.other_service_requests for delete
using (public.is_superadmin());

create or replace function public.create_other_service_submitted_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_notifications (
    user_id,
    title,
    message,
    type,
    related_service_id
  )
  values (
    new.owner_id,
    'Other Service Submitted',
    'Your Other Service request ' || new.id || ' has been submitted successfully.',
    'other_service_submitted',
    new.id
  );

  return new;
end;
$$;

drop trigger if exists other_service_submitted_notification on public.other_service_requests;
create trigger other_service_submitted_notification
after insert on public.other_service_requests
for each row execute function public.create_other_service_submitted_notification();

-- =====================================================
-- MARKETING POSTS
-- =====================================================

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

create unique index if not exists marketing_posts_slug_lower_idx on public.marketing_posts (lower(slug));
create index if not exists marketing_posts_status_published_idx on public.marketing_posts (status, published_at desc);
create index if not exists marketing_posts_category_idx on public.marketing_posts (category);
create index if not exists marketing_posts_placement_order_idx on public.marketing_posts (placement, display_order, published_at desc);

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

-- =====================================================
-- JOB OPENINGS
-- =====================================================

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
add column if not exists department text not null default 'Unspecified',
add column if not exists location text not null default 'Unspecified',
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

create unique index if not exists job_openings_slug_lower_idx on public.job_openings (lower(slug));
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

-- =====================================================
-- JOB APPLICATIONS
-- =====================================================

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
  status_history jsonb not null default '[]'::jsonb,
  interview_at timestamptz,
  interview_type text not null default '',
  interviewer text not null default '',
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
add column if not exists status_history jsonb not null default '[]'::jsonb,
add column if not exists interview_at timestamptz,
add column if not exists interview_type text not null default '',
add column if not exists interviewer text not null default '',
add column if not exists created_at timestamptz not null default now(),
add column if not exists updated_at timestamptz not null default now();

update public.job_applications
set
  job_title = coalesce(nullif(job_title, ''), 'General Application'),
  applicant_name = coalesce(nullif(applicant_name, ''), 'Applicant'),
  email = coalesce(nullif(email, ''), 'missing-applicant-' || id::text || '@mempco.local'),
  status = coalesce(nullif(status, ''), 'new'),
  hr_notes = coalesce(hr_notes, ''),
  status_history = coalesce(status_history, '[]'::jsonb),
  interview_type = coalesce(interview_type, ''),
  interviewer = coalesce(interviewer, ''),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

alter table public.job_applications
alter column job_title set not null,
alter column applicant_name set not null,
alter column email set not null,
alter column status set not null,
alter column hr_notes set not null,
alter column status_history set default '[]'::jsonb,
alter column status_history set not null,
alter column interview_type set default '',
alter column interview_type set not null,
alter column interviewer set default '',
alter column interviewer set not null,
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
drop policy if exists "Super admins can delete job applications" on public.job_applications;
create policy "Super admins can delete job applications"
on public.job_applications for delete
using (public.is_superadmin());

-- =====================================================
-- PORTAL FILE STORAGE
-- =====================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-photos',
  'profile-photos',
  true,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ticket-attachments',
  'ticket-attachments',
  true,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read profile photos" on storage.objects;
create policy "Public can read profile photos"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'profile-photos');

drop policy if exists "Users can upload own profile photos" on storage.objects;
create policy "Users can upload own profile photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'profile-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can update own profile photos" on storage.objects;
create policy "Users can update own profile photos"
on storage.objects for update
to authenticated
using (
  bucket_id = 'profile-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'profile-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can delete own profile photos" on storage.objects;
create policy "Users can delete own profile photos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'profile-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Public can read ticket attachments" on storage.objects;
create policy "Public can read ticket attachments"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'ticket-attachments');

drop policy if exists "Users can upload own ticket attachments" on storage.objects;
create policy "Users can upload own ticket attachments"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'ticket-attachments'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- =====================================================
-- JOB APPLICATION RESUME STORAGE
-- =====================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'job-resumes',
  'job-resumes',
  true,
  10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can upload job resumes" on storage.objects;
create policy "Public can upload job resumes"
on storage.objects for insert
to anon, authenticated
with check (bucket_id = 'job-resumes');

drop policy if exists "Public can read job resumes" on storage.objects;
create policy "Public can read job resumes"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'job-resumes');

drop policy if exists "Super admins can delete job resumes" on storage.objects;
create policy "Super admins can delete job resumes"
on storage.objects for delete
to authenticated
using (bucket_id = 'job-resumes' and public.is_superadmin());

-- =====================================================
-- GRANTS
-- =====================================================

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert on public.user_account_audit_logs to authenticated;
grant select, insert, update, delete on public.tickets to authenticated;
grant select, insert, update, delete on public.ticket_messages to authenticated;
grant select, insert on public.ticket_status_events to authenticated;
grant select, insert, update, delete on public.user_notifications to authenticated;
grant select, insert, update, delete on public.other_service_requests to authenticated;
grant select, insert, update, delete on public.marketing_posts to authenticated;
grant select on public.marketing_posts to anon;
grant select, insert, update, delete on public.job_openings to authenticated;
grant select on public.job_openings to anon;
grant select, insert, update, delete on public.job_applications to authenticated;
grant insert on public.job_applications to anon;

grant execute on function public.claim_ticket_lock(text, uuid, text) to authenticated;
grant execute on function public.release_ticket_lock(text, uuid) to authenticated;
grant execute on function public.delete_helpdesk_ticket(text) to authenticated;
grant execute on function public.update_own_profile_photo(text) to authenticated;
grant execute on function public.generate_ticket_id() to authenticated;
grant execute on function public.generate_other_service_id() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_superadmin() to authenticated;
grant execute on function public.is_marketing_admin() to authenticated;
grant execute on function public.is_hr_admin() to authenticated;
grant execute on function public.has_portal_role(text[]) to authenticated;

grant usage, select on sequence public.ticket_number_seq to authenticated;
grant usage, select on sequence public.other_service_number_seq to authenticated;

-- =====================================================
-- REALTIME SUPPORT
-- =====================================================

alter table public.tickets replica identity full;
alter table public.ticket_messages replica identity full;
alter table public.user_notifications replica identity full;
alter table public.other_service_requests replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.tickets;
  end if;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.ticket_messages;
  end if;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.user_notifications;
  end if;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.other_service_requests;
  end if;
exception
  when duplicate_object then null;
end $$;

-- =====================================================
-- IMPORTANT: MAKE YOUR OWN ACCOUNT SUPERADMIN
-- Replace the email before running this manually if needed:
-- update public.profiles set role = 'superadmin', status = 'Active' where lower(email) = lower('your-email@example.com');
-- =====================================================

select 'MEMPCO full updated schema completed successfully.' as result;
