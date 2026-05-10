'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Menu,
  Monitor,
  Printer,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  UserRound,
  Wrench,
} from 'lucide-react';
import {
  BRANCHES,
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
  deleteTicket,
  getTickets,
  releaseTicketLock,
  updateTicket,
} from '@/lib/tickets/portalTickets';
import './admin-dashboard.css';

/* =========================
   ROUTES
========================= */

const LOGIN_ROUTE = '/LogIn';
const HRMAX_ROUTE = '/HRMax';
const TRANSITION_DURATION = 560;
const REPORT_PERIOD_OPTIONS = [
  { key: 'day', label: 'Day', title: 'Tickets by Day', meta: 'Daily submissions' },
  { key: 'week', label: 'Week', title: 'Tickets by Week', meta: 'Weekly volume' },
  { key: 'month', label: 'Month', title: 'Tickets by Month', meta: 'Monthly trend' },
];
const SELECTED_DAY_TICKET_PAGE_SIZE = 2;

const MonoIcon = ({ icon: IconComponent }) => (
  <IconComponent className="admin-mono-icon" aria-hidden="true" />
);

const adminTransitionLabels = {
  dashboard: 'Opening admin dashboard...',
  tickets: 'Loading ticket queue...',
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
  status: user.status || 'Active',
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

const buildSummary = (tickets) => {
  const total = tickets.length;
  const active = tickets.filter((ticket) => isUnresolved(ticket.status)).length;
  const created = tickets.filter((ticket) => ticket.status === 'Created').length;
  const pending = tickets.filter((ticket) => ticket.status === 'Pending').length;
  const modified = tickets.filter((ticket) => ticket.status === 'Modified').length;
  const inProgress = tickets.filter((ticket) => ticket.status === 'In Progress').length;
  const resolved = tickets.filter((ticket) => ticket.status === 'Resolved').length;
  const critical = tickets.filter(
    (ticket) => ['High', 'Critical'].includes(ticket.sla) && isUnresolved(ticket.status)
  ).length;
  const saar = tickets.filter((ticket) => ticket.saarRequired || ticket.saarAttachment?.name).length;

  return { total, active, created, pending, modified, inProgress, resolved, critical, saar };
};

const breakdown = (tickets, key, source = []) => {
  const counts = countBy(tickets, key);
  const names = source.length ? source : Object.keys(counts);

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
    const submittedTime = getSubmittedTime(ticket);
    if (!submittedTime) return;

    const submittedDate = new Date(submittedTime);
    let key = '';
    let name = '';

    if (mode === 'day') {
      const day = new Date(submittedDate);
      day.setHours(0, 0, 0, 0);
      key = day.toISOString();
      name = formatReportDate(day, { month: 'short', day: 'numeric', year: 'numeric' });
    } else if (mode === 'week') {
      const weekStart = getWeekStart(submittedDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      key = weekStart.toISOString();
      name = `${formatReportDate(weekStart, { month: 'short', day: 'numeric' })} - ${formatReportDate(weekEnd, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else {
      const month = new Date(submittedDate.getFullYear(), submittedDate.getMonth(), 1);
      key = month.toISOString();
      name = formatReportDate(month, { month: 'long', year: 'numeric' });
    }

    const current = buckets.get(key) || { name, count: 0, timestamp: new Date(key).getTime() };
    current.count += 1;
    buckets.set(key, current);
  });

  return [...buckets.values()].sort((a, b) => b.timestamp - a.timestamp);
};

const getDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getTicketCalendarMonth = (tickets) => {
  const latestTicketTime = tickets.reduce((latest, ticket) => {
    const submittedTime = getSubmittedTime(ticket);
    return submittedTime > latest ? submittedTime : latest;
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

  gridStart.setDate(monthStart.getDate() - monthStart.getDay());

  tickets.forEach((ticket) => {
    const submittedTime = getSubmittedTime(ticket);
    if (!submittedTime) return;

    const submittedDate = new Date(submittedTime);
    const key = getDateKey(submittedDate);
    counts.set(key, (counts.get(key) || 0) + 1);
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
          @page { size: A4 landscape; margin: 7mm; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 0;
            color: #111827;
            font-family: Arial, Helvetica, sans-serif;
            background: #fff;
          }
          .print-page {
            width: 100%;
            height: 196mm;
            overflow: hidden;
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
          .report-row { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 8px; align-items: center; padding: 7px 8px; border: 1px solid #e5e7eb; border-radius: 7px; background: #f8fafc; font-size: 10.5px; }
          .report-row strong { min-width: 28px; text-align: right; color: #dc2626; }
          .report-row em { min-width: 32px; color: #64748b; font-style: normal; font-weight: 800; text-align: right; }
          .consolidated-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-top: 2px; }
          .print-note { margin-top: 7px; color: #64748b; font-size: 9.5px; font-weight: 700; }
          @media print {
            body { padding: 0; }
            .print-page { max-width: none; }
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
  const fieldRows = [
    ['Ticket ID', ticket.id],
    ['Status', ticket.status],
    ['SLA', ticket.sla],
    ['Requester', ticket.requester || ticket.ownerEmail || 'Employee'],
    ['Employee ID', ticket.employeeId || 'Not provided'],
    ['Branch / Department', `${ticket.branch || 'Not provided'} / ${ticket.department || 'Not provided'}`],
    ['Support Category', ticket.supportCategory || 'Unspecified'],
    ['Concern Type', ticket.concernType || 'Unspecified'],
    ['Submitted', ticket.createdAt || ticket.date || 'Not provided'],
    ['Resolved / Updated', ticket.adminUpdatedAt || ticket.lastUpdated || 'Not provided'],
    ['Assigned ICT Staff', ticket.technician || 'Unassigned'],
    ['Device / System', ticket.deviceName || 'Not provided'],
  ];
  const body = `
    <main class="print-page">
      ${getPrintLetterhead()}
      <section class="doc-head">
        <h2>Resolved Ticket Report</h2>
        <div class="meta">Ticket ${escapePrintHtml(ticket.id)}<br />Printed ${escapePrintHtml(new Date().toLocaleString())}</div>
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
    </main>
  `;

  openPrintDocument(`Resolved Ticket ${ticket.id}`, body);
};

const printReportSummary = ({ mode, title, items, total }) => {
  const periodLabel = mode === 'day' ? 'Daily' : mode === 'week' ? 'Weekly' : 'Monthly';
  const printableItems = items.slice(0, 30);
  const hiddenCount = Math.max(0, items.length - printableItems.length);
  const body = `
    <main class="print-page">
      ${getPrintLetterhead()}
      <section class="doc-head">
        <h2>${escapePrintHtml(periodLabel)} Ticket Report</h2>
        <div class="meta">${escapePrintHtml(title)}<br />Printed ${escapePrintHtml(new Date().toLocaleString())}</div>
      </section>
      <section class="grid">
        <div class="field"><span>Total Tickets</span><strong>${escapePrintHtml(total)}</strong></div>
        <div class="field"><span>Periods Included</span><strong>${escapePrintHtml(items.length)}</strong></div>
        <div class="field"><span>Report Type</span><strong>${escapePrintHtml(periodLabel)}</strong></div>
        <div class="field"><span>Prepared By</span><strong>IT Helpdesk Admin</strong></div>
      </section>
      <h3 class="section-title">${escapePrintHtml(title)}</h3>
      <section class="report-list">
        ${printableItems.map((item) => {
            const percent = total ? Math.round((item.count / total) * 100) : 0;
            return `
              <div class="report-row">
                <span>${escapePrintHtml(item.name)}</span>
                <strong>${escapePrintHtml(item.count)}</strong>
                <em>${escapePrintHtml(percent)}%</em>
              </div>
            `;
          }).join('')}
      </section>
      ${hiddenCount ? `<p class="print-note">Showing the latest ${printableItems.length} periods to keep this report on one page. ${hiddenCount} older period${hiddenCount === 1 ? '' : 's'} not shown.</p>` : ''}
    </main>
  `;

  openPrintDocument(`${periodLabel} Ticket Report`, body);
};

const printMonthlyConsolidatedReport = (tickets, monthDate) => {
  const target = new Date(monthDate);
  const year = target.getFullYear();
  const month = target.getMonth();
  const monthTitle = formatReportDate(new Date(year, month, 1), { month: 'long', year: 'numeric' });
  const monthlyTickets = tickets.filter((ticket) => {
    const submittedTime = getSubmittedTime(ticket);
    if (!submittedTime) return false;

    const submittedDate = new Date(submittedTime);
    return submittedDate.getFullYear() === year && submittedDate.getMonth() === month;
  });
  const monthlySummary = buildSummary(monthlyTickets);
  const technicianItems = TECHNICIANS
    .map((name) => ({
      name,
      count: monthlyTickets.filter((ticket) => (ticket.technician || 'Unassigned') === name).length,
    }))
    .filter((item) => item.count > 0);
  const escalationItems = ESCALATION_PARTNERS.map((name) => ({
    name,
    count: monthlyTickets.filter(
      (ticket) => ticket.status === 'Escalated' && (ticket.technician || '') === name
    ).length,
  })).filter((item) => item.count > 0);
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
    ? technicianItems.map((item) => row(item)).join('')
    : '<div class="report-row"><span>No ICT assignments</span><strong>0</strong><em>0%</em></div>';
  const escalationRows = escalationItems.length
    ? escalationItems.map((item) => row(item)).join('')
    : '<div class="report-row"><span>No third-party escalation</span><strong>0</strong><em>0%</em></div>';
  const body = `
    <main class="print-page">
      ${getPrintLetterhead()}
      <section class="doc-head">
        <h2>Monthly ICT Consolidated Report</h2>
        <div class="meta">${escapePrintHtml(monthTitle)}<br />Printed ${escapePrintHtml(new Date().toLocaleString())}</div>
      </section>
      <section class="grid">
        <div class="field"><span>Total Tickets</span><strong>${escapePrintHtml(monthlySummary.total)}</strong></div>
        <div class="field"><span>Resolved</span><strong>${escapePrintHtml(monthlySummary.resolved)}</strong></div>
        <div class="field"><span>Active</span><strong>${escapePrintHtml(monthlySummary.active)}</strong></div>
        <div class="field"><span>High / Critical</span><strong>${escapePrintHtml(monthlySummary.critical)}</strong></div>
      </section>
      <section class="consolidated-grid">
        <div>
          <h3 class="section-title">ICT Workload</h3>
          <div class="report-list single">${ictRows}</div>
        </div>
        <div>
          <h3 class="section-title">Escalation</h3>
          <div class="report-list single">${escalationRows}</div>
        </div>
        <div>
          <h3 class="section-title">Support Category</h3>
          <div class="report-list single">${categoryItems.map((item) => row(item)).join('')}</div>
        </div>
        <div>
          <h3 class="section-title">Branch Volume</h3>
          <div class="report-list single">${branchItems.map((item) => row(item)).join('')}</div>
        </div>
      </section>
      <p class="print-note">Consolidated monthly report prepared for the ICT Department team workload review.</p>
    </main>
  `;

  openPrintDocument(`Monthly ICT Consolidated Report - ${monthTitle}`, body);
};

const getStatusRank = (status) => {
  const ranks = {
    Critical: 1,
    Escalated: 2,
    Created: 3,
    Modified: 4,
    Pending: 5,
    'In Progress': 6,
    Resolved: 7,
    Canceled: 8,
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
    ticket.id,
    ticket.requester,
    ticket.ownerEmail,
    ticket.employeeId,
    ticket.branch,
    ticket.department,
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

const getTicketWorkStartedAt = (ticket) =>
  ticket.workStartedAt || (ticket.status === 'In Progress' ? ticket.adminUpdatedAt || ticket.lastUpdated : '');

const getTicketWorkEndedAt = (ticket) => ticket.workEndedAt || '';

const isTicketLockActive = (ticket) => {
  if (!ticket?.lockedBy) return false;

  const expiresAt = new Date(ticket.lockExpiresAt || '').getTime();
  return !Number.isNaN(expiresAt) && expiresAt > Date.now();
};

const isTicketLockedByOther = (ticket, userId) =>
  isTicketLockActive(ticket) && ticket.lockedBy && ticket.lockedBy !== userId;

const getTimeValue = (value) => {
  const parsed = new Date(value || '').getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const formatElapsedTime = (startedAt, endedAt, now = Date.now()) => {
  const start = getTimeValue(startedAt);
  if (!start) return 'Not started';

  const end = getTimeValue(endedAt) || now;
  const totalSeconds = Math.max(0, Math.floor((end - start) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }

  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
};

const getActionButtonLabel = (ticket) =>
  getTicketWorkStartedAt(ticket) ? 'Update Ticket' : 'Take Action';

/* =========================
   SIDEBAR
========================= */

function Sidebar({ active, onNav, onLogout, open, canCreateUsers }) {
  const items = [
    { key: 'dashboard', label: 'Dashboard', Icon: Icon.Dashboard },
    { key: 'tickets', label: 'All Tickets', Icon: Icon.Tickets },
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
      <div className="stat-icon">{typeof icon === 'string' ? icon : <MonoIcon icon={icon} />}</div>
      <span className="stat-label">{label}</span>
      <p className="stat-value">{value}</p>
      <span className="stat-meta">{meta}</span>
    </article>
  );
}

function TicketBadges({ ticket }) {
  return (
    <div className="ticket-badges admin-inline-badges">
      <span className={`status ${slugify(ticket.status)}`}>{ticket.status}</span>
      <span className={`priority ${slugify(ticket.sla)}`}>{ticket.sla}</span>
      {(ticket.saarRequired || ticket.saarAttachment?.name) && <span className="status saar">SAAR</span>}
    </div>
  );
}

function TicketWorkTimer({ ticket, now, compact = false }) {
  const startedAt = getTicketWorkStartedAt(ticket);
  const endedAt = getTicketWorkEndedAt(ticket);

  if (!startedAt) return null;

  const isRunning = ticket.status === 'In Progress' && !endedAt;

  return (
    <div className={`ticket-work-timer${compact ? ' compact' : ''}${isRunning ? ' running' : ' ended'}`}>
      <span><MonoIcon icon={Clock3} />{isRunning ? 'Work timer' : 'Work completed'}</span>
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
  onDeleteTicket,
  canDelete = false,
  compact = false,
  now,
  pagination = null,
}) {
  const visibleTickets = pagination ? pagination.tickets : tickets;

  return (
    <div className={`admin-ticket-queue${compact ? ' compact' : ''}`}>
      {tickets.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon"><MonoIcon icon={FileText} /></div>
          <h4>No tickets found</h4>
          <p>New employee requests will appear here once submitted.</p>
        </div>
      )}

      {tickets.length > 0 && (
        <>
          <div className="admin-ticket-queue-grid">
            {visibleTickets.map((ticket) => (
              <article key={ticket.id} className="admin-ticket-card">
                <div className="admin-ticket-card-head">
                  <div className="admin-ticket-title">
                    <span className="ticket-id">{ticket.id}</span>
                    <h4>{ticket.concernType || 'Unspecified concern'}</h4>
                    <p>{ticket.createdAt || ticket.date || 'Submitted'}</p>
                  </div>

                  <TicketBadges ticket={ticket} />
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

                  {!compact && (
                    <div>
                      <span><MonoIcon icon={Monitor} />Device / System</span>
                      <strong>{ticket.deviceName || 'Not provided'}</strong>
                      <p>{ticket.impact || 'No impact recorded'}</p>
                    </div>
                  )}

                  <div>
                    <span><MonoIcon icon={Wrench} />Technician</span>
                    <strong>{ticket.technician || 'Unassigned'}</strong>
                    <p>{ticket.lastUpdated || 'No update yet'}</p>
                  </div>
                </div>

                {!compact && (
                  <p className="admin-ticket-card-description">
                    {ticket.description || 'No description provided.'}
                  </p>
                )}

                <TicketWorkTimer ticket={ticket} now={now} compact={compact} />

                <div className="admin-ticket-card-actions">
                  <button type="button" className="ticket-action-btn" onClick={() => onOpenTicket(ticket)}>
                    <MonoIcon icon={Wrench} />
                    {getActionButtonLabel(ticket)}
                  </button>
                </div>
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

function BreakdownItems({ items, total }) {
  return (
    <div className="admin-breakdown-list">
      {items.length === 0 ? (
        <div className="empty-state small">
          <p>No data available yet.</p>
        </div>
      ) : (
        items.map((item) => {
          const percent = total ? Math.round((item.count / total) * 100) : 0;

          return (
            <div key={item.name} className="admin-breakdown-item">
              <div className="admin-breakdown-copy">
                <strong>{item.name}</strong>
                <span>{item.count} ticket{item.count === 1 ? '' : 's'}</span>
              </div>

              <div className="admin-progress-track" aria-hidden="true">
                <span className="admin-progress-fill" style={{ width: `${percent}%` }} />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function BreakdownList({ title, kicker, items, total, className = '' }) {
  return (
    <section className={`panel-card glass equal-panel ${className}`.trim()}>
      <div className="section-head">
        <div>
          <span className="section-kicker">{kicker}</span>
          <h3>{title}</h3>
        </div>
      </div>

      <BreakdownItems items={items} total={total} />
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
        <h3>{calendar.monthTotal} tickets submitted</h3>

        <div className="report-insight-list">
          <div className="report-insight-item primary">
            <span>Busiest Day</span>
            <strong>{busiestLabel}</strong>
            <em>{calendar.busiestDay.count} ticket{calendar.busiestDay.count === 1 ? '' : 's'}</em>
          </div>
          <div className="report-insight-item">
            <span>Active Days</span>
            <strong>{calendar.activeDays}</strong>
            <em>days with submissions</em>
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
                  {selectedDatePagedTickets.map((ticket) => (
                    <button
                      type="button"
                      key={ticket.id}
                      className="report-selected-ticket"
                      onClick={() => onOpenTicket(ticket)}
                    >
                      <span>{ticket.id}</span>
                      <strong>{ticket.concernType || ticket.supportCategory || 'Ticket concern'}</strong>
                      <em>{ticket.status} / {ticket.sla}</em>
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
              <p className="report-selected-empty">No tickets were submitted on this date.</p>
            )
          ) : (
            <p className="report-selected-empty">Choose a calendar date to backtrack submitted tickets.</p>
          )}
        </div>
      </aside>
    </section>
  );
}

/* =========================
   DASHBOARD VIEW
========================= */

function DashboardView({ tickets, summary, categorySummary, onGoTo, onOpenTicket, onDeleteTicket, canDeleteTickets, now }) {
  const pageSize = 1;
  const [ticketPage, setTicketPage] = useState(1);
  const urgentTickets = tickets
    .filter((ticket) => ['High', 'Critical'].includes(ticket.sla) && isUnresolved(ticket.status))
    .sort((a, b) => getSlaRank(a.sla) - getSlaRank(b.sla) || normalizeDate(b) - normalizeDate(a))
    .slice(0, 5);
  const totalPages = Math.max(1, Math.ceil(tickets.length / pageSize));
  const currentPage = Math.min(ticketPage, totalPages);
  const pagedTickets = tickets.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const goToTicketPage = (page) => setTicketPage(Math.min(Math.max(page, 1), totalPages));

  useEffect(() => {
    if (ticketPage > totalPages) {
      setTicketPage(totalPages);
    }
  }, [ticketPage, totalPages]);

  return (
    <div className="dashboard-view">
      <section className="panel-card glass hero-panel admin-hero-panel">
        <div className="hero-copy">
          <span className="section-kicker">IT Helpdesk Admin Console</span>
          <h2>Receive, assign, update, and resolve employee support concerns.</h2>
          <p>
            Monitor incoming employee requests, prioritize urgent concerns, assign ICT staff,
            and record actions taken from one admin workspace.
          </p>
        </div>

        <img className="admin-hero-logo" src="/Logos/Logo.png" alt="MEMPCO logo" />

        <div className="hero-meta">
          <span className="meta-pill">{summary.active} Active Tickets</span>
          <span className="meta-pill">{summary.critical} High/Critical</span>
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
              tickets={tickets}
              onOpenTicket={onOpenTicket}
              onDeleteTicket={onDeleteTicket}
              canDelete={canDeleteTickets}
              now={now}
              pagination={{
                tickets: pagedTickets,
                page: currentPage,
                totalPages,
                totalItems: tickets.length,
                pageSize,
                onPageChange: goToTicketPage,
              }}
            />
          </section>

          <BreakdownList
            title="Support Category Load"
            kicker="Workload"
            items={categorySummary.slice(0, 8)}
            total={tickets.length}
            className="admin-workload-panel"
          />
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
                  <article key={ticket.id} className="admin-watch-card">
                    <div>
                      <span className="ticket-id">{ticket.id}</span>
                      <h4>{ticket.concernType}</h4>
                      <p>{ticket.branch} · {ticket.requester || ticket.ownerEmail}</p>
                    </div>

                    <TicketBadges ticket={ticket} />
                    <TicketWorkTimer ticket={ticket} now={now} compact />

                    <button type="button" className="ticket-action-btn" onClick={() => onOpenTicket(ticket)}>
                      {getActionButtonLabel(ticket)}
                    </button>
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

function TicketsView({ tickets, filteredTickets, filters, setFilters, onOpenTicket, onDeleteTicket, canDeleteTickets, now }) {
  const pageSize = 3;
  const [ticketPage, setTicketPage] = useState(1);
  const clearFilters = () => setFilters({ search: '', status: 'All', branch: 'All', category: 'All', sla: 'All' });
  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / pageSize));
  const currentPage = Math.min(ticketPage, totalPages);
  const pagedTickets = filteredTickets.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const goToTicketPage = (page) => setTicketPage(Math.min(Math.max(page, 1), totalPages));

  useEffect(() => {
    setTicketPage(1);
  }, [filters.search, filters.status, filters.branch, filters.category, filters.sla]);

  useEffect(() => {
    if (ticketPage > totalPages) {
      setTicketPage(totalPages);
    }
  }, [ticketPage, totalPages]);

  return (
    <div className="helpdesk-view">
      <section className="panel-card glass helpdesk-banner">
        <div className="helpdesk-banner-copy">
          <span className="section-kicker">All Tickets</span>
          <h2>Admin ticket queue and action center.</h2>
          <p>
            Review employee concerns, update status, assign technicians, add remarks,
            and record final resolution.
          </p>
        </div>

        <div className="helpdesk-banner-actions">
          <span className="helpdesk-badge">{tickets.length} Total</span>
          <span className="helpdesk-badge">{filteredTickets.length} Showing</span>
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
              placeholder="Search ID, requester, branch, support, concern, device, status..."
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
              {TICKET_STATUSES.map((status) => (
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
              {SUPPORT_CATEGORIES.map((category) => (
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
          onDeleteTicket={onDeleteTicket}
          canDelete={canDeleteTickets}
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
   BRANCHES VIEW
========================= */

function BranchesView({ branchSummary, tickets, onOpenTicket, onDeleteTicket, canDeleteTickets, now }) {
  const activeTickets = tickets.filter((ticket) => isUnresolved(ticket.status));

  return (
    <div className="dashboard-view">
      <section className="panel-card glass hero-panel">
        <div className="hero-copy">
          <span className="section-kicker">Branch Monitor</span>
          <h2>Track submitted concerns by branch and location.</h2>
          <p>Identify branches with high unresolved requests and respond to operational concerns quickly.</p>
        </div>
      </section>

      <section className="admin-branch-grid">
        {branchSummary.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><MonoIcon icon={Building2} /></div>
            <h4>No branch requests yet</h4>
            <p>Submitted employee tickets will generate branch monitoring data.</p>
          </div>
        ) : (
          branchSummary.map((branch) => {
            const branchTickets = tickets.filter((ticket) => ticket.branch === branch.name);
            const unresolved = branchTickets.filter((ticket) => isUnresolved(ticket.status)).length;
            const urgent = branchTickets.filter(
              (ticket) => ['High', 'Critical'].includes(ticket.sla) && isUnresolved(ticket.status)
            ).length;

            return (
              <article key={branch.name} className="stat-card glass admin-branch-card">
                <span className="section-kicker">Branch</span>
                <h3>{branch.name}</h3>
                <div className="admin-branch-stats">
                  <span>{branch.count} total</span>
                  <strong>{unresolved} active</strong>
                  <em>{urgent} urgent</em>
                </div>
              </article>
            );
          })
        )}
      </section>

      <section className="panel-card glass">
        <div className="section-head">
          <div>
            <span className="section-kicker">Active Branch Requests</span>
            <h3>Unresolved Tickets</h3>
          </div>
        </div>

        <TicketTable
          tickets={activeTickets}
          onOpenTicket={onOpenTicket}
          onDeleteTicket={onDeleteTicket}
          canDelete={canDeleteTickets}
          compact
          now={now}
        />
      </section>
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
  const concernSummary = breakdown(tickets, 'concernType').slice(0, 10);
  const slaSummary = breakdown(tickets, 'sla', SLA_LEVELS);
  const dateSummaries = {
    day: buildDateBreakdown(tickets, 'day').slice(0, 8),
    week: buildDateBreakdown(tickets, 'week').slice(0, 8),
    month: buildDateBreakdown(tickets, 'month').slice(0, 8),
  };
  const selectedPeriod = REPORT_PERIOD_OPTIONS.find((option) => option.key === periodMode) || REPORT_PERIOD_OPTIONS[0];
  const selectedDateSummary = dateSummaries[selectedPeriod.key] || [];
  const activeCalendarMonth = calendarMonth || getTicketCalendarMonth(tickets);
  const selectedDateTickets = selectedCalendarDate
    ? tickets
        .filter((ticket) => {
          const submittedTime = getSubmittedTime(ticket);
          return submittedTime && getDateKey(new Date(submittedTime)) === selectedCalendarDate;
        })
        .sort((a, b) => normalizeDate(b) - normalizeDate(a))
    : [];
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

    printReportSummary({
      mode: selectedPeriod.key,
      title: selectedPeriod.title,
      items: buildDateBreakdown(tickets, selectedPeriod.key),
      total: tickets.length,
    });
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
            <button type="button" className="report-print-btn" onClick={handlePrintPeriod}>
              <MonoIcon icon={Printer} />
              {selectedPeriod.key === 'month' ? 'Print Consolidated' : `Print ${selectedPeriod.label}`}
            </button>

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

        <BreakdownItems items={selectedDateSummary} total={tickets.length} />
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
        <BreakdownList title="Status" kicker="Report" items={statusSummary} total={tickets.length} />
        <BreakdownList title="SLA" kicker="Report" items={slaSummary} total={tickets.length} />
        <BreakdownList title="Support Category" kicker="Report" items={categorySummary.slice(0, 6)} total={tickets.length} />
        <BreakdownList title="Branch" kicker="Report" items={branchSummary.slice(0, 6)} total={tickets.length} />
        <BreakdownList title="Concern Type" kicker="Report" items={concernSummary.slice(0, 6)} total={tickets.length} />
      </div>
    </div>
  );
}

/* =========================
   USERS VIEW
========================= */

function UsersView({ users, canManageUsers, currentUserId, onUsersChanged }) {
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  useBodyScrollLock(Boolean(editingUser));

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
      await updatePortalUser(editForm);
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

  return (
    <div className="dashboard-view">
      <section className="panel-card glass hero-panel">
        <div className="hero-copy">
          <span className="section-kicker">Users</span>
          <h2>Registered portal accounts.</h2>
          <p>Review employee and admin accounts currently available in the portal.</p>
        </div>

        <div className="hero-meta">
          <span className="meta-pill">{users.length} Accounts</span>
        </div>
      </section>

      <section className="panel-card glass">
        {message.text && (
          <div className={`admin-alert users-alert ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="admin-table-wrap users-table-wrap">
          <table className="admin-ticket-table users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Email</th>
                <th>ID</th>
                <th>Department</th>
                <th>Branch</th>
                <th>Status</th>
                {canManageUsers && <th>Actions</th>}
              </tr>
            </thead>

            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="admin-table-main">
                      <strong>{user.name}</strong>
                      <span>{user.createdAt || 'Registered'}</span>
                    </div>
                  </td>
                  <td>{user.role}</td>
                  <td>{user.email}</td>
                  <td>{user.employeeId}</td>
                  <td>{user.department}</td>
                  <td>{user.branch || user.office}</td>
                  <td>
                    <span className={`status ${(user.status || 'Active').toLowerCase()}`}>
                      {user.status || 'Active'}
                    </span>
                  </td>
                  {canManageUsers && (
                    <td>
                      <div className="user-action-group">
                        <button
                          type="button"
                          className="user-action-btn"
                          onClick={() => beginEdit(user)}
                          disabled={isSubmitting}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="user-action-btn danger"
                          onClick={() => handleDelete(user)}
                          disabled={isSubmitting || user.id === currentUserId}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon"><MonoIcon icon={UserRound} /></div>
              <h4>No users found</h4>
              <p>Registered accounts will appear here.</p>
            </div>
          )}
        </div>
      </section>

      {editingUser && editForm && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Edit user account">
          <form className="modal-box glass admin-modal-box user-edit-modal" onSubmit={handleEditSubmit}>
            <div className="admin-modal-head">
              <div>
                <span className="section-kicker">Edit User</span>
                <h3>{editingUser.name}</h3>
                <p>Update profile details, role, status, or set a new password.</p>
              </div>

              <button type="button" className="admin-modal-close" onClick={closeEdit} aria-label="Close modal">
                x
              </button>
            </div>

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
                  <option value="employee">Employee</option>
                  <option value="admin">ICT Admin</option>
                  <option value="marketing_admin">Marketing Admin</option>
                  <option value="hr_admin">HR Admin</option>
                  <option value="superadmin">Super Admin</option>
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
                  >
                    <MonoIcon icon={showEditPassword ? EyeOff : Eye} />
                    {showEditPassword ? 'Hide' : 'Show'}
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
                  >
                    <MonoIcon icon={showEditPassword ? EyeOff : Eye} />
                    {showEditPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="ticket-form-group edit-status-field">
                <label htmlFor="edit-status">Status</label>
                <select
                  id="edit-status"
                  className="ticket-field ticket-select"
                  value={editForm.status}
                  onChange={(e) => updateEditForm('status', e.target.value)}
                  required
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="modal-footer">
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

function CreateUserView({ onCreated }) {
  const [form, setForm] = useState(emptyCreateUserForm);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      if (!/^\d{3}$/.test(form.employeeId)) {
        throw new Error('Employee ID must be the last three digits only.');
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
              <label htmlFor="create-password">Password</label>
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
                >
                  <MonoIcon icon={showCreatePassword ? EyeOff : Eye} />
                  {showCreatePassword ? 'Hide' : 'Show'}
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
                >
                  <MonoIcon icon={showCreatePassword ? EyeOff : Eye} />
                  {showCreatePassword ? 'Hide' : 'Show'}
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
                <option value="employee">Employee</option>
                <option value="admin">ICT Admin</option>
                <option value="marketing_admin">Marketing Admin</option>
                <option value="hr_admin">HR Admin</option>
                <option value="superadmin">Super Admin</option>
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

function TicketActionModal({ ticket, currentUser, onClose, onSave, onDelete, canDelete, now }) {
  useBodyScrollLock(true);

  const hasWorkStarted = Boolean(getTicketWorkStartedAt(ticket));
  const isResolvedLocked = ticket.status === 'Resolved';
  const isStartMode = !hasWorkStarted && !isResolvedLocked;
  const statusOptions = isStartMode
    ? ['In Progress']
    : TICKET_STATUSES.filter((status) => status !== 'Created');
  const [formError, setFormError] = useState('');

  const currentStaffName = currentUser?.name || 'Unassigned';
  const assignedStaff = ticket.technician && ticket.technician !== 'Unassigned'
    ? ticket.technician
    : currentStaffName;
  const [draft, setDraft] = useState({
    status: isStartMode ? 'In Progress' : ticket.status || 'Pending',
    sla: ticket.sla || 'Low',
    technician: assignedStaff,
    actionTaken: ticket.actionTaken || '',
    adminRemarks: ticket.adminRemarks || '',
    resolution: ticket.resolution || '',
  });
  const isEscalationStatus = draft.status === 'Escalated';
  const staffOptions = Array.from(
    new Set([currentStaffName, assignedStaff, ...TECHNICIANS].filter((name) => name && name !== 'Unassigned'))
  );
  const technicianOptions = isEscalationStatus
    ? [...staffOptions, ...ESCALATION_PARTNERS]
    : staffOptions;
  const visibleTechnician = technicianOptions.includes(draft.technician) ? draft.technician : 'Unassigned';
  const canEditOutcomeFields = !isResolvedLocked && draft.status !== 'In Progress';
  const lockedOutcomePlaceholder = 'Available once the ticket is updated away from In Progress.';

  const updateDraft = (field, value) => {
    setFormError('');
    setDraft((prev) => {
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

  const handleSubmit = (e) => {
    e.preventDefault();

    if (isResolvedLocked) {
      setFormError('Resolved tickets are locked and cannot be changed.');
      return;
    }

    if (isStartMode && draft.status !== 'In Progress') {
      setFormError('Start the ticket by setting the status to In Progress first.');
      return;
    }

    const outcomeLocked = draft.status === 'In Progress';
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

    onSave(ticket.id, {
      ...sanitizedDraft,
      technician: sanitizedDraft.technician || currentStaffName,
      adminUpdatedAt: new Date().toLocaleString(),
      lastUpdated: new Date().toLocaleString(),
    });
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Ticket action modal">
      <form className="modal-box glass admin-modal-box ticket-action-modal" onSubmit={handleSubmit}>
        <div className="admin-modal-head ticket-action-head">
          <div>
            <span className="ticket-id">{ticket.id}</span>
            <h3>{ticket.concernType}</h3>
            <p>{ticket.branch} · {ticket.department}</p>
          </div>

          <button type="button" className="admin-modal-close" onClick={onClose} aria-label="Close modal">
            ×
          </button>
        </div>

        <div className="admin-workflow-box ticket-action-status-panel">
          <div>
            <span className="section-kicker">{isResolvedLocked ? 'Locked Ticket' : isStartMode ? 'Start Work' : 'Ticket Timer'}</span>
            <h4>
              {isResolvedLocked
                ? 'This ticket has been resolved.'
                : isStartMode
                  ? 'Set this ticket to In Progress first.'
                  : 'Work session is being tracked.'}
            </h4>
            <p>
              {isResolvedLocked
                ? 'Resolved tickets are read-only. Changes and deletion are disabled to preserve the final record.'
                : isStartMode
                  ? 'Saving as In Progress starts the work timer and changes this action to Update Ticket.'
                  : 'The timer ends when this ticket is saved with a status other than In Progress.'}
            </p>
          </div>
          <TicketWorkTimer ticket={ticket} now={now} compact={!getTicketWorkStartedAt(ticket)} />
        </div>

        <div className="admin-modal-grid ticket-action-info-grid">
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

        {ticket.saarAttachment?.dataUrl && (
          <div className="admin-attachment-box">
            <div>
              <strong>SAAR PDF Attachment</strong>
              <p>{ticket.saarAttachment.name} · {ticket.saarAttachment.sizeLabel || 'PDF file'}</p>
            </div>
            <a href={ticket.saarAttachment.dataUrl} target="_blank" rel="noopener noreferrer">
              Open PDF
            </a>
          </div>
        )}

        <div className="admin-description-box ticket-action-description">
          <span>Description of Problem</span>
          <p>{ticket.description}</p>
        </div>

        <div className="ticket-form-grid ticket-action-update-grid">
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

          <div className="ticket-form-group full">
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

          <div className="ticket-form-group full">
            <label>Action Taken</label>
            <textarea
              className="ticket-field ticket-textarea admin-small-textarea"
              value={draft.actionTaken}
              onChange={(e) => updateDraft('actionTaken', e.target.value)}
              placeholder={canEditOutcomeFields ? 'Write the action taken by ICT/admin...' : lockedOutcomePlaceholder}
              readOnly={!canEditOutcomeFields}
            />
          </div>

          <div className="ticket-form-group full">
            <label>Admin Remarks</label>
            <textarea
              className="ticket-field ticket-textarea admin-small-textarea"
              value={draft.adminRemarks}
              onChange={(e) => updateDraft('adminRemarks', e.target.value)}
              placeholder={canEditOutcomeFields ? 'Write internal remarks or follow-up notes...' : lockedOutcomePlaceholder}
              readOnly={!canEditOutcomeFields}
            />
          </div>

          <div className="ticket-form-group full">
            <label>Resolution Notes</label>
            <textarea
              className="ticket-field ticket-textarea admin-small-textarea"
              value={draft.resolution}
              onChange={(e) => updateDraft('resolution', e.target.value)}
              placeholder={canEditOutcomeFields ? 'Write final resolution once completed...' : lockedOutcomePlaceholder}
              readOnly={!canEditOutcomeFields}
            />
          </div>
        </div>

        {formError && <div className="form-error">{formError}</div>}

        <div className="modal-footer">
          {canDelete && (
            <button type="button" className="modal-btn danger" onClick={() => onDelete(ticket)}>
              <MonoIcon icon={Trash2} />
              Delete
            </button>
          )}

          {isResolvedLocked && (
            <button type="button" className="modal-btn print" onClick={() => printResolvedTicket(ticket)}>
              <MonoIcon icon={Printer} />
              Print Ticket
            </button>
          )}

          <button type="button" className="modal-btn cancel" onClick={onClose}>
            Cancel
          </button>
          {!isResolvedLocked && (
            <button type="submit" className="modal-btn confirm">
              <MonoIcon icon={ShieldCheck} />
              {isStartMode ? 'Start Ticket' : 'Save Ticket Update'}
            </button>
          )}
        </div>
      </form>
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
  const [authChecked, setAuthChecked] = useState(false);
  const [isInactiveBlocked, setIsInactiveBlocked] = useState(false);
  const [lastSynced, setLastSynced] = useState('');
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);
  const [transitionLabel, setTransitionLabel] = useState(adminTransitionLabels.dashboard);
  const [timerNow, setTimerNow] = useState(Date.now());
  const [filters, setFilters] = useState({
    search: '',
    status: 'All',
    branch: 'All',
    category: 'All',
    sla: 'All',
  });

  const loadData = async () => {
    const nextTickets = sortTickets(await getTickets());
    let nextUsers = [];

    try {
      nextUsers = await listPortalUsers();
    } catch {
      nextUsers = [];
    }

    setTickets(nextTickets);
    setUsers(nextUsers);
    setLastSynced(new Date().toLocaleTimeString());

    setSelectedTicket((current) => {
      if (!current) return null;
      return nextTickets.find((ticket) => ticket.id === current.id) || null;
    });
  };

  useEffect(() => {
    let cancelled = false;

    const verifySession = async () => {
      try {
        const activeUser = await getCurrentPortalUser();

        if (cancelled) return;

        if (!activeUser || !isAdminRole(activeUser.role)) {
          await signOutPortal().catch(() => {});
          router.replace(LOGIN_ROUTE);
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

        setAdmin(activeUser);
        await loadData();

        if (!cancelled) {
          setAuthChecked(true);
        }
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
    if (!authChecked) return undefined;

    const syncData = () => {
      void loadData();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncData();
      }
    };

    window.addEventListener('storage', syncData);
    window.addEventListener('focus', syncData);
    document.addEventListener('visibilitychange', handleVisibility);

    const intervalId = window.setInterval(syncData, 2500);

    return () => {
      window.removeEventListener('storage', syncData);
      window.removeEventListener('focus', syncData);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.clearInterval(intervalId);
    };
  }, [authChecked]);

  useEffect(() => {
    if (!isPageTransitioning) return undefined;

    const timer = window.setTimeout(() => {
      setIsPageTransitioning(false);
    }, TRANSITION_DURATION);

    return () => window.clearTimeout(timer);
  }, [isPageTransitioning, transitionLabel]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTimerNow(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const summary = useMemo(() => buildSummary(tickets), [tickets]);

  const filteredTickets = useMemo(() => {
    const search = filters.search.toLowerCase().trim();

    return sortTickets(tickets)
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
  }, [tickets, filters]);

  const categorySummary = useMemo(() => breakdown(tickets, 'supportCategory', SUPPORT_CATEGORIES), [tickets]);
  const statusSummary = useMemo(() => breakdown(tickets, 'status', TICKET_STATUSES), [tickets]);
  const branchSummary = useMemo(() => breakdown(tickets, 'branch', BRANCHES), [tickets]);
  const isSuperAdmin = admin?.role === 'superadmin';
  const canCreateUsers = isSuperAdmin;
  const canDeleteTickets = isSuperAdmin;

  const goTo = (section) => {
    if (section !== activeSection) {
      setTransitionLabel(adminTransitionLabels[section] || adminTransitionLabels.dashboard);
      setIsPageTransitioning(true);
    }

    setActiveSection(section);
    setSidebarOpen(false);
    void loadData();
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
          `Ticket ${ticket.id} is already being worked on by ${lockedTicket.lockedByName || 'another IT staff'}.`
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

    if (currentTicket?.status === 'Resolved') {
      window.alert(`Ticket ${ticketId} is resolved and cannot be changed.`);
      setSelectedTicket(null);
      void loadData();
      return;
    }

    const timestamp = updates.adminUpdatedAt || new Date().toLocaleString();
    const nextUpdates = { ...updates, adminUpdatedAt: timestamp };
    const currentStaffName = admin?.name || 'Unassigned';

    if (!nextUpdates.technician || nextUpdates.technician === 'Unassigned') {
      nextUpdates.technician = currentStaffName;
    }

    if (updates.status === 'In Progress') {
      if (!currentTicket?.workStartedAt || currentTicket?.workEndedAt) {
        nextUpdates.workStartedAt = timestamp;
      }

      nextUpdates.workEndedAt = '';
    } else if (currentTicket?.workStartedAt && !currentTicket?.workEndedAt) {
      nextUpdates.workEndedAt = timestamp;
    }

    try {
      await updateTicket(ticketId, {
        ...nextUpdates,
        lockedBy: null,
        lockedByName: null,
        lockedAt: null,
        lockExpiresAt: null,
      });
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
      `Emergency delete ticket ${ticket.id}? This is restricted to super admin and cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await deleteTicket(ticket.id);
      setSelectedTicket(null);
      await loadData();
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
              <p>Backend support console for receiving and resolving employee concerns.</p>
            </div>

            <div className="portal-topbar-actions">
              <span className="portal-status-pill">
                <span className="dot" />
                Admin Console
              </span>

              <span className="portal-status-pill alert">
                <span className="dot" />
                {summary.active} Active
              </span>

              <span className="portal-status-pill">
                <span className="dot" />
                Synced {lastSynced || 'now'}
              </span>

              <button className="topbar-icon-btn" type="button" aria-label="Notifications" onClick={loadData}>
                <Icon.Bell />
              </button>

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
                  onDeleteTicket={handleDeleteTicket}
                  canDeleteTickets={canDeleteTickets}
                  now={timerNow}
                />
              )}

              {activeSection === 'tickets' && (
                <TicketsView
                  tickets={tickets}
                  filteredTickets={filteredTickets}
                  filters={filters}
                  setFilters={setFilters}
                  onOpenTicket={handleOpenTicket}
                  onDeleteTicket={handleDeleteTicket}
                  canDeleteTickets={canDeleteTickets}
                  now={timerNow}
                />
              )}

              {activeSection === 'branches' && (
                <BranchesView
                  branchSummary={branchSummary}
                  tickets={tickets}
                  onOpenTicket={handleOpenTicket}
                  onDeleteTicket={handleDeleteTicket}
                  canDeleteTickets={canDeleteTickets}
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
                  onCreated={loadData}
                />
              )}
            </section>
          </div>
        </div>
      </main>

      {selectedTicket && (
        <TicketActionModal
          key={`${selectedTicket.id}-${selectedTicket.lastUpdated || selectedTicket.adminUpdatedAt || ''}`}
          ticket={selectedTicket}
          currentUser={admin}
          onClose={handleCloseTicket}
          onSave={handleSaveTicket}
          onDelete={handleDeleteTicket}
          canDelete={canDeleteTickets}
          now={timerNow}
        />
      )}

      {isPageTransitioning && <PortalTransitionLoader label={transitionLabel} />}

    </>
  );
}
