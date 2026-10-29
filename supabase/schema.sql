-- =====================================================
-- MEMPCO WEBSITE SUPABASE SCHEMA - FULL UPDATED
-- Run this consolidated schema in Supabase SQL Editor for new deployments. The standalone ICT hardening migration remains for existing deployments.
-- Existing deployments that already applied ICT hardening should also run supabase/ticket_handling_activity_details_migration.sql.
-- Existing deployments should also run supabase/ticket_message_idempotency_migration.sql to install the current message RPC.
-- Existing deployments should run supabase/ticket_escalation_partner_company_migration.sql for third-party escalation company names.
-- Existing deployments should run supabase/ticket_saar_teller_expiry_migration.sql for current teller SAAR rules.
-- Existing deployments that cleared all tickets should run supabase/ticket_number_reset_after_clear_migration.sql to restart ticket numbering.
-- Existing deployments should run supabase/ticket_number_gap_reuse_migration.sql to reuse deleted ticket numbers automatically.
-- Existing deployments should run supabase/ticket_escalation_partner_resolution_migration.sql for third-party resolved-by attribution.
-- Existing deployments should run supabase/ticket_sla_deadline_policy_migration.sql to synchronize priority and repair SLA deadlines.
-- Existing deployments should run supabase/ticket_sla_due_day_notification_migration.sql after ICT hardening for response and resolution deadline-day alerts.
-- Ticket IDs are renumbered only when supabase/ticket_id_renumber_current_year_migration.sql is run manually.
-- Then run supabase/ict_employee_notifications_migration.sql for employee notification delivery.
-- Separate MRDSS migration files are for existing deployments only.
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
-- 11. Helpdesk ticket hardening with serialized reuse of available ticket numbers
-- 12. MRDSS member concerns and 24-hour first-response tracking
-- 13. Branch-manager case routing and return to MRDSS final tagging
-- 14. Distinct unable-to-contact closure after documented follow-up
-- 15. Stable ICT technician profile identity
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
alter type public.user_role add value if not exists 'mrdss_admin';
alter type public.user_role add value if not exists 'branch_manager_admin';

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
-- PORTAL SESSION CONTROL
-- One active portal session per account. Activity extends the session for 15 minutes.
-- =====================================================

create table if not exists public.portal_session_state (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  session_id uuid not null,
  last_activity_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.portal_session_state
add column if not exists user_id uuid references public.profiles(id) on delete cascade,
add column if not exists session_id uuid,
add column if not exists last_activity_at timestamptz not null default now(),
add column if not exists expires_at timestamptz not null default (now() + interval '15 minutes'),
add column if not exists created_at timestamptz not null default now(),
add column if not exists updated_at timestamptz not null default now();

create index if not exists portal_session_state_expires_at_idx
on public.portal_session_state (expires_at);

alter table public.portal_session_state enable row level security;

revoke all on table public.portal_session_state from anon, authenticated;

create or replace function public.current_portal_session_id()
returns uuid
language sql
stable
set search_path = public
as $$
  select nullif(auth.jwt() ->> 'session_id', '')::uuid;
$$;

create or replace function public.is_current_auth_session()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from auth.sessions s
    where s.id = public.current_portal_session_id()
      and s.user_id = auth.uid()
  );
$$;

create or replace function public.has_valid_portal_session()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.portal_session_state s
    where s.user_id = auth.uid()
      and s.session_id = public.current_portal_session_id()
      and s.expires_at > now()
  )
  and public.is_current_auth_session();
$$;

create or replace function public.claim_portal_session()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  active_session_id uuid := public.current_portal_session_id();
begin
  if auth.uid() is null then
    raise exception 'Login required.';
  end if;

  if active_session_id is null or not public.is_current_auth_session() then
    raise exception 'The current login session could not be verified. Please sign in again.';
  end if;

  if not exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'Login succeeded, but no portal profile was found for this account.';
  end if;

  insert into public.portal_session_state (
    user_id,
    session_id,
    last_activity_at,
    expires_at,
    updated_at
  )
  values (
    auth.uid(),
    active_session_id,
    now(),
    now() + interval '15 minutes',
    now()
  )
  on conflict (user_id) do update set
    session_id = excluded.session_id,
    last_activity_at = excluded.last_activity_at,
    expires_at = excluded.expires_at,
    updated_at = excluded.updated_at;

  return true;
end;
$$;

create or replace function public.touch_portal_session()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  active_session_id uuid := public.current_portal_session_id();
  session_is_active boolean := false;
begin
  if auth.uid() is null or active_session_id is null or not public.is_current_auth_session() then
    return false;
  end if;

  update public.portal_session_state
  set
    last_activity_at = now(),
    expires_at = now() + interval '15 minutes',
    updated_at = now()
  where user_id = auth.uid()
    and session_id = active_session_id
    and expires_at > now()
  returning true into session_is_active;

  return coalesce(session_is_active, false);
end;
$$;

create or replace function public.is_portal_session_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_valid_portal_session();
$$;

create or replace function public.end_portal_session()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  active_session_id uuid := public.current_portal_session_id();
begin
  if auth.uid() is null or active_session_id is null then
    return false;
  end if;

  delete from public.portal_session_state
  where user_id = auth.uid()
    and session_id = active_session_id;

  return found;
end;
$$;

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
      and public.has_valid_portal_session()
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
      and public.has_valid_portal_session()
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
      and public.has_valid_portal_session()
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

create or replace function public.is_mrdss_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_portal_role(array['mrdss_admin']);
$$;

create or replace function public.is_branch_manager_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role::text = 'branch_manager_admin'
      and coalesce(p.status, 'Active') = 'Active'
      and nullif(trim(p.branch), '') is not null
      and public.has_valid_portal_session()
  );
$$;

create or replace function public.is_assigned_branch_manager(target_branch text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_branch_manager_admin()
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and lower(trim(p.branch)) = lower(trim(coalesce(target_branch, '')))
    );
$$;

create or replace function public.get_mrdss_assignable_staff()
returns table (staff_id uuid, staff_name text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, coalesce(nullif(trim(p.full_name), ''), p.email)
  from public.profiles p
  where public.is_mrdss_admin()
    and p.role::text in ('mrdss_admin', 'superadmin')
    and coalesce(p.status, 'Active') = 'Active'
  order by p.full_name, p.email;
$$;

revoke all on function public.is_mrdss_admin() from public, anon;
grant execute on function public.is_mrdss_admin() to authenticated;
revoke all on function public.get_mrdss_assignable_staff() from public, anon;
grant execute on function public.get_mrdss_assignable_staff() to authenticated;

create or replace function public.get_mrdss_branch_managers()
returns table (branch_name text, manager_id uuid, manager_name text)
language sql
stable
security definer
set search_path = public
as $$
  select distinct on (lower(trim(p.branch)))
    trim(p.branch),
    p.id,
    coalesce(nullif(trim(p.full_name), ''), p.email)
  from public.profiles p
  where public.is_mrdss_admin()
    and p.role::text = 'branch_manager_admin'
    and coalesce(p.status, 'Active') = 'Active'
    and nullif(trim(p.branch), '') is not null
  order by lower(trim(p.branch)), p.full_name, p.email;
$$;

revoke all on function public.is_branch_manager_admin() from public, anon;
grant execute on function public.is_branch_manager_admin() to authenticated;
revoke all on function public.is_assigned_branch_manager(text) from public, anon;
grant execute on function public.is_assigned_branch_manager(text) to authenticated;
revoke all on function public.get_mrdss_branch_managers() from public, anon;
grant execute on function public.get_mrdss_branch_managers() to authenticated;
-- =====================================================
-- MEMBER CONCERNS
-- Public can submit; MRDSS admins manage the full queue and branch managers manage cases routed to their branch.
-- =====================================================

create table if not exists public.member_concerns (
  id text primary key check (id ~ '^MCC-[0-9]{4}-[A-F0-9]{6}$'),
  member_name text not null constraint member_concerns_member_name_length_check check (length(trim(member_name)) between 0 and 120),
  branch text not null check (length(trim(branch)) between 1 and 120),
  phone text not null default '' check (length(phone) <= 40),
  email text not null default '' check (length(email) <= 254),
  preferred_contact text not null check (preferred_contact in ('Text', 'Call', 'Email')),
  concern_type text not null check (concern_type in ('Complain', 'Inquiries', 'Request', 'Feedback', 'Others', 'Concern', 'Question', 'Compliment')),
  category text not null check (category in ('Loans', 'Savings & Deposits', 'Member Services', 'Branch Service', 'Other')),
  submission_route text not null default 'mrdss' check (submission_route in ('mrdss', 'branch')),
  message text not null check (length(trim(message)) between 12 and 3000),
  attachment jsonb,
  status text not null default 'New' check (status in ('New', 'In Review', 'Waiting for Member', 'Resolved', 'Closed')),
  workflow_stage text not null default 'mrdss_review' check (workflow_stage in ('mrdss_review', 'branch_review', 'area_manager_review', 'coo_review', 'final_tagging', 'closed')),
  routed_to text not null default '',
  resolution_tag text not null default '',
  resolution_details text not null default '',
  closure_outcome text,
  -- Legacy compatibility fields; the active target is always 24 hours from submission.
  sla_hours integer not null default 24 check (sla_hours = 24),
  sla_due_at timestamptz not null default (now() + interval '24 hours'),
  closed_at timestamptz,
  priority text not null default 'Normal' check (priority in ('Low', 'Normal', 'High', 'Urgent')),
  assigned_staff_id uuid references public.profiles(id) on delete set null,
  activities jsonb not null default '[]'::jsonb check (jsonb_typeof(activities) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.member_concerns
add column if not exists submission_route text not null default 'mrdss',
add column if not exists workflow_stage text not null default 'mrdss_review',
add column if not exists routed_to text not null default '',
add column if not exists resolution_tag text not null default '',
add column if not exists resolution_details text not null default '',
add column if not exists sla_hours integer not null default 24,
add column if not exists sla_due_at timestamptz,
add column if not exists closed_at timestamptz;

-- Retain legacy message types for existing cases and previously loaded forms.
alter table public.member_concerns
drop constraint if exists member_concerns_concern_type_check,
add constraint member_concerns_concern_type_check
check (concern_type in ('Complain', 'Inquiries', 'Request', 'Feedback', 'Others', 'Concern', 'Question', 'Compliment'));

alter table public.member_concerns
drop constraint if exists member_concerns_member_name_check;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.member_concerns'::regclass
      and conname = 'member_concerns_member_name_length_check'
  ) then
    alter table public.member_concerns
    add constraint member_concerns_member_name_length_check
    check (length(trim(member_name)) between 0 and 120);
  end if;
end $$;

update public.member_concerns
set
  submission_route = case when submission_route = 'branch' then 'branch' else 'mrdss' end,
  workflow_stage = case
    when status = 'Closed' then 'closed'
    when status = 'Resolved' then 'final_tagging'
    when submission_route = 'branch' then 'branch_review'
    when workflow_stage in ('mrdss_review', 'branch_review', 'area_manager_review', 'coo_review', 'final_tagging', 'closed') then workflow_stage
    else 'mrdss_review'
  end,
  routed_to = coalesce(routed_to, ''),
  resolution_tag = coalesce(resolution_tag, ''),
  resolution_details = coalesce(resolution_details, ''),
  sla_hours = 24,
  sla_due_at = created_at + interval '24 hours',
  closed_at = case when status = 'Closed' then coalesce(closed_at, updated_at, created_at, now()) else closed_at end;

alter table public.member_concerns
alter column submission_route set not null,
alter column workflow_stage set not null,
alter column routed_to set default '',
alter column routed_to set not null,
alter column resolution_tag set default '',
alter column resolution_tag set not null,
alter column resolution_details set default '',
alter column resolution_details set not null,
alter column sla_hours set default 24,
alter column sla_hours set not null,
alter column sla_due_at set default (now() + interval '24 hours'),
alter column sla_due_at set not null;

alter table public.member_concerns
drop constraint if exists member_concerns_sla_hours_check;

alter table public.member_concerns
add constraint member_concerns_sla_hours_check check (sla_hours = 24);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.member_concerns'::regclass
      and conname = 'member_concerns_submission_route_check'
  ) then
    alter table public.member_concerns
    add constraint member_concerns_submission_route_check
    check (submission_route in ('mrdss', 'branch'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.member_concerns'::regclass
      and conname = 'member_concerns_workflow_stage_check'
  ) then
    alter table public.member_concerns
    add constraint member_concerns_workflow_stage_check
    check (workflow_stage in ('mrdss_review', 'branch_review', 'area_manager_review', 'coo_review', 'final_tagging', 'closed'));
  end if;

end $$;

create index if not exists member_concerns_created_at_idx
on public.member_concerns (created_at desc);
create index if not exists member_concerns_status_created_at_idx
on public.member_concerns (status, created_at desc);
create index if not exists member_concerns_assigned_staff_idx
on public.member_concerns (assigned_staff_id);
create index if not exists member_concerns_stage_created_idx
on public.member_concerns (workflow_stage, created_at desc);
create index if not exists member_concerns_sla_due_at_idx
on public.member_concerns (sla_due_at) where workflow_stage <> 'closed';

alter table public.member_concerns enable row level security;

drop policy if exists "Public can submit member concerns" on public.member_concerns;
create policy "Public can submit member concerns"
on public.member_concerns for insert
to anon, authenticated
with check (true);

drop policy if exists "MRDSS admins can read member concerns" on public.member_concerns;
create policy "MRDSS admins can read member concerns"
on public.member_concerns for select
to authenticated
using (public.is_mrdss_admin());

drop policy if exists "Branch managers can read routed branch cases" on public.member_concerns;
create policy "Branch managers can read routed branch cases"
on public.member_concerns for select
to authenticated
using (
  workflow_stage = 'branch_review'
  and public.is_assigned_branch_manager(routed_to)
);

drop policy if exists "MRDSS admins can update member concerns" on public.member_concerns;
create policy "MRDSS admins can update member concerns"
on public.member_concerns for update
to authenticated
using (public.is_mrdss_admin())
with check (public.is_mrdss_admin());

drop policy if exists "Branch managers can work routed branch cases" on public.member_concerns;
create policy "Branch managers can work routed branch cases"
on public.member_concerns for update
to authenticated
using (
  workflow_stage = 'branch_review'
  and public.is_assigned_branch_manager(routed_to)
)
with check (
  workflow_stage in ('branch_review', 'final_tagging')
  and public.is_assigned_branch_manager(routed_to)
);

drop policy if exists "Superadmins can delete member concerns" on public.member_concerns;
create policy "Superadmins can delete member concerns"
on public.member_concerns for delete
to authenticated
using (public.is_superadmin());

revoke all on public.member_concerns from public, anon, authenticated;
revoke update (sla_hours) on public.member_concerns from public, anon, authenticated;
grant insert (id, member_name, branch, phone, email, preferred_contact, concern_type, category, submission_route, message, attachment)
on public.member_concerns to anon, authenticated;
grant select on public.member_concerns to authenticated;
grant update (status, workflow_stage, routed_to, resolution_tag, resolution_details, priority, assigned_staff_id, activities)
on public.member_concerns to authenticated;
grant delete on public.member_concerns to authenticated;

create or replace function public.prepare_member_concern_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.submission_route := case when new.submission_route = 'branch' then 'branch' else 'mrdss' end;
  new.workflow_stage := case when new.submission_route = 'branch' then 'branch_review' else 'mrdss_review' end;
  new.routed_to := case when new.submission_route = 'branch' then coalesce(nullif(trim(new.branch), ''), 'Branch') else 'MRDSS' end;
  new.sla_hours := 24;
  new.sla_due_at := coalesce(new.created_at, now()) + interval '24 hours';
  new.closed_at := null;
  new.activities := jsonb_build_array(jsonb_build_object(
    'id', new.id || '-submitted',
    'type', 'Submitted',
    'detail', case
      when new.submission_route = 'branch' then 'Concern submitted directly to ' || coalesce(nullif(trim(new.branch), ''), 'the branch') || '.'
      else 'Concern submitted to MRDSS through the website.'
    end,
    'at', coalesce(new.created_at, now())
  ));
  return new;
end;
$$;

drop trigger if exists member_concerns_prepare_insert on public.member_concerns;
create trigger member_concerns_prepare_insert
before insert on public.member_concerns
for each row execute function public.prepare_member_concern_insert();

create or replace function public.validate_member_concern_workflow()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  stage_changed boolean := false;
  actor_role text;
begin
  if TG_OP = 'INSERT' then
    new.workflow_stage := case when new.submission_route = 'branch' then 'branch_review' else 'mrdss_review' end;
    new.status := 'New';
    new.sla_hours := 24;
    new.sla_due_at := coalesce(new.created_at, now()) + interval '24 hours';
    new.closed_at := null;
    return new;
  end if;

  select p.role::text
  into actor_role
  from public.profiles p
  where p.id = auth.uid();

  if actor_role = 'branch_manager_admin' then
    if old.workflow_stage <> 'branch_review'
      or not public.is_assigned_branch_manager(old.routed_to) then
      raise exception 'Branch managers can only work cases routed to their own branch.';
    end if;

    if new.workflow_stage not in ('branch_review', 'final_tagging')
      or new.routed_to is distinct from old.routed_to
      or new.assigned_staff_id is distinct from old.assigned_staff_id
      or new.resolution_tag is distinct from old.resolution_tag
      or new.submission_route is distinct from old.submission_route
      or new.branch is distinct from old.branch then
      raise exception 'Branch managers can only update their branch review and send a resolved case back to MRDSS.';
    end if;

    if new.workflow_stage = 'final_tagging'
      and (
        new.status <> 'Resolved'
        or new.resolution_details is not distinct from old.resolution_details
        or nullif(trim(new.resolution_details), '') is null
      ) then
      raise exception 'Record the branch resolution before returning this case to MRDSS.';
    end if;
  end if;

  stage_changed := new.workflow_stage is distinct from old.workflow_stage;
  new.sla_hours := 24;
  new.sla_due_at := coalesce(new.created_at, now()) + interval '24 hours';

  if old.workflow_stage = 'closed' and stage_changed then
    raise exception 'Closed cases cannot be reopened through the workflow.';
  end if;

  if stage_changed and not (
    (old.workflow_stage = 'mrdss_review' and new.workflow_stage in ('branch_review', 'coo_review', 'final_tagging'))
    or (old.workflow_stage = 'branch_review' and new.workflow_stage in ('area_manager_review', 'coo_review', 'final_tagging'))
    or (old.workflow_stage = 'area_manager_review' and new.workflow_stage in ('coo_review', 'final_tagging'))
    or (old.workflow_stage = 'coo_review' and new.workflow_stage = 'final_tagging')
    or (old.workflow_stage = 'final_tagging' and new.workflow_stage = 'closed')
  ) then
    raise exception 'This case cannot move from % to %.', old.workflow_stage, new.workflow_stage;
  end if;

  if stage_changed and new.workflow_stage = 'final_tagging' and (
    new.status <> 'Resolved'
    or nullif(trim(new.resolution_details), '') is null
  ) then
    raise exception 'Record the resolution details before sending this case to final tagging.';
  end if;

  if new.workflow_stage = 'closed' then
    if new.status <> 'Closed' then
      raise exception 'A case must be closed when final tagging is complete.';
    end if;
    if stage_changed and (nullif(trim(new.resolution_tag), '') is null or nullif(trim(new.resolution_details), '') is null) then
      raise exception 'A final tag and resolution details are required before closing this case.';
    end if;
    new.closed_at := coalesce(new.closed_at, now());
  elsif new.status = 'Closed' then
    raise exception 'Complete MRDSS final tagging before closing this case.';
  elsif new.status = 'Resolved' and new.workflow_stage <> 'final_tagging' then
    raise exception 'Resolved cases must be in the final tagging stage.';
  elsif new.workflow_stage = 'final_tagging' and new.status <> 'Resolved' then
    raise exception 'Cases awaiting final tagging must have Resolved status.';
  end if;

  if stage_changed and new.workflow_stage in ('branch_review', 'area_manager_review', 'coo_review') then
    new.status := 'In Review';
  elsif stage_changed and new.workflow_stage = 'final_tagging' then
    new.status := 'Resolved';
  end if;

  return new;
end;
$$;

drop trigger if exists member_concerns_validate_workflow on public.member_concerns;
create trigger member_concerns_validate_workflow
before insert or update on public.member_concerns
for each row execute function public.validate_member_concern_workflow();

drop trigger if exists member_concerns_set_updated_at on public.member_concerns;
create trigger member_concerns_set_updated_at
before update on public.member_concerns
for each row execute function public.set_updated_at();

create or replace function public.validate_member_concern_assignee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assigned_staff_id is not null and not exists (
    select 1
    from public.profiles p
    where p.id = new.assigned_staff_id
      and p.role::text in ('mrdss_admin', 'superadmin')
      and coalesce(p.status, 'Active') = 'Active'
  ) then
    raise exception 'Cases can only be assigned to active MRDSS admins or superadmins.';
  end if;
  return new;
end;
$$;

drop trigger if exists member_concerns_validate_assignee on public.member_concerns;
create trigger member_concerns_validate_assignee
before insert or update of assigned_staff_id on public.member_concerns
for each row execute function public.validate_member_concern_assignee();

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
using (auth.uid() = id and public.has_valid_portal_session());

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

  if not public.has_valid_portal_session() then
    raise exception 'Your portal session is no longer active. Please sign in again.';
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
volatile
security definer
set search_path = public
as $$
declare
  ticket_year text := to_char(now(), 'YYYY');
  next_number numeric;
  number_text text;
begin
  -- Serialize allocations until the inserting transaction commits or rolls back.
  -- The following query then sees committed tickets from the preceding caller
  -- under the API's default READ COMMITTED isolation level.
  perform pg_advisory_xact_lock(hashtext('public.generate_ticket_id'), ticket_year::integer);

  -- The first gap is either 1 or the number immediately after an existing ID.
  -- Avoid generating a fixed-size range and preserve IDs beyond four digits.
  with used_numbers as materialized (
    select distinct substring(t.id from '[0-9]+$')::numeric as number
    from public.tickets t
    where t.id ~ ('^TCK-' || ticket_year || '-[0-9]+$')
  ), candidates as (
    select 1::numeric as number
    union all
    select number + 1 from used_numbers
  )
  select min(c.number) into next_number
  from candidates c
  where not exists (select 1 from used_numbers u where u.number = c.number);

  number_text := next_number::text;
  return 'TCK-' || ticket_year || '-' || lpad(number_text, greatest(4, length(number_text)), '0');
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
  technician_id uuid references public.profiles(id) on delete set null,
  action_taken text not null default '',
  admin_remarks text not null default '',
  resolution text not null default '',
  recommendation text not null default '',
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
add column if not exists technician_id uuid references public.profiles(id) on delete set null,
add column if not exists action_taken text not null default '',
add column if not exists admin_remarks text not null default '',
add column if not exists resolution text not null default '',
add column if not exists recommendation text not null default '',
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

do $$
begin
  if exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.tickets'::regclass
      and tgname = 'tickets_prepare_for_write'
      and not tgisinternal
  ) then
    execute 'alter table public.tickets disable trigger tickets_prepare_for_write';
  end if;
end $$;

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
  support_category = coalesce(nullif(support_category, ''), 'Legacy ICT Request'),
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
  recommendation = coalesce(recommendation, ''),
  saar_required = coalesce(saar_required, false),
  photo_attachments = coalesce(photo_attachments, '[]'::jsonb),
  burnout_report = coalesce(burnout_report, '{}'::jsonb),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

do $$
begin
  if exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.tickets'::regclass
      and tgname = 'tickets_prepare_for_write'
      and not tgisinternal
      and tgenabled = 'D'
  ) then
    execute 'alter table public.tickets enable trigger tickets_prepare_for_write';
  end if;
