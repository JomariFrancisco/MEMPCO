import { z } from 'zod';

export const PORTAL_ACCOUNT_ROLES = [
  'employee',
  'admin',
  'marketing_admin',
  'hr_admin',
  'superadmin',
];

export const PORTAL_ACCOUNT_STATUSES = [
  'Active',
  'Pending Setup',
  'Password Reset Required',
  'Locked',
  'Inactive',
];

const portalProfileFields = {
  name: z.string().trim().min(2, 'Full name is required.'),
  employeeId: z.string().trim().min(1, 'Employee ID is required.'),
  department: z.string().trim().min(1, 'Department is required.'),
  branch: z.string().trim().min(1, 'Branch or office is required.'),
  designation: z.string().trim().min(1, 'Job title is required.'),
  email: z.string().trim().email('Enter a valid email address.'),
  phone: z.string().trim().regex(/^09\d{2} \d{3} \d{4}$/, 'Use phone format 09XX XXX XXXX.'),
  role: z.enum(PORTAL_ACCOUNT_ROLES).default('employee'),
};

export const portalAccountSchema = z
  .object({
    ...portalProfileFields,
  });

export const portalAccountUpdateSchema = z
  .object({
    id: z.string().uuid('User ID is invalid.'),
    ...portalProfileFields,
    status: z.enum(PORTAL_ACCOUNT_STATUSES).default('Active'),
    confirmPrivilegedRoleChange: z.boolean().optional(),
    confirmOwnAccountChange: z.boolean().optional(),
  });

const parsePortalPayload = (schema, payload) => {
  const result = schema.safeParse(payload);

  if (!result.success) {
    const error = new Error(
      result.error.issues[0]?.message || 'Invalid account details.'
    );
    error.name = 'ValidationError';
    throw error;
  }

  return result.data;
};

export const parsePortalAccountPayload = (payload) =>
  parsePortalPayload(portalAccountSchema, payload);

export const parsePortalAccountUpdatePayload = (payload) =>
  parsePortalPayload(portalAccountUpdateSchema, payload);

export const toPortalProfileRow = (account, userId) => ({
  id: userId,
  role: account.role,
  full_name: account.name,
  employee_id: account.employeeId,
  department: account.department,
  branch: account.branch,
  office: account.branch,
  designation: account.designation,
  email: account.email,
  phone: account.phone,
  status: account.status || 'Active',
});

export const toPortalUserMetadata = (account) => ({
  name: account.name,
  employee_id: account.employeeId,
  department: account.department,
  branch: account.branch,
  office: account.branch,
  designation: account.designation,
  phone: account.phone,
});
