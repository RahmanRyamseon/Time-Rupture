/**
 * Minimal signed-cookie session for the single-admin upload tool.
 * Uses Web Crypto (available in both the Node.js and Edge runtimes) so the
 * same code works from middleware and from route handlers.
 *
 * Required env vars (set in Vercel project settings, never committed):
 *   ADMIN_UPLOAD_PASSWORD — the password that unlocks /admin
 *   ADMIN_SESSION_SECRET  — any long random string, used to sign the cookie
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

/** Constant-time-ish comparison for the password check (best-effort in Edge). */
export function passwordMatches(candidate: string): boolean {
  const expected = process.env.ADMIN_UPLOAD_PASSWORD;
  if (!expected || !candidate) return false;
  if (candidate.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= candidate.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
