'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCurrentPortalUser } from '@/lib/auth/portalAuth';
import './Chatbot.css';

// ─────────────────────────────────────────────
// ICON SYSTEM
// ─────────────────────────────────────────────

function Icon({ children, className = '' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const ICONS = {
  services: (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1.5" />
      <rect x="14" y="4" width="6" height="6" rx="1.5" />
      <rect x="4" y="14" width="6" height="6" rx="1.5" />
      <rect x="14" y="14" width="6" height="6" rx="1.5" />
    </>
  ),
  savings: (
    <>
      <path d="M12 4v16" />
      <path d="M16.2 7.2a4.8 4.8 0 0 0-4.2-1.7c-2 0-3.6 1-3.6 2.7 0 4 7.3 1.5 7.3 5.3 0 1.8-1.7 3-3.9 3A5.8 5.8 0 0 1 7.7 15" />
    </>
  ),
  loans: (
    <>
      <rect x="3.5" y="6" width="17" height="12" rx="2.5" />
      <path d="M3.5 10h17" />
      <path d="M16.2 14h.01" />
    </>
  ),
  offices: (
    <>
      <path d="M6 20V6.5A1.5 1.5 0 0 1 7.5 5h9A1.5 1.5 0 0 1 18 6.5V20" />
      <path d="M9 9h.01M12 9h.01M15 9h.01M9 12h.01M12 12h.01M15 12h.01" />
      <path d="M10 20v-3h4v3" />
    </>
  ),
  governance: (
    <>
      <path d="M12 3l7 3v5c0 4.2-2.4 7.3-7 10-4.6-2.7-7-5.8-7-10V6z" />
      <path d="m9.5 12.2 1.6 1.6 3.7-4" />
    </>
  ),
  career: (
    <>
      <path d="M8 7V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1" />
      <rect x="4" y="7" width="16" height="12" rx="2" />
      <path d="M4 11h16" />
    </>
  ),
  portal: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2.5" />
      <path d="M9.5 4v16" />
      <path d="M9.5 10h10.5" />
    </>
  ),
  news: (
    <>
      <rect x="5" y="4" width="14" height="16" rx="2" />
      <path d="M8 8h8" />
      <path d="M8 12h8" />
      <path d="M8 16h5" />
    </>
  ),
  page: (
    <>
      <path d="M7 4h7l5 5v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
      <path d="M14 4v5h5" />
      <path d="M9 13h6" />
      <path d="M9 16h4" />
    </>
  ),
  restart: (
    <>
      <path d="M20 11a8 8 0 1 1-2.3-5.7" />
      <path d="M20 4v5h-5" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </>
  ),
  chevronRight: <path d="m9 6 6 6-6 6" />,
};

function AppIcon({ name, className = '' }) {
  return <Icon className={className}>{ICONS[name]}</Icon>;
}

// ─────────────────────────────────────────────
// DATA CONFIG — single source of truth
// ─────────────────────────────────────────────

export const SITE_MAP = {
  services: {
    label: 'All Services',
    href: '/services',
    icon: 'services',
    keywords: ['services', 'offerings', 'all services'],
    description: 'Browse all available MEMPCO services in one place.',
    related: ['savings', 'loans'],
  },
  regularSavings: {
    label: 'Regular Savings',
    href: '/services/savings/regular-savings',
    icon: 'savings',
    keywords: ['regular savings', 'savings account', 'deposit'],
    description: 'Standard savings account for MEMPCO members.',
    related: ['kkt', 'timeDeposit', 'services'],
  },
  kkt: {
    label: 'KKT',
    href: '/services/savings/kkt',
    icon: 'savings',
    keywords: ['kkt', 'kaunlaran', 'savings'],
    description: 'KKT savings product for members.',
    related: ['regularSavings', 'timeDeposit', 'services'],
  },
  timeDeposit: {
    label: 'Time Deposit',
    href: '/services/savings/time-deposit',
    icon: 'savings',
    keywords: ['time deposit', 'fixed deposit', 'term savings'],
    description: 'Earn higher interest with a fixed-term deposit.',
    related: ['regularSavings', 'kkt', 'services'],
  },
  aflatounSavings: {
    label: 'Aflatoun Savings',
    href: '/services/savings/aflatoun-savings',
    icon: 'savings',
    keywords: ['aflatoun', 'aflatoun savings', 'youth savings'],
    description: 'Financial education-linked savings product.',
    related: ['youthSavings', 'regularSavings', 'services'],
  },
  youthSavings: {
    label: 'Youth Savings',
    href: '/services/savings/youth-savings',
    icon: 'savings',
    keywords: ['youth savings', 'young savers', 'student savings'],
    description: 'Savings program designed for younger members.',
    related: ['aflatounSavings', 'regularSavings', 'services'],
  },
  businessLoan: {
    label: 'Business Loan',
    href: '/services/loans/business-loan',
    icon: 'loans',
    keywords: ['business loan', 'enterprise loan', 'group loan', 'tricycle loan'],
    description: 'Loan options for business-related purposes including Group, Individual, Back-to-Back, and EC Tricycle Loan.',
    options: ['Individual Business Loan', 'Group Business Loan', 'Back to Back Loan', 'EC Tricycle Loan'],
    related: ['providentialLoan', 'services'],
  },
  providentialLoan: {
    label: 'Providential Loan',
    href: '/services/loans/providential-loan',
    icon: 'loans',
    keywords: ['providential loan', 'salary loan', 'appliance loan', 'motorcycle loan', 'pension loan', 'education loan'],
    description: 'Personal and livelihood loan products including Salary, Motorcycle, Education, Pension, and more.',
    options: ['Appliance & Furniture Loan', 'Salary Loan', 'Motorcycle Loan', 'Honorarium Loan', 'Vehicle Loan', 'House Improvement Loan', 'Instant Loan', 'Education Loan', 'Pension Loan'],
    related: ['businessLoan', 'services'],
  },
  offices: {
    label: 'Offices',
    href: '/branches',
    icon: 'offices',
    keywords: ['offices', 'branches', 'locations', 'contact', 'directions', 'where'],
    description: 'View MEMPCO branch locations and contact information.',
    related: [],
  },
  boardOfDirectors: {
    label: 'Board of Directors',
    href: '/governance/board-of-directors',
    icon: 'governance',
    keywords: ['board', 'directors', 'board of directors', 'governance'],
    description: 'Meet the MEMPCO Board of Directors.',
    related: ['management'],
  },
  management: {
    label: 'Management',
    href: '/governance/management',
    icon: 'governance',
    keywords: ['management', 'executives', 'officers', 'governance'],
    description: "View MEMPCO's management team.",
    related: ['boardOfDirectors'],
  },
  career: {
    label: 'Career',
    href: '/jobs',
    icon: 'career',
    keywords: ['career', 'jobs', 'apply', 'hiring', 'positions', 'openings', 'employment'],
    description: 'Explore career openings and apply for positions at MEMPCO.',
    related: ['employeePortal'],
  },
  employeePortal: {
    label: 'Employee Portal',
    href: '/employee',
    icon: 'portal',
    keywords: ['employee portal', 'employee login', 'log in', 'sign in', 'staff access', 'portal'],
    description: 'Access the MEMPCO employee portal for staff sign-in and internal tools.',
    related: ['career'],
  },
  news: {
    label: 'News & Events',
    href: '/news',
    icon: 'news',
    keywords: ['news', 'events', 'announcements', 'updates', 'latest news'],
    description: 'Read the latest MEMPCO announcements, stories, and events.',
    related: [],
  },
};

// Group keys for easy lookup
export const GROUPS = {
  savings: ['regularSavings', 'kkt', 'timeDeposit', 'aflatounSavings', 'youthSavings'],
  loans: ['businessLoan', 'providentialLoan'],
  governance: ['boardOfDirectors', 'management'],
};

// Topics for browse mode
export const TOPICS = [
  { key: 'services', label: 'Services', icon: 'services', items: ['services', ...GROUPS.savings, ...GROUPS.loans] },
  { key: 'savings', label: 'Savings', icon: 'savings', items: GROUPS.savings },
  { key: 'loans', label: 'Loans', icon: 'loans', items: GROUPS.loans },
  { key: 'offices', label: 'Offices', icon: 'offices', items: ['offices'] },
  { key: 'governance', label: 'Governance', icon: 'governance', items: GROUPS.governance },
  { key: 'career', label: 'Career', icon: 'career', items: ['career', 'employeePortal'] },
  { key: 'employee', label: 'Employee Access', icon: 'portal', items: ['employeePortal', 'career'] },
  { key: 'news', label: 'News', icon: 'news', items: ['news'] },
];

// Page-to-site-map key mapping
const PATH_CONTEXT = [
  { match: (p) => p.startsWith('/services/loans/business-loan'), key: 'businessLoan', pageLabel: 'Business Loan', suggestedItems: ['businessLoan', 'providentialLoan'] },
  { match: (p) => p.startsWith('/services/loans/providential-loan'), key: 'providentialLoan', pageLabel: 'Providential Loan', suggestedItems: ['providentialLoan', 'businessLoan'] },
  { match: (p) => p.startsWith('/services/savings/regular-savings'), key: 'regularSavings', pageLabel: 'Regular Savings', suggestedItems: ['regularSavings', 'kkt', 'timeDeposit'] },
  { match: (p) => p.startsWith('/services/savings/kkt'), key: 'kkt', pageLabel: 'KKT', suggestedItems: ['kkt', 'regularSavings', 'timeDeposit'] },
  { match: (p) => p.startsWith('/services/savings/time-deposit'), key: 'timeDeposit', pageLabel: 'Time Deposit', suggestedItems: ['timeDeposit', 'regularSavings', 'kkt'] },
  { match: (p) => p.startsWith('/services/savings/aflatoun-savings'), key: 'aflatounSavings', pageLabel: 'Aflatoun Savings', suggestedItems: ['aflatounSavings', 'youthSavings'] },
  { match: (p) => p.startsWith('/services/savings/youth-savings'), key: 'youthSavings', pageLabel: 'Youth Savings', suggestedItems: ['youthSavings', 'aflatounSavings'] },
  { match: (p) => p.startsWith('/services'), key: 'services', pageLabel: 'Services', suggestedItems: ['services', ...GROUPS.savings, ...GROUPS.loans] },
  { match: (p) => p.startsWith('/governance/board-of-directors'), key: 'boardOfDirectors', pageLabel: 'Board of Directors', suggestedItems: ['boardOfDirectors', 'management'] },
  { match: (p) => p.startsWith('/governance/management'), key: 'management', pageLabel: 'Management', suggestedItems: ['management', 'boardOfDirectors'] },
  { match: (p) => p.startsWith('/governance'), key: null, pageLabel: 'Governance', suggestedItems: ['boardOfDirectors', 'management'] },
  { match: (p) => p.startsWith('/branches'), key: 'offices', pageLabel: 'Offices', suggestedItems: ['offices'] },
  { match: (p) => p.startsWith('/career'), key: 'career', pageLabel: 'Career', suggestedItems: ['career', 'employeePortal'] },
  { match: (p) => p.startsWith('/employee'), key: 'employeePortal', pageLabel: 'Employee Portal', suggestedItems: ['employeePortal', 'career'] },
  { match: (p) => p.startsWith('/news'), key: 'news', pageLabel: 'News & Events', suggestedItems: ['news'] },
  { match: (p) => p === '/', key: null, pageLabel: 'Home', suggestedItems: ['services', 'offices', 'news'] },
];

function getPageContext(pathname) {
  return PATH_CONTEXT.find((c) => c.match(pathname)) ?? { pageLabel: 'this page', suggestedItems: ['services', 'offices', 'news'] };
}

// ─────────────────────────────────────────────
// SEARCH ENGINE — fuzzy + synonym matching
// ─────────────────────────────────────────────

const SYNONYMS = {
  'how to apply': ['apply', 'application', 'submit'],
  'where can i find': ['find', 'locate', 'see', 'view', 'open'],
  'what is': ['what', 'about', 'describe'],
  'log in': ['login', 'sign in', 'signin', 'access'],
  'branch': ['office', 'location'],
  'staff': ['employee'],
  'job': ['career', 'position', 'opening', 'hiring'],
};

function normalizeSynonyms(query) {
  let normalized = query.toLowerCase();
  for (const [canonical, variants] of Object.entries(SYNONYMS)) {
    for (const variant of variants) {
      normalized = normalized.replace(new RegExp(`\\b${variant}\\b`, 'g'), canonical);
    }
  }
  return normalized;
}

function scoreMatch(query, text) {
  const q = query.trim().toLowerCase();
  const t = text.toLowerCase();
  const qNorm = normalizeSynonyms(q);
  const tNorm = normalizeSynonyms(t);

  if (t === q || tNorm === qNorm) return 100;
  if (t.startsWith(q) || tNorm.startsWith(qNorm)) return 80;
  if (t.includes(q) || tNorm.includes(qNorm)) return 60;

  // Token-level partial match
  const queryTokens = qNorm.split(/\s+/).filter(Boolean);
  const matchedTokens = queryTokens.filter((token) => tNorm.includes(token));
  if (matchedTokens.length > 0) {
    return Math.round(40 * (matchedTokens.length / queryTokens.length));
  }

  return 0;
}

function buildSearchIndex() {
  const entries = [];

  for (const [key, node] of Object.entries(SITE_MAP)) {
    const searchText = [node.label, ...node.keywords, node.description || ''].join(' ');

    entries.push({
      type: 'page',
      key,
      label: node.label,
      href: node.href,
      description: node.description,
      searchText,
    });

    if (node.options) {
      for (const option of node.options) {
        entries.push({
          type: 'option',
          key,
          label: option,
          href: node.href,
          description: `Under ${node.label}`,
          searchText: `${option} ${node.label} ${node.keywords.join(' ')}`,
        });
      }
    }
  }

  return entries;
}

const SEARCH_INDEX = buildSearchIndex();

function search(query, limit = 7) {
  if (!query || query.trim().length < 2) return [];

  const scored = SEARCH_INDEX
    .map((entry) => ({ ...entry, score: scoreMatch(query, entry.searchText) }))
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));

  // Deduplicate by href, keeping highest score
  const seen = new Set();
  const deduped = [];
  for (const entry of scored) {
    const dedupeKey = `${entry.type === 'option' ? entry.key : entry.href}`;
    if (!seen.has(dedupeKey)) {
      seen.add(dedupeKey);
      deduped.push(entry);
    }
  }

  return deduped.slice(0, limit);
}

