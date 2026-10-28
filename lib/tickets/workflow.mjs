export const normalizeStatus = (value = '') => String(value).trim().toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ');

export const CLOSED_STATUSES = new Set(['resolved', 'cancelled', 'canceled', 'passed burnout', 'ready for deployment', 'deployed', 'failed burnout', 'damaged', 'for repair', 'for replacement']);
export const isClosed = (status) => CLOSED_STATUSES.has(normalizeStatus(status));
export const isActiveAccount = (profile) => normalizeStatus(profile?.status || '') === 'active';
export const SLA_CLOCK_BASIS = 'calendar hours';
export const SLA_TARGET_HOURS = Object.freeze({
  Low: Object.freeze({ response: 72, resolution: 120 }),
  Medium: Object.freeze({ response: 24, resolution: 72 }),
  High: Object.freeze({ response: 24, resolution: 24 }),
  Critical: Object.freeze({ response: 8, resolution: 8 }),
});
export const BURNOUT_REQUIRED_TESTS = ['physical-inspection','power-test','bios-check','cpu-stress-test','memory-test','storage-test','temperature-monitoring','usb-ports','keyboard','mouse-touchpad','display-monitor','network-test','audio-test','camera-test'];
export const BURNOUT_REQUIRED_SOFTWARE = ['operating-system','windows-update','device-drivers','antivirus-endpoint-security','office-productivity','pdf-reader','web-browser','gpedit-msc'];
export const BURNOUT_REQUIRED_MONITORING = ['system-stability','system-temperature','unexpected-shutdown','error-messages','performance-issues'];
export const BURNOUT_REQUIRED_EVALUATION = ['hardware-condition','software-installation'];

const normalTransitions = {
  created: ['in progress', 'cancelled'], submitted: ['in progress', 'cancelled'],
  pending: ['in progress', 'cancelled'], modified: ['in progress', 'cancelled'],
  'in progress': ['moved date', 'escalated', 'waiting for requester', 'waiting for vendor', 'waiting for approval', 'resolved', 'cancelled'],
  'moved date': ['in progress', 'escalated', 'waiting for requester', 'waiting for vendor', 'waiting for approval', 'resolved', 'cancelled'],
  escalated: ['in progress', 'moved date', 'waiting for requester', 'waiting for vendor', 'waiting for approval', 'resolved', 'cancelled'],
  'waiting for requester': ['in progress', 'moved date', 'escalated', 'waiting for vendor', 'waiting for approval', 'resolved', 'cancelled'],
  'waiting for vendor': ['in progress', 'moved date', 'escalated', 'waiting for requester', 'waiting for approval', 'resolved', 'cancelled'],
  'waiting for approval': ['in progress', 'moved date', 'escalated', 'waiting for requester', 'waiting for vendor', 'resolved', 'cancelled'],
};
const burnoutTransitions = {
  created: ['for inspection', 'cancelled'], submitted: ['for inspection', 'cancelled'],
  'for inspection': ['under burnout', 'damaged', 'for repair', 'for replacement', 'cancelled'],
  'under burnout': ['passed burnout', 'failed burnout', 'damaged', 'for repair', 'for replacement', 'cancelled'],
};

export function availableStatuses(ticket) {
  const before=normalizeStatus(ticket.status);
  const transitions=normalizeStatus(ticket.supportCategory || ticket.support_category)==='burnout' ? burnoutTransitions : normalTransitions;
  return [...new Set([ticket.status,...(transitions[before] || []).map(status=>({
    'in progress':'In Progress','moved date':'Moved Date',escalated:'Escalated',resolved:'Resolved',cancelled:'Cancelled',
    'waiting for requester':'Waiting for Requester','waiting for vendor':'Waiting for Vendor','waiting for approval':'Waiting for Approval',
    'for inspection':'For Inspection','under burnout':'Under Burnout','passed burnout':'Passed Burnout','failed burnout':'Failed Burnout',damaged:'Damaged','for repair':'For Repair','for replacement':'For Replacement',
  }[status]))])];
}

