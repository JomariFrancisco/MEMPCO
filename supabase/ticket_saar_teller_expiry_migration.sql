-- Update ticket SAAR detection: selected new user/password reset/teller modification requests require SAAR; expiry changes are exempt.

create or replace function public.prepare_ticket_for_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  active_profile public.profiles;
  actor_profile public.profiles;
  owner_profile public.profiles;
  category_changed boolean := false;
  ticket_context text := '';
  saar_required_for_request boolean := false;
  saar_context_changed boolean := false;
begin
  if TG_OP = 'INSERT' then
    saar_context_changed := true;
  else
    saar_context_changed :=
      new.support_category is distinct from old.support_category
      or new.concern_type is distinct from old.concern_type
      or new.device_name is distinct from old.device_name
      or new.description is distinct from old.description;
  end if;

  if TG_OP = 'INSERT' then
    if new.owner_id is null then
      new.owner_id := auth.uid();
    end if;

    select *
    into active_profile
    from public.profiles
    where id = new.owner_id;

    if active_profile.id is null then
      raise exception 'Ticket cannot be submitted because the current user profile was not found. Please log out, log in again, or ask the administrator to verify your profile.';
    end if;

    new.owner_email := coalesce(nullif(new.owner_email, ''), active_profile.email);
    new.requester := coalesce(nullif(new.requester, ''), active_profile.full_name, active_profile.email, 'Employee');
    new.employee_id := coalesce(nullif(new.employee_id, ''), active_profile.employee_id);
    new.branch := nullif(trim(coalesce(new.branch, '')), '');
    new.department := nullif(trim(coalesce(new.department, '')), '');

    if new.branch is null then
      raise exception 'Branch / Location is required. Select where the concern happened.';
    end if;

    if new.department is null then
      raise exception 'Department is required. Select the department affected by the concern.';
    end if;

    new.created_at := coalesce(new.created_at, now());
  end if;

  new.support_category := nullif(trim(coalesce(new.support_category, '')), '');

  if new.support_category is null then
    raise exception 'Support category is required.';
  end if;

  if TG_OP = 'INSERT' then
    category_changed := true;
  else
    category_changed := new.support_category is distinct from old.support_category;
  end if;

  if category_changed then
    select *
    into owner_profile
    from public.profiles
    where id = new.owner_id;

    if lower(new.support_category) = 'burnout'
      and (
        owner_profile.id is null
        or regexp_replace(lower(coalesce(owner_profile.department, '')), '[^a-z0-9]+', '', 'g') <> 'admin'
      ) then
      raise exception 'Burnout requests can only be submitted by accounts registered under the Admin department.';
    end if;

    if auth.uid() is not null then
      select *
      into actor_profile
      from public.profiles
      where id = auth.uid();

      if lower(new.support_category) = 'other ict request'
        and coalesce(actor_profile.role::text, 'employee') not in ('admin', 'superadmin') then
        raise exception 'Other ICT Request is no longer available for employee accounts.';
      end if;
    end if;
  end if;

  new.concern_type := coalesce(nullif(new.concern_type, ''), 'Concern not listed');
  new.ticket_code := nullif(new.ticket_code, '');
  new.custodian := coalesce(new.custodian, '');
  new.brand := upper(coalesce(new.brand, ''));
  new.device_type := upper(coalesce(new.device_type, ''));
  new.serial_number := upper(coalesce(new.serial_number, ''));
  new.device_name := coalesce(new.device_name, '');
  new.contact_number := coalesce(new.contact_number, '');
  new.description := coalesce(new.description, '');
  new.sla := coalesce(nullif(new.sla, ''), 'Low');
  new.priority := coalesce(nullif(new.priority, ''), new.sla, 'Low');
  new.impact := coalesce(
    nullif(new.impact, ''),
    case
      when new.sla = 'Critical' then 'Server, database, or internet service is down and branch operation may stop.'
      when new.sla = 'High' then 'Server, file storage, or network issue is blocking important work.'
      when new.sla = 'Medium' then 'Work is affected but there is a workaround or the request is planned support.'
      else 'Routine request, preparation, consultation, or non-blocking assistance.'
    end
  );
  new.status := coalesce(nullif(new.status, ''), 'Created');
  new.technician := coalesce(nullif(new.technician, ''), 'Unassigned');
  new.action_taken := coalesce(new.action_taken, '');
  new.admin_remarks := coalesce(new.admin_remarks, '');
  new.resolution := coalesce(new.resolution, '');
  new.recommendation := coalesce(new.recommendation, '');
  ticket_context := lower(concat_ws(
    ' ',
    new.support_category,
    new.concern_type,
    new.device_name,
    new.description
  ));
  saar_required_for_request :=
    ticket_context ~ '(mbwin|mb[[:space:]]+win|sky360|mbwim|mb[[:space:]]+wim)'
    and (
      ticket_context ~ '(^|[[:space:]])new user( account)? request([[:space:]]|$)'
      or ticket_context ~ '(^|[[:space:]])password reset([[:space:]]|$)'
      or ticket_context ~ '(^|[[:space:]])teller (role|function) modification request([[:space:]]|$)'
      or (
        ticket_context ~ '(^|[[:space:]])(teller[[:space:]]+)?(user[[:space:]]+)?(role|function)([[:space:]]|$)'
        and ticket_context ~ '(^|[[:space:]])(modify|modification|change|update|amend|add|remove)([[:space:]]|$)'
        and ticket_context !~ '(^|[[:space:]])(expiry|expiration|expire|expires|expired|expiring)([[:space:]]|$)'
      )
    );

  if saar_required_for_request
    and saar_context_changed
    and coalesce(nullif(new.saar_attachment ->> 'dataUrl', ''), nullif(new.saar_attachment ->> 'url', ''), nullif(new.saar_attachment ->> 'publicUrl', ''), nullif(new.saar_attachment ->> 'path', '')) is null then
    raise exception 'SAAR PDF attachment is required for MBWin / Sky360 new user, password reset, or teller role/function modification requests.';
  end if;

  new.saar_required := saar_required_for_request;
  new.photo_attachments := coalesce(new.photo_attachments, '[]'::jsonb);
  new.burnout_report := coalesce(new.burnout_report, '{}'::jsonb);
  new.updated_at := now();

  return new;
end;
$$;
