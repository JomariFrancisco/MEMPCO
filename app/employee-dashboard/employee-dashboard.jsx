'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BadgeCheck,
  Bell,
  BriefcaseBusiness,
  Building2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Eye,
  FileText,
  IdCard,
  ImageIcon,
  LayoutDashboard,
  Link2,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  MapPin,
  Paperclip,
  PenLine,
  Phone,
  Send,
  ShieldCheck,
  Ticket,
  UserRound,
  UserRoundCheck,
  Wrench,
  X,
} from 'lucide-react';
import {
  BRANCHES,
  CATEGORY_TEMPLATES,
  DEPARTMENTS,
  DEVICE_OPTIONS,
  SLA_LEVELS,
  isUnresolved,
  slugify,
} from '../portalStorage';
import {
  getCurrentPortalUser,
  getPortalHomeRoute,
  INACTIVE_ACCOUNT_MESSAGE,
  isInactivePortalUser,
  signOutPortal,
} from '@/lib/auth/portalAuth';
import {
  canTicketAcceptMessages,
  createTicket,
  createTicketMessage,
  getTicket,
  getTicketMessages,
  getTicketsForUser,
  isTicketBeingHandled,
  subscribeToTicket,
  subscribeToTicketMessages,
  updateTicket,
} from '@/lib/tickets/portalTickets';
import './employee-dashboard.css';

/* =========================
   ROUTES
========================= */

const LOGIN_ROUTE = '/LogIn';
const HRMAX_ROUTE = 'http://120.28.214.253/hrmax/';
const TRANSITION_DURATION = 560;

/* =========================
   STATIC DATA
========================= */

const SAAR_MAX_SIZE = 4 * 1024 * 1024;
const PHOTO_MAX_SIZE = 4 * 1024 * 1024;
const PHOTO_MAX_COUNT = 5;
const PHOTO_ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp';
const PHOTO_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];


const HELPDESK_CATEGORY_CONCERNS = {
  'Software Support': [
    'Application Installation or Update',
    'Application Error or Bug',
    'Software License or Activation',
    'System Configuration',
    'Application Access Request',
  ],
  'Network Support': [
    'Internet or Wi-Fi Connection',
    'LAN Connection',
    'Network Printer or Shared Device',
    'VPN or Remote Access',
    'Network Account or Voucher',
  ],
  'Hardware Support': [
    'Desktop or Laptop Issue',
    'Printer or Scanner Issue',
    'Monitor or Display Issue',
    'Keyboard Mouse or Peripheral',
    'Power UPS or AVR Issue',
  ],
  'User Account Management': [
    'Password Reset',
    'Account Unlock',
    'Create User Account',
    'Change Access Permission',
    'Email or Outlook Account',
    'MBWIN Account Request',
  ],
};

const HELPDESK_SUPPORT_CATEGORIES = Object.keys(HELPDESK_CATEGORY_CONCERNS);
const getConcernOptionsForCategory = (category = '') => HELPDESK_CATEGORY_CONCERNS[category] || [];

const OTHER_SERVICES_STORAGE_KEY = 'mempcop-employee-other-services';
const OTHER_SERVICE_CATEGORIES = [
  'Burnout',
  'Other',
];

const createOtherServiceId = () => {
  const year = new Date().getFullYear();
  const randomPart = String(Math.floor(Math.random() * 10000)).padStart(4, '0');

  return `OS-${year}-${randomPart}`;
};

const getNewOtherServiceForm = (user = {}) => ({
  branch: user.branch || user.office || '',
  custodian: '',
  brand: '',
  model: '',
  serialNumber: '',
  deviceName: '',
  department: user.department || '',
  supportCategory: '',
  requestedService: '',
  remarks: '',
});

const getOtherServiceRemarksPlaceholder = (category = '') => {
  if (!category) return 'Select an Other Services category, then write the request details here.';

  if (category === 'Burnout') {
    return 'Write the burnout details, affected device, location, and assistance needed.';
  }

  if (category === 'Other') {
    return 'Write the service details, preferred location, schedule, or special instructions.';
  }

  return `Write additional details about the ${category} request.`;
};

const getTicketDisplayCode = (ticket = {}) => ticket.ticketCode || ticket.id || '';

const ANNOUNCEMENTS = [
  {
    tag: 'Helpdesk',
    title: 'Use the correct support category',
    description:
      'Choose Software Support, Network Support, Hardware Support, or User Account Management before selecting the concern type.',
    date: 'Guide',
  },
  {
    tag: 'SLA',
    title: 'SLA is selected manually by the user',
    description:
      'The selected SLA level also sets the operational impact and will not be overwritten by the system.',
    date: 'Manual',
  },
  {
    tag: 'Required',
    title: 'Complete the tailored issue description',
    description:
      'The issue description fields change depending on the selected concern type so ICT receives the right details.',
    date: 'Active',
  },
];

const GUIDES = [
  'Select a support category first. The concern type dropdown will only show concerns related to that category.',
  'Choose the correct SLA level and operational impact before submitting the ticket.',
  'For installation or update requests, provide the application name, request type, purpose, and remarks.',
];

const SLA_PICKER_OPTIONS = [
  {
    level: 'Low',
    icon: ShieldCheck,
    title: 'Low',
    impact: 'Single user affected',
    text: 'Minor request or single-employee concern that does not stop daily operations.',
    meta: 'Standard response',
  },
  {
    level: 'Medium',
    icon: Clock3,
    title: 'Medium',
    impact: 'Multiple users or department affected',
    text: 'Concern affects work efficiency, a shared device, system function, or several users.',
    meta: 'Priority review',
  },
  {
    level: 'High',
    icon: Wrench,
    title: 'High',
    impact: 'Branch operation affected',
    text: 'Major concern affecting branch service, network access, system availability, or important transactions.',
    meta: 'Urgent handling',
  },
  {
    level: 'Critical',
    icon: BadgeCheck,
    title: 'Critical',
    impact: 'Core operation affected',
    text: 'Severe concern involving stopped operations, security incident, data loss, or critical system failure.',
    meta: 'Immediate action',
  },
];

const getSelectedSlaOption = (sla = 'Low') =>
  SLA_PICKER_OPTIONS.find((option) => option.level === sla) || SLA_PICKER_OPTIONS[0];

const SUPPORT_FLOW = [
  {
    title: 'Submit request',
    text: 'Employee provides all required details and attachments.',
  },
  {
    title: 'ICT review',
    text: 'Employee selects the SLA level and ICT validates the concern.',
  },
  {
    title: 'Action & resolution',
    text: 'Technician updates action taken, remarks, and final resolution.',
  },
];

const emptyForm = {
  branch: '',
  department: '',
  supportCategory: '',
  concernType: '',
  deviceName: '',
  contactNumber: '',
  impact: '',
  description: '',
  saarAttachment: null,
  photoAttachments: [],
  sla: 'Low',
};

const DEFAULT_DESCRIPTION_TEMPLATE = [
  'AnyDesk:',
  'System/App:',
  'Summary:',
  'Error:',
].join('\n');

const CONCERN_DESCRIPTION_TEMPLATES = {
  applicationRequest: [
    'Application Name:',
    'Request Type:',
    'Purpose:',
    'Remarks:',
  ].join('\n'),

  mbwin: [
    'AnyDesk:',
    'MBWIN Account:',
    'Requested Access:',
    'Module:',
    'Error:',
    'SAAR Ref:',
  ].join('\n'),

  network: [
    'AnyDesk:',
    'Connection:',
    'Affected Area:',
    'Users Affected:',
    'Summary:',
    'Status/Error:',
  ].join('\n'),

  printer: [
    'AnyDesk:',
    'Printer Model:',
    'Connection:',
    'Affected User:',
    'Summary:',
    'Error:',
  ].join('\n'),

  hardware: [
    'AnyDesk:',
    'Summary:',
    'Started:',
    'Error/Signal:',
  ].join('\n'),

  account: [
    'AnyDesk:',
    'System/App:',
    'Username:',
    'Access Needed:',
    'Error:',
    'Approver:',
  ].join('\n'),

  email: [
    'AnyDesk:',
    'Email Account:',
    'Client:',
    'Summary:',
    'Error:',
  ].join('\n'),

  security: [
    'AnyDesk:',
    'Affected Account:',
    'Concern Type:',
    'Suspicious Source:',
    'Summary:',
    'Warning/Error:',
  ].join('\n'),

  server: [
    'AnyDesk:',
    'Server/System:',
    'Service Affected:',
    'Users Affected:',
    'Summary:',
    'Error:',
  ].join('\n'),

  software: [
    'AnyDesk:',
    'System/App:',
    'Module:',
    'Summary:',
    'Error:',
  ].join('\n'),
};

const getTemplateLabels = (template = DEFAULT_DESCRIPTION_TEMPLATE) =>
  template
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const normalizeTextareaValue = (value = '') => String(value || '').replace(/\r\n/g, '\n');

const normalize = (value) => String(value || '').trim().toLowerCase();

const normalizePortalRole = (role = '') =>
  String(role || '')
    .trim()
    .toLowerCase()
    .replace(/[-_\s]+/g, '');

const hasAnyKeyword = (text, keywords = []) => keywords.some((keyword) => text.includes(keyword));

const getIssueContextText = (formOrTicket = {}) =>
  [
    formOrTicket.supportCategory,
    formOrTicket.concernType,
    formOrTicket.deviceName,
    formOrTicket.description,
  ]
    .map(normalize)
    .join(' ');

const isMbwinRequest = (formOrTicket) => {
  const haystack = getIssueContextText(formOrTicket);

  return (
    haystack.includes('mbwin') ||
    haystack.includes('mb win') ||
    haystack.includes('mbwim') ||
    haystack.includes('mb wim')
  );
};

const getIssueDescriptionTemplate = (context = {}) => {
  const supportCategory = typeof context === 'string' ? context : context.supportCategory;
  const concernType = typeof context === 'string' ? '' : context.concernType;
  const deviceName = typeof context === 'string' ? '' : context.deviceName;

  const combined = [supportCategory, concernType, deviceName].map(normalize).join(' ');

  if (
    hasAnyKeyword(combined, [
      'application installation',
      'application update',
      'installation or update',
      'software installation',
      'system update',
      'program installation',
      'install application',
      'install software',
      'software license',
      'activation',
    ])
  ) {
    return CONCERN_DESCRIPTION_TEMPLATES.applicationRequest;
  }

  if (hasAnyKeyword(combined, ['mbwin', 'mb win', 'mbwim', 'mb wim', 'teller', 'treasury', 'saar'])) {
    return CONCERN_DESCRIPTION_TEMPLATES.mbwin;
  }

  if (
    hasAnyKeyword(combined, [
      'network',
      'internet',
      'wi-fi',
      'wifi',
      'voucher',
      'router',
      'modem',
      'lan',
      'connection',
      'no connection',
      'no internet',
    ])
  ) {
    return CONCERN_DESCRIPTION_TEMPLATES.network;
  }

  if (hasAnyKeyword(combined, ['printer', 'scanner', 'print', 'scan'])) {
    return CONCERN_DESCRIPTION_TEMPLATES.printer;
  }

  if (
    hasAnyKeyword(combined, [
      'computer',
      'desktop',
      'laptop',
      'hardware',
      'monitor',
      'keyboard',
      'mouse',
      'ups',
      'avr',
      'power supply',
      'no power',
    ])
  ) {
    return CONCERN_DESCRIPTION_TEMPLATES.hardware;
  }

  if (
    hasAnyKeyword(combined, [
      'account',
      'access',
      'password',
      'login',
      'user',
      'permission',
      'role',
      'reset',
      'locked',
      'unlock',
    ])
  ) {
    return CONCERN_DESCRIPTION_TEMPLATES.account;
  }

  if (hasAnyKeyword(combined, ['email', 'outlook', 'mail', 'webmail'])) {
    return CONCERN_DESCRIPTION_TEMPLATES.email;
  }

  if (
    hasAnyKeyword(combined, [
      'virus',
      'malware',
      'ransomware',
      'phishing',
      'security',
      'breach',
      'suspicious',
      'data loss',
    ])
  ) {
    return CONCERN_DESCRIPTION_TEMPLATES.security;
  }

  if (
    hasAnyKeyword(combined, [
      'server',
      'database',
      'backup',
      'domain',
      'active directory',
      'nas',
      'storage',
    ])
  ) {
    return CONCERN_DESCRIPTION_TEMPLATES.server;
  }

  if (
    hasAnyKeyword(combined, [
      'application',
      'software',
      'system',
      'program',
      'module',
      'error',
    ])
  ) {
    return CONCERN_DESCRIPTION_TEMPLATES.software;
  }

  return CATEGORY_TEMPLATES[supportCategory] || DEFAULT_DESCRIPTION_TEMPLATE;
};

