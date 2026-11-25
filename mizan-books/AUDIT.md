# Mizan Books – audit (25 Nov 2026)

Skills used: `ponytail-audit` (code), `web-app-cyber-audit` (security, modes A + B),
`web-app-legal-audit` (validity, Bahrain PDPL), `idea-gate` (viability). No installed skill covers
SEO, so SEO/visibility was checked by hand. Target: https://mizan-books.netlify.app (owned by the
requester) and `mizan-books/` source. Non-intrusive checks only; not a penetration test or legal advice.

**What this repo does:** a browser-only bookkeeping app for Bahrain SMEs. Books live in the
user's browser (IndexedDB); two Netlify Functions optionally send documents to Claude (AI reading)
or a self-hosted OpenOCR server. Assumed load: one business per browser, a few hundred entries a
month; the public functions face the whole internet.

## Fixed in this pass

| # | Area | Finding | Evidence | Fix |
|---|---|---|---|---|
| 1 | Security – High | `/api/extract` had no rate limit; anyone could script it and spend the site's AI credits | 6 rapid POSTs all processed | Netlify `rateLimit` 20/min per IP (extract), 60/min (openocr) deployed in code. **Not confirmed live:** 90 test requests over ~2 min still returned 200 (the test machine's proxy may spread requests over several IPs). Check in Netlify → Logs/Security, or see open item 14 |
| 2 | Validity – Data loss | Saves were debounced 250 ms: closing the tab right after posting could lose the entry | `store.tsx` persist timer | Save immediately |
| 3 | Validity – Data loss | Two open tabs overwrote each other's books (last write wins) | no cross-tab sync | BroadcastChannel: other tabs reload after each save |
| 4 | Validity – Data loss | Restoring a backup silently replaced newer books of the same company | `Settings.tsx` restore | Confirm before replacing |
| 5 | Validity – Data loss | A failed browser save (storage full) was silent | unhandled promise | Alert asking for a backup |
| 6 | Security – Medium | No Content-Security-Policy; no clickjacking protection | response headers | CSP (`'self'` + `wasm-unsafe-eval` for OCR) and `X-Frame-Options: DENY`, `frame-ancestors 'none'`; verified scan, PDF and Excel flows with zero violations |
| 7 | Legal – High (PDPL) | No privacy notice, while optional AI reading transfers documents to the US | no policy page | Bilingual Privacy & terms page; AI toggle states the US transfer (PDPL Law 30/2018, Arts. 12–13, checked on pdp.gov.bh) |
| 8 | SEO / Visibility | No robots.txt, sitemap, canonical, social preview or crawlable text | 404s; empty `<body>` without JS | robots.txt, sitemap.xml, canonical, Open Graph/Twitter tags + og.png, JSON-LD SoftwareApplication, `<noscript>` summary (EN/AR) |

Already good: HTTPS + HSTS preload, nosniff, Referrer-Policy, Permissions-Policy, no exposed
`.git`/`.env`/source maps, no secrets in the bundle, React escaping (no `innerHTML`/`eval`),
function inputs validated (kind, media type, size), AI off by default.

## Still open (needs you)

9. **Operator identity & contact (Legal – Medium).** The privacy page says "contact details to be
   published". Add the legal entity, CR number and an email; then add `/.well-known/security.txt`
   (it requires a contact).
10. **`exceljs` → `uuid` advisory (Security – Low).** 2 moderate npm advisories; the vulnerable
    `uuid` buffer path isn't used by the app. Fix needs an exceljs release; re-check periodically.
11. **"Post all reviewed" posts drafts that only have warnings (Validity – Medium).** Errors block,
    warnings don't. Decide: skip drafts with warnings, or remove the button.
12. **Viability – PIVOT (idea-gate, 15 Nov).** Direct-to-SME bookkeeping competes with free/cheap
    ZATCA-approved tools. Cheapest test still stands: offer 10 Bahrain bookkeeping firms a paid
    "receipts → TB + statements + VAT reconciliation in 48 h" per client file; pass = ≥3 send files,
    ≥2 pay.
13. **Visibility beyond SEO.** Register the site in Google Search Console and Bing Webmaster Tools
    (needs your Google account); a custom domain (e.g. a `.bh`) would rank and convert better than
    `*.netlify.app`. A one-page Arabic landing description would help Arabic search.

14. **AI credit exposure until item 1 is confirmed (Security – High).** If 429s never appear, either
    remove the Anthropic key / AI Gateway access when AI reading isn't needed, or add a daily cap with
    Netlify Blobs (small change, new dependency).

Verdict: much safer after these fixes; confirm 1/14 first, then 9 and 11.
Not checked: DNS/email (SPF/DMARC – no custom domain), the OpenOCR server (not deployed),
accessibility (WCAG) beyond basics, load on the Netlify Functions beyond the rate limit.
