'use client';

import { createBrowserClient } from '@supabase/ssr';
import {
  getSupabaseAnonKey,
  getSupabaseAuthCookieName,
  getSupabaseUrl,
  hasSupabaseConfig,
  SUPABASE_CONFIG_ERROR,
  validateSupabaseConfig,
} from './config';

let browserClient = null;

const cleanValue = (value) => String(value || '').trim();

export function createClient() {
  if (!hasSupabaseConfig()) {
    throw new Error(SUPABASE_CONFIG_ERROR);
  }

  validateSupabaseConfig();

  const supabaseUrl = cleanValue(getSupabaseUrl());
  const supabaseKey = cleanValue(getSupabaseAnonKey());

  if (supabaseKey.startsWith('sb_secret_')) {
    throw new Error(
      'Invalid Supabase key used in the browser. Use the sb_publishable_ key, not the sb_secret_ key.'
    );
  }

  if (browserClient) {
    return browserClient;
  }

  const authCookieName = getSupabaseAuthCookieName(supabaseUrl);

  browserClient = createBrowserClient(supabaseUrl, supabaseKey, {
    cookieOptions: {
      name: authCookieName,
    },
    auth: {
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return browserClient;
}
