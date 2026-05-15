export const SUPABASE_CONFIG_ERROR =
  'Supabase is not configured. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, then restart npm run dev.';

const cleanEnvValue = (value) =>
  String(value || '')
    .trim()
    .replace(/^["']|["']$/g, '');

const getRawSupabaseUrl = () =>
  cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);

const getRawSupabaseAnonKey = () =>
  cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const getRawSupabasePublishableKey = () =>
  cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

export const getSupabaseUrl = () => getRawSupabaseUrl();

export const getSupabaseAnonKey = () =>
  getRawSupabaseAnonKey() || getRawSupabasePublishableKey();

export const getSupabaseProjectRef = (url = getSupabaseUrl()) => {
  try {
    return new URL(url).hostname.split('.')[0] || 'mempco';
  } catch {
    return 'mempco';
  }
};

export const getSupabaseAuthCookieName = (url = getSupabaseUrl()) =>
  `mempco-${getSupabaseProjectRef(url)}-auth`;

export const hasSupabaseConfig = () =>
  Boolean(getSupabaseUrl() && getSupabaseAnonKey());

export const validateSupabaseConfig = () => {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  if (!url || !key) {
    throw new Error(SUPABASE_CONFIG_ERROR);
  }

  try {
    const parsedUrl = new URL(url);
    const isSupabaseHost =
      parsedUrl.hostname.endsWith('.supabase.co') ||
      parsedUrl.hostname.endsWith('.supabase.com');

    if (parsedUrl.protocol !== 'https:' || !isSupabaseHost) {
      throw new Error();
    }
  } catch {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL must be a valid Supabase project URL, for example https://your-project-ref.supabase.co'
    );
  }

  if (key.startsWith('sb_secret_')) {
    throw new Error(
      'Invalid Supabase key used in the browser. Use the sb_publishable_ key, not the sb_secret_ key.'
    );
  }

  const isLegacyAnonJwt = key.startsWith('eyJ');
  const isPublishableKey = key.startsWith('sb_publishable_');
  const isAnonKey = key.startsWith('sb_anon_');

  if (!isLegacyAnonJwt && !isPublishableKey && !isAnonKey) {
    throw new Error(
      'Supabase public key looks invalid. Use the publishable key or anon public key from Supabase Project Settings > API.'
    );
  }

  return true;
};
