// Cables & Aluminium Market Watch — renders data/news.json, data/projects.json, data/prices.json
// and data/watchlist.json. No build step, no dependencies.

const $ = (id) => document.getElementById(id);
const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const fmt = (n, d = 0) => (n == null ? "–" : n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }));
const pct = (a, b) => (a == null || !b ? null : ((a - b) / b) * 100);
const fmtDate = (iso, opts = { day: "numeric", month: "short", year: "numeric" }) =>
  new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString("en-GB", opts);
const shortDate = (iso) => fmtDate(iso, { day: "numeric", month: "short" });
const DAY = 86_400_000;

// Arrow + sign + colour, so direction never relies on colour alone.
const change = (abs, rel, d = 0) => {
  if (abs == null) return "–";
  const cls = abs > 0 ? "up" : abs < 0 ? "down" : "";
  const arrow = abs > 0 ? "▲" : abs < 0 ? "▼" : "■";
  const sign = abs > 0 ? "+" : "";
  const r = rel == null ? "" : ` (${sign}${rel.toFixed(1)}%)`;
  return `<span class="${cls}">${arrow} ${sign}${fmt(abs, d)}${r}</span>`;
};

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
};

const load = (f) => fetch(f, { cache: "no-cache" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
// Live data comes from /api/live (Vercel function, CDN-cached ~10 min). When it is unavailable
// (e.g. a plain static server), the page falls back to the snapshot the collector commits.
const LIVE_URL = "api/live";
const REFRESH_MS = 10 * 60 * 1000;
const [live0, projectsData, watch, competitorsData, runReport] = await Promise.all([
  load(LIVE_URL),
  load("data/projects.json"),
  load("data/watchlist.json"),
  load("data/competitors.json"),
  load("data/run-report.json"),
]);
let liveMeta = live0?.news ? live0.live : null;
let news = live0?.news ?? (await load("data/news.json"));
let prices = live0?.prices ?? (await load("data/prices.json"));
const openedAt = Date.now();

const lastVisit = Number(store.get("cmw:lastVisit")) || 0;
store.set("cmw:lastVisit", String(Date.now()));

let allItems = news?.items ?? [];
const MARKETS = ["Middle East", "Asia", "Africa", "Europe", "Canada", "USA", "Latin America", "Oceania"];
let market = store.get("cmw:market") || "";
if (market && !MARKETS.includes(market)) market = "";
const inMarket = (i) => !market || (i.markets ?? []).includes(market);
// Every section reads `items`, which follows the selected market.
let items = allItems.filter(inMarket);
const cats = news?.categories ?? {};
const companyRoles = new Map((news?.companies ?? []).map((c) => [c.name, c.role]));
let al = prices?.metals?.aluminium?.series ?? [];
let cu = prices?.metals?.copper?.series ?? [];
const back = (s, n) => s[Math.max(0, s.length - 1 - n)];
const since = (days) => Date.now() - days * DAY;
const isNew = (i) => lastVisit && Date.parse(i.firstSeen) > lastVisit;
const link = (i) => `<a href="${esc(i.url)}" target="_blank" rel="noopener"${i.lang === "ar" ? ' dir="rtl" lang="ar"' : ""}>${esc(i.title)}</a>`;
// Deal flow keeps grid, tender and competitor news; demand items only when they name a tracked company.
const DEAL_CATS = ["projects", "tenders", "competitors", "midal"];
const isDeal = (i) => i.stage && (i.categories.some((c) => DEAL_CATS.includes(c)) || (i.companies ?? []).length > 0);
const stageBadge = (s) => (s ? `<span class="stage s-${s.toLowerCase()}">${esc(s)}</span>` : "");

const hhmm = (iso) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
function setStamp() {
  const sinceOpen = allItems.filter((i) => Date.parse(i.firstSeen) > openedAt).length;
  const parts = liveMeta
    ? [
        `<span class="live-dot" aria-hidden="true"></span><b>Live</b> · checked ${hhmm(liveMeta.checkedAt)}`,
        `${liveMeta.ok}/${liveMeta.sources} sources`,
        sinceOpen ? `<b>${sinceOpen} new since you opened the page</b>` : "",
      ]
    : [news?.generatedAt && `Snapshot · news refreshed ${fmtDate(news.generatedAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`];
  parts.push(al.length ? `LME official to ${fmtDate(al.at(-1).date)}` : "");
  $("stamp").innerHTML = parts.filter(Boolean).join(" · ");
}
setStamp();

// ================================================================ brief

function brief() {
  const out = [];
  const week = items.filter((i) => Date.parse(i.published) >= since(7));
  const deals = week.filter(isDeal);
  const count = (s) => deals.filter((i) => i.stage === s).length;
  if (deals.length) {
    const top = deals.filter((i) => i.stage === "Award" || i.stage === "Tender").slice(0, 3);
    out.push(`<strong>Deal flow, last 7 days:</strong> ${count("Award")} award${count("Award") === 1 ? "" : "s"}, ${count("Tender")} tender${count("Tender") === 1 ? "" : "s"}, ${count("Construction")} in construction, ${count("Commissioned")} commissioned, ${count("Plan")} plan${count("Plan") === 1 ? "" : "s"}.` +
      (top.length ? `<ul>${top.map((i) => `<li>${stageBadge(i.stage)} ${link(i)}${i.value ? ` — <b>${esc(i.value)}</b>` : ""}</li>`).join("")}</ul>` : ""));
  } else {
    out.push("<strong>Deal flow:</strong> no tenders or awards picked up in the last 7 days.");
  }

  const month = items.filter((i) => Date.parse(i.published) >= since(30));
  const comp = new Map();
  for (const i of month) for (const c of i.companies ?? []) if (companyRoles.get(c) === "competitor") comp.set(c, (comp.get(c) ?? 0) + 1);
  const topComp = [...comp].sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (topComp.length) out.push(`<strong>Most active competitors (30 days):</strong> ${topComp.map(([n, k]) => `${esc(n)} (${k})`).join(", ")}.`);

  const gov = week.filter((i) => i.categories.includes("government"));
  if (gov.length) out.push(`<strong>Government &amp; utility plans:</strong> ${gov.length} new item${gov.length === 1 ? "" : "s"} this week, latest: ${link(gov[0])}.`);

  const midal = month.filter((i) => i.categories.includes("midal"));
  out.push(midal.length ? `<strong>Midal mentions (30 days):</strong> ${midal.length}, latest: ${link(midal[0])}.` : "<strong>Midal mentions:</strong> none in the last 30 days.");

  if (al.length > 1) {
    const [p, l] = [al.at(-2), al.at(-1)];
    const spread = l.cash - l.m3;
    let line = `<strong>Metals:</strong> LME aluminium $${fmt(l.cash, 1)}/t ${change(l.cash - p.cash, pct(l.cash, p.cash), 1)}, ${spread > 0 ? "backwardation" : "contango"} ${spread >= 0 ? "+" : ""}${fmt(spread, 1)}`;
    if (cu.length) line += `; copper $${fmt(cu.at(-1).cash, 1)}/t, ${(cu.at(-1).cash / l.cash).toFixed(2)}× aluminium`;
    out.push(`${line}.`);
  }
  $("brief").innerHTML = out.map((l) => `<li>${l}</li>`).join("");
}

// ================================================================ deal flow

const STAGES = ["Tender", "Award", "Construction", "Commissioned", "Plan"];
let stage = store.get("cmw:stage") || "";
function renderDeals() {
  const deals = items.filter((i) => isDeal(i) && Date.parse(i.published) >= since(60));
  $("stages").innerHTML = [["", "All"], ...STAGES.map((s) => [s, s])]
    .map(([k, l]) => `<button data-stage="${k}" aria-pressed="${k === stage}">${l}<span class="n">${k ? deals.filter((i) => i.stage === k).length : deals.length}</span></button>`)
    .join("");
  const list = deals.filter((i) => !stage || i.stage === stage).slice(0, 60);
  $("deals").innerHTML = `<thead><tr><th>Date</th><th>Stage</th><th>Deal</th><th>Value</th><th>Where</th><th>Companies</th></tr></thead><tbody>${
    list.length
      ? list.map((i) => `<tr>
          <td data-l="Date">${shortDate(i.published)}</td>
          <td data-l="Stage">${stageBadge(i.stage)}</td>
          <td data-l="Deal" class="deal">${link(i)}<span class="pub">${esc(i.publisher)}</span></td>
          <td data-l="Value" class="val">${esc(i.value ?? "–")}</td>
          <td data-l="Where">${esc(i.regions.join(", ") || "–")}</td>
          <td data-l="Companies">${esc((i.companies ?? []).join(", ") || "–")}</td></tr>`).join("")
      : `<tr><td colspan="6" class="empty">No deals at this stage in the last 60 days.</td></tr>`
  }</tbody>`;
}
$("stages").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  stage = b.dataset.stage;
  store.set("cmw:stage", stage);
  renderDeals();
});