end $$;

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
alter column recommendation set not null,
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
  actor_profile public.profiles;
  owner_profile public.profiles;
  category_changed boolean := false;
  ticket_context text := '';
  saar_required_for_request boolean := false;
  saar_context_changed boolean := false;
begin
  if TG_OP = 'INSERT' then
    saar_context_changed := true;
  else
    saar_context_changed :=
      new.support_category is distinct from old.support_category
      or new.concern_type is distinct from old.concern_type
      or new.device_name is distinct from old.device_name
      or new.description is distinct from old.description;
  end if;

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
    new.branch := nullif(trim(coalesce(new.branch, '')), '');
    new.department := nullif(trim(coalesce(new.department, '')), '');

    if new.branch is null then
      raise exception 'Branch / Location is required. Select where the concern happened.';
    end if;

    if new.department is null then
      raise exception 'Department is required. Select the department affected by the concern.';
    end if;

    new.created_at := coalesce(new.created_at, now());
  end if;

  new.support_category := nullif(trim(coalesce(new.support_category, '')), '');

  if new.support_category is null then
    raise exception 'Support category is required.';
  end if;

  if TG_OP = 'INSERT' then
    category_changed := true;
  else
    category_changed := new.support_category is distinct from old.support_category;
  end if;

  if category_changed then
    select *
    into owner_profile
    from public.profiles
    where id = new.owner_id;

    if lower(new.support_category) = 'burnout'
      and (
        owner_profile.id is null
        or regexp_replace(lower(coalesce(owner_profile.department, '')), '[^a-z0-9]+', '', 'g') <> 'admin'
      ) then
      raise exception 'Burnout requests can only be submitted by accounts registered under the Admin department.';
    end if;

    if auth.uid() is not null then
      select *
      into actor_profile
      from public.profiles
      where id = auth.uid();

      if lower(new.support_category) = 'other ict request'
        and coalesce(actor_profile.role::text, 'employee') not in ('admin', 'superadmin') then
        raise exception 'Other ICT Request is no longer available for employee accounts.';
      end if;
    end if;
  end if;

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
  new.recommendation := coalesce(new.recommendation, '');
  ticket_context := lower(concat_ws(
    ' ',
    new.support_category,
    new.concern_type,
    new.device_name,
    new.description
  ));
  saar_required_for_request :=
    ticket_context ~ '(mbwin|mb[[:space:]]+win|sky360|mbwim|mb[[:space:]]+wim)'
    and (
      ticket_context ~ '(^|[[:space:]])new user( account)? request([[:space:]]|$)'
      or ticket_context ~ '(^|[[:space:]])password reset([[:space:]]|$)'
      or ticket_context ~ '(^|[[:space:]])teller (role|function) modification request([[:space:]]|$)'
      or (
        ticket_context ~ '(^|[[:space:]])(teller[[:space:]]+)?(user[[:space:]]+)?(role|function)([[:space:]]|$)'
        and ticket_context ~ '(^|[[:space:]])(modify|modification|change|update|amend|add|remove)([[:space:]]|$)'
        and ticket_context !~ '(^|[[:space:]])(expiry|expiration|expire|expires|expired|expiring)([[:space:]]|$)'
      )
    );

  if saar_required_for_request
    and saar_context_changed
    and coalesce(nullif(new.saar_attachment ->> 'dataUrl', ''), nullif(new.saar_attachment ->> 'url', ''), nullif(new.saar_attachment ->> 'publicUrl', ''), nullif(new.saar_attachment ->> 'path', '')) is null then
    raise exception 'SAAR PDF attachment is required for MBWin / Sky360 new user, password reset, or teller role/function modification requests.';
  end if;

  new.saar_required := saar_required_for_request;
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
create index if not exists tickets_technician_id_idx on public.tickets (technician_id) where technician_id is not null;
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
using (auth.uid() = owner_id and public.has_valid_portal_session());

drop policy if exists "Admins can read all tickets" on public.tickets;
create policy "Admins can read all tickets"
on public.tickets for select
using (public.is_admin());

drop policy if exists "Employees can create own tickets" on public.tickets;
create policy "Employees can create own tickets"
on public.tickets for insert
with check (auth.uid() = owner_id and public.has_valid_portal_session());

drop policy if exists "Employees can update own tickets" on public.tickets;
create policy "Employees can update own tickets"
on public.tickets for update
using (auth.uid() = owner_id and public.has_valid_portal_session())
with check (auth.uid() = owner_id and public.has_valid_portal_session());

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
-- EMPLOYEE HELP DESK QUEUE STATUS
-- Calculates each employee's own position in the active ICT review queue.
-- Higher SLA / priority tickets are reviewed first, then oldest submissions.
-- =====================================================

create or replace function public.get_my_ticket_queue_status()
returns table (
  ticket_id text,
  queue_position integer,
  queue_size integer
)
language sql
stable
security definer
set search_path = public
as $$
  with waiting_tickets as (
    select
      t.id,
      t.owner_id,
      (row_number() over (
        order by
          case lower(coalesce(nullif(trim(t.priority), ''), nullif(trim(t.sla), ''), 'low'))
            when 'critical' then 1
            when 'high' then 2
            when 'medium' then 3
            else 4
          end,
          t.created_at asc,
          t.id asc
      ))::integer as queue_position,
      (count(*) over ())::integer as queue_size
    from public.tickets t
    where trim(lower(regexp_replace(
      regexp_replace(coalesce(t.status, ''), '[-_]+', ' ', 'g'),
      '[[:space:]]+',
      ' ',
      'g'
    ))) in ('created', 'submitted', 'pending', 'modified')
      and lower(coalesce(nullif(trim(t.technician), ''), 'unassigned')) = 'unassigned'
      and t.technician_id is null
      and (t.locked_by is null or t.lock_expires_at is null or t.lock_expires_at <= now())
      and t.work_started_at is null
      and nullif(trim(coalesce(t.action_taken, '')), '') is null
      and nullif(trim(coalesce(t.admin_remarks, '')), '') is null
      and nullif(trim(coalesce(t.resolution, '')), '') is null
      and nullif(trim(coalesce(t.recommendation, '')), '') is null
      and lower(trim(coalesce(t.support_category, ''))) <> 'burnout'
  )
  select
    waiting_tickets.id,
    waiting_tickets.queue_position,
    waiting_tickets.queue_size
  from waiting_tickets
  where waiting_tickets.owner_id = auth.uid()
    and public.has_valid_portal_session();
$$;

revoke all on function public.get_my_ticket_queue_status() from public;

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
  client_message_id uuid,
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
add column if not exists client_message_id uuid,
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
create unique index if not exists ticket_messages_idempotency_idx
  on public.ticket_messages (ticket_id, sender_id, client_message_id)
  where client_message_id is not null;

alter table public.ticket_messages enable row level security;

drop policy if exists "Ticket participants can read ticket messages" on public.ticket_messages;
create policy "Ticket participants can read ticket messages"
on public.ticket_messages for select
using (
  public.has_valid_portal_session()
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

drop policy if exists "Ticket participants can create ticket messages" on public.ticket_messages;
create policy "Ticket participants can create ticket messages"
on public.ticket_messages for insert
with check (
  public.has_valid_portal_session()
  and sender_id = auth.uid()
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
  technician_id uuid references public.profiles(id) on delete set null,
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
using (auth.uid() = owner_id and public.has_valid_portal_session());

drop policy if exists "Admins can read all ticket status events" on public.ticket_status_events;
create policy "Admins can read all ticket status events"
on public.ticket_status_events for select
using (public.is_admin());

drop policy if exists "System can insert ticket status events" on public.ticket_status_events;
create policy "System can insert ticket status events"
on public.ticket_status_events for insert
with check (
  public.has_valid_portal_session()
  and (
    public.is_admin()
    or exists (
      select 1
      from public.tickets t
      where t.id = ticket_status_events.ticket_id
        and t.owner_id = auth.uid()
    )
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
      technician_id,
      created_by
    )
    values (
      new.id,
      new.owner_id,
      coalesce(nullif(new.status, ''), 'Created'),
      case when TG_OP = 'UPDATE' then old.status else null end,
      nullif(new.technician, ''),
      new.technician_id,
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
using (auth.uid() = user_id and public.has_valid_portal_session());

drop policy if exists "Admins can read all notifications" on public.user_notifications;
create policy "Admins can read all notifications"
on public.user_notifications for select
using (public.is_admin());

drop policy if exists "Users can update own notifications" on public.user_notifications;
create policy "Users can update own notifications"
on public.user_notifications for update
using (auth.uid() = user_id and public.has_valid_portal_session())
with check (auth.uid() = user_id and public.has_valid_portal_session());

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
using (auth.uid() = owner_id and public.has_valid_portal_session());

drop policy if exists "Admins can read all other service requests" on public.other_service_requests;
create policy "Admins can read all other service requests"
on public.other_service_requests for select
using (public.is_admin());

drop policy if exists "Employees can create own other service requests" on public.other_service_requests;
create policy "Employees can create own other service requests"
on public.other_service_requests for insert
with check (auth.uid() = owner_id and public.has_valid_portal_session());

drop policy if exists "Employees can update own other service requests" on public.other_service_requests;
create policy "Employees can update own other service requests"
on public.other_service_requests for update
using (auth.uid() = owner_id and public.has_valid_portal_session())
with check (auth.uid() = owner_id and public.has_valid_portal_session());

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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'member-concern-attachments',
  'member-concern-attachments',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'application/pdf']
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
  and public.has_valid_portal_session()
);

drop policy if exists "Users can update own profile photos" on storage.objects;
create policy "Users can update own profile photos"
on storage.objects for update
to authenticated
using (
  bucket_id = 'profile-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
  and public.has_valid_portal_session()
)
with check (
  bucket_id = 'profile-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
  and public.has_valid_portal_session()
);

drop policy if exists "Users can delete own profile photos" on storage.objects;
create policy "Users can delete own profile photos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'profile-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
  and public.has_valid_portal_session()
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
  and public.has_valid_portal_session()
);

drop policy if exists "Public can upload member concern attachments" on storage.objects;
create policy "Public can upload member concern attachments"
on storage.objects for insert
to anon, authenticated
with check (
  bucket_id = 'member-concern-attachments'
  and (storage.foldername(name))[1] ~ '^MCC-[0-9]{4}-[A-F0-9]{6}$'
);

drop policy if exists "MRDSS admins can read member concern attachments" on storage.objects;
create policy "MRDSS admins can read member concern attachments"
on storage.objects for select
to authenticated
using (
  bucket_id = 'member-concern-attachments'
  and public.is_mrdss_admin()
);

drop policy if exists "Branch managers can read routed concern attachments" on storage.objects;
create policy "Branch managers can read routed concern attachments"
on storage.objects for select
to authenticated
using (
  bucket_id = 'member-concern-attachments'
  and exists (
    select 1
    from public.member_concerns c
    where c.id = (storage.foldername(name))[1]
      and c.workflow_stage = 'branch_review'
      and public.is_assigned_branch_manager(c.routed_to)
  )
);

drop policy if exists "Superadmins can delete member concern attachments" on storage.objects;
create policy "Superadmins can delete member concern attachments"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'member-concern-attachments'
  and public.is_superadmin()
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
grant execute on function public.get_my_ticket_queue_status() to authenticated;
grant execute on function public.update_own_profile_photo(text) to authenticated;
grant execute on function public.claim_portal_session() to authenticated;
grant execute on function public.touch_portal_session() to authenticated;
grant execute on function public.is_portal_session_active() to authenticated;
grant execute on function public.end_portal_session() to authenticated;
grant execute on function public.has_valid_portal_session() to authenticated;
grant execute on function public.generate_ticket_id() to authenticated;
grant execute on function public.generate_other_service_id() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_superadmin() to authenticated;
grant execute on function public.is_marketing_admin() to authenticated;
grant execute on function public.is_hr_admin() to authenticated;
grant execute on function public.is_mrdss_admin() to authenticated;
grant execute on function public.get_mrdss_assignable_staff() to authenticated;
grant execute on function public.is_branch_manager_admin() to authenticated;
grant execute on function public.is_assigned_branch_manager(text) to authenticated;
grant execute on function public.get_mrdss_branch_managers() to authenticated;
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
alter table public.member_concerns replica identity full;

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

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.member_concerns;
  end if;
exception
  when duplicate_object then null;
end $$;

-- =====================================================
-- IMPORTANT: MAKE YOUR OWN ACCOUNT SUPERADMIN
-- Replace the email before running this manually if needed:
-- update public.profiles set role = 'superadmin', status = 'Active' where lower(email) = lower('your-email@example.com');
-- =====================================================

select 'MEMPCO base schema section completed; consolidated ICT hardening follows.' as result;

notify pgrst, 'reload schema';
-- Role-based routing, assignment, audit, and recovery for member concerns.
-- Apply after the existing MRDSS concern and branch-manager migrations.

alter type public.user_role add value if not exists 'area_manager_admin';
alter type public.user_role add value if not exists 'coo_admin';

create table if not exists public.concern_areas (
  id text primary key,
  name text not null unique
);

insert into public.concern_areas (id, name)
values ('area-1', 'Area 1'), ('area-2', 'Area 2')
on conflict (id) do update set name = excluded.name;

create table if not exists public.concern_branches (
  id text primary key,
  branch_name text not null unique,
  category text not null check (category in ('central_office', 'branch', 'extension_branch', 'satellite_office', 'funeraria')),
  area_id text references public.concern_areas(id) on delete restrict,
  escalation_route text not null default 'area_manager' check (escalation_route in ('area_manager', 'coo')),
  legacy_names text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.concern_branches
  add column if not exists escalation_route text not null default 'area_manager';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.concern_branches'::regclass
      and conname = 'concern_branches_escalation_route_check'
  ) then
    alter table public.concern_branches
      add constraint concern_branches_escalation_route_check
      check (escalation_route in ('area_manager', 'coo'));
  end if;
end $$;

insert into public.concern_branches (id, branch_name, category, area_id, escalation_route, legacy_names)
values
  ('central-office', 'Central Office', 'central_office', null, 'area_manager', array['Central Office']),
  ('curuan', 'Curuan Branch', 'branch', 'area-1', 'area_manager', array['Curuan']),
  ('canelar', 'Canelar Branch', 'branch', 'area-1', 'area_manager', array['Canelar']),
  ('veterans', 'Veterans Branch', 'branch', 'area-1', 'area_manager', array['Veterans']),
  ('culianan', 'Culianan Branch', 'branch', 'area-1', 'area_manager', array['Culianan']),
  ('ipil', 'Ipil Branch', 'branch', 'area-2', 'area_manager', array['Ipil']),
  ('dipolog', 'Dipolog Branch', 'branch', 'area-2', 'area_manager', array['Dipolog']),
  ('ayala', 'Ayala Branch', 'branch', 'area-1', 'area_manager', array['Ayala']),
  ('pagadian', 'Pagadian Branch', 'branch', 'area-2', 'area_manager', array['Pagadian']),
  ('nunez-extension', 'Nunez Extension Branch', 'extension_branch', null, 'coo', array['Nunez', 'Nunez Extension']),
  ('vitali-satellite', 'Vitali Satellite Office', 'satellite_office', 'area-1', 'area_manager', array['Vitali']),
  ('la-hermosa', 'La Hermosa Funeraria de MEMPCO', 'funeraria', null, 'coo', array['La Hermosa', 'La Hermosa Funeraria'])
on conflict (id) do update set
  branch_name = excluded.branch_name,
  category = excluded.category,
  area_id = excluded.area_id,
  escalation_route = excluded.escalation_route,
  legacy_names = excluded.legacy_names,
  updated_at = now();

alter table public.concern_areas enable row level security;
alter table public.concern_branches enable row level security;
revoke all on public.concern_areas from public, anon, authenticated;
revoke all on public.concern_branches from public, anon, authenticated;

alter table public.profiles
  add column if not exists area_id text references public.concern_areas(id) on delete set null;

create or replace function public.normalize_concern_branch_name(value text)
returns text
language sql
immutable
set search_path = public
as $$
  select regexp_replace(lower(trim(coalesce(value, ''))), '[^a-z0-9]+', '', 'g');
$$;

create or replace function public.resolve_concern_branch_id(branch_value text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select b.id
  from public.concern_branches b
  where public.normalize_concern_branch_name(branch_value) = public.normalize_concern_branch_name(b.id)
     or public.normalize_concern_branch_name(branch_value) = public.normalize_concern_branch_name(b.branch_name)
     or exists (
       select 1
       from unnest(b.legacy_names) legacy_name
       where public.normalize_concern_branch_name(branch_value) = public.normalize_concern_branch_name(legacy_name)
     )
  order by case when public.normalize_concern_branch_name(branch_value) = public.normalize_concern_branch_name(b.id) then 0 else 1 end
  limit 1;
$$;

create or replace function public.is_area_manager_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role::text = 'area_manager_admin'
      and p.area_id is not null
      and coalesce(p.status, 'Active') = 'Active'
      and public.has_valid_portal_session()
  );
$$;

create or replace function public.is_coo_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role::text = 'coo_admin'
      and coalesce(p.status, 'Active') = 'Active'
      and public.has_valid_portal_session()
  );
