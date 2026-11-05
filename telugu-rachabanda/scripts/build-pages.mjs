#!/usr/bin/env node
// Builds dist/: the site plus a ready-made HTML page for every section, story, board and
// directory page, so search engines can read each address without running the app.
// Vercel runs this on every deploy (see vercel.json). The app takes over once it loads.
//
//   node scripts/build-pages.mjs   → dist/

import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "dist");
export const SITE = "https://gulftelugunews.vercel.app";
const BRAND = "గల్ఫ్ తెలుగు వార్తలు";

// Keep in step with SECTIONS in app.js.
export const SECTIONS = {
  top: ["తెలుగు వారి వార్తలు", "గల్ఫ్ దేశాల్లోని తెలుగు వారి గురించిన తాజా వార్తలు"],
  uae: ["యూఏఈ తెలుగు వార్తలు", "దుబాయ్, అబుదాబి, షార్జా సహా యూఏఈలోని తెలుగు వారి వార్తలు, యూఏఈ నియమాలు"],
  saudi: ["సౌదీ అరేబియా తెలుగు వార్తలు", "రియాద్, జెద్దా, దమ్మామ్ సహా సౌదీలోని తెలుగు వారి వార్తలు, సౌదీ నియమాలు"],
  qatar: ["ఖతార్ తెలుగు వార్తలు", "దోహా సహా ఖతార్‌లోని తెలుగు వారి వార్తలు"],
  kuwait: ["కువైట్ తెలుగు వార్తలు", "కువైట్‌లోని తెలుగు వారి వార్తలు, కువైట్ నియమాలు"],
  oman: ["ఒమన్ తెలుగు వార్తలు", "మస్కట్ సహా ఒమన్‌లోని తెలుగు వారి వార్తలు"],
  bahrain: ["బహ్రెయిన్ తెలుగు వార్తలు", "మనామా సహా బహ్రెయిన్‌లోని తెలుగు వారి వార్తలు, బహ్రెయిన్ నియమాలు"],
  sangham: ["గల్ఫ్ తెలుగు సంఘాలు & వేడుకలు", "గల్ఫ్‌లోని తెలుగు సంఘాలు, కమిటీలు, బతుకమ్మ, ఉగాది, దసరా వేడుకలు"],
  exit: ["తిరుగు ప్రయాణం & గల్ఫ్ కార్మికుల కష్టాలు", "స్వదేశానికి తిరుగు ప్రయాణం, మృతదేహాల తరలింపు, చిక్కుకుపోయిన గల్ఫ్ కార్మికులు, క్షమాభిక్ష"],
  jobs: ["గల్ఫ్ ఉద్యోగాలు, వీసా & నియమాలు", "గల్ఫ్ వీసా, ఉద్యోగ, ట్రాఫిక్ నియమాల మార్పులు, నకిలీ ఏజెంట్లు, విమానాలు"],
  gulf: ["గల్ఫ్ పరిణామాలు", "గల్ఫ్‌లో ఉన్న అందరిపై ప్రభావం చూపే వార్తలు"],
};

export const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const day = (iso) => new Intl.DateTimeFormat("te-IN", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));

function storyList(items) {
  if (!items.length) return "<p>ఇంకా వార్తలు లేవు.</p>";
  return `<ul>${items
    .map(
      (i) =>
        `<li><a href="/story/${i.id}">${esc(i.title)}</a> — ${esc(i.publisher)}, <time datetime="${i.published}">${day(i.published)}</time></li>`,
    )
    .join("")}</ul>`;
}
const sectionLinks = () =>
  `<nav><ul>${Object.entries(SECTIONS)
    .map(([id, [t]]) => `<li><a href="/s/${id}">${esc(t)}</a></li>`)
    .join("")}<li><a href="/board">రచ్చబండ చర్చలు</a></li><li><a href="/sources">గల్ఫ్ తెలుగు డైరెక్టరీ</a></li></ul></nav>`;

// Fills the page template for one address.
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

