import { NextResponse } from 'next/server';
import {
  parsePortalAccountPayload,
  parsePortalAccountUpdatePayload,
  toPortalProfileRow,
  toPortalUserMetadata,
} from '@/lib/auth/portalAccountSchema';
import {
  SUPABASE_ADMIN_CONFIG_ERROR,
  createAdminClient,
  hasSupabaseAdminConfig,
} from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

const BASE_PROFILE_COLUMNS =
  'id, role, full_name, employee_id, department, branch, office, email, phone, status, created_at, updated_at';
const PROFILE_COLUMNS = `${BASE_PROFILE_COLUMNS}, designation`;
const AUDIT_COLUMNS = 'id, user_id, actor_id, actor_name, action, summary, changes, created_at';

const normalizeCreateUserError = (error) => {
  const message = error?.message || '';

  if (message.toLowerCase().includes('already')) {
    return 'An account with this email already exists.';
  }

  return message || 'Unable to create account.';
};

const parseRequestJson = async (request) => {
  try {
    return await request.json();
  } catch {
    return {};
  }
};

const isMissingDesignationColumnError = (error) =>
  error?.code === '42703' ||
  error?.code === 'PGRST204' ||
  error?.message?.toLowerCase().includes('designation');

const isMissingAuditTableError = (error) =>
  error?.code === '42P01' ||
  error?.code === 'PGRST205' ||
  error?.message?.toLowerCase().includes('user_account_audit_logs');

const normalizePortalRole = (role = '') =>
  String(role || '')
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, '_');

const isPrivilegedRole = (role = '') => {
  const normalizedRole = normalizePortalRole(role);
  return normalizedRole === 'admin' || normalizedRole === 'superadmin';
};

const getActorName = (auth) =>
  auth?.profile?.full_name || auth?.user?.email || 'Super Admin';

const getProfileName = (profile = {}) =>
  profile.full_name || profile.email || 'portal account';

const withoutDesignation = (profileRow) => {
  const { designation, ...row } = profileRow;
  return row;
};

const saveProfileRow = async (supabaseAdmin, profileRow, { mode, userId }) => {
  const query =
    mode === 'upsert'
      ? supabaseAdmin.from('profiles').upsert(profileRow, { onConflict: 'id' })
      : supabaseAdmin.from('profiles').update(profileRow).eq('id', userId);

  const result = await query.select(PROFILE_COLUMNS).single();

  if (!result.error || !isMissingDesignationColumnError(result.error)) {
    return result;
  }

  const fallbackRow = withoutDesignation(profileRow);
  const fallbackQuery =
    mode === 'upsert'
      ? supabaseAdmin.from('profiles').upsert(fallbackRow, { onConflict: 'id' })
      : supabaseAdmin.from('profiles').update(fallbackRow).eq('id', userId);

  return fallbackQuery.select(BASE_PROFILE_COLUMNS).single();
};

const authorizeSuperadmin = async () => {
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

  if (
    profileError ||
    adminProfile?.role !== 'superadmin' ||
    String(adminProfile?.status || 'Active').trim().toLowerCase() !== 'active'
  ) {
    return {
      response: NextResponse.json(
        { error: 'Super admin access required.' },
        { status: 403 }
      ),
    };
  }

  return { user, profile: adminProfile };
};

const readProfileById = async (supabaseAdmin, id) => {
  const result = await supabaseAdmin
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (!result.error || !isMissingDesignationColumnError(result.error)) {
    return result;
  }

  return supabaseAdmin
    .from('profiles')
    .select(BASE_PROFILE_COLUMNS)
    .eq('id', id)
    .maybeSingle();
};

const assertNoDuplicateProfile = async (supabaseAdmin, account, excludeId = '') => {
  const normalizedEmail = account.email.trim();
  const normalizedEmployeeId = account.employeeId.trim();

  const { data: emailProfiles, error: emailError } = await supabaseAdmin
    .from('profiles')
    .select('id, email')
    .ilike('email', normalizedEmail)
    .limit(1);

  if (emailError) {
    throw new Error(emailError.message || 'Unable to verify duplicate email.');
  }

  const emailProfile = emailProfiles?.[0];

  if (emailProfile?.id && emailProfile.id !== excludeId) {
    throw new Error('An account with this email already exists.');
  }

  const { data: employeeProfiles, error: employeeError } = await supabaseAdmin
    .from('profiles')
    .select('id, employee_id')
    .eq('employee_id', normalizedEmployeeId)
    .limit(1);

  if (employeeError) {
    throw new Error(employeeError.message || 'Unable to verify duplicate employee ID.');
  }

  const employeeProfile = employeeProfiles?.[0];

  if (employeeProfile?.id && employeeProfile.id !== excludeId) {
    throw new Error('An account with this employee ID already exists.');
  }
};