const isGeneratedDescriptionOnly = (value = '') => {
  const text = normalizeTextareaValue(value).trim();

  if (!text) return true;

  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return true;

  return lines.every((line) => line.endsWith(':'));
};

const ensureDescriptionTemplate = (value = '', context = {}) => {
  const template = getIssueDescriptionTemplate(context);
  const labels = getTemplateLabels(template);
  const rawText = normalizeTextareaValue(value);
  const lines = rawText.length ? rawText.split('\n') : [];

  const missingLabels = labels.filter(
    (label) => !lines.some((line) => line.trimStart().startsWith(label))
  );

  if (!missingLabels.length) {
    return rawText;
  }

  return [...missingLabels, ...lines].join('\n');
};

const parseDescriptionValues = (value = '', context = {}) => {
  const labels = getTemplateLabels(getIssueDescriptionTemplate(context));
  const lines = normalizeTextareaValue(value).split('\n');

  return labels.reduce((values, label) => {
    const matchedLine = lines.find((line) => line.trimStart().startsWith(label));
    values[label] = matchedLine ? matchedLine.trimStart().slice(label.length).trimStart() : '';
    return values;
  }, {});
};

const buildDescriptionFromValues = (values = {}, context = {}) => {
  const labels = getTemplateLabels(getIssueDescriptionTemplate(context));

  return labels
    .map((label) => `${label}${values[label] ? ` ${values[label]}` : ''}`)
    .join('\n');
};

const updateDescriptionLabelValue = (value = '', context = {}, label = '', nextValue = '') => {
  const currentValues = parseDescriptionValues(value, context);

  return buildDescriptionFromValues(
    {
      ...currentValues,
      [label]: normalizeTextareaValue(nextValue).replace(/\n/g, ' ').slice(0, 320),
    },
    context
  );
};

const getContextPrefillForLabel = () => '';

const applyDescriptionContextPrefills = (value = '', context = {}, previousContext = {}) => {
  const labels = getTemplateLabels(getIssueDescriptionTemplate(context));
  const values = parseDescriptionValues(value, context);

  labels.forEach((label) => {
    const nextPrefill = getContextPrefillForLabel(label, context);
    const previousPrefill = getContextPrefillForLabel(label, previousContext);

    if (!nextPrefill) return;

    if (!values[label] || values[label] === previousPrefill) {
      values[label] = nextPrefill;
    }
  });

  return buildDescriptionFromValues(values, context);
};

const getDescriptionInputPlaceholder = (label = '') => {
  const lowerLabel = normalize(label);

  if (lowerLabel.includes('application name')) return 'Type the application or system name';
  if (lowerLabel.includes('request type')) return 'Example: installation, update, license, or activation';
  if (lowerLabel.includes('purpose')) return 'State the business purpose of the request';
  if (lowerLabel.includes('remarks')) return 'Add other important details or approval notes';
  if (lowerLabel.includes('anydesk')) return 'Enter AnyDesk number';
  if (lowerLabel.includes('summary')) return 'Briefly describe the issue';
  if (lowerLabel.includes('error') || lowerLabel.includes('warning') || lowerLabel.includes('signal')) {
    return 'Type the exact error, warning, or indicator';
  }
  if (lowerLabel.includes('started')) return 'When did the issue start?';
  if (lowerLabel.includes('connection')) return 'Example: LAN, Wi-Fi, USB, or network';
  if (lowerLabel.includes('affected')) return 'Type the affected user, area, or number of users';
  if (lowerLabel.includes('module')) return 'Type the affected module or transaction';
  if (lowerLabel.includes('account') || lowerLabel.includes('username')) return 'Type the affected account or username';
  if (lowerLabel.includes('access')) return 'Type the requested access or role';
  if (lowerLabel.includes('saar')) return 'Type the SAAR reference or approval detail';
  if (lowerLabel.includes('approver')) return 'Type the approver or request reference';

  return 'Type details here';
};

const sanitizeDescriptionForSubmit = (value = '', context = {}) =>
  ensureDescriptionTemplate(value, context).trim();

const hasMeaningfulDescriptionDetails = (value = '', context = {}) => {
  const template = getIssueDescriptionTemplate(context);
  const labels = getTemplateLabels(template);
  const lines = normalizeTextareaValue(value)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const detailLines = lines.map((line) => {
    const matchedLabel = labels.find((label) => line.startsWith(label));

    if (!matchedLabel) return line;

    return line.replace(matchedLabel, '').trim();
  });

  return detailLines.some((line) => line.length >= 3);
};

const getIssueDescriptionHint = (form = {}) => {
  const combined = getIssueContextText(form);

  if (hasAnyKeyword(combined, ['application installation', 'application update', 'installation or update', 'software license', 'activation'])) {
    return 'For installation or update requests, include the application name, request type, purpose, and remarks. No error signal is required.';
  }

  if (isMbwinRequest(form)) {
    return 'For MBWIN concerns, include the account, requested access, affected module, error, and SAAR reference.';
  }

  if (hasAnyKeyword(combined, ['network', 'internet', 'wi-fi', 'wifi', 'voucher', 'router', 'modem'])) {
    return 'For network concerns, include the connection type, affected area, number of users, and status/error.';
  }

  if (hasAnyKeyword(combined, ['printer', 'scanner', 'print', 'scan'])) {
    return 'For printer or scanner concerns, include the model, connection type, affected user, and error.';
  }

  if (hasAnyKeyword(combined, ['computer', 'desktop', 'laptop', 'hardware', 'monitor', 'ups', 'no power'])) {
    return 'For hardware concerns, describe the problem, when it started, and any error or indicator.';
  }

  if (hasAnyKeyword(combined, ['account', 'access', 'password', 'login', 'permission', 'role'])) {
    return 'For account concerns, include the affected system, username, access needed, error, and approver if applicable.';
  }

  return 'Complete the short issue description fields so ICT can review the concern faster.';
};

const getNewTicketForm = (user = {}) => ({
  ...emptyForm,
  branch: user.branch || user.office || '',
  department: user.department || '',
  contactNumber: user.phone || '',
  description: DEFAULT_DESCRIPTION_TEMPLATE,
  photoAttachments: [],
  saarAttachment: null,
  sla: 'Low',
  impact: getSelectedSlaOption('Low').impact,
});

/* =========================
   IMPACT DETECTION
========================= */

const detectOperationalImpact = (form = {}) => {
  const combined = [
    form.supportCategory,
    form.concernType,
    form.deviceName,
    form.description,
  ]
    .map(normalize)
    .join(' ');

  if (
    hasAnyKeyword(combined, [
      'ransomware', 'data breach', 'breach', 'security incident', 'data loss',
      'database down', 'server down', 'system down', 'core system down',
      'all branch down', 'entire branch down', 'no operation', 'cannot operate',
      'cannot transact', 'transaction stopped', 'service stopped', 'production stopped',
    ])
  ) {
    return 'Core operation affected';
  }

  if (
    hasAnyKeyword(combined, [
      'branch operation', 'branch affected', 'all users', 'whole branch',
      'no internet', 'internet outage', 'network outage', 'router down', 'modem down',
      'main printer down', 'power supply', 'server', 'backup failed',
    ])
  ) {
    return 'Branch operation affected';
  }

  if (
    hasAnyKeyword(combined, [
      'department affected', 'department', 'multiple users', 'several users',
      'team affected', 'shared printer', 'shared scanner', 'common area',
    ])
  ) {
    return 'Department affected';
  }

  if (
    hasAnyKeyword(combined, [
      'mbwin', 'mb win', 'printer', 'scanner', 'network connection',
      'wi-fi', 'wifi', 'voucher', 'account', 'access', 'password',
      'login', 'email', 'outlook', 'application error', 'software error',
    ])
  ) {
    return 'Multiple users affected';
  }

  return 'Single user affected';
};

/* =========================
   HELPERS
========================= */

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

let portalBodyScrollLockCount = 0;
let portalBodyScrollLockSnapshot = null;

function useBodyScrollLock(active) {
  useEffect(() => {
    if (!active || typeof document === 'undefined') return undefined;

    const body = document.body;
    const root = document.documentElement;

    if (portalBodyScrollLockCount === 0) {
      const scrollbarWidth = window.innerWidth - root.clientWidth;

      portalBodyScrollLockSnapshot = {
        bodyOverflow: body.style.overflow,
        rootOverflow: root.style.overflow,
        bodyPaddingRight: body.style.paddingRight,
      };

      body.style.overflow = 'hidden';
      root.style.overflow = 'hidden';

      if (scrollbarWidth > 0) {
        body.style.paddingRight = `${scrollbarWidth}px`;
      }
    }

    portalBodyScrollLockCount += 1;

    return () => {
      portalBodyScrollLockCount = Math.max(0, portalBodyScrollLockCount - 1);

      if (portalBodyScrollLockCount === 0 && portalBodyScrollLockSnapshot) {
        body.style.overflow = portalBodyScrollLockSnapshot.bodyOverflow;
        root.style.overflow = portalBodyScrollLockSnapshot.rootOverflow;
        body.style.paddingRight = portalBodyScrollLockSnapshot.bodyPaddingRight;
        portalBodyScrollLockSnapshot = null;
      }
    };
  }, [active]);
}

const canEmployeeEditTicket = (ticket = {}) => {
  if (ticket.employeeEditLocked) return false;

  const status = normalize(ticket.status);
  const editableStatuses = ['created', 'pending', 'modified'];
  const hasTechnician = Boolean(String(ticket.technician || '').trim()) && ticket.technician !== 'Unassigned';
  const hasStarted = Boolean(ticket.workStartedAt);
  const hasAction = Boolean(
    String(ticket.actionTaken || '').trim() ||
      String(ticket.adminRemarks || '').trim() ||
      String(ticket.resolution || '').trim()
  );

  return editableStatuses.includes(status) && !hasTechnician && !hasStarted && !hasAction;
};

/* =========================
   ICONS
========================= */

const MonoIcon = ({ icon: IconComponent }) => (
  <IconComponent className="admin-mono-icon" aria-hidden="true" />
);

const Icon = {
  Dashboard: () => <LayoutDashboard className="sidebar-nav-icon" aria-hidden="true" />,
  Profile: () => <UserRound className="sidebar-nav-icon" aria-hidden="true" />,
  Helpdesk: () => <Ticket className="sidebar-nav-icon" aria-hidden="true" />,
  OtherServices: () => <Wrench className="sidebar-nav-icon" aria-hidden="true" />,
  HRMax: () => <BriefcaseBusiness className="sidebar-nav-icon" aria-hidden="true" />,
  Connect: () => <Link2 className="sidebar-nav-icon" aria-hidden="true" />,
  Logout: () => <LogOut className="sidebar-nav-icon" aria-hidden="true" />,
  Bell: () => <Bell className="icon-bell" aria-hidden="true" />,
};

