'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Archive,
  ArrowRight,
  Building2,
  CalendarDays,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Check,
  CheckCircle2,
  Clock3,
  CircleAlert,
  ClipboardList,
  Download,
  FileText,
  Inbox,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Menu,
  Printer,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  UsersRound,
  X,
} from 'lucide-react';
import {
  getCurrentPortalUser,
  isAreaManagerAdminRole,
  isBranchManagerAdminRole,
  isCooAdminRole,
  isMrdssAdminRole,
  isInactivePortalUser,
  isPasswordChangeRequired,
  signOutPortal,
} from '@/lib/auth/portalAuth';
import {
  createConcernAttachmentUrl,
  deleteMrdssConcern,
  formatConcernDate,
  loadConcernEscalationTargets,
  loadMrdssWorkspace,
  saveMrdssConcern,
} from '@/lib/memberConcerns/concerns';
import { createClient } from '@/lib/supabase/client';
import PortalProfilePhotoControl from '@/components/PortalProfilePhotoControl';
import PortalThemeToggle from '@/components/PortalThemeToggle';
import { useConfirmDialog } from '@/components/ConfirmationDialog';
import '../admin-dashboard/admin-dashboard.css';
import '@/components/PortalWorkspaceTheme.css';
import './mrdss-admin.css';

const STATUS_OPTIONS = ['New', 'In Review', 'Waiting for Member', 'Returned for Further Action', 'Resolved', 'Closed'];
const FILTER_OPTIONS = ['All', 'mrdss_review', 'branch_review', 'area_manager_review', 'coo_review', 'final_tagging', 'closed'];
const PRIORITIES = ['Low', 'Normal', 'High', 'Urgent'];
const FIRST_RESPONSE_TARGET_MS = 24 * 60 * 60 * 1000;
const CASE_STAGE_LABELS = {
  mrdss_review: 'MRDSS Review',
  branch_review: 'Branch Review',
  area_manager_review: 'Area Manager',
  coo_review: 'COO',
  final_tagging: 'Final Tagging',
  closed: 'Closed',
};
const EXTERNAL_REVIEW_STAGES = ['branch_review', 'area_manager_review', 'coo_review'];
const HANDLER_QUEUE_OPTIONS = ['All', 'history', 'new_returned', 'in_review', 'waiting_for_member'];
const CASE_QUEUE_LABELS = {
  ...CASE_STAGE_LABELS,
  All: 'All cases',
  external: 'With External Parties',
  history: 'History',
  new_returned: 'New / returned',
  in_review: 'In review',
  waiting_for_member: 'Waiting for member',
};
const getCaseQueueHref = (queue) => `/mrdss-admin?queue=${queue === 'All' ? 'all' : queue}#mrdss-case-queue`;
const CONTACT_CHANNELS = ['Text', 'Call', 'Email'];
const CONTACT_OUTCOMES = ['Member reached', 'No response', 'Follow-up requested'];
const RESPONSE_ACTIVITY_TYPES = new Set(['First response', 'Branch response', 'Area Manager response', 'COO response', 'MRDSS response', 'MRDSS resolution']);
const MANILA_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Manila',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const QUEUE_PAGE_SIZE = 4;
const REPORT_PERIODS = [
  { key: 'day', label: 'Day', title: 'Concerns by Day', meta: 'Daily submissions' },
  { key: 'week', label: 'Week', title: 'Concerns by Week', meta: 'Weekly volume' },
  { key: 'month', label: 'Month', title: 'Concerns by Month', meta: 'Monthly trend' },
];
const REPORT_PAGE_SIZE = 8;
const CASE_NAVIGATION = [
  { stage: 'All', label: 'All cases', Icon: LayoutDashboard },
  { stage: 'mrdss_review', label: 'MRDSS Review', Icon: Inbox },
  { stage: 'external', label: 'External Parties', Icon: Building2 },
  { stage: 'branch_review', label: 'Branch Review', Icon: Building2 },
  { stage: 'area_manager_review', label: 'Area Manager', Icon: ClipboardList },
  { stage: 'coo_review', label: 'COO', Icon: UsersRound },
  { stage: 'final_tagging', label: 'Final Tagging', Icon: CheckCircle2 },
  { stage: 'closed', label: 'Closed', Icon: Archive },
];

