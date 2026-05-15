'use client';

import { z } from 'zod';
import {
  parsePortalAccountPayload,
  parsePortalAccountUpdatePayload,
} from './portalAccountSchema';
import { createClient } from '@/lib/supabase/client';

const BASE_PROFILE_COLUMNS =
  'id, role, full_name, employee_id, department, branch, office, email, phone, status, created_at';
const PROFILE_COLUMNS = `${BASE_PROFILE_COLUMNS}, designation`;
const SUPABASE_REQUEST_TIMEOUT_MS = 12000;

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

const getTimerApi = () => {
  if (typeof window !== 'undefined') return window;
  return globalThis;
};

const parse = (schema, payload) => {
  const result = schema.safeParse(payload);

  if (!result.success) {
    throw new Error(result.error.issues[0]?.message || 'Invalid form details.');
  }

  return result.data;
};

const withTimeout = (promise, message, timeoutMs = SUPABASE_REQUEST_TIMEOUT_MS) => {
  const timerApi = getTimerApi();
  let timeoutId;

  const timeout = new Promise((_, reject) => {
    timeoutId = timerApi.setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) timerApi.clearTimeout(timeoutId);
  });
};

const isNetworkAuthError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  const name = String(error?.name || '').toLowerCase();

  return (
    message.includes('failed to fetch') ||
    message.includes('network') ||
    message.includes('fetch') ||
    name.includes('authretryablefetcherror') ||
    name === 'typeerror'
  );
};

const normalizeAuthRequestError = (error) => {
  if (isNetworkAuthError(error)) {
    return new Error(
      'Unable to reach the Supabase authentication server. Please check your internet connection, Supabase project status, and .env.local URL/key settings, then try again.'
    );
  }

  return error instanceof Error ? error : new Error('Authentication request failed.');
};

const clearLocalSupabaseSession = () => {
  if (typeof window === 'undefined') return;

  try {
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index);

      if (
        key &&
        (key.startsWith('sb-') ||
          key.includes('supabase') ||
          key.includes('mempco'))
      ) {
        window.localStorage.removeItem(key);
      }
    }
  } catch {
    // Ignore localStorage cleanup errors.
  }

  try {
    document.cookie.split(';').forEach((cookie) => {
      const name = cookie.split('=')[0].trim();

      if (
        name.startsWith('sb-') ||
        name.includes('supabase') ||
        name.includes('mempco')
      ) {
        document.cookie = `${name}=; Max-Age=0; path=/`;
      }
    });
  } catch {
    // Ignore cookie cleanup errors.
  }
};

const requestJson = async (url, options, fallbackMessage) => {
  const response = await withTimeout(
    fetch(url, options),
    `${fallbackMessage} Request took too long. Please try again.`
  );

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.error || fallbackMessage);
  }

  return result;
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

const normalizeJobTitle = (value = '') => {
  const title = String(value || '').trim();
  return title.toLowerCase() === 'employee' ? '' : title;
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

const isMissingDesignationColumnError = (error) =>
  error?.code === '42703' ||
  error?.code === 'PGRST204' ||
  error?.message?.toLowerCase().includes('designation');

const runProfileQuery = async (buildQuery, timeoutMessage) => {
  const result = await withTimeout(buildQuery(PROFILE_COLUMNS), timeoutMessage);

  if (!result.error || !isMissingDesignationColumnError(result.error)) {
    return result;
  }

  return withTimeout(buildQuery(BASE_PROFILE_COLUMNS), timeoutMessage);
};

const normalizePortalRole = (role = '') =>
  String(role || '')
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, '_');

export const mapProfileToPortalUser = (profile, authUser = null) => {
  const metadata = authUser?.user_metadata || {};
  const name =
    profile?.full_name ||
    metadata.name ||
    authUser?.email ||
    'MEMPCO User';

  const branch = profile?.branch || metadata.branch || profile?.office || '';
  const role = normalizePortalRole(profile?.role || metadata.role || 'employee');

  return {
    id: profile?.id || authUser?.id || '',
    role,
    name,
    initials: getInitials(name),
    employeeId: profile?.employee_id || metadata.employee_id || '',
    department: profile?.department || metadata.department || '',
    branch,
    office: profile?.office || branch,
    designation: normalizeJobTitle(profile?.designation || metadata.designation),
    email: profile?.email || authUser?.email || '',
    phone: profile?.phone || metadata.phone || '',
    status: profile?.status || 'Active',
    createdAt: profile?.created_at || '',
  };
};

export const isAdminRole = (role) => {
  const normalizedRole = normalizePortalRole(role);
  return normalizedRole === 'admin' || normalizedRole === 'superadmin';
};

export const isMarketingAdminRole = (role) => {
  const normalizedRole = normalizePortalRole(role);
  return normalizedRole === 'marketing_admin' || normalizedRole === 'superadmin';
};

export const isHrAdminRole = (role) => {
  const normalizedRole = normalizePortalRole(role);
  return normalizedRole === 'hr_admin' || normalizedRole === 'superadmin';
};

