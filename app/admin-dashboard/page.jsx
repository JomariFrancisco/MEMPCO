'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Clipboard,
  Download,
  ExternalLink,
  FileText,
  ImageIcon,
  Mail,
  Megaphone,
  Menu,
  MessageCircle,
  Monitor,
  Paperclip,
  Phone,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  UserRound,
  Wrench,
  X,
} from 'lucide-react';
import {
  BRANCHES,
  BURNOUT_TICKET_STATUSES,
  CATEGORY_CONCERN_TYPES,
  DEPARTMENTS,
  DEVICE_OPTIONS,
  ESCALATION_PARTNERS,
  SLA_LEVELS,
  SUPPORT_CATEGORIES,
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
  isPasswordChangeRequired,
  listPortalUsers,
  refreshPortalUserPassword,
  signOutPortal,
  updateCurrentPortalUserProfilePhoto,
  updatePortalUser,
} from '@/lib/auth/portalAuth';
import {
  claimTicketLock,
  canTicketAcceptMessages,
  createTicket,
  createTicketMessage,
  deleteTicket,
  deriveTicketImpact,
  getTicketMessages,
  getTickets,
  isTicketBeingHandled,
  releaseTicketLock,
  subscribeToTicket,
  subscribeToTicketMessages,
  subscribeToTickets,
  updateTicket,
} from '@/lib/tickets/portalTickets';
import PortalProfileLayout from '@/components/PortalProfileLayout';
import PortalProfilePhotoControl from '@/components/PortalProfilePhotoControl';
import PortalThemeToggle from '@/components/PortalThemeToggle';
import { useConfirmDialog } from '@/components/ConfirmationDialog';
import './admin-dashboard.css';
import { mergeMessages, monthlyTicketSnapshots, queueRank, availableStatuses, isClosed, isHelpdeskQueueEligible, handlingMilliseconds } from '@/lib/tickets/workflow.mjs';
import TicketHandlingIndicator, { TicketHandlingActivity, TicketWorkTimer } from '@/components/TicketHandlingStatus';
import TicketChatLauncher from '@/components/TicketChatLauncher';
import HelpdeskInbox from '@/components/HelpdeskInbox';
import '@/components/PortalWorkspaceTheme.css';
import '@/components/TicketHandlingStatus.css';
import '@/components/TicketModalLayout.css';
import '@/components/TicketChat.css';
import './admin-ticket-parity.css';
import { createRequestId } from '@/lib/tickets/requestIdentity.mjs';

/* =========================
   ROUTES
========================= */

const LOGIN_ROUTE = '/helpdesk';
const HRMAX_ROUTE = 'http://120.28.214.253/hrmax/';
const MARKETING_ADMIN_ROUTE = '/marketing-admin';
const HR_ADMIN_ROUTE = '/hr-admin';
const REPORT_PERIOD_OPTIONS = [
  { key: 'day', label: 'Day', title: 'Tickets by Day', meta: 'Daily submissions' },
  { key: 'week', label: 'Week', title: 'Tickets by Week', meta: 'Weekly volume' },
  { key: 'month', label: 'Month', title: 'Tickets by Month', meta: 'Monthly trend' },
];
const REPORT_PERIOD_PAGE_SIZE = 8;
const DASHBOARD_QUEUE_PAGE_SIZE = 5;
const SELECTED_DAY_TICKET_PAGE_SIZE = 1;
const PHOTO_MAX_SIZE = 4 * 1024 * 1024;
const PHOTO_MAX_COUNT = 5;
const PHOTO_ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp';
const PHOTO_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ADMIN_HELPDESK_SUPPORT_CATEGORIES = Object.keys(CATEGORY_CONCERN_TYPES);
const ADMIN_DEVICE_SUPPORT_CATEGORY_MAP = {
  'Desktop PC': [
    'Software / System Support',
    'Account / Access Support',
    'Computer / Laptop Support',
    'Network / Internet Support',
    'Other ICT Request',
  ],
  Laptop: [
    'Software / System Support',
    'Account / Access Support',
    'Computer / Laptop Support',
    'Network / Internet Support',
    'Other ICT Request',
  ],
  Printer: [
    'Printer Support',
    'Network / Internet Support',
    'Other ICT Request',
  ],
  'Biometric Device': ['Biometric / Attendance Support'],
  'ATM / Kiosk': [
    'Software / System Support',
    'Account / Access Support',
    'Network / Internet Support',
    'Other ICT Request',
  ],
  'Network / Wi-Fi': [
    'Network / Internet Support',
    'Server / NAS / Database Support',
    'Other ICT Request',
  ],
  Server: [
    'Server / NAS / Database Support',
    'Network / Internet Support',
    'Software / System Support',
    'Other ICT Request',
  ],
  'MBWin / Sky360': ['Software / System Support', 'Account / Access Support'],
  'Excel / Office Application': ['Software / System Support', 'Account / Access Support'],
};
const ADMIN_DEVICE_CONCERN_TYPE_MAP = {
  'MBWin / Sky360': {
    'Software / System Support': [
      'MBWin / Sky360 concern',
      'System error or application issue',
      'Other software concern',
    ],
    'Account / Access Support': [
      'New user account request',
      'Password reset',
      'Login problem',
      'Access permission request',
      'Teller role / user role concern',
      'Other account access concern',
    ],
  },
  'Excel / Office Application': {
    'Software / System Support': [
      'Excel / Office application concern',
      'Software installation request',
      'Other software concern',
    ],
  },
};
const getAdminSupportCategoriesForDevice = (deviceName = '') =>
  ADMIN_DEVICE_SUPPORT_CATEGORY_MAP[deviceName] || ADMIN_HELPDESK_SUPPORT_CATEGORIES;

const getAdminConcernOptionsForSelection = (category = '', deviceName = '') =>
  ADMIN_DEVICE_CONCERN_TYPE_MAP[deviceName]?.[category] || CATEGORY_CONCERN_TYPES[category] || [];

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const BURNOUT_STANDARD_MIN_DAYS = 3;
const BURNOUT_TARGET_DAYS = 5;
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

function TicketLockNoticeModal({ notice, onClose }) {
  if (!notice) return null;

  return (
    <div className="modal-overlay ticket-lock-notice-overlay" role="presentation" onClick={onClose}>
      <section
        className="modal-box glass ticket-lock-notice-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="ticket-lock-notice-title"
        aria-describedby="ticket-lock-notice-description"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ticket-lock-notice-icon" aria-hidden="true">
          <ShieldCheck className="admin-mono-icon" />
        </div>

        <div className="ticket-lock-notice-copy">
          <span className="section-kicker">Ticket already assigned</span>
          <h3 id="ticket-lock-notice-title">Another ICT staff is handling this ticket.</h3>
          <p id="ticket-lock-notice-description">
            This prevents two admins from updating the same request at the same time. Please refresh the queue or open
            another ticket.
          </p>
        </div>

        <div className="ticket-lock-notice-details" aria-label="Ticket handling details">
          <div>
            <span>Ticket Code</span>
            <strong>{notice.ticketCode}</strong>
          </div>
          <div>
            <span>Currently Handled By</span>
            <strong>{notice.staffName}</strong>
          </div>
        </div>

        <div className="modal-footer ticket-lock-notice-footer">
          <button type="button" className="modal-btn confirm" onClick={onClose} autoFocus>
            Got it
          </button>
        </div>
      </section>
    </div>
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

function TemporaryPasswordPanel({ password, accountName, onDismiss }) {
  const [copyStatus, setCopyStatus] = useState('idle');
  const copyStatusTimer = useRef(null);

  useEffect(() => () => window.clearTimeout(copyStatusTimer.current), []);

  if (!password) return null;

  const copyPassword = async () => {
    let copied = false;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(password);
        copied = true;
      }
    } catch {
      copied = false;
    }

    if (!copied) {
      const textArea = document.createElement('textarea');
      textArea.value = password;
      textArea.setAttribute('readonly', '');
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();

      try {
        copied = document.execCommand('copy');
      } catch {
        copied = false;
      } finally {
        textArea.remove();
      }
    }

    setCopyStatus(copied ? 'copied' : 'error');
    window.clearTimeout(copyStatusTimer.current);
    copyStatusTimer.current = window.setTimeout(() => setCopyStatus('idle'), 1800);
  };

  return (
    <div className="admin-alert success temporary-password-panel">
      <div>
        <strong>Temporary password issued{accountName ? ` for ${accountName}` : ''}</strong>
        <p>This password is shown only once. The user must change it after first login.</p>
        <code>{password}</code>
      </div>
      <div className="temporary-password-actions">
        <button
          type="button"
          className={`modal-btn cancel temporary-password-copy${copyStatus === 'copied' ? ' is-copied' : ''}${copyStatus === 'error' ? ' is-error' : ''}`}
          onClick={copyPassword}
          aria-live="polite"
        >
          <MonoIcon icon={copyStatus === 'copied' ? Check : Clipboard} />
          {copyStatus === 'copied' ? 'Copied' : copyStatus === 'error' ? 'Copy failed' : 'Copy'}
        </button>
        {onDismiss && (
          <button type="button" className="modal-btn confirm temporary-password-done" onClick={onDismiss}>
            Done
          </button>
        )}
      </div>
    </div>
  );
}

const emptyCreateUserForm = {
  name: '',
  employeeId: '',
  department: '',
  branch: '',
  areaId: '',
  designation: '',
  email: '',
  phone: '',
  role: 'employee',
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
  areaId: user.areaId || '',
  designation: user.designation || '',
  email: user.email || '',
  phone: user.phone || '',
  role: user.role || 'employee',
  status: normalizeUserEditStatus(user.status || 'Active'),
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

const fileToProfilePhotoDataUrl = async (file) => {
  if (!file) return '';

  if (!isPhotoFile(file)) {
    throw new Error('Profile photo must be a JPG, PNG, or WEBP image.');
  }

  if (file.size > PHOTO_MAX_SIZE) {
    throw new Error('Profile photo must not exceed 4 MB.');
  }

  return fileToDataUrl(file);
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
  Profile: () => (
    <svg className="sidebar-nav-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10 10a4 4 0 100-8 4 4 0 000 8zM3 17a7 7 0 0114 0v1H3v-1z" />
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
  mrdss_admin: 'MRDSS Admin',
  branch_manager_admin: 'Branch Admin',
  area_manager_admin: 'Area Manager',
  coo_admin: 'COO',
  superadmin: 'Super Admin',
};

const AREA_OPTIONS = [
  { id: 'area-1', label: 'Area 1' },
  { id: 'area-2', label: 'Area 2' },
];

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
  return ['admin', 'mrdssadmin', 'branchmanageradmin', 'areamanageradmin', 'cooadmin', 'superadmin'].includes(normalizedRole);
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

const getTicketFinalReportStatus = (ticket = {}) => {
  const status = normalizeTicketStatus(ticket.status);

  if (status === 'canceled' || status === 'cancelled') return 'Cancelled';

  const matchedStatus = TICKET_STATUSES.find(
    (item) => normalizeTicketStatus(item) === status
  );

  return matchedStatus || ticket.status || 'Pending';
};

const buildReportStatusSummary = (tickets = []) => {
  const finalStatusRows = tickets.map((ticket) => ({
    reportStatus: getTicketFinalReportStatus(ticket),
  }));
  const statusOrder = new Map([...TICKET_STATUSES, ...BURNOUT_TICKET_STATUSES].map((status, index) => [status, index]));
  return breakdown(finalStatusRows, 'reportStatus', TICKET_STATUSES)
    .sort((a, b) => (statusOrder.get(a.name) ?? 999) - (statusOrder.get(b.name) ?? 999) || a.name.localeCompare(b.name));
};

const getReportDeadline = (ticket, kind) => {
  const value = kind === 'response'
    ? ticket.responseDueAt || ticket.response_due_at
    : ticket.resolutionDueAt || ticket.resolution_due_at;
  const time = new Date(value || '').getTime();
  return Number.isFinite(time) ? time : 0;
};

const getReportSlaState = (ticket, now = Date.now()) => {
  if (!isUnresolved(ticket.status)) return 'clear';
  const responseDue = getReportDeadline(ticket, 'response');
  const resolutionDue = getReportDeadline(ticket, 'resolution');
  const responseComplete = Boolean(ticket.firstResponseAt || ticket.first_response_at);
  const relevantDeadlines = [
    ...(!responseComplete && responseDue ? [responseDue] : []),
    ...(resolutionDue ? [resolutionDue] : []),
  ];
  if (relevantDeadlines.some((deadline) => deadline <= now)) return 'overdue';
  if (relevantDeadlines.some((deadline) => deadline - now <= 24 * 60 * 60 * 1000)) return 'due-soon';
  return 'clear';
};

const getReportNextDeadlineInfo = (ticket) => {
  if (!isUnresolved(ticket.status)) return 0;
  const responseComplete = Boolean(ticket.firstResponseAt || ticket.first_response_at);
  const candidates = [
    ...(!responseComplete && getReportDeadline(ticket, 'response') ? [{ kind: 'Response', at: getReportDeadline(ticket, 'response') }] : []),
    ...(getReportDeadline(ticket, 'resolution') ? [{ kind: 'Resolution', at: getReportDeadline(ticket, 'resolution') }] : []),
  ];
  return candidates.sort((a, b) => a.at - b.at)[0] || null;
};

const getReportNextDeadline = (ticket) => getReportNextDeadlineInfo(ticket)?.at || 0;

const compareReportActionability = (a, b, now = Date.now()) => {
  const stateOrder = { overdue: 0, 'due-soon': 1, clear: 2 };
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const aState = getReportSlaState(a, now);
  const bState = getReportSlaState(b, now);
  const aDeadline = getReportNextDeadline(a) || Number.MAX_SAFE_INTEGER;
  const bDeadline = getReportNextDeadline(b) || Number.MAX_SAFE_INTEGER;
  return (stateOrder[aState] - stateOrder[bState])
    || (aDeadline - bDeadline)
    || ((priorityOrder[String(a.sla || '').toLowerCase()] ?? 4) - (priorityOrder[String(b.sla || '').toLowerCase()] ?? 4))
    || (getSubmittedTime(a) - getSubmittedTime(b))
    || String(a.id || '').localeCompare(String(b.id || ''));
};

const getSubmittedTime = (ticket = {}) => {
  const candidates = [
    ticket.createdAtRaw,
    ticket.createdAt,
    ticket.created_at,
    ticket.submittedAt,
    ticket.submitted_at,
    ticket.date,
  ];

  for (const value of candidates) {
    const parsed = new Date(value || '').getTime();
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }

  return 0;
};

const getTicketSequenceNumber = (ticket = {}) => {
  const candidate = String(ticket.ticketCode || ticket.id || '').trim();
  const matches = candidate.match(/(\d+)\s*$/);

  if (!matches) return Number.MIN_SAFE_INTEGER;

  const sequence = Number(matches[1]);
  return Number.isFinite(sequence) ? sequence : Number.MIN_SAFE_INTEGER;
};

/*
 * Canonical ordering for recent-ticket surfaces.
 *
 * The portal ticket code is the authoritative queue sequence because the
 * requested behavior is explicitly: 27, 26, 25 ... 1. This also prevents
 * tickets created on the same date, imported with slightly different
 * timestamps, or edited later from jumping into the wrong page.
 *
 * If a legacy record does not have a numeric ticket suffix, fall back to its
 * original submission timestamp so the record is still displayed.
 */
const sortRecentTickets = (items = []) =>
  [...items].sort((a, b) => {
    const recent = getSubmittedTime(b) - getSubmittedTime(a);
    if (recent) return recent;
    const aSequence = getTicketSequenceNumber(a);
    const bSequence = getTicketSequenceNumber(b);
    const hasASequence = Number.isSafeInteger(aSequence) && aSequence >= 0;
    const hasBSequence = Number.isSafeInteger(bSequence) && bSequence >= 0;

    if (hasASequence && hasBSequence && aSequence !== bSequence) {
      return bSequence - aSequence;
    }

    if (hasASequence !== hasBSequence) {
      return hasBSequence ? 1 : -1;
    }

    const submittedCompare = getSubmittedTime(b) - getSubmittedTime(a);
    if (submittedCompare !== 0) return submittedCompare;

    return String(b.ticketCode || b.id || '').localeCompare(
      String(a.ticketCode || a.id || ''),
      undefined,
      { numeric: true, sensitivity: 'base' }
    );
  });

const getTicketQueueSlaRank = (ticket = {}) => {
  return queueRank(ticket);
};

// Later edits do not affect FIFO; ticket sequence breaks submission-time ties.
const compareTicketSubmissionOrder = (a, b) => {
  const aSubmittedAt = getSubmittedTime(a);
  const bSubmittedAt = getSubmittedTime(b);

  if (aSubmittedAt && bSubmittedAt && aSubmittedAt !== bSubmittedAt) {
    return aSubmittedAt - bSubmittedAt;
  }

  if (aSubmittedAt !== bSubmittedAt) {
    return aSubmittedAt ? -1 : 1;
  }

  const aSequence = getTicketSequenceNumber(a);
  const bSequence = getTicketSequenceNumber(b);
  const hasASequence = Number.isSafeInteger(aSequence) && aSequence >= 0;
  const hasBSequence = Number.isSafeInteger(bSequence) && bSequence >= 0;

  if (hasASequence && hasBSequence && aSequence !== bSequence) {
    return aSequence - bSequence;
  }

  if (hasASequence !== hasBSequence) {
    return hasASequence ? -1 : 1;
  }

  return String(a.ticketCode || a.id || '').localeCompare(
    String(b.ticketCode || b.id || ''),
    undefined,
    { numeric: true, sensitivity: 'base' }
  );
};

// Priority orders Critical, High, Medium, Low; tickets within each level stay FIFO.
const sortTicketQueueFirstComeFirstServed = (items = []) =>
  [...items].sort((a, b) =>
    getTicketQueueSlaRank(a) - getTicketQueueSlaRank(b) || compareTicketSubmissionOrder(a, b)
  );

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

const getReportTechnicianName = (value = '') => {
  const name = String(value || '').trim();

  return name && name.toLowerCase() !== 'unassigned' ? name : '';
};

const getEntryTechnicianName = (entry = {}) =>
  getReportTechnicianName(
    entry.technician ||
    entry.technicianName ||
    entry.assignedTechnician ||
    entry.assignedToName ||
    entry.handledByName
  );

const getEntryUpdaterName = (entry = {}) =>
  getReportTechnicianName(entry.updatedByName || entry.performedByName || entry.handledByName);

const getFirstHandlingTechnician = (ticket, history = []) => {
  const handlingEntry = history.find((entry) => {
    const normalizedStatus = normalizeTicketStatus(entry?.status || entry?.label);
    return ['in progress', 'under burnout', 'for inspection'].includes(normalizedStatus);
  });

  return (
    getEntryTechnicianName(handlingEntry) ||
    getEntryUpdaterName(handlingEntry) ||
    getReportTechnicianName(ticket?.employeeEditLockedByName)
  );
};

const getStatusHistoryTechnician = (ticket, entry = {}, history = []) => {
  const normalizedStatus = normalizeTicketStatus(entry?.status || entry?.label);
  const entryTechnician = getEntryTechnicianName(entry);
  const entryUpdater = getEntryUpdaterName(entry);
  const ticketTechnician = getReportTechnicianName(ticket?.technician);
  const firstHandler = getFirstHandlingTechnician(ticket, history);

  if (normalizedStatus === 'submitted') {
    return firstHandler || entryTechnician || entryUpdater || ticketTechnician || 'Unassigned';
  }

  if (normalizedStatus === 'escalated') {
    return entryTechnician || ticketTechnician || entryUpdater || firstHandler || 'Unassigned';
  }

  if (['in progress', 'under burnout', 'for inspection'].includes(normalizedStatus)) {
    return entryTechnician || entryUpdater || firstHandler || ticketTechnician || 'Unassigned';
  }

  return entryTechnician || entryUpdater || ticketTechnician || firstHandler || 'Unassigned';
};

const createTicketReportEvent = (ticket, { timestamp, label, type, status, technician, technicianId }) => {
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
    technician: technician || getReportTechnicianName(ticket?.technician) || 'Unassigned',
    technicianId: technicianId || ticket?.technicianId || ticket?.technician_id || '',
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
        technician: getStatusHistoryTechnician(ticket, entry, history),
        technicianId: entry?.technicianId || entry?.snapshot?.technicianId || ticket?.technicianId || '',
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
        technician: getReportTechnicianName(ticket?.technician) || 'Unassigned',
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
      technician: getReportTechnicianName(ticket?.technician) || 'Unassigned',
    }));
  } else if (submittedTime) {
    events.push(createTicketReportEvent(ticket, {
      timestamp: submittedTime,
      label: 'Submitted',
      type: 'submitted',
      status: 'Submitted',
      technician: getReportTechnicianName(ticket?.technician) || 'Unassigned',
    }));
  }

  const resolvedTime = getTicketResolvedTime(ticket);

  if (resolvedTime) {
    events.push(createTicketReportEvent(ticket, {
      timestamp: resolvedTime,
      label: 'Resolved',
      type: 'resolved',
      status: 'Resolved',
      technician: getReportTechnicianName(ticket?.technician) || 'Unassigned',
    }));
  }

  return events.filter(Boolean);
};