$$;

create or replace function public.is_assigned_branch_manager(target_branch text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_branch_manager_admin()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and public.resolve_concern_branch_id(p.branch) = public.resolve_concern_branch_id(target_branch)
    );
$$;

drop function if exists public.get_member_concern_branches();
create function public.get_member_concern_branches()
returns table (branch_id text, branch_name text, category text, has_active_manager boolean)
language sql
stable
security definer
set search_path = public
as $$
  select
    b.id,
    b.branch_name,
    b.category,
    exists (
      select 1 from public.profiles p
      where p.role::text = 'branch_manager_admin'
        and coalesce(p.status, 'Active') = 'Active'
        and public.resolve_concern_branch_id(p.branch) = b.id
    )
  from public.concern_branches b
  where b.is_active
  order by case when b.id = 'central-office' then 0 else 1 end, b.branch_name;
$$;

drop function if exists public.get_mrdss_branch_destinations();
create function public.get_mrdss_branch_destinations()
returns table (branch_id text, branch_name text)
language sql
stable
security definer
set search_path = public
as $$
  select b.id, b.branch_name
  from public.concern_branches b
  where public.is_mrdss_admin()
    and b.is_active
    and b.id <> 'central-office'
    and exists (
      select 1 from public.profiles p
      where p.role::text = 'branch_manager_admin'
        and coalesce(p.status, 'Active') = 'Active'
        and public.resolve_concern_branch_id(p.branch) = b.id
    )
  order by b.branch_name;
$$;

alter table public.member_concerns
  add column if not exists origin_branch_id text references public.concern_branches(id) on delete set null,
  add column if not exists destination_type text not null default 'mrdss',
  add column if not exists destination_branch_id text references public.concern_branches(id) on delete set null,
  add column if not exists destination_area_id text references public.concern_areas(id) on delete set null,
  add column if not exists destination_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists resolved_by uuid references public.profiles(id) on delete set null,
  add column if not exists resolved_at timestamptz,
  add column if not exists closure_remarks text not null default '',
  add column if not exists closure_outcome text;

alter table public.member_concerns
  drop constraint if exists member_concerns_closure_outcome_check;

update public.member_concerns
set closure_outcome = 'resolved'
where workflow_stage = 'closed' and closure_outcome is null;

alter table public.member_concerns
  add constraint member_concerns_closure_outcome_check
    check (
      (workflow_stage = 'closed' and closure_outcome in ('resolved', 'unable_to_contact'))
      or (workflow_stage <> 'closed' and closure_outcome is null)
    );

create or replace function public.normalize_member_concern_closure_outcome()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.workflow_stage <> 'closed' then
    new.closure_outcome := null;
  elsif new.closure_outcome is null then
    new.closure_outcome := 'resolved';
  end if;
  return new;
end;
$$;

drop trigger if exists member_concerns_normalize_closure_outcome on public.member_concerns;
create trigger member_concerns_normalize_closure_outcome
before insert or update on public.member_concerns
for each row execute function public.normalize_member_concern_closure_outcome();

alter table public.member_concerns
  drop constraint if exists member_concerns_status_check,
  drop constraint if exists member_concerns_destination_type_check;

alter table public.member_concerns
  add constraint member_concerns_status_check
    check (status in ('New', 'In Review', 'Waiting for Member', 'Returned for Further Action', 'Resolved', 'Closed')),
  add constraint member_concerns_destination_type_check
    check (destination_type in ('mrdss', 'branch', 'area_manager', 'coo', 'final_tagging', 'closed'));

update public.member_concerns c
set
  origin_branch_id = coalesce(c.origin_branch_id, public.resolve_concern_branch_id(c.branch)),
  destination_type = case c.workflow_stage
    when 'branch_review' then 'branch'
    when 'area_manager_review' then 'area_manager'
    when 'coo_review' then 'coo'
    when 'final_tagging' then 'final_tagging'
    when 'closed' then 'closed'
    else 'mrdss'
  end,
  destination_branch_id = case
    when c.workflow_stage = 'branch_review' then coalesce(public.resolve_concern_branch_id(c.routed_to), public.resolve_concern_branch_id(c.branch))
    when c.workflow_stage = 'final_tagging' and c.submission_route = 'branch' then public.resolve_concern_branch_id(c.routed_to)
    else null
  end,
  destination_area_id = case
    when c.workflow_stage = 'branch_review' then (
      select b.area_id
      from public.concern_branches b
      where b.id = coalesce(public.resolve_concern_branch_id(c.routed_to), public.resolve_concern_branch_id(c.branch))
    )
    when c.workflow_stage = 'area_manager_review' then coalesce(
      c.destination_area_id,
      (select b.area_id from public.concern_branches b where b.id = public.resolve_concern_branch_id(c.branch))
    )
    else null
  end,
  routed_to = coalesce(nullif(trim(c.routed_to), ''), 'MRDSS');

