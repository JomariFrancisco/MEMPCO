'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BriefcaseBusiness,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  ExternalLink,
  FileText,
  ImagePlus,
  LayoutDashboard,
  LogOut,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  UploadCloud,
  UsersRound,
  X,
} from 'lucide-react';
import {
  getCurrentPortalUser,
  getPortalHomeRoute,
  isHrAdminRole,
  isInactivePortalUser,
  signOutPortal,
} from '@/lib/auth/portalAuth';
import {
  deleteJobApplication,
  deleteJobOpening,
  listJobApplications,
  listJobOpenings,
  saveJobOpening,
  updateJobApplication,
} from '@/lib/hr/hrContent';
import '../admin-dashboard/admin-dashboard.css';
import './hr-admin.css';

const ADMIN_DASHBOARD_ROUTE = '/admin-dashboard';
const HRMAX_ROUTE = 'http://120.28.214.253/hrmax/';
const JOBS_ROUTE = '/jobs';

const EMPTY_OPENING = {
  id: '',
  slug: '',
  title: '',
  department: '',
  location: '',
  type: 'Full-time',
  description: '',
  image: '',
  status: 'draft',
  publishedAt: '',
  createdBy: '',
};

const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Temporary', 'Internship'];
const APPLICATION_STATUSES = ['new', 'reviewing', 'shortlisted', 'interview', 'hired', 'rejected', 'archived'];
const ACTIONABLE_APPLICATION_STATUSES = new Set(['new', 'reviewing', 'shortlisted']);
const FINAL_APPLICATION_STATUSES = new Set(['hired', 'rejected']);
const JOB_POSTS_PER_PAGE = 5;
const HR_SELECTED_DAY_PAGE_SIZE = 2;
const HR_REPORT_APPLICANTS_PAGE_SIZE = 3;
const HR_ACTION_TYPES = [
  { value: 'screening', label: 'Screening Update', status: 'reviewing' },
  { value: 'shortlist', label: 'Shortlist Applicant', status: 'shortlisted' },
  { value: 'interview', label: 'Schedule Interview', status: 'interview' },
  { value: 'hired', label: 'Mark Hired', status: 'hired' },
  { value: 'rejected', label: 'Mark Rejected', status: 'rejected' },
  { value: 'archive', label: 'Archive Applicant', status: 'archived' },
];
const INTERVIEW_TYPES = ['On-site', 'Phone', 'Video', 'Panel', 'Final'];
const EMPTY_APPLICATION_DRAFT = {
  actionType: 'screening',
  status: 'new',
  interviewAt: '',
  interviewType: 'On-site',
  interviewer: '',
  hrNotes: '',
  remarksByActionType: {},
};

const normalizeText = (value) => String(value || '').toLowerCase();

const formatDate = (value) => {
  if (!value) return 'Not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const getApplicantNumber = (application = {}) => {
  const submittedAt = application.createdAt ? new Date(application.createdAt) : null;
  const year = submittedAt && !Number.isNaN(submittedAt.getTime())
    ? submittedAt.getFullYear()
    : new Date().getFullYear();
  const recordKey = String(application.id || application.email || application.applicantName || '000000')
    .replace(/[^a-z0-9]/gi, '')
    .slice(-6)
    .toUpperCase()
    .padStart(6, '0');

  return `APP-${year}-${recordKey}`;
};

const isFinalApplicationStatus = (status = '') => FINAL_APPLICATION_STATUSES.has(status);

const getDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const formatReportDate = (date, options) =>
  new Intl.DateTimeFormat('en-US', options).format(date);

const toDateTimeLocalValue = (value = '') => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
};

const getActionType = (value = '') =>
  HR_ACTION_TYPES.find((action) => action.value === value) || HR_ACTION_TYPES[0];

const createHrReportEvent = (application, { timestamp, label, status, type }) => {
  if (!timestamp) return null;

  const reportDate = new Date(timestamp);
  if (Number.isNaN(reportDate.getTime())) return null;

  return {
    application,
    key: getDateKey(reportDate),
    timestamp: reportDate.getTime(),
    label,
    type,
    status: status || application.status || 'new',
    reportDate,
    reportDateLabel: formatDate(timestamp),
  };
};

const getApplicationReportEvents = (application = {}) => [
  createHrReportEvent(application, {
    timestamp: application.createdAt,
    label: 'Application Submitted',
    status: 'new',
    type: 'submitted',
  }),
].filter(Boolean);

const isApplicationInMonth = (application = {}, monthDate = new Date()) => {
  const submittedAt = new Date(application.createdAt || '');
  if (Number.isNaN(submittedAt.getTime())) return false;

  return (
    submittedAt.getFullYear() === monthDate.getFullYear() &&
    submittedAt.getMonth() === monthDate.getMonth()
  );
};

const getHrCalendarMonth = (applications = []) => {
  const latestTime = applications.reduce((latest, application) => {
    const latestEventTime = getApplicationReportEvents(application).reduce(
      (eventLatest, event) => Math.max(eventLatest, event.timestamp),
      0,
    );

    return Math.max(latest, latestEventTime);
  }, 0);
  const date = latestTime ? new Date(latestTime) : new Date();

  date.setDate(1);
  date.setHours(0, 0, 0, 0);

  return date;
};

const buildHrCalendarMonth = (applications = [], monthDate = new Date()) => {
  const target = new Date(monthDate);
  const year = target.getFullYear();
  const month = target.getMonth();
  const monthStart = new Date(year, month, 1);
  const gridStart = new Date(monthStart);
  const counts = new Map();

  gridStart.setDate(monthStart.getDate() - monthStart.getDay());

  applications.forEach((application) => {
    getApplicationReportEvents(application).forEach((event) => {
      counts.set(event.key, (counts.get(event.key) || 0) + 1);
    });
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
  const currentMonthCells = cells.filter((cell) => cell.isCurrentMonth);
  const maxCount = cells.reduce((max, cell) => Math.max(max, cell.count), 0);
  const monthTotal = currentMonthCells.reduce((total, cell) => total + cell.count, 0);
  const activeDays = currentMonthCells.filter((cell) => cell.count > 0).length;
  const busiestDay = currentMonthCells.reduce(
    (busiest, cell) => (cell.count > busiest.count ? cell : busiest),
    { count: 0, day: 0, key: '' },
  );

  return {
    title: formatReportDate(monthStart, { month: 'long', year: 'numeric' }),
    cells,
    maxCount,
    monthTotal,
    activeDays,
    busiestDay,
    averagePerActiveDay: activeDays ? (monthTotal / activeDays).toFixed(1) : '0',
  };
};

const uniqueApplicationsById = (applications = []) => {
  const seen = new Set();

  return applications.filter((application) => {
    const key = application.id || getApplicantNumber(application);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const statusLabel = (value) =>
  String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const getTime = (value) => {
  const time = new Date(value || '').getTime();
  return Number.isNaN(time) ? 0 : time;
};

const getAgeInDays = (value) => {
  const time = getTime(value);
  if (!time) return 0;
  return Math.max(0, Math.floor((Date.now() - time) / 86400000));
};

const sortNewestFirst = (items = []) =>
  [...items].sort((a, b) => getTime(b.createdAt || b.updatedAt) - getTime(a.createdAt || a.updatedAt));

const sortOpeningsByOption = (items = [], option = 'newest') => {
  const sortedItems = [...items];

  if (option === 'oldest') {
    return sortedItems.sort((a, b) => getTime(a.createdAt || a.updatedAt) - getTime(b.createdAt || b.updatedAt));
  }

  if (option === 'title') {
    return sortedItems.sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));
  }

  if (option === 'department') {
    return sortedItems.sort((a, b) => String(a.department || '').localeCompare(String(b.department || '')));
  }

  if (option === 'status') {
    return sortedItems.sort((a, b) => String(a.status || '').localeCompare(String(b.status || '')));
  }

  return sortNewestFirst(sortedItems);
};

const sortApplicationsByOption = (items = [], option = 'newest') => {
  const sortedItems = [...items];

  if (option === 'oldest') {
    return sortedItems.sort((a, b) => getTime(a.createdAt || a.updatedAt) - getTime(b.createdAt || b.updatedAt));
  }

  if (option === 'name') {
    return sortedItems.sort((a, b) => String(a.applicantName || '').localeCompare(String(b.applicantName || '')));
  }

  if (option === 'role') {
    return sortedItems.sort((a, b) => String(a.jobTitle || '').localeCompare(String(b.jobTitle || '')));
  }

  if (option === 'status') {
    return sortedItems.sort((a, b) => String(a.status || '').localeCompare(String(b.status || '')));
  }

  return sortNewestFirst(sortedItems);
};

const escapeCsvValue = (value = '') => {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const buildApplicationHistoryEntry = (status, user) => ({
  status,
  label: `Moved to ${statusLabel(status)}`,
  timestamp: new Date().toISOString(),
  updatedBy: user?.id || '',
  updatedByName: user?.name || 'HR',
});

const buildApplicationActionHistoryEntry = (updates = {}, user = null) => {
  const action = getActionType(updates.actionType);
  const status = updates.status || action.status || 'reviewing';
  const remarks = String(updates.hrNotes || '').trim();
  const timestamp = new Date().toISOString();
  const entry = {
    ...buildApplicationHistoryEntry(status, user),
    label: action.label,
    actionType: action.value,
    timestamp,
  };

  if (updates.interviewAt) entry.interviewAt = updates.interviewAt;
  if (updates.interviewType) entry.interviewType = updates.interviewType;
  if (updates.interviewer) entry.interviewer = updates.interviewer;

  if (remarks) {
    entry.remarks = remarks;
    entry.remarksHistory = [
      {
        text: remarks,
        timestamp,
        updatedBy: user?.id || '',
        updatedByName: user?.name || 'HR',
      },
    ];
  }

  return entry;
};

const isSameActionHistoryEntry = (entry = {}, actionEntry = {}) =>
  entry.status === actionEntry.status &&
  entry.actionType === actionEntry.actionType &&
  (entry.remarks || '') === (actionEntry.remarks || '') &&
  (entry.interviewAt || '') === (actionEntry.interviewAt || '') &&
  (entry.interviewType || '') === (actionEntry.interviewType || '') &&
  (entry.interviewer || '') === (actionEntry.interviewer || '');

const buildDraftActionHistoryEntries = (updates = {}, user = null) => {
  const remarksByActionType = updates.actionRemarksByType || {};
  const currentActionIndex = HR_ACTION_TYPES.findIndex((action) => action.value === updates.actionType);
  const maxActionIndex = currentActionIndex >= 0 ? currentActionIndex : 0;

  return HR_ACTION_TYPES.slice(0, maxActionIndex + 1)
    .map((action) => {
      const actionRemarks = String(
        action.value === updates.actionType
          ? updates.hrNotes || remarksByActionType[action.value] || ''
          : remarksByActionType[action.value] || '',
      ).trim();

      if (!actionRemarks && action.value !== updates.actionType) return null;

      return buildApplicationActionHistoryEntry(
        {
          ...updates,
          actionType: action.value,
          status: action.status,
          hrNotes: actionRemarks,
          interviewAt: action.value === updates.actionType ? updates.interviewAt : '',
          interviewType: action.value === updates.actionType ? updates.interviewType : '',
          interviewer: action.value === updates.actionType ? updates.interviewer : '',
        },
        user,
      );
    })
    .filter(Boolean);
};

const getBaseApplicationHistory = (application = {}) =>
  application.statusHistory?.length
    ? application.statusHistory
    : [
        {
          status: 'new',
          label: 'Application Submitted',
          timestamp: application.createdAt,
          updatedByName: application.applicantName || 'Applicant',
        },
      ];

const getEntryRemarkHistory = (entry = {}) => {
  const history = Array.isArray(entry.remarksHistory)
    ? entry.remarksHistory
    : Array.isArray(entry.remarkHistory)
      ? entry.remarkHistory
      : [];
  const normalizedHistory = history
    .map((remark) => ({
      text: String(remark?.text ?? remark?.remarks ?? remark ?? '').trim(),
      timestamp: remark?.timestamp || remark?.remarkUpdatedAt || entry.remarkUpdatedAt || entry.timestamp || '',
      updatedBy: remark?.updatedBy || remark?.remarkUpdatedBy || entry.remarkUpdatedBy || '',
      updatedByName: remark?.updatedByName || remark?.remarkUpdatedByName || entry.remarkUpdatedByName || '',
    }))
    .filter((remark) => remark.text);
  const legacyRemark = String(entry.remarks || '').trim();

  if (
    legacyRemark &&
    !normalizedHistory.some((remark) => remark.text === legacyRemark)
  ) {
    normalizedHistory.push({
      text: legacyRemark,
      timestamp: entry.remarkUpdatedAt || entry.timestamp || '',
      updatedBy: entry.remarkUpdatedBy || '',
      updatedByName: entry.remarkUpdatedByName || entry.updatedByName || '',
    });
  }

  return normalizedHistory;
};

const applyRemarkToStatusHistory = (application = {}, remarks = '', user = null, statusOverride = '') => {
  const targetStatus = statusOverride || application.status || 'new';
  const history = getBaseApplicationHistory(application).map((entry) => ({ ...entry }));
  const targetIndex = history
    .map((entry) => entry.status)
    .lastIndexOf(targetStatus);
  const nextRemark = String(remarks ?? '').trim();
  const remarkEntry = {
    text: nextRemark,
    timestamp: new Date().toISOString(),
    updatedBy: user?.id || '',
    updatedByName: user?.name || 'HR',
  };

  if (!nextRemark) return history;

  const buildRemarkPatch = (entry = {}) => {
    const remarksHistory = getEntryRemarkHistory(entry);
    const latestRemark = remarksHistory.at(-1);
    const nextRemarksHistory = latestRemark?.text === nextRemark
      ? remarksHistory
      : [...remarksHistory, remarkEntry];

    return {
      remarks: nextRemark,
      remarksHistory: nextRemarksHistory,
      remarkUpdatedAt: nextRemarksHistory.at(-1)?.timestamp || remarkEntry.timestamp,
      remarkUpdatedBy: nextRemarksHistory.at(-1)?.updatedBy || remarkEntry.updatedBy,
      remarkUpdatedByName: nextRemarksHistory.at(-1)?.updatedByName || remarkEntry.updatedByName,
    };
  };

  const remarkPatch = buildRemarkPatch(targetIndex >= 0 ? history[targetIndex] : {});

  if (targetIndex >= 0) {
    history[targetIndex] = {
      ...history[targetIndex],
      ...remarkPatch,
    };
    return history;
  }

  return [
    ...history,
    {
      ...buildApplicationHistoryEntry(targetStatus, user),
      label: `Current Status: ${statusLabel(targetStatus)}`,
      ...remarkPatch,
    },
  ];
};

const getStatusRemarkItems = (application = {}, timeline = []) => {
  const remarkItems = timeline.flatMap((entry) =>
    getEntryRemarkHistory(entry).map((remark) => ({
      status: entry.status || 'new',
      remarks: remark.text,
      timestamp: remark.timestamp,
      updatedByName: remark.updatedByName,
    })),
  );
  const currentRemark = String(application.hrNotes || '').trim();
  const currentStatus = application.status || 'new';
  const latestCurrentRemark = [...remarkItems]
    .reverse()
    .find((entry) => entry.status === currentStatus);

  if (currentRemark && latestCurrentRemark?.remarks !== currentRemark) {
    remarkItems.push({
      status: currentStatus,
      remarks: currentRemark,
      timestamp: application.updatedAt || application.createdAt || '',
      updatedByName: 'HR',
    });
  }

  return remarkItems;
};

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

const getResumeFileName = (application = {}) =>
  `${String(application.applicantName || 'applicant')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') || 'applicant'}-resume`;

const dataUrlToBlobUrl = (dataUrl = '') => {
  const [meta = '', encodedData = ''] = String(dataUrl).split(',');
  const mimeMatch = meta.match(/^data:([^;]+);base64$/i);

  if (!mimeMatch || !encodedData) {
    throw new Error('This resume file cannot be previewed.');
  }

  const byteCharacters = window.atob(encodedData);
  const byteArrays = [];
  const sliceSize = 1024;

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);
    const byteNumbers = new Array(slice.length);

    for (let index = 0; index < slice.length; index += 1) {
      byteNumbers[index] = slice.charCodeAt(index);
    }

    byteArrays.push(new Uint8Array(byteNumbers));
  }

  return URL.createObjectURL(new Blob(byteArrays, { type: mimeMatch[1] }));
};

const isSuperAdminRole = (role = '') => String(role || '').trim().toLowerCase() === 'superadmin';

const escapeReportHtml = (value = '') =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

function StatCard({ icon: IconComponent, label, value, meta, active = false, onClick }) {
  const CardElement = onClick ? 'button' : 'article';
  const cardProps = onClick
    ? {
        type: 'button',
        onClick,
        'aria-pressed': active,
      }
    : {};

  return (
    <CardElement
      className={`stat-card glass ${onClick ? 'hr-stat-button' : 'hr-stat-display'} ${active ? 'active' : ''}`}
      {...cardProps}
    >
      <div className="stat-card-head">
        <span className="stat-icon">
          <IconComponent className="admin-mono-icon" aria-hidden="true" />
        </span>
        <span className="stat-label">{label}</span>
      </div>
      <div>
        <strong className="stat-value">{value}</strong>
        <small className="stat-meta">{meta}</small>
      </div>
    </CardElement>
  );
}

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Unable to read the selected image.'));
    reader.readAsDataURL(file);
  });

