import { shared, store, voterId } from "./store.js";

const SECTIONS = [
  ["top", "తెలుగు వారి వార్తలు"],
  ["uae", "🇦🇪 యూఏఈ"],
  ["saudi", "🇸🇦 సౌదీ"],
  ["qatar", "🇶🇦 ఖతార్"],
  ["kuwait", "🇰🇼 కువైట్"],
  ["oman", "🇴🇲 ఒమన్"],
  ["bahrain", "🇧🇭 బహ్రెయిన్"],
  ["sangham", "సంఘాలు & వేడుకలు"],
  ["exit", "తిరుగు ప్రయాణం & కష్టాలు"],
  ["jobs", "ఉద్యోగం, వీసా & నియమాలు"],
  ["gulf", "గల్ఫ్ పరిణామాలు"],
];
const COUNTRY_IDS = ["uae", "saudi", "qatar", "kuwait", "oman", "bahrain"];
// Short notes under section titles, so readers know what each tab collects.
const SECTION_NOTE = {
  top: "గల్ఫ్ దేశాల్లోని తెలుగు వారి గురించిన వార్తలు — తెలుగు, ఇంగ్లీష్ పత్రికల నుంచి.",
  sangham: "గల్ఫ్‌లోని తెలుగు సంఘాలు, కమిటీలు, పండుగ వేడుకలు, సన్మానాలు.",
  exit: "స్వదేశానికి తిరుగు ప్రయాణం, మృతదేహాల తరలింపు, చిక్కుకుపోయిన వారు, జైలు, క్షమాభిక్ష.",
  jobs: "వీసా, ఉద్యోగ, ట్రాఫిక్ నియమాల మార్పులు (గల్ఫ్ పత్రికల నుంచి కూడా), జీతాలు, నకిలీ ఏజెంట్లు, విమానాలు, ప్రయాణ హెచ్చరికలు.",
  gulf: "గల్ఫ్‌లో ఉన్న అందరిపై ప్రభావం చూపే సాధారణ పరిణామాలు.",
};
const SECTION_CTA = {
  sangham: ["#/board/sangham", "🎉 మీ సంఘం కార్యక్రమం గురించి మీరే రాయండి"],
  exit: ["#/board/help", "🆘 సాయం కావాలా? ఇక్కడ అడగండి"],
  jobs: ["#/board/jobs", "💼 ఉద్యోగాలు & వీసా చర్చ"],
};
const SECTION_NAME = Object.fromEntries(SECTIONS);
const REACTIONS = [
  ["like", "👍", "బాగుంది"],
  ["love", "❤️", "నచ్చింది"],
  ["laugh", "😂", "నవ్వొచ్చింది"],
  ["wow", "😮", "ఆశ్చర్యం"],
  ["sad", "😢", "బాధగా ఉంది"],
  ["angry", "😡", "కోపం"],
];
const PAGE = 24;

const state = { news: [], updated: null, byId: new Map(), community: null, sources: null, rates: null, publisher: "", shown: PAGE };
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
const favicon = (url) => `https://www.google.com/s2/favicons?domain=${host(url)}&sz=32`;
const dayIndex = () => Math.floor((Date.now() + 5.5 * 3600e3) / 864e5); // IST day number
const pick = (list, salt = 0) => list[(dayIndex() + salt) % list.length];
const threadOf = (id) => `news:${id}`;
const storyLink = (id) => `${location.origin}${location.pathname}#/story/${id}`;

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

const saved = {
  all: () => JSON.parse(localStorage.getItem("rb:saved") || "[]"),
  has: (id) => saved.all().some((s) => s.id === id),
  toggle(item) {
    const list = saved.all();
    const i = list.findIndex((s) => s.id === item.id);
    if (i >= 0) list.splice(i, 1);
    else list.unshift(item);
    localStorage.setItem("rb:saved", JSON.stringify(list.slice(0, 200)));
    return i < 0;
  },
};
const myReacts = {
  get: (t) => JSON.parse(localStorage.getItem("rb:myreacts") || "{}")[t],
  set(t, e) {
    const all = JSON.parse(localStorage.getItem("rb:myreacts") || "{}");
    all[t] = e;
    localStorage.setItem("rb:myreacts", JSON.stringify(all));
  },
};

async function share(item) {
  const url = storyLink(item.id);
  if (navigator.share) {
    try {
      await navigator.share({ title: item.title, text: item.title, url });
      return;
    } catch {}
  }
  await navigator.clipboard?.writeText(`${item.title}\n${url}`);
  toast("లింక్ కాపీ అయింది");
}
const waLink = (item) =>
  `https://wa.me/?text=${encodeURIComponent(`${item.title}\n\nగల్ఫ్ తెలుగు వార్తలు సైట్‌లో చర్చించండి: ${storyLink(item.id)}`)}`;

// ---- data ---------------------------------------------------------------------------------
async function loadJSON(path) {
  const res = await fetch(path, { cache: "no-cache" });
  if (!res.ok) throw new Error(path);
  return res.json();
}

