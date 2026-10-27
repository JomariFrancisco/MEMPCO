-- Run after ict_helpdesk_hardening_migration.sql on existing and new deployments.
-- Submission confirmations remain handled by ticket_submitted_notification.

create or replace function public.notify_helpdesk_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.tickets;
  actor_id uuid;
  actor_role text;
  ticket_label text;
  admin_heading text;
  notify_admins boolean := false;
  owner_heading text;
  owner_message text;
  owner_type text;
  status_changed boolean;
  assignment_changed boolean;
  schedule_changed boolean;
  target_status text;
begin
  if tg_table_name = 'ticket_messages' then
    select * into target from public.tickets where id = new.ticket_id;
    if not found then return new; end if;
    actor_id := new.sender_id;
    select role::text into actor_role from public.profiles where id = actor_id;
    admin_heading := 'New ticket reply';
    notify_admins := true;
    if actor_role in ('admin', 'superadmin') and actor_id is distinct from target.owner_id then
      owner_heading := 'ICT replied to your ticket';
      owner_type := 'helpdesk_reply';
    end if;
  else
    target := new;
    actor_id := new.last_actor_id;
    admin_heading := case when tg_op = 'INSERT' then 'New ICT request' else 'Ticket updated' end;
    if tg_op = 'INSERT' then
      notify_admins := true;
    else
      status_changed := new.status is distinct from old.status;
      assignment_changed := new.technician_id is distinct from old.technician_id
        or new.technician is distinct from old.technician;
      target_status := lower(trim(new.status));
      schedule_changed := new.next_action_at is distinct from old.next_action_at
        and new.next_action_at is not null
        and target_status in ('moved date', 'waiting for requester', 'waiting for vendor', 'waiting for approval');
      notify_admins := status_changed or assignment_changed;
      if not (notify_admins or schedule_changed) then return new; end if;

      if status_changed then
        owner_type := 'helpdesk_status';
        owner_heading := case
          when lower(trim(old.status)) in ('resolved', 'cancelled', 'canceled', 'passed burnout', 'ready for deployment', 'deployed', 'failed burnout', 'damaged', 'for repair', 'for replacement')
            and target_status in ('in progress', 'under burnout', 'for inspection') then 'Your ticket was reopened'
          when target_status = 'waiting for requester' then 'Your response is needed'
          when target_status = 'in progress' then 'ICT is working on your ticket'
          when target_status = 'resolved' then 'Your ticket was resolved'
          when target_status in ('cancelled', 'canceled') then 'Your ticket was cancelled'
          when target_status = 'under burnout' then 'Unit testing started'
          when target_status = 'passed burnout' then 'Your unit passed testing'
          when target_status = 'failed burnout' then 'Your unit needs further attention'
          when target_status = 'moved date' then 'Your ticket was rescheduled'
          else 'Your ticket status changed'
        end;
      elsif assignment_changed then
        owner_type := 'helpdesk_assignment';
        owner_heading := 'Your ICT assignment changed';
      elsif schedule_changed then
        owner_type := 'helpdesk_schedule';
        owner_heading := 'Your ticket follow-up was rescheduled';
      end if;
    end if;
  end if;

  ticket_label := coalesce(nullif(trim(target.ticket_code), ''), target.id);
  owner_message := case
    when owner_type = 'helpdesk_reply' then 'ICT sent a reply on ' || ticket_label || '. Open the conversation to read and respond.'
    when lower(trim(target.status)) = 'waiting for requester' then 'ICT needs your response on ' || ticket_label || '. Open your ticket to review the request.'
    when owner_type = 'helpdesk_assignment' then ticket_label || ': ' || case
      when lower(trim(coalesce(target.technician, ''))) in ('', 'unassigned') then 'Awaiting ICT assignment.'
      else 'Assigned to ' || target.technician || '.' end
    when owner_type = 'helpdesk_schedule' then ticket_label || ': Next action scheduled for '
      || to_char(target.next_action_at at time zone 'Asia/Manila', 'Mon DD, YYYY, HH12:MI AM') || '.'
    else ticket_label || ': ' || target.status || '. Open your ticket for details.'
  end;

  if owner_heading is not null and target.owner_id is distinct from actor_id then
    insert into public.user_notifications(user_id, title, message, type, related_ticket_id)
    select p.id, owner_heading, owner_message, owner_type, target.id
    from public.profiles p
    where p.id = target.owner_id and p.role::text = 'employee' and p.status = 'Active';
  end if;

  if notify_admins then
    insert into public.user_notifications(user_id, title, message, type, related_ticket_id)
    select p.id, admin_heading, ticket_label || ': ' || target.status, 'helpdesk_activity', target.id
    from public.profiles p
    where p.status = 'Active' and p.role::text in ('admin', 'superadmin')
      and p.id is distinct from actor_id;
  end if;
  return new;
end;
$$;

drop trigger if exists tickets_notify_activity on public.tickets;
create trigger tickets_notify_activity after insert or update on public.tickets
for each row execute function public.notify_helpdesk_activity();
drop trigger if exists messages_notify_activity on public.ticket_messages;
create trigger messages_notify_activity after insert on public.ticket_messages
for each row execute function public.notify_helpdesk_activity();

revoke all on function public.notify_helpdesk_activity() from public, anon, authenticated;
notify pgrst, 'reload schema';
