import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  SUPABASE_ADMIN_CONFIG_ERROR,
  createAdminClient,
  hasSupabaseAdminConfig,
} from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { PASSWORD_POLICY_MESSAGE, validatePasswordPolicy } from '@/lib/auth/passwordPolicy';
import { checkRateLimit, rateLimitResponse } from '@/lib/server/rateLimit';

const passwordChangeSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    confirmPassword: z.string().min(8, 'Confirm the password.'),
  })
  .refine((payload) => payload.password === payload.confirmPassword, {
    message: 'Password and confirm password do not match.',
    path: ['confirmPassword'],
  })
  .refine((payload) => validatePasswordPolicy(payload.password), {
    message: PASSWORD_POLICY_MESSAGE,
    path: ['password'],
  });

const parseRequestJson = async (request) => {
  try {
    return await request.json();
  } catch {
    return {};
  }
};

export async function POST(request) {
  try {
    const rateLimit = checkRateLimit(request, {
      key: 'auth:change-password',
      limit: 8,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

    const parsed = passwordChangeSchema.safeParse(await parseRequestJson(request));

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid password details.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Login required.' }, { status: 401 });
    }

    if (!hasSupabaseAdminConfig()) {
      return NextResponse.json(
        { error: SUPABASE_ADMIN_CONFIG_ERROR },
        { status: 503 }
      );
    }

    const { error: passwordUpdateError } = await supabase.auth.updateUser({
      password: parsed.data.password,
    });

    if (passwordUpdateError) {
      return NextResponse.json(
        { error: passwordUpdateError.message || 'Unable to update password.' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();
    const { data: authUserResult, error: authUserError } =
      await supabaseAdmin.auth.admin.getUserById(user.id);

    if (authUserError || !authUserResult?.user) {
      return NextResponse.json({ success: true });
    }

    const existingAppMetadata = authUserResult.user.app_metadata || {};

    const { error: metadataUpdateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      app_metadata: {
        ...existingAppMetadata,
        must_change_password: false,
      },
    });

    if (metadataUpdateError) {
      return NextResponse.json(
        { error: metadataUpdateError.message || 'Unable to complete password setup.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Unable to update password.' },
      { status: 500 }
    );
  }
}
