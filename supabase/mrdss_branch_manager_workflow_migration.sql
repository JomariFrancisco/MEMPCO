-- Adds branch-scoped MRDSS case access for branch manager accounts.
-- Run after mrdss_workflow_sla_migration.sql on an existing Supabase project.

alter type public.user_role add value if not exists 'branch_manager_admin';

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

drop policy if exists "Branch managers can read routed branch cases" on public.member_concerns;
create policy "Branch managers can read routed branch cases"
on public.member_concerns for select
to authenticated
using (
  workflow_stage = 'branch_review'
  and public.is_assigned_branch_manager(routed_to)
);

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

grant execute on function public.is_branch_manager_admin() to authenticated;
grant execute on function public.is_assigned_branch_manager(text) to authenticated;
grant execute on function public.get_mrdss_branch_managers() to authenticated;
grant update (status, workflow_stage, routed_to, resolution_tag, resolution_details, priority, assigned_staff_id, activities)
on public.member_concerns to authenticated;

notify pgrst, 'reload schema';
