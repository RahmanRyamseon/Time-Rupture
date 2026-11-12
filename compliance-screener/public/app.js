/* ============================================================
   Compliance Screener — UI (live free-source screening)
   ============================================================ */
(function () {
  "use strict";

  var state = { results: [], filtered: [], fileName: "", filterRisk: "all", search: "", run: null };
  var pendingEntries = null;

  /* ============================================================
     Analyst identity + audit log (localStorage-backed)
     ------------------------------------------------------------
     Every screening run is recorded with a reference ID, the
     analyst who ran it, timestamps, the sanctions list version it
     was screened against, and the per-row result + disposition.
     ============================================================ */
  var LS_ANALYST = "cs_analyst_v1";
  var LS_LOG = "cs_screening_log_v1";

  function getAnalyst() { try { return localStorage.getItem(LS_ANALYST) || ""; } catch (e) { return ""; } }
  function setAnalyst(v) { try { localStorage.setItem(LS_ANALYST, v || ""); } catch (e) {} }

  function loadLog() { try { return JSON.parse(localStorage.getItem(LS_LOG) || "[]"); } catch (e) { return []; } }
  function saveLog(log) { try { localStorage.setItem(LS_LOG, JSON.stringify(log.slice(-200))); } catch (e) {} }
  function upsertRun(run) {
    var log = loadLog();
    var i = log.findIndex(function (r) { return r.refId === run.refId; });
    if (i >= 0) log[i] = run; else log.push(run);
    saveLog(log);
  }

  function pad(n, w) { n = "" + n; while (n.length < w) n = "0" + n; return n; }
  function makeRefId(d) {
    d = d || new Date();
    var rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
    return "SCR-" + d.getFullYear() + pad(d.getMonth() + 1, 2) + pad(d.getDate(), 2) + "-" + pad(d.getHours(), 2) + pad(d.getMinutes(), 2) + "-" + rnd;
  }
  function fmtTs(t) {
    if (!t) return "—";
    var d = new Date(t); if (isNaN(d.getTime())) return "—";
    return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  }
  function fmtDate(t) {
    if (!t) return "—";
    var d = new Date(t); if (isNaN(d.getTime())) return "—";
    return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", timeZoneName: "short" });
  }

  // a result carries a screening signal that an analyst must dispose of
  function hasSignal(r) {
    if (r.sanctions.status === "hit" || r.sanctions.status === "possible" ||
      r.pep.status === "hit" || r.pep.status === "rca" || r.adverse.status === "hit") return true;
    var g = selfGleifSanc(r);
    if (g === "hit" || g === "possible") return true;   // entity's own LEI legal name on a list
    return officerAgg(r).flagged > 0;
  }

  // ---- corporate principals (UBO / owners / directors / officers) ----
  // Should this entry be expanded into its ownership graph? We attempt it unless
  // the row is explicitly a natural person. companyGraph() self-aborts (returns
  // isCompany:false) the moment Wikidata resolves the name to a human, so
  // attempting on an unlabelled name is cheap and correct.
  function shouldTryCompany(e) {
    var t = (e.type || "").toLowerCase();
    if (/individual|person|natural|politician|\bpep\b|\bubo\b|director|officer|shareholder/.test(t)) return false;
    return true;
  }
  // Heuristic: does this row read as a company (used only for display hints)?
  function looksLikeCompany(e) {
    var t = (e.type || "").toLowerCase();
    if (/individual|person|natural|\bubo\b|director|officer|shareholder|politician/.test(t)) return false;
    if (/compan|corp|entity|organi[sz]ation|business|\bfirm\b|\bbank\b|\bfund\b|\btrust\b|llc|\bltd\b|\binc\b|gmbh|plc|holding|group|\bllp\b/.test(t)) return true;
    // no usable type -> infer from a corporate suffix in the name
    return /\b(ltd|llc|inc|co|corp|corporation|company|limited|plc|gmbh|s\.?a|ag|jsc|oao|pjsc|fze|dmcc|llp|holdings?|group|partners|capital|industries|enterprises?|trading|bank|sarl|bv|nv|pte|spa|srl|oyj|asa)\b/i.test(e.name || "");
  }
  // Aggregate the worst findings across a company's screened related parties
  // — Wikidata owners/officers AND GLEIF parent/subsidiary legal entities.
  function flagItem(it) {
    var f = false, s = false, sp = false, p = false, adv = false;
    if (it.sanctions) { if (it.sanctions.status === "hit") { s = true; f = true; } else if (it.sanctions.status === "possible") { sp = true; f = true; } }
    if (it.pep && it.pep.status === "hit") { p = true; f = true; }
    if (it.adverse && it.adverse.status === "hit") { adv = true; f = true; }
    it._flag = f;
    return { f: f, s: s, sp: sp, p: p, adv: adv };
  }
  function officerAgg(r) {
    var a = { sanctionHit: false, sanctionPossible: false, pep: false, adverse: false, flagged: 0, total: 0, ownerTotal: 0, gleifTotal: 0 };
    var ofs = (r.company && r.company.officers) || [];
    ofs.forEach(function (o) {
      var x = flagItem(o); a.total++; a.ownerTotal++; if (x.f) a.flagged++;
      if (x.s) a.sanctionHit = true; if (x.sp) a.sanctionPossible = true; if (x.p) a.pep = true; if (x.adv) a.adverse = true;
    });
    if (r.gleif && r.gleif.status === "resolved") {
      // NOTE: the entity's own LEI record (r.gleif.self) is NOT a principal — it
      // IS the entity. Its sanction match drives the entity's OWN ranking via
      // selfGleifSanc()/ownSanction()/scoreRisk(), not this principal aggregate.
      (r.gleif.related || []).forEach(function (g) {
        var x = flagItem(g); a.total++; a.gleifTotal++; if (x.f) a.flagged++;
        if (x.s) a.sanctionHit = true; if (x.sp) a.sanctionPossible = true; if (x.adv) a.adverse = true;
      });
    }
    return a;
  }
  var DISPOSITIONS = {
    pending: { label: "Pending review", cls: "d-pending" },
    confirmed: { label: "Confirmed match", cls: "d-confirmed" },
    escalated: { label: "Escalated", cls: "d-escalated" },
    false_positive: { label: "False positive", cls: "d-false" },
    cleared: { label: "Cleared", cls: "d-cleared" },
    no_match: { label: "No match", cls: "d-none" }
  };

  /* ---------- open an external link without ever breaking the frame ----------
     This tool may run inside a cross-origin SANDBOXED iframe (e.g. a preview)
     where window.open is blocked and a user click on target="_blank" would
     otherwise navigate the frame itself to a site that refuses framing
     (news.google.com, OFAC, etc.) -> "refused to connect". We ALWAYS cancel the
     default navigation, try to open a real new tab, and if that's blocked we
     copy the URL and show a toast so the user can paste it. The frame is never
     navigated. In a normally-deployed (non-sandboxed) page, window.open works
     and the link opens in a new tab as expected. */
  window.openExternal = function (ev, url) {
    if (ev) { ev.preventDefault(); ev.stopPropagation(); }
    if (!url || url === "#") return false;
    var opened = null;
    try { opened = window.open(url, "_blank", "noopener,noreferrer"); if (opened) opened.opener = null; } catch (e) {}
    if (opened) return false;
    // popups blocked (sandbox) — copy the link and tell the user
    copyText(url);
    toast("Link copied. Popups are blocked in this preview — paste it into a new browser tab to open.", url);
    return false;
  };
  function copyText(text) {
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text); return; } } catch (e) {}
    try {
      var ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.focus(); ta.select();
      document.execCommand("copy"); document.body.removeChild(ta);
    } catch (e) {}
  }
  var toastTimer = null;
  function toast(msg, url) {
    var el = document.getElementById("toast");
    if (!el) { el = document.createElement("div"); el.id = "toast"; el.className = "toast"; document.body.appendChild(el); }
    el.innerHTML = '<span class="toast-msg">' + esc(msg) + "</span>" +
      (url ? '<span class="toast-link" title="Select and copy">' + esc(url) + "</span>" : "");
    el.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("show"); }, 7000);
  }
  // Catch-all: route every external (target=_blank, http/https) link click through
  // openExternal so no anchor can ever navigate the frame to a framing-blocked site.
  document.addEventListener("click", function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute("href") || "";
    if (/^https?:\/\//i.test(href) && (a.target === "_blank" || a.getAttribute("rel") === "noopener")) {
      window.openExternal(ev, a.href);
    }
  }, true);
  // Delegated handlers replacing inline onclick="" attributes (CSP: no inline script).
  document.addEventListener("click", function (ev) {
    var t = ev.target && ev.target.closest ? ev.target : null;
    if (!t) return;
    var db = t.closest("[data-disp-id]");
    if (db) { window.setDisposition(db.getAttribute("data-disp-id"), db.getAttribute("data-disp-key")); return; }
    var lr = t.closest("[data-ref-id]");
    if (lr) { window.openLogRun(lr.getAttribute("data-ref-id")); }
  });

  /* ---------- risk scoring + match confidence ---------- */
  // The entity's OWN sanction status from its GLEIF/LEI record. GLEIF carries the
  // official legal-name spelling that a raw input often misses, so a clear input
  // can still resolve to a sanctioned legal entity — and that must update the
  // entity's OWN ranking, not a principal's.
  function selfGleifSanc(r) {
    if (r && r.gleif && r.gleif.status === "resolved" && r.gleif.self && r.gleif.self.sanctions) {
      return r.gleif.self.sanctions.status; // "hit" | "possible" | "clear" | "unavailable"
    }
    return null;
  }
  // The entity's own sanction status = worst of (input-name screen, LEI legal-name screen).
  function ownSanction(r) {
    var s = r.sanctions.status, g = selfGleifSanc(r);
    if (s === "hit" || g === "hit") return "hit";
    if (s === "possible" || g === "possible") return "possible";
    if (s === "unavailable") return "unavailable";
    return "clear";
  }
  function scoreRisk(r) {
    var a = officerAgg(r);
    var own = ownSanction(r);
    if (own === "hit" || a.sanctionHit) return "High";
    if (r.pep.status === "hit" && r.adverse.status === "hit") return "High";
    if (a.pep && a.adverse) return "High";                          // owner/officer is a PEP AND in adverse media
    if (own === "possible" || a.sanctionPossible) return "Review";  // fuzzy/phonetic near-match
    if (r.pep.status === "hit" || r.pep.status === "rca" || r.adverse.status === "hit" || a.pep || a.adverse) return "Medium";  // RCAs + flagged principals get PEP-equivalent scrutiny (FATF)
    if (own === "unavailable") return "Review";       // couldn't confirm sanctions
    return "Low";
  }
  // 0–100 confidence in the STRONGEST match found (drives the score column).
  function matchConfidence(r) {
    var c = 0;
    if (r.sanctions.status === "hit" || r.sanctions.status === "possible") c = Math.max(c, Math.round((r.sanctions.score || 0) * 100));
    var gSelf = selfGleifSanc(r);
    if (gSelf === "hit") c = Math.max(c, 90);                     // entity's canonical LEI legal name on a list
    else if (gSelf === "possible") c = Math.max(c, 80);
    if (r.pep.status === "hit") c = Math.max(c, 90);              // Wikidata identity + office held
    if (r.pep.status === "rca") c = Math.max(c, 75);             // identity + documented relation to a PEP
    if (r.adverse.status === "hit") c = Math.max(c, 70);          // corroborating adverse coverage
    var a = officerAgg(r);
    if (a.sanctionHit) c = Math.max(c, 90);                       // a sanctioned owner/officer
    if (a.sanctionPossible) c = Math.max(c, 80);
    if (a.pep) c = Math.max(c, 75);                              // a PEP among the principals
    if (a.adverse) c = Math.max(c, 65);
    return c;
  }
  function categories(r) {
    var out = [];
    if (ownSanction(r) === "hit" || ownSanction(r) === "possible") out.push("Sanctions");
    if (r.pep.status === "hit") out.push("PEP");
    if (r.pep.status === "rca") out.push("PEP-linked (RCA)");
    if (r.adverse.status === "hit") out.push("Adverse Media");
    var a = officerAgg(r);
    if (a.sanctionHit || a.sanctionPossible) out.push("Sanctioned principal");
    if (a.pep) out.push("PEP principal");
    if (a.adverse) out.push("Adverse-media principal");
    return out;
  }

  /* ---------- screen one entry against live sources ---------- */
  function rescore(r) {
    r.risk = scoreRisk(r);
    r.confidence = matchConfidence(r);
    r.categories = categories(r);
    // don't override a disposition the analyst has already set
    if (!r.reviewer) r.disposition = hasSignal(r) ? "pending" : "no_match";
  }

  // Core screen: ONLY sanctions (local index, instant). PEP + ownership/GLEIF +
  // adverse-media news all stream in the background so rows appear instantly.
  async function screenEntry(e) {
    var sanc = window.Sources.sanctions(e.name);          // sync vs. loaded OFAC index (instant)
    var r = { name: e.name, type: e.type || "", pep: { status: "checking" }, sanctions: sanc, adverse: { status: "checking" }, company: null, gleif: null, id: Math.random().toString(36).slice(2) };
    r.reviewer = "";
    r.reviewedAt = null;
    r.note = "";
    rescore(r);
    return r;
  }

  // Background enrichment: PEP + company/GLEIF + adverse-media news for one row.
  // Fires after row is displayed so it doesn't block initial render.
  async function enrichRow(r) {
    // 1. PEP (Wikidata + Wikipedia + Google News — the slower source)
    try { r.pep = await window.Sources.pep(r.name); }
    catch (e) { r.pep = { status: "unavailable" }; }
    rescore(r);
    scheduleResultsRender();

    // 2. Company ownership graph (Wikidata)
    if (shouldTryCompany(r)) {
      try { r.company = await window.Sources.companyGraph(r.name); }
      catch (e) { r.company = null; }
      rescore(r);
      scheduleResultsRender();
    }

    // 3. Corporate ownership chain (GLEIF/LEI)
    if (shouldTryCompany(r)) {
      try { r.gleif = await window.Sources.gleifGraph(r.name); }
      catch (e) { r.gleif = null; }
      rescore(r);
      scheduleResultsRender();
    }

    // 4. Adverse-media news for the main entity
    try { r.adverse = await window.Sources.adverse(r.name); }
    catch (e) { r.adverse = { status: "unavailable" }; }
    rescore(r);
    scheduleResultsRender();

    // 5. Adverse-media news for principals (officers + related legal entities)
    var principals = [];
    if (r.company && r.company.officers) principals = principals.concat(r.company.officers.slice(0, 5));
    if (r.gleif && r.gleif.related) principals = principals.concat(r.gleif.related.slice(0, 5));
    principals = principals.filter(function (p) { return p && p.name && p.adverse && p.adverse.status === "skip"; });
    for (var i = 0; i < principals.length; i++) {
      try { principals[i].adverse = await window.Sources.adverse(principals[i].name); }
      catch (e) { principals[i].adverse = { status: "unavailable" }; }
      rescore(r);
      scheduleResultsRender();
    }
  }

  /* ---------- run a batch ---------- */
  // Coalesce many quick result updates into one render per animation frame.
  var _renderQueued = false;
  function scheduleResultsRender() {
    if (_renderQueued) return;
    _renderQueued = true;
    requestAnimationFrame(function () {
      _renderQueued = false;
      if (state.view === "resultsView") renderResults();
    });
  }
  async function screenEntries(entries) {
    // ensure an analyst is on record before screening (audit requirement)
    if (!getAnalyst()) { pendingEntries = entries; openIdentity(true); return; }
    show("progressView");
    var bar = document.querySelector("#progressBar > div");
    var txt = document.getElementById("progressText");
    bar.style.width = "4%";
    txt.textContent = "Loading " + (window.Sources.plannedLists || 38) + " official sanctions lists & PEP registers (first run downloads them once; afterwards they load from the local cache in seconds)\u2026";
    // live download progress → progress bar
    window.Sources.onProgress = function (done, total) {
      if (!total) return;
      bar.style.width = Math.max(4, Math.round(done / total * 92)) + "%";
      txt.textContent = "Downloading official watchlists \u2014 " + done + " of " + total + " lists loaded\u2026";
    };

    await window.Sources.ensureSanctions();
    window.Sources.onProgress = null;
    bar.style.width = "96%";
    refreshSourceUI();
    var meta = window.Sources.sanctionsMeta();

    var startedAt = Date.now();
    state.run = {
      refId: makeRefId(new Date(startedAt)),
      analyst: getAnalyst(),
      startedAt: startedAt,
      finishedAt: null,
      fileName: state.fileName || "manual entry",
      listSource: meta.source || "unavailable",
      listAsOf: meta.asOf || null,
      listVersion: meta.version || null,
      listCount: meta.designations || meta.count || 0,
      listLoaded: !!meta.loaded,
      lists: (meta.lists || []).map(function (l) { return { label: l.label, count: l.count, asOf: l.asOf, jurisdiction: l.jurisdiction, authority: l.authority }; }),
      listsFailed: meta.failed || [],
      total: entries.length,
      entries: []
    };

    state.results = [];
    state.screening = true;
    state.pending = entries.map(function (e) { return e.name; });
    var done = 0, total = entries.length, idx = 0;
    var POOL = Math.min(8, total);   // resolve many records at once
    var adverseJobs = [];

    // show the results table immediately and stream rows in as they resolve
    show("resultsView");

    async function worker() {
      while (idx < entries.length) {
        var e = entries[idx++];
        try {
          var r = await screenEntry(e);
          var pi = state.pending.indexOf(e.name); if (pi > -1) state.pending.splice(pi, 1);
          state.results.push(r);
          scheduleResultsRender();
          adverseJobs.push(enrichRow(r));   // background: PEP + ownership + news
        }
        catch (err) { var pj = state.pending.indexOf(e.name); if (pj > -1) state.pending.splice(pj, 1); }
        done++;
      }
    }
    var ws = []; for (var k = 0; k < POOL; k++) ws.push(worker());
    await Promise.all(ws);

    var order = { High: 0, Review: 1, Medium: 2, Low: 3 };
    function sortResults() {
      state.results.sort(function (a, b) { return order[a.risk] - order[b.risk]; });
    }
    sortResults();
    state.screening = false;
    state.pending = [];
    state.run.finishedAt = Date.now();
    state.run.entries = state.results;
    upsertRun(state.run);
    renderResults();

    // when the background news lookups finish, re-sort once and persist the run
    Promise.all(adverseJobs).then(function () {
      sortResults();
      state.run.entries = state.results;
      upsertRun(state.run);
      if (state.view === "resultsView") renderResults();
    });
  }

  /* ---------- file parsing (the NAMES to check) ---------- */
  var MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
  var MAX_NAMES = 5000;
  function parseFile(file) {
    if (!file) return;
    if (!/\.(csv|xlsx|xls)$/i.test(file.name || "")) { alert("Please upload a .csv, .xlsx or .xls file."); return; }
    if (file.size > MAX_UPLOAD_BYTES) { alert("That file is too large (max 10 MB). Split it into smaller files."); return; }
    state.fileName = String(file.name).slice(0, 200);
    var reader = new FileReader();
    reader.onload = function (e) {
      var rows;
      try {
        var wb = XLSX.read(e.target.result, { type: "array", cellFormula: false, cellHTML: false, bookVBA: false });
        rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, blankrows: false });
      } catch (err) { alert("Sorry — couldn't read that file. Please upload a .csv or .xlsx file."); return; }
      var parsed = extractEntries(rows);
      if (parsed.length > MAX_NAMES) { alert("Only the first " + MAX_NAMES + " names will be screened in one run."); parsed = parsed.slice(0, MAX_NAMES); }
      if (!parsed.length) { alert("No names found. Make sure your file has a column of names (a header containing 'name' works best)."); return; }
      screenEntries(parsed);
    };
    reader.readAsArrayBuffer(file);
  }
  function extractEntries(rows) {
    if (!rows.length) return [];
    var header = rows[0].map(function (h) { return (h || "").toString().toLowerCase(); });
    var nameCol = -1, typeCol = -1;
    header.forEach(function (h, i) {
      if (nameCol < 0 && /name|company|entity|individual|party|subject/.test(h)) nameCol = i;
      if (typeCol < 0 && /type|category|kind/.test(h)) typeCol = i;
    });
    var start = 1; if (nameCol < 0) { nameCol = 0; start = 0; }
    var out = [];
    for (var i = start; i < rows.length; i++) {
      var name = rows[i][nameCol];
      if (name == null || name.toString().trim() === "") continue;
      out.push({ name: name.toString().trim().slice(0, 300), type: typeCol > -1 ? (rows[i][typeCol] || "").toString().trim() : "" });
    }
    return out;
  }

  /* ---------- render ---------- */
  function esc(s) { return (s == null ? "" : s.toString()).replace(/[&<>"'`]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "`": "&#96;" }[c]; }); }
  // SECURITY: only ever emit http(s) URLs into href attributes, HTML-escaped.
  // Blocks javascript:/data: URLs and attribute break-out from untrusted feed data.
  function safeUrl(u) {
    if (u == null) return "#";
    var str = String(u).trim();
    if (!/^https?:\/\//i.test(str)) return "#";
    try { var parsed = new URL(str); if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "#"; return esc(parsed.href); }
    catch (e) { return "#"; }
  }

  function badge(status, hitLabel, level) {
    if (status === "hit") return '<span class="badge hit-' + level + '"><span class="d"></span>' + hitLabel + "</span>";
    if (status === "rca") return '<span class="badge rca"><span class="d"></span>PEP-linked</span>';
    if (status === "possible") return '<span class="badge poss"><span class="d"></span>Possible</span>';
    if (status === "unavailable") return '<span class="badge chk"><span class="d"></span>Check</span>';
    return '<span class="badge no"><span class="d"></span>No</span>';
  }
  function dispBadge(d) {
    var info = DISPOSITIONS[d] || DISPOSITIONS.pending;
    return '<span class="disp ' + info.cls + '">' + info.label + "</span>";
  }

  function applyFilters() {
    var q = state.search.toLowerCase();
    state.filtered = state.results.filter(function (r) {
      if (state.filterRisk !== "all" && r.risk !== state.filterRisk) return false;
      if (q && r.name.toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }

  function renderResults() {
    show("resultsView");
    document.getElementById("fileNameLabel").textContent = state.fileName || "manual entry";
    // reference ID + audit context banner
    var rm = document.getElementById("runMeta");
    if (rm && state.run) {
      rm.innerHTML =
        '<span class="rm-ref">' + esc(state.run.refId) + "</span>" +
        '<span class="rm-sep">\u00b7</span><span>Analyst: <strong>' + esc(state.run.analyst || "Unattributed") + "</strong></span>" +
        '<span class="rm-sep">\u00b7</span><span>' + fmtTs(state.run.startedAt) + "</span>" +
        '<span class="rm-sep">\u00b7</span><span>List ' + (state.run.listLoaded ? "as-of " + fmtTs(state.run.listAsOf) : "<em>not loaded</em>") + "</span>";
    }
    var c = { total: state.results.length, High: 0, Medium: 0, Low: 0, Review: 0 };
    state.results.forEach(function (r) { c[r.risk]++; });
    var pend = (state.screening && state.pending) ? state.pending.length : 0;
    document.getElementById("statTotal").textContent = pend ? (c.total + " / " + (c.total + pend)) : c.total;
    document.getElementById("statHigh").textContent = c.High;
    document.getElementById("statMed").textContent = c.Medium;
    document.getElementById("statLow").textContent = c.Low;
    document.getElementById("statReview").textContent = c.Review;
    renderTable();
  }

  function adverseCell(r) {
    if (r.adverse.status === "checking") return '<span class="news-checking">checking\u2026</span>';
    if (r.adverse.status === "hit") return badge("hit", "Found", "med");
    // never claim "No" — give a working, pre-filtered Google News link to verify
    return '<a class="news-cell" target="_blank" rel="noopener" href="' + safeUrl(r.adverse.url) + '">News \u2197</a>';
  }

  function detectedType(r) {
    if (r.type) return esc(r.type);
    if ((r.company && r.company.isCompany) || (r.gleif && r.gleif.status === "resolved")) return "Company";
    return "\u2014";
  }
  function companySub(r) {
    var hasWd = r.company && (r.company.status === "resolved" || r.company.status === "unavailable");
    var hasGl = r.gleif && (r.gleif.status === "resolved" || r.gleif.status === "unavailable");
    if (!hasWd && !hasGl) return "";
    var a = officerAgg(r);
    var parts = [];
    if (a.ownerTotal) parts.push(a.ownerTotal + " owner/officer" + (a.ownerTotal === 1 ? "" : "s"));
    if (a.gleifTotal) parts.push(a.gleifTotal + " parent/subsidiary");
    if (!parts.length) {
      if ((r.company && r.company.status === "unavailable") || (r.gleif && r.gleif.status === "unavailable")) return '<div class="cell-sub">ownership lookup unavailable</div>';
      return '<div class="cell-sub">no owners/officers in open data</div>';
    }
    return '<div class="cell-sub"><span class="sub-ico">\u2387</span> ' + parts.join(" \u00b7 ") + " screened" +
      (a.flagged ? ' \u00b7 <span class="sub-flag">' + a.flagged + " flagged</span>" : "") + "</div>";
  }

  function renderTable() {
    applyFilters();
    var tb = document.getElementById("resultsBody");
    tb.innerHTML = "";
    var pending = (state.screening && state.pending) ? state.pending : [];
    document.getElementById("resultCount").textContent = state.filtered.length + " of " + state.results.length + " shown" + (state.screening ? " \u00b7 screening " + (pending.length ? pending.length + " more\u2026" : "\u2026") : "");
    if (!state.filtered.length && !pending.length) { tb.innerHTML = '<tr class="empty-row"><td colspan="8">No entries match this filter.</td></tr>'; return; }
    state.filtered.forEach(function (r) {
      var tr = document.createElement("tr");
      tr.onclick = function () { openDrawer(r); };
      var conf = hasSignal(r) ? '<span class="conf"><span class="conf-bar"><span style="width:' + r.confidence + '%"></span></span>' + r.confidence + '%</span>' : '<span class="conf-na">—</span>';
      tr.innerHTML =
        '<td><div class="cell-name">' + esc(r.name) + "</div>" + companySub(r) + "</td>" +
        '<td class="col-type cell-type">' + detectedType(r) + "</td>" +
        "<td>" + badge(r.sanctions.status, "Match", "high") + "</td>" +
        "<td>" + badge(r.pep.status, "PEP", "med") + "</td>" +
        "<td>" + adverseCell(r) + "</td>" +
        '<td class="col-conf">' + conf + "</td>" +
        '<td><span class="risk ' + r.risk + '"><span class="pill">' + r.risk + "</span></span></td>" +
        '<td class="col-disp">' + dispBadge(r.disposition) + "</td>";
      tb.appendChild(tr);
    });
    // names still being screened — live placeholder rows so the table is never blank/zeroed
    if (state.filterRisk === "all" && !state.search) {
      pending.slice(0, 40).forEach(function (nm) {
        var tr = document.createElement("tr");
        tr.style.opacity = "0.62";
        tr.innerHTML =
          '<td><div class="cell-name">' + esc(nm) + '</div><div class="cell-sub">screening live sources\u2026</div></td>' +
          '<td class="col-type cell-type">\u2014</td>' +
          '<td colspan="4"><span class="news-checking">checking sanctions \u00b7 PEP \u00b7 ownership\u2026</span></td>' +
          '<td><span class="conf-na">\u2026</span></td>' +
          '<td class="col-disp">\u2014</td>';
        tb.appendChild(tr);
      });
    }
  }

  /* ---------- drawer ---------- */
  function srcLink(url, label) { return url ? ' <a class="news-btn" target="_blank" rel="noopener" href="' + safeUrl(url) + '">' + esc(label) + "</a>" : ""; }

  function matchTypeLabel(t) {
    return { exact: "Exact match", "near-exact": "Near-exact (typo-tolerant)", phonetic: "Phonetic match (Soundex)", "phonetic/fuzzy": "Phonetic + fuzzy", fuzzy: "Fuzzy (edit-distance)" }[t] || "Fuzzy";
  }

  function chipClass(c) {
    if (c === "Sanctions" || c === "Sanctioned principal") return "c-sanc";
    if (c === "PEP" || c === "PEP-linked (RCA)" || c === "PEP principal") return "c-pep";
    if (c === "Adverse Media" || c === "Adverse-media principal") return "c-adv";
    return "c-none";
  }

  // mini badge for a single principal's finding in one category
  function ofcTag(label, status, tone) {
    if (status === "hit") return '<span class="mb mb-' + tone + '">' + label + "</span>";
    if (status === "possible") return '<span class="mb mb-poss">' + label + "?</span>";
    return "";
  }
  function officersBlock(r) {
    if (!r.company || r.company.status === "none") return "";
    var co = r.company;
    var html = '<div class="finding"><div class="ftop"><span class="ftitle">Ownership &amp; control \u2014 UBO / directors / officers</span>';
    if (co.status === "resolved") {
      var a = officerAgg(r);
      html += a.flagged
        ? '<span class="badge hit-high"><span class="d"></span>' + a.flagged + " of " + a.total + " flagged</span>"
        : '<span class="badge no"><span class="d"></span>' + a.total + " screened</span>";
    }
    html += "</div>";
    if (co.status === "unavailable") {
      html += '<div class="fbody">The ownership graph could not be retrieved this time. Check the company\u2019s owners and directors directly:</div>' +
        '<div class="news-links">' + srcLink(co.url, "Search corporate data").trim() + "</div></div>";
      return html;
    }
    var ofs = co.officers || [];
    if (!ofs.length) {
      html += '<div class="fbody">No owners, directors or officers were found for this company in open data. This is common for private companies \u2014 use a corporate registry for legal UBO.</div>' +
        '<div class="news-links">' + srcLink(co.url, "Open company record").trim() + "</div></div>";
      return html;
    }
    html += '<div class="fbody">Each owner, director and officer below was screened in their own right. The company inherits the highest risk found among them.</div>';
    html += '<div class="officers">' + ofs.map(function (o) {
      var tags = [
        ofcTag("Sanctioned", o.sanctions && o.sanctions.status, "sanc"),
        ofcTag("PEP", o.pep && o.pep.status, "pep"),
        ofcTag("Adverse media", o.adverse && o.adverse.status, "adv")
      ].filter(Boolean).join("");
      var flagged = !!tags;
      var skipped = o.adverse && o.adverse.status === "skip";
      if (!tags) tags = '<span class="mb mb-clear">no flags' + (skipped ? " (news not screened)" : "") + "</span>";
      var nq = encodeURIComponent('"' + o.name + '" (fraud OR sanctions OR arrested OR investigation OR lawsuit OR corruption OR charged)');
      return '<div class="officer-row' + (flagged ? " flag" : "") + '">' +
        '<div class="ofc-id"><span class="ofc-role">' + esc(o.role) + '</span><span class="ofc-name">' + esc(o.name) +
        (o.isPerson ? "" : ' <span class="ofc-org">org</span>') + "</span>" +
        (o.pep && o.pep.status === "hit" && o.pep.position ? '<span class="ofc-pos">' + esc(o.pep.position) + "</span>" : "") + "</div>" +
        '<div class="ofc-badges">' + tags +
        '<a class="ofc-link" target="_blank" rel="noopener" href="https://news.google.com/search?q=' + nq + '">news \u2197</a>' +
        "</div></div>";
    }).join("") + "</div>";
    html += '<div class="caveat">Coverage note: ownership &amp; officer links come from open data (Wikidata) and are incomplete \u2014 it captures listed public companies and notable firms far better than private ones. For a legally reliable beneficial-owner check, use a corporate registry or a licensed KYB/UBO data source.</div>';
    html += '<div class="news-links">' + srcLink(co.url, "Open company record").trim() + "</div></div>";
    return html;
  }

  function gleifBlock(r) {
    if (!r.gleif || r.gleif.status === "none") return "";
    var g = r.gleif;
    var html = '<div class="finding"><div class="ftop"><span class="ftitle">Corporate ownership chain \u2014 GLEIF / LEI</span>';
    if (g.status === "resolved") {
      var rel0 = g.related || [];
      var flagged = rel0.filter(function (x) { return x._flag; }).length +
        ((g.self && g.self.sanctions && (g.self.sanctions.status === "hit" || g.self.sanctions.status === "possible")) ? 1 : 0);
      html += flagged
        ? '<span class="badge hit-high"><span class="d"></span>' + flagged + " flagged</span>"
        : '<span class="badge no"><span class="d"></span>' + rel0.length + " linked</span>";
    }
    html += "</div>";
    if (g.status === "unavailable") {
      html += '<div class="fbody">The LEI ownership record could not be retrieved this time. Check it directly on GLEIF:</div>' +
        '<div class="news-links">' + srcLink(g.url, "Search GLEIF").trim() + "</div></div>";
      return html;
    }
    if (g.self) {
      var s = g.self;
      html += '<dl><dt>Legal entity</dt><dd>' + esc(s.name) +
        (s.sanctions && s.sanctions.status === "hit" ? ' <span class="mb mb-sanc">Sanctioned</span>' : "") + "</dd>" +
        '<dt>LEI</dt><dd><span class="mono-id">' + esc(s.lei) + "</span></dd>" +
        (s.jurisdiction ? "<dt>Jurisdiction</dt><dd>" + esc(s.jurisdiction) + "</dd>" : "") +
        (s.status ? "<dt>Registration</dt><dd>" + esc(s.status) + "</dd>" : "") + "</dl>";
    }
    var rel = g.related || [];
    if (!rel.length) {
      html += '<div class="fbody">No parent or subsidiary relationships are recorded in GLEIF for this entity.</div>';
    } else {
      html += '<div class="fbody">Related legal entities in the ownership chain, each screened for sanctions and adverse media:</div>';
      html += '<div class="officers">' + rel.map(function (x) {
        var tags = [
          (x.sanctions && x.sanctions.status === "hit") ? '<span class="mb mb-sanc">Sanctioned</span>' : (x.sanctions && x.sanctions.status === "possible" ? '<span class="mb mb-poss">Sanctions?</span>' : ""),
          (x.adverse && x.adverse.status === "hit") ? '<span class="mb mb-adv">Adverse media</span>' : ""
        ].filter(Boolean).join("");
        var flag = !!tags;
        var skipped = x.adverse && x.adverse.status === "skip";
        if (!tags) tags = '<span class="mb mb-clear">no flags' + (skipped ? " (news not screened)" : "") + "</span>";
        return '<div class="officer-row' + (flag ? " flag" : "") + '">' +
          '<div class="ofc-id"><span class="ofc-role">' + esc(x.relation) + '</span><span class="ofc-name">' + esc(x.name) + ' <span class="ofc-org">LEI</span></span>' +
          (x.jurisdiction || x.lei ? '<span class="ofc-pos">' + [esc(x.jurisdiction), esc(x.lei)].filter(Boolean).join("  \u00b7  ") + "</span>" : "") + "</div>" +
          '<div class="ofc-badges">' + tags + "</div></div>";
      }).join("") + "</div>";
    }
    html += '<div class="caveat">GLEIF records corporate ownership (parent &amp; subsidiary legal entities) under an open licence \u2014 it does <strong>not</strong> include natural-person beneficial owners. Combine it with the open-data owners above for fuller coverage.</div>';
    html += '<div class="news-links">' + srcLink(g.url, "Open GLEIF record").trim() + "</div></div>";
    return html;
  }

  function openDrawer(r) {
    state.activeId = r.id;
    document.getElementById("drawerName").textContent = r.name;
    document.getElementById("drawerMeta").textContent = (r.type || "Unspecified") + "  \u00b7  Overall risk: " + r.risk +
      (state.run ? "  \u00b7  Ref " + state.run.refId : "");

    // ---- match summary: confidence + categories ----
    var cats = (r.categories && r.categories.length) ? r.categories : ["No signal"];
    var html = '<div class="match-summary">';
    html += '<div class="ms-row"><span class="ms-k">Overall risk</span><span class="risk ' + r.risk + '"><span class="pill">' + r.risk + "</span></span></div>";
    if (hasSignal(r)) {
      html += '<div class="ms-row"><span class="ms-k">Match confidence</span><span class="conf big"><span class="conf-bar"><span style="width:' + r.confidence + '%"></span></span>' + r.confidence + '%</span></div>';
    }
    html += '<div class="ms-row"><span class="ms-k">Categories</span><span class="cat-chips">' +
      cats.map(function (c) { return '<span class="cat-chip ' + chipClass(c) + '">' + c + "</span>"; }).join("") + "</span></div>";
    html += "</div>";

    // Sanctions — the entity's OWN status combines the input-name screen with the
    // canonical legal name on its GLEIF/LEI record.
    var ownSanc = ownSanction(r), gSelfSanc = selfGleifSanc(r);
    html += '<div class="finding"><div class="ftop"><span class="ftitle">Sanctions screening</span>' + badge(ownSanc, "Match", "high") + "</div>";
    if (r.sanctions.status === "hit" || r.sanctions.status === "possible") {
      var sl = (r.sanctions.lists && r.sanctions.lists.length) ? r.sanctions.lists : (r.sanctions.list ? [r.sanctions.list] : []);
      var slTxt = sl.map(esc).join(" \u00b7 ") + (sl.length > 1 ? ' <em>(' + sl.length + ' lists)</em>' : "");
      html += "<dl><dt>Listed on</dt><dd>" + (slTxt || "—") + "</dd>" +
        (r.sanctions.jurisdiction ? "<dt>Jurisdiction</dt><dd>" + esc(r.sanctions.jurisdiction) + (r.sanctions.authority ? " \u00b7 " + esc(r.sanctions.authority) : "") + "</dd>" : "") +
        "<dt>Program</dt><dd>" + (esc(r.sanctions.program) || "—") +
        "</dd><dt>Matched name</dt><dd>" + esc(r.sanctions.matched) + "</dd><dt>Match method</dt><dd>" + matchTypeLabel(r.sanctions.matchType) +
        "</dd><dt>Confidence</dt><dd>" + Math.round((r.sanctions.score || 0) * 100) + "%</dd><dt>List version</dt><dd>" + fmtDate(r.sanctions.asOf) + "</dd></dl>";
      if (r.sanctions.status === "possible") html += '<div class="fbody">Below the auto-confirm threshold (92%) but above the review floor (84%) — a human must confirm or clear this against the official record.</div>';
    } else if (r.sanctions.status === "unavailable") {
      html += '<div class="fbody">The sanctions lists didn\'t download this time. Check this name directly on the official, free search:</div>';
    } else {
      html += '<div class="fbody">No match on the screened sanctions lists for the name as entered. Screened against the ' + (r.sanctions.asOf ? "list version dated " + fmtDate(r.sanctions.asOf) : "current list") + '.</div>';
    }
    if ((gSelfSanc === "hit" || gSelfSanc === "possible") && r.sanctions.status !== "hit" && r.sanctions.status !== "possible") {
      html += '<div class="fbody"><strong>' + (gSelfSanc === "hit" ? "Match on the canonical legal name." : "Possible match on the canonical legal name.") + '</strong> The official legal name on this entity\u2019s GLEIF/LEI record \u2014 \u201c' + esc(r.gleif.self.name) + '\u201d \u2014 ' + (gSelfSanc === "hit" ? "matches" : "is a near-match to") + ' a screened sanctions list even though the name as entered did not. This drives the entity\u2019s own risk ranking; confirm it against the official record below.</div>';
    }
    html += '<div class="news-links">' + srcLink(r.sanctions.url, "Open sanctions search").trim() + "</div></div>";

    // PEP / RCA
    html += '<div class="finding"><div class="ftop"><span class="ftitle">Politically Exposed Person</span>' + badge(r.pep.status, "PEP", "med") + "</div>";
    if (r.pep.status === "hit") {
      html += "<dl><dt>Position</dt><dd>" + esc(r.pep.position) + "</dd></dl>";
      if (r.pep.detail) html += '<div class="fbody">' + esc(r.pep.detail) + "</div>";
    } else if (r.pep.status === "rca") {
      html += '<div class="fbody"><strong>Relative / close associate of a PEP (RCA).</strong> Not a public office-holder themselves, but linked — within two relationship steps — to one or more politically exposed persons. Under FATF guidance, RCAs warrant the same enhanced due diligence as the PEP.</div>';
      html += '<div class="rca-list">' + (r.pep.relations || []).map(function (rel) {
        return '<div class="rca-rel"><span class="rca-tie">' + esc(rel.relation) + '</span><span class="rca-who"><strong>' + esc(rel.name) + "</strong>" + (rel.position ? ' \u2014 ' + esc(rel.position) : "") + "</span></div>";
      }).join("") + "</div>";
    } else if (r.pep.status === "unavailable") {
      html += '<div class="fbody">PEP lookup didn\'t respond. Try a manual check:</div>';
    } else {
      html += '<div class="fbody">No public office-holder record, and no close relative or associate holding office (checked two relationship levels deep — parents, children, siblings, grandparents, in-laws), found in open data.</div>';
      html += '<div class="caveat">Coverage note: PEP/RCA links here come from open data (Wikidata), which is incomplete for many individuals and family ties. “No match” is not a guarantee — a licensed PEP database is needed for full RCA assurance.</div>';
    }
    html += '<div class="news-links">' + srcLink(r.pep.url, "Open source").trim() + "</div></div>";

    // Adverse media
    var advChecking = r.adverse.status === "checking";
    html += '<div class="finding"><div class="ftop"><span class="ftitle">Adverse / negative media</span>' + (advChecking ? '<span class="news-checking">checking\u2026</span>' : badge(r.adverse.status, "Found", "med")) + "</div>";
    if (advChecking) {
      html += '<div class="fbody">Searching live negative-news sources for this name\u2026 results will appear here in a moment.</div>';
    } else if (r.adverse.status === "hit") {
      html += '<div class="fbody">' + esc(r.adverse.summary) + (r.adverse.source ? ' <span class="src-tag">via ' + esc(r.adverse.source) + '</span>' : "") + "</div>";
    } else if (r.adverse.articles && r.adverse.articles.length) {
      html += '<div class="fbody">No explicit wrongdoing terms in the latest headlines, but here is the recent coverage \u2014 review it:</div>';
    } else {
      html += '<div class="fbody">Open the live negative-news search for this name \u2014 pre-filtered for adverse terms (fraud, allegations, arrests, lawsuits, sanctions, notices, jail\u2026):</div>';
    }
    if (r.adverse.articles && r.adverse.articles.length) {
      html += '<div class="articles">' + r.adverse.articles.map(function (a) {
        var meta = [a.domain, a.when].filter(Boolean).join("  \u00b7  ");
        return '<a class="article' + (a.adverse ? " flag" : "") + '" target="_blank" rel="noopener" href="' + safeUrl(a.url) + '">' +
          '<span class="a-title">' + esc(a.title) + '</span>' +
          (a.snippet ? '<span class="a-snip">' + esc(a.snippet.length > 220 ? a.snippet.slice(0, 217) + "\u2026" : a.snippet) + '</span>' : "") +
          '<span class="a-dom">' + esc(meta) + ' <span class="a-open">open \u2197</span></span></a>';
      }).join("") + "</div>";
    }
    var nq = encodeURIComponent('"' + r.name + '" (fraud OR allegation OR arrested OR jailed OR investigation OR lawsuit OR sanctions OR corruption OR charged OR convicted OR probe OR penalty OR scandal OR notice OR banned)');
    html += '<div class="news-links">' +
      '<a class="news-btn primary" target="_blank" rel="noopener" href="https://news.google.com/search?q=' + nq + '">Full news search \u2197</a>' +
      '<span class="news-hint">Headlines shown above are live. Opening the full search starts a new browser tab; inside this preview the link is copied to your clipboard instead.</span>' +
      "</div></div>";

    // ---- ownership & control (companies only) ----
    html += officersBlock(r);
    html += gleifBlock(r);

    // ---- disposition workflow ----
    html += '<div class="finding disp-block"><div class="ftop"><span class="ftitle">Analyst disposition</span>' + dispBadge(r.disposition) + "</div>";
    if (hasSignal(r)) {
      html += '<div class="fbody">Record the review decision for this alert. The decision, reviewer and time are written to the screening log.</div>';
      html += '<div class="disp-actions">' +
        dispBtn(r, "confirmed", "Confirm match") +
        dispBtn(r, "escalated", "Escalate") +
        dispBtn(r, "false_positive", "False positive") +
        dispBtn(r, "cleared", "Clear") +
        "</div>";
      html += '<textarea class="disp-note" id="dispNote" placeholder="Reviewer note (optional)\u2026">' + esc(r.note || "") + "</textarea>";
      if (r.reviewer || r.reviewedAt) {
        html += '<div class="disp-meta">Last decision: <strong>' + (DISPOSITIONS[r.disposition] || {}).label + "</strong> by " + esc(r.reviewer || "—") + "  \u00b7  " + fmtTs(r.reviewedAt) + "</div>";
      }
    } else {
      html += '<div class="fbody">No screening signal returned — auto-recorded as <strong>No match</strong>. No analyst action required.</div>';
    }
    html += "</div>";

    document.getElementById("drawerBody").innerHTML = html;
    document.getElementById("drawer").classList.add("open");
    document.getElementById("drawerBackdrop").classList.add("open");
  }
  function dispBtn(r, key, label) {
    var active = r.disposition === key ? " active" : "";
    return '<button class="disp-btn ' + (DISPOSITIONS[key] || {}).cls + active + '" data-disp-id="' + esc(r.id) + '" data-disp-key="' + esc(key) + '">' + label + "</button>";
  }
  window.setDisposition = function (id, key) {
    var r = state.results.find(function (x) { return x.id === id; });
    if (!r) return;
    var note = document.getElementById("dispNote");
    r.disposition = key;
    r.reviewer = getAnalyst() || "Unattributed";
    r.reviewedAt = Date.now();
    if (note) r.note = note.value;
    if (state.run) { state.run.entries = state.results; upsertRun(state.run); }
    renderTable();
    openDrawer(r);
  };
  function closeDrawer() { document.getElementById("drawer").classList.remove("open"); document.getElementById("drawerBackdrop").classList.remove("open"); }

  /* ---------- export (audit-grade) ---------- */
  function sStatus(x) { return x.status === "hit" ? "Yes" : (x.status === "rca" ? "Relative/associate" : (x.status === "possible" ? "Possible" : (x.status === "unavailable" ? "Not checked" : "No"))); }
  function pepDetail(r) {
    if (r.pep.status === "hit") return r.pep.position || "";
    if (r.pep.status === "rca") return (r.pep.relations || []).map(function (rel) { return rel.relation + ": " + rel.name + (rel.position ? " (" + rel.position + ")" : ""); }).join("; ");
    return "";
  }
  function officerFindingsText(r) {
    if (!r.company || !r.company.officers) return "";
    return r.company.officers.filter(function (o) { return o._flag; }).map(function (o) {
      var fl = [];
      if (o.sanctions && o.sanctions.status === "hit") fl.push("Sanctioned");
      else if (o.sanctions && o.sanctions.status === "possible") fl.push("Possible sanctions");
      if (o.pep && o.pep.status === "hit") fl.push("PEP");
      if (o.adverse && o.adverse.status === "hit") fl.push("Adverse media");
      return o.role + ": " + o.name + " [" + fl.join(", ") + "]";
    }).join("; ");
  }
  function runHeaderAOA(run) {
    var rows = [
      ["AML / SANCTIONS SCREENING RECORD"],
      ["Reference ID", run.refId],
      ["Screened by (analyst)", run.analyst || "Unattributed"],
      ["Screening started", fmtDate(run.startedAt)],
      ["Screening completed", fmtDate(run.finishedAt)],
      ["Source file", run.fileName],
      ["Names screened", run.total],
      [],
      ["Sanctions data source", run.listSource],
      ["Most recent list update (as-of)", run.listLoaded ? fmtDate(run.listAsOf) : "NOT LOADED — manual check required"],
      ["Total designations loaded", run.listCount ? run.listCount.toLocaleString() : "0"]
    ];
    var ls = run.lists || [];
    if (ls.length) {
      rows.push([]);
      rows.push(["SANCTIONS LISTS SCREENED (" + ls.length + ")"]);
      rows.push(["List", "Jurisdiction / authority", "Designations", "List as-of"]);
      ls.forEach(function (l) {
        rows.push([l.label, (l.jurisdiction || "") + (l.authority ? " — " + l.authority : ""), (l.count || 0).toLocaleString(), fmtDate(l.asOf)]);
      });
    }
    if (run.listsFailed && run.listsFailed.length) {
      rows.push([]);
      rows.push(["Lists that did not download this run", run.listsFailed.join("; ")]);
    }
    rows.push([]);
    rows.push(["PEP source", "Wikidata (live)"]);
    rows.push(["Adverse media source", "Google News (live)"]);
    rows.push(["Match logic", "Exact + transliteration fold + Soundex phonetic + Levenshtein, with a length/literal corroboration gate. Auto-confirm ≥92%, review band 84–92%."]);
    rows.push([]);
    rows.push(["Generated", fmtDate(Date.now())]);
    return rows;
  }
  function gleifFindingsText(r) {
    if (!r.gleif || r.gleif.status !== "resolved") return "";
    return (r.gleif.related || []).map(function (x) {
      var fl = [];
      if (x.sanctions && x.sanctions.status === "hit") fl.push("Sanctioned");
      else if (x.sanctions && x.sanctions.status === "possible") fl.push("Possible sanctions");
      if (x.adverse && x.adverse.status === "hit") fl.push("Adverse media");
      return x.relation + ": " + x.name + (x.lei ? " (" + x.lei + ")" : "") + (fl.length ? " [" + fl.join(", ") + "]" : "");
    }).join("; ");
  }
  function buildExportRows() {
    return state.results.map(function (r) {
      return {
        "Reference ID": state.run ? state.run.refId : "",
        "Name": r.name, "Type": r.type || "",
        "Overall Risk": r.risk,
        "Match Confidence %": hasSignal(r) ? r.confidence : "",
        "Categories": (r.categories || []).join("; "),
        "Sanctions Match": sStatus(r.sanctions),
        "Sanctions Score %": (r.sanctions.status === "hit" || r.sanctions.status === "possible") ? Math.round((r.sanctions.score || 0) * 100) : "",
        "Sanctions Match Method": (r.sanctions.status === "hit" || r.sanctions.status === "possible") ? matchTypeLabel(r.sanctions.matchType) : "",
        "Sanctions List(s)": (r.sanctions.status === "hit" || r.sanctions.status === "possible") ? ((r.sanctions.lists && r.sanctions.lists.length ? r.sanctions.lists : [r.sanctions.list]).join("; ")) : "",
        "Sanctions Jurisdiction": (r.sanctions.status === "hit" || r.sanctions.status === "possible") ? (r.sanctions.jurisdiction || "") : "",
        "Sanctions Program": (r.sanctions.status === "hit" || r.sanctions.status === "possible") ? (r.sanctions.program || "") : "",
        "Matched Entry": (r.sanctions.status === "hit" || r.sanctions.status === "possible") ? (r.sanctions.matched || "") : "",
        "List Version (as-of)": state.run && state.run.listLoaded ? fmtDate(state.run.listAsOf) : "",
        "PEP": sStatus(r.pep),
        "PEP / RCA Detail": pepDetail(r),
        "Detected Type": (r.company && r.company.isCompany) ? "Company" : (r.type || "Individual"),
        "Principals Screened": (r.company && r.company.officers) ? r.company.officers.length : "",
        "Flagged Principals": officerAgg(r).flagged || "",
        "Principal Findings": officerFindingsText(r),
        "LEI": (r.gleif && r.gleif.self) ? r.gleif.self.lei : "",
        "Corporate Ownership (GLEIF)": gleifFindingsText(r),
        "Negative News": r.adverse.status === "hit" ? "Yes" : "Review link",
        "Negative News Summary": r.adverse.status === "hit" ? r.adverse.summary : "",
        "Negative News Search": r.adverse.url || "",
        "Disposition": (DISPOSITIONS[r.disposition] || {}).label || r.disposition,
        "Reviewer": r.reviewer || "",
        "Reviewed At": r.reviewedAt ? fmtDate(r.reviewedAt) : "",
        "Reviewer Note": r.note || ""
      };
    });
  }
  // SECURITY: neutralise spreadsheet formula injection (CSV/XLSX "=HYPERLINK(...)" etc.)
  // in any cell that came from uploaded files or third-party feeds.
  function cellSafe(v) {
    if (typeof v !== "string") return v;
    return /^[=+\-@\t\r|%]/.test(v) ? "'" + v : v;
  }
  function sanitizeRows(rows) {
    return rows.map(function (row) {
      if (Array.isArray(row)) return row.map(cellSafe);
      var o = {}; Object.keys(row).forEach(function (k) { o[k] = cellSafe(row[k]); }); return o;
    });
  }
  function exportFile(type) {
    var wb = XLSX.utils.book_new();
    if (state.run) {
      var hs = XLSX.utils.aoa_to_sheet(sanitizeRows(runHeaderAOA(state.run)));
      hs["!cols"] = [{ wch: 32 }, { wch: 64 }];
      XLSX.utils.book_append_sheet(wb, hs, "Audit Record");
    }
    var ws = XLSX.utils.json_to_sheet(sanitizeRows(buildExportRows()));
    ws["!cols"] = [{ wch: 20 }, { wch: 26 }, { wch: 9 }, { wch: 11 }, { wch: 13 }, { wch: 24 }, { wch: 13 }, { wch: 12 }, { wch: 22 }, { wch: 22 }, { wch: 16 }, { wch: 26 }, { wch: 22 }, { wch: 7 }, { wch: 22 }, { wch: 13 }, { wch: 40 }, { wch: 48 }, { wch: 16 }, { wch: 16 }, { wch: 22 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, ws, "Screening Results");
    var base = state.run ? state.run.refId : (state.fileName || "screening").replace(/\.[^.]+$/, "");
    XLSX.writeFile(wb, base + "." + (type === "csv" ? "csv" : "xlsx"), { bookType: type === "csv" ? "csv" : "xlsx" });
  }

  // full cross-run audit log export
  function exportAuditLog() {
    var log = loadLog();
    if (!log.length) { alert("The screening log is empty."); return; }
    var rows = [];
    log.forEach(function (run) {
      (run.entries || []).forEach(function (r) {
        rows.push({
          "Reference ID": run.refId,
          "Screened By": run.analyst || "Unattributed",
          "Screened At": fmtDate(run.startedAt),
          "Source File": run.fileName,
          "List Source": run.listSource,
          "List Version (as-of)": run.listLoaded ? fmtDate(run.listAsOf) : "not loaded",
          "Name": r.name, "Type": r.type || "",
          "Overall Risk": r.risk,
          "Confidence %": hasSignal(r) ? r.confidence : "",
          "Categories": (r.categories || []).join("; "),
          "Sanctions": sStatus(r.sanctions),
          "PEP": sStatus(r.pep),
          "Adverse Media": r.adverse.status === "hit" ? "Yes" : "No/Review",
          "Disposition": (DISPOSITIONS[r.disposition] || {}).label || r.disposition,
          "Reviewer": r.reviewer || "",
          "Reviewed At": r.reviewedAt ? fmtDate(r.reviewedAt) : "",
          "Note": r.note || ""
        });
      });
    });
    var ws = XLSX.utils.json_to_sheet(sanitizeRows(rows));
    ws["!cols"] = [{ wch: 20 }, { wch: 16 }, { wch: 20 }, { wch: 20 }, { wch: 26 }, { wch: 20 }, { wch: 24 }, { wch: 9 }, { wch: 9 }, { wch: 11 }, { wch: 16 }, { wch: 10 }, { wch: 7 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 20 }, { wch: 30 }];
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Audit Log");
    XLSX.writeFile(wb, "screening_audit_log_" + new Date().toISOString().slice(0, 10) + ".xlsx");
  }

  function downloadSample() {
    var ws = XLSX.utils.aoa_to_sheet(window.SAMPLE_ROWS);
    ws["!cols"] = [{ wch: 24 }, { wch: 10 }];
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Names");
    XLSX.writeFile(wb, "sample_names.xlsx");
  }

  /* ---------- analyst identity ---------- */
  function reflectAnalyst() {
    var a = getAnalyst();
    var el = document.getElementById("analystLabel");
    if (el) el.textContent = a ? a : "Set analyst";
    var btn = document.getElementById("analystBtn");
    if (btn) btn.classList.toggle("unset", !a);
  }
  function openIdentity(forScreening) {
    var m = document.getElementById("identityModal");
    document.getElementById("analystInput").value = getAnalyst();
    m.setAttribute("data-for-screening", forScreening ? "1" : "");
    m.classList.add("open");
    setTimeout(function () { document.getElementById("analystInput").focus(); }, 60);
  }
  function closeIdentity() { document.getElementById("identityModal").classList.remove("open"); }
  function saveIdentity() {
    var v = document.getElementById("analystInput").value.trim();
    if (!v) { document.getElementById("analystInput").focus(); return; }
    setAnalyst(v); reflectAnalyst();
    var m = document.getElementById("identityModal");
    var pend = m.getAttribute("data-for-screening") === "1";
    closeIdentity();
    if (pend && pendingEntries) { var e = pendingEntries; pendingEntries = null; screenEntries(e); }
  }

  /* ---------- screening log ---------- */
  function openLog() { renderLog(); document.getElementById("logModal").classList.add("open"); }
  function closeLog() { document.getElementById("logModal").classList.remove("open"); }
  function renderLog() {
    var log = loadLog().slice().reverse();
    var body = document.getElementById("logBody");
    document.getElementById("logCount").textContent = log.length + " run" + (log.length === 1 ? "" : "s") + " recorded";
    if (!log.length) { body.innerHTML = '<div class="log-empty">No screenings recorded yet. Every screening you run is logged here with a reference ID, analyst, list version and per-name disposition.</div>'; return; }
    body.innerHTML = log.map(function (run) {
      var ents = run.entries || [];
      var hi = ents.filter(function (r) { return r.risk === "High"; }).length;
      var pend = ents.filter(function (r) { return r.disposition === "pending"; }).length;
      return '<div class="log-row" data-ref-id="' + esc(run.refId) + '">' +
        '<div class="lr-main"><div class="lr-ref">' + esc(run.refId) + "</div>" +
        '<div class="lr-sub">' + fmtTs(run.startedAt) + "  \u00b7  " + esc(run.analyst || "Unattributed") + "  \u00b7  " + run.total + " name" + (run.total === 1 ? "" : "s") + "  \u00b7  " + esc(run.fileName) +
        "  \u00b7  list " + (run.listLoaded ? "as-of " + fmtTs(run.listAsOf) : "not loaded") + "</div></div>" +
        '<div class="lr-stats">' +
        (hi ? '<span class="lr-pill high">' + hi + " high</span>" : "") +
        (pend ? '<span class="lr-pill pend">' + pend + " pending</span>" : '<span class="lr-pill done">reviewed</span>') +
        "</div></div>";
    }).join("");
  }
  window.openLogRun = function (refId) {
    var run = loadLog().find(function (r) { return r.refId === refId; });
    if (!run) return;
    state.run = run; state.results = run.entries || []; state.fileName = run.fileName;
    state.search = ""; state.filterRisk = "all";
    document.getElementById("searchInput").value = ""; document.getElementById("riskFilter").value = "all";
    closeLog(); renderResults();
  };
  function clearLog() {
    if (!confirm("Clear the entire local screening log? Export it first if you need the audit record. This cannot be undone.")) return;
    saveLog([]); renderLog();
  }

  /* ---------- source status UI ---------- */
  function refreshSourceUI() {
    var meta = window.Sources.sanctionsMeta();
    var pill = document.getElementById("livePill");
    var t = pill.querySelector(".txt");
    var banner = document.getElementById("sourceBanner");
    if (meta.loaded) {
      pill.classList.add("on");
      t.textContent = "Live \u00b7 " + ((meta.lists || []).length) + " lists as-of " + new Date(meta.asOf).toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" });
      if (banner) {
        banner.className = "src-banner ok";
        var topLists = (meta.lists || []).slice(0, 6).map(function (l) { return l.label + " (" + l.count.toLocaleString() + ")"; }).join(" \u00b7 ");
        var nLists = (meta.lists || []).length;
        var more = nLists > 6 ? " \u00b7 +" + (nLists - 6) + " more" : "";
        banner.innerHTML = "<strong>" + nLists + " official sanctions lists loaded \u2014 most recent update " + fmtDate(meta.asOf) + ".</strong> " +
          (meta.designations || meta.count || 0).toLocaleString() + " designations across: " + topLists + more +
          ". PEP: Wikidata (live). Adverse media: Google News (live). The per-list as-of dates are recorded on every screening reference.";
      }
    } else if (meta.tried) {
      pill.classList.remove("on");
      t.textContent = "Live: PEP + News";
      if (banner) { banner.className = "src-banner warn"; banner.innerHTML = "<strong>PEP (Wikidata) and adverse media (live Google News) are active.</strong> The sanctions lists didn't download this time \u2014 the run is flagged in the audit record and each name has a 1-click <em>sanctions search</em> link. Re-run to retry the download."; }
    } else {
      pill.classList.remove("on");
      t.textContent = "Free live sources";
      if (banner) banner.className = "src-banner";
    }
  }

  function show(view) {
    state.view = view;
    ["uploadView", "progressView", "resultsView"].forEach(function (v) { document.getElementById(v).style.display = v === view ? "" : "none"; });
    window.scrollTo(0, 0);
  }
  function reset() { state.results = []; state.search = ""; state.filterRisk = "all"; document.getElementById("searchInput").value = ""; document.getElementById("riskFilter").value = "all"; show("uploadView"); }

  /* ---------- wire up ---------- */
  function init() {
    var fi = document.getElementById("fileInput");
    document.getElementById("browseBtn").onclick = function () { fi.click(); };
    fi.onchange = function () { if (fi.files[0]) parseFile(fi.files[0]); };

    var dz = document.getElementById("dropzone");
    ["dragenter", "dragover"].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add("drag"); }); });
    ["dragleave", "drop"].forEach(function (ev) { dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove("drag"); }); });
    dz.addEventListener("drop", function (e) { if (e.dataTransfer.files[0]) parseFile(e.dataTransfer.files[0]); });

    // single-name check
    function checkOne() {
      var v = document.getElementById("singleName").value.trim();
      if (!v) return;
      state.fileName = "manual entry";
      screenEntries([{ name: v, type: "" }]);
    }
    document.getElementById("singleBtn").onclick = checkOne;
    document.getElementById("singleName").addEventListener("keydown", function (e) { if (e.key === "Enter") checkOne(); });

    document.getElementById("sampleBtn").onclick = downloadSample;
    document.getElementById("sampleBtn2").onclick = downloadSample;
    document.getElementById("newBtn").onclick = reset;
    document.getElementById("exportXlsxBtn").onclick = function () { exportFile("xlsx"); };
    document.getElementById("exportCsvBtn").onclick = function () { exportFile("csv"); };

    document.getElementById("searchInput").oninput = function (e) { state.search = e.target.value; renderTable(); };
    document.getElementById("riskFilter").onchange = function (e) { state.filterRisk = e.target.value; renderTable(); };

    [["cardHigh", "High"], ["cardMed", "Medium"], ["cardLow", "Low"], ["cardReview", "Review"], ["cardTotal", "all"]].forEach(function (p) {
      var el = document.getElementById(p[0]); if (!el) return;
      el.onclick = function () {
        state.filterRisk = p[1]; document.getElementById("riskFilter").value = p[1];
        document.querySelectorAll(".card.clickable").forEach(function (c) { c.classList.remove("active"); });
        el.classList.add("active"); renderTable();
      };
    });

    document.getElementById("drawerClose").onclick = closeDrawer;
    document.getElementById("drawerBackdrop").onclick = closeDrawer;
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") { closeDrawer(); closeIdentity(); closeLog(); if (window.closeModal) window.closeModal(); } });

    // info modal
    var modal = document.getElementById("settingsModal");
    document.getElementById("settingsBtn").onclick = function () { modal.classList.add("open"); };
    window.closeModal = function () { modal.classList.remove("open"); };
    document.getElementById("settingsClose").onclick = window.closeModal;
    modal.onclick = function (e) { if (e.target === modal) window.closeModal(); };

    // analyst identity
    reflectAnalyst();
    document.getElementById("analystBtn").onclick = function () { openIdentity(false); };
    document.getElementById("identitySave").onclick = saveIdentity;
    document.getElementById("identityCancel").onclick = closeIdentity;
    document.getElementById("analystInput").addEventListener("keydown", function (e) { if (e.key === "Enter") saveIdentity(); });
    var idm = document.getElementById("identityModal");
    idm.onclick = function (e) { if (e.target === idm) closeIdentity(); };

    // screening log
    document.getElementById("logBtn").onclick = openLog;
    document.getElementById("logClose").onclick = closeLog;
    document.getElementById("exportLogBtn").onclick = exportAuditLog;
    document.getElementById("clearLogBtn").onclick = clearLog;
    var lm = document.getElementById("logModal");
    lm.onclick = function (e) { if (e.target === lm) closeLog(); };

    // warm up sanctions data in the background
    window.Sources.ensureSanctions().then(refreshSourceUI);
    refreshSourceUI();
    show("uploadView");
  }

  // run now if the DOM is already parsed (e.g. bundled/inlined single-file build),
  // otherwise wait for it
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
