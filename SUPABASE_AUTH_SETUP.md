# MEMPCO Supabase Auth Setup

This project now has a real Supabase-backed login module, but you need to create and configure the Supabase project because only you can own those credentials.

## 1. Create The Supabase Project

1. Go to Supabase and create a project.
2. Open Project Settings > API.
3. Copy:
   - Project URL
   - `anon` public API key

## 2. Add Local Environment Variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

Use the public `anon` key for `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and the secret `service_role` key for `SUPABASE_SERVICE_ROLE_KEY`. Never expose the service-role key in browser code or commit it to Git.

Restart the Next.js dev server after adding this file.

## 3. Run The Database Schema

Open Supabase Dashboard > SQL Editor, paste the contents of `supabase/schema.sql`, and run it.

That creates:

- `public.profiles`
- employee/admin/superadmin role support
- automatic profile creation when a Supabase Auth user is created
- Row Level Security policies
- admin profile access policy

## 4. Configure Auth Redirect URLs

In Supabase Dashboard > Authentication > URL Configuration:

Set the local Site URL:

```txt
http://localhost:3000
```

Add redirect URLs:

```txt
http://localhost:3000/auth/callback
```

When deployed, also add:

```txt
https://your-production-domain.com/auth/callback
```

## 5. Disable Public Signup

Public account creation has been removed from `/LogIn`. For stricter protection, also disable public email signups in Supabase Dashboard > Authentication > Providers > Email after creating your first superadmin. Superadmin-created users will still be created through the protected server endpoint using the service-role key.

## 6. Create The First Super Admin

Because public signup is disabled, create the first superadmin directly in Supabase:

1. Open Supabase Dashboard > Authentication > Users.
2. Add a user with your superadmin email and password.
3. In Supabase SQL Editor, create or update that profile:

```sql
insert into public.profiles (
  id,
  role,
  full_name,
  employee_id,
  department,
  branch,
  office,
  email,
  phone,
  status
)
select
  id,
  'superadmin',
  'MEMPCO Super Admin',
  'ADM-001',
  'ICT',
  'Central Office',
  'Central Office',
  email,
  '',
  'Active'
from auth.users
where email = 'your-superadmin-email@mempco.local'
on conflict (id) do update set
  role = 'superadmin',
  full_name = excluded.full_name,
  employee_id = excluded.employee_id,
  department = excluded.department,
  branch = excluded.branch,
  office = excluded.office,
  phone = excluded.phone,
  status = excluded.status;
```

After that, signing in with that email routes to `/admin-dashboard` and shows the **Create User** page in the admin sidebar.

## 7. Create Employee Accounts

1. Sign in as the superadmin.
2. Open `/admin-dashboard`.
3. Go to **Create User**.
4. Enter the employee profile details, role, and temporary password.
5. Submit the form. The user can then sign in from `/LogIn`.

## 8. Current Scope

Implemented now:

- Supabase Auth login
- superadmin-only account creation, editing, and deletion
- password reset email
- password update form
- server auth callback
- Next.js proxy protection for `/dashboard` and `/admin-dashboard`
- Supabase-backed profile and role checks

Still local demo storage:

- helpdesk tickets
- ticket attachments
- ticket admin updates

The next backend migration should move tickets into Supabase Postgres, and larger ticket/reporting queries can use Prisma against the same Supabase database.
