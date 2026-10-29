-- Run in the Supabase SQL Editor to reset existing current-year ticket IDs and the next number.
-- Renumber all generated tickets for the current year from 0001, oldest first.
-- Updates every single-column foreign key that references public.tickets.id,
-- repairs ticket IDs embedded in notification text, and resets the allocator.
-- Take a database backup and run during a maintenance window.
-- This intentionally changes existing public ticket IDs. The SQL notices show
-- the old_id -> new_id mapping; the final query lists the resulting tickets.
-- Keep creation and use of temporary tables inside ONE atomic statement so
-- SQL Editor execution does not depend on a session between statements.
-- The migration stops before changing data if it finds a composite foreign key
-- that references tickets.id, because this script only rewrites single-column FKs.

do $renumber$
declare
  ticket_count bigint;
  next_number bigint;
  fk record;
  trigger_row record;
  mapping_row record;
begin

lock table public.tickets in access exclusive mode;

-- Fail safely rather than leaving part of a composite ticket reference stale.
if exists (
  select 1
  from pg_constraint constraint_row
  join pg_attribute referenced_column
    on referenced_column.attrelid = constraint_row.confrelid
   and referenced_column.attname = 'id'
   and not referenced_column.attisdropped
  where constraint_row.contype = 'f'
    and constraint_row.confrelid = 'public.tickets'::regclass
    and referenced_column.attnum = any(constraint_row.confkey)
    and (
      cardinality(constraint_row.conkey) <> 1
      or cardinality(constraint_row.confkey) <> 1
      or constraint_row.confkey[1] <> referenced_column.attnum
    )
) then
  raise exception 'Ticket renumbering stopped: a composite foreign key references public.tickets.id. Update the migration to handle that relationship before retrying.';
end if;

create temporary table ticket_id_renumber_map (
  old_id text primary key,
  temporary_id text not null unique,
  new_id text not null unique
) on commit drop;

insert into ticket_id_renumber_map (old_id, temporary_id, new_id)
select
  ranked.id,
  '__ticket_renumber__' || gen_random_uuid()::text,
  'TCK-' || to_char(now(), 'YYYY') || '-' ||
    lpad(ranked.position::text, greatest(4, length(ranked.position::text)), '0')
from (
  select t.id,
         row_number() over (order by t.created_at asc, t.id asc) as position
  from public.tickets t
  where t.id ~ ('^TCK-' || to_char(now(), 'YYYY') || '-[0-9]+$')
) ranked;

  select count(*) into ticket_count from ticket_id_renumber_map;
  if ticket_count > 999999 then
    raise exception 'Cannot renumber more than 999999 tickets for one year.';
  end if;

  if exists (
    select 1
    from public.tickets t
    join ticket_id_renumber_map m on m.new_id = t.id
    where not exists (
      select 1 from ticket_id_renumber_map current_ids where current_ids.old_id = t.id
    )
  ) then
    raise exception 'A target ticket ID is occupied by a ticket outside the renumbering set.';
  end if;
-- Record all foreign keys pointing directly at tickets.id and their original
-- deferrability, so linked rows can be changed in the same transaction.
create temporary table ticket_id_renumber_fks on commit drop as
select
  child_ns.nspname as schema_name,
  child.relname as table_name,
  constraint_row.conname as constraint_name,
  child_column.attname as column_name,
  constraint_row.condeferrable as was_deferrable,
  constraint_row.condeferred as was_initially_deferred
from pg_constraint constraint_row
join pg_class child on child.oid = constraint_row.conrelid
join pg_namespace child_ns on child_ns.oid = child.relnamespace
join pg_attribute referenced_column
  on referenced_column.attrelid = constraint_row.confrelid
 and referenced_column.attname = 'id'
 and not referenced_column.attisdropped
join pg_attribute child_column
  on child_column.attrelid = constraint_row.conrelid
 and child_column.attnum = constraint_row.conkey[1]
 and not child_column.attisdropped
