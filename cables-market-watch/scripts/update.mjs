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
import { readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const PRICES_FILE = join(here, "..", "data", "prices.json");
export const NEWS_FILE = join(here, "..", "data", "news.json");
export const NEWS_RETENTION_DAYS = 120;
export const MAX_NEWS = 2000;
export const PRICE_RETENTION_DAYS = 760; // ~2 years of trading days
export const COMPETITORS_FILE = join(here, "..", "data", "competitors.json");

// Competitors come from data/competitors.json (built from web searches; edit that file, not this one).
export const COMPETITORS = JSON.parse(readFileSync(COMPETITORS_FILE, "utf8")).competitors;

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

// role: competitor (cable, conductor and rod makers, from data/competitors.json), contractor (EPC firms that buy conductors and cables),
// utility (grid owners and procurers), smelter (aluminium supply).
export const COMPANIES = [
  ...COMPETITORS.map((c) => [c.name, "competitor", new RegExp(c.match, "i")]),
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
  ["POWERGRID", "contractor", /powergrid|power grid corporation/i],
  ["Adani Energy Solutions", "contractor", /adani (?:energy|transmission)/i],
  ["Tata Power", "contractor", /tata power/i],
  ["Acciona", "contractor", /acciona/i],
  ["Neoenergia / Iberdrola", "contractor", /neoenergia|iberdrola/i],
  ["EDP", "contractor", /\bedp\b/i],
  ["CYMI / Celeo", "contractor", /\bcymi\b|celeo/i],
  ["Jacobs / WSP", "contractor", /\bjacobs\b|\bwsp\b/i],
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
  ["Iraq Ministry of Electricity", "utility", /iraq(?:i)? ministry of electricity|وزارة الكهرباء العراقية/i],
  ["Eskom / NTCSA", "utility", /eskom|\bntcsa\b/i],
  ["National Grid (UK)", "utility", /national grid(?! sa| saudi)|great grid upgrade/i],
  ["TenneT / EU TSOs", "utility", /tennet|amprion|50hertz|transnetbw|\brte\b|terna\b|red el[eé]ctrica/i],
  ["BC Hydro / Hydro-Québec", "utility", /bc hydro|hydro-qu[eé]bec|hydro one|altalink|manitoba hydro/i],
  ["AEP / US grid operators", "utility", /\baep\b|american electric power|oncor|\bercot\b|\bpjm\b|\bmiso\b/i],
  ["ANEEL (Brazil)", "utility", /aneel/i],
  // Aluminium producers
  ["Alba", "smelter", /\balba\b|aluminium bahrain|ألبا/i],
  ["EGA", "smelter", /\bega\b|emirates global alumin/i],
  ["Ma'aden", "smelter", /ma['’]?aden|معادن/i],
  ["Qatalum", "smelter", /qatalum/i],
  ["Sohar Aluminium", "smelter", /sohar alumin/i],
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
    // Assigned when a competitor is named; see classify(). One search per competitor in data/competitors.json.
    match: null,
    queries: [
      ...COMPETITORS.map((c) => c.search),
      '("overhead conductor" OR AAAC OR ACSR OR HTLS OR ACCC OR "aluminium conductor" OR "aluminum conductor") (order OR contract OR supply)',
      '("wire rod" OR conductor OR cable) (wins OR secures OR bags) order transmission',
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

// Markets: each has country/region patterns (for tagging) and project searches (for collecting).
// The searches run under the "projects" category, and items keep the market of the search that found them.
export const MARKETS = {
  "Middle East": {
    regions: {
      Bahrain: /bahrain|manama|البحرين|المنامة/i,
      Saudi: /saudi|riyadh|jeddah|neom|dammam|\bksa\b|tabuk|medina|السعودية|الرياض|جدة|المملكة/i,
      UAE: /\buae\b|emirat|dubai|abu dhabi|sharjah|الإمارات|دبي|أبوظبي/i,
      Qatar: /qatar|doha|kahramaa|قطر|الدوحة/i,
      Oman: /\boman|muscat|sohar|duqm|ibri|سلطنة عمان|العماني|مسقط/i,
      Kuwait: /kuwait|الكويت/i,
      Iraq: /\biraq|baghdad|basra|العراق/i,
      Jordan: /jordan|الأردن/i,
      "Levant & Iran": /lebanon|syria|\biran\b|turkey|türkiye/i,
    },
    queries: [
      '(Iraq OR Jordan OR Lebanon OR Syria) ("transmission line" OR substation OR interconnection OR "400 kV") (contract OR awarded OR signs)',
      '("Iraq-GCC" OR "Saudi-Iraq" OR "Jordan-Iraq" OR "Gulf interconnection") electricity Iraq',
    ],
  },
  Asia: {
    regions: {
      India: /india|indian\b|\bcrore\b|₹|powergrid|\btbcb\b|\bists\b|gujarat|rajasthan|maharashtra|karnataka/i,
      China: /china|chinese|shfe|shanghai|الصين/i,
      "Southeast Asia": /vietnam|philippine|indonesia|malaysia|thailand|cambodia|laos|myanmar|singapore|asean/i,
      "South & Central Asia": /pakistan|bangladesh|sri lanka|nepal|bhutan|uzbekistan|kazakhstan|kyrgyz|tajikistan|turkmenistan|afghanistan/i,
      "East Asia": /korea|japan|taiwan/i,
    },
    queries: [
      '(POWERGRID OR "Adani Energy Solutions" OR "Tata Power" OR Resonia OR "Sterlite Power") transmission (wins OR awarded OR TBCB OR project)',
      '("765 kV" OR "400 kV" OR HVDC) transmission India (tender OR awarded OR order OR commissioned)',
      '(Vietnam OR Philippines OR Indonesia OR Malaysia OR Thailand) ("500 kV" OR "transmission line" OR substation) (contract OR awarded OR construction)',
      '(Pakistan OR Bangladesh OR "Sri Lanka" OR Uzbekistan OR Kazakhstan) ("transmission line" OR substation OR grid) (contract OR ADB OR "World Bank" OR awarded)',
    ],
  },
  Africa: {
    regions: {
      Egypt: /egypt|cairo|مصر/i,
      "North Africa": /morocco|algeria|tunisia|libya|المغرب|الجزائر/i,
      "South Africa": /south africa|eskom|\bntcsa\b/i,
      "Sub-Saharan Africa": /nigeria|kenya|ethiopia|tanzania|ghana|zambia|uganda|mozambique|angola|senegal|cameroon|\bchad\b|rwanda|ivory coast|côte d'ivoire|\bdrc\b|congo|namibia|botswana|zimbabwe|\bafrica/i,
    },
    queries: [
      '(Eskom OR NTCSA OR "independent transmission") transmission line (contract OR tender OR awarded OR construction)',
      '(Kenya OR Nigeria OR Ethiopia OR Tanzania OR Ghana OR Zambia OR Uganda OR Cameroon) "transmission line" (contract OR financing OR awarded)',
      '(Egypt OR Morocco OR Algeria OR Tunisia OR Libya) (transmission OR interconnection OR substation) (contract OR awarded)',
      'Africa (interconnector OR "power pool" OR "transmission line") (financing OR contract OR AfDB)',
    ],
  },
  Europe: {
    regions: {
      "UK & Ireland": /\buk\b|britain|british(?! columbia)|england|scotland|wales|ireland|national grid(?! sa| saudi)|\bssen\b|great grid upgrade/i,
      "Western Europe": /german|france|french|\bital|spain|spanish|portugal|netherlands|dutch|belgi|austria|switzerland|tennet|amprion|50hertz|\brte\b|terna\b/i,
      "Nordics & Eastern Europe": /norway|sweden|denmark|finland|poland|romania|bulgaria|greece|hungary|czech|baltic|ukraine|serbia|croatia/i,
      Europe: /europe|\beu\b|entso/i,
    },
    queries: [
      '("National Grid" OR SSEN OR "Great Grid Upgrade" OR SPEN) ("overhead line" OR pylons OR "400 kV") (contract OR consent OR construction)',
      '(TenneT OR Amprion OR 50Hertz OR TransnetBW OR RTE OR Terna OR "Red Eléctrica" OR PSE OR Statnett) ("overhead line" OR "transmission line" OR "380 kV") contract',
      '(Europe OR EU) (reconductoring OR HTLS OR "overhead line" OR "grid expansion") (contract OR order OR investment)',
    ],
  },
  Canada: {
    regions: {
      Canada: /canad|qu[eé]bec|ontario|british columbia|\bb\.c\.|alberta|saskatchewan|manitoba|newfoundland|labrador|nova scotia|new brunswick|bc hydro|hydro-qu|hydro one|altalink/i,
    },
    queries: [
      '("Hydro-Québec" OR "BC Hydro" OR "Hydro One" OR AltaLink OR SaskPower OR "Manitoba Hydro" OR "Nova Scotia Power" OR "Newfoundland and Labrador Hydro") transmission line',
      'Canada "transmission line" (construction OR approval OR contract OR "500 kV" OR "230 kV")',
    ],
  },
  USA: {
    regions: {
      // Case-sensitive so the pronoun "us" and the currency "US$" do not count.
      USA: /\bU\.S\.(?!\$)|\bUS\b(?!\$)|United States|\bAmerica\b|Texas|Ohio|California|ERCOT|PJM|MISO|FERC|\bDOE\b|Alcoa|Oncor|\bAEP\b/,
    },
    queries: [
      '(ERCOT OR PJM OR MISO OR SPP OR CAISO) ("765 kV" OR "500 kV" OR "345 kV") transmission (approved OR construction OR contract)',
      '(reconductoring OR "advanced conductor" OR HTLS) (utility OR DOE OR FERC) transmission',
      '"transmission line" ("data center" OR "data centre") ("765 kV" OR "345 kV") utility',
    ],
  },
  "Latin America": {
    regions: {
      "Latin America": /brazil|brasil|aneel|chile|peru\b|colombia|mexic|argentin|ecuador|bolivia|uruguay|paraguay|panama|guatemala|costa rica|dominican|latin america/i,
    },
    queries: [
      '(ANEEL OR Brazil) ("transmission auction" OR "leilão de transmissão" OR "transmission lots")',
      '(Chile OR Peru OR Colombia OR Mexico OR Argentina) ("transmission line" OR "línea de transmisión") (contract OR awarded OR auction OR licitación)',
    ],
  },
  Oceania: {
    regions: {
      Oceania: /australia|new zealand|transgrid|powerlink|\baemo\b|western power|transpower|\bnsw\b|queensland/i,
    },
    queries: [
      '(Australia OR "New Zealand") transmission (Transgrid OR AEMO OR Powerlink OR "Western Power" OR Transpower OR AusNet OR ElectraNet) (contract OR awarded OR approval)',
    ],
  },
};

export const REGIONS = Object.fromEntries(Object.values(MARKETS).flatMap((m) => Object.entries(m.regions)));
export const REGION_MARKET = Object.fromEntries(
  Object.entries(MARKETS).flatMap(([market, m]) => Object.keys(m.regions).map((r) => [r, market])),
);

export const detectRegions = (text) =>
  Object.entries(REGIONS)
    .filter(([, re]) => re.test(text))
    .map(([name]) => name);

export const marketsOf = (regions, hint) => {
  const m = [...new Set(regions.map((r) => REGION_MARKET[r]))];
  return m.length ? m : hint ? [hint] : [];
};

// The company named as winner in headlines such as "Xyz Cables wins 400 kV conductor order".
// Lets the dashboard surface cable and conductor makers that are not on the competitor list yet.
const WIN = /^((?:(?:[A-Z0-9][\w&.'’-]*|&)\s){0,4}?[A-Z0-9][\w&.'’-]*?)(?:'s|’s)?\s+(?:wins?|won|secures?|secured|bags?|bagged|lands?|clinches|grabs)\b/;
export function detectActor(title) {
  const m = title.match(WIN);
  if (!m) return null;
  const name = m[1].trim();
  if (name.length < 3 || name.length > 45 || /^(?:the|a|an|it|india|saudi|uae|china|us|uk|consortium)$/i.test(name)) return null;
  return name;
}

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
const DEAL_CATEGORIES = new Set(["projects", "tenders", "government", "demand", "competitors", "midal"]);
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
      markets: marketsOf(regions, raw.market ?? prev?.markets?.[0]),
      companies,
      actor: detectActor(raw.title),
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
  for (const [market, { queries }] of Object.entries(MARKETS)) {
    for (const q of queries) {
      try {
        const items = parseItems(await get(feedUrl(q, "en", window))).map((i) => ({ ...i, category: "projects", market }));
        fetched.push(...items);
        ok += 1;
        console.log(`[projects ${market}] ${items.length} results`);
      } catch (err) {
        console.warn(`[projects ${market}] failed: ${err.message}`);
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
      markets: Object.keys(MARKETS),
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
