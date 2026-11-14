import { shared, store, voterId } from "./store.js";
import { gratuity } from "./gratuity.js";

// Gulf Telugu Guide (గల్ఫ్ తెలుగు గైడ్): practical guidance for Telugu people going to, living in
// and returning from the Gulf. Content lives in data/guides.json and data/countries.json; every
// guide cites official sources and shows the date it was last checked.

const COUNTRY_IDS = ["uae", "saudi", "qatar", "kuwait", "oman", "bahrain"];
const state = { guides: [], categories: [], tips: [], countries: [], checked: "", byId: new Map(), community: null, sources: null, rates: null, legal: null, site: {} };
const $ = (sel, root = document) => root.querySelector(sel);
const main = $("#main");
const side = $("#side");

// ---- helpers -----------------------------------------------------------------------------
const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function ago(iso) {
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (s < 60) return "ఇప్పుడే";
  if (s < 3600) return `${Math.floor(s / 60)} నిమిషాల క్రితం`;
  if (s < 86400) return `${Math.floor(s / 3600)} గంటల క్రితం`;
  if (s < 172800) return "నిన్న";
  return `${Math.floor(s / 86400)} రోజుల క్రితం`;
}
const dateTe = (d, opts) => new Intl.DateTimeFormat("te-IN", opts).format(d);
const host = (url) => {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
};
const dayIndex = () => Math.floor((Date.now() + 5.5 * 3600e3) / 864e5); // IST day number
const pick = (list, salt = 0) => list[(dayIndex() + salt) % list.length];
const threadOf = (id) => `guide:${id}`;
const guideLink = (id) => `${location.origin}/g/${id}`;

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove("show"), 2200);
}

const AVATAR_COLORS = ["#8c1c13", "#b5532a", "#2f6b3a", "#1f5f8b", "#6b3f8c", "#a0761b", "#3d6b6b", "#8b3a62"];
function avatar(name) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return `<span class="avatar" style="background:${AVATAR_COLORS[h % AVATAR_COLORS.length]}" aria-hidden="true">${esc(
    [...name.trim()][0] || "?",
  )}</span>`;
}


const shortDate = (iso) => dateTe(new Date(iso), { day: "numeric", month: "long", year: "numeric" });
const waLink = (g) =>
  `https://wa.me/?text=${encodeURIComponent(`${g.title}\n\nగల్ఫ్ తెలుగు గైడ్: ${guideLink(g.id)}`)}`;
const country = (id) => state.countries.find((c) => c.id === id);
const cat = (id) => state.categories.find((c) => c.id === id);

// ---- data ---------------------------------------------------------------------------------
async function loadJSON(path) {
  const res = await fetch(path, { cache: "no-cache" });
  if (!res.ok) throw new Error(path);
  return res.json();
}

async function init() {
  try {
    const [guides, countries, community, sources, rates, legal, site] = await Promise.all([
      loadJSON("/data/guides.json"),
      loadJSON("/data/countries.json"),
      loadJSON("/data/community.json"),
      loadJSON("/data/sources.json"),
      loadJSON("/data/rates.json").catch(() => null),
      loadJSON("/data/legal.json"),
      loadJSON("/data/site.json").catch(() => ({})),
    ]);
    Object.assign(state, { guides: guides.guides, categories: guides.categories, tips: guides.tips, countries: countries.countries, checked: countries.checked });
    Object.assign(state, { community, sources, rates, legal, site });
    for (const g of state.guides) state.byId.set(g.id, g);
  } catch (err) {
    main.innerHTML = `<p class="empty">సమాచారం లోడ్ కాలేదు. కాసేపాగి మళ్లీ ప్రయత్నించండి.</p>`;
    console.error(err);
    return;
  }
  setupChrome();
  // Links shared from the earlier news site (/#/story/…, /s/…, /story/…) land on the homepage.
  if (location.hash.startsWith("#/")) history.replaceState(null, "", "/");
  window.addEventListener("popstate", route);
  // Internal links change the page without a reload.
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href^='/']");
    if (!a || a.target || a.hasAttribute("download") || e.defaultPrevented) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    go(a.getAttribute("href"));
  });
  route();
}

