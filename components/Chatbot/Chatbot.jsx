'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
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
  care: (
    <>
      <path d="M12 21s-7-4.4-7-10.2A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 7 3.8C19 16.6 12 21 12 21z" />
      <path d="M12 9v5" />
      <path d="M9.5 11.5h5" />
    </>
  ),
  insurance: (
    <>
      <path d="M12 3l7 3v5c0 4.2-2.4 7.3-7 10-4.6-2.7-7-5.8-7-10V6z" />
      <path d="M9 12h6" />
      <path d="M12 9v6" />
    </>
  ),
  transport: (
    <>
      <path d="M5 16V8.8A2.8 2.8 0 0 1 7.8 6h8.4A2.8 2.8 0 0 1 19 8.8V16" />
      <path d="M4 16h16" />
      <circle cx="7.5" cy="17" r="1.5" />
      <circle cx="16.5" cy="17" r="1.5" />
      <path d="M8 10h8" />
    </>
  ),
  wellness: (
    <>
      <path d="M20 12.5a7.5 7.5 0 0 1-15 0C5 8 8.5 5 12 3c3.5 2 8 5 8 9.5z" />
      <path d="M9 13h6" />
      <path d="M12 10v6" />
    </>
  ),
  funeral: (
    <>
      <path d="M6 19V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v11" />
      <path d="M4 19h16" />
      <path d="M12 9v6" />
      <path d="M9.5 11.5h5" />
    </>
  ),
  mlc: (
    <>
      <path d="M4 7.5 12 4l8 3.5-8 3.5-8-3.5z" />
      <path d="M7 10v4.5c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V10" />
      <path d="M20 8v5" />
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
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11a8 8 0 1 0-2.34 5.66" />
      <path d="M20 4v7h-7" />
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
    keywords: ['services', 'offerings', 'all services', 'products', 'what does mempco offer'],
    description: 'Browse all MEMPCO savings, loans, allied services, and youth programs in one place.',
    nextSteps: ['Compare service categories.', 'Open the service page that matches your need.', 'Contact an office if you need staff confirmation.'],
    related: ['regularSavings', 'businessLoan', 'insurance'],
  },
  regularSavings: {
    label: 'Regular Savings',
    href: '/services/savings/regular-savings',
    icon: 'savings',
    keywords: ['regular savings', 'savings account', 'deposit', 'open account', 'membership savings'],
    description: 'The standard savings account and starting point for many MEMPCO members.',
    nextSteps: ['Review the account details.', 'Prepare basic member information.', 'Visit or contact a branch for opening requirements.'],
    related: ['kkt', 'timeDeposit', 'services'],
  },
  kkt: {
    label: 'KKT',
    href: '/services/savings/kkt',
    icon: 'savings',
    keywords: ['kkt', 'kinabukasan', 'special savings', 'locked savings', 'long term savings', 'family savings'],
    description: 'A special savings product for members planning ahead with a minimum two-year lock-in.',
    nextSteps: ['Check the page for rate and eligibility details.', 'Compare it with Regular Savings and Time Deposit.', 'Ask a branch which savings option fits your goal.'],
    related: ['regularSavings', 'timeDeposit', 'services'],
  },
  timeDeposit: {
    label: 'Time Deposit',
    href: '/services/savings/time-deposit',
    icon: 'savings',
    keywords: ['time deposit', 'fixed deposit', 'term savings', 'higher interest', 'maturity'],
    description: 'A fixed-term savings option for members who can set aside funds for a chosen period.',
    nextSteps: ['Choose a target term.', 'Compare expected returns with other savings products.', 'Confirm current rates with a MEMPCO branch.'],
    related: ['regularSavings', 'kkt', 'services'],
  },
  aflatounSavings: {
    label: 'Aflatoun Savings',
    href: '/services/savings/aflatoun-savings',
    icon: 'savings',
    keywords: ['aflatoun', 'aflatoun savings', 'youth savings', 'children savings', 'student savings', 'school savings'],
    description: 'A school-linked youth savings program paired with financial education and values formation.',
    nextSteps: ['Check who can join.', 'Prepare guardian or school coordination details if needed.', 'Compare with Youth Savings.'],
    related: ['youthSavings', 'regularSavings', 'services'],
  },
  youthSavings: {
    label: 'Youth Savings',
    href: '/services/savings/youth-savings',
    icon: 'savings',
    keywords: ['youth savings', 'young savers', 'student savings', 'kids savings', 'children savings'],
    description: 'A savings program designed to help young members build saving habits early.',
    nextSteps: ['Check age and guardian requirements.', 'Prepare the initial deposit or membership details.', 'Visit a branch to confirm account opening steps.'],
    related: ['aflatounSavings', 'regularSavings', 'services'],
  },
  businessLoan: {
    label: 'Business Loan',
    href: '/services/loans/business-loan',
    icon: 'loans',
    keywords: ['business loan', 'enterprise loan', 'group loan', 'tricycle loan', 'capital', 'livelihood loan', 'apply business loan'],
    description: 'Loan options for business, livelihood, group financing, back-to-back borrowing, and EC tricycle needs.',
    options: ['Individual Business Loan', 'Group Business Loan', 'Back to Back Loan', 'EC Tricycle Loan'],
    nextSteps: ['Identify the loan type that matches your business purpose.', 'Prepare business and member information.', 'Contact a branch for current requirements and assessment.'],
    related: ['providentialLoan', 'services'],
  },
  providentialLoan: {
    label: 'Providential Loan',
    href: '/services/loans/providential-loan',
    icon: 'loans',
    keywords: ['providential loan', 'salary loan', 'appliance loan', 'motorcycle loan', 'pension loan', 'education loan', 'personal loan', 'house improvement'],
    description: 'Personal financing options for salary, education, motorcycle, pension, household, and other member needs.',
    options: ['Appliance & Furniture Loan', 'Salary Loan', 'Motorcycle Loan', 'Honorarium Loan', 'Vehicle Loan', 'House Improvement Loan', 'Instant Loan', 'Study Now Pay Later', 'Pension Loan'],
    nextSteps: ['Pick the loan purpose that fits your need.', 'Review the product page before applying.', 'Ask a branch for the latest requirements and amount limits.'],
    related: ['businessLoan', 'services'],
  },
  careProgram: {
    label: 'CARE Program',
    href: '/services/loans/care-program',
    icon: 'care',
    keywords: ['care program', 'care loan', 'micro entrepreneur', 'character based financing', 'small business support'],
    description: 'A CARE Loan program with clear amount limits, monthly interest, repayment term, and service fee.',
    nextSteps: ['Review CARE Loan details.', 'Check the amount, term, interest, and service fee.', 'Contact a branch for assessment and next steps.'],
    related: ['businessLoan', 'providentialLoan', 'services'],
  },
  insurance: {
    label: 'Insurance',
    href: '/services/insurance',
    icon: 'insurance',
    keywords: ['insurance', 'coop assurance', 'life insurance', 'gadddi', 'expanded life insurance', 'loan protection', 'family protection', 'non life'],
    description: 'Insurance catalog including GADDDI-4, Expanded Life Insurance, family coverage, loan protection, and selected non-life needs.',
    nextSteps: ['Review available insurance categories and add-on life packages.', 'Match coverage to your family, loan, or property need.', 'Confirm terms with a branch before enrolling.'],
    related: ['services', 'offices'],
  },
  transportation: {
    label: 'Transportation',
    href: '/services/transportation',
    icon: 'transport',
    keywords: ['transportation', 'transport', 'travel', 'booking', 'mobility'],
    description: 'Transportation support information and updates for members.',
    nextSteps: ['Open the page for current transportation details.', 'Check guidelines and booking notes.', 'Contact an office for availability.'],
    related: ['services', 'offices'],
  },
  funeral: {
    label: 'Funeral Services',
    href: '/services/funeral',
    icon: 'funeral',
    keywords: ['funeral', 'memorial', 'chapel', 'urn', 'burial', 'funeral package'],
    description: 'Funeral and memorial assistance information, including packages, chapel rates, and coordination support.',
    nextSteps: ['Review packages and chapel information.', 'Prepare service details or immediate needs.', 'Contact MEMPCO for coordination support.'],
    related: ['services', 'offices'],
  },
  wellness: {
    label: 'Wellness & Diagnostics',
    href: '/services/wellness',
    icon: 'wellness',
    keywords: ['wellness', 'diagnostics', 'health', 'medical', 'consultation'],
    description: 'Wellness and diagnostics information prepared for member health support updates.',
    nextSteps: ['Open the page for available wellness details.', 'Check program reminders and updates.', 'Contact a branch for current availability.'],
    related: ['services', 'offices'],
  },
  mlc: {
    label: 'MEMPCO Laboratory Cooperative',
    href: '/services/mlc',
    icon: 'mlc',
    keywords: ['mlc', 'laboratory cooperative', 'youth program', 'young members', 'financial education'],
    description: 'The youth development and laboratory cooperative page for young members and financial education activities.',
    nextSteps: ['Learn about youth learning activities.', 'Review savings and formation programs.', 'Ask a branch about participation.'],
    related: ['aflatounSavings', 'youthSavings', 'services'],
  },
  offices: {
    label: 'Offices',
    href: '/branches',
    icon: 'offices',
    keywords: ['offices', 'branches', 'locations', 'contact', 'directions', 'where', 'phone number', 'address'],
    description: 'View MEMPCO branch locations and contact information.',
    nextSteps: ['Open the Offices page.', 'Choose the nearest branch.', 'Use the listed contact details before visiting.'],
    related: [],
  },
  boardOfDirectors: {
    label: 'Board of Directors',
    href: '/governance/board-of-directors',
    icon: 'governance',
    keywords: ['board', 'directors', 'board of directors', 'governance'],
    description: 'Meet the MEMPCO Board of Directors.',
    nextSteps: ['Open the governance page.', 'Review leadership information.', 'Use related management pages for organization context.'],
    related: ['management'],
  },
  management: {
    label: 'Management',
    href: '/governance/management',
    icon: 'governance',
    keywords: ['management', 'executives', 'officers', 'governance'],
    description: "View MEMPCO's management team.",
    nextSteps: ['Open the management page.', 'Review the management structure.', 'Use Board of Directors for governance context.'],
    related: ['boardOfDirectors'],
  },
  career: {
    label: 'Careers',
    href: '/jobs',
    icon: 'career',
    keywords: ['career', 'careers', 'jobs', 'apply', 'hiring', 'positions', 'openings', 'employment', 'work at mempco'],
    description: 'Explore job openings and application information at MEMPCO.',
    nextSteps: ['Open the Careers page.', 'Review available openings.', 'Follow the application instructions shown there.'],
    related: ['employeePortal'],
  },
  employeePortal: {
    label: 'Employee Portal',
    href: '/LogIn',
    icon: 'portal',
    keywords: ['employee portal', 'employee login', 'log in', 'sign in', 'staff access', 'portal', 'admin login', 'hr login'],
    description: 'Access the MEMPCO internal portal login for authorized employees and administrators.',
    nextSteps: ['Open the portal login page.', 'Use your authorized MEMPCO account.', 'Contact the internal helpdesk if access fails.'],
    related: ['career'],
  },
  news: {
    label: 'News & Events',
    href: '/news',
    icon: 'news',
    keywords: ['news', 'events', 'announcements', 'updates', 'latest news'],
    description: 'Read the latest MEMPCO announcements, stories, and events.',
    nextSteps: ['Open News & Events.', 'Filter or browse current posts.', 'Check back for recent announcements.'],
    related: [],
  },
};

