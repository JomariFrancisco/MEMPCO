'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BriefcaseBusiness,
  CalendarDays,
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

const statusLabel = (value) =>
  String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const getTime = (value) => {
  const time = new Date(value || '').getTime();
  return Number.isNaN(time) ? 0 : time;
};

const sortNewestFirst = (items = []) =>
  [...items].sort((a, b) => getTime(b.createdAt || b.updatedAt) - getTime(a.createdAt || a.updatedAt));

const buildApplicationHistoryEntry = (status, user) => ({
  status,
  label: `Moved to ${statusLabel(status)}`,
  timestamp: new Date().toISOString(),
  updatedBy: user?.id || '',
  updatedByName: user?.name || 'HR',
});

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

function StatCard({ icon: IconComponent, label, value, meta }) {
  return (
    <article className="stat-card glass">
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
    </article>
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
  const [activeTab, setActiveTab] = useState('openings');
  const [openingSearch, setOpeningSearch] = useState('');
  const [applicationSearch, setApplicationSearch] = useState('');
  const [applicationStatus, setApplicationStatus] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [imageUploadMeta, setImageUploadMeta] = useState('');
  const [notice, setNotice] = useState('');
  const imageInputRef = useRef(null);

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

  const openingStats = useMemo(
    () => ({
      total: openings.length,
      open: openings.filter((opening) => opening.status === 'open').length,
      draft: openings.filter((opening) => opening.status === 'draft').length,
      applications: applications.length,
      newApplications: applications.filter((application) => application.status === 'new').length,
      interviews: applications.filter((application) => application.status === 'interview').length,
      hired: applications.filter((application) => application.status === 'hired').length,
    }),
    [applications, openings],
  );

  const filteredOpenings = useMemo(() => {
    const query = normalizeText(openingSearch);
    const source = sortNewestFirst(openings);
    if (!query) return source;

    return source.filter((opening) =>
      [opening.title, opening.department, opening.location, opening.status]
        .map(normalizeText)
        .some((value) => value.includes(query)),
    );
  }, [openingSearch, openings]);

  const filteredApplications = useMemo(() => {
    const query = normalizeText(applicationSearch);
    return sortNewestFirst(applications).filter((application) => {
      const matchesStatus = applicationStatus === 'all' || application.status === applicationStatus;
      const matchesSearch =
        !query ||
        [
          application.applicantName,
          application.email,
          application.phone,
          application.jobTitle,
          application.status,
          application.interviewer,
          application.interviewType,
        ]
          .map(normalizeText)
          .some((value) => value.includes(query));

      return matchesStatus && matchesSearch;
    });
  }, [applicationSearch, applicationStatus, applications]);

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
          application.interviewer,
          application.interviewType,
        ]
          .map(normalizeText)
          .some((value) => value.includes(query));

      return matchesStatus && matchesSearch;
    });
  };

  const getApplicationStatusTimeline = (application = {}) => {
    const baseHistory = application.statusHistory?.length
      ? application.statusHistory
      : [
          {
            status: 'new',
            label: 'Application Submitted',
            timestamp: application.createdAt,
            updatedByName: application.applicantName || 'Applicant',
          },
        ];
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
    if (entry.label) return entry.label;
    if (entry.status === 'new') return 'Application Submitted';
    return `Moved to ${statusLabel(entry.status)}`;
  };

  const applicationStatusFilters = useMemo(
    () => [
      { value: 'all', label: 'All', count: applications.length },
      ...APPLICATION_STATUSES.map((status) => ({
        value: status,
        label: statusLabel(status),
        count: applications.filter((application) => application.status === status).length,
      })),
    ],
    [applications],
  );

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

  const handleDeleteOpening = async (opening) => {
    if (!opening?.id) return;
    const confirmed = window.confirm(`Delete "${opening.title}" from job openings?`);
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

    setIsSaving(true);
    setNotice('');
    try {
      const updatedApplication = await updateJobApplication(selectedApplication.id, {
        ...selectedApplication,
        ...updates,
        previousStatus: selectedApplication.status,
        updatedBy: user?.id || '',
        updatedByName: user?.name || 'HR',
      });
      const localStatusHistory =
        updates.status && updates.status !== selectedApplication.status
          ? [
              ...(selectedApplication.statusHistory || []),
              buildApplicationHistoryEntry(updates.status, user),
            ]
          : selectedApplication.statusHistory || [];
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
      setNotice(`${nextApplication.applicantName || 'Application'} has been updated.`);
    } catch (error) {
      setNotice(error.message || 'Unable to update this application.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteApplication = async () => {
    if (!selectedApplication?.id || !isSuperAdminRole(user?.role)) return;

    const applicantName = selectedApplication.applicantName || 'this applicant';
    const confirmed = window.confirm(
      `Permanently delete ${applicantName}'s application record? This cannot be undone.`,
    );
    if (!confirmed) return;

    setIsSaving(true);
    setNotice('');
    try {
      await deleteJobApplication(selectedApplication.id, selectedApplication.resumeUrl);
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

  const handlePrintApplicationsReport = (status = applicationStatus) => {
    const printedAt = new Date().toLocaleString();
    const reportApplications = getReportApplications(status);
    const selectedStatusLabel = status === 'all' ? 'All application statuses' : statusLabel(status);
    const reportRows = reportApplications
      .map((application) => {
        const timelineRows = getApplicationStatusTimeline(application)
          .map((entry) => `
            <li>
              <strong>${escapeReportHtml(statusLabel(entry.status))}</strong>
              <span>${escapeReportHtml(formatDate(entry.timestamp))}</span>
              <em>${escapeReportHtml(getTimelineEntryLabel(entry))}${entry.updatedByName ? ` by ${escapeReportHtml(entry.updatedByName)}` : ''}</em>
            </li>
          `)
          .join('');

        return `
          <tr>
            <td>
              <strong>${escapeReportHtml(application.applicantName || 'Unnamed Applicant')}</strong>
              <small>${escapeReportHtml(application.email || 'No email')}</small>
              <small>${escapeReportHtml(application.phone || 'No phone')}</small>
            </td>
            <td>${escapeReportHtml(application.jobTitle || 'General Application')}</td>
            <td>${escapeReportHtml(formatDate(application.createdAt))}</td>
            <td>${escapeReportHtml(statusLabel(application.status))}</td>
            <td><ol class="timeline">${timelineRows}</ol></td>
          </tr>
        `;
      })
      .join('');
    const statusHeaderCells = APPLICATION_STATUSES.map((status) => `
      <th>${escapeReportHtml(statusLabel(status))}</th>
    `).join('');
    const statusCountCells = APPLICATION_STATUSES.map((status) => {
      const count = reportApplications.filter((application) => application.status === status).length;
      return `<td>${escapeReportHtml(count)}</td>`;
    }).join('');
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
            * { box-sizing: border-box; }
            body { margin: 0; padding: 28px; color: #111827; font-family: Arial, sans-serif; font-size: 12px; }
            .head { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #111827; padding-bottom: 12px; margin-bottom: 14px; }
            .kicker { color: #6b7280; font-size: 10px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; }
            h1 { margin: 5px 0 3px; font-size: 22px; line-height: 1.15; }
            p { margin: 0; color: #4b5563; }
            .meta { text-align: right; color: #4b5563; line-height: 1.45; }
            .meta strong { color: #111827; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            th, td { border: 1px solid #d1d5db; padding: 7px 8px; text-align: left; vertical-align: top; word-break: break-word; }
            th { background: #f3f4f6; color: #111827; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
            td small { display: block; margin-top: 3px; color: #4b5563; line-height: 1.35; }
            .summary-title { margin: 0 0 6px; color: #374151; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
            .summary-table { margin-bottom: 16px; table-layout: auto; }
            .summary-table th, .summary-table td { text-align: center; }
            .summary-table td { font-size: 16px; font-weight: 700; }
            .records-table th:nth-child(1) { width: 20%; }
            .records-table th:nth-child(2) { width: 18%; }
            .records-table th:nth-child(3) { width: 14%; }
            .records-table th:nth-child(4) { width: 12%; }
            .records-table th:nth-child(5) { width: 36%; }
            .timeline { margin: 0; padding-left: 16px; }
            .timeline li { margin-bottom: 5px; }
            .timeline li:last-child { margin-bottom: 0; }
            .timeline strong { margin-right: 4px; }
            .timeline span { color: #374151; }
            .timeline em { display: block; color: #4b5563; font-style: normal; line-height: 1.35; }
            .empty { border: 1px solid #d1d5db; padding: 16px; color: #4b5563; text-align: center; }
            @media print { body { padding: 18px; } }
          </style>
        </head>
        <body>
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
          <p class="summary-title">Status Summary</p>
          <table class="summary-table">
            <thead><tr>${statusHeaderCells}</tr></thead>
            <tbody><tr>${statusCountCells}</tr></tbody>
          </table>
          ${reportApplications.length ? `
            <table class="records-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Applied For</th>
                  <th>Date Submitted</th>
                  <th>Current Status</th>
                  <th>Status Timeline</th>
                </tr>
              </thead>
              <tbody>${reportRows}</tbody>
            </table>
          ` : '<div class="empty">No applicants found for this report.</div>'}
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
            <p>Manage public job openings and review submitted applications.</p>
          </div>

          <div className="portal-topbar-actions">
            <span className="portal-status-pill">
              <span className="dot" />
              {openingStats.open} Open Roles
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
                className={`sidebar-nav-btn ${activeTab === 'openings' ? 'active' : ''}`}
                onClick={() => setActiveTab('openings')}
              >
                <LayoutDashboard className="sidebar-nav-icon" aria-hidden="true" />
                Job Openings
              </button>
              <button
                type="button"
                className={`sidebar-nav-btn ${activeTab === 'applications' ? 'active' : ''}`}
                onClick={() => setActiveTab('applications')}
              >
                <UsersRound className="sidebar-nav-icon" aria-hidden="true" />
                Applications
              </button>
              <button
                type="button"
                className={`sidebar-nav-btn ${activeTab === 'reports' ? 'active' : ''}`}
                onClick={() => setActiveTab('reports')}
              >
                <FileText className="sidebar-nav-icon" aria-hidden="true" />
                Reports
              </button>
              <button type="button" className="sidebar-nav-btn" onClick={loadHrData}>
                <RefreshCw className="sidebar-nav-icon" aria-hidden="true" />
                Refresh
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
            <section className="panel-card glass hr-console-hero">
              <img src="/Logos/Logo.png" alt="" className="admin-hero-logo" aria-hidden="true" />
              <div className="hero-copy">
                <span className="section-kicker">Careers Desk</span>
                <h2>Recruitment backend for job postings and applications.</h2>
                <p>Open roles appear on the public Careers page. Submitted applications appear in this console.</p>
              </div>
              <div className="hero-meta hr-hero-meta" aria-label="HR console status">
                <span className="meta-pill">
                  {openingStats.open} Active Openings
                </span>
                <span className="meta-pill">
                  {openingStats.newApplications} New Applicants
                </span>
              </div>
            </section>

            <section className="stats-grid" aria-label="HR summary">
              <StatCard icon={BriefcaseBusiness} label="Open Roles" value={openingStats.open} meta="Visible on Careers" />
              <StatCard icon={Edit3} label="Drafts" value={openingStats.draft} meta="Not yet public" />
              <StatCard icon={UsersRound} label="Applications" value={openingStats.applications} meta="Total submissions" />
              <StatCard icon={CalendarDays} label="Interviews" value={openingStats.interviews} meta="Scheduled or pending" />
            </section>

            {notice ? <div className="admin-alert success" role="status">{notice}</div> : null}

        {activeTab === 'openings' ? (
          <section className={`hr-workspace ${isOpeningEditorVisible ? 'hr-workspace-editor-open' : 'hr-workspace-list-only'}`}>
            <div className="hr-panel">
              <div className="hr-panel-head">
                <div>
                  <span className="hr-panel-kicker">Openings</span>
                  <h2>{openingStats.total} Job Records</h2>
                </div>
                <button className="hr-btn hr-btn-primary" type="button" onClick={handleNewOpening}>
                  <Plus size={16} />
                  Create Opening
                </button>
              </div>

              <label className="hr-search">
                <Search size={17} />
                <input
                  value={openingSearch}
                  onChange={(event) => setOpeningSearch(event.target.value)}
                  placeholder="Search openings"
                />
              </label>

              <div className="hr-list">
                {isLoading ? (
                  <div className="hr-empty">Loading HR records...</div>
                ) : filteredOpenings.length ? (
                  filteredOpenings.map((opening) => (
                    <button
                      className={`hr-opening-card ${editingOpening.id === opening.id ? 'is-selected' : ''}`}
                      key={opening.id}
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
                    </button>
                  ))
                ) : (
                  <div className="hr-empty">No job openings found.</div>
                )}
              </div>
            </div>

            {isOpeningEditorVisible ? (
              <form ref={openingEditorRef} className="hr-panel hr-editor" onSubmit={handleSaveOpening} data-hr-opening-editor="true">
                <div className="hr-panel-head">
                  <div>
                    <span className="hr-panel-kicker">Create Opening</span>
                    <h2>{editingOpening.id ? 'Update Job Opening' : 'New Job Opening'}</h2>
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
                  <label className="hr-field hr-field-wide">
                    <span>Description</span>
                    <textarea
                      value={editingOpening.description}
                      onChange={(event) => handleOpeningChange('description', event.target.value)}
                      placeholder="Write the role summary, qualifications, and application notes."
                      rows={8}
                    />
                  </label>
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
          <section className="hr-workspace applications-layout">
            <div className="hr-panel">
              <div className="hr-panel-head">
                <div>
                  <span className="hr-panel-kicker">Applications</span>
                  <h2>{filteredApplications.length} Records</h2>
                </div>
                <button className="hr-btn" type="button" onClick={() => handlePrintApplicationsReport()}>
                  <Printer size={16} />
                  Report
                </button>
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
              </div>

              <div className="hr-application-filters" aria-label="Filter applications by status">
                {applicationStatusFilters.map((filter) => (
                  <button
                    className={`hr-filter-pill ${applicationStatus === filter.value ? 'active' : ''}`}
                    key={filter.value}
                    type="button"
                    onClick={() => setApplicationStatus(filter.value)}
                    aria-pressed={applicationStatus === filter.value}
                  >
                    <span>{filter.label}</span>
                    <strong>{filter.count}</strong>
                  </button>
                ))}
              </div>

              <div className="hr-application-list">
                {isLoading ? (
                  <div className="hr-empty">Loading applications...</div>
                ) : filteredApplications.length ? (
                  filteredApplications.map((application) => (
                    <button
                      className={`hr-application-row ${
                        selectedApplication?.id === application.id ? 'is-selected' : ''
                      }`}
                      key={application.id}
                      type="button"
                      onClick={() => setSelectedApplication(application)}
                    >
                      <div className="hr-application-row-main">
                        <strong>{application.applicantName || 'Unnamed Applicant'}</strong>
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
                  <div className="hr-empty">No applications found.</div>
                )}
              </div>
            </div>

            <aside className="hr-panel hr-application-detail">
              {selectedApplication ? (
                <>
                  <div className="hr-panel-head">
                    <div>
                      <span className="hr-panel-kicker">Applicant</span>
                      <h2>{selectedApplication.applicantName || 'Unnamed Applicant'}</h2>
                    </div>
                    {isSuperAdminRole(user?.role) ? (
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

                  <div className="hr-detail-grid">
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

                  {selectedApplication.resumeUrl ? (
                    <div className="hr-resume-actions">
                      <button
                        className="hr-resume-link"
                        type="button"
                        onClick={() => handleViewResume(selectedApplication)}
                      >
                        <ExternalLink size={16} />
                        View Resume
                      </button>
                    </div>
                  ) : null}

                  <label className="hr-field">
                    <span>Status</span>
                    <select
                      value={selectedApplication.status}
                      onChange={(event) => handleApplicationUpdate({ status: event.target.value })}
                      disabled={isSaving}
                    >
                      {APPLICATION_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {statusLabel(status)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="hr-history">
                    <span className="hr-history-title">Application Timeline</span>
                    {getApplicationStatusTimeline(selectedApplication).map((entry, index) => (
                      <div className="hr-history-item" key={`${entry.status}-${entry.timestamp || index}`}>
                        <span className={`hr-status-chip status-${entry.status}`}>{statusLabel(entry.status)}</span>
                        <div>
                          <strong>{getTimelineEntryLabel(entry)}</strong>
                          <small>
                            {formatDate(entry.timestamp)}{entry.updatedByName ? ` by ${entry.updatedByName}` : ''}
                          </small>
                        </div>
                      </div>
                    ))}
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
        ) : (
          <section className="hr-report-console">
            <section className="hr-panel">
              <div className="hr-panel-head">
                <div>
                  <span className="hr-panel-kicker">Reports</span>
                  <h2>Applicant Status Report</h2>
                </div>
                <button className="hr-btn hr-btn-primary" type="button" onClick={() => handlePrintApplicationsReport(applicationStatus)}>
                  <Printer size={16} />
                  Print Report
                </button>
              </div>

              <div className="hr-report-summary" aria-label="Applicant status counts">
                {APPLICATION_STATUSES.map((status) => {
                  const count = applications.filter((application) => application.status === status).length;
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

            <section className="hr-panel">
              <div className="hr-panel-head">
                <div>
                  <span className="hr-panel-kicker">Applicant Records</span>
                  <h2>{filteredApplications.length} Applicants</h2>
                </div>
              </div>

              <label className="hr-search hr-report-search">
                <Search size={17} />
                <input
                  value={applicationSearch}
                  onChange={(event) => setApplicationSearch(event.target.value)}
                  placeholder="Search applicant records"
                />
              </label>

              <div className="hr-report-table-wrap">
                <table className="hr-report-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Role</th>
                      <th>Submitted</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApplications.length ? (
                      filteredApplications.map((application) => (
                        <tr key={application.id}>
                          <td>{application.applicantName || 'Unnamed Applicant'}</td>
                          <td>{application.email || 'Not provided'}</td>
                          <td>{application.phone || 'Not provided'}</td>
                          <td>{application.jobTitle || 'General Application'}</td>
                          <td>{formatDate(application.createdAt)}</td>
                          <td>
                            <span className={`hr-status-chip status-${application.status}`}>
                              {statusLabel(application.status)}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6}>No applicants found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        )}
          </section>
        </div>
      </div>

    </main>
  );
}
