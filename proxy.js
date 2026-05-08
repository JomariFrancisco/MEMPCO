import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

const LOGIN_ROUTE = '/LogIn';

const hasSupabaseConfig = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

const getRequiredRole = (pathname) => {
  if (pathname.startsWith('/admin-dashboard')) return 'admin';
  if (pathname.startsWith('/dashboard')) return 'employee';
  return null;
};

const isAdminRole = (role) => ['admin', 'superadmin'].includes(role);

const redirectWithCookies = (request, response, pathname) => {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = '';

  const redirectResponse = NextResponse.redirect(url);
  response.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });

  return redirectResponse;
};

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const requiredRole = getRequiredRole(pathname);
  const isLoginPage = pathname === LOGIN_ROUTE;

  if (!hasSupabaseConfig() || (!requiredRole && !isLoginPage)) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (requiredRole && !user) {
    return redirectWithCookies(request, response, LOGIN_ROUTE);
  }

  if (!user) {
    return response;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (isLoginPage && profile?.role) {
    return redirectWithCookies(
      request,
      response,
      isAdminRole(profile.role) ? '/admin-dashboard' : '/dashboard'
    );
  }

  if (
    requiredRole &&
    !(
      profile?.role === requiredRole ||
      (requiredRole === 'admin' && isAdminRole(profile?.role))
    )
  ) {
    return redirectWithCookies(
      request,
      response,
      isAdminRole(profile?.role) ? '/admin-dashboard' : LOGIN_ROUTE
    );
  }

  return response;
}

export const config = {
  matcher: ['/LogIn', '/dashboard/:path*', '/admin-dashboard/:path*'],
};