// Group keys for easy lookup
export const GROUPS = {
  savings: ['regularSavings', 'kkt', 'timeDeposit', 'aflatounSavings', 'youthSavings'],
  loans: ['businessLoan', 'providentialLoan', 'careProgram'],
  allied: ['insurance', 'transportation', 'funeral', 'wellness'],
  youth: ['mlc', 'aflatounSavings', 'youthSavings'],
  governance: ['boardOfDirectors', 'management'],
};

// Topics for browse mode
export const TOPICS = [
  { key: 'services', label: 'All Services', icon: 'services', items: ['services', ...GROUPS.savings, ...GROUPS.loans, ...GROUPS.allied, 'mlc'] },
  { key: 'savings', label: 'Savings', icon: 'savings', items: GROUPS.savings },
  { key: 'loans', label: 'Loans', icon: 'loans', items: GROUPS.loans },
  { key: 'allied', label: 'Allied Services', icon: 'insurance', items: GROUPS.allied },
  { key: 'youth', label: 'Youth & MLC', icon: 'mlc', items: GROUPS.youth },
  { key: 'offices', label: 'Offices', icon: 'offices', items: ['offices'] },
  { key: 'governance', label: 'Governance', icon: 'governance', items: GROUPS.governance },
  { key: 'career', label: 'Careers', icon: 'career', items: ['career', 'employeePortal'] },
  { key: 'employee', label: 'Employee Access', icon: 'portal', items: ['employeePortal', 'career'] },
  { key: 'news', label: 'News', icon: 'news', items: ['news'] },
];