async function init() {
  setupChrome();
  try {
    const [news, community, sources, rates] = await Promise.all([
      loadJSON("data/news.json"),
      loadJSON("data/community.json"),
      loadJSON("data/sources.json"),
      loadJSON("data/rates.json").catch(() => null),
    ]);
    state.rates = rates;
    state.news = news.items;
    state.updated = news.updated;
    state.community = community;
    state.sources = sources;
    for (const item of state.news) state.byId.set(item.id, item);
  } catch (err) {
    main.innerHTML = `<p class="empty">వార్తలు లోడ్ కాలేదు. కాసేపాగి మళ్లీ ప్రయత్నించండి.</p>`;
    console.error(err);
    return;
  }
  $("#edition").textContent = state.updated ? `చివరి అప్‌డేట్: ${ago(state.updated)}` : "";
  renderTicker();
  window.addEventListener("hashchange", route);
  route();
}

// Short menu labels; SECTION_NAME keeps the full titles for pages.
const NAV_MAIN = [["home", "హోమ్"], ["top", "తెలుగు వారు"], ["uae", "యూఏఈ"], ["saudi", "సౌదీ"], ["qatar", "ఖతార్"], ["kuwait", "కువైట్"], ["oman", "ఒమన్"], ["bahrain", "బహ్రెయిన్"]];
const NAV_SUB = [
  ["s/sangham", "సంఘాలు & వేడుకలు"],
  ["s/exit", "తిరుగు ప్రయాణం"],
  ["s/jobs", "ఉద్యోగం & వీసా"],
  ["s/gulf", "గల్ఫ్ పరిణామాలు"],
  ["board", "💬 రచ్చబండ"],
  ["sources", "📒 డైరెక్టరీ"],
  ["saved", "🔖 దాచినవి"],
];

function setupChrome() {
  $("#today").textContent = dateTe(new Date(), { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  $("#nav").innerHTML = NAV_MAIN.map(([id, name]) =>
    id === "home"
      ? `<li><a href="#/" data-route="home">${name}</a></li>`
      : `<li><a href="#/s/${id}" data-route="s/${id}">${name}</a></li>`,
  ).join("");
  $("#nav2").innerHTML = NAV_SUB.map(([r, name]) => `<li><a href="#/${r}" data-route="${r}">${name}</a></li>`).join("");

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
    location.hash = q ? `#/search/${encodeURIComponent(q)}` : "#/";
  };
}

// One headline at a time, with previous/next buttons, like a newspaper's "latest news" bar.
function renderTicker() {
  const top = state.news.filter((i) => i.sections.includes("top"));
  const list = [...top, ...state.news.filter((i) => !i.telugu)].slice(0, 12);
  if (!list.length) return;
  let i = 0;
  const el = $("#ticker");
  const show = (d = 0) => {
    i = (i + d + list.length) % list.length;
    el.innerHTML = `<a href="#/story/${list[i].id}">${esc(list[i].title)}</a>`;
  };
  const restart = () => {
    clearInterval(renderTicker.t);
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) renderTicker.t = setInterval(() => show(1), 6000);
  };
  $("#lt-prev").onclick = () => (show(-1), restart());
  $("#lt-next").onclick = () => (show(1), restart());
  show();
  restart();
}