const getProfileChanges = (before = {}, after = {}) => {
  const fields = [
    ['full_name', 'Name'],
    ['employee_id', 'Employee ID'],
    ['department', 'Department'],
    ['branch', 'Branch'],
    ['designation', 'Job Title'],
    ['email', 'Email'],
    ['phone', 'Phone'],
    ['role', 'Role'],
    ['status', 'Status'],
  ];

  return fields.reduce((changes, [key, label]) => {
    const from = String(before?.[key] || '');
    const to = String(after?.[key] || '');

    if (from !== to) {
      changes[key] = { label, from, to };
    }

    return changes;
  }, {});
};

const summarizeProfileChanges = (changes) => {
  const labels = Object.values(changes || {}).map((change) => change.label);

  if (!labels.length) return 'Account reviewed with no profile changes.';
  if (labels.length === 1) return `${labels[0]} updated.`;
  if (labels.length <= 3) return `${labels.join(', ')} updated.`;

  return `${labels.slice(0, 3).join(', ')} and ${labels.length - 3} more fields updated.`;
};

const writeAuditLog = async (supabaseAdmin, auth, { userId, action, summary, changes = {} }) => {
  const { error } = await supabaseAdmin
    .from('user_account_audit_logs')
    .insert({
      user_id: userId,
      actor_id: auth.user.id,
      actor_name: getActorName(auth),
      action,
      summary,
      changes,
    });

  if (error && !isMissingAuditTableError(error)) {
    console.warn('[User Audit Log Error]', error);
  }
};

export async function GET(request) {
  try {
    const auth = await authorizeSuperadmin();
    if (auth.response) return auth.response;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ logs: [] });
    }

    const supabaseAdmin = hasSupabaseAdminConfig() ? createAdminClient() : await createClient();
    const { data, error } = await supabaseAdmin
      .from('user_account_audit_logs')
      .select(AUDIT_COLUMNS)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      if (isMissingAuditTableError(error)) {
        return NextResponse.json({ logs: [] });
      }

      return NextResponse.json(
        { error: error.message || 'Unable to load user audit trail.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ logs: data || [] });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Unable to load user audit trail.' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const auth = await authorizeSuperadmin();
    if (auth.response) return auth.response;

    const account = parsePortalAccountPayload(await parseRequestJson(request));

    if (!hasSupabaseAdminConfig()) {
      return NextResponse.json(
        { error: SUPABASE_ADMIN_CONFIG_ERROR },
        { status: 503 }
      );
    }

    const supabaseAdmin = createAdminClient();
    await assertNoDuplicateProfile(supabaseAdmin, account);

    const { data: created, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
        user_metadata: toPortalUserMetadata(account),
      });

    if (createError || !created?.user) {
      return NextResponse.json(
        { error: normalizeCreateUserError(createError) },
        { status: 400 }
      );
    }

    const profileRow = toPortalProfileRow(account, created.user.id);
    const { data: profile, error: upsertError } = await saveProfileRow(
      supabaseAdmin,
      profileRow,
      { mode: 'upsert' }
    );

    if (upsertError) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id).catch(() => {});

      return NextResponse.json(
        { error: upsertError.message || 'Unable to save profile details.' },
        { status: 400 }
      );
    }

    await writeAuditLog(supabaseAdmin, auth, {
      userId: created.user.id,
      action: 'created',
      summary: `Account created for ${account.name}.`,
      changes: {
        role: { label: 'Role', from: '', to: account.role },
        status: { label: 'Status', from: '', to: 'Active' },
      },
    });

    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    const status = error.name === 'ValidationError' ? 400 : 500;

    return NextResponse.json(
      { error: error.message || 'Unable to create account.' },
      { status }
    );
  }
}

