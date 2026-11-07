# గల్ఫ్ తెలుగు వార్తలు (Gulf Telugu News)

Live at **https://gulftelugunews.vercel.app** (the older https://gulf-rachabanda.vercel.app still works).

A Telugu-language news and community site for Telugu people living in the Gulf (UAE, Saudi
Arabia, Qatar, Kuwait, Oman, Bahrain). The discussion section is called *రచ్చబండ* (Rachabanda),
the platform under the village tree where people gather to talk.

## Name and search

The name matches what people type into search engines: "gulf telugu news", "గల్ఫ్ తెలుగు
వార్తలు". The page title and description carry the country and city names (Dubai, Saudi, Qatar,
Kuwait, Oman, Bahrain) in Telugu and English, and the page has a canonical URL, Open Graph tags,
`NewsMediaOrganization` structured data, `robots.txt` and `sitemap.xml`.

`gulftelugunews.com` was unregistered on 5 Nov 2026 (about $12 a year through Vercel). If you buy
it, add it to the Vercel project and change the URLs in `index.html`, `robots.txt` and
`sitemap.xml` to it.

Every section, story, board and directory page has its own address (`/s/uae`, `/story/<id>`,
`/board/help`, `/sources`). On each deploy Vercel runs `scripts/build-pages.mjs`, which writes a
ready-made HTML page for each address with its own title, description, canonical URL and content
(headlines and links), plus `sitemap.xml` listing them all. Search engines can read these pages
without running JavaScript; in a browser the app takes over once it loads. Links shared in the
old `/#/story/...` form are redirected to the new addresses.

