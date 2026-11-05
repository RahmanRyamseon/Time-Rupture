#!/usr/bin/env node
// News collector for Gulf Telugu News (గల్ఫ్ తెలుగు వార్తలు): news about Telugu people in the Gulf.
//
// Pulls Telugu and English Google News RSS searches about the six GCC countries, keeps the
// stories that are about the Gulf, tags each with its countries and topics, and flags the ones
// about Telugu people. English stories are kept only when they name Telugu people or places.
// Also refreshes Gulf currency → rupee rates. No dependencies: Node 18+ built-in fetch.
//
//   node scripts/update.mjs                   # live fetch
//   FIXTURE_DIR=path node scripts/update.mjs  # offline: te-*.xml, en-*.xml and rates.json

import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const DATA_FILE = join(here, "..", "data", "news.json");
export const RATES_FILE = join(here, "..", "data", "rates.json");
export const RETENTION_DAYS = 21;
export const MAX_ITEMS = 700;

const GN = "https://news.google.com/rss/search";
const te = (q) => ({ lang: "te", url: `${GN}?q=${encodeURIComponent(`${q} when:3d`)}&hl=te&gl=IN&ceid=IN:te` });
const en = (q) => ({ lang: "en", url: `${GN}?q=${encodeURIComponent(`${q} when:7d`)}&hl=en-IN&gl=IN&ceid=IN:en` });

