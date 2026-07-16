export const PASSWORD_EXAMPLE = 'Mempco@2026';

export const PASSWORD_POLICY_MESSAGE =
  'Password must be at least 8 characters and include an uppercase letter, lowercase letter, number, and special symbol. Example: Mempco@2026';

export const validatePasswordPolicy = (password = '') => {
  const value = String(password || '');

  return (
    value.length >= 8 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  );
};
