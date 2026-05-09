/* =========================
   DASHBOARD 1.1 DEMO STORAGE
   LocalStorage-only demo helper
========================= */

export const STORAGE_KEYS = {
  users: 'mempco_demo_users_v1',
  tickets: 'mempco_demo_tickets_v1',
  currentUser: 'mempco_demo_current_user_v1',
};

export const SUPPORT_CATEGORIES = [
  'Application / Software',
  'Hardware / Device',
  'Network / Internet',
  'Account / Access',
  'Remote Assistance',
  'Request / Installation',
  'Server / Core System',
  'Other ICT Support',
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
  'ICT Network Operation & Administrator Unit',
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

export const CONCERN_TYPES = [
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
  'Remote Assistance',
  'ICT Service Request',
  'Report / Document Assistance',
  'Preventive Maintenance',
  'Website / Web System',
  'Other Technical Concern',
];

export const CATEGORY_TEMPLATES = {
  'Application / Software': 'Anydesk Number:\nApplication/System:\nIssue Summary:\nExact Error Message:\nAction Already Tried:',
  'Hardware / Device': 'Anydesk Number:\nDevice Model/Asset Name:\nOffice Location:\nIssue Summary:\nAction Already Tried:',
  'Network / Internet': 'Anydesk Number:\nConnection Type:\nAffected Users/Area:\nIssue Summary:\nTime Started:',
  'Account / Access': 'Anydesk Number:\nSystem/Application:\nUsername/Employee ID:\nRequested Access/Issue:\nApprover:',
  'Remote Assistance': 'Anydesk Number:\nRemote Tool Available:\nPreferred Support Time:\nIssue Summary:\nAction Already Tried:',
  'Request / Installation': 'Anydesk Number:\nRequest Type:\nPurpose:\nNeeded Date:\nAdditional Details:',
  'Server / Core System': 'Anydesk Number:\nSystem/Server Involved:\nBusiness Impact:\nLogs/Error Message:\nAction Already Tried:',
  'Other ICT Support': 'Anydesk Number:\nConcern Summary:\nAffected User/Area:\nAdditional Details:\nAction Already Tried:',
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

const isBrowser = () => typeof window !== 'undefined';

const readJson = (key, fallback) => {
  if (!isBrowser()) return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

export const getInitials = (name = '') => {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return initials || 'ME';
};

export const formatDateTime = () =>
  new Date().toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

export const formatDateOnly = () =>
  new Date().toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

const defaultUsers = [
  {
    id: 'admin-001',
    role: 'admin',
    name: 'Jomari Francisco',
    initials: 'JF',
    employeeId: 'ADM-001',
    department: 'ICT Network Operation & Administrator Unit',
    branch: 'Central Office',
    office: 'Central Office',
    email: 'admin@mempco.local',
    phone: 'N/A',
    password: 'admin123',
    status: 'Active',
    createdAt: 'Demo Seed',
  },
  {
    id: 'employee-001',
    role: 'employee',
    name: 'Jomari Francisco',
    initials: 'JF',
    employeeId: 'MCO854',
    department: 'IT Department',
    branch: 'Zamboanga City',
    office: 'Zamboanga City',
    email: 'employee@mempco.local',
    phone: 'N/A',
    password: 'employee123',
    status: 'Active',
    createdAt: 'Demo Seed',
  },
];

const defaultTickets = [
  {
    id: 'TCK-2026-0001',
    ownerId: 'employee-001',
    ownerEmail: 'employee@mempco.local',
    requester: 'Jomari Francisco',
    employeeId: 'MCO854',
    branch: 'Veterans',
    department: 'Operation Department',
    supportCategory: 'Remote Support',
    concernType: 'MBWin',
    description:
      'Teller expired concern for Loans Clerk. User requires MBWin teller date update and verification.',
    sla: 'High',
    priority: 'High',
    status: 'Resolved',
    technician: 'Jeffrey Uc-kung',
    date: 'Apr 03, 2026',
    createdAt: 'Apr 03, 2026, 9:22 AM',
    lastUpdated: 'Apr 03, 2026, 10:24 AM',
    actionTaken:
      'Performed remote support via AnyDesk and updated teller validity date. Verified successful login after the change.',
    adminRemarks: 'Requested by Branch Manager. Issue already validated.',
    resolution: 'Teller date updated and user confirmed access.',
  },
  {
    id: 'TCK-2026-0002',
    ownerId: 'employee-001',
    ownerEmail: 'employee@mempco.local',
    requester: 'Jomari Francisco',
    employeeId: 'MCO854',
    branch: 'Ayala',
    department: 'Accounting Department',
    supportCategory: 'Hardware Support',
    concernType: 'Printer Troubleshooting',
    description:
      'Epson L3210 printer power button and orange indicator are blinking simultaneously. Printing is unavailable.',
    sla: 'Medium',
    priority: 'Medium',
    status: 'Pending',
    technician: 'Jomari Francisco',
    date: 'Apr 04, 2026',
    createdAt: 'Apr 04, 2026, 10:12 AM',
    lastUpdated: 'Apr 04, 2026, 11:30 AM',
    actionTaken:
      'Performed initial onsite troubleshooting, full software reset, and blower cleaning. Concern persists.',
    adminRemarks:
      'Recommended to bring printer to repair shop. Coordinated with Admin for next action.',
    resolution: '',
  },
  {
    id: 'TCK-2026-0003',
    ownerId: 'employee-001',
    ownerEmail: 'employee@mempco.local',
    requester: 'Jomari Francisco',
    employeeId: 'MCO854',
    branch: 'Canelar',
    department: 'Treasury Department',
    supportCategory: 'Network Support',
    concernType: 'Internet Connection',
    description:
      'Intermittent internet connection reported. Branch users experience unstable access to online systems.',
    sla: 'High',
    priority: 'High',
    status: 'In Progress',
    technician: 'ICT Technical Staff',
    date: 'Apr 05, 2026',
    createdAt: 'Apr 05, 2026, 1:35 PM',
    lastUpdated: 'Apr 05, 2026, 2:18 PM',
    actionTaken:
      'Checked initial connectivity status and advised branch to restart modem/router. Monitoring ongoing.',
    adminRemarks: 'Needs follow-up with ISP if connection remains unstable.',
    resolution: '',
  },
];

export const seedDemoData = () => {
  if (!isBrowser()) return;

  const users = readJson(STORAGE_KEYS.users, null);
  const tickets = readJson(STORAGE_KEYS.tickets, null);

  if (!Array.isArray(users) || users.length === 0) {
    writeJson(STORAGE_KEYS.users, defaultUsers);
  }

  if (!Array.isArray(tickets)) {
    writeJson(STORAGE_KEYS.tickets, defaultTickets);
  }
};

export const getUsers = () => readJson(STORAGE_KEYS.users, []);
export const saveUsers = (users) => writeJson(STORAGE_KEYS.users, users);

export const getTickets = () => readJson(STORAGE_KEYS.tickets, []);
export const saveTickets = (tickets) => writeJson(STORAGE_KEYS.tickets, tickets);

export const getCurrentUser = () => readJson(STORAGE_KEYS.currentUser, null);
export const setCurrentUser = (user) => writeJson(STORAGE_KEYS.currentUser, user);
export const clearCurrentUser = () => {
  if (!isBrowser()) return;
  window.localStorage.removeItem(STORAGE_KEYS.currentUser);
};

export const findUserForLogin = ({ email, password, role }) => {
  const normalizedEmail = email.trim().toLowerCase();

  return getUsers().find(
    (user) =>
      user.email.toLowerCase() === normalizedEmail &&
      user.password === password &&
      user.role === role
  );
};

export const registerEmployee = (payload) => {
  const users = getUsers();
  const normalizedEmail = payload.email.trim().toLowerCase();

  const exists = users.some((user) => user.email.toLowerCase() === normalizedEmail);
  if (exists) {
    throw new Error('This email address is already registered.');
  }

  const employee = {
    id: `employee-${Date.now()}`,
    role: 'employee',
    name: payload.name.trim(),
    initials: getInitials(payload.name),
    employeeId: payload.employeeId.trim(),
    department: payload.department.trim(),
    branch: payload.branch.trim(),
    office: payload.branch.trim(),
    email: normalizedEmail,
    phone: payload.phone.trim(),
    password: payload.password,
    status: 'Active',
    createdAt: formatDateTime(),
  };

  const updatedUsers = [...users, employee];
  saveUsers(updatedUsers);
  return employee;
};

export const createTicket = ({ user, form }) => {
  const tickets = getTickets();
  const count = tickets.length + 1;
  const id = `TCK-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;

  const ticket = {
    id,
    ownerId: user.id,
    ownerEmail: user.email,
    requester: user.name,
    employeeId: user.employeeId,
    branch: form.branch,
    department: form.department,
    supportCategory: form.supportCategory,
    concernType: form.concernType,
    description: form.description.trim(),
    sla: form.sla,
    priority: form.sla,
    status: 'Created',
    technician: 'Unassigned',
    date: formatDateOnly(),
    createdAt: formatDateTime(),
    lastUpdated: formatDateTime(),
    actionTaken: '',
    adminRemarks: '',
    resolution: '',
  };

  const updatedTickets = [ticket, ...tickets];
  saveTickets(updatedTickets);
  return ticket;
};

export const updateTicket = (ticketId, updates) => {
  const tickets = getTickets();
  const updatedTickets = tickets.map((ticket) =>
    ticket.id === ticketId
      ? {
          ...ticket,
          ...updates,
          priority: updates.sla || ticket.priority,
          lastUpdated: formatDateTime(),
        }
      : ticket
  );

  saveTickets(updatedTickets);
  return updatedTickets.find((ticket) => ticket.id === ticketId);
};

export const deleteTicket = (ticketId) => {
  const tickets = getTickets();
  saveTickets(tickets.filter((ticket) => ticket.id !== ticketId));
};

export const resetDemoData = () => {
  if (!isBrowser()) return;
  window.localStorage.removeItem(STORAGE_KEYS.users);
  window.localStorage.removeItem(STORAGE_KEYS.tickets);
  window.localStorage.removeItem(STORAGE_KEYS.currentUser);
  seedDemoData();
};

export const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export const isUnresolved = (status) => !['Resolved', 'Canceled'].includes(status);
