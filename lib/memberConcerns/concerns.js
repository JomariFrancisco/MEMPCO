import { createClient } from '@/lib/supabase/client';

const ATTACHMENT_BUCKET = 'member-concern-attachments';

const mapConcern = (row, staffById = new Map()) => ({
  id: row.id,
  name: row.member_name?.trim() || 'Anonymous member',
  branch: row.branch,
  originBranchId: row.origin_branch_id || '',
  phone: row.phone || '',
  email: row.email || '',
  preferredContact: row.preferred_contact,
  concernType: row.concern_type,
  category: row.category,
  submissionRoute: row.submission_route || 'mrdss',
  message: row.message,
  attachment: row.attachment || null,
  status: row.status,
  workflowStage: row.workflow_stage || (row.status === 'Closed' ? 'closed' : row.status === 'Resolved' ? 'final_tagging' : 'mrdss_review'),
  routedTo: row.routed_to || '',
  destinationType: row.destination_type || 'mrdss',
  destinationBranchId: row.destination_branch_id || '',
  destinationAreaId: row.destination_area_id || '',
  destinationUserId: row.destination_user_id || '',
  resolutionTag: row.resolution_tag || '',
  resolutionDetails: row.resolution_details || '',
  closureRemarks: row.closure_remarks || '',
  closureOutcome: row.closure_outcome || '',
  resolvedAt: row.resolved_at || null,
  resolvedBy: row.resolved_by
    ? (row.activities || []).find((activity) => activity.actorId === row.resolved_by)?.actor || row.resolved_by
    : '',
  closedAt: row.closed_at || null,
  priority: row.priority,
  assignedStaffId: row.assigned_staff_id || '',
  assignee: row.assigned_staff_id
    ? staffById.get(row.assigned_staff_id)?.full_name || 'MRDSS team'
    : 'Unassigned',
  activities: Array.isArray(row.activities) ? row.activities : [],
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const createConcernReference = () => {
  const randomPart = Math.random().toString(16).slice(2, 8).toUpperCase().padEnd(6, '0');
  return `MCC-${new Date().getFullYear()}-${randomPart}`;
};

export const loadMemberConcernBranches = async () => {
  const { data, error } = await createClient().rpc('get_member_concern_branches');
  if (error) throw new Error(error.message || 'Branch destinations could not be loaded.');
  return (data || []).map((row) => ({
    id: row.branch_id,
    name: row.branch_name?.trim() || '',
    category: row.category || 'branch',
    hasActiveManager: Boolean(row.has_active_manager),
  })).filter((branch) => branch.id && branch.name);
};

export const formatConcernDate = (value, options = {}) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    ...options,
  });
};

export const uploadConcernAttachment = async (concernId, file) => {
  if (!file) return null;

  const supabase = createClient();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-120) || 'attachment';
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
  const path = `${concernId}/${uniqueName}`;
  const { error } = await supabase.storage.from(ATTACHMENT_BUCKET).upload(path, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  });

  if (error) throw new Error(error.message || 'The attachment could not be uploaded.');

  return { name: file.name, type: file.type, size: file.size, path };
};

export const submitMemberConcern = async (concern) => {
  const supabase = createClient();
  const { error } = await supabase.from('member_concerns').insert({
    id: concern.id,
    member_name: concern.name,
    branch: concern.branch,
    phone: concern.phone,
    email: concern.email,
    preferred_contact: concern.preferredContact,
    concern_type: concern.concernType,
    category: concern.category,
    submission_route: concern.submissionRoute || 'mrdss',
    message: concern.message,
    attachment: concern.attachment,
  });

  if (error) throw new Error(error.message || 'Your concern could not be submitted. Please try again.');
};

