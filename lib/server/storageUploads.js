import { randomUUID } from 'crypto';

const DATA_URL_PATTERN = /^data:([^;,]+)?(;base64)?,(.*)$/s;

const EXTENSION_BY_TYPE = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
};

const sanitizeFileName = (value = 'attachment') =>
  String(value || 'attachment')
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'attachment';

const parseDataUrl = (value = '') => {
  const match = String(value || '').match(DATA_URL_PATTERN);
  if (!match) return null;

  const contentType = match[1] || 'application/octet-stream';
  const isBase64 = Boolean(match[2]);
  const body = match[3] || '';
  const buffer = isBase64
    ? Buffer.from(body, 'base64')
    : Buffer.from(decodeURIComponent(body), 'utf8');

  return { contentType, buffer };
};

export const uploadDataUrlToStorage = async (
  supabase,
  {
    bucket,
    folder,
    dataUrl,
    fileName = 'attachment',
    maxBytes = 5 * 1024 * 1024,
    allowedTypes = [],
  }
) => {
  const parsed = parseDataUrl(dataUrl);

  if (!parsed) return null;

  if (allowedTypes.length && !allowedTypes.includes(parsed.contentType)) {
    throw new Error('Attachment type is not allowed.');
  }

  if (parsed.buffer.byteLength > maxBytes) {
    throw new Error('Attachment exceeds the allowed file size.');
  }

  const extension = EXTENSION_BY_TYPE[parsed.contentType] || 'bin';
  const cleanName = sanitizeFileName(fileName);
  const path = `${folder}/${Date.now()}-${randomUUID()}-${cleanName}.${extension}`;

  const { error } = await supabase.storage.from(bucket).upload(path, parsed.buffer, {
    cacheControl: '3600',
    contentType: parsed.contentType,
    upsert: false,
  });

  if (error) {
    throw new Error(error.message || 'Unable to upload attachment.');
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);

  return {
    path,
    url: data?.publicUrl || '',
    dataUrl: '',
    type: parsed.contentType,
    size: parsed.buffer.byteLength,
  };
};

export const sanitizeStoredAttachment = (attachment = {}) => {
  const url = attachment.url || attachment.publicUrl || '';

  return {
    id: attachment.id || attachment.path || attachment.name || randomUUID(),
    name: attachment.name || attachment.fileName || 'Attachment',
    type: attachment.type || attachment.mimeType || '',
    size: attachment.size || attachment.sizeBytes || 0,
    sizeLabel: attachment.sizeLabel || '',
    dataUrl: '',
    url,
    path: attachment.path || '',
    uploadedAt: attachment.uploadedAt || attachment.createdAt || new Date().toISOString(),
  };
};
