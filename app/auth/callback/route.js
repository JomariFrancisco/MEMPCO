import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard';
  const redirectUrl = new URL(next, requestUrl.origin);

  if (code) {
    try {
      const supabase = await createClient();
      await supabase.auth.exchangeCodeForSession(code);
    } catch {
      redirectUrl.pathname = '/LogIn';
      redirectUrl.search = '';
      redirectUrl.searchParams.set('auth_error', 'setup');
    }
  }

  return NextResponse.redirect(redirectUrl);
}