export const getPortalHomeRoute = (role) => {
  const normalizedRole = normalizePortalRole(role);

  if (normalizedRole === 'admin' || normalizedRole === 'superadmin') {
    return '/admin-dashboard';
  }

  if (normalizedRole === 'marketing_admin') {
    return '/marketing-admin';
  }

  if (normalizedRole === 'hr_admin') {
    return '/hr-admin';
  }

  return '/employee-dashboard';
};

export const INACTIVE_ACCOUNT_MESSAGE =
  'Your Account was already deactivated, you are prohibited from accessing this area';

export const isInactivePortalUser = (user) =>
  String(user?.status || '').trim().toLowerCase() === 'inactive';

const fetchProfile = async (supabase, authUser) => {
  const { data, error } = await runProfileQuery(
    (columns) =>
      supabase
        .from('profiles')
        .select(columns)
        .eq('id', authUser.id)
        .maybeSingle(),
    'Profile lookup took too long. Please check your Supabase table setup and try again.'
  );

  if (error) {
    throw normalizeProfileError(error);
  }

  if (!data) {
    throw new Error(
      `Login succeeded, but no profile record was found for ${authUser.email}. Create or repair this user's row in public.profiles.`
    );
  }

  return mapProfileToPortalUser(data, authUser);
};

export async function signInPortal(payload) {
  const parsed = parse(loginSchema, payload);
  const supabase = createClient();

  let data;
  let error;

  try {
    const result = await withTimeout(
      supabase.auth.signInWithPassword({
        email: parsed.email,
        password: parsed.password,
      }),
      'Login took too long. Please check your internet connection and Supabase project status.'
    );

    data = result.data;
    error = result.error;
  } catch (requestError) {
    throw normalizeAuthRequestError(requestError);
  }

  if (error) {
    throw new Error('Invalid email or password. Please check your login details.');
  }

  if (!data.user) {
    throw new Error('Unable to start a user session.');
  }

  return fetchProfile(supabase, data.user);
}

const wait = (ms) =>
  new Promise((resolve) => {
    const timerApi = getTimerApi();
    timerApi.setTimeout(resolve, ms);
  });

export async function getCurrentPortalUser() {
  const supabase = createClient();

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await withTimeout(
        supabase.auth.getSession(),
        'Session lookup took too long. Please sign in again.',
        5000
      );

      if (!sessionError && session?.user) {
        return await fetchProfile(supabase, session.user);
      }

      const {
        data: { user },
        error: userError,
      } = await withTimeout(
        supabase.auth.getUser(),
        'Session verification took too long. Please sign in again.',
        5000
      );

      if (!userError && user) {
        return await fetchProfile(supabase, user);
      }
    } catch (error) {
      console.warn(`[Portal Auth Retry ${attempt}]`, error);
    }

    await wait(350);
  }

  return null;
}

export async function listPortalUsers() {
  const supabase = createClient();

  const { data, error } = await runProfileQuery(
    (columns) =>
      supabase
        .from('profiles')
        .select(columns)
        .order('created_at', { ascending: false }),
    'User list took too long to load. Please try again.'
  );

  if (error) {
    throw normalizeProfileError(error);
  }

  return (data || []).map((profile) => mapProfileToPortalUser(profile));
}

export async function createPortalUser(payload) {
  const parsed = parsePortalAccountPayload(payload);

  const result = await requestJson(
    '/api/admin/users',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(parsed),
    },
    'Unable to create account.'
  );

  return result.profile;
}

export async function updatePortalUser(payload) {
  const parsed = parsePortalAccountUpdatePayload(payload);

  const result = await requestJson(
    '/api/admin/users',
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(parsed),
    },
    'Unable to update account.'
  );

  return result.profile;
}

export async function deletePortalUser(id) {
  return requestJson(
    '/api/admin/users',
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id }),
    },
    'Unable to delete account.'
  );
}

export async function signOutPortal() {
  const supabase = createClient();

  try {
    await withTimeout(
      supabase.auth.signOut({ scope: 'local' }),
      'Sign out took too long.',
      5000
    );
  } catch (error) {
    console.warn('[Portal Sign Out Warning]', error);
  } finally {
    clearLocalSupabaseSession();
  }
}

export async function sendPasswordResetEmail(email) {
  const parsedEmail = parse(emailSchema, email);
  const supabase = createClient();
  const callbackUrl = new URL('/auth/callback', window.location.origin);

  callbackUrl.searchParams.set('next', '/LogIn?mode=reset');

  const { error } = await withTimeout(
    supabase.auth.resetPasswordForEmail(parsedEmail, {
      redirectTo: callbackUrl.toString(),
    }),
    'Password reset request took too long. Please try again.'
  );

  if (error) {
    throw new Error(error.message || 'Unable to send password reset email.');
  }
}

export async function updatePortalPassword(password) {
  const parsedPassword = parse(passwordSchema, password);
  const supabase = createClient();

  const { error } = await withTimeout(
    supabase.auth.updateUser({
      password: parsedPassword,
    }),
    'Password update took too long. Please try again.'
  );

  if (error) {
    throw new Error(error.message || 'Unable to update password.');
  }

  return getCurrentPortalUser();
}