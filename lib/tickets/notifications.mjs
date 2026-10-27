export const EMPLOYEE_NOTIFICATION_TYPES = [
  'ticket_submitted', 'helpdesk_reply', 'helpdesk_status',
  'helpdesk_assignment', 'helpdesk_schedule', 'helpdesk_activity',
];

export function employeeTicketNotification(notification) {
  if (!notification.related_ticket_id || !EMPLOYEE_NOTIFICATION_TYPES.includes(notification.type)) return null;
  if (notification.type === 'helpdesk_activity'
    && !['Ticket updated', 'New ticket reply'].includes(notification.title)) return null;
  return {
    ...notification,
    ticketId: notification.related_ticket_id,
    kind: notification.type === 'helpdesk_reply' || notification.title === 'New ticket reply' ? 'reply' : 'ticket',
  };
}
