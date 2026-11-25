# Mizan Books – working rules

- Always work in ponytail mode (`/ponytail`, level full): smallest complete change, no speculative code,
  never cut validation, security, data-loss protection or accessibility.
- Before shipping a change, run `/ponytail-tools` review (`/ponytail-review`) on the diff; for larger
  releases also re-check the five areas in `AUDIT.md` (SEO, security, validity, viability, visibility).
- Keep `npm test` green; money and VAT logic changes need a test in `src/lib/core.test.ts`.
- Facts on the Privacy & terms page (`src/pages/Privacy.tsx`) must match what the code does with data.
