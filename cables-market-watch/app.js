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
const [prices, news, projectsData, watch] = await Promise.all([
  load("data/prices.json"),
  load("data/news.json"),
  load("data/projects.json"),
  load("data/watchlist.json"),
]);

const lastVisit = Number(store.get("cmw:lastVisit")) || 0;
store.set("cmw:lastVisit", String(Date.now()));

const items = news?.items ?? [];
const cats = news?.categories ?? {};
const companyRoles = new Map((news?.companies ?? []).map((c) => [c.name, c.role]));
const al = prices?.metals?.aluminium?.series ?? [];
const cu = prices?.metals?.copper?.series ?? [];
const back = (s, n) => s[Math.max(0, s.length - 1 - n)];
const since = (days) => Date.now() - days * DAY;
const isNew = (i) => lastVisit && Date.parse(i.firstSeen) > lastVisit;
const link = (i) => `<a href="${esc(i.url)}" target="_blank" rel="noopener"${i.lang === "ar" ? ' dir="rtl" lang="ar"' : ""}>${esc(i.title)}</a>`;
// Deal flow keeps grid, tender, competitor and export news; demand items only when they name a tracked company.
const DEAL_CATS = ["projects", "tenders", "competitors", "export", "midal"];
const isDeal = (i) => i.stage && (i.categories.some((c) => DEAL_CATS.includes(c)) || (i.companies ?? []).length > 0);
const stageBadge = (s) => (s ? `<span class="stage s-${s.toLowerCase()}">${esc(s)}</span>` : "");

$("stamp").textContent = [
  news?.generatedAt && `News refreshed ${fmtDate(news.generatedAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`,
  al.length && `LME to ${fmtDate(al.at(-1).date)}`,
].filter(Boolean).join(" · ");

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
if (projectsData?.asOf) $("projects-hint").textContent = `${projects.length} major grid and power projects, curated with sources (reviewed ${fmtDate(projectsData.asOf)}). Edit data/projects.json to add more.`;
function renderProjects() {
  const c = $("p-country").value, s = $("p-status").value;
  const list = projects.filter((p) => (!c || p.country === c) && (!s || p.status === s));
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

const regions = [...new Set(items.flatMap((i) => i.regions))].sort();
$("region").insertAdjacentHTML("beforeend", regions.map((r) => `<option>${esc(r)}</option>`).join(""));
const named = [...new Set(items.flatMap((i) => i.companies ?? []))].sort();
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

let role = store.get("cmw:role") || "competitor";
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

function renderWatch() {
  if (!watch) { $("watch").innerHTML = '<p class="muted">Watchlist not available.</p>'; return; }
  const groups = watch.groups.map((g) => `<div class="group"><h3>${esc(g.title)}</h3><ul>${g.items
    .map((i) => `<li><a href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.name)}</a><span>${esc(i.why)}</span></li>`)
    .join("")}</ul></div>`);
  const ind = `<div class="group"><h3>How to read the signals</h3><ul>${watch.indicators
    .map((i) => `<li><b>${esc(i.name)}</b><span>${esc(i.how)}</span></li>`).join("")}</ul></div>`;
  $("watch").innerHTML = ind + groups.join("");
}

brief(); renderDeals(); renderProjects(); renderCats(); renderItems(); renderCompanies();
tiles(); charts(); priceTable(); renderWatch();