// ================================================================ project tracker

const projects = projectsData?.projects ?? [];
const P_STAGES = ["Plan", "Tender", "Award", "Construction", "Commissioning", "Operating"];
$("p-country").insertAdjacentHTML("beforeend", [...new Set(projects.map((p) => p.country))].sort().map((c) => `<option>${esc(c)}</option>`).join(""));
$("p-status").insertAdjacentHTML("beforeend", P_STAGES.filter((s) => projects.some((p) => p.status === s)).map((s) => `<option>${s}</option>`).join(""));
const projectsHint = () => {
  const n = projects.filter((p) => !market || p.market === market).length;
  $("projects-hint").textContent = `${n} major grid and power project${n === 1 ? "" : "s"}${market ? ` in ${market}` : " across all markets"}, curated with sources (reviewed ${fmtDate(projectsData?.asOf ?? new Date().toISOString())}). Edit data/projects.json to add more.`;
};
function renderProjects() {
  const c = $("p-country").value, s = $("p-status").value;
  const list = projects.filter((p) => (!market || p.market === market) && (!c || p.country === c) && (!s || p.status === s));
  $("projects").innerHTML = list.length
    ? list.map((p) => `<article class="project">
        <div class="p-top">${stageBadge(p.status)}<span class="muted">${esc(p.country)}</span></div>
        <h3>${esc(p.name)}</h3>
        <dl>
          <dt>Owner</dt><dd>${esc(p.owner)}</dd>
          <dt>Value</dt><dd>${esc(p.value)}</dd>
          ${p.parties && p.parties !== "—" ? `<dt>Parties</dt><dd>${esc(p.parties)}</dd>` : ""}
        </dl>
        <p>${esc(p.scope)}</p>
        <p class="why"><b>Why it matters:</b> ${esc(p.relevance)}</p>
        <p class="src"><a href="${esc(p.source)}" target="_blank" rel="noopener">Source</a> · as of ${fmtDate(p.asOf)}</p>
      </article>`).join("")
    : `<p class="empty">No projects match.</p>`;
}
["p-country", "p-status"].forEach((id) => $(id).addEventListener("input", renderProjects));

