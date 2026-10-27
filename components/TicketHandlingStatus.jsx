'use client';

import { useMemo } from 'react';
import { ChevronDown, Clock3, History, LockKeyhole } from 'lucide-react';
import {
  formatHandlingDuration,
  getTicketHandlingActivity,
  getTicketHandlingMetrics,
  getTicketHandlingState,
} from '../lib/tickets/handling.mjs';

const formatTime = (value) => value === null ? 'Not recorded' : new Intl.DateTimeFormat('en-PH', {
  timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
}).format(new Date(value));
const formatStatusTime = (value) => new Intl.DateTimeFormat('en-PH', {
  timeZone: 'Asia/Manila', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
}).format(new Date(value));

export default function TicketHandlingStatus({ ticket, now = Date.now(), compact = false, detailed = false, currentUserId }) {
  const state = useMemo(() => getTicketHandlingState(ticket, now), [ticket, now]);
  const timing = state.closed && state.completedAt !== null
    ? `Recorded ${formatStatusTime(state.completedAt)}`
    : detailed && state.lastActivityAt !== null ? `Last activity ${formatStatusTime(state.lastActivityAt)}`
      : state.startedAt !== null ? `Started ${formatStatusTime(state.startedAt)}` : '';

  return (
    <div className={`ticket-handling-status${compact ? ' is-compact' : ''}${detailed ? ' is-detailed' : ''}`}>
      <div className="ticket-handling-topline">
        <span className={`ticket-handling-badge tone-${state.tone}`} role="status" aria-live="polite" aria-atomic="true">
          <span className="ticket-handling-dot" aria-hidden="true" />
          {state.title}
        </span>
        {state.editor && (
          <p className="ticket-handling-editor" title={`Edit reservation expires ${formatTime(state.editor.expiresAt)}`}>
            <LockKeyhole size={12} aria-hidden="true" />
            {state.closed ? 'Viewing' : 'Editing'}: {state.editor.id === currentUserId ? 'You' : state.editor.name}
          </p>
        )}
      </div>
      <p className="ticket-handling-assignee">{state.assignee}</p>
      {timing && <p className="ticket-handling-timestamp">{timing}</p>}
      {state.nextActionAt !== null && (
        <p className={`ticket-handling-follow-up${state.nextActionAt <= now ? ' is-overdue' : ''}`}>
          {state.nextActionAt <= now ? 'Follow-up overdue' : 'Next action'} {formatStatusTime(state.nextActionAt)}
        </p>
      )}
    </div>
  );
}

export function TicketWorkTimer({ ticket, now = Date.now(), compact = false, showLabel = true }) {
  const state = getTicketHandlingState(ticket, now);
  const metrics = getTicketHandlingMetrics(ticket, now);
  if (state.startedAt === null) return null;

  const isBurnout = String(ticket.supportCategory || ticket.support_category || '').toLowerCase() === 'burnout';
  const isTesting = state.monitoring || (isBurnout && state.closed && metrics.testingMs !== null);
  const isRunning = !state.closed && !state.paused
    && ['in progress', 'for inspection', 'escalated', 'under burnout'].includes(state.status);
  const label = isTesting ? 'Burnout testing time' : state.paused ? 'Handling time (paused)' : 'Handling time';

  return (
    <div className={['ticket-work-timer', 'ticket-handling-timer', compact && 'compact', !showLabel && 'icon-only', isRunning ? 'running' : 'ended'].filter(Boolean).join(' ')}>
      <span className={showLabel ? undefined : 'ticket-work-timer-icon'}
        role={showLabel ? undefined : 'img'} aria-label={showLabel ? undefined : label} title={showLabel ? undefined : label}>
        <Clock3 className="admin-mono-icon" aria-hidden="true" />
        {showLabel && label}
      </span>
      <strong>{formatHandlingDuration(isTesting ? metrics.testingMs : metrics.workMs)}</strong>
      {!compact && <p>
        Started {formatTime(state.startedAt)}
        {state.closed && state.completedAt !== null ? ` - Ended ${formatTime(state.completedAt)}` : ''}
      </p>}
    </div>
  );
}

export function TicketHandlingActivity({ ticket, now = Date.now() }) {
  const metrics = useMemo(() => getTicketHandlingMetrics(ticket, now), [ticket, now]);
  const activity = useMemo(() => getTicketHandlingActivity(ticket, now), [ticket, now]);
  const status = getTicketHandlingState(ticket, now);
  const facts = [
    ['First response', formatHandlingDuration(metrics.firstResponseMs)],
    ['Response SLA', metrics.responseSla],
    ['Resolution SLA', metrics.resolutionSla],
    ['Work stage time', formatHandlingDuration(metrics.workMs)],
    ['Waiting / scheduled', formatHandlingDuration(metrics.waitingMs)],
    ...(metrics.testingMs !== null ? [['Burnout testing', formatHandlingDuration(metrics.testingMs)]] : []),
    ['Reopened', metrics.hasHistory ? String(metrics.reopenCount) : 'Not recorded'],
  ];

  return (
    <details className="ticket-handling-activity">
      <summary>
        <History size={16} aria-hidden="true" />
        <span>Handling activity</span>
        <span className="ticket-handling-event-count">{activity.length} {activity.length === 1 ? 'event' : 'events'}</span>
        <ChevronDown size={16} className="ticket-handling-disclosure" aria-hidden="true" />
      </summary>
      <dl className="ticket-handling-metrics">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt title={label === 'Work stage time' ? 'Elapsed time in recorded work stages; this is not a measure of technician effort.' : undefined}>{label}</dt>
            <dd className={['Overdue', 'Late'].includes(value) ? 'is-overdue' : ''}>{value}</dd>
          </div>
        ))}
      </dl>
      {status.nextActionAt !== null && (
        <p className={`ticket-handling-activity-follow-up${metrics.followUp === 'Overdue' ? ' is-overdue' : ''}`}>
          {metrics.followUp === 'Overdue' ? 'Follow-up overdue' : 'Next action'}: {formatTime(status.nextActionAt)}
        </p>
      )}
      {activity.length ? (
        <ol className="ticket-handling-timeline" aria-label="Recorded ticket activity">
          {[...activity].reverse().map((event) => (
            <li key={event.key}>
              <div className="ticket-handling-event-heading">
                <strong>{event.title}</strong>
                <time dateTime={new Date(event.time).toISOString()}>{formatTime(event.time)}</time>
              </div>
              <p>{event.actor} <span aria-hidden="true">/</span> {event.status}</p>
              {event.assignment && <p>{event.assignment}</p>}
              {event.reason && <p className="ticket-handling-event-reason">{event.reason}</p>}
            </li>
          ))}
        </ol>
      ) : <p className="ticket-handling-empty">No recorded activity.</p>}
    </details>
  );
}
