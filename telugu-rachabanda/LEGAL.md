# Legal and compliance notes

This is a working checklist, not legal advice. Media, copyright and cybercrime laws differ between
India and each Gulf country and change often. Have a lawyer in the country you operate from review
it before you add advertising, sponsorship or any other income.

Last reviewed: 7 November 2026.

## 1. Copyright and intellectual property

**What the site does**

| Rule | How it is enforced |
|---|---|
| Never copy article text | `scripts/update.mjs` reads only each item's headline, link and date. Feed descriptions, `content:encoded`, images and enclosures are never read. A test (`scripts/test.mjs`) fails if anything else is kept. |
| Snippet and link | Story pages show the headline, the publisher's name, the date, and a large "read the full story on <publisher>" button. Readers go to the publisher's own site. |
| Credit the source | Every story names its publisher, and the story page says the headline and story belong to that publisher. |
| No photos, videos, infographics or logos | Story pictures are drawn in CSS by this site (flag colours, a skyline, an emoji). Publisher logos (favicons) were removed on 7 Nov 2026. |
| Takedowns | `/copyright` explains how to ask for removal. To drop a publisher, add its feed id to `BLOCKED` in `scripts/update.mjs`, or remove it from `FEEDS`. |

Headlines can themselves be protected in some countries (for example, under EU press publishers'
rights). This site's publishers are Indian and Gulf outlets that offer RSS feeds for syndication,
but feed terms vary. Read each publisher's terms before adding its feed, and honour any request to stop.

## 2. Trademark and brand confusion

**Done**
- The design no longer copies any newspaper's identity. It has a flat indigo wordmark with a saffron
  "గల్ఫ్" tag, a saffron "latest" label, a light sub-menu and section titles with a side rule. Red is
  used only for emergency helplines. (Until 7 Nov 2026 the layout had followed Gulf Daily News's
  red-box logo, grey sub-menu and coloured section bars. All of these were replaced.)
- Every page footer and the `/about` page say the site is independent and not affiliated with Gulf
  News, Gulf Daily News or any publication or government. Other papers' names are used only to
  credit sources.

**Your decision**
- "Gulf Telugu News" combines the descriptive words "Gulf", "Telugu" and "News". "Gulf News" is a
  registered brand of Al Nisr Publishing (Dubai). The added word "Telugu", the Telugu-script
  wordmark and the different design reduce the risk of confusion, but they don't remove it.
  Before buying `gulftelugunews.com` or spending on promotion:
  1. Search the UAE Ministry of Economy trademark register and India's IP office (ipindia.gov.in)
     for "Gulf Telugu" and "Gulf ... News" marks.
  2. Lead with the Telugu name (గల్ఫ్ తెలుగు వార్తలు) and the రచ్చబండ brand, as the site does now.
  3. If you get a complaint, a fallback name is ready: `telugugulf.com` was unregistered on 6 Nov 2026.

## 3. Licensing and regulation

The site can't handle these for you. Check them with a lawyer:

- **India (if you run the site from India or for Indian readers):** the IT (Intermediary Guidelines
  and Digital Media Ethics Code) Rules, 2021 cover publishers of news and current affairs content,
  including news aggregators. As usually read, they require you to:
  - give the Ministry of Information and Broadcasting your details;
  - appoint a grievance officer in India, acknowledge complaints within 24 hours and resolve them
    within 15 days;
  - follow the Code of Ethics.

  Parts of these rules have been challenged in court, so check their current status.
  The `/copyright` page already promises the 24-hour and 15-day timelines. Fill in the grievance
  officer in `data/site.json`.
- **UAE:** Federal Decree-Law No. 55 of 2023 on Media Regulation requires a UAE Media Council
  licence for media activities in or aimed at the UAE, including electronic publishing. Living or
  earning in the UAE while running the site makes this more likely to apply.
- **Saudi Arabia and the other GCC states** have similar media-licensing rules (in Saudi Arabia,
  the General Authority for Media Regulation).
- **Cybercrime and anti-rumour laws** (for example, UAE Federal Decree-Law No. 34 of 2021, and Saudi
  Arabia's Anti-Cyber Crime Law) apply to what the site shows and to what readers post.

**What the site does to reduce liability**
- The general "Gulf affairs" section (security news, war and public-safety alerts) takes stories only
  from established outlets listed in `ESTABLISHED` in `scripts/update.mjs`. Smaller sites can still
  feed the Telugu-people, travel and jobs sections.
- The `/rules` page warns readers in Telugu and English that criticising rulers, governments or
  religion, and spreading rumours, can be crimes in Gulf states, even online. It bans unverified
  safety alerts, accusations without evidence and personal data (passport, iqama and Emirates ID
  numbers).
- Three reports hide a comment until it is reviewed. Comments can be deleted in the Supabase
  dashboard.
- `/terms` says users are responsible for their posts, that nothing on the site is legal or
  immigration advice, and that posts can be removed.

## 4. Terms of service and scraping

- **Google News is no longer used.** Its feeds say they are "made available solely for the purpose
  of rendering Google News results within a personal feed reader for personal, non-commercial use",
  which rules out a public website. All earlier Google News items were removed on 7 Nov 2026.
- **The site reads only the RSS feeds publishers provide** (listed in `FEEDS` in
  `scripts/update.mjs`). It never scrapes web pages, never gets around paywalls, logins or blocks,
  and reads each feed once every 2 hours. Its User-Agent names the site and links to `/about`.
- **Exchange rates** come from the free exchangerate-api.com endpoint, whose terms require
  attribution. The rates box shows "Rates By Exchange Rate API" with a link.
- **Helplines and association details** come from official or primary sources and are listed as
  facts, with links.

## Before you promote the site

1. Fill in `data/site.json`: operator name, contact email, grievance officer and governing-law
   country. The legal pages show "to be added" until then.
2. Have a lawyer review `/terms`, `/privacy` and `/copyright`, and your licensing position in the
   country you operate from.
3. Run the trademark search in section 2.
4. Re-read each publisher's terms (section 1) and remove any feed whose terms don't allow this use.
