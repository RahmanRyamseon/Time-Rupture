# గల్ఫ్ రచ్చబండ (Gulf Rachabanda)

A Telugu-language news and community site for Telugu people living in the Gulf (UAE, Saudi
Arabia, Qatar, Kuwait, Oman, Bahrain). *Rachabanda* is the platform under the village tree where
people gather to talk; this is that common spot for Telugus away from home.

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

## How the news is picked

`scripts/update.mjs` runs 15 Google News searches (10 Telugu, 5 English) and classifies every
headline:

1. It must name a Gulf country or city, or "Gulf"/"గల్ఫ్".
2. It is flagged **Telugu** when it names Telugu people or places: తెలుగు, తెలంగాణ, ఆంధ్ర, ప్రవాసాంధ్రులు,
   Gulf-migrant districts (Nizamabad, Jagtial, Karimnagar, Nirmal, Kadapa, Konaseema…), APNRTS, TOMCOM.
3. English headlines are kept only when flagged Telugu (English Gulf news is otherwise too broad).
4. Film shoots and celebrity trips are dropped.
5. Topic words decide the topic tabs (associations/events, going home/hardship, jobs/visa/travel).
6. The same story from several papers within three days is shown once, with the other papers
   listed under it. Stories are merged only if they share a country and agree on the Telugu flag.

The word lists are at the top of `scripts/update.mjs`; edit them to tune what gets in.
`node scripts/test.mjs` checks the rules offline.

## Files

| File | Purpose |
|---|---|
| `index.html`, `style.css`, `app.js` | The site. Static, no build step. |
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
npx serve telugu-rachabanda
```

## Deploy

Any static host. On Vercel, set the root directory to `telugu-rachabanda`. The scheduled refresh
runs once this is merged to `master`, because GitHub only runs scheduled workflows from the
default branch.

## Limits

- Stories are found through Google News, so links go through `news.google.com`.
- Classification reads only headlines. Some stories about Telugu people won't name them in the
  headline and will land in the general sections instead.
- There is no login. Anyone can comment under any name.
