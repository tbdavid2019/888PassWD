import { Env } from '../types';

export const TURNSTILE_CLEARANCE_COOKIE_NAME = 'nw_turnstile_cleared';
export const TURNSTILE_CLEARANCE_MAX_AGE_SECONDS = 7200; // 2 hours

export function getTurnstileSiteKey(env: Env): string {
  return env.TURNSTILE_SITE_KEY || '';
}

export function getTurnstileSecret(env: Env): string {
  return env.TURNSTILE_SECRET_KEY || env.TURNSTILE_SECRET || '';
}

export function isTurnstileEnabled(env: Env): boolean {
  return Boolean(getTurnstileSiteKey(env) && getTurnstileSecret(env));
}

export function isTurnstileFailOpen(env: Env): boolean {
  return env.TURNSTILE_FAIL_OPEN !== '0';
}

/**
 * Verify Cloudflare Turnstile token with upstream siteverify endpoint.
 * Implements 5-second timeout and fail-open on 5xx / timeout when enabled.
 */
export async function verifyTurnstileToken(
  secretKey: string,
  token: string,
  clientIp?: string,
  failOpen: boolean = true
): Promise<{ ok: boolean; reason?: string; fallback?: boolean; outcome?: unknown }> {
  if (!token) {
    return { ok: false, reason: 'missing_or_invalid_token' };
  }

  const formData = new URLSearchParams();
  formData.append('secret', secretKey);
  formData.append('response', token);
  if (clientIp) {
    formData.append('remoteip', clientIp);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.status >= 500 && res.status < 600) {
      if (failOpen) {
        console.warn(`[Turnstile Fallback] siteverify upstream HTTP ${res.status}, failing open`);
        return { ok: true, fallback: true, reason: `upstream_http_${res.status}` };
      }
      return { ok: false, reason: `siteverify_http_${res.status}` };
    }

    const outcome = await res.json() as { success?: boolean; 'error-codes'?: string[] };
    if (outcome && outcome.success) {
      return { ok: true, outcome };
    }

    const errorCodes = outcome?.['error-codes'] || ['invalid_token'];
    return { ok: false, reason: errorCodes.join(',') };
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (failOpen) {
      console.warn(`[Turnstile Fallback] siteverify network error / timeout, failing open:`, error?.message);
      return { ok: true, fallback: true, reason: error?.message || 'upstream_timeout' };
    }
    return { ok: false, reason: error?.message || 'siteverify_failed' };
  }
}

/**
 * Generate HMAC-SHA256 clearance cookie
 */
export async function createTurnstileClearanceCookie(
  secret: string,
  clientIp: string = ''
): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const ipPart = clientIp.slice(0, 48);
  const message = `${timestamp}:${ipPart}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  const sigHex = Array.from(new Uint8Array(sigBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return `${timestamp}.${sigHex}`;
}

/**
 * Validate HMAC-SHA256 clearance cookie
 */
export async function verifyTurnstileClearanceCookie(
  request: Request,
  secret: string,
  clientIp: string = ''
): Promise<boolean> {
  const cookieHeader = request.headers.get('Cookie') || '';
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${TURNSTILE_CLEARANCE_COOKIE_NAME}=([^;]+)`));
  if (!match) return false;

  const cookieVal = decodeURIComponent(match[1]);
  const parts = cookieVal.split('.');
  if (parts.length !== 2) return false;

  const [timestampStr, sigHex] = parts;
  const timestamp = Number.parseInt(timestampStr, 10);
  if (Number.isNaN(timestamp)) return false;

  const now = Math.floor(Date.now() / 1000);
  if (now - timestamp > TURNSTILE_CLEARANCE_MAX_AGE_SECONDS || timestamp > now + 60) {
    return false;
  }

  const ipPart = clientIp.slice(0, 48);
  const message = `${timestamp}:${ipPart}`;
  const encoder = new TextEncoder();
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const sigBytes = new Uint8Array(sigHex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);
    return await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(message));
  } catch {
    return false;
  }
}

export async function verifyTurnstileAccess(
  request: Request,
  env: Env,
  explicitToken?: string | null
): Promise<{ ok: boolean; reason?: string; setCookieHeader?: string | null; needTurnstile?: boolean; fallback?: boolean }> {
  if (!isTurnstileEnabled(env)) {
    return { ok: true };
  }

  const secret = getTurnstileSecret(env);
  const clientIp = request.headers.get('cf-connecting-ip') || '';

  // 1. Fast Path: Valid clearance cookie
  const isCleared = await verifyTurnstileClearanceCookie(request, secret, clientIp);
  if (isCleared) {
    return { ok: true };
  }

  // 2. Token verification
  const token = explicitToken ||
    request.headers.get('cf-turnstile-response') ||
    request.headers.get('x-turnstile-token');

  if (!token) {
    return {
      ok: false,
      needTurnstile: true,
      reason: 'Turnstile verification token required',
    };
  }

  const result = await verifyTurnstileToken(secret, token, clientIp, isTurnstileFailOpen(env));
  if (!result.ok) {
    return {
      ok: false,
      needTurnstile: true,
      reason: result.reason || 'turnstile_verification_failed',
    };
  }

  // 3. Issue clearance cookie
  const clearanceVal = await createTurnstileClearanceCookie(secret, clientIp);
  const isSecure = request.url.startsWith('https:') || request.headers.get('x-forwarded-proto') === 'https';
  const setCookieHeader = `${TURNSTILE_CLEARANCE_COOKIE_NAME}=${clearanceVal}; Path=/; SameSite=Lax; Max-Age=${TURNSTILE_CLEARANCE_MAX_AGE_SECONDS}${isSecure ? '; Secure' : ''}`;

  return {
    ok: true,
    fallback: result.fallback,
    setCookieHeader,
  };
}
