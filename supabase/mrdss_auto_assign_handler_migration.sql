-- Automatically claim an unassigned MRDSS case when an MRDSS admin performs
-- a case action. Existing manual assignments are preserved.

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
revoke all on function public.can_handle_member_concern(text) from public, anon;
grant execute on function public.can_handle_member_concern(text) to authenticated;

notify pgrst, 'reload schema';