// ---- routing ------------------------------------------------------------------------------
function route() {
  const [view, arg] = location.hash.replace(/^#\/?/, "").split("/");
  const key = view === "s" ? `s/${arg}` : view || "home";
  for (const a of document.querySelectorAll("#nav a, #nav2 a")) {
    if (a.dataset.route === key || (view === "board" && a.dataset.route === "board")) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  }
  state.publisher = "";
  state.shown = PAGE;
  if (view !== "search") $("#q").value = "";
  const views = {
    "": renderHome,
    s: () => (arg in SECTION_NAME ? renderSection(arg) : renderHome()),
    story: () => renderStory(arg),
    board: () => (arg ? renderBoard(arg) : renderBoards()),
    sources: renderSources,
    saved: renderSaved,
    search: () => renderSearch(decodeURIComponent(arg || "")),
    rules: renderRules,
  };
  (views[view] || renderHome)();
  renderSide();
  if (view) window.scrollTo({ top: 0 });
}

// ---- illustrated tiles ------------------------------------------------------------------------
// Google News feeds carry no photos, so each story gets an illustration: its country's flag
// colours, a Gulf skyline and a topic icon.
const COUNTRY_ART = {
  uae: ["#00843d", "#0a3d22", "🇦🇪", "యూఏఈ"],
  saudi: ["#0b7a43", "#05391f", "🇸🇦", "సౌదీ"],
  qatar: ["#8a1538", "#3f0a1a", "🇶🇦", "ఖతార్"],
  kuwait: ["#007a3d", "#2a2a2a", "🇰🇼", "కువైట్"],
  oman: ["#c8102e", "#5c0a17", "🇴🇲", "ఒమన్"],
  bahrain: ["#ce1126", "#6d0914", "🇧🇭", "బహ్రెయిన్"],
};
const TOPIC_ICONS = {
  sangham: ["🪔", "🎉", "🌼", "🎶", "🏆"],
  exit: ["✈️", "🏠", "🧳", "🕊️"],
  jobs: ["💼", "🛂", "📄", "🏗️", "✈️"],
  top: ["👥", "🤝", "📰"],
  gulf: ["🌍", "🛢️", "🕌", "🏙️", "📰"],
};
const hashOf = (str) => [...str].reduce((h, c) => (h * 31 + c.codePointAt(0)) >>> 0, 7);

function topicOf(item) {
  for (const t of ["sangham", "exit", "jobs"]) if (item.sections.includes(t)) return t;
  return item.telugu ? "top" : "gulf";
}
function art(item) {
  const c = COUNTRY_ART[item.countries?.[0]] || ["#0b5aa8", "#06305c", "", ""];
  const icons = TOPIC_ICONS[topicOf(item)];
  const icon = icons[hashOf(item.id) % icons.length];
  const h = hashOf(item.id);
  return `<span class="art" style="--a:${c[0]};--b:${c[1]};--r:${100 + (h % 120)}deg" aria-hidden="true"><span class="art-ico">${icon}</span>${
    c[2] ? `<span class="art-flag">${c[2]}</span>` : ""
  }</span>`;
}
function kicker(item) {
  const c = COUNTRY_ART[item.countries?.[0]];
  if (item.sections.includes("sangham")) return "వేడుకలు";
  if (c) return c[3];
  return item.telugu ? "తెలుగు వారు" : "గల్ఫ్";
}
const shortDate = (iso) => dateTe(new Date(iso), { weekday: "short", day: "2-digit", month: "short" });

function tileHTML(item, size = "md") {
  return `<article class="tile tile-${size}">
    <a href="#/story/${item.id}" class="tile-link">${art(item)}<span class="tile-shade"></span>
      <span class="tile-body"><span class="kicker">${esc(kicker(item))}</span>
        <span class="tile-title">${esc(item.title)}</span>
        <span class="tile-meta"><time datetime="${item.published}">${shortDate(item.published)}</time> · ${esc(item.publisher)}
          · 💬 <span data-count="${item.id}">చర్చ</span></span></span></a>
  </article>`;
}
function liHTML(item) {
  const c = COUNTRY_ART[item.countries?.[0]];
  return `<li class="li"><a href="#/story/${item.id}" class="li-thumb" tabindex="-1">${art(item)}</a>
    <div><a class="li-title" href="#/story/${item.id}">${esc(item.title)}</a>
    <div class="li-meta">${shortDate(item.published)}${c ? ` · ⚑ ${c[3]}` : ""}${item.telugu ? ` · <span class="te-dot">తెలుగు వారు</span>` : ""}</div></div></li>`;
}
function colCardHTML(item) {
  return `<article class="colcard"><a href="#/story/${item.id}" class="colcard-img" tabindex="-1">${art(item)}</a>
    <a class="colcard-title" href="#/story/${item.id}">${esc(item.title)}</a>
    <div class="li-meta">${shortDate(item.published)} · ${esc(item.publisher)}</div></article>`;
}
const blockHead = (title, href, color = "red") =>
  `<div class="bhead bhead-${color}"><h2>${href ? `<a href="${href}">${esc(title)}</a>` : esc(title)}</h2>${
    href ? `<a class="bhead-more" href="${href}">అన్నీ →</a>` : ""
  }</div>`;

// Big story on the left, a list on the right (the classic newspaper section block).
function featureHTML(items) {
  if (!items.length) return `<p class="empty">ఇంకా వార్తలు లేవు.</p>`;
  const [first, ...rest] = items;
  return `<div class="feature">${tileHTML(first, "lg")}<ul class="li-list">${rest.slice(0, 4).map(liHTML).join("")}</ul></div>`;
}

function renderHome() {
  document.title = "గల్ఫ్ తెలుగు వార్తలు | Gulf Telugu News – దుబాయ్, సౌదీ, ఖతార్, కువైట్, ఒమన్, బహ్రెయిన్";
  const used = new Set();
  const take = (list, n) => {
    const fresh = list.filter((i) => !used.has(i.id));
    const out = (fresh.length >= n ? fresh : [...fresh, ...list.filter((i) => used.has(i.id))]).slice(0, n);
    out.forEach((i) => used.add(i.id));
    return out;
  };
  const by = (sec) => state.news.filter((i) => i.sections.includes(sec));
  const telugu = state.news.filter((i) => i.telugu);
  const hero = take([...telugu, ...state.news], 5);
  const teluguMore = take(telugu, 5);
  const cols = [
    ["sangham", "సంఘాలు & వేడుకలు"],
    ["exit", "తిరుగు ప్రయాణం & కష్టాలు"],
    ["jobs", "ఉద్యోగం, వీసా & నియమాలు"],
  ].map(([id, title]) => [id, title, take(by(id), 4)]);
  const countries = COUNTRY_IDS.filter((c) => by(c).length);
  const boards = state.community.boards;

  main.innerHTML = `
    <section class="lead-grid" aria-label="ముఖ్య వార్తలు">
      <div class="lg-row lg-row-2">${hero.slice(0, 2).map((i) => tileHTML(i, "lg")).join("")}</div>
      <div class="lg-row lg-row-3">${hero.slice(2, 5).map((i) => tileHTML(i, "md")).join("")}</div>
    </section>

    <section class="block">${blockHead("తెలుగు వారి వార్తలు", "#/s/top")}${featureHTML(teluguMore)}</section>

    <section class="block cols3">${cols
      .map(
        ([id, title, items]) => `<div class="col">${blockHead(title, `#/s/${id}`, "blue")}${
          items.length
            ? colCardHTML(items[0]) + `<ul class="li-list">${items.slice(1).map(liHTML).join("")}</ul>`
            : `<p class="empty">ఇంకా వార్తలు లేవు.</p>`
        }</div>`,
      )
      .join("")}</section>

    <section class="block">${blockHead("దేశాల వారీగా", null)}
      <div class="tabs" role="tablist">${countries
        .map(
          (c, n) =>
            `<button role="tab" class="tab" data-tab="${c}" aria-selected="${n === 0}">${COUNTRY_ART[c][2]} ${COUNTRY_ART[c][3]}</button>`,
        )
        .join("")}</div>
      <div id="tabpanel" role="tabpanel"></div>
    </section>

    <section class="block community">
      <div class="comm-intro"><h2>💬 రచ్చబండ చర్చలు</h2>
        <p>గల్ఫ్‌లో ఉన్న మన వాళ్లందరూ కలిసే చోటు. సంఘం కార్యక్రమం ప్రకటించండి, రూమ్ వెతకండి, సాయం అడగండి.</p>
        <a class="btn" href="#/board">రచ్చబండకు వెళ్ళండి</a></div>
      <ol class="comm-list">${boards
        .slice(0, 6)
        .map(
          (b, n) =>
            `<li><a href="#/board/${b.id}"><span class="num">${n + 1}</span><span class="bicon">${b.icon}</span><span><strong>${esc(
              b.title,
            )}</strong><small data-bcount="${b.id}">${esc(b.desc.slice(0, 48))}…</small></span></a></li>`,
        )
        .join("")}</ol>
    </section>

    <section class="block">${blockHead("గల్ఫ్ పరిణామాలు", "#/s/gulf", "navy")}${featureHTML(take(by("gulf"), 5))}</section>`;

  const panel = $("#tabpanel");
  const showTab = (c) => {
    for (const t of main.querySelectorAll("[data-tab]")) t.setAttribute("aria-selected", t.dataset.tab === c);
    const items = by(c);
    panel.innerHTML =
      featureHTML([...items.filter((i) => i.telugu), ...items.filter((i) => !i.telugu)]) +
      `<p class="tab-more"><a href="#/s/${c}">${COUNTRY_ART[c][3]} వార్తలన్నీ →</a></p>`;
    decorate(panel);
  };
  main.querySelector(".tabs").onclick = (e) => {
    const t = e.target.closest("[data-tab]");
    if (t) showTab(t.dataset.tab);
  };
  if (countries.length) showTab(countries[0]);
  decorate(main);
  store
    .counts(boards.map((b) => `board:${b.id}`))
    .then((counts) => {
      for (const b of boards) {
        const el = main.querySelector(`[data-bcount="${b.id}"]`);
        if (el && counts[`board:${b.id}`]) el.textContent = `💬 ${counts[`board:${b.id}`]} పోస్టులు`;
      }
    })
    .catch(() => {});
}

// ---- news lists -----------------------------------------------------------------------------
function cardHTML(item, { lead = false } = {}) {
  const tags = [
    ...(item.telugu ? [`<span class="tag te">తెలుగు వారు</span>`] : []),
    ...item.sections
      .filter((s) => s !== "top" && SECTION_NAME[s])
      .slice(0, 3)
      .map((s) => `<a class="tag" href="#/s/${s}">${SECTION_NAME[s]}</a>`),
    ...(item.lang === "en" ? [`<span class="tag en">English</span>`] : []),
  ].join("");
  const related = item.related?.length
    ? `<ul class="related" aria-label="ఇతర పత్రికల్లో">${item.related
        .slice(0, lead ? 4 : 2)
        .map(
          (r) =>
            `<li><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.title)}</a> <span class="pub">— ${esc(
              r.publisher,
            )}</span></li>`,
        )
        .join("")}</ul>`
    : "";
  const H = lead ? "h2" : "h3";
  return `<article class="${lead ? "lead" : "card"}" data-id="${item.id}">
    <a class="card-img" href="#/story/${item.id}" tabindex="-1">${art(item)}</a>
    <div class="meta">${item.publisherUrl ? `<img src="${favicon(item.publisherUrl)}" alt="" loading="lazy" onerror="this.remove()" />` : ""}
      <span class="pub">${esc(item.publisher)}</span> · <time datetime="${item.published}">${ago(item.published)}</time> ${tags}</div>
    <${H}><a href="#/story/${item.id}">${esc(item.title)}</a></${H}>
    ${item.description ? `<p class="desc">${esc(item.description)}</p>` : ""}
    ${related}
    <div class="actions">
      <a class="act talk" href="#/story/${item.id}">💬 <span data-count="${item.id}">చర్చ</span></a>
      <span class="act" data-reacts="${item.id}"></span>
      <a class="act" href="${esc(item.url)}" target="_blank" rel="noopener" title="పూర్తి వార్త">↗ పూర్తి వార్త</a>
      <a class="act" href="${waLink(item)}" target="_blank" rel="noopener" title="వాట్సాప్‌లో పంపండి">🟢 వాట్సాప్</a>
      <button class="act ${saved.has(item.id) ? "on" : ""}" data-save="${item.id}" title="తర్వాత చదవడానికి దాచండి">🔖</button>
    </div>
  </article>`;
}

