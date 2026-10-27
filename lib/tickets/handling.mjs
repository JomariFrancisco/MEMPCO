import { handlingMilliseconds, isClosed, normalizeStatus } from './workflow.mjs';

const WORK_STATUSES = new Set(['in progress', 'for inspection', 'escalated']);
const WAITING_STATUSES = new Set(['waiting for requester', 'waiting for vendor', 'waiting for approval', 'moved date']);
const NEW_STATUSES = new Set(['created', 'submitted', 'pending', 'modified']);
const STATUS_LABELS = {
  'in progress': ['In progress', 'active'],
  'for inspection': ['Inspection in progress', 'active'],
  'under burnout': ['Burnout monitoring', 'active'],
  'waiting for requester': ['Waiting for requester', 'waiting'],
  'waiting for vendor': ['Waiting for vendor', 'waiting'],
  'waiting for approval': ['Waiting for approval', 'waiting'],
  'moved date': ['Scheduled', 'waiting'],
  escalated: ['Escalated', 'waiting'],
  resolved: ['Resolved', 'success'],
  cancelled: ['Cancelled', 'neutral'],
  canceled: ['Cancelled', 'neutral'],
  'passed burnout': ['Passed burnout', 'success'],
  'failed burnout': ['Failed burnout', 'danger'],
  'ready for deployment': ['Ready for deployment', 'success'],
  deployed: ['Deployed', 'success'],
  damaged: ['Damaged', 'danger'],
  'for repair': ['For repair', 'waiting'],
  'for replacement': ['For replacement', 'waiting'],
};

const timestamp = (value) => {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
};
const field = (ticket, camel, snake) => ticket[camel] ?? ticket[snake];
const isBurnout = (ticket) => normalizeStatus(field(ticket, 'supportCategory', 'support_category')) === 'burnout';
const technicianName = (value) => {
  const name = String(value || '').trim();
  return normalizeStatus(name) === 'unassigned' ? '' : name;
};

export function getTicketHandlingHistory(ticket = {}, now = Date.now()) {
  const history = field(ticket, 'statusHistory', 'status_history');
  const events = (Array.isArray(history) ? history : [])
    .filter((event) => event && typeof event === 'object')
    .map((event, index) => ({
      ...event,
      key: `${event.timestamp || event.date}-${index}`,
      time: timestamp(event.timestamp || event.date),
      normalizedStatus: normalizeStatus(event.status || event.snapshot?.status),
    }))
    .filter((event) => event.time !== null && event.time <= now)
    .sort((a, b) => a.time - b.time);
  let lastStatus = '';
  return events.map((event) => {
    lastStatus = event.normalizedStatus || lastStatus;
    return { ...event, normalizedStatus: lastStatus };
  });
}

function eventTechnician(event) {
  const name = technicianName(event.technician ?? event.snapshot?.technician);
  const id = event.technicianId ?? event.snapshot?.technicianId;
  return { name, identity: id || normalizeStatus(name) };
}

export function getTicketHandlingState(ticket = {}, now = Date.now()) {
  const status = normalizeStatus(ticket.status);
  const history = getTicketHandlingHistory(ticket, now);
  const assignedName = technicianName(ticket.technician);
  const assigned = Boolean(assignedName || field(ticket, 'technicianId', 'technician_id'));
  const closed = isClosed(status);
  let [title, tone] = STATUS_LABELS[status] || [String(ticket.status || 'Status unavailable'), 'neutral'];
  if (NEW_STATUSES.has(status)) {
    title = isBurnout(ticket) ? 'Awaiting inspection' : assigned ? 'Assigned' : 'Awaiting assignment';
    tone = 'neutral';
  }

  const firstStart = history.find((event) => WORK_STATUSES.has(event.normalizedStatus) || event.normalizedStatus === 'under burnout');
  // updated_at also changes on lock renewal, so it is not evidence of work.
  const lastActivityAt = history.at(-1)?.time
    ?? timestamp(field(ticket, 'adminUpdatedAt', 'admin_updated_at'))
    ?? timestamp(field(ticket, 'workStartedAt', 'work_started_at'));
  const completion = history.findLast((event, index) => isClosed(event.normalizedStatus)
    && event.normalizedStatus !== history[index - 1]?.normalizedStatus);
  const lockExpiresAt = timestamp(field(ticket, 'lockExpiresAt', 'lock_expires_at'));
  const editorId = field(ticket, 'lockedBy', 'locked_by');

  return {
    status, title, tone, closed,
    assignedName,
    assignee: assignedName ? `Assigned to ${assignedName}` : assigned ? 'Assigned technician' : 'Unassigned',
    startedAt: firstStart?.time ?? timestamp(field(ticket, 'workStartedAt', 'work_started_at')),
    lastActivityAt,
    completedAt: closed ? completion?.time
      ?? timestamp(field(ticket, 'resolvedAt', 'resolved_at'))
      ?? timestamp(field(ticket, 'workEndedAt', 'work_ended_at')) : null,
    paused: WAITING_STATUSES.has(status),
    monitoring: status === 'under burnout',
    nextActionAt: !closed && WAITING_STATUSES.has(status) ? timestamp(field(ticket, 'nextActionAt', 'next_action_at')) : null,
    editor: editorId && lockExpiresAt > now ? {
      id: editorId,
      name: String(field(ticket, 'lockedByName', 'locked_by_name') || 'ICT staff'),
      expiresAt: lockExpiresAt,
    } : null,
  };
}

