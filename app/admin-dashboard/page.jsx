'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Clock3,
  FileText,
  Monitor,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  UserRound,
  Wrench,
} from 'lucide-react';
import Navbar from '@/components/Navbar/Navbar';
import {
  BRANCHES,
  DEPARTMENTS,
  SLA_LEVELS,
  SUPPORT_CATEGORIES,
  TECHNICIANS,
  TICKET_STATUSES,
  deleteTicket,
  getTickets,
  isUnresolved,
  slugify,
  updateTicket,
} from '../portalStorage';
import {
  createPortalUser,
  deletePortalUser,
  getCurrentPortalUser,
  isAdminRole,
  listPortalUsers,
  signOutPortal,
  updatePortalUser,
} from '@/lib/auth/portalAuth';
import './admin-dashboard.css';

/* =========================
   ROUTES
========================= */

const LOGIN_ROUTE = '/LogIn';

const MonoIcon = ({ icon: IconComponent }) => (
  <IconComponent className="admin-mono-icon" aria-hidden="true" />
);

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
  email: user.email || '',
  phone: user.phone || '',
  role: user.role || 'employee',
  status: user.status || 'Active',
  password: '',
  confirmPassword: '',
});

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

function TicketTable({ tickets, onOpenTicket, onDeleteTicket, canDelete = false, compact = false }) {
  return (
    <div className={`admin-ticket-queue${compact ? ' compact' : ''}`}>
      {tickets.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">TK</div>
          <h4>No tickets found</h4>
          <p>New employee requests will appear here once submitted.</p>
        </div>
      )}

      {tickets.length > 0 && (
        <div className="admin-ticket-queue-grid">
          {tickets.map((ticket) => (
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

              <div className="admin-ticket-card-actions">
                <button type="button" className="ticket-action-btn" onClick={() => onOpenTicket(ticket)}>
                  <MonoIcon icon={Wrench} />
                  Take Action
                </button>

                {canDelete && (
                  <button
                    type="button"
                    className="ticket-action-btn danger"
                    onClick={() => onDeleteTicket(ticket)}
                  >
                    <MonoIcon icon={Trash2} />
                    Delete Ticket
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function BreakdownList({ title, kicker, items, total }) {
  return (
    <section className="panel-card glass equal-panel">
      <div className="section-head">
        <div>
          <span className="section-kicker">{kicker}</span>
          <h3>{title}</h3>
        </div>
      </div>

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
    </section>
  );
}

/* =========================
   DASHBOARD VIEW
========================= */

function DashboardView({ tickets, summary, categorySummary, onGoTo, onOpenTicket, onDeleteTicket, canDeleteTickets, onRefresh }) {
  const urgentTickets = tickets
    .filter((ticket) => ['High', 'Critical'].includes(ticket.sla) && isUnresolved(ticket.status))
    .sort((a, b) => getSlaRank(a.sla) - getSlaRank(b.sla) || normalizeDate(b) - normalizeDate(a))
    .slice(0, 5);

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

        <div className="hero-meta">
          <span className="meta-pill">{summary.active} Active Tickets</span>
          <span className="meta-pill">{summary.critical} High/Critical</span>
          <button type="button" className="quick-action-btn" onClick={onRefresh}>
            <MonoIcon icon={RefreshCw} />
            Refresh Queue
          </button>
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
            />
          </section>

          <BreakdownList title="Support Category Load" kicker="Workload" items={categorySummary.slice(0, 8)} total={tickets.length} />
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

                    <button type="button" className="ticket-action-btn" onClick={() => onOpenTicket(ticket)}>
                      Review
                    </button>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="panel-card glass equal-panel">
            <div className="section-head">
              <div>
                <span className="section-kicker">Admin Actions</span>
                <h3>Quick Controls</h3>
              </div>
            </div>

            <div className="quick-actions-grid">
              <button type="button" className="quick-action-btn primary" onClick={onRefresh}>
                <MonoIcon icon={RefreshCw} />
                Refresh Queue
              </button>
              <button type="button" className="quick-action-btn" onClick={() => onGoTo('branches')}>
                Branch Monitor
              </button>
              <button type="button" className="quick-action-btn" onClick={() => onGoTo('reports')}>
                View Reports
              </button>
              <button type="button" className="quick-action-btn" onClick={() => onGoTo('users')}>
                Users
              </button>
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

function TicketsView({ tickets, filteredTickets, filters, setFilters, onOpenTicket, onDeleteTicket, canDeleteTickets, onRefresh }) {
  const clearFilters = () => setFilters({ search: '', status: 'All', branch: 'All', category: 'All', sla: 'All' });

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
          <button type="button" className="quick-action-btn primary" onClick={onRefresh}>
            <MonoIcon icon={RefreshCw} />
            Refresh Queue
          </button>
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
        />
      </section>
    </div>
  );
}

/* =========================
   BRANCHES VIEW
========================= */

function BranchesView({ branchSummary, tickets, onOpenTicket, onDeleteTicket, canDeleteTickets }) {
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
            <div className="empty-icon">BR</div>
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
        />
      </section>
    </div>
  );
}

/* =========================
   REPORTS VIEW
========================= */

function ReportsView({ tickets, summary, categorySummary, statusSummary, branchSummary }) {
  const concernSummary = breakdown(tickets, 'concernType').slice(0, 10);
  const slaSummary = breakdown(tickets, 'sla', SLA_LEVELS);

  return (
    <div className="dashboard-view">
      <section className="panel-card glass hero-panel">
        <div className="hero-copy">
          <span className="section-kicker">Reports</span>
          <h2>Support tracking summary.</h2>
          <p>Summarize workload by ticket status, SLA, branch, support category, and concern type.</p>
        </div>

        <div className="hero-meta">
          <span className="meta-pill">{summary.resolved} Resolved</span>
          <span className="meta-pill">{summary.active} Active</span>
          <span className="meta-pill">{summary.saar} SAAR Tickets</span>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard icon={ShieldCheck} label="Resolved" value={summary.resolved} meta="Completed tickets" />
        <StatCard icon={Clock3} label="Pending" value={summary.pending} meta="Awaiting action" />
        <StatCard icon={Wrench} label="In Progress" value={summary.inProgress} meta="Currently handled" />
        <StatCard icon={FileText} label="High / Critical" value={summary.critical} meta="Urgent active tickets" />
      </section>

      <div className="admin-report-grid">
        <BreakdownList title="By Status" kicker="Report" items={statusSummary} total={tickets.length} />
        <BreakdownList title="By SLA" kicker="Report" items={slaSummary} total={tickets.length} />
        <BreakdownList title="By Support Category" kicker="Report" items={categorySummary} total={tickets.length} />
        <BreakdownList title="By Branch" kicker="Report" items={branchSummary} total={tickets.length} />
        <BreakdownList title="Top Concern Types" kicker="Report" items={concernSummary} total={tickets.length} />
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
  useBodyScrollLock(Boolean(editingUser));

  const beginEdit = (user) => {
    setEditingUser(user);
    setEditForm(toUserEditForm(user));
    setMessage({ type: '', text: '' });
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

        <div className="admin-table-wrap">
          <table className="admin-ticket-table users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Email</th>
                <th>Employee ID</th>
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
              <div className="empty-icon">US</div>
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
                <input
                  id="edit-department"
                  className="ticket-field ticket-input"
                  type="text"
                  required
                  value={editForm.department}
                  onChange={(e) => updateEditForm('department', e.target.value)}
                />
              </div>

              <div className="ticket-form-group">
                <label htmlFor="edit-branch">Branch / Office</label>
                <input
                  id="edit-branch"
                  className="ticket-field ticket-input"
                  type="text"
                  required
                  value={editForm.branch}
                  onChange={(e) => updateEditForm('branch', e.target.value)}
                />
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
                  type="text"
                  required
                  value={editForm.phone}
                  onChange={(e) => updateEditForm('phone', e.target.value)}
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
                  <option value="admin">Admin</option>
                  <option value="superadmin">Super Admin</option>
                </select>
              </div>

              <div className="ticket-form-group">
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

              <div className="ticket-form-group">
                <label htmlFor="edit-password">New Password</label>
                <input
                  id="edit-password"
                  className="ticket-field ticket-input"
                  type="password"
                  minLength={8}
                  value={editForm.password}
                  onChange={(e) => updateEditForm('password', e.target.value)}
                  placeholder="Optional"
                />
              </div>

              <div className="ticket-form-group">
                <label htmlFor="edit-confirm-password">Confirm Password</label>
                <input
                  id="edit-confirm-password"
                  className="ticket-field ticket-input"
                  type="password"
                  minLength={8}
                  value={editForm.confirmPassword}
                  onChange={(e) => updateEditForm('confirmPassword', e.target.value)}
                  placeholder="Optional"
                />
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

function CreateUserView({ onCreated, onGoToUsers }) {
  const [form, setForm] = useState(emptyCreateUserForm);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

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
                type="text"
                required
                value={form.phone}
                onChange={(e) => updateForm('phone', e.target.value)}
                placeholder="Enter phone number"
              />
            </div>

            <div className="ticket-form-group">
              <label htmlFor="create-password">Temporary Password</label>
              <input
                id="create-password"
                className="ticket-field ticket-input"
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => updateForm('password', e.target.value)}
                placeholder="Create password"
              />
            </div>

            <div className="ticket-form-group">
              <label htmlFor="create-confirm-password">Confirm Password</label>
              <input
                id="create-confirm-password"
                className="ticket-field ticket-input"
                type="password"
                required
                minLength={8}
                value={form.confirmPassword}
                onChange={(e) => updateForm('confirmPassword', e.target.value)}
                placeholder="Confirm password"
              />
            </div>

            <div className="ticket-form-group full portal-role-field">
              <label htmlFor="create-role">Portal Role</label>
              <select
                id="create-role"
                className="ticket-field ticket-select"
                value={form.role}
                onChange={(e) => updateForm('role', e.target.value)}
                required
              >
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Super Admin</option>
              </select>
            </div>
          </div>

          <div className="admin-form-actions">
            <button
              type="button"
              className="modal-btn cancel"
              onClick={onGoToUsers}
              disabled={isSubmitting}
            >
              View Users
            </button>

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

function TicketActionModal({ ticket, onClose, onSave, onDelete, canDelete }) {
  useBodyScrollLock(true);

  const [draft, setDraft] = useState({
    status: ticket.status || 'Pending',
    sla: ticket.sla || 'Low',
    technician: ticket.technician || 'Unassigned',
    actionTaken: ticket.actionTaken || '',
    adminRemarks: ticket.adminRemarks || '',
    resolution: ticket.resolution || '',
  });

  const updateDraft = (field, value) => setDraft((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();

    onSave(ticket.id, {
      ...draft,
      adminUpdatedAt: new Date().toLocaleString(),
      lastUpdated: new Date().toLocaleString(),
    });
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Ticket action modal">
      <form className="modal-box glass admin-modal-box" onSubmit={handleSubmit}>
        <div className="admin-modal-head">
          <div>
            <span className="ticket-id">{ticket.id}</span>
            <h3>{ticket.concernType}</h3>
            <p>{ticket.branch} · {ticket.department}</p>
          </div>

          <button type="button" className="admin-modal-close" onClick={onClose} aria-label="Close modal">
            ×
          </button>
        </div>

        <div className="admin-modal-grid">
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

        <div className="admin-description-box">
          <span>Description of Problem</span>
          <p>{ticket.description}</p>
        </div>

        <div className="ticket-form-grid">
          <div className="ticket-form-group">
            <label>Status</label>
            <select
              className="ticket-field ticket-select"
              value={draft.status}
              onChange={(e) => updateDraft('status', e.target.value)}
              required
            >
              {TICKET_STATUSES.map((status) => (
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
            >
              {SLA_LEVELS.map((sla) => (
                <option key={sla} value={sla}>{sla}</option>
              ))}
            </select>
          </div>

          <div className="ticket-form-group full">
            <label>Assigned ICT Staff</label>
            <select
              className="ticket-field ticket-select"
              value={draft.technician}
              onChange={(e) => updateDraft('technician', e.target.value)}
              required
            >
              <option value="Unassigned">Unassigned</option>
              {TECHNICIANS.map((tech) => (
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
              placeholder="Write the action taken by ICT/admin..."
            />
          </div>

          <div className="ticket-form-group full">
            <label>Admin Remarks</label>
            <textarea
              className="ticket-field ticket-textarea admin-small-textarea"
              value={draft.adminRemarks}
              onChange={(e) => updateDraft('adminRemarks', e.target.value)}
              placeholder="Write internal remarks or follow-up notes..."
            />
          </div>

          <div className="ticket-form-group full">
            <label>Resolution Notes</label>
            <textarea
              className="ticket-field ticket-textarea admin-small-textarea"
              value={draft.resolution}
              onChange={(e) => updateDraft('resolution', e.target.value)}
              placeholder="Write final resolution once completed..."
            />
          </div>
        </div>

        <div className="modal-footer">
          {canDelete && (
            <button type="button" className="modal-btn danger" onClick={() => onDelete(ticket)}>
              <MonoIcon icon={Trash2} />
              Delete Ticket
            </button>
          )}

          <button type="button" className="modal-btn cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="modal-btn confirm">
            <MonoIcon icon={ShieldCheck} />
            Save Admin Action
          </button>
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
  const [lastSynced, setLastSynced] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    status: 'All',
    branch: 'All',
    category: 'All',
    sla: 'All',
  });

  const loadData = async () => {
    const nextTickets = sortTickets(getTickets());
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
  const canCreateUsers = admin?.role === 'superadmin';
  const canDeleteTickets = isAdminRole(admin?.role);

  const goTo = (section) => {
    setActiveSection(section);
    setSidebarOpen(false);
    void loadData();
  };

  const handleLogout = async () => {
    await signOutPortal().catch(() => {});
    router.replace(LOGIN_ROUTE);
  };

  const handleSaveTicket = (ticketId, updates) => {
    updateTicket(ticketId, updates);
    void loadData();
    setSelectedTicket(null);
  };

  const handleDeleteTicket = (ticket) => {
    if (!ticket?.id) return;

    const confirmed = window.confirm(
      `Delete ticket ${ticket.id}? This action cannot be undone.`
    );

    if (!confirmed) return;

    deleteTicket(ticket.id);
    setSelectedTicket(null);
    void loadData();
  };

  if (!authChecked || !admin) {
    return (
      <>
        <Navbar />
        <main className="portal-main portal-app-main">
          <div className="portal-shell">
            <section className="panel-card glass empty-state admin-auth-check">
              <div className="admin-auth-loader" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <h4>Checking admin access...</h4>
              <p>Please wait while your admin session is verified.</p>
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
                ☰
              </button>

              {activeSection === 'dashboard' && (
                <DashboardView
                  tickets={tickets}
                  summary={summary}
                  categorySummary={categorySummary}
                  onGoTo={goTo}
                  onOpenTicket={setSelectedTicket}
                  onDeleteTicket={handleDeleteTicket}
                  canDeleteTickets={canDeleteTickets}
                  onRefresh={loadData}
                />
              )}

              {activeSection === 'tickets' && (
                <TicketsView
                  tickets={tickets}
                  filteredTickets={filteredTickets}
                  filters={filters}
                  setFilters={setFilters}
                  onOpenTicket={setSelectedTicket}
                  onDeleteTicket={handleDeleteTicket}
                  canDeleteTickets={canDeleteTickets}
                  onRefresh={loadData}
                />
              )}

              {activeSection === 'branches' && (
                <BranchesView
                  branchSummary={branchSummary}
                  tickets={tickets}
                  onOpenTicket={setSelectedTicket}
                  onDeleteTicket={handleDeleteTicket}
                  canDeleteTickets={canDeleteTickets}
                />
              )}

              {activeSection === 'reports' && (
                <ReportsView
                  tickets={tickets}
                  summary={summary}
                  categorySummary={categorySummary}
                  statusSummary={statusSummary}
                  branchSummary={branchSummary}
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
                  onGoToUsers={() => goTo('users')}
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
          onClose={() => setSelectedTicket(null)}
          onSave={handleSaveTicket}
          onDelete={handleDeleteTicket}
          canDelete={canDeleteTickets}
        />
      )}

    </>
  );
}
