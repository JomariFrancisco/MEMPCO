'use client';

import { useEffect, useMemo, useState } from 'react';
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
  LayoutDashboard,
  Link2,
  LogOut,
  Mail,
  Menu,
  MapPin,
  PenLine,
  Phone,
  Send,
  ShieldCheck,
  Ticket,
  UserRound,
  UserRoundCheck,
  UsersRound,
  Wrench,
} from 'lucide-react';
import Navbar from '@/components/Navbar/Navbar';
import {
  BRANCHES,
  CATEGORY_TEMPLATES,
  CONCERN_TYPES,
  DEPARTMENTS,
  DEVICE_OPTIONS,
  SUPPORT_CATEGORIES,
  createTicket,
  getTickets,
  isUnresolved,
  slugify,
  updateTicket,
} from '../portalStorage';
import { getCurrentPortalUser, signOutPortal } from '@/lib/auth/portalAuth';
import './dashboard.css';

/* =========================
   ROUTES
========================= */

const LOGIN_ROUTE = '/LogIn';
const HRMAX_ROUTE = '/HRMax';
const TRANSITION_DURATION = 560;

/* =========================
   STATIC DATA
========================= */

const SAAR_MAX_SIZE = 4 * 1024 * 1024;

const ANNOUNCEMENTS = [
  {
    tag: 'Helpdesk',
    title: 'Centralized employee technical support',
    description:
      'Submit ICT concerns with complete information, required attachments, and automatically assigned SLA level for faster routing.',
    date: 'Active',
  },
  {
    tag: 'Support',
    title: 'Track status, technician action, and resolution',
    description:
      'Every submitted request can be reviewed from your ticket history. Updates from ICT will appear in your ticket details.',
    date: 'Live',
  },
  {
    tag: 'Reminder',
    title: 'MBWIN requests require SAAR attachment',
    description:
      'For MBWIN-related concerns, attach the approved SAAR PDF before submitting the request.',
    date: 'Required',
  },
];

const GUIDES = [
  'Provide the branch, department, device or workstation name, and complete issue description.',
  'For MBWIN concerns, attach the approved SAAR PDF before submitting the ticket.',
  'Use the ticket details view to monitor technician action, remarks, and resolution notes.',
];

const SUPPORT_FLOW = [
  {
    title: 'Submit request',
    text: 'Employee provides all required details and attachments.',
  },
  {
    title: 'ICT review',
    text: 'The system assigns SLA automatically and ICT validates the concern.',
  },
  {
    title: 'Action & resolution',
    text: 'Technician updates action taken, remarks, and final resolution.',
  },
];

