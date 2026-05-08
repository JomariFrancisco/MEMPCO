'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar/Navbar';
import Footer from '@/components/Footer/Footer';
import {
  BRANCHES,
  CATEGORY_TEMPLATES,
  CONCERN_TYPES,
  DEPARTMENTS,
  SUPPORT_CATEGORIES,
  clearCurrentUser,
  createTicket,
  getCurrentUser,
  getTickets,
  isUnresolved,
  seedDemoData,
  slugify,
  updateTicket,
} from '../portalStorage';
import './dashboard.css';

/* =========================
   ROUTES
========================= */

const LOGIN_ROUTE = '/LogIn';
const HRMAX_ROUTE = '/HRMax';

/* =========================
   STATIC DATA
========================= */

const SAAR_MAX_SIZE = 4 * 1024 * 1024;

const ANNOUNCEMENTS = [
  {
    tag: 'Helpdesk',
    title: 'Centralized employee technical support',
    description:
      'Submit ICT concerns with complete information, required attachments, and automatically assigned urgency level for faster routing.',
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
    concernType.includes('voucher') ||
    concernType.includes('printer troubleshooting') ||
    concernType.includes('laptop troubleshooting') ||
    concernType.includes('hardware troubleshooting') ||
    supportCategory.includes('user account management') ||
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

const Icon = {
  Dashboard: () => (
    <svg className="sidebar-nav-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M3 3a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V3zm8 0a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1V3zM3 13a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4zm8-3a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z" />
    </svg>
  ),
  Profile: () => (
    <svg className="sidebar-nav-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
    </svg>
  ),
  Helpdesk: () => (
    <svg className="sidebar-nav-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 100 4v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2a2 2 0 100-4V6zm6-1v10h2V5H8z" />
    </svg>
  ),
  HRMax: () => (
    <svg className="sidebar-nav-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M9 2a1 1 0 00-1 1v1H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2h-3V3a1 1 0 00-1-1H9zm1 2h0V3h0v1zM5 8h10v8H5V8zm2 2h2v2H7v-2zm4 0h2v2h-2v-2z" />
    </svg>
  ),
  Connect: () => (
    <svg className="sidebar-nav-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-2.121 2.122a2 2 0 01-2.829 0 1 1 0 10-1.414 1.414 4 4 0 005.657 0l2.121-2.121a4 4 0 00-5.657-5.657L9.879 4.464a1 1 0 101.414 1.415l1.293-1.293zM7.414 15.414a2 2 0 01-2.828-2.828l2.121-2.122a2 2 0 012.829 0 1 1 0 101.414-1.414 4 4 0 00-5.657 0L3.172 11.172a4 4 0 105.657 5.657l1.292-1.293a1 1 0 10-1.414-1.414l-1.293 1.292z" clipRule="evenodd" />
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
      <section className="panel-card glass hero-panel employee-hero-panel">
        <div className="hero-copy">
          <span className="section-kicker">Employee IT Support</span>
          <h2>Your helpdesk workspace for faster ICT assistance.</h2>
          <p>
            Submit complete service requests, attach required documents, monitor ticket progress,
            and review ICT actions in one employee support center.
          </p>
        </div>

        <div className="hero-meta">
          <span className="meta-pill">SLA Auto Detection</span>
          <span className="meta-pill">{openTickets} Active</span>
          <button type="button" className="quick-action-btn primary" onClick={() => onGoTo('helpdesk', 'submit')}>
            Submit Ticket
          </button>
        </div>
      </section>

      <section className="stats-grid" aria-label="Key statistics">
        {[
          { icon: '✓', label: 'Employee Status', value: user.status || 'Active', meta: 'Authorized employee' },
          { icon: '🎫', label: 'My Tickets', value: tickets.length, meta: 'Submitted requests' },
          { icon: '⏳', label: 'Pending Review', value: pendingCount, meta: 'Awaiting ICT action' },
          { icon: '⚠️', label: 'Urgent Active', value: urgentCount, meta: `${resolvedCount} resolved` },
        ].map((item) => (
          <article key={item.label} className="stat-card glass">
            <div className="stat-icon">{item.icon}</div>
            <span className="stat-label">{item.label}</span>
            <p className="stat-value">{item.value}</p>
            <span className="stat-meta">{item.meta}</span>
          </article>
        ))}
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

      <div className="dashboard-columns">
        <div className="dashboard-stack">
          <section className="panel-card glass">
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

          <section className="panel-card glass">
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

        <div className="dashboard-stack">
          <section className="panel-card glass">
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
                  View Ticket Details
                </button>
              </article>
            ) : (
              <div className="empty-state compact">
                <div className="empty-icon">🎫</div>
                <h4>No ticket yet</h4>
                <p>Create your first support ticket so ICT can review your concern.</p>
                <button type="button" className="quick-action-btn primary" onClick={() => onGoTo('helpdesk', 'submit')}>
                  Create Ticket
                </button>
              </div>
            )}
          </section>

          <section className="panel-card glass">
            <div className="section-head">
              <div>
                <span className="section-kicker">Employee Summary</span>
                <h3>Profile Snapshot</h3>
              </div>
            </div>

            <div className="snapshot-top">
              <div className="snapshot-avatar">{user.initials}</div>
              <div className="snapshot-top-copy">
                <h4>{user.name}</h4>
                <p>{user.department}</p>
              </div>
            </div>

            <div className="snapshot-grid">
              {[
                { label: 'Employee ID', value: user.employeeId },
                { label: 'Status', value: <span className="status active">{user.status || 'Active'}</span> },
                { label: 'Email', value: user.email },
                { label: 'Assigned Office', value: user.branch || user.office },
              ].map((cell) => (
                <div key={cell.label} className="snapshot-cell">
                  <span>{cell.label}</span>
                  <p>{cell.value}</p>
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
  const infoRows = [
    { label: 'Employee ID', value: user.employeeId },
    { label: 'Email Address', value: user.email },
    { label: 'Department', value: user.department },
    { label: 'Status', value: <span className="status active">{user.status || 'Active'}</span> },
    { label: 'Assigned Office', value: user.branch || user.office },
    { label: 'Phone Number', value: user.phone || 'N/A' },
  ];

  return (
    <div className="profile-view">
      <section className="panel-card glass profile-banner">
        <div className="profile-banner-main">
          <div className="avatar large">{user.initials}</div>
          <div className="profile-banner-copy">
            <span className="section-kicker">Employee Profile</span>
            <h2>{user.name}</h2>
            <p>{user.department} &middot; {user.branch || user.office}</p>
          </div>
        </div>

        <div className="profile-banner-pills">
          <span className="profile-pill">{user.employeeId}</span>
          <span className="profile-pill">{user.branch || user.office}</span>
          <span className="profile-pill active">{user.status || 'Active'}</span>
        </div>
      </section>

      <div className="profile-columns">
        <section className="panel-card glass">
          <div className="section-head">
            <div>
              <span className="section-kicker">Employee Information</span>
              <h3>Personal &amp; Work Details</h3>
            </div>
          </div>

          <div className="snapshot-grid">
            {infoRows.map((row) => (
              <div key={row.label} className="snapshot-cell">
                <span>{row.label}</span>
                <p>{row.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="panel-card glass">
          <div className="section-head">
            <div>
              <span className="section-kicker">Account Actions</span>
              <h3>Shortcuts</h3>
            </div>
          </div>

          <div className="profile-side-stack">
            <button type="button" className="quick-action-btn primary" onClick={() => onGoTo('helpdesk', 'submit')}>
              Submit New Ticket
            </button>
            <button type="button" className="quick-action-btn" onClick={() => onGoTo('helpdesk', 'tickets')}>
              Review My Tickets
            </button>
            <button type="button" className="quick-action-btn" onClick={() => onGoTo('dashboard')}>
              Return to Dashboard
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

/* =========================
   HELPDESK VIEW
========================= */

function HelpdeskView({ user, tickets, reloadTickets, initialTab }) {
  const [tab, setTab] = useState(initialTab || 'tickets');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [viewTicket, setViewTicket] = useState(null);
  const [formError, setFormError] = useState('');

  const activeCount = tickets.filter((ticket) => isUnresolved(ticket.status)).length;
  const resolvedCount = tickets.filter((ticket) => ticket.status === 'Resolved').length;
  const mbwinRequired = isMbwinRequest(form);
  const detectedSla = useMemo(() => detectSla(form), [form]);

  const handleFormChange = (field, value) => {
    setFormError('');

    setForm((prev) => {
      const next = { ...prev, [field]: value };

      if (field === 'supportCategory') {
        const currentTemplate = CATEGORY_TEMPLATES[prev.supportCategory] || '';
        const nextTemplate = CATEGORY_TEMPLATES[value] || '';

        if (!prev.description || prev.description === currentTemplate) {
          next.description = nextTemplate;
        }
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

    setForm(emptyForm);
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
      description: ticket.description || '',
      saarAttachment: ticket.saarAttachment || null,
    });
    setFormError('');
    setTab('submit');
  };

  const switchToSubmit = () => {
    setEditingId(null);
    setForm(emptyForm);
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
          <button type="button" className="quick-action-btn primary" onClick={switchToSubmit}>
            + Create Ticket
          </button>
        </div>
      </section>

      <section className="support-insight-grid" aria-label="Support insights">
        <article className="support-insight-card">
          <span>Queue</span>
          <strong>{tickets.length}</strong>
          <p>Total requests submitted from your account.</p>
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
                <div className="empty-icon">🎫</div>
                <h4>No tickets submitted yet</h4>
                <p>Once you create a helpdesk request, it will appear here for tracking and ICT updates.</p>
                <button type="button" className="quick-action-btn primary" onClick={switchToSubmit}>
                  Create Your First Ticket
                </button>
              </div>
            ) : (
              tickets.map((ticket) => (
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
                      View Details
                    </button>

                    {ticket.status !== 'Resolved' && ticket.status !== 'Canceled' && (
                      <button type="button" className="ticket-action-btn" onClick={() => handleEdit(ticket)}>
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              ))
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
                  {CONCERN_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="ticket-form-group">
                <label htmlFor="ticket-device">Device / Workstation / System</label>
                <input
                  id="ticket-device"
                  className="ticket-field ticket-input"
                  type="text"
                  value={form.deviceName}
                  onChange={(e) => handleFormChange('deviceName', e.target.value)}
                  placeholder="Example: Teller PC 01, Printer L3210, MBWIN Account"
                  required
                />
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
                <label htmlFor="ticket-impact">Operational Impact</label>
                <select
                  id="ticket-impact"
                  className="ticket-field ticket-select"
                  value={form.impact}
                  onChange={(e) => handleFormChange('impact', e.target.value)}
                  required
                >
                  <option value="" disabled>Select operational impact</option>
                  <option value="Single user affected">Single user affected</option>
                  <option value="Multiple users affected">Multiple users affected</option>
                  <option value="Department affected">Department affected</option>
                  <option value="Branch operation affected">Branch operation affected</option>
                  <option value="Core operation affected">Core operation affected</option>
                </select>
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
                  SLA is detected from concern type, support category, description, and operational impact.
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
                  placeholder="Describe the issue, exact error message, affected system, and steps already taken."
                  required
                />
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
    seedDemoData();

    const activeUser = getCurrentUser();

    if (!activeUser || activeUser.role !== 'employee') {
      clearCurrentUser();
      router.replace(LOGIN_ROUTE);
      return;
    }

    setUser(activeUser);
    loadTickets(activeUser);
    setAuthChecked(true);
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
    loadTickets();
  };

  const handleLogout = () => {
    clearCurrentUser();
    router.replace(LOGIN_ROUTE);
  };

  if (!authChecked || !user) {
    return (
      <>
        <Navbar />
        <main className="portal-main portal-app-main">
          <div className="portal-shell">
            <section className="panel-card glass empty-state">
              <div className="empty-icon">🔐</div>
              <h4>Checking employee access...</h4>
              <p>Please wait while your employee session is verified.</p>
            </section>
          </div>
        </main>
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
                ☰
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

      <Footer />
    </>
  );
}