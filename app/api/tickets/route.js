import { NextResponse } from 'next/server';
import { createAdminClient, hasSupabaseAdminConfig } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { IMPACT_TEXT_BY_SLA, deriveTicketImpact, normalizeSlaLevel } from '@/lib/tickets/sla';
import { checkRateLimit, rateLimitResponse } from '@/lib/server/rateLimit';
import { sanitizeStoredAttachment, uploadDataUrlToStorage } from '@/lib/server/storageUploads';

const TICKET_RETURN_COLUMNS = `
  id,
  owner_id,
  owner_email,
  ticket_code,
  requester,
  employee_id,
  branch,
  department,
  custodian,
  brand,
  device_type,
  serial_number,
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
  status_history,
  locked_by,
  locked_by_name,
  locked_at,
  lock_expires_at,
  created_at,
  updated_at
`;

const formatDateTime = (value = new Date()) => {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) return '';

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

  if (Number.isNaN(parsedDate.getTime())) return '';

  return parsedDate.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const normalizeAttachments = (attachments) => {
  if (!Array.isArray(attachments)) return [];

  return attachments
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
};

const PHOTO_ATTACHMENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const SAAR_ATTACHMENT_TYPES = ['application/pdf'];
const TICKET_ATTACHMENT_BUCKET = 'ticket-attachments';

const processAttachment = async (supabase, attachment, { folder, allowedTypes, maxBytes }) => {
  if (!attachment) return null;

  const dataUrl = attachment.dataUrl || '';

  if (!dataUrl || !String(dataUrl).startsWith('data:')) {
    return sanitizeStoredAttachment(attachment);
  }

  const uploaded = await uploadDataUrlToStorage(supabase, {
    bucket: TICKET_ATTACHMENT_BUCKET,
    folder,
    dataUrl,
    fileName: attachment.name || attachment.fileName || 'attachment',
    allowedTypes,
    maxBytes,
  });

  if (!uploaded) {
    return sanitizeStoredAttachment(attachment);
  }

  return {
    ...sanitizeStoredAttachment(attachment),
    ...uploaded,
    id: uploaded.path,
    uploadedAt: new Date().toISOString(),
  };
};

const processPhotoAttachments = async (supabase, attachments, ownerId) => {
  const normalized = normalizeAttachments(attachments);
  const folder = `${ownerId || 'unknown'}/photos`;

  return Promise.all(
    normalized.map((attachment) =>
      processAttachment(supabase, attachment, {
        folder,
        allowedTypes: PHOTO_ATTACHMENT_TYPES,
        maxBytes: 8 * 1024 * 1024,
      })
    )
  );
};

const processSaarAttachment = async (supabase, attachment, ownerId) => {
  if (!attachment) return null;

  return processAttachment(supabase, attachment, {
    folder: `${ownerId || 'unknown'}/saar`,
    allowedTypes: SAAR_ATTACHMENT_TYPES,
    maxBytes: 4 * 1024 * 1024,
  });
};

const BURNOUT_BRANCH_CODES = {
  'central office': 'MCO',
  ipil: 'MI',
  veterans: 'MV',
  vitali: 'MVT',
  canelar: 'MCN',
  culianan: 'MCL',
  curuan: 'MCRN',
  pagadian: 'MP',
  dipolog: 'MD',
  funeral: 'MLHFDM',
  'la hermosa': 'MLHFDM',
  ayala: 'MA',
};

const normalizeCodePart = (value, fallback) => {
  const normalized = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '');

  return normalized || fallback;
};

const DEVICE_CODE_ALIASES = {
  'desktop pc': 'DESKTOP',
  desktop: 'DESKTOP',
  laptop: 'LAPTOP',
  printer: 'PRINTER',
  scanner: 'SCANNER',
  monitor: 'MONITOR',
  ups: 'UPS',
  router: 'ROUTER',
  switch: 'SWITCH',
  server: 'SERVER',
};