create table if not exists public.member_concern_route_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  concern_id text not null references public.member_concerns(id) on delete cascade,
  from_type text,
  from_branch_id text references public.concern_branches(id) on delete set null,
  from_area_id text references public.concern_areas(id) on delete set null,
  from_user_id uuid references public.profiles(id) on delete set null,
  to_type text not null,
  to_branch_id text references public.concern_branches(id) on delete set null,
  to_area_id text references public.concern_areas(id) on delete set null,
  to_user_id uuid references public.profiles(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text not null default 'System',
  actor_role text not null default 'system',
  remarks text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists member_concern_route_events_case_idx
  on public.member_concern_route_events (concern_id, created_at desc);
create index if not exists member_concern_route_events_branch_idx
  on public.member_concern_route_events (to_branch_id, concern_id);
create index if not exists member_concern_route_events_area_idx
  on public.member_concern_route_events (to_area_id, to_user_id, concern_id);
create index if not exists member_concern_route_events_user_idx
  on public.member_concern_route_events (to_user_id, concern_id);

alter table public.member_concern_route_events enable row level security;
revoke all on public.member_concern_route_events from public, anon, authenticated;

create or replace function public.is_member_concern_visible(target_concern_id text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  actor public.profiles;
  branch_id text;
begin
  if not public.has_valid_portal_session() then
    return false;
  end if;
  if public.is_mrdss_admin() then
    return true;
  end if;

  select * into actor from public.profiles where id = auth.uid();
  branch_id := public.resolve_concern_branch_id(actor.branch);
  return exists (
    select 1
    from public.member_concerns c
    where c.id = target_concern_id
      and (
        (actor.role::text = 'branch_manager_admin'
          and c.destination_type = 'branch'
          and c.destination_branch_id = branch_id)
        or (actor.role::text = 'area_manager_admin'
          and c.destination_type = 'area_manager'
          and c.destination_area_id = actor.area_id
          and (c.destination_user_id is null or c.destination_user_id = auth.uid()))
        or (actor.role::text = 'coo_admin'
          and c.destination_type = 'coo'
          and (c.destination_user_id is null or c.destination_user_id = auth.uid()))
      )
  ) or exists (
    select 1
    from public.member_concern_route_events e
    where e.concern_id = target_concern_id
      and (
        (actor.role::text = 'branch_manager_admin'
          and e.to_type = 'branch'
          and e.to_branch_id = branch_id)
        or (actor.role::text = 'area_manager_admin'
          and e.to_type = 'area_manager'
          and e.to_area_id = actor.area_id
          and (e.to_user_id is null or e.to_user_id = auth.uid()))
        or (actor.role::text = 'coo_admin'
          and e.to_type = 'coo'
          and (e.to_user_id is null or e.to_user_id = auth.uid()))
      )
  );
end;
$$;

create or replace function public.can_handle_member_concern(target_concern_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.member_concerns c
    where c.id = target_concern_id
      and (
        (public.is_mrdss_admin()
          and c.workflow_stage in ('mrdss_review', 'final_tagging')
          and (c.assigned_staff_id is null or c.assigned_staff_id = auth.uid() or public.is_superadmin()))
        or (c.workflow_stage = 'branch_review' and c.destination_type = 'branch'
          and public.is_assigned_branch_manager(c.destination_branch_id))
        or (c.workflow_stage = 'area_manager_review' and c.destination_type = 'area_manager'
          and public.is_area_manager_admin()
          and c.destination_area_id = (select p.area_id from public.profiles p where p.id = auth.uid())
          and (c.destination_user_id is null or c.destination_user_id = auth.uid()))
        or (c.workflow_stage = 'coo_review' and c.destination_type = 'coo'
          and public.is_coo_admin()
          and (c.destination_user_id is null or c.destination_user_id = auth.uid()))
      )
  );
$$;

create or replace function public.auto_assign_mrdss_case_handler()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  latest_activity jsonb;
  latest_activity_type text;
begin
  if auth.uid() is null
    or not public.is_mrdss_admin()
    or new.activities is not distinct from old.activities then
    return new;
  end if;

  if jsonb_typeof(new.activities) = 'array' and jsonb_array_length(new.activities) > 0 then
    latest_activity := new.activities -> (jsonb_array_length(new.activities) - 1);
  end if;

  latest_activity_type := coalesce(latest_activity ->> 'type', '');
  if latest_activity ->> 'actorId' is distinct from auth.uid()::text
    or latest_activity_type in ('Assignment', 'Priority updated', 'Submitted')
    or not (
      old.workflow_stage in ('mrdss_review', 'final_tagging')
      or (old.workflow_stage = 'closed' and new.workflow_stage = 'mrdss_review')
    ) then
    return new;
  end if;

  if new.assigned_staff_id is not null then
    if new.assigned_staff_id <> auth.uid() and not public.is_superadmin() then
      raise exception 'This case is assigned to another MRDSS coordinator.';
    end if;
  else
    new.assigned_staff_id := auth.uid();
  end if;

  return new;
end;
$$;

drop trigger if exists member_concerns_auto_assign_mrdss_handler on public.member_concerns;
create trigger member_concerns_auto_assign_mrdss_handler
before update on public.member_concerns
for each row execute function public.auto_assign_mrdss_case_handler();

revoke all on function public.auto_assign_mrdss_case_handler() from public, anon, authenticated;

create or replace function public.get_concern_area_managers(target_concern_id text)
returns table (manager_id uuid, manager_name text, area_id text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, coalesce(nullif(trim(p.full_name), ''), p.email), b.area_id
  from public.member_concerns c
  join public.concern_branches b on b.id = coalesce(c.destination_branch_id, c.origin_branch_id)
  join public.profiles p on p.area_id = b.area_id
  where c.id = target_concern_id
    and public.can_handle_member_concern(target_concern_id)
    and p.role::text = 'area_manager_admin'
    and coalesce(p.status, 'Active') = 'Active'
  order by p.full_name, p.email;
$$;

create or replace function public.get_concern_coo_users(target_concern_id text)
returns table (user_id uuid, user_name text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, coalesce(nullif(trim(p.full_name), ''), p.email)
  from public.profiles p
  where public.can_handle_member_concern(target_concern_id)
    and p.role::text = 'coo_admin'
    and coalesce(p.status, 'Active') = 'Active'
  order by p.full_name, p.email;
$$;

create or replace function public.get_member_concern_escalation_route(target_concern_id text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select b.escalation_route
  from public.member_concerns c
  join public.concern_branches b on b.id = c.destination_branch_id
  where c.id = target_concern_id
    and c.workflow_stage = 'branch_review'
    and public.can_handle_member_concern(target_concern_id);
$$;

create or replace function public.append_member_concern_activity(
  target_concern_id text,
  activity_type text,
  activity_detail text,
  route_context jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.profiles;
begin
  select * into actor from public.profiles where id = auth.uid();
  update public.member_concerns c
  set activities = coalesce(c.activities, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
    'id', gen_random_uuid()::text,
    'type', activity_type,
    'detail', activity_detail,
    'actor', coalesce(nullif(trim(actor.full_name), ''), actor.email, 'System'),
    'actorId', auth.uid(),
    'actorRole', coalesce(actor.role::text, 'system'),
    'visibility', 'internal',
    'route', coalesce(route_context, '{}'::jsonb),
    'at', now()
  ))
  where c.id = target_concern_id;
end;
$$;

create or replace function public.record_member_concern_route(
  target_concern_id text,
  old_type text,
  old_branch_id text,
  old_area_id text,
  old_user_id uuid,
  new_type text,
  new_branch_id text,
  new_area_id text,
  new_user_id uuid,
  route_remarks text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.profiles;
begin
  select * into actor from public.profiles where id = auth.uid();
  insert into public.member_concern_route_events (
    event_key, concern_id, from_type, from_branch_id, from_area_id, from_user_id,
    to_type, to_branch_id, to_area_id, to_user_id, actor_id, actor_name, actor_role, remarks
  ) values (
    gen_random_uuid()::text, target_concern_id, old_type, old_branch_id, old_area_id, old_user_id,
    new_type, new_branch_id, new_area_id, new_user_id, auth.uid(),
    coalesce(nullif(trim(actor.full_name), ''), actor.email, 'System'),
    coalesce(actor.role::text, 'system'), coalesce(route_remarks, '')
  );
end;
$$;

create or replace function public.prevent_coo_only_area_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.workflow_stage = 'branch_review'
    and new.workflow_stage = 'area_manager_review'
    and exists (
      select 1
      from public.concern_branches b
      where b.id = old.destination_branch_id
        and b.escalation_route = 'coo'
    ) then
    raise exception 'This branch escalates directly to the COO and is outside Area Manager jurisdiction.';
  end if;
  return new;
end;
$$;

drop trigger if exists member_concerns_prevent_coo_only_area_escalation on public.member_concerns;
create trigger member_concerns_prevent_coo_only_area_escalation
before update on public.member_concerns
for each row execute function public.prevent_coo_only_area_escalation();

create or replace function public.escalate_member_concern_branch_to_coo(
  target_concern_id text,
  recipient_user_id uuid,
  handoff_remarks text
)
returns public.member_concerns
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.member_concerns;
  actor public.profiles;
  target_coo public.profiles;
  note text := trim(coalesce(handoff_remarks, ''));
  old_type text;
  old_branch text;
  old_area text;
  old_user uuid;
begin
  if auth.uid() is null or not public.has_valid_portal_session() then
    raise exception 'A valid portal session is required.';
  end if;

  select * into actor from public.profiles p
  where p.id = auth.uid() and coalesce(p.status, 'Active') = 'Active';
  if actor.id is null or actor.role::text <> 'branch_manager_admin' then
    raise exception 'Only an active Branch Admin can escalate this concern to the COO.';
  end if;

  select * into c from public.member_concerns where id = target_concern_id for update;
  if c.id is null or c.workflow_stage <> 'branch_review' or c.destination_type <> 'branch'
    or not public.can_handle_member_concern(target_concern_id)
    or not exists (
      select 1 from public.concern_branches b
      where b.id = c.destination_branch_id and b.escalation_route = 'coo'
    ) then
    raise exception 'This case is not assigned to a COO-only branch route.';
  end if;
  if length(note) < 8 then
    raise exception 'Record at least 8 characters of escalation instructions.';
  end if;

  select * into target_coo from public.profiles p
  where p.id = recipient_user_id
    and p.role::text = 'coo_admin'
    and coalesce(p.status, 'Active') = 'Active';
  if target_coo.id is null then
    raise exception 'Choose an active COO account.';
  end if;

  old_type := c.destination_type;
  old_branch := c.destination_branch_id;
  old_area := c.destination_area_id;
  old_user := c.destination_user_id;

  update public.member_concerns
  set status = 'In Review',
      workflow_stage = 'coo_review',
      destination_type = 'coo',
      destination_branch_id = null,
      destination_area_id = null,
      destination_user_id = target_coo.id,
      routed_to = coalesce(nullif(trim(target_coo.full_name), ''), target_coo.email),
      activities = coalesce(activities, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
        'id', gen_random_uuid()::text,
        'type', 'COO escalation',
        'detail', 'Escalated directly to ' || coalesce(nullif(trim(target_coo.full_name), ''), target_coo.email) || ' for executive review. ' || note,
        'actor', coalesce(nullif(trim(actor.full_name), ''), actor.email),
        'actorId', actor.id,
        'actorRole', actor.role::text,
        'visibility', 'internal',
        'route', jsonb_build_object(
          'fromType', old_type, 'fromBranchId', old_branch, 'fromAreaId', old_area, 'fromUserId', old_user,
          'toType', 'coo', 'toBranchId', null, 'toAreaId', null, 'toUserId', target_coo.id
        ),
        'at', now()
      )),
      updated_at = now()
  where id = c.id
  returning * into c;

  perform public.record_member_concern_route(
    c.id, old_type, old_branch, old_area, old_user,
    'coo', null, null, target_coo.id, note
  );

  return c;
end;
$$;

create or replace function public.prepare_member_concern_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_branch public.concern_branches;
  branch_has_manager boolean := false;
  actual_route text;
  detail_text text;
begin
  select * into selected_branch
  from public.concern_branches b
  where b.id = public.resolve_concern_branch_id(new.branch)
    and b.is_active;

  if selected_branch.id is null then
    raise exception 'Choose a valid MEMPCO office or branch.';
  end if;

  new.origin_branch_id := selected_branch.id;
  branch_has_manager := exists (
    select 1 from public.profiles p
    where p.role::text = 'branch_manager_admin'
      and coalesce(p.status, 'Active') = 'Active'
      and public.resolve_concern_branch_id(p.branch) = selected_branch.id
  );

  if selected_branch.id <> 'central-office' and branch_has_manager then
    actual_route := 'branch';
    new.submission_route := 'branch';
    new.workflow_stage := 'branch_review';
    new.destination_type := 'branch';
    new.destination_branch_id := selected_branch.id;
    new.destination_area_id := selected_branch.area_id;
    new.destination_user_id := null;
    new.routed_to := selected_branch.branch_name;
    detail_text := 'Concern submitted directly to ' || selected_branch.branch_name || '.';
  else
    actual_route := 'mrdss';
    new.submission_route := 'mrdss';
    new.workflow_stage := 'mrdss_review';
    new.destination_type := 'mrdss';
    new.destination_branch_id := null;
    new.destination_area_id := null;
    new.destination_user_id := null;
    new.routed_to := 'MRDSS';
    detail_text := case
      when selected_branch.id = 'central-office' then 'Concern submitted to MRDSS through the website.'
      else 'Concern submitted to MRDSS because no active Branch Admin is assigned to ' || selected_branch.branch_name || '.'
    end;
  end if;

  new.status := 'New';
  new.sla_hours := 24;
  new.sla_due_at := coalesce(new.created_at, now()) + interval '24 hours';
  new.closed_at := null;
  new.resolved_at := null;
  new.resolved_by := null;
  new.closure_remarks := '';
  new.activities := jsonb_build_array(jsonb_build_object(
    'id', new.id || '-submitted',
    'type', 'Submitted',
    'detail', detail_text,
    'actor', 'Member',
    'actorRole', 'public',
    'visibility', 'internal',
    'at', coalesce(new.created_at, now())
  ));
  return new;
end;
$$;

create or replace function public.validate_member_concern_workflow()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.sla_hours := 24;
  new.sla_due_at := coalesce(new.created_at, now()) + interval '24 hours';
  return new;
end;
$$;

create or replace function public.record_member_concern_initial_route()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.member_concern_route_events (
    event_key, concern_id, to_type, to_branch_id, to_area_id, actor_name, actor_role, remarks
  ) values (
    'intake:' || new.id, new.id, new.destination_type, new.destination_branch_id,
    new.destination_area_id, 'Member', 'public', new.submission_route
  ) on conflict (event_key) do nothing;
  return new;
end;
$$;

drop trigger if exists member_concern_record_initial_route on public.member_concerns;
create trigger member_concern_record_initial_route
after insert on public.member_concerns
for each row execute function public.record_member_concern_initial_route();

insert into public.member_concern_route_events (
  event_key, concern_id, to_type, to_branch_id, to_area_id, actor_name, actor_role, remarks, created_at
)
select
  'legacy-intake:' || c.id,
  c.id,
  'branch',
  c.origin_branch_id,
  b.area_id,
  'System',
  'system',
  'Imported from the existing direct-to-branch workflow.',
  c.created_at
from public.member_concerns c
join public.concern_branches b on b.id = c.origin_branch_id
where c.submission_route = 'branch'
on conflict (event_key) do nothing;

insert into public.member_concern_route_events (
  event_key, concern_id, to_type, to_branch_id, to_area_id, actor_name, actor_role, remarks, created_at
)
select
  'legacy-referral:' || c.id || ':' || coalesce(a.event ->> 'id', md5(a.event::text)),
  c.id,
  'branch',
  public.resolve_concern_branch_id(regexp_replace(coalesce(a.event ->> 'detail', ''), '^Referred to (.*) for assessment[.]?.*$', '\1')),
  b.area_id,
  coalesce(a.event ->> 'actor', 'System'),
  coalesce(a.event ->> 'actorRole', 'legacy'),
  coalesce(a.event ->> 'detail', ''),
  coalesce(nullif(a.event ->> 'at', '')::timestamptz, c.created_at)
from public.member_concerns c
cross join lateral jsonb_array_elements(coalesce(c.activities, '[]'::jsonb)) a(event)
left join public.concern_branches b
  on b.id = public.resolve_concern_branch_id(regexp_replace(coalesce(a.event ->> 'detail', ''), '^Referred to (.*) for assessment[.]?.*$', '\1'))
where a.event ->> 'type' = 'Branch referral'
  and public.resolve_concern_branch_id(regexp_replace(coalesce(a.event ->> 'detail', ''), '^Referred to (.*) for assessment[.]?.*$', '\1')) is not null
on conflict (event_key) do nothing;

insert into public.member_concern_route_events (
  event_key, concern_id, to_type, to_area_id, actor_name, actor_role, remarks, created_at
)
select
  'legacy-area:' || c.id || ':' || coalesce(a.event ->> 'id', md5(a.event::text)),
  c.id,
  'area_manager',
  b.area_id,
  coalesce(a.event ->> 'actor', 'System'),
  coalesce(a.event ->> 'actorRole', 'legacy'),
  coalesce(a.event ->> 'detail', ''),
  coalesce(nullif(a.event ->> 'at', '')::timestamptz, c.created_at)
from public.member_concerns c
cross join lateral jsonb_array_elements(coalesce(c.activities, '[]'::jsonb)) a(event)
join public.concern_branches b on b.id = coalesce(c.origin_branch_id, public.resolve_concern_branch_id(c.branch))
where a.event ->> 'type' = 'Area Manager escalation'
on conflict (event_key) do nothing;

insert into public.member_concern_route_events (
  event_key, concern_id, to_type, actor_name, actor_role, remarks, created_at
)
select
  'legacy-coo:' || c.id || ':' || coalesce(a.event ->> 'id', md5(a.event::text)),
  c.id,
  'coo',
  coalesce(a.event ->> 'actor', 'System'),
  coalesce(a.event ->> 'actorRole', 'legacy'),
  coalesce(a.event ->> 'detail', ''),
  coalesce(nullif(a.event ->> 'at', '')::timestamptz, c.created_at)
from public.member_concerns c
cross join lateral jsonb_array_elements(coalesce(c.activities, '[]'::jsonb)) a(event)
where a.event ->> 'type' = 'COO escalation'
on conflict (event_key) do nothing;

-- The legacy transition trigger rejects recovery from a branch/area/COO queue.
drop trigger if exists member_concerns_validate_workflow on public.member_concerns;

update public.member_concerns c
set status = 'Returned for Further Action',
    workflow_stage = 'mrdss_review',
    destination_type = 'mrdss',
    destination_branch_id = null,
    destination_area_id = null,
    destination_user_id = null,
    routed_to = 'MRDSS',
    activities = coalesce(c.activities, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'id', 'legacy-recovery-' || c.id,
      'type', 'Destination recovery',
      'detail', 'Concern returned to MRDSS because no active Branch Admin is assigned to its current destination.',
      'actor', 'System',
      'actorRole', 'system',
      'visibility', 'internal',
      'at', now()
    ))
where c.workflow_stage = 'branch_review'
  and (c.destination_branch_id is null or not exists (
    select 1 from public.profiles p
    where p.role::text = 'branch_manager_admin'
      and coalesce(p.status, 'Active') = 'Active'
      and public.resolve_concern_branch_id(p.branch) = c.destination_branch_id
  ));

create trigger member_concerns_validate_workflow
before insert or update on public.member_concerns
for each row execute function public.validate_member_concern_workflow();

create or replace function public.validate_member_concern_assignee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assigned_staff_id is not null
    and (TG_OP = 'INSERT' or new.assigned_staff_id is distinct from old.assigned_staff_id)
    and not exists (
      select 1
      from public.profiles p
      where p.id = new.assigned_staff_id
        and p.role::text in ('mrdss_admin', 'superadmin')
        and coalesce(p.status, 'Active') = 'Active'
    ) then
    raise exception 'Cases can only be assigned to active MRDSS admins or superadmins.';
  end if;
  return new;
end;
$$;

insert into public.member_concern_route_events (
  event_key, concern_id, to_type, to_branch_id, to_area_id, actor_name, actor_role, remarks, created_at
)
select
  'legacy-current:' || c.id,
  c.id,
  c.destination_type,
  c.destination_branch_id,
  c.destination_area_id,
  'System',
  'system',
  'Imported current routing state.',
  c.updated_at
from public.member_concerns c
on conflict (event_key) do nothing;

insert into public.member_concern_route_events (
  event_key, concern_id, from_type, from_branch_id, from_area_id, from_user_id,
  to_type, actor_name, actor_role, remarks
)
select
  'area-to-coo-adjustment:' || c.id,
  c.id,
  c.destination_type,
  c.destination_branch_id,
  c.destination_area_id,
  c.destination_user_id,
  'coo',
  'System',
  'system',
  'Routed to COO because this location is outside Area Manager jurisdiction.'
from public.member_concerns c
where c.workflow_stage = 'area_manager_review'
  and coalesce(c.origin_branch_id, public.resolve_concern_branch_id(c.branch))
    in ('nunez-extension', 'la-hermosa')
on conflict (event_key) do nothing;

update public.member_concerns c
set status = 'In Review',
    workflow_stage = 'coo_review',
    destination_type = 'coo',
    destination_branch_id = null,
    destination_area_id = null,
    destination_user_id = null,
    routed_to = 'COO',
    activities = coalesce(c.activities, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'id', 'area-to-coo-adjustment-' || c.id,
      'type', 'COO escalation',
      'detail', 'Routed to COO review because this location is outside Area Manager jurisdiction.',
      'actor', 'System',
      'actorRole', 'system',
      'visibility', 'internal',
      'at', now()
    )),
    updated_at = now()
where c.workflow_stage = 'area_manager_review'
  and coalesce(c.origin_branch_id, public.resolve_concern_branch_id(c.branch))
    in ('nunez-extension', 'la-hermosa');

update public.member_concerns c
set destination_area_id = null,
    updated_at = now()
where c.workflow_stage = 'branch_review'
  and c.destination_branch_id in ('nunez-extension', 'la-hermosa')
  and c.destination_area_id is not null;

drop policy if exists "MRDSS admins can read member concerns" on public.member_concerns;
drop policy if exists "Branch managers can read routed branch cases" on public.member_concerns;
drop policy if exists "MRDSS admins can update member concerns" on public.member_concerns;
drop policy if exists "Branch managers can work routed branch cases" on public.member_concerns;
drop policy if exists "Authorized concern handlers can read assigned and historical cases" on public.member_concerns;
create policy "Authorized concern handlers can read assigned and historical cases"
on public.member_concerns for select to authenticated
using (public.is_member_concern_visible(id));

drop policy if exists "MRDSS admins can update member concerns" on public.member_concerns;
drop policy if exists "Branch managers can work routed branch cases" on public.member_concerns;
drop policy if exists "Area managers can update assigned concern cases" on public.member_concerns;
drop policy if exists "COO admins can update assigned concern cases" on public.member_concerns;

revoke all on public.member_concerns from public, anon, authenticated;
grant insert (id, member_name, branch, phone, email, preferred_contact, concern_type, category, submission_route, message, attachment)
  on public.member_concerns to anon, authenticated;
grant select on public.member_concerns to authenticated;
grant delete on public.member_concerns to authenticated;

create or replace function public.perform_member_concern_action(
  target_concern_id text,
  action_name text,
  action_payload jsonb default '{}'::jsonb
)
returns public.member_concerns
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.member_concerns;
  previous_route public.member_concern_route_events;
  actor public.profiles;
  action_note text := trim(coalesce(action_payload ->> 'remarks', ''));
  detail_text text := '';
  activity_type text := '';
  old_type text;
  old_branch text;
  old_area text;
  old_user uuid;
  next_status text;
  next_stage text;
  next_type text;
  next_branch text;
  next_area text;
  next_user uuid;
  next_routed_to text;
  next_resolution text;
  next_tag text;
  next_closure text;
  next_assignee uuid;
  next_priority text;
  next_closed_at timestamptz;
  next_resolved_at timestamptz;
  next_resolved_by uuid;
  target_branch public.concern_branches;
  target_profile public.profiles;
  target_area_id text;
  contact_outcome text;
  contact_channel text;
  response_type text;
  route_changed boolean := false;
begin
  if auth.uid() is null or not public.has_valid_portal_session() then
    raise exception 'A valid portal session is required.';
  end if;

  select * into actor from public.profiles p
  where p.id = auth.uid() and coalesce(p.status, 'Active') = 'Active';
  if actor.id is null then
    raise exception 'An active portal profile is required.';
  end if;

  select * into c from public.member_concerns where id = target_concern_id for update;
  if c.id is null then
    raise exception 'The concern could not be found.';
  end if;

  old_type := c.destination_type;
  old_branch := c.destination_branch_id;
  old_area := c.destination_area_id;
  old_user := c.destination_user_id;
  next_status := c.status;
  next_stage := c.workflow_stage;
  next_type := c.destination_type;
  next_branch := c.destination_branch_id;
  next_area := c.destination_area_id;
  next_user := c.destination_user_id;
  next_routed_to := c.routed_to;
  next_resolution := c.resolution_details;
  next_tag := c.resolution_tag;
  next_closure := c.closure_remarks;
  next_assignee := c.assigned_staff_id;
  next_priority := c.priority;
  next_closed_at := c.closed_at;
  next_resolved_at := c.resolved_at;
  next_resolved_by := c.resolved_by;

  if c.workflow_stage = 'closed' and action_name <> 'reopen_case' then
    raise exception 'Closed concerns are read-only.';
  end if;

  case action_name
    when 'start_review' then
      if not public.can_handle_member_concern(c.id) or c.status not in ('New', 'Returned for Further Action') then
        raise exception 'This concern is not available to your role for review.';
      end if;
      next_status := 'In Review';
      activity_type := 'Review started';
      detail_text := 'Review started at ' || initcap(replace(c.workflow_stage, '_', ' ')) || '.';

    when 'wait_for_member' then
      if not public.can_handle_member_concern(c.id) then raise exception 'You cannot update this concern.'; end if;
      next_status := 'Waiting for Member';
      activity_type := 'Waiting for Member';
      detail_text := 'Follow-up is waiting for a response from the member.';

    when 'resume_review' then
      if not public.can_handle_member_concern(c.id) or c.status <> 'Waiting for Member' then
        raise exception 'This concern is not waiting for member follow-up.';
      end if;
      next_status := case when c.workflow_stage = 'final_tagging' then 'Resolved' else 'In Review' end;
      activity_type := 'Review resumed';
      detail_text := 'Case review resumed after member follow-up.';

    when 'add_internal_note' then
      if not public.can_handle_member_concern(c.id) or length(trim(coalesce(action_payload ->> 'note', ''))) < 1 then
        raise exception 'Enter an internal note before saving.';
      end if;
      activity_type := 'Internal note';
      detail_text := trim(action_payload ->> 'note');

    when 'record_contact' then
      if not public.can_handle_member_concern(c.id) then raise exception 'You cannot update this concern.'; end if;
      contact_channel := action_payload ->> 'channel';
      contact_outcome := action_payload ->> 'outcome';
      if contact_channel is null or contact_channel not in ('Text', 'Call', 'Email')
        or contact_outcome is null or contact_outcome not in ('Member reached', 'No response', 'Follow-up requested') then
        raise exception 'Choose a valid contact method and outcome.';
      end if;
      activity_type := case when contact_outcome in ('Member reached', 'Follow-up requested') then 'First response' else 'Contact' end;
      detail_text := contact_channel || ' follow-up logged: ' || contact_outcome || coalesce(' - ' || nullif(trim(action_payload ->> 'note'), ''), '') || '.';

    when 'record_response' then
      if not public.can_handle_member_concern(c.id)
        or c.workflow_stage not in ('mrdss_review', 'branch_review', 'area_manager_review', 'coo_review') then
        raise exception 'Only the current handling role can record a response.';
      end if;
      if length(trim(coalesce(action_payload ->> 'responseDetails', ''))) < 2 then
        raise exception 'Enter the response details before recording the response.';
      end if;
      response_type := case c.workflow_stage
        when 'branch_review' then 'Branch response'
        when 'area_manager_review' then 'Area Manager response'
        when 'coo_review' then 'COO response'
        else 'MRDSS response'
      end;
      activity_type := response_type;
      detail_text := trim(action_payload ->> 'responseDetails');
      next_status := 'In Review';

    when 'assign_mrdss' then
      if not public.is_mrdss_admin() or c.workflow_stage <> 'mrdss_review' then
        raise exception 'Only MRDSS can assign a case handler during MRDSS review.';
      end if;
      if nullif(action_payload ->> 'userId', '') is null then
        next_assignee := null;
      else
        select * into target_profile from public.profiles p
        where p.id = (action_payload ->> 'userId')::uuid
          and p.role::text in ('mrdss_admin', 'superadmin')
          and coalesce(p.status, 'Active') = 'Active';
        if target_profile.id is null then raise exception 'Choose an active MRDSS case handler.'; end if;
        next_assignee := target_profile.id;
      end if;
      activity_type := 'Assignment';
      detail_text := case when next_assignee is null then 'MRDSS coordinator assignment cleared.'
        else 'Assigned MRDSS coordinator: ' || coalesce(nullif(trim(target_profile.full_name), ''), target_profile.email) || '.' end;

    when 'set_priority' then
      if not public.is_mrdss_admin() or c.workflow_stage not in ('mrdss_review', 'final_tagging') then
        raise exception 'Only MRDSS can change case priority.';
      end if;
      next_priority := action_payload ->> 'priority';
      if next_priority is null or next_priority not in ('Low', 'Normal', 'High', 'Urgent') then raise exception 'Choose a valid priority.'; end if;
      activity_type := 'Priority updated';
      detail_text := 'Priority set to ' || next_priority || '.';

    when 'refer_branch' then
      if not public.is_mrdss_admin() or c.workflow_stage <> 'mrdss_review' then
        raise exception 'Only MRDSS can refer a case from MRDSS review.';
      end if;
      select * into target_branch from public.concern_branches b
      where b.id = action_payload ->> 'branchId' and b.is_active and b.id <> 'central-office';
      if target_branch.id is null or not exists (
        select 1 from public.profiles p where p.role::text = 'branch_manager_admin'
          and coalesce(p.status, 'Active') = 'Active'
          and public.resolve_concern_branch_id(p.branch) = target_branch.id
      ) then raise exception 'Choose a branch with an active Branch Admin.'; end if;
      if length(action_note) < 8 then raise exception 'Add referral instructions before referring this case.'; end if;
      next_stage := 'branch_review'; next_status := 'In Review'; next_type := 'branch';
      next_branch := target_branch.id; next_area := target_branch.area_id; next_user := null;
      next_routed_to := target_branch.branch_name;
      activity_type := 'Branch referral';
      detail_text := action_note;

    when 'reroute_branch' then
      if not public.is_mrdss_admin() or c.workflow_stage <> 'branch_review' then
        raise exception 'Only MRDSS can reroute an active branch case.';
      end if;
      select * into target_branch from public.concern_branches b
      where b.id = action_payload ->> 'branchId' and b.is_active and b.id <> 'central-office';
      if target_branch.id is null or not exists (
        select 1 from public.profiles p where p.role::text = 'branch_manager_admin'
          and coalesce(p.status, 'Active') = 'Active'
          and public.resolve_concern_branch_id(p.branch) = target_branch.id
      ) then raise exception 'Choose a branch with an active Branch Admin.'; end if;
      if length(action_note) < 8 then raise exception 'Add a rerouting reason.'; end if;
      next_branch := target_branch.id; next_area := target_branch.area_id; next_user := null;
      next_routed_to := target_branch.branch_name; next_status := 'Returned for Further Action';
      activity_type := 'Destination changed';
      detail_text := action_note;

    when 'recover_to_mrdss' then
      if not public.is_mrdss_admin() or c.workflow_stage in ('mrdss_review', 'final_tagging', 'closed') then
        raise exception 'This concern cannot be recovered to MRDSS review from its current stage.';
      end if;
      if length(action_note) < 8 then raise exception 'Add a recovery reason.'; end if;
      next_stage := 'mrdss_review'; next_status := 'Returned for Further Action';
      next_type := 'mrdss'; next_branch := null; next_area := null; next_user := null;
      next_routed_to := 'MRDSS';
      activity_type := 'Returned for Further Action';
      detail_text := action_note;

    when 'escalate_area' then
      if c.workflow_stage <> 'branch_review' or c.destination_type <> 'branch'
        or not public.is_assigned_branch_manager(c.destination_branch_id) then
        raise exception 'Only the assigned Branch Admin can escalate this concern to an Area Manager.';
      end if;
      select b.area_id into target_area_id
      from public.concern_branches b
      where b.id = c.destination_branch_id;
      if target_area_id is null then
        raise exception 'This branch is routed directly to the COO, not an Area Manager.';
      end if;
      select * into target_profile from public.profiles p
      where p.id = nullif(action_payload ->> 'userId', '')::uuid
        and p.role::text = 'area_manager_admin'
        and p.area_id = target_area_id
        and coalesce(p.status, 'Active') = 'Active';
      if target_profile.id is null then raise exception 'Choose an active Area Manager assigned to this branch area.'; end if;
      if length(action_note) < 8 then raise exception 'Record the reason and handoff instructions for escalation.'; end if;
      next_stage := 'area_manager_review'; next_status := 'In Review'; next_type := 'area_manager';
      next_area := target_area_id; next_branch := null; next_user := target_profile.id;
      next_routed_to := coalesce(nullif(trim(target_profile.full_name), ''), target_profile.email);
      activity_type := 'Area Manager escalation';
      detail_text := 'Escalated to ' || next_routed_to || ' for further assessment. ' || action_note;

    when 'escalate_coo' then
      if c.workflow_stage <> 'area_manager_review' or c.destination_type <> 'area_manager'
        or not public.is_area_manager_admin()
        or c.destination_area_id <> actor.area_id
        or (c.destination_user_id is not null and c.destination_user_id <> auth.uid()) then
        raise exception 'Only the assigned Area Manager can escalate this concern to the COO.';
      end if;
      select * into target_profile from public.profiles p
      where p.id = nullif(action_payload ->> 'userId', '')::uuid
        and p.role::text = 'coo_admin' and coalesce(p.status, 'Active') = 'Active';
      if target_profile.id is null then raise exception 'Choose an active COO account.'; end if;
      if length(action_note) < 8 then raise exception 'Record the reason and handoff instructions for escalation.'; end if;
      next_stage := 'coo_review'; next_status := 'In Review'; next_type := 'coo';
      next_area := null; next_branch := null; next_user := target_profile.id;
      next_routed_to := coalesce(nullif(trim(target_profile.full_name), ''), target_profile.email);
      activity_type := 'COO escalation';
      detail_text := 'Escalated to ' || next_routed_to || ' for executive review. ' || action_note;

    when 'resolve_case' then
      if length(trim(coalesce(action_payload ->> 'resolutionDetails', ''))) < 8 then
        raise exception 'Enter at least 8 characters of resolution details.';
      end if;
      if not (
        (public.is_mrdss_admin() and c.workflow_stage = 'mrdss_review')
        or (c.workflow_stage = 'branch_review' and public.is_assigned_branch_manager(c.destination_branch_id))
        or (c.workflow_stage = 'area_manager_review' and public.is_area_manager_admin()
          and c.destination_area_id = actor.area_id and (c.destination_user_id is null or c.destination_user_id = auth.uid()))
        or (c.workflow_stage = 'coo_review' and public.is_coo_admin()
          and (c.destination_user_id is null or c.destination_user_id = auth.uid()))
      ) then raise exception 'Your role cannot resolve this concern at its current stage.'; end if;
      next_stage := 'final_tagging'; next_status := 'Resolved'; next_type := 'final_tagging';
      next_branch := null; next_area := null; next_user := null; next_routed_to := 'MRDSS';
      next_resolution := trim(action_payload ->> 'resolutionDetails');
      next_resolved_by := auth.uid(); next_resolved_at := now();
      activity_type := 'Resolution forwarded';
      detail_text := next_resolution;

    when 'return_for_action' then
      if not public.is_mrdss_admin() or c.workflow_stage <> 'final_tagging' then
        raise exception 'Only MRDSS can return a resolved case for further action.';
      end if;
      if length(action_note) < 8 then raise exception 'Record why the resolution is being returned.'; end if;
      select * into previous_route from public.member_concern_route_events e
      where e.concern_id = c.id and e.to_type in ('branch', 'area_manager', 'coo')
      order by e.created_at desc limit 1;
      if previous_route.id is null then
        next_stage := 'mrdss_review'; next_type := 'mrdss'; next_branch := null; next_area := null; next_user := null; next_routed_to := 'MRDSS';
      elsif previous_route.to_type = 'branch' then
        next_stage := 'branch_review'; next_type := 'branch'; next_branch := previous_route.to_branch_id;
        next_area := (select b.area_id from public.concern_branches b where b.id = previous_route.to_branch_id);
        next_user := null; next_routed_to := (select b.branch_name from public.concern_branches b where b.id = previous_route.to_branch_id);
      elsif previous_route.to_type = 'area_manager' then
        next_stage := 'area_manager_review'; next_type := 'area_manager'; next_branch := null;
        next_area := previous_route.to_area_id; next_user := previous_route.to_user_id;
        next_routed_to := coalesce((select p.full_name from public.profiles p where p.id = previous_route.to_user_id), 'Area Manager');
      else
        next_stage := 'coo_review'; next_type := 'coo'; next_branch := null; next_area := null;
        next_user := previous_route.to_user_id;
        next_routed_to := coalesce((select p.full_name from public.profiles p where p.id = previous_route.to_user_id), 'COO');
      end if;
      next_status := 'Returned for Further Action'; next_closed_at := null;
      next_resolved_by := null; next_resolved_at := null;
      activity_type := 'Returned for Further Action';
      detail_text := action_note;

    when 'close_case' then
      if not public.is_mrdss_admin() or c.workflow_stage <> 'final_tagging' or c.status <> 'Resolved' then
        raise exception 'Only MRDSS can close a concern after final review.';
      end if;
      if length(trim(coalesce(c.resolution_details, ''))) < 8 or c.resolved_at is null then
        raise exception 'The handling officer must submit resolution details before final tagging.';
      end if;
      next_tag := trim(coalesce(action_payload ->> 'resolutionTag', ''));
      next_closure := trim(coalesce(action_payload ->> 'closureRemarks', ''));
      if next_tag = '' then raise exception 'A final tag is required before closure.'; end if;
      if length(next_closure) < 8 then raise exception 'Add closure remarks before closing the concern.'; end if;
      next_status := 'Closed'; next_stage := 'closed'; next_type := 'closed';
      next_branch := null; next_area := null; next_user := null; next_routed_to := 'MRDSS'; next_closed_at := now();
      activity_type := 'Case closed';
      detail_text := 'Final tag: ' || next_tag || '. Closure remarks: ' || next_closure;

    when 'reopen_case' then
      if actor.role::text <> 'superadmin' or c.workflow_stage <> 'closed' then
        raise exception 'Only the superadmin can reopen a closed concern.';
      end if;
      if length(action_note) < 8 then raise exception 'Record the reason for reopening this concern.'; end if;
      select * into previous_route from public.member_concern_route_events e
      where e.concern_id = c.id and e.to_type in ('branch', 'area_manager', 'coo')
      order by e.created_at desc limit 1;
      if previous_route.id is null then
        next_stage := 'mrdss_review'; next_type := 'mrdss'; next_branch := null; next_area := null; next_user := null; next_routed_to := 'MRDSS';
      elsif previous_route.to_type = 'branch' then
        next_stage := 'branch_review'; next_type := 'branch'; next_branch := previous_route.to_branch_id;
        next_area := (select b.area_id from public.concern_branches b where b.id = previous_route.to_branch_id);
        next_user := null; next_routed_to := (select b.branch_name from public.concern_branches b where b.id = previous_route.to_branch_id);
      elsif previous_route.to_type = 'area_manager' then
        next_stage := 'area_manager_review'; next_type := 'area_manager'; next_branch := null;
        next_area := previous_route.to_area_id; next_user := previous_route.to_user_id;
        next_routed_to := coalesce((select p.full_name from public.profiles p where p.id = previous_route.to_user_id), 'Area Manager');
      else
        next_stage := 'coo_review'; next_type := 'coo'; next_branch := null; next_area := null;
        next_user := previous_route.to_user_id;
        next_routed_to := coalesce((select p.full_name from public.profiles p where p.id = previous_route.to_user_id), 'COO');
      end if;
      next_status := 'Returned for Further Action'; next_closed_at := null;
      activity_type := 'Case reopened';
      detail_text := action_note;

    else
      raise exception 'Unsupported concern action.';
  end case;

  route_changed := old_type is distinct from next_type
    or old_branch is distinct from next_branch
    or old_area is distinct from next_area
    or old_user is distinct from next_user;

  update public.member_concerns
  set status = next_status,
      workflow_stage = next_stage,
      destination_type = next_type,
      destination_branch_id = next_branch,
      destination_area_id = next_area,
      destination_user_id = next_user,
      routed_to = next_routed_to,
      resolution_details = next_resolution,
      resolution_tag = next_tag,
      closure_remarks = next_closure,
      assigned_staff_id = next_assignee,
      priority = next_priority,
      closed_at = next_closed_at,
      resolved_at = next_resolved_at,
      resolved_by = next_resolved_by,
      activities = coalesce(activities, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
        'id', gen_random_uuid()::text,
        'type', activity_type,
        'detail', detail_text,
        'actor', coalesce(nullif(trim(actor.full_name), ''), actor.email),
        'actorId', actor.id,
        'actorRole', actor.role::text,
        'visibility', 'internal',
        'route', case when route_changed then jsonb_build_object(
          'fromType', old_type, 'fromBranchId', old_branch, 'fromAreaId', old_area, 'fromUserId', old_user,
          'toType', next_type, 'toBranchId', next_branch, 'toAreaId', next_area, 'toUserId', next_user
        ) else null end,
        'at', now()
      ))
  where id = c.id
  returning * into c;

  if route_changed then
    perform public.record_member_concern_route(
      c.id, old_type, old_branch, old_area, old_user,
      next_type, next_branch, next_area, next_user, action_note
    );
  end if;

  return c;
end;
$$;

update public.member_concerns c
set activities = (
  select coalesce(jsonb_agg(
    case
      when activity.value ->> 'type' = 'Ticket reopened' then
        jsonb_set(activity.value, '{type}', to_jsonb('Case reopened'::text))
      when activity.value ? 'route'
        and (
          activity.value #>> '{route,fromType}',
          activity.value #>> '{route,fromBranchId}',
          activity.value #>> '{route,fromAreaId}',
          activity.value #>> '{route,fromUserId}'
        ) is not distinct from (
          activity.value #>> '{route,toType}',
          activity.value #>> '{route,toBranchId}',
          activity.value #>> '{route,toAreaId}',
          activity.value #>> '{route,toUserId}'
        ) then activity.value - 'route'
      else activity.value
    end
    order by activity.ordinality
  ) filter (
    where not (
      activity.value ->> 'type' = 'Ticket closed'
      and exists (
        select 1
        from jsonb_array_elements(coalesce(c.activities, '[]'::jsonb)) prior(value)
        where prior.value ->> 'type' = 'Final tagging completed'
      )
    )
  ), '[]'::jsonb)
  from jsonb_array_elements(coalesce(c.activities, '[]'::jsonb)) with ordinality activity(value, ordinality)
)
where jsonb_typeof(c.activities) = 'array'
  and exists (
    select 1
    from jsonb_array_elements(coalesce(c.activities, '[]'::jsonb)) activity(value)
    where activity.value ->> 'type' = 'Ticket reopened'
      or (activity.value ? 'route' and (
        activity.value #>> '{route,fromType}',
        activity.value #>> '{route,fromBranchId}',
        activity.value #>> '{route,fromAreaId}',
        activity.value #>> '{route,fromUserId}'
      ) is not distinct from (
        activity.value #>> '{route,toType}',
        activity.value #>> '{route,toBranchId}',
        activity.value #>> '{route,toAreaId}',
        activity.value #>> '{route,toUserId}'
      ))
      or (activity.value ->> 'type' = 'Ticket closed' and exists (
        select 1
        from jsonb_array_elements(coalesce(c.activities, '[]'::jsonb)) prior(value)
        where prior.value ->> 'type' = 'Final tagging completed'
      ))
  );

drop policy if exists "Branch managers can read routed concern attachments" on storage.objects;
drop policy if exists "MRDSS admins can read member concern attachments" on storage.objects;
drop policy if exists "Authorized users can read member concern attachments" on storage.objects;
create policy "Authorized users can read member concern attachments"
on storage.objects for select to authenticated
using (
  bucket_id = 'member-concern-attachments'
  and public.is_member_concern_visible((storage.foldername(name))[1])
);

revoke all on function public.is_area_manager_admin() from public, anon;
revoke all on function public.is_coo_admin() from public, anon;
revoke all on function public.is_member_concern_visible(text) from public, anon;
revoke all on function public.can_handle_member_concern(text) from public, anon;
revoke all on function public.append_member_concern_activity(text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.record_member_concern_route(text, text, text, text, uuid, text, text, text, uuid, text) from public, anon, authenticated;
revoke all on function public.perform_member_concern_action(text, text, jsonb) from public, anon, authenticated;
revoke all on function public.get_concern_area_managers(text) from public, anon;
revoke all on function public.get_concern_coo_users(text) from public, anon;
revoke all on function public.get_member_concern_escalation_route(text) from public, anon;
revoke all on function public.escalate_member_concern_branch_to_coo(text, uuid, text) from public, anon, authenticated;
revoke all on function public.prevent_coo_only_area_escalation() from public, anon, authenticated;
revoke all on function public.get_mrdss_branch_destinations() from public, anon;
revoke all on function public.get_member_concern_branches() from public;

grant execute on function public.is_area_manager_admin() to authenticated;
grant execute on function public.is_coo_admin() to authenticated;
grant execute on function public.is_member_concern_visible(text) to authenticated;
grant execute on function public.can_handle_member_concern(text) to authenticated;
grant execute on function public.perform_member_concern_action(text, text, jsonb) to authenticated;
grant execute on function public.get_concern_area_managers(text) to authenticated;
grant execute on function public.get_concern_coo_users(text) to authenticated;
grant execute on function public.get_member_concern_escalation_route(text) to authenticated;
grant execute on function public.escalate_member_concern_branch_to_coo(text, uuid, text) to authenticated;
grant execute on function public.get_mrdss_branch_destinations() to authenticated;
grant execute on function public.get_member_concern_branches() to anon, authenticated;

alter table public.member_concerns replica identity full;
notify pgrst, 'reload schema';

-- Re-assert active-account checks after applying the consolidated workflow migration.
create or replace function public.is_member_concern_visible(target_concern_id text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  actor public.profiles;
  branch_id text;
begin
  if not public.has_valid_portal_session() then
    return false;
  end if;
  if public.is_mrdss_admin() then
    return true;
  end if;

  select * into actor from public.profiles where id = auth.uid();
  if actor.id is null or coalesce(actor.status, 'Active') <> 'Active' then
    return false;
  end if;
  branch_id := public.resolve_concern_branch_id(actor.branch);
  return exists (
    select 1
    from public.member_concerns c
    where c.id = target_concern_id
      and (
        (actor.role::text = 'branch_manager_admin'
          and c.destination_type = 'branch'
          and c.destination_branch_id = branch_id)
        or (actor.role::text = 'area_manager_admin'
          and c.destination_type = 'area_manager'
          and c.destination_area_id = actor.area_id
          and (c.destination_user_id is null or c.destination_user_id = auth.uid()))
        or (actor.role::text = 'coo_admin'
          and c.destination_type = 'coo'
          and (c.destination_user_id is null or c.destination_user_id = auth.uid()))
      )
  ) or exists (
    select 1
    from public.member_concern_route_events e
    where e.concern_id = target_concern_id
      and (
        (actor.role::text = 'branch_manager_admin'
          and e.to_type = 'branch'
          and e.to_branch_id = branch_id)
        or (actor.role::text = 'area_manager_admin'
          and e.to_type = 'area_manager'
          and e.to_area_id = actor.area_id
          and (e.to_user_id is null or e.to_user_id = auth.uid()))
        or (actor.role::text = 'coo_admin'
          and e.to_type = 'coo'
          and (e.to_user_id is null or e.to_user_id = auth.uid()))
      )
  );
end;
$$;
notify pgrst, 'reload schema';

create or replace function public.member_concern_business_days_elapsed(
  start_at timestamptz,
  end_at timestamptz
)
returns integer
language sql
immutable
set search_path = public
as $$
  select count(*)::integer
  from generate_series(
    ((start_at at time zone 'Asia/Manila')::date + 1)::timestamp,
    ((end_at at time zone 'Asia/Manila')::date)::timestamp,
    interval '1 day'
  ) as workday(day)
  where extract(isodow from workday.day) between 1 and 5;
$$;

create or replace function public.record_member_concern_final_notice(
  target_concern_id text,
  contact_method text,
  note text default ''
)
returns public.member_concerns
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.member_concerns;
  actor public.profiles;
  no_response_count integer := 0;
  first_no_response_at timestamptz;
  existing_eligible_notice_at timestamptz;
  trimmed_note text := trim(coalesce(note, ''));
begin
  if auth.uid() is null or not public.has_valid_portal_session() then
    raise exception 'A valid portal session is required.';
  end if;

  select * into actor from public.profiles p
  where p.id = auth.uid() and coalesce(p.status, 'Active') = 'Active';
  if actor.id is null then
    raise exception 'An active portal profile is required.';
  end if;

  select * into c from public.member_concerns where id = target_concern_id for update;
  if c.id is null or c.workflow_stage not in ('mrdss_review', 'branch_review', 'area_manager_review', 'coo_review')
    or not public.can_handle_member_concern(target_concern_id) then
    raise exception 'Only the current case handler can send a final contact notice.';
  end if;
  if contact_method not in ('Text', 'Call', 'Email')
    or (contact_method = 'Email' and nullif(trim(c.email), '') is null)
    or (contact_method in ('Text', 'Call') and nullif(trim(c.phone), '') is null) then
    raise exception 'Choose a contact method with details provided by the member.';
  end if;
  if length(trimmed_note) > 300 then
    raise exception 'The final notice note cannot exceed 300 characters.';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(coalesce(c.activities, '[]'::jsonb)) activity(value)
    where activity.value ->> 'type' = 'First response'
      or (activity.value ->> 'type' = 'Contact'
        and coalesce(activity.value ->> 'detail', '') ~* 'follow-up logged:[[:space:]]*(member reached|follow-up requested)')
  ) then
    raise exception 'A successful member contact is recorded; final notice closure is not available.';
  end if;

  select count(*)::integer, min(nullif(activity.value ->> 'at', '')::timestamptz)
  into no_response_count, first_no_response_at
  from jsonb_array_elements(coalesce(c.activities, '[]'::jsonb)) activity(value)
  where activity.value ->> 'type' = 'Contact'
    and coalesce(activity.value ->> 'detail', '') ~* 'follow-up logged:[[:space:]]*no response';

  if no_response_count < 3 or first_no_response_at is null then
    raise exception 'Log at least three no-response attempts before sending a final notice.';
  end if;
  if public.member_concern_business_days_elapsed(first_no_response_at, now()) < 5 then
    raise exception 'Wait five business days from the first no-response attempt before sending a final notice.';
  end if;
  select min(nullif(activity.value ->> 'at', '')::timestamptz)
  into existing_eligible_notice_at
  from jsonb_array_elements(coalesce(c.activities, '[]'::jsonb)) activity(value)
  where activity.value ->> 'type' = 'Final notice'
    and public.member_concern_business_days_elapsed(
      first_no_response_at,
      nullif(activity.value ->> 'at', '')::timestamptz
    ) >= 5;
  if existing_eligible_notice_at is not null then
    raise exception 'A qualifying final notice has already been recorded.';
  end if;

  update public.member_concerns
  set activities = coalesce(activities, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
        'id', gen_random_uuid()::text,
        'type', 'Final notice',
        'detail', contact_method || ' final notice sent after ' || no_response_count || ' documented no-response attempts.'
          || case when trimmed_note = '' then '' else ' ' || trimmed_note end,
        'actor', coalesce(nullif(trim(actor.full_name), ''), actor.email),
        'actorId', actor.id,
        'actorRole', actor.role::text,
        'visibility', 'internal',
        'at', now()
      )),
      updated_at = now()
  where id = c.id
  returning * into c;

  return c;
end;
$$;

create or replace function public.close_member_concern_unreachable(target_concern_id text)
returns public.member_concerns
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.member_concerns;
  actor public.profiles;
  no_response_count integer := 0;
  first_no_response_at timestamptz;
  final_notice_detail text;
  final_notice_at timestamptz;
  final_notice_channel text;
  old_type text;
  old_branch text;
  old_area text;
  old_user uuid;
  close_detail text;
  closure_note text;
begin
  if auth.uid() is null or not public.has_valid_portal_session() then
    raise exception 'A valid portal session is required.';
  end if;

  select * into actor from public.profiles p
  where p.id = auth.uid() and coalesce(p.status, 'Active') = 'Active';
  if actor.id is null then
    raise exception 'An active portal profile is required.';
  end if;

  select * into c from public.member_concerns where id = target_concern_id for update;
  if c.id is null or c.workflow_stage not in ('mrdss_review', 'branch_review', 'area_manager_review', 'coo_review')
    or not public.can_handle_member_concern(target_concern_id) then
    raise exception 'Only the current case handler can close an active case as unable to contact.';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(coalesce(c.activities, '[]'::jsonb)) activity(value)
    where activity.value ->> 'type' = 'First response'
      or (activity.value ->> 'type' = 'Contact'
        and coalesce(activity.value ->> 'detail', '') ~* 'follow-up logged:[[:space:]]*(member reached|follow-up requested)')
  ) then
    raise exception 'A successful member contact is recorded; this case cannot be closed as unable to contact.';
  end if;

  select count(*)::integer, min(nullif(activity.value ->> 'at', '')::timestamptz)
  into no_response_count, first_no_response_at
  from jsonb_array_elements(coalesce(c.activities, '[]'::jsonb)) activity(value)
  where activity.value ->> 'type' = 'Contact'
    and coalesce(activity.value ->> 'detail', '') ~* 'follow-up logged:[[:space:]]*no response';

  if no_response_count < 3 or first_no_response_at is null then
    raise exception 'At least three documented no-response attempts are required.';
  end if;

  select activity.value ->> 'detail', nullif(activity.value ->> 'at', '')::timestamptz
  into final_notice_detail, final_notice_at
  from jsonb_array_elements(coalesce(c.activities, '[]'::jsonb)) activity(value)
  where activity.value ->> 'type' = 'Final notice'
    and public.member_concern_business_days_elapsed(
      first_no_response_at,
      nullif(activity.value ->> 'at', '')::timestamptz
    ) >= 5
  order by nullif(activity.value ->> 'at', '')::timestamptz
  limit 1;

  if final_notice_at is null then
    raise exception 'Wait five business days, then record a final notice before closing this case.';
  end if;

  old_type := c.destination_type;
  old_branch := c.destination_branch_id;
  old_area := c.destination_area_id;
  old_user := c.destination_user_id;
  final_notice_channel := nullif(split_part(final_notice_detail, ' final notice sent', 1), '');
  closure_note := format(
    'Closed as unable to contact after %s unsuccessful contact attempts over at least five business days. Final notice sent via %s on %s; no response was received from the member.',
    no_response_count,
    coalesce(final_notice_channel, 'the recorded channel'),
    to_char(final_notice_at at time zone 'Asia/Manila', 'Mon DD, YYYY')
  );
  close_detail := format(
    'Closed without resolution after %s documented no-response attempts, five business days of follow-up, and a final notice sent via %s.',
    no_response_count,
    coalesce(final_notice_channel, 'the recorded channel')
  );

  update public.member_concerns
  set status = 'Closed',
      workflow_stage = 'closed',
      destination_type = 'closed',
      destination_branch_id = null,
      destination_area_id = null,
      destination_user_id = null,
      routed_to = 'MRDSS',
      resolution_tag = '',
      resolution_details = '',
      resolved_at = null,
      resolved_by = null,
      closure_outcome = 'unable_to_contact',
      closure_remarks = closure_note,
      closed_at = now(),
      activities = coalesce(activities, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
        'id', gen_random_uuid()::text,
        'type', 'Case closed - Unable to contact',
        'detail', close_detail,
        'actor', coalesce(nullif(trim(actor.full_name), ''), actor.email),
        'actorId', actor.id,
        'actorRole', actor.role::text,
        'visibility', 'internal',
        'route', jsonb_build_object(
          'fromType', old_type, 'fromBranchId', old_branch, 'fromAreaId', old_area, 'fromUserId', old_user,
          'toType', 'closed', 'toBranchId', null, 'toAreaId', null, 'toUserId', null
        ),
        'at', now()
      )),
      updated_at = now()
  where id = c.id
  returning * into c;

  perform public.record_member_concern_route(
    c.id, old_type, old_branch, old_area, old_user,
    'closed', null, null, null, 'Closed due to inability to contact the member.'
  );

  return c;