where constraint_row.contype = 'f'
  and constraint_row.confrelid = 'public.tickets'::regclass
  and constraint_row.confkey = array[referenced_column.attnum]::smallint[]
  and cardinality(constraint_row.conkey) = 1;

  for fk in select * from ticket_id_renumber_fks loop
    execute format(
      'alter table %I.%I alter constraint %I deferrable initially deferred',
      fk.schema_name, fk.table_name, fk.constraint_name
    );
  end loop;

  set constraints all deferred;

  -- Preserve existing trigger enablement, then suppress ticket side effects
  -- (audit notifications and updated_at changes) while only the ID is changed.
  create temporary table ticket_id_renumber_triggers on commit drop as
  select tgname, tgenabled
  from pg_trigger
  where tgrelid = 'public.tickets'::regclass and not tgisinternal;

  alter table public.tickets disable trigger user;

  -- Update notification prose while the old IDs are still available.
  update public.user_notifications n
  set message = replace(n.message, m.old_id, m.new_id)
  from ticket_id_renumber_map m
  where n.related_ticket_id = m.old_id;

  -- Move child references to temporary IDs, then move the ticket primary keys.
  for fk in select * from ticket_id_renumber_fks loop
    execute format(
      'update %I.%I child set %I = mapping.temporary_id from ticket_id_renumber_map mapping where child.%I = mapping.old_id',
      fk.schema_name, fk.table_name, fk.column_name, fk.column_name
    );
  end loop;

  update public.tickets t
  set id = m.temporary_id
  from ticket_id_renumber_map m
  where t.id = m.old_id;

  -- Complete the parent and child references with their final IDs.
  update public.tickets t
  set id = m.new_id
  from ticket_id_renumber_map m
  where t.id = m.temporary_id;

  for fk in select * from ticket_id_renumber_fks loop
    execute format(
      'update %I.%I child set %I = mapping.new_id from ticket_id_renumber_map mapping where child.%I = mapping.temporary_id',
      fk.schema_name, fk.table_name, fk.column_name, fk.column_name
    );
  end loop;

  -- Validate references and flush pending FK events before changing constraints
  -- or re-enabling triggers on the updated tables.
  set constraints all immediate;

  -- Restore original FK deferrability and ticket trigger states.
  for fk in select * from ticket_id_renumber_fks loop
    if fk.was_deferrable then
      execute format(
        'alter table %I.%I alter constraint %I deferrable initially %s',
        fk.schema_name, fk.table_name, fk.constraint_name,
        case when fk.was_initially_deferred then 'deferred' else 'immediate' end
      );
    else
      execute format(
        'alter table %I.%I alter constraint %I not deferrable',
        fk.schema_name, fk.table_name, fk.constraint_name
      );
    end if;
  end loop;

  for trigger_row in select * from ticket_id_renumber_triggers loop
    if trigger_row.tgenabled = 'O' then
      execute format('alter table public.tickets enable trigger %I', trigger_row.tgname);
    elsif trigger_row.tgenabled = 'R' then
      execute format('alter table public.tickets enable replica trigger %I', trigger_row.tgname);
    elsif trigger_row.tgenabled = 'A' then
      execute format('alter table public.tickets enable always trigger %I', trigger_row.tgname);
    end if;
  end loop;
-- Ensure the next generated ID follows the renumbered current-year tickets.
-- RESTART is transactional, so a failed reset also rolls back the allocator.
  select count(*) + 1 into next_number from ticket_id_renumber_map;
  execute format('alter sequence public.ticket_number_seq restart with %s', next_number);

  for mapping_row in select old_id, new_id from ticket_id_renumber_map order by new_id loop
    raise notice '% -> %', mapping_row.old_id, mapping_row.new_id;
  end loop;
  raise notice 'Renumbered % tickets. Next ticket number: %.', ticket_count, next_number;

  -- Also allow this block to be rerun within a caller-managed transaction.
  drop table pg_temp.ticket_id_renumber_triggers;
  drop table pg_temp.ticket_id_renumber_fks;
  drop table pg_temp.ticket_id_renumber_map;

  notify pgrst, 'reload schema';
end;
$renumber$;

-- This result query uses the permanent table, never a dropped temporary table.
select id, created_at
from public.tickets
where id ~ ('^TCK-' || to_char(now(), 'YYYY') || '-[0-9]+$')
order by created_at, id;
