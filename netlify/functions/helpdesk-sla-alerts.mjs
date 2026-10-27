import { createClient } from '@supabase/supabase-js';

export default async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[Helpdesk SLA alerts] Supabase URL or service role key is missing.');
    return new Response('Scheduled alert service is not configured.', { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase.rpc('dispatch_helpdesk_due_alerts');

  if (error) {
    console.error('[Helpdesk SLA alerts] Dispatch failed.', error.message);
    return new Response('Unable to dispatch helpdesk alerts.', { status: 500 });
  }

  return new Response(JSON.stringify({ notificationsCreated: Number(data) || 0 }), {
    headers: { 'content-type': 'application/json' },
  });
};
