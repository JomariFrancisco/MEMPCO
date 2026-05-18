import { NextResponse } from 'next/server';
import { createAdminClient, hasSupabaseAdminConfig } from '@/lib/supabase/admin';
import { createClient as createServerClient } from '@/lib/supabase/server';

const TICKET_RETURN_COLUMNS = `
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

    const ticketPayload = {
      owner_id: authUser.id,
      owner_email: profile.email || authUser.email,
      requester: profile.full_name || authUser.email || 'Employee',
      employee_id: profile.employee_id || '',
      branch: form.branch || profile.branch || profile.office || 'Unspecified',
      department: form.department || profile.department || 'Unspecified',
      support_category: form.supportCategory || 'Other ICT Support',
      concern_type: form.concernType || 'Other Technical Concern',
      device_name: form.deviceName || '',
      contact_number: form.contactNumber || profile.phone || '',
      impact: form.impact || '',
      description: String(form.description || '').trim(),
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

    const { data, error } = await dbClient
      .from('tickets')
      .insert(ticketPayload)
      .select(TICKET_RETURN_COLUMNS)
      .single();

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