// Gulf newspapers and the country each one covers by default.
export const GULF_PAPERS = {
  "gdnonline.com": "bahrain",
  "gulfnews.com": "uae",
  "khaleejtimes.com": "uae",
  "arabnews.com": "saudi",
  "saudigazette.com.sa": "saudi",
  "gulf-times.com": "qatar",
  "thepeninsulaqatar.com": "qatar",
  "timesofoman.com": "oman",
  "arabtimesonline.com": "kuwait",
};
export const paperCountry = (publisherUrl = "") => {
  const host = publisherUrl.replace(/^https?:\/\//, "").replace(/^(www|megamenu)\./, "").split("/")[0];
  return GULF_PAPERS[host] || null;
};

export const FEEDS = [
  te("గల్ఫ్"),
  te("గల్ఫ్ కార్మికులు OR గల్ఫ్ బాధితులు OR గల్ఫ్ వలస"),
  te("ప్రవాసాంధ్రులు OR ఎన్ఆర్ఐ OR ఏపీఎన్ఆర్టీఎస్ OR ప్రవాసీ ప్రజావాణి"),
  te("దుబాయ్ OR దుబాయి OR యూఏఈ OR అబుదాబి OR షార్జా"),
  te("సౌదీ OR రియాద్ OR జెద్దా OR దమ్మామ్"),
  te("ఖతార్ OR దోహా"),
  te("కువైట్"),
  te("ఒమన్ OR మస్కట్"),
  te("బహ్రెయిన్"),
  te("తెలుగు సంఘం OR కళా సమితి OR బతుకమ్మ OR ఉగాది (దుబాయ్ OR సౌదీ OR ఖతార్ OR కువైట్ OR ఒమన్ OR బహ్రెయిన్)"),
  en('Telugu (Dubai OR UAE OR "Abu Dhabi" OR Sharjah)'),
  en("Telugu (Saudi OR Riyadh OR Jeddah OR Qatar OR Doha OR Kuwait OR Oman OR Muscat OR Bahrain)"),
  en("(Telangana OR Andhra OR Hyderabad) (Gulf OR Dubai OR UAE OR Saudi OR Kuwait OR Qatar OR Oman OR Bahrain) (worker OR workers OR expat OR NRI OR migrant)"),
  en('APNRTS OR TOMCOM OR "Telangana Gulf" OR "Gulf workers" Telangana'),
  en('"Telugu Association" OR "Telugu Kala Samithi" OR "Andhra Kala Vedika" OR "Telugu community" Gulf'),
  // Gulf newspapers, for rule changes and news that affect expats (one site per search:
  // Google News ignores site: filters combined with OR).
  ...Object.keys(GULF_PAPERS).map((site) =>
    en(`site:${site} (expat OR expats OR expatriate OR Indian OR Indians OR visa OR residency OR labour OR workers OR recruitment OR deport OR amnesty)`),
  ),
];

// ---- classification ----------------------------------------------------------------------
// Telugu terms are matched as substrings (Telugu has no \b word boundaries in JS regex);
// English terms as case-insensitive word prefixes.
export const COUNTRIES = {
  uae: { te: ["యూఏఈ", "దుబాయ్", "దుబాయి", "అబుదాబి", "అబుధాబి", "షార్జా", "అజ్మాన్", "ఎమిరేట్స్"], en: ["UAE", "Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Emirat"] },
  saudi: { te: ["సౌదీ", "రియాద్", "జెద్దా", "జెడ్డా", "దమ్మామ్", "మక్కా", "మదీనా", "యాన్బూ", "జుబైల్"], en: ["Saudi", "KSA", "Riyadh", "Jeddah", "Dammam", "Makkah", "Mecca", "Medina", "Madinah", "Umrah", "Yanbu", "Jubail", "Khobar"] },
  qatar: { te: ["ఖతార్", "దోహా"], en: ["Qatar", "Doha"] },
  kuwait: { te: ["కువైట్"], en: ["Kuwait"] },
  oman: { te: ["ఒమన్", "ఒమాన్", "మస్కట్", "సలాలా"], en: ["Oman", "Muscat", "Salalah"] },
  bahrain: { te: ["బహ్రెయిన్", "బహ్రైన్", "మనామా"], en: ["Bahrain", "Manama", "LMRA"] },
};
const GULF = { te: ["గల్ఫ్"], en: ["Gulf", "GCC"] };

// Film shoots and celebrity trips abroad are not news about Telugu people living in the Gulf.
const CINEMA = {
  te: ["సినిమా", "మూవీ", "షూటింగ్", "షెడ్యూల్", "ఓటీటీ", "హీరో", "హీరోయిన్", "ట్రైలర్", "టాలీవుడ్"],
  en: ["movie", "film", "shooting", "OTT", "trailer", "Tollywood", "box office"],
};

export const TELUGU = {
  te: ["తెలుగు", "తెలంగాణ", "ఆంధ్ర", "ఏపీ", "ప్రవాస", "ఎన్ఆర్ఐ", "ఎన్నారై", "వలస", "బతుకమ్మ", "ప్రజావాణి",
    "కేటీఆర్", "రేవంత్", "చంద్రబాబు", "లోకేశ్", "లోకేష్", "జగన్", "హైదరాబాద్", "నిజామాబాద్", "జగిత్యాల",
    "కరీంనగర్", "నిర్మల్", "సిరిసిల్ల", "కామారెడ్డి", "ఆదిలాబాద్", "ఆర్మూర్", "మెట్‌పల్లి", "కొడంగల్", "వరంగల్",
    "కడప", "కోనసీమ", "గోదావరి", "శ్రీకాకుళం", "విజయనగరం", "విశాఖ", "నెల్లూరు", "గుంటూరు", "విజయవాడ",
    "తిరుపతి", "అన్నమయ్య", "రాయచోటి", "టామ్‌కామ్", "NRI"],
  en: ["Telugu", "Telangana", "Andhra", "Hyderabad", "APNRTS", "TOMCOM", "Nizamabad", "Jagtial", "Karimnagar",
    "Nirmal", "Sircilla", "Kamareddy", "Adilabad", "Armoor", "Kadapa", "Konaseema", "Godavari", "Srikakulam",
    "Vizag", "Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Tirupati", "Warangal", "KTR", "Revanth",
    "Chandrababu", "Lokesh"],
};

export const TOPICS = {
  sangham: {
    te: ["సంఘం", "సంఘాల", "అసోసియేషన్", "సమితి", "కమిటీ", "ఫోరం", "వేదిక", "సంబరా", "వేడుక", "ఉత్సవ", "ఉగాది",
      "సంక్రాంతి", "బతుకమ్మ", "దసరా", "దీపావళి", "వినాయక", "సన్మాన", "పురస్కార", "అవార్డు", "సమ్మేళన",
      "కలయిక", "రక్తదాన", "సాంస్కృతిక", "టోర్నీ", "టోర్నమెంట్", "ఎన్నిక"],
    en: ["association", "samithi", "samiti", "committee", "forum", "celebrat", "festival", "Ugadi", "Bathukamma",
      "Sankranti", "Dasara", "Dussehra", "Diwali", "award", "cultural", "blood donation", "tournament",
      "felicitat", "gathering", "community"],
  },
  exit: {
    te: ["స్వదేశ", "తిరిగొ", "తిరిగి వచ్చ", "మృతదేహ", "మృతి", "మరణ", "చనిపో", "దుర్మరణ", "ఆత్మహత్య", "ప్రమాద",
      "చిక్కుక", "ఇరుక్కు", "బాధిత", "జైలు", "జైల్లో", "విడుదల", "క్షమాభిక్ష", "ఆమ్నెస్టీ", "రక్షించ",
      "ఎక్స్‌గ్రేషియా", "తప్పిపో", "అదృశ్య", "ఆచూకీ", "వేదన", "కష్టా"],
    en: ["repatriat", "return home", "returned home", "stranded", "died", "dies", "dead", "death", "body",
      "mortal remains", "rescued", "jail", "released", "amnesty", "deport", "final exit", "ex gratia", "ex-gratia",
      "missing", "suicide", "accident", "plight"],
  },
  jobs: {
    te: ["వీసా", "ఉద్యోగ", "జీతం", "జీతాల", "కార్మిక", "ఇఖామా", "ఇకామా", "పాస్‌పోర్ట్", "నియమ", "నిబంధన",
      "చట్ట", "రిక్రూట్", "ఏజెంట్", "మోసా", "విమాన", "ఎయిరిండియా", "ఎయిర్ ఇండియా", "ఫ్లైట్", "ప్రయాణ",
      "హెచ్చరిక", "పెట్టుబడ", "ఎక్స్‌పో", "బీమా", "యూపీఐ", "రూపాయి"],
    en: ["visa", "job", "salary", "salaries", "wage", "labour", "labor", "worker", "iqama", "passport", "recruit",
      "agent", "fraud", "rule", "law", "emiratisation", "saudisation", "saudization", "nitaqat", "emigrat",
      "flight", "Air India", "airline", "ticket", "travel", "advisory", "insurance", "remittance", "rupee", "UPI",
      "expo"],
  },
};

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const compile = ({ te: t = [], en: e = [] }) => {
  const re = e.length ? new RegExp(`\\b(?:${e.map(escapeRe).join("|")})`, "i") : null;
  return (text) => t.some((w) => text.includes(w)) || Boolean(re && re.test(text));
};
const countryTests = Object.entries(COUNTRIES).map(([id, terms]) => [id, compile(terms)]);
const gulfTest = compile(GULF);
const teluguTest = compile(TELUGU);
const cinemaTest = compile(CINEMA);
const topicTests = Object.entries(TOPICS).map(([id, terms]) => [id, compile(terms)]);

// Returns the item's tags, or null when it is not a Gulf story for this site.
// For English stories from Gulf papers that are not about Telugu people: keep the ones about
// expats, or about labour, visa and residency rules.
const expatTest = compile({ en: ["expat", "expatriate", "foreign worker"] }); // Gulf papers' word for residents
const indianTest = compile({ en: ["Indian national", "Indians", "Indian worker", "Indian student", "migrant"] }); // only with a Gulf country
const rulesTest = compile({ en: ["labour", "labor", "worker", "recruitment", "residency", "iqama", "deport", "amnesty", "licence", "license", "job vacanc", "Emiratisation", "Saudisation", "Saudization", "Nitaqat", "Bahrainisation", "Kuwaitisation", "Omanisation", "LMRA", "traffic rule", "visa"] });
const strongRulesTest = compile({ en: ["labour", "labor", "recruitment", "residency", "iqama", "deport", "amnesty", "licence", "job vacanc", "LMRA"] });

export function classify(title, lang, publisherUrl = "") {
  if (/Gulf Digital News|^News$/i.test(title)) return null; // site furniture, not stories
  const home = paperCountry(publisherUrl);
  let countries = countryTests.filter(([, t]) => t(title)).map(([id]) => id);
  if (!countries.length && !gulfTest(title) && !home) return null;
  // Newspaper names in a headline ("Andhra Prabha Top News") are not about Telugu people.
  const telugu = teluguTest(title.replace(/Andhra\s?(Prabha|Jyothy)|ఆంధ్ర\s?(ప్రభ|జ్యోతి)/gi, ""));
  let expat = false;
  if (lang === "en" && !telugu) {
    // English Gulf news is too broad without a Telugu link, except expat and rules news in Gulf papers.
    if (!home) return null;
    const inTitle = countries.length > 0;
    expat = expatTest(title) || (inTitle && (indianTest(title) || rulesTest(title))) || strongRulesTest(title);
    if (!expat) return null;
    if (!inTitle) countries = [home];
  } else if (!countries.length && !gulfTest(title)) return null;
  const topics = topicTests.filter(([, t]) => t(title)).map(([id]) => id);
  if (cinemaTest(title) && !topics.includes("sangham")) return null;

  const sections = [...countries];
  if (telugu) sections.push("top");
  else sections.push("gulf");
  if (topics.includes("sangham") && telugu) sections.push("sangham");
  if (topics.includes("exit")) sections.push("exit");
  if (topics.includes("jobs") || expat) sections.push("jobs");
  return { countries, telugu, sections: [...new Set(sections)], ...(expat ? { expat } : {}) };
}

// ---- parsing ------------------------------------------------------------------------------
const decode = (s = "") =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");

const field = (body, name) => {
  const m = body.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`));
  return m ? m[1] : "";
};

const parseDate = (s) => {
  const t = Date.parse(s);
  return Number.isNaN(t) ? new Date().toISOString() : new Date(t).toISOString();
};

export function parseItems(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, body]) => {
    const src = body.match(/<source\s+url="([^"]+)"[^>]*>([\s\S]*?)<\/source>/);
    const publisher = src ? decode(src[2]).trim() : "";
    let title = decode(decode(field(body, "title"))).trim();
    if (publisher && title.endsWith(` - ${publisher}`)) title = title.slice(0, -(publisher.length + 3)).trim();
    return {
      title,
      url: decode(field(body, "link")).trim(),
      publisher,
      publisherUrl: src ? decode(src[1]).trim() : "",
      published: parseDate(decode(field(body, "pubDate"))),
    };
  });
}

// ---- merging ------------------------------------------------------------------------------
export const keyOf = (title) => title.toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, " ").trim();
export const idOf = (title) => createHash("sha1").update(keyOf(title)).digest("hex").slice(0, 12);
// Word stems: the first four code points, which drops most Telugu case endings
// (సౌదీకి → సౌదీ, విమానాలు → విమా) and English plurals of longer words.
const STOP = new Set(["the", "and", "for", "with", "from", "into", "after", "over"]);
const stems = (title) =>
  new Set(
    keyOf(title)
      .split(" ")
      .filter((w) => [...w].length >= 2 && !STOP.has(w))
      .map((w) => [...w].slice(0, 4).join("")),
  );

// Two headlines tell the same story when at least three stems, and half of the shorter
// headline's stems, are shared.
export function sameStory(a, b) {
  const ta = stems(a);
  const tb = stems(b);
  let shared = 0;
  for (const w of ta) if (tb.has(w)) shared += 1;
  return shared >= 3 && shared / Math.min(ta.size, tb.size) >= 0.5;
}

// Merges fetched items into stored ones. Exact repeats join their sections; the same story
// from another paper within three days becomes a `related` link on the first one kept.
export function merge(existing, fetched, now = Date.now()) {
  const cutoff = now - RETENTION_DAYS * 864e5;
  const all = [...existing, ...fetched]
    .filter((i) => i.title && Date.parse(i.published) >= cutoff)
    .sort((a, b) => b.published.localeCompare(a.published));
  const kept = [];
  const byId = new Map();
  for (const item of all) {
    const id = item.id || idOf(item.title);
    const prev = byId.get(id);
    if (prev) {
      prev.sections = [...new Set([...prev.sections, ...item.sections])];
      continue;
    }
    // Only merge stories that agree on being about Telugu people, so a Telugu story is never
    // folded under a similar headline about someone else ("Telangana man dies" / "Kerala man dies").
    const near = kept.find(
      (k) =>
        Boolean(k.telugu) === Boolean(item.telugu) &&
        (!k.countries?.length || !item.countries?.length || k.countries.some((c) => item.countries.includes(c))) &&
        Math.abs(Date.parse(k.published) - Date.parse(item.published)) < 3 * 864e5 &&
        sameStory(k.title, item.title),
    );
    if (near) {
      byId.set(id, near);
      near.sections = [...new Set([...near.sections, ...item.sections])];
      near.telugu ||= item.telugu;
      const related = [item, ...(item.related || [])].filter(
        (r) => r.publisher !== near.publisher && !near.related.some((x) => x.publisher === r.publisher),
      );
      for (const r of related) if (near.related.length < 6) near.related.push({ title: r.title, url: r.url, publisher: r.publisher });
      continue;
    }
    const keep = { ...item, id, sections: [...item.sections], related: [...(item.related || [])] };
    kept.push(keep);
    byId.set(id, keep);
  }
  return kept.slice(0, MAX_ITEMS);
}

// ---- rates --------------------------------------------------------------------------------
export function inrRates(api) {
  const r = api.rates;
  const inrPer = {};
  for (const c of ["AED", "SAR", "QAR", "KWD", "OMR", "BHD"]) if (r[c] && r.INR) inrPer[c] = +(r.INR / r[c]).toFixed(2);
  return { updated: new Date(api.time_last_update_utc || Date.now()).toISOString(), source: "exchangerate-api.com", inrPer };
}

// ---- main ---------------------------------------------------------------------------------
async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; GulfTeluguNewsBot/1.0)" },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function main() {
  const fixtures = process.env.FIXTURE_DIR;
  let stored = { items: [] };
  try {
    stored = JSON.parse(await readFile(DATA_FILE, "utf8"));
  } catch {}

  const sources = fixtures
    ? (await readdir(fixtures))
        .filter((f) => /^(te|en)-.*\.xml$/.test(f))
        .map((f) => ({ lang: f.slice(0, 2), url: join(fixtures, f), file: true }))
    : FEEDS;

  const fetched = [];
  let raw = 0;
  for (const feed of sources) {
    try {
      const xml = feed.file ? await readFile(feed.url, "utf8") : await fetchText(feed.url);
      for (const item of parseItems(xml)) {
        raw += 1;
        const tags = classify(item.title, feed.lang, item.publisherUrl);
        if (tags) fetched.push({ ...item, lang: feed.lang, ...tags });
      }
    } catch (err) {
      console.warn(`! ${feed.url.slice(0, 120)}: ${err.message}`);
    }
  }
  if (!raw) {
    console.error("No items fetched; keeping existing data.");
    process.exitCode = 1;
  } else {
    // Re-classify stored items too, so rule changes apply to everything on the next run.
    const restored = stored.items
      .map((i) => {
        const tags = classify(i.title, i.lang || "te", i.publisherUrl);
        return tags ? { ...i, ...tags, related: i.related || [] } : null;
      })
      .filter(Boolean);
    const items = merge(restored, fetched);
    await writeFile(DATA_FILE, JSON.stringify({ updated: new Date().toISOString(), items }, null, 1) + "\n");
    console.log(`Read ${raw} headlines, kept ${fetched.length} Gulf stories; stored ${items.length}.`);
  }

  try {
    const api = fixtures
      ? JSON.parse(await readFile(join(fixtures, "rates.json"), "utf8"))
      : JSON.parse(await fetchText("https://open.er-api.com/v6/latest/USD"));
    await writeFile(RATES_FILE, JSON.stringify(inrRates(api), null, 1) + "\n");
    console.log("Rates updated.");
  } catch (err) {
    console.warn(`! rates: ${err.message}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