const employeeTransitionLabels = {
  dashboard: 'Opening employee dashboard...',
  profile: 'Loading employee profile...',
  helpdesk: 'Preparing helpdesk workspace...',
  otherServices: 'Opening other services...',
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
    <main className="portal-main portal-app-main">
      <div className="portal-shell">
        <section className="panel-card glass profile-status-panel">
          <div className="section-heading">
            <span className="section-kicker">Access Restricted</span>
            <h2>{INACTIVE_ACCOUNT_MESSAGE}</h2>
            <p>You will be redirected to the home page in 5 seconds.</p>
          </div>
        </section>
      </div>
    </main>
  );
}

/* =========================
   SIDEBAR
========================= */

function Sidebar({ active, onNav, onLogout, open }) {
  const items = [
    { key: 'dashboard', label: 'Dashboard', Icon: Icon.Dashboard },
    { key: 'profile', label: 'My Profile', Icon: Icon.Profile },
    { key: 'helpdesk', label: 'Helpdesk', Icon: Icon.Helpdesk },
    { key: 'otherServices', label: 'Other Services', Icon: Icon.OtherServices },
  ];

  return (
    <aside className={`portal-sidebar${open ? ' open' : ''}`}>
      <div className="sidebar-brand">
        <span className="sidebar-eyebrow">MEMPCO</span>
        <h3 className="sidebar-title">Employee Portal</h3>
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
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

        <a className="sidebar-nav-btn sidebar-external-link" href={HRMAX_ROUTE}>
          <Icon.HRMax />
          HRMax
          <ExternalLink className="sidebar-trailing-icon" aria-hidden="true" />
        </a>

        <a
          className="sidebar-nav-btn sidebar-external-link"
          href="https://www.facebook.com/groups/379262493052189"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open MEMPCOnnected Facebook group"
        >
          <Icon.Connect />
          MEMPCOnnected
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

function PhotoAttachmentGallery({ photos = [], emptyText = 'No photo attachments.' }) {
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

        return (
          <div key={photo.id || photo.path || `${fileName}-${index}`} className="attached-photo-card-wrap">
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

            {source && (
              <a className="attached-photo-save" href={source} download={fileName}>
                Save Image
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}

function IssueDescriptionBuilder({ form, onChange }) {
  const labels = getTemplateLabels(getIssueDescriptionTemplate(form));
  const values = parseDescriptionValues(form.description, form);
  const totalLength = normalizeTextareaValue(form.description).length;

  return (
    <div className="issue-description-composer" id="ticket-desc-builder" aria-label="Issue description fields">
      <div className="issue-description-paper">
        {labels.map((label) => {
          const value = values[label] || '';
          const fieldId = `issue-field-${slugify(label)}`;
          const isLongField = label.toLowerCase().includes('summary') || label.toLowerCase().includes('problem');

          return (
            <div key={label} className="issue-description-line">
              <label className="issue-description-label" htmlFor={fieldId}>
                {label}
              </label>

              <textarea
                id={fieldId}
                className="issue-description-answer"
                value={value}
                rows={isLongField ? 2 : 1}
                onChange={(e) => onChange(label, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.code === 'Space') {
                    e.stopPropagation();
                  }
                }}
                placeholder={getDescriptionInputPlaceholder(label)}
                maxLength={320}
              />
            </div>
          );
        })}
      </div>

      <div className="char-count">{totalLength}/1200 characters</div>
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

function StatCard({ icon, label, value, meta }) {
  return (
    <article className="stat-card glass">
      <div className="stat-card-head">
        <span className="stat-icon"><MonoIcon icon={icon} /></span>
        <span className="stat-label">{label}</span>
      </div>
      <p className="stat-value">{value}</p>
      <span className="stat-meta">{meta}</span>
    </article>
  );
}

/* =========================
   TICKET CONVERSATION PANEL
   — mirrors admin TicketConversationPanel exactly
========================= */

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
      messageList.scrollTo({ top: messageList.scrollHeight, behavior });
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
              'Employee and ICT communication'
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
                  <span>{item.senderRole} · {item.createdAt}</span>
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
          placeholder={canSend ? 'Write a reply or update for ICT...' : disabledMessage}
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

/* =========================
   EMPLOYEE TICKET DETAIL MODAL
   — structure mirrors admin TicketActionModal exactly
========================= */

function EmployeeTicketDetailModal({
  ticket,
  user,
  messages,
  messageDraft,
  messagePhotos,
  messageError,
  isSendingMessage,
  shouldShowConversation,
  canSendConversationMessage,
  unreadCount,
  isChatMinimized,
  onClose,
  onEdit,
  onChatOpen,
  onChatClose,
  onMessageChange,
  onPhotoChange,
  onRemovePhoto,
  onSend,
}) {
  const canEditTicket = canEmployeeEditTicket(ticket);
  const lockReason =
    ticket.employeeLockReason ||
    ticket.employeeEditLockReason ||
    'Locked because ICT is already handling this ticket.';
  const lastUpdated = ticket.lastUpdated || ticket.lastEmployeeUpdate || ticket.date || ticket.createdAt || 'Not available';
  const isChatOpen = shouldShowConversation && !isChatMinimized;

  return (
    <div
      className={[
        'modal-overlay',
        'employee-ticket-action-overlay',
        isChatOpen ? 'chat-open' : '',
      ].filter(Boolean).join(' ')}
      role="dialog"
      aria-modal="true"
      aria-label="Ticket details"
    >
      <article className="modal-box glass employee-admin-modal-box employee-ticket-modal">
        {/* Header — mirrors admin ticket-action-head */}
        <div className="admin-modal-head ticket-action-head">
          <div>
            <div className="ticket-action-title-row">
              <span className="ticket-id">{getTicketDisplayCode(ticket)}</span>
              <div className="ticket-action-title-copy">
                <h3>{ticket.concernType}</h3>
                <p>{ticket.branch} - {ticket.department}</p>
              </div>
            </div>
          </div>

          <button type="button" className="admin-modal-close" onClick={onClose} aria-label="Close modal">
            &times;
          </button>
        </div>

        {/* Status panel — mirrors admin ticket-action-status-panel */}
        <div className="admin-workflow-box ticket-action-status-panel">
          <div className="ticket-action-workflow-copy">
            <span className="section-kicker">Employee Ticket</span>
            <h4>{canEditTicket ? 'This request can still be edited.' : 'ICT is already handling this request.'}</h4>
            <p>{canEditTicket ? 'You may update the ticket while it is still pending review.' : lockReason}</p>
          </div>

          <div className="employee-ticket-status-stack" aria-label="Ticket status">
            <span className={`status ${slugify(ticket.status)}`}>{ticket.status}</span>
            <span className={`priority ${slugify(ticket.sla)}`}>{ticket.sla}</span>
            {isMbwinRequest(ticket) && <span className="status saar">SAAR Required</span>}
          </div>
        </div>

        {/* Info grid — mirrors admin ticket-action-info-grid */}
        <div className="admin-modal-grid ticket-action-info-grid">
          <div className="ticket-meta-cell">
            <span>Ticket Code</span>
            <p>{getTicketDisplayCode(ticket)}</p>
          </div>
          <div className="ticket-meta-cell">
            <span>Branch</span>
            <p>{ticket.branch || 'Not specified'}</p>
          </div>
          <div className="ticket-meta-cell">
            <span>Department</span>
            <p>{ticket.department || 'Not specified'}</p>
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
            <p>{ticket.deviceName || 'Not specified'}</p>
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
            <p>{ticket.contactNumber || 'Not specified'}</p>
          </div>
          <div className="ticket-meta-cell">
            <span>Impact</span>
            <p>{ticket.impact || 'Not specified'}</p>
          </div>
          <div className="ticket-meta-cell">
            <span>Assigned Technician</span>
            <p>{ticket.technician || 'Unassigned'}</p>
          </div>
        </div>

        {/* Details row — mirrors admin ticket-action-details-row */}
        <div className="ticket-action-details-row">
          <div className="admin-description-box ticket-action-description">
            <span>Description of Problem</span>
            <p style={{ whiteSpace: 'pre-wrap' }}>{ticket.description || 'No description provided.'}</p>
          </div>

          <div className="ticket-action-control-stack employee-ticket-update-stack">
            <div className="employee-update-note">
              <span>ICT Action</span>
              <p>{ticket.actionTaken || 'No action recorded yet.'}</p>
            </div>
            <div className="employee-update-note">
              <span>Remarks</span>
              <p>{ticket.adminRemarks || 'No remarks yet.'}</p>
            </div>
            <div className="employee-update-note">
              <span>Resolution</span>
              <p>{ticket.resolution || 'No resolution yet.'}</p>
            </div>
          </div>
        </div>

        {/* Attachments */}
        {(ticket.saarAttachment?.name || ticket.photoAttachments?.length > 0) && (
          <div className="ticket-action-attachments-row">
            {ticket.saarAttachment?.name && (
              <div className="admin-attachment-box">
                <div>
                  <strong>SAAR PDF Attachment</strong>
                  <p>{ticket.saarAttachment.name} - {ticket.saarAttachment.sizeLabel || 'PDF file'}</p>
                </div>
                {ticket.saarAttachment.dataUrl && (
                  <a href={ticket.saarAttachment.dataUrl} target="_blank" rel="noopener noreferrer">
                    Open PDF
                  </a>
                )}
              </div>
            )}

            {ticket.photoAttachments?.length > 0 && (
              <div className="admin-attachment-box admin-photo-attachment-box">
                <div>
                  <strong>Photo / Screenshot Attachments</strong>
                  <p>{ticket.photoAttachments.length} photo{ticket.photoAttachments.length === 1 ? '' : 's'} attached for ICT review</p>
                </div>
                <PhotoAttachmentGallery photos={ticket.photoAttachments} emptyText="" />
              </div>
            )}
          </div>
        )}

        <p className="modal-date-note">Last updated: {lastUpdated}</p>

        {/* Footer — mirrors admin modal-footer */}
        <div className="modal-footer">
          <button type="button" className="modal-btn cancel" onClick={onClose}>
            Close
          </button>

          {canEditTicket ? (
            <button type="button" className="modal-btn confirm" onClick={onEdit}>
              <MonoIcon icon={PenLine} />
              Edit Ticket
            </button>
          ) : (
            <span className="ticket-locked-pill modal-locked-pill">{lockReason}</span>
          )}
        </div>
      </article>

      {/* Floating chat — shown when chat is open (same pattern as admin) */}
      {isChatOpen && (
        <TicketConversationPanel
          ticket={ticket}
          currentUser={user}
          messages={messages}
          messageDraft={messageDraft}
          messagePhotos={messagePhotos}
          messageError={messageError}
          isSending={isSendingMessage}
          floating
          canSend={canSendConversationMessage}
          unreadCount={unreadCount}
          onClose={onChatClose}
          onMessageChange={onMessageChange}
          onPhotoChange={onPhotoChange}
          onRemovePhoto={onRemovePhoto}
          onSend={onSend}
        />
      )}

      {/* Chat launcher button — shown when chat is minimized (same as admin) */}
      {shouldShowConversation && isChatMinimized && (
        <button
          type="button"
          className="ticket-chat-launcher"
          onClick={onChatOpen}
          aria-label="Open ticket conversation"
        >
          <MonoIcon icon={MessageCircle} />
          {unreadCount > 0 && <span>{unreadCount}</span>}
        </button>
      )}
    </div>
  );
}

/* =========================
   DASHBOARD VIEW
========================= */

function DashboardView({ user, tickets, openTickets, onGoTo }) {
  const resolvedCount = tickets.filter((ticket) => ticket.status === 'Resolved').length;
  const pendingCount = tickets.filter((ticket) => ['Created', 'Pending', 'Modified'].includes(ticket.status)).length;
  const urgentCount = tickets.filter(
    (ticket) => ['High', 'Critical'].includes(ticket.sla) && isUnresolved(ticket.status)
  ).length;

  const latestTicket = tickets[0];
  const latestSubmittedDate = latestTicket?.createdAt || latestTicket?.date || 'Not available';
  const latestUpdatedDate =
    latestTicket?.lastUpdated ||
    latestTicket?.lastEmployeeUpdate ||
    latestTicket?.updatedAt ||
    latestTicket?.date ||
    latestTicket?.createdAt ||
    'No update recorded';
  const supportCategoryEntries = Object.entries(HELPDESK_CATEGORY_CONCERNS);

  return (
    <div className="dashboard-view">
      <section className="panel-card glass hero-panel employee-hero-panel admin-hero-panel">
        <div className="hero-copy">
          <span className="section-kicker">Employee IT Support</span>
          <h2>Your helpdesk workspace for faster ICT assistance.</h2>
          <p>
            Submit complete service requests, attach required documents, monitor ticket progress,
            and review ICT actions in one employee support center.
          </p>
        </div>

        <img className="employee-hero-logo admin-hero-logo" src="/Logos/Logo.png" alt="MEMPCO logo" />

        <div className="hero-meta">
          <span className="meta-pill">Manual SLA Selection</span>
          <span className="meta-pill">{openTickets} Active</span>
        </div>
      </section>

      <section className="stats-grid" aria-label="Key statistics">
        {[
          { icon: ShieldCheck, label: 'Employee Status', value: user.status || 'Active', meta: 'Authorized employee' },
          { icon: FileText, label: 'My Tickets', value: tickets.length, meta: 'Submitted requests' },
          { icon: Clock3, label: 'Pending Review', value: pendingCount, meta: 'Awaiting ICT action' },
          { icon: Wrench, label: 'Urgent Active', value: urgentCount, meta: `${resolvedCount} resolved` },
        ].map((item) => <StatCard key={item.label} {...item} />)}
      </section>

      <section className="dashboard-support-layout" aria-label="Dashboard helpdesk guide and latest activity">
        <article className="panel-card glass dashboard-support-main">
          <div className="section-head dashboard-support-head">
            <div>
              <span className="section-kicker">Helpdesk Information</span>
              <h3>ICT Support Guide</h3>
            </div>
            <button type="button" className="quick-action-btn primary dashboard-head-action" onClick={() => onGoTo('helpdesk', 'submit')}>
              <MonoIcon icon={Send} />
              Submit Ticket
            </button>
          </div>

          <p className="dashboard-guide-intro">
            Use the helpdesk only for ICT-related concerns. The Support Category controls the available Concern Type options,
            so choose the category first before completing the rest of the ticket details.
          </p>

          <div className="dashboard-info-band dashboard-info-band-top">
            <div>
              <span className="section-kicker">SLA &amp; Operational Impact</span>
              <p>
                Select the SLA level based on how wide the concern affects work. The operational impact follows the selected SLA and is saved with the ticket.
              </p>
            </div>

            <div className="dashboard-sla-mini-grid">
              {SLA_PICKER_OPTIONS.map((option) => (
                <span key={option.level} className={`dashboard-sla-pill ${slugify(option.level)}`}>
                  <strong>{option.level}</strong>
                  {option.impact}
                </span>
              ))}
            </div>
          </div>

          <div className="support-guide-grid">
            {supportCategoryEntries.map(([category, concernList]) => (
              <section key={category} className="support-guide-card">
                <div className="support-guide-card-head">
                  <span className="support-guide-icon"><MonoIcon icon={Ticket} /></span>
                  <div>
                    <span>Support Category</span>
                    <h4>{category}</h4>
                  </div>
                </div>

                <ul className="support-guide-concerns">
                  {concernList.map((concern) => (
                    <li key={concern}>{concern}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <div className="dashboard-guide-examples" aria-label="Helpdesk submission examples">
            <article className="dashboard-guide-example-card">
              <span>Software example</span>
              <p>
                For Application Installation or Update, the form asks for Application Name, Request Type, Purpose, and Remarks instead of Error or Signal.
              </p>
            </article>
            <article className="dashboard-guide-example-card">
              <span>Network example</span>
              <p>
                For Internet or Wi-Fi concerns, include the connection type, affected area, users affected, summary, and status or error.
              </p>
            </article>
            <article className="dashboard-guide-example-card">
              <span>Hardware example</span>
              <p>
                For Desktop, Laptop, Printer, Scanner, Monitor, or Power concerns, include the device, problem summary, when it started, and the error or signal.
              </p>
            </article>
            <article className="dashboard-guide-example-card">
              <span>MBWIN reminder</span>
              <p>
                MBWIN account requests are under User Account Management and require an approved SAAR PDF attachment before submission.
              </p>
            </article>
          </div>
        </article>

        <aside className="dashboard-support-side">
          <section className="panel-card glass dashboard-side-panel latest-activity-panel">
            <div className="section-head">
              <div>
                <span className="section-kicker">Ticket Updates</span>
                <h3>Latest Activity</h3>
              </div>
            </div>

            {latestTicket ? (
              <article className="latest-activity-card">
                <div className="ticket-header">
                  <div className="ticket-header-left">
                    <h4>{latestTicket.concernType || 'Helpdesk Ticket'}</h4>
                  </div>
                  <span className="ticket-date">{latestSubmittedDate}</span>
                  <span className="ticket-id">{getTicketDisplayCode(latestTicket)}</span>
                </div>

                <div className="ticket-badges">
                  <span className={`status ${slugify(latestTicket.status || 'Created')}`}>{latestTicket.status || 'Created'}</span>
                  <span className={`priority ${slugify(latestTicket.sla || latestTicket.priority || 'Low')}`}>
                    {latestTicket.sla || latestTicket.priority || 'Low'}
                  </span>
                </div>

                <div className="dashboard-ticket-info-grid">
                  <div className="dashboard-ticket-meta-cell">
                    <span>Category</span>
                    <p>{latestTicket.supportCategory || 'Not specified'}</p>
                  </div>
                  <div className="dashboard-ticket-meta-cell">
                    <span>Technician</span>
                    <p>{latestTicket.technician || 'Unassigned'}</p>
                  </div>
                  <div className="dashboard-ticket-meta-cell">
                    <span>Last Updated</span>
                    <p>{latestUpdatedDate}</p>
                  </div>
                </div>

                <p className="ticket-description dashboard-latest-description">
                  {latestTicket.description || 'No description provided.'}
                </p>

                <button type="button" className="quick-action-btn primary" onClick={() => onGoTo('helpdesk', 'tickets')}>
                  <MonoIcon icon={Eye} />
                  View Ticket Details
                </button>
              </article>
            ) : (
              <div className="empty-state compact">
                <div className="empty-icon"><MonoIcon icon={Ticket} /></div>
                <h4>No ticket yet</h4>
                <p>Create your first support ticket so ICT can review your concern.</p>
                <button type="button" className="quick-action-btn primary" onClick={() => onGoTo('helpdesk', 'submit')}>
                  <MonoIcon icon={Send} />
                  Submit Ticket
                </button>
              </div>
            )}
          </section>

          <section className="panel-card glass dashboard-side-panel submission-guide-panel">
            <div className="section-head">
              <div>
                <span className="section-kicker">ICT Support Guide</span>
                <h3>Submission Guide</h3>
              </div>
            </div>

            <div className="submission-guide-list">
              <div className="submission-guide-item">
                <span className="submission-guide-number">01</span>
                <p>Complete the required ticket fields: Branch, Department, Device or System, Contact Number, Support Category, and Concern Type.</p>
              </div>
              <div className="submission-guide-item">
                <span className="submission-guide-number">02</span>
                <p>Select the SLA level manually. The operational impact will follow your selected SLA level.</p>
              </div>
              <div className="submission-guide-item">
                <span className="submission-guide-number">03</span>
                <p>Fill in the issue description fields shown for the selected concern type. Installation or update requests ask for Application Name, Request Type, Purpose, and Remarks.</p>
              </div>
              <div className="submission-guide-item">
                <span className="submission-guide-number">04</span>
                <p>For MBWIN-related requests, attach the approved SAAR PDF. Photos or screenshots are optional and limited to {PHOTO_MAX_COUNT} files.</p>
              </div>
            </div>

            <div className="dashboard-other-services-note">
              <strong>Other Services</strong>
              <p>
                Use Burnout for unit preparation requests, or choose Other and type the exact service you need.
              </p>
              <button type="button" className="quick-action-btn" onClick={() => onGoTo('otherServices')}>
                <MonoIcon icon={Wrench} />
                Open Other Services
              </button>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}


/* =========================
   PROFILE VIEW
========================= */

function ProfileView({ user, onGoTo }) {
  const employeeStatus = user.status || 'Active';
  const assignedOffice = user.branch || user.office || 'Not assigned';
  const designation = user.designation || 'Job title not provided';
  const profileRows = [
    { label: 'Employee ID', value: user.employeeId || 'Not provided', icon: IdCard },
    { label: 'Job Title', value: designation, icon: BriefcaseBusiness },
    { label: 'Department', value: user.department || 'Not assigned', icon: Building2 },
    { label: 'Assigned Office', value: assignedOffice, icon: MapPin },
    { label: 'Email Address', value: user.email || 'Not provided', icon: Mail },
    { label: 'Phone Number', value: user.phone || 'Not provided', icon: Phone },
  ];

  return (
    <div className="profile-view">
      <section className="panel-card glass profile-banner premium-profile-banner">
        <div className="profile-banner-main premium-profile-main">
          <div className="avatar large premium-profile-avatar">{user.initials}</div>
          <div className="profile-banner-copy premium-profile-copy">
            <span className="section-kicker">My Profile</span>
            <h2>{user.name}</h2>
            <div className="profile-identity-line" aria-label="Employee identity summary">
              <span><MonoIcon icon={BriefcaseBusiness} />{designation}</span>
              <span><MonoIcon icon={Building2} />{user.department || 'Department not assigned'}</span>
              <span><MonoIcon icon={MapPin} />{assignedOffice}</span>
            </div>
          </div>
        </div>

        <div className="profile-banner-pills premium-profile-pills">
          <span className="profile-pill"><MonoIcon icon={IdCard} />{user.employeeId || 'No employee ID'}</span>
          <span className="profile-pill active"><MonoIcon icon={UserRoundCheck} />{employeeStatus}</span>
        </div>
      </section>

      <div className="profile-columns premium-profile-columns">
        <section className="panel-card glass profile-detail-panel">
          <div className="section-head">
            <div>
              <span className="section-kicker">Employee Record</span>
              <h3>Personal &amp; Work Details</h3>
            </div>
          </div>

          <div className="profile-detail-grid">
            {profileRows.map((row) => (
              <article key={row.label} className="profile-detail-card">
                <span className="profile-detail-icon"><MonoIcon icon={row.icon} /></span>
                <div>
                  <span>{row.label}</span>
                  <p>{row.value}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="profile-side-panel-stack">
          <section className="panel-card glass profile-status-panel">
            <div className="profile-status-list">
              <div>
                <span>Branch</span>
                <strong>{assignedOffice}</strong>
              </div>
              <div>
                <span>Department</span>
                <strong>{user.department || 'Not assigned'}</strong>
              </div>
              <div>
                <span>Employee ID</span>
                <strong>{user.employeeId || 'Not provided'}</strong>
              </div>
            </div>
          </section>

          <section className="panel-card glass profile-action-panel">
            <div className="section-head">
              <div>
                <span className="section-kicker">Account Actions</span>
                <h3>Shortcuts</h3>
              </div>
            </div>

            <div className="profile-side-stack">
              <button type="button" className="quick-action-btn primary" onClick={() => onGoTo('helpdesk', 'submit')}>
                <MonoIcon icon={Ticket} />
                Submit Helpdesk Ticket
              </button>
              <button type="button" className="quick-action-btn" onClick={() => onGoTo('helpdesk', 'tickets')}>
                <MonoIcon icon={Eye} />
                Review My Tickets
              </button>
              <button type="button" className="quick-action-btn" onClick={() => onGoTo('otherServices')}>
                <MonoIcon icon={Wrench} />
                Open Other Services
              </button>
              <button type="button" className="quick-action-btn" onClick={() => onGoTo('dashboard')}>
                <MonoIcon icon={LayoutDashboard} />
                Return to Dashboard
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

/* =========================
   HELPDESK VIEW
========================= */

function HelpdeskView({ user, tickets, reloadTickets, initialTab }) {
  const [tab, setTab] = useState(initialTab || 'tickets');
  const [form, setForm] = useState(() => getNewTicketForm(user));
  const [editingId, setEditingId] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [successNotice, setSuccessNotice] = useState(null);
  const [viewTicket, setViewTicket] = useState(null);
  const [formError, setFormError] = useState('');
  const [ticketPage, setTicketPage] = useState(1);

  // Conversation state — matches admin pattern exactly
  const [ticketMessages, setTicketMessages] = useState([]);
  const [messageDraft, setMessageDraft] = useState('');
  const [messagePhotos, setMessagePhotos] = useState([]);
  const [messageError, setMessageError] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isChatMinimized, setIsChatMinimized] = useState(true);
  const [unreadConversationCount, setUnreadConversationCount] = useState(0);
  const [isLoadingTicketDetails, setIsLoadingTicketDetails] = useState(false);

  const isChatMinimizedRef = useRef(true);
  const currentUserIdRef = useRef(user?.id || '');
  const ticketMessageIdsRef = useRef(new Set());

  const activeCount = tickets.filter((ticket) => isUnresolved(ticket.status)).length;
  const resolvedCount = tickets.filter((ticket) => ticket.status === 'Resolved').length;
  const mbwinRequired = isMbwinRequest(form);
  const selectedSlaOption = useMemo(() => getSelectedSlaOption(form.sla), [form.sla]);
  const issueDescriptionHint = useMemo(() => getIssueDescriptionHint(form), [form]);
  const concernOptions = useMemo(() => getConcernOptionsForCategory(form.supportCategory), [form.supportCategory]);
  const pageSize = 3;
  const totalPages = Math.max(1, Math.ceil(tickets.length / pageSize));
  const currentPage = Math.min(ticketPage, totalPages);
  const pagedTickets = tickets.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const goToTicketPage = (page) => setTicketPage(Math.min(Math.max(page, 1), totalPages));

  const ticketHasAssignedStaff = viewTicket
    ? Boolean(String(viewTicket.technician || '').trim()) && normalize(viewTicket.technician) !== 'unassigned'
    : false;

  const conversationStatusAllowsReply = viewTicket
    ? isUnresolved(viewTicket.status) && !['resolved', 'canceled', 'cancelled'].includes(normalize(viewTicket.status))
    : false;

  const canSendConversationMessage = Boolean(
    viewTicket &&
      conversationStatusAllowsReply &&
      (canTicketAcceptMessages(viewTicket) || isTicketBeingHandled(viewTicket) || ticketHasAssignedStaff)
  );

  const shouldShowConversation = Boolean(viewTicket);

  useBodyScrollLock(showConfirm || Boolean(successNotice));

  useEffect(() => {
    if (viewTicket || showConfirm || successNotice || typeof document === 'undefined') return undefined;

    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    document.body.style.paddingRight = '';

    return undefined;
  }, [viewTicket, showConfirm, successNotice]);

  // Keep refs in sync — same as admin
  useEffect(() => {
    isChatMinimizedRef.current = isChatMinimized;

    if (!isChatMinimized) {
      setUnreadConversationCount(0);
    }
  }, [isChatMinimized]);

  useEffect(() => {
    currentUserIdRef.current = user?.id || '';
  }, [user?.id]);

  useEffect(() => {
    if (ticketPage > totalPages) {
      setTicketPage(totalPages);
    }
  }, [ticketPage, totalPages]);

  // Subscribe to messages and ticket updates — same pattern as admin
  useEffect(() => {
    if (!viewTicket?.id) {
      setTicketMessages([]);
      setMessageDraft('');
      setMessagePhotos([]);
      setMessageError('');
      ticketMessageIdsRef.current = new Set();
      return undefined;
    }

    let cancelled = false;
    ticketMessageIdsRef.current = new Set();

    const loadMessages = async () => {
      try {
        const messages = await getTicketMessages(viewTicket.id);

        if (!cancelled) {
          ticketMessageIdsRef.current = new Set(messages.map((m) => m.id));
          setTicketMessages(messages);
          setUnreadConversationCount(0);
          setMessageError('');
        }
      } catch (error) {
        if (!cancelled) {
          setTicketMessages([]);
          setMessageError(error.message || 'Unable to load the ticket conversation.');
        }
      }
    };

    void loadMessages();

    const unsubscribeMessages = subscribeToTicketMessages(viewTicket.id, (newMessage) => {
      const alreadyExists = ticketMessageIdsRef.current.has(newMessage.id);

      if (!alreadyExists) {
        ticketMessageIdsRef.current.add(newMessage.id);
        setTicketMessages((current) => [...current, newMessage]);
      }

      const isIncoming = newMessage.senderId !== currentUserIdRef.current;

      if (!alreadyExists && isIncoming && isChatMinimizedRef.current) {
        setUnreadConversationCount((c) => c + 1);
      }
    });

    const unsubscribeTicket = subscribeToTicket(viewTicket.id, (updatedTicket) => {
      if (!cancelled) {
        setViewTicket(updatedTicket);
      }
    });

    return () => {
      cancelled = true;
      unsubscribeMessages();
      unsubscribeTicket();
    };
  }, [viewTicket?.id]);

  // Reset chat state when a new ticket is opened — same as admin
  useEffect(() => {
    setIsChatMinimized(true);
    setUnreadConversationCount(0);
  }, [viewTicket?.id]);

  useEffect(() => {
    if (editingId) return;

    setForm((current) => ({
      ...current,
      branch: current.branch || user.branch || user.office || '',
      department: current.department || user.department || '',
      contactNumber: current.contactNumber || user.phone || '',
    }));
  }, [editingId, user.branch, user.department, user.office, user.phone]);

  const handleFormChange = (field, value) => {
    setFormError('');

    setForm((prev) => {
      const next = { ...prev, [field]: value };

      if (field === 'supportCategory') {
        const nextConcernOptions = getConcernOptionsForCategory(value);

        if (!nextConcernOptions.includes(prev.concernType)) {
          next.concernType = '';
        }
      }

      if (['supportCategory', 'concernType'].includes(field)) {
        next.description = getIssueDescriptionTemplate(next);
      } else if (field === 'deviceName') {
        const nextTemplate = getIssueDescriptionTemplate(next);
        const baseDescription = isGeneratedDescriptionOnly(prev.description)
          ? nextTemplate
          : ensureDescriptionTemplate(prev.description, next);

        next.description = applyDescriptionContextPrefills(baseDescription, next, prev);
      }

      if (field === 'description') {
        next.description = normalizeTextareaValue(value);
      }

      return next;
    });
  };

  const handleDescriptionDetailChange = (label, value) => {
    setFormError('');

    setForm((prev) => ({
      ...prev,
      description: updateDescriptionLabelValue(prev.description, prev, label, value),
    }));
  };

  const handleSlaChange = (option) => {
    setFormError('');

    setForm((prev) => ({
      ...prev,
      sla: option.level,
      impact: option.impact,
    }));
  };

  const openTicketDetails = async (ticket) => {
    if (!ticket?.id) return;

    setIsLoadingTicketDetails(true);
    setFormError('');

    try {
      const fullTicket = await getTicket(ticket.id);
      setViewTicket(fullTicket || ticket);
    } catch (error) {
      setViewTicket(ticket);
      setFormError(error.message || 'Unable to load full ticket details. Showing available details only.');
    } finally {
      setIsLoadingTicketDetails(false);
    }
  };

  const handleSaarFileChange = async (e) => {
    const file = e.target.files?.[0];

    setFormError('');

    if (!file) {
      setForm((prev) => ({ ...prev, saarAttachment: null }));
      return;
    }

    const isPdf =
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      e.target.value = '';
      setForm((prev) => ({ ...prev, saarAttachment: null }));
      setFormError('SAAR attachment must be a PDF file.');
      return;
    }

    if (file.size > SAAR_MAX_SIZE) {
      e.target.value = '';
      setForm((prev) => ({ ...prev, saarAttachment: null }));
      setFormError('SAAR PDF must not exceed 4 MB.');
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);

      setForm((prev) => ({
        ...prev,
        saarAttachment: {
          name: file.name,
          type: file.type || 'application/pdf',
          size: file.size,
          sizeLabel: formatFileSize(file.size),
          uploadedAt: new Date().toLocaleString(),
          dataUrl,
        },
      }));
    } catch {
      e.target.value = '';
      setFormError('Unable to attach the selected PDF. Please try again.');
    }
  };

  const handlePhotoFilesChange = async (e) => {
    const files = e.target.files;
    setFormError('');

    try {
      const nextPhotos = await filesToPhotoAttachments(files, form.photoAttachments.length);

      setForm((prev) => ({
        ...prev,
        photoAttachments: [...prev.photoAttachments, ...nextPhotos],
      }));
    } catch (error) {
      setFormError(error.message || 'Unable to attach selected photos.');
    } finally {
      e.target.value = '';
    }
  };

  const removePhotoAttachment = (photoId) => {
    setForm((prev) => ({
      ...prev,
      photoAttachments: prev.photoAttachments.filter((photo) => photo.id !== photoId),
    }));
  };

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
    if (!viewTicket?.id) return;

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
      const sentMessage = await createTicketMessage(viewTicket.id, {
        sender: user,
        message: cleanMessage,
        attachments: messagePhotos,
      });

      ticketMessageIdsRef.current.add(sentMessage.id);
      setTicketMessages((current) => {
        const exists = current.some((m) => m.id === sentMessage.id);
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

  const validateForm = () => {
    const requiredFields = [
      ['branch', 'Branch / Location'],
      ['department', 'Department'],
      ['supportCategory', 'Support Category'],
      ['concernType', 'Concern Type'],
      ['deviceName', 'Device / Workstation'],
      ['contactNumber', 'Contact Number'],
      ['sla', 'SLA Level'],
      ['description', 'Issue Description'],
    ];

    const missing = requiredFields.find(([field]) => !String(form[field] || '').trim());

    if (missing) {
      setFormError(`${missing[1]} is required.`);
      return false;
    }

    if (!hasMeaningfulDescriptionDetails(form.description, form)) {
      setFormError('Please add complete issue details after the issue description labels.');
      return false;
    }

    if (mbwinRequired && !form.saarAttachment?.dataUrl) {
      setFormError('SAAR PDF attachment is required for MBWIN-related requests.');
      return false;
    }

    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setShowConfirm(true);
  };

  const confirmSubmit = async () => {
    const wasEditing = Boolean(editingId);
    const cleanDescription = sanitizeDescriptionForSubmit(form.description, form);
    const finalSla = form.sla || 'Low';
    const finalSlaOption = getSelectedSlaOption(finalSla);

    const payload = {
      ...form,
      impact: finalSlaOption.impact,
      description: cleanDescription,
      sla: finalSla,
      priority: finalSla,
      saarRequired: mbwinRequired,
      lastEmployeeUpdate: new Date().toLocaleString(),
    };

    try {
      if (wasEditing) {
        await updateTicket(
          editingId,
          {
            ...payload,
            status: 'Modified',
          },
          { requestedByRole: 'employee' }
        );

        setEditingId(null);
      } else {
        await createTicket({ user, form: payload });
      }

      setForm(getNewTicketForm(user));
      setFormError('');
      setShowConfirm(false);
      setTab('tickets');
      await reloadTickets();
      setSuccessNotice({
        title: wasEditing ? 'Ticket Updated' : 'Ticket Submitted',
        message: wasEditing
          ? 'Your ticket changes were saved successfully and sent back to ICT for review.'
          : 'Your ticket was submitted successfully. ICT can now review your request.',
      });
    } catch (error) {
      setFormError(error.message || 'Unable to save ticket. Please try again.');
      setShowConfirm(false);
    }
  };

  const handleEdit = async (ticket) => {
    if (!canEmployeeEditTicket(ticket)) {
      setFormError(ticket.employeeLockReason || 'This ticket is already in progress and can no longer be edited.');
      return;
    }

    setFormError('');

    try {
      const fullTicket = await getTicket(ticket.id);
      const editableTicket = fullTicket || ticket;

      if (!canEmployeeEditTicket(editableTicket)) {
        setFormError(editableTicket.employeeLockReason || 'This ticket is already in progress and can no longer be edited.');
        return;
      }

      const ticketForm = {
        branch: editableTicket.branch || '',
        department: editableTicket.department || '',
        supportCategory: editableTicket.supportCategory || '',
        concernType: editableTicket.concernType || '',
        deviceName: editableTicket.deviceName || '',
        contactNumber: editableTicket.contactNumber || '',
        impact: editableTicket.impact || '',
        description: editableTicket.description || '',
        saarAttachment: editableTicket.saarAttachment || null,
        sla: editableTicket.sla || 'Low',
        photoAttachments: Array.isArray(editableTicket.photoAttachments) ? editableTicket.photoAttachments : [],
      };

      setEditingId(editableTicket.id);
      setForm({
        ...ticketForm,
        description: ensureDescriptionTemplate(editableTicket.description, ticketForm),
      });
      setTab('submit');
    } catch (error) {
      setFormError(error.message || 'Unable to load the ticket for editing. Please try again.');
    }
  };

  const switchToSubmit = () => {
    setEditingId(null);
    setForm(getNewTicketForm(user));
    setFormError('');
    setTab('submit');
  };

  return (
    <div className="helpdesk-view">
      <section className="panel-card glass helpdesk-banner">
        <div className="helpdesk-banner-copy">
          <span className="section-kicker">Technical Support</span>
          <h2>Submit and monitor your ICT requests.</h2>
          <p>
            Create complete tickets, attach required documents, and review ICT action updates from your employee portal.
          </p>
        </div>

        <div className="helpdesk-banner-actions">
          <span className="helpdesk-badge">{activeCount} Active</span>
          <span className="helpdesk-badge">{resolvedCount} Resolved</span>
        </div>
      </section>

      <section className="support-insight-grid" aria-label="Support insights">
        <article className="support-insight-card">
          <span><MonoIcon icon={FileText} />Queue</span>
          <strong>{tickets.length}</strong>
          <p>Total requests submitted from your account.</p>
        </article>
        <article className="support-insight-card">
          <span><MonoIcon icon={Clock3} />Active</span>
          <strong>{activeCount}</strong>
          <p>Concerns currently awaiting action or resolution.</p>
        </article>
        <article className="support-insight-card">
          <span><MonoIcon icon={CheckCircle2} />Resolved</span>
          <strong>{resolvedCount}</strong>
          <p>Completed requests with recorded ICT resolution.</p>
        </article>
        <article className="support-insight-card">
          <span><MonoIcon icon={BadgeCheck} />SAAR</span>
          <strong>PDF</strong>
          <p>Required for all MBWIN-related service requests.</p>
        </article>
      </section>

      <section className="panel-card glass">
        <div className="segmented-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'tickets'}
            className={tab === 'tickets' ? 'active' : ''}
            onClick={() => setTab('tickets')}
          >
            My Tickets
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={tab === 'submit'}
            className={tab === 'submit' ? 'active' : ''}
            onClick={switchToSubmit}
          >
            {editingId ? 'Edit Ticket' : 'Submit Ticket'}
          </button>
        </div>

        {tab === 'tickets' && (
          <div className="ticket-list">
            {tickets.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon"><MonoIcon icon={Ticket} /></div>
                <h4>No tickets submitted yet</h4>
                <p>Once you create a helpdesk request, it will appear here for tracking and ICT updates.</p>
              </div>
            ) : (
              <>
                {pagedTickets.map((ticket) => (
                  <div key={ticket.id} className="ticket-card">
                    <div className="ticket-header">
                      <div className="ticket-header-left">
                        <h4>{ticket.concernType}</h4>
                        <span className="ticket-id">{getTicketDisplayCode(ticket)}</span>
                      </div>
                      <span className="ticket-date">{ticket.date}</span>
                    </div>

                    <div className="ticket-badges">
                      <span className={`status ${slugify(ticket.status)}`}>{ticket.status}</span>
                      <span className={`priority ${slugify(ticket.sla)}`}>{ticket.sla}</span>
                      {isMbwinRequest(ticket) && <span className="status saar">SAAR Required</span>}
                    </div>

                    <div className="ticket-meta-grid">
                      <div className="ticket-meta-cell">
                        <span>Branch</span>
                        <p>{ticket.branch}</p>
                      </div>
                      <div className="ticket-meta-cell">
                        <span>Department</span>
                        <p>{ticket.department}</p>
                      </div>
                      <div className="ticket-meta-cell">
                        <span>Technician</span>
                        <p>{ticket.technician || 'Unassigned'}</p>
                      </div>
                    </div>

                    <p className="ticket-description">{ticket.description}</p>

                    {ticket.saarAttachment?.name && (
                      <div className="ticket-attachment-note">
                        <strong>SAAR PDF Attached</strong>
                        <p>{ticket.saarAttachment.name} · {ticket.saarAttachment.sizeLabel}</p>
                      </div>
                    )}

                    {ticket.photoAttachments?.length > 0 && (
                      <div className="ticket-attachment-note">
                        <strong>Photo Attachments</strong>
                        <p>{ticket.photoAttachments.length} photo{ticket.photoAttachments.length === 1 ? '' : 's'} attached for ICT review.</p>
                      </div>
                    )}

                    {ticket.actionTaken && (
                      <div className="ticket-admin-note">
                        <strong>ICT Action Taken</strong>
                        <p>{ticket.actionTaken}</p>
                      </div>
                    )}

                    <div className="ticket-footer">
                      <button type="button" className="ticket-action-btn" onClick={() => openTicketDetails(ticket)}>
                        <MonoIcon icon={Eye} />
                        View Details
                      </button>

                      {canEmployeeEditTicket(ticket) ? (
                        <button type="button" className="ticket-action-btn" onClick={() => handleEdit(ticket)}>
                          <MonoIcon icon={PenLine} />
                          Edit
                        </button>
                      ) : (
                        <span className="ticket-locked-pill">Locked</span>
                      )}
                    </div>
                  </div>
                ))}

                <TicketPagination
                  page={currentPage}
                  totalPages={totalPages}
                  totalItems={tickets.length}
                  pageSize={pageSize}
                  onPageChange={goToTicketPage}
                />
              </>
            )}
          </div>
        )}

        {tab === 'submit' && (
          <form className="ticket-form-wrap" onSubmit={handleSubmit}>
            <div className="ticket-form-grid">
              <div className="ticket-form-group">
                <label htmlFor="ticket-branch">Branch / Location</label>
                <select
                  id="ticket-branch"
                  className="ticket-field ticket-select"
                  value={form.branch}
                  onChange={(e) => handleFormChange('branch', e.target.value)}
                  required
                >
                  <option value="" disabled>Select branch</option>
                  {BRANCHES.map((branch) => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))}
                </select>
              </div>

              <div className="ticket-form-group">
                <label htmlFor="ticket-department">Department</label>
                <select
                  id="ticket-department"
                  className="ticket-field ticket-select"
                  value={form.department}
                  onChange={(e) => handleFormChange('department', e.target.value)}
                  required
                >
                  <option value="" disabled>Select department</option>
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div className="ticket-form-group">
                <label htmlFor="ticket-device">Device / Workstation / System</label>
                <select
                  id="ticket-device"
                  className="ticket-field ticket-select"
                  value={form.deviceName}
                  onChange={(e) => handleFormChange('deviceName', e.target.value)}
                  required
                >
                  <option value="" disabled>Select device or system</option>
                  {form.deviceName && !DEVICE_OPTIONS.includes(form.deviceName) && (
                    <option value={form.deviceName}>{form.deviceName}</option>
                  )}
                  {DEVICE_OPTIONS.map((device) => (
                    <option key={device} value={device}>{device}</option>
                  ))}
                </select>
              </div>

              <div className="ticket-form-group">
                <label htmlFor="ticket-contact">Contact Number / Local</label>
                <input
                  id="ticket-contact"
                  className="ticket-field ticket-input"
                  type="text"
                  value={form.contactNumber}
                  onChange={(e) => handleFormChange('contactNumber', e.target.value)}
                  placeholder="Example: 0917 000 0000 or local number"
                  required
                />
              </div>

              <div className="ticket-form-group">
                <label htmlFor="ticket-category">Support Category</label>
                <select
                  id="ticket-category"
                  className="ticket-field ticket-select"
                  value={form.supportCategory}
                  onChange={(e) => handleFormChange('supportCategory', e.target.value)}
                  required
                >
                  <option value="" disabled>Select support category</option>
                  {form.supportCategory && !HELPDESK_SUPPORT_CATEGORIES.includes(form.supportCategory) && (
                    <option value={form.supportCategory}>{form.supportCategory}</option>
                  )}
                  {HELPDESK_SUPPORT_CATEGORIES.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div className="ticket-form-group">
                <label htmlFor="ticket-concern">Concern Type</label>
                <select
                  id="ticket-concern"
                  className="ticket-field ticket-select"
                  value={form.concernType}
                  onChange={(e) => handleFormChange('concernType', e.target.value)}
                  disabled={!form.supportCategory}
                  required
                >
                  <option value="" disabled>
                    {form.supportCategory ? 'Select concern type' : 'Select support category first'}
                  </option>
                  {form.concernType && !concernOptions.includes(form.concernType) && (
                    <option value={form.concernType}>{form.concernType}</option>
                  )}
                  {concernOptions.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="ticket-form-group full sla-level-section">
                <label id="ticket-sla-label">SLA Level &amp; Operational Impact</label>
                <div
                  className="sla-picker-modern"
                  role="radiogroup"
                  aria-labelledby="ticket-sla-label"
                >
                  {SLA_PICKER_OPTIONS.filter(
                    (option) => !SLA_LEVELS?.length || SLA_LEVELS.includes(option.level)
                  ).map((option) => {
                    const isSelected = (form.sla || 'Low') === option.level;

                    return (
                      <button
                        key={option.level}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        className={[
                          'sla-card',
                          slugify(option.level),
                          isSelected ? 'selected' : '',
                        ].filter(Boolean).join(' ')}
                        onClick={() => handleSlaChange(option)}
                      >
                        <span className="sla-card-icon"><MonoIcon icon={option.icon} /></span>
                        <span className="sla-card-copy">
                          <strong>{option.title}</strong>
                          <em>{option.impact}</em>
                          <span>{option.text}</span>
                        </span>
                        <small>{option.meta}</small>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="ticket-form-group full">
                <label htmlFor="ticket-desc-builder">Issue Description</label>
                <IssueDescriptionBuilder
                  form={form}
                  onChange={handleDescriptionDetailChange}
                />
                <span className="ticket-form-hint">{issueDescriptionHint}</span>
              </div>

              {mbwinRequired && (
                <div className="ticket-form-group full saar-upload-card required">
                  <label htmlFor="ticket-saar">SAAR PDF Attachment (Required for MBWIN / MBWIM)</label>

                  <input
                    id="ticket-saar"
                    className="ticket-field ticket-file"
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={handleSaarFileChange}
                    required={!form.saarAttachment?.dataUrl}
                  />

                  {form.saarAttachment?.name ? (
                    <div className="attached-file-preview">
                      <div>
                        <strong>{form.saarAttachment.name}</strong>
                        <span>{form.saarAttachment.sizeLabel} · Attached {form.saarAttachment.uploadedAt}</span>
                      </div>
                      {form.saarAttachment.dataUrl && (
                        <a href={form.saarAttachment.dataUrl} target="_blank" rel="noopener noreferrer">
                          View PDF
                        </a>
                      )}
                    </div>
                  ) : (
                    <span className="ticket-form-hint">
                      Attach an approved SAAR PDF for MBWIN / MBWIM account, teller, role, or function requests.
                    </span>
                  )}
                </div>
              )}

              <div className="ticket-form-group full photo-upload-card">
                <label htmlFor="ticket-photos">Photo / Screenshot Attachments (Optional)</label>
                <input
                  id="ticket-photos"
                  className="ticket-field ticket-file"
                  type="file"
                  accept={PHOTO_ACCEPT}
                  multiple
                  onChange={handlePhotoFilesChange}
                />
                <span className="ticket-form-hint">
                  Attach up to {PHOTO_MAX_COUNT} JPG, PNG, or WEBP photos. Use this for screenshots, printer errors, router lights, damaged cables, or hardware issues.
                </span>

                {form.photoAttachments.length > 0 && (
                  <div className="photo-preview-shell">
                    <PhotoAttachmentGallery photos={form.photoAttachments} />
                    <div className="photo-remove-row">
                      {form.photoAttachments.map((photo) => (
                        <button key={photo.id || photo.name} type="button" onClick={() => removePhotoAttachment(photo.id)}>
                          Remove {photo.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {formError && <div className="form-error">{formError}</div>}

            <button type="submit" className="auth-submit-btn">
              <MonoIcon icon={editingId ? PenLine : Send} />
              {editingId ? 'Save Ticket Changes' : 'Submit Ticket'}
            </button>
          </form>
        )}
      </section>

      {/* Confirm submission modal */}
      {showConfirm && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Confirm ticket submission">
          <div className="modal-box glass">
            <h3>{editingId ? 'Save Ticket Changes?' : 'Submit Ticket?'}</h3>
            <div className="modal-divider" />
            <p>
              {editingId
                ? 'Your updated ticket details will be sent for ICT review.'
                : 'Your helpdesk request will be submitted to ICT with your selected SLA level.'}
            </p>

            <div className="modal-ticket-summary">
              <span className={`priority ${slugify(form.sla || 'Low')}`}>{form.sla || 'Low'}</span>
              <span>{selectedSlaOption.impact}</span>
              <span>{form.concernType}</span>
            </div>

            <div className="modal-footer">
              <button type="button" className="modal-btn cancel" onClick={() => setShowConfirm(false)}>
                Cancel
              </button>
              <button type="button" className="modal-btn confirm" onClick={confirmSubmit}>
                <MonoIcon icon={editingId ? PenLine : Send} />
                {editingId ? 'Save Changes' : 'Confirm Submission'}
              </button>
            </div>
          </div>
        </div>
      )}

      {successNotice && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Ticket submission successful">
          <div className="modal-box glass success-modal">
            <div className="success-icon"><MonoIcon icon={CheckCircle2} /></div>
            <h3>{successNotice.title}</h3>
            <p>{successNotice.message}</p>
            <div className="modal-footer">
              <button type="button" className="modal-btn confirm" onClick={() => setSuccessNotice(null)}>
                Okay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket detail modal — uses new admin-matching component */}
      {viewTicket && (
        <EmployeeTicketDetailModal
          ticket={viewTicket}
          user={user}
          messages={ticketMessages}
          messageDraft={messageDraft}
          messagePhotos={messagePhotos}
          messageError={messageError}
          isSendingMessage={isSendingMessage}
          shouldShowConversation={shouldShowConversation}
          canSendConversationMessage={canSendConversationMessage}
          unreadCount={unreadConversationCount}
          isChatMinimized={isChatMinimized}
          onClose={() => {
            setIsChatMinimized(true);
            setViewTicket(null);
          }}
          onEdit={() => {
            handleEdit(viewTicket);
            setViewTicket(null);
          }}
          onChatOpen={() => {
            setIsChatMinimized(false);
            setUnreadConversationCount(0);
          }}
          onChatClose={() => setIsChatMinimized(true)}
          onMessageChange={setMessageDraft}
          onPhotoChange={handleConversationPhotoChange}
          onRemovePhoto={(photoId) => setMessagePhotos((current) => current.filter((p) => p.id !== photoId))}
          onSend={sendTicketMessage}
        />
      )}
    </div>
  );
}


/* =========================
   OTHER SERVICES VIEW
========================= */

function OtherServicesView({ user, reloadTickets }) {
  const [form, setForm] = useState(() => getNewOtherServiceForm(user));
  const [requests, setRequests] = useState([]);
  const [formError, setFormError] = useState('');
  const [successNotice, setSuccessNotice] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isBurnoutRequest = form.supportCategory === 'Burnout';
  const isOtherRequest = form.supportCategory === 'Other';
  const requestedServiceLabel = String(form.requestedService || '').trim();

  useBodyScrollLock(Boolean(successNotice));

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const savedRequests = JSON.parse(window.localStorage.getItem(OTHER_SERVICES_STORAGE_KEY) || '[]');
      setRequests(Array.isArray(savedRequests) ? savedRequests : []);
    } catch {
      setRequests([]);
    }
  }, []);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      branch: current.branch || user.branch || user.office || '',
      department: current.department || user.department || '',
    }));
  }, [user.branch, user.department, user.office]);

  const handleChange = (field, value) => {
    setFormError('');
    setForm((current) => {
      if (field === 'supportCategory') {
        return {
          ...current,
          supportCategory: value,
          custodian: value === 'Burnout' ? current.custodian : '',
          brand: value === 'Burnout' ? current.brand : '',
          model: value === 'Burnout' ? current.model : '',
          serialNumber: value === 'Burnout' ? current.serialNumber : '',
          deviceName: '',
          requestedService: value === 'Other' ? current.requestedService : '',
        };
      }

      return { ...current, [field]: value };
    });
  };

  const saveRequests = (nextRequests) => {
    setRequests(nextRequests);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(OTHER_SERVICES_STORAGE_KEY, JSON.stringify(nextRequests));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const requiredFields = [
      ['branch', isBurnoutRequest ? 'Branch / Location to be Assigned' : 'Branch or Location'],
      ['department', isBurnoutRequest ? 'Department of the custodian' : 'Department'],
      ['supportCategory', 'Service Type'],
    ];

    const missing = requiredFields.find(([field]) => !String(form[field] || '').trim());

    if (missing) {
      setFormError(`${missing[1]} is required.`);
      return;
    }

    if (isOtherRequest && !requestedServiceLabel) {
      setFormError('Requested service is required.');
      return;
    }

    if (isBurnoutRequest && !String(form.custodian || '').trim()) {
      setFormError('Custodian is required for Helpdesk Burnout.');
      return;
    }

    if (isBurnoutRequest && !String(form.brand || '').trim()) {
      setFormError('Brand is required for Helpdesk Burnout.');
      return;
    }

    if (isBurnoutRequest && !String(form.model || '').trim()) {
      setFormError('Model is required for Helpdesk Burnout.');
      return;
    }

    if (isBurnoutRequest && !String(form.serialNumber || '').trim()) {
      setFormError('Serial number is required for Helpdesk Burnout.');
      return;
    }

    setIsSubmitting(true);

    try {
      const submittedAt = new Date().toLocaleString();
      let savedRequest;

      if (isBurnoutRequest) {
        const brandModel = `${String(form.brand || '').trim()} ${String(form.model || '').trim()}`.trim();
        const description = [
          'Helpdesk Burnout Request',
          `Custodian: ${form.custodian}`,
          `Brand: ${form.brand}`,
          `Model: ${form.model}`,
          `Serial Number: ${form.serialNumber}`,
          'Service Type: Burnout',
          `Branch / Location to be Assigned: ${form.branch}`,
          `Department of the custodian: ${form.department}`,
          `Remarks: ${form.remarks || 'None'}`,
        ].join('\n');

        const ticket = await createTicket({
          user,
          form: {
            ...form,
            brand: brandModel,
            model: form.model,
            deviceType: 'Unit',
            deviceName: 'Unit',
            serialNumber: form.serialNumber,
            supportCategory: 'Burnout',
            concernType: 'Helpdesk Burnout',
            description,
            sla: 'Low',
            impact: 'Device burnout request',
            lastEmployeeUpdate: submittedAt,
          },
        });

        savedRequest = {
          id: ticket.ticketCode || ticket.id,
          ticketId: ticket.id,
          ticketCode: ticket.ticketCode,
          ...form,
          brand: brandModel,
          status: 'Submitted',
          date: submittedAt,
        };

        await reloadTickets?.();
      } else {
        savedRequest = {
          id: createOtherServiceId(),
          ...form,
          supportCategory: requestedServiceLabel || form.supportCategory,
          serviceType: form.supportCategory,
          requestedService: requestedServiceLabel,
          status: 'Submitted',
          date: submittedAt,
        };
      }

      saveRequests([savedRequest, ...requests]);
      setForm(getNewOtherServiceForm(user));
      setFormError('');
      setSuccessNotice({
        title: isBurnoutRequest ? 'Helpdesk Burnout Submitted' : 'Other Service Submitted',
        message: isBurnoutRequest
          ? `Your Helpdesk Burnout ticket ${savedRequest.id} was submitted successfully.`
          : `Your ${requestedServiceLabel || form.supportCategory} request was submitted successfully and saved in Other Services.`,
      });
    } catch (error) {
      setFormError(error.message || 'Unable to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="other-services-view">
      <section className="panel-card glass helpdesk-banner other-services-banner">
        <div className="helpdesk-banner-copy">
          <span className="section-kicker">Other Services</span>
          <h2>Submit non-helpdesk service requests.</h2>
          <p>
            This page follows the Helpdesk layout but uses a separate form for service concerns outside ICT ticketing.
          </p>
        </div>

        <div className="helpdesk-banner-actions">
          <span className="helpdesk-badge">Burnout / Other</span>
          <span className="helpdesk-badge">{requests.length} Request{requests.length === 1 ? '' : 's'}</span>
        </div>
      </section>

      <section className="panel-card glass">
        <div className="section-head">
          <div>
            <span className="section-kicker">Other Services Request</span>
            <h3>Service Request Form</h3>
          </div>
        </div>

        <form className="ticket-form-wrap" onSubmit={handleSubmit}>
          <div className="ticket-form-grid other-service-grid">
            <div className="ticket-form-group full other-service-category-row">
              <label htmlFor="other-category">Service Type</label>
              <select
                id="other-category"
                className="ticket-field ticket-select other-service-category-select"
                value={form.supportCategory}
                onChange={(e) => handleChange('supportCategory', e.target.value)}
                required
              >
                <option value="" disabled>Select other service</option>
                {OTHER_SERVICE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              <span className="ticket-form-hint">Choose Burnout for unit preparation, or Other for requests like cabling.</span>
            </div>

            <div className="ticket-form-group">
              <label htmlFor="other-branch">
                {isBurnoutRequest ? 'Branch / Location to be Assigned' : 'Branch / Location'}
              </label>
              <select
                id="other-branch"
                className="ticket-field ticket-select"
                value={form.branch}
                onChange={(e) => handleChange('branch', e.target.value)}
                required
              >
                <option value="" disabled>Select branch</option>
                {BRANCHES.map((branch) => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </select>
            </div>

            {isBurnoutRequest && (
              <div className="ticket-form-group">
                <label htmlFor="other-custodian">Custodian</label>
                <input
                  id="other-custodian"
                  className="ticket-field ticket-input"
                  type="text"
                  value={form.custodian}
                  onChange={(e) => handleChange('custodian', e.target.value)}
                  placeholder="Name of custodian"
                  required
                />
              </div>
            )}

            {isOtherRequest && (
              <div className="ticket-form-group">
                <label htmlFor="other-requested-service">Requested Service</label>
                <input
                  id="other-requested-service"
                  className="ticket-field ticket-input"
                  type="text"
                  value={form.requestedService}
                  onChange={(e) => handleChange('requestedService', e.target.value)}
                  placeholder="Example: Cabling, office transfer, maintenance support"
                  maxLength={120}
                  required
                />
                <span className="ticket-form-hint">Enter the exact service you need if it is not Burnout.</span>
              </div>
            )}

            {isBurnoutRequest && (
              <>
                <div className="ticket-form-group">
                  <label htmlFor="other-brand">Brand</label>
                  <input
                    id="other-brand"
                    className="ticket-field ticket-input"
                    type="text"
                    value={form.brand}
                    onChange={(e) => handleChange('brand', e.target.value)}
                    placeholder="ASUS, HP, LENOVO, EPSON"
                    required
                  />
                </div>

                <div className="ticket-form-group">
                  <label htmlFor="other-model">Model</label>
                  <input
                    id="other-model"
                    className="ticket-field ticket-input"
                    type="text"
                    value={form.model}
                    onChange={(e) => handleChange('model', e.target.value)}
                    placeholder="ThinkPad T14, LaserJet M404, etc."
                    required
                  />
                </div>

                <div className="ticket-form-group">
                  <label htmlFor="other-serial">Serial Number</label>
                  <input
                    id="other-serial"
                    className="ticket-field ticket-input"
                    type="text"
                    value={form.serialNumber}
                    onChange={(e) => handleChange('serialNumber', e.target.value)}
                    placeholder="Enter asset serial number"
                    required
                  />
                </div>
              </>
            )}

            <div className="ticket-form-group">
              <label htmlFor="other-department">{isBurnoutRequest ? 'Department of the custodian' : 'Department'}</label>
              <select
                id="other-department"
                className="ticket-field ticket-select"
                value={form.department}
                onChange={(e) => handleChange('department', e.target.value)}
                required
              >
                <option value="" disabled>Select department</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            <div className="ticket-form-group full">
              <label htmlFor="other-remarks">Notes / Remarks</label>
              <textarea
                id="other-remarks"
                className="ticket-field ticket-textarea"
                value={form.remarks}
                onChange={(e) => handleChange('remarks', e.target.value)}
                placeholder={getOtherServiceRemarksPlaceholder(form.supportCategory)}
                maxLength={800}
              />
            </div>
          </div>

          {formError && <div className="form-error">{formError}</div>}

          <button type="submit" className="auth-submit-btn" disabled={isSubmitting}>
            <MonoIcon icon={Send} />
            {isSubmitting ? 'Submitting...' : 'Submit Other Service'}
          </button>
        </form>
      </section>

      <section className="panel-card glass">
        <div className="section-head">
          <div>
            <span className="section-kicker">Request History</span>
            <h3>Recent Other Services</h3>
          </div>
        </div>

        <div className="ticket-list">
          {requests.length ? (
            requests.slice(0, 5).map((request) => (
              <article key={request.id} className="ticket-card other-service-card">
                <div className="ticket-header">
                  <div className="ticket-header-left">
                    <h4>{request.supportCategory}</h4>
                    <span className="ticket-id">{request.ticketCode || request.id}</span>
                  </div>
                  <span className="ticket-date">{request.date}</span>
                </div>

                <div className="ticket-meta-grid">
                  <div className="ticket-meta-cell">
                    <span>{request.supportCategory === 'Burnout' ? 'Assigned Location' : 'Branch'}</span>
                    <p>{request.branch}</p>
                  </div>
                  {request.custodian && (
                    <div className="ticket-meta-cell">
                      <span>Custodian</span>
                      <p>{request.custodian}</p>
                    </div>
                  )}
                  {request.deviceName && (
                    <div className="ticket-meta-cell">
                      <span>{request.supportCategory === 'Burnout' ? 'Asset Type / Device' : 'Device'}</span>
                      <p>{request.deviceName}</p>
                    </div>
                  )}
                  {request.brand && (
                    <div className="ticket-meta-cell">
                      <span>Brand & Model</span>
                      <p>{request.brand}</p>
                    </div>
                  )}
                  {request.serialNumber && (
                    <div className="ticket-meta-cell">
                      <span>Serial Number</span>
                      <p>{request.serialNumber}</p>
                    </div>
                  )}
                  <div className="ticket-meta-cell">
                    <span>Department</span>
                    <p>{request.department}</p>
                  </div>
                </div>

                {request.remarks && <p className="ticket-description">{request.remarks}</p>}
              </article>
            ))
          ) : (
            <div className="empty-state compact">
              <div className="empty-icon"><MonoIcon icon={Wrench} /></div>
              <h4>No other service request yet</h4>
              <p>Submit an Other Services request and it will appear here.</p>
            </div>
          )}
        </div>
      </section>

      {successNotice && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Other service submitted">
          <div className="modal-box glass success-modal">
            <div className="success-icon"><MonoIcon icon={CheckCircle2} /></div>
            <h3>{successNotice.title}</h3>
            <p>{successNotice.message}</p>
            <div className="modal-footer">
              <button type="button" className="modal-btn confirm" onClick={() => setSuccessNotice(null)}>
                Okay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================
   ROOT EXPORT — EMPLOYEE APP
========================= */

export default function EmployeeDashboardPage() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [helpdeskTab, setHelpdeskTab] = useState('tickets');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [authChecked, setAuthChecked] = useState(false);
  const [isInactiveBlocked, setIsInactiveBlocked] = useState(false);
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);
  const [transitionLabel, setTransitionLabel] = useState(employeeTransitionLabels.dashboard);
  const router = useRouter();

  const loadTickets = async (currentUser = user) => {
    if (!currentUser?.id) return;

    try {
      const employeeTickets = await getTicketsForUser(currentUser.id);

      setTickets(
        employeeTickets.sort((a, b) => {
          const aTime = new Date(a.lastUpdated || a.createdAt || a.date || 0).getTime();
          const bTime = new Date(b.lastUpdated || b.createdAt || b.date || 0).getTime();

          return bTime - aTime;
        })
      );
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const verifySession = async () => {
      try {
        const activeUser = await getCurrentPortalUser();

        if (cancelled) return;

        if (!activeUser) {
          router.replace(LOGIN_ROUTE);
          return;
        }

        if (normalizePortalRole(activeUser.role) !== 'employee') {
          router.replace(getPortalHomeRoute(activeUser.role));
          return;
        }

        if (isInactivePortalUser(activeUser)) {
          setIsInactiveBlocked(true);
          setAuthChecked(true);
          await signOutPortal().catch(() => {});
          window.setTimeout(() => {
            router.replace('/');
          }, 5000);
          return;
        }

        setUser(activeUser);
        await loadTickets(activeUser);
        setAuthChecked(true);
      } catch {
        if (!cancelled) {
          router.replace(LOGIN_ROUTE);
        }
      }
    };

    verifySession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    const handleStorage = () => void loadTickets();
    const handleFocus = () => void loadTickets();

    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user]);

  useEffect(() => {
    if (!isPageTransitioning) return undefined;

    const timer = window.setTimeout(() => {
      setIsPageTransitioning(false);
    }, TRANSITION_DURATION);

    return () => window.clearTimeout(timer);
  }, [isPageTransitioning, transitionLabel]);

  const openTickets = useMemo(
    () => tickets.filter((ticket) => isUnresolved(ticket.status)).length,
    [tickets]
  );

  const goTo = (section, tab) => {
    const isSameView = section === activeSection && (!tab || tab === helpdeskTab);

    if (!isSameView) {
      setTransitionLabel(employeeTransitionLabels[section] || employeeTransitionLabels.dashboard);
      setIsPageTransitioning(true);
    }

    setActiveSection(section);

    if (tab) {
      setHelpdeskTab(tab);
    }

    setSidebarOpen(false);

    if (section === 'helpdesk') {
      void loadTickets();
    }
  };

  const handleLogout = async () => {
    setTransitionLabel(employeeTransitionLabels.logout);
    setIsPageTransitioning(true);
    await signOutPortal().catch(() => {});
    router.replace(LOGIN_ROUTE);
  };

  if (!authChecked || !user) {
    if (isInactiveBlocked) {
      return <InactiveAccountNotice />;
    }

    return (
      <>
        <main className="portal-main portal-app-main">
          <div className="portal-shell" />
        </main>
        <PortalTransitionLoader label="Verifying employee access..." />
      </>
    );
  }

  return (
    <>
      <main className="portal-main portal-app-main">
        <div className="portal-shell">
          <header className="portal-topbar glass">
            <div className="portal-topbar-copy">
              <span className="portal-eyebrow">Employee Portal</span>
              <h1>Good day, {user.name.split(' ')[0]}</h1>
              <p>Helpdesk portal for employee support and technical assistance.</p>
            </div>

            <div className="portal-topbar-actions">
              <span className="portal-status-pill">
                <span className="dot" />
                IT Support Center
              </span>

              <span className="portal-status-pill alert">
                <span className="dot" />
                {openTickets} Active
              </span>

              <span className="portal-status-pill">
                <span className="dot" />
                Synced now
              </span>

              <button className="topbar-icon-btn" type="button" aria-label="Notifications">
                <Icon.Bell />
              </button>

              <div className="profile-chip">
                <span className="profile-chip-avatar">{user.initials}</span>
                <div className="profile-chip-copy">
                  <strong>{user.name}</strong>
                  <span>{user.department}</span>
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
            />

            {sidebarOpen && (
              <div
                className="sidebar-overlay"
                onClick={() => setSidebarOpen(false)}
              />
            )}

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
                  user={user}
                  tickets={tickets}
                  openTickets={openTickets}
                  onGoTo={goTo}
                />
              )}

              {activeSection === 'profile' && (
                <ProfileView user={user} onGoTo={goTo} />
              )}

              {activeSection === 'helpdesk' && (
                <HelpdeskView
                  key={helpdeskTab}
                  user={user}
                  tickets={tickets}
                  reloadTickets={() => loadTickets()}
                  initialTab={helpdeskTab}
                />
              )}

              {activeSection === 'otherServices' && (
                <OtherServicesView user={user} reloadTickets={() => loadTickets(user)} />
              )}
            </section>
          </div>
        </div>
      </main>

      {isPageTransitioning && <PortalTransitionLoader label={transitionLabel} />}
    </>
  );
}