export function validateTransition(ticket, updates, profile, now = Date.now()) {
  const before = normalizeStatus(ticket.status);
  const after = normalizeStatus(updates.status || ticket.status);
  const burnout = normalizeStatus(ticket.support_category || ticket.supportCategory) === 'burnout';
  if (isClosed(before)) {
    const reopen = profile.role === 'superadmin' && after === (burnout ? 'under burnout' : 'in progress');
    if (!reopen || String(updates.reopenReason || '').trim().length < 8) {
      throw new Error('Closed tickets are read-only. A superadmin must record a reopen reason of at least 8 characters.');
    }
    return;
  }
  if (before !== after && !(burnout ? burnoutTransitions : normalTransitions)[before]?.includes(after)) {
    throw new Error(`This ticket cannot move from ${ticket.status} to ${updates.status}.`);
  }
  if (after === 'resolved' && String(updates.resolution ?? ticket.resolution ?? '').trim().length < 8) {
    throw new Error('Record at least 8 characters of resolution details before resolving this ticket.');
  }
  if (['cancelled', 'canceled'].includes(after) && String(updates.resolution ?? ticket.resolution ?? '').trim().length < 8) {
    throw new Error('Record the cancellation reason in Resolution Notes (at least 8 characters).');
  }
  if (after === 'moved date' && before !== after) {
    if (!(new Date(updates.nextActionAt || '').getTime() > now)) throw new Error('Choose a future next-action date.');
  }
  if (['waiting for requester','waiting for vendor','waiting for approval'].includes(after) && before !== after) {
    if (String(updates.actionReason || '').trim().length < 8) throw new Error('Record why the ticket is waiting (at least 8 characters).');
    if (!(new Date(updates.nextActionAt || '').getTime() > now)) throw new Error('Choose a future next-action date.');
  }
  if (after === 'escalated') {
    const escalationPartner = String(updates.escalationPartner ?? ticket.escalation_partner ?? '').trim();
    if (!escalationPartner) throw new Error('Choose an escalation partner before escalating this ticket.');
    if (escalationPartner === 'Third Party Company'
      && !String(updates.escalationPartnerCompany ?? ticket.escalation_partner_company ?? '').trim()) {
      throw new Error('Enter the third-party company name before saving.');
    }
  }
  if (after === 'passed burnout') {
    const report = updates.burnoutReport || ticket.burnout_report || {};
    const hasRecordedRows = (rows, requiredIds, valueKey) => Array.isArray(rows) && requiredIds.every(id => {
      const row = rows?.find(item => item.id === id);
      return row && String(row[valueKey] || '').trim() && String(row[valueKey]).trim().toLowerCase() !== 'not recorded'
        && String(row.remarks || '').trim().length >= 8;
    });
    if (!Array.isArray(report.testingChecklist) || !BURNOUT_REQUIRED_TESTS.every(id=>report.testingChecklist.some(row=>row.id===id && (row.status==='Pass' || (row.status==='N/A' && String(row.remarks || '').trim().length>=8)))) ||
      !Array.isArray(report.softwareChecklist) || !BURNOUT_REQUIRED_SOFTWARE.every(id=>report.softwareChecklist.some(row=>row.id===id && row.installed===true)) ||
      !hasRecordedRows(report.monitoring, BURNOUT_REQUIRED_MONITORING, 'result') ||
      !hasRecordedRows(report.finalEvaluation, BURNOUT_REQUIRED_EVALUATION, 'status')) {
      throw new Error('Complete the testing, software, monitoring, and final evaluation records before approving Burnout.');
    }
    const start = new Date(ticket.burnout_started_at || '').getTime();
    if (!Number.isFinite(start) || now - start < 3 * 86400000) {
      throw new Error('At least three full Burnout testing days are required before passing the unit.');
    }
  }
}

export function mergeMessages(current = [], incoming = []) {
  const messages = new Map(current.map(message => [message.id, message]));
  incoming.forEach(message => messages.set(message.id, message));
  return [...messages.values()].sort((a, b) => {
    const time = value => new Date(value.createdAtRaw || value.created_at || value.createdAt || 0).getTime() || 0;
    return time(a) - time(b) || String(a.id).localeCompare(String(b.id));
  });
}

