// Cables & Aluminium Market Watch — renders data/prices.json, data/news.json and data/watchlist.json.

const $ = (id) => document.getElementById(id);
const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const fmt = (n, d = 0) => (n == null ? "–" : n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }));
const pct = (a, b) => (a == null || !b ? null : ((a - b) / b) * 100);
const fmtDate = (iso, opts = { day: "numeric", month: "short", year: "numeric" }) =>
  new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString("en-GB", opts);

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
const [prices, news, watch] = await Promise.all([
  load("data/prices.json"),
  load("data/news.json"),
  load("data/watchlist.json"),
]);

const lastVisit = Number(store.get("cmw:lastVisit")) || 0;
store.set("cmw:lastVisit", String(Date.now()));

// ---------------------------------------------------------------- header + brief

$("stamp").textContent = [
  prices?.metals?.aluminium?.series?.length && `LME data to ${fmtDate(prices.metals.aluminium.series.at(-1).date)}`,
  news?.generatedAt && `news refreshed ${fmtDate(news.generatedAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`,
].filter(Boolean).join(" · ");

const al = prices?.metals?.aluminium?.series ?? [];
const cu = prices?.metals?.copper?.series ?? [];
const back = (s, n) => s[Math.max(0, s.length - 1 - n)];

function brief() {
  const out = [];
  if (al.length > 1) {
    const [p, l] = [al.at(-2), al.at(-1)];
    const m = back(al, 21);
    out.push(`<strong>Aluminium</strong> settled at <strong>$${fmt(l.cash, 1)}/t</strong> on ${fmtDate(l.date, { day: "numeric", month: "short" })}, ${change(l.cash - p.cash, pct(l.cash, p.cash), 1)} on the day and ${change(l.cash - m.cash, pct(l.cash, m.cash), 1)} over about a month.`);
    const spread = l.cash - l.m3;
    out.push(`Cash–3M spread is <strong>${spread >= 0 ? "+" : ""}${fmt(spread, 1)}</strong> — ${spread > 0 ? "backwardation: prompt metal is tight, spot buying costs more" : spread < 0 ? "contango: supply is comfortable, no premium for prompt metal" : "flat"}.`);
    const s5 = back(al, 5);
    if (l.stock && s5.stock) out.push(`LME aluminium stocks ${l.stock < s5.stock ? "fell" : "rose"} to ${fmt(l.stock)} t (${change(l.stock - s5.stock, pct(l.stock, s5.stock))} over 5 sessions).`);
  }
  if (cu.length > 1 && al.length) {
    const l = cu.at(-1), p = cu.at(-2);
    out.push(`<strong>Copper</strong> at $${fmt(l.cash, 1)}/t (${change(l.cash - p.cash, pct(l.cash, p.cash), 1)}); copper is <strong>${(l.cash / al.at(-1).cash).toFixed(2)}×</strong> aluminium.`);
  }
  if (news?.items?.length) {
    const since = Date.now() - 2 * 86_400_000;
    const recent = news.items.filter((i) => Date.parse(i.published) >= since);
    const by = Object.entries(news.categories ?? {})
      .map(([k, label]) => [label, recent.filter((i) => i.categories.includes(k)).length])
      .filter(([, n]) => n);
    out.push(recent.length
      ? `${recent.length} news item${recent.length === 1 ? "" : "s"} in the last 48 hours: ${by.map(([l, n]) => `${l} ${n}`).join(", ")}.`
      : "No new news items in the last 48 hours.");
    const midal = news.items.filter((i) => i.categories.includes("midal"));
    if (midal.length) out.push(`<strong>${midal.length}</strong> recent item${midal.length === 1 ? "" : "s"} mention Midal — see the “Midal mentions” filter.`);
  }
  $("brief").innerHTML = out.map((l) => `<li>${l}</li>`).join("") || "<li>No data yet.</li>";
}

// ---------------------------------------------------------------- tiles

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

// ---------------------------------------------------------------- charts

