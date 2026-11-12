# Compliance Screener v2 (hardened web deployment)

Browser-based sanctions / PEP / adverse-media / UBO screener, deployed as a static
site plus one serverless function on Vercel. Source: `compliance-screener-skill/assets` (v2).

## Layout
- `public/` – the app (index.html, app.js, sources-v2.js, styles.css, data.js, visitors.js)
- `api/fetch.mjs` – same-origin, allowlisted fetch proxy (Google News RSS, OpenSanctions, trade.gov CSL)
- `scripts/vendor.sh` – downloads SheetJS 0.20.3 at build time into `public/vendor/`
- `vercel.json` – build settings and security headers

## Security fixes vs. the original bundle
1. **XSS** – feed-supplied URLs were written into `href` unescaped (e.g. `javascript:` links or
   attribute break-out from a news item). Added `safeUrl()` (http/https only, escaped) and
   extended `esc()` to escape `'` and `` ` ``; escaped reference IDs.
2. **Inline event handlers removed** (`onclick="..."`) and replaced with delegated listeners, so a
   strict **Content-Security-Policy** (`script-src 'self'`) can be enforced.
3. **Third-party CORS proxies removed** – every screened name was sent to `allorigins.win` and
   `rss2json.com`, which could log (data leak / GDPR) or tamper with results. Replaced by
   `/api/fetch`, which only fetches HTTPS URLs on an explicit host+path allowlist, re-checks
   redirects (no SSRF / open proxy), rejects cross-site callers, rate-limits, caps size and time.
4. **Spreadsheet formula injection** – exported CSV/XLSX cells starting with `= + - @ |  %`
   are neutralised.
5. **SheetJS** upgraded 0.20.2 → 0.20.3 and self-hosted (no runtime third-party script);
   uploads are parsed with formulas/HTML/VBA disabled, limited to 10 MB and 5,000 names.
6. **Security headers** – CSP, HSTS, X-Frame-Options DENY / frame-ancestors 'none',
   nosniff, Referrer-Policy no-referrer, COOP, Permissions-Policy.

## Remaining notes
- The screening log (names, decisions) is kept in the browser's localStorage on the analyst's
  machine; use "Clear log" on shared computers.
- OpenSanctions bulk data is free for non-commercial use only; commercial use needs a licence.
- The visitor counter calls `abacus.jasoncameron.dev` (no screened data is sent).
