import { NextResponse } from 'next/server';
import { createAdminClient, hasSupabaseAdminConfig } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';

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

const normalizeSlaLevel = (value) => {
  const normalized = String(value || 'Low').trim().toLowerCase();

  if (normalized === 'critical') return 'Critical';
  if (normalized === 'high') return 'High';
  if (normalized === 'medium') return 'Medium';
  return 'Low';
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

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const form = body.form || {};

    const authClient = await createServerClient();
    const authUser = await getRequestUser(request, authClient);
    const dbClient = hasSupabaseAdminConfig() ? createAdminClient() : authClient;
    const profile = await getActiveProfile(dbClient, authUser);
    const now = new Date();
    const finalSla = normalizeSlaLevel(form.sla);
    const burnoutTicket = isBurnoutTicket(form);
    const deviceType = form.deviceType || form.deviceName || '';

    if (burnoutTicket && !String(form.brand || '').trim()) {
      throw new Error('Brand & Model is required for Helpdesk Burnout tickets.');
    }

    if (burnoutTicket && !String(deviceType || '').trim()) {
      throw new Error('Device type is required for Helpdesk Burnout tickets.');
    }

    if (burnoutTicket && !String(form.serialNumber || '').trim()) {
      throw new Error('Serial number is required for Helpdesk Burnout tickets.');
    }

    const ticketCode = burnoutTicket
      ? await getNextBurnoutTicketCode(dbClient, {
          branch: form.branch || profile.branch || profile.office || 'Unspecified',
          brand: form.brand,
          deviceType,
        })
      : '';

    const ticketPayload = {
      owner_id: authUser.id,
      owner_email: profile.email || authUser.email,
      ticket_code: ticketCode || null,
      requester: profile.full_name || authUser.email || 'Employee',
      employee_id: profile.employee_id || '',
      branch: form.branch || profile.branch || profile.office || 'Unspecified',
      department: form.department || profile.department || 'Unspecified',
      custodian: form.custodian || '',
      brand: burnoutTicket ? normalizeCodePart(form.brand, '') : form.brand || '',
      device_type: burnoutTicket ? normalizeDeviceCode(deviceType, '') : form.deviceType || '',
      serial_number: String(form.serialNumber || '').trim().toUpperCase(),
      support_category: form.supportCategory || 'Other ICT Support',
      concern_type: form.concernType || (burnoutTicket ? 'Helpdesk Burnout' : 'Other Technical Concern'),
      device_name: deviceType || '',
      contact_number: form.contactNumber || profile.phone || '',
      impact: form.impact || (burnoutTicket ? 'Device burnout request' : ''),
      description: String(form.description || form.remarks || '').trim(),
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
      status_history: [
        {
          status: 'Submitted',
          type: 'submitted',
          timestamp: now.toISOString(),
          label: 'Submitted',
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
