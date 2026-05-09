-- MEMPCO portal auth schema for Supabase.
-- Run this in Supabase Dashboard > SQL Editor before using the real login module.

do $$
begin
  create type public.user_role as enum ('employee', 'admin');
exception
  when duplicate_object then null;
end $$;

alter type public.user_role add value if not exists 'superadmin';

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'employee',
  full_name text not null,
  employee_id text,
  department text,
  branch text,
  office text,
  designation text,
  email text not null,
  phone text,
  status text not null default 'Active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
add column if not exists role public.user_role not null default 'employee',
add column if not exists full_name text not null default 'MEMPCO User',
add column if not exists employee_id text,
add column if not exists department text,
add column if not exists branch text,
add column if not exists office text,
add column if not exists designation text,
add column if not exists email text,
add column if not exists phone text,
add column if not exists status text not null default 'Active',
add column if not exists created_at timestamptz not null default now(),
add column if not exists updated_at timestamptz not null default now();

update public.profiles
set
  role = coalesce(role, 'employee'::public.user_role),
  full_name = coalesce(nullif(full_name, ''), email, 'MEMPCO User'),
  email = coalesce(nullif(email, ''), 'missing-email-' || id::text || '@mempco.local'),
  status = coalesce(nullif(status, ''), 'Active'),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

alter table public.profiles
alter column role set default 'employee',
alter column role set not null,
alter column full_name set not null,
alter column email set not null,
alter column status set not null,
alter column created_at set not null,
alter column updated_at set not null;

create index if not exists profiles_email_idx on public.profiles (lower(email));
create index if not exists profiles_role_idx on public.profiles (role);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    role,
    full_name,
    employee_id,
    department,
    branch,
    office,
    designation,
    email,
    phone,
    status
  )
  values (
    new.id,
    'employee',
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'employee_id',
    new.raw_user_meta_data ->> 'department',
    new.raw_user_meta_data ->> 'branch',
    new.raw_user_meta_data ->> 'branch',
    new.raw_user_meta_data ->> 'designation',
    new.email,
    new.raw_user_meta_data ->> 'phone',
    'Active'
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    employee_id = excluded.employee_id,
    department = excluded.department,
    branch = excluded.branch,
    office = excluded.office,
    designation = excluded.designation,
    phone = excluded.phone;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role::text in ('admin', 'superadmin')
  );
$$;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles"
on public.profiles for select
using (public.is_admin());

drop policy if exists "Users can insert own employee profile" on public.profiles;
create policy "Users can insert own employee profile"
on public.profiles for insert
with check (auth.uid() = id and role = 'employee');

drop policy if exists "Users can update own employee profile" on public.profiles;
create policy "Users can update own employee profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id and role = 'employee');

drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles"
on public.profiles for update
using (public.is_admin())
with check (public.is_admin());

-- To make your first superadmin after creating the user in Supabase Auth:
-- update public.profiles set role = 'superadmin' where email = 'your-superadmin-email@mempco.local';