// Fills comment counts and top reactions on the cards in `root`.
async function decorate(root) {
  const ids = [...root.querySelectorAll("[data-count]")].map((el) => el.dataset.count);
  if (!ids.length) return;
  try {
    const threads = ids.map(threadOf);
    const [counts, reacts] = await Promise.all([store.counts(threads), store.reactions(threads)]);
    for (const id of ids) {
      const n = counts[threadOf(id)] || 0;
      const el = root.querySelector(`[data-count="${id}"]`);
      if (el) el.textContent = n ? `${n} వ్యాఖ్యలు` : "చర్చించండి";
      const r = reacts[threadOf(id)];
      const rel = root.querySelector(`[data-reacts="${id}"]`);
      if (rel && r) {
        const total = Object.values(r).reduce((a, b) => a + b, 0);
        const topEmoji = REACTIONS.filter(([k]) => r[k])
          .sort((a, b) => r[b[0]] - r[a[0]])
          .slice(0, 3)
          .map(([, e]) => e)
          .join("");
        rel.textContent = `${topEmoji} ${total}`;
      }
    }
  } catch (err) {
    console.warn("counts", err);
  }
}

function bindCardButtons(root) {
  root.onclick = (e) => {
    const btn = e.target.closest("[data-save]");
    if (!btn) return;
    const item = state.byId.get(btn.dataset.save) || saved.all().find((s) => s.id === btn.dataset.save);
    if (!item) return;
    const on = saved.toggle(item);
    btn.classList.toggle("on", on);
    toast(on ? "దాచాం — 🔖 దాచినవి లో చూడండి" : "తీసేశాం");
  };
}

