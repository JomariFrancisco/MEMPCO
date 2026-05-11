'use client';

import { createClient } from '@/lib/supabase/client';

const TICKET_COLUMNS = `
  id,
  owner_id,
  owner_email,
  requester,
  employee_id,
  branch,
  department,
  support_category,
  concern_type,
  device_name,
  contact_number,
  impact,
  description,
  sla,
  priority,
  status,
  technician,
  action_taken,
  admin_remarks,
  resolution,
  saar_required,
  saar_attachment,
  date_label,
  last_employee_update,
  admin_updated_at,
  work_started_at,
  work_ended_at,
  locked_by,
  locked_by_name,
  locked_at,
  lock_expires_at,
  created_at,
  updated_at
`;

const SUPABASE_REQUEST_TIMEOUT_MS = 12000;

const getTimerApi = () => {
  if (typeof window !== 'undefined') {
    return window;
  }

  return globalThis;
};

const withTimeout = (promise, message) => {
  const timerApi = getTimerApi();
  let timeoutId;

  const timeout = new Promise((_, reject) => {
    timeoutId = timerApi.setTimeout(() => {
      reject(new Error(message));
    }, SUPABASE_REQUEST_TIMEOUT_MS);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) {
      timerApi.clearTimeout(timeoutId);
    }
  });
};

const formatDateTime = (value = new Date()) => {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return '';
  }

  return parsedDate.toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatDateOnly = (value = new Date()) => {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return '';
  }

  return parsedDate.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const normalizeTicketStatus = (status) =>
  String(status || '')
    .trim()
    .toLowerCase()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ');

const hasAssignedTechnician = (ticket) => {
  const technician = String(ticket?.technician || '').trim().toLowerCase();

  return Boolean(technician && technician !== 'unassigned');
};

const getEmployeeLockDetails = (ticket = {}) => {
  const status = normalizeTicketStatus(ticket.status);
  const assigned = hasAssignedTechnician(ticket);
  const started = Boolean(ticket.workStartedAt || ticket.work_started_at);

  const lockedStatuses = [
    'pending',
    'in progress',
    'moved date',
    'escalated',
    'resolved',
    'canceled',
    'cancelled',
  ];

  const lockedByStatus = lockedStatuses.includes(status);
  const employeeEditLocked = Boolean(assigned || started || lockedByStatus);

  let employeeLockReason = '';

  if (assigned) {
    employeeLockReason = 'This ticket already has an assigned ICT staff.';
  } else if (started || status === 'in progress') {
    employeeLockReason = 'This ticket is already in progress.';
  } else if (status === 'moved date') {
    employeeLockReason = 'This ticket has been moved to another date.';
  } else if (status === 'escalated') {
    employeeLockReason = 'This ticket has been escalated.';
  } else if (status === 'resolved') {
    employeeLockReason = 'This ticket has already been resolved.';
  } else if (status === 'canceled' || status === 'cancelled') {
    employeeLockReason = 'This ticket has been canceled.';
  } else if (status === 'pending') {
    employeeLockReason = 'This ticket is already being reviewed by ICT.';
  }

  return {
    employeeEditLocked,
    employeeLockReason,
  };
};

const normalizeTicketError = (
  error,
  fallbackMessage = 'Unable to load ticket details.'
) => {
  console.error('[Portal Tickets Error]', error);

  if (!error) {
    return new Error(fallbackMessage);
  }

  if (typeof error === 'string') {
    return new Error(error);
  }

  const message = error?.message || '';
  const lowerMessage = message.toLowerCase();

  if (
    error?.name === 'TypeError' ||
    lowerMessage.includes('failed to fetch') ||
    lowerMessage.includes('networkerror') ||
    lowerMessage.includes('load failed') ||
    lowerMessage.includes('fetch')
  ) {
    return new Error(
      'Unable to connect to Supabase. Please check your NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, internet connection, and restart npm run dev.'
    );
  }

  if (
    lowerMessage.includes('tickets') ||
    error?.code === 'PGRST205' ||
    error?.code === '42P01'
  ) {
    return new Error(
      'Supabase is connected, but the tickets table is not ready. Run the updated supabase/schema.sql in your Supabase SQL editor.'
    );
  }

  if (error?.status === 401 || error?.code === 'PGRST301') {
    return new Error('Your session expired. Please log in again.');
  }

  if (error?.status === 403 || error?.code === '42501') {
    return new Error('You do not have permission to access these tickets.');
  }

  if (error?.code === '42703') {
    return new Error(
      'One or more ticket columns are missing in Supabase. Please run the latest schema.sql.'
    );
  }

  if (lowerMessage.includes('jwt')) {
    return new Error('Your login session is invalid. Please log out and log in again.');
  }

  return new Error(message || fallbackMessage);
};