function setupChrome() {
  $("#today").textContent = dateTe(new Date(), { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  $("#edition").textContent = `సమాచారం చివరిగా సరిచూసినది: ${shortDate(state.checked)}`;
  $("#nav").innerHTML = [`<li><a href="/" data-route="home">హోమ్</a></li>`]
    .concat(state.categories.map((c) => `<li><a href="/t/${c.id}" data-route="t/${c.id}">${c.icon} ${esc(c.title)}</a></li>`))
    .join("");
  $("#nav2").innerHTML = state.countries
    .map((c) => `<li><a href="/c/${c.id}" data-route="c/${c.id}">${c.flag} ${esc(c.name)}</a></li>`)
    .concat([
      `<li><a href="/updates" data-route="updates">📢 అధికారిక సమాచారం</a></li>`,
      `<li><a href="/board" data-route="board">🌳 రచ్చబండ</a></li>`,
      `<li><a href="/sources" data-route="sources">📒 డైరెక్టరీ</a></li>`,
    ])
    .join("");

  const sizes = ["s", "m", "l", "xl"];
  const setSize = (d) => {
    const root = document.documentElement;
    const i = Math.max(0, Math.min(sizes.length - 1, sizes.indexOf(root.dataset.size) + d));
    root.dataset.size = sizes[i];
    localStorage.setItem("rb:size", sizes[i]);
  };
  $("#size-up").onclick = () => setSize(1);
  $("#size-down").onclick = () => setSize(-1);
  const themeBtn = $("#theme");
  const paintTheme = () => (themeBtn.textContent = document.documentElement.dataset.theme === "dark" ? "☀️" : "🌙");
  paintTheme();
  themeBtn.onclick = () => {
    const root = document.documentElement;
    root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem("rb:theme", root.dataset.theme);
    paintTheme();
  };
  $("#search").onsubmit = (e) => {
    e.preventDefault();
    const q = $("#q").value.trim();
    go(q ? `/search/${encodeURIComponent(q)}` : "/");
  };
  renderTips();
}

// One safety tip at a time in the bar under the menu.
function renderTips() {
  let i = 0;
  const el = $("#ticker");
  const show = (d = 0) => {
    i = (i + d + state.tips.length) % state.tips.length;
    el.textContent = state.tips[i];
  };
  const restart = () => {
    clearInterval(renderTips.t);
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) renderTips.t = setInterval(() => show(1), 7000);
  };
  $("#lt-prev").onclick = () => (show(-1), restart());
  $("#lt-next").onclick = () => (show(1), restart());
  show();
  restart();
}

// ---- routing ------------------------------------------------------------------------------
function go(path) {
  if (path !== location.pathname) history.pushState(null, "", path);
  route();
}

function route() {
  const [view = "", arg] = location.pathname.replace(/^\/+|\/+$/g, "").split("/");
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.href = `https://gulfteluguguide.vercel.app${view === "search" ? "/" : location.pathname}`;
  const key = view === "" ? "home" : arg && ["t", "c"].includes(view) ? `${view}/${arg}` : view;
  for (const a of document.querySelectorAll("#nav a, #nav2 a")) {
    if (a.dataset.route === key) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  }
  if (view !== "search") $("#q").value = "";
  const views = {
    "": renderHome,
    t: () => (cat(arg) ? renderTopic(arg) : renderHome()),
    g: () => (state.byId.has(arg) ? renderGuide(arg) : renderHome()),
    c: () => (country(arg) ? renderCountry(arg) : renderHome()),
    updates: renderUpdates,
    board: () => (arg ? renderBoard(arg) : renderBoards()),
    sources: renderSources,
    search: () => renderSearch(decodeURIComponent(arg || "")),
    about: () => renderLegal("about"),
    terms: () => renderLegal("terms"),
    privacy: () => renderLegal("privacy"),
    copyright: () => renderLegal("copyright"),
    rules: () => renderLegal("rules"),
  };
  (views[view] || renderHome)();
  renderSide();
  if (view) window.scrollTo({ top: 0 });
}

// ---- guide cards ------------------------------------------------------------------------------
const CAT_COLORS = { before: ["#283593", "#1a237e"], living: ["#00695c", "#004d40"], trouble: ["#c62828", "#7f1010"], home: ["#6a1b9a", "#3d0d5c"], money: ["#ef6c00", "#8a3d00"] };

function guideCardHTML(g) {
  const [a, b] = CAT_COLORS[g.cat] || CAT_COLORS.before;
  return `<article class="gcard">
    <a href="/g/${g.id}" class="gcard-link">
      <span class="gcard-icon" style="--a:${a};--b:${b}" aria-hidden="true">${g.icon}</span>
      <span class="gcard-body"><span class="gcard-cat">${esc(cat(g.cat)?.title || "")}</span>
        <strong>${esc(g.title)}</strong><span class="gcard-sum">${esc(g.summary)}</span>
        <span class="checked">✓ సరిచూసినది ${shortDate(g.checked)}</span></span></a>
  </article>`;
}
const countryChips = () =>
  `<div class="country-grid">${state.countries
    .map((c) => `<a href="/c/${c.id}" class="country-chip"><span>${c.flag}</span>${esc(c.name)}</a>`)
    .join("")}</div>`;

function renderHome() {
  document.title = "గల్ఫ్ తెలుగు గైడ్ | Gulf Telugu Guide – గల్ఫ్‌కు వెళ్లే, అక్కడ ఉండే తెలుగు వారికి";
  const popular = ["job-offer", "unpaid-salary", "death-repatriation", "gratuity", "passport", "going-home"].map((id) => state.byId.get(id)).filter(Boolean);
  const boards = state.community.boards;
  main.innerHTML = `
    <section class="intro">
      <h1>గల్ఫ్‌కు వెళ్లే, అక్కడ ఉండే తెలుగు వారికి — తెలుగులో సరైన సమాచారం</h1>
      <p>ఏజెంట్ మోసాల నుంచి జీతం ఫిర్యాదుల వరకు, గ్రాట్యుటీ లెక్క నుంచి ఇంటికి తిరుగు ప్రయాణం వరకు. ప్రతి గైడ్ అధికారిక మూలాలతో, సరిచూసిన తేదీతో.</p>
      <div class="intro-cta"><a class="btn" href="/g/job-offer">🔍 ఉద్యోగ ఆఫర్ సరిచూడండి</a><a class="btn sos-btn" href="/t/trouble">🆘 సమస్యలో ఉన్నారా?</a></div>
    </section>

    <section class="block">${blockHead("అంశాల వారీగా", null)}
      <div class="cat-grid">${state.categories
        .map((c) => {
          const [a, b] = CAT_COLORS[c.id];
          return `<a href="/t/${c.id}" class="cat-card" style="--a:${a};--b:${b}"><span class="cat-icon">${c.icon}</span><strong>${esc(c.title)}</strong><small>${esc(c.desc)}</small></a>`;
        })
        .join("")}</div></section>

    <section class="block">${blockHead("ఎక్కువ మందికి కావాల్సిన గైడ్లు", null)}
      <div class="ggrid">${popular.map(guideCardHTML).join("")}</div></section>

    <section class="block">${blockHead("మీరు ఏ దేశంలో ఉన్నారు?", null, "blue")}${countryChips()}</section>

    <section class="block community">
      <div class="comm-intro"><h2>🌳 రచ్చబండ</h2><p class="rb-tag">మన ముచ్చట్ల వేదిక</p>
        <p>ప్రశ్నలు అడగండి, అనుభవాలు పంచుకోండి — రూములు, ఉద్యోగాలు, సంఘాల కార్యక్రమాలు.</p>
        <a class="btn" href="/board">🌳 రచ్చబండకు వెళ్ళండి</a></div>
      <ol class="comm-list">${boards
        .slice(0, 6)
        .map(
          (b, n) =>
            `<li><a href="/board/${b.id}"><span class="num">${n + 1}</span><span class="bicon">${b.icon}</span><span><strong>${esc(
              b.title,
            )}</strong><small>${esc(b.desc.slice(0, 48))}…</small></span></a></li>`,
        )
        .join("")}</ol>
    </section>`;
}

const blockHead = (title, href, color = "red") =>
  `<div class="bhead bhead-${color}"><h2>${href ? `<a href="${href}">${esc(title)}</a>` : esc(title)}</h2>${
    href ? `<a class="bhead-more" href="${href}">అన్నీ →</a>` : ""
  }</div>`;

function renderTopic(id) {
  const c = cat(id);
  document.title = `${c.title} – ${c.en} | గల్ఫ్ తెలుగు గైడ్`;
  const list = state.guides.filter((g) => g.cat === id);
  main.innerHTML = `<div class="section-head"><h1>${c.icon} ${esc(c.title)}</h1><span class="count">${esc(c.en)}</span></div>
    <p class="section-note">${esc(c.desc)}</p>
    ${id === "living" ? `<h2 class="sub-h">దేశాల వారీగా</h2>${countryChips()}<h2 class="sub-h">గైడ్లు</h2>` : ""}
    <div class="ggrid">${list.map(guideCardHTML).join("") || `<p class="empty">త్వరలో.</p>`}</div>
    ${id === "trouble" ? helplineBox() : ""}`;
}

function helplineBox() {
  const help = state.sources.groups.find((g) => g.id === "help").items;
  return `<section class="helpbox"><h2>🆘 అత్యవసర హెల్ప్‌లైన్లు</h2><ul class="src-list">${help.map(sourceItemHTML).join("")}</ul></section>`;
}

function renderGuide(id) {
  const g = state.byId.get(id);
  const c = cat(g.cat);
  document.title = `${g.title} – ${g.en} | గల్ఫ్ తెలుగు గైడ్`;
  const related = state.guides.filter((x) => x.id !== id && x.cat === g.cat).slice(0, 3);
  main.innerHTML = `
    <a class="back" href="/t/${g.cat}">← ${c.icon} ${esc(c.title)}</a>
    <article class="story guide">
      <div class="guide-head"><span class="guide-icon" aria-hidden="true">${g.icon}</span>
        <div><h1>${esc(g.title)}</h1><p class="guide-en" lang="en">${esc(g.en)}</p></div></div>
      <p class="checked-line">✓ చివరిగా సరిచూసినది: <strong>${shortDate(g.checked)}</strong> · మూలాలు కింద ఉన్నాయి</p>
      <p class="lede">${esc(g.summary)}</p>
      <div class="guide-body">${g.html}</div>
      ${g.calculator ? `<section class="calc" id="calc"></section>` : ""}
      <section class="box"><h2>అధికారిక మూలాలు</h2><ul class="sources-list">${g.sources
        .map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)} ↗</a></li>`)
        .join("")}</ul></section>
      <p class="disclaimer">ఇది సాధారణ మార్గదర్శనం మాత్రమే, న్యాయ సలహా కాదు. నియమాలు మారుతుంటాయి — నిర్ణయం తీసుకునే ముందు అధికారిక సైట్‌లో, రాయబార కార్యాలయంలో సరిచూసుకోండి. తప్పు కనిపిస్తే <a href="/about">మాకు తెలియజేయండి</a>.</p>
      <details class="en-summary"><summary lang="en">English summary</summary><p lang="en">${esc(g.en_summary)}</p></details>
      <div class="story-links"><a class="btn wa" href="${waLink(g)}" target="_blank" rel="noopener">వాట్సాప్‌లో పంపండి</a></div>
    </article>
    <section class="discuss" id="discuss"></section>
    ${related.length ? `<div class="section-head" style="margin-top:28px"><h2>ఇవి కూడా చూడండి</h2></div><div class="ggrid">${related.map(guideCardHTML).join("")}</div>` : ""}`;
  if (g.calculator) mountGratuity($("#calc"));
  mountThread($("#discuss"), threadOf(id), {
    title: "ప్రశ్నలు & అనుభవాలు",
    placeholder: "ఈ విషయంపై మీ ప్రశ్న లేదా అనుభవం రాయండి… (వ్యక్తిగత వివరాలు పెట్టవద్దు)",
  });
}

// ---- gratuity calculator ------------------------------------------------------------------------
function mountGratuity(el) {
  el.innerHTML = `<h2>🧮 గ్రాట్యుటీ కాలిక్యులేటర్ (అంచనా)</h2>
    <form class="calc-form">
      <label>దేశం <select name="country"><option value="uae">🇦🇪 యూఏఈ</option><option value="saudi">🇸🇦 సౌదీ అరేబియా</option></select></label>
      <label><span data-wage>నెల బేసిక్ జీతం</span> <input name="monthly" type="number" min="0" step="1" inputmode="decimal" placeholder="ఉదా: 2000" required /></label>
      <label>సర్వీస్ — ఏళ్లు <input name="y" type="number" min="0" max="60" step="1" value="0" /></label>
      <label>నెలలు <input name="m" type="number" min="0" max="11" step="1" value="0" /></label>
      <label class="resign"><input name="resigned" type="checkbox" /> నేనే రాజీనామా చేశాను</label>
      <output class="calc-out" aria-live="polite">జీతం, సర్వీస్ వివరాలు నమోదు చేయండి.</output>
    </form>`;
  const f = $(".calc-form", el);
  const out = $(".calc-out", el);
  const update = () => {
    const country = f.country.value;
    f.querySelector(".resign").hidden = country !== "saudi";
    $("[data-wage]", f).textContent = country === "uae" ? "నెల బేసిక్ జీతం (దిర్హామ్)" : "నెల జీతం (రియాల్)";
    const monthly = Number(f.monthly.value);
    const years = Number(f.y.value || 0) + Number(f.m.value || 0) / 12;
    if (!monthly) return (out.textContent = "జీతం, సర్వీస్ వివరాలు నమోదు చేయండి.");
    const amount = gratuity({ country, monthly, years, resigned: f.resigned.checked });
    const cur = country === "uae" ? "AED" : "SAR";
    const r = state.rates?.inrPer?.[cur];
    out.innerHTML = amount
      ? `అంచనా గ్రాట్యుటీ: <strong>${cur} ${Math.round(amount).toLocaleString("en-IN")}</strong>${
          r ? ` <span class="muted">(సుమారు ₹${Math.round(amount * r).toLocaleString("en-IN")})</span>` : ""
        }`
      : country === "uae" && years < 1
        ? "యూఏఈలో కనీసం ఒక ఏడాది సర్వీస్ ఉండాలి."
        : "ఈ వివరాలకు గ్రాట్యుటీ రాదు (సౌదీలో 2 ఏళ్ల లోపు రాజీనామా చేస్తే).";
  };
  f.oninput = update;
  f.onsubmit = (e) => e.preventDefault();
  update();
}

// ---- countries & official channels ----------------------------------------------------------------
function renderCountry(id) {
  const c = country(id);
  document.title = `${c.name} తెలుగు గైడ్ – ${c.en} | గల్ఫ్ తెలుగు గైడ్`;
  const assoc = state.sources.groups.find((g) => g.id === "sanghalu").items.filter((a) => a.country === id);
  const missions = state.sources.groups.find((g) => g.id === "missions").items.filter((m) => c.embassies.includes(m.url));
  main.innerHTML = `
    <div class="section-head"><h1>${c.flag} ${esc(c.name)}</h1><span class="count" lang="en">${esc(c.en)}</span></div>
    <p class="checked-line">✓ చివరిగా సరిచూసినది: <strong>${shortDate(state.checked)}</strong></p>
    <div class="facts">
      <div class="fact"><h2>🪪 మీ ఐడీ కార్డు</h2><p><strong>${esc(c.idCard)}</strong></p><p><a href="${esc(c.residence.url)}" target="_blank" rel="noopener">${esc(c.residence.name)} ↗</a></p></div>
      <div class="fact"><h2>⚖️ కార్మిక శాఖ (ఫిర్యాదులు)</h2><p><a href="${esc(c.labour.url)}" target="_blank" rel="noopener">${esc(c.labour.name)} ↗</a></p>
        ${c.labour.phone ? `<p><a class="phone-big" href="tel:${esc(c.labour.phone)}">📞 ${esc(c.labour.phoneText)}</a></p>` : ""}</div>
      <div class="fact"><h2>🏛️ భారత రాయబార కార్యాలయం</h2><ul class="mini">${missions
        .map((m) => `<li><a href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.name)} ↗</a></li>`)
        .join("")}</ul>${c.pbsk ? `<p><a class="phone-big" href="tel:${esc(c.pbsk.phone)}">📞 ${esc(c.pbsk.phoneText)}</a><br /><small>ప్రవాసీ భారతీయ సహాయ కేంద్రం (ఉచితం)</small></p>` : ""}
        <p><a href="https://www.madad.gov.in" target="_blank" rel="noopener">MADAD లో ఫిర్యాదు ↗</a></p></div>
      ${assoc.length ? `<div class="fact"><h2>🤝 తెలుగు సంఘాలు</h2><ul class="mini">${assoc.map((a) => `<li>${a.url ? `<a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.name)} ↗</a>` : esc(a.name)}</li>`).join("")}</ul></div>` : ""}
    </div>
    ${c.notes.length ? `<section class="box"><h2>గుర్తుంచుకోండి</h2><ul>${c.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul></section>` : ""}
    <div class="section-head" style="margin-top:24px"><h2>ఉపయోగపడే గైడ్లు</h2></div>
    <div class="ggrid">${["unpaid-salary", "passport", "gratuity", "going-home"].map((g) => state.byId.get(g)).filter(Boolean).map(guideCardHTML).join("")}</div>
    <p class="disclaimer">లింకులు అధికారిక ప్రభుత్వ సైట్లవి. ఫోన్ నంబర్లు మారవచ్చు — అత్యవసర సమయంలో అధికారిక సైట్‌లో సరిచూసుకోండి.</p>`;
}

function renderUpdates() {
  document.title = "అధికారిక సమాచారం – Official updates | గల్ఫ్ తెలుగు గైడ్";
  const missions = state.sources.groups.find((g) => g.id === "missions").items;
  const portals = state.sources.groups.find((g) => g.id === "portals").items;
  main.innerHTML = `<div class="section-head"><h1>📢 అధికారిక సమాచారం</h1><span class="count" lang="en">Official updates</span></div>
    <p class="section-note">కొత్త నియమాలు, ఆమ్నెస్టీ, ప్రయాణ హెచ్చరికలు — పుకార్లు కాకుండా ఈ అధికారిక ఛానళ్లలోనే చూడండి. మేము వార్తలు ప్రచురించము; అధికారిక సైట్లకు దారి చూపిస్తాము.</p>
    <section class="src-group"><h2>🏛️ భారత రాయబార కార్యాలయాల ప్రకటనలు</h2><ul class="src-list">${missions.map(sourceItemHTML).join("")}</ul></section>
    <section class="src-group"><h2>⚖️ గల్ఫ్ కార్మిక శాఖలు</h2><ul class="src-list">${state.countries
      .map((c) => sourceItemHTML({ name: `${c.flag} ${c.labour.name}`, url: c.labour.url }))
      .join("")}</ul></section>
    <section class="src-group"><h2>🇮🇳 భారత & రాష్ట్ర ప్రభుత్వ సేవలు</h2><ul class="src-list">${portals.map(sourceItemHTML).join("")}</ul></section>`;
}

function renderSearch(q) {
  $("#q").value = q;
  document.title = `"${q}" | గల్ఫ్ తెలుగు గైడ్`;
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const text = (g) => `${g.title} ${g.en} ${g.summary} ${g.en_summary} ${g.html.replace(/<[^>]+>/g, " ")}`.toLowerCase();
  const hits = state.guides.filter((g) => terms.every((t) => text(g).includes(t)));
  const countries = state.countries.filter((c) => terms.some((t) => `${c.name} ${c.en} ${c.idCard}`.toLowerCase().includes(t)));
  main.innerHTML = `<div class="section-head"><h1>"${esc(q)}" కోసం</h1><span class="count">${hits.length + countries.length} ఫలితాలు</span></div>
    ${countries.length ? countryChipsFor(countries) : ""}
    <div class="ggrid">${hits.map(guideCardHTML).join("")}</div>
    ${!hits.length && !countries.length ? `<p class="empty">ఏమీ దొరకలేదు. వేరే పదంతో వెతకండి, లేదా <a href="/board/help">రచ్చబండలో అడగండి</a>.</p>` : ""}`;
}
const countryChipsFor = (list) =>
  `<div class="country-grid">${list.map((c) => `<a href="/c/${c.id}" class="country-chip"><span>${c.flag}</span>${esc(c.name)}</a>`).join("")}</div>`;

// ---- comment threads (questions under guides, and board posts) ------------------------------------------------
const profile = {
  get: () => JSON.parse(localStorage.getItem("rb:profile") || '{"name":"","place":""}'),
  set: (p) => localStorage.setItem("rb:profile", JSON.stringify(p)),
};
const liked = {
  has: (id) => JSON.parse(localStorage.getItem("rb:liked") || "[]").includes(id),
  add(id) {
    const l = JSON.parse(localStorage.getItem("rb:liked") || "[]");
    l.push(id);
    localStorage.setItem("rb:liked", JSON.stringify(l.slice(-2000)));
  },
};

function formHTML({ reply = false, placeholder }) {
  const p = profile.get();
  return `<form class="cform ${reply ? "reply" : ""}">
    <div class="row">
      <input name="name" maxlength="40" required placeholder="మీ పేరు" value="${esc(p.name)}" aria-label="మీ పేరు" />
      <input name="place" maxlength="40" placeholder="మీ ఊరు (ఐచ్ఛికం)" value="${esc(p.place)}" aria-label="మీ ఊరు" />
    </div>
    <textarea name="body" maxlength="2000" required placeholder="${esc(placeholder)}" aria-label="మీ వ్యాఖ్య"></textarea>
    <div class="foot">
      <span class="len">0 / 2000</span><span class="spacer"></span>
      ${reply ? `<button type="button" class="btn ghost" data-cancel>రద్దు</button>` : ""}
      <button class="btn" type="submit">${reply ? "జవాబివ్వండి" : "పోస్ట్ చేయండి"}</button>
    </div>
  </form>`;
}

function bindForm(form, onSubmit) {
  const body = form.elements.body;
  const len = $(".len", form);
  body.oninput = () => (len.textContent = `${body.value.length} / 2000`);
  form.onsubmit = async (e) => {
    e.preventDefault();
    const name = form.elements.name.value.trim();
    const place = form.elements.place.value.trim();
    const text = body.value.trim();
    if (!name || !text) return;
    profile.set({ name, place });
    const btn = $("button[type=submit]", form);
    btn.disabled = true;
    try {
      await onSubmit({ name, place, body: text });
      body.value = "";
      len.textContent = "0 / 2000";
    } catch (err) {
      console.error(err);
      toast("పోస్ట్ కాలేదు, మళ్లీ ప్రయత్నించండి");
    } finally {
      btn.disabled = false;
    }
  };
}

function commentHTML(c, children, depth) {
  const kids = children.get(c.id) || [];
  return `<li>
    <div class="comment" id="c-${c.id}">
      ${avatar(c.name)}
      <div>
        <div class="cmeta"><b>${esc(c.name)}</b>${c.place ? ` · ${esc(c.place)}` : ""} · ${ago(c.created_at)}</div>
        <p class="cbody">${esc(c.body)}</p>
        <div class="actions">
          <button class="act ${liked.has(c.id) ? "on" : ""}" data-like="${c.id}">👍 <span>${c.likes || ""}</span></button>
          <button class="act" data-reply="${c.id}">↩ జవాబు</button>
          <button class="act" data-report="${c.id}" title="అభ్యంతరకరం అని తెలపండి">🚩</button>
        </div>
        <div class="reply-slot"></div>
      </div>
    </div>
    ${kids.length ? `<ul class="clist">${kids.map((k) => commentHTML(k, children, depth + 1)).join("")}</ul>` : ""}
  </li>`;
}

// Renders a full discussion (form + threaded list) for `thread` into `el`.
async function mountThread(el, thread, { title, placeholder = "మీ అభిప్రాయం ఇక్కడ రాయండి… (తెలుగులో రాస్తే మరీ మంచిది)", board = false }) {
  let comments = [];
  let sort = board ? "new" : "old";
  el.innerHTML = `<h2>${esc(title)}</h2>
    ${
      shared
        ? ""
        : `<p class="note">గమనిక: ఈ సైట్‌కు ఇంకా ఉమ్మడి సర్వర్ అనుసంధానించలేదు — మీ వ్యాఖ్యలు ప్రస్తుతం మీ బ్రౌజర్‌లో మాత్రమే కనిపిస్తాయి.</p>`
    }
    ${formHTML({ placeholder })}
    <div class="sortbar">వరుస:
      <button class="chip" data-sort="old">పాతవి ముందు</button>
      <button class="chip" data-sort="new">కొత్తవి ముందు</button>
      <button class="chip" data-sort="top">ఎక్కువ నచ్చినవి</button>
    </div>
    <div class="cwrap"><p class="muted">లోడ్ అవుతోంది…</p></div>`;
  const wrap = $(".cwrap", el);

  const paint = () => {
    for (const b of el.querySelectorAll("[data-sort]")) b.setAttribute("aria-pressed", b.dataset.sort === sort);
    const children = new Map();
    const roots = [];
    const ids = new Set(comments.map((c) => c.id));
    for (const c of comments) {
      if (c.parent && ids.has(c.parent)) {
        if (!children.has(c.parent)) children.set(c.parent, []);
        children.get(c.parent).push(c);
      } else roots.push(c);
    }
    const order = {
      old: (a, b) => a.created_at.localeCompare(b.created_at),
      new: (a, b) => b.created_at.localeCompare(a.created_at),
      top: (a, b) => (b.likes || 0) - (a.likes || 0) || b.created_at.localeCompare(a.created_at),
    }[sort];
    roots.sort(order);
    wrap.innerHTML = roots.length
      ? `<p class="muted" style="margin:0">${comments.length} ${board ? "పోస్టులు & జవాబులు" : "వ్యాఖ్యలు"}</p>
         <ul class="clist">${roots.map((c) => commentHTML(c, children, 0)).join("")}</ul>`
      : `<p class="empty">${board ? "ఇంకా ఎవరూ పోస్ట్ చేయలేదు. మొదటి ముచ్చట మీదే కావాలి! ☕" : "ఇంకా ఎవరూ స్పందించలేదు. మొదటి అభిప్రాయం మీదే కావాలి!"}</p>`;
  };

  const add = async (fields, parent = null) => {
    const row = await store.add({ thread, parent, ...fields });
    comments.push(row);
    paint();
    document.getElementById(`c-${row.id}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
    toast("పోస్ట్ అయింది 🙏");
  };

  bindForm($("form", el), (f) => add(f));
  el.querySelector(".sortbar").onclick = (e) => {
    const b = e.target.closest("[data-sort]");
    if (b) {
      sort = b.dataset.sort;
      paint();
    }
  };
  wrap.onclick = async (e) => {
    const like = e.target.closest("[data-like]");
    const reply = e.target.closest("[data-reply]");
    const report = e.target.closest("[data-report]");
    if (like) {
      const id = like.dataset.like;
      if (liked.has(id)) return toast("ఇప్పటికే నచ్చిందని చెప్పారు");
      liked.add(id);
      const c = comments.find((x) => x.id === id);
      c.likes = (c.likes || 0) + 1;
      like.classList.add("on");
      $("span", like).textContent = c.likes;
      store.like(id).catch(() => {});
    } else if (reply) {
      const slot = reply.closest(".comment").querySelector(".reply-slot");
      if (slot.firstChild) return (slot.innerHTML = "");
      const who = comments.find((x) => x.id === reply.dataset.reply)?.name || "";
      slot.innerHTML = formHTML({ reply: true, placeholder: `${who} గారికి జవాబు…` });
      const form = $("form", slot);
      $("[data-cancel]", form).onclick = () => (slot.innerHTML = "");
      bindForm(form, (f) => add(f, reply.dataset.reply));
      form.elements.body.focus();
    } else if (report) {
      if (!confirm("ఈ వ్యాఖ్య అభ్యంతరకరంగా ఉందని తెలపాలా?")) return;
      await store.report(report.dataset.report).catch(() => {});
      toast("ధన్యవాదాలు. మేము పరిశీలిస్తాం.");
    }
  };

  try {
    comments = await store.comments(thread);
  } catch (err) {
    console.error(err);
    wrap.innerHTML = `<p class="empty">వ్యాఖ్యలు లోడ్ కాలేదు.</p>`;
    return;
  }
  paint();
}

