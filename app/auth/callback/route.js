import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/employee-dashboard';
  const redirectUrl = next.startsWith('/') && !next.startsWith('//')
    ? new URL(next, requestUrl.origin)
    : new URL('/employee-dashboard', requestUrl.origin);

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        throw error;
      }
    } catch {
      redirectUrl.pathname = '/LogIn';
      redirectUrl.search = '';
      redirectUrl.searchParams.set('auth_error', 'setup');
    }
  }

  return NextResponse.redirect(redirectUrl);
}
