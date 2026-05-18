'use client';

import { createClient } from '@/lib/supabase/client';

const JOB_OPENING_COLUMNS = `
  id,
  slug,
  title,
  department,
  location,
  employment_type,
  description,
  image_url,
  status,
  display_order,
  published_at,
  created_by,
  updated_by,
  created_at,
  updated_at
`;

const BASE_JOB_APPLICATION_COLUMNS = `
  id,
  job_id,
  job_title,
  applicant_name,
  email,
  phone,
  resume_url,
  cover_letter,
  status,
  hr_notes,
  created_at,
  updated_at
`;

const JOB_APPLICATION_COLUMNS = `
  ${BASE_JOB_APPLICATION_COLUMNS},
  status_history,
  interview_at,
  interview_type,
  interviewer
`;

const RESUME_BUCKET = 'job-resumes';
const RESUME_MAX_SIZE = 10 * 1024 * 1024;
const RESUME_ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const slugify = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `job-${Date.now()}`;

const sanitizeFileName = (value = '') =>
  String(value || 'resume')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'resume';

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Unable to read the selected resume file.'));
    reader.readAsDataURL(file);
  });

const mapOpeningRow = (row) => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  department: row.department || '',
  location: row.location || '',
  type: row.employment_type || 'Full-time',
  description: row.description || '',
  image: row.image_url || '',
  status: row.status || 'draft',
  displayOrder: row.display_order || 0,
  publishedAt: row.published_at || '',
  createdBy: row.created_by || '',
  updatedBy: row.updated_by || '',
  createdAt: row.created_at || '',
  updatedAt: row.updated_at || '',
});

const normalizeStatusHistory = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const mapApplicationRow = (row) => ({
  id: row.id,
  jobId: row.job_id || '',
  jobTitle: row.job_title || 'General Application',
  applicantName: row.applicant_name || '',
  email: row.email || '',
  phone: row.phone || '',
  resumeUrl: row.resume_url || '',
  coverLetter: row.cover_letter || '',
  status: row.status || 'new',
  hrNotes: row.hr_notes || '',
  statusHistory: normalizeStatusHistory(row.status_history),
  interviewAt: row.interview_at || '',
  interviewType: row.interview_type || '',
  interviewer: row.interviewer || '',
  createdAt: row.created_at || '',
  updatedAt: row.updated_at || '',
});

const toOpeningPayload = (opening, user) => ({
  slug: opening.slug?.trim() || slugify(opening.title),
  title: opening.title?.trim() || 'Untitled Opening',
  department: opening.department?.trim() || 'Unspecified',
  location: opening.location?.trim() || 'Unspecified',
  employment_type: opening.type || opening.employmentType || 'Full-time',
  description: opening.description?.trim() || '',
  image_url: opening.image || opening.imageUrl || '',
  status: opening.status || 'draft',
  display_order: 0,
  published_at:
    opening.status === 'open'
      ? opening.publishedAt || new Date().toISOString()
      : opening.publishedAt || null,
  updated_by: user?.id || null,
});

const isMissingOptionalApplicationColumnError = (error) =>
  error?.code === '42703' ||
  error?.code === 'PGRST204' ||
  ['status_history', 'interview_at', 'interview_type', 'interviewer'].some((column) =>
    error?.message?.toLowerCase().includes(column)
  );

const withoutOptionalApplicationFields = (payload = {}) => {
  const nextPayload = { ...payload };
  delete nextPayload.status_history;
  delete nextPayload.interview_at;
  delete nextPayload.interview_type;
  delete nextPayload.interviewer;
  return nextPayload;
};

const uploadResumeFile = async (supabase, file, application) => {
  if (!file) return application.resumeUrl || '';

  if (!RESUME_ALLOWED_TYPES.has(file.type)) {
    throw new Error('Attach a PDF, DOC, or DOCX resume file.');
  }

  if (file.size > RESUME_MAX_SIZE) {
    throw new Error('Resume file must be 10 MB or smaller.');
  }

  const resumeDataUrl = async () => {
    const dataUrl = await fileToDataUrl(file);
    return dataUrl || application.resumeUrl || '';
  };

  const jobSlug = slugify(application.jobTitle || 'general-application');
  const timestamp = Date.now();
  const randomId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  const filePath = `${jobSlug}/${timestamp}-${randomId}-${sanitizeFileName(file.name)}`;

  const { error: uploadError } = await supabase.storage
    .from(RESUME_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return resumeDataUrl();
  }

  const { data } = supabase.storage.from(RESUME_BUCKET).getPublicUrl(filePath);

  return data?.publicUrl || '';
};

export async function listOpenJobOpenings() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('job_openings')
    .select(JOB_OPENING_COLUMNS)
    .eq('status', 'open')
    .order('display_order', { ascending: true })
    .order('published_at', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message || 'Unable to load job openings.');

  return (data || []).map(mapOpeningRow);
}

export async function listJobOpenings() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('job_openings')
    .select(JOB_OPENING_COLUMNS)
    .order('created_at', { ascending: false })
    .order('updated_at', { ascending: false });

  if (error) throw new Error(error.message || 'Unable to load job openings.');

  return (data || []).map(mapOpeningRow);
}