const getStatusClass = (status = '') => status.toLowerCase().replaceAll(' ', '-');
const getStageLabel = (stage = 'mrdss_review') => CASE_STAGE_LABELS[stage] || CASE_STAGE_LABELS.mrdss_review;
const getRouteLabel = (type, branchId, areaId, branchDestinations = []) => {
  if (type === 'mrdss') return 'MRDSS Review';
  if (type === 'branch') {
    return branchDestinations.find((branch) => branch.id === branchId)?.name
      || String(branchId || 'Branch').replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
  if (type === 'area_manager') return areaId ? `Area ${String(areaId).replace(/^area-?/i, '')}` : 'Area Manager';
  if (type === 'coo') return 'COO';
  if (type === 'final_tagging') return 'MRDSS Final Tagging';
  if (type === 'closed') return 'Closed';
  return 'New case';
};
const getStageBadgeLabel = (stage = 'mrdss_review', closureOutcome = '') => stage === 'closed'
  ? closureOutcome === 'unable_to_contact' ? 'Unable to contact' : 'Resolved'
  : getStageLabel(stage);
const getStageBadgeClass = (stage = 'mrdss_review', closureOutcome = '') => stage === 'closed'
  ? closureOutcome === 'unable_to_contact' ? 'mrdss-status--closed' : 'mrdss-status--resolved'
  : `mrdss-stage--${stage}`;
const getNewestFirstActivities = (activities = []) => [...activities].sort((a, b) => {
  const aTime = new Date(a.at).getTime();
  const bTime = new Date(b.at).getTime();
  if (!Number.isFinite(aTime)) return Number.isFinite(bTime) ? 1 : 0;
  if (!Number.isFinite(bTime)) return -1;
  return bTime - aTime;
});
const isContactResponseActivity = (activity) => activity.type === 'First response'
  || (activity.type === 'Contact' && /follow-up logged:\s*(member reached|follow-up requested)\b/i.test(activity.detail || ''));

function getContactResponseLabel(number) {
  const ordinal = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth'][number - 1];
  if (ordinal) return `${ordinal} response`;
  const lastTwoDigits = number % 100;
  const suffix = lastTwoDigits >= 11 && lastTwoDigits <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' })[number % 10] || 'th';
  return `${number}${suffix} response`;
}

function getCaseTrailActivities(activities = []) {
  const chronologicalResponses = activities.filter(isContactResponseActivity).sort((a, b) => {
    const aTime = new Date(a.at).getTime();
    const bTime = new Date(b.at).getTime();
    if (!Number.isFinite(aTime)) return Number.isFinite(bTime) ? 1 : 0;
    if (!Number.isFinite(bTime)) return -1;
    return aTime - bTime;
  });
  const responseLabels = new Map(chronologicalResponses.map((activity, index) => [activity, getContactResponseLabel(index + 1)]));
  return getNewestFirstActivities(activities).map((activity) => ({
    ...activity,
    displayType: responseLabels.get(activity) || activity.type,
  }));
}

function getManilaDateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = Object.fromEntries(MANILA_DATE_FORMATTER.formatToParts(date).map(({ type, value: part }) => [type, part]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function getBusinessDaysElapsed(startValue, endValue) {
  const startKey = getManilaDateKey(startValue);
  const endKey = getManilaDateKey(endValue);
  if (!startKey || !endKey) return 0;
  const [startYear, startMonth, startDay] = startKey.split('-').map(Number);
  const [endYear, endMonth, endDay] = endKey.split('-').map(Number);
  const startDayUtc = Date.UTC(startYear, startMonth - 1, startDay);
  const endDayUtc = Date.UTC(endYear, endMonth - 1, endDay);
  let elapsed = 0;
  for (let day = startDayUtc + 86400000; day <= endDayUtc; day += 86400000) {
    const weekday = new Date(day).getUTCDay();
    if (weekday !== 0 && weekday !== 6) elapsed += 1;
  }
  return elapsed;
}

function getUnableContactReadiness(caseItem, now = Date.now()) {
  const activities = caseItem?.activities || [];
  const memberReached = activities.some((activity) => activity.type === 'First response'
    || (activity.type === 'Contact' && /follow-up logged:\s*(member reached|follow-up requested)\b/i.test(activity.detail || '')));
  const noResponseAttempts = activities
    .filter((activity) => activity.type === 'Contact' && /follow-up logged:\s*No response\b/i.test(activity.detail || ''))
    .map((activity) => activity.at)
    .filter((value) => value && Number.isFinite(new Date(value).getTime()));
  const firstAttemptAt = noResponseAttempts.length
    ? noResponseAttempts.reduce((earliest, value) => new Date(value).getTime() < new Date(earliest).getTime() ? value : earliest)
    : null;
  const businessDaysElapsed = firstAttemptAt ? getBusinessDaysElapsed(firstAttemptAt, now) : 0;
  const finalNoticeAt = activities
    .filter((activity) => activity.type === 'Final notice')
    .map((activity) => activity.at)
    .find((value) => firstAttemptAt && value && getBusinessDaysElapsed(firstAttemptAt, value) >= 5) || null;

  return {
    attemptCount: noResponseAttempts.length,
    businessDaysElapsed,
    memberReached,
    canSendFinalNotice: !memberReached && !finalNoticeAt && noResponseAttempts.length >= 3 && businessDaysElapsed >= 5,
    finalNoticeAt,
    eligible: !memberReached && noResponseAttempts.length >= 3 && Boolean(finalNoticeAt),
  };
}
const normalizeBranchKey = (value = '') => {
  const key = String(value).toLowerCase().replace(/[^a-z0-9]/g, '');
  const aliases = {
    nunezextensionbranch: 'nunez',
    vitalisatelliteoffice: 'vitali',
    lahermosafunerariademempco: 'lahermosa',
    lahermosafuneraria: 'lahermosa',
  };
  return aliases[key] || key.replace(/branch$/, '').replace(/office$/, '');
};

const canHandleConcern = (caseItem, user) => {
  if (!caseItem || !user) return false;
  const stage = caseItem.workflowStage;
  if (isMrdssAdminRole(user.role)) {
    return ['mrdss_review', 'final_tagging'].includes(stage)
      && (!caseItem.assignedStaffId || caseItem.assignedStaffId === user.id || user.role === 'superadmin');
  }
  if (isBranchManagerAdminRole(user.role)) {
    return stage === 'branch_review'
      && normalizeBranchKey(user.branch) === normalizeBranchKey(caseItem.destinationBranchId || caseItem.routedTo);
  }
  if (isAreaManagerAdminRole(user.role)) {
    return stage === 'area_manager_review'
      && caseItem.destinationAreaId === user.areaId
      && (!caseItem.destinationUserId || caseItem.destinationUserId === user.id);
  }
  if (isCooAdminRole(user.role)) {
    return stage === 'coo_review' && (!caseItem.destinationUserId || caseItem.destinationUserId === user.id);
  }
  return false;
};

function formatElapsedDuration(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(Math.abs(milliseconds) / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days) return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  if (hours) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function getFirstResponseActivity(caseItem) {
  return (caseItem.activities || [])
    .filter((activity) => RESPONSE_ACTIVITY_TYPES.has(activity.type)
      || (activity.type === 'Contact' && /follow-up logged:\s*(member reached|follow-up requested)/i.test(activity.detail || '')))
    .map((activity) => ({ activity, timestamp: new Date(activity.at).getTime() }))
    .filter((item) => Number.isFinite(item.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp)[0] || null;
}

function getFirstResponseAt(caseItem) {
  return getFirstResponseActivity(caseItem)?.timestamp ?? null;
}

function getResponseDeadline(caseItem) {
  const createdAt = new Date(caseItem.createdAt).getTime();
  return Number.isFinite(createdAt) ? createdAt + FIRST_RESPONSE_TARGET_MS : null;
}

function getFirstResponseStatus(caseItem) {
  const respondedAt = getFirstResponseAt(caseItem);
  if (!respondedAt) {
    const clock = getResponseClock(caseItem, Date.now());
    if (clock.state === 'unanswered') return 'Closed without response';
    return clock.state === 'overdue' ? 'Overdue' : 'Pending';
  }
  const createdAt = new Date(caseItem.createdAt).getTime();
  const wasLate = Number.isFinite(createdAt) && respondedAt - createdAt > FIRST_RESPONSE_TARGET_MS;
  return `${wasLate ? 'Responded late' : 'Responded'} ${formatConcernDate(respondedAt)}`;
}

function getResponseClock(caseItem, now) {
  const createdAt = new Date(caseItem.createdAt).getTime();
  const startAt = Number.isFinite(createdAt) ? createdAt : now;
  const response = getFirstResponseActivity(caseItem);
  const respondedAt = response?.timestamp ?? null;
  const closedAt = caseItem.closedAt ? new Date(caseItem.closedAt).getTime() : null;
  const closedWithoutResponse = !respondedAt && caseItem.workflowStage === 'closed';
  const stopAt = respondedAt || (closedWithoutResponse && Number.isFinite(closedAt) ? closedAt : now);
  const elapsedMs = Math.max(0, stopAt - startAt);
  const remainingMs = FIRST_RESPONSE_TARGET_MS - elapsedMs;
  const overdue = remainingMs < 0;
  const running = !respondedAt && !closedWithoutResponse;

  return {
    state: respondedAt ? (overdue ? 'overdue' : 'met') : closedWithoutResponse ? 'unanswered' : overdue ? 'overdue' : remainingMs < 4 * 3600000 ? 'due-soon' : 'on-track',
    label: respondedAt
      ? `${overdue ? 'Responded after' : 'Responded in'} ${formatElapsedDuration(elapsedMs)}`
      : closedWithoutResponse ? 'Closed without response'
        : overdue ? `Overdue by ${formatElapsedDuration(remainingMs)}` : `${formatElapsedDuration(remainingMs)} left`,
    elapsed: formatElapsedDuration(elapsedMs),
    elapsedMs,
    remainingMs,
    progress: Math.min(100, Math.max(0, (elapsedMs / FIRST_RESPONSE_TARGET_MS) * 100)),
    dueAt: startAt + FIRST_RESPONSE_TARGET_MS,
    respondedAt,
    respondedBy: response?.activity.actor || 'Handler',
    running,
  };
}

function reportDateKey(date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

function formatReportDate(date, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

function getConcernPeriodKey(date, mode) {
  if (mode === 'month') return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  if (mode === 'week') {
    const start = new Date(date);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    start.setHours(0, 0, 0, 0);
    return reportDateKey(start);
  }
  return reportDateKey(date);
}

function getConcernPeriodLabel(date, mode) {
  if (mode === 'month') return formatReportDate(date, { month: 'long', year: 'numeric' });
  if (mode === 'week') {
    const start = new Date(date);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${formatReportDate(start, { month: 'short', day: 'numeric' })} - ${formatReportDate(end, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }
  return formatReportDate(date);
}

function buildConcernPeriodItems(cases, mode) {
  const groups = new Map();
  cases.forEach((caseItem) => {
    const date = new Date(caseItem.createdAt);
    if (Number.isNaN(date.getTime())) return;
    const key = getConcernPeriodKey(date, mode);
    if (!groups.has(key)) groups.set(key, { key, name: getConcernPeriodLabel(date, mode), timestamp: date.getTime(), cases: [] });
    groups.get(key).cases.push(caseItem);
  });
  return [...groups.values()]
    .map((group) => ({ ...group, count: group.cases.length }))
    .sort((a, b) => b.timestamp - a.timestamp);
}

function buildConcernCalendar(cases, monthDate) {
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const gridStart = new Date(monthStart);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const counts = new Map();
  cases.forEach((caseItem) => {
    const date = new Date(caseItem.createdAt);
    if (Number.isNaN(date.getTime())) return;
    const key = reportDateKey(date);
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  const cells = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const key = reportDateKey(date);
    return {
      key,
      day: date.getDate(),
      count: counts.get(key) || 0,
      isCurrentMonth: date.getMonth() === monthStart.getMonth(),
      isToday: key === reportDateKey(new Date()),
      isFuture: date > today,
    };
  });
  const monthCells = cells.filter((cell) => cell.isCurrentMonth);
  const activeDays = monthCells.filter((cell) => cell.count > 0).length;
  const busiestDay = monthCells.reduce((best, cell) => cell.count > (best?.count || 0) ? cell : best, null);
  const monthTotal = monthCells.reduce((total, cell) => total + cell.count, 0);
  return {
    cells,
    title: formatReportDate(monthStart, { month: 'long', year: 'numeric' }),
    monthTotal,
    activeDays,
    maxCount: Math.max(0, ...monthCells.map((cell) => cell.count)),
    averagePerActiveDay: activeDays ? (monthTotal / activeDays).toFixed(1) : '0',
    busiestDay,
  };
}

function downloadConcernCsv(cases, label) {
  const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const rows = [
    ['Reference', 'Submitted', 'Member', 'Branch', 'Submission route', 'Concern type', 'Category', 'Status', 'Case outcome', 'Routed to', 'Priority', 'First response', 'First response due', 'Final tag', 'Resolution details', 'Assigned staff'],
    ...cases.map((item) => [item.id, formatConcernDate(item.createdAt), item.name, item.branch, item.submissionRoute, item.concernType, item.category, item.status, getStageBadgeLabel(item.workflowStage, item.closureOutcome), item.routedTo, item.priority, getFirstResponseStatus(item), formatConcernDate(getResponseDeadline(item)), item.resolutionTag, item.resolutionDetails, item.assignee || 'Unassigned']),
  ];
  const blob = new Blob([`\uFEFF${rows.map((row) => row.map(escape).join(',')).join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `mrdss-concerns-${label.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function ReportMetric({ label, value, meta }) {
  return <div className="report-metric"><span>{label}</span><strong>{value}</strong><em>{meta}</em></div>;
}

function ReportBreakdown({ title, items }) {
  return (
    <section className="panel-card glass equal-panel">
      <div className="section-head"><div><span className="section-kicker">Report</span><h3>{title}</h3></div></div>
      <div className="admin-breakdown-list">
        {items.length ? items.map((item) => (
          <div className="admin-breakdown-item" key={item.name}>
            <div className="admin-breakdown-copy"><strong>{item.name}</strong><span>{item.count} {item.count === 1 ? 'case' : 'cases'}</span></div>
          </div>
        )) : <div className="empty-state small"><p>No data available yet.</p></div>}
      </div>
    </section>
  );
}

function AccessMessage() {
  return (
    <main className="mrdss-access-page">
      <div className="mrdss-access-panel">
        <ShieldCheck size={30} aria-hidden="true" />
        <h1>MRDSS access is restricted</h1>
        <p>Sign in with an MRDSS Admin account or Super Admin account to open the support desk.</p>
        <Link href="/mrdss" className="mrdss-button mrdss-button--primary">Go to MRDSS sign in</Link>
        <Link href="/" className="mrdss-access-home">Return to MEMPCO</Link>
      </div>
    </main>
  );
}

function ContactLogForm({ selectedCase, readiness, onSave, isSaving = false, extraActions = null }) {
  const [channel, setChannel] = useState(selectedCase?.preferredContact || 'Text');
  const [outcome, setOutcome] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    setChannel(selectedCase?.preferredContact || 'Text');
    setOutcome('');
    setNote('');
  }, [selectedCase?.id, selectedCase?.preferredContact]);

  if (!selectedCase) return null;

  const hasPhone = Boolean(selectedCase.phone);
  const hasEmail = Boolean(selectedCase.email);
  const hasChannelDetails = channel === 'Email' ? hasEmail : hasPhone;

  return (
    <form className="mrdss-action-form" onSubmit={async (event) => {
      event.preventDefault();
      if (isSaving) return;
      const saved = await onSave({ channel, outcome, note: note.trim() });
      if (saved) {
        setNote('');
        if (outcome === 'Final notice sent') setOutcome('');
      }
    }}>
      <div className="mrdss-form-row">
        <label className="mrdss-field">
          <span>Contact method</span>
          <select value={channel} onChange={(event) => setChannel(event.target.value)} disabled={isSaving}>
            {CONTACT_CHANNELS.map((method) => (
              <option key={method} value={method} disabled={method === 'Email' ? !hasEmail : !hasPhone}>
                {method}{method === 'Email' && !hasEmail ? ' (no email provided)' : ''}
                {method !== 'Email' && !hasPhone ? ' (no phone provided)' : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="mrdss-field">
          <span>Outcome</span>
          <select value={outcome} onChange={(event) => setOutcome(event.target.value)} disabled={isSaving}>
            <option value="" disabled>Select an outcome</option>
            {CONTACT_OUTCOMES.map((item) => <option key={item}>{item}</option>)}
            <option value="Final notice sent" disabled={!readiness?.canSendFinalNotice}>Final notice sent</option>
          </select>
        </label>
      </div>
      {!hasChannelDetails && <small className="mrdss-contact-hint">Choose a contact method with details on file before recording an attempt.</small>}
      <label className="mrdss-field">
        <span>Internal follow-up note <small>Optional</small></span>
        <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add a brief note for the case history" maxLength={300} disabled={isSaving} />
      </label>
      <div className="mrdss-action-row mrdss-action-row--contact">
        <button type="submit" className="mrdss-button mrdss-button--secondary" disabled={isSaving || !outcome || !hasChannelDetails || (outcome === 'Final notice sent' && !readiness?.canSendFinalNotice)}>
          {isSaving ? 'Saving...' : outcome === 'Final notice sent' ? 'Record final notice' : outcome === 'No response' ? 'Record no response' : outcome === 'Follow-up requested' ? 'Record follow-up' : outcome === 'Member reached' ? 'Record contact' : 'Record outcome'}
        </button>
        {extraActions}
      </div>
    </form>
  );
}

function MrdssPrintLetterhead() {
  return (
    <header className="mrdss-print-letterhead">
      <div className="mrdss-print-logo">
        <img src="/Logos/Logo.png" alt="MEMPCO logo" width={80} height={80} loading="eager" decoding="sync" />
      </div>
      <div className="mrdss-print-coop-copy">
        <h2>Micro-Entrepreneurs Multi-Purpose Cooperative</h2>
        <p>3D3E HC Mktng. Bldg., Veterans Avenue, Zamboanga City, Philippines 7000</p>
        <p>CDA Registration No. 9520-09004207 &nbsp;&nbsp; TIN 005-848-165 NV</p>
        <div className="mrdss-print-contact">
          <span>(062) 991-7772</span>
          <span>www.mempco.coop</span>
          <span>itsupport@mempco.coop</span>
          <span>mempco.ph</span>
        </div>
      </div>
    </header>
  );
}

function ReportPrintDocument({ cases, filterSummary, adminName }) {
  return (
    <main id="mrdss-print-root" className="mrdss-print-document mrdss-print-document--report">
      <MrdssPrintLetterhead />
      <header className="mrdss-print-header">
        <p>MEMBER RELATIONS &amp; DEVELOPMENT SUPPORT SERVICES</p>
        <h1>Member Concern Report</h1>
        <span>{filterSummary}</span>
      </header>
      <div className="mrdss-print-meta">
        <span><strong>Records:</strong> {cases.length}</span>
        <span><strong>Prepared by:</strong> {adminName}</span>
        <span><strong>Generated:</strong> {new Date().toLocaleString()}</span>
      </div>
      <table className="mrdss-print-table">
        <thead>
          <tr>
            <th>Reference</th>
            <th>Submitted</th>
            <th>Member</th>
            <th>Branch</th>
            <th>Type / category</th>
            <th>Status</th>
            <th>Case outcome</th>
            <th>Route</th>
            <th>Priority</th>
            <th>First response</th>
            <th>Response due</th>
            <th>Assigned staff</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((item) => (
            <tr key={item.id}>
              <td>{item.id}</td>
              <td>{formatConcernDate(item.createdAt)}</td>
              <td>{item.name}</td>
              <td>{item.branch}</td>
              <td>{item.concernType} / {item.category}</td>
              <td>{item.status}</td>
              <td>{getStageBadgeLabel(item.workflowStage, item.closureOutcome)}</td>
              <td>{item.routedTo || 'MRDSS'}</td>
              <td>{item.priority}</td>
              <td>{getFirstResponseStatus(item)}</td>
              <td>{formatConcernDate(getResponseDeadline(item))}</td>
              <td>{item.assignee || 'Unassigned'}</td>
            </tr>
          ))}
          {!cases.length && <tr><td colSpan={12}>No cases match the selected report filters.</td></tr>}
        </tbody>
      </table>
    </main>
  );
}

function CasePrintDocument({ caseItem, adminName }) {
  if (!caseItem) return null;

  return (
    <main id="mrdss-print-root" className="mrdss-print-document mrdss-print-document--case">
      <MrdssPrintLetterhead />
      <header className="mrdss-print-header">
        <p>MEMBER RELATIONS &amp; DEVELOPMENT SUPPORT SERVICES</p>
        <h1>Member Concern Case Record</h1>
        <span>{caseItem.id}</span>
      </header>
      <div className="mrdss-print-meta">
        <span><strong>Prepared by:</strong> {adminName}</span>
        <span><strong>Generated:</strong> {new Date().toLocaleString()}</span>
      </div>
      <dl className="mrdss-print-fields">
        <div><dt>Member</dt><dd>{caseItem.name}</dd></div>
        <div><dt>Branch</dt><dd>{caseItem.branch}</dd></div>
        <div><dt>Submitted</dt><dd>{formatConcernDate(caseItem.createdAt)}</dd></div>
        <div><dt>Last updated</dt><dd>{formatConcernDate(caseItem.updatedAt)}</dd></div>
        <div><dt>Concern type</dt><dd>{caseItem.concernType}</dd></div>
        <div><dt>Category</dt><dd>{caseItem.category}</dd></div>
        <div><dt>Submission route</dt><dd>{caseItem.submissionRoute === 'branch' ? 'Direct to branch' : 'MRDSS Central Office'}</dd></div>
        <div><dt>Status</dt><dd>{caseItem.status}</dd></div>
        <div><dt>Case outcome</dt><dd>{getStageBadgeLabel(caseItem.workflowStage, caseItem.closureOutcome)}</dd></div>
        <div><dt>Routed to</dt><dd>{caseItem.routedTo || 'MRDSS'}</dd></div>
        <div><dt>Priority</dt><dd>{caseItem.priority}</dd></div>
        <div><dt>First response</dt><dd>{getFirstResponseStatus(caseItem)}</dd></div>
        <div><dt>Response target</dt><dd>Within 24 hours; due {formatConcernDate(getResponseDeadline(caseItem))}</dd></div>
        <div><dt>Assigned staff</dt><dd>{caseItem.assignee || 'Unassigned'}</dd></div>
        <div><dt>Preferred contact</dt><dd>{caseItem.preferredContact}</dd></div>
        <div><dt>Phone</dt><dd>{caseItem.phone || 'Not provided'}</dd></div>
        <div><dt>Email</dt><dd>{caseItem.email || 'Not provided'}</dd></div>
      </dl>
      <section className="mrdss-print-section">
        <h2>Member message</h2>
        <p>{caseItem.message}</p>
        {caseItem.attachment && <p><strong>Attachment:</strong> {caseItem.attachment.name}</p>}
      </section>
      {(caseItem.resolutionTag || caseItem.resolutionDetails) && (
        <section className="mrdss-print-section">
          <h2>Final resolution</h2>
          {caseItem.resolutionTag && <p><strong>Final tag:</strong> {caseItem.resolutionTag}</p>}
          {caseItem.resolutionDetails && <p>{caseItem.resolutionDetails}</p>}
        </section>
      )}
      <section className="mrdss-print-section">
        <h2>Case activity</h2>
        {caseItem.activities?.length ? (
          <ol className="mrdss-print-activity">
            {getCaseTrailActivities(caseItem.activities).map((activity) => (
              <li key={activity.id}>
                <strong>{activity.displayType}</strong> | {formatConcernDate(activity.at)}
                {activity.actor && <span> | {activity.actor}</span>}
                <p>{activity.detail}</p>
              </li>
            ))}
          </ol>
        ) : <p>No activity recorded.</p>}
      </section>
    </main>
  );
}

function MrdssAdminWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const confirmDialog = useConfirmDialog();
  const [authState, setAuthState] = useState('checking');
  const [admin, setAdmin] = useState(null);
  const [cases, setCases] = useState([]);
  const [staff, setStaff] = useState([]);
  const [branchDestinations, setBranchDestinations] = useState([]);
  const [areaManagers, setAreaManagers] = useState([]);
  const [cooUsers, setCooUsers] = useState([]);
  const [escalationRoute, setEscalationRoute] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [queuePage, setQueuePage] = useState(0);
  const [reportFilters, setReportFilters] = useState({
    from: '',
    to: '',
    status: 'All',
    stage: 'All',
    branch: 'All',
    category: 'All',
    assignedStaff: 'All',
  });
  const [reportPeriod, setReportPeriod] = useState('day');
  const [reportPeriodKey, setReportPeriodKey] = useState('');
  const [reportPeriodPage, setReportPeriodPage] = useState(1);
  const [reportCalendarMonth, setReportCalendarMonth] = useState(null);
  const [selectedReportDate, setSelectedReportDate] = useState('');
  const [search, setSearch] = useState('');
  const [workflowNote, setWorkflowNote] = useState('');
  const [resolutionDetailsDraft, setResolutionDetailsDraft] = useState('');
  const [resolutionTagDraft, setResolutionTagDraft] = useState('');
  const [closureRemarksDraft, setClosureRemarksDraft] = useState('');
  const [routedToDraft, setRoutedToDraft] = useState('');
  const [handlerDraft, setHandlerDraft] = useState('');
  const [workflowError, setWorkflowError] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [savingCaseId, setSavingCaseId] = useState('');
  const [deletingCaseId, setDeletingCaseId] = useState('');
  const [dataError, setDataError] = useState('');
  const [dataNotice, setDataNotice] = useState('');
  const [printTarget, setPrintTarget] = useState('');
  const isBranchManager = isBranchManagerAdminRole(admin?.role);
  const isAreaManager = isAreaManagerAdminRole(admin?.role);
  const isCoo = isCooAdminRole(admin?.role);
  const isMrdss = isMrdssAdminRole(admin?.role);
  const isCaseHandler = isBranchManager || isAreaManager || isCoo;
  const adminRoleLabel = isBranchManager ? 'Branch Admin' : isAreaManager ? 'Area Manager' : isCoo ? 'COO' : 'MRDSS Admin';
  const requestedQueue = searchParams.get('queue') === 'all' ? 'All' : searchParams.get('queue');
  const allowedQueues = isCaseHandler ? HANDLER_QUEUE_OPTIONS : [...FILTER_OPTIONS, 'external'];
  const filter = allowedQueues.includes(requestedQueue) ? requestedQueue : 'All';
  const activeView = isMrdss && searchParams.get('view') === 'reports' ? 'reports' : 'cases';

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!selectedId) return undefined;
    const root = document.documentElement;
    const previousRootOverflow = root.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setSelectedId('');
    };
    root.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      root.style.overflow = previousRootOverflow;
      document.body.style.overflow = previousBodyOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [selectedId]);

  useEffect(() => {
    const selected = cases.find((item) => item.id === selectedId);
    const defaultRoute = selected?.workflowStage === 'mrdss_review'
      ? selected?.originBranchId
      : selected?.workflowStage === 'branch_review'
        ? selected?.destinationBranchId
        : selected?.destinationBranchId || selected?.routedTo;
    setWorkflowNote('');
    setWorkflowError('');
    setResolutionDetailsDraft(selected?.resolutionDetails || '');
    setResolutionTagDraft(selected?.resolutionTag || '');
    setClosureRemarksDraft(selected?.closureRemarks || '');
    setRoutedToDraft(defaultRoute || '');
    setHandlerDraft('');
  }, [cases, selectedId]);

  const refreshWorkspace = useCallback(async (isActive = () => true, { silent = false } = {}) => {
    if (!silent) setRefreshing(true);
    try {
      const workspace = await loadMrdssWorkspace();
      if (!isActive()) return;
      setCases(workspace.cases);
      setStaff(workspace.staff);
      setBranchDestinations(workspace.branchDestinations);
      setSelectedId((currentId) => (
        workspace.cases.some((item) => item.id === currentId)
          ? currentId
          : ''
      ));
      setDataError('');
    } catch (error) {
      if (isActive()) setDataError(error.message || 'The MRDSS workspace could not be refreshed.');
    } finally {
      if (isActive() && !silent) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    let supabase;
    let channel;

    const initialize = async () => {
      try {
        const currentUser = await getCurrentPortalUser();
        if (!active) return;
        if (
          !currentUser ||
          !(isMrdssAdminRole(currentUser.role) || isBranchManagerAdminRole(currentUser.role) || isAreaManagerAdminRole(currentUser.role) || isCooAdminRole(currentUser.role)) ||
          isInactivePortalUser(currentUser) ||
          isPasswordChangeRequired(currentUser)
        ) {
          setAuthState('denied');
          return;
        }

        setAdmin(currentUser);
        setAuthState('ready');
        await refreshWorkspace(() => active);

        supabase = createClient();
        channel = supabase
          .channel('mrdss-member-concerns')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'member_concerns',
          }, () => refreshWorkspace(() => active, { silent: true }))
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') refreshWorkspace(() => active, { silent: true });
          });
      } catch {
        if (active) setAuthState('denied');
      }
    };

    initialize();

    return () => {
      active = false;
      if (channel && supabase) supabase.removeChannel(channel);
    };
  }, [refreshWorkspace]);

  useEffect(() => {
    if (!selectedId || !isCaseHandler) {
      setAreaManagers([]);
      setCooUsers([]);
      setEscalationRoute('');
      return undefined;
    }
    let active = true;
    setEscalationRoute('');
    loadConcernEscalationTargets(selectedId)
      .then((targets) => {
        if (!active) return;
        setAreaManagers(targets.areaManagers);
        setCooUsers(targets.cooUsers);
        setEscalationRoute(targets.escalationRoute);
      })
      .catch((error) => {
        if (active) setWorkflowError(error.message || 'Escalation recipients could not be loaded.');
      });
    return () => { active = false; };
  }, [selectedId, isCaseHandler]);

  useEffect(() => {
    if (!printTarget) return undefined;

    document.body.classList.add('mrdss-printing');
    const handleAfterPrint = () => setPrintTarget('');
    window.addEventListener('afterprint', handleAfterPrint);
    let cancelled = false;
    let frame;

    const preparePrint = async () => {
      const images = Array.from(document.querySelectorAll('#mrdss-print-root img'));
      await Promise.allSettled(images.map((image) => image.decode()));
      if (cancelled) return;
      frame = window.requestAnimationFrame(() => {
        if (!cancelled) window.print();
      });
    };

    preparePrint();

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      window.removeEventListener('afterprint', handleAfterPrint);
      document.body.classList.remove('mrdss-printing');
    };
  }, [printTarget]);

  const counts = useMemo(() => Object.fromEntries(
    [...FILTER_OPTIONS, 'history'].map((stage) => [
      stage,
      stage === 'All'
        ? isCaseHandler ? cases.filter((item) => canHandleConcern(item, admin)).length : cases.length
        : stage === 'history'
          ? cases.filter((item) => !canHandleConcern(item, admin)).length
          : cases.filter((item) => item.workflowStage === stage && (!isCaseHandler || canHandleConcern(item, admin))).length,
    ])
  ), [cases, admin, isCaseHandler]);

  const filteredCases = useMemo(() => {
    const query = search.trim().toLowerCase();

    return cases.filter((item) => {
      const isHandler = canHandleConcern(item, admin);
      let matchesQueue = !isCaseHandler || isHandler;
      if (filter === 'history') matchesQueue = !isHandler;
      else if (filter === 'external') matchesQueue = matchesQueue && EXTERNAL_REVIEW_STAGES.includes(item.workflowStage);
      else if (filter === 'new_returned') matchesQueue = matchesQueue && ['New', 'Returned for Further Action'].includes(item.status);
      else if (filter === 'in_review') matchesQueue = matchesQueue && item.status === 'In Review';
      else if (filter === 'waiting_for_member') matchesQueue = matchesQueue && item.status === 'Waiting for Member';
      else if (filter !== 'All') matchesQueue = matchesQueue && item.workflowStage === filter;
      const searchable = [item.id, item.name, item.branch, item.category, item.message, item.routedTo, getStageBadgeLabel(item.workflowStage, item.closureOutcome), item.resolutionTag].join(' ').toLowerCase();
      return matchesQueue && (!query || searchable.includes(query));
    });
  }, [cases, filter, search, admin, isCaseHandler]);
  const queuePageCount = Math.max(1, Math.ceil(filteredCases.length / QUEUE_PAGE_SIZE));
  const activeQueuePage = Math.min(queuePage, queuePageCount - 1);
  const visibleCases = filteredCases.slice(
    activeQueuePage * QUEUE_PAGE_SIZE,
    (activeQueuePage + 1) * QUEUE_PAGE_SIZE
  );

  const reportCases = useMemo(() => cases.filter((item) => {
    const submittedAt = new Date(item.createdAt).getTime();
    const from = reportFilters.from ? new Date(`${reportFilters.from}T00:00:00`).getTime() : -Infinity;
    const to = reportFilters.to ? new Date(`${reportFilters.to}T23:59:59.999`).getTime() : Infinity;

    return (!reportFilters.from || submittedAt >= from)
      && (!reportFilters.to || submittedAt <= to)
      && (reportFilters.status === 'All' || item.status === reportFilters.status)
      && (reportFilters.stage === 'All' || item.workflowStage === reportFilters.stage)
      && (reportFilters.branch === 'All' || item.branch === reportFilters.branch)
      && (reportFilters.category === 'All' || item.category === reportFilters.category)
      && (reportFilters.assignedStaff === 'All'
        || (reportFilters.assignedStaff === 'Unassigned' ? !item.assignedStaffId : item.assignedStaffId === reportFilters.assignedStaff));
  }), [cases, reportFilters]);

  const reportBranches = useMemo(() => [...new Set(cases.map((item) => item.branch).filter(Boolean))].sort(), [cases]);
  const reportCategories = useMemo(() => [...new Set(cases.map((item) => item.category).filter(Boolean))].sort(), [cases]);
  const reportFilterSummary = [
    reportFilters.from && `From ${reportFilters.from}`,
    reportFilters.to && `Through ${reportFilters.to}`,
    reportFilters.status !== 'All' && `Status: ${reportFilters.status}`,
    reportFilters.stage !== 'All' && `Stage: ${getStageLabel(reportFilters.stage)}`,
    reportFilters.branch !== 'All' && `Branch: ${reportFilters.branch}`,
    reportFilters.category !== 'All' && `Category: ${reportFilters.category}`,
    reportFilters.assignedStaff !== 'All'
      && `Assigned: ${reportFilters.assignedStaff === 'Unassigned'
        ? 'Unassigned'
        : staff.find((person) => person.id === reportFilters.assignedStaff)?.full_name || 'Staff member'}`,
  ].filter(Boolean).join(' | ') || 'All submitted cases';

  const periodItems = useMemo(() => buildConcernPeriodItems(reportCases, reportPeriod), [reportCases, reportPeriod]);
  const selectedPeriod = REPORT_PERIODS.find((item) => item.key === reportPeriod) || REPORT_PERIODS[0];
  const selectedPeriodTotalPages = Math.max(1, Math.ceil(periodItems.length / REPORT_PAGE_SIZE));
  const safeReportPeriodPage = Math.min(reportPeriodPage, selectedPeriodTotalPages);
  const visiblePeriodItems = periodItems.slice((safeReportPeriodPage - 1) * REPORT_PAGE_SIZE, safeReportPeriodPage * REPORT_PAGE_SIZE);
  const activeReportMonth = reportCalendarMonth || (() => {
    const latest = reportCases.reduce((mostRecent, item) => {
      const date = new Date(item.createdAt);
      return !Number.isNaN(date.getTime()) && (!mostRecent || date > mostRecent) ? date : mostRecent;
    }, null);
    const date = latest || new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  })();
  const selectedPeriodItem = reportPeriod === 'month'
    ? periodItems.find((item) => item.key === getConcernPeriodKey(activeReportMonth, 'month')) || null
    : periodItems.find((item) => item.key === reportPeriodKey) || periodItems[0] || null;
  const reportCalendar = useMemo(() => buildConcernCalendar(reportCases, activeReportMonth), [reportCases, activeReportMonth]);
  const selectedReportDateCases = selectedReportDate ? reportCases.filter((item) => {
    const date = new Date(item.createdAt);
    return !Number.isNaN(date.getTime()) && reportDateKey(date) === selectedReportDate;
  }) : [];
  const reportPeriodCases = reportPeriod === 'month'
    ? selectedPeriodItem?.cases || []
    : selectedPeriodItem?.cases || reportCases;
  const reportSelectedPeriodCases = selectedPeriodItem?.cases || [];
  const reportDisplayCases = selectedReportDate
    ? selectedReportDateCases
    : reportPeriodCases;
  const reportDisplayLabel = selectedReportDate
    ? formatReportDate(new Date(`${selectedReportDate}T12:00:00`))
    : selectedPeriodItem?.name || (reportPeriod === 'month' ? formatReportDate(activeReportMonth, { month: 'long', year: 'numeric' }) : 'All matching cases');
  const reportStatusBreakdown = useMemo(() => STATUS_OPTIONS.map((status) => ({
    name: status,
    count: reportCases.filter((item) => item.status === status).length,
  })).filter((item) => item.count > 0), [reportCases]);
  const reportStageBreakdown = useMemo(() => FILTER_OPTIONS.slice(1).map((stage) => ({
    name: getStageLabel(stage),
    count: reportCases.filter((item) => item.workflowStage === stage).length,
  })).filter((item) => item.count > 0), [reportCases]);
  const reportTypeBreakdown = useMemo(() => {
    const counts = new Map();
    reportCases.forEach((item) => counts.set(item.concernType, (counts.get(item.concernType) || 0) + 1));
    return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [reportCases]);
  const reportCategoryBreakdown = useMemo(() => {
    const counts = new Map();
    reportCases.forEach((item) => counts.set(item.category, (counts.get(item.category) || 0) + 1));
    return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [reportCases]);
  const reportBranchBreakdown = useMemo(() => {
    const counts = new Map();
    reportCases.forEach((item) => counts.set(item.branch, (counts.get(item.branch) || 0) + 1));
    return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 8);
  }, [reportCases]);
  const reportAssigneeBreakdown = useMemo(() => {
    const counts = new Map();
    reportCases.forEach((item) => {
      const name = item.assignee || 'Unassigned';
      counts.set(name, (counts.get(name) || 0) + 1);
    });
    return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [reportCases]);

  useEffect(() => {
    if (!periodItems.length) {
      setReportPeriodKey('');
      setReportPeriodPage(1);
      return;
    }
    setReportPeriodKey((current) => periodItems.some((item) => item.key === current) ? current : periodItems[0].key);
    setReportPeriodPage((current) => Math.min(current, selectedPeriodTotalPages));
  }, [periodItems, selectedPeriodTotalPages]);

  useEffect(() => {
    setSelectedReportDate('');
  }, [reportFilters]);

  const selectedCase = cases.find((item) => item.id === selectedId) || null;
  const selectedWorkflowStage = selectedCase?.workflowStage || 'mrdss_review';
  const selectedUnableContactReadiness = selectedCase ? getUnableContactReadiness(selectedCase, now) : null;
  const selectedResponseClock = selectedCase ? getResponseClock(selectedCase, now) : null;
  const selectedCaseCanHandle = selectedCase ? canHandleConcern(selectedCase, admin) : false;
  const selectedCaseNeedsRecovery = Boolean(isMrdss && selectedCase && ['branch_review', 'area_manager_review', 'coo_review'].includes(selectedWorkflowStage));
  const selectedCaseCanManage = selectedCaseCanHandle || selectedCaseNeedsRecovery;
  const selectedCaseCanReopen = Boolean(selectedCase && (admin?.role === 'superadmin'
    || (isMrdss && selectedCase.closureOutcome === 'unable_to_contact')));
  const showContactFollowup = Boolean(selectedCaseCanHandle
    && ['mrdss_review', 'branch_review', 'area_manager_review', 'coo_review'].includes(selectedWorkflowStage));
  const showWorkflowNote = Boolean(selectedCaseCanManage && (
    (isMrdss && selectedWorkflowStage === 'mrdss_review')
    || selectedCaseNeedsRecovery
    || (selectedCaseCanHandle && ['branch_review', 'area_manager_review'].includes(selectedWorkflowStage))
    || (isMrdss && selectedWorkflowStage === 'final_tagging')
  ));
  const workflowNoteLabel = selectedWorkflowStage === 'mrdss_review'
    ? 'Branch referral instructions'
    : selectedWorkflowStage === 'final_tagging'
      ? 'Reason for returning to the handler'
      : selectedWorkflowStage === 'closed'
        ? 'Reason for reopening'
        : selectedCaseNeedsRecovery
          ? 'Reason for return or rerouting'
        : 'Reason for escalation';
  const workflowNotePlaceholder = selectedWorkflowStage === 'mrdss_review'
    ? 'Explain what the branch should review.'
    : selectedWorkflowStage === 'final_tagging'
      ? 'Explain what additional work is needed.'
      : selectedWorkflowStage === 'closed'
        ? 'Explain why this case should be reopened.'
        : selectedCaseNeedsRecovery
          ? 'Explain why the case is being returned or rerouted.'
          : 'Explain why the case should be escalated.';
  const externalCount = cases.filter((item) => EXTERNAL_REVIEW_STAGES.includes(item.workflowStage)).length;
  const reportActiveCount = reportCases.filter((item) => item.workflowStage !== 'closed').length;
  const reportResolvedCount = reportCases.filter((item) => item.workflowStage === 'final_tagging'
    || (item.workflowStage === 'closed' && item.closureOutcome !== 'unable_to_contact')).length;
  const reportUrgentCount = reportCases.filter((item) => item.priority === 'Urgent').length;
  const caseSummary = isCaseHandler ? [
    { Icon: FileText, label: `${adminRoleLabel} queue`, queue: 'All', value: cases.filter((item) => canHandleConcern(item, admin)).length, meta: isBranchManager ? admin?.branch || 'Cases routed to your branch' : isAreaManager ? admin?.areaId?.replace('-', ' ') || 'Assigned area cases' : 'Assigned COO escalations' },
    { Icon: Inbox, label: 'New / returned', queue: 'new_returned', value: cases.filter((item) => canHandleConcern(item, admin) && ['New', 'Returned for Further Action'].includes(item.status)).length, meta: 'Awaiting review' },
    { Icon: Clock3, label: 'In review', queue: 'in_review', value: cases.filter((item) => canHandleConcern(item, admin) && item.status === 'In Review').length, meta: 'Currently being handled' },
    { Icon: MessageCircle, label: 'Waiting for member', queue: 'waiting_for_member', value: cases.filter((item) => canHandleConcern(item, admin) && item.status === 'Waiting for Member').length, meta: 'Follow-up is pending' },
  ] : [
    { Icon: FileText, label: 'Total Cases', queue: 'All', value: cases.length, meta: 'All received concerns' },
    { Icon: Inbox, label: 'MRDSS Review', queue: 'mrdss_review', value: counts.mrdss_review || 0, meta: 'Needs MRDSS response' },
    { Icon: Building2, label: 'With External Parties', queue: 'external', value: externalCount, meta: 'Branch, Area Manager, or COO' },
    { Icon: CheckCircle2, label: 'Final Tagging', queue: 'final_tagging', value: counts.final_tagging || 0, meta: 'Ready to close' },
  ];

  const resetQueueNavigation = () => {
    setQueuePage(0);
    setSearch('');
    setSelectedId('');
    setSidebarOpen(false);
  };

  const goToQueuePage = (page) => {
    const nextPage = Math.max(0, Math.min(page, queuePageCount - 1));
    setQueuePage(nextPage);
  };

  const selectReportPeriod = (item) => {
    setReportPeriodKey(item.key);
    setSelectedReportDate('');
    if (reportPeriod === 'month') setReportCalendarMonth(new Date(item.timestamp));
  };

  const changeReportMonth = (step) => {
    const nextMonth = new Date(activeReportMonth);
    nextMonth.setMonth(nextMonth.getMonth() + step);
    nextMonth.setDate(1);
    setReportCalendarMonth(nextMonth);
    const nextKey = getConcernPeriodKey(nextMonth, 'month');
    if (periodItems.some((item) => item.key === nextKey)) setReportPeriodKey(nextKey);
    setSelectedReportDate('');
  };

  const printConcernReport = () => {
    if (!reportSelectedPeriodCases.length) return;
    setPrintTarget('report');
  };

  const exportConcernReport = () => {
    if (!reportSelectedPeriodCases.length) return;
    downloadConcernCsv(reportSelectedPeriodCases, selectedPeriodItem?.name || reportDisplayLabel);
  };

  const clearReportFilters = () => setReportFilters({
    from: '', to: '', status: 'All', stage: 'All', branch: 'All', category: 'All', assignedStaff: 'All',
  });

  const updateCase = async (caseId, action, payload = {}) => {
    setSavingCaseId(caseId);
    setDataError('');
    setDataNotice('');
    try {
      const updatedCase = await saveMrdssConcern({
        id: caseId,
        action,
        payload,
      });
      setCases((current) => current.map((item) => item.id === caseId ? updatedCase : item));
      setDataNotice('Case action saved successfully.');
      return true;
    } catch (error) {
      setDataError(error.message || 'The case could not be saved.');
      return false;
    } finally {
      setSavingCaseId('');
    }
  };

  const deleteCase = async (caseItem) => {
    if (
      admin?.role !== 'superadmin' ||
      !caseItem ||
      savingCaseId === caseItem.id ||
      deletingCaseId === caseItem.id
    ) return;

    const confirmed = await confirmDialog({
      title: 'Delete case permanently?',
      message: `Case ${caseItem.id} will be permanently removed from the concern queue.`,
      confirmLabel: 'Delete case',
      variant: 'danger',
      warning: 'This action cannot be undone.',
    });
    if (!confirmed) return;

    setDeletingCaseId(caseItem.id);
    setDataError('');
    try {
      const result = await deleteMrdssConcern(caseItem.id);
      const remainingCases = filteredCases.filter((item) => item.id !== caseItem.id);
      const nextPage = Math.min(
        activeQueuePage,
        Math.max(0, Math.ceil(remainingCases.length / QUEUE_PAGE_SIZE) - 1)
      );
      setCases((current) => current.filter((item) => item.id !== caseItem.id));
      setQueuePage(nextPage);
                    setSelectedId((current) => current === caseItem.id ? '' : current);
      if (result.attachmentCleanupError) {
        setDataError(`Case deleted, but its attachment could not be removed: ${result.attachmentCleanupError}`);
      }
    } catch (error) {
      setDataError(error.message || 'The case could not be deleted.');
    } finally {
      setDeletingCaseId('');
    }
  };

  const recordContact = ({ channel, outcome, note }) => {
    if (!selectedCase) return Promise.resolve(false);
    if (outcome === 'Final notice sent') {
      return updateCase(selectedCase.id, 'record_final_notice', { channel, note });
    }
    return updateCase(selectedCase.id, 'record_contact', { channel, outcome, note });
  };

  const applyWorkflowAction = async (action) => {
    if (!selectedCase || savingCaseId === selectedCase.id) return;
    const note = workflowNote.trim();
    const resolution = resolutionDetailsDraft.trim();
    const saveAction = async (actionName, payload = {}) => {
      const saved = await updateCase(selectedCase.id, actionName, payload);
      if (saved) {
        setWorkflowNote('');
        setWorkflowError('');
      }
    };

    if (action === 'start_review') {
      saveAction('start_review');
      return;
    }
    if (action === 'wait_for_member') {
      saveAction('wait_for_member');
      return;
    }
    if (action === 'resume_review') {
      saveAction('resume_review');
      return;
    }
    if (action === 'refer_branch') {
      const destination = branchDestinations.find((branch) => branch.id === routedToDraft);
      if (!destination) {
        setWorkflowError('Choose the branch that will review this case.');
        return;
      }
      if (note.length < 8) {
        setWorkflowError('Add referral instructions of at least 8 characters.');
        return;
      }
      if (!await confirmDialog({
        title: 'Refer case to branch?',
        message: `This concern will be routed to ${destination.name} for investigation.`,
        confirmLabel: 'Refer case',
      })) return;
      saveAction('refer_branch', { branchId: destination.id, remarks: note });
      return;
    }
    if (action === 'reroute_branch') {
      const destination = branchDestinations.find((branch) => branch.id === routedToDraft);
      if (!destination) {
        setWorkflowError('Choose the branch that should receive this case.');
        return;
      }
      if (note.length < 8) {
        setWorkflowError('Add a rerouting reason of at least 8 characters.');
        return;
      }
      if (!await confirmDialog({
        title: 'Reroute case?',
        message: `This concern will be moved to ${destination.name}.`,
        confirmLabel: 'Reroute case',
      })) return;
      saveAction('reroute_branch', { branchId: destination.id, remarks: note });
      return;
    }
    if (action === 'recover_to_mrdss') {
      if (note.length < 8) {
        setWorkflowError('Add a recovery reason of at least 8 characters.');
        return;
      }
      if (!await confirmDialog({
        title: 'Return case to MRDSS?',
        message: 'The concern will be moved to the MRDSS review queue for further handling.',
        confirmLabel: 'Return to MRDSS',
      })) return;
      saveAction('recover_to_mrdss', { remarks: note });
      return;
    }
    if (action === 'escalate_area') {
      const target = areaManagers.find((manager) => manager.id === handlerDraft);
      if (!target) {
        setWorkflowError('Choose an active Area Manager for this branch.');
        return;
      }
      if (note.length < 8) {
        setWorkflowError('Add escalation instructions of at least 8 characters.');
        return;
      }
      if (!await confirmDialog({
        title: 'Escalate to Area Manager?',
        message: `This concern and its handoff note will be sent to ${target.name}.`,
        confirmLabel: 'Escalate case',
      })) return;
      saveAction('escalate_area', { userId: target.id, remarks: note });
      return;
    }
    if (action === 'escalate_coo') {
      const target = cooUsers.find((user) => user.id === handlerDraft);
      if (!target) {
        setWorkflowError('Choose an active COO account.');
        return;
      }
      if (note.length < 8) {
        setWorkflowError('Add escalation instructions of at least 8 characters.');
        return;
      }
      if (!await confirmDialog({
        title: 'Escalate to COO?',
        message: `This concern and its handoff note will be sent to ${target.name}.`,
        confirmLabel: 'Escalate case',
      })) return;
      saveAction('escalate_coo', { userId: target.id, remarks: note });
      return;
    }
    if (action === 'escalate_branch_to_coo') {
      const target = cooUsers.find((user) => user.id === handlerDraft);
      if (!target) {
        setWorkflowError('Choose an active COO account.');
        return;
      }
      if (note.length < 8) {
        setWorkflowError('Add escalation instructions of at least 8 characters.');
        return;
      }
      if (!await confirmDialog({
        title: 'Escalate directly to COO?',
        message: `This concern and its handoff note will be sent directly to ${target.name}.`,
        confirmLabel: 'Escalate case',
      })) return;
      saveAction('escalate_branch_to_coo', { userId: target.id, remarks: note });
      return;
    }
    if (action === 'record_resolution') {
      if (resolution.length < 8) {
        setWorkflowError('Enter the resolution or response details before continuing.');
        return;
      }
      saveAction('resolve_case', { resolutionDetails: resolution });
      return;
    }
    if (action === 'record_response') {
      if (resolution.length < 2) {
        setWorkflowError('Enter the response details before recording the response.');
        return;
      }
      saveAction('record_response', { responseDetails: resolution });
      return;
    }
    if (action === 'return_for_action') {
      if (note.length < 8) {
        setWorkflowError('Record why the resolution is being returned (at least 8 characters).');
        return;
      }
      if (!await confirmDialog({
        title: 'Return case for further action?',
        message: 'The concern will be returned to its previous handler with the handoff note.',
        confirmLabel: 'Return case',
      })) return;
      saveAction('return_for_action', { remarks: note });
      return;
    }
    if (action === 'close_case') {
      const tag = resolutionTagDraft.trim();
      if (!tag) {
        setWorkflowError('Add a final case tag before closing this case.');
        return;
      }
      if (resolution.length < 8) {
        setWorkflowError('Resolution details must contain at least 8 characters.');
        return;
      }
      if (closureRemarksDraft.trim().length < 8) {
        setWorkflowError('Add closure remarks of at least 8 characters.');
        return;
      }
      if (!await confirmDialog({
        title: 'Close concern?',
        message: 'Final tagging will be completed and this concern will be marked closed.',
        confirmLabel: 'Close concern',
        variant: 'danger',
      })) return;
      saveAction('close_case', { resolutionTag: tag, closureRemarks: closureRemarksDraft.trim() });
      return;
    }
    if (action === 'close_unreachable') {
      if (!selectedUnableContactReadiness?.eligible) {
        setWorkflowError('Log at least three no-response attempts, wait five business days, then record a final notice before closing.');
        return;
      }
      if (!await confirmDialog({
        title: 'Close as unable to contact?',
        message: 'The case will be closed without a resolution tag and will not be marked resolved.',
        confirmLabel: 'Close case',
        variant: 'danger',
      })) return;
      saveAction('close_unreachable');
      return;
    }
    if (action === 'reopen_unreachable') {
      if (note.length < 8) {
        setWorkflowError('Record why this unable-to-contact case is being reopened (at least 8 characters).');
        return;
      }
      if (!await confirmDialog({
        title: 'Reopen case?',
        message: 'The concern will be returned to its previous handler for further review.',
        confirmLabel: 'Reopen case',
      })) return;
      saveAction('reopen_unreachable', { remarks: note });
      return;
    }
    if (action === 'reopen_case') {
      if (note.length < 8) {
        setWorkflowError('Record the reason for reopening (at least 8 characters).');
        return;
      }
      if (!await confirmDialog({
        title: 'Reopen closed concern?',
        message: 'The concern will be returned to its previous handler for further review.',
        confirmLabel: 'Reopen concern',
      })) return;
      saveAction('reopen_case', { remarks: note });
    }
  };

  const updateAssignee = async (assignee) => {
    if (!selectedCase || assignee === selectedCase.assignedStaffId) return;
    await updateCase(selectedCase.id, 'assign_mrdss', { userId: assignee });
  };

  const openAttachment = async (attachment) => {
    if (!attachment?.path) return;
    const tab = window.open('about:blank', '_blank');
    if (tab) tab.opener = null;
    try {
      const url = await createConcernAttachmentUrl(attachment.path);
      if (tab) tab.location.href = url;
      else setDataError('Allow pop-ups for this site to open the attachment.');
    } catch (error) {
      if (tab) tab.close();
      setDataError(error.message || 'The attachment could not be opened.');
    }
  };

  const handleSignOut = async () => {
    await signOutPortal();
    window.location.replace('/mrdss');
  };
  const caseNavigation = isBranchManager
    ? [
      { stage: 'All', label: 'My Branch Cases', Icon: Building2 },
      { stage: 'history', label: 'History', Icon: Archive },
    ]
    : isAreaManager
      ? [
        { stage: 'All', label: 'My Area Cases', Icon: LayoutDashboard },
        { stage: 'history', label: 'History', Icon: Archive },
      ]
      : isCoo
        ? [
          { stage: 'All', label: 'My COO Cases', Icon: LayoutDashboard },
          { stage: 'history', label: 'History', Icon: Archive },
        ]
        : CASE_NAVIGATION;

  if (authState === 'checking') {
    return <main className="mrdss-access-page"><p className="mrdss-auth-loading">Checking MRDSS access...</p></main>;
  }

  if (authState === 'denied') return <AccessMessage />;

  return (
    <>
    <main className="portal-main portal-app-main mrdss-portal-main">
      <div className="portal-shell">
        <header className="portal-topbar glass">
          <div className="portal-topbar-copy">
            <span className="portal-eyebrow">Admin Portal</span>
            <h1>{adminRoleLabel}</h1>
          </div>
          <div className="portal-topbar-actions">
            <PortalThemeToggle />
            <div className="profile-chip">
              <PortalProfilePhotoControl
                user={admin}
                fallback="MR"
                onUserUpdated={setAdmin}
                onStatus={(text, type) => {
                  if (type === 'error') window.alert(text);
                }}
              />
              <div className="profile-chip-copy">
                <strong>{admin?.name || admin?.full_name || 'MRDSS Admin'}</strong>
                <span>{isBranchManager ? `Branch Admin - ${admin?.branch || 'Branch not set'}` : isAreaManager ? `Area Manager - ${admin?.areaId?.replace(/^area-/i, 'Area ') || 'Area not set'}` : adminRoleLabel}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="portal-layout">
          <aside className={`portal-sidebar${sidebarOpen ? ' open' : ''}`}>
            <div className="sidebar-brand">
              <span className="sidebar-eyebrow">MEMPCO</span>
              <h2 className="sidebar-title">{isBranchManager ? 'Branch Support Desk' : isAreaManager ? 'Area Manager Desk' : isCoo ? 'COO Escalations' : 'MRDSS Admin Console'}</h2>
            </div>
            <nav className="sidebar-nav" aria-label="MRDSS case navigation">
              {caseNavigation.map(({ stage, label, Icon }) => (
                <Link
                  key={stage}
                  href={getCaseQueueHref(stage)}
                  className={`sidebar-nav-btn${activeView === 'cases' && filter === stage ? ' active' : ''}`}
                  onNavigate={resetQueueNavigation}
                  aria-current={activeView === 'cases' && filter === stage ? 'page' : undefined}
                >
                  <Icon className="sidebar-nav-icon" aria-hidden="true" />
                  <span>{label}</span>
                </Link>
              ))}
              {isMrdss && <Link
                href="/mrdss-admin?view=reports"
                className={`sidebar-nav-btn${activeView === 'reports' ? ' active' : ''}`}
                onClick={() => {
                  setSelectedId('');
                  setSidebarOpen(false);
                }}
                aria-current={activeView === 'reports' ? 'page' : undefined}
              >
                <Printer className="sidebar-nav-icon" aria-hidden="true" />
                <span>Reports</span>
              </Link>}
              <div className="sidebar-logout">
                <button type="button" className="sidebar-nav-btn" onClick={handleSignOut}>
                  <LogOut className="sidebar-nav-icon" aria-hidden="true" />
                  Sign out
                </button>
              </div>
            </nav>
          </aside>

          {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

          <section className="portal-view">
            <button
              type="button"
              className="burger"
              aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen((open) => !open)}
            >
              <Menu className="admin-mono-icon" aria-hidden="true" />
            </button>

            <div className="mrdss-workspace">
        {dataError && <p className="mrdss-data-error app-error-alert" role="alert">{dataError}</p>}
        {dataNotice && <p className="mrdss-data-notice" role="status">{dataNotice}</p>}
        <section className="panel-card glass hero-panel admin-hero-panel mrdss-page-heading">
          <div className="hero-copy">
            <span className="section-kicker">{isBranchManager ? `Branch queue - ${admin?.branch || 'Branch not set'}` : isAreaManager ? `Area queue - ${admin?.areaId?.replace('-', ' ') || 'Area not set'}` : isCoo ? 'Executive escalation queue' : 'Member Relations & Development Support Services'}</span>
            <h2>{activeView === 'reports' ? 'Member concern reports' : isBranchManager ? 'Branch Concerns' : isAreaManager ? 'Area Manager Concerns' : isCoo ? 'COO Escalations' : 'Concerns & Feedback'}</h2>
            <p>{activeView === 'reports' ? 'Review member concern trends and case outcomes.' : isBranchManager ? 'Review concerns assigned to your branch, investigate, and forward resolved cases to MRDSS.' : isAreaManager ? 'Review concerns escalated within your area, resolve or escalate them, and forward resolutions to MRDSS.' : isCoo ? 'Review executive escalations, record decisions, and forward resolutions to MRDSS.' : 'Review submissions, manage follow-up, and record outcomes.'}</p>
          </div>
        </section>

        {activeView === 'cases' && <section className="stats-grid mrdss-summary" aria-label="Case summary">
          {caseSummary.map(({ Icon, label, queue, value, meta }) => (
            <Link
              className="stat-card glass mrdss-summary-link"
              key={label}
              href={getCaseQueueHref(queue)}
              onNavigate={resetQueueNavigation}
              aria-current={filter === queue ? 'page' : undefined}
            >
              <div className="stat-card-head">
                <span className="stat-icon"><Icon size={18} aria-hidden="true" /></span>
                <span className="stat-label">{label}</span>
                <ArrowRight className="mrdss-summary-arrow" size={16} aria-hidden="true" />
              </div>
              <p className="stat-value">{value}</p>
              <span className="stat-meta">{meta}</span>
            </Link>
          ))}
        </section>}

        {activeView === 'reports' ? (
          <div className="dashboard-view reports-compact-view mrdss-reports-view">
            <section className="panel-card glass report-toolbar">
              <div className="report-toolbar-copy">
                <span className="section-kicker">Reports</span>
                <h2>Member Concern Summary</h2>
                <p>{reportCases.length} matching {reportCases.length === 1 ? 'case' : 'cases'} across the selected filters.</p>
              </div>
              <div className="report-toolbar-metrics" aria-label="Report summary">
                <ReportMetric label="Total" value={reportCases.length} meta="cases" />
                <ReportMetric label="Active" value={reportActiveCount} meta="open" />
                <ReportMetric label="Resolved / final" value={reportResolvedCount} meta="resolved or awaiting final tag" />
                <ReportMetric label="Urgent" value={reportUrgentCount} meta="urgent priority" />
              </div>
            </section>

            <section className="panel-card glass mrdss-report-filter-panel" aria-label="Report filters">
              <div className="mrdss-report-filter-heading"><span className="section-kicker">Filter report</span><button type="button" className="mrdss-report-reset filter-reset-icon" onClick={clearReportFilters} aria-label="Clear filters" title="Clear filters"><RotateCcw size={17} aria-hidden="true" /></button></div>
              <div className="mrdss-report-filters">
                <label className="mrdss-field"><span>From</span><input type="date" value={reportFilters.from} onChange={(event) => setReportFilters((current) => ({ ...current, from: event.target.value }))} /></label>
                <label className="mrdss-field"><span>To</span><input type="date" value={reportFilters.to} onChange={(event) => setReportFilters((current) => ({ ...current, to: event.target.value }))} /></label>
                <label className="mrdss-field"><span>Status</span><select value={reportFilters.status} onChange={(event) => setReportFilters((current) => ({ ...current, status: event.target.value }))}><option>All</option>{STATUS_OPTIONS.map((status) => <option key={status}>{status}</option>)}</select></label>
                <label className="mrdss-field"><span>Workflow stage</span><select value={reportFilters.stage} onChange={(event) => setReportFilters((current) => ({ ...current, stage: event.target.value }))}><option>All</option>{FILTER_OPTIONS.slice(1).map((stage) => <option key={stage} value={stage}>{getStageLabel(stage)}</option>)}</select></label>
                <label className="mrdss-field"><span>Branch</span><select value={reportFilters.branch} onChange={(event) => setReportFilters((current) => ({ ...current, branch: event.target.value }))}><option>All</option>{reportBranches.map((branch) => <option key={branch}>{branch}</option>)}</select></label>
                <label className="mrdss-field"><span>Category</span><select value={reportFilters.category} onChange={(event) => setReportFilters((current) => ({ ...current, category: event.target.value }))}><option>All</option>{reportCategories.map((category) => <option key={category}>{category}</option>)}</select></label>
                <label className="mrdss-field"><span>Assigned staff</span><select value={reportFilters.assignedStaff} onChange={(event) => setReportFilters((current) => ({ ...current, assignedStaff: event.target.value }))}><option>All</option><option>Unassigned</option>{staff.map((person) => <option key={person.id} value={person.id}>{person.full_name}</option>)}</select></label>
              </div>
            </section>

            <section className="panel-card glass report-period-card">
              <div className="report-period-head">
                <div>
                  <span className="section-kicker">{selectedPeriod.meta}</span>
                  <h3>{selectedPeriod.title}</h3>
                </div>
              <div className="report-period-actions">
                  <button type="button" className="report-print-btn" onClick={printConcernReport} disabled={!reportSelectedPeriodCases.length}>
                    <Printer size={15} aria-hidden="true" /> {reportPeriod === 'month' ? 'Print Consolidated' : `Print ${selectedPeriod.label}`}
                  </button>
                  {reportPeriod === 'month' && (
                    <button type="button" className="report-print-btn" onClick={exportConcernReport} disabled={!reportSelectedPeriodCases.length}>
                      <Download size={15} aria-hidden="true" /> Export CSV
                    </button>
                  )}
                  <div className="report-period-tabs" role="tablist" aria-label="Report period">
                    {REPORT_PERIODS.map((period) => (
                      <button key={period.key} type="button" role="tab" aria-selected={reportPeriod === period.key} className={reportPeriod === period.key ? 'active' : ''} onClick={() => { setReportPeriod(period.key); setReportPeriodPage(1); setSelectedReportDate(''); }}>
                        {period.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="report-period-strip">
                <div className="admin-breakdown-list selectable">
                  {visiblePeriodItems.length ? visiblePeriodItems.map((item) => (
                    <button type="button" key={item.key} className={`admin-breakdown-item${item.key === (reportPeriod === 'month' ? getConcernPeriodKey(activeReportMonth, 'month') : reportPeriodKey) ? ' selected' : ''}`} onClick={() => selectReportPeriod(item)} aria-pressed={item.key === (reportPeriod === 'month' ? getConcernPeriodKey(activeReportMonth, 'month') : reportPeriodKey)}>
                      <div className="admin-breakdown-copy"><strong>{item.name}</strong><span>{item.count} {item.count === 1 ? 'case' : 'cases'}</span></div>
                    </button>
                  )) : <div className="empty-state small"><p>No data available yet.</p></div>}
                </div>
              </div>
              {selectedPeriodTotalPages > 1 && (
                <nav className="report-period-pager" aria-label={`${selectedPeriod.label} report pages`}>
                  <button type="button" onClick={() => setReportPeriodPage((page) => Math.max(1, page - 1))} disabled={safeReportPeriodPage === 1} aria-label={`Previous ${selectedPeriod.label.toLowerCase()} reports`}><ChevronLeft aria-hidden="true" /></button>
                  <span>{(safeReportPeriodPage - 1) * REPORT_PAGE_SIZE + 1}-{Math.min(safeReportPeriodPage * REPORT_PAGE_SIZE, periodItems.length)} of {periodItems.length}</span>
                  <button type="button" onClick={() => setReportPeriodPage((page) => Math.min(selectedPeriodTotalPages, page + 1))} disabled={safeReportPeriodPage === selectedPeriodTotalPages} aria-label={`Next ${selectedPeriod.label.toLowerCase()} reports`}><ChevronRight aria-hidden="true" /></button>
                </nav>
              )}
            </section>

            <section className="report-calendar-layout" aria-label="Member concern calendar report">
              <div className="panel-card glass report-calendar-card">
                <div className="report-calendar-head">
                  <div><span className="section-kicker"><CalendarDays size={14} aria-hidden="true" /> Calendar Report</span><h3>{reportCalendar.title}</h3></div>
                  <div className="report-calendar-nav">
                    <button type="button" onClick={() => changeReportMonth(-1)} aria-label="Previous report month"><ChevronLeft size={17} aria-hidden="true" /></button>
                    <button type="button" onClick={() => changeReportMonth(1)} aria-label="Next report month"><ChevronRight size={17} aria-hidden="true" /></button>
                  </div>
                </div>
                <div className="report-calendar-grid" aria-label={`Concern calendar for ${reportCalendar.title}`}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day} className={`report-calendar-weekday${day === 'Sun' || day === 'Sat' ? ' weekend' : ''}`}>{day}</span>)}
                  {reportCalendar.cells.map((cell) => {
                    const level = !cell.count || !reportCalendar.maxCount ? 'empty' : cell.count / reportCalendar.maxCount >= 0.75 ? 'high' : cell.count / reportCalendar.maxCount >= 0.4 ? 'medium' : 'low';
                    return <button type="button" key={cell.key} className={['report-calendar-day', cell.isCurrentMonth ? '' : 'muted', cell.isToday ? 'today' : '', cell.isFuture ? 'future' : '', cell.key === selectedReportDate ? 'selected' : '', level].filter(Boolean).join(' ')} onClick={() => { setSelectedReportDate(cell.key); setReportCalendarMonth(new Date(Number(cell.key.slice(0, 4)), Number(cell.key.slice(5, 7)) - 1, 1)); }} disabled={cell.isFuture} aria-label={`${cell.key}: ${cell.count} case${cell.count === 1 ? '' : 's'}`}><span>{cell.day}</span>{cell.count > 0 && <strong>{cell.count}</strong>}</button>;
                  })}
                </div>
              </div>

              <aside className="panel-card glass report-calendar-insights">
                <span className="section-kicker">Month Pulse</span>
                <h3>{reportCalendar.monthTotal} cases in report</h3>
                <div className="report-insight-list">
                  <div className="report-insight-item primary"><span>Busiest Day</span><strong>{reportCalendar.busiestDay?.count ? formatReportDate(new Date(`${reportCalendar.busiestDay.key}T12:00:00`), { month: 'short', day: 'numeric' }) : 'No activity'}</strong><em>{reportCalendar.busiestDay?.count || 0} cases</em></div>
                  <div className="report-insight-item"><span>Active Days</span><strong>{reportCalendar.activeDays}</strong><em>days with cases</em></div>
                  <div className="report-insight-item"><span>Daily Average</span><strong>{reportCalendar.averagePerActiveDay}</strong><em>cases per active day</em></div>
                  <div className="report-insight-item"><span>Peak Volume</span><strong>{reportCalendar.maxCount}</strong><em>cases in one day</em></div>
                </div>
                <div className="report-selected-day">
                  <div className="report-selected-day-head"><span>Selected Day</span><strong>{selectedReportDate ? formatConcernDate(`${selectedReportDate}T12:00:00`) : 'Select a date'}</strong></div>
                  {selectedReportDate ? selectedReportDateCases.length ? (
                    <div className="report-selected-ticket-list">
                      {selectedReportDateCases.slice(0, 4).map((item) => <button type="button" key={item.id} className="report-selected-ticket" onClick={() => { router.push(getCaseQueueHref('All'), { scroll: false }); setSearch(''); setQueuePage(Math.max(0, Math.floor(cases.findIndex((caseItem) => caseItem.id === item.id) / QUEUE_PAGE_SIZE))); setSelectedId(item.id); }}><span>{item.id}</span><strong>{item.name}</strong><em>{item.status} / {item.priority}</em></button>)}
                    </div>
                  ) : <p className="report-selected-empty">No matching cases were found on this date.</p> : <p className="report-selected-empty">Choose a calendar date to review the cases submitted that day.</p>}
                </div>
              </aside>
            </section>

            <section className="mrdss-report-results panel-card glass">
              <div className="report-calendar-head">
                <div><span className="section-kicker">{selectedReportDate ? 'Selected day' : selectedPeriod.label}</span><h3>{reportDisplayLabel}</h3></div>
                <span className="mrdss-report-count">{reportDisplayCases.length} {reportDisplayCases.length === 1 ? 'case' : 'cases'}</span>
              </div>
              <div className="mrdss-report-table-wrap">
                <table className="mrdss-report-table">
                  <thead><tr><th>Reference</th><th>Submitted</th><th>Member</th><th>Branch</th><th>Type / category</th><th>Status</th><th>Case outcome</th><th>Routed to</th><th>First response</th><th>Response due</th><th>Priority</th><th>Assigned staff</th></tr></thead>
                  <tbody>
                    {reportDisplayCases.map((item) => <tr key={item.id}><td>{item.id}</td><td>{formatConcernDate(item.createdAt)}</td><td>{item.name}</td><td>{item.branch}</td><td>{item.concernType} / {item.category}</td><td>{item.status}</td><td>{getStageBadgeLabel(item.workflowStage, item.closureOutcome)}</td><td>{item.routedTo || 'MRDSS'}</td><td>{getFirstResponseStatus(item)}</td><td>{formatConcernDate(getResponseDeadline(item))}</td><td>{item.priority}</td><td>{item.assignee || 'Unassigned'}</td></tr>)}
                    {!reportDisplayCases.length && <tr><td className="mrdss-report-empty" colSpan={12}>No cases match these filters.</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="mrdss-report-footer"><span>Filters: {reportFilterSummary}{selectedReportDate ? ` | Date: ${reportDisplayLabel}` : selectedPeriodItem ? ` | Period: ${selectedPeriodItem.name}` : ''}</span><button type="button" className="mrdss-report-reset" onClick={printConcernReport}><Printer size={14} aria-hidden="true" /> Print report</button></div>
            </section>

            <div className="admin-report-grid compact mrdss-report-breakdowns">
              <ReportBreakdown title="Status" items={reportStatusBreakdown} />
              <ReportBreakdown title="Workflow stage" items={reportStageBreakdown} />
              <ReportBreakdown title="Concern Type" items={reportTypeBreakdown} />
              <ReportBreakdown title="Category" items={reportCategoryBreakdown} />
              <ReportBreakdown title="Branch" items={reportBranchBreakdown} />
              <ReportBreakdown title="Assigned Staff" items={reportAssigneeBreakdown} />
            </div>
          </div>
        ) : (
        <section id="mrdss-case-queue" className="dashboard-view helpdesk-view mrdss-manager mrdss-manager--queue" aria-label="Manage member concerns">
          <div className="mrdss-queue mrdss-queue--full panel-card glass ticket-queue-panel">
            <div className="section-head mrdss-queue__heading">
              <div>
                <span className="section-kicker">Member Concerns</span>
                <h3>{filter === 'All' && isCaseHandler ? `${adminRoleLabel} queue` : CASE_QUEUE_LABELS[filter]}</h3>
                <p className="mrdss-queue-count">{filteredCases.length} matching {filteredCases.length === 1 ? 'case' : 'cases'}</p>
              </div>
              <button
                type="button"
                className={`topbar-icon-btn mrdss-refresh-button${refreshing ? ' is-refreshing' : ''}`}
                onClick={() => refreshWorkspace()}
                disabled={refreshing}
                aria-label={refreshing ? 'Refreshing cases and staff' : 'Refresh cases and staff'}
                aria-busy={refreshing}
                title={refreshing ? 'Refreshing cases and staff' : 'Refresh cases and staff'}
              >
                <RefreshCw size={16} aria-hidden="true" />
              </button>
            </div>

            <div className="admin-filter-grid mrdss-case-filters">
              <div className="ticket-form-group full search-field-group">
                <label htmlFor="mrdss-case-search">Search cases</label>
                <span className="field-leading-icon" aria-hidden="true"><Search /></span>
                <input id="mrdss-case-search" className="ticket-field ticket-input" type="search" value={search} onChange={(event) => { setSearch(event.target.value); setQueuePage(0); }} placeholder="Reference, member, branch, or concern" />
              </div>
            </div>

            <div className="admin-ticket-queue">
            <div className="admin-ticket-queue-grid mrdss-case-grid">
              {visibleCases.length ? visibleCases.map((item) => {
                const responseClock = getResponseClock(item, now);
                return (
                  <button type="button" className="admin-ticket-card mrdss-case-item" key={item.id} onClick={() => setSelectedId(item.id)} aria-label={`Open concern ${item.id} from ${item.name}`}>
                    <span className="mrdss-case-item__top">
                      <span className="mrdss-case-item__identity"><strong>{item.id}</strong><span>{formatConcernDate(item.createdAt)}</span></span>
                      <span className="mrdss-case-item__badges"><span className={`mrdss-status ${getStageBadgeClass(item.workflowStage, item.closureOutcome)}`}>{getStageBadgeLabel(item.workflowStage, item.closureOutcome)}</span><span className={`mrdss-status mrdss-status--${getStatusClass(item.status)}`}>{item.status}</span></span>
                    </span>
                    <span className="mrdss-case-item__name">{item.name}</span>
                    <span className="mrdss-case-item__meta">{item.concernType} / {item.category}</span>
                    <span className="mrdss-case-item__summary">{item.message}</span>
                    <span className="mrdss-case-item__details"><span><small>Origin branch</small><strong>{item.branch}</strong></span><span><small>Current destination</small><strong>{item.routedTo || 'MRDSS'}</strong></span></span>
                    <span className={`mrdss-case-item__response is-${responseClock.state}`}>
                      <Clock3 size={15} aria-hidden="true" />
                      <span>
                        <small>First response</small>
                        <strong>{responseClock.label}</strong>
                      </span>
                      <em>{responseClock.running
                        ? `${responseClock.elapsed} elapsed`
                        : responseClock.respondedAt
                          ? responseClock.state === 'met' ? 'Within target' : 'Target missed'
                          : responseClock.remainingMs < 0 ? 'Target missed' : 'Closed before target'}</em>
                    </span>
                  </button>
                );
              }) : (
                  <div className="empty-state"><div className="empty-icon"><Inbox aria-hidden="true" /></div><h4>{refreshing ? 'Loading cases...' : 'No cases match these filters.'}</h4><p>Member submissions matching this queue will appear here.</p></div>
              )}
            </div>
            </div>
            {filteredCases.length > QUEUE_PAGE_SIZE && (
              <nav className="ticket-pagination" aria-label="Case queue pages">
                <button type="button" className="pagination-arrow" onClick={() => goToQueuePage(activeQueuePage - 1)} disabled={activeQueuePage === 0} aria-label="Previous cases">
                  <ChevronLeft size={18} aria-hidden="true" />
                </button>
                <div className="pagination-copy">
                  <strong>Page {activeQueuePage + 1} of {queuePageCount}</strong>
                  <span>Showing {activeQueuePage * QUEUE_PAGE_SIZE + 1}-{Math.min((activeQueuePage + 1) * QUEUE_PAGE_SIZE, filteredCases.length)} of {filteredCases.length} cases</span>
                </div>
                <button type="button" className="pagination-arrow" onClick={() => goToQueuePage(activeQueuePage + 1)} disabled={activeQueuePage >= queuePageCount - 1} aria-label="Next cases">
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              </nav>
            )}
          </div>

          {selectedCase && <div className="mrdss-detail-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedId(''); }}>
          <div className="mrdss-detail" role="dialog" aria-modal="true" aria-labelledby="mrdss-case-dialog-title">
            {selectedCase ? (
              <>
                <div className="mrdss-detail__header">
                  <div>
                    <p className="mrdss-detail__id">{selectedCase.id}</p>
                    <h2 id="mrdss-case-dialog-title">{selectedCase.name}</h2>
                    <p>{selectedCase.concernType} - {selectedCase.category}</p>
                  </div>
                    <div className="mrdss-detail__tools">
                    <div className="mrdss-detail__status-stack">
                      <div className="mrdss-detail__badges">
                        <span className={`mrdss-status ${getStageBadgeClass(selectedCase.workflowStage, selectedCase.closureOutcome)}`}>{getStageBadgeLabel(selectedCase.workflowStage, selectedCase.closureOutcome)}</span>
                        <span className={`mrdss-status mrdss-status--${getStatusClass(selectedCase.status)}`}>{selectedCase.status}</span>
                      </div>
                      <div className={`mrdss-header-response-clock is-${selectedResponseClock.state}`} aria-label="First response service level timer">
                        <div className="mrdss-header-response-clock__main">
                          <span><Clock3 size={14} aria-hidden="true" />{selectedResponseClock.running
                            ? selectedResponseClock.state === 'overdue' ? 'First response overdue' : 'First response due in'
                            : 'First response'}</span>
                          <strong>{selectedResponseClock.running
                            ? selectedResponseClock.state === 'overdue'
                              ? formatElapsedDuration(Math.abs(selectedResponseClock.remainingMs))
                              : `${formatElapsedDuration(selectedResponseClock.remainingMs)} left`
                            : selectedResponseClock.respondedAt
                              ? selectedResponseClock.label
                              : `Closed after ${selectedResponseClock.elapsed}`}</strong>
                        </div>
                        <p className={selectedResponseClock.respondedAt ? 'mrdss-header-response-clock__meta is-recorded' : undefined}>{selectedResponseClock.respondedAt
                          ? `${selectedResponseClock.state === 'met' ? 'Within target' : 'Target missed'} | ${selectedResponseClock.respondedBy} | ${formatConcernDate(selectedResponseClock.respondedAt)}`
                          : selectedResponseClock.running
                            ? `24-hour target · Due ${formatConcernDate(selectedResponseClock.dueAt)}`
                            : selectedResponseClock.remainingMs < 0
                              ? 'No response recorded; 24-hour target missed.'
                              : 'No response recorded before case closure.'}</p>
                      </div>
                    </div>
                  </div>
                  <button type="button" className="mrdss-button mrdss-case-close" onClick={() => setSelectedId('')} aria-label="Close case details" title="Close">
                    <X size={20} aria-hidden="true" />
                  </button>
                </div>

                <div className="mrdss-case-body-grid">
                  <div className="mrdss-case-primary-column">
                <section className="mrdss-workflow-section" aria-label="Case workflow">
                  <div className="mrdss-section-heading">
                    <div>
                      <h3>{getStageLabel(selectedWorkflowStage)}</h3>
                      {(selectedWorkflowStage !== 'closed' || workflowError) && (
                        <p>
                          {selectedWorkflowStage !== 'closed' && `Assigned to ${selectedCase.routedTo || 'MRDSS'}`}
                          {workflowError && <span className="mrdss-workflow-error" role="alert">{selectedWorkflowStage !== 'closed' ? ' · ' : ''}{workflowError}</span>}
                        </p>
                      )}
                    </div>
                  </div>

                  {selectedWorkflowStage !== 'closed' && selectedCaseCanManage ? (
                    <>
                      {isMrdss && selectedWorkflowStage === 'mrdss_review' && selectedCaseCanHandle && (
                        <div className="mrdss-branch-route-picker">
                          <label className="mrdss-field mrdss-workflow-target">
                            <span>Branch destination</span>
                            <select value={routedToDraft} onChange={(event) => { setRoutedToDraft(event.target.value); setWorkflowError(''); }} disabled={savingCaseId === selectedCase.id}>
                              <option value="">Choose a branch with an active Branch Admin</option>
                              {branchDestinations.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                            </select>
                          </label>
                          <button type="button" className="mrdss-button mrdss-button--secondary" onClick={() => applyWorkflowAction('refer_branch')} disabled={savingCaseId === selectedCase.id}>
                            Send to branch
                          </button>
                        </div>
                      )}
                      {isBranchManager && selectedWorkflowStage === 'branch_review' && selectedCaseCanHandle && escalationRoute === 'area_manager' && (
                        <label className="mrdss-field mrdss-workflow-target">
                          <span>Area Manager recipient</span>
                          <select value={handlerDraft} onChange={(event) => { setHandlerDraft(event.target.value); setWorkflowError(''); }} disabled={savingCaseId === selectedCase.id}>
                            <option value="">Choose an active Area Manager</option>
                            {areaManagers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name}</option>)}
                          </select>
                        </label>
                      )}
                      {isBranchManager && selectedWorkflowStage === 'branch_review' && selectedCaseCanHandle && escalationRoute === 'coo' && (
                        <label className="mrdss-field mrdss-workflow-target">
                          <span>COO recipient</span>
                          <select value={handlerDraft} onChange={(event) => { setHandlerDraft(event.target.value); setWorkflowError(''); }} disabled={savingCaseId === selectedCase.id}>
                            <option value="">Choose an active COO</option>
                            {cooUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                          </select>
                        </label>
                      )}
                      {isAreaManager && selectedWorkflowStage === 'area_manager_review' && selectedCaseCanHandle && (
                        <label className="mrdss-field mrdss-workflow-target">
                          <span>COO recipient</span>
                          <select value={handlerDraft} onChange={(event) => { setHandlerDraft(event.target.value); setWorkflowError(''); }} disabled={savingCaseId === selectedCase.id}>
                            <option value="">Choose an active COO</option>
                            {cooUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                          </select>
                        </label>
                      )}

                      {isMrdss && selectedCaseNeedsRecovery && selectedWorkflowStage === 'branch_review' && (
                        <label className="mrdss-field mrdss-workflow-target">
                          <span>New branch destination</span>
                          <select value={routedToDraft} onChange={(event) => { setRoutedToDraft(event.target.value); setWorkflowError(''); }} disabled={savingCaseId === selectedCase.id}>
                            <option value="">Choose a branch with an active Branch Admin</option>
                            {branchDestinations.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                          </select>
                        </label>
                      )}
                      {showWorkflowNote && selectedWorkflowStage !== 'closed' && selectedWorkflowStage !== 'final_tagging' && selectedCase.status !== 'Waiting for Member' && (
                        <label className="mrdss-field mrdss-workflow-target">
                          <span>{workflowNoteLabel}</span>
                          <textarea value={workflowNote} onChange={(event) => { setWorkflowNote(event.target.value); setWorkflowError(''); }} rows={2} maxLength={1000} placeholder={workflowNotePlaceholder} disabled={savingCaseId === selectedCase.id} />
                        </label>
                      )}

                      {isBranchManager && selectedWorkflowStage === 'branch_review' && selectedCaseCanHandle && (
                        <div className="mrdss-action-row mrdss-action-row--routing">
                          {escalationRoute === 'area_manager' && <button type="button" className="mrdss-button mrdss-button--secondary" onClick={() => applyWorkflowAction('escalate_area')} disabled={savingCaseId === selectedCase.id}><ArrowRight size={16} aria-hidden="true" /> Escalate to Area Manager</button>}
                          {escalationRoute === 'coo' && <button type="button" className="mrdss-button mrdss-button--secondary" onClick={() => applyWorkflowAction('escalate_branch_to_coo')} disabled={savingCaseId === selectedCase.id}><ArrowRight size={16} aria-hidden="true" /> Escalate directly to COO</button>}
                        </div>
                      )}
                      {isAreaManager && selectedWorkflowStage === 'area_manager_review' && selectedCaseCanHandle && (
                        <div className="mrdss-action-row mrdss-action-row--routing">
                          <button type="button" className="mrdss-button mrdss-button--secondary" onClick={() => applyWorkflowAction('escalate_coo')} disabled={savingCaseId === selectedCase.id}><ArrowRight size={16} aria-hidden="true" /> Escalate to COO</button>
                        </div>
                      )}
                      {isMrdss && selectedCaseNeedsRecovery && (
                        <div className="mrdss-action-row mrdss-action-row--routing">
                          {selectedWorkflowStage === 'branch_review' && <button type="button" className="mrdss-button mrdss-button--secondary" onClick={() => applyWorkflowAction('reroute_branch')} disabled={savingCaseId === selectedCase.id}><Building2 size={16} aria-hidden="true" /> Change branch destination</button>}
                          <button type="button" className="mrdss-button mrdss-button--quiet" onClick={() => applyWorkflowAction('recover_to_mrdss')} disabled={savingCaseId === selectedCase.id}><ArrowRight size={16} aria-hidden="true" /> Return case to MRDSS</button>
                        </div>
                      )}

                      {selectedWorkflowStage !== 'final_tagging' && selectedCase.status !== 'Waiting for Member' && selectedCaseCanHandle && (
                        <>
                          <label className="mrdss-field mrdss-workflow-target">
                            <span>Response or resolution details</span>
                            <textarea value={resolutionDetailsDraft} onChange={(event) => { setResolutionDetailsDraft(event.target.value); setWorkflowError(''); }} rows={2} maxLength={3000} placeholder="Record the response or decision for this case." disabled={savingCaseId === selectedCase.id} />
                          </label>
                          <div className="mrdss-action-row mrdss-action-row--response">
                            <button type="button" className="mrdss-button mrdss-button--quiet" onClick={() => applyWorkflowAction('record_response')} disabled={savingCaseId === selectedCase.id}>
                              <Save size={16} aria-hidden="true" /> Save progress update
                            </button>
                            <button type="button" className="mrdss-button mrdss-button--primary" onClick={() => applyWorkflowAction('record_resolution')} disabled={savingCaseId === selectedCase.id}>
                              <ArrowRight size={16} aria-hidden="true" /> {isMrdss ? 'Submit resolution for final review' : 'Submit resolution to MRDSS'}
                            </button>
                          </div>
                        </>
                      )}

                      {selectedWorkflowStage === 'final_tagging' && (
                        <>
                          <div className="mrdss-closed-resolution">
                            <div><span>Resolved by</span><strong>{selectedCase.resolvedBy || 'Handling team'}</strong></div>
                            <div><span>Resolution submitted</span><strong>{selectedCase.resolvedAt ? formatConcernDate(selectedCase.resolvedAt) : 'Not recorded'}</strong></div>
                            <div><span>Resolution details</span><p>{selectedCase.resolutionDetails || 'No resolution details recorded.'}</p></div>
                          </div>
                          {isMrdss && selectedCaseCanHandle && <>
                            <label className="mrdss-field mrdss-workflow-target">
                              <span>Final case tag</span>
                              <input value={resolutionTagDraft} onChange={(event) => { setResolutionTagDraft(event.target.value); setWorkflowError(''); }} maxLength={120} placeholder="Enter the final resolution tag" disabled={savingCaseId === selectedCase.id} />
                            </label>
                            <label className="mrdss-field mrdss-workflow-target">
                              <span>Closure remarks</span>
                              <textarea value={closureRemarksDraft} onChange={(event) => { setClosureRemarksDraft(event.target.value); setWorkflowError(''); }} rows={2} maxLength={1000} placeholder="Record MRDSS final review and closure remarks." disabled={savingCaseId === selectedCase.id} />
                            </label>
                            <div className="mrdss-action-row mrdss-action-row--final">
                              <button type="button" className="mrdss-button mrdss-button--primary" onClick={() => applyWorkflowAction('close_case')} disabled={savingCaseId === selectedCase.id}>
                                <CheckCircle2 size={16} aria-hidden="true" /> Apply final tag and close
                              </button>
                            </div>
                          </>}
                        </>
                      )}

                      {showWorkflowNote && selectedWorkflowStage === 'final_tagging' && selectedCase.status !== 'Waiting for Member' && (
                        <>
                          <label className="mrdss-field mrdss-workflow-target">
                            <span>{workflowNoteLabel}</span>
                            <textarea value={workflowNote} onChange={(event) => { setWorkflowNote(event.target.value); setWorkflowError(''); }} rows={2} maxLength={1000} placeholder={workflowNotePlaceholder} disabled={savingCaseId === selectedCase.id} />
                          </label>
                          <div className="mrdss-action-row mrdss-action-row--final">
                            <button type="button" className="mrdss-button mrdss-button--secondary" onClick={() => applyWorkflowAction('return_for_action')} disabled={savingCaseId === selectedCase.id}>
                              <RotateCcw size={16} aria-hidden="true" /> Return for additional work
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  ) : selectedWorkflowStage === 'closed' ? (
                    <div className="mrdss-closed-resolution">
                      {selectedCase.closureOutcome === 'unable_to_contact' ? (
                        <>
                          <div><span>Closure outcome</span><strong>Unable to contact</strong></div>
                          <div><span>Resolution</span><p>Not resolved. No response was received from the member.</p></div>
                        </>
                      ) : (
                        <>
                          <div><span>Final tag</span><strong>{selectedCase.resolutionTag}</strong></div>
                          <div><span>Resolution</span><p>{selectedCase.resolutionDetails}</p></div>
                        </>
                      )}
                      <div><span>Closure remarks</span><p>{selectedCase.closureRemarks || 'No closure remarks recorded.'}</p></div>
                      {selectedCaseCanReopen && <div className="mrdss-workflow-target">
                        <label className="mrdss-field"><span>Reopen reason</span><textarea value={workflowNote} onChange={(event) => { setWorkflowNote(event.target.value); setWorkflowError(''); }} rows={2} maxLength={1000} /></label>
                        <button type="button" className="mrdss-button mrdss-button--secondary" onClick={() => applyWorkflowAction(selectedCase.closureOutcome === 'unable_to_contact' ? 'reopen_unreachable' : 'reopen_case')} disabled={savingCaseId === selectedCase.id}>Reopen case</button>
                      </div>}
                    </div>
                  ) : (
                    <p className="mrdss-readonly-notice">This concern is in another authorized handler's queue. You can review its complete case history here, but cannot edit it.</p>
                  )}
                </section>

                <section className="mrdss-work-section mrdss-case-trail">
                  <div className="mrdss-section-heading">
                    <h3>Case trail</h3>
                  </div>
                  <ol className="mrdss-activity-list">
                    {getCaseTrailActivities(selectedCase.activities).map((activity) => {
                      const ChannelIcon = ['Contact', 'First response'].includes(activity.type) ? MessageCircle : activity.type === 'Submitted' ? CalendarClock : CircleAlert;
                      const roleName = ({
                        mrdss_admin: 'MRDSS Admin', branch_manager_admin: 'Branch Admin',
                        area_manager_admin: 'Area Manager', coo_admin: 'COO', superadmin: 'Superadmin',
                        public: 'Member', system: 'System',
                      })[activity.actorRole] || activity.actorRole;
                      const route = activity.route;
                      const routeChanged = route && route.toType !== 'closed' && (
                        route.fromType !== route.toType
                        || route.fromBranchId !== route.toBranchId
                        || route.fromAreaId !== route.toAreaId
                        || route.fromUserId !== route.toUserId
                      );
                      const routeText = routeChanged
                        ? `${getRouteLabel(route.fromType, route.fromBranchId, route.fromAreaId, branchDestinations)} to ${getRouteLabel(route.toType, route.toBranchId, route.toAreaId, branchDestinations)}`
                        : '';
                      return (
                        <li key={activity.id}>
                          <span className="mrdss-activity-icon"><ChannelIcon size={15} aria-hidden="true" /></span>
                          <div>
                            <strong>{activity.displayType}</strong>
                            {activity.detail && <p>{activity.detail}</p>}
                            {routeText && <p className="mrdss-activity-route">Route change: {routeText}</p>}
                            <time dateTime={activity.at}>{formatConcernDate(activity.at)}{activity.actor ? ` by ${activity.actor}` : ''}{roleName ? `, ${roleName}` : ''}</time>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </section>
                  </div>

                  <aside className="mrdss-case-context-column" aria-label="Member context and follow-up">
                {isMrdss && ['mrdss_review', 'final_tagging'].includes(selectedWorkflowStage) && (
                <div className="mrdss-detail-controls mrdss-context-controls">
                  {isMrdss && selectedWorkflowStage === 'mrdss_review' && (
                  <label className="mrdss-field">
                    <span>MRDSS coordinator</span>
                    <select value={selectedCase.assignedStaffId || ''} onChange={(event) => updateAssignee(event.target.value)} disabled={savingCaseId === selectedCase.id}>
                      <option value="">Unassigned</option>
                      {staff.map((person) => <option key={person.id} value={person.id}>{person.full_name}</option>)}
                    </select>
                  </label>
                  )}
                  {isMrdss && ['mrdss_review', 'final_tagging'].includes(selectedWorkflowStage) && <label className="mrdss-field">
                    <span>Priority</span>
                    <select value={PRIORITIES.includes(selectedCase.priority) ? selectedCase.priority : 'Normal'} onChange={(event) => updateCase(selectedCase.id, 'set_priority', { priority: event.target.value })} disabled={savingCaseId === selectedCase.id}>
                      {PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}
                    </select>
                  </label>}
                </div>
                )}
                <h3 className="mrdss-context-title">Member details</h3>
                <section className="mrdss-member-contact" aria-label="Member contact details">
                  <div><span>Origin branch</span><strong><Building2 size={15} aria-hidden="true" /> {branchDestinations.find((branch) => branch.id === selectedCase.originBranchId)?.name || selectedCase.branch}</strong></div>
                  <div><span>Preferred method</span><strong>{selectedCase.preferredContact}</strong></div>
                  <div><span>Phone</span><strong>{selectedCase.phone || 'Not provided'}</strong></div>
                  <div><span>Email</span><strong>{selectedCase.email || 'Not provided'}</strong></div>
                </section>

                <section className="mrdss-message-section">
                  <h3>Member message</h3>
                  <p>{selectedCase.message}</p>
                  {selectedCase.attachment && (
                    <button type="button" className="mrdss-attachment" title="Open attachment" onClick={() => openAttachment(selectedCase.attachment)}>
                      <FileText size={16} aria-hidden="true" /> {selectedCase.attachment.name}
                    </button>
                  )}
                </section>

                {showContactFollowup && <section className="mrdss-work-section">
                  <div className="mrdss-section-heading">
                    <div><h3>Contact follow-up</h3><p>Log a contact attempt or outcome here. This records activity only; it does not send a message.</p></div>
                  </div>
                  {selectedCaseCanHandle && <div className="mrdss-contact-closure-status" aria-live="polite">
                    <strong>Unable-to-contact closure</strong>
                    <p>{selectedUnableContactReadiness.attemptCount} of 3 no-response attempts logged; {selectedUnableContactReadiness.businessDaysElapsed} of 5 business days elapsed.</p>
                    <span>{selectedUnableContactReadiness.memberReached
                      ? 'A successful contact is recorded, so this case cannot use the unable-to-contact outcome.'
                      : selectedUnableContactReadiness.eligible
                        ? 'Final notice recorded. The case may be closed without a resolution tag.'
                        : selectedUnableContactReadiness.finalNoticeAt
                          ? 'Final notice recorded, but the three-attempt and waiting-period requirements are not both met.'
                          : selectedUnableContactReadiness.canSendFinalNotice
                            ? 'The final notice can now be recorded.'
                            : 'After three no-response attempts and five weekdays, record a final notice before closing.'}</span>
                  </div>}
                  {selectedCaseCanHandle
                    ? <ContactLogForm
                      key={selectedCase.id}
                      selectedCase={selectedCase}
                      readiness={selectedUnableContactReadiness}
                      onSave={recordContact}
                      isSaving={savingCaseId === selectedCase.id}
                      extraActions={(
                        <>
                          {selectedCase.status === 'Waiting for Member' ? (
                            <button type="button" className="mrdss-button mrdss-button--quiet" onClick={() => applyWorkflowAction('resume_review')} disabled={savingCaseId === selectedCase.id}>
                              Resume review
                            </button>
                          ) : (
                            <button type="button" className="mrdss-button mrdss-button--quiet" onClick={() => applyWorkflowAction('wait_for_member')} disabled={savingCaseId === selectedCase.id} aria-label="Set status to Waiting for Member">
                              Wait for member
                            </button>
                          )}
                          {selectedUnableContactReadiness?.eligible && <button type="button" className="mrdss-button mrdss-button--danger" onClick={() => applyWorkflowAction('close_unreachable')} disabled={savingCaseId === selectedCase.id}>
                            Close as unable to contact
                          </button>}
                        </>
                      )}
                    />
                    : <p className="mrdss-readonly-notice">Contact follow-up is available only to the current handler.</p>}
                </section>}
                <div className="mrdss-case-utility-actions">
                  <button type="button" className="mrdss-button mrdss-button--secondary mrdss-case-print" onClick={() => setPrintTarget('case')}>
                    <Printer size={15} aria-hidden="true" /> Print case
                  </button>
                  {admin?.role === 'superadmin' && (
                    <button
                      type="button"
                      className="mrdss-button mrdss-button--danger mrdss-case-delete"
                      onClick={() => deleteCase(selectedCase)}
                      disabled={savingCaseId === selectedCase.id || deletingCaseId === selectedCase.id}
                      title="Delete case"
                      aria-label={`Delete case ${selectedCase.id}`}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                      Delete case
                    </button>
                  )}
                </div>
                  </aside>
                </div>
              </>
            ) : (
              <div className="mrdss-empty-detail">
                <h2>No case selected</h2>
                <p>Choose a case from the queue to review its details.</p>
              </div>
            )}
          </div>
          </div>}
        </section>
        )}
      </div>
          </section>
        </div>
      </div>
    </main>
    {printTarget && typeof document !== 'undefined' && createPortal(
      printTarget === 'report'
        ? <ReportPrintDocument cases={reportSelectedPeriodCases} filterSummary={`${reportFilterSummary} | Period: ${selectedPeriodItem?.name || 'All matching cases'}`} adminName={admin?.name || admin?.full_name || 'MRDSS Admin'} />
        : <CasePrintDocument caseItem={selectedCase} adminName={admin?.name || admin?.full_name || 'MRDSS Admin'} />,
      document.body
    )}
    </>
  );
}

export default function MrdssAdminPage() {
  return (
    <Suspense fallback={<main className="mrdss-access-page"><p className="mrdss-auth-loading">Checking MRDSS access...</p></main>}>
      <MrdssAdminWorkspace />
    </Suspense>
  );
}
