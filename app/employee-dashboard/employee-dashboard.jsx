'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  BadgeCheck,
  Bell,
  BriefcaseBusiness,
  Building2,
  Camera,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  Eye,
  FileText,
  ImageIcon,
  LayoutDashboard,
  Link2,
  LogOut,
  Menu,
  MessageCircle,
  Paperclip,
  PenLine,
  Printer,
  Save,
  Send,
  ShieldCheck,
  Ticket,
  UserRound,
  Wrench,
  X,
} from 'lucide-react';
import {
  BRANCHES,
  CATEGORY_TEMPLATES,
  DEPARTMENTS,
  DEVICE_OPTIONS,
  isUnresolved,
  slugify,
} from '../portalStorage';
import {
  getCurrentPortalUser,
  getPortalHomeRoute,
  INACTIVE_ACCOUNT_MESSAGE,
  isInactivePortalUser,
  isPasswordChangeRequired,
  signOutPortal,
  updateCurrentPortalUserProfilePhoto,
} from '@/lib/auth/portalAuth';
import {
  canTicketAcceptMessages,
  createTicket,
  createTicketMessage,
  deriveTicketImpact,
  getTicket,
  getTicketMessages,
  getTicketsForUser,
  isTicketBeingHandled,
  subscribeToTicket,
  subscribeToTicketMessages,
  updateTicket,
} from '@/lib/tickets/portalTickets';
import PortalProfileLayout from '@/components/PortalProfileLayout';
import PortalThemeToggle from '@/components/PortalThemeToggle';
import TicketChatLauncher from '@/components/TicketChatLauncher';
import HelpdeskInbox from '@/components/HelpdeskInbox';
import TicketHandlingIndicator, { TicketHandlingActivity, TicketWorkTimer } from '@/components/TicketHandlingStatus';
import './employee-dashboard.css';
import '@/components/PortalWorkspaceTheme.css';
import '@/components/TicketHandlingStatus.css';
import '@/components/TicketModalLayout.css';
import './employee-ticket-parity.css';
import '@/components/TicketChat.css';
import { mergeMessages, SLA_TARGET_HOURS } from '@/lib/tickets/workflow.mjs';
import { createRequestId } from '@/lib/tickets/requestIdentity.mjs';

/* =========================
   ROUTES
========================= */

const LOGIN_ROUTE = '/helpdesk';
const HRMAX_ROUTE = 'http://120.28.214.253/hrmax/';

/* =========================
   STATIC DATA
========================= */

const SAAR_MAX_SIZE = 4 * 1024 * 1024;
const PHOTO_MAX_SIZE = 4 * 1024 * 1024;
const PHOTO_MAX_COUNT = 5;
const PHOTO_ACCEPT = 'image/*';
const PHOTO_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'];


const HELPDESK_CATEGORY_CONCERNS = {
  'Software / System Support': [
    'MBWin / Sky360 concern',
    'Excel / Office application concern',
    'System error or application issue',
    'Software installation request',
    'Other software concern',
  ],
  'Account / Access Support': [
    'New user account request',
    'Password reset',
    'Login problem',
    'Teller role / user role concern',
    'Other account access concern',
  ],
  'Printer Support': [
    'Passbook printer concern',
    'Printer not printing',
    'Printer setup or installation',
    'Poor print quality',
    'Printer error or blinking light',
    'Ink, paper jam, or maintenance concern',
    'Other printer concern',
  ],
  'Computer / Laptop Support': [
    'Slow computer or laptop',
    'No display or no power',
    'Hardware issue',
    'Computer formatting',
    'Application installation',
    'Other computer concern',
  ],
  'Network / Internet Support': [
    'No internet connection',
    'Slow internet',
    'Wi-Fi connection issue',
    'Network cable or port issue',
    'Shared folder or server access issue',
    'Other network concern',
  ],
  'Biometric / Attendance Support': [
    'Fingerprint enrollment',
    'Unable to time-in or time-out',
    'Biometric device issue',
    'Attendance system concern',
    'Other biometric concern',
  ],
  'Server / NAS / Database Support': [
    'Server access issue',
    'NAS or file storage concern',
    'Backup concern',
    'Database or system connection issue',
    'Other server concern',
  ],
  'Other Support': ['Other support concern'],
};

const HELPDESK_SUPPORT_CATEGORIES = Object.keys(HELPDESK_CATEGORY_CONCERNS);

const DEVICE_SUPPORT_CATEGORY_MAP = {
  'Desktop PC': [
    'Software / System Support',
    'Account / Access Support',
    'Computer / Laptop Support',
    'Network / Internet Support',
  ],
  Laptop: [
    'Software / System Support',
    'Account / Access Support',
    'Computer / Laptop Support',
    'Network / Internet Support',
  ],
  Printer: [
    'Printer Support',
    'Network / Internet Support',
  ],
  'Biometric Device': ['Biometric / Attendance Support'],
  'ATM / Kiosk': [
    'Software / System Support',
    'Account / Access Support',
    'Network / Internet Support',
  ],
  'Network / Wi-Fi': [
    'Network / Internet Support',
    'Server / NAS / Database Support',
  ],
  Server: [
    'Server / NAS / Database Support',
    'Network / Internet Support',
    'Software / System Support',
  ],
  'MBWin / Sky360': ['Account / Access Support', 'Software / System Support'],
  'Excel / Office Application': ['Software / System Support', 'Account / Access Support'],
  'Other Device': HELPDESK_SUPPORT_CATEGORIES.filter((category) => category !== 'Other Support').concat('Other Support'),
};

const DEVICE_CONCERN_TYPE_MAP = {
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
      'Teller reactivation request',
      'Teller role modification request',
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

const getSupportCategoriesForDevice = (deviceName = '') =>
  DEVICE_SUPPORT_CATEGORY_MAP[deviceName] || HELPDESK_SUPPORT_CATEGORIES;

const getConcernOptionsForSelection = (category = '', deviceName = '') =>
  DEVICE_CONCERN_TYPE_MAP[deviceName]?.[category] || HELPDESK_CATEGORY_CONCERNS[category] || [];


const isAdminDepartment = (department = '') =>
  String(department || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '') === 'admin';

const getNewBurnoutRequestForm = () => ({
  branch: '',
  custodian: '',
  brand: '',
  model: '',
  serialNumber: '',
  deviceName: '',
  department: '',
  supportCategory: 'Burnout',
  remarks: '',
});

const getBurnoutRemarksPlaceholder = () =>
  'Write the burnout details, affected device, location, and assistance needed.';

const getTicketDisplayCode = (ticket = {}) => ticket.ticketCode || ticket.id || '';

const ANNOUNCEMENTS = [
  {
    tag: 'Helpdesk',
    title: 'Use the correct support category',
    description:
      'Choose the support category first. The concern type list will only show related options.',
    date: 'Guide',
  },
  {
    tag: 'SLA',
    title: 'SLA is calculated automatically',
    description:
      'The system calculates the impact level from the selected support category and concern type.',
    date: 'Auto',
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
  'The impact level is calculated automatically after you select the concern type.',
  'Enter the AnyDesk number because ICT mainly supports tickets remotely.',
  'Attach a screenshot or photo if possible.',
];

const SLA_PICKER_OPTIONS = [
  {
    level: 'Low',
    icon: ShieldCheck,
    title: 'Low',
    impact: 'Routine request or non-blocking assistance',
    text: 'For minor concerns affecting only one user and work can still continue.',
  },
  {
    level: 'Medium',
    icon: Clock3,
    title: 'Medium',
    impact: 'Work affected with workaround',
    text: 'For concerns affecting several users or causing delay in work.',
  },
  {
    level: 'High',
    icon: Wrench,
    title: 'High',
    impact: 'Work or branch function blocked',
    text: 'For concerns affecting branch operation, important transactions, or system availability.',
  },
  {
    level: 'Critical',
    icon: BadgeCheck,
    title: 'Critical',
    impact: 'Core operation stopped',
    text: 'For concerns where operation is stopped, the system is down, or there is possible data loss.',
  },
];

const formatSlaTargetWindow = (hours) => {
  if (hours % 24 === 0) {
    const days = hours / 24;
    return `${days} calendar day${days === 1 ? '' : 's'}`;
  }
  return `${hours} hours`;
};

const getSlaTargetSummary = (level) => {
  const targets = SLA_TARGET_HOURS[level] || SLA_TARGET_HOURS.Low;
  if (targets.response === targets.resolution) {
    return `Response and resolution within ${formatSlaTargetWindow(targets.response)}.`;
  }
  return `Response within ${formatSlaTargetWindow(targets.response)}; resolution within ${formatSlaTargetWindow(targets.resolution)}.`;
};

const SUPPORT_FLOW = [
  {
    title: 'Submit request',
    text: 'Employee provides all required details and attachments.',
  },
  {
    title: 'ICT review',
    text: 'The system assigns the impact level and ICT validates the concern.',
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
  'Device or System:',
  'Page or Module:',
  'What Happened:',
  'Error Message:',
  'AnyDesk Number:',
].join('\n');

const CONCERN_DESCRIPTION_TEMPLATES = {
  applicationRequest: [
    'Application Name:',
    'Computer or User:',
    'Request Needed:',
    'Reason:',
    'AnyDesk Number:',
  ].join('\n'),
  mbwin: [
    'System Name:',
    'Username or Employee ID:',
    'Page or Module:',
    'What Happened:',
    'Error Message:',
    'AnyDesk Number:',
  ].join('\n'),
  network: [
    'Connection Type:',
    'Location Affected:',
    'What Happened:',
    'Router or Cable Status:',
    'AnyDesk Number:',
  ].join('\n'),
  printer: [
    'Printer Model:',
    'Printer Location:',
    'Printer Issue:',
    'Error or Light Status:',
    'AnyDesk Number:',
  ].join('\n'),
  hardware: [
    'Desktop or Laptop Name:',
    'Unit Location:',
    'What Happened:',
    'Error Message:',
    'AnyDesk Number:',
  ].join('\n'),
  account: [
    'System or Account:',
    'Username or Employee ID:',
    'Access Needed:',
    'What Happened:',
    'AnyDesk Number:',
  ].join('\n'),
  biometric: [
    'Biometric Device:',
    'Branch or Location:',
    'Employee Affected:',
    'What Happened:',
    'AnyDesk Number:',
  ].join('\n'),
  server: [
    'Server or Storage Name:',
    'Folder or Database:',
    'What Happened:',
    'Error Message:',
    'AnyDesk Number:',
  ].join('\n'),
  other: [
    'Request Type:',
    'Device or System:',
    'What Happened:',
    'Needed Date:',
    'AnyDesk Number:',
  ].join('\n'),
  software: [
    'System Name:',
    'Page or Module:',
    'What Happened:',
    'Error Message:',
    'AnyDesk Number:',
  ].join('\n'),
};

const getTemplateLabels = (template = DEFAULT_DESCRIPTION_TEMPLATE) =>
  template
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const normalizeTextareaValue = (value = '') => String(value || '').replace(/\r\n/g, '\n');

const normalize = (value) => String(value || '').trim().toLowerCase();
const normalizeEmployeeTicketStatus = (status = '') =>
  normalize(status).replace(/[-_]+/g, ' ').replace(/\s+/g, ' ');

const EMPLOYEE_PENDING_STATUSES = new Set(['created', 'submitted', 'pending', 'modified']);
const EMPLOYEE_ACTIVE_STATUSES = new Set([
  'in progress',
  'moved date',
  'escalated',
  'waiting for requester',
  'waiting for vendor',
  'waiting for approval',
  'for inspection',
  'under burnout',
]);
const EMPLOYEE_WAITING_STATUSES = new Set([
  'waiting for requester',
  'waiting for vendor',
  'waiting for approval',
]);
const EMPLOYEE_NEXT_ACTION_STATUSES = new Set(['moved date', ...EMPLOYEE_WAITING_STATUSES]);

const EMPLOYEE_FINAL_OUTCOME_LABELS = {
  resolved: 'Resolved',
  'passed burnout': 'Passed Burnout',
  'ready for deployment': 'Ready for Deployment',
  deployed: 'Deployed',
  'failed burnout': 'Failed Burnout',
  damaged: 'Damaged',
  'for repair': 'For Repair',
  'for replacement': 'For Replacement',
};

const getEmployeeTicketStatusLabel = (status = '') => {
  const normalized = normalizeEmployeeTicketStatus(status);

  if (normalized === 'in progress') return 'In Progress';
  if (normalized === 'moved date') return 'Moved Date';
  if (normalized === 'for inspection') return 'For Inspection';
  if (normalized === 'under burnout') return 'Under Burnout';
  if (EMPLOYEE_FINAL_OUTCOME_LABELS[normalized]) return EMPLOYEE_FINAL_OUTCOME_LABELS[normalized];
  if (normalized === 'cancelled' || normalized === 'canceled') return 'Cancelled';
  if (normalized === 'escalated') return 'Escalated';
  if (normalized.startsWith('waiting for ')) return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase());

  return normalized ? normalized.replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Pending';
};

const isEmployeePendingTicket = (ticket = {}) => EMPLOYEE_PENDING_STATUSES.has(normalizeEmployeeTicketStatus(ticket.status));

const isEmployeeActiveTicket = (ticket = {}) => EMPLOYEE_ACTIVE_STATUSES.has(normalizeEmployeeTicketStatus(ticket.status));

const isEmployeeResolvedTicket = (ticket = {}) => normalizeEmployeeTicketStatus(ticket.status) === 'resolved';

const isEmployeeQueueTicket = (ticket = {}) => isEmployeePendingTicket(ticket) || isEmployeeActiveTicket(ticket);

const getEmployeeQueueLabel = (ticket = {}) => {
  const queuePosition = Number(ticket.queuePosition);
  const queueSize = Number(ticket.queueSize);

  if (
    !Number.isSafeInteger(queuePosition) ||
    !Number.isSafeInteger(queueSize) ||
    queuePosition < 1 ||
    queueSize < queuePosition
  ) {
    return '';
  }

  return `Queue #${queuePosition} of ${queueSize}`;
};

const getEmployeeClosedTicketMessage = (ticket = {}) => {
  const normalized = normalize(ticket.status).replace(/[-_]+/g, ' ').replace(/\s+/g, ' ');

  if (normalized === 'passed burnout') return 'This Burnout unit passed testing and is ready for deployment.';
  if (normalized === 'ready for deployment') return 'This unit passed Burnout testing and is awaiting deployment.';
  if (normalized === 'deployed') return 'This unit was deployed after completing Burnout testing.';
  if (normalized === 'failed burnout') return 'This unit did not pass Burnout testing.';
  if (normalized === 'damaged') return 'ICT marked this unit as damaged.';
  if (normalized === 'for repair') return 'ICT marked this unit for repair.';
  if (normalized === 'for replacement') return 'ICT marked this unit for replacement.';
  if (normalized === 'resolved') return 'This ticket has been resolved by ICT.';
  if (normalized === 'cancelled' || normalized === 'canceled') return 'This ticket has been cancelled.';

  return '';
};

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
    haystack.includes('sky360') ||
    haystack.includes('mb win') ||
    haystack.includes('mbwim') ||
    haystack.includes('mb wim')
  );
};

