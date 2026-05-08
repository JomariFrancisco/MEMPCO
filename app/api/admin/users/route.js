import { NextResponse } from 'next/server';
import {
  parsePortalAccountPayload,
  parsePortalAccountUpdatePayload,
  toPortalProfileRow,
  toPortalUserMetadata,
} from '@/lib/auth/portalAccountSchema';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

const PROFILE_COLUMNS =
  'id, role, full_name, employee_id, department, branch, office, email, phone, status, created_at';

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
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || adminProfile?.role !== 'superadmin') {
    return {
      response: NextResponse.json(
        { error: 'Super admin access required.' },
        { status: 403 }
      ),
    };
  }

  return { user };
};

export async function POST(request) {
  try {
    const auth = await authorizeSuperadmin();
    if (auth.response) return auth.response;

    const account = parsePortalAccountPayload(await parseRequestJson(request));
    const supabaseAdmin = createAdminClient();

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
    const { data: profile, error: upsertError } = await supabaseAdmin
      .from('profiles')
      .upsert(profileRow, { onConflict: 'id' })
      .select(PROFILE_COLUMNS)
      .single();

    if (upsertError) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id).catch(() => {});

      return NextResponse.json(
        { error: upsertError.message || 'Unable to save profile details.' },
        { status: 400 }
      );
    }

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
    const supabaseAdmin = createAdminClient();

    if (account.id === auth.user.id && account.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'You cannot remove your own superadmin role.' },
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
    const { data: profile, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(profileRow)
      .eq('id', account.id)
      .select(PROFILE_COLUMNS)
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || 'Unable to update user profile.' },
        { status: 400 }
      );
    }

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

    const supabaseAdmin = createAdminClient();
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