const OPERATIONAL_IMPACTS = [
  {
    value: 'Single user affected',
    title: 'Only me',
    detail: 'One employee, device, account, or workstation is affected.',
    level: 'Low',
    icon: UserRound,
  },
  {
    value: 'Multiple users affected',
    title: 'A few teammates',
    detail: 'Several employees are affected, but work can still continue.',
    level: 'Medium',
    icon: UsersRound,
  },
  {
    value: 'Department affected',
    title: 'My department',
    detail: 'A department workflow is slowed down or partially blocked.',
    level: 'Medium',
    icon: Wrench,
  },
  {
    value: 'Branch operation affected',
    title: 'Branch operations',
    detail: 'A branch service or daily operation is delayed or disrupted.',
    level: 'High',
    icon: Building2,
  },
  {
    value: 'Core operation affected',
    title: 'Service stopped',
    detail: 'Transactions, member service, or critical systems cannot proceed.',
    level: 'Critical',
    icon: ShieldCheck,
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
};

const DEFAULT_DESCRIPTION_TEMPLATE =
  'Anydesk Number:\nIssue Summary:\nExact Error Message:\nAction Already Tried:';

const getTemplateLabels = (template = DEFAULT_DESCRIPTION_TEMPLATE) =>
  template
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const ensureDescriptionTemplate = (value = '', supportCategory = '') => {
  const template = CATEGORY_TEMPLATES[supportCategory] || DEFAULT_DESCRIPTION_TEMPLATE;
  const labels = getTemplateLabels(template);
  const text = String(value || '').trim();
  const lines = text ? text.split('\n') : [];
  const missingLabels = labels.filter((label) => !lines.some((line) => line.trim().startsWith(label)));

  return [...missingLabels, ...lines].join('\n').trim();
};

const getNewTicketForm = (user = {}) => ({
  ...emptyForm,
  branch: user.branch || user.office || '',
  department: user.department || '',
  contactNumber: user.phone || '',
  description: DEFAULT_DESCRIPTION_TEMPLATE,
});

/* =========================
   HELPERS
========================= */

const normalize = (value) => String(value || '').trim().toLowerCase();

const isMbwinRequest = (formOrTicket) => {
  const haystack = [
    formOrTicket.supportCategory,
    formOrTicket.concernType,
    formOrTicket.description,
  ]
    .map(normalize)
    .join(' ');

  return haystack.includes('mbwin') || haystack.includes('mb win');
};

const detectSla = (form) => {
  const supportCategory = normalize(form.supportCategory);
  const concernType = normalize(form.concernType);
  const impact = normalize(form.impact);
  const description = normalize(form.description);
  const combined = `${supportCategory} ${concernType} ${impact} ${description}`;

  if (
    combined.includes('ransomware') ||
    combined.includes('data loss') ||
    combined.includes('breach') ||
    combined.includes('security incident') ||
    combined.includes('all branch down') ||
    combined.includes('entire branch down') ||
    combined.includes('no operation') ||
    combined.includes('cannot operate') ||
    combined.includes('system down') ||
    combined.includes('server down') ||
    combined.includes('server no power')
  ) {
    return 'Critical';
  }

  if (
    concernType.includes('server') ||
    combined.includes('core operation affected') ||
    combined.includes('branch operation affected') ||
    combined.includes('network outage') ||
    combined.includes('internet outage') ||
    combined.includes('no internet') ||
    combined.includes('power supply') ||
    combined.includes('account creation to re-assigned') ||
    combined.includes('re-assigned treasury') ||
    combined.includes('urgent approval')
  ) {
    return 'High';
  }

  if (
    isMbwinRequest(form) ||
    concernType.includes('network connection') ||
    concernType.includes('internet') ||
    concernType.includes('wi-fi') ||
    concernType.includes('voucher') ||
    concernType.includes('printer') ||
    concernType.includes('scanner') ||
    concernType.includes('computer') ||
    concernType.includes('laptop') ||
    concernType.includes('hardware') ||
    supportCategory.includes('account') ||
    supportCategory.includes('access') ||
    impact.includes('multiple users') ||
    impact.includes('department affected')
  ) {
    return 'Medium';
  }

  return 'Low';
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

const getTicketOwnerMatch = (ticket, user) =>
  ticket.ownerId === user.id || ticket.ownerEmail === user.email;

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

const employeeTransitionLabels = {
  dashboard: 'Opening employee dashboard...',
  profile: 'Loading employee profile...',
  helpdesk: 'Preparing helpdesk workspace...',
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
      <div className="stat-icon"><MonoIcon icon={icon} /></div>
      <span className="stat-label">{label}</span>
      <p className="stat-value">{value}</p>
      <span className="stat-meta">{meta}</span>
    </article>
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
          <span className="meta-pill">SLA Auto Detection</span>
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

      <section className="support-flow-grid">
        {SUPPORT_FLOW.map((step, index) => (
          <article key={step.title} className="support-flow-card glass">
            <span>{String(index + 1).padStart(2, '0')}</span>
            <h4>{step.title}</h4>
            <p>{step.text}</p>
          </article>
        ))}
      </section>

      <div className="dashboard-columns equal-columns">
        <div className="dashboard-stack">
          <section className="panel-card glass equal-panel">
            <div className="section-head">
              <div>
                <span className="section-kicker">Internal Updates</span>
                <h3>Helpdesk Notices</h3>
              </div>
            </div>

            <div className="announcement-list">
              {ANNOUNCEMENTS.map((item) => (
                <article key={item.title} className="announcement-item">
                  <span className="announcement-tag">{item.tag}</span>
                  <h4>{item.title}</h4>
                  <p>{item.description}</p>
                  <span className="announcement-date">{item.date}</span>
                </article>
              ))}
            </div>
          </section>
        </div>

        <div className="dashboard-stack">
          <section className="panel-card glass equal-panel">
            <div className="section-head">
              <div>
                <span className="section-kicker">Latest Activity</span>
                <h3>Most Recent Ticket</h3>
              </div>
            </div>

            {latestTicket ? (
              <article className="latest-ticket-card">
                <div className="ticket-header">
                  <div className="ticket-header-left">
                    <h4>{latestTicket.concernType}</h4>
                    <span className="ticket-id">{latestTicket.id}</span>
                  </div>
                  <span className="ticket-date">{latestTicket.date}</span>
                </div>

                <div className="ticket-badges">
                  <span className={`status ${slugify(latestTicket.status)}`}>{latestTicket.status}</span>
                  <span className={`priority ${slugify(latestTicket.sla)}`}>{latestTicket.sla}</span>
                </div>

                <p className="ticket-description">{latestTicket.description}</p>

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
              </div>
            )}
          </section>

          <section className="panel-card glass equal-panel">
            <div className="section-head">
              <div>
                <span className="section-kicker">Submission Guide</span>
                <h3>Before Creating a Ticket</h3>
              </div>
            </div>

            <div className="guide-list">
              {GUIDES.map((guide) => (
                <div key={guide} className="guide-item">
                  <span className="guide-dot" aria-hidden="true" />
                  <p>{guide}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/* =========================
   PROFILE VIEW
========================= */

function ProfileView({ user, onGoTo }) {
  const employeeStatus = user.status || 'Active';
  const assignedOffice = user.branch || user.office || 'Not assigned';
  const designation = user.designation || 'Employee';
  const profileRows = [
    { label: 'Employee ID', value: user.employeeId || 'Not provided', icon: IdCard },
    { label: 'Designation', value: designation, icon: BriefcaseBusiness },
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
  const [viewTicket, setViewTicket] = useState(null);
  const [formError, setFormError] = useState('');
  const [ticketPage, setTicketPage] = useState(1);

  const activeCount = tickets.filter((ticket) => isUnresolved(ticket.status)).length;
  const resolvedCount = tickets.filter((ticket) => ticket.status === 'Resolved').length;
  const mbwinRequired = isMbwinRequest(form);
  const detectedSla = useMemo(() => detectSla(form), [form]);
  const pageSize = 3;
  const totalPages = Math.max(1, Math.ceil(tickets.length / pageSize));
  const currentPage = Math.min(ticketPage, totalPages);
  const pagedTickets = tickets.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const goToTicketPage = (page) => setTicketPage(Math.min(Math.max(page, 1), totalPages));

  useEffect(() => {
    if (ticketPage > totalPages) {
      setTicketPage(totalPages);
    }
  }, [ticketPage, totalPages]);

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
        const currentTemplate = CATEGORY_TEMPLATES[prev.supportCategory] || '';
        const nextTemplate = CATEGORY_TEMPLATES[value] || '';

        if (
          !prev.description ||
          prev.description === currentTemplate ||
          prev.description === DEFAULT_DESCRIPTION_TEMPLATE
        ) {
          next.description = nextTemplate || DEFAULT_DESCRIPTION_TEMPLATE;
        } else {
          next.description = ensureDescriptionTemplate(prev.description, value);
        }
      }

      if (field === 'description') {
        next.description = ensureDescriptionTemplate(value, prev.supportCategory);
      }

      return next;
    });
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

  const validateForm = () => {
    const requiredFields = [
      ['branch', 'Branch / Location'],
      ['department', 'Department'],
      ['supportCategory', 'Support Category'],
      ['concernType', 'Concern Type'],
      ['deviceName', 'Device / Workstation'],
      ['contactNumber', 'Contact Number'],
      ['impact', 'Operational Impact'],
      ['description', 'Issue Description'],
    ];

    const missing = requiredFields.find(([field]) => !String(form[field] || '').trim());

    if (missing) {
      setFormError(`${missing[1]} is required.`);
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

  const confirmSubmit = () => {
    const payload = {
      ...form,
      sla: detectedSla,
      saarRequired: mbwinRequired,
      lastEmployeeUpdate: new Date().toLocaleString(),
    };

    if (editingId) {
      updateTicket(editingId, {
        ...payload,
        status: 'Modified',
      });

      setEditingId(null);
    } else {
      const beforeIds = new Set(getTickets().map((ticket) => ticket.id));

      createTicket({ user, form: payload });

      const createdTicket = getTickets().find(
        (ticket) => !beforeIds.has(ticket.id) && getTicketOwnerMatch(ticket, user)
      );

      if (createdTicket?.id) {
        updateTicket(createdTicket.id, payload);
      }
    }

    setForm(getNewTicketForm(user));
    setFormError('');
    setShowConfirm(false);
    setTab('tickets');
    reloadTickets();
  };

  const handleEdit = (ticket) => {
    setEditingId(ticket.id);
    setForm({
      branch: ticket.branch || '',
      department: ticket.department || '',
      supportCategory: ticket.supportCategory || '',
      concernType: ticket.concernType || '',
      deviceName: ticket.deviceName || '',
      contactNumber: ticket.contactNumber || '',
      impact: ticket.impact || '',
      description: ensureDescriptionTemplate(ticket.description, ticket.supportCategory),
      saarAttachment: ticket.saarAttachment || null,
    });
    setFormError('');
    setTab('submit');
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
                      <span className="ticket-id">{ticket.id}</span>
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

                  {ticket.actionTaken && (
                    <div className="ticket-admin-note">
                      <strong>ICT Action Taken</strong>
                      <p>{ticket.actionTaken}</p>
                    </div>
                  )}

                  <div className="ticket-footer">
                    <button type="button" className="ticket-action-btn" onClick={() => setViewTicket(ticket)}>
                      <MonoIcon icon={Eye} />
                      View Details
                    </button>

                    {ticket.status !== 'Resolved' && ticket.status !== 'Canceled' && (
                      <button type="button" className="ticket-action-btn" onClick={() => handleEdit(ticket)}>
                        <MonoIcon icon={PenLine} />
                        Edit
                      </button>
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
                <label htmlFor="ticket-category">Support Category</label>
                <select
                  id="ticket-category"
                  className="ticket-field ticket-select"
                  value={form.supportCategory}
                  onChange={(e) => handleFormChange('supportCategory', e.target.value)}
                  required
                >
                  <option value="" disabled>Select support category</option>
                  {form.supportCategory && !SUPPORT_CATEGORIES.includes(form.supportCategory) && (
                    <option value={form.supportCategory}>{form.supportCategory}</option>
                  )}
                  {SUPPORT_CATEGORIES.map((category) => (
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
                  required
                >
                  <option value="" disabled>Select concern type</option>
                  {form.concernType && !CONCERN_TYPES.includes(form.concernType) && (
                    <option value={form.concernType}>{form.concernType}</option>
                  )}
                  {CONCERN_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
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

              <div className="ticket-form-group full">
                <label id="ticket-impact-label">Operational Impact</label>
                <div
                  className="impact-picker"
                  role="radiogroup"
                  aria-labelledby="ticket-impact-label"
                >
                  {OPERATIONAL_IMPACTS.map((impact) => {
                    const selected = form.impact === impact.value;

                    return (
                      <button
                        key={impact.value}
                        type="button"
                        className={`impact-option ${slugify(impact.level)}${selected ? ' selected' : ''}`}
                        onClick={() => handleFormChange('impact', impact.value)}
                        role="radio"
                        aria-checked={selected}
                      >
                        <span className="impact-option-icon">
                          <MonoIcon icon={impact.icon} />
                        </span>
                        <span className="impact-option-copy">
                          <strong>{impact.title}</strong>
                          <span>{impact.detail}</span>
                        </span>
                        <em>{impact.level}</em>
                      </button>
                    );
                  })}
                </div>
                <span className="ticket-form-hint">
                  Choose the option closest to the business impact. This helps ICT prioritize the ticket correctly.
                </span>
              </div>

              <div className="ticket-form-group">
                <label htmlFor="ticket-sla">Auto-Detected SLA</label>
                <input
                  id="ticket-sla"
                  className={`ticket-field ticket-input readonly-field priority-${slugify(detectedSla)}`}
                  type="text"
                  value={detectedSla}
                  readOnly
                  aria-readonly="true"
                />
                <span className="ticket-form-hint">
                  SLA is detected from the selected support category, concern type, and operational impact.
                </span>
              </div>

              <div className="ticket-form-group full">
                <label htmlFor="ticket-desc">Issue Description</label>
                <textarea
                  id="ticket-desc"
                  className="ticket-field ticket-textarea"
                  value={form.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  maxLength={1200}
                  placeholder={DEFAULT_DESCRIPTION_TEMPLATE}
                  required
                />
                <span className="ticket-form-hint">
                  Keep the labels in place and add details after each one. The Anydesk Number line is required for ICT remote support.
                </span>
                <div className="char-count">{form.description.length}/1200 characters</div>
              </div>

              <div className={`ticket-form-group full saar-upload-card${mbwinRequired ? ' required' : ''}`}>
                <label htmlFor="ticket-saar">
                  SAAR PDF Attachment {mbwinRequired ? '(Required for MBWIN)' : '(Required only for MBWIN)'}
                </label>

                <input
                  id="ticket-saar"
                  className="ticket-field ticket-file"
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handleSaarFileChange}
                  required={mbwinRequired && !form.saarAttachment?.dataUrl}
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
                    Attach an approved SAAR PDF for MBWIN account, teller, role, or function requests.
                  </span>
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

      {showConfirm && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Confirm ticket submission">
          <div className="modal-box glass">
            <h3>{editingId ? 'Save Ticket Changes?' : 'Submit Ticket?'}</h3>
            <div className="modal-divider" />
            <p>
              {editingId
                ? 'Your updated ticket details will be sent for ICT review.'
                : 'Your helpdesk request will be submitted to ICT with the detected SLA level.'}
            </p>

            <div className="modal-ticket-summary">
              <span className={`priority ${slugify(detectedSla)}`}>{detectedSla}</span>
              <span>{form.supportCategory}</span>
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

      {viewTicket && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Ticket details">
          <div className="modal-box glass ticket-detail-modal">
            <h3>{viewTicket.concernType}</h3>

            <div className="modal-meta">
              <span className="ticket-id">{viewTicket.id}</span>
              <span className={`status ${slugify(viewTicket.status)}`}>{viewTicket.status}</span>
              <span className={`priority ${slugify(viewTicket.sla)}`}>{viewTicket.sla}</span>
            </div>

            <div className="modal-divider" />

            <div className="ticket-meta-grid modal-ticket-grid">
              <div className="ticket-meta-cell">
                <span>Branch</span>
                <p>{viewTicket.branch}</p>
              </div>
              <div className="ticket-meta-cell">
                <span>Department</span>
                <p>{viewTicket.department}</p>
              </div>
              <div className="ticket-meta-cell">
                <span>Device / System</span>
                <p>{viewTicket.deviceName || 'Not specified'}</p>
              </div>
              <div className="ticket-meta-cell">
                <span>Contact</span>
                <p>{viewTicket.contactNumber || 'Not specified'}</p>
              </div>
              <div className="ticket-meta-cell">
                <span>Impact</span>
                <p>{viewTicket.impact || 'Not specified'}</p>
              </div>
              <div className="ticket-meta-cell">
                <span>Assigned Technician</span>
                <p>{viewTicket.technician || 'Unassigned'}</p>
              </div>
            </div>

            <div className="modal-description support-modal-description">{viewTicket.description}</div>

            {viewTicket.saarAttachment?.name && (
              <div className="ticket-attachment-note modal-attachment-note">
                <strong>SAAR PDF Attachment</strong>
                <p>{viewTicket.saarAttachment.name} · {viewTicket.saarAttachment.sizeLabel}</p>
                {viewTicket.saarAttachment.dataUrl && (
                  <a href={viewTicket.saarAttachment.dataUrl} target="_blank" rel="noopener noreferrer">
                    Open SAAR PDF
                  </a>
                )}
              </div>
            )}

            <div className="ticket-meta-grid modal-ticket-grid">
              <div className="ticket-meta-cell">
                <span>ICT Action</span>
                <p>{viewTicket.actionTaken || 'No action recorded yet.'}</p>
              </div>
              <div className="ticket-meta-cell">
                <span>Remarks</span>
                <p>{viewTicket.adminRemarks || 'No remarks yet.'}</p>
              </div>
              <div className="ticket-meta-cell">
                <span>Resolution</span>
                <p>{viewTicket.resolution || 'No resolution yet.'}</p>
              </div>
            </div>

            <p className="modal-date-note">Last updated: {viewTicket.lastUpdated || viewTicket.lastEmployeeUpdate || viewTicket.date}</p>

            <div className="modal-footer">
              <button type="button" className="modal-btn cancel" onClick={() => setViewTicket(null)}>
                Close
              </button>

              {viewTicket.status !== 'Resolved' && viewTicket.status !== 'Canceled' && (
                <button
                  type="button"
                  className="modal-btn confirm"
                  onClick={() => {
                    handleEdit(viewTicket);
                    setViewTicket(null);
                  }}
                >
                  <MonoIcon icon={PenLine} />
                  Edit Ticket
                </button>
              )}
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

export default function DashboardPage() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [helpdeskTab, setHelpdeskTab] = useState('tickets');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [authChecked, setAuthChecked] = useState(false);
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);
  const [transitionLabel, setTransitionLabel] = useState(employeeTransitionLabels.dashboard);
  const router = useRouter();

  const loadTickets = (currentUser = user) => {
    if (!currentUser) return;

    const allTickets = getTickets();

    setTickets(
      allTickets
        .filter((ticket) => getTicketOwnerMatch(ticket, currentUser))
        .sort((a, b) => {
          const aTime = new Date(a.lastUpdated || a.createdAt || a.date || 0).getTime();
          const bTime = new Date(b.lastUpdated || b.createdAt || b.date || 0).getTime();

          return bTime - aTime;
        })
    );
  };

  useEffect(() => {
    let cancelled = false;

    const verifySession = async () => {
      try {
        const activeUser = await getCurrentPortalUser();

        if (cancelled) return;

        if (!activeUser || activeUser.role !== 'employee') {
          await signOutPortal().catch(() => {});
          router.replace(LOGIN_ROUTE);
          return;
        }

        setUser(activeUser);
        loadTickets(activeUser);
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
    const handleStorage = () => loadTickets();
    const handleFocus = () => loadTickets();

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
    loadTickets();
  };

  const handleLogout = async () => {
    setTransitionLabel(employeeTransitionLabels.logout);
    setIsPageTransitioning(true);
    await signOutPortal().catch(() => {});
    router.replace(LOGIN_ROUTE);
  };

  if (!authChecked || !user) {
    return (
      <>
        <Navbar />
        <main className="portal-main portal-app-main">
          <div className="portal-shell" />
        </main>
        <PortalTransitionLoader label="Verifying employee access..." />
      </>
    );
  }

  return (
    <>
      <Navbar />

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
            </section>
          </div>
        </div>
      </main>

      {isPageTransitioning && <PortalTransitionLoader label={transitionLabel} />}

    </>
  );
}