function renderList(items, { title, sub = "", lead = true, filters = true, note = "", cta = null, extra = "" }) {
  const pubs = {};
  for (const i of items) pubs[i.publisher] = (pubs[i.publisher] || 0) + 1;
  const topPubs = Object.entries(pubs)
    .filter(([p]) => p)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const list = state.publisher ? items.filter((i) => i.publisher === state.publisher) : items;
  const shown = list.slice(0, state.shown);
  const [first, ...rest] = lead ? shown : [null, ...shown];

  main.innerHTML = `
    <div class="section-head"><h1>${esc(title)}</h1><span class="count">${list.length} వార్తలు ${sub}</span></div>
    ${note ? `<p class="section-note">${esc(note)}${cta ? ` <a href="${cta[0]}">${esc(cta[1])} →</a>` : ""}</p>` : ""}
    ${extra}
    ${
      filters && topPubs.length > 1
        ? `<div class="chips" role="group" aria-label="పత్రిక">
        <button class="chip" data-pub="" aria-pressed="${!state.publisher}">అన్నీ</button>
        ${topPubs
          .map(([p]) => `<button class="chip" data-pub="${esc(p)}" aria-pressed="${state.publisher === p}">${esc(p)}</button>`)
          .join("")}</div>`
        : ""
    }
    ${first ? `<div class="section-lead">${tileHTML(first, "xl")}</div>` : ""}
    <div class="grid">${rest.map((i) => cardHTML(i)).join("")}</div>
    ${!list.length ? `<p class="empty">ఈ విభాగంలో ఇంకా వార్తలు లేవు. త్వరలో అప్‌డేట్ అవుతాయి.</p>` : ""}
    ${list.length > state.shown ? `<button class="btn ghost more" id="more">మరిన్ని వార్తలు చూడండి ↓</button>` : ""}`;

  for (const chip of main.querySelectorAll("[data-pub]")) {
    chip.onclick = () => {
      state.publisher = chip.dataset.pub;
      state.shown = PAGE;
      renderList(items, { title, sub, lead, filters, note, cta, extra });
    };
  }
  const more = $("#more");
  if (more)
    more.onclick = () => {
      const y = window.scrollY;
      state.shown += PAGE;
      renderList(items, { title, sub, lead, filters, note, cta, extra });
      window.scrollTo({ top: y });
    };
  bindCardButtons(main);
  decorate(main);
}

function renderSection(id) {
  document.title = `${SECTION_NAME[id]} | గల్ఫ్ తెలుగు వార్తలు`;
  let items = state.news.filter((i) => i.sections.includes(id));
  // Country pages lead with stories about Telugu people, then the rest of that country's news.
  if (COUNTRY_IDS.includes(id)) items = [...items.filter((i) => i.telugu), ...items.filter((i) => !i.telugu)];
  const assoc = COUNTRY_IDS.includes(id)
    ? state.sources.groups.find((g) => g.id === "sanghalu").items.filter((a) => a.country === id)
    : [];
  renderList(items, {
    title: SECTION_NAME[id],
    note: SECTION_NOTE[id],
    cta: SECTION_CTA[id],
    extra: assoc.length
      ? `<p class="assoc">ఇక్కడి తెలుగు సంఘాలు: ${assoc
          .map((a) => (a.url ? `<a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.name)}</a>` : esc(a.name)))
          .join(" · ")}</p>`
      : "",
  });
}

function renderSearch(q) {
  $("#q").value = q;
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const hits = state.news.filter((i) => {
    const text = `${i.title} ${i.description} ${i.publisher}`.toLowerCase();
    return terms.every((t) => text.includes(t));
  });
  document.title = `"${q}" | గల్ఫ్ తెలుగు వార్తలు`;
  renderList(hits, { title: `"${q}" కోసం ఫలితాలు`, lead: false });
}

