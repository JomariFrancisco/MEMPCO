import test from 'node:test';
import assert from 'node:assert/strict';
import { employeeTicketNotification } from '../lib/tickets/notifications.mjs';

const notice = (type, extras = {}) => ({ id: 'notice-1', type, related_ticket_id: 'TCK-2026-0046', title: 'Ticket update', ...extras });

test('employee inbox includes submissions, status, assignment, schedules and incoming replies', () => {
  for (const type of ['ticket_submitted', 'helpdesk_status', 'helpdesk_assignment', 'helpdesk_schedule']) {
    assert.equal(employeeTicketNotification(notice(type)).ticketId, 'TCK-2026-0046');
    assert.equal(employeeTicketNotification(notice(type)).kind, 'ticket');
  }
  assert.equal(employeeTicketNotification(notice('helpdesk_reply')).kind, 'reply');
});

test('employee inbox excludes operational reminders, service requests, generic notices and orphaned records', () => {
  for (const type of ['helpdesk_sla_alert', 'other_service_submitted', 'info', 'burnout_target', 'unrecognized']) {
    assert.equal(employeeTicketNotification(notice(type)), null);
  }
  assert.equal(employeeTicketNotification(notice('helpdesk_reply', { related_ticket_id: null })), null);
});

test('legacy activity retains useful owner updates without exposing admin intake alerts', () => {
  assert.equal(employeeTicketNotification(notice('helpdesk_activity', { title: 'Ticket updated' })).kind, 'ticket');
  assert.equal(employeeTicketNotification(notice('helpdesk_activity', { title: 'New ticket reply' })).kind, 'reply');
  assert.equal(employeeTicketNotification(notice('helpdesk_activity', { title: 'New ICT request' })), null);
});

test('notification filtering preserves persisted read state and the server record identity', () => {
  const item = notice('helpdesk_reply', { is_read: true, created_at: '2026-10-27T01:00:00Z' });
  const result = employeeTicketNotification(item);
  assert.equal(result.is_read, true);
  assert.equal(result.id, item.id);
  assert.equal(result.created_at, item.created_at);
  assert.equal(item.ticketId, undefined);
});