// ---- community boards ---------------------------------------------------------------------------
async function renderBoards() {
  document.title = "రచ్చబండ – మన ముచ్చట్ల వేదిక | గల్ఫ్ తెలుగు గైడ్";
  const boards = state.community.boards;
  main.innerHTML = `
    <div class="hero"><h1>🌳 రచ్చబండ</h1><p class="rb-tag">మన ముచ్చట్ల వేదిక</p>
      <p>ఊళ్లో అందరూ కలిసి మాట్లాడుకునే చోటు రచ్చబండ. ఇంటికి దూరంగా గల్ఫ్‌లో ఉన్న మనందరికీ ఇదే మన రచ్చబండ — సంఘాల కార్యక్రమాలు, ఉద్యోగాలు, సాయం, రూములు, ఇంటికి తిరుగు ప్రయాణం — ఏదైనా పంచుకోండి.</p></div>
    <div class="boards">${boards
      .map(
        (b) => `<a class="board" href="/board/${b.id}"><span class="icon">${b.icon}</span><strong>${esc(b.title)}</strong>
          <span>${esc(b.desc)}</span><span data-bcount="${b.id}"></span></a>`,
      )
      .join("")}</div>
    <div class="section-head" style="margin-top:28px"><h2>తాజా ముచ్చట్లు</h2></div>
    <ul class="mini widget" id="board-recent"><li class="muted">లోడ్ అవుతోంది…</li></ul>`;
  try {
    const counts = await store.counts(boards.map((b) => `board:${b.id}`));
    for (const b of boards) {
      const n = counts[`board:${b.id}`];
      $(`[data-bcount="${b.id}"]`).textContent = n ? `💬 ${n} పోస్టులు` : "💬 మొదటి పోస్ట్ మీదే";
    }
    const recent = await store.recent(10);
    $("#board-recent").innerHTML = recent.length
      ? recent.map(recentHTML).join("")
      : `<li class="muted">ఇంకా ఏ చర్చా లేదు — మీరే మొదలుపెట్టండి!</li>`;
  } catch (err) {
    console.warn(err);
  }
}

