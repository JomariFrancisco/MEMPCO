-- Route Nunez Extension and La Hermosa from the Branch Admin directly to the COO.
-- Apply after mrdss_role_routing_workflow_migration.sql.

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

update public.concern_branches
set area_id = null,
    escalation_route = 'coo',
    updated_at = now()
where id in ('nunez-extension', 'la-hermosa');

-- Move any cases already waiting on Area 1 for these locations into the COO queue.
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
      select 1 from public.concern_branches b
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

revoke all on function public.get_member_concern_escalation_route(text) from public, anon;
revoke all on function public.prevent_coo_only_area_escalation() from public, anon, authenticated;
revoke all on function public.escalate_member_concern_branch_to_coo(text, uuid, text) from public, anon, authenticated;
grant execute on function public.get_member_concern_escalation_route(text) to authenticated;
grant execute on function public.escalate_member_concern_branch_to_coo(text, uuid, text) to authenticated;

notify pgrst, 'reload schema';
