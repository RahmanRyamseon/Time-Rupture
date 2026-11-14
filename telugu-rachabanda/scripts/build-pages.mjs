#!/usr/bin/env node
// Builds dist/: the site plus a ready-made HTML page for every guide, topic, country, board and
// legal page, so search engines can read each address without running the app. Vercel runs this
// on every deploy (see vercel.json); the app takes over once it loads.
//
//   node scripts/build-pages.mjs   → dist/

import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "dist");
export const SITE = "https://gulfteluguguide.vercel.app";
const BRAND = "గల్ఫ్ తెలుగు గైడ్";

export const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const day = (iso) => new Intl.DateTimeFormat("te-IN", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));

export function page(template, { path, title, description, body, home = false }) {
  const url = `${SITE}${path}`;
  const fullTitle = home ? title : `${title} | ${BRAND}`;
  let html = template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(fullTitle)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(description)}$2`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(fullTitle)}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(description)}$2`)
    .replace(/<main id="main" tabindex="-1"><\/main>/, `<main id="main" tabindex="-1">${body}</main>`);
  // Only the homepage keeps the site-wide hidden H1; other pages carry their own.
  if (!home) html = html.replace(/<h1 class="sr-only">([\s\S]*?)<\/h1>/, '<p class="sr-only">$1</p>');
  return html;
}

// Same as fillLegal in app.js: fills contact placeholders from data/site.json.
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


const guideList = (guides) =>
  `<ul>${guides.map((g) => `<li><a href="/g/${g.id}">${esc(g.title)}</a> — ${esc(g.summary)}</li>`).join("")}</ul>`;
const sourceItem = (s) =>
  `<li>${s.url ? `<a href="${esc(s.url)}" rel="noopener">${esc(s.name)}</a>` : esc(s.name)}${s.phoneText ? ` — ${esc(s.phoneText)}` : ""}${
    s.note ? ` — ${esc(s.note)}` : ""
  }</li>`;

