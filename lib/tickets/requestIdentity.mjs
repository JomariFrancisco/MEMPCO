const FALLBACK_HASH_SEEDS = [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35];

const hashWithSeed = (value, seed) => {
  let hash = seed;

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    hash = Math.imul(hash ^ (code & 0xff), 0x01000193);
    hash = Math.imul(hash ^ (code >>> 8), 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
};

export async function fingerprintRequest(value, cryptoProvider = globalThis.crypto) {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);

  if (cryptoProvider?.subtle?.digest && typeof TextEncoder !== 'undefined') {
    try {
      const digest = await cryptoProvider.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(serialized)
      );
      return Array.from(new Uint8Array(digest), (byte) =>
        byte.toString(16).padStart(2, '0')
      ).join('');
    } catch {
      // Fall back when Web Crypto is present but unavailable for this origin.
    }
  }

  return `fallback-${FALLBACK_HASH_SEEDS.map((seed) => hashWithSeed(serialized, seed)).join('')}`;
}

export function createRequestId(cryptoProvider = globalThis.crypto) {
  if (typeof cryptoProvider?.randomUUID === 'function') {
    return cryptoProvider.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (typeof cryptoProvider?.getRandomValues === 'function') {
    cryptoProvider.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
