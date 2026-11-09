# مسار — دليلك المهني بالعربية (Masar Careers)

A free, Arabic-first static website covering the whole professional journey: writing an
Arabic résumé, applying, interviewing, accepting an offer, onboarding documents, day-to-day
HR requests, and leaving a job. Everything is right-to-left and written in Modern Standard Arabic.

## Pages

| Page | What it contains |
| --- | --- |
| `index.html` | Home: the career journey in 7 steps, most-requested onboarding documents. |
| `resume.html` | Arabic résumé guide (sections and order, summary examples, action verbs as مصدر/فعل with English equivalents, achievement rewrites, Arabic-specific tips on RTL, fonts, digits, ATS, gender agreement, common mistakes) **plus a résumé builder** with 3 templates (classic, two-column modern, ATS-plain), completeness score, PDF (print) and Word export, JSON save/import. |
| `documents.html` | Library of **27 fill-in document templates** in 6 categories (applying, offer, onboarding, during employment, exit, employer/HR side), an interactive onboarding checklist (before joining → first 90 days), and official labour portals per country. |
| `interview.html` | STAR method with a worked example, 10 common questions with model Arabic answers, salary-expectation phrasing, questions to ask, preparation checklists. |
| `writing.html` | Business Arabic: formal letter structure with a sample, honorifics (معالي، سعادة…), copyable correspondence phrases, email etiquette, common spelling/style errors, searchable Arabic–English HR glossary (~90 terms). |
| `resources.html` | Curated Arabic job boards, government employment programmes, free Arabic learning platforms, language tools. |

## Arabic-specific features of the document generator

- **Automatic gender agreement**: one select switches every form in the text
  (`أنا الموظف/الموظفة`، `شاكراً/شاكرةً`، `باشر/باشرت`).
- **Hijri (Umm al-Qura) or Gregorian date**, or both, inserted with one click (via `Intl`).
- **Eastern Arabic digits (٠١٢)** toggle for the whole document.
- **Latin runs are bidi-isolated** (`<bdi>`), so terms like `(IELTS 7.0)` or `Power BI` don't flip.
- **Word export** writes an RTL `.doc` (HTML-in-Word); **PDF** via the browser's print dialog,
  which prints only the document.
- Shared fields (name, phone, employee number, company…) carry over between templates.
- All input is stored only in the browser's `localStorage`. Nothing is sent to a server.

## Structure

```
masar-careers/
  index.html  resume.html  documents.html  interview.html  writing.html  resources.html
  assets/style.css       shared styles (RTL, dark mode, print)
  assets/common.js       helpers: escaping, bidi isolation, dates, digits, copy, Word export, print
  assets/documents.js    template library + generator + onboarding checklist
  assets/resume.js       résumé builder
  data/templates.js      the 27 document templates (edit/add here)
  data/onboarding.js     onboarding checklist items
  data/language.js       phrases, common errors, HR glossary
```

There is no build step and no dependencies.

### Adding a template

Copy any object in `data/templates.js`. In `body`, `{{key}}` is replaced by the field with that
`key`, and `{{g:masculine|feminine}}` is chosen by the `gender` field.

## Run locally

```bash
npx serve masar-careers        # or: python3 -m http.server -d masar-careers
```

## Deploy

Vercel: create a project with root directory `masar-careers` (static, no build command).
`vercel.json` enables clean URLs.

## Notes

- Templates are drafting aids, not legal advice. Labour-law details (probation, notice periods,
  leave, contract registration) differ by country and change over time; the site links to the
  official portals and says so on each relevant page.
- Fonts (IBM Plex Sans Arabic, Noto Naskh Arabic) load from Google Fonts, with system Arabic
  fonts as fallback.