// ================================================================ news

let cat = store.get("cmw:cat") || "";
if (cat && !cats[cat]) cat = "";
function renderCats() {
  const count = (k) => (k ? items.filter((i) => i.categories.includes(k)).length : items.length);
  $("cats").innerHTML = [["", "All"], ...Object.entries(cats)]
    .map(([k, l]) => `<button data-cat="${k}" aria-pressed="${k === cat}">${esc(l)}<span class="n">${count(k)}</span></button>`)
    .join("");
}
$("cats").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  cat = b.dataset.cat;
  store.set("cmw:cat", cat);
  renderCats(); renderItems();
});

const regions = [...new Set(allItems.flatMap((i) => i.regions))].sort();
$("region").insertAdjacentHTML("beforeend", regions.map((r) => `<option>${esc(r)}</option>`).join(""));
const named = [...new Set(allItems.flatMap((i) => i.companies ?? []))].sort();
$("company").insertAdjacentHTML("beforeend", named.map((r) => `<option>${esc(r)}</option>`).join(""));
["q", "region", "company", "only-new"].forEach((id) => $(id).addEventListener("input", renderItems));

function renderItems() {
  const q = $("q").value.trim().toLowerCase();
  const region = $("region").value, company = $("company").value;
  const onlyNew = $("only-new").checked;
  const list = items.filter((i) =>
    (!cat || i.categories.includes(cat)) &&
    (!region || i.regions.includes(region)) &&
    (!company || (i.companies ?? []).includes(company)) &&
    (!onlyNew || isNew(i)) &&
    (!q || `${i.title} ${i.description} ${i.publisher}`.toLowerCase().includes(q)));
  $("news-count").textContent = `${list.length} of ${items.length} items · last ${news?.retentionDays ?? 120} days`;
  $("items").innerHTML = list.length
    ? list.slice(0, 200).map((i) => `<li>
        <div class="meta"><span>${fmtDate(i.published)}</span><span>${esc(i.publisher)}</span>${stageBadge(i.stage)}${i.value ? `<b class="val">${esc(i.value)}</b>` : ""}${i.lang === "ar" ? '<span class="tag">Arabic</span>' : ""}${isNew(i) ? '<span class="badge-new">● New</span>' : ""}</div>
        <h3>${link(i)}</h3>
        ${i.description ? `<p${i.lang === "ar" ? ' dir="rtl" lang="ar"' : ""}>${esc(i.description)}</p>` : ""}
        <div class="tags">${i.categories.map((c) => `<span class="tag">${esc(cats[c] ?? c)}</span>`).join("")}${i.regions.map((r) => `<span class="tag t-region">${esc(r)}</span>`).join("")}${(i.companies ?? []).map((c) => `<button class="tag t-co" data-co="${esc(c)}">${esc(c)}</button>`).join("")}</div>
      </li>`).join("")
    : `<li class="empty">No items match these filters.</li>`;
}
$("items").addEventListener("click", (e) => {
  const b = e.target.closest("[data-co]");
  if (b) pickCompany(b.dataset.co);
});
function pickCompany(name) {
  $("company").value = name;
  cat = "";
  renderCats(); renderItems();
  $("news-h").scrollIntoView({ behavior: "smooth", block: "start" });
}

