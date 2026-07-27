/* =========================
   PORTAL OPTIONS AND HELPERS
========================= */

export const SUPPORT_CATEGORIES = [
  'Burnout',
  'Software / System Support',
  'Account / Access Support',
  'Printer Support',
  'Computer / Laptop Support',
  'Network / Internet Support',
  'Biometric / Attendance Support',
  'Server / NAS / Database Support',
  'Other ICT Request',
];

export const BRANCHES = [
  'Ayala',
  'Canelar',
  'Central Office',
  'Culianan',
  'Curuan',
  'Dipolog',
  'Ipil',
  'La Hermosa',
  'Nunez',
  'Pagadian',
  'Veterans',
  'Vitali',
];

export const DEPARTMENTS = [
  'Accounting',
  'Admin',
  'Allied Services Operation',
  'CAS',
  'Credit and Savings Operation',
  'Finance',
  'HR',
  'ICT',
  'Internal Audit',
  'Legal Compliance',
  'Marketing',
  'MEDS',
  'MRDSS',
  'Treasury',
];

export const SLA_LEVELS = ['Low', 'Medium', 'High', 'Critical'];

export const TICKET_STATUSES = [
  'Created',
  'Pending',
  'In Progress',
  'Escalated',
  'Moved Date',
  'Resolved',
  'Cancelled',
];

export const BURNOUT_TICKET_STATUSES = [
  'Submitted',
  'For Inspection',
  'Under Burnout',
  'Passed Burnout',
  'Failed Burnout',
  'Damaged',
  'For Repair',
  'For Replacement',
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
    'Access permission request',
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
  'Other ICT Request': [
    'General ICT assistance',
    'ICT equipment request',
    'Technical consultation',
    'Concern not listed',
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
  'Software / System Support': 'System Name:\nPage or Module:\nWhat Happened:\nError Message:\nAnyDesk Number:',
  'Account / Access Support': 'System or Account:\nUsername or Employee ID:\nAccess Needed:\nWhat Happened:\nAnyDesk Number:',
  'Printer Support': 'Printer Model:\nPrinter Location:\nPrinter Issue:\nError or Light Status:\nAnyDesk Number:',
  'Computer / Laptop Support': 'Desktop or Laptop Name:\nUnit Location:\nWhat Happened:\nError Message:\nAnyDesk Number:',
  'Network / Internet Support': 'Connection Type:\nLocation Affected:\nWhat Happened:\nRouter or Cable Status:\nAnyDesk Number:',
  'Biometric / Attendance Support': 'Biometric Device:\nBranch or Location:\nWhat Happened:\nEmployee Affected:\nAnyDesk Number:',
  'Server / NAS / Database Support': 'Server or Storage Name:\nFolder or Database:\nWhat Happened:\nError Message:\nAnyDesk Number:',
  'Other ICT Request': 'Request Type:\nDevice or System:\nWhat Happened:\nNeeded Date:\nAnyDesk Number:',
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
  'Biometric Device',
  'ATM / Kiosk',
  'Network / Wi-Fi',
  'Server',
  'MBWin / Sky360',
  'Excel / Office Application',
  'Application Account',
  'Other ICT Device',
];

export const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const CLOSED_STATUS_KEYS = [
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

export const isUnresolved = (status) => {
  const normalized = String(status || '')
    .trim()
    .toLowerCase()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ');

  return !CLOSED_STATUS_KEYS.includes(normalized);
};