end;
$$;

create or replace function public.reopen_unreachable_member_concern(
  target_concern_id text,
  reopen_remarks text
)
returns public.member_concerns
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.member_concerns;
  actor public.profiles;
  previous_route public.member_concern_route_events;
  next_stage text := 'mrdss_review';
  next_type text := 'mrdss';
  next_branch text;
  next_area text;
  next_user uuid;
  next_routed_to text := 'MRDSS';
  note text := trim(coalesce(reopen_remarks, ''));
begin
  if auth.uid() is null or not public.has_valid_portal_session() or not public.is_mrdss_admin() then
    raise exception 'Only MRDSS can reopen an unable-to-contact case.';
  end if;
  if length(note) < 8 then
    raise exception 'Record at least 8 characters explaining why this case is being reopened.';
  end if;

  select * into actor from public.profiles p
  where p.id = auth.uid() and coalesce(p.status, 'Active') = 'Active';
  select * into c from public.member_concerns where id = target_concern_id for update;
  if actor.id is null or c.id is null or c.workflow_stage <> 'closed' or c.closure_outcome <> 'unable_to_contact' then
    raise exception 'Only a case closed as unable to contact can be reopened through this action.';
  end if;

  select * into previous_route
  from public.member_concern_route_events e
  where e.concern_id = c.id and e.to_type in ('mrdss', 'branch', 'area_manager', 'coo')
  order by e.created_at desc
  limit 1;

  if previous_route.id is not null then
    case previous_route.to_type
      when 'branch' then
        next_stage := 'branch_review';
        next_type := 'branch';
        next_branch := previous_route.to_branch_id;
        next_area := coalesce(previous_route.to_area_id, (select b.area_id from public.concern_branches b where b.id = previous_route.to_branch_id));
        next_routed_to := coalesce((select b.branch_name from public.concern_branches b where b.id = previous_route.to_branch_id), c.branch);
      when 'area_manager' then
        next_stage := 'area_manager_review';
        next_type := 'area_manager';
        next_area := previous_route.to_area_id;
        next_user := previous_route.to_user_id;
        next_routed_to := coalesce((select p.full_name from public.profiles p where p.id = previous_route.to_user_id), 'Area Manager');
      when 'coo' then
        next_stage := 'coo_review';
        next_type := 'coo';
        next_user := previous_route.to_user_id;
        next_routed_to := coalesce((select p.full_name from public.profiles p where p.id = previous_route.to_user_id), 'COO');
      else
        next_stage := 'mrdss_review';
        next_type := 'mrdss';
        next_routed_to := 'MRDSS';
    end case;
  end if;

  update public.member_concerns
  set status = 'Returned for Further Action',
      workflow_stage = next_stage,
      destination_type = next_type,
      destination_branch_id = next_branch,
      destination_area_id = next_area,
      destination_user_id = next_user,
      routed_to = next_routed_to,
      resolution_tag = '',
      resolution_details = '',
      resolved_at = null,
      resolved_by = null,
      closure_outcome = null,
      closure_remarks = '',
      closed_at = null,
      activities = coalesce(activities, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
        'id', gen_random_uuid()::text,
        'type', 'Reopened after member response',
        'detail', note,
        'actor', coalesce(nullif(trim(actor.full_name), ''), actor.email),
        'actorId', actor.id,
        'actorRole', actor.role::text,
        'visibility', 'internal',
        'route', jsonb_build_object(
          'fromType', c.destination_type, 'fromBranchId', c.destination_branch_id, 'fromAreaId', c.destination_area_id, 'fromUserId', c.destination_user_id,
          'toType', next_type, 'toBranchId', next_branch, 'toAreaId', next_area, 'toUserId', next_user
        ),
        'at', now()
      )),
      updated_at = now()
  where id = c.id
  returning * into c;

  perform public.record_member_concern_route(
    c.id, 'closed', null, null, null,
    next_type, next_branch, next_area, next_user, note
  );

  return c;