// ─────────────────────────────────────────────
// MESSAGE BUILDERS
// ─────────────────────────────────────────────

function uid(prefix = 'msg') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildSiteNodeMessage(key, extraContext = {}) {
  const node = SITE_MAP[key];
  if (!node) return null;

  const relatedLinks = (node.related || []).slice(0, 2).map((r) => ({
    label: SITE_MAP[r]?.label,
    href: SITE_MAP[r]?.href,
  })).filter((l) => l.label);

  return {
    id: uid('bot'),
    type: 'bot',
    badge: 'Answer',
    text: node.description,
    cardTitle: node.label,
    cardDescription: node.options
      ? `Available options: ${node.options.join(', ')}.`
      : `Go to the ${node.label} page for full details.`,
    links: [{ label: node.label, href: node.href }, ...relatedLinks],
    actions: [],
    showUtilities: true,
    ...extraContext,
  };
}

function buildTopicMessage(topic) {
  const items = topic.items.slice(0, 5).map((key) => SITE_MAP[key]).filter(Boolean);
  return {
    id: uid('bot'),
    type: 'bot',
    badge: 'Topic',
    text: `Here are the main ${topic.label} pages and shortcuts.`,
    cardTitle: topic.label,
    cardDescription: `Browse ${topic.label.toLowerCase()} pages below.`,
    links: items.map((item) => ({ label: item.label, href: item.href })),
    actions: [],
    showUtilities: true,
  };
}