function renderBoard(id) {
  const b = state.community.boards.find((x) => x.id === id);
  if (!b) return renderBoards();
  document.title = `${b.title} | గల్ఫ్ తెలుగు గైడ్`;
  main.innerHTML = `<a class="back" href="/board">← 🌳 రచ్చబండ</a>
    <div class="hero"><h1>${b.icon} ${esc(b.title)}</h1><p>${esc(b.desc)}</p></div>
    <section class="discuss" id="discuss"></section>`;
  mountThread($("#discuss"), `board:${id}`, {
    title: "కొత్త ముచ్చట మొదలుపెట్టండి",
    placeholder: "ఏం చెప్పాలనుకుంటున్నారు?",
    board: true,
  });
}


function recentHTML(c) {
  const [kind, key] = c.thread.split(":");
  let href = "/";
  let where = "పాత చర్చ";
  if (kind === "board") {
    const b = state.community.boards.find((x) => x.id === key);
    href = `/board/${key}`;
    where = b ? `${b.icon} ${b.title}` : "రచ్చబండ";
  } else if (kind === "guide" && state.byId.has(key)) {
    href = `/g/${key}`;
    where = state.byId.get(key).title;
  }
  return `<li><a href="${href}"><span class="quote">"${esc(c.body.slice(0, 90))}"</span>
    <small>— ${esc(c.name)}${c.place ? `, ${esc(c.place)}` : ""} · ${ago(c.created_at)} · ${esc(where.slice(0, 60))}</small></a></li>`;
}