export function buildPages(template, news, community, sources) {
  const items = news.items;
  const pages = [];
  const add = (p) => pages.push(p);

  add({
    path: "/",
    home: true,
    title: template.match(/<title>([\s\S]*?)<\/title>/)[1],
    description: template.match(/<meta name="description" content="([^"]*)"/)[1],
    body: `<h2>తెలుగు వారి తాజా వార్తలు</h2>${storyList(items.filter((i) => i.telugu).slice(0, 20))}
      <h2>గల్ఫ్ ఉద్యోగాలు, వీసా & నియమాలు</h2>${storyList(items.filter((i) => i.sections.includes("jobs")).slice(0, 10))}
      ${sectionLinks()}`,
  });

  for (const [id, [title, description]] of Object.entries(SECTIONS)) {
    const list = items.filter((i) => i.sections.includes(id));
    add({
      path: `/s/${id}`,
      title,
      description: `${description}. ${list.length} తాజా వార్తలు.`,
      body: `<h1>${esc(title)}</h1><p>${esc(description)}.</p>${storyList(list.slice(0, 60))}${sectionLinks()}`,
    });
  }

  for (const i of items) {
    const where = i.sections.filter((s) => SECTIONS[s]).map((s) => `<a href="/s/${s}">${esc(SECTIONS[s][0])}</a>`);
    const related = i.related?.length
      ? `<h2>ఇదే వార్త ఇతర పత్రికల్లో</h2><ul>${i.related
          .map((r) => `<li><a href="${esc(r.url)}" rel="nofollow noopener">${esc(r.title)}</a> — ${esc(r.publisher)}</li>`)
          .join("")}</ul>`
      : "";
    const more = items.filter((x) => x.id !== i.id && x.sections.some((s) => i.sections.includes(s))).slice(0, 8);
    add({
      path: `/story/${i.id}`,
      title: i.title,
      description: `${i.title} — ${i.publisher}, ${day(i.published)}. ఈ వార్తపై గల్ఫ్ తెలుగు వారి అభిప్రాయాలు, చర్చ.`,
      body: `<article><h1>${esc(i.title)}</h1>
        <p>${esc(i.publisher)} · <time datetime="${i.published}">${day(i.published)}</time> · ${where.join(" · ")}</p>
        ${i.description ? `<p>${esc(i.description)}</p>` : ""}
        <p><a href="${esc(i.url)}" rel="nofollow noopener">${esc(i.publisher)}లో పూర్తి వార్త చదవండి</a></p>
        ${related}</article>
        <h2>ఇవి కూడా చదవండి</h2>${storyList(more)}`,
    });
  }

  add({
    path: "/board",
    title: "రచ్చబండ – గల్ఫ్ తెలుగు వారి చర్చా వేదిక",
    description: "గల్ఫ్‌లోని తెలుగు వారి చర్చలు: సంఘాల కార్యక్రమాలు, ఉద్యోగాలు & వీసా, రూములు, సాయం, తిరుగు ప్రయాణం.",
    body: `<h1>రచ్చబండ – గల్ఫ్ తెలుగు వారి చర్చా వేదిక</h1><ul>${community.boards
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
    description: "గల్ఫ్‌లోని తెలుగు వారికి: ఏపీఎన్ఆర్టీఎస్, భారత రాయబార కార్యాలయ హెల్ప్‌లైన్లు, యూఏఈ, సౌదీ, ఖతార్, కువైట్, ఒమన్, బహ్రెయిన్ తెలుగు సంఘాలు, గల్ఫ్ పత్రికలు.",
    body: `<h1>గల్ఫ్ తెలుగు డైరెక్టరీ</h1>${sources.groups
      .map(
        (g) =>
          `<h2>${esc(g.title)}</h2><ul>${g.items
            .map(
              (s) =>
                `<li>${s.url ? `<a href="${esc(s.url)}" rel="noopener">${esc(s.name)}</a>` : esc(s.name)}${
                  s.phoneText ? ` — ${esc(s.phoneText)}` : ""
                }${s.note ? ` — ${esc(s.note)}` : ""}</li>`,
            )
            .join("")}</ul>`,
      )
      .join("")}`,
  });

  add({
    path: "/rules",
    title: "చర్చా నియమాలు",
    description: "గల్ఫ్ తెలుగు వార్తలు సైట్‌లో వ్యాఖ్యలు, చర్చలకు నియమాలు.",
    body: `<h1>చర్చా నియమాలు</h1><p>మర్యాదగా రాయండి. ద్వేషం, తప్పుడు వార్తలు, వ్యక్తిగత వివరాలు వద్దు.</p>`,
  });

  return pages;
}

export function sitemap(pages, news) {
  const lastmod = (p) => {
    const id = p.path.startsWith("/story/") ? p.path.slice(7) : null;
    const item = id && news.items.find((i) => i.id === id);
    return (item ? item.published : news.updated || new Date().toISOString()).slice(0, 10);
  };
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url><loc>${SITE}${p.path === "/" ? "/" : p.path}</loc><lastmod>${lastmod(p)}</lastmod></url>`).join("\n")}
</urlset>
`;
}

async function main() {
  const read = async (f) => readFile(join(root, f), "utf8");
  const template = await read("index.html");
  const [news, community, sources] = await Promise.all(
    ["data/news.json", "data/community.json", "data/sources.json"].map(async (f) => JSON.parse(await read(f))),
  );

  await rm(out, { recursive: true, force: true });
  await mkdir(join(out, "data"), { recursive: true });
  for (const f of ["app.js", "store.js", "config.js", "style.css", "robots.txt"]) await cp(join(root, f), join(out, f));
  for (const f of ["news.json", "community.json", "sources.json", "rates.json"]) await cp(join(root, "data", f), join(out, "data", f));

  const pages = buildPages(template, news, community, sources);
  for (const p of pages) {
    // /s/uae → dist/s/uae.html, served at /s/uae (cleanUrls in vercel.json).
    const file = p.path === "/" ? join(out, "index.html") : join(out, `${p.path.slice(1)}.html`);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, page(template, p));
  }
  await writeFile(join(out, "sitemap.xml"), sitemap(pages, news));
  console.log(`Built ${pages.length} pages into dist/.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
