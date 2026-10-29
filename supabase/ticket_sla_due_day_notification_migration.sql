-- Send one-time alerts on each SLA deadline date while the response or resolution is still unmet.
-- Apply after ict_helpdesk_hardening_migration.sql on existing deployments.
begin;

alter table public.helpdesk_sla_alerts drop constraint if exists helpdesk_sla_alerts_alert_type_check;
alter table public.helpdesk_sla_alerts add constraint helpdesk_sla_alerts_alert_type_check
  check (alert_type in ('first_response_due_today', 'resolution_due_today', 'first_response_overdue', 'resolution_overdue', 'next_action_due'));

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
