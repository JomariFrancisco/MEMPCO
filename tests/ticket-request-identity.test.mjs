import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequestId, fingerprintRequest } from '../lib/tickets/requestIdentity.mjs';

test('request fingerprints remain stable without Web Crypto', async () => {
  const form = { supportCategory: 'Printer Support', description: 'Paper jam' };
  const first = await fingerprintRequest(form, {});

  assert.equal(first, await fingerprintRequest(form, {}));
  assert.notEqual(first, await fingerprintRequest({ ...form, description: 'Won\'t print' }, {}));
});

test('fallback request IDs remain valid v4 UUIDs without crypto APIs', () => {
  const requestId = createRequestId({});

  assert.match(requestId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
});