export async function PATCH(request) {
  try {
    const auth = await authorizeSuperadmin();
    if (auth.response) return auth.response;

    const account = parsePortalAccountUpdatePayload(await parseRequestJson(request));

    if (account.id === auth.user.id && account.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'You cannot remove your own superadmin role.' },
        { status: 400 }
      );
    }

    if (account.id === auth.user.id && account.status !== 'Active') {
      return NextResponse.json(
        { error: 'You cannot lock, deactivate, or mark your own superadmin account for setup.' },
        { status: 400 }
      );
    }

    if (!hasSupabaseAdminConfig()) {
      const supabase = await createClient();

      if (account.password) {
        return NextResponse.json(
          { error: `${SUPABASE_ADMIN_CONFIG_ERROR} Password changes require Supabase admin access.` },
          { status: 503 }
        );
      }

      const { data: existingProfile, error: existingProfileError } = await readProfileById(
        supabase,
        account.id
      );

      if (existingProfileError) {
        return NextResponse.json(
          { error: existingProfileError.message || 'Unable to verify current user profile.' },
          { status: 400 }
        );
      }

      if (
        existingProfile?.email &&
        existingProfile.email.toLowerCase() !== account.email.toLowerCase()
      ) {
        return NextResponse.json(
          { error: `${SUPABASE_ADMIN_CONFIG_ERROR} Email changes require Supabase admin access.` },
          { status: 503 }
        );
      }

      await assertNoDuplicateProfile(supabase, account, account.id);

      const roleChanged = normalizePortalRole(existingProfile.role) !== normalizePortalRole(account.role);
      const privilegedRoleChange =
        roleChanged && (isPrivilegedRole(existingProfile.role) || isPrivilegedRole(account.role));

      if (privilegedRoleChange && !account.confirmPrivilegedRoleChange) {
        return NextResponse.json(
          { error: 'Confirm this privileged role change before saving.' },
          { status: 400 }
        );
      }

      const profileRow = toPortalProfileRow(account, account.id);
      const { data: profile, error: updateError } = await saveProfileRow(
        supabase,
        profileRow,
        { mode: 'update', userId: account.id }
      );

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message || 'Unable to update user profile.' },
          { status: 400 }
        );
      }

      const changes = getProfileChanges(existingProfile, profile);
      await writeAuditLog(supabase, auth, {
        userId: account.id,
        action: 'updated',
        summary: summarizeProfileChanges(changes),
        changes,
      });

      return NextResponse.json({ profile });
    }

    const supabaseAdmin = createAdminClient();
    const { data: existingProfile, error: existingProfileError } = await readProfileById(
      supabaseAdmin,
      account.id
    );

    if (existingProfileError || !existingProfile) {
      return NextResponse.json(
        { error: existingProfileError?.message || 'Unable to find the user profile to update.' },
        { status: 400 }
      );
    }

    await assertNoDuplicateProfile(supabaseAdmin, account, account.id);

    const roleChanged = normalizePortalRole(existingProfile.role) !== normalizePortalRole(account.role);
    const privilegedRoleChange =
      roleChanged && (isPrivilegedRole(existingProfile.role) || isPrivilegedRole(account.role));

    if (privilegedRoleChange && !account.confirmPrivilegedRoleChange) {
      return NextResponse.json(
        { error: 'Confirm this privileged role change before saving.' },
        { status: 400 }
      );
    }

    const authUpdates = {
      email: account.email,
      user_metadata: toPortalUserMetadata(account),
    };

    if (account.password) {
      authUpdates.password = account.password;
    }

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      account.id,
      authUpdates
    );

    if (authError) {
      return NextResponse.json(
        { error: normalizeCreateUserError(authError) },
        { status: 400 }
      );
    }

    const profileRow = toPortalProfileRow(account, account.id);
    const { data: profile, error: updateError } = await saveProfileRow(
      supabaseAdmin,
      profileRow,
      { mode: 'update', userId: account.id }
    );

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || 'Unable to update user profile.' },
        { status: 400 }
      );
    }

    const changes = getProfileChanges(existingProfile, profile);
    await writeAuditLog(supabaseAdmin, auth, {
      userId: account.id,
      action: account.password ? 'updated_password' : 'updated',
      summary: account.password
        ? `${summarizeProfileChanges(changes)} Password was reset by admin.`
        : summarizeProfileChanges(changes),
      changes,
    });

    return NextResponse.json({ profile });
  } catch (error) {
    const status = error.name === 'ValidationError' ? 400 : 500;

    return NextResponse.json(
      { error: error.message || 'Unable to update account.' },
      { status }
    );
  }
}

export async function DELETE(request) {
  try {
    const auth = await authorizeSuperadmin();
    if (auth.response) return auth.response;

    const { id } = await parseRequestJson(request);

    if (!id) {
      return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
    }

    if (id === auth.user.id) {
      return NextResponse.json(
        { error: 'You cannot delete your own superadmin account.' },
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
    const { data: existingProfile } = await readProfileById(supabaseAdmin, id);

    await writeAuditLog(supabaseAdmin, auth, {
      userId: id,
      action: 'deleted',
      summary: `Account deleted for ${getProfileName(existingProfile || {})}.`,
      changes: {},
    });

    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Unable to delete account.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Unable to delete account.' },
      { status: 500 }
    );
  }
}