const getTicketCalendarMonth = (tickets) => {
  const latestTicketTime = tickets.reduce(
    (latest, ticket) => Math.max(latest, getSubmittedTime(ticket)),
    0
  );

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
  const monthlyTicketEvents = getMonthlyTicketSubmissionEvents(tickets, monthStart);

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
            width: min(10.44in, calc(100vw - 24px));
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
          .ticket-notes-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-rows: minmax(74px, auto); gap: 8px; }
          .ticket-notes-grid > section { min-width: 0; display: flex; flex-direction: column; break-inside: avoid; page-break-inside: avoid; }
          .note { flex: 1 1 auto; min-height: 52px; padding: 8px 9px; border: 1px solid #d9dee7; border-radius: 6px; background: #fff; white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.4; font-size: 10.5px; overflow: visible; break-inside: auto; page-break-inside: auto; }
          .report-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin-top: 8px; }
          .report-list.single { grid-template-columns: 1fr; margin-top: 0; }
          .report-list.period-volume-list { grid-template-columns: repeat(4, minmax(0, 1fr)); margin-top: 0; }
          .report-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; align-items: center; padding: 7px 8px; border: 1px solid #e5e7eb; border-radius: 7px; background: #f8fafc; font-size: 10.5px; }
          .report-row strong { min-width: 28px; text-align: right; color: #dc2626; }
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
          .period-detail-table th:nth-child(10), .period-detail-table td:nth-child(10) { width: 7%; }
          .period-detail-table th:nth-child(11), .period-detail-table td:nth-child(11) { width: 9%; }
          .period-detail-table th:nth-child(12), .period-detail-table td:nth-child(12) { width: 5%; }
          .period-detail-table th:nth-child(13), .period-detail-table td:nth-child(13) { width: 4%; }
          .period-detail-table th:nth-child(14), .period-detail-table td:nth-child(14) { width: 7%; }
          .period-detail-table th:nth-child(14) { white-space: nowrap; overflow-wrap: normal; }
          .print-note { margin-top: 7px; color: #64748b; font-size: 9.5px; font-weight: 700; }
          @media screen and (max-width: 760px) {
            .print-page { width: calc(100vw - 24px); }
            .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .ticket-notes-grid { grid-template-columns: 1fr; grid-auto-rows: auto; }
            .note { min-height: 54px; }
          }
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
            .grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
            .ticket-notes-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-rows: minmax(74px, auto); }
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

const formatPrintDateTime = (value, fallback = 'Not recorded') => {
  if (value === 0 || value == null || value === '') return fallback;

  const parsed = typeof value === 'number' ? new Date(value) : parsePortalTimestamp(value);

  if (!parsed || Number.isNaN(parsed.getTime())) return value ? String(value) : fallback;

  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed);
};