// ================================================================ company tracker

let role = store.get("cmw:role") || "contractor";
if (role === "competitor") role = "contractor";
function renderCompanies() {
  document.querySelectorAll("#roles button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.role === role)));
  const month = items.filter((i) => Date.parse(i.published) >= since(30));
  const rows = [...companyRoles].filter(([, r]) => r === role).map(([name]) => {
    const hits = items.filter((i) => (i.companies ?? []).includes(name));
    return { name, n30: month.filter((i) => i.companies?.includes(name)).length, total: hits.length, latest: hits[0] };
  }).sort((a, b) => b.n30 - a.n30 || b.total - a.total || a.name.localeCompare(b.name));
  const active = rows.filter((r) => r.total);
  const quiet = rows.filter((r) => !r.total);
  $("companies").innerHTML = active.map((r) => `<li>
      <div class="c-head"><button class="c-name" data-co="${esc(r.name)}">${esc(r.name)}</button><span class="c-n" title="Mentions in the last 30 days">${r.n30}</span></div>
      <div class="c-latest">${shortDate(r.latest.published)} · ${link(r.latest)}</div>
    </li>`).join("") +
    (quiet.length ? `<li class="quiet">No recent news: ${quiet.map((r) => esc(r.name)).join(", ")}</li>` : "");
}
$("roles").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  role = b.dataset.role;
  store.set("cmw:role", role);
  renderCompanies();
});
$("companies").addEventListener("click", (e) => {
  const b = e.target.closest("[data-co]");
  if (b) pickCompany(b.dataset.co);
});