function renderSaved() {
  document.title = "దాచినవి | గల్ఫ్ తెలుగు వార్తలు";
  renderList(saved.all(), { title: "🔖 దాచిన వార్తలు", sub: "(ఈ పరికరంలో మాత్రమే)", lead: false, filters: false });
  if (!saved.all().length)
    main.insertAdjacentHTML("beforeend", `<p class="empty">ఏ వార్త పక్కన 🔖 నొక్కితే అది ఇక్కడ దాచబడుతుంది.</p>`);
}

// ---- story page -------------------------------------------------------------------------------
function renderStory(id) {
  const item = state.byId.get(id) || saved.all().find((s) => s.id === id);
  const thread = threadOf(id);
  document.title = `${item ? item.title : "చర్చ"} | గల్ఫ్ తెలుగు వార్తలు`;
  if (!item) {
    main.innerHTML = `<a class="back" href="#/">← వెనక్కి</a>
      <div class="story"><p>ఈ వార్త పాతదైపోవడంతో జాబితా నుంచి తొలగించాం. దానిపై జరిగిన చర్చ కింద ఉంది.</p></div>
      <section class="discuss" id="discuss"></section>`;
    mountThread($("#discuss"), thread, { title: "చర్చ" });
    return;
  }
  const more = state.news
    .filter((i) => i.id !== id && i.sections.some((s) => item.sections.includes(s)))
    .slice(0, 6);
  const sec = item.sections.find((s) => s !== "top") || item.sections[0];
  main.innerHTML = `
    <a class="back" href="#/s/${sec}">← ${SECTION_NAME[sec] || "వార్తలు"}</a>
    <article class="story">
      <div class="story-art">${art(item)}</div>
      <div class="meta">${item.publisherUrl ? `<img src="${favicon(item.publisherUrl)}" alt="" onerror="this.remove()" />` : ""}
        <span class="pub">${esc(item.publisher)}</span> ·
        <time datetime="${item.published}">${dateTe(new Date(item.published), {
          day: "numeric",
          month: "long",
          hour: "numeric",
          minute: "2-digit",
        })}</time> · ${ago(item.published)}
        ${item.telugu ? `<span class="tag te">తెలుగు వారు</span>` : ""}
        ${item.sections.map((s) => (SECTION_NAME[s] && s !== "top" ? `<a class="tag" href="#/s/${s}">${SECTION_NAME[s]}</a>` : "")).join(" ")}</div>
      <h1>${esc(item.title)}</h1>
      ${item.description ? `<p class="lede">${esc(item.description)}</p>` : ""}
      <div class="story-links">
        <a class="btn" href="${esc(item.url)}" target="_blank" rel="noopener">${esc(item.publisher || "మూలం")}లో పూర్తి వార్త చదవండి ↗</a>
        <a class="btn wa" href="${waLink(item)}" target="_blank" rel="noopener">వాట్సాప్‌లో పంపండి</a>
        <button class="btn ghost" id="share">🔗 షేర్</button>
        <button class="btn ghost" id="save">${saved.has(id) ? "🔖 దాచారు" : "🔖 దాచండి"}</button>
      </div>
      <div class="box"><h2>ఈ వార్త చదివాక మీకు ఎలా అనిపించింది?</h2><div class="reacts" id="reacts"></div></div>
      ${
        item.related?.length
          ? `<div class="box"><h2>ఇదే వార్త ఇతర పత్రికల్లో</h2><ul class="related">${item.related
              .map(
                (r) =>
                  `<li><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.title)}</a> <span class="pub">— ${esc(
                    r.publisher,
                  )}</span></li>`,
              )
              .join("")}</ul></div>`
          : ""
      }
    </article>
    <section class="discuss" id="discuss"></section>
    ${
      more.length
        ? `<div class="section-head" style="margin-top:28px"><h2>ఇవి కూడా చదవండి</h2></div>
           <div class="grid" id="more-grid">${more.map((i) => cardHTML(i)).join("")}</div>`
        : ""
    }`;
  $("#share").onclick = () => share(item);
  $("#save").onclick = (e) => {
    const on = saved.toggle(item);
    e.target.textContent = on ? "🔖 దాచారు" : "🔖 దాచండి";
    toast(on ? "దాచాం" : "తీసేశాం");
  };
  mountReactions($("#reacts"), thread);
  mountThread($("#discuss"), thread, { title: "మీ అభిప్రాయం చెప్పండి" });
  const grid = $("#more-grid");
  if (grid) {
    bindCardButtons(grid);
    decorate(grid);
  }
}

async function mountReactions(el, thread) {
  const paint = (counts = {}) => {
    const mine = myReacts.get(thread);
    el.innerHTML = REACTIONS.map(
      ([k, e, label]) =>
        `<button class="react ${mine === k ? "on" : ""}" data-k="${k}" title="${label}" aria-pressed="${mine === k}">
          ${e} <span>${label}</span> <b>${counts[k] || ""}</b></button>`,
    ).join("");
  };
  let counts = {};
  paint();
  try {
    counts = (await store.reactions([thread]))[thread] || {};
    paint(counts);
  } catch {}
  el.onclick = async (e) => {
    const b = e.target.closest("[data-k]");
    if (!b) return;
    if (myReacts.get(thread)) return toast("మీరు ఇప్పటికే స్పందించారు 🙏");
    const k = b.dataset.k;
    myReacts.set(thread, k);
    counts[k] = (counts[k] || 0) + 1;
    paint(counts);
    try {
      await store.react(thread, k);
    } catch {
      toast("సర్వర్‌ను చేరలేకపోయాం");
    }
  };
}

