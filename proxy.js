import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

const LOGIN_ROUTE = '/LogIn';
const SUPABASE_PROXY_TIMEOUT_MS = 12000;

const hasSupabaseConfig = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

const getRequiredRole = (pathname) => {
  if (pathname.startsWith('/admin-dashboard')) return 'admin';
  if (pathname.startsWith('/marketing-admin')) return 'marketing_admin';
  if (pathname.startsWith('/hr-admin')) return 'hr_admin';
  if (pathname.startsWith('/dashboard')) return 'employee';
  return null;
};

const isAdminRole = (role) => ['admin', 'superadmin'].includes(role);
const isMarketingAdminRole = (role) => ['marketing_admin', 'superadmin'].includes(role);
const isHrAdminRole = (role) => ['hr_admin', 'superadmin'].includes(role);

const getPortalHomeRoute = (role) => {
  if (isAdminRole(role)) return '/admin-dashboard';
  if (role === 'marketing_admin') return '/marketing-admin';
  if (role === 'hr_admin') return '/hr-admin';
  return '/dashboard';
};

const hasRequiredRole = (role, requiredRole) => {
  if (!requiredRole) return true;
  if (requiredRole === 'admin') return isAdminRole(role);
  if (requiredRole === 'marketing_admin') return isMarketingAdminRole(role);
  if (requiredRole === 'hr_admin') return isHrAdminRole(role);
  return role === requiredRole;
};

const withTimeout = (promise) => {
  let timeoutId;

  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('Supabase request timed out.'));
    }, SUPABASE_PROXY_TIMEOUT_MS);
  });

  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timeoutId);
  });
};

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

  let user = null;

  try {
    const result = await withTimeout(supabase.auth.getUser());
    user = result.data.user;
  } catch {
    return requiredRole ? redirectWithCookies(request, response, LOGIN_ROUTE) : response;
  }

  if (requiredRole && !user) {
    return redirectWithCookies(request, response, LOGIN_ROUTE);
  }

  if (!user) {
    return response;
  }

  let profile = null;

  try {
    const result = await withTimeout(
      supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
    );
    profile = result.data;
  } catch {
    return requiredRole ? redirectWithCookies(request, response, LOGIN_ROUTE) : response;
  }

  if (isLoginPage && profile?.role && request.nextUrl.searchParams.get('mode') !== 'reset') {
    return redirectWithCookies(
      request,
      response,
      getPortalHomeRoute(profile.role)
    );
  }

  if (requiredRole && !hasRequiredRole(profile?.role, requiredRole)) {
    return redirectWithCookies(
      request,
      response,
      profile?.role ? getPortalHomeRoute(profile.role) : LOGIN_ROUTE
    );
  }

  return response;
}

export const config = {
  matcher: ['/LogIn', '/dashboard/:path*', '/admin-dashboard/:path*', '/marketing-admin/:path*', '/hr-admin/:path*'],
};