// ================================================================ prices

function tiles() {
  if (!al.length) { $("tiles").innerHTML = ""; return; }
  const l = al.at(-1), p = al.at(-2) ?? l;
  const t = [
    ["LME Aluminium cash", `$${fmt(l.cash, 1)}`, change(l.cash - p.cash, pct(l.cash, p.cash), 1)],
    ["Aluminium 3-month", `$${fmt(l.m3, 1)}`, change(l.m3 - p.m3, pct(l.m3, p.m3), 1)],
    ["Cash – 3M spread", `${l.cash - l.m3 >= 0 ? "+" : ""}${fmt(l.cash - l.m3, 1)}`, l.cash - l.m3 > 0 ? "backwardation" : "contango"],
    ["Aluminium LME stock", `${fmt(l.stock)} t`, change(l.stock - p.stock, pct(l.stock, p.stock))],
  ];
  if (cu.length) {
    const c = cu.at(-1), cp = cu.at(-2) ?? c;
    t.push(["LME Copper cash", `$${fmt(c.cash, 1)}`, change(c.cash - cp.cash, pct(c.cash, cp.cash), 1)]);
    t.push(["Copper / aluminium", `${(c.cash / l.cash).toFixed(2)}×`, "higher favours aluminium"]);
  }
  $("tiles").innerHTML = t.map(([k, v, d]) => `<div class="tile"><div class="k">${k}</div><div class="v">${v}</div><div class="d">${d}</div></div>`).join("");
}

function niceTicks(min, max, count = 4) {
  const step0 = (max - min || 1) / count;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0);
  const ticks = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) ticks.push(v);
  return ticks;
}

function lineChart(el, label, series) {
  if (!series.length) { el.innerHTML = `<p class="empty">No ${label} data.</p>`; return; }
  const W = 560, H = 220, m = { t: 8, r: 10, b: 24, l: 52 };
  const xs = (i) => m.l + (i / Math.max(1, series.length - 1)) * (W - m.l - m.r);
  const vals = series.map((d) => d.cash);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = (hi - lo) * 0.08 || hi * 0.02;
  lo -= pad; hi += pad;
  const ys = (v) => m.t + (1 - (v - lo) / (hi - lo)) * (H - m.t - m.b);
  const pts = series.map((d, i) => `${xs(i).toFixed(1)},${ys(d.cash).toFixed(1)}`);
  const first = series[0], last = series.at(-1);
  const xIdx = [0, Math.floor((series.length - 1) / 2), series.length - 1];
  el.innerHTML = `
    <figcaption><b>${label} — LME cash, USD/t</b><span class="muted">${change(last.cash - first.cash, pct(last.cash, first.cash), 0)} over range</span></figcaption>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${label} LME cash price from ${first.date} to ${last.date}, ${fmt(first.cash)} to ${fmt(last.cash)} USD per tonne">
      <g class="axis">${niceTicks(lo, hi).map((v) => `<line class="gridline" x1="${m.l}" x2="${W - m.r}" y1="${ys(v)}" y2="${ys(v)}"/><text x="${m.l - 8}" y="${ys(v) + 4}" text-anchor="end">${fmt(v)}</text>`).join("")}
      ${xIdx.map((i, k) => `<text x="${xs(i)}" y="${H - 6}" text-anchor="${["start", "middle", "end"][k]}">${shortDate(series[i].date)}</text>`).join("")}</g>
      <path class="area" d="M${pts.join("L")}L${xs(series.length - 1)},${H - m.b}L${m.l},${H - m.b}Z"/>
      <polyline class="line" points="${pts.join(" ")}"/>
      <line class="cross" y1="${m.t}" y2="${H - m.b}" visibility="hidden"/>
      <circle class="dot" r="4.5" visibility="hidden"/>
      <rect x="${m.l}" y="0" width="${W - m.l - m.r}" height="${H}" fill="transparent" style="cursor:crosshair"/>
    </svg>`;
  const svg = el.querySelector("svg"), cross = svg.querySelector(".cross"), dot = svg.querySelector(".dot");
  const tip = document.createElement("div");
  tip.className = "tip"; tip.hidden = true; el.append(tip);
  const show = (evt) => {
    const r = svg.getBoundingClientRect();
    const x = ((evt.clientX - r.left) / r.width) * W;
    const i = Math.max(0, Math.min(series.length - 1, Math.round(((x - m.l) / (W - m.l - m.r)) * (series.length - 1))));
    const d = series[i], prev = series[i - 1];
    cross.setAttribute("x1", xs(i)); cross.setAttribute("x2", xs(i)); cross.setAttribute("visibility", "visible");
    dot.setAttribute("cx", xs(i)); dot.setAttribute("cy", ys(d.cash)); dot.setAttribute("visibility", "visible");
    tip.innerHTML = `<div class="t">${fmtDate(d.date, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</div>
      <div>Cash <b>$${fmt(d.cash, 1)}</b> ${prev ? change(d.cash - prev.cash, null, 1) : ""}</div>
      <div>3-month $${fmt(d.m3, 1)} · Stock ${fmt(d.stock)} t</div>`;
    tip.hidden = false;
    // SVG elements have no offsetLeft/offsetTop, so position relative to the figure's box.
    const fr = el.getBoundingClientRect();
    const px = (xs(i) / W) * r.width + (r.left - fr.left);
    tip.style.left = `${px > fr.width / 2 ? px - tip.offsetWidth - 12 : px + 12}px`;
    tip.style.top = `${r.top - fr.top + 8}px`;
  };
  const hide = () => { tip.hidden = true; cross.setAttribute("visibility", "hidden"); dot.setAttribute("visibility", "hidden"); };
  svg.addEventListener("pointermove", show);
  svg.addEventListener("pointerdown", show);
  svg.addEventListener("pointerleave", hide);
}

