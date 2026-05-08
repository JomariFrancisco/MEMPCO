import { createBrowserClient } from '@supabase/ssr';
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  hasSupabaseConfig,
  SUPABASE_CONFIG_ERROR,
} from './config';

export function createClient() {
  if (!hasSupabaseConfig()) {
    throw new Error(SUPABASE_CONFIG_ERROR);
  }

  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
}