export function getTicketHandlingActivity(ticket = {}, now = Date.now()) {
  const history = getTicketHandlingHistory(ticket, now);
  return history.map((event, index) => {
    const previous = history[index - 1];
    const status = event.normalizedStatus;
    const before = previous?.normalizedStatus;
    const changed = status !== before;
    const assigned = eventTechnician(event);
    const priorAssignment = previous ? eventTechnician(previous) : { identity: '' };
    const technicianChange = event.changes?.technician;
    const assignmentChanged = Boolean(technicianChange)
      || (assigned.identity !== priorAssignment.identity
        && (event.technician !== undefined || event.technicianId !== undefined || event.snapshot?.technician !== undefined));
    let title = 'Ticket updated';

    if (event.type === 'reopened' || (isClosed(before) && !isClosed(status))) title = 'Ticket reopened';
    else if (event.type === 'submitted' || (index === 0 && NEW_STATUSES.has(status))) title = 'Submitted';
    else if (changed && isClosed(status)) title = STATUS_LABELS[status]?.[0] || event.status;
    else if (changed && status === 'under burnout') title = 'Burnout monitoring started';
    else if (changed && status === 'escalated') title = 'Escalated';
    else if (changed && WAITING_STATUSES.has(status)) title = status === 'moved date' ? 'Work scheduled' : 'Work paused';
    else if (changed && WORK_STATUSES.has(status)) title = WAITING_STATUSES.has(before) ? 'Work resumed' : status === 'for inspection' ? 'Inspection started' : 'Work started';
    else if (event.changes?.firstResponseAt) title = 'First ICT response recorded';
    else if (event.changes?.priority) title = 'Priority updated';
    else if (event.changes?.nextActionAt) title = 'Follow-up schedule updated';
    else if (event.changes?.escalationPartner) title = 'Escalation updated';
    else if (event.changes?.actionTaken || event.changes?.resolution || event.changes?.recommendation) title = 'Handling details updated';
    else if (event.changes?.internalNoteUpdated) title = 'Internal ICT notes saved';
    else if (event.changes?.branch || event.changes?.department || event.changes?.supportCategory || event.changes?.concernType || event.changes?.deviceName || event.changes?.contactNumber || event.changes?.impact || event.changes?.descriptionUpdated) title = 'Request details updated';
    else if (assignmentChanged) title = assigned.identity ? priorAssignment.identity ? 'Reassigned' : 'Assigned' : 'Assignment cleared';

    const actorName = String(event.updatedByName || event.handledByName || event.submittedByName || '').trim();
    const actorRole = String(event.actorRole || '').trim();
    const previousStatus = event.previousStatus || event.fromStatus || previous?.status || previous?.normalizedStatus || '';
    const previousStatusLabel = STATUS_LABELS[normalizeStatus(previousStatus)]?.[0] || previousStatus;
    const currentStatusLabel = STATUS_LABELS[status]?.[0] || event.status || '';
    const eventChanges = event.changes && typeof event.changes === 'object' ? event.changes : {};
    const recordedChanges = Object.entries(eventChanges)
      .map(([key, value]) => formatTicketActivityChange(key, value))
      .filter(Boolean);
    const priorSnapshot = previous?.snapshot;
    const currentSnapshot = event.snapshot;
    const snapshotFields = ['priority', 'sla', 'nextActionAt', 'escalationPartner', 'supportCategory', 'concernType', 'branch', 'department', 'deviceName'];
    if (priorSnapshot && currentSnapshot) {
      for (const key of snapshotFields) {
        if (Object.prototype.hasOwnProperty.call(eventChanges, key)
          || !Object.prototype.hasOwnProperty.call(currentSnapshot, key)
          || currentSnapshot[key] === priorSnapshot[key]) continue;
        const detail = formatTicketActivityChange(key, { from: priorSnapshot[key], to: currentSnapshot[key] });
        if (detail) recordedChanges.push(detail);
      }
    }
    if (assignmentChanged && !recordedChanges.some((detail) => detail.startsWith('ICT assignment:'))) {
      recordedChanges.push(assigned.identity
        ? `ICT assignment: ${priorAssignment.name || 'Unassigned'} to ${assigned.name || 'ICT staff'}`
        : 'ICT assignment cleared.');
    }
    if (event.submittedForName && event.submittedForName !== actorName) {
      recordedChanges.unshift(`Submitted for: ${event.submittedForName}`);
    }

    return {
      key: event.key,
      title,
      status: currentStatusLabel,
      previousStatus,
      statusTransition: previousStatusLabel && normalizeStatus(previousStatus) !== status
        ? `${previousStatusLabel} to ${currentStatusLabel}`
        : currentStatusLabel,
      actor: actorName || 'Actor not recorded',
      actorRole,
      actorId: event.updatedBy || '',
      time: event.time,
      reason: String(event.reason || '').trim(),
      assignment: assignmentChanged ? assigned.identity ? `Assigned to ${assigned.name || 'ICT staff'}` : 'Assignment cleared' : '',
      details: recordedChanges,
      reopened: title === 'Ticket reopened',
    };
  });
}