let range = Number(store.get("cmw:range")) || 66;
function charts() {
  document.querySelectorAll("#ranges button").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.range) === range)));
  lineChart($("chart-aluminium"), "Aluminium", al.slice(-range));
  lineChart($("chart-copper"), "Copper", cu.slice(-range));
}
$("ranges").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  range = Number(b.dataset.range);
  store.set("cmw:range", String(range));
  charts();
});

function priceTable() {
  const cuBy = new Map(cu.map((r) => [r.date, r]));
  $("price-table").innerHTML = `<thead><tr><th>Date</th><th>Al cash</th><th>Al 3M</th><th>Al stock (t)</th><th>Cu cash</th><th>Cu 3M</th><th>Cu stock (t)</th></tr></thead><tbody>${al.slice(-15).reverse()
    .map((r) => { const c = cuBy.get(r.date) ?? {}; return `<tr><td>${fmtDate(r.date)}</td><td>${fmt(r.cash, 1)}</td><td>${fmt(r.m3, 1)}</td><td>${fmt(r.stock)}</td><td>${fmt(c.cash, 1)}</td><td>${fmt(c.m3, 1)}</td><td>${fmt(c.stock)}</td></tr>`; })
    .join("")}</tbody>`;
}

// ================================================================ sources

// Source health: the last full crawl's run report (data/run-report.json) plus the live check.
function renderHealth() {
  const el = $("health");
  if (!runReport?.summary) { el.innerHTML = '<p class="muted">The source report appears after the next full crawl.</p>'; return; }
  const s = runReport.summary;
  const all = [...(runReport.prices ?? []), ...(runReport.sources ?? [])];
  const failed = all.filter((r) => r.status === "failed");
  const paused = all.filter((r) => r.status === "paused");
  const empty = all.filter((r) => r.status === "empty");
  const skipped = all.filter((r) => r.status === "skipped");
  const ago = Math.round((Date.now() - Date.parse(runReport.finishedAt)) / 60000);
  const when = ago < 90 ? `${ago} min ago` : `${Math.round(ago / 60)} h ago`;
  const row = (r, why) => `<li><b>${esc(r.label)}</b><span>${esc(why)}</span></li>`;
  const notes = all.filter((r) => r.kind === "tenders" && r.note && r.status !== "skipped").map((r) => row(r, r.note));
  el.innerHTML = `
    <p class="health-sum"><b>Last full crawl ${when}</b> (${fmtDate(runReport.finishedAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}, ${Math.round(runReport.durationMs / 1000)} s):
      <span class="up">${s.ok} with results</span> · ${s.empty} no new results · ${s.failed ? `<span class="down">${s.failed} failed</span>` : "0 failed"} · ${s.paused} paused${s.skipped ? ` · ${s.skipped} not enabled` : ""} · ${fmt(s.items)} items fetched.
      ${liveMeta ? `Live check: ${liveMeta.ok}/${liveMeta.sources} sources at ${hhmm(liveMeta.checkedAt)}.` : ""}</p>
    ${notes.length ? `<h3>Tender databases</h3><ul>${notes.join("")}</ul>` : ""}
    ${failed.length ? `<h3>Failed this run</h3><ul>${failed.map((r) => row(r, `${r.error}${r.consecutiveFailures > 1 ? ` · ${r.consecutiveFailures} runs in a row` : ""}`)).join("")}</ul>` : ""}
    ${paused.length ? `<h3>Paused (blocking us; retried once a day)</h3><ul>${paused.map((r) => row(r, `HTTP ${r.httpStatus} · ${r.consecutiveFailures} runs in a row`)).join("")}</ul>` : ""}
    ${skipped.length ? `<h3>Not enabled</h3><ul>${skipped.map((r) => row(r, r.note ?? "")).join("")}</ul>` : ""}
    ${empty.length ? `<details><summary>${empty.length} searches with no new results this run</summary><ul>${empty.map((r) => row(r, r.consecutiveEmpty > 1 ? `empty ${r.consecutiveEmpty} runs in a row` : "")).join("")}</ul></details>` : ""}`;
}

