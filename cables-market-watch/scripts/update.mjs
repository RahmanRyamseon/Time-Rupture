#!/usr/bin/env node
// Daily collector for Cables & Aluminium Market Watch.
//  1. LME official prices (cash settlement, 3-month, warehouse stock) for aluminium and copper,
//     read from Westmetall's public LME tables, merged into data/prices.json.
//  2. Industry news: ~50 Google News searches (English and Arabic) plus direct RSS feeds from
//     GCC trade sites. Every item is classified into categories, tagged with regions and
//     companies, and given a deal stage and value where the headline states them.
//     Merged into data/news.json.
// No dependencies: uses Node 18+ built-in fetch.

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const PRICES_FILE = join(here, "..", "data", "prices.json");
export const NEWS_FILE = join(here, "..", "data", "news.json");
export const NEWS_RETENTION_DAYS = 120;
export const MAX_NEWS = 2000;
export const PRICE_RETENTION_DAYS = 760; // ~2 years of trading days

// ================================================================ prices

export const METALS = {
  aluminium: { field: "LME_Al_cash", label: "Aluminium" },
  copper: { field: "LME_Cu_cash", label: "Copper" },
};

const MONTHS = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

const num = (s) => {
  const n = Number(String(s).replace(/<[^>]+>/g, "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
};

// Parses Westmetall's table rows: <td>03. November 2026</td><td>3,082.00</td><td>3,042.00</td><td>229,475</td>
export function parsePriceTable(html) {
  const rows = [];
  for (const [, body] of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const cells = [...body.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1].trim());
    if (cells.length < 4) continue;
    const d = cells[0].match(/^(\d{1,2})\.\s*([A-Za-z]+)\s+(\d{4})$/);
    if (!d || !MONTHS[d[2].toLowerCase()]) continue;
    const date = `${d[3]}-${String(MONTHS[d[2].toLowerCase()]).padStart(2, "0")}-${d[1].padStart(2, "0")}`;
    const cash = num(cells[1]);
    if (cash === null) continue;
    rows.push({ date, cash, m3: num(cells[2]), stock: num(cells[3]) });
  }
  return rows;
}

export function mergeSeries(existing = [], fetched = [], now = Date.now()) {
  const byDate = new Map(existing.map((r) => [r.date, r]));
  for (const r of fetched) byDate.set(r.date, r);
  const cutoff = new Date(now - PRICE_RETENTION_DAYS * 86_400_000).toISOString().slice(0, 10);
  return [...byDate.values()].filter((r) => r.date >= cutoff).sort((a, b) => a.date.localeCompare(b.date));
}

const priceUrl = (field, year) =>
  `https://www.westmetall.com/en/markdaten.php?action=table&field=${field}${year ? `&year=${year}` : ""}`;

// ================================================================ companies

// role: competitor (cable/conductor makers), contractor (EPC firms that buy conductors and cables),
// utility (grid owners and procurers), smelter (aluminium supply).
export const COMPANIES = [
  // Competitors — GCC and region
  ["Riyadh Cables", "competitor", /riyadh cables|كابلات الرياض/i],
  ["Saudi Cable Co.", "competitor", /saudi cable(?:s)? (?:co|company)|الشركة السعودية للكابلات/i],
  ["Ducab", "competitor", /\bducab\b|دوكاب/i],
  ["Elsewedy", "competitor", /el ?sewedy|السويدي/i],
  ["Oman Cables", "competitor", /oman cables?\b/i],
  ["Gulf Cables", "competitor", /gulf cables?\b/i],
  ["Bahra Cables", "competitor", /bahra (?:electric|cables)|بحرة/i],
  ["Jeddah Cables", "competitor", /jeddah cables?/i],
  ["National Cables (UAE)", "competitor", /national cables? industry/i],
  ["QICC", "competitor", /qatar international cable|\bqicc\b/i],
  ["Energya Cables", "competitor", /energya/i],
  // Competitors — global
  ["Prysmian", "competitor", /prysmian/i],
  ["Nexans", "competitor", /nexans/i],
  ["NKT", "competitor", /\bnkt\b/i],
  ["LS Cable", "competitor", /\bls cable|\bls c&s\b/i],
  ["Taihan", "competitor", /taihan/i],
  ["Iljin Electric", "competitor", /iljin/i],
  ["Southwire", "competitor", /southwire/i],
  ["Sumitomo Electric", "competitor", /sumitomo electric/i],
  ["Hengtong / ZTT", "competitor", /hengtong|\bztt\b|zhongtian/i],
  ["APAR", "competitor", /\bapar\b/i],
  ["KEI / Polycab", "competitor", /\bkei industries|polycab/i],
  ["Lamifil", "competitor", /lamifil/i],
  // EPC contractors (prospective conductor and cable buyers)
  ["L&T", "contractor", /larsen|\bl&t\b/i],
  ["KEC International", "contractor", /\bkec\b/i],
  ["Kalpataru", "contractor", /kalpataru/i],
  ["Sterlite Power", "contractor", /sterlite power|resonia/i],
  ["Alfanar", "contractor", /alfanar|الفنار/i],
  ["SSEM", "contractor", /\bssem\b/i],
  ["Linxon", "contractor", /linxon/i],
  ["Haif", "contractor", /\bhaif\b/i],
  ["Al-Babtain", "contractor", /babtain|البابطين/i],
  ["Nesma", "contractor", /\bnesma\b/i],
  ["Hitachi Energy", "contractor", /hitachi energy/i],
  ["Siemens Energy", "contractor", /siemens energy/i],
  ["GE Vernova", "contractor", /ge vernova/i],
  ["Algihaz", "contractor", /algihaz|al-?gihaz/i],
  ["Sinohydro / PowerChina", "contractor", /sinohydro|powerchina|power china/i],
  ["State Grid", "contractor", /state grid/i],
  ["Al Yamamah Steel", "contractor", /yamamah/i],
  // Utilities and procurers
  ["Saudi Energy (SEC)", "utility", /saudi energy\b|saudi electricity|\bsec\b(?=.*(?:power|grid|substation|transmission|kv))|الشركة السعودية للكهرباء|السعودية للطاقة/i],
  ["National Grid SA", "utility", /national grid sa\b|national grid saudi/i],
  ["SPPC", "utility", /\bsppc\b|saudi power procurement/i],
  ["EWA Bahrain", "utility", /\bewa\b|electricity and water authority|هيئة الكهرباء والماء/i],
  ["DEWA", "utility", /\bdewa\b|هيئة كهرباء ومياه دبي/i],
  ["TAQA / TRANSCO", "utility", /\btaqa\b|transco/i],
  ["EtihadWE", "utility", /etihad ?we\b|etihad water and electricity/i],
  ["Kahramaa", "utility", /kahramaa|كهرماء/i],
  ["Nama / OETC", "utility", /\bnama\b|\boetc\b|oman electricity transmission/i],
  ["Kuwait MEW", "utility", /kuwait.{0,40}(?:ministry of electricity|\bmew\b)|\bmewre\b/i],
  ["GCCIA", "utility", /gccia|gcc interconnection|هيئة الربط الكهربائي/i],
  // Aluminium producers
  ["Alba", "smelter", /\balba\b|aluminium bahrain|ألبا/i],
  ["EGA", "smelter", /\bega\b|emirates global alumin/i],
  ["Ma'aden", "smelter", /ma['’]?aden|معادن/i],
  ["Qatalum", "smelter", /qatalum/i],
  ["Sohar Aluminium", "smelter", /sohar alumin/i],
  ["Hindalco / Vedanta", "smelter", /hindalco|vedanta/i],
  ["Midal Cables", "self", /midal|مدال/i],
].map(([name, role, re]) => ({ name, role, re }));

export const detectCompanies = (text) => COMPANIES.filter((c) => c.re.test(text)).map((c) => c.name);

// ================================================================ categories

const ENERGY = /power|electric|grid|transmission|substation|cable|conductor|\d\s?kv\b|solar|wind|energy|utilit|interconnect|كهرب|كابل|طاقة|شمسي|رياح/i;

// match: text must match for the item to carry the category. needs: an extra requirement.
// queries: Google News searches that feed the category ([query, lang]).
export const CATEGORIES = {
  projects: {
    label: "Grid projects & awards",
    match: /transmission|substation|\bgrid\b|interconnect|overhead (?:line|transmission)|power line|\d\s?kv\b|\bhvdc\b|bulk supply|feeder cable|distribution network|electrification|نقل الكهرباء|محطة تحويل|محطات تحويل|الربط الكهربائي|خطوط? نقل|الشبكة/i,
    queries: [
      '(transmission line OR substation OR "overhead line" OR "grid project") (Saudi OR UAE OR Bahrain OR Qatar OR Oman OR Kuwait) (contract OR awarded OR wins)',
      '("Saudi Energy" OR "Saudi Electricity" OR "National Grid SA") (transmission OR substation OR "380 kV" OR "132 kV" OR "BSP")',
      '(DEWA OR TRANSCO OR TAQA OR EtihadWE) (substation OR transmission OR "400 kV" OR "132 kV")',
      '(Kahramaa OR "Electricity and Water Authority" Bahrain OR OETC OR Nama OR "Ministry of Electricity" Kuwait) (substation OR transmission OR cable)',
      '(GCCIA OR "GCC interconnection" OR "Saudi-Egypt interconnection" OR "electricity interconnection") grid',
      '("380kV" OR "400kV" OR "220kV" OR "132kV") (Saudi OR UAE OR Bahrain OR Qatar OR Oman OR Kuwait OR Iraq)',
      'site:saudigulfprojects.com (substation OR transmission OR cable OR grid)',
      'site:utilities-me.com (substation OR transmission OR cable OR grid)',
      'site:zawya.com (substation OR transmission OR "power cables" OR grid) contract',
      'site:argaam.com (cables OR electricity OR substation) contract',
      ['("نقل الكهرباء" OR "محطة تحويل" OR "الربط الكهربائي") (عقد OR ترسية OR مشروع)', "ar"],
      ['("الشركة السعودية للكهرباء" OR "السعودية للطاقة") (عقد OR ترسية OR مشروع)', "ar"],
    ],
  },
  tenders: {
    label: "Tenders & bids",
    match: /tender|\bbids?\b|bidder|\brfp\b|\brfq\b|prequalif|pre-qualif|expressions? of interest|\beoi\b|invites? (?:bids|offers)|مناقص|ترسية|منافسة/i,
    needs: ENERGY,
    queries: [
      '(tender OR bids OR prequalification) (substation OR "transmission line" OR "power cables" OR "overhead line") (Saudi OR UAE OR Bahrain OR Qatar OR Oman OR Kuwait)',
      '(Kahramaa OR DEWA OR EWA OR "Saudi Energy" OR SPPC OR OETC OR Nama) tender',
      'site:gcctendernews.com (power OR substation OR cable OR grid OR solar)',
      '("Tender Board" Bahrain OR CAPT Kuwait OR Etimad) (electricity OR cable OR substation)',
      ['(مناقصة OR منافسة) (كابلات OR "محطة تحويل" OR "خطوط نقل" OR كهرباء)', "ar"],
    ],
  },
  government: {
    label: "Government & utility plans",
    match: /vision 2030|ministry|minister|government|cabinet|national (?:grid|plan|program|strategy)|budget|strategy|\bmou\b|memorandum|framework agreement|regulat|programme|\bprogram\b|localis|localiz|iktva|in-country value|capex|investment plan|وزارة|وزير|رؤية|مذكرة تفاهم|استراتيجية/i,
    needs: ENERGY,
    queries: [
      '(Saudi OR UAE OR Bahrain OR Qatar OR Oman OR Kuwait) (ministry OR government OR cabinet) (electricity grid OR transmission OR "power sector") plan',
      '("Vision 2030" OR "National Renewable Energy Program" OR NREP) (grid OR transmission OR electricity)',
      '(Saudi OR GCC) (grid investment OR "transmission investment" OR "power sector capex" OR "electricity demand")',
      '("local content" OR IKTVA OR localization) (cables OR electrical OR "power sector") Saudi',
      '(Bahrain) (EWA OR "electricity" OR "renewable energy") (plan OR strategy OR project)',
      ['(وزارة الطاقة OR "هيئة الكهرباء") (مشروع OR خطة OR استثمار) (الشبكة OR نقل)', "ar"],
    ],
  },
  demand: {
    label: "Renewables, data centres & demand",
    match: /solar|wind farm|wind power|wind project|photovoltaic|\bpv\b|battery|\bbess\b|energy storage|data cent|hydrogen|ev charging|\bipp\b|power plant|power project|gigawatt|\d\s?gw\b|\d\s?mw\b|مشروع (?:طاقة|شمسي)|الطاقة الشمسية|طاقة الرياح|مراكز البيانات/i,
    needs: ENERGY,
    queries: [
      '(Saudi OR UAE OR Bahrain OR Qatar OR Oman OR Kuwait) (solar OR wind OR "battery storage") (awarded OR signs OR financial close OR construction)',
      '(ACWA OR Masdar OR SPPC OR "EWEC") (solar OR wind OR storage) project',
      '(Saudi OR UAE OR Bahrain OR Qatar OR Oman OR Kuwait) "data centre" (MW OR power OR grid)',
      '(Saudi OR UAE OR Oman) ("power plant" OR IPP OR "combined cycle") contract',
    ],
  },
  competitors: {
    label: "Competitor moves",
    // Assigned when a competitor is named; see classify().
    match: null,
    queries: [
      '"Riyadh Cables"',
      '"Ducab"',
      '("Elsewedy Electric" OR "Elsewedy Cables") (cable OR contract OR order)',
      '("Oman Cables" OR "Gulf Cables" OR "Jeddah Cables" OR "Bahra Cables" OR "Saudi Cable Company")',
      '("Qatar International Cable" OR "National Cables Industry" OR "Energya Cables")',
      '(Prysmian OR Nexans OR NKT) (order OR contract OR awarded OR acquisition OR plant)',
      '("LS Cable" OR Taihan OR Iljin OR "Sumitomo Electric") (cable OR order OR contract)',
      '("APAR Industries" OR "KEI Industries" OR Polycab OR Hengtong OR ZTT) (conductor OR cable OR order)',
      '("overhead conductor" OR AAAC OR ACSR OR HTLS OR ACCC OR "aluminium conductor" OR "aluminum conductor") (order OR contract OR supply)',
      ['("كابلات الرياض" OR "السويدي" OR "دوكاب") (عقد OR توقيع OR ترسية OR أرباح)', "ar"],
    ],
  },
  aluminium: {
    label: "Aluminium market",
    match: /alumin|الألمنيوم|الألومنيوم|ألمنيوم/i,
    queries: [
      '(aluminium OR aluminum) price LME',
      '(Alba OR "Aluminium Bahrain" OR "Emirates Global Aluminium" OR EGA OR "Ma\'aden" OR Qatalum OR "Sohar Aluminium") aluminium',
      '(aluminium OR aluminum) premium (Japan OR Rotterdam OR Midwest OR "Middle East" OR Asia)',
      '("wire rod" OR "aluminium rod" OR "aluminum rod" OR "EC grade" OR "alloy rod") aluminium',
      '(aluminium OR aluminum) (smelter OR alumina OR bauxite) (supply OR output OR outage OR restart OR curtail)',
      ['(الألمنيوم OR "ألبا") (أسعار OR إنتاج OR "بورصة لندن")', "ar"],
    ],
  },
  metals: {
    label: "Copper & LME",
    match: /copper|\blme\b|london metal exchange|base metals?|النحاس/i,
    queries: ['copper price LME', '("London Metal Exchange" OR LME) (stocks OR warehouse OR rules OR fees OR aluminium)'],
  },
  policy: {
    label: "Trade & policy",
    match: /tariff|section 232|\bcbam\b|carbon border|anti-dumping|dumping|countervailing|safeguard|import dut|customs dut|\bquota|sanction|local content|iktva|رسوم|إغراق|المحتوى المحلي/i,
    needs: /alumin|cable|conductor|metal|copper|wire|rod|steel|gcc|bahrain|saudi|الألمنيوم|كابل/i,
    queries: [
      '(aluminium OR aluminum) (tariff OR "Section 232" OR "anti-dumping" OR duty)',
      '(CBAM OR "carbon border") (aluminium OR aluminum OR GCC OR Bahrain)',
      '(cable OR cables OR conductor) ("anti-dumping" OR tariff OR "local content" OR IKTVA)',
    ],
  },
  export: {
    label: "Export markets",
    // Projects and demand outside the GCC; see classify().
    match: null,
    queries: [
      '(transmission line OR "HVDC" OR "765 kV" OR "400 kV") (tender OR awarded OR contract) India',
      '(transmission OR "overhead line" OR interconnector) (Australia OR "New Zealand") (contract OR awarded OR approval)',
      '(transmission line OR substation OR interconnection) (Egypt OR Iraq OR Jordan OR Africa) (contract OR awarded OR financing)',
      '(transmission OR "overhead line" OR conductor) (Europe OR UK OR "United States") (contract OR order OR reconductoring)',
    ],
  },
  midal: {
    label: "Midal mentions",
    match: /midal|مدال/i,
    queries: ['"Midal Cables" OR "Midal Cable"', '"Midal" (aluminium OR aluminum OR cable OR conductor OR Bahrain OR Saudi)', ['"مدال" كابلات', "ar"]],
  },
};

// Direct RSS feeds from GCC trade sites. Their items cover every sector, so each item must
// match at least one category to be kept.
export const FEEDS = [
  { name: "SaudiGulf Projects", url: "https://www.saudigulfprojects.com/feed/" },
  { name: "GCC Tender News", url: "https://gcctendernews.com/feed/" },
  { name: "Utilities Middle East", url: "https://www.utilities-me.com/feed" },
];

export const REGIONS = {
  Bahrain: /bahrain|manama|البحرين|المنامة/i,
  Saudi: /saudi|riyadh|jeddah|neom|dammam|\bksa\b|tabuk|medina|السعودية|الرياض|جدة|المملكة/i,
  UAE: /\buae\b|emirat|dubai|abu dhabi|sharjah|الإمارات|دبي|أبوظبي/i,
  Qatar: /qatar|doha|kahramaa|قطر|الدوحة/i,
  Oman: /\boman|muscat|sohar|duqm|ibri|سلطنة عمان|العماني|مسقط/i,
  Kuwait: /kuwait|الكويت/i,
  Iraq: /\biraq|العراق/i,
  Egypt: /egypt|cairo|مصر/i,
  India: /india|nalco|hindalco|vedanta|\bcrore\b|₹/i,
  Australia: /australia|new zealand/i,
  Europe: /europe|\beu\b|german|france|french|ital|spain|\buk\b|britain|british|netherlands|dutch|norway|denmark|tennet/i,
  // Case-sensitive so the pronoun "us" and the currency "US$" do not count.
  "North America": /\bU\.S\.(?!\$)|\bUS\b(?!\$)|United States|\bAmerica|Canad|Mexic|Alcoa/,
  China: /china|chinese|shfe|shanghai|الصين/i,
  Africa: /africa|nigeria|kenya|morocco|ethiopia|tanzania/i,
};
const GCC = new Set(["Bahrain", "Saudi", "UAE", "Qatar", "Oman", "Kuwait"]);

export const detectRegions = (text) =>
  Object.entries(REGIONS)
    .filter(([, re]) => re.test(text))
    .map(([name]) => name);

// Deal stage, from the headline first, then the snippet.
const STAGES = [
  // An MoU or framework agreement is a plan even when the headline says "signs".
  ["Plan", /\bmou\b|memorandum|framework agreement|مذكرة تفاهم/i],
  ["Commissioned", /inaugurat|commissioned|energi[sz]ed|enters? (?:commercial )?(?:operation|service)|goes live|begins operation|يفتتح|تدشين|تشغيل/i],
  ["Award", /award|\bwins?\b|\bwon\b|\bsecures?\b|\bsecured\b|\bbags?\b|\blands?\b|\bsigns?\b|\bsigned\b|\bselects?\b|\bselected\b|appoint|contract (?:for|to|with)|order (?:for|from)|ترسية|توقيع|يوقع|فوز|عقد/i],
  ["Tender", /tender|\bbids?\b|bidders?|invites?|\brfp\b|\brfq\b|prequalif|pre-qualif|shortlist|expressions? of interest|مناقص|منافسة|عروض/i],
  ["Construction", /construction|breaks? ground|groundbreaking|under way|underway|progress|\d+\s?% complet|completes?|installation|إنشاء|تنفيذ|نسبة الإنجاز/i],
  ["Plan", /\bmou\b|memorandum|framework agreement|\bplans?\b|planned|proposed|to build|feasibility|study|مذكرة تفاهم|خطة|دراسة/i],
];
export function detectStage(title, description = "") {
  for (const text of [title, description]) {
    for (const [stage, re] of STAGES) if (re.test(text)) return stage;
  }
  return null;
}

// First money amount in the text, e.g. "$1.8 billion", "SAR 254.27 million", "BD34.97m", "₹15,000 crore".
const MONEY =
  /(US\$|\$|SAR|SR|AED|Dh|BD|QR|QAR|KD|KWD|OMR|RO|€|EUR|£|GBP|A\$|AU\$|₹|Rs\.?|INR|RMB|¥)\s?(\d[\d,]*(?:\.\d+)?)\s?(billion|bn|million|mn|m\b|crore|lakh)?|(\d[\d,]*(?:\.\d+)?)\s?(billion|bn|million|mn|crore)\s(?:US\$|dollars?|riyals?|SAR|dirhams?|AED|dinars?|BD|euros?|rupees)/i;
export function detectValue(text) {
  const m = text.match(MONEY);
  if (!m) return null;
  const s = m[0].trim();
  if (m[2] && !m[3] && Number(m[2].replace(/,/g, "")) < 1000) return null; // e.g. "$3/t" prices
  return s;
}

// Water, waste and pipeline stories mention power plants but are not grid business.
const NOISE = /water treatment|desalinat|sewer|wastewater|waste-to-energy|stormwater|\bpipes?\b|pipeline/i;
const GRIDWORDS = /transmission|substation|cable|conductor|\bgrid\b|\d\s?kv\b|interconnect|نقل الكهرباء|كابل/i;

// Assigns categories to one item. hint = the category whose search found it (if any).
export function classify(text, hint) {
  const cats = new Set();
  for (const [key, c] of Object.entries(CATEGORIES)) {
    if (!c.match) continue;
    if (c.match.test(text) && (!c.needs || c.needs.test(text))) cats.add(key);
  }
  if (NOISE.test(text) && !GRIDWORDS.test(text)) ["demand", "government", "tenders"].forEach((c) => cats.delete(c));
  const companies = detectCompanies(text);
  const roles = new Set(companies.map((n) => COMPANIES.find((c) => c.name === n).role));
  if (roles.has("competitor")) cats.add("competitors");
  if (hint === "competitors" && roles.has("competitor")) cats.add("competitors");
  // A competitor query hit that only names a conductor type still counts as a cable-industry item.
  if (hint === "competitors" && /cable|conductor|aaac|acsr|htls|accc/i.test(text)) cats.add("competitors");
  const regions = detectRegions(text);
  if ((cats.has("projects") || cats.has("demand") || cats.has("tenders")) && regions.length && !regions.some((r) => GCC.has(r)))
    cats.add("export");
  if (hint === "export" && (cats.has("projects") || cats.has("tenders"))) cats.add("export");
  return { categories: [...cats], companies, regions };
}

// ================================================================ RSS parsing

const decode = (s = "") =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;|&#8217;|&#8216;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&#8211;|&#8212;/g, "–")
    .replace(/&#124;/g, "|")
    .replace(/&#038;/g, "&")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&");

const stripTags = (s) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const field = (body, name) => {
  const m = body.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`));
  return m ? m[1] : "";
};

const parseDate = (s) => {
  const t = Date.parse(s);
  return Number.isNaN(t) ? new Date().toISOString() : new Date(t).toISOString();
};

// Parses Google News RSS and ordinary (e.g. WordPress) RSS feeds.
export function parseItems(xml, fallbackPublisher = "", fallbackUrl = "") {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, body]) => {
    const src = body.match(/<source\s+url="([^"]+)"[^>]*>([\s\S]*?)<\/source>/);
    const publisher = src ? decode(src[2]).trim() : fallbackPublisher;
    const publisherUrl = src ? decode(src[1]).trim() : fallbackUrl;
    let title = decode(field(body, "title")).trim();
    if (publisher && title.endsWith(` - ${publisher}`)) title = title.slice(0, -(publisher.length + 3)).trim();
    let description = decode(stripTags(decode(field(body, "description"))));
    if (description.startsWith(title)) description = description.slice(title.length);
    if (publisher && description.endsWith(publisher)) description = description.slice(0, -publisher.length);
    // WordPress excerpts end with "The post <title> appeared first on <site>."
    description = description.replace(/\s*The post .* appeared first on .*$/s, "").replace(/\s*\[(?:…|&#8230;|\.\.\.)\]\s*$/, "…");
    description = description.replace(/^[\s\-–|]+|[\s\-–|]+$/g, "").slice(0, 300);
    return {
      title,
      url: decode(field(body, "link")).trim(),
      publisher,
      publisherUrl,
      published: parseDate(decode(field(body, "pubDate"))),
      description,
    };
  });
}

export const keyOf = (title) => title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const DEAL_CATEGORIES = new Set(["projects", "tenders", "government", "demand", "competitors", "export", "midal"]);
const isArabic = (s) => /[؀-ۿ]/.test(s);

// Merges freshly fetched items into the stored list. Pure, so it can be tested without network.
export function mergeNews(existing, fetched, now = Date.now()) {
  const byKey = new Map(existing.map((item) => [keyOf(item.title), item]));
  for (const raw of fetched) {
    if (!raw.title || !raw.url) continue;
    const text = `${raw.title} ${raw.description}`;
    const { categories, companies, regions } = classify(text, raw.category);
    if (!categories.length) continue;
    const key = keyOf(raw.title);
    const prev = byKey.get(key);
    byKey.set(key, {
      id: createHash("sha1").update(key).digest("hex").slice(0, 12),
      title: raw.title,
      url: prev?.url && !prev.url.includes("news.google.com") ? prev.url : raw.url,
      publisher: raw.publisher || prev?.publisher || "",
      publisherUrl: raw.publisherUrl || prev?.publisherUrl || "",
      published: raw.published,
      description: raw.description || prev?.description || "",
      categories: [...new Set([...(prev?.categories ?? []), ...categories])],
      regions,
      companies,
      // A deal stage only means something for project, tender and company news.
      stage: categories.some((c) => DEAL_CATEGORIES.has(c)) ? detectStage(raw.title, raw.description) : null,
      value: detectValue(raw.title) ?? detectValue(raw.description),
      lang: isArabic(raw.title) ? "ar" : "en",
      firstSeen: prev?.firstSeen ?? new Date(now).toISOString(),
    });
  }
  const cutoff = now - NEWS_RETENTION_DAYS * 86_400_000;
  return [...byKey.values()]
    .filter((i) => Date.parse(i.published) >= cutoff)
    .sort((a, b) => Date.parse(b.published) - Date.parse(a.published))
    .slice(0, MAX_NEWS);
}

const feedUrl = (q, lang, window) => {
  const params = lang === "ar" ? "hl=ar&gl=SA&ceid=SA:ar" : "hl=en-US&gl=US&ceid=US:en";
  return `https://news.google.com/rss/search?q=${encodeURIComponent(`${q} when:${window}`)}&${params}`;
};

// ================================================================ main

const UA = "cables-market-watch/1.0 (daily digest)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url) {
  const res = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(25_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

async function updatePrices() {
  const stored = await readJson(PRICES_FILE, { metals: {} });
  const out = { generatedAt: new Date().toISOString(), source: "LME official prices via westmetall.com", metals: {} };
  let ok = 0;
  const year = new Date().getUTCFullYear();
  for (const [key, { field, label }] of Object.entries(METALS)) {
    let series = stored.metals?.[key]?.series ?? [];
    try {
      const fetched = parsePriceTable(await get(priceUrl(field)));
      // Backfill the previous year once, so the 1-year view is full.
      if (series.length < 200) {
        await sleep(1500);
        fetched.push(...parsePriceTable(await get(priceUrl(field, year - 1))));
      }
      if (!fetched.length) throw new Error("no rows parsed");
      series = mergeSeries(series, fetched);
      ok += 1;
      console.log(`[price ${key}] ${fetched.length} rows, latest ${series.at(-1)?.date}`);
    } catch (err) {
      console.warn(`[price ${key}] failed: ${err.message}`);
    }
    out.metals[key] = { label, unit: "USD/t", stockUnit: "t", series };
    await sleep(1500);
  }
  if (ok) await writeFile(PRICES_FILE, JSON.stringify(out) + "\n");
  return ok;
}

async function updateNews() {
  const existing = (await readJson(NEWS_FILE, {})).items ?? [];
  // Look back further on the first runs so the feed starts full.
  const window = existing.length < 150 ? "30d" : "7d";
  const fetched = [];
  let ok = 0;
  for (const [category, { queries }] of Object.entries(CATEGORIES)) {
    for (const entry of queries) {
      const [q, lang] = Array.isArray(entry) ? entry : [entry, "en"];
      try {
        const items = parseItems(await get(feedUrl(q, lang, window))).map((i) => ({ ...i, category }));
        fetched.push(...items);
        ok += 1;
        console.log(`[news ${category}${lang === "ar" ? " ar" : ""}] ${items.length} results`);
      } catch (err) {
        console.warn(`[news ${category}] failed: ${err.message}`);
      }
      await sleep(1200);
    }
  }
  for (const feed of FEEDS) {
    try {
      const items = parseItems(await get(feed.url), feed.name, new URL(feed.url).origin);
      fetched.push(...items);
      ok += 1;
      console.log(`[feed ${feed.name}] ${items.length} items`);
    } catch (err) {
      console.warn(`[feed ${feed.name}] failed: ${err.message}`);
    }
  }
  if (ok) {
    const items = mergeNews(existing, fetched);
    const out = {
      generatedAt: new Date().toISOString(),
      retentionDays: NEWS_RETENTION_DAYS,
      categories: Object.fromEntries(Object.entries(CATEGORIES).map(([k, v]) => [k, v.label])),
      companies: COMPANIES.map(({ name, role }) => ({ name, role })),
      count: items.length,
      items,
    };
    await writeFile(NEWS_FILE, JSON.stringify(out, null, 2) + "\n");
    console.log(`Wrote ${items.length} news items`);
  }
  return ok;
}

async function main() {
  const prices = await updatePrices();
  const news = await updateNews();
  if (!prices && !news) {
    console.error("Every source failed; data files left unchanged.");
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
