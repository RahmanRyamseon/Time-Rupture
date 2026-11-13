# Mizan Books · ميزان للدفاتر

Bookkeeping, **trial balance** and **financial statements** for micro, small and medium
businesses in the GCC (UAE, Saudi Arabia, Qatar, Kuwait, Bahrain, Oman) — in **English and Arabic**.

## What it does

**Getting data in**
- **Scan invoices & receipts** – photos (phone camera supported) or PDFs, English and/or Arabic,
  including Arabic-Indic digits (١٢٣). On-device OCR (Tesseract, English + Arabic models bundled)
  extracts supplier, TRN/VAT number, invoice no., date, subtotal, VAT and total, then you review and post.
- **Saudi e-invoice (ZATCA / FATOORAH) QR codes** are decoded exactly when present.
- **Bank statements** – CSV, Excel (.xlsx) or PDF (digital or scanned), with English or Arabic column
  headers (التاريخ، البيان، مدين، دائن، الرصيد). Running balances are used to tell money-in from money-out
  and to reconcile; newest-first statements are handled. Lines are auto-categorised (DEWA, SEWA, STC,
  Etisalat/e&, ADNOC, WPS salaries, GOSI, Qiwa/MOHRE fees, bank charges…), and the categories you
  choose are learned for next time.
- **Manual journal entries** with templates (opening balances, capital, depreciation, end-of-service
  provision, VAT settlement).
- **Optional AI reading** (Claude, via a Netlify Function) for hard-to-read scans – see below.

**Getting reports out**
- Trial balance (simple or opening / movement / closing), general ledger, journal.
- Statement of profit or loss, statement of financial position, statement of cash flows (indirect)
  – IFRS for SMEs layout, bilingual, with built-in balance and cash checks.
- VAT summary (output/input VAT, net payable) using the country's rate (UAE 5 %, KSA 15 %,
  Bahrain 10 %, Oman 5 %; Qatar & Kuwait no VAT).
- Print to PDF, or export everything to one Excel workbook.

**Built for the region**: GCC chart of accounts in English & Arabic (incl. end-of-service benefits,
statutory reserve, Zakat/corporate tax), 3-decimal currencies (BHD, KWD, OMR) stored exactly,
pegged FX rates for foreign-currency invoices, day-first dates, full RTL interface, multiple companies.

## Privacy

Books are stored **only in the browser** (IndexedDB) — use *Company & settings → Download backup*.
OCR runs on the device. Documents are sent to the AI service only if the site owner configured it
**and** the user leaves "Use AI reading" switched on.

## Run locally

```bash
npm install
npm run dev          # http://localhost:5173 (AI endpoint not available in plain vite dev)
npm test             # accounting, parsing and statement tests
npm run build        # copies OCR assets to public/ocr, type-checks, builds dist/
```

Use `netlify dev` to run the site together with the `/api/extract` function locally.

## Deploy to Netlify

The repo's `netlify.toml` builds with `npm run build`, publishes `dist/` and deploys the function in
`netlify/functions/`. In a monorepo set **Base directory = `mizan-books`**.

Optional AI reading: add these environment variables (scope: Functions) and redeploy:

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Enables `/api/extract` (Claude reads invoices / statements directly from the image or PDF). |
| `ANTHROPIC_MODEL` | Optional model override; default `claude-opus-5-5`. |

Without the key the app works fully with on-device OCR.

## Notes & limits

- Reports are unaudited management accounts; review VAT figures against the authority's return form.
- Old binary `.xls` files aren't supported – save as `.xlsx` or CSV.
- OCR quality depends on the photo; always review extracted figures before posting (duplicates are flagged).
