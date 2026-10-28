-- Record public ticket handling changes for Employee and Admin activity timelines.
-- Run after supabase/ict_helpdesk_hardening_migration.sql on existing deployments.

begin;

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

commit;
notify pgrst, 'reload schema';