const ACTIVITY_CHANGE_LABELS = {
  status: 'Status',
  technician: 'ICT assignment',
  priority: 'Priority',
  sla: 'SLA level',
  nextActionAt: 'Next action',
  escalationPartner: 'Escalation partner',
  actionTaken: 'Action taken',
  resolution: 'Resolution',
  recommendation: 'Recommendation',
  firstResponseAt: 'First ICT response',
  responseDueAt: 'Response target',
  resolutionDueAt: 'Resolution target',
  supportCategory: 'Support category',
  concernType: 'Concern type',
  branch: 'Branch / location',
  department: 'Department',
  deviceName: 'Device',
  contactNumber: 'Contact number',
  impact: 'Impact',
};

const formatActivityChangeValue = (key, value) => {
  if (value === null || value === undefined || value === '') {
    if (key.endsWith('At')) return 'Not scheduled';
    if (['status', 'priority', 'sla', 'technician'].includes(key)) return 'Not set';
    return 'Not recorded';
  }
  if (key === 'technician' && typeof value === 'object') return value.name || 'Unassigned';
  if (key.endsWith('At')) {
    const time = timestamp(value);
    return time === null ? String(value) : new Intl.DateTimeFormat('en-PH', {
      timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
    }).format(new Date(time));
  }
  if (key === 'status') {
    const normalized = normalizeStatus(value);
    return STATUS_LABELS[normalized]?.[0] || String(value);
  }
  return String(value).trim() || 'Not recorded';
};