const compressImageFile = async (file) => {
  if (!file?.type?.startsWith('image/')) {
    throw new Error('Choose an image file.');
  }

  const source = await fileToDataUrl(file);

  if (file.type === 'image/svg+xml') {
    return source;
  }

  return new Promise((resolve) => {
    const image = new Image();

    image.onload = () => {
      const maxWidth = 1600;
      const scale = Math.min(1, maxWidth / image.width);
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) {
        resolve(source);
        return;
      }

      canvas.width = width;
      canvas.height = height;
      context.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.86));
    };

    image.onerror = () => resolve(source);
    image.src = source;
  });
};

const formatFileSize = (bytes = 0) => {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

export default function HrAdminPage() {
  const router = useRouter();
  const openingEditorRef = useRef(null);
  const openingTitleInputRef = useRef(null);
  const resumePreviewUrlsRef = useRef([]);
  const [user, setUser] = useState(null);
  const [checked, setChecked] = useState(false);
  const [openings, setOpenings] = useState([]);
  const [applications, setApplications] = useState([]);
  const [editingOpening, setEditingOpening] = useState(EMPTY_OPENING);
  const [isOpeningEditorVisible, setIsOpeningEditorVisible] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [selectedReportApplicationId, setSelectedReportApplicationId] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [openingStatusFilter, setOpeningStatusFilter] = useState('open');
  const [openingSearch, setOpeningSearch] = useState('');
  const [openingSort, setOpeningSort] = useState('newest');
  const [openingPage, setOpeningPage] = useState(1);
  const [applicationSearch, setApplicationSearch] = useState('');
  const [applicationStatus, setApplicationStatus] = useState('all');
  const [applicationSort, setApplicationSort] = useState('newest');
  const [reportApplicantsPage, setReportApplicantsPage] = useState(1);
  const [reportCalendarMonth, setReportCalendarMonth] = useState(null);
  const [selectedReportDate, setSelectedReportDate] = useState('');
  const [selectedReportDatePage, setSelectedReportDatePage] = useState(1);
  const [applicationDraft, setApplicationDraft] = useState(EMPTY_APPLICATION_DRAFT);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [imageUploadMeta, setImageUploadMeta] = useState('');
  const [notice, setNotice] = useState('');
  const imageInputRef = useRef(null);
  const canDeleteApplications = isSuperAdminRole(user?.role);

  const loadHrData = async () => {
    setIsLoading(true);
    setNotice('');
    try {
      const [openingRows, applicationRows] = await Promise.all([
        listJobOpenings(),
        listJobApplications(),
      ]);
      setOpenings(sortNewestFirst(openingRows));
      setApplications(sortNewestFirst(applicationRows));
      setSelectedApplication((current) => {
        if (!current) return null;
        return applicationRows.find((application) => application.id === current.id) || null;
      });
    } catch (error) {
      setNotice(error.message || 'Unable to load HR records.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      const activeUser = await getCurrentPortalUser().catch(() => null);

      if (cancelled) return;

      if (!activeUser) {
        router.replace('/LogIn');
        return;
      }

      if (isInactivePortalUser(activeUser)) {
        await signOutPortal().catch(() => {});
        router.replace('/LogIn');
        return;
      }

      if (!isHrAdminRole(activeUser.role)) {
        router.replace(getPortalHomeRoute(activeUser.role));
        return;
      }

      setUser(activeUser);
      setChecked(true);
    };

    verify();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!checked || !user) return;
    loadHrData();
  }, [checked, user]);

  useEffect(
    () => () => {
      resumePreviewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      resumePreviewUrlsRef.current = [];
    },
    [],
  );

  useEffect(() => {
    const selectedStatus = selectedApplication?.status || 'new';
    const matchingAction =
      HR_ACTION_TYPES.find((action) => action.status === selectedStatus)?.value || 'screening';

    setApplicationDraft({
      ...EMPTY_APPLICATION_DRAFT,
      actionType: matchingAction,
      status: selectedStatus,
      interviewAt: toDateTimeLocalValue(selectedApplication?.interviewAt || ''),
      interviewType: selectedApplication?.interviewType || EMPTY_APPLICATION_DRAFT.interviewType,
      interviewer: selectedApplication?.interviewer || '',
      hrNotes: selectedApplication?.hrNotes || '',
      remarksByActionType: {
        [matchingAction]: selectedApplication?.hrNotes || '',
      },
    });
  }, [selectedApplication]);

  useEffect(() => {
    if (!notice) return undefined;

    const timeoutId = window.setTimeout(() => {
      setNotice('');
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  const openingStats = useMemo(
    () => ({
      total: openings.length,
      open: openings.filter((opening) => opening.status === 'open').length,
      draft: openings.filter((opening) => opening.status === 'draft').length,
      closed: openings.filter((opening) => opening.status === 'closed').length,
      applications: applications.length,
      newApplications: applications.filter((application) => application.status === 'new').length,
      interviews: applications.filter((application) => application.status === 'interview').length,
      hired: applications.filter((application) => application.status === 'hired').length,
    }),
    [applications, openings],
  );

  const filteredOpenings = useMemo(() => {
    const query = normalizeText(openingSearch);
    const source = openings.filter(
      (opening) => openingStatusFilter === 'all' || opening.status === openingStatusFilter,
    );
    const searchedOpenings = query
      ? source.filter((opening) =>
          [opening.title, opening.department, opening.location, opening.status]
            .map(normalizeText)
            .some((value) => value.includes(query)),
        )
      : source;

    return sortOpeningsByOption(searchedOpenings, openingSort);
  }, [openingSearch, openingSort, openingStatusFilter, openings]);

  const openingPageCount = Math.max(1, Math.ceil(filteredOpenings.length / JOB_POSTS_PER_PAGE));
  const paginatedOpenings = useMemo(() => {
    const startIndex = (openingPage - 1) * JOB_POSTS_PER_PAGE;
    return filteredOpenings.slice(startIndex, startIndex + JOB_POSTS_PER_PAGE);
  }, [filteredOpenings, openingPage]);

  useEffect(() => {
    setOpeningPage(1);
  }, [openingSearch, openingStatusFilter]);

  useEffect(() => {
    setOpeningPage((current) => Math.min(current, openingPageCount));
  }, [openingPageCount]);

  const selectedReportApplication = useMemo(
    () => applications.find((application) => application.id === selectedReportApplicationId) || null,
    [applications, selectedReportApplicationId],
  );

  const filteredApplications = useMemo(() => {
    const query = normalizeText(applicationSearch);
    const searchedApplications = applications.filter((application) => {
      const matchesStatus = applicationStatus === 'all' || application.status === applicationStatus;
      const matchesSearch =
        !query ||
        [
          application.applicantName,
          application.email,
          application.phone,
          application.jobTitle,
          application.status,
          getApplicantNumber(application),
        ]
          .map(normalizeText)
          .some((value) => value.includes(query));

      return matchesStatus && matchesSearch;
    });

    return sortApplicationsByOption(searchedApplications, applicationSort);
  }, [applicationSearch, applicationSort, applicationStatus, applications]);

  const reportApplicantsPageCount = Math.max(
    1,
    Math.ceil(filteredApplications.length / HR_REPORT_APPLICANTS_PAGE_SIZE),
  );
  const pagedReportApplications = filteredApplications.slice(
    (reportApplicantsPage - 1) * HR_REPORT_APPLICANTS_PAGE_SIZE,
    reportApplicantsPage * HR_REPORT_APPLICANTS_PAGE_SIZE,
  );

  useEffect(() => {
    setReportApplicantsPage(1);
  }, [applicationSearch, applicationSort, applicationStatus]);

  useEffect(() => {
    setReportApplicantsPage((current) => Math.min(current, reportApplicantsPageCount));
  }, [reportApplicantsPageCount]);

  useEffect(() => {
    if (
      selectedReportApplicationId &&
      !filteredApplications.some((application) => application.id === selectedReportApplicationId)
    ) {
      setSelectedReportApplicationId('');
    }
  }, [filteredApplications, selectedReportApplicationId]);

  const activeReportCalendarMonth = reportCalendarMonth || getHrCalendarMonth(filteredApplications);
  const reportMonthApplications = useMemo(
    () => filteredApplications.filter((application) => isApplicationInMonth(application, activeReportCalendarMonth)),
    [activeReportCalendarMonth, filteredApplications],
  );
  const reportMonthAllApplications = useMemo(
    () => applications.filter((application) => isApplicationInMonth(application, activeReportCalendarMonth)),
    [activeReportCalendarMonth, applications],
  );
  const selectedReportDateApplications = useMemo(
    () =>
      selectedReportDate
        ? filteredApplications
            .flatMap((application) =>
              getApplicationReportEvents(application)
                .filter((event) => event.key === selectedReportDate)
                .map((event) => ({
                  ...application,
                  reportEventLabel: event.label,
                  reportEventType: event.type,
                  reportEventTimestamp: event.timestamp,
                  reportDateLabel: event.reportDateLabel,
                  reportStatus: event.status,
                })),
            )
            .sort((a, b) => b.reportEventTimestamp - a.reportEventTimestamp || getTime(b.createdAt) - getTime(a.createdAt))
        : [],
    [filteredApplications, selectedReportDate],
  );
  const selectedReportDateTotalPages = Math.max(
    1,
    Math.ceil(selectedReportDateApplications.length / HR_SELECTED_DAY_PAGE_SIZE),
  );
  const pagedSelectedReportDateApplications = selectedReportDateApplications.slice(
    (selectedReportDatePage - 1) * HR_SELECTED_DAY_PAGE_SIZE,
    selectedReportDatePage * HR_SELECTED_DAY_PAGE_SIZE,
  );

  useEffect(() => {
    setSelectedReportDatePage(1);
  }, [selectedReportDate]);

  useEffect(() => {
    setSelectedReportDatePage((current) => Math.min(current, selectedReportDateTotalPages));
  }, [selectedReportDateTotalPages]);

  const getApplicationsForStatus = (status = 'all') =>
    sortNewestFirst(applications).filter(
      (application) => status === 'all' || application.status === status,
    );

  const getReportApplications = (status = applicationStatus) => {
    const query = normalizeText(applicationSearch);

    return sortNewestFirst(applications).filter((application) => {
      const matchesStatus = status === 'all' || application.status === status;
      const matchesSearch =
        !query ||
        [
          application.applicantName,
          application.email,
          application.phone,
          application.jobTitle,
          application.status,
        ]
          .map(normalizeText)
          .some((value) => value.includes(query));

      return matchesStatus && matchesSearch;
    });
  };

  const getApplicationStatusTimeline = (application = {}) => {
    const baseHistory = getBaseApplicationHistory(application);
    const currentStatus = application.status || 'new';
    const alreadyHasCurrentStatus = baseHistory.some((entry) => entry.status === currentStatus);

    if (alreadyHasCurrentStatus) return baseHistory;

    return [
      ...baseHistory,
      {
        status: currentStatus,
        label: `Current Status: ${statusLabel(currentStatus)}`,
        timestamp: application.updatedAt || application.createdAt,
        updatedByName: 'HR',
      },
    ];
  };

  const getTimelineEntryLabel = (entry = {}) => {
    if (entry.actionType) return getActionType(entry.actionType).label;
    if (entry.label) return entry.label;
    if (entry.status === 'new') return 'Application Submitted';
    return `Moved to ${statusLabel(entry.status)}`;
  };

  const isApplicationSubmittedEntry = (entry = {}) =>
    !entry.actionType &&
    (entry.label === 'Application Submitted' || entry.status === 'new');

  const getTimelineEntryMeta = (entry = {}) => {
    if (isApplicationSubmittedEntry(entry)) {
      return `Uploaded by ${entry.updatedByName || 'Applicant'}`;
    }

    return entry.updatedByName
      ? `Updated by ${entry.updatedByName}`
      : 'Applicant record movement';
  };

  const getApplicationStatusRemarks = (application = {}) => {
    const timeline = getApplicationStatusTimeline(application);
    return getStatusRemarkItems(application, timeline);
  };

  const openingStatusFilters = useMemo(
    () => [
      { value: 'all', label: 'All', count: openingStats.total, accessCard: '' },
      { value: 'open', label: 'Open', count: openingStats.open, accessCard: 'openRoles' },
      { value: 'draft', label: 'Drafts', count: openingStats.draft, accessCard: 'drafts' },
      { value: 'closed', label: 'Closed', count: openingStats.closed, accessCard: '' },
    ],
    [openingStats],
  );

  const openingPanelLabel =
    openingStatusFilter === 'open'
      ? 'Published Job Posts'
      : openingStatusFilter === 'draft'
        ? 'Draft Job Posts'
        : openingStatusFilter === 'closed'
          ? 'Closed Job Posts'
        : 'All Job Posts';

  const openingEmptyMessage =
    openingStatusFilter === 'open'
      ? 'No published job posts found.'
      : openingStatusFilter === 'draft'
        ? 'No draft job posts found.'
        : openingStatusFilter === 'closed'
          ? 'No closed job posts found.'
        : 'No job posts found.';

  const applicationPanelLabel = applicationStatus === 'interview' ? 'Interview Queue' : 'Applicant Review';
  const applicationEmptyMessage =
    applicationStatus === 'interview'
      ? 'No applicants are marked for interview.'
      : 'No applications found.';
  const selectedApplicationLocked = isFinalApplicationStatus(selectedApplication?.status);

  const hrCommandCenter = useMemo(() => {
    const now = Date.now();
    const fourteenDaysAgo = now - 14 * 86400000;
    const actionableApplications = sortNewestFirst(
      applications.filter((application) =>
        ACTIONABLE_APPLICATION_STATUSES.has(application.status || 'new'),
      ),
    );
    const agingApplications = actionableApplications.filter(
      (application) => getTime(application.createdAt) < fourteenDaysAgo,
    );

    return {
      actionableApplications,
      agingApplications,
    };
  }, [applications]);

  const handleOpeningStatusFilterChange = (filter) => {
    setActiveTab('openings');
    setOpeningStatusFilter(filter.value);
    setOpeningPage(1);
  };

  const openApplicantRecord = (application, status = 'all') => {
    setActiveTab('applications');
    setApplicationStatus(status);
    setApplicationSearch('');
    setSelectedApplication(application || getApplicationsForStatus(status)[0] || null);
  };

  const handleSidebarTabClick = (tab) => {
    setActiveTab(tab);

    if (tab === 'dashboard') {
      setOpeningSearch('');
      setApplicationSearch('');
      return;
    }

    if (tab === 'openings') {
      setOpeningStatusFilter('all');
      setOpeningPage(1);
    }

    if (tab === 'applications' || tab === 'reports') {
      setApplicationStatus('all');
      setApplicationSearch('');
    }

    if (tab === 'applications') {
      setSelectedApplication(getApplicationsForStatus('all')[0] || null);
    }
  };

  const handleOpeningChange = (field, value) => {
    setEditingOpening((current) => ({ ...current, [field]: value }));
  };

  const handleNewOpening = () => {
    setEditingOpening(EMPTY_OPENING);
    setIsOpeningEditorVisible(true);
    setNotice('');
    setImageUploadMeta('');
    window.requestAnimationFrame(() => {
      openingEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      openingTitleInputRef.current?.focus({ preventScroll: true });
    });
  };

  const handleEditOpening = (opening) => {
    setEditingOpening(opening);
    setIsOpeningEditorVisible(true);
    setNotice('');
    setImageUploadMeta('');
  };

  const handlePosterUpload = async (event) => {
    const file = event.target.files?.[0];
    setNotice('');

    try {
      if (!file) return;
      const imageData = await compressImageFile(file);
      handleOpeningChange('image', imageData);
      setImageUploadMeta(`${file.name} - ${formatFileSize(file.size)}`);
    } catch (error) {
      setNotice(error.message || 'Unable to attach job poster image.');
    } finally {
      event.target.value = '';
    }
  };

  const handleSaveOpening = async (event, statusOverride = '') => {
    event?.preventDefault();
    setNotice('');

    const openingToSave = statusOverride
      ? { ...editingOpening, status: statusOverride }
      : editingOpening;

    if (!openingToSave.title.trim() || !openingToSave.department.trim() || !openingToSave.location.trim()) {
      setNotice('Title, department, and location are required.');
      return;
    }

    setIsSaving(true);
    try {
      const savedOpening = await saveJobOpening(openingToSave, user);
      setOpenings((current) => {
        const exists = current.some((opening) => opening.id === savedOpening.id);
        if (exists) {
          return sortNewestFirst(current.map((opening) => (opening.id === savedOpening.id ? savedOpening : opening)));
        }
        return sortNewestFirst([savedOpening, ...current]);
      });
      setEditingOpening(savedOpening);
      setNotice(`${savedOpening.title} has been saved.`);
    } catch (error) {
      setNotice(error.message || 'Unable to save this opening.');
    } finally {
      setIsSaving(false);
    }
  };

  const saveOpeningWithStatus = (status) => handleSaveOpening(null, status);

  const handleOpeningQuickStatus = async (opening, status) => {
    if (!opening?.id || opening.status === status) return;

    setIsSaving(true);
    setNotice('');
    try {
      const savedOpening = await saveJobOpening({ ...opening, status }, user);
      setOpenings((current) =>
        sortNewestFirst(current.map((item) => (item.id === savedOpening.id ? savedOpening : item))),
      );
      if (editingOpening.id === savedOpening.id) {
        setEditingOpening(savedOpening);
      }
      setNotice(`${savedOpening.title} is now ${statusLabel(savedOpening.status)}.`);
    } catch (error) {
      setNotice(error.message || 'Unable to update this job post.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteOpening = async (opening) => {
    if (!opening?.id) return;
    const confirmed = window.confirm(`Delete "${opening.title}" from job posts?`);
    if (!confirmed) return;

    setIsSaving(true);
    setNotice('');
    try {
      await deleteJobOpening(opening.id);
      setOpenings((current) => current.filter((item) => item.id !== opening.id));
      if (editingOpening.id === opening.id) {
        setEditingOpening(EMPTY_OPENING);
        setIsOpeningEditorVisible(false);
      }
      setNotice(`${opening.title} has been deleted.`);
    } catch (error) {
      setNotice(error.message || 'Unable to delete this opening.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplicationUpdate = async (updates) => {
    if (!selectedApplication?.id) return;

    if (isFinalApplicationStatus(selectedApplication.status)) {
      setNotice(`${selectedApplication.applicantName || 'This applicant'} is finalized and locked for viewing only.`);
      return;
    }

    const isStatusChange = updates.status && updates.status !== selectedApplication.status;
    const isRemarkUpdate = Object.prototype.hasOwnProperty.call(updates, 'hrNotes');
    const isActionUpdate = Object.prototype.hasOwnProperty.call(updates, 'actionType');
    let statusHistory = selectedApplication.statusHistory || [];

    if (isActionUpdate) {
      const actionEntries = buildDraftActionHistoryEntries(updates, user);
      statusHistory = actionEntries.reduce(
        (history, actionEntry) =>
          history.some((entry) => isSameActionHistoryEntry(entry, actionEntry))
            ? history
            : [...history, actionEntry],
        statusHistory,
      );
    } else if (isRemarkUpdate) {
      statusHistory = applyRemarkToStatusHistory(
        { ...selectedApplication, statusHistory },
        updates.hrNotes,
        user,
        updates.status || selectedApplication.status,
      );
    }

    const normalizedUpdates = isActionUpdate
      ? { ...updates, statusHistory }
      : isRemarkUpdate
        ? { ...updates, statusHistory }
        : updates;

    setIsSaving(true);
    setNotice('');
    try {
      const updatedApplication = await updateJobApplication(selectedApplication.id, {
        ...selectedApplication,
        ...normalizedUpdates,
        previousStatus: selectedApplication.status,
        updatedBy: user?.id || '',
        updatedByName: user?.name || 'HR',
      });
      const localStatusHistory = normalizedUpdates.statusHistory || selectedApplication.statusHistory || [];
      const nextApplication = {
        ...updatedApplication,
        statusHistory: updatedApplication.statusHistory?.length
          ? updatedApplication.statusHistory
          : localStatusHistory,
      };
      setApplications((current) =>
        sortNewestFirst(
          current.map((application) =>
            application.id === nextApplication.id ? nextApplication : application,
          ),
        ),
      );
      setSelectedApplication(nextApplication);
      if (isStatusChange) {
        setApplicationDraft({
          ...EMPTY_APPLICATION_DRAFT,
          actionType: HR_ACTION_TYPES.find((action) => action.status === nextApplication.status)?.value || 'screening',
          status: nextApplication.status || 'new',
          interviewAt: toDateTimeLocalValue(nextApplication.interviewAt || ''),
          interviewType: nextApplication.interviewType || EMPTY_APPLICATION_DRAFT.interviewType,
          interviewer: nextApplication.interviewer || '',
          hrNotes: nextApplication.hrNotes || '',
          remarksByActionType: {
            [HR_ACTION_TYPES.find((action) => action.status === nextApplication.status)?.value || 'screening']:
              nextApplication.hrNotes || '',
          },
        });
      }
      setNotice(`${nextApplication.applicantName || 'Application'} has been updated.`);
    } catch (error) {
      setNotice(error.message || 'Unable to update this application.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplicationDraftChange = (field, value) => {
    setApplicationDraft((current) => {
      if (field === 'actionType') {
        const action = getActionType(value);
        const remarksByActionType = {
          ...(current.remarksByActionType || {}),
          [current.actionType]: current.hrNotes || '',
        };

        return {
          ...current,
          remarksByActionType,
          actionType: value,
          status: action.status || current.status,
          hrNotes: remarksByActionType[value] || '',
        };
      }

      if (field === 'hrNotes') {
        return {
          ...current,
          hrNotes: value,
          remarksByActionType: {
            ...(current.remarksByActionType || {}),
            [current.actionType]: value,
          },
        };
      }

      return { ...current, [field]: value };
    });
  };

  const handleSaveApplicationDetails = async () => {
    if (isFinalApplicationStatus(selectedApplication?.status)) {
      setNotice(`${selectedApplication.applicantName || 'This applicant'} is finalized and locked for viewing only.`);
      return;
    }

    await handleApplicationUpdate({
      actionType: applicationDraft.actionType,
      status: applicationDraft.status || selectedApplication.status,
      interviewAt: applicationDraft.status === 'interview' ? applicationDraft.interviewAt : selectedApplication.interviewAt,
      interviewType: applicationDraft.status === 'interview' ? applicationDraft.interviewType : selectedApplication.interviewType,
      interviewer: applicationDraft.status === 'interview' ? applicationDraft.interviewer : selectedApplication.interviewer,
      hrNotes: applicationDraft.hrNotes,
      actionRemarksByType: {
        ...(applicationDraft.remarksByActionType || {}),
        [applicationDraft.actionType]: applicationDraft.hrNotes,
      },
    });
  };

  const handleViewReportApplication = () => {
    if (!selectedReportApplication) return;

    setSelectedApplication(selectedReportApplication);
    setApplicationStatus('all');
    setApplicationSearch('');
    setActiveTab('applications');
  };

  const changeReportCalendarMonth = (step) => {
    setReportCalendarMonth((current) => {
      const next = new Date(current || activeReportCalendarMonth);
      next.setMonth(next.getMonth() + step);
      next.setDate(1);
      next.setHours(0, 0, 0, 0);

      return next;
    });
  };

  const selectReportCalendarDate = (cell) => {
    const nextMonth = new Date(`${cell.key}T00:00:00`);

    nextMonth.setDate(1);
    nextMonth.setHours(0, 0, 0, 0);
    setReportCalendarMonth(nextMonth);
    setSelectedReportDate(cell.key);
  };

  const handleExportApplicationsCsv = (
    status = applicationStatus,
    singleApplication = null,
    applicationOverride = null,
    labelOverride = '',
  ) => {
    const exportApplications = applicationOverride || (singleApplication ? [singleApplication] : getReportApplications(status));
    const selectedStatusLabel = singleApplication
      ? getApplicantNumber(singleApplication).toLowerCase()
      : labelOverride ||
        (status === 'all'
          ? 'all-applicants'
          : `${status}-applicants`);
    const rows = [
      [
        'Applicant No.',
        'Applicant Name',
        'Email',
        'Phone',
        'Applied For',
        'Submitted',
        'Status',
        'HR Notes',
      ],
      ...exportApplications.map((application) => [
        getApplicantNumber(application),
        application.applicantName || 'Unnamed Applicant',
        application.email || '',
        application.phone || '',
        application.jobTitle || 'General Application',
        formatDate(application.createdAt),
        statusLabel(application.status),
        application.hrNotes || '',
      ]),
    ];
    const csv = rows.map((row) => row.map(escapeCsvValue).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `hr-${selectedStatusLabel}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleDeleteApplication = async () => {
    if (!selectedApplication?.id) return;
    if (!canDeleteApplications) {
      setNotice('Only the super admin can delete applicant records.');
      return;
    }

    const applicantName = selectedApplication.applicantName || 'this applicant';
    const confirmed = window.confirm(
      `Permanently delete ${applicantName}'s application record? This cannot be undone.`,
    );
    if (!confirmed) return;

    setIsSaving(true);
    setNotice('');
    try {
      await deleteJobApplication(selectedApplication.id, selectedApplication.resumeUrl, {
        requestedByRole: user?.role,
      });
      setApplications((current) =>
        current.filter((application) => application.id !== selectedApplication.id),
      );
      setSelectedApplication(null);
      setNotice(`${applicantName}'s application record has been deleted.`);
    } catch (error) {
      setNotice(error.message || 'Unable to delete this application.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleViewResume = (application) => {
    const resumeUrl = application?.resumeUrl || '';
    if (!resumeUrl) return;

    const previewWindow = window.open('', '_blank');

    if (!previewWindow) {
      setNotice('Please allow pop-ups to view the resume.');
      return;
    }

    try {
      if (!resumeUrl.startsWith('data:')) {
        previewWindow.opener = null;
        previewWindow.location.href = resumeUrl;
        return;
      }

      const blobUrl = dataUrlToBlobUrl(resumeUrl);
      resumePreviewUrlsRef.current.push(blobUrl);
      const title = `${getResumeFileName(application)}.pdf`;

      previewWindow.document.write(`
        <!doctype html>
        <html>
          <head>
            <title>${escapeReportHtml(title)}</title>
            <style>
              html,
              body {
                width: 100%;
                height: 100%;
                margin: 0;
                background: #111827;
              }

              iframe {
                display: block;
                width: 100%;
                height: 100%;
                border: 0;
                background: #fff;
              }
            </style>
          </head>
          <body>
            <iframe src="${blobUrl}" title="${escapeReportHtml(title)}"></iframe>
          </body>
        </html>
      `);
      previewWindow.document.close();
      previewWindow.opener = null;
    } catch (error) {
      previewWindow.close();
      setNotice(error.message || 'Unable to open this resume.');
    }
  };

  const handlePrintApplicationsReport = (
    status = applicationStatus,
    singleApplication = null,
    applicationOverride = null,
    titleOverride = '',
  ) => {
    const printedAt = new Date().toLocaleString();
    const reportApplications = applicationOverride || (singleApplication ? [singleApplication] : getReportApplications(status));
    const selectedStatusLabel = singleApplication
      ? `${getApplicantNumber(singleApplication)} - ${singleApplication.applicantName || 'Unnamed Applicant'}`
      : titleOverride ||
        (status === 'all'
          ? 'All application statuses'
          : statusLabel(status));
    const reportRows = reportApplications
      .map((application) => {
        const timelineRows = getApplicationStatusTimeline(application)
          .map((entry) => {
            const remarkLines = getEntryRemarkHistory(entry)
              .map((remark) => `
                <small>
                  Remarks: ${escapeReportHtml(remark.text)}
                  ${remark.updatedByName ? `<b> - ${escapeReportHtml(remark.updatedByName)}</b>` : ''}
                </small>
              `)
              .join('');

            return `
              <li>
                <strong>${escapeReportHtml(statusLabel(entry.status))}</strong>
                <span>${escapeReportHtml(formatDate(entry.timestamp))}</span>
                <em>${escapeReportHtml(getTimelineEntryLabel(entry))} - ${escapeReportHtml(getTimelineEntryMeta(entry))}</em>
                ${remarkLines}
              </li>
            `;
          })
          .join('');
        const statusRemarkRows = getApplicationStatusRemarks(application);
        const statusRemarksHtml = statusRemarkRows.length
          ? `
            <ul class="remarks-list">
              ${statusRemarkRows
                .map((entry) => `
                  <li>
                    <strong>${escapeReportHtml(statusLabel(entry.status))}:</strong>
                    <span>${escapeReportHtml(entry.remarks)}</span>
                  </li>
                `)
                .join('')}
            </ul>
          `
          : '<span class="no-remarks">No remarks recorded</span>';

        return `
          <tr>
            <td>
              <strong>${escapeReportHtml(application.applicantName || 'Unnamed Applicant')}</strong>
              <small>${escapeReportHtml(getApplicantNumber(application))}</small>
              <small>${escapeReportHtml(application.email || 'No email')}</small>
              <small>${escapeReportHtml(application.phone || 'No phone')}</small>
            </td>
            <td>${escapeReportHtml(application.jobTitle || 'General Application')}</td>
            <td>${escapeReportHtml(formatDate(application.createdAt))}</td>
            <td>${escapeReportHtml(statusLabel(application.status))}</td>
            <td>${statusRemarksHtml}</td>
            <td><ol class="timeline">${timelineRows}</ol></td>
          </tr>
        `;
      })
      .join('');
    const printWindow = window.open('', '_blank', 'width=980,height=720');

    if (!printWindow) {
      window.alert('Please allow pop-ups to print the HR applications report.');
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>HR Applications Report</title>
          <style>
            @page { size: 11in 8.5in; margin: 0.28in; }
            * { box-sizing: border-box; }
            html,
            body {
              width: 100%;
              margin: 0;
              padding: 0;
              color: #111827;
              font-family: Arial, Helvetica, sans-serif;
              background: #fff;
              font-size: 10px;
            }
            body { display: flex; justify-content: center; align-items: flex-start; }
            .print-page { width: 10.44in; max-width: 100%; min-height: 7.94in; margin: 0 auto; padding: 0; overflow: visible; }
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
            .coop-logo-wrap { width: 96px; text-align: center; }
            .coop-logo-wrap img { display: block; width: 82px; height: 82px; object-fit: contain; margin: 0 auto; }
            .coop-copy { grid-column: 2; text-align: center; }
            .coop-copy h1 {
              margin: 0;
              color: #dc2626;
              font-size: 20px;
              line-height: 1.05;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.04em;
            }
            .coop-copy p { margin: 1px 0; color: #000; font-size: 13px; line-height: 1.2; }
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
            .head { display: flex; justify-content: space-between; gap: 24px; border-bottom: 1px solid #d1d5db; padding-bottom: 12px; margin-bottom: 14px; }
            .kicker { color: #6b7280; font-size: 10px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; }
            h1 { margin: 5px 0 3px; font-size: 22px; line-height: 1.15; }
            p { margin: 0; color: #4b5563; }
            .meta { text-align: right; color: #4b5563; line-height: 1.45; }
            .meta strong { color: #111827; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            th, td { border: 1px solid #d1d5db; padding: 7px 8px; text-align: left; vertical-align: top; word-break: break-word; }
            th { background: #f3f4f6; color: #111827; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
            td small { display: block; margin-top: 3px; color: #4b5563; line-height: 1.35; }
            .records-table th:nth-child(1) { width: 20%; }
            .records-table th:nth-child(2) { width: 17%; }
            .records-table th:nth-child(3) { width: 13%; }
            .records-table th:nth-child(4) { width: 12%; }
            .records-table th:nth-child(5) { width: 20%; }
            .records-table th:nth-child(6) { width: 18%; }
            .remarks-list { display: grid; gap: 4px; margin: 0; padding: 0; list-style: none; }
            .remarks-list li { display: grid; gap: 2px; }
            .remarks-list strong { color: #111827; }
            .remarks-list span { color: #374151; white-space: pre-wrap; line-height: 1.35; }
            .no-remarks { color: #6b7280; font-weight: 700; }
            .timeline { margin: 0; padding-left: 16px; }
            .timeline li { margin-bottom: 5px; }
            .timeline li:last-child { margin-bottom: 0; }
            .timeline strong { margin-right: 4px; }
            .timeline span { color: #374151; }
            .timeline em { display: block; color: #4b5563; font-style: normal; line-height: 1.35; }
            .timeline small { display: block; color: #111827; font-weight: 700; line-height: 1.35; }
            .empty { border: 1px solid #d1d5db; padding: 16px; color: #4b5563; text-align: center; }
            @media print {
              body { padding: 0; }
              .print-page { width: 10.44in; max-width: 100%; margin-left: auto; margin-right: auto; }
              .records-table thead { display: table-header-group; }
            }
          </style>
        </head>
        <body>
          <main class="print-page">
            ${getPrintLetterhead()}
            <section class="head">
              <div>
                <span class="kicker">HR Applications</span>
                <h1>${escapeReportHtml(selectedStatusLabel)} Applicant Report</h1>
                <p>${escapeReportHtml(applicationSearch ? `Search: ${applicationSearch}` : selectedStatusLabel)}</p>
              </div>
              <div class="meta">
                <strong>${escapeReportHtml(reportApplications.length)} Applicants</strong><br />
                Printed ${escapeReportHtml(printedAt)}
              </div>
            </section>
            ${reportApplications.length ? `
              <table class="records-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Applied For</th>
                    <th>Date Submitted</th>
                    <th>Current Status</th>
                    <th>HR Remarks</th>
                    <th>Status Timeline</th>
                  </tr>
                </thead>
                <tbody>${reportRows}</tbody>
              </table>
            ` : '<div class="empty">No applicants found for this report.</div>'}
          </main>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.setTimeout(() => printWindow.print(), 250);
  };

  const handleSignOut = async () => {
    await signOutPortal().catch(() => {});
    router.replace('/LogIn');
  };

  const reportCalendar = buildHrCalendarMonth(filteredApplications, activeReportCalendarMonth);
  const reportWeekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const reportBusiestLabel = reportCalendar.busiestDay?.count
    ? formatReportDate(new Date(`${reportCalendar.busiestDay.key}T00:00:00`), { month: 'short', day: 'numeric' })
    : 'No activity';
  const selectedReportDateLabel = selectedReportDate
    ? formatReportDate(new Date(`${selectedReportDate}T00:00:00`), { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Select a date';
  const getReportCalendarLevel = (count) => {
    if (!count || !reportCalendar.maxCount) return 'empty';
    const ratio = count / reportCalendar.maxCount;

    if (ratio >= 0.75) return 'high';
    if (ratio >= 0.4) return 'medium';
    return 'low';
  };
  const selectedReportDateUniqueApplications = uniqueApplicationsById(selectedReportDateApplications);

  if (!checked || !user) {
    return <main className="portal-main portal-app-main hr-admin-main" />;
  }

  return (
    <main className="portal-main portal-app-main hr-admin-main">
      <div className="portal-shell">
        <header className="portal-topbar glass">
          <div className="portal-topbar-copy">
            <span className="portal-eyebrow">HR Admin</span>
            <h1>Careers Admin Console</h1>
            <p>Publish job posts, review applicants, and prepare HR recruitment reports.</p>
          </div>

          <div className="portal-topbar-actions">
              <span className="portal-status-pill">
                <span className="dot" />
              {openingStats.open} Published Posts
              </span>
            <span className="portal-status-pill alert">
              <span className="dot" />
              {openingStats.newApplications} New
            </span>
            <span className="portal-status-pill">
              <span className="dot" />
              {openingStats.applications} Applicants
            </span>
            <div className="profile-chip">
              <span className="profile-chip-avatar">{user.initials || user.name?.slice(0, 2) || 'HR'}</span>
              <div className="profile-chip-copy">
                <strong>{user.name}</strong>
                <span>{user.designation || user.department || 'HR Admin'}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="portal-layout">
          <aside className="portal-sidebar">
            <div className="sidebar-brand">
              <span className="sidebar-eyebrow">MEMPCO</span>
              <div className="sidebar-title">HR Console</div>
            </div>

            <nav className="sidebar-nav hr-sidebar-nav" aria-label="HR admin navigation">
              <button
                type="button"
                className={`sidebar-nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => handleSidebarTabClick('dashboard')}
              >
                <LayoutDashboard className="sidebar-nav-icon" aria-hidden="true" />
                Dashboard
              </button>
              <button
                type="button"
                className={`sidebar-nav-btn ${activeTab === 'openings' ? 'active' : ''}`}
                onClick={() => handleSidebarTabClick('openings')}
              >
                <BriefcaseBusiness className="sidebar-nav-icon" aria-hidden="true" />
                Job Posts
              </button>
              <button
                type="button"
                className={`sidebar-nav-btn ${activeTab === 'applications' ? 'active' : ''}`}
                onClick={() => handleSidebarTabClick('applications')}
              >
                <UsersRound className="sidebar-nav-icon" aria-hidden="true" />
                Applicant Review
              </button>
              <button
                type="button"
                className={`sidebar-nav-btn ${activeTab === 'reports' ? 'active' : ''}`}
                onClick={() => handleSidebarTabClick('reports')}
              >
                <FileText className="sidebar-nav-icon" aria-hidden="true" />
                Reports & Print
              </button>
            </nav>

            <div className="sidebar-logout">
              {user.role === 'superadmin' && (
                <a className="sidebar-nav-btn sidebar-external-link" href={ADMIN_DASHBOARD_ROUTE}>
                  <LayoutDashboard className="sidebar-nav-icon" aria-hidden="true" />
                  IT Super Admin
                  <ExternalLink className="sidebar-trailing-icon" aria-hidden="true" />
                </a>
              )}

              <a className="sidebar-nav-btn sidebar-external-link" href={JOBS_ROUTE} target="_blank" rel="noreferrer">
                <ExternalLink className="sidebar-nav-icon" aria-hidden="true" />
                Careers Page
              </a>
              <a className="sidebar-nav-btn sidebar-external-link" href={HRMAX_ROUTE}>
                <BriefcaseBusiness className="sidebar-nav-icon" aria-hidden="true" />
                HRMax
                <ExternalLink className="sidebar-trailing-icon" aria-hidden="true" />
              </a>
              <button type="button" className="sidebar-nav-btn" onClick={handleSignOut}>
                <LogOut className="sidebar-nav-icon" aria-hidden="true" />
                Logout
              </button>
            </div>
          </aside>

          <section className="portal-view hr-admin-view">
            {notice ? <div className="admin-alert success" role="status">{notice}</div> : null}

        {activeTab === 'dashboard' ? (
          <section className="hr-dashboard-view" aria-label="HR dashboard">
            <section className="panel-card glass hr-console-hero">
              <img src="/Logos/Logo.png" alt="" className="admin-hero-logo" aria-hidden="true" />
              <div className="hero-copy">
                <span className="section-kicker">HR Dashboard</span>
                <h2>Today&apos;s recruitment overview.</h2>
                <p>Track live job posts, applicant volume, and records that still need HR movement.</p>
              </div>
              <div className="hero-meta hr-hero-meta" aria-label="HR console status">
                <span className="meta-pill">{openingStats.open} Published Posts</span>
                <span className="meta-pill">{openingStats.newApplications} New Applicants</span>
              </div>
            </section>

            <section className="stats-grid hr-dashboard-stats" aria-label="HR dashboard summary">
              <StatCard
                icon={BriefcaseBusiness}
                label="Published Posts"
                value={openingStats.open}
                meta="Visible on Careers"
              />
              <StatCard
                icon={Edit3}
                label="Draft Posts"
                value={openingStats.draft}
                meta="Not yet public"
              />
              <StatCard
                icon={UsersRound}
                label="Applicants"
                value={openingStats.applications}
                meta="Total applicant records"
              />
              <StatCard
                icon={CalendarDays}
                label="Needs Attention"
                value={hrCommandCenter.actionableApplications.length}
                meta="New, reviewing, or shortlisted"
              />
            </section>

            <section className="hr-panel hr-dashboard-focus-panel">
              <div className="hr-panel-head">
                <div>
                  <span className="hr-panel-kicker">Today&apos;s HR Focus</span>
                  <h2>Applicants Needing Attention</h2>
                </div>
                <button className="hr-btn" type="button" onClick={loadHrData}>
                  <RefreshCw size={15} />
                  Sync
                </button>
              </div>

              <div className="hr-focus-list">
                <div className="hr-command-section-head">
                  <strong>Open applicant records</strong>
                  <span>{hrCommandCenter.agingApplications.length} aging 14+ days</span>
                </div>
                {hrCommandCenter.actionableApplications.length ? (
                  hrCommandCenter.actionableApplications.slice(0, 5).map((application) => {
                    const ageDays = getAgeInDays(application.updatedAt || application.createdAt);
                    return (
                      <button
                        className="hr-focus-row"
                        key={application.id}
                        type="button"
                        onClick={() => openApplicantRecord(application, 'all')}
                      >
                        <span className="hr-focus-row-main">
                          <strong>{application.applicantName || 'Unnamed Applicant'}</strong>
                          <small>{getApplicantNumber(application)} - {application.jobTitle || 'General Application'}</small>
                        </span>
                        <span className={`hr-status-chip status-${application.status}`}>
                          {statusLabel(application.status)}
                        </span>
                        <span className={ageDays >= 7 ? 'hr-aging-badge is-alert' : 'hr-aging-badge'}>
                          {ageDays ? `${ageDays}d` : 'Today'}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="hr-command-empty">No applicant records need action right now.</div>
                )}
              </div>
            </section>
          </section>
        ) : activeTab === 'openings' ? (
          <section className={`hr-workspace ${isOpeningEditorVisible ? 'hr-workspace-editor-open' : 'hr-workspace-list-only'}`}>
            <div className="hr-panel">
              <div className="hr-panel-head">
                <div>
                  <span className="hr-panel-kicker">{openingPanelLabel}</span>
                  <h2>{filteredOpenings.length} Posts</h2>
                </div>
                <button className="hr-btn hr-btn-primary" type="button" onClick={handleNewOpening}>
                  <Plus size={16} />
                  Create Job Post
                </button>
              </div>

              <div className="hr-list-controls">
                <label className="hr-search">
                  <Search size={17} />
                  <input
                    value={openingSearch}
                    onChange={(event) => setOpeningSearch(event.target.value)}
                    placeholder="Search job posts"
                  />
                </label>
                <label className="hr-sort-control">
                  <span>Sort</span>
                  <select value={openingSort} onChange={(event) => setOpeningSort(event.target.value)}>
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="title">Title A-Z</option>
                    <option value="department">Department A-Z</option>
                    <option value="status">Status A-Z</option>
                  </select>
                </label>
              </div>

              <div className="hr-opening-filters" aria-label="Filter job posts by status">
                {openingStatusFilters.map((filter) => (
                  <button
                    className={`hr-filter-pill ${openingStatusFilter === filter.value ? 'active' : ''}`}
                    key={filter.value}
                    type="button"
                    onClick={() => handleOpeningStatusFilterChange(filter)}
                    aria-pressed={openingStatusFilter === filter.value}
                  >
                    <span>{filter.label}</span>
                    <strong>{filter.count}</strong>
                  </button>
                ))}
              </div>

              <div className="hr-list">
                {isLoading ? (
                  <div className="hr-empty">Loading job posts...</div>
                ) : filteredOpenings.length ? (
                  paginatedOpenings.map((opening) => (
                    <article
                      className={`hr-opening-card ${editingOpening.id === opening.id ? 'is-selected' : ''}`}
                      key={opening.id}
                    >
                      <button
                        className="hr-opening-card-main"
                        type="button"
                        onClick={() => handleEditOpening(opening)}
                      >
                        <span className={`hr-status-chip status-${opening.status}`}>
                          {statusLabel(opening.status)}
                        </span>
                        {opening.image ? (
                          <img className="hr-opening-thumb" src={opening.image} alt="" aria-hidden="true" />
                        ) : null}
                        <strong>{opening.title}</strong>
                        <small>
                          {opening.department} - {opening.location}
                        </small>
                        <em>Click to edit this job post</em>
                      </button>
                      <div className="hr-opening-card-actions" aria-label={`${opening.title} quick actions`}>
                        {opening.status !== 'open' ? (
                          <button type="button" onClick={() => handleOpeningQuickStatus(opening, 'open')} disabled={isSaving}>
                            Publish
                          </button>
                        ) : null}
                        {opening.status !== 'draft' ? (
                          <button type="button" onClick={() => handleOpeningQuickStatus(opening, 'draft')} disabled={isSaving}>
                            Draft
                          </button>
                        ) : null}
                        {opening.status !== 'closed' ? (
                          <button type="button" onClick={() => handleOpeningQuickStatus(opening, 'closed')} disabled={isSaving}>
                            Close
                          </button>
                        ) : null}
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="hr-empty">{openingEmptyMessage}</div>
                )}
              </div>

              {filteredOpenings.length > JOB_POSTS_PER_PAGE ? (
                <div className="hr-pagination" aria-label="Job posts pagination">
                  <button
                    className="hr-pagination-btn"
                    type="button"
                    onClick={() => setOpeningPage((current) => Math.max(1, current - 1))}
                    disabled={openingPage === 1}
                    aria-label="Previous job posts page"
                  >
                    &lt;
                  </button>
                  <span>Page {openingPage} - {openingPageCount}</span>
                  <button
                    className="hr-pagination-btn"
                    type="button"
                    onClick={() => setOpeningPage((current) => Math.min(openingPageCount, current + 1))}
                    disabled={openingPage === openingPageCount}
                    aria-label="Next job posts page"
                  >
                    &gt;
                  </button>
                </div>
              ) : null}
            </div>

            {isOpeningEditorVisible ? (
              <form ref={openingEditorRef} className="hr-panel hr-editor" onSubmit={handleSaveOpening} data-hr-opening-editor="true">
                <div className="hr-panel-head">
                  <div>
                    <span className="hr-panel-kicker">Job Post Editor</span>
                    <h2>{editingOpening.id ? 'Update Job Post' : 'New Job Post'}</h2>
                  </div>
                  <div className="hr-editor-head-actions">
                    <button
                      className="hr-icon-link"
                      type="button"
                      onClick={() => setIsOpeningEditorVisible(false)}
                      title="Minimize form"
                      aria-label="Minimize form"
                    >
                      <X size={18} />
                    </button>
                    {editingOpening.id ? (
                      <button
                        className="hr-icon-link danger"
                        type="button"
                        onClick={() => handleDeleteOpening(editingOpening)}
                        title="Delete opening"
                      >
                        <Trash2 size={18} />
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="hr-editor-layout">
                  <div className="hr-editor-main">
                    <section className="hr-editor-section">
                      <div className="hr-editor-section-head">
                        <span className="hr-editor-step">01</span>
                        <div>
                          <strong>Role Details</strong>
                          <small>Set the core information applicants will scan first.</small>
                        </div>
                      </div>
                      <div className="hr-form-grid">
                        <label className="hr-field hr-field-wide">
                          <span>Job Title</span>
                          <input
                            ref={openingTitleInputRef}
                            value={editingOpening.title}
                            onChange={(event) => handleOpeningChange('title', event.target.value)}
                            placeholder="Accounting Assistant"
                          />
                        </label>
                        <label className="hr-field">
                          <span>Department</span>
                          <input
                            value={editingOpening.department}
                            onChange={(event) => handleOpeningChange('department', event.target.value)}
                            placeholder="Finance"
                          />
                        </label>
                        <label className="hr-field">
                          <span>Location</span>
                          <input
                            value={editingOpening.location}
                            onChange={(event) => handleOpeningChange('location', event.target.value)}
                            placeholder="Central Office"
                          />
                        </label>
                        <label className="hr-field">
                          <span>Employment Type</span>
                          <select
                            value={editingOpening.type}
                            onChange={(event) => handleOpeningChange('type', event.target.value)}
                          >
                            {EMPLOYMENT_TYPES.map((type) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </section>

                    <section className="hr-editor-section">
                      <div className="hr-editor-section-head">
                        <span className="hr-editor-step">02</span>
                        <div>
                          <strong>Poster Artwork</strong>
                          <small>Upload a full poster or paste an existing image URL.</small>
                        </div>
                      </div>
                      <div className="hr-field hr-field-wide hr-poster-uploader">
                        <span>Job Poster / Image</span>
                        <div className="hr-poster-grid">
                          <div className="hr-poster-preview">
                            {editingOpening.image ? (
                              <img src={editingOpening.image} alt={`${editingOpening.title || 'Job opening'} poster preview`} />
                            ) : (
                              <div className="hr-poster-placeholder">
                                <ImagePlus size={26} aria-hidden="true" />
                                <strong>No poster attached</strong>
                                <small>Upload a hiring poster or role image.</small>
                              </div>
                            )}
                          </div>

                          <div className="hr-poster-controls">
                            <input
                              ref={imageInputRef}
                              className="sr-only"
                              type="file"
                              accept="image/*"
                              onChange={handlePosterUpload}
                            />
                            <button
                              className="hr-poster-action"
                              type="button"
                              onClick={() => imageInputRef.current?.click()}
                              title="Upload image"
                              aria-label="Upload image"
                            >
                              <UploadCloud size={16} />
                            </button>
                            <button
                              className="hr-poster-action"
                              type="button"
                              onClick={() => {
                                handleOpeningChange('image', '');
                                setImageUploadMeta('');
                              }}
                              disabled={!editingOpening.image}
                              title="Remove image"
                              aria-label="Remove image"
                            >
                              <X size={16} />
                            </button>
                            <small>{imageUploadMeta || 'Images are optimized before saving.'}</small>
                          </div>
                        </div>
                      </div>
                      <label className="hr-field hr-field-wide">
                        <span>Image URL</span>
                        <input
                          value={editingOpening.image}
                          onChange={(event) => handleOpeningChange('image', event.target.value)}
                          placeholder="https://..."
                        />
                      </label>
                    </section>

                    <section className="hr-editor-section">
                      <div className="hr-editor-section-head">
                        <span className="hr-editor-step">03</span>
                        <div>
                          <strong>Candidate Message</strong>
                          <small>Describe the role, qualifications, and application notes.</small>
                        </div>
                      </div>
                      <label className="hr-field hr-field-wide">
                        <span>Description</span>
                        <textarea
                          value={editingOpening.description}
                          onChange={(event) => handleOpeningChange('description', event.target.value)}
                          placeholder="Write the role summary, qualifications, and application notes."
                          rows={8}
                        />
                      </label>
                    </section>
                  </div>

                  <aside className="hr-editor-preview-panel" aria-label="Job post live preview">
                    <div className="hr-preview-panel-head">
                      <span className="hr-panel-kicker">Live Preview</span>
                      <span className={`hr-status-chip status-${editingOpening.status}`}>
                        {statusLabel(editingOpening.status || 'draft')}
                      </span>
                    </div>
                    <article className="hr-job-preview-card">
                      <div className="hr-job-preview-media">
                        {editingOpening.image ? (
                          <img src={editingOpening.image} alt="" aria-hidden="true" />
                        ) : (
                          <div>
                            <ImagePlus size={24} aria-hidden="true" />
                            <span>Poster preview</span>
                          </div>
                        )}
                      </div>
                      <div className="hr-job-preview-copy">
                        <span>{editingOpening.department || 'Department'}</span>
                        <h3>{editingOpening.title || 'Job title preview'}</h3>
                        <div className="hr-job-preview-meta">
                          <small>{editingOpening.location || 'Location'}</small>
                          <small>{editingOpening.type || 'Employment type'}</small>
                        </div>
                        <p>
                          {editingOpening.description ||
                            'Your job summary will appear here so HR can review the applicant-facing message before publishing.'}
                        </p>
                      </div>
                    </article>
                    <div className="hr-publish-checklist">
                      <strong>Publish Readiness</strong>
                      <span className={editingOpening.title.trim() ? 'is-ready' : ''}>Job title</span>
                      <span className={editingOpening.department.trim() ? 'is-ready' : ''}>Department</span>
                      <span className={editingOpening.location.trim() ? 'is-ready' : ''}>Location</span>
                      <span className={editingOpening.description.trim() ? 'is-ready' : ''}>Description</span>
                      <span className={editingOpening.image.trim() ? 'is-ready' : ''}>Image</span>
                    </div>
                  </aside>
                </div>

                <div className="hr-editor-actions">
                  <button className="hr-btn" type="button" onClick={() => saveOpeningWithStatus('draft')} disabled={isSaving}>
                    <FileText size={16} />
                    Save Draft
                  </button>
                  <button className="hr-btn hr-btn-primary" type="button" onClick={() => saveOpeningWithStatus('open')} disabled={isSaving}>
                    <UploadCloud size={16} />
                    {isSaving ? 'Saving...' : 'Publish'}
                  </button>
                  {editingOpening.id && editingOpening.status !== 'closed' ? (
                    <button className="hr-btn" type="button" onClick={() => saveOpeningWithStatus('closed')} disabled={isSaving}>
                      <X size={16} />
                      Close Role
                    </button>
                  ) : null}
                </div>
              </form>
            ) : null}
          </section>
        ) : activeTab === 'applications' ? (
          <>
          <section className="hr-workspace applications-layout">
            <div className="hr-panel">
              <div className="hr-panel-head">
                <div>
                  <span className="hr-panel-kicker">{applicationPanelLabel}</span>
                  <h2>{filteredApplications.length} Applicants</h2>
                </div>
                <div className="hr-panel-actions">
                  <button className="hr-btn" type="button" onClick={() => handleExportApplicationsCsv()}>
                    <Download size={16} />
                    Export
                  </button>
                  <button className="hr-btn" type="button" onClick={() => handlePrintApplicationsReport()}>
                    <Printer size={16} />
                    Report
                  </button>
                </div>
              </div>

              <div className="hr-application-tools">
                <label className="hr-search">
                  <Search size={17} />
                  <input
                    value={applicationSearch}
                    onChange={(event) => setApplicationSearch(event.target.value)}
                    placeholder="Search applicants"
                  />
                </label>
                <label className="hr-sort-control">
                  <span>Sort</span>
                  <select value={applicationSort} onChange={(event) => setApplicationSort(event.target.value)}>
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="name">Name A-Z</option>
                    <option value="role">Role A-Z</option>
                    <option value="status">Status A-Z</option>
                  </select>
                </label>
              </div>

              <div className="hr-application-list">
                {isLoading ? (
                  <div className="hr-empty">Loading applications...</div>
                ) : filteredApplications.length ? (
                  filteredApplications.map((application) => (
                    <button
                      className="hr-application-row"
                      key={application.id}
                      type="button"
                      onClick={() => setSelectedApplication(application)}
                    >
                      <div className="hr-application-row-main">
                        <strong>{application.applicantName || 'Unnamed Applicant'}</strong>
                        <small>{getApplicantNumber(application)}</small>
                        <span>{application.jobTitle || 'General Application'}</span>
                      </div>
                      <div className="hr-application-row-meta">
                        <span className={`hr-status-chip status-${application.status}`}>
                          {statusLabel(application.status)}
                        </span>
                        <small>{formatDate(application.createdAt)}</small>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="hr-empty">{applicationEmptyMessage}</div>
                )}
              </div>
            </div>

            <aside className="hr-panel hr-application-detail">
              {selectedApplication ? (
                <>
                  <div className="hr-applicant-record-head">
                    <span className="hr-applicant-avatar" aria-hidden="true">
                      {(selectedApplication.applicantName || 'A').slice(0, 1).toUpperCase()}
                    </span>
                    <div className="hr-applicant-record-copy">
                      <span className="hr-panel-kicker">Selected Applicant</span>
                      <h2>{selectedApplication.applicantName || 'Unnamed Applicant'}</h2>
                      <p>{selectedApplication.jobTitle || 'General Application'}</p>
                      <small>{getApplicantNumber(selectedApplication)}</small>
                    </div>
                    <span className={`hr-status-chip status-${selectedApplication.status}`}>
                      {statusLabel(selectedApplication.status)}
                    </span>
                  </div>

                  {selectedApplicationLocked ? (
                    <div className="hr-lock-notice" role="note">
                      This applicant is finalized and locked for viewing only.
                    </div>
                  ) : null}

                  <div className="hr-applicant-record-actions">
                    {selectedApplication.resumeUrl ? (
                      <button
                        className="hr-resume-link"
                        type="button"
                        onClick={() => handleViewResume(selectedApplication)}
                      >
                        <ExternalLink size={16} />
                        View Resume
                      </button>
                    ) : (
                      <span className="hr-muted-note">No resume attached</span>
                    )}
                    {canDeleteApplications ? (
                      <button
                        className="hr-btn hr-btn-danger"
                        type="button"
                        onClick={handleDeleteApplication}
                        disabled={isSaving}
                      >
                        <Trash2 size={16} />
                        Delete Record
                      </button>
                    ) : null}
                  </div>

                  <div className="hr-record-section">
                    <div className="hr-record-section-head">
                      <span>Contact</span>
                      <small>Applicant identity and reachable details</small>
                    </div>
                    <div className="hr-detail-grid">
                      <div>
                        <span>Applicant No.</span>
                        <strong>{getApplicantNumber(selectedApplication)}</strong>
                      </div>
                      <div>
                        <span>Name</span>
                        <strong>{selectedApplication.applicantName || 'Unnamed Applicant'}</strong>
                      </div>
                      <div>
                        <span>Email</span>
                        <strong>{selectedApplication.email || 'Not provided'}</strong>
                      </div>
                      <div>
                        <span>Phone</span>
                        <strong>{selectedApplication.phone || 'Not provided'}</strong>
                      </div>
                      <div>
                        <span>Submitted</span>
                        <strong>{formatDate(selectedApplication.createdAt)}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="hr-record-section">
                    <div className="hr-record-section-head">
                      <span>HR Action</span>
                      <small>Choose an action, add structured details, then save the movement</small>
                    </div>
                    <div className="hr-current-status-panel">
                      <div>
                        <span className="hr-panel-kicker">Current Status</span>
                        <strong>{statusLabel(selectedApplication.status)}</strong>
                      </div>
                      <div>
                        <span className="hr-panel-kicker">Applied For</span>
                        <strong>{selectedApplication.jobTitle || 'General Application'}</strong>
                      </div>
                    </div>

                    <div className="hr-action-grid">
                      <label className="hr-field">
                        <span>Action Type</span>
                        <select
                          value={applicationDraft.actionType}
                          onChange={(event) => handleApplicationDraftChange('actionType', event.target.value)}
                          disabled={isSaving || selectedApplicationLocked}
                        >
                          {HR_ACTION_TYPES.map((action) => (
                            <option key={action.value} value={action.value}>
                              {action.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="hr-field hr-action-status-field" aria-live="polite">
                        <span>Status</span>
                        <div className="hr-action-status-preview">
                          <strong>{statusLabel(applicationDraft.status || selectedApplication.status)}</strong>
                        </div>
                      </div>
                      {applicationDraft.status === 'interview' ? (
                        <>
                          <label className="hr-field">
                            <span>Interview Date</span>
                            <input
                              type="datetime-local"
                              value={applicationDraft.interviewAt}
                              onChange={(event) => handleApplicationDraftChange('interviewAt', event.target.value)}
                              disabled={isSaving || selectedApplicationLocked}
                            />
                          </label>
                          <label className="hr-field">
                            <span>Interview Type</span>
                            <select
                              value={applicationDraft.interviewType}
                              onChange={(event) => handleApplicationDraftChange('interviewType', event.target.value)}
                              disabled={isSaving || selectedApplicationLocked}
                            >
                              {INTERVIEW_TYPES.map((type) => (
                                <option key={type} value={type}>
                                  {type}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="hr-field hr-field-wide">
                            <span>Interviewer</span>
                            <input
                              value={applicationDraft.interviewer}
                              onChange={(event) => handleApplicationDraftChange('interviewer', event.target.value)}
                              placeholder="HR officer, panel, or department head"
                              disabled={isSaving || selectedApplicationLocked}
                            />
                          </label>
                        </>
                      ) : null}
                      <label className="hr-field hr-field-wide">
                        <span>Action Remarks</span>
                        <textarea
                          value={applicationDraft.hrNotes}
                          onChange={(event) => handleApplicationDraftChange('hrNotes', event.target.value)}
                          placeholder="Screening notes, requirements checked, decision reason, or follow-up details."
                          disabled={selectedApplicationLocked}
                          rows={5}
                        />
                      </label>
                    </div>
                    <div className="hr-detail-actions">
                      <button
                        className="hr-btn hr-btn-primary"
                        type="button"
                        onClick={handleSaveApplicationDetails}
                        disabled={isSaving || selectedApplicationLocked}
                      >
                        <FileText size={16} />
                        {isSaving ? 'Saving...' : 'Save Action'}
                      </button>
                    </div>
                  </div>

                  <div className="hr-record-section hr-record-section-last">
                    <div className="hr-record-section-head">
                      <span>Timeline</span>
                      <small>Status trail for this applicant</small>
                    </div>
                    <div className="hr-history">
                    {getApplicationStatusTimeline(selectedApplication).map((entry, index) => {
                      const entryRemarks = getEntryRemarkHistory(entry);

                      return (
                        <div className="hr-history-item" key={`${entry.status}-${entry.timestamp || index}`}>
                          <span className={`hr-status-chip status-${entry.status}`}>{statusLabel(entry.status)}</span>
                          <div className="hr-history-body">
                            <div className="hr-history-line">
                              <strong>{getTimelineEntryLabel(entry)}</strong>
                              <span>{formatDate(entry.timestamp)}</span>
                            </div>
                            <small className="hr-history-meta">
                              {getTimelineEntryMeta(entry)}
                            </small>
                            {entry.interviewAt || entry.interviewType || entry.interviewer ? (
                              <div className="hr-history-details">
                                {entry.interviewAt ? <span>Interview: {formatDate(entry.interviewAt)}</span> : null}
                                {entry.interviewType ? <span>Type: {entry.interviewType}</span> : null}
                                {entry.interviewer ? <span>Interviewer: {entry.interviewer}</span> : null}
                              </div>
                            ) : null}
                            {entryRemarks.map((remark, remarkIndex) => (
                              <p className="hr-history-remark" key={`${remark.timestamp || remarkIndex}-${remarkIndex}`}>
                                <strong>Remarks:</strong> {remark.text}
                              </p>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  </div>

                </>
              ) : (
                <div className="hr-empty detail-empty">
                  <UsersRound size={24} />
                  Select an application to review details.
                </div>
              )}
            </aside>
          </section>
          </>
        ) : (
          <section className="hr-report-console">
            <section className="hr-panel">
              <div className="hr-panel-head">
                <div>
                  <span className="hr-panel-kicker">Reports</span>
                  <h2>Applicant Status Report</h2>
                </div>
                <div className="hr-panel-actions">
                  <button
                    className="hr-btn"
                    type="button"
                    onClick={() =>
                      handleExportApplicationsCsv(
                        applicationStatus,
                        null,
                        reportMonthApplications,
                        `applicants-${getDateKey(activeReportCalendarMonth).slice(0, 7)}`,
                      )
                    }
                  >
                    <Download size={16} />
                    Export Monthly CSV
                  </button>
                  <button
                    className="hr-btn hr-btn-primary"
                    type="button"
                    onClick={() =>
                      handlePrintApplicationsReport(
                        applicationStatus,
                        null,
                        reportMonthApplications,
                        `${reportCalendar.title} Applicant Report`,
                      )
                    }
                  >
                    <Printer size={16} />
                    Print Monthly Report
                  </button>
                </div>
              </div>

              <div className="hr-report-actions" aria-label="Quick report templates">
                <button type="button" onClick={() => handlePrintApplicationsReport('all')}>All Applicants</button>
                <button type="button" onClick={() => handlePrintApplicationsReport('interview')}>Interview List</button>
                <button type="button" onClick={() => handlePrintApplicationsReport('hired')}>Hired</button>
                <button type="button" onClick={() => handlePrintApplicationsReport('rejected')}>Rejected</button>
                <button type="button" onClick={() => handleExportApplicationsCsv('all')}>Export All CSV</button>
              </div>

              <div className="hr-report-summary" aria-label="Applicant status counts">
                {APPLICATION_STATUSES.map((status) => {
                  const count = reportMonthAllApplications.filter((application) => application.status === status).length;
                  return (
                    <button
                      className={`hr-report-card ${applicationStatus === status ? 'active' : ''}`}
                      key={status}
                      type="button"
                      onClick={() => setApplicationStatus((current) => (current === status ? 'all' : status))}
                      aria-pressed={applicationStatus === status}
                    >
                      <span className={`hr-status-chip status-${status}`}>{statusLabel(status)}</span>
                      <strong>{count}</strong>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="report-calendar-layout hr-report-calendar-layout" aria-label="HR calendar report">
              <div className="panel-card glass report-calendar-card">
                <div className="report-calendar-head">
                  <div>
                    <span className="section-kicker">
                      <CalendarDays size={14} />
                      Calendar Report
                    </span>
                    <h3>{reportCalendar.title}</h3>
                  </div>

                  <div className="report-calendar-nav">
                    <button
                      type="button"
                      onClick={() => changeReportCalendarMonth(-1)}
                      aria-label="Previous report month"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => changeReportCalendarMonth(1)}
                      aria-label="Next report month"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                <div className="report-calendar-grid" aria-label={`Applicant calendar for ${reportCalendar.title}`}>
                  {reportWeekdays.map((day) => (
                    <span
                      className={`report-calendar-weekday ${day === 'Sun' || day === 'Sat' ? 'weekend' : ''}`}
                      key={day}
                    >
                      {day}
                    </span>
                  ))}

                  {reportCalendar.cells.map((cell) => (
                    <button
                      className={[
                        'report-calendar-day',
                        cell.isCurrentMonth ? '' : 'muted',
                        cell.isToday ? 'today' : '',
                        cell.isFuture ? 'future' : '',
                        cell.key === selectedReportDate ? 'selected' : '',
                        getReportCalendarLevel(cell.count),
                      ].filter(Boolean).join(' ')}
                      disabled={cell.isFuture}
                      key={cell.key}
                      type="button"
                      onClick={() => {
                        if (!cell.isFuture) selectReportCalendarDate(cell);
                      }}
                      aria-label={`${cell.key}: ${cell.count} application${cell.count === 1 ? '' : 's'} submitted`}
                    >
                      <span>{cell.day}</span>
                      {cell.count > 0 ? <strong>{cell.count}</strong> : null}
                    </button>
                  ))}
                </div>
              </div>

              <aside className="panel-card glass report-calendar-insights">
                <span className="section-kicker">Month Pulse</span>
                <h3>{reportCalendar.monthTotal} applications submitted</h3>

                <div className="report-insight-list">
                  <div className="report-insight-item primary">
                    <span>Busiest Day</span>
                    <strong>{reportBusiestLabel}</strong>
                    <em>{reportCalendar.busiestDay.count} applicant{reportCalendar.busiestDay.count === 1 ? '' : 's'}</em>
                  </div>
                  <div className="report-insight-item">
                    <span>Active Days</span>
                    <strong>{reportCalendar.activeDays}</strong>
                    <em>days with submissions</em>
                  </div>
                  <div className="report-insight-item">
                    <span>Daily Average</span>
                    <strong>{reportCalendar.averagePerActiveDay}</strong>
                    <em>applications per active day</em>
                  </div>
                  <div className="report-insight-item">
                    <span>Peak Volume</span>
                    <strong>{reportCalendar.maxCount}</strong>
                    <em>applications in one day</em>
                  </div>
                </div>

                <div className="report-selected-day">
                  <div className="report-selected-day-head">
                    <span>Selected Day</span>
                    <strong>{selectedReportDateLabel}</strong>
                  </div>

                  {selectedReportDate ? (
                    selectedReportDateApplications.length ? (
                      <>
                        <div className="hr-calendar-day-actions">
                          <button
                            className="report-print-btn"
                            type="button"
                            onClick={() =>
                              handlePrintApplicationsReport(
                                applicationStatus,
                                null,
                                selectedReportDateUniqueApplications,
                                `${selectedReportDateLabel} Applications Submitted`,
                              )
                            }
                          >
                            <Printer size={14} />
                            Print Day
                          </button>
                          <button
                            className="report-print-btn"
                            type="button"
                            onClick={() =>
                              handleExportApplicationsCsv(
                                applicationStatus,
                                null,
                                selectedReportDateUniqueApplications,
                                `applicants-${selectedReportDate}`,
                              )
                            }
                          >
                            <Download size={14} />
                            Export Day
                          </button>
                        </div>

                        <div className="report-selected-ticket-list">
                          {pagedSelectedReportDateApplications.map((application, index) => (
                            <button
                              className="report-selected-ticket"
                              key={`${application.id}-${application.reportEventType || 'event'}-${application.reportEventTimestamp || index}-${index}`}
                              type="button"
                              onClick={() => {
                                setSelectedApplication(application);
                                setActiveTab('applications');
                              }}
                            >
                              <span>{getApplicantNumber(application)}</span>
                              <strong>{application.applicantName || 'Unnamed Applicant'}</strong>
                              <em>Submitted / {statusLabel(application.status)}</em>
                            </button>
                          ))}
                        </div>

                        <div className="report-selected-ticket-pager" aria-label="Selected day applicant pages">
                          <button
                            type="button"
                            onClick={() => setSelectedReportDatePage((page) => Math.max(1, page - 1))}
                            disabled={selectedReportDatePage === 1}
                            aria-label="Previous selected day applicant page"
                          >
                            <ChevronLeft aria-hidden="true" />
                          </button>
                          <span>Page {selectedReportDatePage}</span>
                          <button
                            type="button"
                            onClick={() => setSelectedReportDatePage((page) => Math.min(selectedReportDateTotalPages, page + 1))}
                            disabled={selectedReportDatePage === selectedReportDateTotalPages}
                            aria-label="Next selected day applicant page"
                          >
                            <ChevronRight aria-hidden="true" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <p className="report-selected-empty">No applications were submitted on this date.</p>
                    )
                  ) : (
                    <p className="report-selected-empty">Choose a calendar date to review applications submitted that day.</p>
                  )}
                </div>
              </aside>
            </section>

            <section className="hr-panel">
              <div className="hr-panel-head">
                <div>
                  <span className="hr-panel-kicker">Applicant Records</span>
                  <h2>{filteredApplications.length} Applicants</h2>
                </div>
                <div className="hr-panel-actions">
                  <button
                    className="hr-btn"
                    type="button"
                    onClick={handleViewReportApplication}
                    disabled={!selectedReportApplication}
                  >
                    <ExternalLink size={16} />
                    View
                  </button>
                  <button
                    className="hr-btn"
                    type="button"
                    onClick={() => handleExportApplicationsCsv(applicationStatus, selectedReportApplication)}
                    disabled={!selectedReportApplication}
                  >
                    <Download size={16} />
                    Export
                  </button>
                  <button
                    className="hr-btn hr-btn-primary"
                    type="button"
                    onClick={() => handlePrintApplicationsReport(applicationStatus, selectedReportApplication)}
                    disabled={!selectedReportApplication}
                  >
                    <Printer size={16} />
                    Print
                  </button>
                </div>
              </div>

              <div className="hr-list-controls hr-report-controls">
                <label className="hr-search hr-report-search hr-labeled-control">
                  <span>Search</span>
                  <div className="hr-search-field">
                    <Search size={17} />
                    <input
                      value={applicationSearch}
                      onChange={(event) => setApplicationSearch(event.target.value)}
                      placeholder="Search applicant records"
                    />
                  </div>
                </label>
                <label className="hr-sort-control">
                  <span>Sort</span>
                  <select value={applicationSort} onChange={(event) => setApplicationSort(event.target.value)}>
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="name">Name A-Z</option>
                    <option value="role">Role A-Z</option>
                    <option value="status">Status A-Z</option>
                  </select>
                </label>
              </div>

              <div className="hr-report-table-wrap">
                <table className="hr-report-table">
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Role</th>
                      <th>Submitted</th>
                      <th>Remarks</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApplications.length ? (
                      pagedReportApplications.map((application) => {
                        const statusRemarks = getApplicationStatusRemarks(application);

                        return (
                          <tr
                            className={selectedReportApplicationId === application.id ? 'is-selected' : ''}
                            key={application.id}
                            onClick={() => setSelectedReportApplicationId(application.id)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                setSelectedReportApplicationId(application.id);
                              }
                            }}
                            role="button"
                            tabIndex={0}
                          >
                            <td>{getApplicantNumber(application)}</td>
                            <td>{application.applicantName || 'Unnamed Applicant'}</td>
                            <td>{application.email || 'Not provided'}</td>
                            <td>{application.phone || 'Not provided'}</td>
                            <td>{application.jobTitle || 'General Application'}</td>
                            <td>{formatDate(application.createdAt)}</td>
                            <td>
                              {statusRemarks.length ? (
                                <div className="hr-report-remarks-list">
                                  {statusRemarks.map((remark, index) => (
                                    <small key={`${remark.status}-${remark.timestamp || index}`}>
                                      <strong>{statusLabel(remark.status)}:</strong> {remark.remarks}
                                    </small>
                                  ))}
                                </div>
                              ) : (
                                <span className="hr-report-no-remarks">No remarks</span>
                              )}
                            </td>
                            <td>
                              <span className={`hr-status-chip status-${application.status}`}>
                                {statusLabel(application.status)}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8}>No applicants found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {filteredApplications.length ? (
                <div className="hr-report-pagination" aria-label="Applicant record pages">
                  <button
                    type="button"
                    onClick={() => setReportApplicantsPage((page) => Math.max(1, page - 1))}
                    disabled={reportApplicantsPage === 1}
                    aria-label="Previous applicant records page"
                  >
                    {'<'}
                  </button>
                  <span>Page {reportApplicantsPage}</span>
                  <button
                    type="button"
                    onClick={() => setReportApplicantsPage((page) => Math.min(reportApplicantsPageCount, page + 1))}
                    disabled={reportApplicantsPage === reportApplicantsPageCount}
                    aria-label="Next applicant records page"
                  >
                    {'>'}
                  </button>
                </div>
              ) : null}
            </section>
          </section>
        )}
          </section>
        </div>
      </div>

    </main>
  );
}
