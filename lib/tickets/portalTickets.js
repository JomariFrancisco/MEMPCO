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
  photo_attachments,
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

const TICKET_LIST_COLUMNS = `
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
  photo_attachments,
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

const TICKET_INSERT_RETURN_COLUMNS = TICKET_LIST_COLUMNS;

const TICKET_MESSAGE_COLUMNS = `
  id,
  ticket_id,
  sender_id,
  sender_name,
  sender_email,
  sender_role,
  message,
  attachments,
  created_at
`;

const SUPABASE_REQUEST_TIMEOUT_MS = 45000;

const EMPLOYEE_EDITABLE_FIELDS = new Set([
  'requester',
  'employeeId',
  'branch',
  'department',
  'supportCategory',
  'concernType',
  'deviceName',
  'contactNumber',
  'impact',
  'description',
  'sla',
  'priority',
  'saarRequired',
  'saarAttachment',
  'photoAttachments',
  'lastEmployeeUpdate',
]);

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

const normalizeRole = (role) =>
  String(role || '')
    .trim()
    .toLowerCase()
    .replace(/[-_\s]+/g, '');

const normalizeSlaLevel = (value) => {
  const normalized = String(value || 'Low').trim().toLowerCase();

  if (normalized === 'low') return 'Low';
  if (normalized === 'medium') return 'Medium';
  if (normalized === 'high') return 'High';
  if (normalized === 'critical') return 'Critical';

  return 'Low';
};

const formatRoleLabel = (role) => {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === 'superadmin') return 'Super Admin';
  if (normalizedRole === 'admin') return 'Admin';
  if (normalizedRole === 'marketingadmin') return 'Marketing Admin';
  if (normalizedRole === 'hradmin') return 'HR Admin';
  if (normalizedRole === 'employee') return 'Employee';

  return String(role || 'Employee').trim() || 'Employee';
};

const isSuperAdminRole = (role) => normalizeRole(role) === 'superadmin';

const isEmployeeRole = (role) => {
  const normalizedRole = normalizeRole(role);

  return (
    normalizedRole === 'employee' ||
    normalizedRole === 'user' ||
    normalizedRole === 'staff'
  );
};

const hasAssignedTechnician = (ticket) => {
  const technician = String(ticket?.technician || '').trim().toLowerCase();

  return Boolean(technician && technician !== 'unassigned');
};

const getEmployeeLockDetails = (ticket = {}) => {
  const status = normalizeTicketStatus(ticket.status);
  const assigned = hasAssignedTechnician(ticket);
  const started = Boolean(ticket.workStartedAt || ticket.work_started_at);
  const hasAdminAction = Boolean(
    String(ticket.actionTaken || ticket.action_taken || '').trim() ||
    String(ticket.adminRemarks || ticket.admin_remarks || '').trim() ||
    String(ticket.resolution || '').trim()
  );

  const lockedStatuses = [
    'in progress',
    'moved date',
    'escalated',
    'resolved',
    'canceled',
    'cancelled',
  ];

  const lockedByStatus = lockedStatuses.includes(status);
  const employeeEditLocked = Boolean(assigned || started || hasAdminAction || lockedByStatus);

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
  } else if (hasAdminAction) {
    employeeLockReason = 'ICT already recorded action, remarks, or resolution for this ticket.';
  }

  return {
    employeeEditLocked,
    employeeLockReason,
  };
};

const normalizeJsonArray = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) return value;

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
};

const normalizeAttachments = (attachments) =>
  normalizeJsonArray(attachments)
    .filter(Boolean)
    .map((attachment, index) => ({
      id:
        attachment.id ||
        attachment.path ||
        attachment.name ||
        `attachment-${Date.now()}-${index}`,
      name: attachment.name || attachment.fileName || `Attachment ${index + 1}`,
      type: attachment.type || attachment.mimeType || '',
      size: attachment.size || attachment.sizeBytes || 0,
      sizeLabel: attachment.sizeLabel || '',
      dataUrl: attachment.dataUrl || attachment.url || attachment.publicUrl || '',
      url: attachment.url || attachment.publicUrl || attachment.dataUrl || '',
      path: attachment.path || '',
      uploadedAt: attachment.uploadedAt || attachment.createdAt || '',
    }));

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
    lowerMessage.includes('ticket_messages') ||
    lowerMessage.includes('ticket messages')
  ) {
    return new Error(
      'Supabase is connected, but the ticket conversation table is not ready. Run the latest schema.sql in your Supabase SQL editor.'
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
    sla: normalizeSlaLevel(row.sla),
    priority: normalizeSlaLevel(row.priority || row.sla),
    status: row.status || 'Created',
    technician: row.technician || 'Unassigned',
    actionTaken: row.action_taken || '',
    adminRemarks: row.admin_remarks || '',
    resolution: row.resolution || '',
    saarRequired: Boolean(row.saar_required),
    saarAttachment: row.saar_attachment || null,
    photoAttachments: normalizeAttachments(row.photo_attachments),
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

const mapTicketMessageRow = (row = {}) => ({
  id: row.id,
  ticketId: row.ticket_id,
  senderId: row.sender_id,
  senderName: row.sender_name || 'MEMPCO User',
  senderEmail: row.sender_email || '',
  senderRole: formatRoleLabel(row.sender_role),
  senderRoleRaw: row.sender_role || 'employee',
  message: row.message || '',
  attachments: normalizeAttachments(row.attachments),
  createdAt: row.created_at ? formatDateTime(row.created_at) : '',
  createdAtRaw: row.created_at || '',
});

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
  photoAttachments: 'photo_attachments',
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
      payload[column] = key === 'photoAttachments' ? normalizeAttachments(value) : value;
    }

    return payload;
  }, {});

const getTicketById = async (ticketId, { full = true } = {}) => {
  const supabase = createClient();

  const { data, error } = await withTimeout(
    supabase
      .from('tickets')
      .select(full ? TICKET_COLUMNS : TICKET_LIST_COLUMNS)
      .eq('id', ticketId)
      .single(),
    'Ticket details took too long to load. Please try again.'
  );

  if (error) {
    throw error;
  }

  return data ? mapTicketRow(data) : null;
};

const validateEmployeeTicketUpdate = async (ticketId, updates = {}) => {
  const currentTicket = await getTicketById(ticketId, { full: false });

  if (!currentTicket) {
    throw new Error('Ticket not found.');
  }

  if (currentTicket.employeeEditLocked) {
    throw new Error(
      currentTicket.employeeLockReason ||
        'Employee editing is locked because this ticket is already being handled by ICT.'
    );
  }

  const updateKeys = Object.keys(updates);
  const blockedKeys = updateKeys.filter((key) => {
    if (EMPLOYEE_EDITABLE_FIELDS.has(key)) return false;

    if (key === 'status') {
      return normalizeTicketStatus(updates.status) !== 'modified';
    }

    return true;
  });

  if (blockedKeys.length) {
    throw new Error(
      'Employee accounts can only edit ticket request details before ICT starts catering the ticket.'
    );
  }

  return currentTicket;
};

export async function getTickets() {
  try {
    const supabase = createClient();

    const { data, error } = await withTimeout(
      supabase
        .from('tickets')
        .select(TICKET_LIST_COLUMNS)
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

export async function getTicket(ticketId) {
  try {
    if (!ticketId) {
      throw new Error('Ticket ID is missing.');
    }

    return await getTicketById(ticketId, { full: true });
  } catch (error) {
    throw normalizeTicketError(error, 'Unable to load ticket details.');
  }
}

export async function getTicketsForUser(userId) {
  try {
    if (!userId) {
      throw new Error('User ID is missing.');
    }

    const supabase = createClient();

    const { data, error } = await withTimeout(
      supabase
        .from('tickets')
        .select(TICKET_LIST_COLUMNS)
        .eq('owner_id', userId)
        .order('updated_at', { ascending: false })
        .order('created_at', { ascending: false }),
      'Employee ticket list took too long to load. Please try again.'
    );

    if (error) {
      throw error;
    }

    return Array.isArray(data) ? data.map(mapTicketRow) : [];
  } catch (error) {
    throw normalizeTicketError(error, 'Unable to load employee ticket details.');
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
    const finalSla = normalizeSlaLevel(form.sla);

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
      sla: finalSla,
      priority: finalSla,
      status: 'Created',
      technician: 'Unassigned',
      action_taken: '',
      admin_remarks: '',
      resolution: '',
      saar_required: Boolean(form.saarRequired || form.saarAttachment?.name),
      saar_attachment: form.saarAttachment || null,
      photo_attachments: normalizeAttachments(form.photoAttachments),
      date_label: formatDateOnly(now),
      last_employee_update: form.lastEmployeeUpdate || formatDateTime(now),
    };

    const { data, error } = await withTimeout(
      supabase
        .from('tickets')
        .insert(ticketPayload)
        .select(TICKET_INSERT_RETURN_COLUMNS)
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

export async function updateTicket(ticketId, updates = {}, options = {}) {
  try {
    if (!ticketId) {
      throw new Error('Ticket ID is missing.');
    }

    const requestedByRole = options.requestedByRole || options.role || '';
    const updateScope = options.updateScope || options.scope || '';
    const shouldUseEmployeeLock =
      isEmployeeRole(requestedByRole) || normalizeRole(updateScope) === 'employee';

    if (shouldUseEmployeeLock) {
      await validateEmployeeTicketUpdate(ticketId, updates);
    }

    const nextUpdates = {
      ...updates,
      sla: updates.sla ? normalizeSlaLevel(updates.sla) : updates.sla,
      priority: updates.sla
        ? normalizeSlaLevel(updates.sla)
        : updates.priority
          ? normalizeSlaLevel(updates.priority)
          : updates.priority,
    };

    if (shouldUseEmployeeLock) {
      nextUpdates.lastEmployeeUpdate = formatDateTime(new Date());
    }

    const payload = mapTicketUpdates(nextUpdates);

    if (!Object.keys(payload).length) {
      throw new Error('No valid ticket updates were provided.');
    }

    const supabase = createClient();

    const { data, error } = await withTimeout(
      supabase
        .from('tickets')
        .update(payload)
        .eq('id', ticketId)
        .select(TICKET_INSERT_RETURN_COLUMNS)
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

export async function getTicketMessages(ticketId) {
  try {
    if (!ticketId) {
      throw new Error('Ticket ID is missing.');
    }

    const supabase = createClient();

    const { data, error } = await withTimeout(
      supabase
        .from('ticket_messages')
        .select(TICKET_MESSAGE_COLUMNS)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true }),
      'Ticket conversation took too long to load. Please try again.'
    );

    if (error) {
      throw error;
    }

    return Array.isArray(data) ? data.map(mapTicketMessageRow) : [];
  } catch (error) {
    throw normalizeTicketError(error, 'Unable to load the ticket conversation.');
  }
}

export async function createTicketMessage(ticketId, options = {}) {
  try {
    if (!ticketId) {
      throw new Error('Ticket ID is missing.');
    }

    const sender = options.sender || options.user || {};
    const cleanMessage = String(options.message || '').trim();
    const attachments = normalizeAttachments(options.attachments);

    if (!sender?.id) {
      throw new Error('User account is missing. Please log in again.');
    }

    if (!cleanMessage && !attachments.length) {
      throw new Error('Please write a message or attach an image before sending.');
    }

    const supabase = createClient();

    const messagePayload = {
      ticket_id: ticketId,
      sender_id: sender.id,
      sender_name: sender.name || sender.fullName || sender.email || 'MEMPCO User',
      sender_email: sender.email || '',
      sender_role: sender.role || 'employee',
      message: cleanMessage,
      attachments,
    };

    const { data, error } = await withTimeout(
      supabase
        .from('ticket_messages')
        .insert(messagePayload)
        .select(TICKET_MESSAGE_COLUMNS)
        .single(),
      'Ticket reply took too long to send. Please try again.'
    );

    if (error) {
      throw error;
    }

    return mapTicketMessageRow(data);
  } catch (error) {
    throw normalizeTicketError(error, 'Unable to send ticket reply.');
  }
}

export function subscribeToTicketMessages(ticketId, onMessage, onStatusChange) {
  if (!ticketId || typeof onMessage !== 'function') {
    return () => {};
  }

  const supabase = createClient();
  const channel = supabase
    .channel(`ticket-messages-${ticketId}-${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'ticket_messages',
        filter: `ticket_id=eq.${ticketId}`,
      },
      (payload) => {
        if (payload?.new) {
          onMessage(mapTicketMessageRow(payload.new));
        }
      }
    )
    .subscribe((status) => {
      if (typeof onStatusChange === 'function') {
        onStatusChange(status);
      }
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function subscribeToTicket(ticketId, onTicketChange, onStatusChange) {
  if (!ticketId || typeof onTicketChange !== 'function') {
    return () => {};
  }

  const supabase = createClient();
  const channel = supabase
    .channel(`ticket-updates-${ticketId}-${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tickets',
        filter: `id=eq.${ticketId}`,
      },
      (payload) => {
        if (payload?.new) {
          onTicketChange(mapTicketRow(payload.new));
        }
      }
    )
    .subscribe((status) => {
      if (typeof onStatusChange === 'function') {
        onStatusChange(status);
      }
    });

  return () => {
    void supabase.removeChannel(channel);
  };
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

    const requestedByRole = options.requestedByRole || options.role || '';

    if (!isSuperAdminRole(requestedByRole)) {
      throw new Error('Only the super admin can delete tickets.');
    }

    const supabase = createClient();

    const { data, error } = await withTimeout(
      supabase.rpc('delete_helpdesk_ticket', {
        target_ticket_id: ticketId,
      }),
      'Ticket deletion took too long. Please try again.'
    );

    if (error) {
      throw error;
    }

    if (data === false) {
      throw new Error('Ticket was not deleted. Please refresh and try again.');
    }

    return {
      id: ticketId,
      deleted: true,
    };
  } catch (error) {
    throw normalizeTicketError(error, 'Unable to delete ticket.');
  }
}

export {
  formatDateTime,
  formatDateOnly,
  getEmployeeLockDetails,
  hasAssignedTechnician,
  normalizeTicketStatus,
  normalizeRole,
  normalizeSlaLevel,
  isSuperAdminRole,
  isEmployeeRole,
};