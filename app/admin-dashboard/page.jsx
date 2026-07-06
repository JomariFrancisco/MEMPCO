'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  ImageIcon,
  Megaphone,
  Menu,
  MessageCircle,
  Monitor,
  Paperclip,
  Plus,
  Printer,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  UserRound,
  Wrench,
  X,
} from 'lucide-react';
import {
  BRANCHES,
  BURNOUT_TICKET_STATUSES,
  DEPARTMENTS,
  ESCALATION_PARTNERS,
  SLA_LEVELS,
  SUPPORT_CATEGORIES,
  TECHNICIANS,
  TICKET_STATUSES,
  isUnresolved,
  slugify,
} from '../portalStorage';
import {
  createPortalUser,
  deletePortalUser,
  getCurrentPortalUser,
  INACTIVE_ACCOUNT_MESSAGE,
  isAdminRole,
  isInactivePortalUser,
  listPortalUsers,
  signOutPortal,
  updatePortalUser,
} from '@/lib/auth/portalAuth';
import {
  claimTicketLock,
  canTicketAcceptMessages,
  createTicketMessage,
  deleteTicket,
  getTicketMessages,
  getTickets,
  isTicketBeingHandled,
  releaseTicketLock,
  subscribeToTicket,
  subscribeToTicketMessages,
  subscribeToTickets,
  updateTicket,
} from '@/lib/tickets/portalTickets';
import './admin-dashboard.css';

/* =========================
   ROUTES
========================= */

const LOGIN_ROUTE = '/LogIn';
const HRMAX_ROUTE = 'http://120.28.214.253/hrmax/';
const MARKETING_ADMIN_ROUTE = '/marketing-admin';
const HR_ADMIN_ROUTE = '/hr-admin';
const TRANSITION_DURATION = 560;
const REPORT_PERIOD_OPTIONS = [
  { key: 'day', label: 'Day', title: 'Tickets by Day', meta: 'Daily submissions' },
  { key: 'week', label: 'Week', title: 'Tickets by Week', meta: 'Weekly volume' },
  { key: 'month', label: 'Month', title: 'Tickets by Month', meta: 'Monthly trend' },
];
const REPORT_PERIOD_PAGE_SIZE = 8;
const DASHBOARD_QUEUE_PAGE_SIZE = 2;
const SELECTED_DAY_TICKET_PAGE_SIZE = 2;
const PHOTO_MAX_SIZE = 4 * 1024 * 1024;
const PHOTO_MAX_COUNT = 5;
const PHOTO_ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp';
const PHOTO_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const BURNOUT_STANDARD_MIN_DAYS = 3;
const BURNOUT_TARGET_DAYS = 5;
const BURNOUT_STANDARD_MESSAGE = 'Did not meet the standard procedure date';
const BURNOUT_ACTIVE_STATUS_KEYS = ['submitted', 'for inspection', 'under burnout'];
const BURNOUT_MONITORING_STATUS_KEYS = ['under burnout'];
const BURNOUT_CLOSED_STATUS_KEYS = [
  'passed burnout',
  'ready for deployment',
  'deployed',
  'failed burnout',
  'damaged',
  'for repair',
  'for replacement',
  'resolved',
  'cancelled',
  'canceled',
];
const BURNOUT_STATUS_FALLBACKS = {
  created: 'Submitted',
  pending: 'For Inspection',
  modified: 'For Inspection',
  'in progress': 'Under Burnout',
  escalated: 'Under Burnout',
  'moved date': 'Under Burnout',
  resolved: 'Passed Burnout',
  'ready for deployment': 'Ready for Deployment',
  deployed: 'Deployed',
  canceled: 'Cancelled',
  cancelled: 'Cancelled',
};
const BURNOUT_TEST_ITEMS = [
  ['physical-inspection', 'Physical Inspection', 'Check for physical damage, loose parts, or defects', 'No visible defects'],
  ['power-test', 'Power Test', 'Verify computer powers on properly', 'Booted normally'],
  ['bios-check', 'BIOS Check', 'Verify BIOS settings and hardware detection', 'All hardware detected'],
  ['cpu-stress-test', 'CPU Stress Test', 'Run system under load to check CPU stability', 'Stable during stress test'],
  ['memory-test', 'Memory (RAM) Test', 'Test RAM for errors', 'No memory errors detected'],
  ['storage-test', 'Storage Test', 'Check SSD/HDD health and read/write performance', 'Storage health 100%'],
  ['temperature-monitoring', 'Temperature Monitoring', 'Check system temperature during testing', 'Temperature within normal range'],
  ['usb-ports', 'USB Ports', 'Test USB ports functionality', 'All ports working'],
  ['keyboard', 'Keyboard', 'Test all keys', 'Fully functional keyboard'],
  ['mouse-touchpad', 'Mouse / Touchpad', 'Verify functionality', 'Working properly'],
  ['display-monitor', 'Display / Monitor', 'Check screen quality and dead pixels', 'No dead pixels'],
  ['network-test', 'Network Test', 'Check LAN / Wi-Fi connectivity', 'LAN connection stable'],
  ['audio-test', 'Audio Test', 'Check speakers and audio output', 'Clear audio output'],
  ['camera-test', 'Camera Test (if laptop)', 'Verify webcam functionality', 'Working properly'],
];
const BURNOUT_SOFTWARE_ITEMS = [
  ['operating-system', 'Operating System', 'The main software that runs the computer and allows programs to work.', 'Windows 11 Home Single'],
  ['windows-update', 'Windows Update', 'Updates that improve security, fix problems, and keep Windows up to date.', 'Updated as of May'],
  ['device-drivers', 'Device Drivers', 'Software that helps the computer communicate with hardware like printers and network devices.', 'All drivers installed'],
  ['antivirus-endpoint-security', 'Antivirus/Endpoint Security', 'Software that protects the computer from viruses and other threats.', 'Microsoft Defender Enabled'],
  ['office-productivity', 'Office Productivity', 'Programs used to create documents, spreadsheets, and presentations.', 'Microsoft Office 2016'],
  ['pdf-reader', 'PDF Reader', 'Software used to open and read PDF files.', 'Adobe Acrobat Reader'],
  ['web-browser', 'Web Browser', 'Program used to access websites and online systems.', 'Edge'],
  ['gpedit-msc', 'GPEdit msc', 'For network setup and connectivity.', 'Connected to MCO Server'],
];
const BURNOUT_MONITORING_ITEMS = [
  ['system-stability', 'System Stability', 'Stable', 'No system crash'],
  ['system-temperature', 'System Temperature', 'Normal', 'Max temp 95C'],
  ['unexpected-shutdown', 'Unexpected Shutdown', 'None', 'System stable'],
  ['error-messages', 'Error Messages', 'None', 'No system error'],
  ['performance-issues', 'Performance Issues', 'None', 'Smooth performance'],
];
const BURNOUT_EVALUATION_ITEMS = [
  ['hardware-condition', 'Hardware Condition', 'Pass', 'Unit passed burn-in testing and is ready for turnover to admin'],
  ['software-installation', 'Software Installation', 'Complete', 'Software checklist completed'],
];

const MonoIcon = ({ icon: IconComponent }) => (
  <IconComponent className="admin-mono-icon" aria-hidden="true" />
);

const adminTransitionLabels = {
  dashboard: 'Opening admin dashboard...',
  tickets: 'Loading ticket queue...',
  'support-tickets': 'Loading support tickets...',
  'burnout-tickets': 'Loading burnout tickets...',
  branches: 'Loading branch monitor...',
  reports: 'Preparing reports...',
  users: 'Loading user management...',
  'create-user': 'Preparing account form...',
  logout: 'Signing out...',
};

function PortalTransitionLoader({ label }) {
  return (
    <div className="portal-transition-loader" role="status" aria-live="polite" aria-label={label}>
      <div className="portal-transition-card">
        <img src="/Logos/Logo.png" alt="" aria-hidden="true" />
      </div>
    </div>
  );
}

function InactiveAccountNotice() {
  return (
    <>
      <main className="portal-main portal-app-main">
        <div className="portal-shell">
          <section className="panel-card glass admin-hero-panel">
            <div>
              <span className="section-kicker">Access Restricted</span>
              <h2>{INACTIVE_ACCOUNT_MESSAGE}</h2>
              <p>You will be redirected to the home page in 5 seconds.</p>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

function useBodyScrollLock(active) {
  useEffect(() => {
    if (!active || typeof document === 'undefined') return undefined;

    const originalOverflow = document.body.style.overflow;
    const originalRootOverflow = document.documentElement.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.documentElement.style.overflow = originalRootOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [active]);
}

const emptyCreateUserForm = {
  name: '',
  employeeId: '',
  department: '',
  branch: '',
  designation: '',
  email: '',
  phone: '',
  role: 'employee',
  password: '',
  confirmPassword: '',
};

const USER_EDIT_STATUSES = ['Active', 'Inactive'];

const normalizeUserEditStatus = (status = '') => {
  const normalizedStatus = String(status || '').trim();
  if (normalizedStatus === 'Locked') return 'Inactive';
  return USER_EDIT_STATUSES.includes(normalizedStatus) ? normalizedStatus : 'Active';
};

const toUserEditForm = (user) => ({
  id: user.id,
  name: user.name || '',
  employeeId: user.employeeId || '',
  department: user.department || '',
  branch: user.branch || user.office || '',
  designation: user.designation || '',
  email: user.email || '',
  phone: user.phone || '',
  role: user.role || 'employee',
  status: normalizeUserEditStatus(user.status || 'Active'),
  password: '',
  confirmPassword: '',
});

const formatPhoneNumber = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  const first = digits.slice(0, 4);
  const second = digits.slice(4, 7);
  const third = digits.slice(7, 11);

  return [first, second, third].filter(Boolean).join(' ');
};

const formatFileSize = (bytes = 0) => {
  if (!bytes) return '0 KB';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
};

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Unable to read file.'));
    reader.readAsDataURL(file);
  });

const isPhotoFile = (file) =>
  Boolean(
    file &&
      (PHOTO_ALLOWED_TYPES.includes(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name || ''))
  );

