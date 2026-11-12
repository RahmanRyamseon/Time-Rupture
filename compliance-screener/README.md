# Compliance Screener v2 (hardened web deployment)

Browser-based sanctions / PEP / adverse-media / UBO screener, deployed as a static
site plus one serverless function on Vercel. Source: `compliance-screener-skill/assets` (v2).

## Layout
- `public/` – the app (index.html, app.js, sources-v2.js, match.js, styles.css, data.js, visitors.js)
- `functions/screen.js` – `/api/screen`: searches the prebuilt watchlist index
- `functions/fetch.js` – `/api/fetch`: same-origin, allowlisted fetch proxy (Google News RSS, OpenSanctions, trade.gov CSL)
- `scripts/build.mjs` – deploy-time build: downloads the data, builds the index, fetches
  checksum-pinned SheetJS 0.20.3 and writes a Vercel Build Output API tree (incl. security headers)
- `vercel.json` – build command

## v3: speed and coverage
Previously every visitor's browser downloaded and parsed ~100 sanctions CSVs plus PEP registers
before the first screening (minutes on a first visit). Now `scripts/build.mjs` downloads the
OpenSanctions **sanctions, PEP, crime (wanted / terrorism / regulatory) and debarment** collections
once at deploy time and writes a phonetic-sharded gzip index into the `/api/screen` function.
The page loads a small `data/meta.json` and screens names in batches of 50; results return in
milliseconds and rows appear immediately. Wikidata/Wikipedia PEP & RCA, GLEIF ownership and
Google News adverse media still stream in per row in the background.

New checks: a **Watchlists** column (Interpol red notices, FBI/Europol/NCA wanted, India NIA wanted &
NSE debarred, regulator enforcement, World Bank/ADB/AfDB/IADB/EBRD/EU EDES/US SAM debarment), the
full 240+ PEP register collection, identity attributes (DOB, countries, record link) on every match,
and one-click registry/regulator searches (ICIJ Offshore Leaks, OpenCorporates, Companies House,
SEBI, MCA, RBI, ED, CIBIL wilful defaulters, FCRA, Gulf/US/UK regulators). Lexemer.com was
reviewed for ideas; it publishes no screening data (and marks its content proprietary), so only
the India-focused check ideas were adopted, using official sources.

Data freshness: the index is rebuilt on every deployment. Redeploy (or merge to `master`, which
the repo's daily bot commits redeploy) to refresh; the as-of date is shown in the app.

Local test: `OS_BASE=http://localhost:8765/ LOCAL_XLSX=/path/xlsx.full.min.js node scripts/build.mjs`

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
