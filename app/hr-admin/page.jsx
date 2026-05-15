'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BriefcaseBusiness,
  Edit3,
  ExternalLink,
  FileText,
  ImagePlus,
  LayoutDashboard,
  LogOut,
  Plus,
  RefreshCw,
  Save,
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
  deleteJobOpening,
  listJobApplications,
  listJobOpenings,
  saveJobOpening,
  updateJobApplication,
} from '@/lib/hr/hrContent';
import '../admin-dashboard/admin-dashboard.css';
import './hr-admin.css';

const HRMAX_ROUTE = '/HRMax';
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
  displayOrder: 0,
  publishedAt: '',
  createdBy: '',
};

const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Temporary', 'Internship'];
const OPENING_STATUSES = ['draft', 'open', 'closed'];
const APPLICATION_STATUSES = ['new', 'reviewing', 'shortlisted', 'interview', 'hired', 'rejected'];

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
  const [user, setUser] = useState(null);
  const [checked, setChecked] = useState(false);
  const [openings, setOpenings] = useState([]);
  const [applications, setApplications] = useState([]);
  const [editingOpening, setEditingOpening] = useState(EMPTY_OPENING);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [activeTab, setActiveTab] = useState('openings');
  const [openingSearch, setOpeningSearch] = useState('');
  const [applicationSearch, setApplicationSearch] = useState('');
  const [applicationStatus, setApplicationStatus] = useState('all');
  const [lastSynced, setLastSynced] = useState('');
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
      setOpenings(openingRows);
      setApplications(applicationRows);
      setLastSynced(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
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

  const openingStats = useMemo(
    () => ({
      total: openings.length,
      open: openings.filter((opening) => opening.status === 'open').length,
      draft: openings.filter((opening) => opening.status === 'draft').length,
      applications: applications.length,
      newApplications: applications.filter((application) => application.status === 'new').length,
    }),
    [applications, openings],
  );

  const filteredOpenings = useMemo(() => {
    const query = normalizeText(openingSearch);
    if (!query) return openings;

    return openings.filter((opening) =>
      [opening.title, opening.department, opening.location, opening.status]
        .map(normalizeText)
        .some((value) => value.includes(query)),
    );
  }, [openingSearch, openings]);

  const filteredApplications = useMemo(() => {
    const query = normalizeText(applicationSearch);
    return applications.filter((application) => {
      const matchesStatus = applicationStatus === 'all' || application.status === applicationStatus;
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
  }, [applicationSearch, applicationStatus, applications]);

  const handleOpeningChange = (field, value) => {
    setEditingOpening((current) => ({ ...current, [field]: value }));
  };

  const handleNewOpening = () => {
    setEditingOpening(EMPTY_OPENING);
    setNotice('');
    setImageUploadMeta('');
  };

  const handleEditOpening = (opening) => {
    setEditingOpening(opening);
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
          return current.map((opening) => (opening.id === savedOpening.id ? savedOpening : opening));
        }
        return [savedOpening, ...current];
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
      if (editingOpening.id === opening.id) setEditingOpening(EMPTY_OPENING);
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
      });
      setApplications((current) =>
        current.map((application) =>
          application.id === updatedApplication.id ? updatedApplication : application,
        ),
      );
      setSelectedApplication(updatedApplication);
      setNotice(`${updatedApplication.applicantName || 'Application'} has been updated.`);
    } catch (error) {
      setNotice(error.message || 'Unable to update this application.');
    } finally {
      setIsSaving(false);
    }
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
              {lastSynced ? `Synced ${lastSynced}` : 'Loading'}
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
              <button type="button" className="sidebar-nav-btn" onClick={loadHrData}>
                <RefreshCw className="sidebar-nav-icon" aria-hidden="true" />
                Refresh
              </button>
            </nav>

            <div className="sidebar-logout">
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
              <span className="marketing-sync-badge">
                {activeTab === 'openings' ? `${filteredOpenings.length} Jobs` : `${filteredApplications.length} Applicants`}
              </span>
            </section>

            <section className="stats-grid" aria-label="HR summary">
              <StatCard icon={BriefcaseBusiness} label="Open Roles" value={openingStats.open} meta="Visible on Careers" />
              <StatCard icon={Edit3} label="Drafts" value={openingStats.draft} meta="Not yet public" />
              <StatCard icon={UsersRound} label="Applications" value={openingStats.applications} meta="Total submissions" />
              <StatCard icon={FileText} label="New" value={openingStats.newApplications} meta="Needs HR review" />
            </section>

            {notice ? <div className="admin-alert success" role="status">{notice}</div> : null}

        {activeTab === 'openings' ? (
          <section className="hr-workspace">
            <div className="hr-panel">
              <div className="hr-panel-head">
                <div>
                  <span className="hr-panel-kicker">Openings</span>
                  <h2>{openingStats.total} Job Records</h2>
                </div>
                <button className="hr-btn hr-btn-primary" type="button" onClick={handleNewOpening}>
                  <Plus size={16} />
                  New
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

            <form className="hr-panel hr-editor" onSubmit={handleSaveOpening} data-hr-opening-editor="true">
              <div className="hr-panel-head">
                <div>
                  <span className="hr-panel-kicker">Editor</span>
                  <h2>{editingOpening.id ? 'Update Opening' : 'Create Opening'}</h2>
                </div>
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

              <div className="hr-form-grid">
                <label className="hr-field hr-field-wide">
                  <span>Job Title</span>
                  <input
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
                <label className="hr-field">
                  <span>Status</span>
                  <select
                    value={editingOpening.status}
                    onChange={(event) => handleOpeningChange('status', event.target.value)}
                  >
                    {OPENING_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {statusLabel(status)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="hr-field">
                  <span>Display Order</span>
                  <input
                    min="0"
                    type="number"
                    value={editingOpening.displayOrder}
                    onChange={(event) => handleOpeningChange('displayOrder', event.target.value)}
                  />
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
                        className="hr-btn"
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                      >
                        <UploadCloud size={16} />
                        Upload Image
                      </button>
                      <button
                        className="hr-btn"
                        type="button"
                        onClick={() => {
                          handleOpeningChange('image', '');
                          setImageUploadMeta('');
                        }}
                        disabled={!editingOpening.image}
                      >
                        <X size={16} />
                        Remove
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
                <button className="hr-btn" type="button" onClick={handleNewOpening}>
                  <X size={16} />
                  Clear
                </button>
                <button className="hr-btn" type="button" onClick={() => saveOpeningWithStatus('draft')} disabled={isSaving}>
                  <FileText size={16} />
                  Save Draft
                </button>
                <button className="hr-btn" type="button" onClick={() => saveOpeningWithStatus('closed')} disabled={isSaving}>
                  <X size={16} />
                  Close
                </button>
                <button className="hr-btn hr-btn-primary" type="submit" disabled={isSaving}>
                  <Save size={16} />
                  {isSaving ? 'Saving...' : 'Save Opening'}
                </button>
                <button className="hr-btn hr-btn-primary" type="button" onClick={() => saveOpeningWithStatus('open')} disabled={isSaving}>
                  <UploadCloud size={16} />
                  Publish
                </button>
              </div>
            </form>
          </section>
        ) : (
          <section className="hr-workspace applications-layout">
            <div className="hr-panel">
              <div className="hr-panel-head">
                <div>
                  <span className="hr-panel-kicker">Applications</span>
                  <h2>{filteredApplications.length} Records</h2>
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
                <select
                  value={applicationStatus}
                  onChange={(event) => setApplicationStatus(event.target.value)}
                >
                  <option value="all">All Statuses</option>
                  {APPLICATION_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {statusLabel(status)}
                    </option>
                  ))}
                </select>
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
                      <div>
                        <strong>{application.applicantName || 'Unnamed Applicant'}</strong>
                        <span>{application.jobTitle}</span>
                      </div>
                      <small>{formatDate(application.createdAt)}</small>
                      <span className={`hr-status-chip status-${application.status}`}>
                        {statusLabel(application.status)}
                      </span>
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
                  </div>

                  <div className="hr-detail-grid">
                    <div>
                      <span>Email</span>
                      <strong>{selectedApplication.email || 'Not provided'}</strong>
                    </div>
                    <div>
                      <span>Phone</span>
                      <strong>{selectedApplication.phone || 'Not provided'}</strong>
                    </div>
                    <div>
                      <span>Applied For</span>
                      <strong>{selectedApplication.jobTitle}</strong>
                    </div>
                    <div>
                      <span>Submitted</span>
                      <strong>{formatDate(selectedApplication.createdAt)}</strong>
                    </div>
                  </div>

                  {selectedApplication.resumeUrl ? (
                    <a
                      className="hr-resume-link"
                      href={selectedApplication.resumeUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink size={16} />
                      View Resume
                    </a>
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

                  <label className="hr-field">
                    <span>Cover Letter</span>
                    <textarea value={selectedApplication.coverLetter || 'No cover letter submitted.'} rows={6} readOnly />
                  </label>

                  <label className="hr-field">
                    <span>HR Notes</span>
                    <textarea
                      value={selectedApplication.hrNotes || ''}
                      onChange={(event) =>
                        setSelectedApplication((current) => ({
                          ...current,
                          hrNotes: event.target.value,
                        }))
                      }
                      rows={6}
                      placeholder="Add screening notes, interview schedule, or next step."
                    />
                  </label>

                  <button
                    className="hr-btn hr-btn-primary hr-full-btn"
                    type="button"
                    onClick={() => handleApplicationUpdate({ hrNotes: selectedApplication.hrNotes })}
                    disabled={isSaving}
                  >
                    <Save size={16} />
                    {isSaving ? 'Saving...' : 'Save Notes'}
                  </button>
                </>
              ) : (
                <div className="hr-empty detail-empty">
                  <UsersRound size={24} />
                  Select an application to review details.
                </div>
              )}
            </aside>
          </section>
        )}
          </section>
        </div>
      </div>
    </main>
  );
}
