import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, rateLimitResponse } from '@/lib/server/rateLimit';

const RESUME_BUCKET = 'job-resumes';
const APPLICATION_FILE_MAX_SIZE = 10 * 1024 * 1024;
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
const isPdfFile = async (file) =>
  file.name?.toLowerCase().endsWith('.pdf') && (await file.slice(0, 5).text()) === '%PDF-';

const uploadApplicationFile = async (supabase, file, jobTitle, kind) => {
  const jobSlug = slugify(jobTitle || 'general-application');
  const randomId = randomUUID();
  const folder = kind === 'cover-letter' ? 'cover-letters' : 'resumes';
  const filePath = `${folder}/${jobSlug}/${Date.now()}-${randomId}-${sanitizeFileName(file.name)}`;

  const { error } = await supabase.storage.from(RESUME_BUCKET).upload(filePath, file, {
    cacheControl: '3600',
    contentType: 'application/pdf',
    upsert: false,
  });

  if (error) {
    throw new Error(error.message || `Unable to upload ${kind === 'cover-letter' ? 'cover letter' : 'resume'}.`);
  }

  const { data } = supabase.storage.from(RESUME_BUCKET).getPublicUrl(filePath);

  return { url: data?.publicUrl || '', path: filePath };
};

const uploadResumeFile = async (supabase, file, jobTitle) => {
  if (!file || typeof file === 'string' || !file.size) {
    throw new Error('Attach your resume file before submitting.');
  }

  if (!(await isPdfFile(file))) {
    throw new Error('Attach your resume as a valid PDF file.');
  }

  if (file.size > APPLICATION_FILE_MAX_SIZE) {
    throw new Error('Resume file must be 10 MB or smaller.');
  }

  return uploadApplicationFile(supabase, file, jobTitle, 'resume');
};

const uploadCoverLetterFile = async (supabase, file, jobTitle) => {
  if (!file || typeof file === 'string' || !file.size) return null;

  if (!(await isPdfFile(file))) {
    throw new Error('Attach your cover letter as a valid PDF file.');
  }

  if (file.size > APPLICATION_FILE_MAX_SIZE) {
    throw new Error('Cover letter must be 10 MB or smaller.');
  }

  return uploadApplicationFile(supabase, file, jobTitle, 'cover-letter');
};

export async function POST(request) {
  let supabase;
  const uploadedPaths = [];

  try {
    const rateLimit = checkRateLimit(request, {
      key: 'jobs:applications:create',
      limit: 5,
      windowMs: 60_000,
    });

    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

    const formData = await request.formData();
    supabase = await createClient();
    const jobTitle = getString(formData, 'jobTitle') || 'General Application';
    const applicantName = getString(formData, 'applicantName');
    const email = getString(formData, 'email');
    const resumeFile = formData.get('resumeFile');
    const coverLetterFile = formData.get('coverLetterFile');

    if (!applicantName) throw new Error('Applicant name is required.');
    if (!email) throw new Error('Email address is required.');

    const resume = await uploadResumeFile(supabase, resumeFile, jobTitle);
    uploadedPaths.push(resume.path);
    const coverLetter = await uploadCoverLetterFile(supabase, coverLetterFile, jobTitle);
    if (coverLetter?.path) uploadedPaths.push(coverLetter.path);

    const payload = {
      job_id: getString(formData, 'jobId') || null,
      job_title: jobTitle,
      applicant_name: applicantName,
      email,
      phone: getString(formData, 'phone'),
      resume_url: resume.url,
      cover_letter: coverLetter?.url || '',
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

    uploadedPaths.length = 0;
    return NextResponse.json({ application: data }, { status: 201 });
  } catch (error) {
    if (supabase && uploadedPaths.length) {
      await supabase.storage.from(RESUME_BUCKET).remove(uploadedPaths).catch(() => {});
    }

    return NextResponse.json(
      { error: error.message || 'Unable to submit application.' },
      { status: 400 }
    );
  }
}
