// Same-origin, allowlisted fetch proxy for the Compliance Screener.
//
// Replaces the public third-party CORS proxies (allorigins.win, rss2json.com)
// the original static build relied on. Those services received every name
// being screened and could have logged or altered the results.
//
// Hardening:
//  - Only HTTPS GETs to an explicit host + path-prefix allowlist (no open proxy / SSRF).
//  - Redirects are followed manually and re-checked against the allowlist.
//  - Only same-origin browser requests are served (Sec-Fetch-Site), to stop hotlinking.
//  - Best-effort per-IP rate limit, upstream timeout and response-size cap.
//  - Responses are returned as text/plain-ish types with nosniff, never as HTML.

const ALLOW = [
  { host: "news.google.com", path: "/rss/search", type: "application/xml; charset=utf-8", ttl: 600 },
  { host: "data.opensanctions.org", path: "/datasets/", type: "text/csv; charset=utf-8", ttl: 3600 },
  { host: "data.trade.gov", path: "/downloadable_consolidated_screening_list/", type: "application/json; charset=utf-8", ttl: 3600 },
];

const MAX_BYTES = 4 * 1024 * 1024; // stay under Vercel's 4.5 MB response cap
const TIMEOUT_MS = 15000;
const RATE_LIMIT = 240; // requests per IP per window (per function instance)
const RATE_WINDOW_MS = 60_000;
const hits = new Map();

function json(status, msg, extra = {}) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "x-content-type-options": "nosniff", "cache-control": "no-store", ...extra },
  });
}

function match(u) {
  if (u.protocol !== "https:" || u.username || u.password || (u.port && u.port !== "443")) return null;
  return ALLOW.find((a) => u.hostname === a.host && u.pathname.startsWith(a.path)) || null;
}

function rateLimited(ip) {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now - rec.start > RATE_WINDOW_MS) {
    hits.set(ip, { start: now, n: 1 });
    if (hits.size > 5000) hits.clear();
    return false;
  }
  rec.n += 1;
  return rec.n > RATE_LIMIT;
}

export async function GET(request) {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return json(403, "cross-site requests are not allowed");

  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) return json(429, "rate limit exceeded", { "retry-after": "60" });

  const raw = new URL(request.url).searchParams.get("url");
  if (!raw || raw.length > 2048) return json(400, "missing or oversized url");

  let target;
  try { target = new URL(raw); } catch { return json(400, "invalid url"); }
  let rule = match(target);
  if (!rule) return json(403, "host not allowed");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    let upstream;
    for (let hop = 0; hop < 3; hop++) {
      upstream = await fetch(target, {
        redirect: "manual",
        signal: ctrl.signal,
        headers: { "user-agent": "Mozilla/5.0 (compatible; ComplianceScreener/2.0)", accept: "*/*" },
      });
      if (upstream.status >= 300 && upstream.status < 400 && upstream.headers.get("location")) {
        target = new URL(upstream.headers.get("location"), target);
        rule = match(target);
        if (!rule) return json(502, "upstream redirected to a disallowed host");
        continue;
      }
      break;
    }
    if (!upstream.ok) return json(upstream.status === 429 ? 429 : 502, "upstream error " + upstream.status);

    const len = Number(upstream.headers.get("content-length") || 0);
    if (len > MAX_BYTES) return json(413, "upstream response too large");

    const reader = upstream.body.getReader();
    const chunks = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) { ctrl.abort(); return json(413, "upstream response too large"); }
      chunks.push(value);
    }
    const body = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) { body.set(c, off); off += c.byteLength; }

    const headers = {
      "content-type": rule.type,
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; sandbox",
      "cache-control": `public, max-age=0, s-maxage=${rule.ttl}, stale-while-revalidate=${rule.ttl}`,
    };
    const lm = upstream.headers.get("last-modified");
    if (lm) headers["last-modified"] = lm;
    return new Response(body, { status: 200, headers });
  } catch (e) {
    return json(e && e.name === "AbortError" ? 504 : 502, "upstream fetch failed");
  } finally {
    clearTimeout(timer);
  }
}