const QUICK_REPLIES = {
  start: [
    { key: 'quick-loans', label: 'Loans', type: 'topic', topicKey: 'loans' },
    { key: 'quick-savings', label: 'Savings', type: 'topic', topicKey: 'savings' },
    { key: 'quick-branches', label: 'Branches', type: 'page', pageKey: 'offices' },
    { key: 'quick-requirements', label: 'Requirements', type: 'query', query: 'loan requirements' },
  ],
  answer: [
    { key: 'quick-related-services', label: 'Related Services', type: 'topic', topicKey: 'services' },
    { key: 'quick-branches', label: 'Branches', type: 'page', pageKey: 'offices' },
    { key: 'quick-contact', label: 'Contact', type: 'goal', goalKey: 'contact-office' },
  ],
  page: [
    { key: 'quick-this-page', label: 'This Page', type: 'mode', mode: 'page' },
    { key: 'quick-services', label: 'Services', type: 'topic', topicKey: 'services' },
    { key: 'quick-contact', label: 'Contact', type: 'goal', goalKey: 'contact-office' },
  ],
};

// Page-to-site-map key mapping
const PATH_CONTEXT = [
  { match: (p) => p.startsWith('/services/loans/business-loan'), key: 'businessLoan', pageLabel: 'Business Loan', suggestedItems: ['businessLoan', 'providentialLoan'] },
  { match: (p) => p.startsWith('/services/loans/providential-loan'), key: 'providentialLoan', pageLabel: 'Providential Loan', suggestedItems: ['providentialLoan', 'businessLoan'] },
  { match: (p) => p.startsWith('/services/loans/care-program'), key: 'careProgram', pageLabel: 'CARE Program', suggestedItems: ['careProgram', 'businessLoan', 'providentialLoan'] },
  { match: (p) => p.startsWith('/services/savings/regular-savings'), key: 'regularSavings', pageLabel: 'Regular Savings', suggestedItems: ['regularSavings', 'kkt', 'timeDeposit'] },
  { match: (p) => p.startsWith('/services/savings/kkt'), key: 'kkt', pageLabel: 'KKT', suggestedItems: ['kkt', 'regularSavings', 'timeDeposit'] },
  { match: (p) => p.startsWith('/services/savings/time-deposit'), key: 'timeDeposit', pageLabel: 'Time Deposit', suggestedItems: ['timeDeposit', 'regularSavings', 'kkt'] },
  { match: (p) => p.startsWith('/services/savings/aflatoun-savings'), key: 'aflatounSavings', pageLabel: 'Aflatoun Savings', suggestedItems: ['aflatounSavings', 'youthSavings'] },
  { match: (p) => p.startsWith('/services/savings/youth-savings'), key: 'youthSavings', pageLabel: 'Youth Savings', suggestedItems: ['youthSavings', 'aflatounSavings'] },
  { match: (p) => p.startsWith('/services/insurance'), key: 'insurance', pageLabel: 'Insurance', suggestedItems: ['insurance', 'offices', 'services'] },
  { match: (p) => p.startsWith('/services/transportation'), key: 'transportation', pageLabel: 'Transportation', suggestedItems: ['transportation', 'offices', 'services'] },
  { match: (p) => p.startsWith('/services/funeral'), key: 'funeral', pageLabel: 'Funeral Services', suggestedItems: ['funeral', 'offices', 'services'] },
  { match: (p) => p.startsWith('/services/wellness'), key: 'wellness', pageLabel: 'Wellness & Diagnostics', suggestedItems: ['wellness', 'offices', 'services'] },
  { match: (p) => p.startsWith('/services/mlc'), key: 'mlc', pageLabel: 'MEMPCO Laboratory Cooperative', suggestedItems: ['mlc', 'aflatounSavings', 'youthSavings'] },
  { match: (p) => p.startsWith('/services'), key: 'services', pageLabel: 'Services', suggestedItems: ['services', ...GROUPS.savings, ...GROUPS.loans, ...GROUPS.allied, 'mlc'] },
  { match: (p) => p.startsWith('/governance/board-of-directors'), key: 'boardOfDirectors', pageLabel: 'Board of Directors', suggestedItems: ['boardOfDirectors', 'management'] },
  { match: (p) => p.startsWith('/governance/management'), key: 'management', pageLabel: 'Management', suggestedItems: ['management', 'boardOfDirectors'] },
  { match: (p) => p.startsWith('/governance'), key: null, pageLabel: 'Governance', suggestedItems: ['boardOfDirectors', 'management'] },
  { match: (p) => p.startsWith('/branches'), key: 'offices', pageLabel: 'Offices', suggestedItems: ['offices'] },
  { match: (p) => p.startsWith('/jobs'), key: 'career', pageLabel: 'Careers', suggestedItems: ['career', 'employeePortal'] },
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

const FAQ_ITEMS = [
  {
    id: 'loan-apply',
    label: 'How do I apply for a loan?',
    keywords: ['apply loan', 'loan application', 'borrow money', 'requirements loan', 'business loan application', 'providential loan application'],
    answer: 'Start by choosing the loan purpose, then review the matching loan page and contact a MEMPCO branch for current requirements and assessment.',
    details: ['Business or livelihood need: start with Business Loan or CARE Program.', 'Personal, salary, school, pension, or household need: start with Providential Loan.', 'A branch can confirm eligibility, documents, amount limits, and processing steps.'],
    links: ['businessLoan', 'providentialLoan', 'careProgram', 'offices'],
  },
  {
    id: 'savings-open',
    label: 'How do I open a savings account?',
    keywords: ['open savings', 'open account', 'savings requirements', 'membership savings', 'deposit account'],
    answer: 'Pick the savings product that matches your goal, then confirm account-opening requirements with a branch.',
    details: ['Regular Savings is the usual starting point.', 'Time Deposit is for funds you can keep for a fixed term.', 'Aflatoun and Youth Savings are for younger savers and youth programs.'],
    links: ['regularSavings', 'timeDeposit', 'aflatounSavings', 'youthSavings', 'offices'],
  },
  {
    id: 'branch-contact',
    label: 'Where can I find branch contact details?',
    keywords: ['contact', 'branch contact', 'phone number', 'office address', 'where is mempco', 'directions'],
    answer: 'Use the Offices page to view MEMPCO branch locations, contact details, and directions.',
    details: ['Choose the nearest branch.', 'Check listed contact information before visiting.', 'Use the branch page when you need service-specific confirmation.'],
    links: ['offices'],
  },
  {
    id: 'employee-login',
    label: 'Where is the employee portal?',
    keywords: ['employee portal', 'employee login', 'staff login', 'admin login', 'hr login', 'portal access'],
    answer: 'Authorized staff can use the MEMPCO portal login page.',
    details: ['Use your authorized employee or admin account.', 'The public chatbot is hidden on portal and admin pages.', 'If login fails, contact the internal helpdesk or administrator.'],
    links: ['employeePortal'],
  },
  {
    id: 'service-fit',
    label: 'Which service should I choose?',
    keywords: ['which service', 'what service', 'recommend service', 'help me choose', 'best service'],
    answer: 'Choose based on your goal: save money, borrow for a need, protect your family or property, or find youth programs.',
    details: ['Savings: Regular Savings, KKT, Time Deposit, Aflatoun, Youth Savings.', 'Loans: Business Loan, Providential Loan, CARE Program.', 'Allied support: Insurance, Funeral, Transportation, Wellness.'],
    links: ['services', 'regularSavings', 'businessLoan', 'insurance', 'mlc'],
  },
  {
    id: 'education-help',
    label: 'I need money for school',
    keywords: ['school', 'tuition', 'education loan', 'student expense', 'money for school', 'college'],
    answer: 'For school or tuition-related needs, start with Study Now Pay Later under Providential Loan, then confirm requirements with a branch.',
    details: ['Open Providential Loan and look for Study Now Pay Later.', 'Prepare school-related details or documents before asking for assessment.', 'Contact a branch to confirm the current amount limits and requirements.'],
    links: ['providentialLoan', 'offices'],
  },
  {
    id: 'child-savings',
    label: 'I want to save for my child',
    keywords: ['save for child', 'child savings', 'kids savings', 'student savings', 'young saver', 'youth account'],
    answer: 'For younger savers, compare Youth Savings and Aflatoun Savings, then ask a branch which one fits the child or school setup.',
    details: ['Youth Savings is a general youth-oriented savings option.', 'Aflatoun Savings is connected with financial education and school-linked formation.', 'MLC gives broader youth program context.'],
    links: ['youthSavings', 'aflatounSavings', 'mlc', 'offices'],
  },
  {
    id: 'urgent-funeral',
    label: 'I need funeral assistance',
    keywords: ['urgent funeral', 'funeral help', 'memorial assistance', 'chapel rates', 'funeral package', 'burial help'],
    answer: 'Open Funeral Services for package and chapel information, then contact MEMPCO directly for urgent coordination.',
    details: ['Review funeral packages and chapel rates first if time allows.', 'Use direct contact when the need is urgent.', 'Branch staff can confirm available arrangements and next steps.'],
    links: ['funeral', 'offices'],
  },
];

const DIRECT_ACTIONS = {
  call: {
    label: 'Call MEMPCO',
    href: 'tel:+63629917772',
    variant: 'primary',
  },
  email: {
    label: 'Email MEMPCO',
    href: 'mailto:inquiries@mempco.coop',
    variant: 'secondary',
  },
  facebook: {
    label: 'Open Facebook',
    href: 'https://www.facebook.com/mempco.ph',
    variant: 'secondary',
    external: true,
  },
};

const PAGE_GUIDE_DETAILS = {
  businessLoan: {
    details: ['Compare Individual, Group, Back-to-Back, and EC Tricycle options.', 'Use branch contact before preparing documents so requirements are current.', 'If the amount fits CARE Loan limits, also check CARE Program.'],
    actions: ['call', 'email'],
  },
  providentialLoan: {
    details: ['Useful for salary, education, motorcycle, pension, and household needs.', 'Pick the loan purpose first, then confirm limits and requirements with a branch.', 'Business or livelihood needs may fit Business Loan better.'],
    actions: ['call', 'email'],
  },
  careProgram: {
    details: ['CARE Loan has 2.75% monthly interest, Php 4,000 minimum, and Php 200,000 maximum.', 'Review the 4 to 12 month term and 4% service fee.', 'Compare it with Business Loan if you need larger business financing.'],
    actions: ['call', 'email'],
  },
  regularSavings: {
    details: ['Best starting point for everyday member savings.', 'Ask a branch for the current opening requirements.', 'Compare KKT or Time Deposit if your goal is long-term or fixed-term growth.'],
    actions: ['call', 'email'],
  },
  timeDeposit: {
    details: ['Good for money you can keep untouched for a chosen term.', 'Confirm current rates and terms with a branch.', 'Compare Regular Savings if you need easier access.'],
    actions: ['call', 'email'],
  },
  insurance: {
    details: ['Use this page to compare life, family, loan protection, and non-life options.', 'Match coverage to the risk you want to protect against.', 'Confirm terms with staff before enrolling.'],
    actions: ['call', 'email'],
  },
  funeral: {
    details: ['Review packages, chapel rates, and memorial assistance details.', 'Use direct contact for urgent coordination.', 'Branch staff can confirm available arrangements.'],
    actions: ['call', 'facebook'],
  },
  offices: {
    details: ['Find the nearest branch and contact details.', 'Call ahead for service-specific requirements.', 'Use email or Facebook for general inquiries.'],
    actions: ['call', 'email', 'facebook'],
  },
  career: {
    details: ['Review openings and application instructions on Careers.', 'Employee Portal is for authorized internal access.', 'Use the login page only if you already have an authorized account.'],
    actions: [],
  },
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
    const searchText = [
      node.label,
      ...node.keywords,
      node.description || '',
      ...(node.nextSteps || []),
      ...(node.options || []),
    ].join(' ');

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

  for (const item of FAQ_ITEMS) {
    entries.push({
      type: 'faq',
      key: item.id,
      label: item.label,
      href: null,
      description: item.answer,
      searchText: [item.label, item.answer, ...item.keywords, ...item.details].join(' '),
    });
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
    const dedupeKey = entry.type === 'faq'
      ? `faq:${entry.key}`
      : entry.type === 'option'
        ? `option:${entry.key}:${entry.label}`
        : `page:${entry.href}`;
    if (!seen.has(dedupeKey)) {
      seen.add(dedupeKey);
      deduped.push(entry);
    }
  }

  return deduped.slice(0, limit);
}

function searchPages(query, limit = 7) {
  return search(query, limit + 4)
    .filter((entry) => entry.type !== 'faq')
    .slice(0, limit);
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
    details: node.nextSteps || [],
    links: [{ label: node.label, href: node.href }, ...relatedLinks],
    actions: [],
    quickReplies: QUICK_REPLIES.answer,
    showUtilities: true,
    ...extraContext,
  };
}