export function attachmentPath(attachment = {}) {
  if (attachment.path && !attachment.path.includes('..') && !attachment.path.startsWith('/')) return attachment.path;
  const url = attachment.url || attachment.publicUrl || attachment.dataUrl || '';
  const marker = '/storage/v1/object/public/ticket-attachments/';
  const index = url.indexOf(marker);
  if (index < 0) return '';
  try { return decodeURIComponent(url.slice(index + marker.length).split('?')[0]); } catch { return ''; }
}

export function privateAttachment(attachment) {
  if (!attachment) return null;
  const path = attachmentPath(attachment);
  if (!path) return { ...attachment };
  const url = `/api/tickets/attachments?path=${encodeURIComponent(path)}`;
  return { ...attachment, path, url, dataUrl: url };
}

export const queueRank = (ticket) => {
  const priority = String(ticket.priority || '').trim() || ticket.sla || 'Low';
  return ({ critical: 0, high: 1, medium: 2, low: 3 }[normalizeStatus(priority)] ?? 3);
};

export function isHelpdeskQueueEligible(ticket = {}, now = Date.now()) {
  const status = normalizeStatus(ticket.status);
  const technician = String(ticket.technician || '').trim().toLowerCase();
  const technicianId = ticket.technicianId || ticket.technician_id;
  const lockedBy = ticket.lockedBy || ticket.locked_by;
  const lockExpiry = new Date(ticket.lockExpiresAt || ticket.lock_expires_at || '').getTime();
  const hasActiveLock = Boolean(lockedBy && Number.isFinite(lockExpiry) && lockExpiry > now);

  return ['created', 'submitted', 'pending', 'modified'].includes(status)
    && !technicianId
    && (!technician || technician === 'unassigned')
    && !(ticket.workStartedAt || ticket.work_started_at)
    && !String(ticket.actionTaken || ticket.action_taken || '').trim()
    && !String(ticket.adminRemarks || ticket.admin_remarks || '').trim()
    && !String(ticket.resolution || '').trim()
    && !String(ticket.recommendation || '').trim()
    && !hasActiveLock;
}

export function monthlyTicketSnapshots(tickets, monthDate) {
  const month=new Date(monthDate);
  const start=new Date(month.getFullYear(),month.getMonth(),1).getTime();
  const end=new Date(month.getFullYear(),month.getMonth()+1,1).getTime();
  return tickets.flatMap(ticket=>{
    const created=new Date(ticket.createdAtRaw || ticket.created_at || ticket.createdAt || ticket.date || '').getTime();
    if (!Number.isFinite(created) || created>=end) return [];
    const history=(ticket.statusHistory || []).filter(entry=>Number.isFinite(new Date(entry.timestamp).getTime())).sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));
    const prior=history.filter(entry=>new Date(entry.timestamp).getTime()<start).at(-1);
    const events=history.filter(entry=>new Date(entry.timestamp).getTime()<end);
    const latest=events.at(-1);
    const during=events.filter(entry=>new Date(entry.timestamp).getTime()>=start);
    if (created<start && !during.length && isClosed(prior?.status || ticket.status)) return [];
    const status=latest?.status==='Submitted' ? 'Created' : latest?.status || (created>=start ? 'Created' : ticket.status);
    return [{...ticket,...latest?.snapshot,status,technician:latest?.technician || 'Unassigned',
      technicianId:latest?.technicianId || latest?.snapshot?.technicianId || ticket.technicianId || '',
      periodSubmitted:created>=start,periodResolved:during.some(event=>normalizeStatus(event.status)==='resolved'),
      workEndedAt:isClosed(status) ? latest?.timestamp || '' : '',adminUpdatedAt:latest?.timestamp || '',lastUpdated:latest?.timestamp || ''}];
  });
}

export function handlingMilliseconds(ticket, now = Date.now()) {
  const start = new Date(ticket.workStartedAt || ticket.work_started_at || '').getTime();
  const end = new Date(ticket.workEndedAt || ticket.work_ended_at || '').getTime();
  const saved = (Number(ticket.handlingSeconds || ticket.handling_seconds) || 0) * 1000;
  if (saved) return saved + (Number.isFinite(start) && !Number.isFinite(end) ? Math.max(0, now - start) : 0);
  return Number.isFinite(start) ? Math.max(0, (Number.isFinite(end) ? end : now) - start) : 0;
}
