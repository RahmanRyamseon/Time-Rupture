/* ============================================================
   Live free data sources — all CORS-enabled, no key, no relay
   ------------------------------------------------------------  V2
   Sanctions -> EVERY source list in the OpenSanctions consolidated
                sanctions collection (100+ official lists), found
                live from the public data catalog, plus multilateral
                debarment / wanted watchlists. Curated fallback set
                if the catalog is unreachable.
   PEP       -> National PEP registers via OpenSanctions (dozens of
                lists, downloaded & indexed locally) + live Wikidata
                office-holder + RCA relationship-graph check.
   Adverse   -> Google News RSS scanned for risk terms + Wikipedia
                fallback + live news search links.
   ============================================================ */
(function () {
  "use strict";

  var M = window.CSMatch;
  var norm = M.norm, lev = M.lev, sim = M.sim, translit = M.translit, soundex = M.soundex,
    tok = M.tok, pairScore = M.pairScore, nameScoreEx = M.nameScoreEx, nameScore = M.nameScore;
  function withTimeout(p, ms) { return Promise.race([p, new Promise(function (_, r) { setTimeout(function () { r(new Error("timeout")); }, ms); })]); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  // fetch JSON with retry + backoff (resilient to rate-limited bursts)
  async function fetchJson(url, ms, tries) {
    var attempts = tries || 3, lastErr;
    for (var i = 0; i < attempts; i++) {
      try {
        var r = await withTimeout(fetch(url, { headers: { "Accept": "application/json" } }), ms || 9000);
        if (r.status === 429 || r.status >= 500) throw new Error("HTTP " + r.status);
        return await r.json();
      } catch (e) { lastErr = e; if (i < attempts - 1) await sleep(400 * (i + 1) + Math.random() * 300); }
    }
    throw lastErr || new Error("fetch-failed");
  }

  /* ---------- fuzzy matching helpers ----------
     Layered matcher (defensible against the "exact string match" critique):
       1. Levenshtein edit distance      -> typos / OCR noise
       2. Transliteration folding         -> Mohammed / Muhammad / Mohamad, w/v, ph/f
       3. Soundex phonetic codes          -> Rahman / Rehman, Smith / Smyth
     Token-level, order-independent, with a coverage rule that suppresses
     single-common-first-name false positives.
  */

  /* ============================================================
     Sanctions: MULTI-LIST screening via OpenSanctions bulk data
     ------------------------------------------------------------
     Each official list is fetched as its own free, keyless,
     CORS-enabled, daily-updated `targets.simple.csv` from the
     OpenSanctions data CDN (data.opensanctions.org). Every entity
     keeps the provenance of which list(s) it appears on, so an
     analyst sees exactly which authority designated a match.

     Coverage = UN + EU + UK (OFSI/FCDO) + UAE + US (OFAC/BIS) +
     Canada + Australia + Switzerland + France. The list set below
     is data-driven — add a {code,label,authority,jurisdiction} row
     to screen against another jurisdiction (any OpenSanctions
     source dataset code works). Loading is resilient: a list that
     fails to download is skipped and reported, never blocking the
     rest. A legacy US trade.gov feed is the last-resort fallback.
     ============================================================ */
  var OS_BASE = "https://data.opensanctions.org/datasets/latest/";
  var CSL_URL = "https://data.trade.gov/downloadable_consolidated_screening_list/v1/consolidated.json"; // legacy fallback only

  // The official lists screened, grouped by region. Every code below is a real,
  // free OpenSanctions source dataset (verified against the Consolidated
  // Sanctions collection). Loading is resilient: any list that fails to download
  // is skipped and reported, never blocking the rest.
  var SANCTION_LISTS = [
    // ---- International ----
    { code: "un_sc_sanctions",            label: "UN Security Council Consolidated",            authority: "UN Security Council",            jurisdiction: "United Nations" },
    { code: "un_1718_vessels",            label: "UN 1718 (DPRK) Designated Vessels",           authority: "UN Security Council",            jurisdiction: "United Nations" },
    // ---- European Union ----
    { code: "eu_fsf",                     label: "EU Financial Sanctions Files (FSF)",          authority: "European Union — EEAS",          jurisdiction: "European Union" },
    { code: "eu_travel_bans",             label: "EU Consolidated Travel Bans",                 authority: "European Union — Council",       jurisdiction: "European Union" },
    { code: "eu_journal_sanctions",       label: "EU Official Journal Sanctioned Entities",     authority: "European Union — Council",       jurisdiction: "European Union" },
    { code: "eu_sanctions_map",           label: "EU Sanctions Map",                            authority: "European Union",                 jurisdiction: "European Union" },
    // ---- United Kingdom ----
    { code: "gb_fcdo_sanctions",          label: "UK Sanctions List (OFSI / FCDO)",             authority: "HM Treasury (OFSI) / FCDO",      jurisdiction: "United Kingdom" },
    { code: "gb_hmt_invbans",             label: "UK HMT/OFSI Investment Bans",                 authority: "HM Treasury (OFSI)",             jurisdiction: "United Kingdom" },
    // ---- United States (multiple agencies) ----
    { code: "us_ofac_sdn",                label: "US OFAC — Specially Designated Nationals (SDN)", authority: "US Treasury — OFAC",          jurisdiction: "United States" },
    { code: "us_ofac_cons",               label: "US OFAC — Non-SDN Consolidated",              authority: "US Treasury — OFAC",             jurisdiction: "United States" },
    { code: "us_bis_denied",              label: "US BIS — Denied Persons",                     authority: "US Commerce — BIS",              jurisdiction: "United States" },
    { code: "us_state_terrorist_orgs",    label: "US State Dept — Foreign Terrorist Orgs",      authority: "US State Department",            jurisdiction: "United States" },
    { code: "us_dhs_uflpa",               label: "US UFLPA Entity List",                        authority: "US DHS",                         jurisdiction: "United States" },
    { code: "us_dod_chinese_milcorps",    label: "US DoD — Chinese Military Companies",         authority: "US Department of Defense",       jurisdiction: "United States" },
    { code: "us_cuba_sanctions",          label: "US State Dept — Cuba Restrictions",           authority: "US State Department",            jurisdiction: "United States" },
    { code: "us_ddtc_debarred",           label: "US DDTC — AECA Debarments",                   authority: "US State — DDTC",                jurisdiction: "United States" },
    { code: "us_trade_csl",               label: "US Consolidated Screening List (CSL)",        authority: "US International Trade Administration", jurisdiction: "United States" },
    { code: "us_bis_entity",              label: "US BIS — Entity List",                        authority: "US Commerce — BIS",              jurisdiction: "United States" },
    { code: "us_sam_exclusions",          label: "US SAM.gov Exclusions",                       authority: "US GSA",                         jurisdiction: "United States" },
    { code: "us_fincen_special_measures", label: "US FinCEN — Section 311 Special Measures",    authority: "US Treasury — FinCEN",           jurisdiction: "United States" },
    // ---- Canada ----
    { code: "ca_dfatd_sema_sanctions",    label: "Canada — SEMA Consolidated",                  authority: "Global Affairs Canada",          jurisdiction: "Canada" },
    { code: "ca_listed_terrorists",       label: "Canada — Listed Terrorist Entities",          authority: "Public Safety Canada",           jurisdiction: "Canada" },
    // ---- Australia / New Zealand ----
    { code: "au_dfat_sanctions",          label: "Australia — DFAT Consolidated",               authority: "Australia DFAT",                 jurisdiction: "Australia" },
    { code: "nz_russia_sanctions",        label: "New Zealand — Russia Sanctions",              authority: "New Zealand MFAT",               jurisdiction: "New Zealand" },
    { code: "nz_designated_terrorists",   label: "New Zealand — Designated Terrorist Entities", authority: "New Zealand Police",             jurisdiction: "New Zealand" },
    // ---- Switzerland / France / Belgium ----
    { code: "ch_seco_sanctions",          label: "Switzerland — SECO Sanctions/Embargoes",      authority: "Swiss SECO",                     jurisdiction: "Switzerland" },
    { code: "fr_tresor_gels_avoir",       label: "France — National Asset Freezes",             authority: "Direction générale du Trésor",   jurisdiction: "France" },
    { code: "be_fod_sanctions",           label: "Belgium — Financial Sanctions",               authority: "Belgium FPS Finance",            jurisdiction: "Belgium" },
    // ---- Other Europe ----
    { code: "nl_terrorism_list",          label: "Netherlands — National Terrorism Sanctions",  authority: "Netherlands Ministry of Foreign Affairs", jurisdiction: "Netherlands" },
    { code: "pl_mswia_sanctions",         label: "Poland — MSWiA Sanctions List",               authority: "Poland Ministry of Interior",    jurisdiction: "Poland" },
    { code: "cz_national_sanctions",      label: "Czechia — National Sanctions List",           authority: "Czech Ministry of Foreign Affairs", jurisdiction: "Czechia" },
    { code: "ee_international_sanctions", label: "Estonia — International Sanctions",           authority: "Estonia FIU",                    jurisdiction: "Estonia" },
    { code: "lt_fiu_freezes",             label: "Lithuania — FIU Asset Freezes",               authority: "Lithuania FIU",                  jurisdiction: "Lithuania" },
    { code: "mc_fund_freezes",            label: "Monaco — National Fund Freezes",              authority: "Monaco Department of Budget & Treasury", jurisdiction: "Monaco" },
    { code: "ua_war_sanctions",           label: "Ukraine — War & Sanctions (NAZK)",            authority: "Ukraine NAZK",                   jurisdiction: "Ukraine" },
    // ---- Ukraine ----
    { code: "ua_nsdc_sanctions",          label: "Ukraine — NSDC State Register of Sanctions",  authority: "Ukraine NSDC",                   jurisdiction: "Ukraine" },
    { code: "ua_sfms_blacklist",          label: "Ukraine — SFMS Blacklist",                    authority: "Ukraine SFMS",                   jurisdiction: "Ukraine" },
    // ---- Middle East / Gulf ----
    { code: "ae_local_terrorists",        label: "UAE Local Terrorist List",                    authority: "UAE Cabinet",                    jurisdiction: "United Arab Emirates" },
    { code: "qa_nctc_sanctions",          label: "Qatar — Unified Sanctions List",              authority: "Qatar NCTC",                     jurisdiction: "Qatar" },
    { code: "il_mod_terrorists",          label: "Israel — Terrorist Organizations",            authority: "Israel Ministry of Defense",     jurisdiction: "Israel" },
    { code: "tr_fcib",                    label: "Türkiye — MASAK Asset Freezes",               authority: "Türkiye MASAK",                  jurisdiction: "Türkiye" },
    // ---- Asia ----
    { code: "jp_mof_sanctions",           label: "Japan — Economic Sanctions (MOF)",            authority: "Japan Ministry of Finance",      jurisdiction: "Japan" },
    { code: "sg_terrorists",              label: "Singapore — Targeted Financial Sanctions",    authority: "Monetary Authority of Singapore",jurisdiction: "Singapore" },
    { code: "in_mha_banned",              label: "India — MHA Banned Organizations",            authority: "India Ministry of Home Affairs", jurisdiction: "India" },
    { code: "pk_proscribed_persons",      label: "Pakistan — NACTA Proscribed Persons",         authority: "Pakistan NACTA",                 jurisdiction: "Pakistan" },
    { code: "my_moha_sanctions",          label: "Malaysia — MOHA Sanctions List",              authority: "Malaysia Home Affairs",          jurisdiction: "Malaysia" },
    { code: "id_dttot",                   label: "Indonesia — Suspected Terrorists (DTTOT)",    authority: "Indonesia PPATK",                jurisdiction: "Indonesia" },
    { code: "th_designated_person",       label: "Thailand — Designated Persons List",          authority: "Thailand AMLO",                  jurisdiction: "Thailand" },
    { code: "ph_amlc_sanctions",          label: "Philippines — AMLC Sanctions",                authority: "Philippines AMLC",               jurisdiction: "Philippines" },
    { code: "tw_shtc",                    label: "Taiwan — Strategic High-Tech Commodities Entities", authority: "Taiwan Board of Foreign Trade", jurisdiction: "Taiwan" },
    { code: "kz_afmrk_sanctions",         label: "Kazakhstan — AFM Terrorist Financing List",   authority: "Kazakhstan AFM",                 jurisdiction: "Kazakhstan" },
    { code: "az_fiu_sanctions",           label: "Azerbaijan — FIU Domestic List",              authority: "Azerbaijan FMS",                 jurisdiction: "Azerbaijan" },
    { code: "ng_nigsac_sanctions",        label: "Nigeria — NIGSAC Sanctions List",             authority: "Nigeria Sanctions Committee",    jurisdiction: "Nigeria" },
    // ---- Africa / Central Asia / Iran ----
    { code: "za_fic_sanctions",           label: "South Africa — Targeted Financial Sanctions", authority: "South Africa FIC",               jurisdiction: "South Africa" },
    { code: "kg_fiu_national",            label: "Kyrgyzstan — National List",                  authority: "Kyrgyzstan FIU",                 jurisdiction: "Kyrgyzstan" },
    { code: "ir_sanctions",               label: "Iran — Sanctions List",                       authority: "Iran",                           jurisdiction: "Iran" }
  ];

  /* ============================================================
     V2: dynamic list discovery from the OpenSanctions catalog
     ------------------------------------------------------------
     Instead of a fixed set, v2 reads the public data catalog and
     loads EVERY source list in the "Consolidated Sanctions"
     collection (100+ official lists), plus curated multilateral
     debarment / wanted watchlists when present. New lists that
     OpenSanctions adds are picked up automatically. The curated
     SANCTION_LISTS above remains the offline fallback and the
     source of nicer labels for lists it knows.
     ============================================================ */
  var CATALOG_URL = "https://data.opensanctions.org/datasets/latest/index.json";
  // Extra open watchlists beyond formal sanctions — only loaded when they
  // actually exist in the catalog (wrong/retired codes are skipped silently).
  var EXTRA_WATCHLISTS = ["worldbank_debarred", "adb_sanctions", "iadb_sanctions", "afdb_sanctions",
    "ebrd_ineligible", "eib_exclusions", "us_fincen_special_measures", "us_fbi_most_wanted", "interpol_red_notices",
    "eu_most_wanted", "gb_nca_most_wanted", "europol_most_wanted", "us_sam_exclusions", "us_hhs_exclusions",
    "us_trade_csl", "us_bis_entity", "ca_named_research_orgs", "gb_coh_disqualified"];
  var MAX_LIST_TARGETS = 160000;          // skip securities-scale datasets
  var MAX_CSV_BYTES = 30 * 1024 * 1024;   // skip files that would stall a browser

  function dsCount(d) {
    if (!d) return 0;
    if (typeof d.entity_count === "number") return d.entity_count;
    if (d.targets && typeof d.targets.total === "number") return d.targets.total;
    if (d.things && typeof d.things.total === "number") return d.things.total;
    return 0;
  }
  function dsCsvSize(d) {
    var res = (d && d.resources) || [];
    for (var i = 0; i < res.length; i++) {
      var nm = (res[i].name || res[i].path || res[i].url || "");
      if (/targets\.simple\.csv/.test(nm)) return res[i].size || 0;
    }
    return 0;
  }
  var curatedByCode = {};
  SANCTION_LISTS.forEach(function (l) { curatedByCode[l.code] = l; });

  var catalogCache = null;
  async function fetchCatalog() {
    if (catalogCache) return catalogCache;
    var got = await fetchText(CATALOG_URL, 45000);
    if (!got || !got.text) return null;
    try { var j = JSON.parse(got.text); if (j && j.datasets && j.datasets.length) { catalogCache = j; return j; } } catch (e) {}
    return null;
  }
  function catalogByName(cat) { var m = {}; (cat.datasets || []).forEach(function (d) { if (d && d.name) m[d.name] = d; }); return m; }
  function defFromCatalog(name, d) {
    var cur = curatedByCode[name];
    return {
      code: name,
      label: (cur && cur.label) || (d && d.title) || name,
      authority: (cur && cur.authority) || (d && d.publisher && d.publisher.name) || "",
      jurisdiction: (cur && cur.jurisdiction) || (d && d.publisher && (d.publisher.country_label || d.publisher.country)) || ""
    };
  }
  async function discoverLists() {
    try {
      var cat = await fetchCatalog();
      if (!cat) return null;
      var byName = catalogByName(cat);
      var col = byName["sanctions"];
      var members = (col && (col.datasets || col.scopes || col.children)) || [];
      var names = [], seenN = {};
      members.forEach(function (n) { if (n && !seenN[n]) { seenN[n] = 1; names.push(n); } });
      EXTRA_WATCHLISTS.forEach(function (n) { if (byName[n] && !seenN[n]) { seenN[n] = 1; names.push(n); } });
      var out = [];
      names.forEach(function (n) {
        var d = byName[n];
        if (!d) return;
        if (d.type === "collection") return;
        if (/_isin|securit|crypto/.test(n)) return;                 // securities/crypto IDs, not names
        if (dsCount(d) > MAX_LIST_TARGETS) return;
        if (dsCsvSize(d) > MAX_CSV_BYTES) return;
        out.push(defFromCatalog(n, d));
      });
      return out.length >= 25 ? out : null;   // sanity floor before trusting discovery
    } catch (e) { return null; }
  }
  // bounded-concurrency loader — 100+ lists must not all fire at once
  async function loadAllLists(lists) {
    var results = new Array(lists.length), next = 0;
    progAdd(lists.length);
    async function worker() {
      while (next < lists.length) {
        var i = next++;
        try { results[i] = await loadList(lists[i]); }
        catch (e) { results[i] = { code: lists[i].code, label: lists[i].label, authority: lists[i].authority, jurisdiction: lists[i].jurisdiction, loaded: false, count: 0, asOf: null }; }
        progTick();
      }
    }
    var pool = []; for (var w = 0; w < 6; w++) pool.push(worker());
    await Promise.all(pool);
    return results;
  }

  /* ============================================================
     V2: PEP list index — national PEP registers via OpenSanctions
     ------------------------------------------------------------
     Downloads every source list in the OpenSanctions "peps"
     collection that is browser-sized (national parliament &
     government registers, CIA World Leaders, RuPEP, …) and indexes
     them locally with the same layered fuzzy matcher used for
     sanctions. Wikidata remains the live second source (position
     detail + RCA family/associate graph). wd_peps itself is
     excluded — it is the Wikidata-derived bulk file, too large to
     download; we query Wikidata live instead.
     ============================================================ */
  var pepIdx = [], pepExact = new Map(), pepToken = new Map(), pepPhon = new Map();
  var pMeta = { loaded: false, tried: false, count: 0, lists: [] };
  var PEP_FALLBACK = [
    { code: "us_cia_world_leaders", label: "CIA World Leaders", authority: "US CIA", jurisdiction: "Global" },
    { code: "everypolitician", label: "EveryPolitician", authority: "mySociety", jurisdiction: "Global" },
    { code: "ru_rupep", label: "RuPEP Public Officials", authority: "RuPEP", jurisdiction: "Russia / CIS" }
  ];
  function addPepEntry(rawName, display, list, country) {
    var n = norm(rawName); if (!n || n.length < 4) return;
    if (pepExact.has(n)) {
      var ent = pepIdx[pepExact.get(n)];
      if (ent.lists.indexOf(list.label) < 0 && ent.lists.length < 6) ent.lists.push(list.label);
      if (country && !ent.country) ent.country = country;
      return;
    }
    var i = pepIdx.length;
    pepIdx.push({ n: n, name: display, lists: [list.label], country: country || "" });
    pepExact.set(n, i);
    var toks = n.split(" ");
    for (var k = 0; k < toks.length; k++) {
      var t = toks[k]; if (t.length < 3) continue;
      var a = pepToken.get(t); if (!a) { a = []; pepToken.set(t, a); }
      if (a.length < 900) a.push(i);
      var sx = soundex(t); if (sx) { var b = pepPhon.get(sx); if (!b) { b = []; pepPhon.set(sx, b); } if (b.length < 700) b.push(i); }
    }
  }
  async function loadPepList(list) {
    var base = { code: list.code, label: list.label, loaded: false, count: 0 };
    var got = await fetchText(OS_BASE + list.code + "/targets.simple.csv");
    if (!got || !got.text) return base;
    var rows = parseCSV(got.text); if (rows.length < 2) return base;
    var h = rows[0].map(function (x) { return (x || "").toLowerCase().trim(); });
    function col() { for (var k = 0; k < arguments.length; k++) { var j = h.indexOf(arguments[k]); if (j > -1) return j; } return -1; }
    var iName = col("name", "caption"), iAlias = col("aliases", "alias"), iCountry = col("countries", "country"), iSchema = col("schema");
    if (iName < 0) return base;
    var count = 0;
    for (var i = 1; i < rows.length; i++) {
      var row = rows[i]; if (!row || iName >= row.length) continue;
      if (iSchema > -1 && row[iSchema] && row[iSchema] !== "Person") continue;   // PEPs are natural persons
      var nm = (row[iName] || "").trim(); if (!nm) continue;
      var country = iCountry > -1 ? (row[iCountry] || "").trim() : "";
      addPepEntry(nm, nm, list, country); count++;
      if (iAlias > -1 && row[iAlias]) {
        var als = row[iAlias].split(";");
        for (var z = 0; z < als.length; z++) { var al = als[z].trim(); if (al.length > 3) addPepEntry(al, nm, list, country); }
      }
    }
    base.loaded = count > 0; base.count = count;
    return base;
  }
  async function discoverPepLists() {
    try {
      var cat = await fetchCatalog(); if (!cat) return null;
      var byName = catalogByName(cat);
      var col = byName["peps"];
      var members = (col && (col.datasets || col.scopes || col.children)) || [];
      var out = [];
      members.forEach(function (n) {
        var d = byName[n]; if (!d || d.type === "collection") return;
        if (n === "wd_peps") return;                        // bulk Wikidata PEPs — queried live instead
        if (dsCount(d) > 60000) return;
        if (dsCsvSize(d) > 15 * 1024 * 1024) return;
        out.push({ code: n, label: (d.title || n), authority: (d.publisher && d.publisher.name) || "", jurisdiction: (d.publisher && (d.publisher.country_label || d.publisher.country)) || "" });
      });
      return out.length >= 3 ? out : null;
    } catch (e) { return null; }
  }
  var pepJobPromise = null;
  /* ============================================================
     V3 FAST PATH — server-side prebuilt index
     ------------------------------------------------------------
     At deploy time the OpenSanctions sanctions, PEP, crime/wanted/
     regulatory and debarment collections are downloaded ONCE and
     indexed on the server (scripts/build.mjs). The browser fetches a
     small metadata file and asks /api/screen for matches — no more
     downloading ~100 lists on first load. If the API is unreachable
     the original in-browser download path below is used instead.
     ============================================================ */
  var SERVER = { on: false, meta: null, ds: {} };
  var srvCache = new Map();          // norm(name) -> server result | {error:true}
  async function loadServerMeta() {
    try {
      var r = await withTimeout(fetch("/data/meta.json", { headers: { "Accept": "application/json" } }), 8000);
      if (!r.ok) return false;
      var m = await r.json();
      if (!m || !m.datasets || !m.entities) return false;
      m.datasets.forEach(function (d) { SERVER.ds[d.code] = d; });
      var all = m.datasets.filter(function (d) { return d.count > 0; }).map(function (d) {
        var t = d.lastChange ? Date.parse(d.lastChange) : NaN;
        return { label: d.title, code: d.code, authority: d.publisher, jurisdiction: d.country, count: d.count, asOf: isNaN(t) ? null : t, kind: d.kind };
      }).sort(function (a, b) { return b.count - a.count; });
      var sanc = all.filter(function (l) { return l.kind === "Sanctions"; });
      var peps = all.filter(function (l) { return l.kind === "PEP register"; });
      var other = all.length - sanc.length - peps.length;
      var asOf = Date.parse(m.asOf); if (isNaN(asOf)) asOf = Date.now();
      sMeta = {
        loaded: true, server: true, count: m.entities,
        designations: sanc.reduce(function (a, l) { return a + l.count; }, 0),
        asOf: asOf,
        source: "OpenSanctions prebuilt index · " + sanc.length + " sanctions lists, " + peps.length + " PEP registers, " + other + " crime / wanted / regulatory / debarment lists",
        tried: true, loading: false, lists: sanc, allLists: all, failed: [],
        retrievedAt: Date.now(), version: m.builtAt
      };
      pMeta = { loaded: true, tried: true, server: true, count: peps.reduce(function (a, l) { return a + l.count; }, 0), lists: peps };
      SERVER.meta = m; SERVER.on = true;
      window.Sources.plannedLists = all.length;
      return true;
    } catch (e) { return false; }
  }
  async function screenBatch(batch) {
    for (var attempt = 0; attempt < 3; attempt++) {
      try {
        var r = await withTimeout(fetch("/api/screen", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ names: batch }) }), 25000);
        if (r.ok) {
          var j = await r.json();
          (j.results || []).forEach(function (x) { srvCache.set(norm(x.name), x); });
          break;
        }
        if (r.status !== 429 && r.status < 500) break;
      } catch (e) {}
      await sleep(700 * (attempt + 1));
    }
    batch.forEach(function (n) { var q = norm(n); if (!srvCache.has(q)) srvCache.set(q, { error: true }); });
  }
  // Screen many names against the server index in batches (fills srvCache).
  async function prefetch(names, onProgress) {
    if (!SERVER.on) return;
    var todo = [], seen = {};
    (names || []).forEach(function (n) {
      n = (n || "").toString().slice(0, 300); var q = norm(n);
      if (q && !seen[q] && !(srvCache.has(q) && !srvCache.get(q).error)) { seen[q] = 1; todo.push(n); }
    });
    if (!todo.length) return;
    var batches = [], B = 50, next = 0, done = 0;
    for (var i = 0; i < todo.length; i += B) batches.push(todo.slice(i, i + B));
    async function w() {
      while (next < batches.length) {
        var b = batches[next++];
        await screenBatch(b);
        done += b.length;
        if (onProgress) try { onProgress(done, todo.length); } catch (e) {}
      }
    }
    await Promise.all([w(), w(), w()]);
  }
  function srvGet(name) { return srvCache.get(norm((name || "").toString().slice(0, 300))); }
  function dsInfo(codes, kinds) {
    var ds = (codes || []).map(function (c) { return SERVER.ds[c] || { code: c, title: c, publisher: "", country: "", kind: "Watchlist" }; });
    if (kinds) { var f = ds.filter(function (d) { return kinds.indexOf(d.kind) > -1; }); if (f.length) ds = f; }
    function uniq(a) { return a.filter(function (x, i) { return x && a.indexOf(x) === i; }); }
    return {
      labels: uniq(ds.map(function (d) { return d.title; })),
      authorities: uniq(ds.map(function (d) { return d.publisher; })),
      jurisdictions: uniq(ds.map(function (d) { return d.country; })),
      kinds: uniq(ds.map(function (d) { return d.kind; }))
    };
  }
  function srvSanctions(name, searchUrl) {
    var sr = srvGet(name);
    if (!sr || sr.error) return { status: "unavailable", url: searchUrl };
    var s = sr.sanctions;
    if (!s) return { status: "clear", url: searchUrl, asOf: sMeta.asOf };
    var li = dsInfo(s.datasets, ["Sanctions"]);
    return {
      status: s.status, list: li.labels[0] || "", lists: li.labels,
      authority: li.authorities.slice(0, 4).join("; "), jurisdiction: li.jurisdictions.slice(0, 6).join("; "),
      program: s.programs, score: s.score, matchType: s.matchType, matched: s.matched, matchedNorm: s.matchedNorm,
      caption: s.caption, schema: s.schema, dob: s.dob, countries: s.countries, others: s.others,
      entityId: s.id, url: s.url, searchUrl: searchUrl, asOf: sMeta.asOf
    };
  }
  // Crime, wanted, terrorism, regulatory-enforcement & debarment lists.
  function watchlist(name) {
    var search = "https://www.opensanctions.org/search/?q=" + encodeURIComponent(name);
    if (!SERVER.on) return { status: "unavailable", url: search };
    var sr = srvGet(name);
    if (!sr || sr.error) return { status: "unavailable", url: search };
    var c = sr.crime, d = sr.debarment;
    var best = c && (!d || c.score >= d.score) ? c : d;
    if (!best) return { status: "clear", url: search, asOf: sMeta.asOf };
    var li = dsInfo(best.datasets, ["Wanted / law enforcement", "Crime / terrorism", "Regulatory enforcement", "Debarment / exclusion", "Watchlist"]);
    return {
      status: best.status, kinds: li.kinds, lists: li.labels, list: li.labels[0] || "",
      authority: li.authorities.slice(0, 4).join("; "), jurisdiction: li.jurisdictions.slice(0, 6).join("; "),
      matched: best.matched, caption: best.caption, score: best.score, matchType: best.matchType,
      program: best.programs, dob: best.dob, countries: best.countries, schema: best.schema,
      others: best.others, entityId: best.id, url: best.url, searchUrl: search, asOf: sMeta.asOf
    };
  }

  function ensurePeps() {
    if (SERVER.on) return Promise.resolve(pMeta);
    if (pepJobPromise) return pepJobPromise;
    pepJobPromise = (async function () {
      var lists = null;
      try { lists = await discoverPepLists(); } catch (e) {}
      if (!lists || !lists.length) lists = PEP_FALLBACK;
      progAdd(lists.length);
      var res = new Array(lists.length), next = 0;
      async function w() { while (next < lists.length) { var i = next++; try { res[i] = await loadPepList(lists[i]); } catch (e) { res[i] = { loaded: false }; } progTick(); } }
      try { await Promise.all([w(), w(), w(), w()]); } catch (e) {}
      var ok = (res || []).filter(function (r) { return r && r.loaded; });
      pMeta = { loaded: pepIdx.length > 0, tried: true, count: pepIdx.length,
        lists: ok.map(function (r) { return { code: r.code, label: r.label, count: r.count }; }).sort(function (a, b) { return b.count - a.count; }) };
      return pMeta;
    })();
    return pepJobPromise;
  }
  // Local PEP-list lookup — same layered fuzzy matcher as sanctions. Strict:
  // person names are noisy, so single-word queries only match exactly and the
  // fuzzy floor is the auto-confirm band (>= 0.92).
  function pepLocalLookup(name) {
    if (SERVER.on) {
      var sr = srvGet(name);
      if (!sr || sr.error || !sr.pep) return null;
      var pi = dsInfo(sr.pep.datasets, ["PEP register"]);
      return { score: sr.pep.score, matched: sr.pep.matched, lists: pi.labels, country: sr.pep.countries, url: sr.pep.url, dob: sr.pep.dob };
    }
    if (!pMeta.loaded) return null;
    var q = norm(name); if (!q) return null;
    if (pepExact.has(q)) { var e0 = pepIdx[pepExact.get(q)]; return { score: 1, matched: e0.name, lists: e0.lists, country: e0.country }; }
    var toks = q.split(" ").filter(function (t) { return t.length > 1; });
    if (toks.length < 2) return null;
    var cand = new Set();
    for (var i = 0; i < toks.length; i++) {
      var a = pepToken.get(toks[i]); if (a) for (var k = 0; k < a.length; k++) cand.add(a[k]);
      var sx = soundex(toks[i]); var b = sx ? pepPhon.get(sx) : null;
      if (b) for (var m = 0; m < b.length; m++) cand.add(b[m]);
    }
    var best = null;
    cand.forEach(function (ix) { var sc = nameScore(q, pepIdx[ix].n); if (!best || sc > best.score) best = { score: sc, ix: ix }; });
    if (!best || best.score < 0.92) return null;
    var e = pepIdx[best.ix];
    return { score: best.score, matched: e.name, lists: e.lists, country: e.country };
  }

  var index = [];                 // {n, name, source, lists[], listCodes[], authority, jurisdiction, programs, type, country}
  var exactMap = new Map();       // normalized name -> index position (also the dedup key)
  var tokenMap = new Map();       // exact token -> entry indices
  var phonMap = new Map();        // soundex token -> entry indices (phonetic recall)
  var sMeta = { loaded: false, count: 0, asOf: null, source: null, tried: false, loading: false, lists: [], retrievedAt: null };

  // Add a name (primary or alias) under a given list. Entries are DEDUPED by
  // normalized name: when the same name appears across lists, we keep one entry
  // and accumulate every list it appears on — so a match can show "also on EU,
  // UK, UN" instead of N near-duplicate rows.
  function addEntry(rawName, display, list, program, schema, country) {
    var n = norm(rawName); if (!n || n.length < 2) return;
    if (exactMap.has(n)) {
      var ent = index[exactMap.get(n)];
      if (ent.listCodes.indexOf(list.code) < 0) { ent.listCodes.push(list.code); ent.lists.push(list.label); }
      if (program && ent.programs.indexOf(program) < 0) ent.programs = ent.programs ? (ent.programs + "; " + program) : program;
      if (country && !ent.country) ent.country = country;
      return;
    }
    var i = index.length;
    index.push({ n: n, name: display, source: list.label, lists: [list.label], listCodes: [list.code],
      authority: list.authority, jurisdiction: list.jurisdiction, programs: program || "", type: schema || "", country: country || "" });
    exactMap.set(n, i);
    var toks = n.split(" ");
    for (var k = 0; k < toks.length; k++) {
      var t = toks[k]; if (t.length < 3) continue;
      var a = tokenMap.get(t); if (!a) { a = []; tokenMap.set(t, a); }
      if (a.length < 1200) a.push(i);
      var sx = soundex(t); if (sx) { var b = phonMap.get(sx); if (!b) { b = []; phonMap.set(sx, b); } if (b.length < 1000) b.push(i); }
    }
  }

  // RFC-4180-ish CSV parser: handles quoted fields, escaped "" quotes, and
  // embedded commas/newlines inside quotes (addresses often contain them).
  function parseCSV(text) {
    var rows = [], row = [], field = "", inQ = false, i = 0, n = text.length, c;
    for (; i < n; i++) {
      c = text[i];
      if (inQ) {
        if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
        else field += c;
      } else {
        if (c === '"') inQ = true;
        else if (c === ',') { row.push(field); field = ""; }
        else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ""; }
        else if (c === '\r') { /* ignore CR */ }
        else field += c;
      }
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  /* ---------- V2.3: local cache for downloaded lists (12h TTL) ----------
     The 90+ sanctions CSVs + 100+ PEP registers only change daily; caching
     them via the Cache API makes every load after the first near-instant.
     Falls back silently to network-only where the Cache API is unavailable. */
  var CSV_CACHE = "cs-v2-lists", CACHE_TTL = 12 * 3600 * 1000;
  async function cacheGet(url) {
    try {
      if (typeof caches === "undefined") return null;
      var c = await caches.open(CSV_CACHE);
      var r = await c.match(url);
      if (!r) return null;
      var ts = +(r.headers.get("x-cached-at") || 0);
      if (!ts || Date.now() - ts > CACHE_TTL) { c.delete(url); return null; }
      return { text: await r.text(), lastMod: r.headers.get("x-orig-lastmod") || null, cached: true };
    } catch (e) { return null; }
  }
  async function cachePut(url, text, lastMod) {
    try {
      if (typeof caches === "undefined") return;
      var c = await caches.open(CSV_CACHE);
      await c.put(url, new Response(text, { headers: { "x-cached-at": "" + Date.now(), "x-orig-lastmod": lastMod || "" } }));
    } catch (e) {}
  }

  // download-progress reporting (drives the UI progress bar)
  var dlProg = { done: 0, total: 0 };
  function progAdd(n) { dlProg.total += n; progPing(); }
  function progTick() { dlProg.done++; progPing(); }
  function progPing() {
    try { if (window.Sources && window.Sources.onProgress) window.Sources.onProgress(dlProg.done, dlProg.total); } catch (e) {}
  }

  // Fetch text directly (the CDN is CORS-enabled), falling back to a public
  // CORS proxy only if the direct request is blocked in a given environment.
  async function fetchText(url, ms) {
    var hit = await cacheGet(url);
    if (hit) return hit;
    try {
      var r = await withTimeout(fetch(url, { headers: { "Accept": "text/csv" } }), ms || 30000);
      if (r.ok) {
        var text = await r.text();
        var lastMod = r.headers.get("Last-Modified") || r.headers.get("Date");
        cachePut(url, text, lastMod);
        return { text: text, lastMod: lastMod };
      }
    } catch (e) {}
    try {
      // SECURITY: same-origin, allowlisted proxy (api/fetch.js) instead of a public
      // third-party CORS proxy that could read or tamper with the data.
      var r2 = await withTimeout(fetch("/api/fetch?url=" + encodeURIComponent(url)), ms || 30000);
      if (r2.ok) { var t2 = await r2.text(); cachePut(url, t2, null); return { text: t2, lastMod: null }; }
    } catch (e2) {}
    return null;
  }

  // Download + parse one list's simplified CSV into the shared index.
  async function loadList(list) {
    var base = { code: list.code, label: list.label, authority: list.authority, jurisdiction: list.jurisdiction, loaded: false, count: 0, asOf: null };
    var got = await fetchText(OS_BASE + list.code + "/targets.simple.csv");
    if (!got || !got.text) return base;
    var rows = parseCSV(got.text);
    if (rows.length < 2) return base;
    var h = rows[0].map(function (x) { return (x || "").toLowerCase().trim(); });
    function col() { for (var k = 0; k < arguments.length; k++) { var j = h.indexOf(arguments[k]); if (j > -1) return j; } return -1; }
    var ci = { name: col("name", "caption"), alias: col("aliases", "alias"), schema: col("schema"),
      prog: col("sanctions", "program_ids", "programs"), country: col("countries", "country"), chg: col("last_change", "last_seen") };
    if (ci.name < 0) return base;
    var count = 0, maxTs = 0;
    for (var i = 1; i < rows.length; i++) {
      var row = rows[i]; if (!row || ci.name >= row.length) continue;
      var nm = (row[ci.name] || "").trim(); if (!nm) continue;
      var prog = ci.prog > -1 ? (row[ci.prog] || "").trim() : "";
      var schema = ci.schema > -1 ? (row[ci.schema] || "").trim() : "";
      var country = ci.country > -1 ? (row[ci.country] || "").trim() : "";
      addEntry(nm, nm, list, prog, schema, country); count++;
      if (ci.alias > -1 && row[ci.alias]) {
        var als = row[ci.alias].split(";");
        for (var z = 0; z < als.length; z++) { var al = als[z].trim(); if (al && al.length > 1) addEntry(al, nm, list, prog, schema, country); }
      }
      if (ci.chg > -1 && row[ci.chg]) { var t = Date.parse(row[ci.chg]); if (!isNaN(t) && t > maxTs) maxTs = t; }
    }
    base.loaded = count > 0; base.count = count;
    base.asOf = maxTs || (got.lastMod ? Date.parse(got.lastMod) : Date.now());
    if (isNaN(base.asOf)) base.asOf = Date.now();
    return base;
  }

  // Last-resort fallback: the legacy US trade.gov Consolidated Screening List.
  async function loadTradeCSL() {
    var listDef = { code: "us_trade_csl", label: "US Consolidated Screening List", authority: "US Govt (OFAC / BIS / State)", jurisdiction: "United States" };
    var r = await withTimeout(fetch(CSL_URL, { headers: { "Accept": "application/json" } }), 30000);
    if (!r.ok) throw new Error("HTTP " + r.status);
    var lastMod = r.headers.get("Last-Modified") || r.headers.get("Date");
    var data = await r.json(), rows = data.results || [], count = 0;
    for (var i = 0; i < rows.length; i++) {
      var e = rows[i], prog = (e.programs || []).join(", ");
      if (e.name) { addEntry(e.name, e.name, listDef, prog, e.type || "", ""); count++; }
      var alts = e.alt_names || [];
      for (var j = 0; j < alts.length; j++) if (alts[j]) addEntry(alts[j], e.name, listDef, prog, e.type || "", "");
    }
    var asOf = lastMod ? Date.parse(lastMod) : Date.now(); if (isNaN(asOf)) asOf = Date.now();
    return { code: listDef.code, label: listDef.label, authority: listDef.authority, jurisdiction: listDef.jurisdiction, loaded: count > 0, count: count, asOf: asOf };
  }

  async function ensureSanctions() {
    if (sMeta.loaded || sMeta.tried) return sMeta;
    if (await loadServerMeta()) return sMeta;      // fast path: prebuilt server index
    sMeta.tried = true; sMeta.loading = true;
    var pepJob = ensurePeps();                       // PEP registers load in parallel
    var lists = null;
    try { lists = await discoverLists(); } catch (e) {}
    if (!lists || !lists.length) lists = SANCTION_LISTS;
    window.Sources.plannedLists = lists.length;
    var results;
    try { results = await loadAllLists(lists); }
    catch (e) { results = []; }
    var ok = results.filter(function (r) { return r && r.loaded && r.count > 0; });
    if (!ok.length) {
      // every official list failed to download — fall back to the legacy US feed
      try { var leg = await loadTradeCSL(); if (leg && leg.loaded) ok.push(leg); } catch (e) {}
    }
    var maxAsOf = 0, totalDesig = 0;
    ok.forEach(function (r) { totalDesig += r.count; if (r.asOf && r.asOf > maxAsOf) maxAsOf = r.asOf; });
    var lists = ok.map(function (r) {
      return { label: r.label, code: r.code, authority: r.authority, jurisdiction: r.jurisdiction, count: r.count, asOf: r.asOf };
    }).sort(function (a, b) { return b.count - a.count; });
    var failed = (results || []).filter(function (r) { return r && !r.loaded; }).map(function (r) { return r.label; });
    sMeta = {
      loaded: index.length > 0,
      count: index.length,               // unique names+aliases indexed
      designations: totalDesig,          // distinct list designations loaded
      asOf: maxAsOf || Date.now(),
      source: "OpenSanctions \u00b7 " + lists.length + " official sanctions list" + (lists.length === 1 ? "" : "s"),
      tried: true, loading: false,
      lists: lists, failed: failed,
      retrievedAt: Date.now(),
      version: new Date(maxAsOf || Date.now()).toISOString()
    };
    try { await pepJob; } catch (e) {}               // PEP index ready before screening starts
    return sMeta;
  }

  function sanctions(name) {
    var ofac = "https://www.opensanctions.org/search/?q=" + encodeURIComponent(name);
    if (SERVER.on) return srvSanctions(name, ofac);
    if (!sMeta.loaded) return { status: "unavailable", url: ofac };
    var q = norm(name);
    if (exactMap.has(q)) { var e0 = index[exactMap.get(q)]; return { status: "hit", list: e0.source, lists: e0.lists, authority: e0.authority, jurisdiction: e0.jurisdiction, program: e0.programs, score: 1, matchType: "exact", matched: e0.name, url: ofac, asOf: sMeta.asOf }; }
    // candidate recall: exact tokens + phonetic (soundex) tokens
    var cand = new Set(), toks = q.split(" ");
    for (var i = 0; i < toks.length; i++) {
      var a = tokenMap.get(toks[i]); if (a) for (var k = 0; k < a.length; k++) cand.add(a[k]);
      var sx = soundex(toks[i]); var b = sx ? phonMap.get(sx) : null;
      if (b) for (var m = 0; m < b.length; m++) cand.add(b[m]);
    }
    var best = null;
    cand.forEach(function (idx) { var ex = nameScoreEx(q, index[idx].n); if (!best || ex.score > best.sc) best = { idx: idx, sc: ex.score, type: ex.type }; });
    // GENERIC SINGLE-WORD GUARD (data-driven). When the query's only distinctive
    // word is one that appears across MANY sanctioned names (e.g. "global",
    // "trading", "national", "international"), a lone shared-word match is weak and
    // must not stand as a hit — that is how "S&P Global Inc" was matching "Global
    // Star". A distinctive single word (e.g. "Rosneft", few index entries) is left
    // untouched, so genuine one-word entities still match.
    var qTok = q.split(" ").filter(function (t) { return t.length > 2; });
    if (best && qTok.length === 1 && index[best.idx].n !== q) {
      var freq = (tokenMap.get(qTok[0]) || []).length;
      if (freq >= 30) best.sc *= 0.55;   // common word, not a full-name match
    }
    // threshold band: >=0.92 = match; 0.84–0.92 = possible (needs review)
    if (best && best.sc >= 0.84) {
      var e = index[best.idx];
      return {
        status: best.sc >= 0.92 ? "hit" : "possible",
        list: e.source, lists: e.lists, authority: e.authority, jurisdiction: e.jurisdiction,
        program: e.programs, score: best.sc, matchType: best.type,
        matched: e.name, matchedNorm: e.n, url: ofac, asOf: sMeta.asOf
      };
    }
    return { status: "clear", url: ofac, asOf: sMeta.asOf };
  }

  /* ---------- PEP: Wikidata (direct office-holder + RCA) ----------
     RCA = Relatives & Close Associates. FATF requires that family
     members and close associates of a PEP get the same enhanced
     scrutiny as the PEP. If the searched person isn't a direct PEP,
     we walk their Wikidata relationship graph and flag them when a
     relative or associate holds (or held) political office. */
  var PEP_HINT = /(president|prime minister|minister|senator|governor|parliament|congress|deputy|ambassador|mayor|chancellor|secretary of|head of state|member of|judge|justice|general|admiral|monarch|king|queen|sultan|emir|premier|legislator|diplomat|central bank|politician)/i;

  // Wikidata relationship properties -> human label (P-ID : how they relate).
  // Ordered so the closest kin surface first.
  var REL_PROPS = {
    P22: "father", P25: "mother", P26: "spouse", P40: "child",
    P3373: "sibling", P1038: "relative", P1290: "godparent",
    P451: "partner", P1327: "business associate", P3342: "close associate"
  };

  // first position QID from a claims object
  function firstPosQid(claims) {
    var positions = (claims && claims.P39) || [];
    for (var i = 0; i < positions.length; i++) {
      var dv = positions[i].mainsnak && positions[i].mainsnak.datavalue;
      if (dv && dv.value && dv.value.id) return dv.value.id;
    }
    return null;
  }

  // Kinship property IDs we traverse
  var P_PARENT = ["P22", "P25"], P_CHILD = "P40", P_SIB = "P3373", P_SPOUSE = "P26";
  // Compose a hop-2 relationship label from the subject's point of view.
  // prop1 = how hop-1 relates to subject; prop2 = how hop-2 relates to hop-1.
  function composeRel(prop1, prop2) {
    var p1Parent = P_PARENT.indexOf(prop1) > -1, p2Parent = P_PARENT.indexOf(prop2) > -1;
    if (p1Parent) {
      if (p2Parent) return "grandparent";
      if (prop2 === P_SIB) return "aunt / uncle";
      if (prop2 === P_SPOUSE) return "step-parent";
    } else if (prop1 === P_CHILD) {
      if (prop2 === P_CHILD) return "grandchild";
      if (prop2 === P_SPOUSE) return "child-in-law";
    } else if (prop1 === P_SIB) {
      if (prop2 === P_CHILD) return "niece / nephew";
    } else if (prop1 === P_SPOUSE) {
      if (p2Parent) return "parent-in-law";
      if (prop2 === P_SIB) return "sibling-in-law";
    }
    return null;   // skip distant/ambiguous links to avoid noise
  }
  // pull {qid, prop} relatives out of an entity's claims for the given properties
  function relativesFromClaims(claims, props) {
    var out = [];
    props.forEach(function (p) {
      var arr = (claims && claims[p]) || [];
      for (var k = 0; k < arr.length; k++) {
        var dv = arr[k].mainsnak && arr[k].mainsnak.datavalue;
        if (dv && dv.value && dv.value.id) out.push({ qid: dv.value.id, prop: p });
      }
    });
    return out;
  }
  async function getEntities(ids) {
    if (!ids.length) return {};
    var batches = [], i;
    for (i = 0; i < ids.length; i += 45) batches.push(ids.slice(i, i + 45));
    var merged = {};
    for (i = 0; i < batches.length; i++) {
      try {
        var r = await fetchJson("https://www.wikidata.org/w/api.php?action=wbgetentities&ids=" + batches[i].join("|") + "&props=labels|descriptions|claims&languages=en&format=json&origin=*", 12000, 2);
        if (r && r.entities) Object.keys(r.entities).forEach(function (q) { merged[q] = r.entities[q]; });
      } catch (e) {}
    }
    return merged;
  }
  function labelOf(ent) { return ent && ent.labels && ent.labels.en ? ent.labels.en.value : null; }
  function holdsOffice(ent) { return !!(ent && ent.claims && ent.claims.P39 && ent.claims.P39.length); }

  async function wikidataPep(name) {
    try {
      var s = await fetchJson("https://www.wikidata.org/w/api.php?action=wbsearchentities&search=" + encodeURIComponent(name) + "&language=en&format=json&origin=*&limit=1&type=item", 9000, 3);
      if (!s.search || !s.search.length) return { status: "clear" };
      var hit = s.search[0], desc = hit.description || "";
      var wdUrl = "https://www.wikidata.org/wiki/" + hit.id;

      // 1) direct PEP check — tiny P39-only payload, fast even for famous entities
      var c = await fetchJson("https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=" + hit.id + "&property=P39&format=json&origin=*", 9000, 3);
      var positions = (c.claims && c.claims.P39) || [];
      if (positions.length || PEP_HINT.test(desc)) {
        var posQid = firstPosQid(c.claims || {});
        var positionLabel = desc || "Public office-holder";
        if (posQid) {
          try {
            var l = await fetchJson("https://www.wikidata.org/w/api.php?action=wbgetentities&ids=" + posQid + "&props=labels&languages=en&format=json&origin=*", 6000, 2);
            var lab = l.entities[posQid] && l.entities[posQid].labels && l.entities[posQid].labels.en;
            if (lab) positionLabel = lab.value;
          } catch (e2) {}
        }
        return { status: "hit", position: positionLabel, detail: desc, url: wdUrl };
      }

      // 2) not a direct PEP — walk the family / associate graph TWO hops deep so
      //    "son of a PEP", "granddaughter of a PEP", "niece of a PEP" etc. are caught.
      var ALL_REL = Object.keys(REL_PROPS);                  // hop-1 properties
      var all = await fetchJson("https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=" + hit.id + "&format=json&origin=*", 9000, 2);
      var claims = (all && all.claims) || {};
      var seen = {}; seen[hit.id] = 1;
      var hop1 = [];     // {qid, relation, prop}
      ALL_REL.forEach(function (p) {
        var arr = claims[p] || [];
        for (var k = 0; k < arr.length && hop1.length < 16; k++) {
          var dv = arr[k].mainsnak && arr[k].mainsnak.datavalue;
          if (dv && dv.value && dv.value.id && !seen[dv.value.id]) { seen[dv.value.id] = 1; hop1.push({ qid: dv.value.id, relation: REL_PROPS[p], prop: p }); }
        }
      });
      if (!hop1.length) return { status: "clear", url: wdUrl };

      // fetch hop-1 entities (labels + claims) — flags direct PEPs AND lets us reach hop-2
      var hop1Ent = await getEntities(hop1.map(function (r) { return r.qid; }));
      var flagged = [];   // {qid, relation, posQid}
      var hop2 = [];      // {qid, relation, prop}
      var HOP2_PROPS = [P_PARENT[0], P_PARENT[1], P_CHILD, P_SIB, P_SPOUSE];
      hop1.forEach(function (r) {
        var e = hop1Ent[r.qid];
        if (holdsOffice(e)) flagged.push({ qid: r.qid, relation: r.relation, posQid: firstPosQid(e.claims) });
        // expand to hop-2 only along kinship lines that compose to a clear label
        if (e && e.claims) {
          relativesFromClaims(e.claims, HOP2_PROPS).forEach(function (g) {
            if (seen[g.qid] || hop2.length >= 30) return;
            var label = composeRel(r.prop, g.prop);
            if (!label) return;
            seen[g.qid] = 1; hop2.push({ qid: g.qid, relation: label, prop: g.prop });
          });
        }
      });

      // fetch hop-2 entities and flag any that hold office
      if (hop2.length) {
        var hop2Ent = await getEntities(hop2.map(function (r) { return r.qid; }));
        hop2.forEach(function (r) {
          var e = hop2Ent[r.qid];
          if (holdsOffice(e)) flagged.push({ qid: r.qid, relation: r.relation, posQid: firstPosQid(e.claims), ent: e });
        });
      }
      if (!flagged.length) return { status: "clear", url: wdUrl };

      // resolve names (from already-fetched entities) + position labels (one batch)
      var allEnt = hop1Ent;   // names for hop-1; hop-2 names captured below
      var posQids = [];
      flagged.forEach(function (f) { if (f.posQid) posQids.push(f.posQid); });
      var posLabels = {};
      var uniq = posQids.filter(function (v, i) { return posQids.indexOf(v) === i; });
      if (uniq.length) {
        try {
          var pl = await fetchJson("https://www.wikidata.org/w/api.php?action=wbgetentities&ids=" + uniq.join("|") + "&props=labels&languages=en&format=json&origin=*", 9000, 2);
          var pe = (pl && pl.entities) || {};
          Object.keys(pe).forEach(function (q) { if (pe[q].labels && pe[q].labels.en) posLabels[q] = pe[q].labels.en.value; });
        } catch (e3) {}
      }
      // resolve any hop-2 names we don't already have
      var needNames = flagged.filter(function (f) { return !f.ent && !allEnt[f.qid]; }).map(function (f) { return f.qid; });
      var extra = await getEntities(needNames);
      var relations = flagged.slice(0, 8).map(function (f) {
        var ent = f.ent || allEnt[f.qid] || extra[f.qid];
        return { name: labelOf(ent) || "Related individual", relation: f.relation, position: (f.posQid && posLabels[f.posQid]) || "public office" };
      });
      return { status: "rca", relations: relations, detail: desc, url: wdUrl };
    } catch (err) {
      return { status: "unavailable", url: "https://www.google.com/search?q=" + encodeURIComponent(name + " politician OR minister OR official OR family") };
    }
  }

  /* ---------- V2.1 PEP layers: Wikipedia + Google News ---------- */
  // Tight office-holder regex for free text (Wikipedia leads, headlines) —
  // deliberately narrower than PEP_HINT so "general manager" etc. can't match.
  var PEP_TEXT_HINT = /(politician|president of|prime minister|minister (of|for)|foreign minister|senator|governor of|member of (the )?(parliament|congress|senate|national assembly)|parliamentarian|congress(man|woman)|ambassador|mayor of|chancellor of|secretary of state|head of state|legislator|lawmaker|diplomat|central bank governor|monarch|deputy (prime )?minister|first lady|attorney general|chief justice|cabinet (member|minister)|opposition leader|ruling party)/i;
  var PEP_NEWS_QUERY = '(minister OR president OR senator OR governor OR parliament OR politician OR mayor OR ambassador OR cabinet OR lawmaker OR election OR "public office")';
  function pepNewsRss(name) { return "https://news.google.com/rss/search?q=" + encodeURIComponent('"' + name + '" ' + PEP_NEWS_QUERY) + "&hl=en-US&gl=US&ceid=US:en"; }
  function pepNewsSearchUrl(name) { return "https://news.google.com/search?q=" + encodeURIComponent('"' + name + '" ' + PEP_NEWS_QUERY); }

  // Wikipedia — the profile description/lead is scanned for public office.
  async function wikipediaPep(name) {
    try {
      var r = await withTimeout(fetch("https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(name.replace(/\s+/g, "_")), { headers: { "Accept": "application/json" } }), 7000);
      if (!r.ok) return { status: "clear" };
      var j = await r.json();
      if (j.type !== "standard" || !j.extract) return { status: "clear" };
      var pageUrl = (j.content_urls && j.content_urls.desktop && j.content_urls.desktop.page) || ("https://en.wikipedia.org/wiki/" + encodeURIComponent((j.title || name).replace(/\s+/g, "_")));
      var lead = (j.description || "") + " \u2014 " + j.extract.slice(0, 320);
      if (PEP_TEXT_HINT.test(lead)) return { status: "hit", position: j.description || "Public office (per Wikipedia profile)", detail: j.extract.slice(0, 220), url: pageUrl, source: "Wikipedia", pageTitle: j.title || name };
      return { status: "clear", url: pageUrl, pageTitle: j.title || name };
    } catch (e) { return { status: "unavailable" }; }
  }

  /* ---------- V2.2: Wikipedia full-article RCA scan ----------
     Wikidata's family graph is incomplete — e.g. the granddaughter of a former
     Chief Minister with no relationship recorded. But the Wikipedia article
     body often states the tie in prose: “Manohar Joshi, former Chief Minister
     of Maharashtra, was her maternal grandfather.” This layer pulls the full
     plain-text article, keeps the lead + biography sections (Early life,
     Personal life, Family… — never plot/filmography noise), and flags any
     sentence about the subject that contains a KINSHIP word and a
     PUBLIC-OFFICE phrase together. */
  var RCA_REL_RE = /\b((?:maternal |paternal )?(?:grand)?(?:father|mother|son|daughter)|grandparent|grandchild|brother|sister|husband|wife|spouse|uncle|aunt|nephew|niece|cousin|(?:father|mother|son|daughter|brother|sister)-in-law)\b/i;
  var RCA_OFFICE_RE = /((?:former |ex-|then-|senior |late )*(?:chief minister|prime minister|deputy chief minister|union minister|cabinet minister|minister (?:of|for) [a-z&, ]+|president|vice[- ]president|speaker of [\w ]+|governor|senator|member of (?:the )?(?:parliament|congress|senate|lok sabha|rajya sabha|(?:state )?legislative (?:assembly|council))|\bMP\b|\bMLA\b|\bMLC\b|chancellor|mayor|ambassador|politician|lawmaker|legislator|head of state|chief justice|attorney general)(?: of (?:the )?[A-Z][\w-]*(?: [A-Z][\w-]*){0,3})?)/i;
  var NAME_RUN_RE = /([A-Z][\w.'\u2019-]+(?: [A-Z][\w.'\u2019-]+){1,3})/g;

  // lead + biography-flavoured sections only
  function bioSections(text) {
    var parts = text.split(/\n?==+ *([^=\n]+?) *==+\n?/);   // [lead, h1, body1, h2, body2, …]
    var out = parts[0] || "";
    for (var i = 1; i + 1 < parts.length; i += 2) {
      if (/early life|personal life|family|background|biography|life and career|childhood|relatives/i.test(parts[i])) out += "\n" + parts[i + 1];
    }
    return out;
  }
  async function wikiPlainText(name, titleHint) {
    var title = titleHint;
    if (!title) {
      try {
        var s = await fetchJson("https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=" + encodeURIComponent(name) + "&srlimit=1&format=json&origin=*", 8000, 2);
        if (s.query && s.query.search && s.query.search.length) title = s.query.search[0].title;
      } catch (e) {}
    }
    if (!title) return null;
    try {
      var j = await fetchJson("https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&redirects=1&titles=" + encodeURIComponent(title) + "&format=json&origin=*", 10000, 2);
      var pages = j.query && j.query.pages; if (!pages) return null;
      var k = Object.keys(pages)[0];
      var pg = pages[k]; if (!pg || !pg.extract) return null;
      return { title: pg.title || title, text: pg.extract.slice(0, 40000) };
    } catch (e) { return null; }
  }
  async function wikipediaRca(name, titleHint) {
    var page = await wikiPlainText(name, titleHint);
    if (!page) return { status: "clear" };
    var pageUrl = "https://en.wikipedia.org/wiki/" + encodeURIComponent(page.title.replace(/\s+/g, "_"));
    var sentences = bioSections(page.text).split(/[.!?]\s+(?=[A-Z\u201c"])/);
    var subjToks = norm(name).split(" ").filter(function (t) { return t.length > 2; });
    var rels = [], seen = {};
    for (var i = 0; i < sentences.length && rels.length < 3; i++) {
      var sent = (sentences[i] || "").trim();
      if (sent.length < 20 || sent.length > 400) continue;
      var rm = sent.match(RCA_REL_RE); if (!rm) continue;
      var om = sent.match(RCA_OFFICE_RE); if (!om) continue;
      // sentence must be about the subject — possessive pronoun or subject's name
      var low = sent.toLowerCase();
      var aboutSubject = /\b(his|her|their)\b/i.test(sent) || subjToks.some(function (t) { return low.indexOf(t) > -1; });
      if (!aboutSubject) continue;
      // relative's name = first capitalized run that isn't the subject or the office phrase
      var who = null, m2; NAME_RUN_RE.lastIndex = 0;
      while ((m2 = NAME_RUN_RE.exec(sent))) {
        var cn = norm(m2[1]);
        var isSubj = subjToks.some(function (t) { return cn.indexOf(t) > -1; });
        if (!isSubj && !RCA_OFFICE_RE.test(m2[1])) { who = m2[1]; break; }
      }
      var key = (who || "") + "|" + rm[1].toLowerCase();
      if (seen[key]) continue; seen[key] = 1;
      rels.push({ name: who || "Named relative (see article)", relation: rm[1].toLowerCase() + " (per Wikipedia \u2014 verify)", position: om[1], sentence: sent });
    }
    if (!rels.length) return { status: "clear", url: pageUrl };
    return {
      status: "rca",
      relations: rels.map(function (r) { return { name: r.name, relation: r.relation, position: r.position }; }),
      detail: "Per Wikipedia: \u201c" + rels[0].sentence.slice(0, 220) + "\u201d",
      url: pageUrl, source: "Wikipedia"
    };
  }

  // Google News — political-office coverage. News alone is INDICATIVE, not an
  // identity match: it needs 2+ corroborating headlines and is always worded as
  // "possible — verify". Shares the serialized news queue.
  async function newsPep(name) {
    try {
      var items = await fetchNews(pepNewsRss(name));
      if (!items) return { status: "unavailable", url: pepNewsSearchUrl(name) };
      // office term must appear NEAR the name in the headline (±60 chars) — a
      // headline that mentions both the person and some minister elsewhere in
      // the sentence is not evidence the person holds office.
      var nameRe = new RegExp(name.trim().split(/\s+/).map(function (t) { return t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("\\s+"), "i");
      function proximate(txt) {
        var nm = nameRe.exec(txt); if (!nm) return false;
        var om = PEP_TEXT_HINT.exec(txt); if (!om) return false;
        var gap = om.index > nm.index ? om.index - (nm.index + nm[0].length) : nm.index - (om.index + om[0].length);
        return gap < 60;
      }
      var hits = items.filter(function (it) { return proximate(it.raw); });
      if (hits.length >= 2) {
        return { status: "hit",
          position: "Possible PEP \u2014 political-office news coverage (verify identity)",
          detail: hits.length + " headline(s), e.g. \u201c" + hits[0].title + "\u201d" + (hits[0].domain ? " (" + hits[0].domain + ")" : ""),
          url: pepNewsSearchUrl(name), source: "Google News" };
      }
      return { status: "clear", url: pepNewsSearchUrl(name), checked: items.length };
    } catch (e) { return { status: "unavailable", url: pepNewsSearchUrl(name) }; }
  }

  // V2.1 PEP check — four free sources, layered:
  //   1. National PEP registers (OpenSanctions, downloaded & indexed locally)
  //   2. Wikidata live (office detail + RCA family/associate graph)
  //   3. Wikipedia live (profile lead scanned for public office)
  //   4. Google News (political-office coverage — catch-net when 1–3 are clear)
  // Any single layer can flag; agreeing layers are shown as corroboration.
  async function pep(name) {
    try { await ensurePeps(); } catch (e) {}
    var loc = null;
    try { loc = pepLocalLookup(name); } catch (e) {}
    var pair = await Promise.all([wikidataPep(name), wikipediaPep(name)]);
    var wd = pair[0], wiki = pair[1];
    var corr = [];
    if (loc) corr.push("PEP register: " + loc.lists.slice(0, 2).join(", "));
    if (wiki && wiki.status === "hit") corr.push("Wikipedia: " + wiki.position);
    if (wd && wd.status === "hit") {
      if (corr.length) wd.detail = (wd.detail ? wd.detail + " \u00b7 " : "") + "Corroborated \u2014 " + corr.join(" \u00b7 ");
      return wd;
    }
    if (loc) {
      return {
        status: "hit",
        position: (wiki && wiki.status === "hit" && wiki.position) || ("On PEP register" + (loc.country ? " \u00b7 " + loc.country.toUpperCase() : "")),
        detail: (loc.score < 1 ? "Matched \u201c" + loc.matched + "\u201d (" + Math.round(loc.score * 100) + "% \u2014 confirm identity) \u2014 " : "") + loc.lists.slice(0, 4).join(", ") + (wiki && wiki.status === "hit" ? " \u00b7 Wikipedia profile confirms public office" : ""),
        url: (wiki && wiki.status === "hit" && wiki.url) || loc.url || ("https://www.opensanctions.org/search/?q=" + encodeURIComponent(name))
      };
    }
    if (wiki && wiki.status === "hit") {
      return { status: "hit", position: wiki.position,
        detail: "Source: Wikipedia \u2014 \u201c" + wiki.detail + "\u2026\u201d (not on downloaded PEP registers \u2014 confirm)",
        url: wiki.url };
    }
    if (wd && wd.status === "rca") return wd;
    // V2.2 — Wikipedia article-body RCA scan (catches family ties Wikidata lacks)
    var wrca = null;
    try { wrca = await wikipediaRca(name, wiki && wiki.pageTitle); } catch (e) {}
    if (wrca && wrca.status === "rca") return wrca;
    var nw = await newsPep(name);   // catch-net: political-office news coverage
    if (nw.status === "hit") return { status: "hit", position: nw.position, detail: "Source: Google News \u2014 " + nw.detail, url: nw.url };
    if (wd && wd.status === "clear") return { status: "clear", url: wd.url || nw.url };
    if (nw.status === "clear") return { status: "clear", url: nw.url };
    return wd && wd.status ? wd : { status: "unavailable", url: pepNewsSearchUrl(name) };
  }

  /* ============================================================
     Corporate ownership & control graph (Wikidata)
     ------------------------------------------------------------
     For a COMPANY, pull the people who own and run it — owners /
     shareholders, founders, parent organisation, CEO/COO, chair,
     board members and directors — then screen EACH of them for
     sanctions, PEP status and adverse media. The company inherits
     the risk of its principals: a clean company with a sanctioned
     owner or a PEP director is escalated accordingly. This is the
     UBO (ultimate beneficial owner) / officer-screening layer.
     ============================================================ */
  // Wikidata properties that point from a company to a controlling party.
  var COMPANY_ROLES = [
    { p: "P127",  role: "Owner / shareholder" },
    { p: "P749",  role: "Parent organisation" },
    { p: "P112",  role: "Founder" },
    { p: "P169",  role: "Chief executive officer" },
    { p: "P1789", role: "Chief operating officer" },
    { p: "P488",  role: "Chairperson" },
    { p: "P5052", role: "Supervisory board member" },
    { p: "P3320", role: "Board member" },
    { p: "P1037", role: "Director / manager" }
  ];
  var ORG_HINT = /(compan|corporat|business|enterprise|\bbank\b|\bfirm\b|conglomerate|holding|manufactur|airline|insurer|organi[sz]ation|agency|state-owned|gmbh|joint-stock|automaker|retailer|\boil\b|\bgas\b|energy|telecom|utility|subsidiary)/i;

  function claimIds(claims, prop) {
    var arr = (claims && claims[prop]) || [], out = [];
    for (var i = 0; i < arr.length; i++) { var dv = arr[i].mainsnak && arr[i].mainsnak.datavalue; if (dv && dv.value && dv.value.id) out.push(dv.value.id); }
    return out;
  }
  function isHuman(ent) { return claimIds(ent && ent.claims, "P31").indexOf("Q5") > -1; }
  function descOf(ent, fallback) { return (ent && ent.descriptions && ent.descriptions.en && ent.descriptions.en.value) || fallback || ""; }
  // light, allocation-free PEP read from an already-fetched entity (no extra call)
  function lightPep(ent, fallbackDesc) {
    if (!ent) return { status: "clear" };
    var holds = !!(ent.claims && ent.claims.P39 && ent.claims.P39.length);
    var desc = descOf(ent, fallbackDesc);
    if (holds || PEP_HINT.test(desc)) return { status: "hit", position: desc || "Public office-holder" };
    var nm = labelOf(ent);
    var loc = nm ? pepLocalLookup(nm) : null;                 // v2: PEP registers too
    if (loc) return { status: "hit", position: "On PEP register: " + loc.lists[0] };
    return { status: "clear" };
  }

  async function companyGraph(name) {
    try {
      var s = await fetchJson("https://www.wikidata.org/w/api.php?action=wbsearchentities&search=" + encodeURIComponent(name) + "&language=en&format=json&origin=*&limit=1&type=item", 9000, 2);
      if (!s.search || !s.search.length) return { status: "none", isCompany: false };
      var hit = s.search[0], wdUrl = "https://www.wikidata.org/wiki/" + hit.id, desc = hit.description || "";
      var ge = await getEntities([hit.id]);
      var ent = ge[hit.id];
      if (!ent) return { status: "none", isCompany: false, url: wdUrl };
      if (isHuman(ent)) return { status: "none", isCompany: false, url: wdUrl };  // resolved to a person, not a company
      var claims = ent.claims || {};
      var hasPrincipalProp = COMPANY_ROLES.some(function (r) { return claims[r.p] && claims[r.p].length; });
      if (!(ORG_HINT.test(descOf(ent, desc)) || hasPrincipalProp)) return { status: "none", isCompany: false, url: wdUrl };

      // collect controlling parties (dedup, capped)
      var seen = {}, principals = [];
      COMPANY_ROLES.forEach(function (r) {
        claimIds(claims, r.p).forEach(function (qid) {
          if (seen[qid]) return; seen[qid] = 1;
          if (principals.length < 14) principals.push({ qid: qid, role: r.role });
        });
      });
      if (!principals.length) return { status: "resolved", isCompany: true, officers: [], url: wdUrl, source: "Wikidata", count: 0 };

      var ents = await getEntities(principals.map(function (p) { return p.qid; }));
      // sanctions (instant, local index) + light PEP (from claims) for every principal
      await prefetch(principals.map(function (p) { return labelOf(ents[p.qid]) || ""; }));
      var officers = principals.map(function (p) {
        var e = ents[p.qid];
        var nm = labelOf(e) || "";
        var person = e ? isHuman(e) : true;
        return {
          name: nm, role: p.role, qid: p.qid, isPerson: person,
          sanctions: nm ? sanctions(nm) : { status: "clear" },
          pep: person ? lightPep(e, "") : { status: "clear" },
          adverse: { status: "skip" },
          url: "https://www.wikidata.org/wiki/" + p.qid
        };
      }).filter(function (o) { return o.name; });

      // Adverse-media news for principals is NOT fetched here — it shares the
      // slow serialized news queue and would freeze the row. Principals are
      // marked "skip"; app.js enriches them in the background after the row shows.
      return { status: "resolved", isCompany: true, officers: officers, url: wdUrl, source: "Wikidata", count: officers.length };
    } catch (err) {
      return { status: "unavailable", isCompany: true, url: "https://www.wikidata.org/wiki/Special:Search?search=" + encodeURIComponent(name) };
    }
  }

  /* ============================================================
     GLEIF (LEI) corporate-ownership chain
     ------------------------------------------------------------
     Free, keyless, CORS-enabled official LEI data. Resolves the
     company's Legal Entity Identifier, then walks its direct &
     ultimate parent and its subsidiaries, and screens each related
     LEGAL ENTITY for sanctions + adverse media. (GLEIF carries
     corporate ownership only — not natural-person UBO.)
     ============================================================ */
  var GLEIF_BASE = "https://api.gleif.org/api/v1/";

  function gleifEntity(rec) {
    var a = rec.attributes || {}, e = a.entity || {};
    return {
      lei: rec.id,
      name: (e.legalName && e.legalName.name) || "",
      jurisdiction: e.jurisdiction || "",
      status: e.status || (a.registration && a.registration.status) || "",
      country: (e.legalAddress && e.legalAddress.country) || ((e.headquartersAddress && e.headquartersAddress.country) || "")
    };
  }

  // Fold full legal-form words (GLEIF spells them out: "Aktiengesellschaft" for
  // AG, "Gesellschaft mit beschränkter Haftung" for GmbH, "Designated Activity
  // Company" for DAC…) so the principal entity matches the query instead of a
  // descriptively-named subsidiary.
  function gleifNorm(s) {
    return norm(s)
      .replace(/\baktiengesellschaft\b/g, "")
      .replace(/\bgesellschaft mit beschrankter haftung\b/g, "")
      .replace(/\bdesignated activity company\b/g, "")
      .replace(/\bpublic limited company\b/g, "")
      .replace(/\bsociete anonyme\b/g, "")
      .replace(/\bsociedad anonima\b/g, "")
      .replace(/\bnaamloze vennootschap\b/g, "")
      .replace(/\s+/g, " ").trim();
  }
  async function gleifFind(name) {
    var url = GLEIF_BASE + "lei-records?filter[fulltext]=" + encodeURIComponent(name) + "&page[size]=15";
    var j = await fetchJson(url, 9000, 2);
    var rows = (j && j.data) || [];
    if (!rows.length) return null;
    var q = gleifNorm(name), qTok = q.split(" ").filter(Boolean).length;
    var cands = [];
    rows.forEach(function (rec) {
      var nm = rec.attributes && rec.attributes.entity && rec.attributes.entity.legalName && rec.attributes.entity.legalName.name;
      if (!nm) return;
      var nn = gleifNorm(nm);
      cands.push({ rec: rec, sc: nameScoreEx(q, nn).score, exact: nn === q ? 0 : 1, tokDiff: Math.abs(nn.split(" ").filter(Boolean).length - qTok), len: nn.length });
    });
    if (!cands.length) return null;
    var bestSc = cands.reduce(function (m, c) { return Math.max(m, c.sc); }, 0);
    if (bestSc < 0.84) return null;   // guard against wrong-company matches
    // Among the strongest name matches, prefer an exact legal-name match, then
    // the entity closest to the query (fewest extra descriptor words / shortest).
    var top = cands.filter(function (c) { return c.sc >= bestSc - 0.06; });
    top.sort(function (a, b) { return a.exact - b.exact || a.tokDiff - b.tokDiff || a.len - b.len || b.sc - a.sc; });
    return top[0].rec;
  }

  async function gleifRelated(lei, rel) {
    try {
      var j = await fetchJson(GLEIF_BASE + "lei-records/" + encodeURIComponent(lei) + "/" + rel, 8000, 1);
      if (!j || !j.data) return [];
      var data = Array.isArray(j.data) ? j.data : [j.data];
      return data.map(gleifEntity).filter(function (x) { return x.name; });
    } catch (e) { return []; }
  }

  async function gleifGraph(name) {
    try {
      var rec = await gleifFind(name);
      if (!rec) return { status: "none" };
      var self = gleifEntity(rec);
      await prefetch([self.name]);
      self.sanctions = self.name ? sanctions(self.name) : { status: "clear" };
      var dp = await gleifRelated(self.lei, "direct-parent");
      var up = await gleifRelated(self.lei, "ultimate-parent");
      var kids = await gleifRelated(self.lei, "direct-children");
      var seen = {}; seen[self.lei] = 1;
      var related = [];
      function add(list, role) { list.forEach(function (x) { if (seen[x.lei]) return; seen[x.lei] = 1; if (related.length < 10) { x.relation = role; related.push(x); } }); }
      add(up, "Ultimate parent"); add(dp, "Direct parent"); add(kids, "Subsidiary");
      // sanctions (instant, local index) for every related entity. Adverse-media
      // news is NOT fetched here — it is serialized + slow and would freeze the
      // whole row (e.g. CRISIL, which has real subsidiaries). Related entities
      // are marked "news not screened"; the entity's OWN adverse media still
      // streams in via the background enrichment in app.js.
      await prefetch(related.map(function (x) { return x.name; }));
      related.forEach(function (x) { x.sanctions = x.name ? sanctions(x.name) : { status: "clear" }; x.adverse = { status: "skip" }; });
      return { status: "resolved", self: self, related: related, url: "https://search.gleif.org/#/record/" + self.lei, source: "GLEIF / LEI" };
    } catch (err) {
      return { status: "unavailable", url: "https://search.gleif.org/#/search/simpleSearch?keyword=" + encodeURIComponent(name) };
    }
  }

  /* ---------- Adverse media: live Google News + Wikipedia ---------- */
  // Broad adverse-term vocabulary (the user's examples + common AML/compliance signals)
  var RISK_RE = /(fraud|convicted|conviction|money laundering|launder|corruption|corrupt|bribery|bribe|embezzl|sanction|indict|allegation|alleged|accus|pleaded guilty|found guilty|guilty|ponzi|scam|scandal|terroris|trafficking|fugitive|arrest|detain|jail|imprison|prison|charged|charges|lawsuit|sued|litigation|probe|investigation|raid|seiz|fine[ds]?|penalt|misconduct|racketeer|extortion|smuggl|tax evasion|insider trading|default|bankrupt|insolven|disqualif|banned|debarred|notice|summons|warrant|custody|crackdown|wrongdoing|malpractice|forgery|counterfeit)/i;
  // Terms appended to the news query to bias toward adverse coverage
  var ADVERSE_QUERY = '(fraud OR allegation OR arrested OR jailed OR investigation OR lawsuit OR sanctions OR corruption OR charged OR convicted OR probe OR penalty OR scandal OR money laundering OR notice OR banned)';

  function gnewsSearchUrl(name) {
    return "https://news.google.com/search?q=" + encodeURIComponent('"' + name + '" ' + ADVERSE_QUERY);
  }
  function gnewsRss(name) {
    return "https://news.google.com/rss/search?q=" + encodeURIComponent('"' + name + '" ' + ADVERSE_QUERY) + "&hl=en-US&gl=US&ceid=US:en";
  }
  function gsearchUrl(name) {
    return "https://www.google.com/search?q=" + encodeURIComponent('"' + name + '" ' + ADVERSE_QUERY);
  }

  function relTime(d) {
    if (!d) return "";
    var t = new Date(d).getTime(); if (isNaN(t)) return "";
    var days = Math.floor((Date.now() - t) / 86400000);
    if (days <= 0) return "today"; if (days === 1) return "1 day ago";
    if (days < 30) return days + " days ago"; if (days < 365) return Math.floor(days / 30) + " mo ago";
    return Math.floor(days / 365) + " yr ago";
  }
  function cleanTitle(t) { return (t || "").replace(/\s*-\s*[^-]+$/, "").trim() || (t || "").trim(); }
  function stripHtml(s) { return (s || "").replace(/<[^>]*>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim(); }
  function domainOf(t, link) {
    var m = (t || "").match(/-\s*([^-]+)$/); if (m) return m[1].trim();
    try { return new URL(link).hostname.replace(/^www\./, ""); } catch (e) { return ""; }
  }

  // Try to fetch Google News RSS as parsed items via several free, CORS-friendly methods.
  // News requests are SERIALIZED through a queue — rss2json (keyless) rate-limits
  // overlapping requests, so batch screening must call them one at a time.
  var newsQueue = Promise.resolve();
  function queueNews(rssUrl) {
    var run = newsQueue.then(function () { return fetchNewsNow(rssUrl); });
    // keep the chain alive regardless of individual failures, with a small gap
    newsQueue = run.then(function () { return sleep(120); }, function () { return sleep(120); });
    return run;
  }

  async function fetchNewsNow(rssUrl) {
    var rss = rssUrl;

    // SECURITY: fetch Google News RSS through our own allowlisted same-origin
    // proxy (api/fetch.js). Screened names are no longer sent to third-party
    // proxies (rss2json / allorigins), which could log or tamper with results.
    for (var attempt = 0; attempt < 2; attempt++) {
      try {
        var r = await withTimeout(fetch("/api/fetch?url=" + encodeURIComponent(rss)), 9000);
        if (r.ok) { var xml = await r.text(); return parseRss(xml); }
        if (r.status !== 429 && r.status < 500) break;
      } catch (e) {}
      await sleep(400 * (attempt + 1));
    }

    return null; // all methods unavailable
  }

  function fetchNews(rssUrl) { return queueNews(rssUrl); }

  function parseRss(xml) {
    var out = [];
    try {
      var doc = new DOMParser().parseFromString(xml, "text/xml");
      var items = doc.getElementsByTagName("item");
      for (var i = 0; i < items.length && i < 12; i++) {
        var get = function (tag) { var el = items[i].getElementsByTagName(tag)[0]; return el ? el.textContent : ""; };
        var title = get("title"), link = get("link"), desc = get("description"), date = get("pubDate");
        if (title) out.push({ title: cleanTitle(title), raw: title + " " + desc, snippet: stripHtml(desc), url: link, domain: domainOf(title, link), date: date });
      }
    } catch (e) {}
    return out;
  }

  async function adverse(name) {
    var searchUrl = gnewsSearchUrl(name);
    var items = await fetchNews(gnewsRss(name));

    if (items) {
      // Headlines came from a query already biased to adverse terms. Prioritise
      // ones whose headline explicitly contains a risk word, but keep the rest
      // as supporting coverage so the user always sees the actual articles.
      var flagged = items.filter(function (it) { return RISK_RE.test(it.raw); });
      var others = items.filter(function (it) { return !RISK_RE.test(it.raw); });
      var ranked = flagged.concat(others);
      if (flagged.length) {
        return {
          status: "hit",
          summary: flagged.length + " recent news item(s) link \u201c" + name + "\u201d to adverse coverage \u2014 allegations, legal action, sanctions or similar.",
          articles: ranked.slice(0, 6).map(function (it) { return { title: it.title, snippet: it.snippet, url: it.url, domain: it.domain, when: relTime(it.date), adverse: RISK_RE.test(it.raw) }; }),
          url: searchUrl, source: "Google News"
        };
      }
      // News worked but nothing explicitly adverse — still surface what we found.
      return { status: "clear", url: searchUrl, source: "Google News", checked: items.length,
        articles: ranked.slice(0, 4).map(function (it) { return { title: it.title, snippet: it.snippet, url: it.url, domain: it.domain, when: relTime(it.date), adverse: false }; }) };
    }

    // News fetch unavailable -> fall back to Wikipedia, else ask user to open the live search
    try {
      var r = await withTimeout(fetch("https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(name.replace(/\s+/g, "_")), { headers: { "Accept": "application/json" } }), 6000);
      if (r.ok) {
        var j2 = await r.json();
        if (j2.extract && j2.type === "standard") {
          var m = j2.extract.match(RISK_RE);
          if (m) {
            return {
              status: "hit",
              summary: j2.extract.length > 320 ? j2.extract.slice(0, 317) + "\u2026" : j2.extract,
              articles: j2.content_urls && j2.content_urls.desktop ? [{ title: "Wikipedia: " + (j2.title || name), url: j2.content_urls.desktop.page, domain: "wikipedia.org", when: "" }] : [],
              url: searchUrl, source: "Wikipedia"
            };
          }
        }
      }
    } catch (e) {}

    // Couldn't auto-fetch news in this browser — never claim "No"; prompt the live check.
    return { status: "unavailable", url: searchUrl };
  }

  window.Sources = {
    pep: pep, sanctions: sanctions, ensureSanctions: ensureSanctions,
    watchlist: watchlist, prefetch: prefetch, serverMode: function () { return SERVER.on; },
    pepRegister: function (name) {
      var loc = null; try { loc = pepLocalLookup(name); } catch (e) {}
      if (!loc) return null;
      return { status: "hit", prelim: true,
        position: "On PEP register" + (loc.country ? " \u00b7 " + String(loc.country).toUpperCase() : ""),
        detail: (loc.score < 1 ? "Matched \u201c" + loc.matched + "\u201d (" + Math.round(loc.score * 100) + "% \u2014 confirm identity) \u2014 " : "") + loc.lists.slice(0, 4).join(", ") + " \u00b7 checking Wikidata / Wikipedia for the position\u2026",
        url: loc.url };
    },
    sanctionsMeta: function () { return sMeta; }, adverse: adverse, norm: norm,
    companyGraph: companyGraph, gleifGraph: gleifGraph, plannedLists: "90+",
    pepMeta: function () { return pMeta; }, ensurePeps: ensurePeps,
    nameScoreEx: nameScoreEx, soundex: soundex, translit: translit
  };
})();