function buildFaqMessage(faq) {
  const links = (faq.links || []).map((key) => SITE_MAP[key]).filter(Boolean);

  return {
    id: uid('faq'),
    type: 'bot',
    badge: 'Answer',
    text: faq.answer,
    cardTitle: faq.label,
    cardDescription: 'Here is the practical path to continue.',
    details: faq.details || [],
    links: links.map((item) => ({ label: item.label, href: item.href })),
    actions: [],
    quickReplies: QUICK_REPLIES.answer,
    showUtilities: true,
  };
}

function buildOptionMessage(result) {
  const node = SITE_MAP[result.key];
  if (!node) return null;

  return buildSiteNodeMessage(result.key, {
    text: `${result.label} is listed under ${node.label}. ${node.description}`,
    cardTitle: result.label,
    cardDescription: `This option is handled on the ${node.label} page.`,
  });
}

function buildAskFallbackMessage(query) {
  return {
    id: uid('fallback'),
    type: 'bot',
    badge: 'Try This',
    text: `I could not find an exact answer for “${query}.” Try choosing a guided action below, browsing topics, or contacting MEMPCO directly.`,
    cardTitle: 'I can still help narrow it down',
    cardDescription: 'Use the quick actions below or search for a service name, loan type, savings product, or office.',
    goals: buildGoals('/'),
    topics: [],
    actions: actionsFromKeys(['call', 'email']),
    links: linksFromKeys(['services', 'offices']),
    quickReplies: QUICK_REPLIES.start,
    showUtilities: false,
  };
}

