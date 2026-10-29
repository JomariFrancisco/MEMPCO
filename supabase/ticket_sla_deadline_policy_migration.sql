-- Synchronize the legacy sla and priority fields and recalculate ticket deadlines.
-- Apply after ict_helpdesk_hardening_migration.sql on existing deployments.
begin;

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
    resolution_due_at = t.created_at + make_interval(hours => public.helpdesk_sla_target_hours(canonical.sla_level, 'resolution'))
from canonical_ticket_sla canonical
where canonical.id = t.id
  and (
    t.sla is distinct from canonical.sla_level
    or t.priority is distinct from canonical.sla_level
    or t.response_due_at is distinct from t.created_at + make_interval(hours => public.helpdesk_sla_target_hours(canonical.sla_level, 'response'))
    or t.resolution_due_at is distinct from t.created_at + make_interval(hours => public.helpdesk_sla_target_hours(canonical.sla_level, 'resolution'))
  );

notify pgrst, 'reload schema';
commit;
