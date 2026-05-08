'use client';

import { z } from 'zod';
import {
  parsePortalAccountPayload,
  parsePortalAccountUpdatePayload,
} from './portalAccountSchema';
import { createClient } from '@/lib/supabase/client';

const PROFILE_COLUMNS =
  'id, role, full_name, employee_id, department, branch, office, email, phone, status, created_at';

const emailSchema = z
  .string()
  .trim()
  .email('Enter a valid email address.');

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password.'),
});

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.');

const parse = (schema, payload) => {
  const result = schema.safeParse(payload);

  if (!result.success) {
    throw new Error(result.error.issues[0]?.message || 'Invalid form details.');
  }

  return result.data;
};

const getInitials = (name = '') => {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return initials || 'ME';
};

const normalizeProfileError = (error) => {
  if (!error) return null;

  if (
    error.message?.toLowerCase().includes('profiles') ||
    error.code === 'PGRST205' ||
    error.code === '42P01'
  ) {
    return new Error(
      'Supabase is connected, but the profiles table is not ready. Run supabase/schema.sql in your Supabase SQL editor.'
    );
  }

  return new Error(error.message || 'Unable to read profile details.');
};

export const mapProfileToPortalUser = (profile, authUser = null) => {
  const metadata = authUser?.user_metadata || {};
  const name =
    profile?.full_name ||
    metadata.name ||
    authUser?.email ||
    'MEMPCO User';
  const branch = profile?.branch || metadata.branch || profile?.office || '';

  return {
    id: profile?.id || authUser?.id || '',
    role: profile?.role || 'employee',
    name,
    initials: getInitials(name),
    employeeId: profile?.employee_id || metadata.employee_id || '',
    department: profile?.department || metadata.department || '',
    branch,
    office: profile?.office || branch,
    email: profile?.email || authUser?.email || '',
    phone: profile?.phone || metadata.phone || '',
    status: profile?.status || 'Active',
    createdAt: profile?.created_at || '',
  };
};

export const isAdminRole = (role) => ['admin', 'superadmin'].includes(role);

const fetchProfile = async (supabase, authUser) => {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', authUser.id)
    .maybeSingle();

  if (error) {
    throw normalizeProfileError(error);
  }

  return mapProfileToPortalUser(data, authUser);
};

export async function signInPortal(payload) {
  const parsed = parse(loginSchema, payload);
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.email,
    password: parsed.password,
  });

  if (error) {
    throw new Error('Invalid email or password. Please check your login details.');
  }

  if (!data.user) {
    throw new Error('Unable to start a user session.');
  }

  return fetchProfile(supabase, data.user);
}

export async function getCurrentPortalUser() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return fetchProfile(supabase, user);
}

export async function listPortalUsers() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .order('created_at', { ascending: false });

  if (error) {
    throw normalizeProfileError(error);
  }

  return (data || []).map((profile) => mapProfileToPortalUser(profile));
}

export async function createPortalUser(payload) {
  const parsed = parsePortalAccountPayload(payload);

  const response = await fetch('/api/admin/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(parsed),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || 'Unable to create account.');
  }

  return result.profile;
}

export async function updatePortalUser(payload) {
  const parsed = parsePortalAccountUpdatePayload(payload);

  const response = await fetch('/api/admin/users', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(parsed),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || 'Unable to update account.');
  }

  return result.profile;
}

export async function deletePortalUser(id) {
  const response = await fetch('/api/admin/users', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || 'Unable to delete account.');
  }

  return result;
}

export async function signOutPortal() {
  const supabase = createClient();
  await supabase.auth.signOut();
}

export async function sendPasswordResetEmail(email) {
  const parsedEmail = parse(emailSchema, email);
  const supabase = createClient();
  const callbackUrl = new URL('/auth/callback', window.location.origin);
  callbackUrl.searchParams.set('next', '/LogIn?mode=reset');

  const { error } = await supabase.auth.resetPasswordForEmail(parsedEmail, {
    redirectTo: callbackUrl.toString(),
  });

  if (error) {
    throw new Error(error.message || 'Unable to send password reset email.');
  }
}

export async function updatePortalPassword(password) {
  const parsedPassword = parse(passwordSchema, password);
  const supabase = createClient();

  const { error } = await supabase.auth.updateUser({
    password: parsedPassword,
  });

  if (error) {
    throw new Error(error.message || 'Unable to update password.');
  }

  return getCurrentPortalUser();
}
