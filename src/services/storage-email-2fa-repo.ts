export interface Email2faChallengeRow {
  user_id: string;
  email: string;
  code_hash: string;
  attempts: number;
  expires_at: number;
  created_at: number;
}

/**
 * Generates a cryptographically secure, mathematically unbiased 6-digit numeric OTP.
 */
export function generate6DigitOtp(): string {
  const max = 1_000_000;
  const limit = Math.floor(0xffffffff / max) * max;
  const buf = new Uint32Array(1);
  do {
    crypto.getRandomValues(buf);
  } while (buf[0] >= limit);
  return String(buf[0] % max).padStart(6, '0');
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Saves a new Email 2FA OTP challenge for a user with rate-limiting cooldown.
 */
export async function saveEmail2faChallenge(
  db: D1Database,
  userId: string,
  email: string,
  code: string,
  ttlMs: number = 10 * 60 * 1000,
  minIntervalMs: number = 60 * 1000
): Promise<{ success: boolean; rateLimited?: boolean; retryAfterSeconds?: number }> {
  const now = Date.now();

  // Enforce per-user cooldown across all IP addresses to prevent email bombing
  const existing = await db
    .prepare('SELECT created_at, expires_at FROM email_2fa_challenges WHERE user_id = ? LIMIT 1')
    .bind(userId)
    .first<{ created_at: number; expires_at: number }>();

  if (existing && existing.expires_at > now && now - existing.created_at < minIntervalMs) {
    const retryAfter = Math.ceil((minIntervalMs - (now - existing.created_at)) / 1000);
    return { success: false, rateLimited: true, retryAfterSeconds: Math.max(1, retryAfter) };
  }

  const expiresAt = now + ttlMs;
  const codeHash = await sha256Hex(code.trim());

  await db
    .prepare(
      'INSERT INTO email_2fa_challenges(user_id, email, code_hash, attempts, expires_at, created_at) ' +
        'VALUES(?, ?, ?, 0, ?, ?) ' +
        'ON CONFLICT(user_id) DO UPDATE SET ' +
        'email = excluded.email, code_hash = excluded.code_hash, attempts = 0, expires_at = excluded.expires_at, created_at = excluded.created_at'
    )
    .bind(userId, email.toLowerCase(), codeHash, expiresAt, now)
    .run();

  return { success: true };
}

/**
 * Verifies and atomically consumes an Email 2FA OTP challenge.
 * Uses atomic UPDATE ... RETURNING to prevent TOCTOU race conditions under concurrent requests.
 */
export async function verifyAndConsumeEmail2faChallenge(
  db: D1Database,
  userId: string,
  code: string
): Promise<{ valid: boolean; reason?: 'expired' | 'locked' | 'invalid' | 'missing' }> {
  const now = Date.now();

  // Atomically increment attempts and return mutated row to eliminate TOCTOU race conditions
  const row = await db
    .prepare('UPDATE email_2fa_challenges SET attempts = attempts + 1 WHERE user_id = ? RETURNING *')
    .bind(userId)
    .first<Email2faChallengeRow>();

  if (!row) {
    return { valid: false, reason: 'missing' };
  }

  if (row.expires_at < now) {
    await db.prepare('DELETE FROM email_2fa_challenges WHERE user_id = ?').bind(userId).run();
    return { valid: false, reason: 'expired' };
  }

  if (row.attempts > 5) {
    await db.prepare('DELETE FROM email_2fa_challenges WHERE user_id = ?').bind(userId).run();
    return { valid: false, reason: 'locked' };
  }

  const expectedHash = row.code_hash;
  const inputHash = await sha256Hex(code.trim());

  // Constant-time comparison for the SHA-256 hex strings
  let diff = expectedHash.length ^ inputHash.length;
  for (let i = 0; i < expectedHash.length && i < inputHash.length; i++) {
    diff |= expectedHash.charCodeAt(i) ^ inputHash.charCodeAt(i);
  }

  if (diff === 0) {
    // Valid OTP: delete challenge to prevent replay
    await db.prepare('DELETE FROM email_2fa_challenges WHERE user_id = ?').bind(userId).run();
    return { valid: true };
  }

  if (row.attempts >= 5) {
    await db.prepare('DELETE FROM email_2fa_challenges WHERE user_id = ?').bind(userId).run();
    return { valid: false, reason: 'locked' };
  }

  return { valid: false, reason: 'invalid' };
}
