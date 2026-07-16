import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, rateLimitResponse } from '@/lib/server/rateLimit';

const RESUME_BUCKET = 'job-resumes';
const RESUME_ALLOWED_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const RESUME_MAX_SIZE = 10 * 1024 * 1024;
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
  status_history,
  interview_at,
  interview_type,
  interviewer,
  created_at,
  updated_at
`;

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

const getString = (formData, key) => String(formData.get(key) || '').trim();

const uploadResumeFile = async (supabase, file, jobTitle) => {
  if (!file || typeof file === 'string' || !file.size) {
    throw new Error('Attach your resume file before submitting.');
  }

  if (!RESUME_ALLOWED_TYPES.has(file.type)) {
    throw new Error('Attach a PDF, DOC, or DOCX resume file.');
  }

  if (file.size > RESUME_MAX_SIZE) {
    throw new Error('Resume file must be 10 MB or smaller.');
  }

  const jobSlug = slugify(jobTitle || 'general-application');
  const randomId = randomUUID();
  const filePath = `${jobSlug}/${Date.now()}-${randomId}-${sanitizeFileName(file.name)}`;

  const { error } = await supabase.storage.from(RESUME_BUCKET).upload(filePath, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    throw new Error(error.message || 'Unable to upload resume. Please try again.');
  }

  const { data } = supabase.storage.from(RESUME_BUCKET).getPublicUrl(filePath);

  return data?.publicUrl || '';
};

export async function POST(request) {
  try {
    const rateLimit = checkRateLimit(request, {
      key: 'jobs:applications:create',
      limit: 5,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

    const formData = await request.formData();
    const supabase = await createClient();
    const jobTitle = getString(formData, 'jobTitle') || 'General Application';
    const applicantName = getString(formData, 'applicantName');
    const email = getString(formData, 'email');
    const resumeFile = formData.get('resumeFile');

    if (!applicantName) throw new Error('Applicant name is required.');
    if (!email) throw new Error('Email address is required.');

    const resumeUrl = await uploadResumeFile(supabase, resumeFile, jobTitle);
    const payload = {
      job_id: getString(formData, 'jobId') || null,
      job_title: jobTitle,
      applicant_name: applicantName,
      email,
      phone: getString(formData, 'phone'),
      resume_url: resumeUrl,
      cover_letter: getString(formData, 'coverLetter'),
      status: 'new',
      hr_notes: '',
      status_history: [
        {
          status: 'new',
          label: 'Application Submitted',
          timestamp: new Date().toISOString(),
          updatedByName: applicantName || 'Applicant',
        },
      ],
    };

    const { data, error } = await supabase
      .from('job_applications')
      .insert(payload)
      .select(JOB_APPLICATION_COLUMNS)
      .single();

    if (error) {
      throw new Error(error.message || 'Unable to submit application.');
    }

    return NextResponse.json({ application: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Unable to submit application.' },
      { status: 400 }
    );
  }
}
