import { NextResponse } from 'next/server';
import { createAdminClient, hasSupabaseAdminConfig } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { IMPACT_TEXT_BY_SLA, deriveTicketImpact, normalizeSlaLevel } from '@/lib/tickets/sla';
import { checkRateLimit, rateLimitResponse } from '@/lib/server/rateLimit';
import { storeHelpdeskAttachment, removeHelpdeskFiles, drainHelpdeskCleanup } from '@/lib/server/helpdesk';
import { isActiveAccount, validateTransition } from '@/lib/tickets/workflow.mjs';

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
  action_reason,
  technician,
  technician_id,
  action_taken,
  admin_remarks,
  resolution,
  recommendation,
  saar_required,
  saar_attachment,
  photo_attachments,
  burnout_report,
  version,
  handling_seconds,
  burnout_started_at,
  next_action_at,
  escalation_partner,
  escalation_partner_company,
  response_due_at,
  resolution_due_at,
  first_response_at,
  resolved_at,
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
const OPTIONAL_TICKET_RETURN_COLUMNS = ['recommendation', 'escalation_partner_company'];
const stripTicketReturnColumns = (columns, columnNames = OPTIONAL_TICKET_RETURN_COLUMNS) =>
  columnNames.reduce(
    (nextColumns, column) => nextColumns.replace(new RegExp(`\\s*${column},\\s*`, 'm'), ''),
    columns
  );
const FALLBACK_TICKET_RETURN_COLUMNS = stripTicketReturnColumns(TICKET_RETURN_COLUMNS);
const isMissingOptionalTicketColumnError = (error) => {
  const message = String(error?.message || '').toLowerCase();

  return (
    error?.code === '42703' ||
    error?.code === 'PGRST204' ||
    OPTIONAL_TICKET_RETURN_COLUMNS.some((column) => message.includes(column))
  );
};

const selectTicketColumns = async (buildQuery) => {
  return buildQuery(TICKET_RETURN_COLUMNS);
};

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

const processAttachment = storeHelpdeskAttachment;

const processPhotoAttachments = async (supabase, attachments, ownerId, uploadedPaths) => {
  const normalized = normalizeAttachments(attachments);
  if (normalized.length > 5) throw new Error('Attach no more than five photos.');
  const folder = `${ownerId || 'unknown'}/photos`;

  const results = [];
  for (const attachment of normalized) {
    results.push(await processAttachment(supabase, attachment, {
        folder,
        allowedTypes: PHOTO_ATTACHMENT_TYPES,
        maxBytes: 4 * 1024 * 1024,
        uploadedPaths,
      }));
  }
  return results;
};