const NS = "http://www.w3.org/2000/svg";
function niceTicks(min, max, count = 4) {
  const span = max - min || 1;
  const step0 = span / count;
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
  const ticks = niceTicks(lo, hi);
  const xIdx = [0, Math.floor((series.length - 1) / 2), series.length - 1];

  el.innerHTML = `
    <figcaption><b>${label} — LME cash, USD/t</b><span class="muted">${change(last.cash - first.cash, pct(last.cash, first.cash), 0)} over range</span></figcaption>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${label} LME cash price from ${first.date} to ${last.date}, ${fmt(first.cash)} to ${fmt(last.cash)} USD per tonne">
      <g class="axis">${ticks.map((v) => `<line class="gridline" x1="${m.l}" x2="${W - m.r}" y1="${ys(v)}" y2="${ys(v)}"/><text x="${m.l - 8}" y="${ys(v) + 4}" text-anchor="end">${fmt(v)}</text>`).join("")}
      ${xIdx.map((i, k) => `<text x="${xs(i)}" y="${H - 6}" text-anchor="${["start", "middle", "end"][k]}">${fmtDate(series[i].date, { day: "numeric", month: "short" })}</text>`).join("")}</g>
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
    const left = px > fr.width / 2 ? px - tip.offsetWidth - 12 : px + 12;
    tip.style.left = `${left}px`;
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
  const rows = al.slice(-15).reverse();
  $("price-table").innerHTML = `<thead><tr><th>Date</th><th>Al cash</th><th>Al 3M</th><th>Al stock (t)</th><th>Cu cash</th><th>Cu 3M</th><th>Cu stock (t)</th></tr></thead><tbody>${rows
    .map((r) => { const c = cuBy.get(r.date) ?? {}; return `<tr><td>${fmtDate(r.date)}</td><td>${fmt(r.cash, 1)}</td><td>${fmt(r.m3, 1)}</td><td>${fmt(r.stock)}</td><td>${fmt(c.cash, 1)}</td><td>${fmt(c.m3, 1)}</td><td>${fmt(c.stock)}</td></tr>`; })
    .join("")}</tbody>`;
}

// ---------------------------------------------------------------- news

const items = news?.items ?? [];
const cats = news?.categories ?? {};
let cat = store.get("cmw:cat") || "";
if (cat && !cats[cat]) cat = "";

const isNew = (i) => lastVisit && Date.parse(i.firstSeen) > lastVisit;

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
["q", "region", "only-new"].forEach((id) => $(id).addEventListener("input", renderItems));

function renderItems() {
  const q = $("q").value.trim().toLowerCase();
  const region = $("region").value;
  const onlyNew = $("only-new").checked;
  const list = items.filter((i) =>
    (!cat || i.categories.includes(cat)) &&
    (!region || i.regions.includes(region)) &&
    (!onlyNew || isNew(i)) &&
    (!q || `${i.title} ${i.description} ${i.publisher}`.toLowerCase().includes(q)));
  $("news-count").textContent = `${list.length} of ${items.length} items · last ${news?.retentionDays ?? 90} days`;
  $("items").innerHTML = list.length
    ? list.slice(0, 200).map((i) => `<li>
        <div class="meta"><span>${fmtDate(i.published, { day: "numeric", month: "short", year: "numeric" })}</span><span>${esc(i.publisher)}</span>${isNew(i) ? '<span class="badge-new">● New</span>' : ""}</div>
        <h3><a href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.title)}</a></h3>
        ${i.description ? `<p>${esc(i.description)}</p>` : ""}
        <div>${i.categories.map((c) => `<span class="tag">${esc(cats[c] ?? c)}</span>`).join("")}${i.regions.map((r) => `<span class="tag">${esc(r)}</span>`).join("")}</div>
      </li>`).join("")
    : `<li class="empty">No items match these filters.</li>`;
}

// ---------------------------------------------------------------- watchlist

function renderWatch() {
  if (!watch) { $("watch").innerHTML = '<p class="muted">Watchlist not available.</p>'; return; }
  const groups = watch.groups.map((g) => `<div class="group"><h3>${esc(g.title)}</h3><ul>${g.items
    .map((i) => `<li><a href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.name)}</a><span>${esc(i.why)}</span></li>`)
    .join("")}</ul></div>`);
  const ind = `<div class="group"><h3>How to read the signals</h3><ul>${watch.indicators
    .map((i) => `<li><b>${esc(i.name)}</b><span>${esc(i.how)}</span></li>`).join("")}</ul></div>`;
  $("watch").innerHTML = ind + groups.join("");
}

brief(); tiles(); charts(); priceTable(); renderCats(); renderItems(); renderWatch();