function buildTopicMessage(topic) {
  const itemLimit = topic.key === 'services' ? 12 : 5;
  const items = topic.items.slice(0, itemLimit).map((key) => SITE_MAP[key]).filter(Boolean);
  return {
    id: uid('bot'),
    type: 'bot',
    badge: 'Topic',
    text: `Here are the main ${topic.label} pages and shortcuts.`,
    cardTitle: topic.label,
    cardDescription: `Browse ${topic.label.toLowerCase()} pages below.`,
    details: items.length > 1 ? ['Choose the item closest to your need.', 'Open a page for full details, then contact an office for confirmation when needed.'] : [],
    links: items.map((item) => ({ label: item.label, href: item.href })),
    actions: [],
    quickReplies: QUICK_REPLIES.answer,
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
      ? 'Hi, I’m MEMPCOnnect. I can help you choose a service, prepare for a loan or savings inquiry, find a branch, or open the right page.'
      : `Hi, I’m MEMPCOnnect. You’re on the ${ctx.pageLabel} page, so I can suggest relevant next steps or help you search MEMPCO services.`,
    goals: buildGoals(pathname),
    topics: [],
    actions: [],
    links: [],
    quickReplies: QUICK_REPLIES.start,
    showUtilities: false,
  };
}

function buildPageGuideMessage(pathname) {
  const ctx = getPageContext(pathname);
  const items = ctx.suggestedItems.slice(0, 3).map((key) => SITE_MAP[key]).filter(Boolean);
  const guide = PAGE_GUIDE_DETAILS[ctx.key] || {};

  return {
    id: uid('page'),
    type: 'bot',
    badge: 'This Page',
    text: `Here are the most useful shortcuts for ${ctx.pageLabel}.`,
    cardTitle: ctx.pageLabel,
    cardDescription: 'Jump directly to the pages most relevant to where you are.',
    details: guide.details || ['Use these shortcuts for the current page context.', 'Search a question like "apply for a loan" or "open savings" for a guided answer.'],
    links: items.map((item) => ({ label: item.label, href: item.href })),
    actions: actionsFromKeys(guide.actions || []),
    quickReplies: QUICK_REPLIES.page,
    showUtilities: true,
  };
}

function buildAnswerForQuery(query) {
  const best = search(query, 1)[0];

  if (best?.type === 'faq') {
    const faq = FAQ_ITEMS.find((item) => item.id === best.key);
    return faq ? buildFaqMessage(faq) : null;
  }

  if (best?.type === 'option') {
    return buildOptionMessage(best);
  }

  if (best?.key) {
    return buildSiteNodeMessage(best.key);
  }

  return buildAskFallbackMessage(query);
}

function linksFromKeys(keys) {
  return keys.map((key) => SITE_MAP[key]).filter(Boolean).map((item) => ({
    label: item.label,
    href: item.href,
  }));
}

function actionsFromKeys(keys) {
  return keys.map((key) => DIRECT_ACTIONS[key]).filter(Boolean);
}