const normalizeDeviceCode = (value, fallback = 'DEVICE') => {
  const key = String(value || '').trim().toLowerCase();
  return DEVICE_CODE_ALIASES[key] || normalizeCodePart(value, fallback);
};

const getBurnoutBranchCode = (branch) =>
  BURNOUT_BRANCH_CODES[String(branch || '').trim().toLowerCase()] ||
  normalizeCodePart(branch, 'BR');

const isBurnoutTicket = (form = {}) =>
  String(form.supportCategory || '').trim().toLowerCase() === 'burnout';

const getNextBurnoutTicketCode = async (supabase, { branch, brand, deviceType }) => {
  const branchCode = getBurnoutBranchCode(branch);
  const brandCode = normalizeCodePart(brand, 'BRAND');
  const deviceCode = normalizeDeviceCode(deviceType);

  const { data, error } = await supabase
    .from('tickets')
    .select('ticket_code')
    .eq('support_category', 'Burnout')
    .like('ticket_code', `${branchCode}-%`);

  if (error) {
    throw new Error(error.message || 'Unable to read existing Burnout ticket codes.');
  }

  const latestNumber = (data || []).reduce((latest, row) => {
    const match = String(row.ticket_code || '').match(new RegExp(`^${branchCode}-(\\d{5})-`));
    const number = match ? Number.parseInt(match[1], 10) : 0;
    return Number.isFinite(number) && number > latest ? number : latest;
  }, 0);

  return `${branchCode}-${String(latestNumber + 1).padStart(5, '0')}-${brandCode}-${deviceCode}`;
};

const getBearerToken = (request) => {
  const authorization = request.headers.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || '';
};

const getRequestUser = async (request, supabase) => {
  const token = getBearerToken(request);

  if (token) {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (!error && user) return user;
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Your session expired. Please log in again.');
  }

  return user;
};

const getActiveProfile = async (supabaseAdmin, user) => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, role, full_name, employee_id, department, branch, office, email, phone, status')
    .eq('id', user.id)
    .single();

  if (error || !data) {
    throw new Error(
      `Ticket cannot be submitted because no employee profile was found for ${user.email}.`
    );
  }

  if (String(data.status || 'Active').trim().toLowerCase() === 'inactive') {
    throw new Error('Inactive accounts cannot submit tickets.');
  }

  return data;
};

const getProfileById = async (supabaseAdmin, profileId) => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, role, full_name, employee_id, department, branch, office, email, phone, status')
    .eq('id', profileId)
    .single();

  if (error || !data) {
    throw new Error('Selected requester profile was not found.');
  }

  if (String(data.status || 'Active').trim().toLowerCase() === 'inactive') {
    throw new Error('Inactive accounts cannot be used as ticket requesters.');
  }

  return data;
};

const isSuperAdminProfile = (profile = {}) =>
  String(profile.role || '').trim().toLowerCase().replace(/[-\s]+/g, '_') === 'superadmin';

const normalizeRole = (role = '') =>
  String(role || '').trim().toLowerCase().replace(/[-\s]+/g, '_');

const isAdminProfile = (profile = {}) =>
  ['admin', 'superadmin'].includes(normalizeRole(profile.role));

const normalizeStatus = (status = '') =>
  String(status || '').trim().toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ');

const hasAssignedTechnician = (ticket = {}) => {
  const technician = String(ticket.technician || '').trim().toLowerCase();
  return Boolean(technician && technician !== 'unassigned');
};

const isEmployeeTicketLocked = (ticket = {}) => {
  const status = normalizeStatus(ticket.status);
  const lockedStatuses = [
    'in progress',
    'moved date',
    'escalated',
    'resolved',
    'canceled',
    'cancelled',
    'for inspection',
    'under burnout',
    'passed burnout',
    'ready for deployment',
    'deployed',
    'failed burnout',
    'damaged',
    'for repair',
    'for replacement',
  ];

  return Boolean(
    hasAssignedTechnician(ticket) ||
      ticket.work_started_at ||
      String(ticket.action_taken || '').trim() ||
      String(ticket.admin_remarks || '').trim() ||
      String(ticket.resolution || '').trim() ||
      lockedStatuses.includes(status)
  );
};

