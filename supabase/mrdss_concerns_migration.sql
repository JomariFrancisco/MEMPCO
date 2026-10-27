-- Shared MRDSS concerns queue and staff assignment support.
-- Run once in the Supabase SQL Editor after the portal schema is installed.

alter type public.user_role add value if not exists 'mrdss_admin';

create or replace function public.is_mrdss_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_portal_role(array['mrdss_admin']);
$$;

create or replace function public.get_mrdss_assignable_staff()
returns table (staff_id uuid, staff_name text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, coalesce(nullif(trim(p.full_name), ''), p.email)
  from public.profiles p
  where public.is_mrdss_admin()
    and p.role::text in ('mrdss_admin', 'superadmin')
    and coalesce(p.status, 'Active') = 'Active'
  order by p.full_name, p.email;
$$;

revoke all on function public.is_mrdss_admin() from public, anon;
grant execute on function public.is_mrdss_admin() to authenticated;
revoke all on function public.get_mrdss_assignable_staff() from public, anon;
grant execute on function public.get_mrdss_assignable_staff() to authenticated;

create table if not exists public.member_concerns (
  id text primary key check (id ~ '^MCC-[0-9]{4}-[A-F0-9]{6}$'),
  member_name text not null check (length(trim(member_name)) between 0 and 120),
  branch text not null check (length(trim(branch)) between 1 and 120),
  phone text not null default '' check (length(phone) <= 40),
  email text not null default '' check (length(email) <= 254),
  preferred_contact text not null check (preferred_contact in ('Text', 'Call', 'Email')),
  concern_type text not null check (concern_type in ('Concern', 'Question', 'Feedback', 'Compliment')),
  category text not null check (category in ('Loans', 'Savings & Deposits', 'Member Services', 'Branch Service', 'Other')),
  message text not null check (length(trim(message)) between 12 and 3000),
  attachment jsonb,
  status text not null default 'New' check (status in ('New', 'In Review', 'Waiting for Member', 'Resolved', 'Closed')),
  priority text not null default 'Normal' check (priority in ('Low', 'Normal', 'High', 'Urgent')),
  assigned_staff_id uuid references public.profiles(id) on delete set null,
  activities jsonb not null default '[]'::jsonb check (jsonb_typeof(activities) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists member_concerns_created_at_idx
on public.member_concerns (created_at desc);
create index if not exists member_concerns_status_created_at_idx
on public.member_concerns (status, created_at desc);
create index if not exists member_concerns_assigned_staff_idx
on public.member_concerns (assigned_staff_id);

alter table public.member_concerns enable row level security;

drop policy if exists "Public can submit member concerns" on public.member_concerns;
create policy "Public can submit member concerns"
on public.member_concerns for insert
to anon, authenticated
with check (true);

drop policy if exists "MRDSS admins can read member concerns" on public.member_concerns;
create policy "MRDSS admins can read member concerns"
on public.member_concerns for select
to authenticated
using (public.is_mrdss_admin());

drop policy if exists "MRDSS admins can update member concerns" on public.member_concerns;
create policy "MRDSS admins can update member concerns"
on public.member_concerns for update
to authenticated
using (public.is_mrdss_admin())
with check (public.is_mrdss_admin());

revoke all on public.member_concerns from public, anon, authenticated;
grant insert (id, member_name, branch, phone, email, preferred_contact, concern_type, category, message, attachment)
on public.member_concerns to anon, authenticated;
grant select on public.member_concerns to authenticated;
grant update (status, priority, assigned_staff_id, activities)
on public.member_concerns to authenticated;

create or replace function public.prepare_member_concern_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.activities := jsonb_build_array(jsonb_build_object(
    'id', new.id || '-submitted',
    'type', 'Submitted',
    'detail', 'Concern submitted through the website.',
    'at', coalesce(new.created_at, now())
  ));
  return new;
end;
$$;

drop trigger if exists member_concerns_prepare_insert on public.member_concerns;
create trigger member_concerns_prepare_insert
before insert on public.member_concerns
for each row execute function public.prepare_member_concern_insert();

drop trigger if exists member_concerns_set_updated_at on public.member_concerns;
create trigger member_concerns_set_updated_at
before update on public.member_concerns
for each row execute function public.set_updated_at();

create or replace function public.validate_member_concern_assignee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assigned_staff_id is not null and not exists (
    select 1
    from public.profiles p
    where p.id = new.assigned_staff_id
      and p.role::text in ('mrdss_admin', 'superadmin')
      and coalesce(p.status, 'Active') = 'Active'
  ) then
    raise exception 'Cases can only be assigned to active MRDSS admins or superadmins.';
  end if;
  return new;
end;
$$;

drop trigger if exists member_concerns_validate_assignee on public.member_concerns;
create trigger member_concerns_validate_assignee
before insert or update of assigned_staff_id on public.member_concerns
for each row execute function public.validate_member_concern_assignee();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'member-concern-attachments',
  'member-concern-attachments',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'application/pdf']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can upload member concern attachments" on storage.objects;
create policy "Public can upload member concern attachments"
on storage.objects for insert
to anon, authenticated
with check (
  bucket_id = 'member-concern-attachments'
  and (storage.foldername(name))[1] ~ '^MCC-[0-9]{4}-[A-F0-9]{6}$'
);

drop policy if exists "MRDSS admins can read member concern attachments" on storage.objects;
create policy "MRDSS admins can read member concern attachments"
on storage.objects for select
to authenticated
using (
  bucket_id = 'member-concern-attachments'
  and public.is_mrdss_admin()
);

grant usage on schema public to anon, authenticated;
grant execute on function public.is_mrdss_admin() to authenticated;
grant execute on function public.get_mrdss_assignable_staff() to authenticated;

alter table public.member_concerns replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.member_concerns;
  end if;
exception
  when duplicate_object then null;
end $$;
