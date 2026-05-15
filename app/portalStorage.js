/* =========================
   PORTAL OPTIONS AND HELPERS
========================= */

export const SUPPORT_CATEGORIES = [
  'Software Support',
  'Network Support',
  'Hardware Support',
  'User Account Management',
  'Other ICT Support',
  // Legacy categories are kept so older tickets still appear in admin filters/reports.
  'Application / Software',
  'Hardware / Device',
  'Network / Internet',
  'Account / Access',
  'Remote Assistance',
  'Request / Installation',
  'Server / Core System',
];

export const BRANCHES = [
  'Ayala',
  'Canelar',
  'Nunez',
  'Central Office',
  'Veterans',
  'Culianan',
  'Curuan',
  'Vitali',
  'Ipil',
  'Dipolog',
  'La Hermosa',
  'Pagadian',
];

export const DEPARTMENTS = [
  'Treasury Department',
  'Accounting Department',
  'Operation Department',
  'MILES Department',
  'Insurance Department/CAC',
  'Marketing Department',
  'HR Department',
  'Audit Department',
  'Legal Department',
  'Allied and Services Department',
  'Executive Department',
  'ICT Department',
];

export const SLA_LEVELS = ['Low', 'Medium', 'High', 'Critical'];

export const TICKET_STATUSES = [
  'Created',
  'Pending',
  'In Progress',
  'Escalated',
  'Moved Date',
  'Modified',
  'Resolved',
  'Canceled',
];

export const TECHNICIANS = [
  'Jomari Francisco',
  'Jeffrey Uc-Kung',
  'Jonathan Sumampat',
  'Aldwin Bucoy',
];

export const ESCALATION_PARTNERS = [
  'Third Party Company',
];

export const CATEGORY_CONCERN_TYPES = {
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
  'Other ICT Support': [
    'Remote Assistance',
    'ICT Service Request',
    'Report or Document Assistance',
    'Preventive Maintenance',
    'Website or Web System',
    'Other Technical Concern',
  ],
};

export const CONCERN_TYPES = Array.from(
  new Set([
    ...Object.values(CATEGORY_CONCERN_TYPES).flat(),
    // Legacy concern names are kept for old ticket data and search/filter compatibility.
    'Application Installation / Update',
    'Application Error / Troubleshooting',
    'MBWIN Teller / User Role',
    'MBWIN Voucher / ODBC',
    'MBWIN End-of-Day / Database',
    'Login / Access Problem',
    'Account Creation / Reset',
    'Printer / Scanner Issue',
    'Computer / Laptop Issue',
    'Peripheral / Monitor Issue',
    'Internet / Wi-Fi Connection',
    'Network Cabling / Port',
    'Server / Cloud Issue',
    'Biometric / ATM Issue',
    'Virus / Security Concern',
    'File / Storage / Backup',
  ])
);

export const CATEGORY_TEMPLATES = {
  'Software Support': 'Application Name:\nRequest Type:\nPurpose:\nRemarks:',
  'Network Support': 'AnyDesk Number:\nConnection Type:\nAffected Area:\nUsers Affected:\nSummary:',
  'Hardware Support': 'Device Type:\nDevice Name / Asset Name:\nLocation:\nProblem Summary:\nRemarks:',
  'User Account Management': 'System / Application:\nUsername / Employee ID:\nRequested Access or Issue:\nApprover:\nRemarks:',
  'Other ICT Support': 'Concern Summary:\nAffected User / Area:\nAdditional Details:\nRemarks:',
  // Legacy templates are kept for older forms/components that may still reference them.
  'Application / Software': 'Anydesk Number:\nApplication/System:\nIssue Summary:\nExact Error Message:\nAction Already Tried:',
  'Hardware / Device': 'Anydesk Number:\nDevice Model/Asset Name:\nOffice Location:\nIssue Summary:\nAction Already Tried:',
  'Network / Internet': 'Anydesk Number:\nConnection Type:\nAffected Users/Area:\nIssue Summary:\nTime Started:',
  'Account / Access': 'Anydesk Number:\nSystem/Application:\nUsername/Employee ID:\nRequested Access/Issue:\nApprover:',
  'Remote Assistance': 'Anydesk Number:\nRemote Tool Available:\nPreferred Support Time:\nIssue Summary:\nAction Already Tried:',
  'Request / Installation': 'Anydesk Number:\nRequest Type:\nPurpose:\nNeeded Date:\nAdditional Details:',
  'Server / Core System': 'Anydesk Number:\nSystem/Server Involved:\nBusiness Impact:\nLogs/Error Message:\nAction Already Tried:',
};

export const DEVICE_OPTIONS = [
  'Desktop PC',
  'Laptop',
  'Printer',
  'Scanner',
  'Monitor',
  'Biometric Device',
  'ATM / Kiosk',
  'Network / Wi-Fi',
  'Server',
  'MBWIN / Application Account',
  'Website / Web System',
  'Mobile Phone / Tablet',
  'Other ICT Device',
];

export const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export const isUnresolved = (status) => !['Resolved', 'Canceled'].includes(status);