To get indexed faster, add the site in [Google Search Console](https://search.google.com/search-console)
and submit `https://gulftelugunews.vercel.app/sitemap.xml`.

## What readers get

- **News about Telugu people in the Gulf**, from Telugu papers (Eenadu, Sakshi, Andhra Jyothy,
  Namasthe Telangana, V6 Velugu…) and English papers (The Hindu, Siasat, Deccan Chronicle, Gulf News…).
  Sections:
  - **తెలుగు వారి వార్తలు**: only stories that name Telugu people or places.
  - **One tab per country**: Telugu stories first, then the rest of that country's news, plus the
    Telugu associations there.
  - **సంఘాలు & వేడుకలు**: Telugu associations, committees, festival celebrations, awards.
  - **తిరుగు ప్రయాణం & కష్టాలు**: people going home, repatriation of bodies, stranded workers,
    jail, amnesty.
  - **ఉద్యోగం, వీసా & ప్రయాణం**: visa rules, jobs, fake agents, flights, travel advisories.
  - **గల్ఫ్ పరిణామాలు**: general Gulf news that affects everyone living there.
- **Gulf Telugu directory**: 24-hour helplines (tap to call), Indian embassies and consulates,
  government services (MADAD, eMigrate, APNRTS, TOMCOM), Telugu associations by country, Gulf
  newspapers and Telugu papers from home.
- **Sidebar**: emergency helplines, India/Gulf clocks, Gulf currency → rupee rates, poll of the
  day, proverb, Telugu word, latest discussions, most-discussed stories.
- **Comments on every story** (name, town, replies, likes, report), **reactions**, WhatsApp
  sharing, save-for-later, search, dark mode, larger text.
- **Discussion boards**: general chat, association events, help desk, going home, jobs & visa,
  rooms & sharing, cricket, poems & stories, home cooking.

## Legal

See [`LEGAL.md`](./LEGAL.md): how the site handles copyright, trademark, licensing and feed terms,
and what the operator still has to do. In short, the site shows only headlines, publisher names,
dates and links from publishers' own RSS feeds. It never copies article text, photos or logos, and
it has About, Terms, Privacy, Copyright & takedown and Discussion-rules pages. Fill in
`data/site.json` (contact email, grievance officer) before promoting the site.

## Layout

A news-portal layout with its own identity: a flat indigo wordmark with a saffron "గల్ఫ్" tag, a
white main menu (home, Telugu people, the six countries) beside a light topic menu, a saffron
"latest news" bar that steps through headlines, a 2 + 3 grid of story tiles, section titles with a
coloured side rule, a country tab strip, a dark 🌳 రచ్చబండ panel, and a right column with helplines
(the only red on the page), WhatsApp sharing, a grid of discussion boards, clocks and rupee rates.
Feeds' photos are never used, so every story gets an illustration drawn in CSS: its country's flag
colours, a Gulf skyline and a topic icon.

## How the news is picked

`scripts/update.mjs` reads publishers' own RSS feeds (listed in `FEEDS`): the NRI sections of
Namasthe Telangana, NTV Telugu and Oneindia Telugu, plus V6 Velugu, Sakshi, TV9 Telugu, BBC Telugu,
Gulf News and The Siasat Daily. It keeps only each item's headline, link and date, and classifies
every headline:

1. It must name a Gulf country or city, or "Gulf"/"గల్ఫ్".
2. It is flagged **Telugu** when it names Telugu people or places: తెలుగు, తెలంగాణ, ఆంధ్ర, ప్రవాసాంధ్రులు,
   Gulf-migrant districts (Nizamabad, Jagtial, Karimnagar, Nirmal, Kadapa, Konaseema…), APNRTS, TOMCOM.
3. English headlines are kept only when flagged Telugu, or when they come from a Gulf newspaper
   (Gulf News) and name a Gulf country or are about expats or labour, visa, residency and licence
   rules.
4. General "Gulf affairs" stories (security, war, public safety) come only from established outlets
   (`ESTABLISHED`), to avoid spreading rumours.
5. Stories about Telugu people are kept for 180 days; other stories for 21 days.
6. Film shoots and celebrity trips are dropped.
7. Topic words decide the topic tabs (associations/events, going home/hardship, jobs/visa/travel).
8. The same story from several papers within three days is shown once, with the other papers
   listed under it. Stories are merged only if they share a country and agree on the Telugu flag.

The word lists are at the top of `scripts/update.mjs`; edit them to tune what gets in.
`node scripts/test.mjs` checks the rules offline.

## Files

| File | Purpose |
|---|---|
| `index.html`, `style.css`, `app.js` | The site (app shell and logic). |
| `scripts/build-pages.mjs`, `vercel.json` | Builds `dist/` on Vercel: one HTML page per address, and the sitemap. |
| `store.js`, `config.js`, `supabase/schema.sql` | Comments, reactions and polls: Supabase when configured, the reader's browser otherwise. |
| `data/news.json` | Collected stories (21 days). |
| `data/rates.json` | Gulf currency → rupee rates from exchangerate-api.com's free endpoint. |
| `data/sources.json` | Directory: helplines, embassies, services, associations, papers. Edit by hand. |
| `data/community.json` | Boards, polls, proverbs, words. Edit by hand. |
| `../.github/workflows/telugu-rachabanda.yml` | Refreshes news and rates every 2 hours. |

Helpline numbers come from the official sites they link to (APNRTS, MEA, the Consulate General
in Dubai, MADAD, TOMCOM). Check them again before relying on the list in an emergency, and update
`data/sources.json` if any change.

## Turning on shared comments

Without a database, comments, reactions and votes stay in each reader's browser (the comment form
says so). To share them:

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste `supabase/schema.sql` and run it.
3. Put the project URL and anon/publishable key in `config.js` (both are meant to be public).
4. Moderate from the Supabase table editor.

## Run locally

```bash
node telugu-rachabanda/scripts/test.mjs
node telugu-rachabanda/scripts/update.mjs     # refresh news and rates
node telugu-rachabanda/scripts/build-pages.mjs   # writes telugu-rachabanda/dist/
npx serve telugu-rachabanda/dist
```

## Deploy

Any static host. On Vercel, set the root directory to `telugu-rachabanda`. The scheduled refresh
runs once this is merged to `master`, because GitHub only runs scheduled workflows from the
default branch.

## Limits

- Only publishers with a public RSS feed are included, so some papers (Eenadu, Andhra Jyothy,
  Khaleej Times, Gulf Daily News) are missing until they offer one or agree to be listed.
- Classification reads only headlines. Some stories about Telugu people won't name them in the
  headline and will land in the general sections instead.
- There is no login. Anyone can comment under any name.