function formatTicketActivityChange(key, change) {
  if (key === 'internalNoteUpdated') {
    return change ? 'Internal ICT notes updated; note contents are restricted.' : '';
  }
  if (key === 'descriptionUpdated') return change ? 'Issue description updated.' : '';
  if (!change || typeof change !== 'object') return '';

  const label = ACTIVITY_CHANGE_LABELS[key] || key.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`);
  const hasFrom = Object.prototype.hasOwnProperty.call(change, 'from');
  const hasTo = Object.prototype.hasOwnProperty.call(change, 'to');
  const from = hasFrom ? formatActivityChangeValue(key, change.from) : '';
  const to = hasTo ? formatActivityChangeValue(key, change.to) : '';

  if (['actionTaken', 'resolution', 'recommendation', 'impact'].includes(key) && hasTo) {
    return to === 'Not recorded' ? `${label} cleared.` : `${label}: ${to}`;
  }
  if (hasFrom && hasTo && from === to) {
    if (key === 'technician' && change.fromId !== change.toId) return `ICT assignment changed for ${to}; the staff account changed.`;
    return '';
  }
  if (hasFrom && hasTo) return `${label}: ${from} → ${to}`;
  if (hasTo) return `${label}: ${to}`;
  return '';
}

function deadlineState(dueAt, finishedAt, now, closed = false) {
  if (dueAt === null) return 'Not recorded';
  if (finishedAt !== null) return finishedAt <= dueAt ? 'Met' : 'Late';
  if (closed) return 'Not recorded';
  return now >= dueAt ? 'Overdue' : 'Within target';
}

export function getTicketHandlingMetrics(ticket = {}, now = Date.now()) {
  const state = getTicketHandlingState(ticket, now);
  const history = getTicketHandlingHistory(ticket, now);
  const activity = getTicketHandlingActivity(ticket, now);
  const hasWorkHistory = history.some((event) => WORK_STATUSES.has(event.normalizedStatus) || event.normalizedStatus === 'under burnout');
  let workMs = 0;
  let waitingMs = 0;
  let testingMs = 0;
  let incompletePause = false;

  for (let index = 0; index < history.length; index += 1) {
    const event = history[index];
    let end = history[index + 1]?.time ?? now;
    if (index === history.length - 1 && state.closed && state.completedAt !== null) end = Math.min(end, state.completedAt);
    if (index === history.length - 1 && state.paused && WORK_STATUSES.has(event.normalizedStatus)) {
      const pausedAt = timestamp(field(ticket, 'workEndedAt', 'work_ended_at'));
      if (pausedAt !== null) end = Math.min(end, pausedAt);
      else incompletePause = true;
    }
    const duration = Math.max(0, end - event.time);
    if (WORK_STATUSES.has(event.normalizedStatus)) workMs += duration;
    if (WAITING_STATUSES.has(event.normalizedStatus)) waitingMs += duration;
    if (event.normalizedStatus === 'under burnout') testingMs += duration;
  }

  if (!hasWorkHistory) {
    if (isBurnout(ticket)) {
      const testingStart = timestamp(field(ticket, 'burnoutStartedAt', 'burnout_started_at'));
      testingMs = testingStart !== null && (state.monitoring || state.closed)
        ? Math.max(0, (state.completedAt ?? now) - testingStart) : null;
      workMs = null;
    } else {
      const end = timestamp(field(ticket, 'workEndedAt', 'work_ended_at'));
      const recorded = Number(field(ticket, 'handlingSeconds', 'handling_seconds')) || 0;
      workMs = state.startedAt === null ? null
        : (state.paused || state.closed) && end === null ? recorded > 0 ? recorded * 1000 : null
          : handlingMilliseconds(ticket, now);
    }
  }
  if (incompletePause) workMs = null;

  const createdAt = timestamp(field(ticket, 'createdAtRaw', 'created_at'));
  const firstResponseAt = timestamp(field(ticket, 'firstResponseAt', 'first_response_at'));
  const responseDueAt = timestamp(field(ticket, 'responseDueAt', 'response_due_at'));
  const resolutionDueAt = timestamp(field(ticket, 'resolutionDueAt', 'resolution_due_at'));
  const resolvedOutcome = state.closed && !['cancelled', 'canceled'].includes(state.status);

  return {
    workMs,
    waitingMs: history.length && !incompletePause ? waitingMs : null,
    testingMs: isBurnout(ticket) ? testingMs : null,
    firstResponseMs: createdAt !== null && firstResponseAt !== null ? Math.max(0, firstResponseAt - createdAt) : null,
    firstResponseAt,
    responseDueAt,
    resolutionDueAt,
    responseSla: deadlineState(responseDueAt, firstResponseAt, now, state.closed),
    resolutionSla: deadlineState(resolutionDueAt, resolvedOutcome ? state.completedAt : null, now, state.closed),
    followUp: state.nextActionAt === null ? 'Not scheduled' : state.nextActionAt <= now ? 'Overdue' : 'Scheduled',
    reopenCount: activity.filter((event) => event.reopened).length,
    hasHistory: history.length > 0,
  };
}

export function formatHandlingDuration(milliseconds) {
  if (milliseconds === null || !Number.isFinite(milliseconds)) return 'Not recorded';
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  if (totalSeconds < 60) return totalSeconds ? `${totalSeconds}s` : milliseconds > 0 ? '<1s' : '0s';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days) return `${days}d ${hours}h ${minutes % 60}m ${seconds}s`;
  if (hours) return `${hours}h ${minutes % 60}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}