export function buildPages(template, { guides, countries, community, sources, legal = {}, site = {} }) {
  const pages = [];
  const add = (p) => pages.push(p);
  const nav = `<nav><ul>${guides.categories
    .map((c) => `<li><a href="/t/${c.id}">${esc(c.title)} (${esc(c.en)})</a></li>`)
    .join("")}${countries.countries.map((c) => `<li><a href="/c/${c.id}">${esc(c.name)} (${esc(c.en)})</a></li>`).join("")}</ul></nav>`;

  add({
    path: "/",
    home: true,
    title: template.match(/<title>([\s\S]*?)<\/title>/)[1],
    description: template.match(/<meta name="description" content="([^"]*)"/)[1],
    lastmod: countries.checked,
    body: `<h2>గైడ్లు</h2>${guideList(guides.guides)}${nav}`,
  });

  for (const c of guides.categories) {
    const list = guides.guides.filter((g) => g.cat === c.id);
    add({
      path: `/t/${c.id}`,
      title: `${c.title} – ${c.en}`,
      description: `${c.desc} గల్ఫ్‌లోని తెలుగు వారికి గైడ్లు.`,
      body: `<h1>${esc(c.title)} – ${esc(c.en)}</h1><p>${esc(c.desc)}</p>${guideList(list)}${nav}`,
    });
  }

  for (const g of guides.guides) {
    const cat = guides.categories.find((c) => c.id === g.cat);
    add({
      path: `/g/${g.id}`,
      title: `${g.title} – ${g.en}`,
      description: `${g.summary} ${g.en_summary}`.slice(0, 300),
      lastmod: g.checked,
      body: `<article><p><a href="/t/${g.cat}">${esc(cat.title)}</a></p><h1>${esc(g.title)}</h1><p lang="en">${esc(g.en)}</p>
        <p>చివరిగా సరిచూసినది: ${day(g.checked)}</p><p>${esc(g.summary)}</p>${g.html}
        <h2>అధికారిక మూలాలు</h2><ul>${g.sources.map((s) => `<li><a href="${esc(s.url)}" rel="noopener">${esc(s.name)}</a></li>`).join("")}</ul>
        <p lang="en">${esc(g.en_summary)}</p>
        <p>ఇది సాధారణ మార్గదర్శనం మాత్రమే, న్యాయ సలహా కాదు.</p></article>`,
    });
  }

  for (const c of countries.countries) {
    add({
      path: `/c/${c.id}`,
      title: `${c.name} తెలుగు గైడ్ – ${c.en}`,
      description: `${c.name}లో తెలుగు వారికి: ${c.idCard}, కార్మిక శాఖ ఫిర్యాదులు, భారత రాయబార కార్యాలయం, హెల్ప్‌లైన్లు, తెలుగు సంఘాలు.`,
      lastmod: countries.checked,
      body: `<h1>${esc(c.name)} – ${esc(c.en)}</h1>
        <h2>ఐడీ కార్డు</h2><p>${esc(c.idCard)} — <a href="${esc(c.residence.url)}" rel="noopener">${esc(c.residence.name)}</a></p>
        <h2>కార్మిక శాఖ</h2><p><a href="${esc(c.labour.url)}" rel="noopener">${esc(c.labour.name)}</a>${c.labour.phoneText ? ` — ${esc(c.labour.phoneText)}` : ""}</p>
        <h2>భారత రాయబార కార్యాలయం</h2><ul>${c.embassies.map((u) => `<li><a href="${esc(u)}" rel="noopener">${esc(u)}</a></li>`).join("")}</ul>
        ${c.notes.length ? `<ul>${c.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}${nav}`,
    });
  }

  const group = (id) => sources.groups.find((g) => g.id === id);
  add({
    path: "/updates",
    title: "అధికారిక సమాచారం – Official updates",
    description: "కొత్త నియమాలు, ఆమ్నెస్టీ, ప్రయాణ హెచ్చరికలు — భారత రాయబార కార్యాలయాలు, గల్ఫ్ కార్మిక శాఖలు, భారత ప్రభుత్వ అధికారిక ఛానళ్లు.",
    body: `<h1>అధికారిక సమాచారం</h1><ul>${group("missions").items.map(sourceItem).join("")}</ul>
      <ul>${countries.countries.map((c) => sourceItem({ name: c.labour.name, url: c.labour.url })).join("")}</ul>
      <ul>${group("portals").items.map(sourceItem).join("")}</ul>`,
  });

  add({
    path: "/board",
    title: "రచ్చబండ – గల్ఫ్ తెలుగు వారి ముచ్చట్ల వేదిక",
    description: "గల్ఫ్‌లోని తెలుగు వారి ప్రశ్నలు, అనుభవాలు: సంఘాల కార్యక్రమాలు, ఉద్యోగాలు & వీసా, రూములు, సాయం, తిరుగు ప్రయాణం.",
    body: `<h1>🌳 రచ్చబండ – గల్ఫ్ తెలుగు వారి ముచ్చట్ల వేదిక</h1><ul>${community.boards
      .map((b) => `<li><a href="/board/${b.id}">${esc(b.title)}</a> — ${esc(b.desc)}</li>`)
      .join("")}</ul>`,
  });
  for (const b of community.boards)
    add({
      path: `/board/${b.id}`,
      title: `${b.title} – రచ్చబండ`,
      description: b.desc,
      body: `<h1>${esc(b.title)}</h1><p>${esc(b.desc)}</p><p><a href="/board">అన్ని చర్చా వేదికలు</a></p>`,
    });

  add({
    path: "/sources",
    title: "గల్ఫ్ తెలుగు డైరెక్టరీ – హెల్ప్‌లైన్లు, రాయబార కార్యాలయాలు, తెలుగు సంఘాలు",
    description: "ఏపీఎన్ఆర్టీఎస్, భారత రాయబార కార్యాలయ హెల్ప్‌లైన్లు, ప్రభుత్వ సేవలు, యూఏఈ, సౌదీ, ఖతార్, కువైట్, ఒమన్, బహ్రెయిన్ తెలుగు సంఘాలు.",
    body: `<h1>గల్ఫ్ తెలుగు డైరెక్టరీ</h1>${sources.groups.map((g) => `<h2>${esc(g.title)}</h2><ul>${g.items.map(sourceItem).join("")}</ul>`).join("")}`,
  });

  for (const [id, p] of Object.entries(legal))
    add({ path: `/${id}`, title: p.title, description: p.description, body: `<h1>${esc(p.title)}</h1>${fillLegal(p.html, site)}` });

  return pages;
}

export function sitemap(pages, today = new Date().toISOString().slice(0, 10)) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url><loc>${SITE}${p.path}</loc><lastmod>${(p.lastmod || today).slice(0, 10)}</lastmod></url>`).join("\n")}
</urlset>
`;
}

async function main() {
  const read = async (f) => JSON.parse(await readFile(join(root, f), "utf8"));
  const template = await readFile(join(root, "index.html"), "utf8");
  const data = {};
  for (const k of ["guides", "countries", "community", "sources", "legal", "site"]) data[k] = await read(`data/${k}.json`);

  await rm(out, { recursive: true, force: true });
  await mkdir(join(out, "data"), { recursive: true });
  for (const f of ["app.js", "store.js", "gratuity.js", "config.js", "style.css", "robots.txt"]) await cp(join(root, f), join(out, f));
  for (const f of ["guides.json", "countries.json", "community.json", "sources.json", "rates.json", "legal.json", "site.json"])
    await cp(join(root, "data", f), join(out, "data", f));

  const pages = buildPages(template, data);
  for (const p of pages) {
    // /g/gratuity → dist/g/gratuity.html, served at /g/gratuity (cleanUrls in vercel.json).
    const file = p.path === "/" ? join(out, "index.html") : join(out, `${p.path.slice(1)}.html`);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, page(template, p));
  }
  await writeFile(join(out, "sitemap.xml"), sitemap(pages));
  console.log(`Built ${pages.length} pages into dist/.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