end;
$$;

revoke all on function public.member_concern_business_days_elapsed(timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.record_member_concern_final_notice(text, text, text) from public, anon, authenticated;
revoke all on function public.close_member_concern_unreachable(text) from public, anon, authenticated;
revoke all on function public.reopen_unreachable_member_concern(text, text) from public, anon, authenticated;
grant execute on function public.record_member_concern_final_notice(text, text, text) to authenticated;
grant execute on function public.close_member_concern_unreachable(text) to authenticated;
grant execute on function public.reopen_unreachable_member_concern(text, text) to authenticated;

notify pgrst, 'reload schema';


-- =====================================================
-- MARKETING WORKFLOW EXTENSIONS
-- =====================================================

-- MARKETING WORKFLOW EXTENSIONS (also available as a standalone upgrade migration).

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

-- =====================================================
-- CONSOLIDATED ICT HELPDESK HARDENING
-- Keep in sync with ict_helpdesk_hardening_migration.sql for existing deployments.
-- =====================================================
-- ICT HELPDESK HARDENING (included for new deployments; standalone migration is for existing deployments).
begin;

create or replace function public.try_parse_helpdesk_timestamp(value text)
returns timestamptz
language plpgsql immutable set search_path = public as $$
begin
  return nullif(trim(value),'')::timestamptz;
exception when others then
  return null;
end;
$$;
revoke all on function public.try_parse_helpdesk_timestamp(text) from public, anon, authenticated;

alter table public.tickets
  add column if not exists version bigint not null default 1,
  add column if not exists creation_key uuid,
  add column if not exists last_actor_id uuid,
  add column if not exists action_reason text not null default '',
  add column if not exists next_action_at timestamptz,
  add column if not exists escalation_partner text not null default '',
  add column if not exists handling_seconds bigint not null default 0,
  add column if not exists burnout_started_at timestamptz,
  add column if not exists response_due_at timestamptz,
  add column if not exists resolution_due_at timestamptz,
  add column if not exists first_response_at timestamptz,
  add column if not exists resolved_at timestamptz,
  add column if not exists escalation_partner_company text not null default '',
  add column if not exists technician_id uuid references public.profiles(id) on delete set null,
  add column if not exists private_note_update jsonb;
comment on column public.tickets.response_due_at is 'First human ICT response target, measured in calendar hours from submission.';
comment on column public.tickets.resolution_due_at is 'Resolution target, measured in calendar hours from submission.';
create unique index if not exists tickets_creation_key_idx on public.tickets(owner_id, creation_key) where creation_key is not null;
create index if not exists tickets_technician_id_idx on public.tickets(technician_id) where technician_id is not null;
update public.tickets t
set technician_id = (
  select p.id
  from public.profiles p
  where p.role::text in ('admin', 'superadmin')
    and lower(trim(p.full_name)) = lower(trim(t.technician))
  order by (p.status = 'Active') desc, p.id
  limit 1
)
where t.technician_id is null
  and nullif(trim(t.technician), '') is not null
  and lower(trim(t.technician)) <> 'unassigned';
alter table public.ticket_status_events
  add column if not exists technician_id uuid references public.profiles(id) on delete set null;
create index if not exists ticket_status_events_technician_created_idx
  on public.ticket_status_events(technician_id, created_at desc) where technician_id is not null;
create or replace function public.normalize_helpdesk_sla_level(value text)
returns text
language sql
immutable
set search_path = public
as $$
  select case lower(trim(coalesce(value, '')))
    when 'critical' then 'Critical'
    when 'high' then 'High'
    when 'medium' then 'Medium'
    else 'Low'
  end;
$$;
revoke all on function public.normalize_helpdesk_sla_level(text) from public, anon, authenticated;

create or replace function public.helpdesk_sla_target_hours(priority_value text, target_type text)
returns integer
language sql
immutable
set search_path = public
as $$
  select case public.normalize_helpdesk_sla_level(priority_value)
    when 'Critical' then 8
    when 'High' then 24
    when 'Medium' then case when lower(coalesce(target_type, '')) = 'response' then 24 else 72 end
    else case when lower(coalesce(target_type, '')) = 'response' then 72 else 120 end
  end;
$$;
revoke all on function public.helpdesk_sla_target_hours(text, text) from public, anon, authenticated;

create or replace function public.sync_helpdesk_ticket_sla_priority()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sla_level text := public.normalize_helpdesk_sla_level(new.sla);
  priority_level text := public.normalize_helpdesk_sla_level(new.priority);
  canonical_level text;
begin
  if tg_op = 'UPDATE'
    and new.sla is distinct from old.sla
    and new.priority is not distinct from old.priority then
    canonical_level := sla_level;
  elsif tg_op = 'UPDATE'
    and new.priority is distinct from old.priority
    and new.sla is not distinct from old.sla then
    canonical_level := priority_level;
  elsif sla_level = 'Low' and priority_level <> 'Low' then
    canonical_level := priority_level;
  else
    canonical_level := sla_level;
  end if;

  new.sla := canonical_level;
  new.priority := canonical_level;
  return new;
end;
$$;
revoke all on function public.sync_helpdesk_ticket_sla_priority() from public, anon, authenticated;

drop trigger if exists tickets_00_a_sla_sync on public.tickets;
create trigger tickets_00_a_sla_sync
before insert or update on public.tickets
for each row execute function public.sync_helpdesk_ticket_sla_priority();

with canonical_ticket_sla as (
  select t.id,
    case
      when public.normalize_helpdesk_sla_level(t.sla) = 'Low'
        and public.normalize_helpdesk_sla_level(t.priority) <> 'Low'
        then public.normalize_helpdesk_sla_level(t.priority)
      else public.normalize_helpdesk_sla_level(t.sla)
    end as sla_level
  from public.tickets t
)
update public.tickets t
set sla = canonical.sla_level,
    priority = canonical.sla_level,
    response_due_at = t.created_at + make_interval(hours => public.helpdesk_sla_target_hours(canonical.sla_level, 'response')),
    resolution_due_at = t.created_at + make_interval(hours => public.helpdesk_sla_target_hours(canonical.sla_level, 'resolution')),
    burnout_started_at = case when lower(t.support_category) = 'burnout' and lower(t.status) = 'under burnout' then coalesce(t.burnout_started_at,public.try_parse_helpdesk_timestamp(t.work_started_at),t.created_at) else t.burnout_started_at end
from canonical_ticket_sla canonical
where canonical.id = t.id
  and (
    t.sla is distinct from canonical.sla_level
    or t.priority is distinct from canonical.sla_level
    or t.response_due_at is distinct from t.created_at + make_interval(hours => public.helpdesk_sla_target_hours(canonical.sla_level, 'response'))
    or t.resolution_due_at is distinct from t.created_at + make_interval(hours => public.helpdesk_sla_target_hours(canonical.sla_level, 'resolution'))
    or (lower(t.support_category) = 'burnout' and lower(t.status) = 'under burnout' and t.burnout_started_at is null)
  );
update public.tickets
set handling_seconds = greatest(0,extract(epoch from (public.try_parse_helpdesk_timestamp(work_ended_at)-public.try_parse_helpdesk_timestamp(work_started_at))))::bigint
where handling_seconds = 0 and public.try_parse_helpdesk_timestamp(work_started_at) is not null and public.try_parse_helpdesk_timestamp(work_ended_at) is not null;

alter table public.tickets drop constraint if exists tickets_owner_id_fkey;
alter table public.tickets alter column owner_id drop not null;
alter table public.tickets add constraint tickets_owner_id_fkey foreign key(owner_id) references public.profiles(id) on delete set null;
alter table public.ticket_messages drop constraint if exists ticket_messages_sender_id_fkey;
alter table public.ticket_messages alter column sender_id drop not null;
alter table public.ticket_messages add constraint ticket_messages_sender_id_fkey foreign key(sender_id) references public.profiles(id) on delete set null;

create table if not exists public.ticket_internal_notes (
  ticket_id text primary key references public.tickets(id) on delete cascade,
  body text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.ticket_internal_notes enable row level security;
revoke all on public.ticket_internal_notes from public, anon, authenticated;
grant all on public.ticket_internal_notes to service_role;
insert into public.ticket_internal_notes(ticket_id, body)
select id, admin_remarks from public.tickets where nullif(trim(admin_remarks), '') is not null
on conflict(ticket_id) do nothing;
update public.tickets set admin_remarks = '' where admin_remarks <> '';

create or replace function public.get_my_ticket_queue_status()
returns table(ticket_id text, queue_position integer, queue_size integer)
language sql stable security definer set search_path = public as $$
  with waiting_tickets as (
    select t.id, t.owner_id,
      (row_number() over (
        order by case lower(coalesce(nullif(trim(t.priority), ''), nullif(trim(t.sla), ''), 'low'))
          when 'critical' then 1 when 'high' then 2 when 'medium' then 3 else 4 end,
          t.created_at asc, t.id asc
      ))::integer as queue_position,
      (count(*) over ())::integer as queue_size
    from public.tickets t
    where trim(lower(regexp_replace(regexp_replace(coalesce(t.status, ''), '[-_]+', ' ', 'g'), '[[:space:]]+', ' ', 'g')))
        in ('created', 'submitted', 'pending', 'modified')
      and lower(coalesce(nullif(trim(t.technician), ''), 'unassigned')) = 'unassigned'
      and t.technician_id is null
      and t.work_started_at is null
      and nullif(trim(coalesce(t.action_taken, '')), '') is null
      and not exists (
        select 1 from public.ticket_internal_notes n
        where n.ticket_id = t.id and nullif(trim(n.body), '') is not null
      )
      and nullif(trim(coalesce(t.resolution, '')), '') is null
      and nullif(trim(coalesce(t.recommendation, '')), '') is null
      and lower(trim(coalesce(t.support_category, ''))) <> 'burnout'
      and (t.locked_by is null or t.lock_expires_at is null or t.lock_expires_at <= now())
  )
  select w.id, w.queue_position, w.queue_size
  from waiting_tickets w
  where w.owner_id = auth.uid() and public.has_valid_portal_session();
$$;
revoke all on function public.get_my_ticket_queue_status() from public, anon;
grant execute on function public.get_my_ticket_queue_status() to authenticated;

create or replace function public.has_complete_burnout_report(report jsonb)
returns boolean
language sql immutable set search_path = public as $$
  select
    coalesce(jsonb_typeof(report->'testingChecklist') = 'array', false)
    and not exists (
      select 1 from (values
        ('physical-inspection'),('power-test'),('bios-check'),('cpu-stress-test'),('memory-test'),('storage-test'),
        ('temperature-monitoring'),('usb-ports'),('keyboard'),('mouse-touchpad'),('display-monitor'),('network-test'),('audio-test'),('camera-test')
      ) required(id)
      where not exists (
        select 1 from jsonb_array_elements(case when jsonb_typeof(report->'testingChecklist') = 'array' then report->'testingChecklist' else '[]'::jsonb end) item
        where item->>'id' = required.id
          and (item->>'status' = 'Pass' or (item->>'status' = 'N/A' and length(trim(coalesce(item->>'remarks',''))) >= 8))
      )
    )
    and not exists (
      select 1 from (values
        ('operating-system'),('windows-update'),('device-drivers'),('antivirus-endpoint-security'),
        ('office-productivity'),('pdf-reader'),('web-browser'),('gpedit-msc')
      ) required(id)
      where not exists (
        select 1 from jsonb_array_elements(case when jsonb_typeof(report->'softwareChecklist') = 'array' then report->'softwareChecklist' else '[]'::jsonb end) item
        where item->>'id' = required.id and item->>'installed' = 'true'
      )
    )
    and not exists (
      select 1 from (values
        ('system-stability'),('system-temperature'),('unexpected-shutdown'),('error-messages'),('performance-issues')
      ) required(id)
      where not exists (
        select 1 from jsonb_array_elements(case when jsonb_typeof(report->'monitoring') = 'array' then report->'monitoring' else '[]'::jsonb end) item
        where item->>'id' = required.id
          and nullif(trim(item->>'result'),'') is not null
          and lower(trim(item->>'result')) <> 'not recorded'
          and length(trim(coalesce(item->>'remarks',''))) >= 8
      )
    )
    and not exists (
      select 1 from (values ('hardware-condition'),('software-installation')) required(id)
      where not exists (
        select 1 from jsonb_array_elements(case when jsonb_typeof(report->'finalEvaluation') = 'array' then report->'finalEvaluation' else '[]'::jsonb end) item
        where item->>'id' = required.id
          and nullif(trim(item->>'status'),'') is not null
          and lower(trim(item->>'status')) <> 'not recorded'
          and length(trim(coalesce(item->>'remarks',''))) >= 8
      )
    );
$$;
revoke all on function public.has_complete_burnout_report(jsonb) from public, anon, authenticated;

create or replace function public.has_valid_portal_session() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.portal_session_state s join public.profiles p on p.id = s.user_id
    where s.user_id = auth.uid() and s.session_id = public.current_portal_session_id()
      and s.expires_at > now() and p.status = 'Active'
  ) and public.is_current_auth_session();
$$;

create or replace function public.protect_portal_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and coalesce(auth.role(), '') <> 'service_role'
    and (new.role is distinct from old.role or new.status is distinct from old.status) then
    raise exception 'Role and account-status changes require the authorized account API.';
  end if;
  if new.status <> 'Active' then
    delete from public.portal_session_state where user_id = new.id;
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_protect_privileges on public.profiles;
create trigger profiles_protect_privileges before update on public.profiles for each row execute function public.protect_portal_profile();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id,role,full_name,employee_id,department,branch,office,designation,email,phone,status)
  values (
    new.id,'employee',
    coalesce(new.raw_user_meta_data->>'name',new.raw_user_meta_data->>'full_name',split_part(coalesce(new.email,''),'@',1),'MEMPCO User'),
    new.raw_user_meta_data->>'employee_id',new.raw_user_meta_data->>'department',new.raw_user_meta_data->>'branch',
    coalesce(new.raw_user_meta_data->>'office',new.raw_user_meta_data->>'branch'),new.raw_user_meta_data->>'designation',
    coalesce(new.email,'missing-email-'||new.id::text||'@mempco.local'),new.raw_user_meta_data->>'phone','Active'
  )
  on conflict(id) do update set
    email=excluded.email,full_name=excluded.full_name,employee_id=excluded.employee_id,department=excluded.department,
    branch=excluded.branch,office=excluded.office,designation=excluded.designation,phone=excluded.phone,updated_at=now();
  return new;
