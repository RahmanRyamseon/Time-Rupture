const COUNTRY_NAMES = {
  BH: "Bahrain",
  SA: "Saudi Arabia",
  AE: "UAE",
  QA: "Qatar",
  OM: "Oman",
  KW: "Kuwait",
  MZ: "Mozambique",
  GCC: "GCC",
};

const state = { items: [], sources: null, q: "", country: "", kind: "" };
const $ = (id) => document.getElementById(id);

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Only http(s) links are rendered, so nothing from the data can inject a javascript: URL.
const safeUrl = (u) => (/^https?:\/\//.test(u ?? "") ? u : "#");

const hostOf = (u) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

function card(i) {
  const tags = i.countries.map((c) => `<span class="tag">${esc(COUNTRY_NAMES[c] ?? c)}</span>`).join("");
  const badge =
    i.category === "official" ? `<span class="badge official">Official</span>` : `<span class="badge">News</span>`;
  const publisher = i.publisher || hostOf(i.publisherUrl);
  const siteLink = i.publisherUrl
    ? ` · <a href="${esc(safeUrl(i.publisherUrl))}" target="_blank" rel="noopener noreferrer">${esc(hostOf(i.publisherUrl))} ↗</a>`
    : "";

  return `<li class="item">
    <div class="item-top">${badge}<time datetime="${esc(i.published)}">${fmtDate(i.published)}</time></div>
    <h3><a href="${esc(safeUrl(i.url))}" target="_blank" rel="noopener noreferrer">${esc(i.title)}</a></h3>
    ${i.description ? `<p class="desc">${esc(i.description)}</p>` : ""}
    <div class="item-foot">${tags}<span class="source">Source: ${esc(publisher)}${siteLink}</span></div>
  </li>`;
}

function render() {
  const q = state.q.trim().toLowerCase();
  const list = state.items.filter(
    (i) =>
      (!state.country || i.countries.includes(state.country)) &&
      (!state.kind || i.category === state.kind) &&
      (!q || `${i.title} ${i.publisher}`.toLowerCase().includes(q)),
  );
  $("count").textContent = `${list.length} ${list.length === 1 ? "item" : "items"}`;
  $("items").innerHTML = list.length
    ? list.map(card).join("")
    : `<li class="empty">${state.items.length ? "Nothing matches these filters." : "No updates have been collected yet. The daily job fills this in."}</li>`;
}

function fillCountries() {
  $("country").insertAdjacentHTML(
    "beforeend",
    Object.entries(COUNTRY_NAMES)
      .map(([code, name]) => `<option value="${code}">${esc(name)}</option>`)
      .join(""),
  );
}

function renderSources() {
  $("laws").innerHTML = state.sources.countries
    .map(
      (c) => `<article class="card">
      <p class="eyebrow">${esc(c.group)}</p>
      <h3>${esc(c.name)}</h3>
      <ul class="plain">
        ${c.laws
          .map(
            (l) =>
              `<li><a href="${esc(safeUrl(l.url))}" target="_blank" rel="noopener noreferrer">${esc(l.title)}</a><span class="muted"> · ${esc(l.status)}</span></li>`,
          )
          .join("")}
      </ul>
      <p class="muted">Regulator: <a href="${esc(safeUrl(c.regulator.url))}" target="_blank" rel="noopener noreferrer">${esc(c.regulator.name)}</a></p>
      ${c.note ? `<p class="note">${esc(c.note)}</p>` : ""}
    </article>`,
    )
    .join("");
}

function renderGoogle() {
  $("google").innerHTML = Object.entries(COUNTRY_NAMES)
    .map(([, name]) => {
      const q = encodeURIComponent(`${name} personal data protection law`);
      return `<a class="chip" href="https://www.google.com/search?q=${q}&tbm=nws" target="_blank" rel="noopener noreferrer">${esc(name)} news ↗</a>`;
    })
    .join("");
}

function bindControls() {
  $("search").addEventListener("input", (e) => {
    state.q = e.target.value;
    render();
  });
  $("country").addEventListener("change", (e) => {
    state.country = e.target.value;
    render();
  });
  $("kind").addEventListener("change", (e) => {
    state.kind = e.target.value;
    render();
  });
}

async function init() {
  bindControls();
  fillCountries();
  try {
    const [updates, sources] = await Promise.all([
      fetch("data/updates.json", { cache: "no-store" }).then((r) => r.json()),
      fetch("data/sources.json").then((r) => r.json()),
    ]);
    state.items = updates.items ?? [];
    state.sources = sources;
    $("updated").textContent = updates.generatedAt
      ? `Last updated ${new Date(updates.generatedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })} · ${state.items.length} items`
      : "No updates collected yet.";
    renderSources();
  } catch {
    $("updated").textContent = "Could not load the latest updates. Refresh the page to try again.";
  }
  renderGoogle();
  render();
}

init();