function buildWelcomeMessage(pathname) {
  const ctx = getPageContext(pathname);
  const isHome = pathname === '/';

  return {
    id: 'welcome',
    type: 'bot',
    badge: 'MEMPCOnnect',
    text: isHome
      ? 'Welcome to MEMPCOnnect. Choose a guided action below, or use the search bar to jump directly to any page, service, or office.'
      : `Welcome to MEMPCOnnect. You're on the ${ctx.pageLabel} page. Use the actions below or search to find what you need.`,
    goals: buildGoals(pathname),
    topics: [],
    actions: [],
    links: [],
    showUtilities: false,
  };
}

function buildPageGuideMessage(pathname) {
  const ctx = getPageContext(pathname);
  const items = ctx.suggestedItems.slice(0, 3).map((key) => SITE_MAP[key]).filter(Boolean);

  return {
    id: uid('page'),
    type: 'bot',
    badge: 'This Page',
    text: `Here are the most useful shortcuts for ${ctx.pageLabel}.`,
    cardTitle: ctx.pageLabel,
    cardDescription: 'Jump directly to the pages most relevant to where you are.',
    links: items.map((item) => ({ label: item.label, href: item.href })),
    actions: [],
    showUtilities: true,
  };
}

function buildGoals(pathname) {
  const ctx = getPageContext(pathname);

  return [
    {
      key: 'find-service',
      label: 'Find a Service',
      icon: 'services',
      buildResponse: () => ({
        badge: 'Guide',
        text: 'Choose the service category you\'re looking for.',
        topics: [
          { key: 'savings', label: 'Savings', icon: 'savings', items: GROUPS.savings },
          { key: 'loans', label: 'Loans', icon: 'loans', items: GROUPS.loans },
        ],
        links: [{ label: 'All Services', href: '/services' }],
        actions: [],
        cardTitle: 'MEMPCO Services',
        cardDescription: 'Select a category to see available products and pages.',
        showUtilities: true,
      }),
    },
    {
      key: 'this-page',
      label: 'This Page',
      icon: 'page',
      buildResponse: () => {
        const items = ctx.suggestedItems.slice(0, 4).map((key) => SITE_MAP[key]).filter(Boolean);
        return {
          badge: 'This Page',
          text: `Here are the most relevant shortcuts for ${ctx.pageLabel}.`,
          links: items.map((item) => ({ label: item.label, href: item.href })),
          topics: [],
          actions: [],
          cardTitle: ctx.pageLabel,
          cardDescription: 'Use these shortcuts to navigate faster from your current page.',
          showUtilities: true,
        };
      },
    },
    {
      key: 'contact-office',
      label: 'Office Contact',
      icon: 'offices',
      buildResponse: () => ({
        badge: 'Contact',
        text: 'Open the Offices page to view MEMPCO branch locations and contact details.',
        links: [{ label: 'Offices', href: '/branches' }],
        topics: [],
        actions: [],
        cardTitle: 'MEMPCO Offices',
        cardDescription: 'Find branch locations, phone numbers, and directions on the Offices page.',
        showUtilities: true,
      }),
    },
    {
      key: 'employee-login',
      label: 'Employee Access',
      icon: 'portal',
      buildResponse: () => ({
        badge: 'Access',
        text: 'Sign in to the Employee Portal or explore career opportunities at MEMPCO.',
        links: [
          { label: 'Employee Portal', href: '/employee' },
          { label: 'Career', href: '/jobs' },
        ],
        topics: [],
        actions: [],
        cardTitle: 'Employee & Career',
        cardDescription: 'Use the Employee Portal for staff sign-in, or visit Career for openings.',
        showUtilities: true,
      }),
    },
  ];
}