// ---- comment threads (stories and board posts) ------------------------------------------------
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
  document.title = "రచ్చబండ చర్చలు | గల్ఫ్ తెలుగు వార్తలు";
  const boards = state.community.boards;
  main.innerHTML = `
    <div class="hero"><h1>🌳 రచ్చబండ</h1>
      <p>ఊళ్లో అందరూ కలిసి మాట్లాడుకునే చోటు రచ్చబండ. ఇంటికి దూరంగా గల్ఫ్‌లో ఉన్న మనందరికీ ఇదే మన రచ్చబండ — సంఘాల కార్యక్రమాలు, ఉద్యోగాలు, సాయం, రూములు, ఇంటికి తిరుగు ప్రయాణం — ఏదైనా పంచుకోండి.</p></div>
    <div class="boards">${boards
      .map(
        (b) => `<a class="board" href="#/board/${b.id}"><span class="icon">${b.icon}</span><strong>${esc(b.title)}</strong>
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
  document.title = `${b.title} | గల్ఫ్ తెలుగు వార్తలు`;
  main.innerHTML = `<a class="back" href="#/board">← రచ్చబండ</a>
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
  let href;
  let where;
  if (kind === "board") {
    const b = state.community.boards.find((x) => x.id === key);
    href = `#/board/${key}`;
    where = b ? `${b.icon} ${b.title}` : "రచ్చబండ";
  } else {
    href = `#/story/${key}`;
    where = state.byId.get(key)?.title || "పాత వార్తపై";
  }
  return `<li><a href="${href}"><span class="quote">"${esc(c.body.slice(0, 90))}"</span>
    <small>— ${esc(c.name)}${c.place ? `, ${esc(c.place)}` : ""} · ${ago(c.created_at)} · ${esc(where.slice(0, 60))}</small></a></li>`;
}

// ---- sources & rules ----------------------------------------------------------------------------
function sourceItemHTML(s) {
  const inner = `${s.url ? `<img src="${favicon(s.url)}" alt="" loading="lazy" onerror="this.remove()" />` : `<span class="dot">🤝</span>`}
    <span>${esc(s.name)}${s.phone ? `<b class="phone">📞 ${esc(s.phoneText)}</b>` : ""}${s.note ? `<small>${esc(s.note)}</small>` : ""}</span>`;
  if (s.phone) return `<li><a href="tel:${esc(s.phone)}">${inner}</a></li>`;
  return s.url ? `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${inner}</a></li>` : `<li><div class="nolink">${inner}</div></li>`;
}

function renderSources() {
  document.title = "గల్ఫ్ తెలుగు డైరెక్టరీ | గల్ఫ్ తెలుగు వార్తలు";
  const counts = {};
  for (const i of state.news) counts[i.publisher] = (counts[i.publisher] || 0) + 1;
  const active = Object.entries(counts)
    .filter(([p]) => p)
    .sort((a, b) => b[1] - a[1]);
  main.innerHTML = `<div class="section-head"><h1>📒 గల్ఫ్ తెలుగు డైరెక్టరీ</h1></div>
    <p class="muted">హెల్ప్‌లైన్లు, రాయబార కార్యాలయాలు, ప్రభుత్వ సేవలు, తెలుగు సంఘాలు, వార్తా పత్రికలు — అన్నీ ఒకే చోట. ఫోన్ నంబర్‌పై నొక్కితే నేరుగా కాల్ వెళ్తుంది.</p>
    ${state.sources.groups
      .map(
        (g) => `<section class="src-group" id="dir-${g.id}"><h2>${esc(g.title)}</h2><ul class="src-list">${g.items
          .map(sourceItemHTML)
          .join("")}</ul>${
          g.id === "sanghalu"
            ? `<p class="muted" style="font-size:.85rem">మీ సంఘం ఈ జాబితాలో లేదా? <a href="#/board/sangham">మన సంఘాలు & వేడుకలు</a> బోర్డులో వివరాలు రాయండి.</p>`
            : ""
        }</section>`,
      )
      .join("")}
    <section class="src-group"><h2>ఈ సైట్‌లో వార్తలు వస్తున్న పత్రికలు (${active.length})</h2>
      <div class="chips">${active
        .map(([p, n]) => `<a class="chip" href="#/search/${encodeURIComponent(p)}">${esc(p)} · ${n}</a>`)
        .join("")}</div></section>`;
}

