import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import {
  getSupabaseAnonKey,
  getSupabaseAuthCookieName,
  getSupabaseUrl,
  hasSupabaseConfig,
  SUPABASE_CONFIG_ERROR,
  validateSupabaseConfig,
} from './config';

const cleanValue = (value) => String(value || '').trim();

export async function createClient() {
  if (!hasSupabaseConfig()) {
    throw new Error(SUPABASE_CONFIG_ERROR);
  }

  validateSupabaseConfig();

  const supabaseUrl = cleanValue(getSupabaseUrl());
  const supabaseKey = cleanValue(getSupabaseAnonKey());

  if (supabaseKey.startsWith('sb_secret_')) {
    throw new Error(
      'Invalid Supabase key used in the server browser-compatible client. Use the publishable/anon key here, not the service role key.'
    );
  }

  const authCookieName = getSupabaseAuthCookieName(supabaseUrl);
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseKey, {
    cookieOptions: {
      name: authCookieName,
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot set cookies.
          // Middleware and Route Handlers can.
        }
      },
    },
  });
}