// ─────────────────────────────────────────────
// HIDE ZONE VISIBILITY LOGIC
// ─────────────────────────────────────────────

function findHideZone() {
  if (typeof document === 'undefined') return null;
  return (
    document.querySelector('[data-chatbot-hide-zone]') ||
    document.querySelector('.hero') ||
    document.querySelector('.hero-section') ||
    document.querySelector('.page-hero') ||
    document.querySelector('main > section:first-of-type') ||
    document.querySelector('section')
  );
}

function isHideZoneActive(el, navbarHeight = 74) {
  if (!el || typeof window === 'undefined') return false;
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight || document.documentElement.clientHeight;
  const visibleHeight = Math.max(0, Math.min(rect.bottom, vh) - Math.max(rect.top, navbarHeight));
  return visibleHeight > Math.min(rect.height * 0.35, vh * 0.5);
}

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────

function ChatMessage({ message, onGoalClick, onTopicClick, onLinkClick, onReset, onShowTopics, onShowHome }) {
  const isBot = message.type === 'bot';
  const isUser = message.type === 'user';

  return (
    <div className={`chatbot-message ${message.type}`} role={isBot ? 'log' : undefined}>
      <div className="chatbot-bubble">
        {message.badge && <span className="chatbot-message-badge">{message.badge}</span>}

        <p className="chatbot-text">{message.text}</p>

        {message.cardTitle && (
          <div className="chatbot-answer-card">
            <span className="chatbot-answer-card-eyebrow">Recommended</span>
            <h4>{message.cardTitle}</h4>
            {message.cardDescription && <p>{message.cardDescription}</p>}
          </div>
        )}

        {message.goals?.length > 0 && (
          <div className="chatbot-goals-grid">
            {message.goals.map((goal) => (
              <button
                key={goal.key}
                type="button"
                className="chatbot-goal-card"
                onClick={() => onGoalClick(goal)}
              >
                <span className="chatbot-goal-icon">
                  <AppIcon name={goal.icon} className="chatbot-goal-icon-svg" />
                </span>
                <span className="chatbot-goal-title">{goal.label}</span>
              </button>
            ))}
          </div>
        )}

        {message.topics?.length > 0 && (
          <div className="chatbot-topics-grid">
            {message.topics.map((topic) => (
              <button
                key={topic.key}
                type="button"
                className="chatbot-topic-card"
                onClick={() => onTopicClick(topic)}
              >
                <span className="chatbot-topic-card-main">
                  <span className="chatbot-topic-icon">
                    <AppIcon name={topic.icon} className="chatbot-topic-icon-svg" />
                  </span>
                  <span className="chatbot-topic-title">{topic.label}</span>
                </span>
                <span className="chatbot-topic-arrow">
                  <AppIcon name="chevronRight" className="chatbot-topic-arrow-svg" />
                </span>
              </button>
            ))}
          </div>
        )}

        {message.links?.length > 0 && (
          <div className="chatbot-link-section">
            <div className="chatbot-section-label">Open page</div>
            <div className="chatbot-link-list">
              {message.links.map((link, i) => (
                <Link
                  key={`${link.href}-${i}`}
                  href={link.href}
                  className={`chatbot-link-pill ${i === 0 ? 'is-primary' : 'is-secondary'}`}
                  onClick={onLinkClick}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        {isBot && message.showUtilities && (
          <div className="chatbot-inline-tools" role="group" aria-label="Navigation shortcuts">
            <button type="button" className="chatbot-inline-tool" onClick={onShowHome}>
              Guided actions
            </button>
            <span className="chatbot-inline-tool-divider" aria-hidden="true">·</span>
            <button type="button" className="chatbot-inline-tool" onClick={onShowTopics}>
              Browse topics
            </button>
            <span className="chatbot-inline-tool-divider" aria-hidden="true">·</span>
            <button type="button" className="chatbot-inline-tool" onClick={onReset}>
              Start over
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SearchResults({ results, onSelect }) {
  if (!results.length) {
    return (
      <div className="chatbot-search-results">
        <div className="chatbot-search-empty">
          No results found. Try searching for a service name, page, or topic like <em>Business Loan</em> or <em>Offices</em>.
        </div>
      </div>
    );
  }

  return (
    <div className="chatbot-search-results" role="listbox" aria-label="Search results">
      {results.map((result, i) => (
        <button
          key={`${result.type}-${result.key}-${i}`}
          type="button"
          role="option"
          className="chatbot-search-result"
          onClick={() => onSelect(result)}
        >
          <span className="chatbot-search-result-type">
            {result.type === 'option' ? `In ${SITE_MAP[result.key]?.label}` : 'Page'}
          </span>
          <span className="chatbot-search-result-label">{result.label}</span>
          {result.description && (
            <span className="chatbot-search-result-desc">{result.description}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN CHATBOT COMPONENT
// ─────────────────────────────────────────────

export default function Chatbot() {
  const pathname = usePathname();
  const router = useRouter();
  const portalRouteHidden =
    pathname?.startsWith('/employee-dashboard') ||
    pathname?.startsWith('/admin-dashboard');

  const scrollRef = useRef(null);
  const endRef = useRef(null);
  const panelRef = useRef(null);
  const searchInputRef = useRef(null);
  const lastPathRef = useRef(pathname);
  const pendingScrollRef = useRef(null);
  const isOpenRef = useRef(false);

  const [isOpen, setIsOpen] = useState(false);
  const [showLauncher, setShowLauncher] = useState(false);
  const [hasPortalSession, setHasPortalSession] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [messages, setMessages] = useState(() => [buildWelcomeMessage(pathname)]);

  const pageContext = useMemo(() => getPageContext(pathname), [pathname]);

  // Keep ref in sync
  useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);

  useEffect(() => {
    let cancelled = false;

    const checkPortalSession = async () => {
      if (portalRouteHidden) {
        setHasPortalSession(true);
        setIsOpen(false);
        setShowLauncher(false);
        return;
      }

      try {
        const user = await getCurrentPortalUser();

        if (!cancelled) {
          const loggedIn = ['employee', 'admin', 'marketing_admin', 'hr_admin', 'superadmin'].includes(user?.role);
          setHasPortalSession(loggedIn);

          if (loggedIn) {
            setIsOpen(false);
            setShowLauncher(false);
          }
        }
      } catch {
        if (!cancelled) {
          setHasPortalSession(false);
        }
      }
    };

    void checkPortalSession();

    window.addEventListener('focus', checkPortalSession);
    window.addEventListener('storage', checkPortalSession);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', checkPortalSession);
      window.removeEventListener('storage', checkPortalSession);
    };
  }, [pathname, portalRouteHidden]);

  // ── Search ──────────────────────────────────
  const searchResults = useMemo(() => search(searchValue), [searchValue]);
  const showSearchResults = searchValue.trim().length >= 2;

  // ── Scroll helpers ──────────────────────────
  const scrollToTop = useCallback((behavior = 'auto') => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: 0, behavior });
      });
    });
  }, []);

  const scrollToLatest = useCallback((behavior = 'smooth') => {
    requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({ behavior, block: 'end' });
    });
  }, []);

  const appendMessages = useCallback((items, scrollMode = 'latest') => {
    pendingScrollRef.current = scrollMode;
    setMessages((prev) => [...prev, ...items]);
  }, []);

  // ── Route change ─────────────────────────────
  useEffect(() => {
    if (lastPathRef.current === pathname) return;
    setSearchValue('');

    if (isOpenRef.current) {
      appendMessages([buildPageGuideMessage(pathname)], 'latest');
    } else {
      pendingScrollRef.current = 'top';
      setMessages([buildWelcomeMessage(pathname)]);
    }

    lastPathRef.current = pathname;
  }, [pathname, appendMessages]);

  // ── Scroll on open ───────────────────────────
  useEffect(() => {
    if (isOpen) {
      scrollToTop('auto');
      setTimeout(() => searchInputRef.current?.focus(), 120);
    }
  }, [isOpen, scrollToTop]);

  // ── Pending scroll after message append ──────
  useEffect(() => {
    if (!isOpen || !pendingScrollRef.current) return;
    const mode = pendingScrollRef.current;
    pendingScrollRef.current = null;
    mode === 'top' ? scrollToTop('auto') : scrollToLatest('smooth');
  }, [messages, isOpen, scrollToTop, scrollToLatest]);

  // ── Focus trap ───────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const panel = panelRef.current;
    if (!panel) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        return;
      }

      if (e.key !== 'Tab') return;

      const focusable = panel.querySelectorAll(
        'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      }
    };

    panel.addEventListener('keydown', handleKeyDown);
    return () => panel.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // ── Hide zone observer ───────────────────────
  useEffect(() => {
    let cleanup = () => {};
    let rafId = 0;

    setShowLauncher(false);

    rafId = requestAnimationFrame(() => {
      const hideZone = findHideZone();

      if (!hideZone) {
        setShowLauncher(true);
        return;
      }

      const navbarHeight = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--navbar-height') || '74',
      ) || 74;

      const sync = () => {
        const active = isHideZoneActive(hideZone, navbarHeight);
        setShowLauncher(!active);
        if (active && isOpenRef.current) setIsOpen(false);
      };

      const observer = new IntersectionObserver(([entry]) => {
        const active = entry.isIntersecting && isHideZoneActive(hideZone, navbarHeight);
        setShowLauncher(!active);
        if (active && isOpenRef.current) setIsOpen(false);
      }, {
        threshold: [0, 0.08, 0.16, 0.28, 0.4, 0.6, 0.8],
        rootMargin: `-${navbarHeight}px 0px -18% 0px`,
      });

      observer.observe(hideZone);
      sync();

      window.addEventListener('scroll', sync, { passive: true });
      window.addEventListener('resize', sync);

      cleanup = () => {
        observer.disconnect();
        window.removeEventListener('scroll', sync);
        window.removeEventListener('resize', sync);
      };
    });

    return () => { cancelAnimationFrame(rafId); cleanup(); };
  }, [pathname]);

  // ── Handlers ────────────────────────────────

  const handleGoalClick = useCallback((goal) => {
    const response = goal.buildResponse();
    appendMessages([
      { id: uid('user'), type: 'user', text: goal.label },
      { id: uid('bot'), type: 'bot', goals: [], ...response },
    ], 'latest');
  }, [appendMessages]);

  const handleTopicClick = useCallback((topic) => {
    appendMessages([
      { id: uid('user'), type: 'user', text: topic.label },
      buildTopicMessage(topic),
    ], 'latest');
  }, [appendMessages]);

  const handleSearchSelect = useCallback((result) => {
    const node = SITE_MAP[result.key];
    if (!node) return;

    if (result.type === 'page') {
      appendMessages([
        { id: uid('user'), type: 'user', text: result.label },
        { ...buildSiteNodeMessage(result.key), id: uid('bot') },
      ], 'latest');
    } else {
      router.push(result.href);
      setIsOpen(false);
    }

    setSearchValue('');
  }, [appendMessages, router]);

  const handleSearchKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && searchResults.length) {
      e.preventDefault();
      handleSearchSelect(searchResults[0]);
    }
  }, [searchResults, handleSearchSelect]);

  const handleLinkClick = useCallback(() => {
    setIsOpen(false);
    setSearchValue('');
  }, []);

  const handleShowTopics = useCallback(() => {
    appendMessages([{
      id: uid('topics'),
      type: 'bot',
      badge: 'Explore',
      text: 'Browse the main MEMPCO topics below.',
      goals: [],
      topics: TOPICS,
      actions: [],
      links: [],
      showUtilities: false,
    }], 'latest');
  }, [appendMessages]);

  const handleShowHome = useCallback(() => {
    appendMessages([{
      id: uid('home'),
      type: 'bot',
      badge: 'Start',
      text: 'Choose a guided action below to continue.',
      goals: buildGoals(pathname),
      topics: [],
      actions: [],
      links: [],
      showUtilities: false,
    }], 'latest');
  }, [appendMessages, pathname]);

  const handleShowPageGuide = useCallback(() => {
    appendMessages([buildPageGuideMessage(pathname)], 'latest');
  }, [appendMessages, pathname]);

  const handleReset = useCallback(() => {
    pendingScrollRef.current = 'top';
    setSearchValue('');
    setMessages([buildWelcomeMessage(pathname)]);
  }, [pathname]);

  if (portalRouteHidden || hasPortalSession) {
    return null;
  }

  // ────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────

  return (
    <>
      {/* Panel */}
      <div
        ref={panelRef}
        className={`chatbot-panel ${isOpen ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="MEMPCOnnect Assistant"
        aria-hidden={!isOpen}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="chatbot-header">
          <div className="chatbot-brand">
            <div className="chatbot-brand-icon">
              <img src="/Icons/ChatbotIcon.png" alt="" className="chatbot-brand-image" aria-hidden="true" />
            </div>
            <div className="chatbot-brand-copy">
              <p className="chatbot-kicker">MEMPCO</p>
              <h3>MEMPCOnnect</h3>
            </div>
          </div>
          <button
            type="button"
            className="chatbot-close"
            onClick={() => setIsOpen(false)}
            aria-label="Close MEMPCOnnect"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        {/* Page chip */}
        <div className="chatbot-page-chip" aria-live="polite">
          <span>Viewing</span>
          <strong>{pageContext.pageLabel}</strong>
        </div>

        {/* Search */}
        <div className="chatbot-search-shell">
          <div className="chatbot-search" role="search">
            <span className="chatbot-search-icon-wrap" aria-hidden="true">
              <AppIcon name="search" className="chatbot-search-icon" />
            </span>
            <input
              ref={searchInputRef}
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="chatbot-search-input"
              placeholder="Search services, pages, or offices…"
              aria-label="Search MEMPCOnnect"
              aria-autocomplete="list"
              aria-expanded={showSearchResults}
              autoComplete="off"
              spellCheck={false}
            />
            {searchValue && (
              <button
                type="button"
                className="chatbot-search-clear"
                onClick={() => { setSearchValue(''); searchInputRef.current?.focus(); }}
                aria-label="Clear search"
              >
                <span aria-hidden="true">×</span>
              </button>
            )}
          </div>

          {showSearchResults && (
            <SearchResults results={searchResults} onSelect={handleSearchSelect} />
          )}
        </div>

        {/* Messages */}
        <div
          className="chatbot-messages"
          ref={scrollRef}
          role="log"
          aria-label="Conversation"
          aria-live="polite"
        >
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              onGoalClick={handleGoalClick}
              onTopicClick={handleTopicClick}
              onLinkClick={handleLinkClick}
              onReset={handleReset}
              onShowTopics={handleShowTopics}
              onShowHome={handleShowHome}
            />
          ))}
          <div ref={endRef} aria-hidden="true" />
        </div>

        {/* Footer */}
        <div className="chatbot-footer" role="toolbar" aria-label="Chatbot navigation">
          <button type="button" className="chatbot-footer-btn is-primary" onClick={handleShowHome}>
            <span className="chatbot-footer-icon" aria-hidden="true">
              <AppIcon name="services" className="chatbot-footer-icon-svg" />
            </span>
            <span>Guided</span>
          </button>
          <button type="button" className="chatbot-footer-btn" onClick={handleShowPageGuide}>
            <span className="chatbot-footer-icon" aria-hidden="true">
              <AppIcon name="page" className="chatbot-footer-icon-svg" />
            </span>
            <span>This Page</span>
          </button>
          <button type="button" className="chatbot-footer-btn" onClick={handleReset}>
            <span className="chatbot-footer-icon" aria-hidden="true">
              <AppIcon name="restart" className="chatbot-footer-icon-svg" />
            </span>
            <span>Restart</span>
          </button>
        </div>
      </div>

      {/* Launcher */}
      <div className={`chatbot-launcher ${showLauncher ? 'chatbot-launcher--visible' : 'chatbot-launcher--hidden'}`}>
        <button
          type="button"
          className="chatbot-toggle"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label={isOpen ? 'Close MEMPCOnnect' : 'Open MEMPCOnnect'}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          title="MEMPCOnnect"
        >
          <img
            src="/Icons/ChatbotIcon.png"
            alt="MEMPCOnnect"
            className="chatbot-toggle-image"
          />
        </button>
      </div>
    </>
  );
}