const filesToPhotoAttachments = async (files = [], existingCount = 0) => {
  const selectedFiles = Array.from(files || []);

  if (!selectedFiles.length) return [];

  if (existingCount + selectedFiles.length > PHOTO_MAX_COUNT) {
    throw new Error(`You can attach up to ${PHOTO_MAX_COUNT} photos only.`);
  }

  const invalidFile = selectedFiles.find((file) => !isPhotoFile(file));

  if (invalidFile) {
    throw new Error('Photo attachments must be JPG, JPEG, PNG, or WEBP files.');
  }

  const oversizedFile = selectedFiles.find((file) => file.size > PHOTO_MAX_SIZE);

  if (oversizedFile) {
    throw new Error('Each photo must not exceed 4 MB.');
  }

  return Promise.all(
    selectedFiles.map(async (file) => ({
      id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${file.name}`,
      name: file.name,
      type: file.type || 'image/jpeg',
      size: file.size,
      sizeLabel: formatFileSize(file.size),
      uploadedAt: new Date().toLocaleString(),
      dataUrl: await fileToDataUrl(file),
    }))
  );
};

/* =========================
   ICONS
========================= */

const Icon = {
  Dashboard: () => (
    <svg className="sidebar-nav-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M3 3a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V3zm8 0a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1V3zM3 13a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4zm8-3a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z" />
    </svg>
  ),
  Tickets: () => (
    <svg className="sidebar-nav-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 100 4v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2a2 2 0 100-4V6zm6-1v10h2V5H8z" />
    </svg>
  ),
  Burnout: () => (
    <svg className="sidebar-nav-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M6 2a1 1 0 011.67-.74c3.28 2.98 5.9 6.1 5.9 9.67 0 1.1-.33 2.14-.9 3 .92-.73 1.5-1.86 1.5-3.25 0-.79-.17-1.55-.49-2.25a1 1 0 011.55-1.17A7.1 7.1 0 0118 12.8C18 16.37 15.1 19 10.52 19 6.28 19 3 16.48 3 12.3c0-1.7.71-3.36 1.66-4.87C5.58 5.97 6 4.21 6 2zm4.42 14.95c1.57 0 2.72-.92 2.72-2.36 0-1.23-.76-2.46-2.4-4.15-.22 1.16-.75 2.14-1.43 3-.5.64-.82 1.13-.82 1.82 0 1.02.82 1.69 1.93 1.69z" />
    </svg>
  ),
  Branches: () => (
    <svg className="sidebar-nav-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10.707 1.293a1 1 0 00-1.414 0l-7 7A1 1 0 003 10h1v7a1 1 0 001 1h4v-5h2v5h4a1 1 0 001-1v-7h1a1 1 0 00.707-1.707l-7-7z" />
    </svg>
  ),
  Reports: () => (
    <svg className="sidebar-nav-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v6H2v-6zm6-5a1 1 0 011-1h2a1 1 0 011 1v11H8V6zm6-3a1 1 0 011-1h2a1 1 0 011 1v14h-4V3z" />
    </svg>
  ),
  Users: () => (
    <svg className="sidebar-nav-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 16v-1a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v1h-3zM4.75 12.094A5.973 5.973 0 004 15v1H1v-1a3 3 0 013.75-2.906z" />
    </svg>
  ),
  UserPlus: () => (
    <svg className="sidebar-nav-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M8 9a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2 17a6 6 0 1112 0v1H2v-1zM15 5a1 1 0 112 0v2h2a1 1 0 110 2h-2v2a1 1 0 11-2 0V9h-2a1 1 0 110-2h2V5z" />
    </svg>
  ),
  Logout: () => (
    <svg className="sidebar-nav-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
    </svg>
  ),
  Bell: () => (
    <svg className="icon-bell" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 17h5l-1.4-1.4a2 2 0 01-.6-1.4V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5" />
      <path d="M10 17a2 2 0 004 0" />
    </svg>
  ),
};

/* =========================
   HELPERS
========================= */

const normalizeDate = (ticket) => {
  const raw = ticket.lastUpdated || ticket.adminUpdatedAt || ticket.lastEmployeeUpdate || ticket.createdAt || ticket.date;
  const parsed = new Date(raw).getTime();

  return Number.isNaN(parsed) ? 0 : parsed;
};

const sortTickets = (items = []) =>
  [...items].sort((a, b) => normalizeDate(b) - normalizeDate(a));

const countBy = (items, key) =>
  items.reduce((acc, item) => {
    const value = item[key] || 'Unspecified';
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});

const normalizeTicketStatus = (status) =>
  String(status || '')
    .trim()
    .toLowerCase()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ');

const normalizePortalRole = (role = '') =>
  String(role || '')
    .trim()
    .toLowerCase()
    .replace(/[-_\s]+/g, '');

const USER_ACCOUNT_STATUSES = [
  'Active',
  'Pending Setup',
  'Password Reset Required',
  'Locked',
  'Inactive',
];

const ROLE_LABELS = {
  employee: 'Employee',
  admin: 'ICT Admin',
  marketing_admin: 'Marketing Admin',
  hr_admin: 'HR Admin',
  superadmin: 'Super Admin',
};

const formatRoleLabel = (role = '') => ROLE_LABELS[role] || role || 'Employee';

const getInitials = (value = '') => {
  const words = String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) return 'NA';

  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || '')
    .join('');
};

const normalizeComparable = (value = '') =>
  String(value || '').trim().toLowerCase();

const isPrivilegedPortalRole = (role = '') => {
  const normalizedRole = normalizePortalRole(role);
  return normalizedRole === 'admin' || normalizedRole === 'superadmin';
};

const isTicketStatus = (ticket, status) =>
  normalizeTicketStatus(ticket?.status) === normalizeTicketStatus(status);

const isMovedDateTicket = (ticket) => isTicketStatus(ticket, 'Moved Date');

const isTicketResolved = (ticket) => isTicketStatus(ticket, 'Resolved');

const isTicketInProgress = (ticket) => isTicketStatus(ticket, 'In Progress');

const getBurnoutWorkflowStatus = (status) => {
  const normalized = normalizeTicketStatus(status);

  return BURNOUT_STATUS_FALLBACKS[normalized] || BURNOUT_TICKET_STATUSES.find(
    (item) => normalizeTicketStatus(item) === normalized
  ) || 'Submitted';
};

const isBurnoutClosedStatus = (status) =>
  BURNOUT_CLOSED_STATUS_KEYS.includes(normalizeTicketStatus(status));

const isBurnoutMonitoringStatus = (status) =>
  BURNOUT_MONITORING_STATUS_KEYS.includes(normalizeTicketStatus(status));

const hasAssignedTechnician = (ticket) => {
  const technician = String(ticket?.technician || '').trim().toLowerCase();

  return Boolean(technician && technician !== 'unassigned');
};

const EMPLOYEE_LOCKED_STATUSES = [
  'moved date',
  'in progress',
  'escalated',
  'resolved',
  'canceled',
  'for inspection',
  'under burnout',
  'passed burnout',
  'ready for deployment',
  'deployed',
  'failed burnout',
  'damaged',
  'for repair',
  'for replacement',
  'cancelled',
];

const getEmployeeTicketLockReason = (ticket) => {
  const status = normalizeTicketStatus(ticket?.status);

  if (status === 'for inspection') return 'Burnout request is already queued for unit inspection.';
  if (status === 'under burnout') return 'Unit is already under Burnout monitoring.';
  if (status === 'passed burnout') return 'Unit already passed Burnout testing.';
  if (status === 'ready for deployment') return 'Unit is ready for deployment.';
  if (status === 'deployed') return 'Unit was already deployed.';
  if (status === 'failed burnout') return 'Unit failed Burnout testing.';
  if (status === 'damaged') return 'Unit was marked as damaged by ICT/Admin.';
  if (status === 'for repair') return 'Unit was marked for repair by ICT/Admin.';
  if (status === 'for replacement') return 'Unit was marked for replacement by ICT/Admin.';
  if (status === 'moved date') return 'Moved date was already set by ICT/Admin.';
  if (status === 'in progress') return 'Ticket is already in progress.';
  if (status === 'escalated') return 'Ticket was already escalated.';
  if (status === 'resolved') return 'Ticket was already resolved.';
  if (status === 'canceled') return 'Ticket was already canceled.';
  if (hasAssignedTechnician(ticket)) {
    return `Ticket is already assigned to ${ticket.technician}.`;
  }

  if (ticket?.workStartedAt) return 'ICT/Admin already started working on this ticket.';

  if (ticket?.employeeEditLockReason) return ticket.employeeEditLockReason;

  return 'Ticket is not yet catered and can still be edited by the employee.';
};

const isEmployeeLockedTicket = (ticket) => {
  const status = normalizeTicketStatus(ticket?.status);

  return (
    Boolean(ticket?.employeeEditLocked) ||
    EMPLOYEE_LOCKED_STATUSES.includes(status) ||
    hasAssignedTechnician(ticket) ||
    Boolean(ticket?.workStartedAt)
  );
};

const isHighOrCriticalSla = (sla) => ['high', 'critical'].includes(String(sla || '').trim().toLowerCase());

const isSlaWatchTicket = (ticket) =>
  isHighOrCriticalSla(ticket.sla) &&
  isUnresolved(ticket.status) &&
  !isMovedDateTicket(ticket);

const buildSummary = (tickets) => {
  const total = tickets.length;
  const active = tickets.filter((ticket) => isUnresolved(ticket.status)).length;
  const created = tickets.filter((ticket) => isTicketStatus(ticket, 'Created')).length;
  const pending = tickets.filter((ticket) => isTicketStatus(ticket, 'Pending')).length;
  const modified = tickets.filter((ticket) => isTicketStatus(ticket, 'Modified')).length;
  const movedDate = tickets.filter(isMovedDateTicket).length;
  const inProgress = tickets.filter(isTicketInProgress).length;
  const resolved = tickets.filter(isTicketResolved).length;
  const critical = tickets.filter(isSlaWatchTicket).length;
  const saar = tickets.filter((ticket) => ticket.saarRequired || ticket.saarAttachment?.name).length;

  return { total, active, created, pending, modified, movedDate, inProgress, resolved, critical, saar };
};

const breakdown = (tickets, key, source = []) => {
  const counts = countBy(tickets, key);
  const names = source.length
    ? Array.from(new Set([...source, ...Object.keys(counts)]))
    : Object.keys(counts);

  return names
    .map((name) => ({ name, count: counts[name] || 0 }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
};

const getSubmittedTime = (ticket) => {
  const raw = ticket.createdAt || ticket.date || ticket.lastEmployeeUpdate || ticket.lastUpdated;
  const parsed = new Date(raw || '').getTime();

  return Number.isNaN(parsed) ? 0 : parsed;
};

const formatReportDate = (date, options) =>
  new Intl.DateTimeFormat('en-US', options).format(date);

const getWeekStart = (date) => {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);

  return start;
};

const buildDateBreakdown = (tickets, mode) => {
  const buckets = new Map();

  tickets.forEach((ticket) => {
    getTicketReportEvents(ticket).forEach((event) => {
      const period = getPeriodBucketForTimestamp(event.timestamp, mode);

      if (!period) return;

      const current = buckets.get(period.key) || {
        name: period.name,
        count: 0,
        timestamp: period.timestamp,
      };

      current.count += 1;
      buckets.set(period.key, current);
    });
  });

  return [...buckets.values()].sort((a, b) => b.timestamp - a.timestamp);
};

const getDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getTicketResolvedTime = (ticket) => {
  if (!isTicketResolved(ticket)) return 0;

  const raw = ticket.workEndedAt || ticket.adminUpdatedAt || ticket.lastUpdated;
  const parsed = new Date(raw || '').getTime();

  return Number.isNaN(parsed) ? 0 : parsed;
};

const hasTimeInDateLabel = (value = '') => /\d{1,2}:\d{2}|am|pm/i.test(String(value || ''));

const getStatusHistoryEventTime = (ticket, expectedType, expectedStatus) => {
  const history = Array.isArray(ticket?.statusHistory) ? ticket.statusHistory : [];
  const matchedEntry = history.find((entry) => {
    const entryType = String(entry?.type || '').trim().toLowerCase();
    const entryStatus = normalizeTicketStatus(entry?.status || entry?.label);

    return entryType === expectedType || entryStatus === expectedStatus;
  });

  const parsed = new Date(matchedEntry?.timestamp || matchedEntry?.date || '').getTime();

  return Number.isNaN(parsed) ? 0 : parsed;
};

const getTicketMovedDateTime = (ticket) => {
  const historyMovedDate = getStatusHistoryEventTime(ticket, 'moved-date', 'moved date');

  if (historyMovedDate) return historyMovedDate;

  const storedMovedDate = ticket?.movedDateAt || ticket?.movedDate || ticket?.movedAt;
  const storedParsed = new Date(storedMovedDate || '').getTime();

  if (!Number.isNaN(storedParsed)) return storedParsed;

  if (hasTimeInDateLabel(ticket?.dateLabel)) {
    const dateLabelParsed = new Date(ticket.dateLabel).getTime();

    if (!Number.isNaN(dateLabelParsed)) return dateLabelParsed;
  }

  if (!isMovedDateTicket(ticket)) return 0;

  const fallback = ticket.adminUpdatedAt || ticket.lastUpdated || ticket.workStartedAt || ticket.createdAt || ticket.date;
  const fallbackParsed = new Date(fallback || '').getTime();

  return Number.isNaN(fallbackParsed) ? 0 : fallbackParsed;
};

const formatReportTimestamp = (timestamp, fallback = 'Not recorded') => {
  if (!timestamp) return fallback;

  return new Date(timestamp).toLocaleString();
};

const parsePortalTimestamp = (value) => {
  if (!value) return null;

  const normalized = String(value).replace(/(\.\d{3})\d+/, '$1');
  const parsed = new Date(normalized);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatCompactDate = (value, fallback = 'Not recorded') => {
  const parsed = parsePortalTimestamp(value);

  if (!parsed) return value || fallback;

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed);
};

const getTicketMovedDateLabel = (ticket) =>
  formatReportTimestamp(getTicketMovedDateTime(ticket));

const getTicketResolvedDateLabel = (ticket) =>
  formatReportTimestamp(getTicketResolvedTime(ticket));

const createTicketReportEvent = (ticket, { timestamp, label, type, status }) => {
  if (!timestamp) return null;

  const reportDate = new Date(timestamp);

  if (Number.isNaN(reportDate.getTime())) return null;

  const reportStatus = status || label;

  return {
    ticket,
    key: getDateKey(reportDate),
    timestamp,
    label,
    type,
    reportDate,
    reportDateLabel: formatReportTimestamp(timestamp),
    reportStatus,
  };
};

const getTicketStatusHistoryEvents = (ticket) => {
  const history = Array.isArray(ticket?.statusHistory) ? ticket.statusHistory : [];

  return history
    .map((entry) => {
      const timestamp = new Date(entry?.timestamp || entry?.date || '').getTime();
      const status = entry?.status || entry?.label || '';
      const normalizedStatus = normalizeTicketStatus(status);
      const type =
        entry?.type ||
        (normalizedStatus === 'moved date'
          ? 'moved-date'
          : normalizedStatus === 'resolved'
            ? 'resolved'
            : normalizedStatus === 'submitted'
              ? 'submitted'
              : 'status');

      return createTicketReportEvent(ticket, {
        timestamp,
        label: entry?.label || status || 'Status Update',
        type,
        status: status || entry?.label || 'Status Update',
      });
    })
    .filter(Boolean);
};

const getTicketReportEvents = (ticket) => {
  const historyEvents = getTicketStatusHistoryEvents(ticket);

  if (historyEvents.length) {
    const hasMovedDateEvent = historyEvents.some((event) => event.type === 'moved-date');
    const movedDateTime = getTicketMovedDateTime(ticket);

    if (hasMovedDateEvent || !movedDateTime) {
      return historyEvents;
    }

    return [
      ...historyEvents,
      createTicketReportEvent(ticket, {
        timestamp: movedDateTime,
        label: 'Moved Date',
        type: 'moved-date',
        status: 'Moved Date',
      }),
    ].filter(Boolean);
  }

  const events = [];
  const submittedTime = getSubmittedTime(ticket);
  const movedDateTime = getTicketMovedDateTime(ticket);

  if (movedDateTime) {
    events.push(createTicketReportEvent(ticket, {
      timestamp: movedDateTime,
      label: 'Moved Date',
      type: 'moved-date',
      status: 'Moved Date',
    }));
  } else if (submittedTime) {
    events.push(createTicketReportEvent(ticket, {
      timestamp: submittedTime,
      label: 'Submitted',
      type: 'submitted',
      status: 'Submitted',
    }));
  }

  const resolvedTime = getTicketResolvedTime(ticket);

  if (resolvedTime) {
    events.push(createTicketReportEvent(ticket, {
      timestamp: resolvedTime,
      label: 'Resolved',
      type: 'resolved',
      status: 'Resolved',
    }));
  }

  return events.filter(Boolean);
};

const getTicketCalendarMonth = (tickets) => {
  const latestTicketTime = tickets.reduce((latest, ticket) => {
    const latestEventTime = getTicketReportEvents(ticket).reduce(
      (eventLatest, event) => Math.max(eventLatest, event.timestamp),
      0
    );
    return latestEventTime > latest ? latestEventTime : latest;
  }, 0);

  const date = latestTicketTime ? new Date(latestTicketTime) : new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);

  return date;
};

const buildCalendarMonth = (tickets, monthDate) => {
  const target = new Date(monthDate);
  const year = target.getFullYear();
  const month = target.getMonth();
  const monthStart = new Date(year, month, 1);
  const gridStart = new Date(monthStart);
  const counts = new Map();
  const monthlyTicketEvents = getMonthlyTicketAnchorEvents(tickets, monthStart);

  gridStart.setDate(monthStart.getDate() - monthStart.getDay());

  monthlyTicketEvents.forEach((event) => {
    counts.set(event.key, (counts.get(event.key) || 0) + 1);
  });

  const todayKey = getDateKey(new Date());
  const cells = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);

    const key = getDateKey(date);
    const count = counts.get(key) || 0;

    return {
      key,
      count,
      day: date.getDate(),
      isToday: key === todayKey,
      isFuture: key > todayKey,
      isCurrentMonth: date.getMonth() === month,
    };
  });
  const maxCount = cells.reduce((max, cell) => Math.max(max, cell.count), 0);
  const currentMonthCells = cells.filter((cell) => cell.isCurrentMonth);
  const monthTotal = currentMonthCells.reduce((total, cell) => total + cell.count, 0);
  const activeDays = currentMonthCells.filter((cell) => cell.count > 0).length;
  const busiestDay = currentMonthCells.reduce(
    (busiest, cell) => (cell.count > busiest.count ? cell : busiest),
    { count: 0, day: 0, key: '' }
  );
  const averagePerActiveDay = activeDays ? (monthTotal / activeDays).toFixed(1) : '0';

  return {
    title: formatReportDate(monthStart, { month: 'long', year: 'numeric' }),
    cells,
    maxCount,
    monthTotal,
    activeDays,
    busiestDay,
    averagePerActiveDay,
  };
};

const escapePrintHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const getPrintLetterhead = () => `
  <header class="coop-letterhead">
    <div class="coop-logo-wrap">
      <img src="/Logos/Logo.png" alt="MEMPCO logo" />
    </div>
    <div class="coop-copy">
      <h1>Micro-Entrepreneurs Multi-Purpose Cooperative</h1>
      <p>3D3E HC Mktng. Bldg., Veterans Avenue, Zamboanga City, Philippines 7000</p>
      <p>CDA Registration No. 9520-09004207 &nbsp;&nbsp; TIN 005-848-165 NV</p>
      <div class="coop-contact">
        <span>(062) 991-7772</span>
        <span>www.mempco.coop</span>
        <span>itsupport@mempco.coop</span>
        <span>mempco.ph</span>
      </div>
    </div>
  </header>
`;

const openPrintDocument = (title, body) => {
  if (typeof window === 'undefined') return;

  const printWindow = window.open('', '_blank', 'width=960,height=720');
  if (!printWindow) {
    window.alert('Please allow pop-ups to print this document.');
    return;
  }

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${escapePrintHtml(title)}</title>
        <style>
          @page { size: 11in 8.5in; margin: 0.28in; }
          * { box-sizing: border-box; }
          html,
          body {
            width: 100%;
            margin: 0;
            padding: 0;
            color: #111827;
            font-family: Arial, Helvetica, sans-serif;
            background: #fff;
          }
          body {
            display: flex;
            justify-content: center;
            align-items: flex-start;
          }
          .print-page {
            width: 10.44in;
            max-width: 100%;
            min-height: 7.94in;
            margin: 0 auto;
            padding: 0;
            overflow: visible;
          }
          .coop-letterhead {
            display: grid;
            grid-template-columns: 96px minmax(0, 1fr) 96px;
            align-items: center;
            gap: 12px;
            padding: 0 0 7px;
            border-bottom: 3px solid #111827;
            box-shadow: inset 0 -1px 0 #dc2626;
            margin-bottom: 8px;
          }
          .coop-logo-wrap {
            width: 96px;
            text-align: center;
          }
          .coop-logo-wrap img {
            display: block;
            width: 82px;
            height: 82px;
            object-fit: contain;
            margin: 0 auto;
          }
          .coop-copy {
            grid-column: 2;
            text-align: center;
          }
          .coop-copy h1 {
            margin: 0;
            color: #dc2626;
            font-size: 20px;
            line-height: 1.05;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.04em;
          }
          .coop-copy p {
            margin: 1px 0;
            color: #000;
            font-size: 13px;
            line-height: 1.2;
          }
          .coop-contact {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 16px;
            margin-top: 3px;
            color: #000;
            font-size: 11.5px;
            font-weight: 700;
          }
          .doc-head {
            display: flex;
            justify-content: space-between;
            gap: 18px;
            align-items: end;
            margin: 6px 0 8px;
          }
          .doc-head h2 {
            margin: 0;
            color: #111827;
            font-size: 17px;
            line-height: 1.05;
            text-transform: uppercase;
            letter-spacing: 0.06em;
          }
          .meta { color: #64748b; font-size: 10px; font-weight: 800; text-align: right; line-height: 1.35; }
          .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
          .field, .row {
            padding: 7px 8px;
            border: 1px solid #e5e7eb;
            border-radius: 7px;
            background: #f8fafc;
          }
          .field span, .row span { display: block; color: #64748b; font-size: 8.5px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; }
          .field strong, .row strong { display: block; margin-top: 3px; font-size: 10.5px; line-height: 1.25; white-space: pre-wrap; }
          .section-title { margin: 8px 0 5px; font-size: 10px; color: #374151; text-transform: uppercase; letter-spacing: 0.08em; }
          .text-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
          .note { min-height: 45px; max-height: 74px; padding: 7px 8px; border: 1px solid #e5e7eb; border-radius: 7px; white-space: pre-wrap; line-height: 1.35; font-size: 10.5px; overflow: hidden; }
          .report-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin-top: 8px; }
          .report-list.single { grid-template-columns: 1fr; margin-top: 0; }
          .report-list.period-volume-list { grid-template-columns: repeat(4, minmax(0, 1fr)); margin-top: 0; }
          .report-row { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 8px; align-items: center; padding: 7px 8px; border: 1px solid #e5e7eb; border-radius: 7px; background: #f8fafc; font-size: 10.5px; }
          .report-row strong { min-width: 28px; text-align: right; color: #dc2626; }
          .report-row em { min-width: 32px; color: #64748b; font-style: normal; font-weight: 800; text-align: right; }
          .consolidated-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-top: 2px; }
          .ticket-detail-section { margin-top: 9px; page-break-inside: auto; }
          .detail-table { width: 100%; margin: 0 auto; border-collapse: collapse; table-layout: fixed; font-size: 8.5px; line-height: 1.25; }
          .detail-table th, .detail-table td { border: 1px solid #d1d5db; padding: 4px 5px; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
          .detail-table th { background: #111827; color: #fff; font-size: 7.5px; text-transform: uppercase; letter-spacing: 0.04em; }
          .detail-table tr { page-break-inside: avoid; }
          .detail-table th:nth-child(1), .detail-table td:nth-child(1) { width: 8%; }
          .detail-table th:nth-child(2), .detail-table td:nth-child(2) { width: 9%; }
          .detail-table th:nth-child(3), .detail-table td:nth-child(3) { width: 9%; }
          .detail-table th:nth-child(4), .detail-table td:nth-child(4) { width: 9%; }
          .detail-table th:nth-child(5), .detail-table td:nth-child(5) { width: 9%; }
          .detail-table th:nth-child(6), .detail-table td:nth-child(6) { width: 6%; }
          .detail-table th:nth-child(7), .detail-table td:nth-child(7) { width: 8%; }
          .detail-table th:nth-child(8), .detail-table td:nth-child(8) { width: 8%; }
          .detail-table th:nth-child(9), .detail-table td:nth-child(9) { width: 8%; }
          .detail-table th:nth-child(10), .detail-table td:nth-child(10) { width: 10%; }
          .detail-table th:nth-child(11), .detail-table td:nth-child(11) { width: 6%; }
          .detail-table th:nth-child(12), .detail-table td:nth-child(12) { width: 5%; }
          .detail-table th:nth-child(13), .detail-table td:nth-child(13) { width: 5%; }
          .burnout-print-section { page-break-inside: auto; }
          .burnout-print-table { margin-bottom: 7px; font-size: 7.4px; }
          .burnout-print-table th,
          .burnout-print-table td { width: auto !important; padding: 3px 4px; }
          .burnout-print-table th { font-size: 6.8px; }
          .period-detail-table { font-size: 7.4px; line-height: 1.18; }
          .period-detail-table th, .period-detail-table td { padding: 3px 3.5px; }
          .period-detail-table th { font-size: 6.7px; }
          .period-detail-table th:nth-child(1), .period-detail-table td:nth-child(1) { width: 8%; }
          .period-detail-table th:nth-child(2), .period-detail-table td:nth-child(2) { width: 6%; }
          .period-detail-table th:nth-child(3), .period-detail-table td:nth-child(3) { width: 7%; }
          .period-detail-table th:nth-child(4), .period-detail-table td:nth-child(4) { width: 8%; }
          .period-detail-table th:nth-child(5), .period-detail-table td:nth-child(5) { width: 8%; }
          .period-detail-table th:nth-child(6), .period-detail-table td:nth-child(6) { width: 8%; }
          .period-detail-table th:nth-child(7), .period-detail-table td:nth-child(7) { width: 8%; }
          .period-detail-table th:nth-child(8), .period-detail-table td:nth-child(8) { width: 7%; }
          .period-detail-table th:nth-child(9), .period-detail-table td:nth-child(9) { width: 8%; }
          .period-detail-table th:nth-child(10), .period-detail-table td:nth-child(10) { width: 8%; }
          .period-detail-table th:nth-child(11), .period-detail-table td:nth-child(11) { width: 10%; }
          .period-detail-table th:nth-child(12), .period-detail-table td:nth-child(12) { width: 5%; }
          .period-detail-table th:nth-child(13), .period-detail-table td:nth-child(13) { width: 4%; }
          .period-detail-table th:nth-child(14), .period-detail-table td:nth-child(14) { width: 5%; }
          .print-note { margin-top: 7px; color: #64748b; font-size: 9.5px; font-weight: 700; }
          @media print {
            body {
              padding: 0;
              display: flex;
              justify-content: center;
              align-items: flex-start;
            }
            .print-page {
              width: 10.44in;
              max-width: 100%;
              margin-left: auto;
              margin-right: auto;
            }
            .detail-table thead { display: table-header-group; }
            .detail-table tfoot { display: table-footer-group; }
          }
        </style>
      </head>
      <body>${body}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.setTimeout(() => {
    printWindow.print();
  }, 500);
};

const printResolvedTicket = (ticket) => {
  const burnoutReport = isBurnoutTicket(ticket) ? normalizeBurnoutReport(ticket) : null;
  const printTableRows = (rows, columns) =>
    (rows || []).map((row) => `
      <tr>
        ${columns.map(([key]) => `<td>${escapePrintHtml(row[key])}</td>`).join('')}
      </tr>
    `).join('');
  const burnoutSection = burnoutReport
    ? `
      <section class="ticket-detail-section burnout-print-section">
        <h3 class="section-title">Burnout Basic Information</h3>
        <div class="grid">
          ${[
            ['Branch', ticket.branch],
            ['Brand & Model', ticket.brand],
            ['Serial Number', ticket.serialNumber],
            ['Requester', ticket.requester || ticket.ownerEmail || 'Employee'],
            ['Custodian', ticket.custodian],
            ['Performed By', burnoutReport.performedBy],
            ['Department', ticket.department],
            ['Model / Device', ticket.deviceName || ticket.deviceType],
            ['Request Date', burnoutReport.requestedDate || ticket.createdAt],
            ['Start Date', burnoutReport.startDate],
            ['End Date', burnoutReport.endDate],
          ].map(([label, value]) => `
            <div class="field">
              <span>${escapePrintHtml(label)}</span>
              <strong>${escapePrintHtml(value || 'Not provided')}</strong>
            </div>
          `).join('')}
        </div>

        <h3 class="section-title">Testing Checklist</h3>
        <table class="detail-table burnout-print-table">
          <thead>
            <tr><th>Test Category</th><th>Test Description</th><th>Status</th><th>Remarks</th></tr>
          </thead>
          <tbody>
            ${printTableRows(burnoutReport.testingChecklist, [['category'], ['description'], ['status'], ['remarks']])}
          </tbody>
        </table>

        <h3 class="section-title">Software Installation Checklist</h3>
        <table class="detail-table burnout-print-table">
          <thead>
            <tr><th>Software</th><th>Description</th><th>Installed</th><th>Remarks</th></tr>
          </thead>
          <tbody>
            ${(burnoutReport.softwareChecklist || []).map((row) => `
              <tr>
                <td>${escapePrintHtml(row.software)}</td>
                <td>${escapePrintHtml(row.description)}</td>
                <td>${escapePrintHtml(row.installed ? 'Yes' : 'No')}</td>
                <td>${escapePrintHtml(row.remarks)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="text-grid">
          <section>
            <h3 class="section-title">Burnout Monitoring (3-5 Days)</h3>
            <table class="detail-table burnout-print-table">
              <thead><tr><th>Monitoring Item</th><th>Result</th><th>Remarks</th></tr></thead>
              <tbody>${printTableRows(burnoutReport.monitoring, [['item'], ['result'], ['remarks']])}</tbody>
            </table>
          </section>
          <section>
            <h3 class="section-title">Final Evaluation</h3>
            <table class="detail-table burnout-print-table">
              <thead><tr><th>Evaluation Item</th><th>Status</th><th>Remarks</th></tr></thead>
              <tbody>${printTableRows(burnoutReport.finalEvaluation, [['item'], ['status'], ['remarks']])}</tbody>
            </table>
          </section>
        </div>
      </section>
    `
    : '';
  const fieldRows = [
    ['Ticket Code', getTicketDisplayCode(ticket)],
    ['Record ID', ticket.id],
    ['Status', ticket.status],
    ['SLA', ticket.sla],
    ['Requester', ticket.requester || ticket.ownerEmail || 'Employee'],
    ['Employee ID', ticket.employeeId || 'Not provided'],
    ['Branch / Department', `${ticket.branch || 'Not provided'} / ${ticket.department || 'Not provided'}`],
    ['Support Category', ticket.supportCategory || 'Unspecified'],
    ['Concern Type', ticket.concernType || 'Unspecified'],
    ['Submitted', ticket.createdAt || ticket.date || 'Not provided'],
    ['Moved Date', getTicketMovedDateLabel(ticket)],
    ['Resolved Date', getTicketResolvedDateLabel(ticket)],
    ['Resolved / Updated', ticket.adminUpdatedAt || ticket.lastUpdated || 'Not provided'],
    ['Assigned ICT Staff', ticket.technician || 'Unassigned'],
    ['Device / System', ticket.deviceName || 'Not provided'],
  ];
  const body = `
    <main class="print-page">
      ${getPrintLetterhead()}
      <section class="doc-head">
        <h2>Resolved Ticket Report</h2>
        <div class="meta">Ticket ${escapePrintHtml(getTicketDisplayCode(ticket))}<br />Printed ${escapePrintHtml(new Date().toLocaleString())}</div>
      </section>
      <section class="grid">
        ${fieldRows.map(([label, value]) => `
          <div class="field">
            <span>${escapePrintHtml(label)}</span>
            <strong>${escapePrintHtml(value)}</strong>
          </div>
        `).join('')}
      </section>
      <div class="text-grid">
        <section>
          <h3 class="section-title">Description of Problem</h3>
          <div class="note">${escapePrintHtml(ticket.description || 'No description provided.')}</div>
        </section>
        <section>
          <h3 class="section-title">Action Taken</h3>
          <div class="note">${escapePrintHtml(ticket.actionTaken || 'No action recorded.')}</div>
        </section>
        <section>
          <h3 class="section-title">Resolution Notes</h3>
          <div class="note">${escapePrintHtml(ticket.resolution || 'No resolution notes recorded.')}</div>
        </section>
        <section>
          <h3 class="section-title">Admin Remarks</h3>
          <div class="note">${escapePrintHtml(ticket.adminRemarks || 'No remarks recorded.')}</div>
        </section>
      </div>
      ${burnoutSection}
    </main>
  `;

  openPrintDocument(`Resolved Ticket ${getTicketDisplayCode(ticket)}`, body);
};

const getPeriodBucketForTimestamp = (timestamp, mode) => {
  if (!timestamp) return null;

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) return null;

  if (mode === 'week') {
    const weekStart = getWeekStart(date);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    return {
      key: weekStart.toISOString(),
      name: `${formatReportDate(weekStart, { month: 'short', day: 'numeric' })} - ${formatReportDate(weekEnd, { month: 'short', day: 'numeric', year: 'numeric' })}`,
      timestamp: weekStart.getTime(),
    };
  }

  if (mode === 'month') {
    const month = new Date(date.getFullYear(), date.getMonth(), 1);

    return {
      key: month.toISOString(),
      name: formatReportDate(month, { month: 'long', year: 'numeric' }),
      timestamp: month.getTime(),
    };
  }

  const day = new Date(date);
  day.setHours(0, 0, 0, 0);

  return {
    key: day.toISOString(),
    name: formatReportDate(day, { month: 'short', day: 'numeric', year: 'numeric' }),
    timestamp: day.getTime(),
  };
};

const buildDetailedPeriodEvents = (tickets = [], mode = 'day') =>
  tickets
    .flatMap((ticket) =>
      getTicketReportEvents(ticket).map((event) => {
        const period = getPeriodBucketForTimestamp(event.timestamp, mode);

        return period
          ? {
              ...event,
              ticket,
              periodKey: period.key,
              periodName: period.name,
              periodTimestamp: period.timestamp,
            }
          : null;
      })
    )
    .filter(Boolean)
    .sort(
      (a, b) =>
        b.periodTimestamp - a.periodTimestamp ||
        b.timestamp - a.timestamp ||
        String(a.ticket.id || '').localeCompare(String(b.ticket.id || ''))
    );

const getReportEventRowsForMonth = (tickets = [], monthDate) => {
  const target = new Date(monthDate);
  const year = target.getFullYear();
  const month = target.getMonth();

  return tickets
    .flatMap((ticket) => getTicketReportEvents(ticket))
    .filter((event) => {
      if (!event?.timestamp) return false;

      const eventDate = new Date(event.timestamp);
      return eventDate.getFullYear() === year && eventDate.getMonth() === month;
    })
    .sort(
      (a, b) =>
        a.timestamp - b.timestamp ||
        String(a.ticket?.id || '').localeCompare(String(b.ticket?.id || '')) ||
        String(a.type || '').localeCompare(String(b.type || ''))
    );
};

const shouldReplaceMonthlyTicketAnchor = (currentEvent, nextEvent) => {
  if (!currentEvent) return true;
  if (nextEvent.timestamp !== currentEvent.timestamp) {
    return nextEvent.timestamp > currentEvent.timestamp;
  }

  const eventPriority = {
    resolved: 4,
    'moved-date': 3,
    status: 2,
    submitted: 1,
  };

  return (eventPriority[nextEvent.type] || 0) > (eventPriority[currentEvent.type] || 0);
};

const getMonthlyTicketAnchorEvents = (tickets = [], monthDate) => {
  const ticketEvents = new Map();

  getReportEventRowsForMonth(tickets, monthDate).forEach((event) => {
    const ticketId = event?.ticket?.id;

    if (!ticketId) return;

    const current = ticketEvents.get(ticketId);

    if (shouldReplaceMonthlyTicketAnchor(current, event)) {
      ticketEvents.set(ticketId, event);
    }
  });

  return [...ticketEvents.values()].sort(
    (a, b) =>
      a.timestamp - b.timestamp ||
      String(a.ticket?.id || '').localeCompare(String(b.ticket?.id || ''))
  );
};

const getUniqueTicketsFromPeriodEvents = (events = []) => {
  const ticketMap = new Map();

  events.forEach((event) => {
    if (event?.ticket?.id && !ticketMap.has(event.ticket.id)) {
      ticketMap.set(event.ticket.id, event.ticket);
    }
  });

  return [...ticketMap.values()];
};

const buildPeriodPrintOptions = (tickets = [], mode = 'day') => {
  const periodMap = new Map();

  buildDetailedPeriodEvents(tickets, mode).forEach((event) => {
    if (!event?.periodKey) return;

    const current = periodMap.get(event.periodKey) || {
      key: event.periodKey,
      name: event.periodName,
      timestamp: event.periodTimestamp,
      count: 0,
      ticketIds: new Set(),
    };

    current.count += 1;

    if (event.ticket?.id) {
      current.ticketIds.add(event.ticket.id);
    }

    periodMap.set(event.periodKey, current);
  });

  return [...periodMap.values()]
    .map((item) => ({
      key: item.key,
      name: item.name,
      timestamp: item.timestamp,
      count: item.count,
      ticketCount: item.ticketIds.size,
    }))
    .sort((a, b) => b.timestamp - a.timestamp || a.name.localeCompare(b.name));
};

const buildPeriodEventTableRows = (events, columns) =>
  events.length
    ? events.map((event) => `
        <tr>
          ${columns.map(([, getValue]) => `<td>${escapePrintHtml(getValue(event))}</td>`).join('')}
        </tr>
      `).join('')
    : `<tr><td colspan="${columns.length}">No ticket events found for this report.</td></tr>`;

const printReportSummary = ({
  mode,
  title,
  items,
  total,
  tickets = [],
  selectedPeriodKey = '',
  selectedPeriodName = '',
}) => {
  const periodLabel = mode === 'day' ? 'Daily' : mode === 'week' ? 'Weekly' : 'Monthly';
  const allDetailedEvents = buildDetailedPeriodEvents(tickets, mode);
  const detailedEvents = selectedPeriodKey
    ? allDetailedEvents.filter((event) => event.periodKey === selectedPeriodKey)
    : allDetailedEvents;
  const uniqueTickets = getUniqueTicketsFromPeriodEvents(detailedEvents);
  const detailedSummary = buildSummary(uniqueTickets);
  const submittedCount = detailedEvents.filter((event) => event.type === 'submitted').length;
  const movedDateCount = detailedEvents.filter((event) => event.type === 'moved-date').length;
  const resolvedEventCount = detailedEvents.filter((event) => event.type === 'resolved').length;
  const periodItems = selectedPeriodKey
    ? [{ name: selectedPeriodName || title, count: uniqueTickets.length }]
    : (items?.length ? items : buildDateBreakdown(tickets, mode));
  const reportTotal = uniqueTickets.length || total || 0;
  const row = (item, totalCount = reportTotal) => {
    const percent = totalCount ? Math.round((item.count / totalCount) * 100) : 0;

    return `
      <div class="report-row">
        <span>${escapePrintHtml(item.name)}</span>
        <strong>${escapePrintHtml(item.count)}</strong>
        <em>${escapePrintHtml(percent)}%</em>
      </div>
    `;
  };
  const technicianItems = TECHNICIANS
    .map((name) => ({
      name,
      count: uniqueTickets.filter((ticket) => (ticket.technician || 'Unassigned') === name).length,
    }))
    .filter((item) => item.count > 0);
  const statusItems = breakdown(detailedEvents, 'reportStatus', ['Submitted', ...TICKET_STATUSES]).slice(0, 6);
  const categoryItems = breakdown(uniqueTickets, 'supportCategory', SUPPORT_CATEGORIES).slice(0, 6);
  const branchItems = breakdown(uniqueTickets, 'branch', BRANCHES).slice(0, 6);
  const ictRows = technicianItems.length
    ? technicianItems.map((item) => row(item)).join('')
    : '<div class="report-row"><span>No ICT assignments</span><strong>0</strong><em>0%</em></div>';
  const statusRows = statusItems.length
    ? statusItems.map((item) => row(item, detailedEvents.length)).join('')
    : '<div class="report-row"><span>No status data</span><strong>0</strong><em>0%</em></div>';
  const categoryRows = categoryItems.length
    ? categoryItems.map((item) => row(item)).join('')
    : '<div class="report-row"><span>No support category data</span><strong>0</strong><em>0%</em></div>';
  const branchRows = branchItems.length
    ? branchItems.map((item) => row(item)).join('')
    : '<div class="report-row"><span>No branch data</span><strong>0</strong><em>0%</em></div>';
  const periodRows = periodItems.length
    ? periodItems.slice(0, 12).map((item) => row(item, periodItems.reduce((sum, current) => sum + current.count, 0))).join('')
    : '<div class="report-row"><span>No period data</span><strong>0</strong><em>0%</em></div>';
  const periodPrintColumns = [
    ['Period', (event) => event.periodName],
    ['Event', (event) => event.label],
    ['Ticket Code', (event) => getTicketDisplayCode(event.ticket)],
    ['Submitted', (event) => getTicketField(event.ticket.createdAt || event.ticket.date)],
    ['Moved Date', (event) => getTicketMovedDateLabel(event.ticket)],
    ['Resolved Date', (event) => getTicketResolvedDateLabel(event.ticket)],
    ['Name', (event) => getTicketField(event.ticket.requester || event.ticket.ownerEmail, 'Employee')],
    ['Branch', (event) => getTicketField(event.ticket.branch, 'Unspecified')],
    ['Department', (event) => getTicketField(event.ticket.department, 'Unspecified')],
    ['Category', (event) => getTicketField(event.ticket.supportCategory, 'Unspecified')],
    ['Concern', (event) => getTicketField(event.ticket.concernType, 'Unspecified')],
    ['Status', (event) => getTicketField(event.reportStatus, 'Submitted')],
    ['SLA', (event) => getTicketField(event.ticket.sla, 'Low')],
    ['Technician', (event) => getTicketField(event.ticket.technician, 'Unassigned')],
  ];
  const body = `
    <main class="print-page">
      ${getPrintLetterhead()}
      <section class="doc-head">
        <h2>${escapePrintHtml(periodLabel)} ICT Detailed Report</h2>
        <div class="meta">${escapePrintHtml(selectedPeriodName || title)}<br />Printed ${escapePrintHtml(new Date().toLocaleString())}</div>
      </section>
      <section class="grid">
        <div class="field"><span>Unique Tickets</span><strong>${escapePrintHtml(reportTotal)}</strong></div>
        <div class="field"><span>Submitted Events</span><strong>${escapePrintHtml(submittedCount)}</strong></div>
        <div class="field"><span>Moved Date Events</span><strong>${escapePrintHtml(movedDateCount)}</strong></div>
        <div class="field"><span>Resolved Events</span><strong>${escapePrintHtml(resolvedEventCount)}</strong></div>
      </section>
      <section class="grid">
        <div class="field"><span>Active</span><strong>${escapePrintHtml(detailedSummary.active)}</strong></div>
        <div class="field"><span>Resolved</span><strong>${escapePrintHtml(detailedSummary.resolved)}</strong></div>
        <div class="field"><span>High / Critical</span><strong>${escapePrintHtml(detailedSummary.critical)}</strong></div>
        <div class="field"><span>Report Type</span><strong>${escapePrintHtml(periodLabel)}</strong></div>
      </section>
      <section class="consolidated-grid">
        <div>
          <h3 class="section-title">ICT Workload</h3>
          <div class="report-list single">${ictRows}</div>
        </div>
        <div>
          <h3 class="section-title">Status</h3>
          <div class="report-list single">${statusRows}</div>
        </div>
        <div>
          <h3 class="section-title">Support Category</h3>
          <div class="report-list single">${categoryRows}</div>
        </div>
        <div>
          <h3 class="section-title">Branch Volume</h3>
          <div class="report-list single">${branchRows}</div>
        </div>
      </section>
      <section class="ticket-detail-section">
        <h3 class="section-title">Period Volume</h3>
        <div class="report-list period-volume-list">${periodRows}</div>
      </section>
      <section class="ticket-detail-section">
        <h3 class="section-title">Ticket Event Details</h3>
        <table class="detail-table period-detail-table">
          <thead>
            <tr>
              ${periodPrintColumns.map(([label]) => `<th>${escapePrintHtml(label)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${buildPeriodEventTableRows(detailedEvents, periodPrintColumns)}
          </tbody>
        </table>
      </section>
      <p class="print-note">Detailed ${escapePrintHtml(periodLabel.toLowerCase())} report includes submitted, moved-date, and resolved events for ICT review.</p>
    </main>
  `;

  openPrintDocument(`${periodLabel} ICT Detailed Report`, body);
};

const getMonthlyReportData = (tickets, monthDate) => {
  const target = new Date(monthDate);
  const year = target.getFullYear();
  const month = target.getMonth();
  const monthTitle = formatReportDate(new Date(year, month, 1), { month: 'long', year: 'numeric' });
  const monthlyEvents = getReportEventRowsForMonth(tickets, monthDate);
  const monthlyTickets = getUniqueTicketsFromPeriodEvents(monthlyEvents);

  return { monthTitle, monthlyTickets, monthlyEvents };
};

const getTicketField = (value, fallback = 'Not provided') => {
  const normalized = String(value ?? '').trim();
  return normalized || fallback;
};

const monthlyTicketSummaryColumns = [
  ['Ticket Code', (ticket) => getTicketDisplayCode(ticket)],
  ['Submitted', (ticket) => getTicketField(ticket.createdAt || ticket.date)],
  ['Resolved Date', (ticket) => getTicketResolvedDateLabel(ticket)],
  ['Requester', (ticket) => getTicketField(ticket.requester || ticket.ownerEmail, 'Employee')],
  ['Employee ID', (ticket) => getTicketField(ticket.employeeId)],
  ['Branch', (ticket) => getTicketField(ticket.branch, 'Unspecified')],
  ['Department', (ticket) => getTicketField(ticket.department, 'Unspecified')],
  ['Category', (ticket) => getTicketField(ticket.supportCategory, 'Unspecified')],
  ['Concern', (ticket) => getTicketField(ticket.concernType, 'Unspecified')],
  ['Status', (ticket) => getTicketField(ticket.status, 'Created')],
  ['SLA', (ticket) => getTicketField(ticket.sla, 'Low')],
  ['Technician', (ticket) => getTicketField(ticket.technician, 'Unassigned')],
];

const buildMonthlyTicketSummaryRows = (tickets, columns) =>
  tickets.length
    ? tickets.map((ticket) => `
        <tr>
          ${columns.map(([, getValue]) => `<td>${escapePrintHtml(getValue(ticket))}</td>`).join('')}
        </tr>
      `).join('')
    : `<tr><td colspan="${columns.length}">No tickets found for this month.</td></tr>`;

const printMonthlyConsolidatedReport = (tickets, monthDate) => {
  const { monthTitle, monthlyTickets } = getMonthlyReportData(tickets, monthDate);
  const monthlySummary = buildSummary(monthlyTickets);
  const technicianItems = TECHNICIANS
    .map((name) => ({
      name,
      count: monthlyTickets.filter((ticket) => (ticket.technician || 'Unassigned') === name).length,
    }))
    .filter((item) => item.count > 0);
  const statusItems = breakdown(monthlyTickets, 'status', TICKET_STATUSES).slice(0, 6);
  const categoryItems = breakdown(monthlyTickets, 'supportCategory', SUPPORT_CATEGORIES).slice(0, 6);
  const branchItems = breakdown(monthlyTickets, 'branch', BRANCHES).slice(0, 6);
  const row = (item, total = monthlyTickets.length) => {
    const percent = total ? Math.round((item.count / total) * 100) : 0;
    return `
      <div class="report-row">
        <span>${escapePrintHtml(item.name)}</span>
        <strong>${escapePrintHtml(item.count)}</strong>
        <em>${escapePrintHtml(percent)}%</em>
      </div>
    `;
  };
  const ictRows = technicianItems.length
    ? technicianItems.map((item) => row(item, monthlyTickets.length)).join('')
    : '<div class="report-row"><span>No ICT assignments</span><strong>0</strong><em>0%</em></div>';
  const statusRows = statusItems.length
    ? statusItems.map((item) => row(item, monthlyTickets.length)).join('')
    : '<div class="report-row"><span>No ticket status data</span><strong>0</strong><em>0%</em></div>';
  const categoryRows = categoryItems.length
    ? categoryItems.map((item) => row(item, monthlyTickets.length)).join('')
    : '<div class="report-row"><span>No support category data</span><strong>0</strong><em>0%</em></div>';
  const branchRows = branchItems.length
    ? branchItems.map((item) => row(item, monthlyTickets.length)).join('')
    : '<div class="report-row"><span>No branch data</span><strong>0</strong><em>0%</em></div>';
  const body = `
    <main class="print-page">
      ${getPrintLetterhead()}
      <section class="doc-head">
        <h2>Monthly ICT Consolidated Report</h2>
        <div class="meta">${escapePrintHtml(monthTitle)}<br />Printed ${escapePrintHtml(new Date().toLocaleString())}</div>
      </section>
      <section class="grid">
        <div class="field"><span>Total Tickets</span><strong>${escapePrintHtml(monthlySummary.total)}</strong></div>
        <div class="field"><span>Active Tickets</span><strong>${escapePrintHtml(monthlySummary.active)}</strong></div>
        <div class="field"><span>Resolved Tickets</span><strong>${escapePrintHtml(monthlySummary.resolved)}</strong></div>
        <div class="field"><span>High / Critical</span><strong>${escapePrintHtml(monthlySummary.critical)}</strong></div>
      </section>
      <section class="consolidated-grid">
        <div>
          <h3 class="section-title">ICT Workload</h3>
          <div class="report-list single">${ictRows}</div>
        </div>
        <div>
          <h3 class="section-title">Ticket Status</h3>
          <div class="report-list single">${statusRows}</div>
        </div>
        <div>
          <h3 class="section-title">Support Category</h3>
          <div class="report-list single">${categoryRows}</div>
        </div>
        <div>
          <h3 class="section-title">Branch Volume</h3>
          <div class="report-list single">${branchRows}</div>
        </div>
      </section>
      <section class="ticket-detail-section">
        <h3 class="section-title">Ticket Summary</h3>
        <table class="detail-table">
          <thead>
            <tr>
              ${monthlyTicketSummaryColumns.map(([label]) => `<th>${escapePrintHtml(label)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${buildMonthlyTicketSummaryRows(monthlyTickets, monthlyTicketSummaryColumns)}
          </tbody>
        </table>
      </section>
      <p class="print-note">Monthly summary includes one row per ticket for ICT workload review.</p>
    </main>
  `;

  openPrintDocument(`Monthly ICT Consolidated Report - ${monthTitle}`, body);
};

const escapeCsvCell = (value) => {
  const normalized = String(value ?? '').replace(/\r?\n/g, ' ').trim();
  return `"${normalized.replaceAll('"', '""')}"`;
};

const exportMonthlyConsolidatedReportCsv = (tickets, monthDate) => {
  if (typeof window === 'undefined') return;

  const { monthTitle, monthlyTickets } = getMonthlyReportData(tickets, monthDate);
  const monthlySummary = buildSummary(monthlyTickets);
  const summaryRows = [
    ['Report', 'Monthly ICT Consolidated Report'],
    ['Period', monthTitle],
    ['Total Tickets', monthlySummary.total],
    ['Active Tickets', monthlySummary.active],
    ['Resolved Tickets', monthlySummary.resolved],
    ['High / Critical', monthlySummary.critical],
    ['Exported', new Date().toLocaleString()],
  ];
  const csvRows = [
    ['Monthly ICT Consolidated Report'],
    ...summaryRows,
    [],
    monthlyTicketSummaryColumns.map(([label]) => label),
    ...monthlyTickets.map((ticket) => monthlyTicketSummaryColumns.map(([, getValue]) => getValue(ticket))),
  ];
  const csv = `\uFEFF${csvRows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n')}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const fileName = `monthly-ict-consolidated-${monthTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`;
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const getSafeFilePart = (value, fallback = 'report') => {
  const normalized = String(value || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || fallback;
};

const downloadFile = (blob, fileName) => {
  if (typeof window === 'undefined') return;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const getMonthInputValue = (date) => {
  const parsed = new Date(date || new Date());

  if (Number.isNaN(parsed.getTime())) return '';

  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
};

const getMonthDateFromInput = (value) => {
  const parsed = new Date(`${value || getMonthInputValue(new Date())}-01T00:00:00`);

  if (Number.isNaN(parsed.getTime())) return getTicketCalendarMonth([]);

  parsed.setDate(1);
  parsed.setHours(0, 0, 0, 0);

  return parsed;
};

const getMonthlyBurnoutSummaryData = (tickets, monthDate) => {
  const burnoutTickets = tickets.filter(isBurnoutTicket);
  const { monthTitle, monthlyTickets } = getMonthlyReportData(burnoutTickets, monthDate);
  const summary = buildSummary(monthlyTickets);
  const belowStandardCount = monthlyTickets.filter(isBurnoutBelowStandardProcedure).length;
  const threeDayMarkCount = monthlyTickets.filter(hasBurnoutReachedThreeDayMark).length;
  const fiveDayMarkCount = monthlyTickets.filter(hasBurnoutReachedFiveDayMark).length;

  return {
    monthTitle,
    monthlyTickets,
    summary,
    belowStandardCount,
    threeDayMarkCount,
    fiveDayMarkCount,
  };
};

const monthlyBurnoutSummaryColumns = [
  ['Ticket Code', (ticket) => getTicketDisplayCode(ticket)],
  ['Submitted', (ticket) => getTicketField(ticket.createdAt || ticket.date)],
  ['Start Date', (ticket) => getTicketField(ticket.burnoutReport?.startDate || ticket.workStartedAt)],
  ['End Date', (ticket) => getTicketField(ticket.burnoutReport?.endDate || ticket.workEndedAt)],
  ['Requester', (ticket) => getTicketField(ticket.requester || ticket.ownerEmail, 'Employee')],
  ['Custodian', (ticket) => getTicketField(ticket.custodian)],
  ['Branch', (ticket) => getTicketField(ticket.branch, 'Unspecified')],
  ['Department', (ticket) => getTicketField(ticket.department, 'Unspecified')],
  ['Brand & Model', (ticket) => getTicketField(ticket.brand)],
  ['Serial Number', (ticket) => getTicketField(ticket.serialNumber)],
  ['Device', (ticket) => getTicketField(ticket.deviceName || ticket.deviceType)],
  ['Status', (ticket) => getTicketField(ticket.status, 'Created')],
  ['Technician', (ticket) => getTicketField(ticket.technician, 'Unassigned')],
  ['3-Day Mark', (ticket) => (hasBurnoutReachedThreeDayMark(ticket) ? 'Yes' : 'No')],
  ['5-Day Mark', (ticket) => (hasBurnoutReachedFiveDayMark(ticket) ? 'Yes' : 'No')],
  ['Below Standard', (ticket) => (isBurnoutBelowStandardProcedure(ticket) ? 'Yes' : 'No')],
];

const printMonthlyBurnoutSummaryReport = (tickets, monthDate) => {
  const {
    monthTitle,
    monthlyTickets,
    summary,
    belowStandardCount,
    threeDayMarkCount,
    fiveDayMarkCount,
  } = getMonthlyBurnoutSummaryData(tickets, monthDate);
  const body = `
    <main class="print-page">
      ${getPrintLetterhead()}
      <section class="doc-head">
        <h2>Monthly Burnout Summary Report</h2>
        <div class="meta">${escapePrintHtml(monthTitle)}<br />Printed ${escapePrintHtml(new Date().toLocaleString())}</div>
      </section>
      <section class="grid">
        <div class="field"><span>Total Burnout Tickets</span><strong>${escapePrintHtml(summary.total)}</strong></div>
        <div class="field"><span>Active Tickets</span><strong>${escapePrintHtml(summary.active)}</strong></div>
        <div class="field"><span>Resolved Tickets</span><strong>${escapePrintHtml(summary.resolved)}</strong></div>
        <div class="field"><span>3-Day Mark</span><strong>${escapePrintHtml(threeDayMarkCount)}</strong></div>
        <div class="field"><span>5-Day Mark</span><strong>${escapePrintHtml(fiveDayMarkCount)}</strong></div>
        <div class="field"><span>Below Standard</span><strong>${escapePrintHtml(belowStandardCount)}</strong></div>
      </section>
      <section class="ticket-detail-section">
        <h3 class="section-title">Burnout Ticket Summary</h3>
        <table class="detail-table burnout-print-table">
          <thead>
            <tr>${monthlyBurnoutSummaryColumns.map(([label]) => `<th>${escapePrintHtml(label)}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${buildMonthlyTicketSummaryRows(monthlyTickets, monthlyBurnoutSummaryColumns)}
          </tbody>
        </table>
      </section>
      <p class="print-note">Monthly Burnout summary includes one row per Burnout ticket for the selected month.</p>
    </main>
  `;

  openPrintDocument(`Monthly Burnout Summary Report - ${monthTitle}`, body);
};

const exportMonthlyBurnoutSummaryExcel = (tickets, monthDate) => {
  if (typeof window === 'undefined') return;

  const {
    monthTitle,
    monthlyTickets,
    summary,
    belowStandardCount,
    threeDayMarkCount,
    fiveDayMarkCount,
  } = getMonthlyBurnoutSummaryData(tickets, monthDate);
  const summaryRows = [
    ['Report', 'Monthly Burnout Summary Report'],
    ['Period', monthTitle],
    ['Total Burnout Tickets', summary.total],
    ['Active Tickets', summary.active],
    ['Resolved Tickets', summary.resolved],
    ['3-Day Mark', threeDayMarkCount],
    ['5-Day Mark', fiveDayMarkCount],
    ['Below Standard', belowStandardCount],
    ['Exported', new Date().toLocaleString()],
  ].map(([label, value]) => `<tr><td>${escapePrintHtml(label)}</td><td>${escapePrintHtml(value)}</td></tr>`).join('');
  const ticketRows = buildMonthlyTicketSummaryRows(monthlyTickets, monthlyBurnoutSummaryColumns);
  const workbook = `\uFEFF<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8" />
      <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Monthly Burnout</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
      <style>
        body { font-family: Arial, sans-serif; }
        h1, h2, h3 { color: #111827; }
        table { border-collapse: collapse; margin-bottom: 16px; width: 100%; }
        th { background: #ef4444; color: #ffffff; font-weight: 700; }
        th, td { border: 1px solid #cbd5e1; padding: 8px; mso-number-format: "\\@"; vertical-align: top; }
      </style>
    </head>
    <body>
      <h1>MEMPCO Monthly Burnout Summary Report</h1>
      ${buildExcelSection('Summary', summaryRows, ['Field', 'Value'])}
      ${buildExcelSection(
        'Burnout Ticket Summary',
        ticketRows,
        monthlyBurnoutSummaryColumns.map(([label]) => label)
      )}
    </body>
  </html>`;
  const blob = new Blob([workbook], { type: 'application/vnd.ms-excel;charset=utf-8;' });

  downloadFile(blob, `monthly-burnout-summary-${getSafeFilePart(monthTitle)}.xls`);
};

const getBurnoutBasicRows = (ticket, burnoutReport = normalizeBurnoutReport(ticket)) => [
  ['Ticket Code', getTicketDisplayCode(ticket)],
  ['Record ID', ticket.id],
  ['Status', ticket.status],
  ['Branch', ticket.branch],
  ['Department', ticket.department],
  ['Brand & Model', ticket.brand],
  ['Serial Number', ticket.serialNumber],
  ['Model / Device', ticket.deviceName || ticket.deviceType],
  ['Requester', ticket.requester || ticket.ownerEmail || 'Employee'],
  ['Custodian', ticket.custodian],
  ['Performed By', burnoutReport.performedBy],
  ['Request Date', burnoutReport.requestedDate || ticket.createdAt],
  ['Start Date', burnoutReport.startDate],
  ['End Date', burnoutReport.endDate],
];

const buildBurnoutRowsHtml = (rows, columns) =>
  (rows || []).map((row) => `
    <tr>
      ${columns.map(([key, getValue]) => `<td>${escapePrintHtml(getValue ? getValue(row) : row[key])}</td>`).join('')}
    </tr>
  `).join('');

const buildBurnoutReportHtml = (ticket) => {
  const burnoutReport = normalizeBurnoutReport(ticket);

  return `
    <section class="ticket-detail-section burnout-print-section">
      <h3 class="section-title">Burnout Basic Information</h3>
      <div class="grid">
        ${getBurnoutBasicRows(ticket, burnoutReport).map(([label, value]) => `
          <div class="field">
            <span>${escapePrintHtml(label)}</span>
            <strong>${escapePrintHtml(value || 'Not provided')}</strong>
          </div>
        `).join('')}
      </div>

      <h3 class="section-title">Testing Checklist</h3>
      <table class="detail-table burnout-print-table">
        <thead>
          <tr><th>Test Category</th><th>Test Description</th><th>Status</th><th>Remarks</th></tr>
        </thead>
        <tbody>
          ${buildBurnoutRowsHtml(burnoutReport.testingChecklist, [['category'], ['description'], ['status'], ['remarks']])}
        </tbody>
      </table>

      <h3 class="section-title">Software Installation Checklist</h3>
      <table class="detail-table burnout-print-table">
        <thead>
          <tr><th>Software</th><th>Description</th><th>Installed</th><th>Remarks</th></tr>
        </thead>
        <tbody>
          ${buildBurnoutRowsHtml(burnoutReport.softwareChecklist, [
            ['software'],
            ['description'],
            ['installed', (row) => (row.installed ? 'Yes' : 'No')],
            ['remarks'],
          ])}
        </tbody>
      </table>

      <div class="text-grid">
        <section>
          <h3 class="section-title">Burnout Monitoring (3-5 Days)</h3>
          <table class="detail-table burnout-print-table">
            <thead><tr><th>Monitoring Item</th><th>Result</th><th>Remarks</th></tr></thead>
            <tbody>${buildBurnoutRowsHtml(burnoutReport.monitoring, [['item'], ['result'], ['remarks']])}</tbody>
          </table>
        </section>
        <section>
          <h3 class="section-title">Final Evaluation</h3>
          <table class="detail-table burnout-print-table">
            <thead><tr><th>Evaluation Item</th><th>Status</th><th>Remarks</th></tr></thead>
            <tbody>${buildBurnoutRowsHtml(burnoutReport.finalEvaluation, [['item'], ['status'], ['remarks']])}</tbody>
          </table>
        </section>
      </div>
    </section>
  `;
};

const printBurnoutReports = (tickets = []) => {
  const printableTickets = tickets.filter(isBurnoutTicket);

  if (!printableTickets.length) {
    window.alert('No Burnout reports are available to print.');
    return;
  }

  const body = `
    <main class="print-page">
      ${getPrintLetterhead()}
      <section class="doc-head">
        <h2>Burnout Report</h2>
        <div class="meta">${escapePrintHtml(printableTickets.length)} ticket${printableTickets.length === 1 ? '' : 's'}<br />Printed ${escapePrintHtml(new Date().toLocaleString())}</div>
      </section>
      ${printableTickets.map(buildBurnoutReportHtml).join('')}
    </main>
  `;

  openPrintDocument('Burnout Report', body);
};

const printBurnoutReport = (ticket) => printBurnoutReports([ticket]);

const buildExcelSection = (title, rows, headers) => `
  <h3>${escapePrintHtml(title)}</h3>
  <table>
    <thead>
      <tr>${headers.map((header) => `<th>${escapePrintHtml(header)}</th>`).join('')}</tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
`;

const exportBurnoutReportsExcel = (tickets = []) => {
  if (typeof window === 'undefined') return;

  const exportTickets = tickets.filter(isBurnoutTicket);

  if (!exportTickets.length) {
    window.alert('No Burnout reports are available to export.');
    return;
  }

  const sections = exportTickets.map((ticket) => {
    const report = normalizeBurnoutReport(ticket);
    const basicRows = getBurnoutBasicRows(ticket, report)
      .map(([label, value]) => `<tr><td>${escapePrintHtml(label)}</td><td>${escapePrintHtml(value || 'Not provided')}</td></tr>`)
      .join('');
    const testingRows = buildBurnoutRowsHtml(report.testingChecklist, [['category'], ['description'], ['status'], ['remarks']]);
    const softwareRows = buildBurnoutRowsHtml(report.softwareChecklist, [
      ['software'],
      ['description'],
      ['installed', (row) => (row.installed ? 'Yes' : 'No')],
      ['remarks'],
    ]);
    const monitoringRows = buildBurnoutRowsHtml(report.monitoring, [['item'], ['result'], ['remarks']]);
    const evaluationRows = buildBurnoutRowsHtml(report.finalEvaluation, [['item'], ['status'], ['remarks']]);

    return `
      <h2>${escapePrintHtml(getTicketDisplayCode(ticket))}</h2>
      ${buildExcelSection('Burnout Basic Information', basicRows, ['Field', 'Value'])}
      ${buildExcelSection('Testing Checklist', testingRows, ['Test Category', 'Test Description', 'Status', 'Remarks'])}
      ${buildExcelSection('Software Installation Checklist', softwareRows, ['Software', 'Description', 'Installed', 'Remarks'])}
      ${buildExcelSection('Burnout Monitoring (3-5 Days)', monitoringRows, ['Monitoring Item', 'Result', 'Remarks'])}
      ${buildExcelSection('Final Evaluation', evaluationRows, ['Evaluation Item', 'Status', 'Remarks'])}
      <br />
    `;
  }).join('');

  const workbook = `\uFEFF<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8" />
      <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Burnout Report</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
      <style>
        body { font-family: Arial, sans-serif; }
        h1, h2, h3 { color: #111827; }
        table { border-collapse: collapse; margin-bottom: 16px; width: 100%; }
        th { background: #ef4444; color: #ffffff; font-weight: 700; }
        th, td { border: 1px solid #cbd5e1; padding: 8px; mso-number-format: "\\@"; vertical-align: top; }
      </style>
    </head>
    <body>
      <h1>MEMPCO Burnout Report</h1>
      <p>Exported ${escapePrintHtml(new Date().toLocaleString())}</p>
      ${sections}
    </body>
  </html>`;

  const fileToken = exportTickets.length === 1
    ? getSafeFilePart(getTicketDisplayCode(exportTickets[0]), 'burnout-report')
    : `filtered-${new Date().toISOString().slice(0, 10)}`;
  const blob = new Blob([workbook], { type: 'application/vnd.ms-excel;charset=utf-8;' });

  downloadFile(blob, `burnout-report-${fileToken}.xls`);
};

const exportBurnoutReportExcel = (ticket) => exportBurnoutReportsExcel([ticket]);

const getStatusRank = (status) => {
  const ranks = {
    Critical: 1,
    Escalated: 2,
    Created: 3,
    Submitted: 3,
    'For Inspection': 4,
    Modified: 4,
    Pending: 5,
    'In Progress': 6,
    'Under Burnout': 6,
    'Passed Burnout': 7,
    'Ready for Deployment': 8,
    Deployed: 9,
    'Failed Burnout': 10,
    Damaged: 11,
    'For Repair': 12,
    'For Replacement': 13,
    Resolved: 14,
    Canceled: 15,
    Cancelled: 15,
  };

  return ranks[status] || 20;
};

const getSlaRank = (sla) => {
  const ranks = {
    Critical: 1,
    High: 2,
    Medium: 3,
    Low: 4,
  };

  return ranks[sla] || 10;
};

const getTicketSearchText = (ticket) =>
  [
    ticket.ticketCode,
    ticket.id,
    ticket.requester,
    ticket.ownerEmail,
    ticket.employeeId,
    ticket.branch,
    ticket.department,
    ticket.custodian,
    ticket.brand,
    ticket.deviceType,
    ticket.serialNumber,
    ticket.supportCategory,
    ticket.concernType,
    ticket.deviceName,
    ticket.contactNumber,
    ticket.impact,
    ticket.description,
    ticket.status,
    ticket.sla,
    ticket.technician,
    ticket.actionTaken,
    ticket.adminRemarks,
    ticket.resolution,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

const getTicketDisplayCode = (ticket = {}) => ticket.ticketCode || ticket.id || '';

const createBurnoutRowId = (prefix = 'burnout-row') =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const toDateInputValue = (value) => {
  if (!value) return '';

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) return '';

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const addDaysToDateInput = (value, days) => {
  const parsed = value ? new Date(`${value}T00:00:00`) : new Date();

  if (Number.isNaN(parsed.getTime())) return '';

  parsed.setDate(parsed.getDate() + days);

  return toDateInputValue(parsed);
};

const parseTicketTime = (value) => {
  if (!value) return 0;

  const parsed = new Date(value).getTime();

  return Number.isNaN(parsed) ? 0 : parsed;
};

const isBurnoutTicket = (ticket = {}) =>
  String(ticket.supportCategory || '').trim().toLowerCase() === 'burnout' ||
  String(ticket.concernType || '').trim().toLowerCase().includes('burnout');

const getBurnoutStartTime = (ticket = {}) => {
  const workStartedTime = parseTicketTime(ticket.workStartedAt || ticket.work_started_at);

  if (workStartedTime) return workStartedTime;

  const reportStartDate = ticket.burnoutReport?.startDate;
  const reportStartTime = reportStartDate ? parseTicketTime(`${reportStartDate}T00:00:00`) : 0;

  return reportStartTime;
};

const getBurnoutElapsedDays = (ticket = {}, endValue = Date.now()) => {
  const startedAt = getBurnoutStartTime(ticket);
  const endedAt = typeof endValue === 'number' ? endValue : parseTicketTime(endValue);

  if (!startedAt || !endedAt || endedAt < startedAt) return 0;

  return (endedAt - startedAt) / DAY_IN_MS;
};

const hasBurnoutReachedThreeDayMark = (ticket = {}, nowValue = Date.now()) =>
  isBurnoutTicket(ticket) &&
  BURNOUT_ACTIVE_STATUS_KEYS.includes(normalizeTicketStatus(ticket.status)) &&
  getBurnoutElapsedDays(ticket, nowValue) >= BURNOUT_STANDARD_MIN_DAYS;

const hasBurnoutReachedFiveDayMark = (ticket = {}, nowValue = Date.now()) =>
  isBurnoutTicket(ticket) &&
  BURNOUT_ACTIVE_STATUS_KEYS.includes(normalizeTicketStatus(ticket.status)) &&
  getBurnoutElapsedDays(ticket, nowValue) >= BURNOUT_TARGET_DAYS;

const isBurnoutBelowStandardProcedure = (ticket = {}, endValue = Date.now()) =>
  isBurnoutTicket(ticket) &&
  getBurnoutStartTime(ticket) > 0 &&
  getBurnoutElapsedDays(ticket, endValue) < BURNOUT_STANDARD_MIN_DAYS;

const normalizeBurnoutRows = (rows, defaults, mapDefault) => {
  const sourceRows = Array.isArray(rows) && rows.length ? rows : defaults.map(mapDefault);

  return sourceRows.map((row, index) => ({
    ...mapDefault(defaults[index] || []),
    ...row,
    id: row?.id || defaults[index]?.[0] || createBurnoutRowId('burnout'),
  }));
};

const buildDefaultBurnoutReport = (ticket = {}, currentUser = {}) => {
  const requestedDate = toDateInputValue(ticket.createdAt || ticket.date || ticket.lastEmployeeUpdate);
  const startDate = toDateInputValue(ticket.workStartedAt || new Date());

  return {
    version: 1,
    performedBy: currentUser?.name || ticket.technician || '',
    requestedDate,
    startDate,
    endDate: startDate ? addDaysToDateInput(startDate, 5) : '',
    testingChecklist: BURNOUT_TEST_ITEMS.map(([id, category, description, remarks]) => ({
      id,
      category,
      description,
      status: 'Pass',
      remarks,
    })),
    softwareChecklist: BURNOUT_SOFTWARE_ITEMS.map(([id, software, description, remarks]) => ({
      id,
      software,
      description,
      installed: true,
      remarks,
    })),
    monitoring: BURNOUT_MONITORING_ITEMS.map(([id, item, result, remarks]) => ({
      id,
      item,
      result,
      remarks,
    })),
    finalEvaluation: BURNOUT_EVALUATION_ITEMS.map(([id, item, status, remarks]) => ({
      id,
      item,
      status,
      remarks,
    })),
  };
};

const normalizeBurnoutReport = (ticket = {}, currentUser = {}) => {
  const defaultReport = buildDefaultBurnoutReport(ticket, currentUser);
  const savedReport = ticket.burnoutReport && typeof ticket.burnoutReport === 'object'
    ? ticket.burnoutReport
    : {};
  const startDate = savedReport.startDate || defaultReport.startDate;

  return {
    ...defaultReport,
    ...savedReport,
    performedBy: savedReport.performedBy || defaultReport.performedBy,
    requestedDate: savedReport.requestedDate || defaultReport.requestedDate,
    startDate,
    endDate: savedReport.endDate || (startDate ? addDaysToDateInput(startDate, 5) : defaultReport.endDate),
    testingChecklist: normalizeBurnoutRows(
      savedReport.testingChecklist,
      BURNOUT_TEST_ITEMS,
      ([id, category, description, remarks]) => ({
        id,
        category,
        description,
        status: 'Pass',
        remarks,
      })
    ),
    softwareChecklist: normalizeBurnoutRows(
      savedReport.softwareChecklist,
      BURNOUT_SOFTWARE_ITEMS,
      ([id, software, description, remarks]) => ({
        id,
        software,
        description,
        installed: true,
        remarks,
      })
    ),
    monitoring: normalizeBurnoutRows(
      savedReport.monitoring,
      BURNOUT_MONITORING_ITEMS,
      ([id, item, result, remarks]) => ({
        id,
        item,
        result,
        remarks,
      })
    ),
    finalEvaluation: normalizeBurnoutRows(
      savedReport.finalEvaluation,
      BURNOUT_EVALUATION_ITEMS,
      ([id, item, status, remarks]) => ({
        id,
        item,
        status,
        remarks,
      })
    ),
  };
};

const buildStatusHistoryEntry = (status, timestamp, user) => {
  const normalizedStatus = normalizeTicketStatus(status);
  const type =
    normalizedStatus === 'moved date'
      ? 'moved-date'
      : normalizedStatus === 'resolved'
        ? 'resolved'
        : normalizedStatus === 'submitted'
          ? 'submitted'
          : 'status';

  return {
    status,
    label: status,
    type,
    timestamp: new Date(timestamp).toISOString(),
    updatedBy: user?.id || '',
    updatedByName: user?.name || '',
  };
};

const getTicketWorkStartedAt = (ticket) =>
  ticket?.workStartedAt ||
  (['in progress', 'under burnout'].includes(normalizeTicketStatus(ticket?.status))
    ? ticket?.adminUpdatedAt || ticket?.lastUpdated || ''
    : '');

const getTicketWorkEndedAt = (ticket) => ticket?.workEndedAt || '';

const isTicketLockActive = (ticket) => {
  if (!ticket?.lockedBy) return false;

  const expiresAt = new Date(ticket.lockExpiresAt || '').getTime();
  return !Number.isNaN(expiresAt) && expiresAt > Date.now();
};

const isTicketLockedByOther = (ticket, userId) =>
  isTicketLockActive(ticket) && ticket.lockedBy && ticket.lockedBy !== userId;

const formatTicketLockTime = (value) => {
  const parsed = new Date(value || '');

  if (Number.isNaN(parsed.getTime())) return '';

  return parsed.toLocaleTimeString('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
  });
};

const getTicketHandlingState = (ticket = {}) => {
  const activeLock = isTicketLockActive(ticket);
  const lockOwner = String(ticket.lockedByName || '').trim() || 'IT staff';
  const assignedTechnician = hasAssignedTechnician(ticket) ? ticket.technician : '';
  const startedAt = getTicketWorkStartedAt(ticket);
  const endedAt = getTicketWorkEndedAt(ticket);
  const status = normalizeTicketStatus(ticket.status);
  const closedStatuses = [
    'resolved',
    'canceled',
    'cancelled',
    'passed burnout',
    'ready for deployment',
    'deployed',
    'failed burnout',
    'damaged',
    'for repair',
    'for replacement',
  ];
  const isClosed = closedStatuses.includes(status) || (!isUnresolved(ticket.status) && Boolean(startedAt));

  if (endedAt || isClosed) {
    return {
      tone: 'done',
      icon: ShieldCheck,
      title: status === 'resolved' ? 'Resolved' : 'Work completed',
      detail: assignedTechnician ? `Handled by ${assignedTechnician}` : 'ICT action recorded',
      meta: endedAt ? `Ended ${endedAt}` : ticket.lastUpdated || ticket.adminUpdatedAt || '',
    };
  }

  if (activeLock) {
    const lockExpiry = formatTicketLockTime(ticket.lockExpiresAt);

    return {
      tone: 'live',
      icon: Wrench,
      title: 'Being handled now',
      detail: `Opened by ${lockOwner}`,
      meta: lockExpiry ? `Reserved until ${lockExpiry}` : 'Live admin lock',
    };
  }

  if (!isTicketBeingHandled(ticket)) return null;

  if (status === 'for inspection') {
    return {
      tone: 'queued',
      icon: Clock3,
      title: 'Queued for inspection',
      detail: assignedTechnician ? `Assigned to ${assignedTechnician}` : 'ICT review is underway',
      meta: startedAt ? `Started ${startedAt}` : ticket.lastUpdated || '',
    };
  }

  if (status === 'under burnout') {
    return {
      tone: 'live',
      icon: Monitor,
      title: 'Under burnout monitoring',
      detail: assignedTechnician ? `Assigned to ${assignedTechnician}` : 'Unit is being monitored',
      meta: startedAt ? `Started ${startedAt}` : ticket.lastUpdated || '',
    };
  }

  return {
    tone: status === 'escalated' ? 'escalated' : 'active',
    icon: status === 'escalated' ? ExternalLink : Wrench,
    title: status === 'moved date' ? 'Scheduled work' : 'Being catered',
    detail: assignedTechnician ? `Assigned to ${assignedTechnician}` : 'ICT has started work',
    meta: startedAt ? `Started ${startedAt}` : ticket.lastUpdated || '',
  };
};

const getTimeValue = (value) => {
  const parsed = new Date(value || '').getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const formatElapsedTime = (startedAt, endedAt, now = Date.now()) => {
  const start = getTimeValue(startedAt);
  if (!start) return 'Not started';

  const end = getTimeValue(endedAt) || now;
  const totalSeconds = Math.max(0, Math.floor((end - start) / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const paddedMinutes = String(minutes).padStart(2, '0');
  const paddedSeconds = String(seconds).padStart(2, '0');

  if (days > 0) {
    return `${days}d ${hours}h ${paddedMinutes}m ${paddedSeconds}s`;
  }

  if (hours > 0) {
    return `${hours}h ${paddedMinutes}m ${paddedSeconds}s`;
  }

  return `${minutes}m ${paddedSeconds}s`;
};

const getActionButtonLabel = (ticket) => {
  if (isBurnoutTicket(ticket)) {
    if (isBurnoutClosedStatus(ticket.status)) return 'View Burnout';
    return getTicketWorkStartedAt(ticket) ? 'Update Burnout' : 'Assess Unit';
  }

  if (isTicketResolved(ticket)) return 'View Ticket';

  return getTicketWorkStartedAt(ticket) ? 'Update Ticket' : 'Take Action';
};

/* =========================
   SIDEBAR
========================= */

function Sidebar({ active, onNav, onLogout, open, canCreateUsers, canAccessDepartmentConsoles }) {
  const items = [
    { key: 'dashboard', label: 'Dashboard', Icon: Icon.Dashboard },
    { key: 'tickets', label: 'All Tickets', Icon: Icon.Tickets },
    { key: 'support-tickets', label: 'Support Tickets', Icon: Icon.Tickets },
    { key: 'burnout-tickets', label: 'Burnout Tickets', Icon: Icon.Burnout },
    { key: 'branches', label: 'Branch Monitor', Icon: Icon.Branches },
    { key: 'reports', label: 'Reports', Icon: Icon.Reports },
    { key: 'users', label: 'Users', Icon: Icon.Users },
  ];

  if (canCreateUsers) {
    items.push({ key: 'create-user', label: 'Create User', Icon: Icon.UserPlus });
  }

  return (
    <aside className={`portal-sidebar${open ? ' open' : ''}`}>
      <div className="sidebar-brand">
        <span className="sidebar-eyebrow">MEMPCO</span>
        <h3 className="sidebar-title">Admin Console</h3>
      </div>

      <nav className="sidebar-nav" aria-label="Admin navigation">
        {items.map(({ key, label, Icon: NavIcon }) => (
          <button
            key={key}
            type="button"
            className={`sidebar-nav-btn${active === key ? ' active' : ''}`}
            onClick={() => onNav(key)}
            aria-current={active === key ? 'page' : undefined}
          >
            <NavIcon />
            {label}
          </button>
        ))}

        {canAccessDepartmentConsoles && (
          <>
            <a className="sidebar-nav-btn sidebar-external-link" href={MARKETING_ADMIN_ROUTE}>
              <Megaphone className="sidebar-nav-icon" aria-hidden="true" />
              Marketing Console
              <ExternalLink className="sidebar-trailing-icon" aria-hidden="true" />
            </a>

            <a className="sidebar-nav-btn sidebar-external-link" href={HR_ADMIN_ROUTE}>
              <BriefcaseBusiness className="sidebar-nav-icon" aria-hidden="true" />
              HR Console
              <ExternalLink className="sidebar-trailing-icon" aria-hidden="true" />
            </a>
          </>
        )}

        <a className="sidebar-nav-btn sidebar-external-link" href={HRMAX_ROUTE}>
          <BriefcaseBusiness className="sidebar-nav-icon" aria-hidden="true" />
          HRMax
          <ExternalLink className="sidebar-trailing-icon" aria-hidden="true" />
        </a>

        <div className="sidebar-logout">
          <button type="button" className="sidebar-nav-btn" onClick={onLogout}>
            <Icon.Logout />
            Logout
          </button>
        </div>
      </nav>
    </aside>
  );
}

/* =========================
   SHARED COMPONENTS
========================= */

function StatCard({ icon, label, value, meta }) {
  return (
    <article className="stat-card glass">
      <div className="stat-card-head">
        <span className="stat-icon">{typeof icon === 'string' ? icon : <MonoIcon icon={icon} />}</span>
        <span className="stat-label">{label}</span>
      </div>
      <p className="stat-value">{value}</p>
      <span className="stat-meta">{meta}</span>
    </article>
  );
}

function TicketBadges({ ticket }) {
  const reachedFiveDayMark = hasBurnoutReachedFiveDayMark(ticket);
  const reachedThreeDayMark = hasBurnoutReachedThreeDayMark(ticket);

  return (
    <div className="ticket-badges admin-inline-badges">
      <span className={`status ${slugify(ticket.status)}`}>{ticket.status}</span>
      <span className={`priority ${slugify(ticket.sla)}`}>{ticket.sla}</span>
      {reachedFiveDayMark && <span className="status burnout-overdue">5-Day Mark</span>}
      {!reachedFiveDayMark && reachedThreeDayMark && <span className="status burnout-due">3-Day Mark</span>}
      {(ticket.saarRequired || ticket.saarAttachment?.name) && <span className="status saar">SAAR</span>}
    </div>
  );
}

function TicketHandlingIndicator({ ticket, compact = false, inline = false, metaPlacement = 'inline' }) {
  const handlingState = getTicketHandlingState(ticket);

  if (!handlingState) return null;

  const showMetaBelow = metaPlacement === 'below';
  const fullHandlingLabel = [
    handlingState.title,
    handlingState.detail,
    handlingState.meta,
  ].filter(Boolean).join('\n');

  return (
    <div
      className={[
        'ticket-handling-indicator',
        handlingState.tone,
        compact ? 'compact' : '',
        inline ? 'inline' : '',
        showMetaBelow ? 'meta-below' : '',
      ].filter(Boolean).join(' ')}
      aria-label={fullHandlingLabel.replace(/\n/g, '. ')}
      data-handling-summary={fullHandlingLabel}
      title={fullHandlingLabel}
    >
      <span className="ticket-handling-icon">
        <MonoIcon icon={handlingState.icon} />
      </span>
      <div className="ticket-handling-copy">
        <div className="ticket-handling-title-row">
          <strong>{handlingState.title}</strong>
          {!showMetaBelow && handlingState.meta && <span className="ticket-handling-meta">{handlingState.meta}</span>}
        </div>
        <p>{handlingState.detail}</p>
        {showMetaBelow && handlingState.meta && <span className="ticket-handling-meta">{handlingState.meta}</span>}
      </div>
    </div>
  );
}

function PreservedText({ value, fallback = 'No description provided.', className = '' }) {
  const text = value === null || value === undefined || value === '' ? fallback : String(value);

  return (
    <p
      className={className}
      style={{ whiteSpace: 'pre-wrap', overflowWrap: 'break-word', wordBreak: 'normal' }}
    >
      {text}
    </p>
  );
}

function PhotoAttachmentGallery({ photos = [], emptyText = 'No photo attachments.', onPreview }) {
  const validPhotos = Array.isArray(photos)
    ? photos.filter((photo) => photo?.dataUrl || photo?.url || photo?.publicUrl || photo?.path || photo?.name)
    : [];

  if (!validPhotos.length) {
    return <span className="ticket-form-hint">{emptyText}</span>;
  }

  return (
    <div className="attached-photo-grid">
      {validPhotos.map((photo, index) => {
        const source = photo.dataUrl || photo.url || photo.publicUrl || '';
        const fileName = photo.name || `Photo ${index + 1}`;

        const previewPayload = {
          source,
          fileName,
          sizeLabel: photo.sizeLabel || 'Image file',
        };

        return (
          <div key={photo.id || photo.path || `${fileName}-${index}`} className="attached-photo-card-wrap">
            {source && onPreview ? (
              <button
                type="button"
                className="attached-photo-card"
                onClick={() => onPreview(previewPayload)}
                aria-label={`Preview ${fileName}`}
              >
                <img src={source} alt={fileName} />
                <span>{fileName}</span>
                <em>{previewPayload.sizeLabel}</em>
              </button>
            ) : (
              <a
                className="attached-photo-card"
                href={source || '#'}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${fileName}`}
              >
              {source ? (
                <img src={source} alt={fileName} />
              ) : (
                <span className="attached-photo-placeholder"><MonoIcon icon={ImageIcon} /></span>
              )}
              <span>{fileName}</span>
              <em>{photo.sizeLabel || 'Image file'}</em>
              </a>
            )}

            {source && (
              <a className="attached-photo-save" href={source} download={fileName}>
                <MonoIcon icon={Download} />
                Save Image
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}

function BurnoutReportEditor({ ticket, report, onChange, readOnly }) {
  const updateReportField = (field, value) => {
    const nextReport = { ...report, [field]: value };

    if (field === 'startDate' && (!report.endDate || report.endDate < value)) {
      nextReport.endDate = addDaysToDateInput(value, 5);
    }

    onChange(nextReport);
  };

  const updateReportList = (listKey, rowId, updates) => {
    onChange({
      ...report,
      [listKey]: (report[listKey] || []).map((row) =>
        row.id === rowId ? { ...row, ...updates } : row
      ),
    });
  };

  const addSoftwareRow = () => {
    onChange({
      ...report,
      softwareChecklist: [
        ...(report.softwareChecklist || []),
        {
          id: createBurnoutRowId('software'),
          software: '',
          description: '',
          installed: false,
          remarks: '',
        },
      ],
    });
  };

  const removeSoftwareRow = (rowId) => {
    onChange({
      ...report,
      softwareChecklist: (report.softwareChecklist || []).filter((row) => row.id !== rowId),
    });
  };

  return (
    <section className="burnout-report-panel">
      <div className="burnout-report-head">
        <div>
          <span className="section-kicker">Burnout Process</span>
          <h4>Burnout Checklist and 3-5 Day Monitoring</h4>
        </div>
        <span className="helpdesk-badge">Admin editable</span>
      </div>

      <div className="burnout-basic-grid">
        <div className="ticket-meta-cell">
          <span>Branch</span>
          <p>{ticket.branch || 'Not provided'}</p>
        </div>
        <div className="ticket-meta-cell">
          <span>Department</span>
          <p>{ticket.department || 'Not provided'}</p>
        </div>
        <div className="ticket-meta-cell">
          <span>Brand & Model</span>
          <p>{ticket.brand || 'Not provided'}</p>
        </div>
        <div className="ticket-meta-cell">
          <span>Serial Number</span>
          <p>{ticket.serialNumber || 'Not provided'}</p>
        </div>
        <div className="ticket-meta-cell">
          <span>Model / Device</span>
          <p>{ticket.deviceName || ticket.deviceType || 'Not provided'}</p>
        </div>
        <div className="ticket-meta-cell">
          <span>User / Custodian</span>
          <p>{ticket.custodian || ticket.requester || 'Not provided'}</p>
        </div>
        <div className="ticket-meta-cell">
          <span>Request Date</span>
          <p>{report.requestedDate || ticket.createdAt || 'Not provided'}</p>
        </div>
        <div className="ticket-form-group">
          <label>Performed By</label>
          <input
            className="ticket-field ticket-input"
            value={report.performedBy || ''}
            onChange={(e) => updateReportField('performedBy', e.target.value)}
            readOnly={readOnly}
            placeholder="ICT staff name"
          />
        </div>
        <div className="ticket-form-group">
          <label>Start Date</label>
          <input
            className="ticket-field ticket-input"
            type="date"
            value={report.startDate || ''}
            onChange={(e) => updateReportField('startDate', e.target.value)}
            readOnly={readOnly}
          />
        </div>
        <div className="ticket-form-group">
          <label>End Date</label>
          <input
            className="ticket-field ticket-input"
            type="date"
            value={report.endDate || ''}
            onChange={(e) => updateReportField('endDate', e.target.value)}
            readOnly={readOnly}
          />
        </div>
      </div>

      <div className="burnout-table-block">
        <h5>Testing Checklist</h5>
        <div className="burnout-table-scroll">
          <table className="burnout-check-table">
            <thead>
              <tr>
                <th>Test Category</th>
                <th>Test Description</th>
                <th>Status</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {(report.testingChecklist || []).map((item) => (
                <tr key={item.id}>
                  <td>{item.category}</td>
                  <td>{item.description}</td>
                  <td>
                    <select
                      className="ticket-field ticket-select"
                      value={item.status || 'Pass'}
                      onChange={(e) => updateReportList('testingChecklist', item.id, { status: e.target.value })}
                      disabled={readOnly}
                    >
                      <option value="Pass">Pass</option>
                      <option value="Fail">Fail</option>
                      <option value="N/A">N/A</option>
                    </select>
                  </td>
                  <td>
                    <input
                      className="ticket-field ticket-input"
                      value={item.remarks || ''}
                      onChange={(e) => updateReportList('testingChecklist', item.id, { remarks: e.target.value })}
                      readOnly={readOnly}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="burnout-table-block">
        <div className="burnout-table-title-row">
          <h5>Software Installation Checklist</h5>
          {!readOnly && (
            <button type="button" className="modal-btn print compact" onClick={addSoftwareRow}>
              <MonoIcon icon={Plus} />
              Add Software
            </button>
          )}
        </div>
        <div className="burnout-table-scroll">
          <table className="burnout-check-table software-table">
            <thead>
              <tr>
                <th>Software</th>
                <th>Description</th>
                <th>Installed</th>
                <th>Remarks</th>
                {!readOnly && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {(report.softwareChecklist || []).map((item) => (
                <tr key={item.id}>
                  <td>
                    <input
                      className="ticket-field ticket-input"
                      value={item.software || ''}
                      onChange={(e) => updateReportList('softwareChecklist', item.id, { software: e.target.value })}
                      readOnly={readOnly}
                      placeholder="Software name"
                    />
                  </td>
                  <td>
                    <textarea
                      className="ticket-field ticket-textarea"
                      value={item.description || ''}
                      onChange={(e) => updateReportList('softwareChecklist', item.id, { description: e.target.value })}
                      readOnly={readOnly}
                      placeholder="Description"
                    />
                  </td>
                  <td>
                    <label className="burnout-check-toggle">
                      <input
                        type="checkbox"
                        checked={Boolean(item.installed)}
                        onChange={(e) => updateReportList('softwareChecklist', item.id, { installed: e.target.checked })}
                        disabled={readOnly}
                      />
                      <span>{item.installed ? 'Yes' : 'No'}</span>
                    </label>
                  </td>
                  <td>
                    <input
                      className="ticket-field ticket-input"
                      value={item.remarks || ''}
                      onChange={(e) => updateReportList('softwareChecklist', item.id, { remarks: e.target.value })}
                      readOnly={readOnly}
                      placeholder="Remarks"
                    />
                  </td>
                  {!readOnly && (
                    <td>
                      <button
                        type="button"
                        className="burnout-row-icon-btn"
                        onClick={() => removeSoftwareRow(item.id)}
                        aria-label={`Remove ${item.software || 'software row'}`}
                        title="Remove software"
                      >
                        <MonoIcon icon={Trash2} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="burnout-compact-grid">
        <div className="burnout-table-block">
          <h5>Burnout Monitoring (3-5 Days)</h5>
          {(report.monitoring || []).map((item) => (
            <div className="burnout-compact-row" key={item.id}>
              <strong>{item.item}</strong>
              <input
                className="ticket-field ticket-input"
                value={item.result || ''}
                onChange={(e) => updateReportList('monitoring', item.id, { result: e.target.value })}
                readOnly={readOnly}
              />
              <input
                className="ticket-field ticket-input"
                value={item.remarks || ''}
                onChange={(e) => updateReportList('monitoring', item.id, { remarks: e.target.value })}
                readOnly={readOnly}
              />
            </div>
          ))}
        </div>

        <div className="burnout-table-block">
          <h5>Final Evaluation</h5>
          {(report.finalEvaluation || []).map((item) => (
            <div className="burnout-compact-row" key={item.id}>
              <strong>{item.item}</strong>
              <input
                className="ticket-field ticket-input"
                value={item.status || ''}
                onChange={(e) => updateReportList('finalEvaluation', item.id, { status: e.target.value })}
                readOnly={readOnly}
              />
              <input
                className="ticket-field ticket-input"
                value={item.remarks || ''}
                onChange={(e) => updateReportList('finalEvaluation', item.id, { remarks: e.target.value })}
                readOnly={readOnly}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TicketConversationPanel({
  ticket,
  currentUser,
  messages,
  messageDraft,
  messagePhotos,
  messageError,
  isSending,
  floating = false,
  canSend = true,
  unreadCount = 0,
  onClose,
  onMessageChange,
  onPhotoChange,
  onRemovePhoto,
  onSend,
}) {
  const messageListRef = useRef(null);
  const disabledMessage =
    'Conversation is closed. Replies are available only while ICT is actively handling an unresolved ticket.';

  useEffect(() => {
    const messageList = messageListRef.current;

    if (!messageList) return;

    const scrollToLatest = (behavior = 'smooth') => {
      messageList.scrollTo({
        top: messageList.scrollHeight,
        behavior,
      });
    };

    scrollToLatest(messages.length > 1 ? 'smooth' : 'auto');
    const timer = window.setTimeout(() => scrollToLatest('smooth'), 80);

    return () => window.clearTimeout(timer);
  }, [messages.length]);

  const handleMessageKeyDown = (e) => {
    if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent?.isComposing || isSending || !canSend) return;

    e.preventDefault();
    onSend();
  };

  return (
    <section className={`ticket-conversation-section${floating ? ' floating-ticket-chat' : ''}`}>
      <div className="ticket-conversation-head">
        <div>
          <span className="section-kicker"><MonoIcon icon={MessageCircle} /> Conversation</span>
          <h4>
            {ticket?.id ? (
              <>
                <span className="ticket-chat-title-label">Ticket ID:</span>
                <span className="ticket-chat-title-id">{getTicketDisplayCode(ticket)}</span>
              </>
            ) : (
              'Admin and employee communication'
            )}
          </h4>
        </div>
        <span className="ticket-conversation-count">
          {unreadCount > 0 ? `${unreadCount} unread` : 'No unread'}
        </span>
        {onClose && (
          <button type="button" className="ticket-chat-close" onClick={onClose} aria-label="Minimize conversation">
            &times;
          </button>
        )}
      </div>

      <div className="ticket-message-list" ref={messageListRef}>
        {messages.length ? (
          messages.map((item) => {
            const isMine = item.senderId === currentUser?.id;

            return (
              <article key={item.id} className={`ticket-message-item${isMine ? ' mine' : ''}`}>
                <div className="ticket-message-meta">
                  <strong>{item.senderName}</strong>
                  <span>{item.senderRole} - {item.createdAt}</span>
                </div>
                <div className="ticket-message-bubble">
                  {item.message && <p>{item.message}</p>}
                  <PhotoAttachmentGallery photos={item.attachments} emptyText="" />
                </div>
              </article>
            );
          })
        ) : (
          <div className="ticket-message-empty">
            <MonoIcon icon={MessageCircle} />
            <p>No conversation yet. Send a message if you need more details from the employee.</p>
          </div>
        )}
      </div>

      <div className={`ticket-message-composer${canSend ? '' : ' locked'}`}>
        <textarea
          className="ticket-field ticket-textarea ticket-message-textarea"
          value={messageDraft}
          onChange={(e) => onMessageChange(e.target.value)}
          onKeyDown={handleMessageKeyDown}
          placeholder={canSend ? 'Write a reply or ask for more details...' : disabledMessage}
          maxLength={800}
          disabled={!canSend}
        />

        {messagePhotos.length > 0 && (
          <div className="message-photo-preview-row">
            {messagePhotos.map((photo) => (
              <button
                key={photo.id || photo.name}
                type="button"
                className="message-photo-preview"
                onClick={() => onRemovePhoto(photo.id)}
                title="Remove photo"
              >
                <img src={photo.dataUrl} alt={photo.name} />
                <span><MonoIcon icon={X} /></span>
              </button>
            ))}
          </div>
        )}

        <div className="ticket-message-actions">
          <label className={`message-attach-btn${canSend ? '' : ' disabled'}`}>
            <MonoIcon icon={Paperclip} />
            Attach photos
            <input type="file" accept={PHOTO_ACCEPT} multiple onChange={onPhotoChange} disabled={!canSend} />
          </label>
          <button type="button" className="modal-btn confirm" onClick={onSend} disabled={isSending || !canSend}>
            <MonoIcon icon={Send} />
            {isSending ? 'Sending...' : 'Send Reply'}
          </button>
        </div>

        {!canSend && <div className="ticket-chat-locked-note">{disabledMessage}</div>}
        {messageError && <div className="form-error">{messageError}</div>}
      </div>
    </section>
  );
}

function TicketWorkTimer({ ticket, now, compact = false }) {
  const startedAt = getTicketWorkStartedAt(ticket);
  const endedAt = getTicketWorkEndedAt(ticket);

  if (!startedAt) return null;

  const isRunning = isUnresolved(ticket.status) && !endedAt;
  const timerLabel = isBurnoutTicket(ticket)
    ? isRunning ? 'Burnout timer' : 'Burnout completed'
    : isRunning ? 'Work timer' : 'Work completed';

  return (
    <div className={`ticket-work-timer${compact ? ' compact' : ''}${isRunning ? ' running' : ' ended'}`}>
      <span><MonoIcon icon={Clock3} />{timerLabel}</span>
      <strong>{formatElapsedTime(startedAt, endedAt, now)}</strong>
      {!compact && (
        <p>
          Started {startedAt}
          {endedAt ? ` · Ended ${endedAt}` : ''}
        </p>
      )}
    </div>
  );
}

function TicketStatusTools({
  ticket,
  now,
  compact = false,
  timerCompact = compact,
  inline = false,
  className = '',
  metaPlacement = 'inline',
}) {
  const hasIndicator = Boolean(getTicketHandlingState(ticket));
  const hasTimer = Boolean(getTicketWorkStartedAt(ticket));

  if (!hasIndicator && !hasTimer) return null;

  return (
    <div
      className={[
        'ticket-status-tools',
        className,
        compact ? 'compact' : '',
        (!hasIndicator || !hasTimer) ? 'solo' : '',
      ].filter(Boolean).join(' ')}
    >
      <TicketHandlingIndicator
        ticket={ticket}
        compact={compact}
        inline={inline}
        metaPlacement={metaPlacement}
      />
      <TicketWorkTimer ticket={ticket} now={now} compact={timerCompact} />
    </div>
  );
}

function TicketPagination({ page, totalPages, totalItems, pageSize, onPageChange }) {
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="ticket-pagination" aria-label="Ticket pagination">
      <button
        type="button"
        className="pagination-arrow"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous ticket page"
      >
        <MonoIcon icon={ChevronLeft} />
      </button>

      <div className="pagination-copy">
        <strong>Page {page} of {totalPages}</strong>
        <span>Showing {start}-{end} of {totalItems} tickets</span>
      </div>

      <button
        type="button"
        className="pagination-arrow"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next ticket page"
      >
        <MonoIcon icon={ChevronRight} />
      </button>
    </div>
  );
}

function TicketTable({
  tickets,
  onOpenTicket,
  compact = false,
  handlingMetaPlacement = 'inline',
  emptyTitle = 'No tickets found',
  emptyDescription = 'New employee requests will appear here once submitted.',
  now,
  pagination = null,
  renderExtraActions = null,
}) {
  const visibleTickets = pagination ? pagination.tickets : tickets;

  return (
    <div className={`admin-ticket-queue${compact ? ' compact' : ''}`}>
      {tickets.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon"><MonoIcon icon={FileText} /></div>
          <h4>{emptyTitle}</h4>
          <p>{emptyDescription}</p>
        </div>
      )}

      {tickets.length > 0 && (
        <>
          <div className="admin-ticket-queue-grid">
            {visibleTickets.map((ticket) => (
              <article
                key={ticket.id}
                className="admin-ticket-card"
                role="button"
                tabIndex={0}
                aria-label={`View ticket ${getTicketDisplayCode(ticket)}`}
                onClick={() => onOpenTicket(ticket)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onOpenTicket(ticket);
                  }
                }}
              >
                <div className="admin-ticket-card-head">
                  <div className="admin-ticket-title">
                    <span className="ticket-id">{getTicketDisplayCode(ticket)}</span>
                    <h4>{ticket.concernType || 'Unspecified concern'}</h4>
                    <p>{ticket.createdAt || ticket.date || 'Submitted'}</p>
                  </div>

                  <TicketBadges ticket={ticket} />
                </div>

                <TicketHandlingIndicator
                  ticket={ticket}
                  compact={compact}
                  metaPlacement={handlingMetaPlacement}
                />

                <div className="admin-ticket-summary-grid">
                  <div>
                    <span><MonoIcon icon={UserRound} />Requester</span>
                    <strong>{ticket.requester || ticket.ownerEmail || 'Employee'}</strong>
                    <p>{ticket.department || 'No department'}</p>
                  </div>

                  <div>
                    <span><MonoIcon icon={Building2} />Branch</span>
                    <strong>{ticket.branch || 'Unspecified'}</strong>
                    <p>{ticket.supportCategory || 'No category'}</p>
                  </div>

                </div>

                {!compact && (
                  <PreservedText
                    className="admin-ticket-card-description"
                    value={ticket.description}
                  />
                )}

                <TicketWorkTimer ticket={ticket} now={now} compact={compact} />

                {renderExtraActions && (
                  <div
                    className="admin-ticket-card-actions"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    {renderExtraActions(ticket)}
                  </div>
                )}
              </article>
            ))}
          </div>

          {pagination && (
            <TicketPagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              pageSize={pagination.pageSize}
              onPageChange={pagination.onPageChange}
            />
          )}
        </>
      )}
    </div>
  );
}

function BreakdownItems({
  items,
  selectable = false,
  selectedKey = '',
  onSelect,
  countLabel = 'ticket',
}) {
  return (
    <div className={`admin-breakdown-list${selectable ? ' selectable' : ''}`}>
      {items.length === 0 ? (
        <div className="empty-state small">
          <p>No data available yet.</p>
        </div>
      ) : (
        items.map((item) => {
          const itemKey = item.key || item.name;
          const isSelected = selectable && itemKey === selectedKey;
          const Tag = selectable ? 'button' : 'div';
          const countText = item.countLabel || `${item.count} ${countLabel}${item.count === 1 ? '' : 's'}`;

          return (
            <Tag
              key={itemKey}
              type={selectable ? 'button' : undefined}
              className={`admin-breakdown-item${selectable ? ' selectable' : ''}${isSelected ? ' selected' : ''}`}
              onClick={selectable ? () => onSelect?.(item) : undefined}
              aria-pressed={selectable ? isSelected : undefined}
            >
              <div className="admin-breakdown-copy">
                <strong>{item.name}</strong>
                <span>{countText}</span>
              </div>
            </Tag>
          );
        })
      )}
    </div>
  );
}

function BreakdownList({ title, kicker, items, className = '' }) {
  return (
    <section className={`panel-card glass equal-panel ${className}`.trim()}>
      <div className="section-head">
        <div>
          <span className="section-kicker">{kicker}</span>
          <h3>{title}</h3>
        </div>
      </div>

      <BreakdownItems items={items} />
    </section>
  );
}

function AdminWorkloadPanel({ tickets }) {
  const workloadItems = useMemo(() => {
    const names = [...TECHNICIANS, 'Unassigned'];

    return names
      .map((name) => {
        const assignedTickets = tickets.filter((ticket) => {
          const technician = ticket.technician || 'Unassigned';

          if (name === 'Unassigned') {
            return !hasAssignedTechnician(ticket);
          }

          return technician === name;
        });
        const active = assignedTickets.filter((ticket) => isUnresolved(ticket.status)).length;
        const urgent = assignedTickets.filter(isSlaWatchTicket).length;
        const resolved = assignedTickets.filter(isTicketResolved).length;

        return {
          name,
          total: assignedTickets.length,
          active,
          urgent,
          resolved,
        };
      })
      .filter((item) => item.total > 0 || item.name !== 'Unassigned')
      .sort((a, b) =>
        b.active - a.active ||
        b.urgent - a.urgent ||
        b.total - a.total ||
        a.name.localeCompare(b.name)
      );
  }, [tickets]);
  const maxActive = Math.max(1, ...workloadItems.map((item) => item.active));

  return (
    <section className="panel-card glass equal-panel admin-workload-panel">
      <div className="section-head admin-workload-head">
        <div>
          <span className="section-kicker">Reports</span>
          <h3>Admin Workload</h3>
        </div>
        <span className="admin-workload-count">{workloadItems.length} staff</span>
      </div>

      <div className="admin-workload-list">
        {workloadItems.map((item) => {
          const loadPercent = Math.max(6, Math.round((item.active / maxActive) * 100));
          const isClear = item.active === 0;
          const hasUrgent = item.urgent > 0;

          return (
            <article
              key={item.name}
              className={`admin-workload-card${hasUrgent ? ' has-urgent' : ''}${isClear ? ' is-clear' : ''}`}
            >
              <div className="admin-workload-person">
                <span className="admin-workload-avatar">{getInitials(item.name)}</span>
                <div>
                  <strong>{item.name}</strong>
                  <p>{hasUrgent ? `${item.urgent} urgent item${item.urgent === 1 ? '' : 's'}` : isClear ? 'No active load' : `${item.active} active item${item.active === 1 ? '' : 's'}`}</p>
                </div>
              </div>

              <div className="admin-workload-meter" aria-label={`${item.name} active workload`}>
                <span style={{ width: `${loadPercent}%` }} />
              </div>

              <div className="admin-workload-stats">
                <div>
                  <em>Active</em>
                  <b>{item.active}</b>
                </div>
                <div>
                  <em>Urgent</em>
                  <b>{item.urgent}</b>
                </div>
                <div>
                  <em>Resolved</em>
                  <b>{item.resolved}</b>
                </div>
                <div>
                  <em>Total</em>
                  <b>{item.total}</b>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ReportMetric({ label, value, meta }) {
  return (
    <div className="report-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <em>{meta}</em>
    </div>
  );
}

function ReportCalendar({
  tickets,
  monthDate,
  selectedDateKey,
  selectedDateTickets,
  onDateSelect,
  onMonthChange,
  onOpenTicket,
}) {
  const calendar = buildCalendarMonth(tickets, monthDate);
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const [selectedTicketPage, setSelectedTicketPage] = useState(1);
  const selectedTicketTotalPages = Math.max(
    1,
    Math.ceil(selectedDateTickets.length / SELECTED_DAY_TICKET_PAGE_SIZE)
  );
  const selectedDatePagedTickets = selectedDateTickets.slice(
    (selectedTicketPage - 1) * SELECTED_DAY_TICKET_PAGE_SIZE,
    selectedTicketPage * SELECTED_DAY_TICKET_PAGE_SIZE
  );
  const busiestLabel = calendar.busiestDay?.count
    ? formatReportDate(new Date(`${calendar.busiestDay.key}T00:00:00`), { month: 'short', day: 'numeric' })
    : 'No activity';
  const selectedDateLabel = selectedDateKey
    ? formatReportDate(new Date(`${selectedDateKey}T00:00:00`), { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Select a date';
  const getLevel = (count) => {
    if (!count || !calendar.maxCount) return 'empty';
    const ratio = count / calendar.maxCount;

    if (ratio >= 0.75) return 'high';
    if (ratio >= 0.4) return 'medium';
    return 'low';
  };

  useEffect(() => {
    setSelectedTicketPage(1);
  }, [selectedDateKey]);

  useEffect(() => {
    setSelectedTicketPage((currentPage) => Math.min(currentPage, selectedTicketTotalPages));
  }, [selectedTicketTotalPages]);

  return (
    <section className="report-calendar-layout" aria-label="Calendar report">
      <div className="panel-card glass report-calendar-card">
        <div className="report-calendar-head">
          <div>
            <span className="section-kicker"><MonoIcon icon={CalendarDays} /> Calendar Report</span>
            <h3>{calendar.title}</h3>
          </div>

          <div className="report-calendar-nav">
            <button
              type="button"
              onClick={() => onMonthChange(-1)}
              aria-label="Previous report month"
            >
              <MonoIcon icon={ChevronLeft} />
            </button>
            <button
              type="button"
              onClick={() => onMonthChange(1)}
              aria-label="Next report month"
            >
              <MonoIcon icon={ChevronRight} />
            </button>
          </div>
        </div>

        <div className="report-calendar-grid" aria-label={`Ticket calendar for ${calendar.title}`}>
          {weekdays.map((day) => (
            <span
              key={day}
              className={`report-calendar-weekday ${day === 'Sun' || day === 'Sat' ? 'weekend' : ''}`}
            >
              {day}
            </span>
          ))}

          {calendar.cells.map((cell) => (
            <button
              type="button"
              key={cell.key}
              className={[
                'report-calendar-day',
                cell.isCurrentMonth ? '' : 'muted',
                cell.isToday ? 'today' : '',
                cell.isFuture ? 'future' : '',
                cell.key === selectedDateKey ? 'selected' : '',
                getLevel(cell.count),
              ].filter(Boolean).join(' ')}
              onClick={() => {
                if (!cell.isFuture) onDateSelect(cell);
              }}
              disabled={cell.isFuture}
              aria-label={`${cell.key}: ${cell.count} ticket${cell.count === 1 ? '' : 's'}`}
            >
              <span>{cell.day}</span>
              {cell.count > 0 && <strong>{cell.count}</strong>}
            </button>
          ))}
        </div>
      </div>

      <aside className="panel-card glass report-calendar-insights">
        <span className="section-kicker">Month Pulse</span>
        <h3>{calendar.monthTotal} tickets in report</h3>

        <div className="report-insight-list">
          <div className="report-insight-item primary">
            <span>Busiest Day</span>
            <strong>{busiestLabel}</strong>
            <em>{calendar.busiestDay.count} ticket{calendar.busiestDay.count === 1 ? '' : 's'}</em>
          </div>
          <div className="report-insight-item">
            <span>Active Days</span>
            <strong>{calendar.activeDays}</strong>
            <em>days with report tickets</em>
          </div>
          <div className="report-insight-item">
            <span>Daily Average</span>
            <strong>{calendar.averagePerActiveDay}</strong>
            <em>tickets per active day</em>
          </div>
          <div className="report-insight-item">
            <span>Peak Volume</span>
            <strong>{calendar.maxCount}</strong>
            <em>tickets in one day</em>
          </div>
        </div>

        <div className="report-selected-day">
          <div className="report-selected-day-head">
            <span>Selected Day</span>
            <strong>{selectedDateLabel}</strong>
          </div>

          {selectedDateKey ? (
            selectedDateTickets.length > 0 ? (
              <>
                <div className="report-selected-ticket-list">
                  {selectedDatePagedTickets.map((ticket, index) => (
                    <button
                      type="button"
                      key={`${ticket.id}-${ticket.reportEventType || 'event'}-${ticket.reportEventTimestamp || index}-${index}`}
                      className="report-selected-ticket"
                      onClick={() => onOpenTicket(ticket)}
                    >
                      <span>{getTicketDisplayCode(ticket)}</span>
                      <strong>{ticket.concernType || ticket.supportCategory || 'Ticket concern'}</strong>
                      <em>
                        {ticket.reportEventLabel || ticket.status} / {ticket.sla}
                      </em>
                    </button>
                  ))}
                </div>

                <div className="report-selected-ticket-pager" aria-label="Selected day ticket pages">
                  <button
                    type="button"
                    onClick={() => setSelectedTicketPage((page) => Math.max(1, page - 1))}
                    disabled={selectedTicketPage === 1}
                    aria-label="Previous selected day ticket page"
                  >
                    <ChevronLeft aria-hidden="true" />
                  </button>
                  <span>Page {selectedTicketPage}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedTicketPage((page) => Math.min(selectedTicketTotalPages, page + 1))}
                    disabled={selectedTicketPage === selectedTicketTotalPages}
                    aria-label="Next selected day ticket page"
                  >
                    <ChevronRight aria-hidden="true" />
                  </button>
                </div>
              </>
            ) : (
              <p className="report-selected-empty">No report tickets were found on this date.</p>
            )
          ) : (
            <p className="report-selected-empty">Choose a calendar date to backtrack report tickets.</p>
          )}
        </div>
      </aside>
    </section>
  );
}

/* =========================
   DASHBOARD VIEW
========================= */

function DashboardView({ tickets, summary, categorySummary, onGoTo, onOpenTicket, now }) {
  const [queuePage, setQueuePage] = useState(1);
  const waitingTickets = useMemo(() => {
    const getQueueTime = (ticket) => getSubmittedTime(ticket) || normalizeDate(ticket) || Number.MAX_SAFE_INTEGER;

    return tickets
      .filter((ticket) => {
        const lockExpiresAt = new Date(ticket.lockExpiresAt || '').getTime();
        const hasActiveLock = Boolean(
          ticket.lockedBy &&
          !Number.isNaN(lockExpiresAt) &&
          lockExpiresAt > now
        );

        return (
          isUnresolved(ticket.status) &&
          !isMovedDateTicket(ticket) &&
          !hasActiveLock &&
          !isTicketBeingHandled(ticket)
        );
      })
      .sort((a, b) => getQueueTime(a) - getQueueTime(b));
  }, [tickets, now]);
  const totalQueuePages = Math.max(1, Math.ceil(waitingTickets.length / DASHBOARD_QUEUE_PAGE_SIZE));
  const currentQueuePage = Math.min(queuePage, totalQueuePages);
  const pagedWaitingTickets = waitingTickets.slice(
    (currentQueuePage - 1) * DASHBOARD_QUEUE_PAGE_SIZE,
    currentQueuePage * DASHBOARD_QUEUE_PAGE_SIZE
  );
  const urgentTickets = tickets
    .filter(isSlaWatchTicket)
    .sort((a, b) => getSlaRank(a.sla) - getSlaRank(b.sla) || normalizeDate(b) - normalizeDate(a))
    .slice(0, 5);
  const movedDateTickets = tickets
    .filter(isMovedDateTicket)
    .sort((a, b) => normalizeDate(b) - normalizeDate(a))
    .slice(0, 5);

  useEffect(() => {
    setQueuePage((page) => Math.min(page, totalQueuePages));
  }, [totalQueuePages]);

  return (
    <div className="dashboard-view">
      <section className="panel-card glass hero-panel admin-hero-panel">
        <div className="hero-copy">
          <span className="section-kicker">IT Helpdesk Admin Console</span>
        </div>
      </section>

      <section className="stats-grid" aria-label="Admin statistics">
        <StatCard icon={FileText} label="Total Tickets" value={summary.total} meta="All received concerns" />
        <StatCard icon={Clock3} label="New / Modified" value={summary.created + summary.modified} meta="Needs admin review" />
        <StatCard icon={Wrench} label="In Progress" value={summary.inProgress} meta="Currently handled" />
        <StatCard icon={ShieldCheck} label="High / Critical" value={summary.critical} meta="Needs immediate attention" />
      </section>

      <div className="dashboard-columns equal-columns">
        <div className="dashboard-stack">
          <section className="panel-card glass equal-panel">
            <div className="section-head">
              <div>
                <span className="section-kicker">Ticket Queue</span>
                <h3>Employee Concerns</h3>
              </div>
            </div>

            <TicketTable
              tickets={waitingTickets}
              onOpenTicket={onOpenTicket}
              emptyTitle="No new tickets waiting"
              emptyDescription="Newly submitted tickets will appear here before ICT starts catering them."
              now={now}
              pagination={{
                tickets: pagedWaitingTickets,
                page: currentQueuePage,
                totalPages: totalQueuePages,
                totalItems: waitingTickets.length,
                pageSize: DASHBOARD_QUEUE_PAGE_SIZE,
                onPageChange: setQueuePage,
              }}
            />
          </section>
        </div>

        <div className="dashboard-stack">
          <section className="panel-card glass equal-panel">
            <div className="section-head">
              <div>
                <span className="section-kicker">SLA Watchlist</span>
                <h3>Urgent Concerns</h3>
              </div>
            </div>

            <div className="admin-watchlist">
              {urgentTickets.length === 0 ? (
                <div className="empty-state small">
                  <h4>No urgent unresolved tickets.</h4>
                  <p>High and critical tickets will appear here automatically.</p>
                </div>
              ) : (
                urgentTickets.map((ticket) => (
                  <article
                    key={ticket.id}
                    className="admin-watch-card"
                    role="button"
                    tabIndex={0}
                    aria-label={`View ticket ${getTicketDisplayCode(ticket)}`}
                    onClick={() => onOpenTicket(ticket)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onOpenTicket(ticket);
                      }
                    }}
                  >
                    <div>
                      <span className="ticket-id">{getTicketDisplayCode(ticket)}</span>
                      <h4>{ticket.concernType || 'Unspecified concern'}</h4>
                      <p>{ticket.branch || 'No branch'} · {ticket.requester || ticket.ownerEmail || 'Employee'}</p>
                    </div>

                    <TicketBadges ticket={ticket} />
                    <TicketWorkTimer ticket={ticket} now={now} compact />
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="panel-card glass equal-panel">
            <div className="section-head">
              <div>
                <span className="section-kicker">Moved Date</span>
                <h3>Moved Date Concerns</h3>
              </div>
            </div>

            <div className="admin-watchlist">
              {movedDateTickets.length === 0 ? (
                <div className="empty-state small">
                  <h4>No moved-date tickets.</h4>
                  <p>Concerns moved to another date will appear here for follow-up.</p>
                </div>
              ) : (
                movedDateTickets.map((ticket) => (
                  <article
                    key={ticket.id}
                    className="admin-watch-card"
                    role="button"
                    tabIndex={0}
                    aria-label={`View ticket ${getTicketDisplayCode(ticket)}`}
                    onClick={() => onOpenTicket(ticket)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onOpenTicket(ticket);
                      }
                    }}
                  >
                    <div>
                      <span className="ticket-id">{getTicketDisplayCode(ticket)}</span>
                      <h4>{ticket.concernType || 'Unspecified concern'}</h4>
                      <p>{ticket.branch || 'No branch'} · {ticket.requester || ticket.ownerEmail || 'Employee'}</p>
                      <p>Moved / Updated: {ticket.adminUpdatedAt || ticket.lastUpdated || 'No moved date recorded'}</p>
                    </div>

                    <TicketBadges ticket={ticket} />
                    <TicketWorkTimer ticket={ticket} now={now} compact />
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/* =========================
   TICKETS VIEW
========================= */

function TicketsView({
  tickets,
  filteredTickets,
  filters,
  setFilters,
  onOpenTicket,
  now,
  scope = 'all',
}) {
  const pageSize = 2;
  const [ticketPage, setTicketPage] = useState(1);
  const clearFilters = () => setFilters({ search: '', status: 'All', branch: 'All', category: 'All', sla: 'All' });
  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / pageSize));
  const currentPage = Math.min(ticketPage, totalPages);
  const pagedTickets = filteredTickets.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const goToTicketPage = (page) => setTicketPage(Math.min(Math.max(page, 1), totalPages));
  const isSupportScope = scope === 'support';
  const ticketCopy = isSupportScope
    ? {
        kicker: 'Support Tickets',
        emptyTitle: 'No support tickets found',
        emptyDescription: 'Regular ICT support requests will appear here once submitted.',
        searchPlaceholder: 'Search support ID, requester, branch, category, concern, device, status...',
      }
    : {
        kicker: 'All Tickets',
        emptyTitle: 'No tickets found',
        emptyDescription: 'New employee requests will appear here once submitted.',
        searchPlaceholder: 'Search ID, requester, branch, support, concern, device, status...',
      };
  const categoryOptions = isSupportScope
    ? SUPPORT_CATEGORIES.filter((category) => category !== 'Burnout')
    : SUPPORT_CATEGORIES;
  const statusFilterOptions = isSupportScope
    ? TICKET_STATUSES
    : Array.from(new Set([...TICKET_STATUSES, ...BURNOUT_TICKET_STATUSES]));

  useEffect(() => {
    if (isSupportScope && filters.category === 'Burnout') {
      setFilters((prev) => ({ ...prev, category: 'All' }));
    }
  }, [isSupportScope, filters.category, setFilters]);

  useEffect(() => {
    if (isSupportScope && BURNOUT_TICKET_STATUSES.includes(filters.status)) {
      setFilters((prev) => ({ ...prev, status: 'All' }));
    }
  }, [isSupportScope, filters.status, setFilters]);

  useEffect(() => {
    setTicketPage(1);
  }, [filters.search, filters.status, filters.branch, filters.category, filters.sla, scope]);

  useEffect(() => {
    if (ticketPage > totalPages) {
      setTicketPage(totalPages);
    }
  }, [ticketPage, totalPages]);

  return (
    <div className="helpdesk-view">
      <section className="panel-card glass helpdesk-banner">
        <div className="helpdesk-banner-copy">
          <span className="section-kicker">{ticketCopy.kicker}</span>
        </div>
      </section>

      <section className="ticket-queue-shell">
        <div className="admin-filter-grid">
          <div className="ticket-form-group full search-field-group">
            <label htmlFor="search">Search Ticket</label>
            <span className="field-leading-icon" aria-hidden="true">
              <MonoIcon icon={Search} />
            </span>
            <input
              id="search"
              className="ticket-field ticket-input"
              type="search"
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              placeholder={ticketCopy.searchPlaceholder}
            />
          </div>

          <div className="ticket-form-group">
            <label>Status</label>
            <select
              className="ticket-field ticket-select"
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
            >
              <option value="All">All Status</option>
              {statusFilterOptions.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          <div className="ticket-form-group">
            <label>Branch</label>
            <select
              className="ticket-field ticket-select"
              value={filters.branch}
              onChange={(e) => setFilters((prev) => ({ ...prev, branch: e.target.value }))}
            >
              <option value="All">All Branches</option>
              {BRANCHES.map((branch) => (
                <option key={branch} value={branch}>{branch}</option>
              ))}
            </select>
          </div>

          <div className="ticket-form-group">
            <label>Category</label>
            <select
              className="ticket-field ticket-select"
              value={filters.category}
              onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
            >
              <option value="All">All Categories</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div className="ticket-form-group">
            <label>SLA</label>
            <select
              className="ticket-field ticket-select"
              value={filters.sla}
              onChange={(e) => setFilters((prev) => ({ ...prev, sla: e.target.value }))}
            >
              <option value="All">All SLA</option>
              {SLA_LEVELS.map((sla) => (
                <option key={sla} value={sla}>{sla}</option>
              ))}
            </select>
          </div>

          <button type="button" className="quick-action-btn filter-clear-btn" onClick={clearFilters}>
            <MonoIcon icon={SlidersHorizontal} />
            Clear Filters
          </button>
        </div>

        <TicketTable
          tickets={filteredTickets}
          onOpenTicket={onOpenTicket}
          handlingMetaPlacement={scope === 'all' || scope === 'support' ? 'below' : 'inline'}
          now={now}
          pagination={{
            tickets: pagedTickets,
            page: currentPage,
            totalPages,
            totalItems: filteredTickets.length,
            pageSize,
            onPageChange: goToTicketPage,
          }}
        />
      </section>
    </div>
  );
}

/* =========================
   BURNOUT REPORT VIEW
========================= */

function BurnoutReportView({ tickets, onOpenTicket, now }) {
  const pageSize = 2;
  const burnoutMonthInputRef = useRef(null);
  const [ticketPage, setTicketPage] = useState(1);
  const [filters, setFilters] = useState({
    search: '',
    status: 'All',
    branch: 'All',
  });
  const burnoutTickets = useMemo(() => sortTickets(tickets.filter(isBurnoutTicket)), [tickets]);
  const [burnoutMonth, setBurnoutMonth] = useState(() => getTicketCalendarMonth(tickets.filter(isBurnoutTicket)));
  const filteredTickets = useMemo(() => {
    const search = filters.search.toLowerCase().trim();

    return burnoutTickets.filter((ticket) => {
      const matchesSearch = !search || getTicketSearchText(ticket).includes(search);
      const matchesStatus = filters.status === 'All' || ticket.status === filters.status;
      const matchesBranch = filters.branch === 'All' || ticket.branch === filters.branch;

      return matchesSearch && matchesStatus && matchesBranch;
    });
  }, [burnoutTickets, filters]);
  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / pageSize));
  const currentPage = Math.min(ticketPage, totalPages);
  const pagedTickets = filteredTickets.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const monthlyBurnoutData = useMemo(
    () => getMonthlyBurnoutSummaryData(burnoutTickets, burnoutMonth),
    [burnoutTickets, burnoutMonth]
  );
  const activeCount = burnoutTickets.filter((ticket) => isUnresolved(ticket.status)).length;
  const monitoringCount = burnoutTickets.filter((ticket) => isBurnoutMonitoringStatus(ticket.status)).length;
  const completedCount = burnoutTickets.filter((ticket) => isBurnoutClosedStatus(ticket.status)).length;
  const softwareCompleteCount = burnoutTickets.filter((ticket) => {
    const softwareChecklist = Array.isArray(ticket.burnoutReport?.softwareChecklist)
      ? ticket.burnoutReport.softwareChecklist
      : [];

    return softwareChecklist.length > 0 && softwareChecklist.every((item) => item.installed);
  }).length;
  const clearFilters = () => setFilters({ search: '', status: 'All', branch: 'All' });
  const goToTicketPage = (page) => setTicketPage(Math.min(Math.max(page, 1), totalPages));
  const openBurnoutMonthPicker = () => {
    const monthInput = burnoutMonthInputRef.current;

    if (!monthInput) return;

    try {
      if (typeof monthInput.showPicker === 'function') {
        monthInput.showPicker();
        return;
      }
    } catch {
      // Fall back to focusing the native input if the browser blocks showPicker.
    }

    monthInput.focus();
    monthInput.click();
  };

  useEffect(() => {
    setTicketPage(1);
  }, [filters.search, filters.status, filters.branch]);

  useEffect(() => {
    if (ticketPage > totalPages) {
      setTicketPage(totalPages);
    }
  }, [ticketPage, totalPages]);

  return (
    <div className="helpdesk-view burnout-report-view">
      <section className="panel-card glass helpdesk-banner">
        <div className="helpdesk-banner-copy">
          <span className="section-kicker">Burnout Tickets</span>
        </div>

        <div className="helpdesk-banner-actions">
          <div className="burnout-month-actions" aria-label="Monthly Burnout summary actions">
            <div className="burnout-month-picker">
              <button
                type="button"
                className="burnout-month-trigger"
                onClick={openBurnoutMonthPicker}
                aria-label={`Choose Monthly Summary month, currently ${monthlyBurnoutData.monthTitle}`}
              >
                <MonoIcon icon={CalendarDays} />
                <span className="burnout-month-label">Monthly Summary</span>
                <span className="burnout-month-value">{monthlyBurnoutData.monthTitle}</span>
              </button>
              <input
                ref={burnoutMonthInputRef}
                className="burnout-month-native"
                type="month"
                tabIndex={-1}
                value={getMonthInputValue(burnoutMonth)}
                onChange={(event) => setBurnoutMonth(getMonthDateFromInput(event.target.value))}
                aria-label="Monthly Summary month"
              />
            </div>
            <button
              type="button"
              className="report-print-btn"
              onClick={() => printMonthlyBurnoutSummaryReport(burnoutTickets, burnoutMonth)}
              disabled={!burnoutTickets.length}
            >
              <MonoIcon icon={Printer} />
              Print Monthly
            </button>
            <button
              type="button"
              className="report-print-btn"
              onClick={() => exportMonthlyBurnoutSummaryExcel(burnoutTickets, burnoutMonth)}
              disabled={!burnoutTickets.length}
            >
              <MonoIcon icon={Download} />
              Export Monthly Excel
            </button>
          </div>
        </div>
      </section>

      <section className="stats-grid burnout-report-stats" aria-label="Burnout report summary">
        <StatCard icon={FileText} label="Total Burnout" value={burnoutTickets.length} meta="submitted requests" />
        <StatCard icon={Clock3} label="Active" value={activeCount} meta="not yet resolved" />
        <StatCard icon={Monitor} label="Monitoring" value={monitoringCount} meta="3-5 day process" />
        <StatCard icon={ShieldCheck} label="Completed" value={completedCount} meta={`${softwareCompleteCount} software-ready`} />
        <StatCard
          icon={CalendarDays}
          label="Monthly Summary"
          value={monthlyBurnoutData.monthlyTickets.length}
          meta={monthlyBurnoutData.monthTitle}
        />
      </section>

      <section className="ticket-queue-shell">
        <div className="admin-filter-grid burnout-filter-grid">
          <div className="ticket-form-group full search-field-group">
            <label htmlFor="burnout-search">Search Burnout Tickets</label>
            <span className="field-leading-icon" aria-hidden="true">
              <MonoIcon icon={Search} />
            </span>
            <input
              id="burnout-search"
              className="ticket-field ticket-input"
              type="search"
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              placeholder="Search ticket code, requester, custodian, brand/model, serial, branch, device..."
            />
          </div>

          <div className="ticket-form-group">
            <label>Status</label>
            <select
              className="ticket-field ticket-select"
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
            >
              <option value="All">All Status</option>
              {BURNOUT_TICKET_STATUSES.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          <div className="ticket-form-group">
            <label>Branch</label>
            <select
              className="ticket-field ticket-select"
              value={filters.branch}
              onChange={(e) => setFilters((prev) => ({ ...prev, branch: e.target.value }))}
            >
              <option value="All">All Branches</option>
              {BRANCHES.map((branch) => (
                <option key={branch} value={branch}>{branch}</option>
              ))}
            </select>
          </div>

          <button type="button" className="quick-action-btn filter-clear-btn" onClick={clearFilters}>
            <MonoIcon icon={SlidersHorizontal} />
            Clear Filters
          </button>
        </div>

        <TicketTable
          tickets={filteredTickets}
          onOpenTicket={onOpenTicket}
          handlingMetaPlacement="below"
          emptyTitle="No burnout tickets found"
          emptyDescription="Burnout unit condition checks will appear here once submitted."
          now={now}
          renderExtraActions={(ticket) => (
            <>
              <button type="button" className="ticket-action-btn" onClick={() => printBurnoutReport(ticket)}>
                <MonoIcon icon={Printer} />
                Print
              </button>
              <button type="button" className="ticket-action-btn" onClick={() => exportBurnoutReportExcel(ticket)}>
                <MonoIcon icon={Download} />
                Excel
              </button>
            </>
          )}
          pagination={{
            tickets: pagedTickets,
            page: currentPage,
            totalPages,
            totalItems: filteredTickets.length,
            pageSize,
            onPageChange: goToTicketPage,
          }}
        />
      </section>
    </div>
  );
}

/* =========================
   BRANCHES VIEW
========================= */

function BranchesView({ branchSummary, tickets, onOpenTicket, now }) {
  const BRANCH_PAGE_SIZE = 2;
  const BRANCH_SUMMARY_PAGE_SIZE = 6;
  const activeTickets = sortTickets(tickets.filter((ticket) => isUnresolved(ticket.status)));
  const [branchTicketPage, setBranchTicketPage] = useState(1);
  const [branchSummaryPage, setBranchSummaryPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(activeTickets.length / BRANCH_PAGE_SIZE));
  const currentPage = Math.min(branchTicketPage, totalPages);
  const branchStats = BRANCHES.map((branchName) => {
    const branchTickets = tickets.filter((ticket) => ticket.branch === branchName);
    const unresolved = branchTickets.filter((ticket) => isUnresolved(ticket.status)).length;
    const urgent = branchTickets.filter(isSlaWatchTicket).length;
    const resolved = branchTickets.filter(isTicketResolved).length;
    const latestTicket = sortTickets(branchTickets)[0] || null;

    return {
      name: branchName,
      count: branchTickets.length,
      unresolved,
      urgent,
      resolved,
      latestTicket,
    };
  }).sort((a, b) =>
    b.urgent - a.urgent ||
    b.unresolved - a.unresolved ||
    b.count - a.count ||
    a.name.localeCompare(b.name)
  );
  const branchSummaryTotalPages = Math.max(1, Math.ceil(branchStats.length / BRANCH_SUMMARY_PAGE_SIZE));
  const currentBranchSummaryPage = Math.min(branchSummaryPage, branchSummaryTotalPages);
  const pagedTickets = activeTickets.slice(
    (currentPage - 1) * BRANCH_PAGE_SIZE,
    currentPage * BRANCH_PAGE_SIZE
  );
  const pagedBranchSummary = branchStats.slice(
    (currentBranchSummaryPage - 1) * BRANCH_SUMMARY_PAGE_SIZE,
    currentBranchSummaryPage * BRANCH_SUMMARY_PAGE_SIZE
  );
  const activeBranchCount = branchStats.filter((branch) =>
    tickets.some((ticket) => ticket.branch === branch.name && isUnresolved(ticket.status))
  ).length;
  const clearBranchCount = Math.max(0, BRANCHES.length - activeBranchCount);
  const urgentCount = activeTickets.filter(isSlaWatchTicket).length;
  const busiestBranch = branchStats.find((branch) => branch.unresolved > 0) || branchStats[0];
  const goToBranchPage = (page) => setBranchTicketPage(Math.min(Math.max(page, 1), totalPages));
  const goToBranchSummaryPage = (page) =>
    setBranchSummaryPage(Math.min(Math.max(page, 1), branchSummaryTotalPages));

  useEffect(() => {
    if (branchTicketPage > totalPages) {
      setBranchTicketPage(totalPages);
    }
  }, [branchTicketPage, totalPages]);

  useEffect(() => {
    if (branchSummaryPage > branchSummaryTotalPages) {
      setBranchSummaryPage(branchSummaryTotalPages);
    }
  }, [branchSummaryPage, branchSummaryTotalPages]);

  return (
    <div className="dashboard-view branch-monitor-view">
      <section className="branch-monitor-overview" aria-label="Branch monitoring overview">
        <article className="glass branch-overview-card branch-overview-card--primary">
          <span className="branch-overview-icon"><MonoIcon icon={Building2} /></span>
          <div>
            <span>Branch Coverage</span>
            <strong>{activeBranchCount}/{BRANCHES.length}</strong>
            <p>branches with active ICT concerns</p>
          </div>
        </article>

        <article className="glass branch-overview-card">
          <span className="branch-overview-icon"><MonoIcon icon={FileText} /></span>
          <div>
            <span>Unresolved</span>
            <strong>{activeTickets.length}</strong>
            <p>tickets needing admin action</p>
          </div>
        </article>

        <article className="glass branch-overview-card">
          <span className="branch-overview-icon"><MonoIcon icon={Clock3} /></span>
          <div>
            <span>Urgent Watch</span>
            <strong>{urgentCount}</strong>
            <p>high or critical SLA items</p>
          </div>
        </article>

        <article className="glass branch-overview-card">
          <span className="branch-overview-icon"><MonoIcon icon={ShieldCheck} /></span>
          <div>
            <span>Clear Branches</span>
            <strong>{clearBranchCount}</strong>
            <p>{busiestBranch?.unresolved ? `${busiestBranch.name} has the highest load` : 'all branches are clear'}</p>
          </div>
        </article>
      </section>

      <section className="panel-card glass branch-monitor-panel">
        <div className="section-head branch-monitor-head">
          <div>
            <span className="section-kicker">Active Branch Requests</span>
            <h3>Branch operations watchlist.</h3>
          </div>
        </div>

        {activeTickets.length === 0 ? (
          <div className="empty-state branch-monitor-empty">
            <div className="empty-icon"><MonoIcon icon={Building2} /></div>
            <h4>No unresolved branch requests</h4>
            <p>Submitted employee tickets will appear here while they are still unresolved.</p>
          </div>
        ) : (
          <>
            <div className="branch-monitor-ticket-grid">
              {pagedTickets.map((ticket) => (
                <article
                  key={ticket.id}
                  className={`admin-ticket-card branch-monitor-ticket-card${isSlaWatchTicket(ticket) ? ' is-urgent' : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`View ticket ${getTicketDisplayCode(ticket)}`}
                  onClick={() => onOpenTicket(ticket)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onOpenTicket(ticket);
                    }
                  }}
                >
                  <div className="admin-ticket-card-head">
                    <div className="admin-ticket-title">
                      <span className="ticket-id">{getTicketDisplayCode(ticket)}</span>
                      <h4>{ticket.concernType || ticket.supportCategory || 'Unspecified concern'}</h4>
                      <p>{ticket.createdAt || ticket.date || 'Submitted'}</p>
                    </div>

                    <TicketBadges ticket={ticket} />
                  </div>

                  <TicketHandlingIndicator ticket={ticket} compact metaPlacement="below" />

                  <div className="admin-ticket-summary-grid">
                    <div>
                      <span><MonoIcon icon={UserRound} />Requester</span>
                      <strong>{ticket.requester || ticket.ownerEmail || 'Employee'}</strong>
                      <p>{ticket.department || 'No department'}</p>
                    </div>
                    <div>
                      <span><MonoIcon icon={Building2} />Branch</span>
                      <strong>{ticket.branch || 'Unspecified'}</strong>
                      <p>{ticket.supportCategory || 'No category'}</p>
                    </div>
                  </div>

                  <PreservedText
                    className="admin-ticket-card-description"
                    value={ticket.description}
                  />

                  <TicketWorkTimer ticket={ticket} now={now} compact />
                </article>
              ))}
            </div>

            <div className="branch-monitor-page-control" aria-label="Branch monitor ticket pages">
              <button
                type="button"
                onClick={() => goToBranchPage(currentPage - 1)}
                disabled={currentPage <= 1}
                aria-label="Previous branch ticket page"
              >
                <ChevronLeft aria-hidden="true" />
              </button>
              <span>Page {currentPage}</span>
              <button
                type="button"
                onClick={() => goToBranchPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                aria-label="Next branch ticket page"
              >
                <ChevronRight aria-hidden="true" />
              </button>
            </div>
          </>
        )}
      </section>

      {branchStats.length > 0 && (
        <section className="branch-summary-section" aria-label="Branch ticket summary">
          <div className="section-head branch-summary-head">
            <div>
              <span className="section-kicker">Branch Health</span>
              <h3>Ticket load by location.</h3>
            </div>
            <span className="branch-summary-range">
              Showing {((currentBranchSummaryPage - 1) * BRANCH_SUMMARY_PAGE_SIZE) + 1}-{Math.min(currentBranchSummaryPage * BRANCH_SUMMARY_PAGE_SIZE, branchStats.length)} of {branchStats.length}
            </span>
          </div>

          <div className="branch-monitor-branch-summary">
            {pagedBranchSummary.map((branch) => {
              const branchState = branch.urgent > 0 ? 'urgent' : branch.unresolved > 0 ? 'active' : 'clear';
              const branchLabel = branchState === 'urgent'
                ? 'Urgent'
                : branchState === 'active'
                  ? 'Active'
                  : 'Clear';
              const activeLabel = `${branch.unresolved} active`;
              const urgentLabel = `${branch.urgent} urgent`;

              return (
                <article key={branch.name} className={`branch-health-card is-${branchState}`}>
                  <div className="branch-health-main">
                    <span className="branch-health-state">
                      <span className="branch-health-dot" />
                      {branchLabel}
                    </span>
                    <strong>{branch.name}</strong>
                    <p>
                      {branch.latestTicket
                        ? branch.latestTicket.concernType || branch.latestTicket.supportCategory || 'Latest ticket recorded'
                        : 'No tickets recorded yet'}
                    </p>
                  </div>

                  <div className="branch-health-metrics" aria-label={`${branch.name} ticket summary`}>
                    <div>
                      <em>Total</em>
                      <b>{branch.count}</b>
                    </div>
                    <div>
                      <em>Active</em>
                      <b>{branch.unresolved}</b>
                    </div>
                    <div>
                      <em>Resolved</em>
                      <b>{branch.resolved}</b>
                    </div>
                    <div>
                      <em>Urgent</em>
                      <b>{branch.urgent}</b>
                    </div>
                  </div>

                  <div className="branch-health-foot">
                    <span>{activeLabel}</span>
                    <span>{urgentLabel}</span>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="branch-monitor-page-control branch-summary-page-control" aria-label="Branch summary pages">
            <button
              type="button"
              onClick={() => goToBranchSummaryPage(currentBranchSummaryPage - 1)}
              disabled={currentBranchSummaryPage <= 1}
              aria-label="Previous branch summary page"
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <span>Page {currentBranchSummaryPage}</span>
            <button
              type="button"
              onClick={() => goToBranchSummaryPage(currentBranchSummaryPage + 1)}
              disabled={currentBranchSummaryPage >= branchSummaryTotalPages}
              aria-label="Next branch summary page"
            >
              <ChevronRight aria-hidden="true" />
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

/* =========================
   REPORTS VIEW
========================= */

function ReportsView({ tickets, summary, categorySummary, statusSummary, branchSummary, onOpenTicket }) {
  const [periodMode, setPeriodMode] = useState('day');
  const [calendarMonth, setCalendarMonth] = useState(null);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState('');
  const [selectedPrintDayKey, setSelectedPrintDayKey] = useState('');
  const [selectedPrintWeekKey, setSelectedPrintWeekKey] = useState('');
  const [periodPageByMode, setPeriodPageByMode] = useState({ day: 1, week: 1, month: 1 });
  const concernSummary = breakdown(tickets, 'concernType').slice(0, 10);
  const slaSummary = breakdown(tickets, 'sla', SLA_LEVELS);
  const reportActivityRows = useMemo(
    () => tickets.flatMap((ticket) => getTicketReportEvents(ticket)),
    [tickets]
  );
  const statusActivitySummary = useMemo(
    () => breakdown(reportActivityRows, 'reportStatus', ['Submitted', ...TICKET_STATUSES]),
    [reportActivityRows]
  );
  const monthPrintOptions = useMemo(() => buildPeriodPrintOptions(tickets, 'month'), [tickets]);
  const selectedPeriod = REPORT_PERIOD_OPTIONS.find((option) => option.key === periodMode) || REPORT_PERIOD_OPTIONS[0];
  const dayPrintOptions = useMemo(() => buildPeriodPrintOptions(tickets, 'day'), [tickets]);
  const weekPrintOptions = useMemo(() => buildPeriodPrintOptions(tickets, 'week'), [tickets]);
  const selectedPrintOptions = selectedPeriod.key === 'week' ? weekPrintOptions : dayPrintOptions;
  const selectedPrintKey = selectedPeriod.key === 'week' ? selectedPrintWeekKey : selectedPrintDayKey;
  const selectedPrintOption = selectedPrintOptions.find((option) => option.key === selectedPrintKey) || null;
  const selectablePeriodItems = selectedPrintOptions.map((option) => ({
    key: option.key,
    name: option.name,
    count: option.ticketCount || option.count,
    countLabel: `${option.ticketCount || option.count} ticket${(option.ticketCount || option.count) === 1 ? '' : 's'}`,
  }));
  const monthPeriodItems = monthPrintOptions.map((option) => ({
    key: option.key,
    name: option.name,
    count: option.ticketCount || option.count,
    countLabel: `${option.ticketCount || option.count} ticket${(option.ticketCount || option.count) === 1 ? '' : 's'}`,
  }));
  const selectedPeriodItems = selectedPeriod.key === 'month' ? monthPeriodItems : selectablePeriodItems;
  const selectedPeriodPage = periodPageByMode[selectedPeriod.key] || 1;
  const selectedPeriodTotalPages = Math.max(1, Math.ceil(selectedPeriodItems.length / REPORT_PERIOD_PAGE_SIZE));
  const safeSelectedPeriodPage = Math.min(selectedPeriodPage, selectedPeriodTotalPages);
  const selectedBreakdownItems = selectedPeriodItems.slice(
    (safeSelectedPeriodPage - 1) * REPORT_PERIOD_PAGE_SIZE,
    safeSelectedPeriodPage * REPORT_PERIOD_PAGE_SIZE
  );
  const hasPeriodPages = selectedPeriodTotalPages > 1;
  const activeCalendarMonth = calendarMonth || getTicketCalendarMonth(tickets);
  const selectedDateTickets = selectedCalendarDate
    ? getMonthlyTicketAnchorEvents(tickets, activeCalendarMonth)
        .filter((event) => event.key === selectedCalendarDate)
        .map((event) => ({
          ...event.ticket,
          reportEventLabel: event.label,
          reportEventType: event.type,
          reportEventTimestamp: event.timestamp,
          reportDate: event.reportDate,
          reportDateLabel: event.reportDateLabel,
          reportStatus: event.reportStatus,
        }))
        .sort((a, b) => b.reportEventTimestamp - a.reportEventTimestamp || normalizeDate(b) - normalizeDate(a))
    : [];

  useEffect(() => {
    if (!dayPrintOptions.length) {
      setSelectedPrintDayKey('');
      return;
    }

    setSelectedPrintDayKey((current) => (
      dayPrintOptions.some((option) => option.key === current) ? current : dayPrintOptions[0].key
    ));
  }, [dayPrintOptions]);

  useEffect(() => {
    if (!weekPrintOptions.length) {
      setSelectedPrintWeekKey('');
      return;
    }

    setSelectedPrintWeekKey((current) => (
      weekPrintOptions.some((option) => option.key === current) ? current : weekPrintOptions[0].key
    ));
  }, [weekPrintOptions]);

  useEffect(() => {
    setPeriodPageByMode((current) => {
      const currentPage = current[selectedPeriod.key] || 1;

      if (currentPage <= selectedPeriodTotalPages) return current;

      return {
        ...current,
        [selectedPeriod.key]: selectedPeriodTotalPages,
      };
    });
  }, [selectedPeriod.key, selectedPeriodTotalPages]);

  const changeReportPeriodPage = (step) => {
    setPeriodPageByMode((current) => {
      const currentPage = current[selectedPeriod.key] || 1;
      const nextPage = Math.min(selectedPeriodTotalPages, Math.max(1, currentPage + step));

      return {
        ...current,
        [selectedPeriod.key]: nextPage,
      };
    });
  };

  const changeCalendarMonth = (step) => {
    setCalendarMonth((current) => {
      const next = new Date(current || activeCalendarMonth);
      next.setMonth(next.getMonth() + step);
      next.setDate(1);
      next.setHours(0, 0, 0, 0);

      return next;
    });
  };
  const selectCalendarDate = (cell) => {
    const nextMonth = new Date(`${cell.key}T00:00:00`);

    nextMonth.setDate(1);
    nextMonth.setHours(0, 0, 0, 0);
    setCalendarMonth(nextMonth);
    setSelectedCalendarDate(cell.key);
  };
  const handlePrintPeriod = () => {
    if (selectedPeriod.key === 'month') {
      printMonthlyConsolidatedReport(tickets, activeCalendarMonth);
      return;
    }

    if (!selectedPrintOption) {
      window.alert(`Please choose a specific ${selectedPeriod.key} to print.`);
      return;
    }

    printReportSummary({
      mode: selectedPeriod.key,
      title: selectedPeriod.title,
      items: [{ name: selectedPrintOption.name, count: selectedPrintOption.count }],
      total: selectedPrintOption.ticketCount,
      tickets,
      selectedPeriodKey: selectedPrintOption.key,
      selectedPeriodName: selectedPrintOption.name,
    });
  };
  const handleExportMonthly = () => {
    exportMonthlyConsolidatedReportCsv(tickets, activeCalendarMonth);
  };

  const handleSelectReportPeriod = (item) => {
    if (!item?.key || selectedPeriod.key === 'month') return;

    if (selectedPeriod.key === 'week') {
      setSelectedPrintWeekKey(item.key);
      return;
    }

    setSelectedPrintDayKey(item.key);
  };

  return (
    <div className="dashboard-view reports-compact-view">
      <section className="panel-card glass report-toolbar">
        <div className="report-toolbar-copy">
          <span className="section-kicker">Reports</span>
          <h2>Support Summary</h2>
          <p>Scan volume, SLA, branches, and ticket trends without crowding the dashboard.</p>
        </div>

        <div className="report-toolbar-metrics" aria-label="Report summary">
          <ReportMetric label="Total" value={summary.total} meta="tickets" />
          <ReportMetric label="Active" value={summary.active} meta="open" />
          <ReportMetric label="Resolved" value={summary.resolved} meta="closed" />
          <ReportMetric label="Urgent" value={summary.critical} meta="high / critical" />
        </div>
      </section>

      <section className="panel-card glass report-period-card">
        <div className="report-period-head">
          <div>
            <span className="section-kicker">{selectedPeriod.meta}</span>
            <h3>{selectedPeriod.title}</h3>
          </div>

          <div className="report-period-actions">
            <button
              type="button"
              className="report-print-btn"
              onClick={handlePrintPeriod}
              disabled={selectedPeriod.key !== 'month' && !selectedPrintOption}
            >
              <MonoIcon icon={Printer} />
              {selectedPeriod.key === 'month' ? 'Print Consolidated' : `Print ${selectedPeriod.label}`}
            </button>

            {selectedPeriod.key === 'month' && (
              <button type="button" className="report-print-btn" onClick={handleExportMonthly}>
                <MonoIcon icon={Download} />
                Export CSV
              </button>
            )}

            <div className="report-period-tabs" role="tablist" aria-label="Report period">
              {REPORT_PERIOD_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                className={periodMode === option.key ? 'active' : ''}
                onClick={() => setPeriodMode(option.key)}
                role="tab"
                aria-selected={periodMode === option.key}
              >
                {option.label}
              </button>
              ))}
            </div>
          </div>
        </div>

        <div className={`report-period-strip${hasPeriodPages ? ' has-pages' : ''}`}>
          {hasPeriodPages && (
            <button
              type="button"
              className="report-period-arrow"
              onClick={() => changeReportPeriodPage(-1)}
              disabled={safeSelectedPeriodPage === 1}
              aria-label={`Previous ${selectedPeriod.label.toLowerCase()} reports`}
            >
              <ChevronLeft aria-hidden="true" />
            </button>
          )}

          <BreakdownItems
            items={selectedBreakdownItems}
            selectable={selectedPeriod.key !== 'month'}
            selectedKey={selectedPrintKey}
            onSelect={handleSelectReportPeriod}
          />

          {hasPeriodPages && (
            <button
              type="button"
              className="report-period-arrow"
              onClick={() => changeReportPeriodPage(1)}
              disabled={safeSelectedPeriodPage === selectedPeriodTotalPages}
              aria-label={`Next ${selectedPeriod.label.toLowerCase()} reports`}
            >
              <ChevronRight aria-hidden="true" />
            </button>
          )}
        </div>
      </section>

      <ReportCalendar
        tickets={tickets}
        monthDate={activeCalendarMonth}
        selectedDateKey={selectedCalendarDate}
        selectedDateTickets={selectedDateTickets}
        onDateSelect={selectCalendarDate}
        onMonthChange={changeCalendarMonth}
        onOpenTicket={onOpenTicket}
      />

      <div className="admin-report-grid compact">
        <AdminWorkloadPanel tickets={tickets} />
        <BreakdownList title="Status" kicker="Report" items={statusActivitySummary} />
        <BreakdownList title="SLA" kicker="Report" items={slaSummary} />
        <BreakdownList title="Support Category" kicker="Report" items={categorySummary.slice(0, 6)} />
        <BreakdownList title="Branch" kicker="Report" items={branchSummary.slice(0, 6)} />
        <BreakdownList title="Concern Type" kicker="Report" items={concernSummary.slice(0, 6)} />
      </div>
    </div>
  );
}

/* =========================
   USERS VIEW
========================= */

function UsersView({ users, canManageUsers, currentUserId, onUsersChanged }) {
  const USERS_PAGE_SIZE = 5;
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('All');
  const [userPage, setUserPage] = useState(1);
  useBodyScrollLock(Boolean(editingUser));

  const findDuplicateUser = (draft, field) => {
    const value = normalizeComparable(draft?.[field]);
    if (!value) return null;

    return users.find((user) => (
      user.id !== draft.id &&
      normalizeComparable(user[field]) === value
    ));
  };

  const filteredUsers = useMemo(() => {
    const keyword = userSearch.trim().toLowerCase();

    return users.filter((user) => {
      const status = user.status || 'Active';
      if (userStatusFilter !== 'All' && status !== userStatusFilter) return false;
      if (!keyword) return true;

      const searchable = [
        user.name,
        user.email,
        user.role,
        user.employeeId,
        user.department,
        user.branch,
        user.office,
        user.designation,
        user.phone,
        user.status || 'Active',
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(keyword);
    });
  }, [users, userSearch, userStatusFilter]);

  const userTotalPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PAGE_SIZE));
  const safeUserPage = Math.min(userPage, userTotalPages);
  const userPageStartIndex = (safeUserPage - 1) * USERS_PAGE_SIZE;
  const pagedUsers = filteredUsers.slice(userPageStartIndex, userPageStartIndex + USERS_PAGE_SIZE);
  const visibleStart = filteredUsers.length ? userPageStartIndex + 1 : 0;
  const visibleEnd = Math.min(userPageStartIndex + USERS_PAGE_SIZE, filteredUsers.length);

  useEffect(() => {
    setUserPage(1);
  }, [userSearch, userStatusFilter, users.length]);

  useEffect(() => {
    if (userPage > userTotalPages) {
      setUserPage(userTotalPages);
    }
  }, [userPage, userTotalPages]);

  const goToUserPage = (page) => {
    setUserPage(Math.min(Math.max(page, 1), userTotalPages));
  };

  const beginEdit = (user) => {
    setEditingUser(user);
    setEditForm(toUserEditForm(user));
    setMessage({ type: '', text: '' });
    setShowEditPassword(false);
  };

  const updateEditForm = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const closeEdit = () => {
    setEditingUser(null);
    setEditForm(null);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const duplicateEmail = findDuplicateUser(editForm, 'email');
      const duplicateEmployeeId = findDuplicateUser(editForm, 'employeeId');

      if (duplicateEmail) {
        throw new Error(`Email already belongs to ${duplicateEmail.name || duplicateEmail.email}.`);
      }

      if (duplicateEmployeeId) {
        throw new Error(`Employee ID already belongs to ${duplicateEmployeeId.name || duplicateEmployeeId.email}.`);
      }

      const roleChanged = normalizePortalRole(editingUser.role) !== normalizePortalRole(editForm.role);
      const privilegedRoleChange =
        roleChanged && (isPrivilegedPortalRole(editingUser.role) || isPrivilegedPortalRole(editForm.role));
      let confirmPrivilegedRoleChange = false;

      if (privilegedRoleChange) {
        confirmPrivilegedRoleChange = window.confirm(
          `Confirm privileged role change for ${editingUser.name || editingUser.email} from ${formatRoleLabel(editingUser.role)} to ${formatRoleLabel(editForm.role)}?`
        );

        if (!confirmPrivilegedRoleChange) {
          setIsSubmitting(false);
          return;
        }
      }

      await updatePortalUser({
        ...editForm,
        confirmPrivilegedRoleChange,
        confirmOwnAccountChange: editForm.id === currentUserId,
      });
      await onUsersChanged();
      setMessage({ type: 'success', text: 'User account updated.' });
      closeEdit();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Unable to update user account.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (user) => {
    if (user.id === currentUserId) {
      setMessage({
        type: 'error',
        text: 'You cannot delete your own superadmin account.',
      });
      return;
    }

    const confirmed = window.confirm(
      `Delete the portal account for ${user.name || user.email}?`
    );

    if (!confirmed) return;

    setIsSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      await deletePortalUser(user.id);
      await onUsersChanged();
      setMessage({ type: 'success', text: 'User account deleted.' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Unable to delete user account.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const editDuplicateEmail = editForm ? findDuplicateUser(editForm, 'email') : null;
  const editDuplicateEmployeeId = editForm ? findDuplicateUser(editForm, 'employeeId') : null;
  const editRoleChanged = editingUser && editForm
    ? normalizePortalRole(editingUser.role) !== normalizePortalRole(editForm.role)
    : false;
  const editPrivilegedRoleChange = Boolean(
    editingUser &&
      editForm &&
      editRoleChanged &&
      (isPrivilegedPortalRole(editingUser.role) || isPrivilegedPortalRole(editForm.role))
  );

  return (
    <div className="dashboard-view">
      <section className="panel-card glass hero-panel">
        <div className="hero-copy">
          <span className="section-kicker">Users</span>
          <h2>Registered portal accounts.</h2>
          <p>Search, review, and manage employee and admin accounts currently available in the portal.</p>
        </div>
      </section>

      <section className="panel-card glass users-panel">
        {message.text && (
          <div className={`admin-alert users-alert ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="admin-users-toolbar">
          <label className="ticket-form-group admin-user-search" htmlFor="admin-user-search">
            <span>Search portal accounts</span>
            <div className="search-field-group">
              <span className="field-leading-icon"><MonoIcon icon={Search} /></span>
              <input
                id="admin-user-search"
                className="ticket-field ticket-input"
                type="search"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by name, email, role, ID, department, branch, or status"
              />
            </div>
          </label>

          <label className="ticket-form-group admin-user-status-filter" htmlFor="admin-user-status-filter">
            <span>Status</span>
            <select
              id="admin-user-status-filter"
              className="ticket-field ticket-select"
              value={userStatusFilter}
              onChange={(e) => setUserStatusFilter(e.target.value)}
            >
              <option value="All">All Status</option>
              {USER_ACCOUNT_STATUSES.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="admin-table-wrap users-table-wrap">
          <table className="admin-ticket-table users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>ID</th>
                <th>Department</th>
                <th>Branch</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {pagedUsers.map((user) => (
                <tr
                  key={user.id}
                  className={canManageUsers ? 'user-clickable-row' : undefined}
                  tabIndex={canManageUsers ? 0 : undefined}
                  role={canManageUsers ? 'button' : undefined}
                  aria-label={canManageUsers ? `View account for ${user.name || user.email}` : undefined}
                  onClick={canManageUsers ? () => beginEdit(user) : undefined}
                  onKeyDown={
                    canManageUsers
                      ? (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            beginEdit(user);
                          }
                        }
                      : undefined
                  }
                >
                  <td>
                    <div className="admin-table-main">
                      <strong>{user.name || 'Unnamed account'}</strong>
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td>{user.employeeId}</td>
                  <td>{user.department}</td>
                  <td>{user.branch || user.office}</td>
                  <td>
                    <span className={`status ${slugify(user.status || 'Active')}`}>
                      {user.status || 'Active'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon"><MonoIcon icon={UserRound} /></div>
              <h4>No users found</h4>
              <p>Try another name, email, department, branch, or role.</p>
            </div>
          )}
        </div>

        {filteredUsers.length > USERS_PAGE_SIZE && (
          <div className="users-pagination" aria-label="User account pagination">
            <button
              type="button"
              className="pagination-arrow"
              onClick={() => goToUserPage(safeUserPage - 1)}
              disabled={safeUserPage <= 1}
              aria-label="Previous user page"
            >
              <MonoIcon icon={ChevronLeft} />
            </button>

            <div className="pagination-copy">
              <strong>Page {safeUserPage} - {userTotalPages}</strong>
              <span>Showing {visibleStart}-{visibleEnd} of {filteredUsers.length} accounts</span>
            </div>

            <button
              type="button"
              className="pagination-arrow"
              onClick={() => goToUserPage(safeUserPage + 1)}
              disabled={safeUserPage >= userTotalPages}
              aria-label="Next user page"
            >
              <MonoIcon icon={ChevronRight} />
            </button>
          </div>
        )}
      </section>

      {editingUser && editForm && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Edit user account">
          <form className="modal-box glass admin-modal-box user-edit-modal user-detail-drawer" onSubmit={handleEditSubmit}>
            <div className="admin-modal-head">
              <div>
                <span className="section-kicker">User Account</span>
              </div>

              <button type="button" className="admin-modal-close" onClick={closeEdit} aria-label="Close modal">
                &times;
              </button>
            </div>

            <div className="user-detail-layout">
              <aside className="user-detail-sidebar">
                <div className="user-profile-summary">
                  <span className="user-avatar">{editingUser.initials || 'ME'}</span>
                  <div>
                    <strong>{editingUser.name || 'Unnamed account'}</strong>
                    <p>{editingUser.email}</p>
                  </div>
                </div>

                <div className="user-detail-facts">
                  <div className="user-role-fact">
                    <span>Role</span>
                    <strong title={formatRoleLabel(editingUser.role)}>{formatRoleLabel(editingUser.role)}</strong>
                  </div>
                  <div>
                    <span>Status</span>
                    <strong>{normalizeUserEditStatus(editingUser.status || 'Active')}</strong>
                  </div>
                  <div>
                    <span>Created</span>
                    <strong title={editingUser.createdAt || ''}>{formatCompactDate(editingUser.createdAt)}</strong>
                  </div>
                  <div>
                    <span>Last Updated</span>
                    <strong title={editingUser.updatedAt || ''}>{formatCompactDate(editingUser.updatedAt)}</strong>
                  </div>
                </div>

                <div className="ticket-form-group user-sidebar-status-field">
                  <label htmlFor="edit-status">Status</label>
                  <select
                    id="edit-status"
                    className="ticket-field ticket-select"
                    value={editForm.status}
                    onChange={(e) => updateEditForm('status', e.target.value)}
                    disabled={editForm.id === currentUserId}
                    required
                  >
                    {USER_EDIT_STATUSES.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </aside>

              <div className="user-detail-main">
                {(editDuplicateEmail || editDuplicateEmployeeId || editPrivilegedRoleChange) && (
                  <div className="admin-alert users-alert warning">
                    {editDuplicateEmail && `Email already belongs to ${editDuplicateEmail.name || editDuplicateEmail.email}. `}
                    {editDuplicateEmployeeId && `Employee ID already belongs to ${editDuplicateEmployeeId.name || editDuplicateEmployeeId.email}. `}
                    {editPrivilegedRoleChange && 'Privileged role changes require explicit confirmation when saving.'}
                  </div>
                )}

                <div className="ticket-form-grid">
              <div className="ticket-form-group">
                <label htmlFor="edit-name">Full Name</label>
                <input
                  id="edit-name"
                  className="ticket-field ticket-input"
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => updateEditForm('name', e.target.value)}
                />
              </div>

              <div className="ticket-form-group">
                <label htmlFor="edit-employee-id">Employee ID</label>
                <input
                  id="edit-employee-id"
                  className="ticket-field ticket-input"
                  type="text"
                  required
                  value={editForm.employeeId}
                  onChange={(e) => updateEditForm('employeeId', e.target.value)}
                />
              </div>

              <div className="ticket-form-group">
                <label htmlFor="edit-department">Department</label>
                <select
                  id="edit-department"
                  className="ticket-field ticket-select"
                  required
                  value={editForm.department}
                  onChange={(e) => updateEditForm('department', e.target.value)}
                >
                  <option value="" disabled>Select department</option>
                  {DEPARTMENTS.map((department) => (
                    <option key={department} value={department}>{department}</option>
                  ))}
                </select>
              </div>

              <div className="ticket-form-group">
                <label htmlFor="edit-branch">Branch / Office</label>
                <select
                  id="edit-branch"
                  className="ticket-field ticket-select"
                  required
                  value={editForm.branch}
                  onChange={(e) => updateEditForm('branch', e.target.value)}
                >
                  <option value="" disabled>Select branch / office</option>
                  {BRANCHES.map((branch) => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))}
                </select>
              </div>

              <div className="ticket-form-group">
                <label htmlFor="edit-email">Email Address</label>
                <input
                  id="edit-email"
                  className="ticket-field ticket-input"
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => updateEditForm('email', e.target.value)}
                />
              </div>

              <div className="ticket-form-group">
                <label htmlFor="edit-phone">Phone Number</label>
                <input
                  id="edit-phone"
                  className="ticket-field ticket-input"
                  type="tel"
                  required
                  inputMode="numeric"
                  pattern="09[0-9]{2} [0-9]{3} [0-9]{4}"
                  maxLength={13}
                  value={editForm.phone}
                  onChange={(e) => updateEditForm('phone', formatPhoneNumber(e.target.value))}
                  placeholder="09XX XXX XXXX"
                  title="Use format 09XX XXX XXXX."
                />
              </div>

              <div className="ticket-form-group">
                <label htmlFor="edit-designation">Job Title</label>
                <input
                  id="edit-designation"
                  className="ticket-field ticket-input"
                  type="text"
                  required
                  value={editForm.designation}
                  onChange={(e) => updateEditForm('designation', e.target.value)}
                  placeholder="Enter job title"
                />
              </div>

              <div className="ticket-form-group">
                <label htmlFor="edit-role">Portal Role</label>
                <select
                  id="edit-role"
                  className="ticket-field ticket-select"
                  value={editForm.role}
                  onChange={(e) => updateEditForm('role', e.target.value)}
                  disabled={editForm.id === currentUserId}
                  required
                >
                  {Object.entries(ROLE_LABELS).map(([role, label]) => (
                    <option key={role} value={role}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="ticket-form-group">
                <label htmlFor="edit-password">New Password</label>
                <div className="password-field-wrap">
                  <input
                    id="edit-password"
                    className="ticket-field ticket-input"
                    type={showEditPassword ? 'text' : 'password'}
                    minLength={8}
                    value={editForm.password}
                    onChange={(e) => updateEditForm('password', e.target.value)}
                    placeholder="Optional"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowEditPassword((prev) => !prev)}
                    aria-label={showEditPassword ? 'Hide password' : 'Show password'}
                    title={showEditPassword ? 'Hide password' : 'Show password'}
                  >
                    <MonoIcon icon={showEditPassword ? EyeOff : Eye} />
                  </button>
                </div>
              </div>

              <div className="ticket-form-group">
                <label htmlFor="edit-confirm-password">Confirm Password</label>
                <div className="password-field-wrap">
                  <input
                    id="edit-confirm-password"
                    className="ticket-field ticket-input"
                    type={showEditPassword ? 'text' : 'password'}
                    minLength={8}
                    value={editForm.confirmPassword}
                    onChange={(e) => updateEditForm('confirmPassword', e.target.value)}
                    placeholder="Optional"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowEditPassword((prev) => !prev)}
                    aria-label={showEditPassword ? 'Hide password confirmation' : 'Show password confirmation'}
                    title={showEditPassword ? 'Hide password confirmation' : 'Show password confirmation'}
                  >
                    <MonoIcon icon={showEditPassword ? EyeOff : Eye} />
                  </button>
                </div>
              </div>

            </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="modal-btn danger"
                onClick={() => handleDelete(editingUser)}
                disabled={isSubmitting || editingUser.id === currentUserId}
              >
                Delete Account
              </button>
              <button type="button" className="modal-btn cancel" onClick={closeEdit} disabled={isSubmitting}>
                Cancel
              </button>
              <button type="submit" className="modal-btn confirm" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function CreateUserView({ users = [], onCreated }) {
  const [form, setForm] = useState(emptyCreateUserForm);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  const duplicateEmail = normalizeComparable(form.email)
    ? users.find((user) => normalizeComparable(user.email) === normalizeComparable(form.email))
    : null;
  const duplicateEmployeeId = normalizeComparable(form.employeeId)
    ? users.find((user) => normalizeComparable(user.employeeId) === normalizeComparable(form.employeeId))
    : null;

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const generateTemporaryPassword = () => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    const symbols = '!@#$%';
    const password = Array.from({ length: 10 }, () =>
      alphabet[Math.floor(Math.random() * alphabet.length)]
    ).join('') + symbols[Math.floor(Math.random() * symbols.length)] + '7';

    setForm((prev) => ({
      ...prev,
      password,
      confirmPassword: password,
    }));
    setShowCreatePassword(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      if (!/^\d{3}$/.test(form.employeeId)) {
        throw new Error('Employee ID must be the last three digits only.');
      }

      if (duplicateEmail) {
        throw new Error(`Email already belongs to ${duplicateEmail.name || duplicateEmail.email}.`);
      }

      if (duplicateEmployeeId) {
        throw new Error(`Employee ID already belongs to ${duplicateEmployeeId.name || duplicateEmployeeId.email}.`);
      }

      await createPortalUser(form);
      setForm(emptyCreateUserForm);
      setShowCreatePassword(false);
      setMessage({
        type: 'success',
        text: 'Account created. The user can now sign in using the issued password.',
      });
      await onCreated();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Unable to create account.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dashboard-view">
      <section className="panel-card glass hero-panel">
        <div className="hero-copy">
          <span className="section-kicker">Create User</span>
          <h2>Issue an official portal account.</h2>
          <p>Create employee and admin accounts from the protected admin console only.</p>
        </div>

        <div className="hero-meta">
          <span className="meta-pill">Super Admin Only</span>
        </div>
      </section>

      <section className="panel-card glass admin-account-panel">
        <form className="admin-account-form" onSubmit={handleSubmit}>
          <div className="admin-form-head">
            <div>
              <span className="section-kicker">Account Details</span>
              <h3>Employee information</h3>
              <p>The same profile fields are saved for dashboard access and user review.</p>
            </div>
          </div>

          {message.text && (
            <div className={`admin-alert ${message.type}`}>
              {message.text}
            </div>
          )}

          {(duplicateEmail || duplicateEmployeeId) && (
            <div className="admin-alert warning">
              {duplicateEmail && `Email already belongs to ${duplicateEmail.name || duplicateEmail.email}. `}
              {duplicateEmployeeId && `Employee ID already belongs to ${duplicateEmployeeId.name || duplicateEmployeeId.email}.`}
            </div>
          )}

          <div className="ticket-form-grid">
            <div className="ticket-form-group">
              <label htmlFor="create-name">Full Name</label>
              <input
                id="create-name"
                className="ticket-field ticket-input"
                type="text"
                required
                value={form.name}
                onChange={(e) => updateForm('name', e.target.value)}
                placeholder="Enter full name"
              />
            </div>

            <div className="ticket-form-group">
              <label htmlFor="create-employee-id">Employee ID Last 3 Digits</label>
              <input
                id="create-employee-id"
                className="ticket-field ticket-input"
                type="text"
                required
                inputMode="numeric"
                pattern="[0-9]{3}"
                maxLength={3}
                value={form.employeeId}
                onChange={(e) => updateForm('employeeId', e.target.value.replace(/\D/g, '').slice(0, 3))}
                placeholder="Example: 854"
                title="Enter the last three digits only."
              />
            </div>

            <div className="ticket-form-group">
              <label htmlFor="create-department">Department</label>
              <select
                id="create-department"
                className="ticket-field ticket-select"
                required
                value={form.department}
                onChange={(e) => updateForm('department', e.target.value)}
              >
                <option value="" disabled>Select department</option>
                {DEPARTMENTS.map((department) => (
                  <option key={department} value={department}>{department}</option>
                ))}
              </select>
            </div>

            <div className="ticket-form-group">
              <label htmlFor="create-branch">Branch / Office</label>
              <select
                id="create-branch"
                className="ticket-field ticket-select"
                required
                value={form.branch}
                onChange={(e) => updateForm('branch', e.target.value)}
              >
                <option value="" disabled>Select branch / office</option>
                {BRANCHES.map((branch) => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </select>
            </div>

            <div className="ticket-form-group">
              <label htmlFor="create-email">Email Address</label>
              <input
                id="create-email"
                className="ticket-field ticket-input"
                type="email"
                required
                value={form.email}
                onChange={(e) => updateForm('email', e.target.value)}
                placeholder="Enter employee email"
              />
            </div>

            <div className="ticket-form-group">
              <label htmlFor="create-phone">Phone Number</label>
              <input
                id="create-phone"
                className="ticket-field ticket-input"
                type="tel"
                required
                inputMode="numeric"
                pattern="09[0-9]{2} [0-9]{3} [0-9]{4}"
                maxLength={13}
                value={form.phone}
                onChange={(e) => updateForm('phone', formatPhoneNumber(e.target.value))}
                placeholder="09XX XXX XXXX"
                title="Use format 09XX XXX XXXX."
              />
            </div>

            <div className="ticket-form-group create-password-field">
              <div className="field-label-row">
                <label htmlFor="create-password">Password</label>
                <button type="button" className="text-tool-btn" onClick={generateTemporaryPassword}>
                  Generate
                </button>
              </div>
              <div className="password-field-wrap">
                <input
                  id="create-password"
                  className="ticket-field ticket-input"
                  type={showCreatePassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(e) => updateForm('password', e.target.value)}
                  placeholder="Create password"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowCreatePassword((prev) => !prev)}
                  aria-label={showCreatePassword ? 'Hide password' : 'Show password'}
                  title={showCreatePassword ? 'Hide password' : 'Show password'}
                >
                  <MonoIcon icon={showCreatePassword ? EyeOff : Eye} />
                </button>
              </div>
            </div>

            <div className="ticket-form-group create-confirm-password-field">
              <label htmlFor="create-confirm-password">Confirm Password</label>
              <div className="password-field-wrap">
                <input
                  id="create-confirm-password"
                  className="ticket-field ticket-input"
                  type={showCreatePassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={form.confirmPassword}
                  onChange={(e) => updateForm('confirmPassword', e.target.value)}
                  placeholder="Confirm password"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowCreatePassword((prev) => !prev)}
                  aria-label={showCreatePassword ? 'Hide password confirmation' : 'Show password confirmation'}
                  title={showCreatePassword ? 'Hide password confirmation' : 'Show password confirmation'}
                >
                  <MonoIcon icon={showCreatePassword ? EyeOff : Eye} />
                </button>
              </div>
            </div>

            <div className="ticket-form-group create-designation-field">
              <label htmlFor="create-designation">Job Title</label>
              <input
                id="create-designation"
                className="ticket-field ticket-input"
                type="text"
                required
                value={form.designation}
                onChange={(e) => updateForm('designation', e.target.value)}
                placeholder="Enter job title"
              />
            </div>

            <div className="ticket-form-group portal-role-field">
              <label htmlFor="create-role">Portal Role</label>
              <select
                id="create-role"
                className="ticket-field ticket-select"
                value={form.role}
                onChange={(e) => updateForm('role', e.target.value)}
                required
              >
                {Object.entries(ROLE_LABELS).map(([role, label]) => (
                  <option key={role} value={role}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="admin-form-actions">
            <button type="submit" className="modal-btn confirm" disabled={isSubmitting}>
              {isSubmitting ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

/* =========================
   TICKET ACTION MODAL
========================= */

function TicketActionModal({ ticket, currentUser, onClose, onSave, onDelete, canDelete, now, onTicketRealtimeUpdate }) {
  useBodyScrollLock(true);

  const hasWorkStarted = Boolean(getTicketWorkStartedAt(ticket));
  const isBurnout = isBurnoutTicket(ticket);
  const isResolvedLocked = isBurnout ? isBurnoutClosedStatus(ticket.status) : isTicketResolved(ticket);
  const isStartMode = !isBurnout && !hasWorkStarted && !isResolvedLocked && !isMovedDateTicket(ticket);
  const burnoutWorkflowStatus = isBurnout ? getBurnoutWorkflowStatus(ticket.status) : '';
  const statusOptions = isBurnout
    ? Array.from(new Set([burnoutWorkflowStatus, ...BURNOUT_TICKET_STATUSES].filter(Boolean)))
    : isStartMode
    ? ['In Progress']
    : TICKET_STATUSES.filter((status) => status !== 'Created');
  const [formError, setFormError] = useState('');
  const [ticketMessages, setTicketMessages] = useState([]);
  const [messageDraft, setMessageDraft] = useState('');
  const [messagePhotos, setMessagePhotos] = useState([]);
  const [messageError, setMessageError] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isChatMinimized, setIsChatMinimized] = useState(true);
  const [unreadConversationCount, setUnreadConversationCount] = useState(0);
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const isChatMinimizedRef = useRef(true);
  const currentUserIdRef = useRef(currentUser?.id || '');
  const ticketMessageIdsRef = useRef(new Set());

  const currentStaffName = currentUser?.name || 'Unassigned';
  const assignedStaff = ticket.technician && ticket.technician !== 'Unassigned'
    ? ticket.technician
    : currentStaffName;
  const [draft, setDraft] = useState({
    status: isBurnout ? burnoutWorkflowStatus : isStartMode ? 'In Progress' : ticket.status || 'Pending',
    sla: ticket.sla || 'Low',
    technician: assignedStaff,
    actionTaken: ticket.actionTaken || '',
    adminRemarks: ticket.adminRemarks || '',
    resolution: ticket.resolution || '',
    burnoutReport: isBurnout ? normalizeBurnoutReport(ticket, currentUser) : null,
  });
  const isEscalationStatus = normalizeTicketStatus(draft.status) === 'escalated';
  const staffOptions = Array.from(
    new Set([currentStaffName, assignedStaff, ...TECHNICIANS].filter((name) => name && name !== 'Unassigned'))
  );
  const technicianOptions = Array.from(
    new Set(isEscalationStatus ? [...staffOptions, ...ESCALATION_PARTNERS] : staffOptions)
  );
  const visibleTechnician = technicianOptions.includes(draft.technician) ? draft.technician : 'Unassigned';
  const canEditOutcomeFields = !isResolvedLocked && (isBurnout || normalizeTicketStatus(draft.status) !== 'in progress');
  const lockedOutcomePlaceholder = isBurnout
    ? 'Available while the Burnout record is still active.'
    : 'Available once the ticket is updated away from In Progress.';
  const canSendConversationMessage = canTicketAcceptMessages(ticket);
  const shouldShowConversation = isTicketBeingHandled(ticket) || ticketMessages.length > 0;
  const isChatOpen = shouldShowConversation && !isChatMinimized;

  useEffect(() => {
    isChatMinimizedRef.current = isChatMinimized;

    if (!isChatMinimized) {
      setUnreadConversationCount(0);
    }
  }, [isChatMinimized]);

  useEffect(() => {
    currentUserIdRef.current = currentUser?.id || '';
  }, [currentUser?.id]);

  useEffect(() => {
    if (!ticket?.id) return undefined;

    let cancelled = false;
    ticketMessageIdsRef.current = new Set();

    const loadMessages = async () => {
      try {
        const messages = await getTicketMessages(ticket.id);

        if (!cancelled) {
          ticketMessageIdsRef.current = new Set(messages.map((message) => message.id));
          setTicketMessages(messages);
          setUnreadConversationCount(0);
          setMessageError('');
        }
      } catch (error) {
        if (!cancelled) {
          setTicketMessages([]);
          setMessageError(error.message || 'Unable to load ticket conversation.');
        }
      }
    };

    void loadMessages();

    const unsubscribeMessages = subscribeToTicketMessages(ticket.id, (newMessage) => {
      const messageAlreadyExists = ticketMessageIdsRef.current.has(newMessage.id);

      if (!messageAlreadyExists) {
        ticketMessageIdsRef.current.add(newMessage.id);
        setTicketMessages((current) => [...current, newMessage]);
      }

      const isIncomingMessage = newMessage.senderId !== currentUserIdRef.current;

      if (!messageAlreadyExists && isIncomingMessage && isChatMinimizedRef.current) {
        setUnreadConversationCount((current) => current + 1);
      }
    });

    const unsubscribeTicket = subscribeToTicket(ticket.id, (updatedTicket) => {
      if (!cancelled) {
        onTicketRealtimeUpdate?.(updatedTicket);
      }
    });

    return () => {
      cancelled = true;
      unsubscribeMessages();
      unsubscribeTicket();
    };
  }, [ticket?.id, onTicketRealtimeUpdate]);

  useEffect(() => {
    setIsChatMinimized(true);
    setUnreadConversationCount(0);
    setSelectedAttachment(null);
  }, [ticket?.id]);

  const handleConversationPhotoChange = async (e) => {
    const files = e.target.files;
    setMessageError('');

    try {
      const nextPhotos = await filesToPhotoAttachments(files, messagePhotos.length);
      setMessagePhotos((current) => [...current, ...nextPhotos]);
    } catch (error) {
      setMessageError(error.message || 'Unable to attach selected photos.');
    } finally {
      e.target.value = '';
    }
  };

  const sendTicketMessage = async () => {
    const cleanMessage = messageDraft.trim();

    if (!canSendConversationMessage) {
      setMessageError('Conversation is closed for tickets that are not actively being handled or are already resolved.');
      return;
    }

    if (!cleanMessage && !messagePhotos.length) {
      setMessageError('Please type a message or attach a photo before sending.');
      return;
    }

    setIsSendingMessage(true);
    setMessageError('');

    try {
      const sentMessage = await createTicketMessage(ticket.id, {
        sender: currentUser,
        message: cleanMessage,
        attachments: messagePhotos,
      });

      ticketMessageIdsRef.current.add(sentMessage.id);
      setTicketMessages((current) => {
        const exists = current.some((message) => message.id === sentMessage.id);
        return exists ? current : [...current, sentMessage];
      });
      setMessageDraft('');
      setMessagePhotos([]);
    } catch (error) {
      setMessageError(error.message || 'Unable to send reply.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const updateDraft = (field, value) => {
    setFormError('');
    setDraft((prev) => {
      if (isBurnout && field === 'status') {
        return {
          ...prev,
          status: value,
          technician: value === 'Submitted' ? prev.technician : (prev.technician || currentStaffName),
        };
      }

      if (field === 'status' && value === 'In Progress') {
        return {
          ...prev,
          status: value,
          technician: ESCALATION_PARTNERS.includes(prev.technician) ? currentStaffName : prev.technician,
          actionTaken: ticket.actionTaken || '',
          adminRemarks: ticket.adminRemarks || '',
          resolution: ticket.resolution || '',
        };
      }

      if (field === 'status' && value !== 'Escalated' && ESCALATION_PARTNERS.includes(prev.technician)) {
        return { ...prev, status: value, technician: currentStaffName };
      }

      return { ...prev, [field]: value };
    });
  };

  const updateBurnoutReport = (nextReport) => {
    setFormError('');
    setDraft((prev) => ({ ...prev, burnoutReport: nextReport }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (isResolvedLocked) {
      setFormError(isBurnout ? 'Completed Burnout records are locked and cannot be changed.' : 'Resolved tickets are locked and cannot be changed.');
      return;
    }

    const draftStatus = normalizeTicketStatus(draft.status);

    if (isStartMode && draftStatus !== 'in progress') {
      setFormError('Start the ticket by setting the status to In Progress first.');
      return;
    }

    const outcomeLocked = draftStatus === 'in progress';
    const sanitizedDraft = outcomeLocked
      ? {
          ...draft,
          technician: ESCALATION_PARTNERS.includes(draft.technician) ? currentStaffName : draft.technician,
          actionTaken: ticket.actionTaken || '',
          adminRemarks: ticket.adminRemarks || '',
          resolution: ticket.resolution || '',
        }
      : {
          ...draft,
          technician:
            draft.status === 'Escalated' || !ESCALATION_PARTNERS.includes(draft.technician)
              ? draft.technician
              : 'Unassigned',
        };

    const timestamp = new Date().toLocaleString();
    const existingMovedDateValue = hasTimeInDateLabel(ticket.dateLabel) ? ticket.dateLabel : '';
    const movedDateValue = !isBurnout && draftStatus === 'moved date' ? existingMovedDateValue || timestamp : ticket.dateLabel;
    const nextTicketSnapshot = {
      ...ticket,
      ...sanitizedDraft,
      technician: sanitizedDraft.technician || currentStaffName,
      adminUpdatedAt: timestamp,
      lastUpdated: timestamp,
      dateLabel: movedDateValue,
    };

    onSave(ticket.id, {
      ...sanitizedDraft,
      technician: sanitizedDraft.technician || currentStaffName,
      adminUpdatedAt: timestamp,
      lastUpdated: timestamp,
      dateLabel: movedDateValue,
      employeeEditLocked: isEmployeeLockedTicket(nextTicketSnapshot),
      employeeEditLockedAt: timestamp,
      employeeEditLockedBy: currentUser?.id || null,
      employeeEditLockedByName: currentStaffName,
      employeeEditLockReason: getEmployeeTicketLockReason(nextTicketSnapshot),
    });
  };

  return (
    <div
      className={[
        'modal-overlay',
        'ticket-action-overlay',
        isChatOpen ? 'chat-open' : '',
        shouldShowConversation && isChatMinimized ? 'chat-minimized' : '',
      ].filter(Boolean).join(' ')}
      role="dialog"
      aria-modal="true"
      aria-label="Ticket action modal"
    >
      <form
        className={[
          'modal-box glass admin-modal-box ticket-action-modal',
          isBurnout ? 'is-burnout-modal' : 'is-support-modal',
          isResolvedLocked ? 'resolved-locked' : '',
        ].filter(Boolean).join(' ')}
        onSubmit={handleSubmit}
      >
        <div className="admin-modal-head ticket-action-head">
          <div className="ticket-action-head-main">
            <div className="ticket-action-identity-group">
              <span className="ticket-id" title={getTicketDisplayCode(ticket)}>{getTicketDisplayCode(ticket)}</span>
              <div className="ticket-action-title-copy">
                <h3 title={ticket.concernType}>{ticket.concernType}</h3>
                <p title={`${ticket.branch} - ${ticket.department}`}>{ticket.branch} - {ticket.department}</p>
              </div>
            </div>

            <div className="ticket-action-header-status">
              <TicketStatusTools
                ticket={ticket}
                now={now}
                compact
                timerCompact
                inline
                metaPlacement="below"
                className="ticket-action-status-tools title-row-tools"
              />
            </div>
          </div>

          <button type="button" className="admin-modal-close" onClick={onClose} aria-label="Close modal">
            &times;
          </button>
        </div>

        <div className="admin-modal-grid ticket-action-info-grid">
          <div className="ticket-meta-cell">
            <span>Ticket Code</span>
            <p>{getTicketDisplayCode(ticket)}</p>
          </div>
          <div className="ticket-meta-cell">
            <span>Requester</span>
            <p>{ticket.requester || ticket.ownerEmail || 'Employee'}</p>
          </div>
          <div className="ticket-meta-cell">
            <span>Employee ID</span>
            <p>{ticket.employeeId || 'Not provided'}</p>
          </div>
          <div className="ticket-meta-cell">
            <span>Support Category</span>
            <p>{ticket.supportCategory || 'Unspecified'}</p>
          </div>
          <div className="ticket-meta-cell">
            <span>Submitted</span>
            <p>{ticket.createdAt || ticket.date || 'Submitted'}</p>
          </div>
          <div className="ticket-meta-cell">
            <span>Device / System</span>
            <p>{ticket.deviceName || 'Not provided'}</p>
          </div>
          {ticket.brand && (
            <div className="ticket-meta-cell">
              <span>Brand & Model</span>
              <p>{ticket.brand}</p>
            </div>
          )}
          {ticket.serialNumber && (
            <div className="ticket-meta-cell">
              <span>Serial Number</span>
              <p>{ticket.serialNumber}</p>
            </div>
          )}
          {ticket.custodian && (
            <div className="ticket-meta-cell">
              <span>Custodian</span>
              <p>{ticket.custodian}</p>
            </div>
          )}
          <div className="ticket-meta-cell">
            <span>Contact</span>
            <p>{ticket.contactNumber || 'Not provided'}</p>
          </div>
          <div className="ticket-meta-cell">
            <span>Impact</span>
            <p>{ticket.impact || 'Not provided'}</p>
          </div>
          <div className="ticket-meta-cell">
            <span>SAAR</span>
            <p>{ticket.saarAttachment?.name || (ticket.saarRequired ? 'Required, no file found' : 'Not required')}</p>
          </div>
        </div>


        <div className="ticket-action-details-row">
          <div className="admin-description-box ticket-action-description">
            <span>Description of Problem</span>
            <PreservedText value={ticket.description} />
          </div>

          <div className="ticket-action-control-stack">
          <div className="ticket-form-group">
            <label>Status</label>
            <select
              className="ticket-field ticket-select"
              value={draft.status}
              onChange={(e) => updateDraft('status', e.target.value)}
              required
              disabled={isResolvedLocked}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          <div className="ticket-form-group">
            <label>SLA</label>
            <select
              className="ticket-field ticket-select"
              value={draft.sla}
              onChange={(e) => updateDraft('sla', e.target.value)}
              required
              disabled={isResolvedLocked}
            >
              {SLA_LEVELS.map((sla) => (
                <option key={sla} value={sla}>{sla}</option>
              ))}
            </select>
          </div>

          <div className="ticket-form-group">
            <label>{isEscalationStatus ? 'Assigned ICT Staff / Escalation Partner' : 'Assigned ICT Staff'}</label>
            <select
              className="ticket-field ticket-select"
              value={visibleTechnician}
              onChange={(e) => updateDraft('technician', e.target.value)}
              required
              disabled={isResolvedLocked}
            >
              <option value="Unassigned">Unassigned</option>
              {technicianOptions.map((tech) => (
                <option key={tech} value={tech}>{tech}</option>
              ))}
            </select>
          </div>

          </div>
        </div>

        <div className="ticket-action-notes-grid">
          <div className="ticket-form-group">
            <label>Action Taken</label>
            <textarea
              className="ticket-field ticket-textarea admin-small-textarea"
              value={draft.actionTaken}
              onChange={(e) => updateDraft('actionTaken', e.target.value)}
              placeholder={canEditOutcomeFields ? 'Write the action taken by ICT/admin...' : lockedOutcomePlaceholder}
              readOnly={!canEditOutcomeFields}
            />
          </div>

          <div className="ticket-form-group">
            <label>Admin Remarks</label>
            <textarea
              className="ticket-field ticket-textarea admin-small-textarea"
              value={draft.adminRemarks}
              onChange={(e) => updateDraft('adminRemarks', e.target.value)}
              placeholder={canEditOutcomeFields ? 'Write internal remarks or follow-up notes...' : lockedOutcomePlaceholder}
              readOnly={!canEditOutcomeFields}
            />
          </div>

          <div className="ticket-form-group">
            <label>{isBurnout ? 'Burnout Notes' : 'Resolution Notes'}</label>
            <textarea
              className="ticket-field ticket-textarea admin-small-textarea"
              value={draft.resolution}
              onChange={(e) => updateDraft('resolution', e.target.value)}
              placeholder={canEditOutcomeFields ? (isBurnout ? 'Write unit condition, pass/fail, repair, replacement, or turnover notes...' : 'Write final resolution once completed...') : lockedOutcomePlaceholder}
              readOnly={!canEditOutcomeFields}
            />
          </div>
        </div>

        {(ticket.saarAttachment?.dataUrl || ticket.photoAttachments?.length > 0) && (
          <div className="ticket-action-attachments-row">
            {ticket.saarAttachment?.dataUrl && (
              <div className="admin-attachment-box">
                <div>
                  <strong>SAAR PDF Attachment</strong>
                  <p>{ticket.saarAttachment.name} - {ticket.saarAttachment.sizeLabel || 'PDF file'}</p>
                </div>
                <a href={ticket.saarAttachment.dataUrl} target="_blank" rel="noopener noreferrer">
                  Open PDF
                </a>
              </div>
            )}

            {ticket.photoAttachments?.length > 0 && (
              <div className="admin-attachment-box admin-photo-attachment-box">
                <div>
                  <strong>Photo / Screenshot Attachments</strong>
                  <p>{ticket.photoAttachments.length} photo{ticket.photoAttachments.length === 1 ? '' : 's'} attached by the employee</p>
                </div>
                <PhotoAttachmentGallery
                  photos={ticket.photoAttachments}
                  emptyText=""
                  onPreview={setSelectedAttachment}
                />
              </div>
            )}
          </div>
        )}

        {isBurnout && (
          <BurnoutReportEditor
            ticket={ticket}
            report={draft.burnoutReport}
            onChange={updateBurnoutReport}
            readOnly={isResolvedLocked}
          />
        )}

        {formError && <div className="form-error">{formError}</div>}

        <div className="modal-footer">
          {canDelete && (
            <button type="button" className="modal-btn danger" onClick={() => onDelete(ticket)}>
              <MonoIcon icon={Trash2} />
              Delete
            </button>
          )}

          {!isBurnout && isResolvedLocked && (
            <button type="button" className="modal-btn print" onClick={() => printResolvedTicket(ticket)}>
              <MonoIcon icon={Printer} />
              Print Ticket
            </button>
          )}

          {!isResolvedLocked && (
            <button type="submit" className="modal-btn confirm">
              <MonoIcon icon={ShieldCheck} />
              {isBurnout ? 'Save Burnout Update' : isStartMode ? 'Start Ticket' : 'Save Ticket Update'}
            </button>
          )}
        </div>
      </form>

      {selectedAttachment && (
        <div
          className="attachment-preview-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={`Preview ${selectedAttachment.fileName}`}
          onClick={() => setSelectedAttachment(null)}
        >
          <div className="attachment-preview-panel" onClick={(event) => event.stopPropagation()}>
            <div className="attachment-preview-head">
              <div>
                <strong>{selectedAttachment.fileName}</strong>
                <span>{selectedAttachment.sizeLabel}</span>
              </div>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setSelectedAttachment(null)}
                aria-label="Close image preview"
              >
                &times;
              </button>
            </div>
            <img src={selectedAttachment.source} alt={selectedAttachment.fileName} />
          </div>
        </div>
      )}

      {isChatOpen && (
        <TicketConversationPanel
          ticket={ticket}
          currentUser={currentUser}
          messages={ticketMessages}
          messageDraft={messageDraft}
          messagePhotos={messagePhotos}
          messageError={messageError}
          isSending={isSendingMessage}
          floating
          canSend={canSendConversationMessage}
          unreadCount={unreadConversationCount}
          onClose={() => setIsChatMinimized(true)}
          onMessageChange={setMessageDraft}
          onPhotoChange={handleConversationPhotoChange}
          onRemovePhoto={(photoId) => setMessagePhotos((current) => current.filter((photo) => photo.id !== photoId))}
          onSend={sendTicketMessage}
        />
      )}

      {shouldShowConversation && isChatMinimized && (
        <button
          type="button"
          className="ticket-chat-launcher"
          onClick={() => {
            setIsChatMinimized(false);
            setUnreadConversationCount(0);
          }}
          aria-label="Open ticket conversation"
        >
          <MonoIcon icon={MessageCircle} />
          {unreadConversationCount > 0 && <span>{unreadConversationCount}</span>}
        </button>
      )}
    </div>
  );
}

/* =========================
   ROOT EXPORT
========================= */

export default function AdminDashboardPage() {
  const router = useRouter();

  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [admin, setAdmin] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const burnoutThreeDayNotifiedRef = useRef(new Set());
  const burnoutFiveDayNotifiedRef = useRef(new Set());
  const [authChecked, setAuthChecked] = useState(false);
  const [isInactiveBlocked, setIsInactiveBlocked] = useState(false);
  const [, setLastSynced] = useState('');
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);
  const [transitionLabel, setTransitionLabel] = useState(adminTransitionLabels.dashboard);
  const [timerNow, setTimerNow] = useState(Date.now());
  const [, setNotifications] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    status: 'All',
    branch: 'All',
    category: 'All',
    sla: 'All',
  });

  const loadData = async ({ includeUsers = false } = {}) => {
    try {
      const [nextTicketsRaw, nextUsers] = await Promise.all([
        getTickets(),
        includeUsers ? listPortalUsers().catch(() => []) : Promise.resolve(null),
      ]);

      const nextTickets = sortTickets(nextTicketsRaw);

      setTickets(nextTickets);

      if (Array.isArray(nextUsers)) {
        setUsers(nextUsers);
      }

      setLastSynced(new Date().toLocaleTimeString());

      setSelectedTicket((current) => {
        if (!current) return null;
        return nextTickets.find((ticket) => ticket.id === current.id) || null;
      });
    } catch (error) {
      window.alert(error.message || 'Unable to load dashboard data.');
    }
  };

  useEffect(() => {
    let cancelled = false;

    const verifySession = async () => {
      try {
        const activeUser = await getCurrentPortalUser();

        if (cancelled) return;

        if (!activeUser) {
          setAuthChecked(true);
          setAdmin(null);

          window.alert(
            'No active login session was found on the Admin Dashboard. Please log in again. The session was not cleared so we can debug it.'
          );

          router.replace(LOGIN_ROUTE);
          return;
        }

        if (!isAdminRole(activeUser.role)) {
          setAuthChecked(true);
          setAdmin(null);

          window.alert(
            `Login succeeded, but this account is not allowed to open the Admin Dashboard.

Email: ${activeUser.email}
Current role: ${activeUser.role || 'No role found'}`
          );

          router.replace(LOGIN_ROUTE);
          return;
        }

        if (isInactivePortalUser(activeUser)) {
          setIsInactiveBlocked(true);
          setAuthChecked(true);
          setAdmin(null);

          window.setTimeout(() => {
            router.replace('/');
          }, 5000);

          return;
        }

        setAdmin(activeUser);
        setAuthChecked(true);

        void loadData({
          includeUsers: true,
        }).catch((error) => {
          console.error('[Admin Dashboard Load Error]', error);
          window.alert(error.message || 'Unable to load dashboard data.');
        });
      } catch (error) {
        console.error('[Admin Auth Check Error]', error);

        if (!cancelled) {
          setAuthChecked(true);
          setAdmin(null);

          window.alert(
            error.message || 'Admin session check failed. Please check the console.'
          );

          router.replace(LOGIN_ROUTE);
        }
      }
    };

    void verifySession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!authChecked) return undefined;

    const syncData = () => {
      void loadData({
        includeUsers: activeSection === 'users' || activeSection === 'create-user',
      });
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncData();
      }
    };

    window.addEventListener('storage', syncData);
    window.addEventListener('focus', syncData);
    document.addEventListener('visibilitychange', handleVisibility);

    const intervalId = window.setInterval(syncData, 60000);

    return () => {
      window.removeEventListener('storage', syncData);
      window.removeEventListener('focus', syncData);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.clearInterval(intervalId);
    };
  }, [authChecked, activeSection]);

  useEffect(() => {
    if (!authChecked || !admin) return undefined;

    const unsubscribe = subscribeToTickets(({ eventType, ticket }) => {
      if (!ticket?.id) return;

      if (eventType === 'INSERT') {
        const notification = {
          id: `${ticket.id}-${Date.now()}`,
          ticketId: ticket.id,
          title: 'New employee ticket submitted',
          body: `${ticket.requester || ticket.ownerEmail || 'Employee'} submitted ${ticket.concernType || ticket.supportCategory || 'a helpdesk request'}.`,
          createdAt: new Date().toLocaleString(),
          read: false,
        };

        setNotifications((current) => [notification, ...current].slice(0, 12));
      }

      setTickets((currentTickets) => {
        if (eventType === 'DELETE') {
          setNotifications((currentNotifications) =>
            currentNotifications.filter((notification) => notification.ticketId !== ticket.id)
          );

          setSelectedTicket((currentSelectedTicket) =>
            currentSelectedTicket?.id === ticket.id ? null : currentSelectedTicket
          );

          return currentTickets.filter((item) => item.id !== ticket.id);
        }

        const exists = currentTickets.some((item) => item.id === ticket.id);
        const nextTickets = exists
          ? currentTickets.map((item) => (item.id === ticket.id ? ticket : item))
          : [ticket, ...currentTickets];

        return sortTickets(nextTickets);
      });
    });

    return unsubscribe;
  }, [authChecked, admin]);

  useEffect(() => {
    if (!isPageTransitioning) return undefined;

    const timer = window.setTimeout(() => {
      setIsPageTransitioning(false);
    }, TRANSITION_DURATION);

    return () => window.clearTimeout(timer);
  }, [isPageTransitioning, transitionLabel]);

  useEffect(() => {
    if (!authChecked || !admin || !tickets.length) return;

    const threeDayNotifications = tickets
      .filter((ticket) => hasBurnoutReachedThreeDayMark(ticket, timerNow))
      .filter((ticket) => !hasBurnoutReachedFiveDayMark(ticket, timerNow))
      .filter((ticket) => !burnoutThreeDayNotifiedRef.current.has(ticket.id))
      .map((ticket) => {
        burnoutThreeDayNotifiedRef.current.add(ticket.id);

        return {
          id: `burnout-three-day-${ticket.id}-${Date.now()}`,
          ticketId: ticket.id,
          title: 'Burnout reached 3-day mark',
          body: `${getTicketDisplayCode(ticket)} has reached the minimum 3-day Burnout procedure window.`,
          createdAt: new Date().toLocaleString(),
          read: false,
        };
      });
    const fiveDayNotifications = tickets
      .filter((ticket) => hasBurnoutReachedFiveDayMark(ticket, timerNow))
      .filter((ticket) => !burnoutFiveDayNotifiedRef.current.has(ticket.id))
      .map((ticket) => {
        burnoutFiveDayNotifiedRef.current.add(ticket.id);

        return {
          id: `burnout-five-day-${ticket.id}-${Date.now()}`,
          ticketId: ticket.id,
          title: 'Burnout reached 5-day mark',
          body: `${getTicketDisplayCode(ticket)} has reached the 5-day Burnout target without a pass status.`,
          createdAt: new Date().toLocaleString(),
          read: false,
        };
      });
    const dueNotifications = [...fiveDayNotifications, ...threeDayNotifications];

    if (dueNotifications.length) {
      setNotifications((current) => [...dueNotifications, ...current].slice(0, 12));
    }
  }, [authChecked, admin, tickets, timerNow]);

  useEffect(() => {
    const hasRunningWorkTimer = tickets.some((ticket) => {
      const startedAt = getTicketWorkStartedAt(ticket);
      const endedAt = getTicketWorkEndedAt(ticket);

      return Boolean(startedAt) && !endedAt && isUnresolved(ticket.status);
    });

    if (!selectedTicket && !hasRunningWorkTimer) return undefined;

    setTimerNow(Date.now());

    const intervalId = window.setInterval(() => {
      setTimerNow(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [tickets, selectedTicket]);

  const summary = useMemo(() => buildSummary(tickets), [tickets]);

  const applyTicketFilters = (sourceTickets) => {
    const search = filters.search.toLowerCase().trim();

    return sortTickets(sourceTickets)
      .filter((ticket) => {
        const matchesSearch = !search || getTicketSearchText(ticket).includes(search);
        const matchesStatus = filters.status === 'All' || ticket.status === filters.status;
        const matchesBranch = filters.branch === 'All' || ticket.branch === filters.branch;
        const matchesCategory = filters.category === 'All' || ticket.supportCategory === filters.category;
        const matchesSla = filters.sla === 'All' || ticket.sla === filters.sla;

        return matchesSearch && matchesStatus && matchesBranch && matchesCategory && matchesSla;
      })
      .sort((a, b) => {
        const statusCompare = getStatusRank(a.status) - getStatusRank(b.status);
        const slaCompare = getSlaRank(a.sla) - getSlaRank(b.sla);

        return statusCompare || slaCompare || normalizeDate(b) - normalizeDate(a);
      });
  };

  const supportTickets = useMemo(() => sortTickets(tickets.filter((ticket) => !isBurnoutTicket(ticket))), [tickets]);
  const filteredTickets = useMemo(() => applyTicketFilters(tickets), [tickets, filters]);
  const filteredSupportTickets = useMemo(() => applyTicketFilters(supportTickets), [supportTickets, filters]);

  const categorySummary = useMemo(() => breakdown(tickets, 'supportCategory', SUPPORT_CATEGORIES), [tickets]);
  const statusSummary = useMemo(() => breakdown(tickets, 'status', TICKET_STATUSES), [tickets]);
  const branchSummary = useMemo(() => breakdown(tickets, 'branch', BRANCHES), [tickets]);
  const isSuperAdmin = normalizePortalRole(admin?.role) === 'superadmin';
  const canCreateUsers = isSuperAdmin;
  const canAccessDepartmentConsoles = isSuperAdmin;
  const canDeleteTickets = isSuperAdmin;

  const goTo = (section) => {
    if (section !== activeSection) {
      setTransitionLabel(adminTransitionLabels[section] || adminTransitionLabels.dashboard);
      setIsPageTransitioning(true);
    }

    setActiveSection(section);
    setSidebarOpen(false);
    void loadData({
      includeUsers: section === 'users' || section === 'create-user',
    });
  };

  const handleLogout = async () => {
    if (selectedTicket?.lockedBy === admin?.id) {
      await releaseTicketLock(selectedTicket.id, admin.id).catch(() => {});
    }

    setTransitionLabel(adminTransitionLabels.logout);
    setIsPageTransitioning(true);
    await signOutPortal().catch(() => {});
    router.replace(LOGIN_ROUTE);
  };

  const handleOpenTicket = async (ticket) => {
    if (!ticket?.id || !admin?.id) return;

    try {
      const lockedTicket = await claimTicketLock(ticket.id, admin);

      if (!lockedTicket?.id) {
        window.alert('Unable to find this ticket. Please refresh the queue and try again.');
        await loadData();
        return;
      }

      if (isTicketLockedByOther(lockedTicket, admin.id)) {
        window.alert(
          `Ticket ${getTicketDisplayCode(ticket)} is already being worked on by ${lockedTicket.lockedByName || 'another IT staff'}.`
        );
        await loadData();
        return;
      }

      setTickets((currentTickets) =>
        sortTickets(currentTickets.map((item) => (item.id === lockedTicket.id ? lockedTicket : item)))
      );
      setSelectedTicket(lockedTicket);
    } catch (error) {
      window.alert(error.message || 'Unable to open this ticket right now.');
    }
  };

  const handleCloseTicket = async () => {
    const ticketToClose = selectedTicket;
    setSelectedTicket(null);

    if (ticketToClose?.lockedBy === admin?.id) {
      try {
        const releasedTicket = await releaseTicketLock(ticketToClose.id, admin.id);

        if (releasedTicket?.id) {
          setTickets((currentTickets) =>
            sortTickets(currentTickets.map((item) => (item.id === releasedTicket.id ? releasedTicket : item)))
          );
        }
      } catch {
        await loadData();
      }
    }
  };

  const handleSaveTicket = async (ticketId, updates) => {
    const currentTicket = tickets.find((ticket) => ticket.id === ticketId);
    const isCurrentBurnout = isBurnoutTicket(currentTicket);
    const isCurrentFinalBurnout = isCurrentBurnout && isBurnoutClosedStatus(currentTicket?.status);

    if (isTicketResolved(currentTicket) || isCurrentFinalBurnout) {
      window.alert(
        isCurrentFinalBurnout
          ? `Burnout ticket ${ticketId} already has a final unit status and cannot be changed.`
          : `Ticket ${ticketId} is resolved and cannot be changed.`
      );
      setSelectedTicket(null);
      void loadData();
      return;
    }

    const timestamp = new Date().toLocaleString();
    const nextUpdates = {
      ...updates,
      adminUpdatedAt: timestamp,
      lastUpdated: timestamp,
    };
    const currentStaffName = admin?.name || 'Unassigned';
    const nextStatus = normalizeTicketStatus(updates.status);
    const currentStatus = normalizeTicketStatus(currentTicket?.status);
    const isBurnoutPassStatus = nextStatus === 'passed burnout';

    if (!nextUpdates.technician || nextUpdates.technician === 'Unassigned') {
      nextUpdates.technician = currentStaffName;
    }

    if (updates.status && nextStatus && nextStatus !== currentStatus) {
      nextUpdates.statusHistory = [
        ...(Array.isArray(currentTicket?.statusHistory) ? currentTicket.statusHistory : []),
        buildStatusHistoryEntry(updates.status, timestamp, admin),
      ];
    }

    if (nextStatus === 'in progress') {
      if (!currentTicket?.workStartedAt || currentTicket?.workEndedAt) {
        nextUpdates.workStartedAt = timestamp;
      }

      nextUpdates.workEndedAt = '';
    }

    if (isCurrentBurnout && (nextStatus === 'under burnout' || isBurnoutPassStatus)) {
      if (!currentTicket?.workStartedAt || currentTicket?.workEndedAt) {
        nextUpdates.workStartedAt = timestamp;
      }

      nextUpdates.workEndedAt = '';
    }

    if (nextStatus === 'moved date') {
      if (!currentTicket?.workStartedAt) {
        nextUpdates.workStartedAt = timestamp;
      }

      nextUpdates.dateLabel = hasTimeInDateLabel(currentTicket?.dateLabel)
        ? currentTicket.dateLabel
        : timestamp;
      nextUpdates.workEndedAt = currentTicket?.workEndedAt || '';
    }

    if (nextStatus === 'resolved') {
      if (!currentTicket?.workStartedAt) {
        nextUpdates.workStartedAt = currentTicket?.createdAt || currentTicket?.date || timestamp;
      }

      nextUpdates.workEndedAt = timestamp;
      nextUpdates.adminUpdatedAt = timestamp;
      nextUpdates.lastUpdated = timestamp;
    }

    if (nextStatus === 'canceled') {
      if (currentTicket?.workStartedAt) {
        nextUpdates.workEndedAt = timestamp;
      }

      nextUpdates.adminUpdatedAt = timestamp;
      nextUpdates.lastUpdated = timestamp;
    }

    if (isCurrentBurnout && isBurnoutClosedStatus(updates.status)) {
      if (!currentTicket?.workStartedAt) {
        nextUpdates.workStartedAt = currentTicket?.createdAt || currentTicket?.date || timestamp;
      }

      nextUpdates.workEndedAt = timestamp;
      nextUpdates.adminUpdatedAt = timestamp;
      nextUpdates.lastUpdated = timestamp;
    }

    const nextTicketSnapshot = {
      ...(currentTicket || {}),
      ...nextUpdates,
    };
    const shouldSendBurnoutStandardMessage =
      isCurrentBurnout &&
      isBurnoutPassStatus &&
      Boolean(currentTicket?.workStartedAt || nextUpdates.workStartedAt) &&
      isBurnoutBelowStandardProcedure(nextTicketSnapshot, timestamp);
    const shouldLockEmployeeEdit = isEmployeeLockedTicket(nextTicketSnapshot);

    nextUpdates.employeeEditLocked = shouldLockEmployeeEdit;

    if (shouldLockEmployeeEdit) {
      nextUpdates.employeeEditLockedAt = currentTicket?.employeeEditLockedAt || timestamp;
      nextUpdates.employeeEditLockedBy = currentTicket?.employeeEditLockedBy || admin?.id || null;
      nextUpdates.employeeEditLockedByName = currentTicket?.employeeEditLockedByName || currentStaffName;
      nextUpdates.employeeEditLockReason = getEmployeeTicketLockReason(nextTicketSnapshot);
    } else {
      nextUpdates.employeeEditLockedAt = '';
      nextUpdates.employeeEditLockedBy = null;
      nextUpdates.employeeEditLockedByName = '';
      nextUpdates.employeeEditLockReason = '';
    }

    try {
      if (shouldSendBurnoutStandardMessage) {
        try {
          const existingMessages = await getTicketMessages(ticketId).catch(() => []);
          const alreadySent = existingMessages.some(
            (message) => String(message.message || '').trim() === BURNOUT_STANDARD_MESSAGE
          );

          if (!alreadySent) {
            await createTicketMessage(ticketId, {
              sender: admin,
              message: BURNOUT_STANDARD_MESSAGE,
              attachments: [],
            });
          }
        } catch (messageError) {
          console.warn('[Burnout Standard Message Error]', messageError);
        }
      }

      await updateTicket(ticketId, {
        ...nextUpdates,
        lockedBy: null,
        lockedByName: null,
        lockedAt: null,
        lockExpiresAt: null,
      });

      setTimerNow(Date.now());
      await loadData();
      setSelectedTicket(null);
    } catch (error) {
      window.alert(error.message || 'Unable to save ticket update.');
    }
  };

  const handleDeleteTicket = async (ticket) => {
    if (!ticket?.id) return;

    if (!isSuperAdmin) {
      window.alert('Only the super admin can delete tickets.');
      return;
    }

    const confirmed = window.confirm(
      `SUPER ADMIN DELETE: Delete ticket ${getTicketDisplayCode(ticket)}? This can be resolved, moved, in progress, or any status. This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await deleteTicket(ticket.id, {
        force: true,
        requestedBy: admin?.id,
        requestedByRole: admin?.role,
        bypassStatusLock: true,
      });
      setSelectedTicket(null);
      setNotifications((currentNotifications) =>
        currentNotifications.filter((notification) => notification.ticketId !== ticket.id)
      );
      setTickets((currentTickets) => currentTickets.filter((item) => item.id !== ticket.id));
      await loadData({
        includeUsers: activeSection === 'users' || activeSection === 'create-user',
      });
    } catch (error) {
      window.alert(error.message || 'Unable to delete ticket.');
    }
  };

  if (!authChecked || !admin) {
    if (isInactiveBlocked) {
      return <InactiveAccountNotice />;
    }

    return (
      <>
        <main className="portal-main portal-app-main">
          <div className="portal-shell" />
        </main>
        <PortalTransitionLoader label="Verifying admin access..." />
      </>
    );
  }

  return (
    <>
      <main className="portal-main portal-app-main">
        <div className="portal-shell">
          <header className="portal-topbar glass">
            <div className="portal-topbar-copy">
              <span className="portal-eyebrow">Admin Portal</span>
              <h1>IT Helpdesk Admin</h1>
            </div>

            <div className="portal-topbar-actions">
              <div className="profile-chip">
                <span className="profile-chip-avatar">{admin.initials}</span>
                <div className="profile-chip-copy">
                  <strong>{admin.name}</strong>
                  <span>{admin.department}</span>
                </div>
              </div>
            </div>
          </header>

          <div className="portal-layout">
            <Sidebar
              active={activeSection}
              onNav={goTo}
              onLogout={handleLogout}
              open={sidebarOpen}
              canCreateUsers={canCreateUsers}
              canAccessDepartmentConsoles={canAccessDepartmentConsoles}
            />

            {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

            <section className="portal-view">
              <button
                type="button"
                className="burger"
                aria-label="Open navigation"
                onClick={() => setSidebarOpen((prev) => !prev)}
              >
                <Menu className="admin-mono-icon" aria-hidden="true" />
              </button>

              {activeSection === 'dashboard' && (
                <DashboardView
                  tickets={tickets}
                  summary={summary}
                  categorySummary={categorySummary}
                  onGoTo={goTo}
                  onOpenTicket={handleOpenTicket}
                  now={timerNow}
                />
              )}

              {activeSection === 'tickets' && (
                <TicketsView
                  tickets={tickets}
                  filteredTickets={filteredTickets}
                  scope="all"
                  filters={filters}
                  setFilters={setFilters}
                  onOpenTicket={handleOpenTicket}
                  now={timerNow}
                />
              )}

              {activeSection === 'support-tickets' && (
                <TicketsView
                  tickets={supportTickets}
                  filteredTickets={filteredSupportTickets}
                  scope="support"
                  filters={filters}
                  setFilters={setFilters}
                  onOpenTicket={handleOpenTicket}
                  now={timerNow}
                />
              )}

              {activeSection === 'burnout-tickets' && (
                <BurnoutReportView
                  tickets={tickets}
                  onOpenTicket={handleOpenTicket}
                  now={timerNow}
                />
              )}

              {activeSection === 'branches' && (
                <BranchesView
                  branchSummary={branchSummary}
                  tickets={tickets}
                  onOpenTicket={handleOpenTicket}
                  now={timerNow}
                />
              )}

              {activeSection === 'reports' && (
                <ReportsView
                  tickets={tickets}
                  summary={summary}
                  categorySummary={categorySummary}
                  statusSummary={statusSummary}
                  branchSummary={branchSummary}
                  onOpenTicket={handleOpenTicket}
                />
              )}

              {activeSection === 'users' && (
                <UsersView
                  users={users}
                  canManageUsers={canCreateUsers}
                  currentUserId={admin.id}
                  onUsersChanged={loadData}
                />
              )}

              {activeSection === 'create-user' && canCreateUsers && (
                <CreateUserView
                  users={users}
                  onCreated={() => loadData({ includeUsers: true })}
                />
              )}
            </section>
          </div>
        </div>
      </main>

      {selectedTicket && (
        <TicketActionModal
          key={selectedTicket.id}
          ticket={selectedTicket}
          currentUser={admin}
          onClose={handleCloseTicket}
          onSave={handleSaveTicket}
          onDelete={handleDeleteTicket}
          canDelete={canDeleteTickets}
          now={timerNow}
          onTicketRealtimeUpdate={(updatedTicket) => {
            setTimerNow(Date.now());

            setTickets((current) =>
              current.map((ticket) => (ticket.id === updatedTicket.id ? updatedTicket : ticket))
            );

            setSelectedTicket((current) =>
              current?.id === updatedTicket.id ? { ...current, ...updatedTicket } : current
            );
          }}
        />
      )}

      {isPageTransitioning && <PortalTransitionLoader label={transitionLabel} />}
    </>
  );
}

