import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import {
  getSupabaseAnonKey,
  getSupabaseAuthCookieName,
  getSupabaseUrl,
  hasSupabaseConfig,
} from './lib/supabase/config';

const LOGIN_ROUTE = '/helpdesk';
const PORTAL_LOGIN_ROUTES = ['/superadmin', '/mrdss-login'];
const SUPABASE_PROXY_TIMEOUT_MS = 12000;

const normalizePortalRole = (role = '') =>
  String(role || '')
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, '_');

const getRequiredRole = (pathname) => {
  if (pathname.startsWith('/admin-dashboard')) return 'admin';
  if (pathname.startsWith('/marketing-admin')) return 'marketing_admin';
  if (pathname.startsWith('/hr-admin')) return 'hr_admin';
  if (pathname.startsWith('/mrdss-admin')) return 'mrdss_admin';
  if (pathname.startsWith('/employee-dashboard')) return 'employee';
  return null;
};

const isAdminRole = (role) => ['admin', 'superadmin'].includes(role);
const isMarketingAdminRole = (role) => ['marketing_admin', 'superadmin'].includes(role);
const isHrAdminRole = (role) => ['hr_admin', 'superadmin'].includes(role);
const isMrdssAdminRole = (role) => ['mrdss_admin', 'superadmin'].includes(role);
const isMrdssWorkspaceRole = (role) => [
  'mrdss_admin', 'branch_manager_admin', 'area_manager_admin', 'coo_admin', 'superadmin',
].includes(role);

const getPortalHomeRoute = (role) => {
  if (isAdminRole(role)) return '/admin-dashboard';
  if (role === 'marketing_admin') return '/marketing-admin';
  if (role === 'hr_admin') return '/hr-admin';
  if (['mrdss_admin', 'branch_manager_admin', 'area_manager_admin', 'coo_admin'].includes(role)) return '/mrdss-admin';
  return '/employee-dashboard';
};

const getLoginRoute = (requiredRole) => {
  if (requiredRole === 'marketing_admin') return '/marketing';
  if (requiredRole === 'hr_admin') return '/hr';
  if (requiredRole === 'mrdss_admin') return '/mrdss-login';
  return LOGIN_ROUTE;
};

const hasRequiredRole = (role, requiredRole) => {
  if (!requiredRole) return true;
  if (requiredRole === 'admin') return isAdminRole(role);
  if (requiredRole === 'marketing_admin') return isMarketingAdminRole(role);
  if (requiredRole === 'hr_admin') return isHrAdminRole(role);
  if (requiredRole === 'mrdss_admin') return isMrdssWorkspaceRole(role);
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
  const isLoginPage = PORTAL_LOGIN_ROUTES.includes(pathname);

  if (!hasSupabaseConfig() || (!requiredRole && !isLoginPage)) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookieOptions: {
        name: getSupabaseAuthCookieName(),
      },
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
    return requiredRole ? redirectWithCookies(request, response, getLoginRoute(requiredRole)) : response;
  }

  if (requiredRole && !user) {
    return redirectWithCookies(request, response, getLoginRoute(requiredRole));
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
    profile = result.data
      ? { ...result.data, role: normalizePortalRole(result.data.role) }
      : null;
  } catch {
    return requiredRole ? redirectWithCookies(request, response, getLoginRoute(requiredRole)) : response;
  }

  if (isLoginPage && profile?.role && request.nextUrl.searchParams.get('mode') !== 'reset') {
    const loginDestination = pathname === '/mrdss-login' && profile.role === 'superadmin'
      ? '/mrdss-admin'
      : getPortalHomeRoute(profile.role);
    return redirectWithCookies(
      request,
      response,
      loginDestination
    );
  }

  if (requiredRole && !hasRequiredRole(profile?.role, requiredRole)) {
    return redirectWithCookies(
      request,
      response,
      profile?.role ? getPortalHomeRoute(profile.role) : getLoginRoute(requiredRole)
    );
  }

  return response;
}

export const config = {
  matcher: ['/superadmin', '/mrdss-login', '/mrdss-admin/:path*', '/employee-dashboard/:path*', '/admin-dashboard/:path*', '/marketing-admin/:path*', '/hr-admin/:path*'],
};