const EMPLOYEE_UPDATE_FIELDS = new Set([
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
  'status',
]);

const updateFieldMap = {
  requester: 'requester',
  employeeId: 'employee_id',
  branch: 'branch',
  department: 'department',
  custodian: 'custodian',
  brand: 'brand',
  deviceType: 'device_type',
  serialNumber: 'serial_number',
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
  dateLabel: 'date_label',
  lastEmployeeUpdate: 'last_employee_update',
  adminUpdatedAt: 'admin_updated_at',
  workStartedAt: 'work_started_at',
  workEndedAt: 'work_ended_at',
  statusHistory: 'status_history',
  lockedBy: 'locked_by',
  lockedByName: 'locked_by_name',
  lockedAt: 'locked_at',
  lockExpiresAt: 'lock_expires_at',
  burnoutReport: 'burnout_report',
};

const mapUpdatesToColumns = (updates = {}) =>
  Object.entries(updates).reduce((payload, [key, value]) => {
    const column = updateFieldMap[key];
    if (column && value !== undefined) payload[column] = value;
    return payload;
  }, {});

const getTicketById = async (supabase, ticketId) => {
  const { data, error } = await supabase
    .from('tickets')
    .select(TICKET_RETURN_COLUMNS)
    .eq('id', ticketId)
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Ticket was not found.');
  }

  return data;
};

const applyServerTicketStateRules = (payload, currentTicket) => {
  const status = normalizeStatus(payload.status);
  const now = new Date().toISOString();

  if (!status) return payload;

  if (status === 'in progress') {
    payload.work_started_at = currentTicket.work_started_at || now;
    payload.work_ended_at = null;
  }

  if (['under burnout', 'for inspection'].includes(status)) {
    payload.work_started_at = currentTicket.work_started_at || now;
    payload.work_ended_at = null;
  }

  if (status === 'resolved') {
    payload.work_started_at = currentTicket.work_started_at || currentTicket.created_at || now;
    payload.work_ended_at = now;
    payload.admin_updated_at = payload.admin_updated_at || now;
  }

  if (status === 'canceled' || status === 'cancelled') {
    payload.work_ended_at = now;
    payload.admin_updated_at = payload.admin_updated_at || now;
  }

  if (
    [
      'passed burnout',
      'ready for deployment',
      'deployed',
      'failed burnout',
      'damaged',
      'for repair',
      'for replacement',
    ].includes(status)
  ) {
    payload.work_started_at = currentTicket.work_started_at || currentTicket.created_at || now;
    payload.work_ended_at = now;
    payload.admin_updated_at = payload.admin_updated_at || now;
  }

  return payload;
};

