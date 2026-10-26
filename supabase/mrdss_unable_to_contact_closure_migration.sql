-- Enable a separate, unresolved closure outcome for cases with no member response.
-- Apply after mrdss_role_routing_workflow_migration.sql.

alter table public.member_concerns
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
