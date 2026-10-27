import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatHandlingDuration,
  getTicketHandlingActivity,
  getTicketHandlingMetrics,
  getTicketHandlingState,
} from '../lib/tickets/handling.mjs';

const hour = 3_600_000;
const at = (hours) => new Date(Date.parse('2026-10-20T00:00:00Z') + hours * hour).toISOString();
const now = Date.parse(at(10));
const event = (hours, status, extras = {}) => ({ timestamp: at(hours), status, updatedBy: 'staff-1', updatedByName: 'Juan Cruz', technician: 'Juan Cruz', technicianId: 'staff-1', ...extras });

test('opening an unassigned ticket does not start work or assign the editor', () => {
  const state = getTicketHandlingState({ status: 'Created', lockedBy: 'staff-1', lockedByName: 'Juan Cruz', lockExpiresAt: at(11) }, now);
  assert.equal(state.title, 'Awaiting assignment');
  assert.equal(state.assignee, 'Unassigned');
  assert.equal(state.startedAt, null);
  assert.equal(state.editor.name, 'Juan Cruz');
});

test('locks never override saved states, and paused timestamps never imply completion', () => {
  for (const [status, title] of [
    ['In Progress', 'In progress'], ['For Inspection', 'Inspection in progress'],
    ['Under Burnout', 'Burnout monitoring'], ['Moved Date', 'Scheduled'],
    ['Waiting for Requester', 'Waiting for requester'], ['Waiting for Vendor', 'Waiting for vendor'],
    ['Waiting for Approval', 'Waiting for approval'], ['Escalated', 'Escalated'],
  ]) {
    const state = getTicketHandlingState({ status, workStartedAt: at(1), workEndedAt: at(2), lockedBy: 'another-editor', lockExpiresAt: at(11), technician: 'Juan Cruz' }, now);
    assert.equal(state.title, title);
    assert.equal(state.closed, false);
    assert.equal(state.completedAt, null);
    assert.equal(state.assignee, 'Assigned to Juan Cruz');
  }
});

test('final labels preserve outcomes instead of reporting every closure as successful', () => {
  for (const [status, tone] of [['Resolved', 'success'], ['Passed Burnout', 'success'], ['Failed Burnout', 'danger'], ['Cancelled', 'neutral'], ['For Repair', 'waiting']]) {
    const state = getTicketHandlingState({ status, workEndedAt: at(5) }, now);
    assert.equal(state.closed, true);
    assert.equal(state.tone, tone);
    assert.equal(state.completedAt, Date.parse(at(5)));
  }
});

test('lock renewals are excluded from last meaningful activity and expired editors disappear', () => {
  const ticket = { status: 'In Progress', statusHistory: [event(1, 'In Progress'), event(2, 'In Progress', { type: 'updated' })], updatedAtRaw: at(10), lockedBy: 'staff-1', lockExpiresAt: at(9) };
  const state = getTicketHandlingState(ticket, now);
  assert.equal(state.startedAt, Date.parse(at(1)));
  assert.equal(state.lastActivityAt, Date.parse(at(2)));
  assert.equal(state.editor, null);
});

test('work, waiting, closed intervals, and reopened sessions are counted separately', () => {
  const ticket = {
    status: 'In Progress',
    statusHistory: [event(0, 'Submitted'), event(1, 'In Progress'), event(2, 'Waiting for Vendor', { reason: 'Waiting for replacement part.' }), event(5, 'In Progress'), event(6, 'Resolved'), event(8, 'In Progress', { type: 'reopened', reason: 'The same issue returned.' })],
  };
  const metrics = getTicketHandlingMetrics(ticket, now);
  assert.equal(metrics.workMs, 4 * hour);
  assert.equal(metrics.waitingMs, 3 * hour);
  assert.equal(metrics.reopenCount, 1);
  assert.equal(metrics.testingMs, null);
});

test('burnout testing is reported separately from inspection time', () => {
  const ticket = { status: 'Passed Burnout', supportCategory: 'Burnout', statusHistory: [event(0, 'Submitted'), event(1, 'For Inspection'), event(2, 'Under Burnout'), event(74, 'Passed Burnout')] };
  const metrics = getTicketHandlingMetrics(ticket, Date.parse(at(100)));
  assert.equal(metrics.workMs, hour);
  assert.equal(metrics.testingMs, 72 * hour);
  assert.equal(metrics.waitingMs, 0);
});

test('legacy recorded handling totals are not counted twice when paused or completed', () => {
  for (const status of ['Waiting for Approval', 'Resolved']) {
    const metrics = getTicketHandlingMetrics({ status, workStartedAt: at(1), workEndedAt: at(2), handlingSeconds: 3600 }, now);
    assert.equal(metrics.workMs, hour);
    assert.equal(metrics.waitingMs, null);
  }
});