// ---- sources & rules ----------------------------------------------------------------------------
function sourceItemHTML(s) {
  const inner = `<span class="dot">${s.phone ? "📞" : s.url ? "🔗" : "🤝"}</span>
    <span>${esc(s.name)}${s.phone ? `<b class="phone">📞 ${esc(s.phoneText)}</b>` : ""}${s.note ? `<small>${esc(s.note)}</small>` : ""}</span>`;
  if (s.phone) return `<li><a href="tel:${esc(s.phone)}">${inner}</a></li>`;
  return s.url ? `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${inner}</a></li>` : `<li><div class="nolink">${inner}</div></li>`;
}

function renderSources() {
  document.title = "గల్ఫ్ తెలుగు డైరెక్టరీ | గల్ఫ్ తెలుగు గైడ్";
  main.innerHTML = `<div class="section-head"><h1>📒 గల్ఫ్ తెలుగు డైరెక్టరీ</h1></div>
    <p class="muted">హెల్ప్‌లైన్లు, రాయబార కార్యాలయాలు, ప్రభుత్వ సేవలు, తెలుగు సంఘాలు — అన్నీ ఒకే చోట. ఫోన్ నంబర్‌పై నొక్కితే నేరుగా కాల్ వెళ్తుంది.</p>
    ${state.sources.groups
      .map(
        (g) => `<section class="src-group" id="dir-${g.id}"><h2>${esc(g.title)}</h2><ul class="src-list">${g.items
          .map(sourceItemHTML)
          .join("")}</ul>${
          g.id === "sanghalu"
            ? `<p class="muted" style="font-size:.85rem">మీ సంఘం ఈ జాబితాలో లేదా? <a href="/board/sangham">మన సంఘాలు & వేడుకలు</a> బోర్డులో వివరాలు రాయండి.</p>`
            : ""
        }</section>`,
      )
      .join("")}`;
}