const mapTicketRow = (row = {}) => {
  const ticket = {
    id: row.id,
    ownerId: row.owner_id,
    ownerEmail: row.owner_email,
    requester: row.requester,
    employeeId: row.employee_id || '',
    branch: row.branch || '',
    department: row.department || '',
    supportCategory: row.support_category || '',
    concernType: row.concern_type || '',
    deviceName: row.device_name || '',
    contactNumber: row.contact_number || '',
    impact: row.impact || '',
    description: row.description || '',
    sla: row.sla || 'Low',
    priority: row.priority || row.sla || 'Low',
    status: row.status || 'Created',
    technician: row.technician || 'Unassigned',
    actionTaken: row.action_taken || '',
    adminRemarks: row.admin_remarks || '',
    resolution: row.resolution || '',
    saarRequired: Boolean(row.saar_required),
    saarAttachment: row.saar_attachment || null,
    date: row.date_label || formatDateOnly(row.created_at),
    createdAt: row.created_at ? formatDateTime(row.created_at) : '',
    lastUpdated: row.updated_at ? formatDateTime(row.updated_at) : '',
    lastEmployeeUpdate: row.last_employee_update || '',
    adminUpdatedAt: row.admin_updated_at || '',
    workStartedAt: row.work_started_at || '',
    workEndedAt: row.work_ended_at || '',
    lockedBy: row.locked_by || '',
    lockedByName: row.locked_by_name || '',
    lockedAt: row.locked_at || '',
    lockExpiresAt: row.lock_expires_at || '',
  };

  return {
    ...ticket,
    ...getEmployeeLockDetails(ticket),
  };
};

const updateFieldMap = {
  ownerId: 'owner_id',
  ownerEmail: 'owner_email',
  requester: 'requester',
  employeeId: 'employee_id',
  branch: 'branch',
  department: 'department',
  supportCategory: 'support_category',
  concernType: 'concern_type',
  deviceName: 'device_name',
  contactNumber: 'contact_number',
  impact: 'impact',
  description: 'description',
  sla: 'sla',
  priority: 'priority',
  status: 'status',
  technician: 'technician',
  actionTaken: 'action_taken',
  adminRemarks: 'admin_remarks',
  resolution: 'resolution',
  saarRequired: 'saar_required',
  saarAttachment: 'saar_attachment',
  date: 'date_label',
  lastEmployeeUpdate: 'last_employee_update',
  adminUpdatedAt: 'admin_updated_at',
  workStartedAt: 'work_started_at',
  workEndedAt: 'work_ended_at',
  lockedBy: 'locked_by',
  lockedByName: 'locked_by_name',
  lockedAt: 'locked_at',
  lockExpiresAt: 'lock_expires_at',
};

const mapTicketUpdates = (updates = {}) =>
  Object.entries(updates).reduce((payload, [key, value]) => {
    const column = updateFieldMap[key];

    if (column && value !== undefined) {
      payload[column] = value;
    }

    return payload;
  }, {});

export async function getTickets() {
  try {
    const supabase = createClient();

    const { data, error } = await withTimeout(
      supabase
        .from('tickets')
        .select(TICKET_COLUMNS)
        .order('updated_at', { ascending: false })
        .order('created_at', { ascending: false }),
      'Ticket list took too long to load. Please try again.'
    );

    if (error) {
      throw error;
    }

    return Array.isArray(data) ? data.map(mapTicketRow) : [];
  } catch (error) {
    throw normalizeTicketError(error, 'Unable to load ticket details.');
  }
}