export async function saveJobOpening(opening, user) {
  const supabase = createClient();
  const payload = {
    ...toOpeningPayload(opening, user),
    created_by: opening.id ? opening.createdBy || null : user?.id || null,
  };

  const query = opening.id
    ? supabase.from('job_openings').update(payload).eq('id', opening.id)
    : supabase.from('job_openings').insert(payload);

  const { data, error } = await query.select(JOB_OPENING_COLUMNS).single();

  if (error) throw new Error(error.message || 'Unable to save job opening.');

  return mapOpeningRow(data);
}

export async function deleteJobOpening(id) {
  const supabase = createClient();
  const { error } = await supabase.from('job_openings').delete().eq('id', id);

  if (error) throw new Error(error.message || 'Unable to delete job opening.');
}

export async function createJobApplication(application) {
  const supabase = createClient();
  const resumeUrl = await uploadResumeFile(supabase, application.resumeFile, application);

  if (!resumeUrl) {
    throw new Error('Attach your resume file before submitting.');
  }

  const payload = {
    job_id: application.jobId || null,
    job_title: application.jobTitle || 'General Application',
    applicant_name: application.applicantName?.trim() || '',
    email: application.email?.trim() || '',
    phone: application.phone?.trim() || '',
    resume_url: resumeUrl,
    cover_letter: application.coverLetter?.trim() || '',
    status: 'new',
    hr_notes: '',
    status_history: [
      {
        status: 'new',
        label: 'Application Submitted',
        timestamp: new Date().toISOString(),
        updatedByName: application.applicantName?.trim() || 'Applicant',
      },
    ],
  };

  let { data, error } = await supabase
    .from('job_applications')
    .insert(payload)
    .select(JOB_APPLICATION_COLUMNS)
    .single();

  if (error && isMissingOptionalApplicationColumnError(error)) {
    const fallback = await supabase
      .from('job_applications')
      .insert(withoutOptionalApplicationFields(payload))
      .select(BASE_JOB_APPLICATION_COLUMNS)
      .single();

    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw new Error(error.message || 'Unable to submit application.');

  return mapApplicationRow(data);
}

export async function listJobApplications() {
  const supabase = createClient();
  let { data, error } = await supabase
    .from('job_applications')
    .select(JOB_APPLICATION_COLUMNS)
    .order('created_at', { ascending: false });

  if (error && isMissingOptionalApplicationColumnError(error)) {
    const fallback = await supabase
      .from('job_applications')
      .select(BASE_JOB_APPLICATION_COLUMNS)
      .order('created_at', { ascending: false });

    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw new Error(error.message || 'Unable to load applications.');

  return (data || []).map(mapApplicationRow);
}

export async function updateJobApplication(id, updates) {
  const supabase = createClient();
  const previousHistory = normalizeStatusHistory(updates.statusHistory);
  const nextStatus = updates.status || 'new';
  const previousStatus = updates.previousStatus || updates.currentStatus || '';
  const lastHistoryStatus = previousHistory.at(-1)?.status || '';
  const shouldAddHistory =
    nextStatus &&
    nextStatus !== previousStatus &&
    nextStatus !== lastHistoryStatus;
  const statusHistory = shouldAddHistory
    ? [
        ...previousHistory,
        {
          status: nextStatus,
          label: `Moved to ${nextStatus}`,
          timestamp: new Date().toISOString(),
          updatedBy: updates.updatedBy || '',
          updatedByName: updates.updatedByName || 'HR',
        },
      ]
    : previousHistory;
  const payload = {
    status: nextStatus,
    hr_notes: updates.hrNotes || '',
    status_history: statusHistory,
    interview_at: updates.interviewAt || null,
    interview_type: updates.interviewType || '',
    interviewer: updates.interviewer || '',
  };

  let { data, error } = await supabase
    .from('job_applications')
    .update(payload)
    .eq('id', id)
    .select(JOB_APPLICATION_COLUMNS)
    .single();

  if (error && isMissingOptionalApplicationColumnError(error)) {
    const fallback = await supabase
      .from('job_applications')
      .update(withoutOptionalApplicationFields(payload))
      .eq('id', id)
      .select(BASE_JOB_APPLICATION_COLUMNS)
      .single();

    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw new Error(error.message || 'Unable to update application.');

  return mapApplicationRow(data);
}

const getResumeStoragePath = (resumeUrl = '') => {
  if (!resumeUrl || resumeUrl.startsWith('data:')) return '';

  try {
    const url = new URL(resumeUrl);
    const marker = `/${RESUME_BUCKET}/`;
    const markerIndex = url.pathname.indexOf(marker);

    if (markerIndex === -1) return '';

    return decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
  } catch {
    return '';
  }
};

export async function deleteJobApplication(id, resumeUrl = '') {
  const supabase = createClient();
  const { error } = await supabase.from('job_applications').delete().eq('id', id);

  if (error) throw new Error(error.message || 'Unable to delete application.');

  const resumePath = getResumeStoragePath(resumeUrl);
  if (resumePath) {
    await supabase.storage.from(RESUME_BUCKET).remove([resumePath]).catch(() => {});
  }

  return true;
}