test('incomplete legacy history stops at recorded closure rather than running forever', () => {
  const metrics = getTicketHandlingMetrics({ status: 'Resolved', statusHistory: [event(1, 'In Progress')], workEndedAt: at(3) }, now);
  assert.equal(metrics.workMs, 2 * hour);
});

test('legacy waiting records without a pause boundary do not turn waiting into work time', () => {
  for (const statusHistory of [[], [event(1, 'In Progress')]]) {
    const metrics = getTicketHandlingMetrics({ status: 'Waiting for Vendor', workStartedAt: at(1), statusHistory }, now);
    assert.equal(metrics.workMs, null);
    assert.equal(metrics.waitingMs, null);
  }
});

test('activity preserves actors, handoffs, pause reasons, resumes and reopening', () => {
  const ticket = { statusHistory: [event(0, 'Submitted', { type: 'submitted', technician: 'Unassigned', technicianId: null }), event(1, 'In Progress'), event(2, 'In Progress', { technician: 'Maria Santos', technicianId: 'staff-2' }), event(3, 'Waiting for Requester', { reason: 'Requested a convenient visit time.' }), event(4, 'In Progress'), event(5, 'Resolved'), event(6, 'In Progress', { type: 'reopened', reason: 'Requester reports the same issue.' })] };
  const activity = getTicketHandlingActivity(ticket, now);
  assert.deepEqual(activity.map((row) => row.title), ['Submitted', 'Work started', 'Reassigned', 'Work paused', 'Work resumed', 'Resolved', 'Ticket reopened']);
  assert.equal(activity[2].assignment, 'Assigned to Maria Santos');
  assert.equal(activity[3].reason, 'Requested a convenient visit time.');
  assert.equal(activity[3].actor, 'Juan Cruz');
});

test('first response requires a recorded reply and follow-up deadlines use the saved state', () => {
  const ticket = { status: 'Waiting for Vendor', createdAtRaw: at(0), responseDueAt: at(4), resolutionDueAt: at(8), nextActionAt: at(9), lockedBy: 'staff-1', lockExpiresAt: at(11) };
  const pending = getTicketHandlingMetrics(ticket, now);
  assert.equal(pending.firstResponseMs, null);
  assert.equal(pending.responseSla, 'Overdue');
  assert.equal(pending.resolutionSla, 'Overdue');
  assert.equal(pending.followUp, 'Overdue');
  const replied = getTicketHandlingMetrics({ ...ticket, firstResponseAt: at(2) }, now);
  assert.equal(replied.firstResponseMs, 2 * hour);
  assert.equal(replied.responseSla, 'Met');
});

test('an old resolved timestamp does not satisfy the SLA of a reopened ticket', () => {
  const metrics = getTicketHandlingMetrics({ status: 'In Progress', resolvedAt: at(2), resolutionDueAt: at(5), statusHistory: [event(1, 'In Progress'), event(2, 'Resolved'), event(4, 'In Progress', { type: 'reopened' })] }, now);
  assert.equal(metrics.resolutionSla, 'Overdue');
});

test('legacy notes without a status neither stop a work interval nor reopen a closed ticket', () => {
  const ticket = {
    status: 'Resolved',
    statusHistory: [event(1, 'In Progress'), { timestamp: at(2), type: 'updated' }, event(3, 'Resolved'), { timestamp: at(4), type: 'updated' }],
  };
  const metrics = getTicketHandlingMetrics(ticket, now);
  assert.equal(metrics.workMs, 2 * hour);
  assert.equal(metrics.reopenCount, 0);
  assert.equal(getTicketHandlingState(ticket, now).completedAt, Date.parse(at(3)));
});

test('missing or malformed history stays readable without invented performance records', () => {
  const ticket = { status: 'Created', status_history: [null, { timestamp: 'invalid' }, event(12, 'In Progress')] };
  const metrics = getTicketHandlingMetrics(ticket, now);
  assert.equal(metrics.workMs, null);
  assert.equal(metrics.hasHistory, false);
  assert.deepEqual(getTicketHandlingActivity(ticket, now), []);
  assert.equal(formatHandlingDuration(null), 'Not recorded');
  assert.equal(formatHandlingDuration(0), '0s');
  assert.equal(formatHandlingDuration(43000), '43s');
  assert.equal(formatHandlingDuration(999), '<1s');
  assert.equal(formatHandlingDuration(60000), '1m 0s');
  assert.equal(formatHandlingDuration(61000), '1m 1s');
  assert.equal(formatHandlingDuration(3600000), '1h 0m 0s');
  assert.equal(formatHandlingDuration((((9 * 24 + 18) * 60 + 51) * 60 + 37) * 1000), '9d 18h 51m 37s');
});