const processSaarAttachment = async (supabase, attachment, ownerId, uploadedPaths) => {
  if (!attachment) return null;

  return processAttachment(supabase, attachment, {
    folder: `${ownerId || 'unknown'}/saar`,
    allowedTypes: SAAR_ATTACHMENT_TYPES,
    maxBytes: 4 * 1024 * 1024,
    uploadedPaths,
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

const normalizeComparable = (value = '') =>
  String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');

const isBurnoutTicket = (form = {}) =>
  normalizeComparable(form.supportCategory) === 'burnout';

const isClosedTicketForReopen = (ticket = {}) => {
  const status = normalizeStatus(ticket.status);
  if (isBurnoutTicket({ supportCategory: ticket.support_category })) {
    return [
      'passed burnout',
      'ready for deployment',
      'deployed',
      'failed burnout',
      'damaged',
      'for repair',
      'for replacement',
      'resolved',
      'canceled',
      'cancelled',
    ].includes(status);
  }
  return ['resolved', 'cancelled', 'canceled'].includes(status);
};

const isOtherIctRequest = (supportCategory = '') =>
  normalizeComparable(supportCategory) === 'otherictrequest';

const isAdminDepartment = (department = '') =>
  normalizeComparable(department) === 'admin';

const getTicketRequestContext = (form = {}) =>
  [form.supportCategory, form.concernType, form.deviceName, form.description]
    .map((value) => String(value || '').trim().toLowerCase())
    .join(' ');

const isMbwinSky360Request = (form = {}) => {
  const context = getTicketRequestContext(form);

  return ['mbwin', 'sky360', 'mb win', 'mbwim', 'mb wim'].some((keyword) => context.includes(keyword));
};

const isMbwinTellerRoleModificationRequest = (form = {}) => {
  if (!isMbwinSky360Request(form)) return false;

  const requestText = getTicketRequestContext(form).replace(/[^a-z0-9]+/g, ' ');
  const referencesRole = /\b(?:teller\s+)?(?:user\s+)?role\b/.test(requestText);
  const requestsModification = /\b(?:modify|modification|change|update|amend|add|remove)\b/.test(requestText);

  return referencesRole && requestsModification;
};

const hasStoredSaarAttachment = (attachment) =>
  Boolean(
    attachment &&
      typeof attachment === 'object' &&
      attachment.path && attachment.type === 'application/pdf'
  );

const getNextBurnoutTicketCode = async (supabase, { branch, brand, deviceType }) => {
  const branchCode = getBurnoutBranchCode(branch);
  const brandCode = normalizeCodePart(brand, 'BRAND');
  const deviceCode = normalizeDeviceCode(deviceType);

  const { data, error } = await supabase.rpc('allocate_burnout_code', {branch_code:branchCode,brand_code:brandCode,device_code:deviceCode});

  if (error) {
    throw new Error(error.message || 'Unable to read existing Burnout ticket codes.');
  }

  return data;
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
  const {data:validSession,error:sessionError}=await supabaseAdmin.rpc('has_valid_portal_session');
  if (sessionError || validSession !== true) {
    throw Object.assign(new Error('Your portal session is no longer active. Please sign in again.'),{status:403});
  }
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

  if (!isActiveAccount(data)) {
    throw Object.assign(new Error('Only active accounts can access the helpdesk.'), {status:403});
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

  if (!isActiveAccount(data)) {
    throw new Error('Inactive accounts cannot be used as ticket requesters.');
  }

  return data;
};

const isSuperAdminProfile = (profile = {}) =>
  String(profile.role || '').trim().toLowerCase().replace(/[-\s]+/g, '_') === 'superadmin';

const getProfileDisplayName = (profile = {}, fallback = '') =>
  isSuperAdminProfile(profile)
    ? 'Super Admin'
    : profile.full_name || profile.email || fallback;

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
    'waiting for requester',
    'waiting for vendor',
    'waiting for approval',
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
      String(ticket.recommendation || '').trim() ||
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
  technicianId: 'technician_id',
  actionTaken: 'action_taken',
  adminRemarks: 'admin_remarks',
  resolution: 'resolution',
  recommendation: 'recommendation',
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
  nextActionAt: 'next_action_at',
  escalationPartner: 'escalation_partner',
  escalationPartnerCompany: 'escalation_partner_company',
  actionReason: 'action_reason',
};

const mapUpdatesToColumns = (updates = {}) =>
  Object.entries(updates).reduce((payload, [key, value]) => {
    const column = updateFieldMap[key];
    if (column && value !== undefined) payload[column] = value;
    return payload;
  }, {});

const getTicketById = async (supabase, ticketId) => {
  const { data, error } = await selectTicketColumns((columns) =>
    supabase
      .from('tickets')
      .select(columns)
      .eq('id', ticketId)
      .single()
  );

  if (error || !data) {
    throw new Error(error?.message || 'Ticket was not found.');
  }

  return data;
};

const applyServerTicketStateRules = (payload, currentTicket) => {
  const status = normalizeStatus(payload.status);
  const resultingStatus = normalizeStatus(payload.status ?? currentTicket.status);
  const now = new Date().toISOString();

  if (resultingStatus === 'escalated') {
    const escalationPartner = String(payload.escalation_partner ?? currentTicket.escalation_partner ?? '').trim();
    const companyName = String(payload.escalation_partner_company ?? currentTicket.escalation_partner_company ?? '').trim();
    if (!escalationPartner) throw new Error('Choose an escalation partner before escalating this ticket.');
    if (escalationPartner === 'Third Party Company' && !companyName) {
      throw new Error('Enter the third-party company name before saving.');
    }
    if (escalationPartner !== 'Third Party Company') {
      payload.escalation_partner = escalationPartner;
      payload.escalation_partner_company = '';
    }
  } else if (
    Object.hasOwn(payload, 'status')
    || Object.hasOwn(payload, 'escalation_partner')
    || Object.hasOwn(payload, 'escalation_partner_company')
  ) {
    payload.escalation_partner = '';
    payload.escalation_partner_company = '';
  }

  if (!status) return payload;

  if (status === 'in progress') {
    payload.work_started_at = currentTicket.work_started_at || now;
    payload.work_ended_at = null;
    payload.next_action_at = null;
  }

  if (['under burnout', 'for inspection'].includes(status)) {
    payload.work_started_at = currentTicket.work_started_at || now;
    payload.work_ended_at = null;
  }

  if (status === 'resolved') {
    payload.work_started_at = currentTicket.work_started_at || currentTicket.created_at || now;
    payload.work_ended_at = now;
    payload.admin_updated_at = payload.admin_updated_at || now;
    payload.next_action_at = null;
  }

  if (status === 'canceled' || status === 'cancelled') {
    payload.work_ended_at = now;
    payload.next_action_at = null;
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
  const uploadedPaths = [];
  let dbClient;
  let persisted = false;
  try {
    const body = await request.json().catch(() => ({}));
    const form = body.form || {};

    const authClient = await createServerClient();
    const authUser = await getRequestUser(request, authClient);
    const profile = await getActiveProfile(authClient, authUser);
    if (!hasSupabaseAdminConfig()) throw Object.assign(new Error('The secure helpdesk server is not configured.'),{status:503});
    dbClient = createAdminClient();
    await drainHelpdeskCleanup(dbClient);
    const rateLimit = checkRateLimit(request,{key:'tickets:create',identity:profile.id,limit:10,windowMs:60_000});
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
    const creationKey = String(body.requestId || '');
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(creationKey)) throw new Error('A valid submission request ID is required.');
    const submittedForUserId = String(form.submittedForUserId || '').trim();

    if (submittedForUserId && submittedForUserId !== authUser.id && !isSuperAdminProfile(profile)) {
      throw new Error('Only the Super Admin can create a ticket for another portal account.');
    }

    const requesterProfile =
      submittedForUserId && submittedForUserId !== authUser.id
        ? await getProfileById(dbClient, submittedForUserId)
        : profile;

    const {data:existing,error:existingError} = await dbClient.from('tickets').select(TICKET_RETURN_COLUMNS).eq('owner_id',requesterProfile.id).eq('creation_key',creationKey).maybeSingle();
    if (existingError) throw new Error(existingError.message);
    if (existing) return NextResponse.json({ticket:existing});
    if (!String(form.description || form.remarks || '').trim()) throw new Error('Issue Description is required.');
    if (!String(form.branch || '').trim() || !String(form.department || '').trim()) throw new Error('Branch and department are required.');

    const supportCategory = String(form.supportCategory || '').trim();

    if (!supportCategory) {
      throw new Error('Support category is required.');
    }

    if (!isAdminProfile(profile) && isOtherIctRequest(supportCategory)) {
      throw new Error('Other ICT Request is no longer available for employee accounts.');
    }

    const burnoutTicket = isBurnoutTicket({ supportCategory });

    if (burnoutTicket && !isAdminDepartment(requesterProfile.department)) {
      throw new Error('Burnout requests can only be submitted by accounts registered under the Admin department.');
    }

    const saarRequired = isMbwinTellerRoleModificationRequest(form);
    const saarAttachment = await processSaarAttachment(dbClient, form.saarAttachment, requesterProfile.id, uploadedPaths);

    if (saarRequired && !hasStoredSaarAttachment(saarAttachment)) {
      throw new Error('SAAR PDF attachment is required when modifying an MBWin / Sky360 teller role.');
    }

    const now = new Date();
    const deviceType = form.deviceType || form.deviceName || '';
    const affectedBranch = String(form.branch || '').trim();
    const affectedDepartment = String(form.department || '').trim();
    const derivedImpact = deriveTicketImpact({
      supportCategory,
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
      creation_key: creationKey,
      last_actor_id: profile.id,
      owner_id: requesterProfile.id,
      owner_email: requesterProfile.email || authUser.email,
      ticket_code: ticketCode || null,
      requester: getProfileDisplayName(requesterProfile, 'Employee'),
      employee_id: requesterProfile.employee_id || '',
      branch: affectedBranch,
      department: affectedDepartment,
      custodian: form.custodian || '',
      brand: burnoutTicket ? normalizeCodePart(form.brand, '') : form.brand || '',
      device_type: burnoutTicket ? normalizeDeviceCode(deviceType, '') : form.deviceType || '',
      serial_number: String(form.serialNumber || '').trim().toUpperCase(),
      support_category: supportCategory,
      concern_type: form.concernType || (burnoutTicket ? 'Helpdesk Burnout' : 'Concern not listed'),
      device_name: deviceType || '',
      contact_number: form.contactNumber || requesterProfile.phone || '',
      impact: finalImpact,
      description: String(form.description || form.remarks || '').trim(),
      sla: finalSla,
      priority: finalSla,
      status: 'Created',
      technician: 'Unassigned',
      technician_id: null,
      action_taken: '',
      admin_remarks: '',
      resolution: '',
      recommendation: '',
      saar_required: saarRequired,
      saar_attachment: saarAttachment,
      photo_attachments: await processPhotoAttachments(dbClient, form.photoAttachments, requesterProfile.id, uploadedPaths),
      date_label: formatDateOnly(now),
      last_employee_update: form.lastEmployeeUpdate || formatDateTime(now),
      status_history: [
        {
          status: 'Submitted',
          type: 'submitted',
          timestamp: now.toISOString(),
          label: 'Submitted',
          submittedBy: profile.id,
          submittedByName: getProfileDisplayName(profile, authUser.email || 'Portal user'),
          submittedFor: requesterProfile.id,
          submittedForName: getProfileDisplayName(requesterProfile, 'Requester'),
        },
      ],
    };

    if (!ticketPayload.description) {
      throw new Error('Issue Description is required.');
    }

    const insertTicketPayload = (payload) =>
      selectTicketColumns((columns) =>
        dbClient
          .from('tickets')
          .insert(payload)
          .select(columns)
          .single()
      );

    let insertPayload = ticketPayload;
    let insertResult = await insertTicketPayload(insertPayload);

    if (insertResult.error?.code === '23505') {
      const duplicate = await dbClient.from('tickets').select(TICKET_RETURN_COLUMNS).eq('owner_id',requesterProfile.id).eq('creation_key',creationKey).maybeSingle();
      if (duplicate.data) {
        await removeHelpdeskFiles(dbClient,uploadedPaths);
        return NextResponse.json({ticket:duplicate.data});
      }
    }

    const { data, error } = insertResult;

    if (error) {
      throw new Error(error.message || 'Unable to create ticket in Supabase.');
    }

    persisted = true;
    return NextResponse.json({ ticket: data });
  } catch (error) {
    if (!persisted && dbClient) await removeHelpdeskFiles(dbClient,uploadedPaths);
    return NextResponse.json(
      { error: error.message || 'Unable to submit ticket.' },
      { status: error.status || 400 }
    );
  }
}

export async function PATCH(request) {
  const uploadedPaths = [];
  let dbClient;
  let persisted = false;
  try {
    const body = await request.json().catch(() => ({}));
    const ticketId = String(body.id || body.ticketId || '').trim();
    const updates = body.updates || {};

    if (!ticketId) {
      throw new Error('Ticket ID is required.');
    }

    const authClient = await createServerClient();
    const authUser = await getRequestUser(request, authClient);
    const profile = await getActiveProfile(authClient, authUser);
    if (!hasSupabaseAdminConfig()) throw Object.assign(new Error('The secure helpdesk server is not configured.'),{status:503});
    dbClient = createAdminClient();
    await drainHelpdeskCleanup(dbClient);
    const rateLimit = checkRateLimit(request,{key:'tickets:update',identity:profile.id,limit:120,windowMs:60_000});
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
    const currentTicket = await getTicketById(dbClient, ticketId);
    const adminProfile = isAdminProfile(profile);
    const expectedVersion = Number(body.options?.expectedVersion);
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion !== Number(currentTicket.version)) throw Object.assign(new Error('This ticket changed. Refresh it before saving again.'),{status:409});
    if (adminProfile) validateTransition(currentTicket,updates,profile);

    if (!adminProfile && currentTicket.owner_id !== authUser.id) {
      return NextResponse.json({ error: 'You can only update your own ticket.' }, { status: 403 });
    }

    const requestedStatus = normalizeStatus(updates.status);
    if (
      adminProfile &&
      isClosedTicketForReopen(currentTicket) &&
      requestedStatus &&
      requestedStatus !== normalizeStatus(currentTicket.status) &&
      !isSuperAdminProfile(profile)
    ) {
      return NextResponse.json(
        { error: 'Only the super admin can reopen closed tickets.' },
        { status: 403 }
      );
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

    if (nextUpdates.supportCategory !== undefined) {
      const supportCategory = String(nextUpdates.supportCategory || '').trim();
      const categoryChanged =
        normalizeComparable(supportCategory) !== normalizeComparable(currentTicket.support_category);

      if (!supportCategory) {
        throw new Error('Support category is required.');
      }

      if (categoryChanged && !isAdminProfile(profile) && isOtherIctRequest(supportCategory)) {
        throw new Error('Other ICT Request is no longer available for employee accounts.');
      }

      if (categoryChanged && isBurnoutTicket({ supportCategory })) {
        const ticketOwnerProfile =
          currentTicket.owner_id === profile.id
            ? profile
            : await getProfileById(dbClient, currentTicket.owner_id);

        if (!isAdminDepartment(ticketOwnerProfile.department)) {
          throw new Error('Burnout requests can only be submitted by accounts registered under the Admin department.');
        }
      }
    }

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
        currentTicket.owner_id,
        uploadedPaths
      );
    }

    if (nextUpdates.saarAttachment !== undefined) {
      nextUpdates.saarAttachment = await processSaarAttachment(
        dbClient,
        nextUpdates.saarAttachment,
        currentTicket.owner_id,
        uploadedPaths
      );
    }

    const shouldRecalculateSaarRequirement = [
      'supportCategory',
      'concernType',
      'deviceName',
      'description',
      'saarAttachment',
      'saarRequired',
    ].some((field) => Object.prototype.hasOwnProperty.call(nextUpdates, field));

    if (shouldRecalculateSaarRequirement) {
      const saarRequired = isMbwinTellerRoleModificationRequest({
        supportCategory: nextUpdates.supportCategory ?? currentTicket.support_category,
        concernType: nextUpdates.concernType ?? currentTicket.concern_type,
        deviceName: nextUpdates.deviceName ?? currentTicket.device_name,
        description: nextUpdates.description ?? currentTicket.description,
      });
      const saarAttachment =
        nextUpdates.saarAttachment !== undefined
          ? nextUpdates.saarAttachment
          : currentTicket.saar_attachment;

      if (saarRequired) {
        const verifiedAttachment = nextUpdates.saarAttachment !== undefined
          ? saarAttachment
          : await processSaarAttachment(dbClient,saarAttachment,currentTicket.owner_id,uploadedPaths);
        if (!hasStoredSaarAttachment(verifiedAttachment)) {
          throw new Error('A verified SAAR PDF in private storage is required when modifying an MBWin / Sky360 teller role.');
        }
        nextUpdates.saarAttachment = verifiedAttachment;
      }

      nextUpdates.saarRequired = saarRequired;
    }

    let payload = mapUpdatesToColumns(nextUpdates);

    if (!Object.keys(payload).length) {
      throw new Error('No valid ticket updates were provided.');
    }

    payload = applyServerTicketStateRules(payload, currentTicket);
    delete payload.status_history;
    delete payload.locked_by; delete payload.locked_by_name; delete payload.locked_at; delete payload.lock_expires_at;
    payload.last_actor_id = profile.id;
    payload.action_reason = String(updates.reopenReason || updates.actionReason || updates.exceptionReason || '').trim();
    if (Object.hasOwn(payload,'admin_remarks')) {
      payload.private_note_update = {body:payload.admin_remarks};
      delete payload.admin_remarks;
    }

    const updateTicketPayload = (nextPayload) =>
      selectTicketColumns((columns) =>
        dbClient
          .from('tickets')
          .update(nextPayload)
          .eq('id', ticketId)
          .eq('version',expectedVersion)
          .select(columns)
          .maybeSingle()
      );

    let updateResult = await updateTicketPayload(payload);

    const { data, error } = updateResult;

    if (error) {
      throw new Error(error.message || 'Unable to update ticket.');
    }
    if (!data) throw Object.assign(new Error('Another save changed this ticket. Refresh before retrying.'),{status:409});
    persisted = true;
    if (adminProfile) {
      const {data:note} = await dbClient.from('ticket_internal_notes').select('body').eq('ticket_id',ticketId).maybeSingle();
      data.admin_remarks = note?.body || '';
    }
    return NextResponse.json({ ticket: data });
  } catch (error) {
    if (!persisted && dbClient) await removeHelpdeskFiles(dbClient,uploadedPaths);
    return NextResponse.json(
      { error: error.message || 'Unable to update ticket.' },
      { status: error.status || 400 }
    );
  }
}