end;
$$;

revoke insert, update, delete on public.tickets from authenticated;
revoke insert, update, delete on public.ticket_messages from authenticated;
revoke insert on public.ticket_status_events from authenticated;

create or replace function public.get_helpdesk_internal_notes(ticket_ids text[])
returns table(ticket_id text, body text) language sql stable security definer set search_path = public as $$
  select n.ticket_id, n.body from public.ticket_internal_notes n
  where public.is_admin() and n.ticket_id = any(ticket_ids);
$$;
revoke all on function public.get_helpdesk_internal_notes(text[]) from public, anon;
grant execute on function public.get_helpdesk_internal_notes(text[]) to authenticated;

-- Keep the legacy sequence synchronized; new IDs reuse the lowest available current-year number.
select setval('public.ticket_number_seq',
  case when exists(select 1 from public.tickets)
    then greatest((select last_value from public.ticket_number_seq),coalesce((select max(substring(id from '[0-9]+$')::bigint) from public.tickets where id ~ '^TCK-[0-9]{4}-[0-9]+$'),0),1)
    else 1
  end,
  exists(select 1 from public.tickets));
grant usage, select on sequence public.ticket_number_seq to service_role;
create or replace function public.generate_ticket_id()
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  ticket_year text := to_char(now(), 'YYYY');
  next_number numeric;
  number_text text;
begin
  -- Serialize allocations until the inserting transaction commits or rolls back.
  -- The following query then sees committed tickets from the preceding caller
  -- under the API's default READ COMMITTED isolation level.
  perform pg_advisory_xact_lock(hashtext('public.generate_ticket_id'), ticket_year::integer);

  -- The first gap is either 1 or the number immediately after an existing ID.
  -- Avoid generating a fixed-size range and preserve IDs beyond four digits.
  with used_numbers as materialized (
    select distinct substring(t.id from '[0-9]+$')::numeric as number
    from public.tickets t
    where t.id ~ ('^TCK-' || ticket_year || '-[0-9]+$')
  ), candidates as (
    select 1::numeric as number
    union all
    select number + 1 from used_numbers
  )
  select min(c.number) into next_number
  from candidates c
  where not exists (select 1 from used_numbers u where u.number = c.number);

  number_text := next_number::text;
  return 'TCK-' || ticket_year || '-' || lpad(number_text, greatest(4, length(number_text)), '0');
end;
$$;
create sequence if not exists public.burnout_number_seq;
select setval('public.burnout_number_seq',
  case when exists(select 1 from public.tickets)
    then greatest((select last_value from public.burnout_number_seq),coalesce((select max(substring(ticket_code from '^[^-]+-([0-9]+)-')::bigint) from public.tickets where support_category = 'Burnout'),0),1)
    else 1
  end,
  exists(select 1 from public.tickets));
create or replace function public.allocate_burnout_code(branch_code text, brand_code text, device_code text)
returns text language sql security definer set search_path = public as $$
  select branch_code || '-' || lpad(n, greatest(5,length(n)), '0') || '-' || brand_code || '-' || device_code
  from (select nextval('public.burnout_number_seq')::text n) sequence_value;
$$;
revoke all on function public.allocate_burnout_code(text,text,text) from public, anon, authenticated;
grant execute on function public.allocate_burnout_code(text,text,text) to service_role;

create or replace function public.enforce_helpdesk_ticket_integrity() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  actor public.profiles;
  assigned_technician public.profiles;
  before_status text;
  after_status text;
  is_ict boolean;
  burnout boolean;
  closed boolean;
  allowed boolean := false;
  changed_key text;
  event jsonb;
  reason text;
  activity_changes jsonb := '{}'::jsonb;
begin
  -- SQL-editor maintenance has no caller JWT. Browser writes are revoked above.
  if auth.uid() is null and coalesce(auth.role(), '') <> 'service_role' then return new; end if;
  if tg_op = 'UPDATE' and (to_jsonb(new) - array['locked_by','locked_by_name','locked_at','lock_expires_at','updated_at'])
    = (to_jsonb(old) - array['locked_by','locked_by_name','locked_at','lock_expires_at','updated_at']) then return new; end if;
  select * into actor from public.profiles where id = coalesce(auth.uid(),new.last_actor_id) for share;
  if actor.id is null or actor.status <> 'Active' then raise exception 'An active account is required.'; end if;
  is_ict := actor.role::text in ('admin','superadmin');
  new.last_actor_id := actor.id;
  if new.technician_id is not null then
    select * into assigned_technician from public.profiles p where p.id = new.technician_id;
    if assigned_technician.id is null or assigned_technician.status <> 'Active'
      or assigned_technician.role::text not in ('admin', 'superadmin') then
      raise exception 'Tickets can only be assigned to active ICT administrators.';
    end if;
    new.technician := assigned_technician.full_name;
  elsif tg_op = 'UPDATE' and new.technician is distinct from old.technician
    and lower(trim(coalesce(new.technician, ''))) <> 'unassigned'
    and not (
      lower(trim(coalesce(old.status, ''))) = 'escalated'
      and lower(trim(coalesce(new.status, ''))) = 'resolved'
      and old.escalation_partner = 'Third Party Company'
      and nullif(trim(old.escalation_partner_company), '') is not null
      and new.technician = trim(old.escalation_partner_company)
      and new.technician_id is null
    ) then
    raise exception 'Choose an ICT staff profile; technician names cannot be assigned as free text.';
  end if;
  if tg_op = 'INSERT' then
    if new.owner_id is distinct from actor.id and actor.role::text <> 'superadmin' then raise exception 'You cannot submit for another account.'; end if;
    new.created_at := coalesce(new.created_at,now());
    new.response_due_at := new.created_at + make_interval(hours => public.helpdesk_sla_target_hours(new.priority, 'response'));
    new.resolution_due_at := new.created_at + make_interval(hours => public.helpdesk_sla_target_hours(new.priority, 'resolution'));
    new.status := 'Created';
    activity_changes := jsonb_build_object(
      'status', jsonb_build_object('from', null, 'to', new.status),
      'priority', jsonb_build_object('from', null, 'to', new.priority),
      'sla', jsonb_build_object('from', null, 'to', new.sla),
      'supportCategory', jsonb_build_object('from', null, 'to', new.support_category),
      'concernType', jsonb_build_object('from', null, 'to', new.concern_type),
      'branch', jsonb_build_object('from', null, 'to', new.branch),
      'department', jsonb_build_object('from', null, 'to', new.department),
      'deviceName', jsonb_build_object('from', null, 'to', new.device_name),
      'impact', jsonb_build_object('to', left(coalesce(new.impact, ''), 4000))
    );
    new.status_history := jsonb_build_array(jsonb_build_object(
      'status','Submitted','previousStatus',null,'type','submitted','timestamp',now(),'label','Submitted',
      'updatedBy',actor.id,'updatedByName',actor.full_name,'actorRole',actor.role::text,
      'submittedForName',nullif(trim(new.requester),''),'technician',new.technician,'technicianId',new.technician_id,
      'priority',new.priority,'sla',new.sla,'reason','',
      'changes',activity_changes,
      'snapshot',jsonb_build_object('supportCategory',new.support_category,'concernType',new.concern_type,
        'branch',new.branch,'department',new.department,'deviceName',new.device_name,'technician',new.technician,
        'technicianId',new.technician_id,'priority',new.priority,'sla',new.sla,'nextActionAt',new.next_action_at,
        'escalationPartner',new.escalation_partner,'responseDueAt',new.response_due_at,'resolutionDueAt',new.resolution_due_at)));
    return new;
  end if;
  if coalesce(auth.role(),'') <> 'service_role' then raise exception 'Use the authorized ticket API.'; end if;
  before_status := lower(old.status); after_status := lower(new.status);
  burnout := lower(old.support_category) = 'burnout';
  closed := before_status in ('resolved','cancelled','canceled','passed burnout','ready for deployment','deployed','failed burnout','damaged','for repair','for replacement');
  reason := trim(new.action_reason);
  if new.priority is distinct from old.priority or new.sla is distinct from old.sla then
    new.response_due_at := old.created_at + make_interval(hours => public.helpdesk_sla_target_hours(new.priority, 'response'));
    new.resolution_due_at := old.created_at + make_interval(hours => public.helpdesk_sla_target_hours(new.priority, 'resolution'));
  end if;
  if is_ict then
    if old.locked_by is distinct from actor.id or old.lock_expires_at is null or old.lock_expires_at <= now() then
      raise exception 'Your edit lock expired or is held by another administrator. Reopen the ticket.';
    end if;
  else
    if old.owner_id is distinct from actor.id or old.work_started_at is not null or old.technician <> 'Unassigned'
      or before_status not in ('created','submitted','pending','modified') then raise exception 'Employee editing is locked.'; end if;
    for changed_key in select key from jsonb_each(to_jsonb(new)) where value is distinct from to_jsonb(old)->key loop
      if changed_key <> all(array['requester','employee_id','branch','department','support_category','concern_type','device_name','contact_number',
        'impact','description','sla','priority','saar_required','saar_attachment','photo_attachments','last_employee_update','last_actor_id','updated_at']) then
        raise exception 'Employees cannot change %.',changed_key;
      end if;
    end loop;
  end if;
  if closed then
    if actor.role::text <> 'superadmin' or length(reason) < 8
      or after_status <> (case when burnout then 'under burnout' else 'in progress' end) then
      raise exception 'Closed tickets require a superadmin reopen action and a recorded reason.';
    end if;
    new.work_started_at := now()::text; new.work_ended_at := null;
    if burnout then new.burnout_started_at := now(); end if;
  elsif before_status <> after_status then
    if burnout then
      allowed := (before_status in ('created','submitted') and after_status in ('for inspection','cancelled'))
        or (before_status = 'for inspection' and after_status in ('under burnout','damaged','for repair','for replacement','cancelled'))
        or (before_status = 'under burnout' and after_status in ('passed burnout','failed burnout','damaged','for repair','for replacement','cancelled'));
    else
      allowed := (before_status in ('created','submitted','pending','modified') and after_status in ('in progress','cancelled'))
        or (before_status in ('in progress','moved date','escalated','waiting for requester','waiting for vendor','waiting for approval')
          and after_status in ('in progress','moved date','escalated','waiting for requester','waiting for vendor','waiting for approval','resolved','cancelled'));
    end if;
    if not allowed then raise exception 'Invalid ticket transition from % to %.',old.status,new.status; end if;
  end if;
  if after_status in ('resolved','cancelled','canceled') and length(trim(new.resolution)) < 8 then raise exception 'Resolution or cancellation details are required (at least 8 characters).'; end if;
  if after_status in ('moved date','waiting for requester','waiting for vendor','waiting for approval')
    and before_status <> after_status and (new.next_action_at is null or new.next_action_at <= now()) then
    raise exception 'Choose a future next-action date.';
  end if;
  if after_status in ('waiting for requester','waiting for vendor','waiting for approval') and before_status <> after_status
    and length(reason) < 8 then raise exception 'Record why the ticket is waiting (at least 8 characters).'; end if;
  if after_status = 'escalated' and before_status <> after_status and nullif(trim(new.escalation_partner),'') is null then
    raise exception 'Choose an escalation partner before escalating this ticket.';
  end if;
  if after_status = 'under burnout' and before_status <> after_status then new.burnout_started_at := now(); end if;
  if after_status in ('resolved','passed burnout','failed burnout','damaged','for repair','for replacement','deployed')
    and old.resolved_at is null then new.resolved_at := now(); end if;
  if after_status = 'passed burnout' then
    if not public.has_complete_burnout_report(new.burnout_report) then
      raise exception 'Complete the testing, software, monitoring, and final evaluation records before passing a unit.';
    end if;
    if old.burnout_started_at is null or old.burnout_started_at + interval '3 days' > now() then
      raise exception 'At least three full Burnout testing days are required before passing the unit.';
    end if;
  end if;
  if before_status in ('in progress','escalated','for inspection','under burnout')
    and after_status not in ('in progress','escalated','for inspection','under burnout')
    and old.work_started_at is not null and old.work_ended_at is null then
    new.handling_seconds := old.handling_seconds + greatest(0,extract(epoch from (now()-public.try_parse_helpdesk_timestamp(old.work_started_at))))::bigint;
    new.work_ended_at := now()::text;
  elsif before_status in ('moved date','waiting for requester','waiting for vendor','waiting for approval')
    and after_status in ('in progress','moved date','escalated') then
    new.work_started_at := now()::text;
    new.work_ended_at := null;
  elsif before_status in ('created','submitted','pending','modified')
    and after_status in ('in progress','for inspection') and old.work_started_at is null then
    new.work_started_at := coalesce(new.work_started_at,now()::text);
  end if;
  if new.private_note_update is not null then
    if not is_ict then raise exception 'Internal notes are restricted to ICT.'; end if;
    insert into public.ticket_internal_notes(ticket_id,body) values(new.id,left(coalesce(new.private_note_update->>'body',''),10000))
      on conflict(ticket_id) do update set body=excluded.body,updated_at=now();
    activity_changes := activity_changes || jsonb_build_object('internalNoteUpdated',true);
  end if;
  new.private_note_update := null; new.admin_remarks := '';
  new.version := old.version + 1;
  if new.status is distinct from old.status then
    activity_changes := activity_changes || jsonb_build_object('status',jsonb_build_object('from',old.status,'to',new.status));
  end if;
  if new.technician is distinct from old.technician or new.technician_id is distinct from old.technician_id then
    activity_changes := activity_changes || jsonb_build_object('technician',jsonb_build_object(
      'from',coalesce(nullif(old.technician,''),'Unassigned'),'to',coalesce(nullif(new.technician,''),'Unassigned'),
      'fromId',old.technician_id,'toId',new.technician_id));
  end if;
  if new.priority is distinct from old.priority then
    activity_changes := activity_changes || jsonb_build_object('priority',jsonb_build_object('from',old.priority,'to',new.priority));
  end if;
  if new.sla is distinct from old.sla then
    activity_changes := activity_changes || jsonb_build_object('sla',jsonb_build_object('from',old.sla,'to',new.sla));
  end if;
  if new.next_action_at is distinct from old.next_action_at then
    activity_changes := activity_changes || jsonb_build_object('nextActionAt',jsonb_build_object('from',old.next_action_at,'to',new.next_action_at));
  end if;
  if new.escalation_partner is distinct from old.escalation_partner then
    activity_changes := activity_changes || jsonb_build_object('escalationPartner',jsonb_build_object('from',old.escalation_partner,'to',new.escalation_partner));
  end if;
  if new.first_response_at is distinct from old.first_response_at then
    activity_changes := activity_changes || jsonb_build_object('firstResponseAt',jsonb_build_object('from',old.first_response_at,'to',new.first_response_at));
  end if;
  if new.response_due_at is distinct from old.response_due_at then
    activity_changes := activity_changes || jsonb_build_object('responseDueAt',jsonb_build_object('from',old.response_due_at,'to',new.response_due_at));
  end if;
  if new.resolution_due_at is distinct from old.resolution_due_at then
    activity_changes := activity_changes || jsonb_build_object('resolutionDueAt',jsonb_build_object('from',old.resolution_due_at,'to',new.resolution_due_at));
  end if;
  if new.action_taken is distinct from old.action_taken then
    activity_changes := activity_changes || jsonb_build_object('actionTaken',jsonb_build_object('to',left(coalesce(new.action_taken,''),4000)));
  end if;
  if new.resolution is distinct from old.resolution then
    activity_changes := activity_changes || jsonb_build_object('resolution',jsonb_build_object('to',left(coalesce(new.resolution,''),4000)));
  end if;
  if new.recommendation is distinct from old.recommendation then
    activity_changes := activity_changes || jsonb_build_object('recommendation',jsonb_build_object('to',left(coalesce(new.recommendation,''),4000)));
  end if;
  if new.support_category is distinct from old.support_category then
    activity_changes := activity_changes || jsonb_build_object('supportCategory',jsonb_build_object('from',old.support_category,'to',new.support_category));
  end if;
  if new.concern_type is distinct from old.concern_type then
    activity_changes := activity_changes || jsonb_build_object('concernType',jsonb_build_object('from',old.concern_type,'to',new.concern_type));
  end if;
  if new.branch is distinct from old.branch then
    activity_changes := activity_changes || jsonb_build_object('branch',jsonb_build_object('from',old.branch,'to',new.branch));
  end if;
  if new.department is distinct from old.department then
    activity_changes := activity_changes || jsonb_build_object('department',jsonb_build_object('from',old.department,'to',new.department));
  end if;
  if new.device_name is distinct from old.device_name then
    activity_changes := activity_changes || jsonb_build_object('deviceName',jsonb_build_object('from',old.device_name,'to',new.device_name));
  end if;
  if new.contact_number is distinct from old.contact_number then
    activity_changes := activity_changes || jsonb_build_object('contactNumber',jsonb_build_object('from',old.contact_number,'to',new.contact_number));
  end if;
  if new.impact is distinct from old.impact then
    activity_changes := activity_changes || jsonb_build_object('impact',jsonb_build_object('to',left(coalesce(new.impact,''),4000)));
  end if;
  if new.description is distinct from old.description then
    activity_changes := activity_changes || jsonb_build_object('descriptionUpdated',true);
  end if;
  event := jsonb_build_object('status',new.status,'label',case when closed then 'Reopened to ' || new.status else new.status end,
    'previousStatus',old.status,'type',case when closed then 'reopened' when before_status <> after_status then case after_status when 'resolved' then 'resolved' when 'moved date' then 'moved-date' else 'status' end else 'updated' end,
    'timestamp',now(),'updatedBy',actor.id,'updatedByName',actor.full_name,'actorRole',actor.role::text,
    'technician',new.technician,'technicianId',new.technician_id,'reason',reason,
    'priority',new.priority,'sla',new.sla,
    'changes',activity_changes,
    'snapshot',jsonb_build_object('supportCategory',new.support_category,'concernType',new.concern_type,'branch',new.branch,
      'department',new.department,'deviceName',new.device_name,'technician',new.technician,'technicianId',new.technician_id,
      'priority',new.priority,'sla',new.sla,'nextActionAt',new.next_action_at,'escalationPartner',new.escalation_partner,
      'responseDueAt',new.response_due_at,'resolutionDueAt',new.resolution_due_at));
  new.status_history := coalesce(old.status_history,'[]') || jsonb_build_array(event);
  return new;
