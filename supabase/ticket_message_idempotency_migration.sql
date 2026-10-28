-- Prevent duplicate conversation replies when the client retries after a timeout.
-- Apply to existing deployments; new deployments receive this from schema.sql.

begin;

alter table public.ticket_messages
  add column if not exists client_message_id uuid;

create unique index if not exists ticket_messages_idempotency_idx
  on public.ticket_messages (ticket_id, sender_id, client_message_id)
  where client_message_id is not null;

drop function if exists public.send_helpdesk_message(text, text, jsonb, uuid);
drop function if exists public.send_helpdesk_message(text, text, jsonb, uuid, uuid);

create or replace function public.send_helpdesk_message(
  target_ticket_id text,
  message_text text,
  message_attachments jsonb,
  actor_id uuid,
  p_client_message_id uuid
)
returns public.ticket_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.tickets;
  actor public.profiles;
  result public.ticket_messages;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Use the authorized message API.';
  end if;

  select * into actor
  from public.profiles
  where id = actor_id and status = 'Active'
  for share;

  select * into c
  from public.tickets
  where id = target_ticket_id
  for update;

  if actor.id is null or c.id is null
    or not (actor.role::text in ('admin', 'superadmin') or c.owner_id = actor.id) then
    raise exception 'Message access denied.';
  end if;

  if p_client_message_id is null then
    raise exception 'A message request ID is required.';
  end if;

  -- A retry for a committed send returns the original row, even if the ticket
  -- was subsequently closed or the admin lock expired.
  select * into result
  from public.ticket_messages
  where ticket_id = c.id
    and sender_id = actor.id
    and ticket_messages.client_message_id = p_client_message_id;
  if found then
    return result;
  end if;

  if actor.role::text in ('admin', 'superadmin')
    and (c.locked_by is distinct from actor.id or c.lock_expires_at is null or c.lock_expires_at <= now()) then
    raise exception 'Claim the ticket before replying as ICT.';
  end if;

  if lower(c.status) in ('resolved', 'cancelled', 'canceled', 'passed burnout', 'ready for deployment', 'deployed', 'failed burnout', 'damaged', 'for repair', 'for replacement')
    or (c.work_started_at is null and c.technician = 'Unassigned') then
    raise exception 'Conversation is closed.';
  end if;

  if coalesce(jsonb_typeof(message_attachments) <> 'array', true)
    or length(trim(coalesce(message_text, ''))) > 10000
    or (trim(coalesce(message_text, '')) = '' and jsonb_array_length(coalesce(message_attachments, '[]'::jsonb)) = 0)
    or jsonb_array_length(coalesce(message_attachments, '[]'::jsonb)) > 5 then
    raise exception 'Invalid message or attachment count.';
  end if;

  insert into public.ticket_messages (
    ticket_id, sender_id, sender_name, sender_email, sender_role,
    message, attachments, client_message_id
  )
  values (
    c.id, actor.id, actor.full_name, actor.email, actor.role::text,
    trim(coalesce(message_text, '')), message_attachments, p_client_message_id
  )
  on conflict (ticket_id, sender_id, client_message_id)
    where client_message_id is not null
  do nothing
  returning * into result;

  if result.id is null then
    select * into result
    from public.ticket_messages
    where ticket_id = c.id
      and sender_id = actor.id
      and ticket_messages.client_message_id = p_client_message_id;
    return result;
  end if;

  if actor.role::text in ('admin', 'superadmin') and c.first_response_at is null then
    update public.tickets
    set first_response_at = now(),
        last_actor_id = actor.id,
        action_reason = 'First ICT response recorded in the ticket conversation.'
    where id = c.id;
  end if;

  return result;
end;
$$;

revoke all on function public.send_helpdesk_message(text, text, jsonb, uuid, uuid) from public, anon, authenticated;
grant execute on function public.send_helpdesk_message(text, text, jsonb, uuid, uuid) to service_role;

notify pgrst, 'reload schema';

commit;
