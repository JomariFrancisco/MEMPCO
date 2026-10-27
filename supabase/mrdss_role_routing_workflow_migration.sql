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
  legacy_names text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.concern_branches (id, branch_name, category, area_id, legacy_names)
values
  ('central-office', 'Central Office', 'central_office', null, array['Central Office']),
  ('curuan', 'Curuan Branch', 'branch', 'area-1', array['Curuan']),
  ('canelar', 'Canelar Branch', 'branch', 'area-1', array['Canelar']),
  ('veterans', 'Veterans Branch', 'branch', 'area-1', array['Veterans']),
  ('culianan', 'Culianan Branch', 'branch', 'area-1', array['Culianan']),
  ('ipil', 'Ipil Branch', 'branch', 'area-2', array['Ipil']),
  ('dipolog', 'Dipolog Branch', 'branch', 'area-2', array['Dipolog']),
  ('ayala', 'Ayala Branch', 'branch', 'area-1', array['Ayala']),
  ('pagadian', 'Pagadian Branch', 'branch', 'area-2', array['Pagadian']),
  ('nunez-extension', 'Nunez Extension Branch', 'extension_branch', 'area-1', array['Nunez', 'Nunez Extension']),
  ('vitali-satellite', 'Vitali Satellite Office', 'satellite_office', 'area-1', array['Vitali']),
  ('la-hermosa', 'La Hermosa Funeraria de MEMPCO', 'funeraria', 'area-1', array['La Hermosa', 'La Hermosa Funeraria'])
on conflict (id) do update set
  branch_name = excluded.branch_name,
  category = excluded.category,
  area_id = excluded.area_id,
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
  add column if not exists closure_remarks text not null default '';

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
revoke all on function public.get_mrdss_branch_destinations() from public, anon;
revoke all on function public.get_member_concern_branches() from public;

grant execute on function public.is_area_manager_admin() to authenticated;
grant execute on function public.is_coo_admin() to authenticated;
grant execute on function public.is_member_concern_visible(text) to authenticated;
grant execute on function public.can_handle_member_concern(text) to authenticated;
grant execute on function public.perform_member_concern_action(text, text, jsonb) to authenticated;
grant execute on function public.get_concern_area_managers(text) to authenticated;
grant execute on function public.get_concern_coo_users(text) to authenticated;
grant execute on function public.get_mrdss_branch_destinations() to authenticated;
grant execute on function public.get_member_concern_branches() to anon, authenticated;

alter table public.member_concerns replica identity full;
notify pgrst, 'reload schema';
