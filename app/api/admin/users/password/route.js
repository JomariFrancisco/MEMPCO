import { NextResponse } from 'next/server';
import { generateTemporaryPassword } from '@/lib/auth/temporaryPassword';
import {
  SUPABASE_ADMIN_CONFIG_ERROR,
  createAdminClient,
  hasSupabaseAdminConfig,
} from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, rateLimitResponse } from '@/lib/server/rateLimit';

const normalizePortalRole = (role = '') =>
  String(role || '')
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, '_');

const isSuperadminRole = (role = '') => normalizePortalRole(role) === 'superadmin';
const isIctAdminRole = (role = '') => normalizePortalRole(role) === 'admin';

const parseRequestJson = async (request) => {
  try {
    return await request.json();
  } catch {
    return {};
  }
};

const authorizePasswordRefresh = async () => {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { response: NextResponse.json({ error: 'Login required.' }, { status: 401 }) };
  }

  const { data: adminProfile, error: profileError } = await supabase
    .from('profiles')
    .select('role, full_name, email, status')
    .eq('id', user.id)
    .maybeSingle();

  const active = String(adminProfile?.status || 'Active').trim().toLowerCase() === 'active';
  const superadmin = isSuperadminRole(adminProfile?.role);
  const ictAdmin = isIctAdminRole(adminProfile?.role);

  if (profileError || !active || (!superadmin && !ictAdmin)) {
    return {
      response: NextResponse.json({ error: 'Admin access required.' }, { status: 403 }),
    };
  }

  return { user, profile: adminProfile, isSuperadmin: superadmin };
};

const getActorName = (auth) =>
  auth?.profile?.full_name || auth?.user?.email || 'Portal Admin';

const isMissingAuditTableError = (error) =>
  error?.code === '42P01' ||
  error?.code === 'PGRST205' ||
  error?.message?.toLowerCase().includes('user_account_audit_logs');

const writeAuditLog = async (supabaseAdmin, auth, { userId, summary }) => {
  const { error } = await supabaseAdmin
    .from('user_account_audit_logs')
    .insert({
      user_id: userId,
      actor_id: auth.user.id,
      actor_name: getActorName(auth),
      action: 'password_refreshed',
      summary,
      changes: {
        must_change_password: {
          label: 'Password Setup',
          from: 'Current password',
          to: 'Temporary password issued',
        },
      },
    });

  if (error && !isMissingAuditTableError(error)) {
    console.warn('[User Password Audit Log Error]', error);
  }
};

export async function POST(request) {
  try {
    const rateLimit = checkRateLimit(request, {
      key: 'admin-users:password-refresh',
      limit: 8,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

    const auth = await authorizePasswordRefresh();
    if (auth.response) return auth.response;

    const { id } = await parseRequestJson(request);

    if (!id) {
      return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
    }

    if (id === auth.user.id) {
      return NextResponse.json(
        { error: 'Use the password change flow for your own account.' },
        { status: 400 }
      );
    }

    if (!hasSupabaseAdminConfig()) {
      return NextResponse.json(
        { error: SUPABASE_ADMIN_CONFIG_ERROR },
        { status: 503 }
      );
    }

    const supabaseAdmin = createAdminClient();
    const { data: targetProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, role, full_name, email, status')
      .eq('id', id)
      .maybeSingle();

    if (profileError || !targetProfile) {
      return NextResponse.json(
        { error: profileError?.message || 'Unable to find the user account.' },
        { status: 400 }
      );
    }

    if (!auth.isSuperadmin && isSuperadminRole(targetProfile.role)) {
      return NextResponse.json(
        { error: 'Only the super admin can refresh a super admin password.' },
        { status: 403 }
      );
    }

    const { data: authUserResult, error: authUserError } =
      await supabaseAdmin.auth.admin.getUserById(id);

    if (authUserError || !authUserResult?.user) {
      return NextResponse.json(
        { error: authUserError?.message || 'Unable to read authentication details.' },
        { status: 400 }
      );
    }

    const temporaryPassword = generateTemporaryPassword();
    const existingAppMetadata = authUserResult.user.app_metadata || {};

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(id, {
      password: temporaryPassword,
      app_metadata: {
        ...existingAppMetadata,
        must_change_password: true,
      },
    });

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || 'Unable to refresh password.' },
        { status: 400 }
      );
    }

    await writeAuditLog(supabaseAdmin, auth, {
      userId: id,
      summary: `Temporary password refreshed for ${targetProfile.full_name || targetProfile.email}.`,
    });

    return NextResponse.json({ temporaryPassword });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Unable to refresh password.' },
      { status: 500 }
    );
  }
}
