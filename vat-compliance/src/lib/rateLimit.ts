// Best-effort in-memory rate limiting: resets on cold start / new instance,
// so it's not a hard guarantee on serverless, but it stops the common case
// of a single warm instance being hammered with requests.
const buckets = new Map<string, { count: number; resetAt: number }>();

export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const entry = buckets.get(key);
  const now = Date.now();
  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > limit;
}
