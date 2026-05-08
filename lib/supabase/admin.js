import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getSupabaseUrl, hasSupabaseConfig } from './config';

export const SUPABASE_ADMIN_CONFIG_ERROR =
  'Supabase admin access is not configured yet. Add SUPABASE_SERVICE_ROLE_KEY to .env.local.';

export const hasSupabaseAdminConfig = () =>
  hasSupabaseConfig() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

export function createAdminClient() {
  if (!hasSupabaseAdminConfig()) {
    throw new Error(SUPABASE_ADMIN_CONFIG_ERROR);
  }

  return createSupabaseClient(
    getSupabaseUrl(),
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