const isMbwinTellerRoleModificationRequest = (formOrTicket = {}) => {
  if (!isMbwinRequest(formOrTicket)) return false;

  const requestText = getIssueContextText(formOrTicket).replace(/[^a-z0-9]+/g, ' ');
  const requiresSaarConcern = /\bnew user(?: account)? request\b|\bpassword reset\b|\bteller (?:role|function) modification request\b/.test(requestText);
  const referencesRoleOrFunction = /\b(?:teller\s+)?(?:user\s+)?(?:role|function)\b/.test(requestText);
  const concernsExpiry = /\b(?:expiry|expiration|expire|expires|expired|expiring)\b/.test(requestText);
  const requestsModification = /\b(?:modify|modification|change|update|amend|add|remove)\b/.test(requestText);

  return requiresSaarConcern || (referencesRoleOrFunction && requestsModification && !concernsExpiry);
};

const hasSaarAttachment = (attachment) =>
  Boolean(
    attachment &&
      (attachment.dataUrl || attachment.url || attachment.publicUrl || attachment.path)
  );

const isOtherConcernSelected = (formOrTicket = {}) => {
  const concern = normalize(formOrTicket.concernType);

  return concern.includes('other') || concern.includes('not listed');
};

const getIssueDescriptionTemplate = (context = {}) => {
  const supportCategory = typeof context === 'string' ? context : context.supportCategory;
  const concernType = typeof context === 'string' ? '' : context.concernType;
  const deviceName = typeof context === 'string' ? '' : context.deviceName;

  const combined = [supportCategory, concernType, deviceName].map(normalize).join(' ');

  if (supportCategory === 'Printer Support') {
    return CONCERN_DESCRIPTION_TEMPLATES.printer;
  }

  if (
    (supportCategory === 'Software / System Support' && concernType === 'Software installation request') ||
    (supportCategory === 'Computer / Laptop Support' && concernType === 'Application installation')
  ) {
    return CONCERN_DESCRIPTION_TEMPLATES.applicationRequest;
  }

  if (supportCategory === 'Computer / Laptop Support') {
    return CONCERN_DESCRIPTION_TEMPLATES.hardware;
  }

  if (supportCategory === 'Network / Internet Support') {
    return CONCERN_DESCRIPTION_TEMPLATES.network;
  }

  if (supportCategory === 'Account / Access Support') {
    return CONCERN_DESCRIPTION_TEMPLATES.account;
  }

  if (supportCategory === 'Biometric / Attendance Support') {
    return CONCERN_DESCRIPTION_TEMPLATES.biometric;
  }

  if (supportCategory === 'Server / NAS / Database Support') {
    return CONCERN_DESCRIPTION_TEMPLATES.server;
  }

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

  if (hasAnyKeyword(combined, ['mbwin', 'sky360', 'mb win', 'mbwim', 'mb wim', 'teller', 'treasury', 'saar'])) {
    return CONCERN_DESCRIPTION_TEMPLATES.mbwin;
  }

  if (hasAnyKeyword(combined, ['printer', 'scanner', 'print', 'scan'])) {
    return CONCERN_DESCRIPTION_TEMPLATES.printer;
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

const getDescriptionInputPlaceholder = () => '';

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

const getShortDescriptionDetail = (value = '', context = {}) => {
  const values = parseDescriptionValues(value, context);
  const descriptionLabel = Object.keys(values).find((label) =>
    normalize(label).includes('what happened') || normalize(label).includes('short description')
  );

  return descriptionLabel ? String(values[descriptionLabel] || '').trim() : '';
};

const getAnyDeskDetail = (value = '', context = {}) => {
  const values = parseDescriptionValues(value, context);
  const anyDeskLabel = Object.keys(values).find((label) => normalize(label).includes('anydesk'));

  return anyDeskLabel ? String(values[anyDeskLabel] || '').trim() : '';
};

const getNewTicketForm = (user = {}) => ({
  ...emptyForm,
  branch: user.branch || user.office || '',
  department: user.department || '',
  contactNumber: user.phone || '',
  description: DEFAULT_DESCRIPTION_TEMPLATE,
  photoAttachments: [],
  saarAttachment: null,
  sla: deriveTicketImpact().sla,
  impact: deriveTicketImpact().impact,
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
      (
        file.type?.startsWith('image/') ||
        PHOTO_ALLOWED_TYPES.includes(file.type) ||
        /\.(jpe?g|png|webp|gif|bmp)$/i.test(file.name || '')
      )
  );

const compressProfilePhoto = async (file) => {
  if (!isPhotoFile(file)) {
    throw new Error('Choose a valid image file for your profile photo.');
  }

  if (file.size > PHOTO_MAX_SIZE) {
    throw new Error('Profile photo must not exceed 4 MB.');
  }

  const source = await fileToDataUrl(file);

  return new Promise((resolve) => {
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement('canvas');
      const maxSize = 420;
      const sourceSize = Math.min(image.width, image.height);
      const sx = Math.max(0, (image.width - sourceSize) / 2);
      const sy = Math.max(0, (image.height - sourceSize) / 2);
      const outputSize = Math.min(maxSize, sourceSize || maxSize);
      canvas.width = outputSize;
      canvas.height = outputSize;

      const context = canvas.getContext('2d');
      if (!context) {
        resolve(source);
        return;
      }

      context.drawImage(image, sx, sy, sourceSize, sourceSize, 0, 0, outputSize, outputSize);
      resolve(canvas.toDataURL('image/jpeg', 0.86));
    };

    image.onerror = () => resolve(source);
    image.src = source;
  });
};

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
    selectedFiles.map(async (file, index) => {
      const safeName = file.name || `pasted-image-${index + 1}.png`;

      return {
        id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${safeName}`,
        name: safeName,
        type: file.type || 'image/png',
        size: file.size,
        sizeLabel: formatFileSize(file.size),
        uploadedAt: new Date().toLocaleString(),
        dataUrl: await fileToDataUrl(file),
      };
    })
  );
};

const getClipboardImageFiles = (clipboardData) => {
  const files = Array.from(clipboardData?.files || []).filter(isPhotoFile);
  const itemFiles = Array.from(clipboardData?.items || [])
    .filter((item) => item.kind === 'file' && item.type?.startsWith('image/'))
    .map((item) => item.getAsFile())
    .filter(Boolean)
    .filter(isPhotoFile);

  return [...files, ...itemFiles].filter(
    (file, index, list) =>
      list.findIndex((candidate) =>
        candidate.name === file.name &&
        candidate.size === file.size &&
        candidate.type === file.type
      ) === index
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

  const status = normalizeEmployeeTicketStatus(ticket.status);
  const hasTechnician = Boolean(String(ticket.technician || '').trim()) && ticket.technician !== 'Unassigned';
  const hasStarted = Boolean(ticket.workStartedAt);
  const hasAction = Boolean(
    String(ticket.actionTaken || '').trim() ||
      String(ticket.resolution || '').trim()
  );

  return EMPLOYEE_PENDING_STATUSES.has(status) && !hasTechnician && !hasStarted && !hasAction;
};

const compactDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

const toDate = (value) => {
  if (!value) return null;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatCompactDateTime = (value) => {
  const parsed = toDate(value);
  return parsed ? compactDateFormatter.format(parsed) : value;
};

const escapeTicketPrintHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const printEmployeeTicket = (ticket = {}, user = {}) => {
  if (typeof window === 'undefined') return;

  const printWindow = window.open('', '_blank', 'width=960,height=720');
  if (!printWindow) {
    window.alert('Please allow pop-ups to print this ticket.');
    return;
  }

  const formatPrintDateTime = (value) => {
    if (!value) return '';
    const parsed = toDate(value);
    return parsed ? compactDateFormatter.format(parsed) : String(value);
  };
  const startedAt = ticket.workStartedAt || ticket.work_started_at || '';
  const endedAt = ticket.workEndedAt || ticket.work_ended_at || '';
  const normalizedStatus = normalizeEmployeeTicketStatus(ticket.status);
  const branchDepartment = [ticket.branch, ticket.department]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(' / ');
  const fields = [
    ['Ticket Code', getTicketDisplayCode(ticket)],
    ['Status', getEmployeeTicketStatusLabel(ticket.status)],
    ['SLA', ticket.sla],
    ['Requester', ticket.requester || ticket.ownerEmail || user.fullName || user.name || user.email],
    ['Employee ID', ticket.employeeId || user.employeeId],
    ['Branch / Department', branchDepartment],
    ['Support Category', ticket.supportCategory],
    ['Concern Type', ticket.concernType],
    ['Submitted', formatPrintDateTime(ticket.createdAt || ticket.submittedAt || ticket.date)],
    ['Response Due', formatPrintDateTime(ticket.responseDueAt || ticket.response_due_at)],
    ['Resolution Due', formatPrintDateTime(ticket.resolutionDueAt || ticket.resolution_due_at)],
    ['Next Action', formatPrintDateTime(ticket.nextActionAt || ticket.next_action_at)],
    ['First ICT Response', formatPrintDateTime(ticket.firstResponseAt || ticket.first_response_at)],
    ['Moved Date', formatPrintDateTime(ticket.movedDateAt || ticket.movedDate || ticket.movedAt)],
    ['Resolved Date', formatPrintDateTime(ticket.workEndedAt || ticket.work_ended_at || ticket.resolvedAt || ticket.resolved_at)],
    [normalizedStatus === 'resolved'
      && ticket.escalationPartner === 'Third Party Company'
      && String(ticket.escalationPartnerCompany || '').trim()
      ? 'Resolved By'
      : 'Assigned ICT Staff', ticket.technician || ticket.assignedTo || 'Unassigned'],
    ['Escalation Partner', normalizedStatus === 'escalated' || (normalizedStatus === 'resolved'
      && ticket.escalationPartner === 'Third Party Company'
      && String(ticket.escalationPartnerCompany || '').trim())
      ? [ticket.escalationPartner, ticket.escalationPartner === 'Third Party Company' ? ticket.escalationPartnerCompany : ''].filter(Boolean).join(' — ')
      : ''],
    ['Device / System', ticket.deviceName || ticket.deviceType],
    ['Contact', ticket.contactNumber],
    ['Work Started', formatPrintDateTime(startedAt)],
    ['Work Ended', formatPrintDateTime(endedAt)],
    ['Work Duration', startedAt ? getEmployeePrintDuration(startedAt, endedAt) : ''],
  ].filter(([, value]) => value != null && String(value).trim() !== '');
  const notes = [
    ['Description of Problem', ticket.description],
    ['Action Taken', ticket.actionTaken],
    ['Resolution Notes', ticket.resolution],
    ['Recommendation', ticket.recommendation],
    ['Waiting Reason', EMPLOYEE_WAITING_STATUSES.has(normalizedStatus) ? ticket.actionReason : ''],
  ].filter(([, value]) => String(value || '').trim());
  const printedAt = compactDateFormatter.format(new Date());
  const body = `
    <main class="print-page">
      <header class="coop-letterhead">
        <div class="coop-logo-wrap"><img src="/Logos/Logo.png" alt="MEMPCO logo" /></div>
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
      <section class="doc-head">
        <h2>Helpdesk Ticket Report</h2>
        <div class="meta">Printed ${escapeTicketPrintHtml(printedAt)}</div>
      </section>
      <section class="grid">
        ${fields.map(([label, value]) => `
          <div class="field">
            <span>${escapeTicketPrintHtml(label)}</span>
            <strong>${escapeTicketPrintHtml(value)}</strong>
          </div>
        `).join('')}
      </section>
      ${notes.length ? `
        <section class="ticket-notes-grid">
          ${notes.map(([label, value]) => `
            <article>
              <h3>${escapeTicketPrintHtml(label)}</h3>
              <div class="note">${escapeTicketPrintHtml(value)}</div>
            </article>
          `).join('')}
        </section>
      ` : ''}
    </main>
  `;

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>Ticket ${escapeTicketPrintHtml(getTicketDisplayCode(ticket))}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          @page { size: letter landscape; margin: 0.28in; }
          * { box-sizing: border-box; }
          html, body { width: 100%; margin: 0; padding: 0; color: #111827; font-family: Arial, Helvetica, sans-serif; background: #fff; }
          body { display: flex; justify-content: center; align-items: flex-start; }
          .print-page { width: min(10.44in, calc(100vw - 24px)); max-width: 100%; margin: 0 auto; }
          .coop-letterhead { display: grid; grid-template-columns: 96px minmax(0, 1fr) 96px; align-items: center; gap: 12px; padding-bottom: 7px; margin-bottom: 8px; border-bottom: 3px solid #111827; box-shadow: inset 0 -1px 0 #dc2626; }
          .coop-logo-wrap { width: 96px; text-align: center; }
          .coop-logo-wrap img { display: block; width: 82px; height: 82px; object-fit: contain; margin: 0 auto; }
          .coop-copy { grid-column: 2; text-align: center; }
          .coop-copy h1 { margin: 0; color: #dc2626; font-size: 20px; line-height: 1.05; font-weight: 900; text-transform: uppercase; letter-spacing: 0.04em; }
          .coop-copy p { margin: 1px 0; color: #000; font-size: 13px; line-height: 1.2; }
          .coop-contact { display: flex; flex-wrap: wrap; justify-content: center; gap: 16px; margin-top: 3px; color: #000; font-size: 11.5px; font-weight: 700; }
          .doc-head { display: flex; justify-content: space-between; gap: 18px; align-items: end; margin: 6px 0 8px; }
          .doc-head h2 { margin: 0; color: #111827; font-size: 17px; line-height: 1.05; text-transform: uppercase; }
          .meta { color: #64748b; font-size: 10px; font-weight: 800; text-align: right; }
          .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
          .field { min-width: 0; padding: 7px 8px; border: 1px solid #e5e7eb; border-radius: 7px; background: #f8fafc; }
          .field span { display: block; color: #64748b; font-size: 8.5px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; }
          .field strong { display: block; margin-top: 3px; font-size: 10.5px; line-height: 1.25; white-space: pre-wrap; overflow-wrap: anywhere; }
          .ticket-notes-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-rows: minmax(74px, auto); gap: 8px; margin-top: 8px; }
          .ticket-notes-grid article { min-width: 0; display: flex; flex-direction: column; break-inside: avoid; page-break-inside: avoid; }
          .ticket-notes-grid h3 { margin: 0 0 5px; color: #374151; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; }
          .note { flex: 1 1 auto; min-height: 52px; padding: 8px 9px; border: 1px solid #d9dee7; border-radius: 6px; background: #fff; white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.4; font-size: 10.5px; }
          @media screen and (max-width: 760px) {
            .print-page { width: calc(100vw - 24px); }
            .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .ticket-notes-grid { grid-template-columns: 1fr; grid-auto-rows: auto; }
          }
          @media print {
            .print-page { width: 10.44in; max-width: 100%; margin: 0 auto; }
            .grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
            .ticket-notes-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-rows: minmax(74px, auto); }
          }
        </style>
      </head>
      <body>${body}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.setTimeout(() => printWindow.print(), 500);
};

const getEmployeePrintDuration = (startedAt, endedAt) => {
  const start = toDate(startedAt);
  if (!start) return '';
  const end = toDate(endedAt) || new Date();
  const totalMinutes = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const duration = days ? `${days}d ${hours}h` : hours ? `${hours}h ${minutes}m` : `${minutes}m`;
  return endedAt ? duration : `${duration} (ongoing)`;
};

const getCompactTicketRequester = (ticket = {}, user = {}) =>
  ticket.name || ticket.requester || ticket.requestedBy || user.fullName || user.name || 'Employee';

const getCompactTicketDate = (ticket = {}) =>
  formatCompactDateTime(ticket.createdAt || ticket.submittedAt || ticket.date || ticket.lastUpdated || 'Not recorded');

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
  HRMax: () => <BriefcaseBusiness className="sidebar-nav-icon" aria-hidden="true" />,
  Connect: () => <Link2 className="sidebar-nav-icon" aria-hidden="true" />,
  Logout: () => <LogOut className="sidebar-nav-icon" aria-hidden="true" />,
  Bell: () => <Bell className="icon-bell" aria-hidden="true" />,
};


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

function PhotoAttachmentGallery({ photos = [], emptyText = 'No photo attachments.', onRemove, className = '' }) {
  const validPhotos = Array.isArray(photos)
    ? photos.filter((photo) => photo?.dataUrl || photo?.url || photo?.publicUrl || photo?.path || photo?.name)
    : [];

  if (!validPhotos.length) {
    return <span className="ticket-form-hint">{emptyText}</span>;
  }

  return (
    <div className={`attached-photo-grid ${className}`.trim()}>
      {validPhotos.map((photo, index) => {
        const source = photo.dataUrl || photo.url || photo.publicUrl || '';
        const fileName = photo.name || `Photo ${index + 1}`;

        return (
          <div key={photo.id || photo.path || `${fileName}-${index}`} className="attached-photo-card-wrap">
            <div className="attached-photo-card">
              <div className="attached-photo-preview">
                <a className="attached-photo-open" href={source || '#'} target="_blank"
                  rel="noopener noreferrer" aria-label={`Open ${fileName}`}>
                  {source ? (
                    <img src={source} alt={fileName} />
                  ) : (
                    <span className="attached-photo-placeholder"><MonoIcon icon={ImageIcon} /></span>
                  )}
                </a>
                {onRemove && (
                  <button type="button" className="attached-photo-action attached-photo-remove"
                    onClick={() => onRemove(photo.id)} aria-label={`Remove ${fileName}`} title="Remove image">
                    <X size={18} aria-hidden="true" />
                  </button>
                )}
                {source && (
                  <a className="attached-photo-action attached-photo-save" href={source} download={fileName}
                    aria-label={`Save ${fileName}`} title="Save image">
                    <Save size={18} aria-hidden="true" />
                  </a>
                )}
              </div>
              <span title={fileName}>{fileName}</span>
              <em>{photo.sizeLabel || 'Image file'}</em>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function IssueDescriptionBuilder({ form, onChange }) {
  const labels = getTemplateLabels(getIssueDescriptionTemplate(form));
  const values = parseDescriptionValues(form.description, form);

  return (
    <div className="issue-description-composer" id="ticket-desc-builder" aria-label="Issue description fields">
      <div className="issue-description-paper">
        {labels.map((label) => {
          const value = values[label] || '';
          const fieldId = `issue-field-${slugify(label)}`;
          const normalizedLabel = label.toLowerCase();
          const isLongField =
            normalizedLabel.includes('summary') ||
            normalizedLabel.includes('problem') ||
            normalizedLabel.includes('description') ||
            normalizedLabel.includes('concern') ||
            normalizedLabel.includes('what happened');

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

    </div>
  );
}

function TicketPagination({ page, totalPages, totalItems, pageSize, onPageChange }) {
  if (totalPages <= 1) return null;

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

function StatCard({ label, value, meta }) {
  return (
    <article className="stat-card glass">
      <div className="stat-card-head">
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
          <p className="ticket-chat-requester">{ticket?.technician || ticket?.assignedTo || 'Unassigned'}</p>
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
                  <span className="ticket-message-sender-role">{item.senderRole}</span>
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

/* =========================
   EMPLOYEE TICKET DETAIL MODAL
   — structure mirrors admin TicketActionModal exactly
========================= */

function EmployeeTicketDetailModal({
  ticket,
  now = Date.now(),
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
  onPastePhotos,
  onRemovePhoto,
  onSend,
}) {
  const canEditTicket = canEmployeeEditTicket(ticket);
  const normalizedStatus = normalizeEmployeeTicketStatus(ticket.status);
  const isWaitingWorkflow = EMPLOYEE_WAITING_STATUSES.has(normalizedStatus);
  const hasNextAction = EMPLOYEE_NEXT_ACTION_STATUSES.has(normalizedStatus);
  const isEscalated = normalizedStatus === 'escalated';
  const isExpandedWorkflow = isWaitingWorkflow || isEscalated || normalizedStatus === 'moved date';
  const employeeStatusLabel = getEmployeeTicketStatusLabel(ticket.status);
  const closedTicketMessage = getEmployeeClosedTicketMessage(ticket);
  const lockReason =
    closedTicketMessage ||
    ticket.employeeLockReason ||
    ticket.employeeEditLockReason ||
    'Locked because ICT is already handling this ticket.';
  const previewPhotos = Array.isArray(ticket.photoAttachments)
    ? ticket.photoAttachments.filter((photo) => photo?.dataUrl || photo?.url || photo?.publicUrl)
    : [];
  const [previewPhotoIndex, setPreviewPhotoIndex] = useState(null);
  const isChatOpen = shouldShowConversation && !isChatMinimized;
  const requesterName = ticket.requester || user?.fullName || user?.name || user?.email || 'Employee';
  const submittedLabel = formatCompactDateTime(ticket.createdAt || ticket.submittedAt || ticket.date || 'Submitted');
  const assignedStaff = ticket.technician || ticket.assignedTo || 'Unassigned';
  const saarLabel =
    ticket.saarAttachment?.name ||
    (ticket.saarRequired ? 'Required, no file found' : 'Not required');

  useEffect(() => {
    if (previewPhotoIndex === null) return undefined;

    const handlePreviewKeyDown = (event) => {
      if (event.key === 'Escape') setPreviewPhotoIndex(null);
      if (event.key === 'ArrowLeft' && previewPhotos.length > 1) {
        setPreviewPhotoIndex((current) => (current - 1 + previewPhotos.length) % previewPhotos.length);
      }
      if (event.key === 'ArrowRight' && previewPhotos.length > 1) {
        setPreviewPhotoIndex((current) => (current + 1) % previewPhotos.length);
      }
    };

    window.addEventListener('keydown', handlePreviewKeyDown);
    return () => window.removeEventListener('keydown', handlePreviewKeyDown);
  }, [previewPhotoIndex, previewPhotos.length]);

  const activePreviewPhoto = previewPhotoIndex === null ? null : previewPhotos[previewPhotoIndex];
  const activePreviewSource = activePreviewPhoto?.dataUrl || activePreviewPhoto?.url || activePreviewPhoto?.publicUrl;
  const ictUpdates = [
    ['Action Taken', ticket.actionTaken, 'No action recorded yet.'],
    ['First ICT Response', ticket.firstResponseAt ? formatCompactDateTime(ticket.firstResponseAt) : '', 'No first response recorded yet.'],
    ['Resolution Notes', ticket.resolution, 'No resolution recorded yet.'],
    ['Recommendation', ticket.recommendation, 'No recommendation recorded.'],
  ];

  return (
    <div
      className={[
        'modal-overlay',
        'employee-ticket-action-overlay',
        'ticket-action-overlay',
      ].filter(Boolean).join(' ')}
      role="dialog"
      aria-modal="true"
      aria-label="Ticket details"
    >
      <article data-employee-details className="modal-box glass employee-admin-modal-box employee-ticket-modal ticket-action-modal is-support-modal ticket-modal-readable">
        {/* Admin-matched ticket identity and SLA header */}
        <div className="admin-modal-head ticket-action-head employee-admin-ticket-head">
          <div className="ticket-action-head-main">
            <div className="ticket-action-identity-group">
              <span className="ticket-id employee-admin-ticket-id" title={getTicketDisplayCode(ticket)}>
                {getTicketDisplayCode(ticket)}
              </span>

              <div className="ticket-action-title-copy">
                <h3>{ticket.concernType || 'Helpdesk Ticket'}</h3>
                <p>{ticket.branch || 'No branch'} - {ticket.department || 'No department'}</p>
              </div>
            </div>

            <div className="ticket-action-header-status employee-ticket-action-header-status" aria-label="Ticket status">
              <TicketHandlingIndicator ticket={ticket} now={now} detailed currentUserId={user?.id} />
            </div>
          </div>

          <p className="employee-ticket-sla-deadline-note">
            Response due {formatCompactDateTime(ticket.responseDueAt || ticket.response_due_at || 'not set')}
            {' | '}Resolution due {formatCompactDateTime(ticket.resolutionDueAt || ticket.resolution_due_at || 'not set')}
            {' | '}Calendar hours; continues while waiting
          </p>

          <div className="ticket-action-header-actions">
            <button
              type="button"
              className="admin-modal-close"
              onClick={onClose}
              aria-label="Close modal"
            >
              <X aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="ticket-action-scroll-content employee-admin-scroll-content">
          {/* Same 4-column / 2-row information grid used by the Admin modal */}
          <div className="admin-modal-grid ticket-action-info-grid employee-admin-info-grid">
          <div className="ticket-meta-cell">
            <span>Ticket Code</span>
            <p>{getTicketDisplayCode(ticket)}</p>
          </div>

          <div className="ticket-meta-cell">
            <span>Requester</span>
            <p>{requesterName}</p>
          </div>

          <div className="ticket-meta-cell">
            <span>Employee ID</span>
            <p>{ticket.employeeId || user?.employeeId || 'Not provided'}</p>
          </div>

          <div className="ticket-meta-cell">
            <span>Support Category</span>
            <p>{ticket.supportCategory || 'Unspecified'}</p>
          </div>

          <div className="ticket-meta-cell">
            <span>Submitted</span>
            <p>{submittedLabel}</p>
          </div>

          <div className="ticket-meta-cell">
            <span>Device / System</span>
            <p>{ticket.deviceName || 'Not specified'}</p>
          </div>

          {ticket.brand && <div className="ticket-meta-cell">
            <span>Brand &amp; Model</span>
            <p>{ticket.brand}</p>
          </div>}

          {ticket.serialNumber && <div className="ticket-meta-cell">
            <span>Serial Number</span>
            <p>{ticket.serialNumber}</p>
          </div>}

          {ticket.custodian && <div className="ticket-meta-cell">
            <span>Custodian</span>
            <p>{ticket.custodian}</p>
          </div>}

          <div className="ticket-meta-cell">
            <span>Contact</span>
            <p>{ticket.contactNumber || 'Not specified'}</p>
          </div>

          <div className="ticket-meta-cell">
            <span>SAAR</span>
            <p>
              {(ticket.saarAttachment?.dataUrl || ticket.saarAttachment?.url || ticket.saarAttachment?.publicUrl) ? (
                <a
                  href={ticket.saarAttachment.dataUrl || ticket.saarAttachment.url || ticket.saarAttachment.publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {saarLabel}
                </a>
              ) : saarLabel}
            </p>
          </div>
        </div>

        {/* Ticket context and status-specific follow-up match the Admin layout. */}
        <div className={`ticket-action-details-row employee-admin-details-row${isExpandedWorkflow ? ' is-expanded-workflow' : ''}`}>
          <div className={`employee-ticket-description-column${isWaitingWorkflow ? ' is-waiting-workflow' : ''}`}>
            <div className="admin-description-box ticket-action-description">
              <div className="employee-ticket-description-heading">
                <span>Description of Problem</span>
                {previewPhotos.length > 0 && (
                  <button
                    type="button"
                    className="employee-ticket-attachment-trigger"
                    onClick={() => setPreviewPhotoIndex(0)}
                    aria-label={`Preview ${previewPhotos.length} attached image${previewPhotos.length === 1 ? '' : 's'}`}
                    title="Preview attached image"
                  >
                    <ImageIcon size={16} aria-hidden="true" />
                    <span>{previewPhotos.length} image{previewPhotos.length === 1 ? '' : 's'}</span>
                  </button>
                )}
              </div>
              <p>{ticket.description || 'No description provided.'}</p>
            </div>

            {isWaitingWorkflow && <div className="employee-ticket-followup-note">
              <span>Waiting Reason</span>
              <p>{ticket.actionReason || 'No waiting reason recorded.'}</p>
            </div>}
          </div>

          <dl className={`ticket-action-control-stack employee-ticket-update-stack employee-admin-control-stack${isExpandedWorkflow ? ' is-expanded-workflow' : ''}`} aria-label="Ticket handling details">
            <div className="ticket-form-group">
              <dt>Status</dt>
              <dd className="employee-admin-readonly-field">{employeeStatusLabel}</dd>
            </div>

            <div className="ticket-form-group">
              <dt>SLA</dt>
              <dd className="employee-admin-readonly-field">{ticket.sla || 'Low'}</dd>
            </div>

            <div className="ticket-form-group">
              <dt>Assigned ICT Staff</dt>
              <dd className="employee-admin-readonly-field">{assignedStaff}</dd>
            </div>

            {(isEscalated || (normalizeEmployeeTicketStatus(ticket.status) === 'resolved'
              && ticket.escalationPartner === 'Third Party Company'
              && String(ticket.escalationPartnerCompany || '').trim())) && <div className="ticket-form-group">
              <dt>Escalation Partner</dt>
              <dd className="employee-admin-readonly-field">
                {ticket.escalationPartner === 'Third Party Company' && ticket.escalationPartnerCompany
                  ? `${ticket.escalationPartner} — ${ticket.escalationPartnerCompany}`
                  : ticket.escalationPartner || 'Not recorded'}
              </dd>
            </div>}

            {hasNextAction && <div className="ticket-form-group">
              <dt>Next Action</dt>
              <dd className="employee-admin-readonly-field">
                {formatCompactDateTime(ticket.nextActionAt || ticket.next_action_at || 'Not scheduled')}
              </dd>
            </div>}

          </dl>
        </div>

        <dl className="ticket-action-notes-grid employee-admin-notes-grid employee-ticket-updates" aria-label="ICT updates">
          {ictUpdates.map(([label, value, empty]) => (
            <div className="ticket-form-group" key={label}>
              <dt>{label}</dt>
              <dd className={`employee-ticket-update-value${value ? '' : ' is-empty'}`}>{value || empty}</dd>
            </div>
          ))}
        </dl>

        <div className="ticket-action-attachment-chat-row employee-ticket-attachment-chat-row">
        {previewPhotos.length > 0 && <section className="employee-ticket-attachments" aria-label="Ticket attachments">
          <div className="employee-ticket-attachment-summary">
            <h4>PHOTO / SCREENSHOT ATTACHMENTS</h4>
            <p>{previewPhotos.length} photo{previewPhotos.length === 1 ? '' : 's'} attached to this ticket</p>
          </div>
          <div className="employee-ticket-attachment-previews">
            {previewPhotos.map((photo, index) => {
              const source = photo.dataUrl || photo.url || photo.publicUrl;
              const fileName = photo.name || `Image ${index + 1}`;
              return (
                <div className="employee-ticket-attachment-preview" key={photo.id || photo.path || index}>
                  <button
                    type="button"
                    className="employee-ticket-attachment-image"
                    onClick={() => setPreviewPhotoIndex(index)}
                    aria-label={`Preview ${fileName}`}
                  >
                    <img src={source} alt={`Ticket attachment ${index + 1}`} />
                  </button>
                  <a href={source} download={fileName} className="employee-ticket-attachment-download"
                    aria-label={`Download ${fileName}`} title="Download image">
                    <Download size={18} aria-hidden="true" />
                  </a>
                </div>
              );
            })}
          </div>
        </section>}
        {isChatOpen && (
          typeof document !== 'undefined' && createPortal(
            <TicketConversationPanel
              ticket={ticket}
              currentUser={user}
              messages={messages}
              messageDraft={messageDraft}
              messagePhotos={messagePhotos}
              messageError={messageError}
              isSending={isSendingMessage}
              floating
              className="ticket-modal-floating-chat employee-floating-ticket-chat"
              canSend={canSendConversationMessage || Boolean(pendingMessageIdRef.current)}
              onClose={onChatClose}
              onMessageChange={onMessageChange}
              onPhotoChange={onPhotoChange}
              onPastePhotos={onPastePhotos}
              onRemovePhoto={onRemovePhoto}
              onSend={onSend}
            />,
            document.body,
          )
        )}
        {shouldShowConversation && isChatMinimized && (
          typeof document !== 'undefined' && createPortal(
            <TicketChatLauncher
              className="ticket-modal-floating-launcher"
              onClick={onChatOpen}
              unreadCount={unreadCount}
            />,
            document.body,
          )
        )}
        </div>

        <TicketWorkTimer ticket={ticket} now={now} />
        <TicketHandlingActivity ticket={ticket} now={now} />
        </div>

        {/* Admin footer layout with Employee-appropriate actions. */}
        <div className="modal-footer employee-admin-modal-footer">
          {!canEditTicket && (
            <span
              className="ticket-locked-pill modal-locked-pill employee-admin-lock-pill"
              title={lockReason}
            >
              {lockReason}
            </span>
          )}
          <div className="ticket-action-footer-tools employee-admin-footer-tools">
            <button
              type="button"
              className="modal-btn print employee-admin-footer-btn"
              onClick={() => printEmployeeTicket(ticket, user)}
              aria-label={`Print ticket ${getTicketDisplayCode(ticket)}`}
            >
              <MonoIcon icon={Printer} />
              Print Ticket
            </button>
            {canEditTicket && (
              <button
                type="button"
                className="modal-btn confirm employee-admin-footer-btn"
                onClick={onEdit}
              >
                <MonoIcon icon={PenLine} />
                Edit Ticket
              </button>
            )}
          </div>
        </div>
      </article>

      {activePreviewPhoto && activePreviewSource && (
        <div
          className="employee-ticket-photo-viewer"
          role="dialog"
          aria-modal="true"
          aria-label="Attached image preview"
          onClick={() => setPreviewPhotoIndex(null)}
        >
          <button
            type="button"
            className="employee-ticket-photo-viewer-close"
            onClick={() => setPreviewPhotoIndex(null)}
            aria-label="Close image preview"
          >
            <X aria-hidden="true" />
          </button>
          <img
            src={activePreviewSource}
            alt={activePreviewPhoto.name || 'Attached ticket image'}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}

    </div>
  );
}

/* =========================
   DASHBOARD VIEW
========================= */

function DashboardView({ user, tickets, openTickets, onGoTo, now }) {
  const resolvedCount = tickets.filter(isEmployeeResolvedTicket).length;
  const pendingCount = tickets.filter(isEmployeePendingTicket).length;
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
          <span className="section-kicker">Employee Dashboard</span>
          <h2>Helpdesk overview</h2>
          <p>Submit ICT requests, track their progress, and review updates from your support team.</p>
        </div>
      </section>

      <section className="stats-grid" aria-label="Key statistics">
        {[
          { label: 'Employee Status', value: user.status || 'Active', meta: 'Authorized employee' },
          { label: 'My Tickets', value: tickets.length, meta: 'Submitted requests' },
          { label: 'Pending Review', value: pendingCount, meta: 'Awaiting ICT action' },
          { label: 'Urgent Active', value: urgentCount, meta: `${resolvedCount} resolved` },
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
            Use the helpdesk only for ICT-related concerns. Choose the Support Category first, then select the Concern Type that best matches what happened.
          </p>

          <div className="dashboard-info-band dashboard-info-band-top">
            <div>
              <span className="section-kicker">SLA &amp; Operational Impact</span>
              <p>
                The system calculates the impact level from the selected Support Category and Concern Type, then saves it with the ticket.
              </p>
            </div>

            <div className="dashboard-sla-mini-grid">
              {SLA_PICKER_OPTIONS.map((option) => (
                <span key={option.level} className={`dashboard-sla-pill ${slugify(option.level)}`}>
                  <strong>{option.level}</strong>
                  {option.impact}
                  <small>{getSlaTargetSummary(option.level)}</small>
                </span>
              ))}
            </div>
          </div>

          <div className="support-guide-grid">
            {supportCategoryEntries.map(([category, concernList]) => (
              <section key={category} className="support-guide-card">
                <div className="support-guide-card-head">
                  <MonoIcon icon={Ticket} />
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
                Choose Software / System Support for MBWin, Sky360, Excel, Office, installation, or system errors.
              </p>
            </article>
            <article className="dashboard-guide-example-card">
              <span>Network example</span>
              <p>
                Choose Network / Internet Support for no internet, slow internet, Wi-Fi, cable, port, shared folder, or server access issues.
              </p>
            </article>
            <article className="dashboard-guide-example-card">
              <span>Hardware example</span>
              <p>
                Choose Computer / Laptop Support for slow units, no display, no power, formatting, hardware, or application installation concerns.
              </p>
            </article>
            <article className="dashboard-guide-example-card">
              <span>Attachment reminder</span>
              <p>
                Attach a screenshot, error message, printer photo, router light, damaged cable, or related image if possible.
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
                  <span className={`status ${slugify(getEmployeeTicketStatusLabel(latestTicket.status))}`}>
                    {getEmployeeTicketStatusLabel(latestTicket.status)}
                  </span>
                  <span className={`priority ${slugify(latestTicket.sla || latestTicket.priority || 'Low')}`}>
                    {latestTicket.sla || latestTicket.priority || 'Low'}
                  </span>
                </div>

                <TicketHandlingIndicator ticket={latestTicket} now={now} compact showStatus={false} currentUserId={user?.id} />

                <div className="dashboard-ticket-info-grid">
                  <div className="dashboard-ticket-meta-cell">
                    <span>Category</span>
                    <p>{latestTicket.supportCategory || 'Not specified'}</p>
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
                <p>The impact level is calculated automatically after you select the Support Category and Concern Type.</p>
              </div>
              <div className="submission-guide-item">
                <span className="submission-guide-number">03</span>
                <p>Complete the Issue Description fields shown on the form.</p>
              </div>
              <div className="submission-guide-item">
                <span className="submission-guide-number">04</span>
                <p>For MBWin / Sky360 new user account requests, password resets, and teller role or function modifications, attach the approved SAAR PDF. Teller reactivation and expiry changes do not require SAAR. Photos or screenshots are optional and limited to {PHOTO_MAX_COUNT} files.</p>
              </div>
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

function ProfileView({ user, tickets = [], onGoTo, onUserUpdate }) {
  const profilePhotoInputRef = useRef(null);
  const profilePhotoMenuRef = useRef(null);
  const [photoMessage, setPhotoMessage] = useState('');
  const [isPhotoMenuOpen, setIsPhotoMenuOpen] = useState(false);
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);
  const assignedOffice = user.branch || user.office || 'Not assigned';
  const designation = user.designation || 'Job title not provided';
  const pendingTickets = tickets.filter(isEmployeePendingTicket).length;
  const inProgressTickets = tickets.filter(isEmployeeActiveTicket).length;
  const resolvedTickets = tickets.filter(isEmployeeResolvedTicket).length;
  const cancelledTickets = tickets.filter((ticket) => getEmployeeTicketStatusLabel(ticket.status) === 'Cancelled').length;
  const latestTickets = Array.isArray(tickets) ? tickets.slice(0, 3) : [];
  const profileStats = [
    { label: 'Submitted Tickets', value: tickets.length, meta: 'requests filed' },
    {
      label: 'Open Tickets',
      value: pendingTickets + inProgressTickets,
      meta: `${pendingTickets} pending, ${inProgressTickets} in progress`,
    },
    { label: 'Resolved Tickets', value: resolvedTickets, meta: 'completed requests' },
    { label: 'Cancelled Tickets', value: cancelledTickets, meta: 'closed without resolution' },
  ];

  useEffect(() => {
    if (!isPhotoMenuOpen) return undefined;

    const closePhotoMenu = (event) => {
      if (!profilePhotoMenuRef.current?.contains(event.target)) {
        setIsPhotoMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', closePhotoMenu);

    return () => {
      document.removeEventListener('pointerdown', closePhotoMenu);
    };
  }, [isPhotoMenuOpen]);

  const saveProfilePhoto = async (profilePhoto) => {
    setIsSavingPhoto(true);
    setPhotoMessage('');
    setIsPhotoMenuOpen(false);

    try {
      const updatedUser = await updateCurrentPortalUserProfilePhoto(profilePhoto);
      onUserUpdate(updatedUser);
      setPhotoMessage(profilePhoto ? 'Profile photo updated.' : 'Profile photo removed.');
    } catch (error) {
      setPhotoMessage(error.message || 'Unable to update profile photo.');
    } finally {
      setIsSavingPhoto(false);
    }
  };

  const handleProfilePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    try {
      const profilePhoto = await compressProfilePhoto(file);
      await saveProfilePhoto(profilePhoto);
    } catch (error) {
      setPhotoMessage(error.message || 'Unable to read the selected photo.');
    }
  };

  const photoControl = (
    <div className="profile-photo-control" ref={profilePhotoMenuRef}>
      <div className="profile-photo-frame">
        <button
          type="button"
          className="avatar large premium-profile-avatar profile-photo-button portal-profile-avatar-button"
          onClick={() => setIsPhotoMenuOpen((current) => !current)}
          disabled={isSavingPhoto}
          aria-haspopup="menu"
          aria-expanded={isPhotoMenuOpen}
          aria-label="Open profile photo options"
        >
          {user.profilePhoto ? (
            <img src={user.profilePhoto} alt={`${user.name} profile`} className="profile-photo-image" />
          ) : (
            <span>{user.initials}</span>
          )}
        </button>
        <button
          type="button"
          className="profile-photo-camera-button portal-profile-camera-button"
          onClick={() => setIsPhotoMenuOpen((current) => !current)}
          disabled={isSavingPhoto}
          aria-haspopup="menu"
          aria-expanded={isPhotoMenuOpen}
          aria-label="Profile photo options"
        >
          <MonoIcon icon={Camera} />
        </button>
        {isPhotoMenuOpen && (
          <div className="profile-photo-menu" role="menu">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsPhotoMenuOpen(false);
                profilePhotoInputRef.current?.click();
              }}
            >
              <MonoIcon icon={ImageIcon} />
              {user.profilePhoto ? 'Upload new photo' : 'Upload photo'}
            </button>
            {user.profilePhoto && (
              <button
                type="button"
                role="menuitem"
                className="danger"
                onClick={() => saveProfilePhoto('')}
              >
                <MonoIcon icon={X} />
                Remove photo
              </button>
            )}
          </div>
        )}
      </div>
      <input
        ref={profilePhotoInputRef}
        type="file"
        className="profile-photo-input"
        accept="image/*"
        onChange={handleProfilePhotoChange}
      />
      {(isSavingPhoto || photoMessage) && (
        <p className="profile-photo-message">{isSavingPhoto ? 'Saving photo...' : photoMessage}</p>
      )}
    </div>
  );

  return (
    <PortalProfileLayout
      photoControl={photoControl}
      name={user.name}
      subtitle={`${designation} - ${user.department || 'Department not assigned'}`}
      meta={[
        { label: 'Office', value: assignedOffice },
      ]}
      headerDetails={[
        { label: 'Employee ID', value: user.employeeId || 'Not provided' },
        { label: 'Phone Number', value: user.phone || 'Not provided' },
        { label: 'Email Address', value: user.email || 'Not provided' },
      ]}
      showProfilePanels={false}
      stats={profileStats}
      scopeEyebrow="Employee Access"
      scopeTitle="Helpdesk & Account Access"
      scopeItems={[
        'Submit ICT support requests and review submitted tickets',
        'Track ticket status and updates from ICT staff',
        'Edit eligible tickets before ICT begins handling them',
        'Print ticket details for personal records',
      ]}
      activityEyebrow="Recent Activity"
      activityTitle="Latest Ticket Updates"
      activityActionLabel="Review Tickets"
      onActivityAction={() => onGoTo('helpdesk', 'tickets')}
      activity={latestTickets.map((ticket) => ({
        id: ticket.id,
        status: getEmployeeTicketStatusLabel(ticket.status),
        title: ticket.concernType || ticket.supportCategory || 'Helpdesk ticket',
        description: `${ticket.branch || 'No branch'} - ${ticket.department || 'No department'}`,
        date: ticket.lastUpdated || ticket.createdAt || ticket.date || 'No date',
        onClick: () => onGoTo('helpdesk', 'tickets'),
      }))}
      emptyActivityTitle="No ticket activity yet"
      emptyActivityText="Your submitted tickets and ICT updates will appear here."
    />
  );
}

/* =========================
   HELPDESK VIEW
========================= */

function HelpdeskView({ user, tickets, reloadTickets, initialTab, now, notificationTicket, onNotificationOpened }) {
  const [tab, setTab] = useState(initialTab || 'tickets');
  const [form, setForm] = useState(() => getNewTicketForm(user));
  const [editingId, setEditingId] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [successNotice, setSuccessNotice] = useState(null);
  const [viewTicket, setViewTicket] = useState(null);
  const [formError, setFormError] = useState('');
  const [photoPasteNotice, setPhotoPasteNotice] = useState('');
  const [ticketPage, setTicketPage] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!successNotice) return undefined;

    const timeoutId = window.setTimeout(() => setSuccessNotice(null), 5000);
    return () => window.clearTimeout(timeoutId);
  }, [successNotice]);

  // Conversation state — matches admin pattern exactly
  const [ticketMessages, setTicketMessages] = useState([]);
  const [messageDraft, setMessageDraft] = useState('');
  const [messagePhotos, setMessagePhotos] = useState([]);
  const [messageError, setMessageError] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const pendingMessageIdRef = useRef('');
  const [isChatMinimized, setIsChatMinimized] = useState(true);
  const [unreadConversationCount, setUnreadConversationCount] = useState(0);
  const [isLoadingTicketDetails, setIsLoadingTicketDetails] = useState(false);
  const [ticketOpenError, setTicketOpenError] = useState('');
  const conversationOnOpenRef = useRef('');

  const isChatMinimizedRef = useRef(true);
  const currentUserIdRef = useRef(user?.id || '');
  const ticketMessageIdsRef = useRef(new Set());
  const ticketSubmissionInFlightRef = useRef(false);

  const queueCount = tickets.filter(isEmployeeQueueTicket).length;
  const activeCount = tickets.filter((ticket) => isUnresolved(ticket.status)).length;
  const resolvedCount = tickets.filter(isEmployeeResolvedTicket).length;
  const canSubmitBurnout = isAdminDepartment(user?.department);
  const saarRequired = isMbwinTellerRoleModificationRequest(form);
  const derivedImpact = useMemo(
    () => deriveTicketImpact(form),
    [form.supportCategory, form.concernType, form.deviceName]
  );
  const availableSupportCategories = useMemo(
    () => getSupportCategoriesForDevice(form.deviceName),
    [form.deviceName]
  );
  const concernOptions = useMemo(
    () => getConcernOptionsForSelection(form.supportCategory, form.deviceName),
    [form.supportCategory, form.deviceName]
  );
  const pageSize = 2;
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

  useBodyScrollLock(Boolean(viewTicket));

  useEffect(() => {
    if (!canSubmitBurnout && tab === 'burnout') {
      setTab('tickets');
    }
  }, [canSubmitBurnout, tab]);

  useEffect(() => {
    if (viewTicket || typeof document === 'undefined') return undefined;

    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    document.body.style.paddingRight = '';

    return undefined;
  }, [viewTicket]);

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
    if (!viewTicket?.id) return;

    const refreshedTicket = tickets.find((ticket) => ticket.id === viewTicket.id);

    if (!refreshedTicket) return;

    setViewTicket((current) => {
      if (!current || current.id !== refreshedTicket.id) return current;

      return { ...current, ...refreshedTicket };
    });
  }, [tickets, viewTicket?.id]);

  useEffect(() => {
    if (ticketPage > totalPages) {
      setTicketPage(totalPages);
    }
  }, [ticketPage, totalPages]);

  // Subscribe to messages and ticket updates — same pattern as admin
  useEffect(() => {
    if (!viewTicket?.id) {
      pendingMessageIdRef.current = '';
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
          setTicketMessages((current) => {
            const merged = mergeMessages(current,messages);
            ticketMessageIdsRef.current = new Set(merged.map((message) => message.id));
            return merged;
          });
          setMessageError('');
        }
      } catch (error) {
        if (!cancelled) {
          setMessageError(error.message || 'Unable to load the ticket conversation.');
        }
      }
    };

    void loadMessages();

    const unsubscribeMessages = subscribeToTicketMessages(viewTicket.id, (newMessage) => {
      const alreadyExists = ticketMessageIdsRef.current.has(newMessage.id);

      setTicketMessages((current) => {
        const merged = mergeMessages(current,[newMessage]);
        ticketMessageIdsRef.current = new Set(merged.map((message) => message.id));
        return merged;
      });

      const isIncoming = newMessage.senderId !== currentUserIdRef.current;

      if (!alreadyExists && isIncoming && isChatMinimizedRef.current) {
        setUnreadConversationCount((c) => c + 1);
      }
    },status=>{if(status==='SUBSCRIBED') void loadMessages();});

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
    setIsChatMinimized(conversationOnOpenRef.current !== viewTicket?.id);
    conversationOnOpenRef.current = '';
    setUnreadConversationCount(0);
    pendingMessageIdRef.current = '';
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

      if (field === 'deviceName') {
        const nextSupportCategories = getSupportCategoriesForDevice(value);

        if (!nextSupportCategories.includes(prev.supportCategory)) {
          next.supportCategory = nextSupportCategories.length === 1 ? nextSupportCategories[0] : '';
          next.concernType = '';
        } else {
          const nextConcernOptions = getConcernOptionsForSelection(next.supportCategory, value);

          if (!nextConcernOptions.includes(prev.concernType)) {
            next.concernType = '';
          }
        }
      }

      if (field === 'supportCategory') {
        const nextConcernOptions = getConcernOptionsForSelection(value, next.deviceName);

        if (!nextConcernOptions.includes(prev.concernType)) {
          next.concernType = '';
        }
      }

      if (['supportCategory', 'concernType'].includes(field)) {
        next.description = isGeneratedDescriptionOnly(prev.description)
          ? getIssueDescriptionTemplate(next)
          : ensureDescriptionTemplate(prev.description,next);
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

      if (
        ['deviceName', 'supportCategory', 'concernType'].includes(field) &&
        !isMbwinTellerRoleModificationRequest(next)
      ) {
        next.saarAttachment = null;
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

  const openTicketDetails = async (ticket) => {
    if (!ticket?.id) return;

    setIsLoadingTicketDetails(true);
    setFormError('');
    setTicketOpenError('');

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

  useEffect(() => {
    if (!notificationTicket?.id) return undefined;
    let cancelled = false;
    setIsLoadingTicketDetails(true);
    setTicketOpenError('');
    setTab('tickets');
    const openNotification = async () => {
      try {
        const ticket = await getTicket(notificationTicket.id);
        if (cancelled) return;
        if (!ticket || ticket.ownerId !== user.id) throw new Error('This ticket is no longer available to your account.');
        conversationOnOpenRef.current = notificationTicket.reply ? ticket.id : '';
        setViewTicket(ticket);
        setIsChatMinimized(!notificationTicket.reply);
      } catch (error) {
        if (!cancelled) setTicketOpenError(error.message || 'Unable to open this ticket. Please try again.');
      } finally {
        if (!cancelled) { setIsLoadingTicketDetails(false); onNotificationOpened?.(); }
      }
    };
    void openNotification();
    return () => { cancelled = true; };
  }, [notificationTicket, onNotificationOpened, user.id]);

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
    setPhotoPasteNotice('');

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

  const handlePhotoPaste = async (event) => {
    const pastedImages = getClipboardImageFiles(event.clipboardData);

    if (!pastedImages.length) {
      setPhotoPasteNotice('No screenshot was found in the clipboard.');
      return false;
    }

    event.preventDefault();
    setFormError('');
    setPhotoPasteNotice('');

    try {
      const nextPhotos = await filesToPhotoAttachments(pastedImages, form.photoAttachments.length);

      setForm((prev) => ({
        ...prev,
        photoAttachments: [...prev.photoAttachments, ...nextPhotos],
      }));

      setPhotoPasteNotice(
        `${nextPhotos.length} pasted screenshot${nextPhotos.length === 1 ? '' : 's'} attached.`
      );
      return true;
    } catch (error) {
      setFormError(error.message || 'Unable to paste the image. Please try choosing the file instead.');
      return false;
    }
  };

  useEffect(() => {
    if (tab !== 'submit' || typeof window === 'undefined') {
      return undefined;
    }

    const handleWindowPaste = (event) => {
      if (event.defaultPrevented) return;
      void handlePhotoPaste(event);
    };

    window.addEventListener('paste', handleWindowPaste);

    return () => {
      window.removeEventListener('paste', handleWindowPaste);
    };
  }, [tab, form.photoAttachments.length]);

  const removePhotoAttachment = (photoId) => {
    setForm((prev) => ({
      ...prev,
      photoAttachments: prev.photoAttachments.filter((photo) => photo.id !== photoId),
    }));
    setPhotoPasteNotice('');
  };

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
    if (!viewTicket?.id) return;

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
      const sentMessage = await createTicketMessage(viewTicket.id, {
        sender: user,
        message: cleanMessage,
        attachments: messagePhotos,
        clientMessageId: pendingMessageIdRef.current,
      });

      ticketMessageIdsRef.current.add(sentMessage.id);
      setTicketMessages((current) => {
        const exists = current.some((m) => m.id === sentMessage.id);
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

  const validateForm = () => {
    const requiredFields = [
      ['branch', 'Branch / Location'],
      ['department', 'Department'],
      ['supportCategory', 'Support Category'],
      ['concernType', 'Concern Type'],
      ['deviceName', 'Device or System'],
      ['contactNumber', 'Contact Number'],
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

    if (getAnyDeskDetail(form.description, form).length < 3) {
      setFormError('AnyDesk Number is required because ICT mainly supports tickets remotely.');
      return false;
    }

    if (isOtherConcernSelected(form) && getShortDescriptionDetail(form.description, form).length < 8) {
      setFormError('Please briefly describe the concern when selecting an Other or Concern not listed option.');
      return false;
    }

    if (saarRequired && !hasSaarAttachment(form.saarAttachment)) {
      setFormError('Attach the approved SAAR PDF for this MBWin / Sky360 account or teller role/function request.');
      return false;
    }

    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (isSubmitting || ticketSubmissionInFlightRef.current) return;

    if (!validateForm()) return;

    setShowConfirm(true);
  };

  const confirmTicketSubmit = () => {
    if (!validateForm()) {
      setShowConfirm(false);
      return;
    }

    void submitTicket();
  };

  const submitTicket = async () => {
    if (ticketSubmissionInFlightRef.current) return;

    ticketSubmissionInFlightRef.current = true;
    setIsSubmitting(true);

    const wasEditing = Boolean(editingId);
    const cleanDescription = sanitizeDescriptionForSubmit(form.description, form);
    const finalImpact = deriveTicketImpact(form);

    const payload = {
      ...form,
      impact: finalImpact.impact,
      description: cleanDescription,
      sla: finalImpact.sla,
      priority: finalImpact.priority,
      saarRequired,
      lastEmployeeUpdate: new Date().toLocaleString(),
    };

    try {
      if (wasEditing) {
        await updateTicket(
          editingId,
          payload,
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
      setSuccessNotice({
        title: wasEditing ? 'Ticket Updated' : 'Ticket Submitted',
        message: wasEditing
          ? 'Your ticket changes were saved successfully and sent back to ICT for review.'
          : 'Your ticket has been submitted successfully. ICT will review your concern and update the ticket status.',
      });

      // The write has completed, so refresh the list without delaying confirmation.
      void Promise.resolve()
        .then(() => reloadTickets?.())
        .catch(() => {});
    } catch (error) {
      setFormError(error.message || 'Unable to save ticket. Please try again.');
      setShowConfirm(false);
    } finally {
      ticketSubmissionInFlightRef.current = false;
      setIsSubmitting(false);
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

      </section>

      <section className="support-insight-grid" aria-label="Support insights">
        <article className="support-insight-card">
          <span>Queue</span>
          <strong>{queueCount}</strong>
          <p>Pending or in-progress requests currently with ICT.</p>
        </article>
        <article className="support-insight-card">
          <span>Active</span>
          <strong>{activeCount}</strong>
          <p>Concerns currently awaiting action or resolution.</p>
        </article>
        <article className="support-insight-card">
          <span>Resolved</span>
          <strong>{resolvedCount}</strong>
          <p>Completed requests with recorded ICT resolution.</p>
        </article>
        <article className="support-insight-card">
          <span>SAAR</span>
          <strong>PDF</strong>
          <p>Required for MBWin / Sky360 role requests.</p>
        </article>
      </section>

      <section className="panel-card glass">
        <div className={`segmented-tabs employee-helpdesk-tabs${canSubmitBurnout ? ' has-burnout' : ''}`} role="tablist" aria-label="Helpdesk sections"
          onKeyDown={(event) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            const tabs = [...event.currentTarget.querySelectorAll('[role="tab"]')];
            const current = tabs.indexOf(document.activeElement);
            if (current < 0) return;
            event.preventDefault();
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
              : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
            tabs[next].focus();
            tabs[next].click();
          }}>
          <button
            type="button"
            role="tab"
            tabIndex={tab === 'tickets' ? 0 : -1}
            aria-selected={tab === 'tickets'}
            className={tab === 'tickets' ? 'active' : ''}
            onClick={() => setTab('tickets')}
          >
            <Ticket size={16} aria-hidden="true" />
            <span className="employee-helpdesk-tab-label">My Tickets</span>
          </button>

          <button
            type="button"
            role="tab"
            tabIndex={tab === 'submit' ? 0 : -1}
            aria-selected={tab === 'submit'}
            className={tab === 'submit' ? 'active' : ''}
            onClick={switchToSubmit}
          >
            {editingId ? <PenLine size={16} aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
            <span className="employee-helpdesk-tab-label">{editingId ? 'Edit Ticket' : 'Submit Ticket'}</span>
          </button>

          {canSubmitBurnout && (
            <button
              type="button"
              role="tab"
              tabIndex={tab === 'burnout' ? 0 : -1}
              aria-selected={tab === 'burnout'}
              className={tab === 'burnout' ? 'active' : ''}
              onClick={() => setTab('burnout')}
            >
              <Wrench size={16} aria-hidden="true" />
              <span className="employee-helpdesk-tab-label">Burnout Request</span>
            </button>
          )}
        </div>

        {successNotice && (
          <div className="employee-ticket-submit-success" role="status">
            <span><strong>{successNotice.title}.</strong> {successNotice.message}</span>
            <button type="button" onClick={() => setSuccessNotice(null)} aria-label="Dismiss ticket confirmation">
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        )}
        {ticketOpenError && <div className="employee-ticket-open-notice app-error-alert" role="alert"><span>{ticketOpenError}</span>
          <button type="button" onClick={() => setTicketOpenError('')} aria-label="Dismiss ticket error"><X size={16} aria-hidden="true" /></button>
        </div>}
        {isLoadingTicketDetails && <p className="employee-ticket-opening" role="status">Opening ticket...</p>}

        {tab === 'tickets' && (
          <div className="employee-ticket-queue">
            {tickets.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon"><MonoIcon icon={Ticket} /></div>
                <h4>No tickets submitted yet</h4>
                <p>Once you create a helpdesk request, it will appear here for tracking and ICT updates.</p>
              </div>
            ) : (
              <>
                <div className="employee-ticket-queue-grid">
                  {pagedTickets.map((ticket) => {
                    const employeeStatusLabel = getEmployeeTicketStatusLabel(ticket.status);
                    const queueLabel = getEmployeeQueueLabel(ticket);
                    const requesterName = getCompactTicketRequester(ticket, user);

                    return (
                      <article
                        key={ticket.id}
                        className="employee-admin-ticket-card"
                        role="button"
                        tabIndex={0}
                        aria-label={`View ticket ${getTicketDisplayCode(ticket)}`}
                        onClick={() => openTicketDetails(ticket)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openTicketDetails(ticket);
                          }
                        }}
                      >
                        <div className="employee-admin-ticket-card-head">
                          <div className="employee-admin-ticket-title">
                            <span className="ticket-id">{getTicketDisplayCode(ticket)}</span>
                            <h4>{ticket.concernType}</h4>
                            <p>{getCompactTicketDate(ticket)}</p>
                          </div>

                          <div className="ticket-badges employee-admin-inline-badges">
                            <span className={`status ${slugify(employeeStatusLabel)}`}>
                              {employeeStatusLabel}
                            </span>
                            <span className={`priority ${slugify(ticket.sla || 'Low')}`}>
                              {ticket.sla || 'Low'}
                            </span>
                            {(ticket.saarRequired || ticket.saarAttachment?.name) && <span className="status saar">SAAR</span>}
                          </div>
                        </div>

                        <div className="employee-ticket-handling-summary">
                          <div className="employee-ticket-status-row">
                            <TicketHandlingIndicator ticket={ticket} now={now} compact showStatus={false} currentUserId={user?.id} />
                            <TicketWorkTimer ticket={ticket} now={now} compact />
                          </div>
                          {queueLabel && <span className="employee-ticket-queue-position"
                            title="Priority-based ICT review position. Urgent tickets may move ahead.">
                            <Clock3 size={14} aria-hidden="true" />{queueLabel}
                          </span>}
                        </div>

                        <div className="employee-admin-ticket-summary-grid">
                          <div>
                            <span>Requester</span>
                            <strong>{requesterName}</strong>
                            <p>{ticket.department || user.department || 'Department not set'}</p>
                          </div>
                          <div>
                            <span>Branch</span>
                            <strong>{ticket.branch || user.branch || user.office || 'Branch not set'}</strong>
                            <p>{ticket.supportCategory || 'Support category not set'}</p>
                          </div>
                        </div>

                        <p className="employee-admin-ticket-description">
                          {ticket.description || 'No description provided.'}
                        </p>

                      </article>
                    );
                  })}
                </div>

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
                <span className="ticket-form-hint">Select the branch or office where the concern happened.</span>
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
                <span className="ticket-form-hint">Select your department or the department affected by the concern.</span>
              </div>

              <div className="ticket-form-group">
                <label htmlFor="ticket-device">Device or System</label>
                <select
                  id="ticket-device"
                  className="ticket-field ticket-select"
                  value={form.deviceName}
                  onChange={(e) => handleFormChange('deviceName', e.target.value)}
                  required
                >
                  <option value="" disabled>Select the affected device or system</option>
                  {form.deviceName && !DEVICE_OPTIONS.includes(form.deviceName) && (
                    <option value={form.deviceName}>{form.deviceName}</option>
                  )}
                  {DEVICE_OPTIONS.map((device) => (
                    <option key={device} value={device}>{device}</option>
                  ))}
                </select>
                <span className="ticket-form-hint">Choose the device, application, or system involved.</span>
              </div>

              <div className="ticket-form-group">
                <label htmlFor="ticket-contact">Contact Number / Local</label>
                <input
                  id="ticket-contact"
                  className="ticket-field ticket-input"
                  type="text"
                  value={form.contactNumber}
                  onChange={(e) => handleFormChange('contactNumber', e.target.value)}
                  placeholder="09** *** ****"
                  required
                />
                <span className="ticket-form-hint">Provide a number where ICT can contact you if more details are needed.</span>
              </div>

              <div className="ticket-form-group">
                <label htmlFor="ticket-category">Support Category</label>
                <select
                  id="ticket-category"
                  className="ticket-field ticket-select"
                  value={form.supportCategory}
                  onChange={(e) => handleFormChange('supportCategory', e.target.value)}
                  disabled={!form.deviceName}
                  required
                >
                  <option value="" disabled>
                    {form.deviceName ? 'Select support category' : 'Select device or system first'}
                  </option>
                  {form.supportCategory && !availableSupportCategories.includes(form.supportCategory) && (
                    <option value={form.supportCategory}>{form.supportCategory}</option>
                  )}
                  {availableSupportCategories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                <span className="ticket-form-hint">
                  {form.deviceName
                    ? 'Only support categories related to the selected device or system are shown.'
                    : 'Select a device or system first.'}
                </span>
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
                <span className="ticket-form-hint">
                  {form.supportCategory
                    ? 'Only concern types related to the selected support category are shown.'
                    : 'Select a support category first to show concern types.'}
                </span>
              </div>

              {derivedImpact.isReady && (
                <div className="ticket-form-group full sla-level-section">
                  <label>Auto Impact Level</label>
                  <div className={`auto-impact-card sla-only ${slugify(derivedImpact.sla)}`}>
                    <div>
                      <span>SLA</span>
                      <strong>{derivedImpact.sla}</strong>
                    </div>
                  </div>
                </div>
              )}

              <div className="ticket-form-group full">
                <div className="issue-description-heading">
                  <label htmlFor="ticket-desc-builder">Issue Description</label>
                  <span className="char-count">{normalizeTextareaValue(form.description).length}/1200 characters</span>
                </div>
                <IssueDescriptionBuilder
                  form={form}
                  onChange={handleDescriptionDetailChange}
                />
              </div>

              {saarRequired && (
                <div className="ticket-form-group full saar-upload-card required">
                  <label htmlFor="ticket-saar">SAAR PDF Attachment (Required for Selected MBWin / Sky360 Requests)</label>

                  <input
                    id="ticket-saar"
                    className="ticket-field ticket-file"
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={handleSaarFileChange}
                    required={!hasSaarAttachment(form.saarAttachment)}
                  />

                  {form.saarAttachment?.name ? (
                    <div className="attached-file-preview">
                      <div>
                        <strong>{form.saarAttachment.name}</strong>
                        <span>{form.saarAttachment.sizeLabel} · Attached {form.saarAttachment.uploadedAt}</span>
                      </div>
                      {hasSaarAttachment(form.saarAttachment) && (
                        <a
                          href={
                            form.saarAttachment.dataUrl ||
                            form.saarAttachment.url ||
                            form.saarAttachment.publicUrl ||
                            '#'
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View PDF
                        </a>
                      )}
                    </div>
                  ) : (
                    <span className="ticket-form-hint">
                      Attach the approved SAAR PDF for new user account requests, password resets, or teller role/function modifications.
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
                  Attach a screenshot, error message, printer photo, router light, damaged cable, or other related image. You can also press Ctrl+V to paste a copied screenshot directly.
                </span>

                {form.photoAttachments.length > 0 && (
                  <div className="photo-preview-shell">
                    <PhotoAttachmentGallery
                      photos={form.photoAttachments}
                      onRemove={removePhotoAttachment}
                      className="ticket-form-photo-gallery"
                    />
                  </div>
                )}
              </div>
            </div>

            {formError && <div className="form-error app-error-alert" role="alert">{formError}</div>}

            {showConfirm ? (
              <div className="ticket-submit-confirmation-inline" role="group" aria-labelledby="ticket-submit-confirmation-title">
                <p id="ticket-submit-confirmation-title" className="ticket-submit-confirmation-question">
                  {editingId ? 'Save these ticket changes?' : 'Submit this helpdesk request to ICT?'}
                </p>
                <p className="ticket-submit-confirmation-summary">
                  Priority: {derivedImpact.sla} - {derivedImpact.impact} - {form.concernType}
                </p>
                <div className="ticket-submit-confirmation-actions">
                  <button
                    type="button"
                    className="ticket-submit-confirmation-cancel"
                    onClick={() => setShowConfirm(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="ticket-submit-confirmation-confirm"
                    onClick={confirmTicketSubmit}
                    disabled={isSubmitting}
                    aria-busy={isSubmitting}
                  >
                    <MonoIcon icon={editingId ? PenLine : Send} />
                    {isSubmitting ? (editingId ? 'Saving...' : 'Submitting...') : (editingId ? 'Save Changes' : 'Confirm Submission')}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="submit"
                className="auth-submit-btn"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                <MonoIcon icon={editingId ? PenLine : Send} />
                {isSubmitting ? (editingId ? 'Saving Ticket...' : 'Submitting Ticket...') : (editingId ? 'Save Ticket Changes' : 'Submit Ticket')}
              </button>
            )}
          </form>
        )}

        {canSubmitBurnout && tab === 'burnout' && (
          <BurnoutRequestView user={user} reloadTickets={reloadTickets} />
        )}
      </section>

      {/* Ticket detail modal — uses new admin-matching component */}
      {viewTicket && (
        <EmployeeTicketDetailModal
          ticket={viewTicket}
          now={now}
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
          onMessageChange={updateConversationDraft}
          onPhotoChange={handleConversationPhotoChange}
          onPastePhotos={handleConversationImagePaste}
          onRemovePhoto={removeConversationPhoto}
          onSend={sendTicketMessage}
        />
      )}
    </div>
  );
}


/* =========================
   BURNOUT REQUEST VIEW
========================= */

function BurnoutRequestView({ user, reloadTickets }) {
  const [form, setForm] = useState(() => getNewBurnoutRequestForm());
  const [formError, setFormError] = useState('');
  const [successNotice, setSuccessNotice] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRemarks, setShowRemarks] = useState(false);
  useBodyScrollLock(Boolean(successNotice));

  const handleChange = (field, value) => {
    setFormError('');
    setForm((current) => {
      return { ...current, [field]: value };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const requiredFields = [
      ['branch', 'Branch / Location to be Assigned'],
      ['department', 'Department of the custodian'],
    ];

    const missing = requiredFields.find(([field]) => !String(form[field] || '').trim());

    if (missing) {
      setFormError(`${missing[1]} is required.`);
      return;
    }

    if (!String(form.custodian || '').trim()) {
      setFormError('Custodian is required for Helpdesk Burnout.');
      return;
    }

    if (!String(form.brand || '').trim()) {
      setFormError('Brand is required for Helpdesk Burnout.');
      return;
    }

    if (!String(form.model || '').trim()) {
      setFormError('Model is required for Helpdesk Burnout.');
      return;
    }

    if (!String(form.serialNumber || '').trim()) {
      setFormError('Serial number is required for Helpdesk Burnout.');
      return;
    }

    setIsSubmitting(true);

    try {
      const submittedAt = new Date().toLocaleString();
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

      const submittedTicketCode = ticket.ticketCode || ticket.id;

      await reloadTickets?.();
      setForm(getNewBurnoutRequestForm());
      setShowRemarks(false);
      setFormError('');
      setSuccessNotice({
        title: 'Helpdesk Burnout Submitted',
        message: `Your Helpdesk Burnout ticket ${submittedTicketCode} was submitted successfully.`,
      });
    } catch (error) {
      setFormError(error.message || 'Unable to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="other-services-view burnout-request-view embedded-helpdesk-request">
      <section className="embedded-request-section">
        <div className="section-head">
          <div>
            <span className="section-kicker">Helpdesk Request</span>
            <h3>Burnout Request</h3>
          </div>
        </div>

        <form className="ticket-form-wrap" onSubmit={handleSubmit}>
          <div className="ticket-form-grid other-service-grid">
            <div className="ticket-form-group">
              <label htmlFor="other-branch">Branch / Location to be Assigned</label>
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

            <div className="ticket-form-group">
              <label htmlFor="other-brand">Brand</label>
              <input
                id="other-brand"
                className="ticket-field ticket-input"
                type="text"
                value={form.brand}
                onChange={(e) => handleChange('brand', e.target.value)}
                placeholder="Enter brand"
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
                placeholder="Enter model"
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

            <div className="ticket-form-group">
              <label htmlFor="other-department">Department of the custodian</label>
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

            <div className="ticket-form-group full burnout-optional-remarks">
              <button
                type="button"
                className="burnout-remarks-toggle"
                aria-expanded={showRemarks}
                aria-controls="other-remarks"
                onClick={() => setShowRemarks((visible) => !visible)}
              >
                {showRemarks ? 'Hide Notes / Remarks (Optional)' : 'Add Notes / Remarks (Optional)'}
              </button>
              {showRemarks && (
                <textarea
                  id="other-remarks"
                  className="ticket-field ticket-textarea"
                  rows={2}
                  value={form.remarks}
                  onChange={(e) => handleChange('remarks', e.target.value)}
                  placeholder={getBurnoutRemarksPlaceholder()}
                  maxLength={800}
                />
              )}
            </div>
          </div>

          {formError && <div className="form-error app-error-alert" role="alert">{formError}</div>}

          <button type="submit" className="auth-submit-btn" disabled={isSubmitting} aria-busy={isSubmitting}>
            <MonoIcon icon={Send} />
            {isSubmitting ? 'Submitting...' : 'Submit Burnout Request'}
          </button>
        </form>
      </section>

      {successNotice && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Burnout request submitted">
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
  const [timerNow, setTimerNow] = useState(Date.now());
  const [notificationTicket, setNotificationTicket] = useState(null);
  const notificationOpened = useCallback(() => setNotificationTicket(null), []);
  const [isInactiveBlocked, setIsInactiveBlocked] = useState(false);
  const router = useRouter();

  const loadTickets = async (currentUser = user) => {
    if (!currentUser?.id) return;

    try {
      const employeeTickets = await getTicketsForUser(currentUser.id);

      setTickets(employeeTickets);
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

        if (isPasswordChangeRequired(activeUser)) {
          router.replace(`${LOGIN_ROUTE}?mode=force-password`);
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
    const queueRefreshInterval = window.setInterval(handleFocus, 30000);

    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.clearInterval(queueRefreshInterval);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user]);

  useEffect(() => {
    if (!authChecked || !tickets.length || !['dashboard', 'helpdesk'].includes(activeSection)) return undefined;
    const hasRunningTimer = tickets.some((ticket) => ['in progress', 'for inspection', 'escalated', 'under burnout'].includes(normalizeEmployeeTicketStatus(ticket.status)));
    setTimerNow(Date.now());
    const intervalId = window.setInterval(() => setTimerNow(Date.now()), hasRunningTimer ? 1000 : 30000);
    return () => window.clearInterval(intervalId);
  }, [authChecked, tickets, activeSection]);


  const openTickets = useMemo(
    () => tickets.filter((ticket) => isUnresolved(ticket.status)).length,
    [tickets]
  );

  const goTo = (section, tab) => {

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
              <HelpdeskInbox key={user.id} userId={user.id} audience="employee" onTicket={(id, notification) => {
                setNotificationTicket({ id, reply: notification.kind === 'reply' });
                goTo('helpdesk', 'tickets');
              }} />
              <PortalThemeToggle />
              <div className="profile-chip">
                <span className="profile-chip-avatar">
                  {user.profilePhoto ? (
                    <img src={user.profilePhoto} alt="" aria-hidden="true" />
                  ) : (
                    user.initials
                  )}
                </span>
                <div className="profile-chip-copy">
                  <strong>{user.name}</strong>
                  <span>{user.department}</span>
                </div>
              </div>
              <button
                type="button"
                className="burger"
                aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}
                aria-expanded={sidebarOpen}
                onClick={() => setSidebarOpen((prev) => !prev)}
              >
                <Menu className="admin-mono-icon" aria-hidden="true" />
              </button>
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
              {activeSection === 'dashboard' && (
                <DashboardView
                  user={user}
                  now={timerNow}
                  tickets={tickets}
                  openTickets={openTickets}
                  onGoTo={goTo}
                />
              )}

              {activeSection === 'profile' && (
                <ProfileView user={user} tickets={tickets} onGoTo={goTo} onUserUpdate={setUser} />
              )}

              {activeSection === 'helpdesk' && (
                <HelpdeskView
                  key={helpdeskTab}
                  now={timerNow}
                  user={user}
                  tickets={tickets}
                  reloadTickets={() => loadTickets()}
                  initialTab={helpdeskTab}
                  notificationTicket={notificationTicket}
                  onNotificationOpened={notificationOpened}
                />
              )}

            </section>
          </div>
        </div>
      </main>

    </>
  );
}
