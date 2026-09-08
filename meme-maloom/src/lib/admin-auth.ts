/**
 * Minimal signed-cookie session for the single-admin upload tool.
 * Uses Web Crypto (available in both the Node.js and Edge runtimes) so the
 * same code works from middleware and from route handlers.
 *
 * Required env vars (set in Vercel project settings, never committed):
 *   ADMIN_UPLOAD_PASSWORD_HASH — hex SHA-256 of the admin password, e.g.
 *                                `printf '%s' 'the-password' | shasum -a 256`
 *                                (never store the raw password itself)
 *   ADMIN_SESSION_SECRET       — any long random string, used to sign the cookie
 */

export const ADMIN_SESSION_COOKIE = "mm_admin_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/").padEnd(str.length + ((4 - (str.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function getHmacKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/** Builds a signed session token: base64url(payload-json).base64url(signature) */
export async function createSessionToken(): Promise<string> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not set");

  const payload = JSON.stringify({ exp: Date.now() + SESSION_TTL_MS });
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(payload));

  const key = await getHmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  const sigB64 = base64UrlEncode(new Uint8Array(signature));

  return `${payloadB64}.${sigB64}`;
}

/** Verifies a session token's signature and expiry. */
export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return false;

  const [payloadB64, sigB64] = token.split(".");
  if (!payloadB64 || !sigB64) return false;

  try {
    const key = await getHmacKey(secret);
    const signatureBytes = base64UrlDecode(sigB64);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes.buffer.slice(signatureBytes.byteOffset, signatureBytes.byteOffset + signatureBytes.byteLength) as ArrayBuffer,
      new TextEncoder().encode(payloadB64)
    );
    if (!valid) return false;

    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64))) as { exp: number };
    return typeof payload.exp === "number" && payload.exp > Date.now();
  } catch {
    return false;
  }
}

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return toHex(digest);
}

/** Constant-time comparison of two equal-length hex digests. */
function hexEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Verifies a candidate password against the stored SHA-256 hash. The raw
 * password is never persisted anywhere — only its hash lives in env config.
 */
export async function passwordMatches(candidate: string): Promise<boolean> {
  const expectedHash = process.env.ADMIN_UPLOAD_PASSWORD_HASH;
  if (!expectedHash || !candidate) return false;
  const candidateHash = await sha256Hex(candidate);
  return hexEquals(candidateHash, expectedHash.toLowerCase());
}

const LOGIN_ATTEMPT_LIMIT = 5;
const LOGIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// Best-effort in-memory rate limiting: resets on cold start / new instance,
// so it's not a hard guarantee on serverless, but it stops the common case
// of a script hammering the same warm instance with password guesses.
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

/** Returns true if this key (e.g. client IP) is currently rate-limited. */
export function isLoginRateLimited(key: string): boolean {
  const entry = loginAttempts.get(key);
  if (!entry) return false;
  if (Date.now() > entry.resetAt) {
    loginAttempts.delete(key);
    return false;
  }
  return entry.count >= LOGIN_ATTEMPT_LIMIT;
}

/** Records a failed login attempt for this key. */
export function recordLoginFailure(key: string): void {
  const entry = loginAttempts.get(key);
  const now = Date.now();
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_ATTEMPT_WINDOW_MS });
    return;
  }
  entry.count += 1;
}

/** Clears rate-limit state for this key on a successful login. */
export function recordLoginSuccess(key: string): void {
  loginAttempts.delete(key);
}