function renderWatch() {
  if (!watch) { $("watch").innerHTML = '<p class="muted">Watchlist not available.</p>'; return; }
  const groups = watch.groups.map((g) => `<div class="group"><h3>${esc(g.title)}</h3><ul>${g.items
    .map((i) => `<li><a href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.name)}</a><span>${esc(i.why)}</span></li>`)
    .join("")}</ul></div>`);
  const ind = `<div class="group"><h3>How to read the signals</h3><ul>${watch.indicators
    .map((i) => `<li><b>${esc(i.name)}</b><span>${esc(i.how)}</span></li>`).join("")}</ul></div>`;
  $("watch").innerHTML = ind + groups.join("");
}

// ================================================================ competitors

const competitors = competitorsData?.competitors ?? [];
// Names already tracked (first part of each, e.g. "Prysmian" from "Prysmian (incl. General Cable)").
const knownRe = new RegExp(
  (news?.companies ?? [])
    .flatMap((c) => c.name.split(/\s*[/(]\s*/))
    .map((n) => n.replace(/\)$/, "").trim())
    .filter((n) => n.length > 2)
    .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|") || "^$",
  "i",
);
function renderCompetitors() {
  const onlyActive = $("c-active").checked;
  const month = items.filter((i) => Date.parse(i.published) >= since(30));
  const rows = competitors.map((c) => {
    const hits = items.filter((i) => (i.companies ?? []).includes(c.name));
    return { ...c, n30: month.filter((i) => i.companies?.includes(c.name)).length, total: hits.length, latest: hits[0] };
  })
    .filter((r) => !onlyActive || r.total)
    .sort((a, b) => b.n30 - a.n30 || b.total - a.total || (a.market === market ? -1 : 0) - (b.market === market ? -1 : 0) || a.name.localeCompare(b.name));
  $("competitors-hint").textContent = `${competitors.length} rod, conductor and cable makers named in market research and contract news (list built ${fmtDate(competitorsData?.asOf ?? new Date().toISOString())}).${market ? ` Activity counts show ${market} news only.` : ""}`;
  $("competitors").innerHTML = `<thead><tr><th>Competitor</th><th>Base</th><th>Segment</th><th>30 days</th><th>Latest news</th><th>Named in</th></tr></thead><tbody>${rows.map((r) => `<tr>
      <td data-l="Competitor" class="deal"><button class="c-name" data-co="${esc(r.name)}">${esc(r.name)}</button></td>
      <td data-l="Base">${esc(r.hq)}</td>
      <td data-l="Segment">${esc(r.segment)}</td>
      <td data-l="30 days" class="val">${r.n30}</td>
      <td data-l="Latest news">${r.latest ? `<span class="muted">${shortDate(r.latest.published)}</span> ${link(r.latest)}` : '<span class="muted">No news yet</span>'}</td>
      <td data-l="Named in">${r.sources.map((u, k) => `<a href="${esc(u)}" target="_blank" rel="noopener" title="${esc(new URL(u).hostname)}">${k + 1}</a>`).join(" ")}</td>
    </tr>`).join("")}</tbody>`;

  // Winners named in cable/conductor headlines who are not tracked yet.
  const seen = new Map();
  for (const i of items) {
    if (!i.actor || knownRe.test(i.actor)) continue;
    if (!/cable|conductor|wire|rod|kv\b|transmission/i.test(`${i.title} ${i.description}`)) continue;
    const e = seen.get(i.actor) ?? { n: 0, item: i };
    e.n += 1; seen.set(i.actor, e);
  }
  const found = [...seen].sort((a, b) => b[1].n - a[1].n).slice(0, 15);
  $("discovered-wrap").hidden = !found.length;
  $("discovered").innerHTML = found.map(([name, e]) => `<li><b>${esc(name)}</b> <span class="muted">(${e.n})</span> — ${link(e.item)}</li>`).join("");
}
$("c-active").addEventListener("input", renderCompetitors);
$("competitors").addEventListener("click", (e) => {
  const b = e.target.closest("[data-co]");
  if (b) pickCompany(b.dataset.co);
});

