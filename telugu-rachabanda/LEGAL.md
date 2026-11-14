# Legal and compliance notes

This is a working checklist, not legal advice. Have a lawyer in the country you operate from review
it before launch, and before adding ads, sponsors or any other income.

Last reviewed: 14 November 2026.

## Why the site is a guide, not a news site

On 14 Nov 2026 the site changed from a Gulf-Telugu news aggregator to an information guide, to cut
its legal risk:

| Risk | As a news aggregator | As a guide |
|---|---|---|
| India's IT Rules 2021, Part III | Applied ("news aggregator" is named) | Most likely outside it: how-to guides aren't news or current affairs. Comments still bring basic intermediary duties. |
| Gulf media and "false news" laws | High: political, security and crime headlines every 2 hours | Lower: evergreen guidance linking to official sources, with no commentary on governments |
| Copyright | Other publishers' headlines | Our own writing, plus links |
| Trademark | "Gulf Telugu News" sat close to Gulf News | "Gulf Telugu Guide" avoids that |
| Feed terms | Publisher and Google News feed terms | No feeds are used, apart from exchange rates |

## Main remaining risk: wrong or out-of-date information

People may act on these guides (visas, complaints, gratuity), so:

- Every guide lists official sources and a "last checked" date. Re-verify each one at least every
  6 months, and straight away when a law changes.
- Rules that couldn't be confirmed from an official source are not stated. Gratuity, for example,
  is calculated only for the UAE and Saudi Arabia. Qatar, Kuwait, Oman and Bahrain link to their
  labour ministries.
- Every guide and the footer say it is general guidance, not legal advice. `/about` explains how to
  report errors.
- Phone numbers are taken from official sites. Re-check them when you re-verify.

## Copyright and trademark

- Guides are original writing; there are no copied articles, photos or logos. Illustrations are
  emoji and CSS.
- Government names and links are used only to point readers to official services. Every page says
  the site is independent and not affiliated with any government, embassy, APNRTS, TOMCOM, agency
  or publication.
- Before buying a domain, search the trademark registers (UAE Ministry of Economy, ipindia.gov.in)
  for "Gulf Telugu Guide".

## Comments (రచ్చబండ and questions under guides)

- `/rules` (Telugu and English) warns that criticising rulers, governments or religion, and spreading
  rumours, can be crimes in Gulf states. It bans unverified safety alerts, accusations without
  evidence, personal data (passport, iqama or Emirates ID numbers), job or visa selling, and agents'
  adverts.
- Three reports hide a comment. Review reports and delete posts in the Supabase dashboard.
- `/copyright` sets out the takedown process: acknowledge within 24 hours, resolve within 15 days,
  hide clearly unlawful content immediately. Fill in the grievance officer in `data/site.json`.
- If you can't moderate regularly, leave shared comments off: the site works without them.

## Licensing and where to run it from

- **India** (recommended): an India-resident owner or editor. The IT Rules' news-publisher duties
  most likely don't apply to a guide. If comments are on, keep a grievance contact.
- **Gulf states**: the UAE (Federal Decree-Law No. 55 of 2023, Media Council) and Saudi Arabia
  (Electronic Publishing licence) license media activities, and Bahrain is rewriting its Press Law
  to license electronic media. A guide is less likely to be treated as a media outlet than a news
  site, but if you live in the Gulf, ask a local lawyer before launching, especially before earning
  money from the site.
- Stay non-commercial until the licensing position is confirmed.

## Third-party services and data

- Exchange rates come from exchangerate-api.com's free endpoint. Its terms require the attribution
  shown next to the rates.
- Hosting is on Vercel, fonts come from Google Fonts, and comments (if enabled) use Supabase. All
  are disclosed in `/privacy`.
- Vercel's free plan is for non-commercial use. Ads or sponsors would require a paid plan.

## Before you promote the site

1. Fill in `data/site.json`: operator, contact email, grievance officer and governing-law country.
2. Have a lawyer review `/terms`, `/privacy` and `/copyright`, and your licensing position.
3. Run the trademark search.
4. Re-verify every guide and update its `checked` date.