function buildGoals(pathname) {
  return [
    {
      key: 'choose-service',
      label: 'Help Me Choose',
      icon: 'services',
      buildResponse: () => ({
        badge: 'Guide',
        text: 'What are you trying to do today? Choose the closest goal and I’ll narrow the options for you.',
        topics: [
          { key: 'goal-save', label: 'Save or open an account', icon: 'savings', items: GROUPS.savings },
          { key: 'goal-borrow', label: 'Borrow for a need', icon: 'loans', items: GROUPS.loans },
          { key: 'goal-protect', label: 'Protection or assistance', icon: 'insurance', items: GROUPS.allied },
          { key: 'goal-youth', label: 'Youth or student program', icon: 'mlc', items: GROUPS.youth },
        ],
        links: linksFromKeys(['services', 'offices']),
        actions: actionsFromKeys(['call', 'email']),
        cardTitle: 'Choose by Need',
        cardDescription: 'Savings, loans, allied support, youth programs, and office contact are grouped here.',
        details: ['Savings: accounts and deposits.', 'Loans: business, personal, and CARE Program.', 'Allied: insurance, funeral, transportation, and wellness services.'],
        quickReplies: QUICK_REPLIES.answer,
        showUtilities: true,
      }),
    },
    {
      key: 'apply-loan',
      label: 'Apply for a Loan',
      icon: 'loans',
      buildResponse: () => ({
        badge: 'Loan Guide',
        text: 'What is the loan mainly for? Pick the closest purpose first; requirements are confirmed by a branch after that.',
        topics: [
          { key: 'loan-business', label: 'Business capital or livelihood', icon: 'loans', items: ['businessLoan'] },
          { key: 'loan-care', label: 'CARE Loan', icon: 'care', items: ['careProgram'] },
          { key: 'loan-personal', label: 'Salary, household, or personal', icon: 'loans', items: ['providentialLoan'] },
          { key: 'loan-education', label: 'Education or pension need', icon: 'loans', items: ['providentialLoan'] },
        ],
        links: linksFromKeys(['businessLoan', 'providentialLoan', 'careProgram', 'offices']),
        actions: actionsFromKeys(['call', 'email']),
        cardTitle: 'Loan Application Path',
        cardDescription: 'Choose the loan family first, then use the branch page for current requirements.',
        details: ['Business Loan covers enterprise, group, back-to-back, and tricycle-related options.', 'Providential Loan covers personal and household needs.', 'CARE Program covers practical CARE Loan needs.'],
        quickReplies: [
          { key: 'quick-business-loan', label: 'Business Loan', type: 'page', pageKey: 'businessLoan' },
          { key: 'quick-providential-loan', label: 'Providential', type: 'page', pageKey: 'providentialLoan' },
          { key: 'quick-branches', label: 'Branches', type: 'page', pageKey: 'offices' },
        ],
        showUtilities: true,
      }),
    },
    {
      key: 'open-savings',
      label: 'Open Savings',
      icon: 'savings',
      buildResponse: () => ({
        badge: 'Savings Guide',
        text: 'Who is saving, or what is the savings goal? Choose the closest option and I’ll point you to the right product.',
        topics: [
          { key: 'save-everyday', label: 'Everyday member savings', icon: 'savings', items: ['regularSavings'] },
          { key: 'save-fixed', label: 'Fixed-term savings', icon: 'savings', items: ['timeDeposit'] },
          { key: 'save-long-term', label: 'Long-term special savings', icon: 'savings', items: ['kkt'] },
          { key: 'save-youth', label: 'Youth or student saver', icon: 'mlc', items: ['youthSavings', 'aflatounSavings', 'mlc'] },
        ],
        links: linksFromKeys(['regularSavings', 'timeDeposit', 'aflatounSavings', 'youthSavings', 'offices']),
        actions: actionsFromKeys(['call', 'email']),
        cardTitle: 'Savings Account Path',
        cardDescription: 'Regular Savings is the usual starting point; Time Deposit is for fixed-term saving.',
        details: ['Use KKT for long-term special savings goals.', 'Use youth products for younger savers and school-linked programs.', 'Branch staff can confirm the latest account requirements.'],
        quickReplies: [
          { key: 'quick-regular-savings', label: 'Regular Savings', type: 'page', pageKey: 'regularSavings' },
          { key: 'quick-time-deposit', label: 'Time Deposit', type: 'page', pageKey: 'timeDeposit' },
          { key: 'quick-branches', label: 'Branches', type: 'page', pageKey: 'offices' },
        ],
        showUtilities: true,
      }),
    },
    {
      key: 'contact-office',
      label: 'Contact Office',
      icon: 'offices',
      buildResponse: () => ({
        badge: 'Contact',
        text: 'Do you need a branch page, a phone call, or a message channel? Here are the fastest contact paths.',
        links: linksFromKeys(['offices', 'services', 'career']),
        topics: [],
        actions: actionsFromKeys(['call', 'email', 'facebook']),
        cardTitle: 'MEMPCO Offices',
        cardDescription: 'The branch page is the best next stop for contact details and service confirmation.',
        details: ['Pick the nearest branch.', 'Call ahead for service-specific requirements.', 'Use Careers if your goal is employment, not member service.'],
        quickReplies: [
          { key: 'quick-offices', label: 'Open Offices', type: 'page', pageKey: 'offices' },
          { key: 'quick-services', label: 'Services', type: 'topic', topicKey: 'services' },
          { key: 'quick-loans', label: 'Loans', type: 'topic', topicKey: 'loans' },
        ],
        showUtilities: true,
      }),
    },
  ];
}

// ─────────────────────────────────────────────
// HIDE ZONE VISIBILITY LOGIC
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────

function findChatbotHideZone() {
  if (typeof document === 'undefined') return null;

  return (
    document.querySelector('[data-chatbot-hide-zone]') ||
    document.querySelector('main > section[class*="hero"]') ||
    document.querySelector('section[class*="hero"]') ||
    document.querySelector('.hero')
  );
}

function getVisibleHeight(element, topOffset = 0) {
  if (!element || typeof window === 'undefined') return 0;

  const rect = element.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  return Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, topOffset));
}

function isHideZoneActive(element, topOffset = 74) {
  if (!element || typeof window === 'undefined') return false;

  const rect = element.getBoundingClientRect();
  const visibleHeight = getVisibleHeight(element, topOffset);
  const threshold = Math.min(rect.height * 0.28, window.innerHeight * 0.42);

  return visibleHeight > threshold;
}

function isElementVisible(element) {
  if (!element || typeof window === 'undefined') return false;

  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();

  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    Number.parseFloat(style.opacity || '1') > 0 &&
    rect.width > 0 &&
    rect.height > 0
  );
}

function hasActivePublicModal() {
  if (typeof document === 'undefined') return false;

  const modalSelectors = [
    '[role="dialog"][aria-modal="true"]',
    '.np-modal',
    '.ms-modal-overlay',
    '.bod-modal',
    '.mgmt-modal',
  ].join(',');

  return [...document.querySelectorAll(modalSelectors)].some((element) => {
    if (element.closest('.chatbot-panel, .chatbot-launcher')) return false;
    return isElementVisible(element);
  });
}

