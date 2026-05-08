import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  hasSupabaseConfig,
  SUPABASE_CONFIG_ERROR,
} from './config';

export async function createClient() {
  if (!hasSupabaseConfig()) {
    throw new Error(SUPABASE_CONFIG_ERROR);
  }

  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
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
          // Server Components cannot set cookies. Middleware and Route Handlers can.
        }
      },
    },
  });
}
