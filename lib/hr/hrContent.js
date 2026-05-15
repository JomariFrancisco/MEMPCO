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

const JOB_APPLICATION_COLUMNS = `
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
  display_order: Number(opening.displayOrder || opening.display_order || 0),
  published_at:
    opening.status === 'open'
      ? opening.publishedAt || new Date().toISOString()
      : opening.publishedAt || null,
  updated_by: user?.id || null,
});

const uploadResumeFile = async (supabase, file, application) => {
  if (!file) return application.resumeUrl || '';

  if (!RESUME_ALLOWED_TYPES.has(file.type)) {
    throw new Error('Attach a PDF, DOC, or DOCX resume file.');
  }

  if (file.size > RESUME_MAX_SIZE) {
    throw new Error('Resume file must be 10 MB or smaller.');
  }

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
    throw new Error(
      uploadError.message ||
        'Unable to upload resume. Make sure the job-resumes storage bucket is ready.'
    );
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
    .order('published_at', { ascending: false });

  if (error) throw new Error(error.message || 'Unable to load job openings.');

  return (data || []).map(mapOpeningRow);
}

export async function listJobOpenings() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('job_openings')
    .select(JOB_OPENING_COLUMNS)
    .order('display_order', { ascending: true })
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
  };

  const { data, error } = await supabase
    .from('job_applications')
    .insert(payload)
    .select(JOB_APPLICATION_COLUMNS)
    .single();

  if (error) throw new Error(error.message || 'Unable to submit application.');

  return mapApplicationRow(data);
}

export async function listJobApplications() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('job_applications')
    .select(JOB_APPLICATION_COLUMNS)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message || 'Unable to load applications.');

  return (data || []).map(mapApplicationRow);
}

export async function updateJobApplication(id, updates) {
  const supabase = createClient();
  const payload = {
    status: updates.status || 'new',
    hr_notes: updates.hrNotes || '',
  };

  const { data, error } = await supabase
    .from('job_applications')
    .update(payload)
    .eq('id', id)
    .select(JOB_APPLICATION_COLUMNS)
    .single();

  if (error) throw new Error(error.message || 'Unable to update application.');

  return mapApplicationRow(data);
}