// ================================================================ market bar

function renderMarkets() {
  const count = (m) => allItems.filter((i) => (i.markets ?? []).includes(m)).length + projects.filter((p) => p.market === m).length;
  $("markets").innerHTML = [["", "All markets"], ...MARKETS.map((m) => [m, m])]
    .map(([k, l]) => `<button data-market="${k}" aria-pressed="${k === market}">${esc(l)}${k ? `<span class="n">${count(k)}</span>` : ""}</button>`)
    .join("");
}
$("markets").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  market = b.dataset.market;
  store.set("cmw:market", market);
  items = allItems.filter(inMarket);
  $("p-country").value = "";
  renderAll();
});

function renderAll() {
  renderMarkets(); brief(); renderDeals(); projectsHint(); renderProjects(); renderCompetitors(); renderCats(); renderItems(); renderCompanies();
}
renderAll();
tiles(); charts(); priceTable(); renderWatch(); renderHealth();

// ================================================================ live refresh

// Re-check the live endpoint every 10 minutes (and when the tab becomes visible again after a
// while) and update every section in place, keeping the reader's filters and scroll position.
let lastCheck = Date.now();
async function refresh() {
  lastCheck = Date.now();
  const l = await load(`${LIVE_URL}?t=${Math.floor(Date.now() / REFRESH_MS)}`);
  if (!l?.news) return;
  liveMeta = l.live;
  if (l.news.generatedAt !== news?.generatedAt) {
    news = l.news;
    prices = l.prices ?? prices;
    allItems = news.items ?? [];
    items = allItems.filter(inMarket);
    al = prices?.metals?.aluminium?.series ?? al;
    cu = prices?.metals?.copper?.series ?? cu;
    renderAll();
    tiles(); charts(); priceTable();
  }
  setStamp();
  renderHealth();
}
setInterval(refresh, REFRESH_MS);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && Date.now() - lastCheck > REFRESH_MS / 2) refresh();
});