const formatPrintWorkDuration = (startedAt, endedAt, previousSeconds = 0) => {
  const start = getTimeValue(startedAt);
  if (!start) return 'Not started';

  const isOngoing = !getTimeValue(endedAt);

  const totalMinutes = Math.floor(handlingMilliseconds({ workStartedAt: startedAt, workEndedAt: endedAt, handlingSeconds: previousSeconds }) / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  const duration = days ? `${days}d ${hours}h` : hours ? `${hours}h ${minutes}m` : `${minutes}m`;
  return isOngoing ? `${duration} (ongoing)` : duration;
};

const getEscalationPartnerLabel = (ticket = {}) => {
  const partner = String(ticket.escalationPartner || '').trim();
  if (!partner) return '';
  const company = partner === 'Third Party Company'
    ? String(ticket.escalationPartnerCompany || '').trim()
    : '';
  return company ? `${partner} — ${company}` : partner;
};

const printResolvedTicket = (ticket) => {
  const burnoutReport = isBurnoutTicket(ticket) ? normalizeBurnoutReport(ticket) : null;
  const startedAt = ticket.workStartedAt || ticket.work_started_at || '';
  const endedAt = ticket.workEndedAt || ticket.work_ended_at || '';
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
  const branchDepartment = [ticket.branch, ticket.department]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(' / ');
  const fieldRows = [
    ['Ticket Code', getTicketDisplayCode(ticket)],
    ['Status', ticket.status],
    ['SLA', ticket.sla],
    ['Requester', ticket.requester || ticket.ownerEmail],
    ['Employee ID', ticket.employeeId],
    ['Branch / Department', branchDepartment],
    ['Support Category', ticket.supportCategory],
    ['Concern Type', ticket.concernType],
    ['Submitted', (ticket.createdAt || ticket.date) ? formatPrintDateTime(ticket.createdAt || ticket.date) : ''],
    ['Moved Date', getTicketMovedDateTime(ticket) ? formatPrintDateTime(getTicketMovedDateTime(ticket)) : ''],
    ['Resolved Date', getTicketResolvedTime(ticket) ? formatPrintDateTime(getTicketResolvedTime(ticket)) : ''],
    ['Assigned ICT Staff', ticket.technician || 'Unassigned'],
    ['Escalation Partner', normalizeTicketStatus(ticket.status) === 'escalated' ? getEscalationPartnerLabel(ticket) : ''],
    ['Device / System', ticket.deviceName || ticket.deviceType],
    ['Contact', ticket.contactNumber],
    ['Work Started', startedAt ? formatPrintDateTime(startedAt) : ''],
    ['Work Ended', endedAt ? formatPrintDateTime(endedAt) : ''],
    ['Work Duration', startedAt ? formatPrintWorkDuration(startedAt, endedAt, ticket.handlingSeconds) : ''],
  ].filter(([, value]) => value != null && String(value).trim() !== '');
  const noteSections = [
    ['Description of Problem', getVisibleTicketDescription(ticket.description)],
    ['Action Taken', ticket.actionTaken],
    ['Resolution Notes', ticket.resolution],
    ['Admin Remarks', ticket.adminRemarks],
    ['Recommendation', ticket.recommendation],
  ].filter(([, value]) => String(value || '').trim());
  const body = `
    <main class="print-page">
      ${getPrintLetterhead()}
      <section class="doc-head">
        <h2>Helpdesk Ticket Report</h2>
        <div class="meta">Printed ${escapePrintHtml(formatPrintDateTime(new Date().toISOString()))}</div>
      </section>
      <section class="grid">
        ${fieldRows.map(([label, value]) => `
          <div class="field">
            <span>${escapePrintHtml(label)}</span>
            <strong>${escapePrintHtml(value)}</strong>
          </div>
        `).join('')}
      </section>
      ${noteSections.length ? `
        <div class="ticket-notes-grid">
          ${noteSections.map(([label, value]) => `
            <section>
              <h3 class="section-title">${escapePrintHtml(label)}</h3>
              <div class="note">${escapePrintHtml(value)}</div>
            </section>
          `).join('')}
        </div>
      ` : ''}
      ${burnoutSection}
    </main>
  `;

  openPrintDocument(`Ticket ${getTicketDisplayCode(ticket)}`, body);
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

const getMonthlyTicketSubmissionEvents = (tickets = [], monthDate) => {
  const target = new Date(monthDate);
  const year = target.getFullYear();
  const month = target.getMonth();

  return tickets
    .map((ticket) => createTicketReportEvent(ticket, {
      timestamp: getSubmittedTime(ticket),
      label: 'Submitted',
      type: 'submitted',
      status: 'Submitted',
    }))
    .filter((event) => event
      && event.reportDate.getFullYear() === year
      && event.reportDate.getMonth() === month)
    .sort((a, b) => a.timestamp - b.timestamp || String(a.ticket?.id || '').localeCompare(String(b.ticket?.id || '')));
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

const formatPrintCount = (count, singular, plural = `${singular}s`) => {
  const value = Number(count || 0);
  return `${value} ${value === 1 ? singular : plural}`;
};

const buildTechnicianAssignmentItems = (tickets = [], users = []) => {
  const profileNames = new Map(users.map((user) => [user.id, user.name]).filter(([id, name]) => id && name));
  const groups = new Map();

  tickets.forEach((ticket) => {
    const technicianId = ticket.technicianId || ticket.technician_id || '';
    const technicianName = getReportTechnicianName(ticket.technician) || 'Unassigned';
    const key = technicianId ? `profile:${technicianId}` : `legacy:${technicianName.toLowerCase()}`;
    const group = groups.get(key) || {
      name: technicianId ? profileNames.get(technicianId) || technicianName : technicianName,
      count: 0,
    };
    group.count += 1;
    groups.set(key, group);
  });

  return [...groups.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
};

const printReportSummary = ({
  mode,
  title,
  items,
  total,
  tickets = [],
  users = [],
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
  const row = (item, unit = 'ticket', plural) => `
    <div class="report-row">
      <span>${escapePrintHtml(item.name)}</span>
      <strong>${escapePrintHtml(formatPrintCount(item.count, unit, plural))}</strong>
    </div>
  `;
  const technicianItems = buildTechnicianAssignmentItems(uniqueTickets, users);
  const statusItems = buildReportStatusSummary(uniqueTickets).slice(0, 6);
  const categoryItems = breakdown(uniqueTickets, 'supportCategory', SUPPORT_CATEGORIES).slice(0, 6);
  const branchItems = breakdown(uniqueTickets, 'branch', BRANCHES).slice(0, 6);
  const ictRows = technicianItems.length
    ? technicianItems.map((item) => row(item, 'ticket')).join('')
    : '<div class="report-row"><span>No ICT assignments</span><strong>0 tickets</strong></div>';
  const statusRows = statusItems.length
    ? statusItems.map((item) => row(item, 'ticket')).join('')
    : '<div class="report-row"><span>No status data</span><strong>0 tickets</strong></div>';
  const categoryRows = categoryItems.length
    ? categoryItems.map((item) => row(item, 'ticket')).join('')
    : '<div class="report-row"><span>No support category data</span><strong>0 tickets</strong></div>';
  const branchRows = branchItems.length
    ? branchItems.map((item) => row(item, 'ticket')).join('')
    : '<div class="report-row"><span>No branch data</span><strong>0 tickets</strong></div>';
  const periodRows = periodItems.length
    ? periodItems.slice(0, 12).map((item) => row(item, selectedPeriodKey ? 'ticket' : 'event')).join('')
    : '<div class="report-row"><span>No period data</span><strong>0 tickets</strong></div>';
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
    ['Technician', (event) => getTicketField(event.technician, 'Unassigned')],
    ['Escalation Partner', (event) => normalizeTicketStatus(event.ticket.status) === 'escalated' ? getEscalationPartnerLabel(event.ticket) : ''],
  ];
  const body = `
    <main class="print-page">
      ${getPrintLetterhead()}
      <section class="doc-head">
        <h2>${escapePrintHtml(periodLabel)} ICT Report</h2>
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
          <h3 class="section-title">Event Status</h3>
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
        <h3 class="section-title">Selected Period</h3>
        <div class="report-list period-volume-list">${periodRows}</div>
      </section>
      <section class="ticket-detail-section">
        <h3 class="section-title">Event Log</h3>
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
      <p class="print-note">Event Log lists the recorded ticket updates for the selected period, including status, SLA, and assigned technician.</p>
    </main>
  `;

  openPrintDocument(`${periodLabel} ICT Report`, body);
};

const getMonthlyReportData = (tickets, monthDate) => {
  const target = new Date(monthDate);
  const year = target.getFullYear();
  const month = target.getMonth();
  const monthTitle = formatReportDate(new Date(year, month, 1), { month: 'long', year: 'numeric' });
  const monthlyEvents = getReportEventRowsForMonth(tickets, monthDate);
  const monthlyTickets = monthlyTicketSnapshots(tickets,monthDate);

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
  ['Escalation Partner', (ticket) => normalizeTicketStatus(ticket.status) === 'escalated' ? getEscalationPartnerLabel(ticket) : ''],
];

const buildMonthlyTicketSummaryRows = (tickets, columns) =>
  tickets.length
    ? tickets.map((ticket) => `
        <tr>
          ${columns.map(([, getValue]) => `<td>${escapePrintHtml(getValue(ticket))}</td>`).join('')}
        </tr>
      `).join('')
    : `<tr><td colspan="${columns.length}">No tickets found for this month.</td></tr>`;

const printMonthlyConsolidatedReport = (tickets, monthDate, users = []) => {
  const { monthTitle, monthlyTickets } = getMonthlyReportData(tickets, monthDate);
  const monthlySummary = buildSummary(monthlyTickets);
  const technicianItems = buildTechnicianAssignmentItems(monthlyTickets, users);
  const statusItems = buildReportStatusSummary(monthlyTickets).slice(0, 6);
  const categoryItems = breakdown(monthlyTickets, 'supportCategory', SUPPORT_CATEGORIES).slice(0, 6);
  const branchItems = breakdown(monthlyTickets, 'branch', BRANCHES).slice(0, 6);
  const row = (item, unit = 'ticket') => `
    <div class="report-row">
      <span>${escapePrintHtml(item.name)}</span>
      <strong>${escapePrintHtml(formatPrintCount(item.count, unit))}</strong>
    </div>
  `;
  const ictRows = technicianItems.length
    ? technicianItems.map((item) => row(item, 'ticket')).join('')
    : '<div class="report-row"><span>No ICT assignments</span><strong>0 tickets</strong></div>';
  const statusRows = statusItems.length
    ? statusItems.map((item) => row(item, 'ticket')).join('')
    : '<div class="report-row"><span>No ticket status data</span><strong>0 tickets</strong></div>';
  const categoryRows = categoryItems.length
    ? categoryItems.map((item) => row(item, 'ticket')).join('')
    : '<div class="report-row"><span>No support category data</span><strong>0 tickets</strong></div>';
  const branchRows = branchItems.length
    ? branchItems.map((item) => row(item, 'ticket')).join('')
    : '<div class="report-row"><span>No branch data</span><strong>0 tickets</strong></div>';
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
    ticket.recommendation,
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
  return parseTicketTime(ticket.burnoutStartedAt || ticket.burnout_started_at);
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
  const sourceRows = Array.isArray(rows) ? rows : [];
  const requiredIds = new Set(defaults.map(([id]) => id));
  const consumedIndexes = new Set();
  const requiredRows = defaults.map((definition, index) => {
    const requiredId = definition[0];
    let savedIndex = sourceRows.findIndex((row) => row?.id === requiredId);
    if (savedIndex < 0 && sourceRows[index] && !sourceRows[index].id) savedIndex = index;
    const savedRow = savedIndex >= 0 ? sourceRows[savedIndex] : null;
    if (savedIndex >= 0) consumedIndexes.add(savedIndex);

    return {
      ...mapDefault(definition),
      ...savedRow,
      id: requiredId,
    };
  });
  const extraRows = sourceRows
    .filter((row, index) => !consumedIndexes.has(index) && !requiredIds.has(row?.id))
    .map((row) => ({
      ...row,
      id: row?.id || createBurnoutRowId('burnout-extra'),
    }));

  return [...requiredRows, ...extraRows];
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
      status: 'Not Tested',
      remarks: '',
    })),
    softwareChecklist: BURNOUT_SOFTWARE_ITEMS.map(([id, software, description, remarks]) => ({
      id,
      software,
      description,
      installed: false,
      remarks: '',
    })),
    monitoring: BURNOUT_MONITORING_ITEMS.map(([id, item, result, remarks]) => ({
      id,
      item,
      result: 'Not Recorded',
      remarks: '',
    })),
    finalEvaluation: BURNOUT_EVALUATION_ITEMS.map(([id, item, status, remarks]) => ({
      id,
      item,
      status: 'Not Recorded',
      remarks: '',
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
        status: 'Not Tested',
        remarks: '',
      })
    ),
    softwareChecklist: normalizeBurnoutRows(
      savedReport.softwareChecklist,
      BURNOUT_SOFTWARE_ITEMS,
      ([id, software, description, remarks]) => ({
        id,
        software,
        description,
        installed: false,
        remarks: '',
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

const buildStatusHistoryEntry = (status, timestamp, user, details = {}) => {
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
    handledByName: user?.name || '',
    technician: details.technician || '',
  };
};

const getTicketWorkStartedAt = (ticket) =>
  ticket?.workStartedAt ||
  (['in progress', 'under burnout'].includes(normalizeTicketStatus(ticket?.status))
    ? ticket?.adminUpdatedAt || ticket?.lastUpdated || ''
    : '');

const getTicketWorkEndedAt = (ticket) =>
  ticket?.workEndedAt ||
  (!isUnresolved(ticket?.status) ? ticket?.adminUpdatedAt || ticket?.lastUpdated || '' : '');

const isTicketLockActive = (ticket) => {
  if (!ticket?.lockedBy) return false;

  const expiresAt = new Date(ticket.lockExpiresAt || '').getTime();
  return !Number.isNaN(expiresAt) && expiresAt > Date.now();
};

const isTicketLockedByOther = (ticket, userId) =>
  isTicketLockActive(ticket) && ticket.lockedBy && ticket.lockedBy !== userId;

const formatTicketHandlingTimestamp = (value) => {
  const parsed = typeof value === 'number' ? new Date(value) : parsePortalTimestamp(value);

  if (!parsed) return String(value || '');

  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed);
};

const formatTicketQueueDateTime = (value) => {
  const parsed = parsePortalTimestamp(value);

  if (!parsed) return String(value || 'Submitted');

  const date = new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed);
  const time = new Intl.DateTimeFormat('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed);

  return `${date} • ${time}`;
};

const getTimeValue = (value) => {
  const parsed = new Date(value || '').getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
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

function Sidebar({ active, onNav, onLogout, open, canCreateUsers, canCreateIctTickets, canAccessDepartmentConsoles }) {
  const items = [
    { key: 'dashboard', label: 'Dashboard', Icon: Icon.Dashboard },
    { key: 'profile', label: 'My Profile', Icon: Icon.Profile },
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

  if (canCreateIctTickets) {
    items.push({ key: 'create-ict-ticket', label: 'Submit Ticket', Icon: Icon.Tickets });
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

const getVisibleTicketDescription = (description = '') =>
  String(description || '')
    .split('\n')
    .filter((line) => {
      const normalized = line.trim().toLowerCase();
      return (
        normalized &&
        !normalized.startsWith('submitted by super admin:') &&
        !normalized.startsWith('ticket for ict staff:')
      );
    })
    .join('\n')
    .trim();

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


function DashboardWatchSummary({ tickets, type, activeIndex = 0, onChangeIndex, onOpenTicket, now }) {
  const pageSize = 2;
  const lastIndex = Math.max(0, Math.floor((tickets.length - 1) / pageSize) * pageSize);
  const currentIndex = Math.min(Math.max(Math.floor(activeIndex / pageSize) * pageSize, 0), lastIndex);
  const visibleTickets = tickets.slice(currentIndex, currentIndex + pageSize);
  const ticketLabel = type === 'urgent' ? 'urgent ticket' : 'moved-date ticket';

  if (!visibleTickets.length) return null;

  return (
    <div className={'dashboard-watch-summary is-' + type}>
      <div className="dashboard-watch-ticket-list">
      {visibleTickets.map((ticket) => (
      <article
        key={ticket.id}
        className="dashboard-watch-summary-ticket"
        role="button"
        tabIndex={0}
        aria-label={'View ticket ' + getTicketDisplayCode(ticket)}
        onClick={() => onOpenTicket(ticket)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onOpenTicket(ticket);
          }
        }}
      >
        <div className="dashboard-watch-summary-copy">
          <div className="dashboard-watch-summary-ticket-topline">
            <span className="ticket-id">{getTicketDisplayCode(ticket)}</span>
            <TicketBadges ticket={ticket} />
          </div>
          <h4>{ticket.concernType || 'Unspecified concern'}</h4>
          <div className="dashboard-watch-ticket-meta">
            <p>{ticket.branch || 'No branch'} - {ticket.requester || ticket.ownerEmail || 'Employee'}</p>
            <TicketWorkTimer ticket={ticket} now={now} compact showLabel={false} />
          </div>
        </div>
      </article>
      ))}
      </div>

      {tickets.length > pageSize && (
        <div className="dashboard-watch-summary-footer">
          <p className="dashboard-watch-summary-position">
            Tickets {currentIndex + 1}-{Math.min(currentIndex + pageSize, tickets.length)} of {tickets.length}
          </p>
          <div className="dashboard-watch-summary-nav" aria-label={ticketLabel + ' navigation'}>
            <button
              type="button"
              onClick={() => onChangeIndex(Math.max(0, currentIndex - pageSize))}
              disabled={currentIndex === 0}
              aria-label={'Previous ' + ticketLabel}
              title={'Previous ' + ticketLabel}
            >
              <MonoIcon icon={ChevronLeft} />
            </button>
            <button
              type="button"
              onClick={() => onChangeIndex(Math.min(lastIndex, currentIndex + pageSize))}
              disabled={currentIndex === lastIndex}
              aria-label={'Next ' + ticketLabel}
              title={'Next ' + ticketLabel}
            >
              <MonoIcon icon={ChevronRight} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminProfileView({
  admin,
  tickets = [],
  canCreateUsers,
  canCreateIctTickets,
  canAccessDepartmentConsoles,
  onAdminUpdate,
  onGoTo,
}) {
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);
  const photoInputRef = useRef(null);
  const adminName = admin?.name || 'Admin User';
  const isSystemAccount = normalizePortalRole(admin?.role) === 'superadmin';
  const assignedOffice = admin?.branch || admin?.office || 'Not assigned';
  const department = admin?.department || 'Not assigned';
  const designation = admin?.designation || formatRoleLabel(admin?.role);

  const handledTickets = sortTickets(tickets.filter((ticket) => {
    const staffName = normalizeComparable(adminName);
    const staffId = normalizeComparable(admin?.id);
    const history = Array.isArray(ticket.statusHistory) ? ticket.statusHistory : [];

    return (
      (ticket.technicianId && ticket.technicianId === admin?.id) ||
      (!ticket.technicianId && normalizeComparable(ticket.technician) === staffName) ||
      history.some((entry) => (
        entry.technicianId === admin?.id ||
        normalizeComparable(entry.updatedBy) === staffId ||
        normalizeComparable(entry.updatedByName) === staffName ||
        normalizeComparable(entry.handledByName) === staffName ||
        (!entry.technicianId && normalizeComparable(entry.technician) === staffName)
      ))
    );
  }));

  const activeHandledTickets = handledTickets.filter((ticket) => isUnresolved(ticket.status)).length;
  const resolvedHandledTickets = handledTickets.filter(isTicketResolved).length;
  const recentHandledTickets = handledTickets.slice(0, 3);

  const profileFacts = isSystemAccount
    ? [
        { label: 'Job Title', value: 'ICT Super Admin', icon: BriefcaseBusiness },
        { label: 'Account Type', value: 'Shared system account', icon: ShieldCheck },
      ]
    : [
        { label: 'Job Title', value: designation || 'Not provided', icon: BriefcaseBusiness, fullWidth: true },
        { label: 'Employee ID', value: admin?.employeeId || 'Not provided', icon: UserRound },
        { label: 'Department', value: department, icon: Building2 },
        { label: 'Branch / Office', value: assignedOffice, icon: Building2 },
        { label: 'Email Address', value: admin?.email || 'Not provided', icon: Mail },
        { label: 'Phone Number', value: admin?.phone || 'Not provided', icon: Phone },
      ];

  const profileStats = [
    {
      label: 'Handled Tickets',
      value: handledTickets.length,
      meta: 'assigned or updated',
    },
    { label: 'Active Load', value: activeHandledTickets, meta: 'currently unresolved' },
    { label: 'Resolved Work', value: resolvedHandledTickets, meta: 'completed tickets' },
    { label: 'Access Level', value: formatRoleLabel(admin?.role), meta: admin?.status || 'Active' },
  ];

  const permissionItems = [
    'Review and update ICT helpdesk tickets',
    'Record admin actions, remarks, and resolutions',
    ...(canCreateIctTickets ? ['Submit ICT staff tickets for queue transparency'] : []),
    ...(canCreateUsers ? ['Create and manage portal user accounts'] : []),
    ...(canAccessDepartmentConsoles ? ['Access Marketing and HR admin consoles'] : []),
  ];

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    setIsSavingPhoto(true);

    try {
      const profilePhoto = await fileToProfilePhotoDataUrl(file);
      const updatedAdmin = await updateCurrentPortalUserProfilePhoto(profilePhoto);
      onAdminUpdate(updatedAdmin);
    } catch (error) {
      window.alert(error.message || 'Unable to update profile photo.');
    } finally {
      setIsSavingPhoto(false);
    }
  };

  const photoControl = (
    <>
      <button
        type="button"
        className="admin-profile-photo portal-profile-avatar-button"
        onClick={() => photoInputRef.current?.click()}
        disabled={isSavingPhoto}
        aria-label={admin?.profilePhoto ? 'Change profile photo' : 'Upload profile photo'}
        aria-busy={isSavingPhoto}
        title={admin?.profilePhoto ? 'Change profile photo' : 'Upload profile photo'}
      >
        {admin?.profilePhoto ? (
          <img src={admin.profilePhoto} alt={`${adminName} profile`} />
        ) : (
          <span>{admin?.initials || getInitials(adminName)}</span>
        )}
        <i><MonoIcon icon={Camera} /></i>
      </button>
      <input
        ref={photoInputRef}
        type="file"
        className="admin-profile-photo-input"
        accept={PHOTO_ACCEPT}
        onChange={handlePhotoChange}
      />
    </>
  );

  return (
    <PortalProfileLayout
      photoControl={photoControl}
      name={adminName}
      subtitle={isSystemAccount ? 'ICT Super Admin' : `${designation} - ${department}`}
      meta={isSystemAccount
        ? [{ label: 'Role', value: formatRoleLabel(admin?.role) }]
        : [
            { label: 'Role', value: formatRoleLabel(admin?.role) },
            { label: 'Office', value: assignedOffice },
          ]}
      stats={profileStats}
      facts={profileFacts}
      scopeEyebrow={isSystemAccount ? 'System Account' : 'Admin Scope'}
      scopeTitle={isSystemAccount ? 'Access & Audit Trail' : 'Permissions & Accountability'}
      scopeItems={isSystemAccount
        ? [...permissionItems, 'Activity is recorded under the shared Super Admin account.']
        : permissionItems}
      activityEyebrow="Recent Activity"
      activityTitle="Latest Handled Tickets"
      activityActionLabel="View Tickets"
      onActivityAction={() => onGoTo('tickets')}
      activity={recentHandledTickets.map((ticket) => ({
        id: ticket.id,
        status: ticket.status || 'Open',
        title: ticket.ticketCode || ticket.id,
        description: `${ticket.concernType || ticket.supportCategory || 'ICT ticket'} - ${ticket.branch || 'No branch'}`,
        date: ticket.lastUpdated || ticket.adminUpdatedAt || ticket.createdAt || ticket.date || 'No date',
        onClick: () => onGoTo('tickets'),
      }))}
      emptyActivityTitle="No handled tickets yet"
      emptyActivityText="Tickets assigned to or updated by this admin will appear here."
    />
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

function BurnoutReportEditor({
  ticket,
  report,
  onChange,
  readOnly,
  draft,
  updateDraft,
  statusOptions,
  visibleTechnicianId,
  technicianProfiles,
  canEditOutcomeFields,
  lockedOutcomePlaceholder,
  onNoteBlur,
  canReopen,
  formError,
  onPreviewAttachment,
}) {
  const [activeStep, setActiveStep] = useState(0);
  const [showOptionalDetails, setShowOptionalDetails] = useState(false);
  const [pendingSoftwareRowId, setPendingSoftwareRowId] = useState('');
  const workspaceRef = useRef(null);
  const steps = [
    { id: 'request', label: 'Request' },
    { id: 'handling', label: 'Handling' },
    { id: 'unit', label: 'Unit & dates' },
    { id: 'testingChecklist', label: 'Hardware' },
    { id: 'softwareChecklist', label: 'Software' },
    { id: 'monitoring', label: 'Monitoring' },
    { id: 'finalEvaluation', label: 'Final review' },
  ];

  useEffect(() => {
    const scrollContainer = workspaceRef.current?.closest('.ticket-action-scroll-content');
    if (scrollContainer) scrollContainer.scrollTop = 0;
  }, [activeStep, showOptionalDetails]);

  useEffect(() => {
    if (!pendingSoftwareRowId) return;
    const row = document.getElementById(`burnout-software-row-${pendingSoftwareRowId}`);
    if (!row) return;
    row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    row.querySelector('input')?.focus({ preventScroll: true });
    setPendingSoftwareRowId('');
  }, [pendingSoftwareRowId, report.softwareChecklist]);

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
    const rowId = createBurnoutRowId('software');
    const nextRows = [
      ...(report.softwareChecklist || []),
      {
        id: rowId,
        software: '',
        description: '',
        installed: false,
        remarks: '',
      },
    ];
    onChange({
      ...report,
      softwareChecklist: nextRows,
    });
    setPendingSoftwareRowId(rowId);
  };

  const removeSoftwareRow = (rowId) => {
    onChange({
      ...report,
      softwareChecklist: (report.softwareChecklist || []).filter((row) => row.id !== rowId),
    });
  };

  const requiredSoftwareIds = new Set(BURNOUT_SOFTWARE_ITEMS.map(([id]) => id));
  const completion = {
    testingChecklist: (report.testingChecklist || []).filter((item) =>
      item.status === 'Pass' || (item.status === 'N/A' && String(item.remarks || '').trim().length >= 8)
    ).length,
    softwareChecklist: BURNOUT_SOFTWARE_ITEMS.filter(([id]) =>
      (report.softwareChecklist || []).some((item) => item.id === id && item.installed === true)
    ).length,
    monitoring: (report.monitoring || []).filter((item) =>
      String(item.result || '').trim() && String(item.result || '').trim().toLowerCase() !== 'not recorded' &&
      String(item.remarks || '').trim().length >= 8
    ).length,
    finalEvaluation: (report.finalEvaluation || []).filter((item) =>
      String(item.status || '').trim() && String(item.status || '').trim().toLowerCase() !== 'not recorded' &&
      String(item.remarks || '').trim().length >= 8
    ).length,
  };

  const getStepRows = (stepId) => {
    if (stepId === 'testingChecklist' || stepId === 'softwareChecklist' || stepId === 'monitoring') {
      return report[stepId] || [];
    }
    if (stepId === 'finalEvaluation') return report.finalEvaluation || [];
    return [];
  };

  const getStepProgress = (stepId) => {
    const total = stepId === 'softwareChecklist'
      ? BURNOUT_SOFTWARE_ITEMS.length
      : getStepRows(stepId).length;
    if (stepId === 'testingChecklist' || stepId === 'softwareChecklist' || stepId === 'monitoring' || stepId === 'finalEvaluation') {
      return `${completion[stepId]}/${total}`;
    }
    return null;
  };

  const activeStepId = showOptionalDetails ? 'notes' : steps[activeStep]?.id || 'request';
  const activeRows = getStepRows(activeStepId);
  const goPrevious = () => {
    if (showOptionalDetails) {
      setShowOptionalDetails(false);
      return;
    }
    setActiveStep((current) => Math.max(0, current - 1));
  };
  const goNext = () => {
    if (showOptionalDetails) return;
    if (activeStep === steps.length - 1) {
      setShowOptionalDetails(true);
      return;
    }
    setActiveStep((current) => Math.min(steps.length - 1, current + 1));
  };

  const updateList = (listKey, rowId, updates) => updateReportList(listKey, rowId, updates);
  const resizeSoftwareDescription = (element) => {
    if (!element) return;
    element.style.setProperty('height', 'auto', 'important');
    element.style.setProperty('height', `${element.scrollHeight}px`, 'important');
  };
  const meta = [
    ['Ticket code', getTicketDisplayCode(ticket)],
    ['Requester', ticket.requester || ticket.ownerEmail || 'Employee'],
    ['Employee ID', ticket.employeeId || 'Not provided'],
    ['Branch', ticket.branch || 'Not provided'],
    ['Department', ticket.department || 'Not provided'],
    ['Device / system', ticket.deviceName || ticket.deviceType || 'Not provided'],
    ['Contact', ticket.contactNumber || 'Not provided'],
    ['SAAR', ticket.saarAttachment?.name || (ticket.saarRequired ? 'Required, no file found' : 'Not required')],
  ];

  if (ticket?.id) {
    const hardwareRows = report.testingChecklist || [];
    const softwareRows = report.softwareChecklist || [];
    const monitoringRows = report.monitoring || [];
    const evaluationRows = report.finalEvaluation || [];
    const testingDays = report.startDate && report.endDate
      ? Math.max(0, Math.round((new Date(`${report.endDate}T00:00:00`) - new Date(`${report.startDate}T00:00:00`)) / 86400000))
      : 0;

    return (
      <section className="burnout-report-panel burnout-dashboard">
        {formError && <div className="form-error app-error-alert burnout-dashboard-error" role="alert">{formError}</div>}

        <section className="burnout-dashboard-section burnout-ticket-information" aria-labelledby="burnout-ticket-information-title">
          <header className="burnout-dashboard-heading">
            <div><FileText aria-hidden="true" /><h4 id="burnout-ticket-information-title">Ticket Information</h4></div>
            <span>Request overview</span>
          </header>
          <div className="burnout-request-grid">
            {meta.map(([label, value]) => (
              <div className="burnout-request-cell" key={label}><span>{label}</span><strong title={value}>{value}</strong></div>
            ))}
          </div>
          {(ticket.saarAttachment?.dataUrl || ticket.photoAttachments?.length > 0) && (
            <div className="burnout-request-attachments">
              {ticket.saarAttachment?.dataUrl && (
                <a href={ticket.saarAttachment.dataUrl} target="_blank" rel="noopener noreferrer">
                  <FileText aria-hidden="true" /> SAAR: {ticket.saarAttachment.name}
                </a>
              )}
              {ticket.photoAttachments?.length > 0 && (
                <PhotoAttachmentGallery photos={ticket.photoAttachments} emptyText="" onPreview={onPreviewAttachment} />
              )}
            </div>
          )}
        </section>

        <section className="burnout-dashboard-section burnout-test-details" aria-labelledby="burnout-test-details-title">
          <header className="burnout-dashboard-heading">
            <div><CalendarDays aria-hidden="true" /><h4 id="burnout-test-details-title">Burnout Test Details</h4></div>
            <label className="burnout-status-control"><span>Status</span>
              <select className="ticket-field ticket-select" value={draft.status} onChange={(event) => updateDraft('status', event.target.value)} required disabled={readOnly} aria-label="Ticket status">
                {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>
          </header>
          <div className="burnout-test-grid">
            <label className="burnout-test-cell"><span>Start date</span><input className="ticket-field ticket-input" type="date" value={report.startDate || ''} onChange={(event) => updateReportField('startDate', event.target.value)} readOnly={readOnly} /></label>
            <label className="burnout-test-cell"><span>End date</span><input className="ticket-field ticket-input" type="date" value={report.endDate || ''} onChange={(event) => updateReportField('endDate', event.target.value)} readOnly={readOnly} /></label>
            <div className="burnout-test-cell"><span>Testing duration</span><strong>{testingDays ? `${testingDays} ${testingDays === 1 ? 'day' : 'days'}` : 'Set test dates'}</strong></div>
            <label className="burnout-test-cell"><span>Technician</span><input className="ticket-field ticket-input" value={report.performedBy || ''} onChange={(event) => updateReportField('performedBy', event.target.value)} readOnly={readOnly} placeholder="ICT staff name" /></label>
            <label className="burnout-test-cell"><span>Assigned to</span>
              <select className="ticket-field ticket-select" value={visibleTechnicianId} onChange={(event) => updateDraft('technicianId', event.target.value)} required disabled={readOnly} aria-label="Assigned ICT staff">
                <option value="__unassigned__">Unassigned</option>
                {visibleTechnicianId === '__legacy__' && <option value="__legacy__" disabled>Legacy assignment: {draft.technician}</option>}
                {technicianProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
              </select>
            </label>
            <label className="burnout-test-cell"><span>SLA</span>
              <select className="ticket-field ticket-select" value={draft.sla || 'Low'} onChange={(event) => updateDraft('sla', event.target.value)} required disabled={readOnly} aria-label="Ticket SLA">
                {SLA_LEVELS.map((sla) => <option key={sla} value={sla}>{sla}</option>)}
              </select>
            </label>
            <div className="burnout-test-cell"><span>Brand &amp; model</span><strong>{ticket.brand || ticket.deviceName || 'Not provided'}</strong></div>
            <div className="burnout-test-cell"><span>Serial number</span><strong>{ticket.serialNumber || 'Not provided'}</strong></div>
            <div className="burnout-test-cell"><span>User / custodian</span><strong>{ticket.custodian || ticket.requester || 'Not provided'}</strong></div>
            <div className="burnout-test-cell"><span>Request date</span><strong>{report.requestedDate || ticket.createdAt || 'Not provided'}</strong></div>
          </div>
          <p className="burnout-period-note"><CalendarDays aria-hidden="true" /><span>Testing must run for at least 3 full days before the unit can pass final review.</span></p>
        </section>

        <div className="burnout-checklist-dashboard">
          <section className="burnout-dashboard-section burnout-checklist-card burnout-hardware-card" aria-labelledby="burnout-hardware-title">
            <header className="burnout-dashboard-heading burnout-checklist-heading">
              <div><Monitor aria-hidden="true" /><h4 id="burnout-hardware-title">Hardware Checklist</h4></div>
              <span>{completion.testingChecklist}/{hardwareRows.length}</span>
            </header>
            <p className="burnout-checklist-guidance">Each check must pass, or be marked N/A with a reason.</p>
            <div className="burnout-dashboard-list burnout-hardware-list">
              {hardwareRows.map((item) => (
                <article className="burnout-dashboard-row burnout-hardware-row" key={item.id}>
                  <div className="burnout-row-copy"><strong>{item.category}</strong><span>{item.description}</span></div>
                  <select aria-label={`${item.category} status`} className="ticket-field ticket-select" value={item.status || 'Not Tested'} onChange={(event) => updateList('testingChecklist', item.id, { status: event.target.value })} disabled={readOnly}>
                    <option value="Not Tested">Not Tested</option><option value="Pass">Pass</option><option value="Fail">Fail</option><option value="N/A">N/A</option>
                  </select>
                  <input aria-label={`${item.category} remarks`} className="ticket-field ticket-input burnout-row-remarks" value={item.remarks || ''} onChange={(event) => updateList('testingChecklist', item.id, { remarks: event.target.value })} readOnly={readOnly} placeholder={item.status === 'N/A' ? 'N/A reason' : 'Remarks'} />
                </article>
              ))}
            </div>
          </section>

          <section className="burnout-dashboard-section burnout-checklist-card burnout-software-card" aria-labelledby="burnout-software-title">
            <header className="burnout-dashboard-heading burnout-checklist-heading">
              <div><Wrench aria-hidden="true" /><h4 id="burnout-software-title">Software Checklist</h4></div>
              <div className="burnout-checklist-heading-actions"><span>{completion.softwareChecklist}/{BURNOUT_SOFTWARE_ITEMS.length} required</span>
                {!readOnly && <button type="button" className="modal-btn print compact" onClick={addSoftwareRow} aria-label="Add software"><MonoIcon icon={Plus} /><span>Add software</span></button>}
              </div>
            </header>
            <p className="burnout-checklist-guidance">All required software must be marked installed.</p>
            <div className="burnout-dashboard-list burnout-software-list">
              {softwareRows.map((item) => {
                const required = requiredSoftwareIds.has(item.id);
                return (
                  <article className="burnout-dashboard-row burnout-software-row" id={`burnout-software-row-${item.id}`} key={item.id}>
                    <div className="burnout-software-main burnout-row-copy">
                      <input aria-label="Software name" className="ticket-field ticket-input" value={item.software || ''} onChange={(event) => updateList('softwareChecklist', item.id, { software: event.target.value })} readOnly={readOnly} placeholder="Software name" />
                      <textarea ref={resizeSoftwareDescription} onInput={(event) => resizeSoftwareDescription(event.currentTarget)} aria-label={`${item.software || 'Software'} description`} className="ticket-field ticket-textarea" rows={1} value={item.description || ''} onChange={(event) => updateList('softwareChecklist', item.id, { description: event.target.value })} readOnly={readOnly} placeholder="Description" />
                    </div>
                    <div className="burnout-row-actions">
                      <label className="burnout-installed-toggle"><input type="checkbox" checked={Boolean(item.installed)} onChange={(event) => updateList('softwareChecklist', item.id, { installed: event.target.checked })} disabled={readOnly} /><span>{item.installed ? 'Installed' : 'Not installed'}</span></label>
                      {!readOnly && !required && <button type="button" className="burnout-row-icon-btn" onClick={() => removeSoftwareRow(item.id)} aria-label={`Remove ${item.software || 'software row'}`} title="Remove software"><MonoIcon icon={Trash2} /></button>}
                    </div>
                    <input aria-label={`${item.software || 'Software'} remarks`} className="ticket-field ticket-input burnout-row-remarks" value={item.remarks || ''} onChange={(event) => updateList('softwareChecklist', item.id, { remarks: event.target.value })} readOnly={readOnly} placeholder="Remarks" />
                  </article>
                );
              })}
            </div>
          </section>

          <section className="burnout-dashboard-section burnout-checklist-card burnout-monitoring-card" aria-labelledby="burnout-monitoring-title">
            <header className="burnout-dashboard-heading burnout-checklist-heading">
              <div><Clock3 aria-hidden="true" /><h4 id="burnout-monitoring-title">Monitoring Summary</h4></div>
              <span>{completion.monitoring}/{monitoringRows.length}</span>
            </header>
            <p className="burnout-checklist-guidance">Record a result and meaningful remarks for every observation.</p>
            <div className="burnout-dashboard-list burnout-monitoring-list">
              {monitoringRows.map((item) => (
                <article className="burnout-dashboard-row burnout-monitoring-row" key={item.id}>
                  <div className="burnout-row-copy"><strong>{item.item}</strong></div>
                  <input aria-label={`${item.item} result`} className="ticket-field ticket-input burnout-row-status" value={item.result || ''} onChange={(event) => updateList('monitoring', item.id, { result: event.target.value })} readOnly={readOnly} placeholder="Result" />
                  <input aria-label={`${item.item} remarks`} className="ticket-field ticket-input burnout-row-remarks" value={item.remarks || ''} onChange={(event) => updateList('monitoring', item.id, { remarks: event.target.value })} readOnly={readOnly} placeholder="Observation / remarks" />
                </article>
              ))}
            </div>
          </section>
        </div>

        <section className="burnout-dashboard-section burnout-final-review" aria-labelledby="burnout-final-review-title">
          <header className="burnout-dashboard-heading burnout-checklist-heading">
            <div><Check aria-hidden="true" /><h4 id="burnout-final-review-title">Final Review</h4></div>
            <span>{completion.finalEvaluation}/{evaluationRows.length} complete</span>
          </header>
          <div className="burnout-evaluation-list">
            {evaluationRows.map((item) => (
              <article className="burnout-evaluation-row" key={item.id}>
                <strong>{item.item}</strong>
                <input aria-label={`${item.item} status`} className="ticket-field ticket-input" value={item.status || ''} onChange={(event) => updateList('finalEvaluation', item.id, { status: event.target.value })} readOnly={readOnly} placeholder="Evaluation result" />
                <textarea aria-label={`${item.item} remarks`} className="ticket-field ticket-textarea" value={item.remarks || ''} onChange={(event) => updateList('finalEvaluation', item.id, { remarks: event.target.value })} readOnly={readOnly} placeholder="Findings and remarks" />
              </article>
            ))}
          </div>
          <div className={`burnout-completion-summary${completion.testingChecklist === hardwareRows.length && completion.softwareChecklist === BURNOUT_SOFTWARE_ITEMS.length && completion.monitoring === monitoringRows.length && completion.finalEvaluation === evaluationRows.length ? ' complete' : ''}`}>
            <Check aria-hidden="true" />
            <span>Hardware {completion.testingChecklist}/{hardwareRows.length} · Software {completion.softwareChecklist}/{BURNOUT_SOFTWARE_ITEMS.length} · Monitoring {completion.monitoring}/{monitoringRows.length} · Evaluation {completion.finalEvaluation}/{evaluationRows.length}</span>
          </div>
        </section>

        {canReopen && (
          <section className="burnout-dashboard-section burnout-reopen-section" aria-labelledby="burnout-reopen-title">
            <header className="burnout-dashboard-heading"><div><RotateCcw aria-hidden="true" /><h4 id="burnout-reopen-title">Reopen Reason</h4></div><span>Required to reopen</span></header>
            <textarea className="ticket-field ticket-textarea" value={draft.reopenReason} onChange={(event) => updateDraft('reopenReason', event.target.value)} minLength={8} placeholder="Explain why this completed ticket needs to be reopened." aria-label="Reopen reason" />
          </section>
        )}

        <details className="burnout-optional-details">
          <summary><span><FileText aria-hidden="true" />Additional details</span><span className="burnout-optional-badge">Optional</span></summary>
          <div className="burnout-handling-notes">
            <div className="ticket-form-group"><label>Action Taken</label>
              <textarea className="ticket-field ticket-textarea" value={draft.actionTaken} onChange={(event) => updateDraft('actionTaken', event.target.value)} onBlur={onNoteBlur} placeholder={canEditOutcomeFields ? 'Record the work completed...' : lockedOutcomePlaceholder} readOnly={!canEditOutcomeFields} />
            </div>
            <div className="ticket-form-group"><label>Internal ICT Notes</label>
              <textarea className="ticket-field ticket-textarea" value={draft.adminRemarks} onChange={(event) => updateDraft('adminRemarks', event.target.value)} onBlur={onNoteBlur} placeholder={canEditOutcomeFields ? 'Internal remarks or follow-up notes...' : lockedOutcomePlaceholder} readOnly={!canEditOutcomeFields} />
            </div>
            <div className="ticket-form-group"><label>Burnout Notes</label>
              <textarea className="ticket-field ticket-textarea" value={draft.resolution} onChange={(event) => updateDraft('resolution', event.target.value)} onBlur={onNoteBlur} placeholder={canEditOutcomeFields ? 'Unit condition, pass/fail, repair, or turnover notes...' : lockedOutcomePlaceholder} readOnly={!canEditOutcomeFields} />
            </div>
            <div className="ticket-form-group"><label>Recommendation</label>
              <textarea className="ticket-field ticket-textarea" value={draft.recommendation} onChange={(event) => updateDraft('recommendation', event.target.value)} onBlur={onNoteBlur} placeholder={canEditOutcomeFields ? 'Prevention or follow-up recommendation...' : lockedOutcomePlaceholder} readOnly={!canEditOutcomeFields} />
            </div>
          </div>
        </details>
      </section>
    );
  }

  return (
    <section className="burnout-report-panel burnout-wizard">
      <div className="burnout-wizard-topline">
        <div>
          <span className="section-kicker">ICT Burnout Process</span>
          <h4>Unit preparation and 3-5 day monitoring</h4>
        </div>
        <span className={`burnout-wizard-step-count${showOptionalDetails ? ' is-optional' : ''}`}>
          {showOptionalDetails ? 'Optional details' : `Step ${activeStep + 1} of ${steps.length}`}
        </span>
      </div>

      <div className="burnout-workspace" ref={workspaceRef}>
        <nav className="burnout-wizard-steps" aria-label="Burnout checklist sections">
          {steps.map((step, index) => {
            const progress = getStepProgress(step.id);
            const [complete, total] = progress?.split('/').map(Number) || [];
            const isComplete = Boolean(progress) && complete === total;
            return (
              <button
                key={step.id}
                type="button"
                className={`${index === activeStep ? 'active' : ''}${isComplete ? ' complete' : ''}`.trim()}
                aria-current={index === activeStep ? 'step' : undefined}
                aria-label={`Step ${index + 1}: ${step.label}${progress ? `, ${progress} complete` : ''}`}
                title={step.label}
                onClick={() => {
                  setShowOptionalDetails(false);
                  setActiveStep(index);
                }}
              >
                <span className="burnout-step-number">
                  {isComplete ? <Check aria-hidden="true" /> : index + 1}
                </span>
                <span className="burnout-step-label">{step.label}</span>
                {progress && <small>{progress}</small>}
              </button>
            );
          })}
          <div className="burnout-optional-navigation">
            <span>Optional</span>
            <button
              type="button"
              className={showOptionalDetails ? 'active' : ''}
              aria-current={showOptionalDetails ? 'location' : undefined}
              onClick={() => setShowOptionalDetails(true)}
            >
              <span className="burnout-optional-icon"><FileText aria-hidden="true" /></span>
              <span className="burnout-step-label">Additional details</span>
            </button>
          </div>
        </nav>

        <div className="burnout-workspace-main">
          {formError && <div className="form-error app-error-alert burnout-wizard-error" role="alert">{formError}</div>}

          <div className="burnout-step-stage" key={activeStepId}>
        {activeStepId === 'request' && (
          <div className="burnout-step-content">
            <div className="burnout-section-heading">
              <div><span>01</span><h5>Request overview</h5></div>
              <p>Submitted {ticket.createdAt || ticket.date || 'date unavailable'}</p>
            </div>
            <div className="burnout-request-grid">
              {meta.map(([label, value]) => (
                <div className="burnout-request-cell" key={label}><span>{label}</span><strong>{value}</strong></div>
              ))}
            </div>
            {(ticket.saarAttachment?.dataUrl || ticket.photoAttachments?.length > 0) && (
              <div className="burnout-request-attachments">
                {ticket.saarAttachment?.dataUrl && (
                  <a href={ticket.saarAttachment.dataUrl} target="_blank" rel="noopener noreferrer">
                    <FileText aria-hidden="true" /> SAAR: {ticket.saarAttachment.name}
                  </a>
                )}
                {ticket.photoAttachments?.length > 0 && (
                  <PhotoAttachmentGallery photos={ticket.photoAttachments} emptyText="" onPreview={onPreviewAttachment} />
                )}
              </div>
            )}
          </div>
        )}

        {activeStepId === 'handling' && (
          <div className="burnout-step-content">
            <div className="burnout-section-heading">
              <div><span>02</span><h5>Ticket handling</h5></div>
              <p>Update assignment and service status</p>
            </div>
            <div className="burnout-handling-controls">
              <div className="ticket-form-group"><label>Status</label>
                <select className="ticket-field ticket-select" value={draft.status} onChange={(event) => updateDraft('status', event.target.value)} required disabled={readOnly}>
                  {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>
              <div className="ticket-form-group"><label>SLA</label>
                <select className="ticket-field ticket-select" value={draft.sla || 'Low'} onChange={(event) => updateDraft('sla', event.target.value)} required disabled={readOnly}>
                  {SLA_LEVELS.map((sla) => <option key={sla} value={sla}>{sla}</option>)}
                </select>
              </div>
              <div className="ticket-form-group"><label>Assigned ICT Staff</label>
                <select className="ticket-field ticket-select" value={visibleTechnicianId} onChange={(event) => updateDraft('technicianId', event.target.value)} required disabled={readOnly}>
                  <option value="__unassigned__">Unassigned</option>
                  {visibleTechnicianId === '__legacy__' && <option value="__legacy__" disabled>Legacy assignment: {draft.technician}</option>}
                  {technicianProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
                </select>
              </div>
          </div>
          </div>
        )}

        {activeStepId === 'notes' && (
          <div className="burnout-step-content">
            <div className="burnout-section-heading">
              <div><h5>Additional details</h5><span className="burnout-optional-badge">Optional</span></div>
              <p>Optional notes to supplement the Burnout record</p>
            </div>
            <div className="burnout-handling-notes">
              <div className="ticket-form-group"><label>Action Taken</label>
                <textarea className="ticket-field ticket-textarea" value={draft.actionTaken} onChange={(event) => updateDraft('actionTaken', event.target.value)} onBlur={onNoteBlur} placeholder={canEditOutcomeFields ? 'Record the work completed...' : lockedOutcomePlaceholder} readOnly={!canEditOutcomeFields} />
              </div>
              <div className="ticket-form-group"><label>Internal ICT Notes</label>
                <textarea className="ticket-field ticket-textarea" value={draft.adminRemarks} onChange={(event) => updateDraft('adminRemarks', event.target.value)} onBlur={onNoteBlur} placeholder={canEditOutcomeFields ? 'Internal remarks or follow-up notes...' : lockedOutcomePlaceholder} readOnly={!canEditOutcomeFields} />
              </div>
              <div className="ticket-form-group"><label>Burnout Notes</label>
                <textarea className="ticket-field ticket-textarea" value={draft.resolution} onChange={(event) => updateDraft('resolution', event.target.value)} onBlur={onNoteBlur} placeholder={canEditOutcomeFields ? 'Unit condition, pass/fail, repair, or turnover notes...' : lockedOutcomePlaceholder} readOnly={!canEditOutcomeFields} />
              </div>
              <div className="ticket-form-group"><label>Recommendation</label>
                <textarea className="ticket-field ticket-textarea" value={draft.recommendation} onChange={(event) => updateDraft('recommendation', event.target.value)} onBlur={onNoteBlur} placeholder={canEditOutcomeFields ? 'Prevention or follow-up recommendation...' : lockedOutcomePlaceholder} readOnly={!canEditOutcomeFields} />
              </div>
              {canReopen && <div className="ticket-form-group burnout-reopen-reason"><label>Reopen Reason (required to reopen)</label>
                <textarea className="ticket-field ticket-textarea" value={draft.reopenReason} onChange={(event) => updateDraft('reopenReason', event.target.value)} minLength={8} />
              </div>}
            </div>
          </div>
        )}

        {activeStepId === 'unit' && (
          <div className="burnout-step-content">
            <div className="burnout-section-heading">
              <div><span>03</span><h5>Unit and test period</h5></div>
              <p>Testing must run for at least 3 full days before passing</p>
            </div>
            <div className="burnout-unit-summary">
              <div><span>Brand & model</span><strong>{ticket.brand || ticket.deviceName || 'Not provided'}</strong></div>
              <div><span>Serial number</span><strong>{ticket.serialNumber || 'Not provided'}</strong></div>
              <div><span>User / custodian</span><strong>{ticket.custodian || ticket.requester || 'Not provided'}</strong></div>
              <div><span>Request date</span><strong>{report.requestedDate || ticket.createdAt || 'Not provided'}</strong></div>
            </div>
            <div className="burnout-unit-fields">
              <div className="ticket-form-group"><label>Performed By</label><input className="ticket-field ticket-input" value={report.performedBy || ''} onChange={(event) => updateReportField('performedBy', event.target.value)} readOnly={readOnly} placeholder="ICT staff name" /></div>
              <div className="ticket-form-group"><label>Start Date</label><input className="ticket-field ticket-input" type="date" value={report.startDate || ''} onChange={(event) => updateReportField('startDate', event.target.value)} readOnly={readOnly} /></div>
              <div className="ticket-form-group"><label>End Date</label><input className="ticket-field ticket-input" type="date" value={report.endDate || ''} onChange={(event) => updateReportField('endDate', event.target.value)} readOnly={readOnly} /></div>
            </div>
            <div className="burnout-period-note"><CalendarDays aria-hidden="true" /><span>Record daily observations in Monitoring throughout the 3-5 day Burnout period.</span></div>
          </div>
        )}

        {activeStepId === 'testingChecklist' && (
          <div className="burnout-step-content">
            <div className="burnout-section-heading">
              <div><span>04</span><h5>Hardware testing</h5></div>
              <p>{completion.testingChecklist} of {activeRows.length} checks complete</p>
            </div>
            <div className="burnout-page-caption">All {activeRows.length} checks<span>Every test must pass, or be marked N/A with a reason.</span></div>
            <div className="burnout-check-list">
              {activeRows.map((item) => (
                <article className="burnout-check-row" key={item.id}>
                  <div className="burnout-check-copy"><strong>{item.category}</strong><span>{item.description}</span></div>
                  <select aria-label={`${item.category} status`} className="ticket-field ticket-select" value={item.status || 'Not Tested'} onChange={(event) => updateList('testingChecklist', item.id, { status: event.target.value })} disabled={readOnly}>
                    <option value="Not Tested">Not Tested</option><option value="Pass">Pass</option><option value="Fail">Fail</option><option value="N/A">N/A</option>
                  </select>
                  <input aria-label={`${item.category} remarks`} className="ticket-field ticket-input" value={item.remarks || ''} onChange={(event) => updateList('testingChecklist', item.id, { remarks: event.target.value })} readOnly={readOnly} placeholder={item.status === 'N/A' ? 'Reason required for N/A' : 'Test remarks'} />
                </article>
              ))}
            </div>
          </div>
        )}

        {activeStepId === 'softwareChecklist' && (
          <div className="burnout-step-content">
            <div className="burnout-section-heading">
              <div><span>05</span><h5>Software installation</h5></div>
              <div className="burnout-heading-actions"><p>{completion.softwareChecklist} of {BURNOUT_SOFTWARE_ITEMS.length} required installed</p>
                {!readOnly && <button type="button" className="modal-btn print compact" onClick={addSoftwareRow}><MonoIcon icon={Plus} />Add software</button>}
              </div>
            </div>
            <div className="burnout-page-caption">All {activeRows.length} items<span>All required software must be marked installed.</span></div>
            <div className="burnout-software-list">
              {activeRows.map((item) => {
                const required = requiredSoftwareIds.has(item.id);
                return (
                  <article className="burnout-software-row" id={`burnout-software-row-${item.id}`} key={item.id}>
                    <div className="burnout-software-main">
                      <input aria-label="Software name" className="ticket-field ticket-input" value={item.software || ''} onChange={(event) => updateList('softwareChecklist', item.id, { software: event.target.value })} readOnly={readOnly} placeholder="Software name" />
                      <textarea ref={resizeSoftwareDescription} onInput={(event) => resizeSoftwareDescription(event.currentTarget)} aria-label="Software description" className="ticket-field ticket-textarea" rows={2} value={item.description || ''} onChange={(event) => updateList('softwareChecklist', item.id, { description: event.target.value })} readOnly={readOnly} placeholder="Description" />
                    </div>
                    <label className="burnout-installed-toggle"><input type="checkbox" checked={Boolean(item.installed)} onChange={(event) => updateList('softwareChecklist', item.id, { installed: event.target.checked })} disabled={readOnly} /><span>{item.installed ? 'Installed' : 'Not installed'}</span></label>
                    <input aria-label={`${item.software || 'Software'} remarks`} className="ticket-field ticket-input" value={item.remarks || ''} onChange={(event) => updateList('softwareChecklist', item.id, { remarks: event.target.value })} readOnly={readOnly} placeholder="Remarks" />
                    {!readOnly && !required && <button type="button" className="burnout-row-icon-btn" onClick={() => removeSoftwareRow(item.id)} aria-label={`Remove ${item.software || 'software row'}`} title="Remove software"><MonoIcon icon={Trash2} /></button>}
                  </article>
                );
              })}
            </div>
          </div>
        )}

        {activeStepId === 'monitoring' && (
          <div className="burnout-step-content">
            <div className="burnout-section-heading">
              <div><span>06</span><h5>Burnout monitoring</h5></div>
              <p>{completion.monitoring} of {activeRows.length} observations complete</p>
            </div>
            <div className="burnout-page-caption">All {activeRows.length} observations<span>Record a result and meaningful remarks for each item.</span></div>
            <div className="burnout-monitoring-list">
              {activeRows.map((item) => (
                <article className="burnout-monitoring-row" key={item.id}>
                  <strong>{item.item}</strong>
                  <input aria-label={`${item.item} result`} className="ticket-field ticket-input" value={item.result || ''} onChange={(event) => updateList('monitoring', item.id, { result: event.target.value })} readOnly={readOnly} placeholder="Result" />
                  <input aria-label={`${item.item} remarks`} className="ticket-field ticket-input" value={item.remarks || ''} onChange={(event) => updateList('monitoring', item.id, { remarks: event.target.value })} readOnly={readOnly} placeholder="Observation / remarks" />
                </article>
              ))}
            </div>
          </div>
        )}

        {activeStepId === 'finalEvaluation' && (
          <div className="burnout-step-content">
            <div className="burnout-section-heading">
              <div><span>07</span><h5>Final evaluation</h5></div>
              <p>{completion.finalEvaluation} of {activeRows.length} evaluations complete</p>
            </div>
            <div className="burnout-evaluation-list">
              {activeRows.map((item) => (
                <article className="burnout-evaluation-row" key={item.id}>
                  <strong>{item.item}</strong>
                  <input aria-label={`${item.item} status`} className="ticket-field ticket-input" value={item.status || ''} onChange={(event) => updateList('finalEvaluation', item.id, { status: event.target.value })} readOnly={readOnly} placeholder="Evaluation status" />
                  <textarea aria-label={`${item.item} remarks`} className="ticket-field ticket-textarea" value={item.remarks || ''} onChange={(event) => updateList('finalEvaluation', item.id, { remarks: event.target.value })} readOnly={readOnly} placeholder="Explain the evaluation" />
                </article>
              ))}
            </div>
            <div className={`burnout-completion-summary${completion.testingChecklist === (report.testingChecklist || []).length && completion.softwareChecklist === BURNOUT_SOFTWARE_ITEMS.length && completion.monitoring === (report.monitoring || []).length && completion.finalEvaluation === (report.finalEvaluation || []).length ? ' complete' : ''}`}>
              <Check aria-hidden="true" />
              <span>Hardware {completion.testingChecklist}/{(report.testingChecklist || []).length} · Software {completion.softwareChecklist}/{BURNOUT_SOFTWARE_ITEMS.length} · Monitoring {completion.monitoring}/{(report.monitoring || []).length} · Evaluation {completion.finalEvaluation}/{(report.finalEvaluation || []).length}</span>
            </div>
          </div>
        )}
          </div>

          <div className={`burnout-wizard-navigation${showOptionalDetails ? ' optional-active' : ''}`}>
            {showOptionalDetails ? (
              <button type="button" className="modal-btn print compact" onClick={() => setShowOptionalDetails(false)}>
                <MonoIcon icon={ChevronLeft} />Back to final review
              </button>
            ) : (
              <>
                <button type="button" className="modal-btn print compact" onClick={goPrevious} disabled={activeStep === 0}>
                  <MonoIcon icon={ChevronLeft} />Previous
                </button>
                <button type="button" className="modal-btn print compact" onClick={goNext}>
                  {activeStep === steps.length - 1 ? 'Additional details' : 'Next'}<MonoIcon icon={ChevronRight} />
                </button>
              </>
            )}
          </div>
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
  className = '',
  canSend = true,
  onClose,
  onMessageChange,
  onPhotoChange,
  onPastePhotos,
  onRemovePhoto,
  onSend,
}) {
  const messageListRef = useRef(null);
  const [isPastingImages, setIsPastingImages] = useState(false);
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

  const handleMessagePaste = async (event) => {
    const pastedImages = Array.from(event.clipboardData?.items || [])
      .filter((item) => item.kind === 'file' && item.type?.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter(Boolean);
    if (!pastedImages.length) return;
    event.preventDefault();
    setIsPastingImages(true);
    try {
      await onPastePhotos?.(pastedImages);
    } finally {
      setIsPastingImages(false);
    }
  };

  return (
    <section className={`ticket-conversation-section${floating ? ' floating-ticket-chat' : ''}${className ? ` ${className}` : ''}`}>
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
              'Employee and ICT communication'
            )}
          </h4>
          <p className="ticket-chat-requester">{ticket?.requester || ticket?.ownerEmail || currentUser?.fullName || currentUser?.name || 'Employee'}</p>
        </div>
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
                  <span className="ticket-message-sent-at">{item.createdAt}</span>
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
            <p>No conversation yet. Send a reply if ICT needs more details or screenshots.</p>
          </div>
        )}
      </div>

      <div className={`ticket-message-composer${canSend ? '' : ' locked'}`}>
        <textarea
          className="ticket-field ticket-textarea ticket-message-textarea"
          value={messageDraft}
          onChange={(e) => onMessageChange(e.target.value)}
          onKeyDown={handleMessageKeyDown}
          onPaste={handleMessagePaste}
          placeholder={canSend ? 'Write a reply or update for ICT...' : disabledMessage}
          maxLength={800}
          disabled={!canSend || isSending || isPastingImages}
        />

        {messagePhotos.length > 0 && (
          <div className="message-photo-preview-row">
            {messagePhotos.map((photo) => (
              <button
                key={photo.id || photo.name}
                type="button"
                className="message-photo-preview"
                onClick={() => onRemovePhoto(photo.id)}
                disabled={isSending || isPastingImages}
                title="Remove photo"
              >
                <img src={photo.dataUrl} alt={photo.name} />
                <span><MonoIcon icon={X} /></span>
              </button>
            ))}
          </div>
        )}

        <div className="ticket-message-actions">
          <label className={`message-attach-btn ticket-message-icon-btn${canSend && !isSending && !isPastingImages ? '' : ' disabled'}`} title="Attach photos" aria-label="Attach photos">
            <MonoIcon icon={Paperclip} />
            <input type="file" accept={PHOTO_ACCEPT} multiple onChange={onPhotoChange} disabled={!canSend || isSending || isPastingImages} />
          </label>
          <button type="button" className="modal-btn confirm ticket-message-icon-btn ticket-message-send-btn" onClick={onSend} disabled={isSending || !canSend} title={isSending ? 'Sending reply' : 'Send reply'} aria-label={isSending ? 'Sending reply' : 'Send reply'}>
            <MonoIcon icon={Send} />
          </button>
        </div>

        {!canSend && <div className="ticket-chat-locked-note">{disabledMessage}</div>}
        {messageError && <div className="form-error app-error-alert" role="alert">{messageError}</div>}
      </div>
    </section>
  );
}

function TicketPagination({ page, totalPages, totalItems, pageSize, onPageChange, alwaysShow = false }) {
  if (totalPages <= 1 && !alwaysShow) return null;

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
        <strong aria-label={`Page ${page} of ${totalPages}`}>Page {page}</strong>
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

function TicketQueueSummaryRow({ ticket, onOpenTicket }) {
  const ticketCode = getTicketDisplayCode(ticket);
  const concernType = ticket.concernType || 'Unspecified concern';
  const sla = ticket.sla || 'Low';
  const submittedAt = ticket.createdAt || ticket.date || '';
  const submittedAtLabel = formatTicketQueueDateTime(submittedAt);
  const requester = ticket.requester || ticket.ownerEmail || 'Employee';
  const branch = ticket.branch || 'Unspecified';
  const department = ticket.department || 'No department';

  return (
    <article
      className="ticket-queue-summary-row"
      role="button"
      tabIndex={0}
      aria-label={`View ticket ${ticketCode}: ${concernType}. SLA ${sla}. Submitted ${submittedAtLabel}. Requester ${requester}, branch ${branch}, department ${department}.`}
      onClick={() => onOpenTicket(ticket)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpenTicket(ticket);
        }
      }}
    >
      <div className="ticket-queue-summary-primary">
        <div className="ticket-queue-summary-identity">
          <span className="ticket-id ticket-queue-summary-id">{ticketCode}</span>
          <span className={`priority ticket-queue-summary-sla ${slugify(sla)}`} title={`SLA: ${sla}`}>
            {sla}
          </span>
        </div>
        <span className="ticket-queue-summary-date" title={formatTicketHandlingTimestamp(submittedAt)}>
          {submittedAtLabel}
        </span>
      </div>

      <div className="ticket-queue-summary-problem">
        <strong className="ticket-queue-summary-concern" title={concernType}>{concernType}</strong>
      </div>

      <div className="ticket-queue-summary-details">
        <span className="ticket-queue-summary-detail" title={`Requester: ${requester}`}>
          <strong>Requester:</strong>
          <span>{requester}</span>
        </span>
        <span className="ticket-queue-summary-detail" title={`Branch: ${branch}`}>
          <strong>Branch:</strong>
          <span>{branch}</span>
        </span>
        <span className="ticket-queue-summary-detail" title={`Department: ${department}`}>
          <strong>Department:</strong>
          <span>{department}</span>
        </span>
      </div>
    </article>
  );
}

function TicketTable({
  tickets,
  onOpenTicket,
  compact = false,
  queueSummary = false,
  renderPagination = true,
  emptyTitle = 'No tickets found',
  emptyDescription = 'New employee requests will appear here once submitted.',
  now,
  pagination = null,
  renderExtraActions = null,
}) {
  const visibleTickets = pagination ? pagination.tickets : tickets;

  return (
    <div className={`admin-ticket-queue${compact ? ' compact' : ''}${queueSummary ? ' queue-summary' : ''}`}>
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
              queueSummary ? (
                <TicketQueueSummaryRow key={ticket.id} ticket={ticket} onOpenTicket={onOpenTicket} />
              ) : (
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

                <div className="admin-ticket-status-row">
                  <TicketHandlingIndicator ticket={ticket} now={now} compact />
                  <TicketWorkTimer ticket={ticket} now={now} compact />
                </div>

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
                    value={getVisibleTicketDescription(ticket.description) || 'No description provided.'}
                  />
                )}

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
              )
            ))}
          </div>

          {pagination && renderPagination && (
            <TicketPagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              pageSize={pagination.pageSize}
              onPageChange={pagination.onPageChange}
              alwaysShow={pagination.alwaysShow}
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

function BreakdownList({ title, kicker, items, className = '', onSelect, selectedValue = '' }) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  return (
    <section className={`panel-card glass equal-panel ${className}`.trim()}>
      <div className="section-head">
        <div>
          <span className="section-kicker">{kicker}</span>
          <h3>{title}</h3>
        </div>
      </div>

      {onSelect ? (
        <div className="report-breakdown-rows">
          {items.length ? items.map((item) => (
            <button
              type="button"
              key={item.name}
              className={`report-breakdown-row${selectedValue === item.name ? ' selected' : ''}`}
              onClick={() => onSelect(selectedValue === item.name ? '' : item.name)}
              aria-pressed={selectedValue === item.name}
              title={`Show ${item.count} tickets with ${item.name} ${title.toLowerCase()}`}
            >
              <span className="report-breakdown-name">{item.name}</span>
              <span className="report-breakdown-value">{item.count}</span>
              <span className="report-breakdown-percent">{total ? `${Math.round((item.count / total) * 100)}%` : '0%'}</span>
            </button>
          )) : <p className="report-empty-inline">No matching tickets.</p>}
        </div>
      ) : <BreakdownItems items={items} />}
    </section>
  );
}

function WorkloadAvatar({ name, profilePhoto }) {
  const [failedPhoto, setFailedPhoto] = useState('');
  const normalizedName = normalizeComparable(name);
  const avatarPhoto = profilePhoto || (
    ['unassigned', 'third party company'].includes(normalizedName)
      ? '/images/unassigned-avatar.jpg'
      : ''
  );
  return (
    <span className="admin-workload-avatar" aria-hidden="true">
      {avatarPhoto && failedPhoto !== avatarPhoto ? (
        <img src={avatarPhoto} alt="" onError={() => setFailedPhoto(avatarPhoto)} />
      ) : getInitials(name)}
    </span>
  );
}

function AdminWorkloadPanel({ tickets, users = [] }) {
  const activeStaffCount = users.filter((user) => isAdminRole(user.role) && !isInactivePortalUser(user)).length;
  const workloadItems = useMemo(() => {
    const activeIctUsers = users.filter((user) => isAdminRole(user.role) && !isInactivePortalUser(user));
    const usersById = new Map(activeIctUsers.map((user) => [user.id, user]));
    const usersByName = new Map(activeIctUsers.map((user) => [normalizeComparable(user.name), user]));
    const groups = new Map();

    activeIctUsers.forEach((user) => {
      groups.set(`profile:${user.id}`, { name: user.name, profilePhoto: user.profilePhoto || '', tickets: [] });
    });

    tickets.forEach((ticket) => {
      const name = getReportTechnicianName(ticket.technician);
      const profile = usersById.get(ticket.technicianId) || usersByName.get(normalizeComparable(name));
      const key = profile?.id ? `profile:${profile.id}` : name ? `legacy:${normalizeComparable(name)}` : 'unassigned';
      const group = groups.get(key) || { name: profile?.name || name || 'Unassigned', profilePhoto: profile?.profilePhoto || '', tickets: [] };
      group.tickets.push(ticket);
      groups.set(key, group);
    });

    return [...groups.values()]
      .map(({ name, profilePhoto, tickets: assignedTickets }) => {
        const active = assignedTickets.filter((ticket) => isUnresolved(ticket.status)).length;
        const urgent = assignedTickets.filter(isSlaWatchTicket).length;
        const resolved = assignedTickets.filter(isTicketResolved).length;

        return {
          name,
          profilePhoto,
          total: assignedTickets.length,
          active,
          urgent,
          resolved,
        };
      })
      .sort((a, b) =>
        b.active - a.active ||
        (normalizeComparable(a.name) === 'unassigned' ? (a.active > 0 ? -1 : 1) : 0) -
          (normalizeComparable(b.name) === 'unassigned' ? (b.active > 0 ? -1 : 1) : 0) ||
        b.urgent - a.urgent ||
        b.total - a.total ||
        a.name.localeCompare(b.name)
      );
  }, [tickets, users]);
  return (
    <section className="panel-card glass equal-panel admin-workload-panel">
      <div className="section-head admin-workload-head">
        <div>
          <span className="section-kicker">Reports</span>
          <h3>Technician workload</h3>
        </div>
        <span className="admin-workload-count">{activeStaffCount} active staff</span>
      </div>

      <div className="admin-workload-list">
        {workloadItems.map((item) => {
          const isClear = item.active === 0;
          const hasUrgent = item.urgent > 0;

          return (
            <article
              key={item.name}
              className={`admin-workload-card${hasUrgent ? ' has-urgent' : ''}${isClear ? ' is-clear' : ''}`}
            >
              <div className="admin-workload-person">
                <WorkloadAvatar name={item.name} profilePhoto={item.profilePhoto} />
                <div className="admin-workload-person-copy">
                  <strong title={item.name}>{item.name}</strong>
                  <p>{hasUrgent ? `${item.urgent} high / critical open` : isClear ? 'No open tickets' : `${item.active} open tickets`}</p>
                </div>
              </div>

              <div className="admin-workload-stats">
                <div>
                  <em>Open</em>
                  <b>{item.active}</b>
                </div>
                <div>
                  <em>High / Critical</em>
                  <b>{item.urgent}</b>
                </div>
                <div>
                  <em>Resolved</em>
                  <b>{item.resolved}</b>
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
      <span className="report-metric-label">{label}</span>
      <strong>{value}</strong>
      <em className="report-metric-meta">{meta}</em>
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
    : 'No submissions';
  const selectedDateLabel = selectedDateKey
    ? formatReportDate(new Date(`${selectedDateKey}T00:00:00`), { month: 'long', day: 'numeric', year: 'numeric' })
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
            <span className="section-kicker"><MonoIcon icon={CalendarDays} /> Ticket Submission Calendar</span>
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
              aria-label={`${cell.key}: ${cell.count} ticket${cell.count === 1 ? '' : 's'} submitted`}
            >
              <span>{cell.day}</span>
              {cell.count > 0 && <strong>{cell.count}</strong>}
            </button>
          ))}
        </div>
      </div>

      <aside className="panel-card glass report-calendar-insights">
        <span className="section-kicker">Month Pulse</span>
        <h3>{calendar.monthTotal} tickets submitted</h3>
        <p className="report-month-pulse-note">Counts are based on each ticket’s submission date.</p>

        <div className="report-insight-list">
          <div className="report-insight-item primary">
            <span>Busiest Submission Day</span>
            <strong>{busiestLabel}</strong>
            <em>{calendar.busiestDay.count} ticket{calendar.busiestDay.count === 1 ? '' : 's'} submitted</em>
          </div>
          <div className="report-insight-item">
            <span>Days with Submissions</span>
            <strong>{calendar.activeDays}</strong>
            <em>days with at least one ticket</em>
          </div>
          <div className="report-insight-item">
            <span>Average per Submission Day</span>
            <strong>{calendar.averagePerActiveDay}</strong>
            <em>tickets submitted on those days</em>
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

function DashboardView({ tickets, summary, categorySummary, onGoTo, onOpenTicket, onRefresh, now }) {
  const [queuePage, setQueuePage] = useState(1);
  const [urgentWatchIndex, setUrgentWatchIndex] = useState(0);
  const [movedDateWatchIndex, setMovedDateWatchIndex] = useState(0);
  const waitingTickets = useMemo(() => {
    const eligibleTickets = tickets.filter((ticket) => isHelpdeskQueueEligible(ticket, now));

    // Critical, then High SLA tickets are escalated; remaining tickets stay FIFO.
    return sortTicketQueueFirstComeFirstServed(eligibleTickets);
  }, [tickets, now]);
  const totalQueuePages = Math.max(1, Math.ceil(waitingTickets.length / DASHBOARD_QUEUE_PAGE_SIZE));
  const currentQueuePage = Math.min(queuePage, totalQueuePages);
  const pagedWaitingTickets = waitingTickets.slice(
    (currentQueuePage - 1) * DASHBOARD_QUEUE_PAGE_SIZE,
    currentQueuePage * DASHBOARD_QUEUE_PAGE_SIZE
  );
  const urgentTickets = tickets
    .filter(isSlaWatchTicket)
    .sort((a, b) => getSlaRank(a.sla) - getSlaRank(b.sla) || compareTicketSubmissionOrder(a, b))
    .slice(0, 3);
  const movedDateTickets = tickets
    .filter(isMovedDateTicket)
    .sort(compareTicketSubmissionOrder)
    .slice(0, 3);

  useEffect(() => {
    setQueuePage((page) => Math.min(page, totalQueuePages));
  }, [totalQueuePages]);

  // A newly submitted ticket belongs on the first page immediately.
  useEffect(() => {
    setQueuePage(1);
  }, [tickets.length]);

  useEffect(() => {
    setUrgentWatchIndex((index) => Math.min(index, Math.max(urgentTickets.length - 1, 0)));
  }, [urgentTickets.length]);

  useEffect(() => {
    setMovedDateWatchIndex((index) => Math.min(index, Math.max(movedDateTickets.length - 1, 0)));
  }, [movedDateTickets.length]);

  return (
    <div className="dashboard-view">
      <section className="panel-card glass hero-panel admin-hero-panel">
        <div className="hero-copy">
          <span className="section-kicker">Admin Dashboard</span>
          <h2>Helpdesk overview</h2>
          <p>Review incoming requests, monitor priority work, and keep ICT support moving.</p>
        </div>
      </section>

      <section className="stats-grid" aria-label="Admin statistics">
        <StatCard icon={FileText} label="Total Tickets" value={summary.total} meta="All received concerns" />
        <StatCard icon={Clock3} label="New / Modified" value={summary.created + summary.modified} meta="Needs admin review" />
        <StatCard icon={Wrench} label="In Progress" value={summary.inProgress} meta="Currently handled" />
        <StatCard icon={ShieldCheck} label="High / Critical" value={summary.critical} meta="Needs immediate attention" />
      </section>

      <div className="dashboard-columns equal-columns dashboard-ticket-columns">
        <div className="dashboard-stack">
          <section className="panel-card glass equal-panel ticket-queue-panel">
            <div className="section-head">
              <div>
                <span className="section-kicker">Ticket Queue</span>
                <h3>Employee Concerns</h3>
              </div>
              <button type="button" className="quick-action-btn" onClick={onRefresh}>
                <MonoIcon icon={RotateCcw} />
                Refresh
              </button>
            </div>

            <TicketTable
              tickets={waitingTickets}
              onOpenTicket={onOpenTicket}
              queueSummary
              renderPagination={false}
              emptyTitle="No new tickets waiting"
              emptyDescription="New unassigned tickets appear here; Burnout requests also appear in Burnout Reports for continued tracking."
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

          {waitingTickets.length > 0 && (
            <div className="ticket-queue-pagination-outside">
              <TicketPagination
                page={currentQueuePage}
                totalPages={totalQueuePages}
                totalItems={waitingTickets.length}
                pageSize={DASHBOARD_QUEUE_PAGE_SIZE}
                onPageChange={setQueuePage}
                alwaysShow
              />
            </div>
          )}
        </div>

        <div className="dashboard-stack">
          <section className="panel-card glass equal-panel dashboard-watch-panel">
            <div className="section-head">
              <div>
                <span className="section-kicker">SLA Watchlist</span>
                <div className="dashboard-watch-heading">
                  <h3>Urgent Concerns</h3>
                  {urgentTickets.length > 0 && (
                    <span
                      className="dashboard-watch-count urgent"
                      aria-label={urgentTickets.length + ' urgent ticket' + (urgentTickets.length === 1 ? '' : 's')}
                      title={urgentTickets.length + ' urgent ticket' + (urgentTickets.length === 1 ? '' : 's')}
                    >
                      {urgentTickets.length}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="admin-watchlist">
              {urgentTickets.length === 0 ? (
                <div className="empty-state small">
                  <h4>No urgent unresolved tickets.</h4>
                  <p>High and critical tickets will appear here automatically.</p>
                </div>
              ) : (
                <DashboardWatchSummary
                  tickets={urgentTickets}
                  type="urgent"
                  now={now}
                  activeIndex={urgentWatchIndex}
                  onChangeIndex={setUrgentWatchIndex}
                  onOpenTicket={onOpenTicket}
                />
              )}
            </div>
          </section>

          <section className="panel-card glass equal-panel dashboard-watch-panel">
            <div className="section-head">
              <div>
                <span className="section-kicker">Moved Date</span>
                <div className="dashboard-watch-heading">
                  <h3>Moved Date Concerns</h3>
                  {movedDateTickets.length > 0 && (
                    <span
                      className="dashboard-watch-count moved"
                      aria-label={movedDateTickets.length + ' moved-date ticket' + (movedDateTickets.length === 1 ? '' : 's')}
                      title={movedDateTickets.length + ' moved-date ticket' + (movedDateTickets.length === 1 ? '' : 's')}
                    >
                      {movedDateTickets.length}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="admin-watchlist">
              {movedDateTickets.length === 0 ? (
                <div className="empty-state small">
                  <h4>No moved-date tickets.</h4>
                  <p>Concerns moved to another date will appear here for follow-up.</p>
                </div>
              ) : (
                <DashboardWatchSummary
                  tickets={movedDateTickets}
                  type="moved"
                  now={now}
                  activeIndex={movedDateWatchIndex}
                  onChangeIndex={setMovedDateWatchIndex}
                  onOpenTicket={onOpenTicket}
                />
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

          <button type="button" className="quick-action-btn filter-clear-btn filter-reset-icon" onClick={clearFilters} aria-label="Clear filters" title="Clear filters">
            <RotateCcw size={17} aria-hidden="true" />
          </button>
        </div>

        <TicketTable
          tickets={filteredTickets}
          onOpenTicket={onOpenTicket}
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

          <button type="button" className="quick-action-btn filter-clear-btn filter-reset-icon" onClick={clearFilters} aria-label="Clear filters" title="Clear filters">
            <RotateCcw size={17} aria-hidden="true" />
          </button>
        </div>

        <TicketTable
          tickets={filteredTickets}
          onOpenTicket={onOpenTicket}
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
        <article className="glass branch-overview-card">
          <div>
            <span>Branch Coverage</span>
            <strong>{activeBranchCount}/{BRANCHES.length}</strong>
            <p>branches with active ICT concerns</p>
          </div>
        </article>

        <article className="glass branch-overview-card">
          <div>
            <span>Unresolved</span>
            <strong>{activeTickets.length}</strong>
            <p>tickets needing admin action</p>
          </div>
        </article>

        <article className="glass branch-overview-card">
          <div>
            <span>Urgent Watch</span>
            <strong>{urgentCount}</strong>
            <p>high or critical SLA items</p>
          </div>
        </article>

        <article className="glass branch-overview-card">
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

                  <div className="admin-ticket-status-row">
                    <TicketHandlingIndicator ticket={ticket} now={now} compact />
                    <TicketWorkTimer ticket={ticket} now={now} compact />
                  </div>

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
                    value={getVisibleTicketDescription(ticket.description) || 'No description provided.'}
                  />

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

function ReportsView({ tickets, users = [], summary, categorySummary, statusSummary, branchSummary, onOpenTicket }) {
  const [periodMode, setPeriodMode] = useState('day');
  const [reportTicketScope, setReportTicketScope] = useState('open');
  const [reportStatusFilter, setReportStatusFilter] = useState('');
  const [reportPriorityFilter, setReportPriorityFilter] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(null);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState('');
  const [selectedPrintDayKey, setSelectedPrintDayKey] = useState('');
  const [selectedPrintWeekKey, setSelectedPrintWeekKey] = useState('');
  const [periodPageByMode, setPeriodPageByMode] = useState({ day: 1, week: 1, month: 1 });
  const concernSummary = breakdown(tickets, 'concernType').slice(0, 10);
  const statusActivitySummary = useMemo(
    () => buildReportStatusSummary(tickets),
    [tickets]
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
  const periodRangeStart = selectedPeriodItems.length
    ? (safeSelectedPeriodPage - 1) * REPORT_PERIOD_PAGE_SIZE + 1
    : 0;
  const periodRangeEnd = Math.min(safeSelectedPeriodPage * REPORT_PERIOD_PAGE_SIZE, selectedPeriodItems.length);
  const activeCalendarMonth = calendarMonth || getTicketCalendarMonth(tickets);
  const reportNow = Date.now();
  const reportOverdueCount = tickets.filter((ticket) => getReportSlaState(ticket, reportNow) === 'overdue').length;
  const reportDueSoonCount = tickets.filter((ticket) => getReportSlaState(ticket, reportNow) === 'due-soon').length;
  const submittedThisMonthCount = getMonthlyTicketSubmissionEvents(tickets, activeCalendarMonth).length;
  const reportPriorityOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  const reportPriorityItems = breakdown(tickets, 'sla', SLA_LEVELS).sort((a, b) => (reportPriorityOrder[a.name] ?? 4) - (reportPriorityOrder[b.name] ?? 4));
  const reportTicketRows = [...tickets]
    .filter((ticket) => reportTicketScope === 'all' || isUnresolved(ticket.status))
    .filter((ticket) => !reportStatusFilter || getTicketFinalReportStatus(ticket) === reportStatusFilter)
    .filter((ticket) => !reportPriorityFilter || String(ticket.sla || '').toLowerCase() === reportPriorityFilter.toLowerCase())
    .sort((a, b) => compareReportActionability(a, b, reportNow));
  const activeCalendarMonthKey = new Date(
    activeCalendarMonth.getFullYear(),
    activeCalendarMonth.getMonth(),
    1
  ).toISOString();
  const selectedDateTickets = selectedCalendarDate
    ? getMonthlyTicketSubmissionEvents(tickets, activeCalendarMonth)
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
      printMonthlyConsolidatedReport(tickets, activeCalendarMonth, users);
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
      users,
      selectedPeriodKey: selectedPrintOption.key,
      selectedPeriodName: selectedPrintOption.name,
    });
  };
  const handleExportMonthly = () => {
    exportMonthlyConsolidatedReportCsv(tickets, activeCalendarMonth);
  };

  const handleSelectReportPeriod = (item) => {
    if (!item?.key) return;

    if (selectedPeriod.key === 'month') {
      const selectedMonth = monthPrintOptions.find((option) => option.key === item.key);

      if (!selectedMonth) return;

      const nextMonth = new Date(selectedMonth.timestamp);
      nextMonth.setDate(1);
      nextMonth.setHours(0, 0, 0, 0);
      setCalendarMonth(nextMonth);
      setSelectedCalendarDate('');
      return;
    }

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
          <p>Live queue and SLA risk · submissions for {formatReportDate(activeCalendarMonth, { month: 'long', year: 'numeric' })} · updated {new Date(reportNow).toLocaleString()}</p>
        </div>

        <div className="report-toolbar-metrics" aria-label="Report summary">
          <ReportMetric label="Open" value={summary.active} meta="current queue" />
          <ReportMetric label="Overdue" value={reportOverdueCount} meta="response / resolution" />
          <ReportMetric label="Due soon" value={reportDueSoonCount} meta="next 24 hours" />
          <ReportMetric label="Submitted" value={submittedThisMonthCount} meta="selected month" />
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

        <div className="report-period-strip">

          <BreakdownItems
            items={selectedBreakdownItems}
            selectable
            selectedKey={selectedPeriod.key === 'month' ? activeCalendarMonthKey : selectedPrintKey}
            onSelect={handleSelectReportPeriod}
          />

        </div>

        {hasPeriodPages && (
          <nav className="report-period-pager" aria-label={`${selectedPeriod.label} report pages`}>
            <button
              type="button"
              onClick={() => changeReportPeriodPage(-1)}
              disabled={safeSelectedPeriodPage === 1}
              aria-label={`Previous ${selectedPeriod.label.toLowerCase()} reports`}
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <span aria-live="polite">
              <strong>{periodRangeStart}-{periodRangeEnd}</strong>
              <em>of {selectedPeriodItems.length}</em>
            </span>
            <button
              type="button"
              onClick={() => changeReportPeriodPage(1)}
              disabled={safeSelectedPeriodPage === selectedPeriodTotalPages}
              aria-label={`Next ${selectedPeriod.label.toLowerCase()} reports`}
            >
              <ChevronRight aria-hidden="true" />
            </button>
          </nav>
        )}
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
        <AdminWorkloadPanel tickets={tickets} users={users} />
        <BreakdownList
          title="Current status"
          kicker="Exclusive totals"
          items={statusActivitySummary}
          onSelect={(status) => { setReportStatusFilter(status); if (status) setReportTicketScope('all'); }}
          selectedValue={reportStatusFilter}
        />
        <BreakdownList
          title="Priority"
          kicker="Severity"
          items={reportPriorityItems}
          onSelect={setReportPriorityFilter}
          selectedValue={reportPriorityFilter}
        />
        <BreakdownList title="Support Category" kicker="Report" items={categorySummary.slice(0, 6)} />
        <BreakdownList title="Branch" kicker="Report" items={branchSummary.slice(0, 6)} />
        <BreakdownList title="Concern Type" kicker="Report" items={concernSummary.slice(0, 6)} />
      </div>

      <section className="panel-card glass report-ticket-table-card">
        <div className="report-ticket-table-head">
          <div>
            <span className="section-kicker">Action queue</span>
            <h3>Tickets to review <span>{reportTicketRows.length}</span></h3>
            <p>Overdue first, then nearest deadline, priority, and oldest submission.</p>
          </div>
          <div className="report-ticket-scope" role="group" aria-label="Ticket list scope">
            <button type="button" className={reportTicketScope === 'open' ? 'active' : ''} onClick={() => setReportTicketScope('open')}>Open</button>
            <button type="button" className={reportTicketScope === 'all' ? 'active' : ''} onClick={() => setReportTicketScope('all')}>All tickets</button>
            {(reportStatusFilter || reportPriorityFilter) && (
              <button type="button" className="report-clear-filters" onClick={() => { setReportStatusFilter(''); setReportPriorityFilter(''); }}>Clear filters</button>
            )}
          </div>
        </div>
        <div className="report-ticket-table-wrap">
          <table className="report-ticket-table">
            <thead><tr><th>Ticket</th><th>Requester</th><th>Status</th><th>Priority</th><th>Technician</th><th>Age</th><th>SLA deadline</th></tr></thead>
            <tbody>
              {reportTicketRows.length ? reportTicketRows.slice(0, 100).map((ticket) => {
                const deadline = getReportNextDeadline(ticket) || Number.MAX_SAFE_INTEGER;
                const submittedAt = getSubmittedTime(ticket);
                const ageDays = submittedAt ? Math.max(0, Math.floor((reportNow - submittedAt) / (24 * 60 * 60 * 1000))) : null;
                const slaState = getReportSlaState(ticket, reportNow);
                return (
                  <tr key={ticket.id} onClick={() => onOpenTicket?.(ticket)} tabIndex={onOpenTicket ? 0 : undefined} onKeyDown={(event) => { if (onOpenTicket && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onOpenTicket(ticket); } }}>
                    <td><strong>{getTicketDisplayCode(ticket)}</strong></td>
                    <td>{ticket.requester || ticket.ownerEmail || 'Employee'}</td>
                    <td>{getTicketFinalReportStatus(ticket)}</td>
                    <td><span className={`report-priority-pill ${slugify(ticket.sla || 'low')}`}>{ticket.sla || 'Low'}</span></td>
                    <td>{getReportTechnicianName(ticket.technician) || 'Unassigned'}</td>
                    <td>{ageDays === null ? '—' : `${ageDays}d`}</td>
                    <td><span className={`report-deadline-pill ${slaState}`}>{deadline === Number.MAX_SAFE_INTEGER ? 'Not set' : `${slaState === 'overdue' ? 'Overdue · ' : ''}${getReportNextDeadlineInfo(ticket)?.kind} · ${new Date(deadline).toLocaleString()}`}</span></td>
                  </tr>
                );
              }) : <tr><td colSpan="7" className="report-table-empty">No tickets match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
        {reportTicketRows.length > 100 && <p className="report-table-footnote">Showing first 100 of {reportTicketRows.length}. Use the dashboard ticket search for the full queue.</p>}
      </section>
    </div>
  );
}

/* =========================
   USERS VIEW
========================= */

function UsersView({ users, canEditUsers, canDeleteUsers, canEditRoles, currentUserId, onUsersChanged }) {
  const confirmDialog = useConfirmDialog();
  const USERS_PAGE_SIZE = 5;
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordRefreshUser, setPasswordRefreshUser] = useState(null);
  const [refreshedPassword, setRefreshedPassword] = useState(null);
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('All');
  const [userPage, setUserPage] = useState(1);
  useBodyScrollLock(Boolean(editingUser || passwordRefreshUser));

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
    setRefreshedPassword(null);
  };

  const updateEditForm = (field, value) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'role' && value !== 'area_manager_admin' ? { areaId: '' } : {}),
    }));
  };

  const closeEdit = () => {
    setEditingUser(null);
    setEditForm(null);
    setPasswordRefreshUser(null);
    setRefreshedPassword(null);
  };

  const requestPasswordRefresh = () => {
    if (!editingUser) return;
    setPasswordRefreshUser(editingUser);
    setRefreshedPassword(null);
  };

  const confirmPasswordRefresh = async () => {
    if (!passwordRefreshUser) return;

    setIsSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const temporaryPassword = await refreshPortalUserPassword(passwordRefreshUser.id);
      setRefreshedPassword({
        password: temporaryPassword,
        accountName: passwordRefreshUser.name || passwordRefreshUser.email,
      });
      setPasswordRefreshUser(null);
      setMessage({
        type: 'success',
        text: 'Temporary password refreshed. Share it securely with the user.',
      });
      await onUsersChanged();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Unable to refresh password.',
      });
    } finally {
      setIsSubmitting(false);
    }
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

      if (roleChanged && !canEditRoles) {
        throw new Error('Only the super admin can change portal roles.');
      }

      const privilegedRoleChange =
        roleChanged && (isPrivilegedPortalRole(editingUser.role) || isPrivilegedPortalRole(editForm.role));
      let confirmPrivilegedRoleChange = false;

      if (privilegedRoleChange) {
        confirmPrivilegedRoleChange = await confirmDialog({
          title: 'Confirm privileged role change?',
          message: `${editingUser.name || editingUser.email} will change from ${formatRoleLabel(editingUser.role)} to ${formatRoleLabel(editForm.role)}.`,
          confirmLabel: 'Confirm role change',
          variant: 'danger',
        });

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
    if (!canDeleteUsers) {
      setMessage({
        type: 'error',
        text: 'Only the super admin can delete accounts.',
      });
      return;
    }

    if (user.id === currentUserId) {
      setMessage({
        type: 'error',
        text: 'You cannot delete your own superadmin account.',
      });
      return;
    }

    const confirmed = await confirmDialog({
      title: 'Delete portal account?',
      message: `The account for ${user.name || user.email} will be permanently removed.`,
      confirmLabel: 'Delete account',
      variant: 'danger',
      warning: 'This action cannot be undone.',
    });

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
          <div className={`admin-alert users-alert ${message.type}${message.type === 'error' ? ' app-error-alert' : ''}`} role={message.type === 'error' ? 'alert' : 'status'}>
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
                  className={canEditUsers ? 'user-clickable-row' : undefined}
                  tabIndex={canEditUsers ? 0 : undefined}
                  role={canEditUsers ? 'button' : undefined}
                  aria-label={canEditUsers ? `View account for ${user.name || user.email}` : undefined}
                  onClick={canEditUsers ? () => beginEdit(user) : undefined}
                  onKeyDown={
                    canEditUsers
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

          <div className="users-pagination ticket-pagination" aria-label="User account pagination">
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
              <strong aria-label={`Page ${safeUserPage} of ${userTotalPages}`}>Page {safeUserPage}</strong>
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
      </section>

      {editingUser && editForm && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Edit user account">
          <form className="modal-box glass admin-modal-box user-edit-modal user-detail-drawer portal-user-edit-modal" onSubmit={handleEditSubmit}>
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
                  <span className="user-avatar" aria-label={`${editingUser.name || 'User'} profile photo`}>
                    <span>{editingUser.initials || 'ME'}</span>
                    {editingUser.profilePhoto && (
                      <img
                        src={editingUser.profilePhoto}
                        alt=""
                        aria-hidden="true"
                        onError={(event) => { event.currentTarget.hidden = true; }}
                      />
                    )}
                  </span>
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
                  placeholder="09** *** ****"
                  title="Use format 09** *** ****."
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
                  disabled={!canEditRoles || editForm.id === currentUserId}
                  required
                >
                  {Object.entries(ROLE_LABELS).map(([role, label]) => (
                    <option key={role} value={role}>{label}</option>
                  ))}
                </select>
              </div>

              {editForm.role === 'area_manager_admin' && (
                <div className="ticket-form-group">
                  <label htmlFor="edit-area">Area Manager Jurisdiction</label>
                  <select
                    id="edit-area"
                    className="ticket-field ticket-select"
                    required
                    value={editForm.areaId}
                    onChange={(e) => updateEditForm('areaId', e.target.value)}
                  >
                    <option value="" disabled>Select area</option>
                    {AREA_OPTIONS.map((area) => <option key={area.id} value={area.id}>{area.label}</option>)}
                  </select>
                </div>
              )}

              <div className="ticket-form-group password-refresh-field">
                <span className="field-label-row">Password Access</span>
                <div className="password-refresh-card">
                  <div>
                    <strong>Refresh Password</strong>
                    <p>Issue a new temporary password and require this user to change it on next login.</p>
                  </div>
                  <button
                    type="button"
                    className="modal-btn danger"
                    onClick={requestPasswordRefresh}
                    disabled={isSubmitting || editForm.id === currentUserId}
                  >
                    Refresh Password
                  </button>
                </div>
              </div>

            </div>
              </div>
            </div>

            <TemporaryPasswordPanel
              password={refreshedPassword?.password}
              accountName={refreshedPassword?.accountName}
              onDismiss={() => setRefreshedPassword(null)}
            />

            <div className="modal-footer">
              {canDeleteUsers && (
                <button
                  type="button"
                  className="modal-btn danger"
                  onClick={() => handleDelete(editingUser)}
                  disabled={isSubmitting || editingUser.id === currentUserId}
                >
                  Delete Account
                </button>
              )}
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

      {passwordRefreshUser && (
        <div className="modal-overlay password-refresh-overlay" role="dialog" aria-modal="true" aria-label="Confirm password refresh">
          <section className="modal-box glass password-refresh-confirm">
            <div className="admin-modal-head">
              <div>
                <span className="section-kicker">Refresh Password</span>
                <h3>Replace current password?</h3>
                <p>{passwordRefreshUser.name || passwordRefreshUser.email}</p>
              </div>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setPasswordRefreshUser(null)}
                aria-label="Cancel password refresh"
                disabled={isSubmitting}
              >
                &times;
              </button>
            </div>

            <div className="password-refresh-warning">
              <p>
                This will replace the user's current password with a new temporary password.
                The user must change that temporary password on next login before accessing the portal.
              </p>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="modal-btn cancel"
                onClick={() => setPasswordRefreshUser(null)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="modal-btn danger"
                onClick={confirmPasswordRefresh}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Refreshing...' : 'Confirm Refresh'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function CreateUserView({ users = [], onCreated }) {
  const [form, setForm] = useState(emptyCreateUserForm);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdPassword, setCreatedPassword] = useState(null);

  const duplicateEmail = normalizeComparable(form.email)
    ? users.find((user) => normalizeComparable(user.email) === normalizeComparable(form.email))
    : null;
  const duplicateEmployeeId = normalizeComparable(form.employeeId)
    ? users.find((user) => normalizeComparable(user.employeeId) === normalizeComparable(form.employeeId))
    : null;

  const updateForm = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'role' && value !== 'area_manager_admin' ? { areaId: '' } : {}),
    }));
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

      const result = await createPortalUser(form);
      setForm(emptyCreateUserForm);
      setCreatedPassword({
        password: result.temporaryPassword,
        accountName: result.profile?.full_name || form.name,
      });
      setMessage({
        type: 'success',
        text: 'Account created. Copy the temporary password before leaving this page.',
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
    <div className="dashboard-view create-user-view portal-account-entry-view">
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
            <div className={`admin-alert ${message.type}${message.type === 'error' ? ' app-error-alert' : ''}`} role={message.type === 'error' ? 'alert' : 'status'}>
              {message.text}
            </div>
          )}

          {(duplicateEmail || duplicateEmployeeId) && (
            <div className="admin-alert warning">
              {duplicateEmail && `Email already belongs to ${duplicateEmail.name || duplicateEmail.email}. `}
              {duplicateEmployeeId && `Employee ID already belongs to ${duplicateEmployeeId.name || duplicateEmployeeId.email}.`}
            </div>
          )}

          <TemporaryPasswordPanel
            password={createdPassword?.password}
            accountName={createdPassword?.accountName}
            onDismiss={() => setCreatedPassword(null)}
          />

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
                placeholder="09** *** ****"
                title="Use format 09** *** ****."
              />
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
          {form.role === 'area_manager_admin' && (
            <div className="ticket-form-group">
              <label htmlFor="create-area">Area Manager Jurisdiction</label>
              <select
                id="create-area"
                className="ticket-field ticket-select"
                required
                value={form.areaId}
                onChange={(e) => updateForm('areaId', e.target.value)}
              >
                <option value="" disabled>Select area</option>
                {AREA_OPTIONS.map((area) => <option key={area.id} value={area.id}>{area.label}</option>)}
              </select>
            </div>
          )}
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

const getEmptyAdminTicketForm = () => ({
  submittedForUserId: '',
  branch: '',
  department: '',
  supportCategory: '',
  concernType: '',
  deviceName: '',
  contactNumber: '',
  description: '',
});

const isIctRequester = (user = {}) => {
  const role = normalizePortalRole(user.role);
  const department = normalizeComparable(user.department);

  return role === 'admin' || role === 'superadmin' || department === 'ict';
};

function CreateIctTicketView({ admin, users = [], onCreated }) {
  const [form, setForm] = useState(getEmptyAdminTicketForm);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const requesterOptions = users.filter((user) => isIctRequester(user) && !isInactivePortalUser(user));
  const selectedRequester = requesterOptions.find((user) => user.id === form.submittedForUserId) || null;
  const supportCategories = form.deviceName ? getAdminSupportCategoriesForDevice(form.deviceName) : [];
  const concernOptions = form.supportCategory
    ? getAdminConcernOptionsForSelection(form.supportCategory, form.deviceName)
    : [];
  const derivedImpact = useMemo(
    () => deriveTicketImpact(form),
    [form.supportCategory, form.concernType, form.deviceName]
  );

  const updateForm = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };

      if (field === 'submittedForUserId') {
        const requester = requesterOptions.find((user) => user.id === value);
        next.branch = requester?.branch || requester?.office || '';
        next.department = requester?.department || 'ICT';
        next.contactNumber = requester?.phone || '';
      }

      if (field === 'deviceName') {
        const nextCategories = value ? getAdminSupportCategoriesForDevice(value) : [];
        const categoryIsValid = nextCategories.includes(prev.supportCategory);
        next.supportCategory = categoryIsValid
          ? prev.supportCategory
          : nextCategories.length === 1
            ? nextCategories[0]
            : '';
        const nextConcerns = next.supportCategory
          ? getAdminConcernOptionsForSelection(next.supportCategory, value)
          : [];
        next.concernType = nextConcerns.includes(prev.concernType) ? prev.concernType : '';
      }

      if (field === 'supportCategory' && value !== prev.supportCategory) {
        const nextConcerns = getAdminConcernOptionsForSelection(value, next.deviceName);
        next.concernType = nextConcerns.includes(prev.concernType) ? prev.concernType : '';
      }

      return next;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      if (!selectedRequester) {
        throw new Error('Select the ICT staff account this ticket is for.');
      }

      const payload = {
        ...form,
        submittedForUserId: selectedRequester.id,
        branch: form.branch || selectedRequester.branch || selectedRequester.office || '',
        department: form.department || selectedRequester.department || 'ICT',
        contactNumber: form.contactNumber || selectedRequester.phone || '',
        description: form.description.trim(),
        impact: derivedImpact.impact,
        sla: derivedImpact.sla,
        priority: derivedImpact.priority,
      };

      await createTicket({ user: admin, form: payload });
      setForm(getEmptyAdminTicketForm());
      setMessage({
        type: 'success',
        text: `Ticket created for ${selectedRequester.name || selectedRequester.email}. It is now visible in the helpdesk queue.`,
      });
      await onCreated();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Unable to create ICT ticket.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dashboard-view ict-ticket-submission-view portal-account-entry-view">
      <section className="panel-card glass hero-panel">
        <div className="hero-copy">
          <span className="section-kicker">ICT Ticket Submission</span>
          <h2>Record support concerns for ICT staff.</h2>
          <p>Super Admin can file a ticket for ICT personnel so every concern follows the same queue and report trail.</p>
        </div>

        <div className="hero-meta">
          <span className="meta-pill">Super Admin Only</span>
        </div>
      </section>

      <section className="panel-card glass admin-account-panel">
        <form className="admin-account-form" onSubmit={handleSubmit}>
          <div className="admin-form-head">
            <div>
              <span className="section-kicker">Ticket Details</span>
              <h3>Requester with concern</h3>
              <p>Select the ICT staff member who needs support. This does not assign the ticket to that staff member.</p>
            </div>
          </div>

          {message.text && (
            <div className={`admin-alert ${message.type}${message.type === 'error' ? ' app-error-alert' : ''}`} role={message.type === 'error' ? 'alert' : 'status'}>
              {message.text}
            </div>
          )}

          <div className="ticket-form-grid">
            <div className="ticket-form-group full">
              <label htmlFor="ict-ticket-requester">ICT Staff With Concern</label>
              <select
                id="ict-ticket-requester"
                className="ticket-field ticket-select"
                required
                value={form.submittedForUserId}
                onChange={(event) => updateForm('submittedForUserId', event.target.value)}
              >
                <option value="" disabled>Select the requester account</option>
                {requesterOptions.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.email} - {user.department || 'No department'} - {user.branch || user.office || 'No branch'}
                  </option>
                ))}
              </select>
              <span className="ticket-form-hint">Choose the ICT staff member who has the concern. The assigned technician stays unassigned until someone starts handling the ticket.</span>
            </div>

            {selectedRequester && (
              <div className="ticket-form-group full admin-selected-requester-card">
                <span>Selected requester</span>
                <strong>{selectedRequester.name || selectedRequester.email}</strong>
                <p>
                  {selectedRequester.employeeId || 'No ID'} - {selectedRequester.department || 'No department'} - {selectedRequester.branch || selectedRequester.office || 'No branch'}
                </p>
              </div>
            )}

            <div className="ticket-form-group">
              <label htmlFor="ict-ticket-branch">Branch / Location</label>
              <select
                id="ict-ticket-branch"
                className="ticket-field ticket-select"
                required
                value={form.branch}
                onChange={(event) => updateForm('branch', event.target.value)}
              >
                <option value="" disabled>Select branch or office</option>
                {BRANCHES.map((branch) => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </select>
              <span className="ticket-form-hint">Select the branch or office where the concern happened.</span>
            </div>

            <div className="ticket-form-group">
              <label htmlFor="ict-ticket-department">Department</label>
              <select
                id="ict-ticket-department"
                className="ticket-field ticket-select"
                required
                value={form.department}
                onChange={(event) => updateForm('department', event.target.value)}
              >
                <option value="" disabled>Select department</option>
                {DEPARTMENTS.map((department) => (
                  <option key={department} value={department}>{department}</option>
                ))}
              </select>
              <span className="ticket-form-hint">Select the requester department or the department affected by the concern.</span>
            </div>

            <div className="ticket-form-group">
              <label htmlFor="ict-ticket-device">Device or System</label>
              <select
                id="ict-ticket-device"
                className="ticket-field ticket-select"
                required
                value={form.deviceName}
                onChange={(event) => updateForm('deviceName', event.target.value)}
              >
                <option value="" disabled>Select the affected device or system</option>
                {DEVICE_OPTIONS.map((device) => (
                  <option key={device} value={device}>{device}</option>
                ))}
              </select>
              <span className="ticket-form-hint">Choose the device, application, or system involved.</span>
            </div>

            <div className="ticket-form-group">
              <label htmlFor="ict-ticket-contact">Contact Number / Local</label>
              <input
                id="ict-ticket-contact"
                className="ticket-field ticket-input"
                type="tel"
                required
                value={form.contactNumber}
                onChange={(event) => updateForm('contactNumber', formatPhoneNumber(event.target.value))}
                placeholder="09** *** ****"
              />
              <span className="ticket-form-hint">Provide a number where ICT can contact the requester if more details are needed.</span>
            </div>

            <div className="ticket-form-group">
              <label htmlFor="ict-ticket-category">Support Category</label>
              <select
                id="ict-ticket-category"
                className="ticket-field ticket-select"
                required
                disabled={!form.deviceName}
                value={form.supportCategory}
                onChange={(event) => updateForm('supportCategory', event.target.value)}
              >
                <option value="" disabled>
                  {form.deviceName ? 'Select support category' : 'Select device or system first'}
                </option>
                {supportCategories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              <span className="ticket-form-hint">
                {form.deviceName ? 'Select the type of ICT support needed.' : 'Select a device or system first.'}
              </span>
            </div>

            <div className="ticket-form-group">
              <label htmlFor="ict-ticket-concern">Concern Type</label>
              <select
                id="ict-ticket-concern"
                className="ticket-field ticket-select"
                required
                disabled={!form.supportCategory}
                value={form.concernType}
                onChange={(event) => updateForm('concernType', event.target.value)}
              >
                <option value="" disabled>
                  {form.supportCategory ? 'Select concern type' : 'Select support category first'}
                </option>
                {concernOptions.map((concern) => (
                  <option key={concern} value={concern}>{concern}</option>
                ))}
              </select>
              <span className="ticket-form-hint">
                {form.supportCategory ? 'Choose the closest concern type for this request.' : 'Select a support category first to show concern types.'}
              </span>
            </div>

            <div className="ticket-form-group full">
              <label htmlFor="ict-ticket-description">Issue Description</label>
              <textarea
                id="ict-ticket-description"
                className="ticket-field ticket-textarea"
                required
                value={form.description}
                onChange={(event) => updateForm('description', event.target.value)}
                placeholder="Briefly describe what happened and what support is needed."
              />
            </div>
          </div>

          <div className="admin-form-actions">
            <button type="submit" className="modal-btn confirm" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting Ticket...' : 'Submit Ticket'}
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

function TicketActionModal({ ticket, currentUser, users = [], onClose, onSave, onDelete, onReopen, canDelete, now, onTicketRealtimeUpdate }) {
  useBodyScrollLock(true);

  const hasWorkStarted = Boolean(getTicketWorkStartedAt(ticket));
  const isBurnout = isBurnoutTicket(ticket);
  const isResolvedLocked = isClosed(ticket.status);
  const canReopen = normalizePortalRole(currentUser?.role) === 'superadmin' && isResolvedLocked;
  const isStartMode = !isBurnout && !hasWorkStarted && !isResolvedLocked && !isMovedDateTicket(ticket);
  const burnoutWorkflowStatus = isBurnout ? getBurnoutWorkflowStatus(ticket.status) : '';
  const statusOptions = isStartMode ? ['In Progress'] : availableStatuses(ticket);
  const savedVersionRef = useRef(ticket.version);
  const submittingRef = useRef(false);
  const [isSubmitting,setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [ticketMessages, setTicketMessages] = useState([]);
  const [messageDraft, setMessageDraft] = useState('');
  const [messagePhotos, setMessagePhotos] = useState([]);
  const [messageError, setMessageError] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const pendingMessageIdRef = useRef('');
  const [isChatMinimized, setIsChatMinimized] = useState(true);
  const [unreadConversationCount, setUnreadConversationCount] = useState(0);
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const isChatMinimizedRef = useRef(true);
  const currentUserIdRef = useRef(currentUser?.id || '');
  const ticketMessageIdsRef = useRef(new Set());

  const currentStaffName = currentUser?.name || 'Unassigned';
  const technicianProfiles = users.filter((user) => isAdminRole(user.role) && !isInactivePortalUser(user));
  if (isAdminRole(currentUser?.role) && !isInactivePortalUser(currentUser) && !technicianProfiles.some((user) => user.id === currentUser.id)) {
    technicianProfiles.push(currentUser);
  }
  const initialTechnicianProfile = technicianProfiles.find((user) => user.id === ticket.technicianId)
    || (!hasAssignedTechnician(ticket) ? technicianProfiles.find((user) => user.id === currentUser?.id) : null);
  const assignedStaff = ticket.technician && ticket.technician !== 'Unassigned'
    ? ticket.technician
    : initialTechnicianProfile?.name || currentStaffName;
  const [draft, setDraft] = useState({
    status: isBurnout && ['Created','Submitted'].includes(ticket.status) ? 'For Inspection' : isStartMode ? 'In Progress' : ticket.status || 'Pending',
    sla: ticket.sla || 'Low',
    technician: assignedStaff,
    technicianId: ticket.technicianId || initialTechnicianProfile?.id || '',
    actionTaken: ticket.actionTaken || '',
    adminRemarks: ticket.adminRemarks || '',
    resolution: ticket.resolution || '',
    recommendation: ticket.recommendation || '',
    burnoutReport: isBurnout ? normalizeBurnoutReport(ticket, currentUser) : null,
    nextActionAt: ticket.nextActionAt ? new Date(new Date(ticket.nextActionAt).getTime()-new Date(ticket.nextActionAt).getTimezoneOffset()*60000).toISOString().slice(0,16) : '',
    escalationPartner: ticket.escalationPartner || '',
    escalationPartnerCompany: ticket.escalationPartnerCompany || '',
    actionReason: ticket.actionReason || '',
    reopenReason: '',
  });
  const [autosaveState, setAutosaveState] = useState({ status: 'idle', message: '' });
  const autosaveTimeoutRef = useRef(null);
  const lastAutosavedNotesRef = useRef(
    JSON.stringify({
      actionTaken: ticket.actionTaken || '',
      adminRemarks: ticket.adminRemarks || '',
      resolution: ticket.resolution || '',
      recommendation: ticket.recommendation || '',
    })
  );
  const latestDraftRef = useRef(draft);
  const autosaveInFlightRef = useRef(null);
  const normalizedDraftStatus = normalizeTicketStatus(draft.status);
  const isEscalationStatus = normalizedDraftStatus === 'escalated';
  const isWaitingStatus = ['waiting for requester', 'waiting for vendor', 'waiting for approval'].includes(normalizedDraftStatus);
  const isExpandedWorkflowStatus = ['escalated', 'moved date'].includes(normalizedDraftStatus) || isWaitingStatus;
  const draftTechnicianIsAssigned = hasAssignedTechnician({ technician: draft.technician });
  const technicianProfileIsAvailable = technicianProfiles.some((user) => user.id === draft.technicianId);
  const visibleTechnicianId = technicianProfileIsAvailable
    ? draft.technicianId
    : draftTechnicianIsAssigned ? '__legacy__' : '__unassigned__';
  const canEditOutcomeFields = !isResolvedLocked;
  const lockedOutcomePlaceholder = isBurnout
    ? 'Available while the Burnout record is still active.'
    : 'Available once the ticket is updated away from In Progress.';
  const canSendConversationMessage = canTicketAcceptMessages(ticket);
  const shouldShowConversation = isTicketBeingHandled(ticket) || ticketMessages.length > 0;
  const isChatOpen = shouldShowConversation && !isChatMinimized;

  useEffect(() => {
    latestDraftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    isChatMinimizedRef.current = isChatMinimized;

    if (!isChatMinimized) {
      setUnreadConversationCount(0);
    }
  }, [isChatMinimized]);

  useEffect(() => {
    currentUserIdRef.current = currentUser?.id || '';
  }, [currentUser?.id]);

  useEffect(()=>{
    let cancelled=false;
    const renew=async()=>{
      try {
        const renewed=await claimTicketLock(ticket.id,currentUser);
        if (!cancelled && renewed?.lockedBy!==currentUser.id) setFormError('This ticket is now locked by another administrator.');
      } catch(error) {if (!cancelled) setFormError(error.message);}
    };
    const id=window.setInterval(renew,60000);
    return()=>{cancelled=true;window.clearInterval(id);};
  },[ticket.id,currentUser?.id]);

  useEffect(() => {
    if (!ticket?.id) return undefined;

    let cancelled = false;
    ticketMessageIdsRef.current = new Set();

    const loadMessages = async () => {
      try {
        const messages = await getTicketMessages(ticket.id);

        if (!cancelled) {
          messages.forEach(message=>ticketMessageIdsRef.current.add(message.id));
          setTicketMessages(current=>mergeMessages(current,messages));
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
        setTicketMessages((current) => mergeMessages(current,[newMessage]));
      }

      const isIncomingMessage = newMessage.senderId !== currentUserIdRef.current;

      if (!messageAlreadyExists && isIncomingMessage && isChatMinimizedRef.current) {
        setUnreadConversationCount((current) => current + 1);
      }
    },status=>{if(status==='SUBSCRIBED') void loadMessages();});

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
    pendingMessageIdRef.current = '';
  }, [ticket?.id]);

  const handleConversationPhotoChange = async (e) => {
    const files = e.target.files;
    setMessageError('');

    try {
      const nextPhotos = await filesToPhotoAttachments(files, messagePhotos.length);
      if (nextPhotos.length) pendingMessageIdRef.current = '';
      setMessagePhotos((current) => [...current, ...nextPhotos]);
    } catch (error) {
      setMessageError(error.message || 'Unable to attach selected photos.');
    } finally {
      e.target.value = '';
    }
  };

  const handleConversationImagePaste = async (files) => {
    setMessageError('');
    try {
      const nextPhotos = await filesToPhotoAttachments(files, messagePhotos.length);
      if (nextPhotos.length) pendingMessageIdRef.current = '';
      setMessagePhotos((current) => [...current, ...nextPhotos]);
    } catch (error) {
      setMessageError(error.message || 'Unable to attach pasted image.');
    }
  };

  const sendTicketMessage = async () => {
    const cleanMessage = messageDraft.trim();

    if (!canSendConversationMessage && !pendingMessageIdRef.current) {
      setMessageError('Conversation is closed for tickets that are not actively being handled or are already resolved.');
      return;
    }

    if (!cleanMessage && !messagePhotos.length) {
      setMessageError('Please type a message or attach a photo before sending.');
      return;
    }

    if (!pendingMessageIdRef.current) pendingMessageIdRef.current = createRequestId();
    setIsSendingMessage(true);
    setMessageError('');

    try {
      const sentMessage = await createTicketMessage(ticket.id, {
        sender: currentUser,
        message: cleanMessage,
        attachments: messagePhotos,
        clientMessageId: pendingMessageIdRef.current,
      });

      ticketMessageIdsRef.current.add(sentMessage.id);
      if (Number.isSafeInteger(sentMessage.ticketVersion)) savedVersionRef.current=sentMessage.ticketVersion;
      setTicketMessages((current) => {
        const exists = current.some((message) => message.id === sentMessage.id);
        return exists ? current : [...current, sentMessage];
      });
      setMessageDraft('');
      setMessagePhotos([]);
      pendingMessageIdRef.current = '';
    } catch (error) {
      setMessageError(error.message || 'Unable to send reply.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const updateConversationDraft = (value) => {
    pendingMessageIdRef.current = '';
    setMessageDraft(value);
  };

  const removeConversationPhoto = (photoId) => {
    pendingMessageIdRef.current = '';
    setMessagePhotos((current) => current.filter((photo) => photo.id !== photoId));
  };

  const updateDraft = (field, value) => {
    setFormError('');
    setDraft((prev) => {
      if (field === 'technicianId') {
        const profile = value === '__unassigned__' ? null : technicianProfiles.find((user) => user.id === value);
        return {
          ...prev,
          technicianId: profile?.id || '',
          technician: profile?.name || 'Unassigned',
        };
      }

      if (field === 'escalationPartner') {
        return {
          ...prev,
          escalationPartner: value,
          escalationPartnerCompany: value === 'Third Party Company' && prev.escalationPartner === value
            ? prev.escalationPartnerCompany
            : '',
        };
      }

      return { ...prev, [field]: value };
    });
  };

  const updateBurnoutReport = (nextReport) => {
    setFormError('');
    setDraft((prev) => ({ ...prev, burnoutReport: nextReport }));
  };

  const getAutosaveNotes = useCallback((sourceDraft = latestDraftRef.current) => ({
    actionTaken: sourceDraft.actionTaken || '',
    adminRemarks: sourceDraft.adminRemarks || '',
    resolution: sourceDraft.resolution || '',
    recommendation: sourceDraft.recommendation || '',
  }), []);

  const performNotesAutosave = useCallback(async ({ force = false } = {}) => {
    if (!ticket?.id || isResolvedLocked || submittingRef.current) return null;

    if (autosaveInFlightRef.current) {
      try {
        await autosaveInFlightRef.current;
      } catch {
        // The next save attempt below will surface the current result.
      }
    }

    const notes = getAutosaveNotes();
    const signature = JSON.stringify(notes);

    if (signature === lastAutosavedNotesRef.current) {
      return null;
    }

    setAutosaveState({ status: 'saving', message: 'Saving...' });

    const timestamp = new Date().toLocaleString();
    const savePromise = updateTicket(
      ticket.id,
      {
        ...notes,
        adminUpdatedAt: timestamp,
      },
      {
        requestedByRole: currentUser?.role || 'admin',
        updateScope: 'admin-autosave',
        autoSave: true,
        expectedVersion: savedVersionRef.current,
      }
    );

    autosaveInFlightRef.current = savePromise;

    try {
      const updatedTicket = await savePromise;
      savedVersionRef.current = updatedTicket.version;
      lastAutosavedNotesRef.current = signature;
      setAutosaveState({ status: 'saved', message: 'Saved' });

      if (updatedTicket?.id) {
        onTicketRealtimeUpdate?.(updatedTicket);
      }

      return updatedTicket;
    } catch (error) {
      setAutosaveState({ status: 'error', message: 'Unable to save' });
      throw error;
    } finally {
      if (autosaveInFlightRef.current === savePromise) {
        autosaveInFlightRef.current = null;
      }
    }
  }, [currentUser?.role, getAutosaveNotes, isResolvedLocked, onTicketRealtimeUpdate, ticket?.id]);

  const scheduleNotesAutosave = useCallback(() => {
    if (autosaveTimeoutRef.current) {
      window.clearTimeout(autosaveTimeoutRef.current);
    }

    autosaveTimeoutRef.current = window.setTimeout(() => {
      autosaveTimeoutRef.current = null;
      void performNotesAutosave().catch(() => {});
    }, 750);
  }, [performNotesAutosave]);

  useEffect(() => {
    if (isResolvedLocked) return undefined;

    scheduleNotesAutosave();

    return () => {
      if (autosaveTimeoutRef.current) {
        window.clearTimeout(autosaveTimeoutRef.current);
        autosaveTimeoutRef.current = null;
      }
    };
  }, [
    draft.actionTaken,
    draft.adminRemarks,
    draft.resolution,
    draft.recommendation,
    isResolvedLocked,
    scheduleNotesAutosave,
  ]);

  useEffect(() => {
    if (isResolvedLocked) return undefined;

    const flushAutosave = () => {
      if (autosaveTimeoutRef.current) {
        window.clearTimeout(autosaveTimeoutRef.current);
        autosaveTimeoutRef.current = null;
      }

      void performNotesAutosave({ force: true }).catch(() => {});
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushAutosave();
      }
    };

    window.addEventListener('beforeunload', flushAutosave);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', flushAutosave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isResolvedLocked, performNotesAutosave]);

  const handleNoteBlur = () => {
    if (autosaveTimeoutRef.current) {
      window.clearTimeout(autosaveTimeoutRef.current);
      autosaveTimeoutRef.current = null;
    }

    void performNotesAutosave({ force: true }).catch(() => {});
  };

  const handleRequestClose = async () => {
    if (autosaveTimeoutRef.current) {
      window.clearTimeout(autosaveTimeoutRef.current);
      autosaveTimeoutRef.current = null;
    }

    try {
      await performNotesAutosave({ force: true });
      onClose();
    } catch (error) {
      setFormError(error.message || 'Unable to autosave the latest notes. Please try again.');
    }
  };

  const getPrintableTicketSnapshot = () => ({
    ...ticket,
    status: draft.status || ticket.status,
    sla: draft.sla || ticket.sla,
    technician: draft.technician || ticket.technician,
    escalationPartner: draft.escalationPartner,
    escalationPartnerCompany: draft.escalationPartnerCompany,
    ...getAutosaveNotes(draft),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;

    if (autosaveTimeoutRef.current) {
      window.clearTimeout(autosaveTimeoutRef.current);
      autosaveTimeoutRef.current = null;
    }

    if (isResolvedLocked) {
      setFormError(isBurnout ? 'Completed Burnout records are locked and cannot be changed.' : 'Resolved tickets are locked and cannot be changed.');
      return;
    }

    const draftStatus = normalizeTicketStatus(draft.status);

    if (isStartMode && draftStatus !== 'in progress') {
      setFormError('Start the ticket by setting the status to In Progress first.');
      return;
    }

    const sanitizedDraft = { ...draft, technicianId: draft.technicianId || null };

    if (draftStatus === 'escalated') {
      if (!String(draft.escalationPartner || '').trim()) {
        setFormError('Choose an escalation partner before escalating this ticket.');
        return;
      }
      if (draft.escalationPartner === 'Third Party Company' && !String(draft.escalationPartnerCompany || '').trim()) {
        setFormError('Enter the third-party company name before saving.');
        return;
      }
    } else {
      sanitizedDraft.escalationPartner = '';
      sanitizedDraft.escalationPartnerCompany = '';
    }

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

    submittingRef.current=true;
    setIsSubmitting(true);
    try {
    if (autosaveInFlightRef.current) await autosaveInFlightRef.current;
    await onSave(ticket.id, {
      ...sanitizedDraft,
      technician: sanitizedDraft.technician || currentStaffName,
      adminUpdatedAt: timestamp,
      lastUpdated: timestamp,
      dateLabel: movedDateValue,
      nextActionAt: draft.nextActionAt ? new Date(draft.nextActionAt).toISOString() : null,
      employeeEditLocked: isEmployeeLockedTicket(nextTicketSnapshot),
      employeeEditLockedAt: timestamp,
      employeeEditLockedBy: currentUser?.id || null,
      employeeEditLockedByName: currentStaffName,
      employeeEditLockReason: getEmployeeTicketLockReason(nextTicketSnapshot),
    },{expectedVersion:savedVersionRef.current});
    } catch(error) {setFormError(error.message || 'Unable to save ticket.');}
    finally {submittingRef.current=false;setIsSubmitting(false);}
  };

  return (
    <div
      className={[
        'modal-overlay',
        'ticket-action-overlay',
        isBurnout ? 'burnout-modal-open' : '',
        shouldShowConversation && isChatMinimized ? 'chat-minimized' : '',
      ].filter(Boolean).join(' ')}
      role="dialog"
      aria-modal="true"
      aria-label={isBurnout ? 'Burnout ticket editor' : 'Ticket action modal'}
    >
      <form
        className={[
          'modal-box glass admin-modal-box ticket-action-modal ticket-modal-readable',
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
                <h3 title={isBurnout ? 'Helpdesk Burnout Checklist' : ticket.concernType}>{isBurnout ? 'Helpdesk Burnout Checklist' : ticket.concernType}</h3>
                <p title={`${ticket.branch} - ${ticket.department}`}>{ticket.branch} - {ticket.department}</p>
              </div>
            </div>

            <div className="ticket-action-header-status">
              <TicketHandlingIndicator
                ticket={ticket}
                now={now}
                detailed
                currentUserId={currentUser?.id}
              />
            </div>
          </div>

          <p className="ticket-sla-deadline-note">
            {isBurnout
              ? `Submitted ${ticket.createdAt || ticket.date || 'date unavailable'} - 3-5 day unit testing cycle`
              : `Response due ${ticket.responseDueAt ? new Date(ticket.responseDueAt).toLocaleString() : 'not set'} | Resolution due ${ticket.resolutionDueAt ? new Date(ticket.resolutionDueAt).toLocaleString() : 'not set'} | Calendar hours; continues while waiting`}
          </p>

          <div className="ticket-action-header-actions">
            <button type="button" className="admin-modal-close" onClick={handleRequestClose} aria-label="Close modal">
              <X aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="ticket-action-scroll-content">
        {isBurnout ? (
          <BurnoutReportEditor
            ticket={ticket}
            report={draft.burnoutReport}
            onChange={updateBurnoutReport}
            readOnly={isResolvedLocked}
            draft={draft}
            updateDraft={updateDraft}
            statusOptions={statusOptions}
            visibleTechnicianId={visibleTechnicianId}
            technicianProfiles={technicianProfiles}
            canEditOutcomeFields={canEditOutcomeFields}
            lockedOutcomePlaceholder={lockedOutcomePlaceholder}
            onNoteBlur={handleNoteBlur}
            canReopen={canReopen}
            formError={formError}
            onPreviewAttachment={setSelectedAttachment}
          />
        ) : (
          <>
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
            <span>SAAR</span>
            <p>{ticket.saarAttachment?.name || (ticket.saarRequired ? 'Required, no file found' : 'Not required')}</p>
          </div>
        </div>


        <div className={`ticket-action-details-row${isExpandedWorkflowStatus ? ' is-expanded-workflow' : ''}`}>
          <div className={`ticket-action-description-column${isWaitingStatus ? ' is-waiting-workflow' : ''}`}>
            <div className="admin-description-box ticket-action-description">
              <span>Description of Problem</span>
              <PreservedText value={getVisibleTicketDescription(ticket.description) || 'No description provided.'} />
            </div>
            {isWaitingStatus && <div className="ticket-form-group ticket-waiting-reason">
              <label>Waiting Reason</label>
              <textarea className="ticket-field ticket-textarea" value={draft.actionReason} onChange={event=>updateDraft('actionReason',event.target.value)} minLength={8} required disabled={isResolvedLocked}/>
            </div>}
          </div>

          <div className={`ticket-action-control-stack${isExpandedWorkflowStatus ? ' is-expanded-workflow' : ''}`}>
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
            <label htmlFor={`ticket-action-sla-${ticket.id}`}>SLA</label>
            <select
              id={`ticket-action-sla-${ticket.id}`}
              className="ticket-field ticket-select"
              value={draft.sla || 'Low'}
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
            <label>Assigned ICT Staff</label>
            <select
              className="ticket-field ticket-select"
              value={visibleTechnicianId}
              onChange={(e) => updateDraft('technicianId', e.target.value)}
              required
              disabled={isResolvedLocked}
            >
              <option value="__unassigned__">Unassigned</option>
              {visibleTechnicianId === '__legacy__' && (
                <option value="__legacy__" disabled>Legacy assignment: {draft.technician}</option>
              )}
              {technicianProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>{profile.name}</option>
              ))}
            </select>
          </div>
          {isEscalationStatus && <div className="ticket-form-group">
            <div className="escalation-partner-label-row">
              <label>Escalation Partner</label>
              {draft.escalationPartner === 'Third Party Company' && (
                <button
                  type="button"
                  className="escalation-partner-change"
                  onClick={() => updateDraft('escalationPartner', '')}
                  disabled={isResolvedLocked}
                >
                  Change
                </button>
              )}
            </div>
            {draft.escalationPartner === 'Third Party Company' ? (
              <input
                className="ticket-field ticket-input"
                type="text"
                value={draft.escalationPartnerCompany}
                onChange={event => updateDraft('escalationPartnerCompany', event.target.value)}
                placeholder="Enter company name"
                aria-label="Third-party company name"
                maxLength={120}
                required
                disabled={isResolvedLocked}
              />
            ) : (
              <select className="ticket-field ticket-select" value={draft.escalationPartner} onChange={event=>updateDraft('escalationPartner',event.target.value)} required disabled={isResolvedLocked}>
                <option value="">Select partner</option>
                {ESCALATION_PARTNERS.map(partner=><option key={partner} value={partner}>{partner}</option>)}
              </select>
            )}
          </div>}
          {['moved date','waiting for requester','waiting for vendor','waiting for approval'].includes(normalizedDraftStatus) && <div className="ticket-form-group">
            <label>Next Action</label>
            <input className="ticket-field ticket-input" type="datetime-local" value={draft.nextActionAt} onChange={event=>updateDraft('nextActionAt',event.target.value)} required disabled={isResolvedLocked}/>
          </div>}
          </div>
        </div>

        <div className="ticket-action-notes-grid">
          <div className="ticket-form-group">
            <label>Action Taken</label>
            <textarea
              className="ticket-field ticket-textarea admin-small-textarea"
              value={draft.actionTaken}
              onChange={(e) => updateDraft('actionTaken', e.target.value)}
              onBlur={handleNoteBlur}
              placeholder={canEditOutcomeFields ? 'Write the action taken by ICT/admin...' : lockedOutcomePlaceholder}
              readOnly={!canEditOutcomeFields}
            />
          </div>

          <div className="ticket-form-group">
            <label>Internal ICT Notes</label>
            <textarea
              className="ticket-field ticket-textarea admin-small-textarea"
              value={draft.adminRemarks}
              onChange={(e) => updateDraft('adminRemarks', e.target.value)}
              onBlur={handleNoteBlur}
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
              onBlur={handleNoteBlur}
              placeholder={canEditOutcomeFields ? (isBurnout ? 'Write unit condition, pass/fail, repair, replacement, or turnover notes...' : 'Write final resolution once completed...') : lockedOutcomePlaceholder}
              readOnly={!canEditOutcomeFields}
            />
          </div>

          <div className="ticket-form-group">
            <label>Recommendation</label>
            <textarea
              className="ticket-field ticket-textarea admin-small-textarea"
              value={draft.recommendation}
              onChange={(e) => updateDraft('recommendation', e.target.value)}
              onBlur={handleNoteBlur}
              placeholder={canEditOutcomeFields ? 'Write any recommendation, prevention step, or follow-up action...' : lockedOutcomePlaceholder}
              readOnly={!canEditOutcomeFields}
            />
          </div>
        </div>

        <div className="ticket-action-attachment-chat-row">
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
          {isChatOpen && (
          typeof document !== 'undefined' && createPortal(
            <TicketConversationPanel
              ticket={ticket}
              currentUser={currentUser}
              messages={ticketMessages}
              messageDraft={messageDraft}
              messagePhotos={messagePhotos}
              messageError={messageError}
              isSending={isSendingMessage}
              floating
              className="ticket-modal-floating-chat admin-floating-ticket-chat"
              canSend={canSendConversationMessage || Boolean(pendingMessageIdRef.current)}
              onClose={() => setIsChatMinimized(true)}
              onMessageChange={updateConversationDraft}
              onPhotoChange={handleConversationPhotoChange}
              onPastePhotos={handleConversationImagePaste}
              onRemovePhoto={removeConversationPhoto}
              onSend={sendTicketMessage}
            />,
            document.body,
          )
          )}
        {!isBurnout && shouldShowConversation && isChatMinimized && (
          typeof document !== 'undefined' && createPortal(
            <TicketChatLauncher
              className="ticket-modal-floating-launcher"
              unreadCount={unreadConversationCount}
              onClick={() => {
                setIsChatMinimized(false);
                setUnreadConversationCount(0);
              }}
            />,
            document.body,
          )
        )}
        </div>

        {canReopen && <div className="ticket-form-group">
          <label>Reopen Reason</label>
          <textarea className="ticket-field ticket-textarea" value={draft.reopenReason} onChange={event=>updateDraft('reopenReason',event.target.value)} minLength={8}/>
        </div>}
        {formError && <div className="form-error app-error-alert" role="alert">{formError}</div>}
          </>
        )}
        <TicketHandlingActivity ticket={ticket} now={now} />
        </div>

        <div className="modal-footer">
          {canDelete && (
            <button type="button" className="modal-btn danger" onClick={() => onDelete(ticket)}>
              <MonoIcon icon={Trash2} />
              Delete
            </button>
          )}

          <div className="ticket-action-footer-tools">
            {canReopen && (
              <button type="button" className="modal-btn confirm" disabled={draft.reopenReason.trim().length<8} onClick={() => onReopen({...ticket,reopenReason:draft.reopenReason,version:savedVersionRef.current})}>
                <MonoIcon icon={RotateCcw} />
                Reopen Ticket
              </button>
            )}

            {!isResolvedLocked && autosaveState.message && (
              <span className={`ticket-autosave-status ${autosaveState.status}`}>
                {autosaveState.message}
              </span>
            )}

            <button type="button" className="modal-btn print" onClick={() => printResolvedTicket(getPrintableTicketSnapshot())}>
              <MonoIcon icon={Printer} />
              Print Ticket
            </button>

            {!isResolvedLocked && (
              <button type="submit" className="modal-btn confirm" disabled={isSubmitting}>
                <MonoIcon icon={ShieldCheck} />
                {isBurnout ? 'Save Burnout Update' : isStartMode ? 'Start Ticket' : 'Save Ticket Update'}
              </button>
            )}
          </div>
        </div>
      </form>

      {selectedAttachment && (
        <div
          className="attachment-preview-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
          onClick={() => setSelectedAttachment(null)}
        >
          <div className="attachment-preview-panel" onClick={(event) => event.stopPropagation()}>
            <div className="attachment-preview-head">
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

    </div>
  );
}

/* =========================
   ROOT EXPORT
========================= */

export default function AdminDashboardPage() {
  const router = useRouter();
  const confirmDialog = useConfirmDialog();

  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [admin, setAdmin] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  useEffect(() => {
    if (!admin?.id) return;
    setUsers((current) => current.map((user) => user.id === admin.id ? { ...user, ...admin } : user));
  }, [admin]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const handleTicketRealtimeUpdate=useCallback((updatedTicket)=>{
    setTickets(current=>current.map(ticket=>ticket.id===updatedTicket.id && (updatedTicket.version || 0)>=(ticket.version || 0) ? updatedTicket : ticket));
    setSelectedTicket(current=>current?.id===updatedTicket.id && (updatedTicket.version || 0)>=(current.version || 0) ? {...current,...updatedTicket} : current);
  },[]);
  const [authChecked, setAuthChecked] = useState(false);
  const [isInactiveBlocked, setIsInactiveBlocked] = useState(false);
  const [, setLastSynced] = useState('');
  const [timerNow, setTimerNow] = useState(Date.now());
  const [ticketLockNotice, setTicketLockNotice] = useState(null);
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

        if (isPasswordChangeRequired(activeUser)) {
          setAuthChecked(true);
          setAdmin(null);
          router.replace(`${LOGIN_ROUTE}?mode=force-password`);
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
        includeUsers: activeSection === 'profile' || activeSection === 'users' || activeSection === 'create-user' || activeSection === 'create-ict-ticket',
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

      setTickets((currentTickets) => {
        if (eventType === 'DELETE') {
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
    const hasRunningWorkTimer = tickets.some((ticket) => {
      const startedAt = getTicketWorkStartedAt(ticket);
      const endedAt = getTicketWorkEndedAt(ticket);

      return Boolean(startedAt) && !endedAt && isUnresolved(ticket.status);
    });

    if (!selectedTicket && tickets.length === 0) return undefined;

    setTimerNow(Date.now());

    const intervalId = window.setInterval(() => {
      setTimerNow(Date.now());
    }, selectedTicket || hasRunningWorkTimer ? 1000 : 30000);

    return () => window.clearInterval(intervalId);
  }, [tickets, selectedTicket]);

  const summary = useMemo(() => buildSummary(tickets), [tickets]);

  const applyTicketFilters = (sourceTickets) => {
    const search = filters.search.toLowerCase().trim();

    const filtered = sourceTickets.filter((ticket) => {
      const matchesSearch = !search || getTicketSearchText(ticket).includes(search);
      const matchesStatus = filters.status === 'All' || ticket.status === filters.status;
      const matchesBranch = filters.branch === 'All' || ticket.branch === filters.branch;
      const matchesCategory = filters.category === 'All' || ticket.supportCategory === filters.category;
      const matchesSla = filters.sla === 'All' || ticket.sla === filters.sla;

      return matchesSearch && matchesStatus && matchesBranch && matchesCategory && matchesSla;
    });

    // Filtering first, then recent-first ordering, then pagination.
    // This guarantees the newest matching ticket always occupies the first slot.
    return sortRecentTickets(filtered);
  };

  const supportTickets = useMemo(() => sortTickets(tickets.filter((ticket) => !isBurnoutTicket(ticket))), [tickets]);
  const filteredTickets = useMemo(() => applyTicketFilters(tickets), [tickets, filters]);
  const filteredSupportTickets = useMemo(() => applyTicketFilters(supportTickets), [supportTickets, filters]);

  const categorySummary = useMemo(() => breakdown(tickets, 'supportCategory', SUPPORT_CATEGORIES), [tickets]);
  const statusSummary = useMemo(() => breakdown(tickets, 'status', TICKET_STATUSES), [tickets]);
  const branchSummary = useMemo(() => breakdown(tickets, 'branch', BRANCHES), [tickets]);
  const isSuperAdmin = normalizePortalRole(admin?.role) === 'superadmin';
  const isIctAdmin = normalizePortalRole(admin?.role) === 'admin';
  const canEditUsers = isSuperAdmin || isIctAdmin;
  const canCreateUsers = isSuperAdmin;
  const canCreateIctTickets = isSuperAdmin;
  const canAccessDepartmentConsoles = isSuperAdmin;
  const canDeleteUsers = isSuperAdmin;
  const canEditUserRoles = isSuperAdmin;
  const canDeleteTickets = isSuperAdmin;

  const goTo = (section) => {

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
        setTicketLockNotice({
          ticketCode: getTicketDisplayCode(ticket),
          staffName: lockedTicket.lockedByName || 'another IT staff',
        });
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

  const handleSaveTicket = async (ticketId, updates, options = {}) => {
    const currentTicket = tickets.find((ticket) => ticket.id === ticketId);
    const isCurrentBurnout = isBurnoutTicket(currentTicket);
    const isCurrentFinalBurnout = isCurrentBurnout && isBurnoutClosedStatus(currentTicket?.status);

    if (isClosed(currentTicket?.status) || isCurrentFinalBurnout) {
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

    if (!Object.prototype.hasOwnProperty.call(updates, 'technicianId')) {
      if (!nextUpdates.technician || nextUpdates.technician === 'Unassigned') {
        nextUpdates.technician = currentStaffName;
        nextUpdates.technicianId = admin?.id || null;
      } else {
        nextUpdates.technicianId = currentTicket?.technicianId || null;
      }
    }

    if (updates.status && nextStatus && nextStatus !== currentStatus) {
      nextUpdates.statusHistory = [
        ...(Array.isArray(currentTicket?.statusHistory) ? currentTicket.statusHistory : []),
        buildStatusHistoryEntry(updates.status, timestamp, admin, {
          technician: nextUpdates.technician,
          technicianId: nextUpdates.technicianId,
        }),
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

    if (nextStatus === 'canceled' || nextStatus === 'cancelled') {
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
      await updateTicket(ticketId, {
        ...nextUpdates,
        lockedBy: null,
        lockedByName: null,
        lockedAt: null,
        lockExpiresAt: null,
      },options);
      await releaseTicketLock(ticketId,admin.id);

      setTimerNow(Date.now());
      await loadData();
      setSelectedTicket(null);
    } catch (error) {
      throw error;
    }
  };

  const handleReopenTicket = async (ticket) => {
    if (!isSuperAdmin || !ticket?.id) {
      window.alert('Only the super admin can reopen closed tickets.');
      return;
    }

    const isBurnout = isBurnoutTicket(ticket);
    if (!isClosed(ticket.status)) return;

    const nextStatus = isBurnout ? 'Under Burnout' : 'In Progress';
    const confirmed = await confirmDialog({
      title: 'Reopen closed ticket?',
      message: `Ticket ${getTicketDisplayCode(ticket)} will return to active ICT handling. Its existing notes and status history will be retained.`,
      confirmLabel: 'Reopen ticket',
    });
    if (!confirmed) return;

    const timestamp = new Date().toISOString();
    const assignedProfileIsActive = users.some((user) => user.id === ticket.technicianId && isAdminRole(user.role) && !isInactivePortalUser(user));
    const technicianId = assignedProfileIsActive ? ticket.technicianId : admin?.id || '';
    const technician = assignedProfileIsActive ? ticket.technician : admin?.name || 'Super Admin';
    const nextTicketSnapshot = { ...ticket, status: nextStatus, technician, technicianId };
    const reopenEntry = {
      ...buildStatusHistoryEntry(nextStatus, timestamp, admin, { technician, technicianId }),
      type: 'reopened',
      label: `Reopened to ${nextStatus}`,
    };

    try {
      await updateTicket(ticket.id, {
        status: nextStatus,
        reopenReason: ticket.reopenReason,
        technician,
        technicianId,
        workStartedAt: ticket.workStartedAt || timestamp,
        workEndedAt: '',
        adminUpdatedAt: timestamp,
        lastUpdated: timestamp,
        statusHistory: [...(Array.isArray(ticket.statusHistory) ? ticket.statusHistory : []), reopenEntry],
        employeeEditLocked: isEmployeeLockedTicket(nextTicketSnapshot),
        employeeEditLockedAt: timestamp,
        employeeEditLockedBy: admin?.id || null,
        employeeEditLockedByName: admin?.name || 'Super Admin',
        employeeEditLockReason: getEmployeeTicketLockReason(nextTicketSnapshot),
        lockedBy: null,
        lockedByName: null,
        lockedAt: null,
        lockExpiresAt: null,
      }, {
        requestedByRole: admin?.role || 'superadmin',
        updateScope: 'admin-reopen',
        expectedVersion: ticket.version,
      });
      setTimerNow(Date.now());
      await loadData();
      setSelectedTicket(null);
    } catch (error) {
      window.alert(error.message || 'Unable to reopen ticket.');
    }
  };

  const handleDeleteTicket = async (ticket) => {
    if (!ticket?.id) return;

    if (!isSuperAdmin) {
      window.alert('Only the super admin can delete tickets.');
      return;
    }

    const confirmed = await confirmDialog({
      title: 'Delete support ticket?',
      message: `Ticket ${getTicketDisplayCode(ticket)} will be permanently removed regardless of its current status.`,
      confirmLabel: 'Delete ticket',
      variant: 'danger',
      warning: 'This action cannot be undone.',
    });

    if (!confirmed) return;

    try {
      await deleteTicket(ticket.id, {
        force: true,
        requestedBy: admin?.id,
        requestedByRole: admin?.role,
        bypassStatusLock: true,
      });
      setSelectedTicket(null);
      setTickets((currentTickets) => currentTickets.filter((item) => item.id !== ticket.id));
      await loadData({
        includeUsers: activeSection === 'profile' || activeSection === 'users' || activeSection === 'create-user' || activeSection === 'create-ict-ticket',
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
              <HelpdeskInbox userId={admin.id} tickets={tickets} onTicket={ticketId=>{const ticket=tickets.find(row=>row.id===ticketId);if(ticket) void handleOpenTicket(ticket);}} />
              <PortalThemeToggle />
              <div className="profile-chip">
                <PortalProfilePhotoControl
                  user={admin}
                  fallback="AD"
                  onUserUpdated={setAdmin}
                  onStatus={(text, type) => {
                    if (type === 'error') window.alert(text);
                  }}
                />
                <button
                  type="button"
                  className="profile-chip-copy admin-profile-chip-copy-button"
                  onClick={() => goTo('profile')}
                >
                  <strong>{admin.name}</strong>
                  <span>{admin.designation || admin.department}</span>
                </button>
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
              canCreateIctTickets={canCreateIctTickets}
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

              {activeSection === 'profile' && (
                <AdminProfileView
                  admin={admin}
                  tickets={tickets}
                  canCreateUsers={canCreateUsers}
                  canCreateIctTickets={canCreateIctTickets}
                  canAccessDepartmentConsoles={canAccessDepartmentConsoles}
                  onAdminUpdate={setAdmin}
                  onGoTo={goTo}
                />
              )}

              {activeSection === 'dashboard' && (
                <DashboardView
                  tickets={tickets}
                  summary={summary}
                  categorySummary={categorySummary}
                  onGoTo={goTo}
                  onOpenTicket={handleOpenTicket}
                  onRefresh={() => loadData()}
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
                  users={users}
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
                  canEditUsers={canEditUsers}
                  canDeleteUsers={canDeleteUsers}
                  canEditRoles={canEditUserRoles}
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

              {activeSection === 'create-ict-ticket' && canCreateIctTickets && (
                <CreateIctTicketView
                  admin={admin}
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
          users={users}
          onClose={handleCloseTicket}
          onSave={handleSaveTicket}
          onDelete={handleDeleteTicket}
          onReopen={handleReopenTicket}
          canDelete={canDeleteTickets}
          now={timerNow}
          onTicketRealtimeUpdate={handleTicketRealtimeUpdate}
        />
      )}

      <TicketLockNoticeModal notice={ticketLockNotice} onClose={() => setTicketLockNotice(null)} />

    </>
  );
}

