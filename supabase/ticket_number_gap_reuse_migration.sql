-- Run in Supabase SQL Editor to reuse deleted ticket numbers automatically.
-- Existing ticket IDs stay unchanged. Only new ticket allocation changes.
-- This function is also included in schema.sql and the ICT hardening migration.

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

notify pgrst, 'reload schema';
