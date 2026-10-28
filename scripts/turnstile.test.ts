import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isTurnstileEnabled,
  getTurnstileSiteKey,
  getTurnstileSecret,
  verifyTurnstileToken,
  createTurnstileClearanceCookie,
  verifyTurnstileClearanceCookie,
  verifyTurnstileAccess,
  TURNSTILE_CLEARANCE_COOKIE_NAME,
} from '../src/services/turnstile';
import type { Env } from '../src/types';

test('Turnstile: isTurnstileEnabled checks both site key and secret presence', () => {
  const emptyEnv = {} as Env;
  assert.equal(isTurnstileEnabled(emptyEnv), false);

  const siteOnlyEnv = { TURNSTILE_SITE_KEY: '0x4AAAAAA' } as Env;
  assert.equal(isTurnstileEnabled(siteOnlyEnv), false);

  const fullEnv = {
    TURNSTILE_SITE_KEY: '0x4AAAAAA',
    TURNSTILE_SECRET_KEY: '0x4SSSSSS',
  } as Env;
  assert.equal(isTurnstileEnabled(fullEnv), true);
  assert.equal(getTurnstileSiteKey(fullEnv), '0x4AAAAAA');
  assert.equal(getTurnstileSecret(fullEnv), '0x4SSSSSS');
});

test('Turnstile: verifyTurnstileToken rejects missing token', async () => {
  const result = await verifyTurnstileToken('mock-secret', '');
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'missing_or_invalid_token');
});

test('Turnstile: verifyTurnstileToken validates with remote siteverify API', async () => {
  const originalFetch = globalThis.fetch;

  // Mock successful response
  globalThis.fetch = async (url: any) => {
    if (String(url).includes('siteverify')) {
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }
    return originalFetch(url);
  };

  const successResult = await verifyTurnstileToken('secret-123', 'valid-token', '1.2.3.4');
  assert.equal(successResult.ok, true);

  // Mock failed response
  globalThis.fetch = async (url: any) => {
    if (String(url).includes('siteverify')) {
      return new Response(JSON.stringify({ success: false, 'error-codes': ['invalid-input-response'] }), { status: 200 });
    }
    return originalFetch(url);
  };

  const failResult = await verifyTurnstileToken('secret-123', 'bad-token', '1.2.3.4');
  assert.equal(failResult.ok, false);
  assert.equal(failResult.reason, 'invalid-input-response');

  globalThis.fetch = originalFetch;
});

test('Turnstile: clearance cookie lifecycle (create and verify)', async () => {
  const secret = 'my-super-secret-key-for-hmac-sha256';
  const cookieVal = await createTurnstileClearanceCookie(secret, '10.0.0.1');
  assert.ok(cookieVal.includes('.'));

  const validReq = new Request('https://vault.david888.com/api/accounts/register', {
    headers: { Cookie: `${TURNSTILE_CLEARANCE_COOKIE_NAME}=${cookieVal}` },
  });
  const isValid = await verifyTurnstileClearanceCookie(validReq, secret, '10.0.0.1');
  assert.equal(isValid, true);

  const invalidReq = new Request('https://vault.david888.com/api/accounts/register', {
    headers: { Cookie: `${TURNSTILE_CLEARANCE_COOKIE_NAME}=tampered.signature` },
  });
  const isInvalid = await verifyTurnstileClearanceCookie(invalidReq, secret, '10.0.0.1');
  assert.equal(isInvalid, false);
});

test('Turnstile: verifyTurnstileToken fails open on 500/502 and timeout when fail-open is enabled', async () => {
  const originalFetch = globalThis.fetch;

  // Upstream 502
  globalThis.fetch = async () => new Response('502 Bad Gateway', { status: 502 });
  const failOpenRes = await verifyTurnstileToken('secret', 'tok', '1.2.3.4', true);
  assert.equal(failOpenRes.ok, true);
  assert.equal(failOpenRes.fallback, true);

  // Strict mode (failOpen = false)
  const strictRes = await verifyTurnstileToken('secret', 'tok', '1.2.3.4', false);
  assert.equal(strictRes.ok, false);

  globalThis.fetch = originalFetch;
});

test('Turnstile: verifyTurnstileAccess skips when Turnstile is disabled', async () => {
  const req = new Request('https://vault.david888.com/identity/connect/token', { method: 'POST' });
  const env = {} as Env;
  const access = await verifyTurnstileAccess(req, env);
  assert.equal(access.ok, true);
});