end;
$$;
drop trigger if exists tickets_00_integrity on public.tickets;
create trigger tickets_00_integrity before insert or update on public.tickets for each row execute function public.enforce_helpdesk_ticket_integrity();

create or replace function public.record_ticket_status_event() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op='INSERT' or new.status is distinct from old.status then
    insert into public.ticket_status_events(ticket_id,owner_id,status,previous_status,technician,technician_id,created_by)
    values(new.id,new.owner_id,new.status,case when tg_op='UPDATE' then old.status else null end,new.technician,new.technician_id,new.last_actor_id);
  end if;
  return new;
end;
$$;

drop function if exists public.send_helpdesk_message(text,text,jsonb,uuid);
drop function if exists public.send_helpdesk_message(text,text,jsonb,uuid,uuid);
create or replace function public.send_helpdesk_message(target_ticket_id text, message_text text, message_attachments jsonb, actor_id uuid, p_client_message_id uuid)
returns public.ticket_messages language plpgsql security definer set search_path = public as $$
declare c public.tickets; actor public.profiles; result public.ticket_messages;
begin
  if coalesce(auth.role(),'') <> 'service_role' then raise exception 'Use the authorized message API.'; end if;
  select * into actor from public.profiles where id=actor_id and status='Active' for share;
  select * into c from public.tickets where id=target_ticket_id for update;
  if actor.id is null or c.id is null or not (actor.role::text in ('admin','superadmin') or c.owner_id=actor.id) then raise exception 'Message access denied.'; end if;
  if p_client_message_id is null then raise exception 'A message request ID is required.'; end if;
  select * into result from public.ticket_messages
  where ticket_id=c.id and sender_id=actor.id and ticket_messages.client_message_id=p_client_message_id;
  if found then return result; end if;
  if actor.role::text in ('admin','superadmin')
    and (c.locked_by is distinct from actor.id or c.lock_expires_at is null or c.lock_expires_at <= now()) then
    raise exception 'Claim the ticket before replying as ICT.';
  end if;
  if lower(c.status) in ('resolved','cancelled','canceled','passed burnout','ready for deployment','deployed','failed burnout','damaged','for repair','for replacement')
    or (c.work_started_at is null and c.technician='Unassigned') then raise exception 'Conversation is closed.'; end if;
  if coalesce(jsonb_typeof(message_attachments) <> 'array', true)
    or length(trim(coalesce(message_text, ''))) > 10000
    or (trim(coalesce(message_text, '')) = '' and jsonb_array_length(coalesce(message_attachments, '[]'::jsonb)) = 0)
    or jsonb_array_length(coalesce(message_attachments, '[]'::jsonb)) > 5 then
    raise exception 'Invalid message or attachment count.';
  end if;
  insert into public.ticket_messages(ticket_id,sender_id,sender_name,sender_email,sender_role,message,attachments,client_message_id)
  values(c.id,actor.id,actor.full_name,actor.email,actor.role::text,trim(coalesce(message_text, '')),message_attachments,p_client_message_id)
  on conflict (ticket_id,sender_id,client_message_id) where client_message_id is not null do nothing
  returning * into result;
  if result.id is null then
    select * into result from public.ticket_messages
    where ticket_id=c.id and sender_id=actor.id and ticket_messages.client_message_id=p_client_message_id;
    return result;
  end if;
  if actor.role::text in ('admin','superadmin') and c.first_response_at is null then
    update public.tickets set first_response_at=now(),last_actor_id=actor.id,action_reason='First ICT response recorded in the ticket conversation.'
    where id=c.id;
  end if;
  return result;
end;
$$;
revoke all on function public.send_helpdesk_message(text,text,jsonb,uuid,uuid) from public,anon,authenticated;
grant execute on function public.send_helpdesk_message(text,text,jsonb,uuid,uuid) to service_role;

create or replace function public.is_helpdesk_attachment_visible(object_path text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.has_valid_portal_session() and exists (
    select 1 from public.tickets t where (public.is_admin() or t.owner_id=auth.uid()) and (
      t.saar_attachment->>'path'=object_path or t.saar_attachment->>'url' like '%/ticket-attachments/' || object_path
      or exists(select 1 from jsonb_array_elements(t.photo_attachments) a where a->>'path'=object_path or a->>'url' like '%/ticket-attachments/' || object_path)
      or exists(select 1 from public.ticket_messages m cross join lateral jsonb_array_elements(m.attachments) a where m.ticket_id=t.id and a->>'path'=object_path)
    )
  );
$$;
revoke all on function public.is_helpdesk_attachment_visible(text) from public,anon;
grant execute on function public.is_helpdesk_attachment_visible(text) to authenticated;
update storage.buckets set public=false where id='ticket-attachments';
drop policy if exists "Public can read ticket attachments" on storage.objects;
drop policy if exists "Authorized users can read ticket attachments" on storage.objects;
create policy "Authorized users can read ticket attachments" on storage.objects for select to authenticated
using(bucket_id='ticket-attachments' and public.is_helpdesk_attachment_visible(name));

create table if not exists public.helpdesk_file_cleanup (
  path text primary key,
  queued_at timestamptz not null default now()
);
alter table public.helpdesk_file_cleanup enable row level security;
revoke all on public.helpdesk_file_cleanup from public,anon,authenticated;
grant all on public.helpdesk_file_cleanup to service_role;
create or replace function public.queue_deleted_helpdesk_files() returns trigger
language plpgsql security definer set search_path=public as $$
declare attachments jsonb;
begin
  if tg_table_name='tickets' then attachments := coalesce(old.photo_attachments,'[]') || jsonb_build_array(old.saar_attachment);
  else attachments := coalesce(old.attachments,'[]'); end if;
  insert into public.helpdesk_file_cleanup(path)
  select distinct coalesce(nullif(a->>'path',''),nullif(regexp_replace(a->>'url','^.*?/ticket-attachments/([^?]+).*$','\1'),a->>'url'))
  from jsonb_array_elements(attachments) a
  where nullif(a->>'path','') is not null or coalesce(a->>'url','') like '%/ticket-attachments/%'
  on conflict(path) do nothing;
  return old;
end;
$$;
drop trigger if exists tickets_queue_file_cleanup on public.tickets;
create trigger tickets_queue_file_cleanup before delete on public.tickets for each row execute function public.queue_deleted_helpdesk_files();
drop trigger if exists messages_queue_file_cleanup on public.ticket_messages;
create trigger messages_queue_file_cleanup before delete on public.ticket_messages for each row execute function public.queue_deleted_helpdesk_files();

-- Apply ict_employee_notifications_migration.sql afterward for owner replies and targeted employee alerts.
create or replace function public.notify_helpdesk_activity() returns trigger
language plpgsql security definer set search_path=public as $$
declare ticket public.tickets; actor uuid; heading text;
begin
  if tg_table_name='ticket_messages' then
    select * into ticket from public.tickets where id=new.ticket_id;
    actor:=new.sender_id; heading:='New ticket reply';
  else
    ticket:=new; actor:=new.last_actor_id;
    if tg_op='UPDATE' and new.status is not distinct from old.status and new.technician is not distinct from old.technician then return new; end if;
    heading:=case when tg_op='INSERT' then 'New ICT request' else 'Ticket updated' end;
  end if;
  insert into public.user_notifications(user_id,title,message,type,related_ticket_id)
  select p.id,heading,ticket.id || ': ' || ticket.status,'helpdesk_activity',ticket.id
  from public.profiles p where p.status='Active' and p.id is distinct from actor
    and (tg_op <> 'INSERT' or p.id is distinct from ticket.owner_id)
    and (p.id=ticket.owner_id or p.role::text in ('admin','superadmin'));
  return new;
end;
$$;
drop trigger if exists tickets_notify_activity on public.tickets;
create trigger tickets_notify_activity after insert or update on public.tickets for each row execute function public.notify_helpdesk_activity();
drop trigger if exists messages_notify_activity on public.ticket_messages;
create trigger messages_notify_activity after insert on public.ticket_messages for each row execute function public.notify_helpdesk_activity();

create table if not exists public.helpdesk_sla_alerts (
  id uuid primary key default gen_random_uuid(),
  ticket_id text not null references public.tickets(id) on delete cascade,
  alert_type text not null check (alert_type in ('first_response_due_today', 'resolution_due_today', 'first_response_overdue', 'resolution_overdue', 'next_action_due')),
  due_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique(ticket_id, alert_type, due_at)
);
alter table public.helpdesk_sla_alerts drop constraint if exists helpdesk_sla_alerts_alert_type_check;
alter table public.helpdesk_sla_alerts add constraint helpdesk_sla_alerts_alert_type_check
  check (alert_type in ('first_response_due_today', 'resolution_due_today', 'first_response_overdue', 'resolution_overdue', 'next_action_due'));
alter table public.helpdesk_sla_alerts enable row level security;
revoke all on public.helpdesk_sla_alerts from public, anon, authenticated;
grant all on public.helpdesk_sla_alerts to service_role;

create or replace function public.dispatch_helpdesk_due_alerts()
returns integer
language plpgsql security definer set search_path = public as $$
declare
  notification_count integer := 0;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Only the scheduled helpdesk service can dispatch SLA alerts.';
  end if;

  with local_clock as (
    select (now() at time zone 'Asia/Manila')::date as local_date
  ), due_alerts as (
    select t.id as ticket_id, 'first_response_due_today'::text as alert_type, t.response_due_at as due_at
    from public.tickets t
    cross join local_clock clock
    where t.response_due_at is not null and t.first_response_at is null
      and (t.response_due_at at time zone 'Asia/Manila')::date <= clock.local_date
      and lower(regexp_replace(coalesce(t.status,''), '[-_]+', ' ', 'g')) not in
        ('resolved','cancelled','canceled','passed burnout','ready for deployment','deployed','failed burnout','damaged','for repair','for replacement')
      and not exists (
        select 1 from public.helpdesk_sla_alerts prior
        where prior.ticket_id = t.id and prior.due_at = t.response_due_at
          and prior.alert_type in ('first_response_due_today', 'first_response_overdue')
      )
    union all
    select t.id, 'resolution_due_today', t.resolution_due_at
    from public.tickets t
    cross join local_clock clock
    where t.resolution_due_at is not null and t.resolved_at is null
      and (t.resolution_due_at at time zone 'Asia/Manila')::date <= clock.local_date
      and lower(regexp_replace(coalesce(t.status,''), '[-_]+', ' ', 'g')) not in
        ('resolved','cancelled','canceled','passed burnout','ready for deployment','deployed','failed burnout','damaged','for repair','for replacement')
      and not exists (
        select 1 from public.helpdesk_sla_alerts prior
        where prior.ticket_id = t.id and prior.due_at = t.resolution_due_at
          and prior.alert_type in ('resolution_due_today', 'resolution_overdue')
      )
    union all
    select t.id, 'next_action_due', t.next_action_at
    from public.tickets t
    where t.next_action_at is not null and t.next_action_at <= now()
      and lower(regexp_replace(coalesce(t.status,''), '[-_]+', ' ', 'g'))
        in ('moved date','waiting for requester','waiting for vendor','waiting for approval')
  ), inserted_alerts as (
    insert into public.helpdesk_sla_alerts(ticket_id, alert_type, due_at)
    select ticket_id, alert_type, due_at from due_alerts
    on conflict(ticket_id, alert_type, due_at) do nothing
    returning ticket_id, alert_type, due_at
  ), recipient_events as (
    select a.ticket_id, a.alert_type, a.due_at, t.owner_id as user_id
    from inserted_alerts a join public.tickets t on t.id = a.ticket_id
    where t.owner_id is not null
    union
    select a.ticket_id, a.alert_type, a.due_at, t.technician_id
    from inserted_alerts a join public.tickets t on t.id = a.ticket_id
    where t.technician_id is not null
    union
    select a.ticket_id, a.alert_type, a.due_at, p.id
    from inserted_alerts a
    join public.tickets t on t.id = a.ticket_id
      and (t.technician_id is null or not exists (
        select 1 from public.profiles assigned
        where assigned.id = t.technician_id and assigned.status = 'Active'
          and assigned.role::text in ('admin', 'superadmin')
      ))
    join public.profiles p on p.role::text in ('admin', 'superadmin') and p.status = 'Active'
  ), inserted_notifications as (
    insert into public.user_notifications(user_id, title, message, type, related_ticket_id)
    select distinct p.id,
      case r.alert_type
        when 'first_response_due_today' then case when (r.due_at at time zone 'Asia/Manila')::date < (now() at time zone 'Asia/Manila')::date then 'First response overdue' else 'First response deadline today' end
        when 'resolution_due_today' then case when (r.due_at at time zone 'Asia/Manila')::date < (now() at time zone 'Asia/Manila')::date then 'Resolution overdue' else 'Resolution deadline today' end
        else 'Next action is due'
      end,
      coalesce(nullif(t.ticket_code, ''), t.id) ||
        case r.alert_type
          when 'first_response_due_today' then case when (r.due_at at time zone 'Asia/Manila')::date < (now() at time zone 'Asia/Manila')::date then ' is past its first ICT response deadline and is still awaiting a response. Deadline: ' else ' is due today for its first ICT response and is still awaiting a response. Deadline: ' end
          when 'resolution_due_today' then case when (r.due_at at time zone 'Asia/Manila')::date < (now() at time zone 'Asia/Manila')::date then ' is past its resolution deadline and remains unresolved. Deadline: ' else ' is due for resolution today and remains unresolved. Deadline: ' end
          else ' is overdue for its scheduled ' || t.status || ' follow-up.'
        end ||
        case when r.alert_type = 'next_action_due' then '' else to_char(r.due_at at time zone 'Asia/Manila', 'Mon DD, YYYY HH12:MI AM') || '. Current status: ' || coalesce(nullif(t.status, ''), 'Unknown') || '.' end,
      'helpdesk_sla_alert', t.id
    from recipient_events r
    join public.profiles p on p.id = r.user_id and p.status = 'Active'
    join public.tickets t on t.id = r.ticket_id
    returning id
  )
  select count(*)::integer into notification_count from inserted_notifications;

  return notification_count;
end;
$$;
revoke all on function public.dispatch_helpdesk_due_alerts() from public, anon, authenticated;
grant execute on function public.dispatch_helpdesk_due_alerts() to service_role;

commit;
notify pgrst, 'reload schema';