// Fills contact placeholders in the legal pages from data/site.json.
export function fillLegal(html, site = {}) {
  const todo = "(త్వరలో చేర్చబడుతుంది / to be added)";
  const email = site.contactEmail ? `<a href="mailto:${esc(site.contactEmail)}">${esc(site.contactEmail)}</a>` : todo;
  const g = site.grievanceOfficer || {};
  const officer = g.name ? `${esc(g.name)}${g.email ? `, <a href="mailto:${esc(g.email)}">${esc(g.email)}</a>` : ""}` : todo;
  return html
    .replaceAll("{{contactEmail}}", email)
    .replaceAll("{{grievanceOfficer}}", officer)
    .replaceAll("{{jurisdictionClause}}", site.jurisdiction ? ` (8) These terms are governed by the laws of ${esc(site.jurisdiction)}.` : "");
}

function renderLegal(id) {
  const page = state.legal[id];
  document.title = `${page.title} | గల్ఫ్ తెలుగు గైడ్`;
  main.innerHTML = `<div class="section-head"><h1>${esc(page.title)}</h1></div>
    <div class="story legal">${fillLegal(page.html, state.site)}</div>
    <p class="legal-nav">${LEGAL_LINKS}</p>`;
}
const LEGAL_LINKS = [
  ["/about", "మా గురించి"],
  ["/terms", "నిబంధనలు"],
  ["/privacy", "గోప్యత"],
  ["/copyright", "కాపీరైట్ & తొలగింపు"],
  ["/rules", "చర్చా నియమాలు"],
]
  .map(([h, t]) => `<a href="${h}">${t}</a>`)
  .join(" · ");

