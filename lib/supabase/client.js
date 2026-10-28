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

const readBrowserCookies = () =>
  document.cookie
    .split(';')
    .map((cookie) => cookie.trim())
    .filter(Boolean)
    .map((cookie) => {
      const separator = cookie.indexOf('=');
      const name = separator < 0 ? cookie : cookie.slice(0, separator);
      const value = separator < 0 ? '' : cookie.slice(separator + 1);
      try {
        return { name: decodeURIComponent(name), value: decodeURIComponent(value) };
      } catch {
        return { name, value };
      }
    });

const writeBrowserSessionCookies = (cookies) => {
  cookies.forEach(({ name, value, options = {} }) => {
    const attributes = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`];
    if (options.path) attributes.push(`Path=${options.path}`);
    if (options.domain) attributes.push(`Domain=${options.domain}`);
    if (options.sameSite) {
      const sameSite = String(options.sameSite);
      attributes.push(`SameSite=${sameSite[0].toUpperCase()}${sameSite.slice(1)}`);
    }
    if (options.secure || window.location.protocol === 'https:') attributes.push('Secure');
    const removingCookie = value === '';
    if (removingCookie && options.maxAge !== undefined) attributes.push(`Max-Age=${options.maxAge}`);
    if (removingCookie && options.expires) attributes.push(`Expires=${options.expires.toUTCString()}`);

    // Supabase normally assigns a 400-day lifetime. Omitting Max-Age and
    // Expires for active values makes these browser-session cookies instead.
    document.cookie = attributes.join('; ');
  });
};

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
    cookies: {
      getAll: readBrowserCookies,
      setAll: writeBrowserSessionCookies,
    },
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
