-- Apply after schema.sql and before deploying the matching application on every environment.
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
update public.tickets t
set response_due_at = coalesce(t.response_due_at,t.created_at + make_interval(hours => case lower(coalesce(t.priority,t.sla,'low')) when 'critical' then 8 when 'high' then 24 when 'medium' then 24 else 72 end)),
    resolution_due_at = coalesce(t.resolution_due_at,t.created_at + make_interval(hours => case lower(coalesce(t.priority,t.sla,'low')) when 'critical' then 8 when 'high' then 24 when 'medium' then 72 else 120 end)),
    burnout_started_at = case when lower(t.support_category) = 'burnout' and lower(t.status) = 'under burnout' then coalesce(t.burnout_started_at,public.try_parse_helpdesk_timestamp(t.work_started_at),t.created_at) else t.burnout_started_at end;
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
    and lower(trim(coalesce(new.technician, ''))) <> 'unassigned' then
    raise exception 'Choose an ICT staff profile; technician names cannot be assigned as free text.';
  end if;
  if tg_op = 'INSERT' then
    if new.owner_id is distinct from actor.id and actor.role::text <> 'superadmin' then raise exception 'You cannot submit for another account.'; end if;
    new.created_at := coalesce(new.created_at,now());
    new.response_due_at := new.created_at + make_interval(hours => case lower(coalesce(new.priority,new.sla,'low'))
      when 'critical' then 8 when 'high' then 24 when 'medium' then 24 else 72 end);
    new.resolution_due_at := new.created_at + make_interval(hours => case lower(coalesce(new.priority,new.sla,'low'))
      when 'critical' then 8 when 'high' then 24 when 'medium' then 72 else 120 end);
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
  if new.priority is distinct from old.priority then
    new.response_due_at := old.created_at + make_interval(hours => case lower(coalesce(new.priority,new.sla,'low'))
      when 'critical' then 8 when 'high' then 24 when 'medium' then 24 else 72 end);
    new.resolution_due_at := old.created_at + make_interval(hours => case lower(coalesce(new.priority,new.sla,'low'))
      when 'critical' then 8 when 'high' then 24 when 'medium' then 72 else 120 end);
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

create or replace function public.send_helpdesk_message(target_ticket_id text, message_text text, message_attachments jsonb, actor_id uuid)
returns public.ticket_messages language plpgsql security definer set search_path = public as $$
declare c public.tickets; actor public.profiles; result public.ticket_messages;
begin
  if coalesce(auth.role(),'') <> 'service_role' then raise exception 'Use the authorized message API.'; end if;
  select * into actor from public.profiles where id=actor_id and status='Active' for share;
  select * into c from public.tickets where id=target_ticket_id for update;
  if actor.id is null or c.id is null or not (actor.role::text in ('admin','superadmin') or c.owner_id=actor.id) then raise exception 'Message access denied.'; end if;
  if actor.role::text in ('admin','superadmin')
    and (c.locked_by is distinct from actor.id or c.lock_expires_at is null or c.lock_expires_at <= now()) then
    raise exception 'Claim the ticket before replying as ICT.';
  end if;
  if lower(c.status) in ('resolved','cancelled','canceled','passed burnout','ready for deployment','deployed','failed burnout','damaged','for repair','for replacement')
    or (c.work_started_at is null and c.technician='Unassigned') then raise exception 'Conversation is closed.'; end if;
  if length(trim(message_text))>10000 or (trim(message_text)='' and jsonb_array_length(message_attachments)=0)
    or jsonb_array_length(message_attachments)>5 then raise exception 'Invalid message or attachment count.'; end if;
  insert into public.ticket_messages(ticket_id,sender_id,sender_name,sender_email,sender_role,message,attachments)
  values(c.id,actor.id,actor.full_name,actor.email,actor.role::text,trim(message_text),message_attachments) returning * into result;
  if actor.role::text in ('admin','superadmin') and c.first_response_at is null then
    update public.tickets set first_response_at=now(),last_actor_id=actor.id,action_reason='First ICT response recorded in the ticket conversation.'
    where id=c.id;
  end if;
  return result;
end;
$$;
revoke all on function public.send_helpdesk_message(text,text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.send_helpdesk_message(text,text,jsonb,uuid) to service_role;

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
  alert_type text not null check (alert_type in ('first_response_overdue', 'resolution_overdue', 'next_action_due')),
  due_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique(ticket_id, alert_type, due_at)
);
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

  with due_alerts as (
    select t.id as ticket_id, 'first_response_overdue'::text as alert_type, t.response_due_at as due_at
    from public.tickets t
    where t.response_due_at is not null and t.response_due_at <= now() and t.first_response_at is null
      and lower(regexp_replace(coalesce(t.status,''), '[-_]+', ' ', 'g')) not in
        ('resolved','cancelled','canceled','passed burnout','ready for deployment','deployed','failed burnout','damaged','for repair','for replacement')
    union all
    select t.id, 'resolution_overdue', t.resolution_due_at
    from public.tickets t
    where t.resolution_due_at is not null and t.resolution_due_at <= now() and t.resolved_at is null
      and lower(regexp_replace(coalesce(t.status,''), '[-_]+', ' ', 'g')) not in
        ('resolved','cancelled','canceled','passed burnout','ready for deployment','deployed','failed burnout','damaged','for repair','for replacement')
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
        when 'first_response_overdue' then 'First response overdue'
        when 'resolution_overdue' then 'Resolution target overdue'
        else 'Next action is due'
      end,
      coalesce(nullif(t.ticket_code, ''), t.id) || ' is overdue for ' ||
        case r.alert_type
          when 'first_response_overdue' then 'its first ICT response.'
          when 'resolution_overdue' then 'resolution.'
          else 'its scheduled ' || t.status || ' follow-up.'
        end,
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