function ChatMessage({ message, onGoalClick, onTopicClick, onQuickReplyClick, onLinkClick, onShowTopics, onShowHome }) {
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

        {message.details?.length > 0 && (
          <ul className="chatbot-detail-list">
            {message.details.map((detail, i) => (
              <li key={`${message.id}-detail-${i}`} className="chatbot-detail-item">
                {detail}
              </li>
            ))}
          </ul>
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

        {message.actions?.length > 0 && (
          <div className="chatbot-action-list" aria-label="Direct actions">
            {message.actions.map((action, i) => (
              <a
                key={`${action.href}-${i}`}
                href={action.href}
                className={`chatbot-action-chip is-${action.variant || (i === 0 ? 'primary' : 'secondary')}`}
                target={action.external ? '_blank' : undefined}
                rel={action.external ? 'noreferrer' : undefined}
              >
                {action.label}
              </a>
            ))}
          </div>
        )}

        {message.links?.length > 0 && (
          <div className="chatbot-link-section">
            <div className="chatbot-section-label">Open page</div>
            <div className="chatbot-link-list">
              {message.links.map((link, i) => {
                const isDirectHref = /^(https?:|mailto:|tel:)/.test(link.href);
                const className = `chatbot-link-pill ${i === 0 ? 'is-primary' : 'is-secondary'}`;

                return isDirectHref ? (
                  <a
                    key={`${link.href}-${i}`}
                    href={link.href}
                    className={className}
                    target={link.external ? '_blank' : undefined}
                    rel={link.external ? 'noreferrer' : undefined}
                    onClick={onLinkClick}
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={`${link.href}-${i}`}
                    href={link.href}
                    className={className}
                    onClick={onLinkClick}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {isBot && message.quickReplies?.length > 0 && (
          <div className="chatbot-quick-replies" role="group" aria-label="Quick replies">
            {message.quickReplies.map((reply) => (
              <button
                key={reply.key}
                type="button"
                className="chatbot-quick-reply"
                onClick={() => onQuickReplyClick(reply)}
              >
                {reply.label}
              </button>
            ))}
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
          No page found. Try a service or page name like <em>Business Loan</em>, <em>Insurance</em>, or <em>Offices</em>.
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
    pathname?.startsWith('/admin-dashboard') ||
    pathname?.startsWith('/marketing-admin') ||
    pathname?.startsWith('/hr-admin') ||
    pathname?.startsWith('/LogIn');

  const scrollRef = useRef(null);
  const endRef = useRef(null);
  const panelRef = useRef(null);
  const searchInputRef = useRef(null);
  const chatInputRef = useRef(null);
  const lastPathRef = useRef(pathname);
  const pendingScrollRef = useRef(null);
  const isOpenRef = useRef(false);

  const [isOpen, setIsOpen] = useState(false);
  const [showLauncher, setShowLauncher] = useState(false);
  const [isPageModalActive, setIsPageModalActive] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [chatValue, setChatValue] = useState('');
  const [activeMode, setActiveMode] = useState('guide');
  const [messages, setMessages] = useState(() => [buildWelcomeMessage(pathname)]);

  const pageContext = useMemo(() => getPageContext(pathname), [pathname]);

  // Keep ref in sync
  useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);

  // ── Search ──────────────────────────────────
  const searchResults = useMemo(() => searchPages(searchValue), [searchValue]);
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
    setChatValue('');

    if (isOpenRef.current) {
      setActiveMode('page');
      appendMessages([buildPageGuideMessage(pathname)], 'latest');
    } else {
      setActiveMode('guide');
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

  useEffect(() => {
    if (portalRouteHidden || !isPageModalActive) return;

    setIsOpen(false);
    setShowLauncher(false);
  }, [isPageModalActive, portalRouteHidden]);

  useEffect(() => {
    if (portalRouteHidden) {
      setIsPageModalActive(false);
      return undefined;
    }

    let rafId = 0;
    const updateModalState = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setIsPageModalActive(hasActivePublicModal());
      });
    };

    updateModalState();

    const observer = new MutationObserver(updateModalState);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'style', 'aria-hidden'],
      childList: true,
      subtree: true,
    });

    window.addEventListener('resize', updateModalState);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener('resize', updateModalState);
    };
  }, [pathname, portalRouteHidden]);

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

  // ── Handlers ────────────────────────────────

  useEffect(() => {
    if (portalRouteHidden) {
      setIsOpen(false);
      setShowLauncher(false);
      return undefined;
    }

    let cleanup = () => {};
    let rafId = 0;

    const updateLauncherVisibility = () => {
      if (isPageModalActive) {
        setShowLauncher(false);
        if (isOpenRef.current) {
          setIsOpen(false);
        }
        return;
      }

      const hideZone = findChatbotHideZone();

      if (!hideZone) {
        setShowLauncher(true);
        return;
      }

      const navbarHeight = Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--navbar-height'),
      ) || 74;
      const hideLauncher = isHideZoneActive(hideZone, navbarHeight);

      setShowLauncher(!hideLauncher);

      if (hideLauncher && isOpenRef.current) {
        setIsOpen(false);
      }
    };

    rafId = requestAnimationFrame(() => {
      const hideZone = findChatbotHideZone();
      updateLauncherVisibility();

      if (!hideZone) return;

      const observer = new IntersectionObserver(updateLauncherVisibility, {
        threshold: [0, 0.12, 0.24, 0.4, 0.6, 0.8, 1],
        rootMargin: '-74px 0px -12% 0px',
      });

      observer.observe(hideZone);
      window.addEventListener('scroll', updateLauncherVisibility, { passive: true });
      window.addEventListener('resize', updateLauncherVisibility);

      cleanup = () => {
        observer.disconnect();
        window.removeEventListener('scroll', updateLauncherVisibility);
        window.removeEventListener('resize', updateLauncherVisibility);
      };
    });

    return () => {
      cancelAnimationFrame(rafId);
      cleanup();
    };
  }, [pathname, portalRouteHidden, isPageModalActive]);

  const handleGoalClick = useCallback((goal) => {
    const response = goal.buildResponse();
    setActiveMode('guide');
    appendMessages([
      { id: uid('user'), type: 'user', text: goal.label },
      { id: uid('bot'), type: 'bot', goals: [], ...response },
    ], 'latest');
  }, [appendMessages]);

  const handleTopicClick = useCallback((topic) => {
    setActiveMode('guide');
    appendMessages([
      { id: uid('user'), type: 'user', text: topic.label },
      buildTopicMessage(topic),
    ], 'latest');
  }, [appendMessages]);

  const handleSearchSelect = useCallback((result) => {
    if (!result?.href) return;
    router.push(result.href);
    setIsOpen(false);
    setSearchValue('');
  }, [router]);

  const handleSearchKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && searchResults.length) {
      e.preventDefault();
      handleSearchSelect(searchResults[0]);
    }
  }, [searchResults, handleSearchSelect]);

  const handleLinkClick = useCallback(() => {
    setIsOpen(false);
    setSearchValue('');
    setChatValue('');
  }, []);

  const handleChatSubmit = useCallback((e) => {
    e.preventDefault();

    const query = chatValue.trim();
    if (!query) return;

    appendMessages([
      { id: uid('user'), type: 'user', text: query },
      buildAnswerForQuery(query),
    ], 'latest');

    setChatValue('');
    requestAnimationFrame(() => chatInputRef.current?.focus());
  }, [appendMessages, chatValue]);

  const handleShowTopics = useCallback(() => {
    setActiveMode('guide');
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
    setActiveMode('guide');
    appendMessages([{
      id: uid('home'),
      type: 'bot',
      badge: 'Start',
      text: 'Choose a guided action below to continue.',
      goals: buildGoals(pathname),
      topics: [],
      actions: [],
      links: [],
      quickReplies: QUICK_REPLIES.start,
      showUtilities: false,
    }], 'latest');
  }, [appendMessages, pathname]);

  const handleShowPageGuide = useCallback(() => {
    setActiveMode('page');
    appendMessages([buildPageGuideMessage(pathname)], 'latest');
  }, [appendMessages, pathname]);

  const handleRefreshChat = useCallback(() => {
    pendingScrollRef.current = 'top';
    setActiveMode('guide');
    setSearchValue('');
    setChatValue('');
    setMessages([buildWelcomeMessage(pathname)]);
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }, [pathname]);

  const handleQuickReplyClick = useCallback((reply) => {
    if (!reply) return;

    if (reply.type === 'mode' && reply.mode === 'page') {
      setActiveMode('page');
      appendMessages([
        { id: uid('user'), type: 'user', text: reply.label },
        buildPageGuideMessage(pathname),
      ], 'latest');
      return;
    }

    if (reply.type === 'topic') {
      const topic = TOPICS.find((item) => item.key === reply.topicKey);
      if (!topic) return;
      setActiveMode('guide');
      appendMessages([
        { id: uid('user'), type: 'user', text: reply.label },
        buildTopicMessage(topic),
      ], 'latest');
      return;
    }

    if (reply.type === 'page') {
      const answer = buildSiteNodeMessage(reply.pageKey);
      if (!answer) return;
      setActiveMode('guide');
      appendMessages([
        { id: uid('user'), type: 'user', text: reply.label },
        answer,
      ], 'latest');
      return;
    }

    if (reply.type === 'goal') {
      const goal = buildGoals(pathname).find((item) => item.key === reply.goalKey);
      if (!goal) return;
      const response = goal.buildResponse();
      setActiveMode('guide');
      appendMessages([
        { id: uid('user'), type: 'user', text: reply.label },
        { id: uid('bot'), type: 'bot', goals: [], ...response },
      ], 'latest');
      return;
    }

    if (reply.type === 'query') {
      setActiveMode('guide');
      appendMessages([
        { id: uid('user'), type: 'user', text: reply.label },
        buildAnswerForQuery(reply.query || reply.label),
      ], 'latest');
    }
  }, [appendMessages, pathname]);

  if (portalRouteHidden) {
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
          <div className="chatbot-header-actions">
            <button
              type="button"
              className="chatbot-header-btn"
              onClick={handleRefreshChat}
              aria-label="Refresh MEMPCOnnect chat"
              title="Refresh chat"
            >
              <AppIcon name="refresh" className="chatbot-header-btn-icon" />
            </button>
            <button
              type="button"
              className="chatbot-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close MEMPCOnnect"
            >
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
        </div>

        {/* Page chip */}
        <div className="chatbot-page-chip" aria-live="polite">
          <div className="chatbot-page-context">
            <span>Viewing</span>
            <strong>{pageContext.pageLabel}</strong>
          </div>
          <div className="chatbot-page-actions" role="toolbar" aria-label="Chatbot navigation">
            <button
              type="button"
              className={`chatbot-page-action ${activeMode === 'guide' ? 'is-active' : ''}`}
              onClick={handleShowHome}
              aria-pressed={activeMode === 'guide'}
            >
              Guide
            </button>
            <button
              type="button"
              className={`chatbot-page-action ${activeMode === 'page' ? 'is-active' : ''}`}
              onClick={handleShowPageGuide}
              aria-pressed={activeMode === 'page'}
            >
              This Page
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="chatbot-search-shell">
          <div className="chatbot-control-label">Find a page</div>
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
              placeholder="Search services, pages, or offices"
              aria-label="Find MEMPCO pages and services"
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
              onQuickReplyClick={handleQuickReplyClick}
              onLinkClick={handleLinkClick}
              onShowTopics={handleShowTopics}
              onShowHome={handleShowHome}
            />
          ))}
          <div ref={endRef} aria-hidden="true" />
        </div>

        {/* Ask bar */}
        <form className="chatbot-askbar" onSubmit={handleChatSubmit}>
          <label className="chatbot-control-label" htmlFor="chatbot-ask-input">
            Ask MEMPCOnnect
          </label>
          <div className="chatbot-askbar-row">
            <input
              id="chatbot-ask-input"
              ref={chatInputRef}
              type="text"
              value={chatValue}
              onChange={(e) => setChatValue(e.target.value)}
              className="chatbot-askbar-input"
              placeholder="Ask about loans, savings, branches..."
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="submit"
              className="chatbot-askbar-submit"
              disabled={!chatValue.trim()}
              aria-label="Ask MEMPCOnnect"
            >
              <AppIcon name="chevronRight" className="chatbot-askbar-submit-icon" />
            </button>
          </div>
        </form>

      </div>

      {/* Launcher */}
      <div
        className={[
          'chatbot-launcher',
          showLauncher ? 'chatbot-launcher--visible' : 'chatbot-launcher--hidden',
        ].filter(Boolean).join(' ')}
      >
        <button
          type="button"
          className="chatbot-toggle"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label={isOpen ? 'Close MEMPCOnnect' : 'Open MEMPCOnnect'}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          title="MEMPCOnnect"
        >
          <span className="chatbot-toggle-prompt" aria-hidden="true">Need help?</span>
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
