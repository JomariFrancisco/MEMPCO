-- Restart ticket numbering when the tickets table has been completely cleared.
-- With no tickets, the next regular ticket ID and Burnout code both start at 1.
-- If tickets still exist, preserve the sequence high-water marks and current IDs.

create sequence if not exists public.ticket_number_seq start 1;
create sequence if not exists public.burnout_number_seq start 1;

select setval(
  'public.ticket_number_seq',
  case when exists (select 1 from public.tickets)
    then greatest(
      (select last_value from public.ticket_number_seq),
      coalesce((
        select max(substring(id from '[0-9]+$')::bigint)
        from public.tickets
        where id ~ '^TCK-[0-9]{4}-[0-9]+$'
      ), 0),
      1
    )
    else 1
  end,
  exists (select 1 from public.tickets)
);

select setval(
  'public.burnout_number_seq',
  case when exists (select 1 from public.tickets)
    then greatest(
      (select last_value from public.burnout_number_seq),
      coalesce((
        select max(substring(ticket_code from '^[^-]+-([0-9]+)-')::bigint)
        from public.tickets
        where support_category = 'Burnout'
      ), 0),
      1
    )
    else 1
  end,
  exists (select 1 from public.tickets)
);

notify pgrst, 'reload schema';