function renderRules() {
  document.title = "చర్చా నియమాలు | గల్ఫ్ తెలుగు వార్తలు";
  main.innerHTML = `<div class="section-head"><h1>చర్చా నియమాలు</h1></div>
    <div class="story"><p><strong>"కాలు జారితే తీసుకోగలం కానీ నోరు జారితే తీసుకోలేం."</strong> రచ్చబండ అందరిదీ — గల్ఫ్‌లో ఉన్న అన్ని ప్రాంతాల తెలుగు వారూ, ఇంటి దగ్గర వారి కుటుంబాలూ ఇక్కడ ఉంటారు.</p>
    <ol class="rules">
      <li>మర్యాదగా రాయండి. వ్యక్తిగత దూషణలు, బూతులు వద్దు.</li>
      <li>కులం, మతం, ప్రాంతం, లింగం పేరుతో ద్వేషం వ్యాపింపజేయవద్దు.</li>
      <li>తప్పుడు వార్తలు, పుకార్లు పంచవద్దు. ఆధారం ఉంటే లింక్ ఇవ్వండి.</li>
      <li>ఫోన్ నంబర్లు, పాస్‌పోర్ట్ / ఇఖామా నంబర్లు, చిరునామాలు వంటి వ్యక్తిగత వివరాలు పెట్టవద్దు — మీవి కానీ ఇతరులవి కానీ.</li>
      <li>ఉద్యోగం ఇప్పిస్తామని డబ్బులు అడిగే పోస్టులు నమ్మవద్దు. ఏజెంట్ రిజిస్టర్ అయ్యాడో లేదో <a href="https://emigrate.gov.in" target="_blank" rel="noopener">eMigrate</a>లో చూసుకోండి.</li>
      <li>అభ్యంతరకరమైన వ్యాఖ్య కనిపిస్తే 🚩 నొక్కండి. మూడు ఫిర్యాదులు వస్తే అది దాగిపోతుంది.</li>
    </ol></div>`;
}

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
      .join("")}</ul><p style="margin:8px 0 0"><a href="#/sources">అన్ని హెల్ప్‌లైన్లు, రాయబార కార్యాలయాలు →</a></p></section>
    <section class="widget wa-promo"><div class="wa-icon" aria-hidden="true">🟢</div>
      <p><strong>మీ వాట్సాప్ గ్రూపుల్లో పంచుకోండి</strong><br />గల్ఫ్‌లో ఉన్న మన వాళ్లందరికీ ఈ సైట్ చేరాలి.</p>
      <a class="btn wa" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(
        `గల్ఫ్ తెలుగు వారి వార్తలు, హెల్ప్‌లైన్లు, మన సంఘాల కార్యక్రమాలు — గల్ఫ్ తెలుగు వార్తలు: ${location.origin}${location.pathname}`,
      )}">వాట్సాప్‌లో పంపండి</a></section>
    <section class="widget market"><h2>రచ్చబండ బోర్డులు</h2><div class="market-grid">${[
      ["rooms", "🛏️", "రూములు", "#1e88e5"],
      ["jobs", "💼", "ఉద్యోగాలు", "#7b3fb5"],
      ["help", "🆘", "సాయం", "#e53935"],
      ["sangham", "🎉", "కార్యక్రమాలు", "#f39c12"],
      ["cricket", "🏏", "క్రికెట్", "#2e9d4e"],
      ["return", "🏠", "తిరుగు ప్రయాణం", "#5d6670"],
    ]
      .map(([id, i, t, c]) => `<a href="#/board/${id}" style="background:${c}"><span>${i}</span>${t}</a>`)
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
          )}). ఎక్స్ఛేంజ్ హౌస్ రేటు కొంచెం తక్కువగా ఉంటుంది.</p></section>`
        : ""
    }
    <section class="widget poll" id="poll"><h2>ఈరోజు ప్రశ్న</h2><p class="q">${esc(poll.q)}</p><div class="opts"></div></section>
    <section class="widget saying"><h2>నేటి సామెత</h2><blockquote>${esc(proverb.text)}</blockquote><p>${esc(proverb.meaning)}</p></section>
    <section class="widget"><h2>తాజా చర్చలు</h2><ul class="mini" id="recent"><li class="muted">లోడ్ అవుతోంది…</li></ul>
      <p style="margin:8px 0 0"><a class="btn ghost" href="#/board">💬 రచ్చబండకు వెళ్ళండి</a></p></section>
    <section class="widget word"><h2>తెలుగు పదం</h2><div class="w">${esc(word.word)}</div><p><strong>అర్థం:</strong> ${esc(
      word.meaning,
    )}</p><p class="muted">"${esc(word.use)}"</p></section>
    <section class="widget"><h2>ఎక్కువ చర్చించిన వార్తలు</h2><ul class="mini" id="hot"><li class="muted">…</li></ul></section>
    <section class="widget"><h2>తెలుగు సంఘాలు</h2><ul class="mini">${state.sources.groups
      .find((g) => g.id === "sanghalu")
      .items.slice(0, 6)
      .map((a) => `<li>${a.url ? `<a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.name)} ↗</a>` : esc(a.name)}</li>`)
      .join("")}</ul><p style="margin:8px 0 0"><a href="#/sources">అన్ని సంఘాలు →</a></p></section>`;

  tickClocks();
  mountPoll($("#poll"), poll);
  try {
    const recent = await store.recent(6);
    $("#recent").innerHTML = recent.length
      ? recent.map(recentHTML).join("")
      : `<li class="muted">ఇంకా ఎవరూ మాట్లాడలేదు. ఏదైనా వార్తపై మొదటి అభిప్రాయం మీరే చెప్పండి!</li>`;
    const pool = state.news.slice(0, 150);
    const counts = await store.counts(pool.map((i) => threadOf(i.id)));
    const hot = pool
      .map((i) => [i, counts[threadOf(i.id)] || 0])
      .filter(([, n]) => n)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    $("#hot").innerHTML = hot.length
      ? hot.map(([i, n]) => `<li><a href="#/story/${i.id}">${esc(i.title)}</a><small>💬 ${n} వ్యాఖ్యలు</small></li>`).join("")
      : `<li class="muted">ఇంకా చర్చలు మొదలవలేదు.</li>`;
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