// ---- sidebar ---------------------------------------------------------------------------------------
const CLOCKS = [
  ["ఇండియా", "Asia/Kolkata"],
  ["యూఏఈ / ఒమన్", "Asia/Dubai"],
  ["సౌదీ / ఖతార్ / కువైట్ / బహ్రెయిన్", "Asia/Riyadh"],
];
function tickClocks() {
  const el = $("#clocks");
  if (!el) return;
  const now = new Date();
  el.innerHTML = CLOCKS.map(
    ([name, tz]) =>
      `<div class="clock"><b>${new Intl.DateTimeFormat("te-IN", { hour: "numeric", minute: "2-digit", timeZone: tz }).format(now)}</b><span>${name}</span></div>`,
  ).join("");
  clearTimeout(tickClocks.t);
  tickClocks.t = setTimeout(tickClocks, 30000);
}

async function renderSide() {
  const c = state.community;
  const proverb = pick(c.proverbs);
  const word = pick(c.words, 3);
  const poll = pick(c.polls);
  const help = state.sources.groups.find((g) => g.id === "help").items.slice(0, 3);
  const r = state.rates?.inrPer;
  side.innerHTML = `
    <section class="widget sos"><h2>🆘 అత్యవసర సాయం</h2><ul class="mini">${help
      .map((h) => `<li><a href="tel:${esc(h.phone)}"><b>📞 ${esc(h.phoneText)}</b><small>${esc(h.name)}</small></a></li>`)
      .join("")}</ul><p style="margin:8px 0 0"><a href="/sources">అన్ని హెల్ప్‌లైన్లు, రాయబార కార్యాలయాలు →</a></p></section>
    <section class="widget wa-promo"><div class="wa-icon" aria-hidden="true">🟢</div>
      <p><strong>మీ వాట్సాప్ గ్రూపుల్లో పంచుకోండి</strong><br />సరైన సమాచారం మన వాళ్లందరికీ చేరాలి.</p>
      <a class="btn wa" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(
        `గల్ఫ్‌కు వెళ్లే, అక్కడ ఉండే తెలుగు వారికి తెలుగులో గైడ్: ఏజెంట్ మోసాలు, జీతం ఫిర్యాదులు, గ్రాట్యుటీ, హెల్ప్‌లైన్లు — గల్ఫ్ తెలుగు గైడ్ ${location.origin}/`,
      )}">వాట్సాప్‌లో పంపండి</a></section>
    <section class="widget market"><h2>🌳 రచ్చబండ బోర్డులు</h2><div class="market-grid">${[
      ["rooms", "🛏️", "రూములు", "#1e88e5"],
      ["jobs", "💼", "ఉద్యోగాలు", "#7b3fb5"],
      ["help", "🆘", "సాయం", "#e53935"],
      ["sangham", "🎉", "కార్యక్రమాలు", "#f39c12"],
      ["cricket", "🏏", "క్రికెట్", "#2e9d4e"],
      ["return", "🏠", "తిరుగు ప్రయాణం", "#5d6670"],
    ]
      .map(([id, i, t, c]) => `<a href="/board/${id}" style="background:${c}"><span>${i}</span>${t}</a>`)
      .join("")}</div></section>
    <section class="widget"><h2>🕰️ ఇప్పుడు సమయం</h2><div class="clocks" id="clocks"></div></section>
    ${
      r
        ? `<section class="widget"><h2>💱 రూపాయి మారకం</h2><table class="rates">${[
            ["AED", "యూఏఈ దిర్హామ్"],
            ["SAR", "సౌదీ రియాల్"],
            ["QAR", "ఖతార్ రియాల్"],
            ["KWD", "కువైట్ దినార్"],
            ["OMR", "ఒమన్ రియాల్"],
            ["BHD", "బహ్రెయిన్ దినార్"],
          ]
            .filter(([c]) => r[c])
            .map(([c, n]) => `<tr><td>1 ${c}<small>${n}</small></td><td>₹${r[c].toFixed(2)}</td></tr>`)
            .join("")}</table><p class="muted" style="font-size:.75rem;margin:6px 0 0">సూచిక రేటు (${dateTe(
            new Date(state.rates.updated),
            { day: "numeric", month: "short" },
          )}). ఎక్స్ఛేంజ్ హౌస్ రేటు కొంచెం తక్కువగా ఉంటుంది. <a href="${esc(
            state.rates.attribution?.url || "https://www.exchangerate-api.com",
          )}" target="_blank" rel="noopener">${esc(state.rates.attribution?.text || "Rates By Exchange Rate API")}</a></p></section>`
        : ""
    }
    <section class="widget poll" id="poll"><h2>ఈరోజు ప్రశ్న</h2><p class="q">${esc(poll.q)}</p><div class="opts"></div></section>
    <section class="widget saying"><h2>నేటి సామెత</h2><blockquote>${esc(proverb.text)}</blockquote><p>${esc(proverb.meaning)}</p></section>
    <section class="widget"><h2>తాజా చర్చలు</h2><ul class="mini" id="recent"><li class="muted">లోడ్ అవుతోంది…</li></ul>
      <p style="margin:8px 0 0"><a class="btn ghost" href="/board">🌳 రచ్చబండకు వెళ్ళండి</a></p></section>
    <section class="widget word"><h2>తెలుగు పదం</h2><div class="w">${esc(word.word)}</div><p><strong>అర్థం:</strong> ${esc(
      word.meaning,
    )}</p><p class="muted">"${esc(word.use)}"</p></section>
    <section class="widget"><h2>తెలుగు సంఘాలు</h2><ul class="mini">${state.sources.groups
      .find((g) => g.id === "sanghalu")
      .items.slice(0, 6)
      .map((a) => `<li>${a.url ? `<a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.name)} ↗</a>` : esc(a.name)}</li>`)
      .join("")}</ul><p style="margin:8px 0 0"><a href="/sources">అన్ని సంఘాలు →</a></p></section>`;

  tickClocks();
  mountPoll($("#poll"), poll);
  try {
    const recent = await store.recent(6);
    $("#recent").innerHTML = recent.length
      ? recent.map(recentHTML).join("")
      : `<li class="muted">ఇంకా ఎవరూ మాట్లాడలేదు. ఏదైనా గైడ్ కింద మీ ప్రశ్న అడగండి!</li>`;
  } catch (err) {
    console.warn(err);
  }
}

async function mountPoll(el, poll) {
  const key = `rb:poll:${poll.id}`;
  const opts = $(".opts", el);
  const showResults = async () => {
    const mine = JSON.parse(localStorage.getItem(key));
    let res = {};
    try {
      res = await store.results(poll.id);
    } catch {}
    const total = Object.values(res).reduce((a, b) => a + b, 0) || 1;
    opts.innerHTML =
      poll.options
        .map((o, i) => {
          const pct = Math.round(((res[i] || 0) / total) * 100);
          return `<div class="bar ${mine === i ? "mine" : ""}"><i style="width:${pct}%"></i><span>${esc(o)}${
            mine === i ? " ✓" : ""
          }<b>${pct}%</b></span></div>`;
        })
        .join("") +
      `<p class="muted" style="margin:0;font-size:.8rem">${shared ? `${total} ఓట్లు · ` : ""}రేపు కొత్త ప్రశ్న</p>`;
  };
  if (localStorage.getItem(key) !== null) return showResults();
  opts.innerHTML = poll.options.map((o, i) => `<button class="opt" data-i="${i}">${esc(o)}</button>`).join("");
  opts.onclick = async (e) => {
    const b = e.target.closest("[data-i]");
    if (!b) return;
    const i = Number(b.dataset.i);
    localStorage.setItem(key, JSON.stringify(i));
    voterId();
    try {
      await store.vote(poll.id, i);
    } catch {}
    showResults();
  };
}


init();
