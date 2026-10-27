-- Adds MRDSS workflow stages and a fixed 24-hour first-response target.
-- Legacy SLA columns are retained for compatibility; resolution has no timer.
-- Run once in the Supabase SQL Editor after mrdss_concerns_migration.sql.

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

alter table public.member_concerns
add column if not exists submission_route text not null default 'mrdss',
add column if not exists workflow_stage text not null default 'mrdss_review',
add column if not exists routed_to text not null default '',
add column if not exists resolution_tag text not null default '',
add column if not exists resolution_details text not null default '',
add column if not exists sla_hours integer not null default 24,
add column if not exists sla_due_at timestamptz,
add column if not exists closed_at timestamptz;

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
  if not exists (select 1 from pg_constraint where conrelid = 'public.member_concerns'::regclass and conname = 'member_concerns_submission_route_check') then
    alter table public.member_concerns add constraint member_concerns_submission_route_check check (submission_route in ('mrdss', 'branch'));
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.member_concerns'::regclass and conname = 'member_concerns_workflow_stage_check') then
    alter table public.member_concerns add constraint member_concerns_workflow_stage_check check (workflow_stage in ('mrdss_review', 'branch_review', 'area_manager_review', 'coo_review', 'final_tagging', 'closed'));
  end if;
end $$;

create index if not exists member_concerns_stage_created_idx
on public.member_concerns (workflow_stage, created_at desc);
create index if not exists member_concerns_sla_due_at_idx
on public.member_concerns (sla_due_at) where workflow_stage <> 'closed';

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

create or replace function public.validate_member_concern_workflow()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  stage_changed boolean := false;
begin
  if TG_OP = 'INSERT' then
    new.workflow_stage := case when new.submission_route = 'branch' then 'branch_review' else 'mrdss_review' end;
    new.status := 'New';
    new.sla_hours := 24;
    new.sla_due_at := coalesce(new.created_at, now()) + interval '24 hours';
    new.closed_at := null;
    return new;
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

  if stage_changed and new.workflow_stage = 'final_tagging' and (new.status <> 'Resolved' or nullif(trim(new.resolution_details), '') is null) then
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

grant insert (submission_route) on public.member_concerns to anon, authenticated;
revoke update (sla_hours) on public.member_concerns from authenticated;
grant update (workflow_stage, routed_to, resolution_tag, resolution_details) on public.member_concerns to authenticated;

notify pgrst, 'reload schema';
