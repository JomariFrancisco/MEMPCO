const buckets = new Map();

const getClientIp = (request) => {
  const forwardedFor = request.headers.get('x-forwarded-for') || '';
  const realIp = request.headers.get('x-real-ip') || '';

  return forwardedFor.split(',')[0]?.trim() || realIp.trim() || 'unknown';
};

export const checkRateLimit = (
  request,
  {
    key = 'global',
    limit = 20,
    windowMs = 60_000,
    identity = '',
  } = {}
) => {
  const now = Date.now();
  const clientKey = `${key}:${identity || getClientIp(request)}`;
  const current = buckets.get(clientKey);

  if (!current || current.resetAt <= now) {
    buckets.set(clientKey, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: Math.max(limit - 1, 0), resetAt: now + windowMs };
  }

  if (current.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: current.resetAt };
  }

  current.count += 1;
  buckets.set(clientKey, current);

  return { allowed: true, remaining: Math.max(limit - current.count, 0), resetAt: current.resetAt };
};

export const rateLimitResponse = (result) =>
  Response.json(
    { error: 'Too many requests. Please wait a moment before trying again.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000))),
      },
    }
  );