export async function POST(request) {
  try {
    const rateLimit = checkRateLimit(request, {
      key: 'tickets:create',
      limit: 10,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

    const body = await request.json().catch(() => ({}));
    const form = body.form || {};

    const authClient = await createServerClient();
    const authUser = await getRequestUser(request, authClient);
    const dbClient = hasSupabaseAdminConfig() ? createAdminClient() : authClient;
    const profile = await getActiveProfile(dbClient, authUser);
    const submittedForUserId = String(form.submittedForUserId || '').trim();

    if (submittedForUserId && submittedForUserId !== authUser.id && !isSuperAdminProfile(profile)) {
      throw new Error('Only the Super Admin can create a ticket for another portal account.');
    }

    const requesterProfile =
      submittedForUserId && submittedForUserId !== authUser.id
        ? await getProfileById(dbClient, submittedForUserId)
        : profile;

    const now = new Date();
    const burnoutTicket = isBurnoutTicket(form);
    const deviceType = form.deviceType || form.deviceName || '';
    const affectedBranch = String(form.branch || '').trim();
    const affectedDepartment = String(form.department || '').trim();
    const derivedImpact = deriveTicketImpact({
      supportCategory: form.supportCategory || (burnoutTicket ? 'Burnout' : ''),
      concernType: form.concernType || (burnoutTicket ? 'Helpdesk Burnout' : ''),
      deviceName: form.deviceName,
      deviceType,
    });
    const finalSla = derivedImpact.sla;
    const finalImpact = derivedImpact.impact;

    if (burnoutTicket && !String(form.brand || '').trim()) {
      throw new Error('Brand & Model is required for Helpdesk Burnout tickets.');
    }

    if (burnoutTicket && !String(deviceType || '').trim()) {
      throw new Error('Device type is required for Helpdesk Burnout tickets.');
    }

    if (burnoutTicket && !String(form.serialNumber || '').trim()) {
      throw new Error('Serial number is required for Helpdesk Burnout tickets.');
    }

    if (!affectedBranch) {
      throw new Error('Branch / Location is required. Select where the concern happened.');
    }

    if (!affectedDepartment) {
      throw new Error('Department is required. Select the department affected by the concern.');
    }

    const ticketCode = burnoutTicket
      ? await getNextBurnoutTicketCode(dbClient, {
          branch: affectedBranch,
          brand: form.brand,
          deviceType,
        })
      : '';

    const ticketPayload = {
      owner_id: requesterProfile.id,
      owner_email: requesterProfile.email || authUser.email,
      ticket_code: ticketCode || null,
      requester: requesterProfile.full_name || requesterProfile.email || 'Employee',
      employee_id: requesterProfile.employee_id || '',
      branch: affectedBranch,
      department: affectedDepartment,
      custodian: form.custodian || '',
      brand: burnoutTicket ? normalizeCodePart(form.brand, '') : form.brand || '',
      device_type: burnoutTicket ? normalizeDeviceCode(deviceType, '') : form.deviceType || '',
      serial_number: String(form.serialNumber || '').trim().toUpperCase(),
      support_category: form.supportCategory || 'Other ICT Request',
      concern_type: form.concernType || (burnoutTicket ? 'Helpdesk Burnout' : 'Concern not listed'),
      device_name: deviceType || '',
      contact_number: form.contactNumber || requesterProfile.phone || '',
      impact: finalImpact,
      description: String(form.description || form.remarks || '').trim(),
      sla: finalSla,
      priority: finalSla,
      status: 'Created',
      technician: 'Unassigned',
      action_taken: '',
      admin_remarks: '',
      resolution: '',
      saar_required: Boolean(form.saarRequired || form.saarAttachment?.name),
      saar_attachment: await processSaarAttachment(dbClient, form.saarAttachment, requesterProfile.id),
      photo_attachments: await processPhotoAttachments(dbClient, form.photoAttachments, requesterProfile.id),
      date_label: formatDateOnly(now),
      last_employee_update: form.lastEmployeeUpdate || formatDateTime(now),
      status_history: [
        {
          status: 'Submitted',
          type: 'submitted',
          timestamp: now.toISOString(),
          label: 'Submitted',
          submittedBy: profile.id,
          submittedByName: profile.full_name || authUser.email || 'Portal user',
          submittedFor: requesterProfile.id,
          submittedForName: requesterProfile.full_name || requesterProfile.email || 'Requester',
        },
      ],
    };

    if (!ticketPayload.description) {
      throw new Error('Issue Description is required.');
    }

    let insertResult = await dbClient
      .from('tickets')
      .insert(ticketPayload)
      .select(TICKET_RETURN_COLUMNS)
      .single();

    if (insertResult.error?.code === '23505' && burnoutTicket) {
      ticketPayload.ticket_code = await getNextBurnoutTicketCode(dbClient, {
        branch: ticketPayload.branch,
        brand: ticketPayload.brand,
        deviceType: ticketPayload.device_type,
      });

      insertResult = await dbClient
        .from('tickets')
        .insert(ticketPayload)
        .select(TICKET_RETURN_COLUMNS)
        .single();
    }

    const { data, error } = insertResult;

    if (error) {
      throw new Error(error.message || 'Unable to create ticket in Supabase.');
    }

    return NextResponse.json({ ticket: data });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Unable to submit ticket.' },
      { status: 400 }
    );
  }
}

export async function PATCH(request) {
  try {
    const rateLimit = checkRateLimit(request, {
      key: 'tickets:update',
      limit: 40,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

    const body = await request.json().catch(() => ({}));
    const ticketId = String(body.id || body.ticketId || '').trim();
    const updates = body.updates || {};

    if (!ticketId) {
      throw new Error('Ticket ID is required.');
    }

    const authClient = await createServerClient();
    const authUser = await getRequestUser(request, authClient);
    const dbClient = hasSupabaseAdminConfig() ? createAdminClient() : authClient;
    const profile = await getActiveProfile(dbClient, authUser);
    const currentTicket = await getTicketById(dbClient, ticketId);
    const adminProfile = isAdminProfile(profile);

    if (!adminProfile && currentTicket.owner_id !== authUser.id) {
      return NextResponse.json({ error: 'You can only update your own ticket.' }, { status: 403 });
    }

    if (!adminProfile) {
      if (isEmployeeTicketLocked(currentTicket)) {
        throw new Error('This ticket is already being handled by ICT and can no longer be edited.');
      }

      const blockedFields = Object.keys(updates).filter((key) => {
        if (!EMPLOYEE_UPDATE_FIELDS.has(key)) return true;
        if (key === 'status') return true;
        return false;
      });

      if (blockedFields.length) {
        return NextResponse.json(
          { error: 'Employee accounts can only edit request details before ICT starts catering the ticket.' },
          { status: 403 }
        );
      }
    }

    const nextUpdates = { ...updates };

    if (!adminProfile) {
      const derivedImpact = deriveTicketImpact({
        supportCategory: nextUpdates.supportCategory || currentTicket.support_category,
        concernType: nextUpdates.concernType || currentTicket.concern_type,
        deviceName: nextUpdates.deviceName || currentTicket.device_name,
        deviceType: nextUpdates.deviceType || currentTicket.device_type,
      });

      nextUpdates.sla = derivedImpact.sla;
      nextUpdates.priority = derivedImpact.priority;
      nextUpdates.impact = derivedImpact.impact;
      nextUpdates.lastEmployeeUpdate = formatDateTime(new Date());
    }

    if (adminProfile && nextUpdates.sla) {
      const manualSla = normalizeSlaLevel(nextUpdates.sla);

      nextUpdates.sla = manualSla;
      nextUpdates.priority = manualSla;
      nextUpdates.impact = nextUpdates.impact || IMPACT_TEXT_BY_SLA[manualSla] || currentTicket.impact;
    }

    if (nextUpdates.photoAttachments !== undefined) {
      nextUpdates.photoAttachments = await processPhotoAttachments(
        dbClient,
        nextUpdates.photoAttachments,
        currentTicket.owner_id
      );
    }

    if (nextUpdates.saarAttachment !== undefined) {
      nextUpdates.saarAttachment = await processSaarAttachment(
        dbClient,
        nextUpdates.saarAttachment,
        currentTicket.owner_id
      );
    }

    let payload = mapUpdatesToColumns(nextUpdates);

    if (!Object.keys(payload).length) {
      throw new Error('No valid ticket updates were provided.');
    }

    payload = applyServerTicketStateRules(payload, currentTicket);

    const { data, error } = await dbClient
      .from('tickets')
      .update(payload)
      .eq('id', ticketId)
      .select(TICKET_RETURN_COLUMNS)
      .single();

    if (error) {
      throw new Error(error.message || 'Unable to update ticket.');
    }

    return NextResponse.json({ ticket: data });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Unable to update ticket.' },
      { status: 400 }
    );
  }
}