export async function createTicket({ user, form }) {
  try {
    if (!user?.id || !user?.email) {
      throw new Error('User account is missing. Please log in again.');
    }

    if (!form) {
      throw new Error('Ticket form is missing.');
    }

    const supabase = createClient();
    const now = new Date();

    const ticketPayload = {
      owner_id: user.id,
      owner_email: user.email,
      requester: user.name || user.email,
      employee_id: user.employeeId || '',
      branch: form.branch,
      department: form.department,
      support_category: form.supportCategory,
      concern_type: form.concernType,
      device_name: form.deviceName || '',
      contact_number: form.contactNumber || '',
      impact: form.impact || '',
      description: form.description?.trim() || '',
      sla: form.sla || 'Low',
      priority: form.sla || 'Low',
      status: 'Created',
      technician: 'Unassigned',
      action_taken: '',
      admin_remarks: '',
      resolution: '',
      saar_required: Boolean(form.saarRequired || form.saarAttachment?.name),
      saar_attachment: form.saarAttachment || null,
      date_label: formatDateOnly(now),
      last_employee_update: form.lastEmployeeUpdate || formatDateTime(now),
    };

    const { data, error } = await withTimeout(
      supabase
        .from('tickets')
        .insert(ticketPayload)
        .select(TICKET_COLUMNS)
        .single(),
      'Ticket creation took too long. Please try again.'
    );

    if (error) {
      throw error;
    }

    return mapTicketRow(data);
  } catch (error) {
    throw normalizeTicketError(error, 'Unable to create ticket details.');
  }
}

export async function updateTicket(ticketId, updates = {}) {
  try {
    if (!ticketId) {
      throw new Error('Ticket ID is missing.');
    }

    const payload = mapTicketUpdates({
      ...updates,
      priority: updates.sla || updates.priority,
    });

    if (!Object.keys(payload).length) {
      throw new Error('No valid ticket updates were provided.');
    }

    const supabase = createClient();

    const { data, error } = await withTimeout(
      supabase
        .from('tickets')
        .update(payload)
        .eq('id', ticketId)
        .select(TICKET_COLUMNS)
        .single(),
      'Ticket update took too long. Please try again.'
    );

    if (error) {
      throw error;
    }

    return mapTicketRow(data);
  } catch (error) {
    throw normalizeTicketError(error, 'Unable to update ticket details.');
  }
}

export async function claimTicketLock(ticketId, user) {
  try {
    if (!ticketId) {
      throw new Error('Ticket ID is missing.');
    }

    if (!user?.id) {
      throw new Error('User account is missing. Please log in again.');
    }

    const supabase = createClient();

    const { data, error } = await withTimeout(
      supabase.rpc('claim_ticket_lock', {
        target_ticket_id: ticketId,
        locker_id: user.id,
        locker_name: user.name || user.email || 'IT Staff',
      }),
      'Ticket lock check took too long. Please try again.'
    );

    if (error) {
      throw error;
    }

    return data ? mapTicketRow(data) : null;
  } catch (error) {
    throw normalizeTicketError(error, 'Unable to claim ticket lock.');
  }
}

export async function releaseTicketLock(ticketId, userId) {
  try {
    if (!ticketId) {
      throw new Error('Ticket ID is missing.');
    }

    if (!userId) {
      throw new Error('User ID is missing.');
    }

    const supabase = createClient();

    const { data, error } = await withTimeout(
      supabase.rpc('release_ticket_lock', {
        target_ticket_id: ticketId,
        locker_id: userId,
      }),
      'Ticket lock release took too long. Please try again.'
    );

    if (error) {
      throw error;
    }

    return data ? mapTicketRow(data) : null;
  } catch (error) {
    throw normalizeTicketError(error, 'Unable to release ticket lock.');
  }
}

export async function deleteTicket(ticketId, options = {}) {
  try {
    if (!ticketId) {
      throw new Error('Ticket ID is missing.');
    }

    const requestedByRole = String(options.requestedByRole || '').trim().toLowerCase();

    if (requestedByRole !== 'superadmin') {
      throw new Error('Only the super admin can delete tickets.');
    }

    const supabase = createClient();

    const { error } = await withTimeout(
      supabase
        .from('tickets')
        .delete()
        .eq('id', ticketId),
      'Ticket deletion took too long. Please try again.'
    );

    if (error) {
      throw error;
    }

    return {
      id: ticketId,
      deleted: true,
    };
  } catch (error) {
    throw normalizeTicketError(error, 'Unable to delete ticket.');
  }
}