export const loadMrdssWorkspace = async () => {
  const supabase = createClient();
  const [concernsResult, staffResult, branchDestinationsResult] = await Promise.all([
    supabase
      .from('member_concerns')
      .select('id, member_name, branch, origin_branch_id, phone, email, preferred_contact, concern_type, category, submission_route, message, attachment, status, workflow_stage, routed_to, destination_type, destination_branch_id, destination_area_id, destination_user_id, resolution_tag, resolution_details, closure_remarks, closure_outcome, resolved_at, resolved_by, closed_at, priority, assigned_staff_id, activities, created_at, updated_at')
      .order('created_at', { ascending: false }),
    supabase.rpc('get_mrdss_assignable_staff'),
    supabase.rpc('get_mrdss_branch_destinations'),
  ]);

  if (concernsResult.error) {
    throw new Error(concernsResult.error.message || 'Member concerns could not be loaded.');
  }
  if (staffResult.error) {
    throw new Error(staffResult.error.message || 'MRDSS staff could not be loaded.');
  }
  if (branchDestinationsResult.error) {
    throw new Error(branchDestinationsResult.error.message || 'Branch destinations could not be loaded.');
  }

  const staff = (staffResult.data || []).map((row) => ({
    id: row.staff_id,
    full_name: row.staff_name,
  }));
  const staffById = new Map(staff.map((person) => [person.id, person]));
  const branchDestinations = (branchDestinationsResult.data || []).map((row) => ({
    id: row.branch_id,
    name: row.branch_name,
  }));

  return {
    cases: (concernsResult.data || []).map((row) => mapConcern(row, staffById)),
    staff,
    branchDestinations,
  };
};

export const loadConcernEscalationTargets = async (concernId) => {
  const supabase = createClient();
  const [areaResult, cooResult, routeResult] = await Promise.all([
    supabase.rpc('get_concern_area_managers', { target_concern_id: concernId }),
    supabase.rpc('get_concern_coo_users', { target_concern_id: concernId }),
    supabase.rpc('get_member_concern_escalation_route', { target_concern_id: concernId }),
  ]);
  if (areaResult.error) throw new Error(areaResult.error.message || 'Area Managers could not be loaded.');
  if (cooResult.error) throw new Error(cooResult.error.message || 'COO recipients could not be loaded.');
  if (routeResult.error) throw new Error(routeResult.error.message || 'The case escalation route could not be loaded.');
  return {
    areaManagers: (areaResult.data || []).map((row) => ({ id: row.manager_id, name: row.manager_name, areaId: row.area_id })),
    cooUsers: (cooResult.data || []).map((row) => ({ id: row.user_id, name: row.user_name })),
    escalationRoute: routeResult.data || '',
  };
};

export const saveMrdssConcern = async ({ id, action, payload = {} }) => {
  let rpcName = 'perform_member_concern_action';
  let args = {
    target_concern_id: id,
    action_name: action,
    action_payload: payload,
  };

  if (action === 'record_final_notice') {
    rpcName = 'record_member_concern_final_notice';
    args = { target_concern_id: id, contact_method: payload.channel, note: payload.note || '' };
  } else if (action === 'close_unreachable') {
    rpcName = 'close_member_concern_unreachable';
    args = { target_concern_id: id };
  } else if (action === 'reopen_unreachable') {
    rpcName = 'reopen_unreachable_member_concern';
    args = { target_concern_id: id, reopen_remarks: payload.remarks || '' };
  } else if (action === 'escalate_branch_to_coo') {
    rpcName = 'escalate_member_concern_branch_to_coo';
    args = {
      target_concern_id: id,
      recipient_user_id: payload.userId,
      handoff_remarks: payload.remarks || '',
    };
  }

  const { data, error } = await createClient().rpc(rpcName, args);
  if (error) throw new Error(error.message || 'The case action could not be saved.');
  return mapConcern(data || {});
};

export const deleteMrdssConcern = async (id) => {
  const supabase = createClient();
  const { data: concern, error: lookupError } = await supabase
    .from('member_concerns')
    .select('attachment')
    .eq('id', id)
    .single();

  if (lookupError) throw new Error(lookupError.message || 'The case could not be found.');

  const { error: deleteError } = await supabase
    .from('member_concerns')
    .delete()
    .eq('id', id);

  if (deleteError) throw new Error(deleteError.message || 'The case could not be deleted.');

  const attachmentPath = concern?.attachment?.path;
  if (!attachmentPath) return { attachmentCleanupError: null };

  const { error: storageError } = await supabase
    .storage
    .from(ATTACHMENT_BUCKET)
    .remove([attachmentPath]);

  return { attachmentCleanupError: storageError?.message || null };
};

export const createConcernAttachmentUrl = async (path) => {
  const { data, error } = await createClient()
    .storage
    .from(ATTACHMENT_BUCKET)
    .createSignedUrl(path, 60 * 10);

  if (error) throw new Error(error.message || 'The attachment could not be opened.');
  return data.signedUrl;
};
