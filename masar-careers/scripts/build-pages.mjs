#!/usr/bin/env node
/*
 * يولّد صفحات ثابتة قابلة للأرشفة في محركات البحث:
 *   doc/<id>.html  لكل نموذج مستند في data/templates.js
 *   cv/<id>.html   لكل مثال سيرة ذاتية في data/resume-examples.js
 * ويحدّث sitemap.xml.
 *
 * التشغيل:  node masar-careers/scripts/build-pages.mjs
 * لا توجد اعتماديات. أعد التشغيل بعد تعديل النماذج أو الأمثلة، ثم ارفع الملفات الناتجة.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "https://arabic-ats-resume.vercel.app";

// تحميل ملفات البيانات (مكتوبة للمتصفح وتستخدم window)
const sandbox = { window: {} };
vm.createContext(sandbox);
for (const f of ["data/templates.js", "data/resume-examples.js"]) {
  vm.runInContext(readFileSync(join(ROOT, f), "utf8"), sandbox, { filename: f });
}
const { MASAR_TEMPLATES: TPLS, MASAR_CATEGORIES: CATS, MASAR_RESUME_EXAMPLES: EXAMPLES } = sandbox.window;

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]);
const LATIN = /(\([A-Za-z][A-Za-z0-9 .,&+#@/_-]*\)|[A-Za-z][A-Za-z0-9 .,&+#@/_-]*[A-Za-z0-9+#]|[A-Za-z])/;
const escBidi = (s) =>
  String(s ?? "")
    .split(LATIN)
    .map((p, i) => (i % 2 ? `<bdi>${esc(p)}</bdi>` : esc(p)))
    .join("");

const FAVICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='22' fill='%230b6b5d'/%3E%3Ctext x='50' y='70' font-size='62' text-anchor='middle' fill='white' font-family='Tahoma'%3E%D9%85%3C/text%3E%3C/svg%3E";

function page({ path, title, description, body, jsonld = [], scripts = "" }) {
  const url = BASE + path;
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${url}">
  <link rel="alternate" hreflang="ar" href="${url}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:locale" content="ar_AR">
  <meta property="og:url" content="${url}">
  <meta property="og:site_name" content="مسار – سيرة ذاتية عربية ATS">
  <meta name="twitter:card" content="summary">
${jsonld.map((j) => `  <script type="application/ld+json">${JSON.stringify(j)}</script>`).join("\n")}
  <link rel="icon" href="${FAVICON}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&family=Noto+Naskh+Arabic:wght@400;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../assets/style.css">
</head>
<body>
  <a class="skip" href="#main">تخطَّ إلى المحتوى</a>
  <header class="site-header">
    <div class="wrap">
      <a class="brand" href="../index.html"><span class="brand-mark">م</span><span>مسار<small>سيرة ذاتية عربية ATS ونماذج التوظيف</small></span></a>
      <nav class="nav" aria-label="القائمة الرئيسية">
        <a href="../index.html">الرئيسية</a>
        <a href="../resume.html">منشئ السيرة</a>
        <a href="../documents.html">نماذج المستندات</a>
        <a href="../interview.html">المقابلة</a>
        <a href="../writing.html">لغة العمل</a>
        <a href="../resources.html">المصادر</a>
      </nav>
    </div>
  </header>
  <main id="main" class="wrap">
${body}
  </main>
  <footer class="site-footer">
    <div class="wrap">
      <p>مسار — منشئ سيرة ذاتية عربية متوافقة مع ATS ونماذج مستندات التوظيف، مجاناً. المحتوى إرشادي ولا يُعد استشارة قانونية.</p>
    </div>
  </footer>
  <script src="../assets/common.js"></script>
${scripts}
</body>
</html>
`;
}

const crumbs = (items) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: BASE + path })),
});
const crumbHtml = (items) =>
  `<nav class="small muted" aria-label="مسار التصفح" style="margin-top:18px">${items
    .map(([name, href], i) => (i < items.length - 1 ? `<a href="${href}">${esc(name)}</a> ‹ ` : esc(name)))
    .join("")}</nav>`;

/* ======================= صفحات المستندات ======================= */
function fillTemplate(t, gender = "m") {
  const values = {};
  for (const f of t.fields) values[f.key] = f.type === "date" ? "" : f.type === "gender" ? gender : f.value ?? "";
  const label = (k) => t.fields.find((f) => f.key === k)?.label || k;
  return esc(t.body)
    .replace(/\{\{g:([^|}]*)\|([^}]*)\}\}/g, (_, m, f) => (gender === "f" ? f : m))
    .replace(/\{\{(\w+)\}\}/g, (_, k) => {
      const v = String(values[k] ?? "").trim();
      return v ? escBidi(v) : `<span class="ph">[${esc(label(k))}]</span>`;
    });
}

const docPaths = [];
rmSync(join(ROOT, "doc"), { recursive: true, force: true });
mkdirSync(join(ROOT, "doc"), { recursive: true });
for (const t of TPLS) {
  const cat = CATS.find((c) => c.id === t.cat);
  const path = `/doc/${t.id}`;
  docPaths.push(path);
  const plainTitle = t.title.replace(/\s*\(.*?\)\s*/g, " ").trim();
  const title = `نموذج ${plainTitle} بالعربية – جاهز للتعبئة وتنزيل Word | مسار`;
  const description = `${t.desc} نموذج ${plainTitle} بصيغة رسمية عربية، يُعبّأ مجاناً ويُنزَّل بصيغة Word أو PDF، مع ضبط التذكير والتأنيث والتاريخ الهجري.`;
  const related = TPLS.filter((x) => x.cat === t.cat && x.id !== t.id);
  const hasGender = t.fields.some((f) => f.type === "gender");
  const body = `
    ${crumbHtml([["الرئيسية", "../index.html"], ["نماذج المستندات", "../documents.html"], [cat.title, "../documents.html"], [plainTitle]])}
    <section class="page-hero">
      <p class="eyebrow">${cat.icon} ${esc(cat.title)}${t.audience === "employer" ? " · نموذج لجهة العمل" : ""}</p>
      <h1>نموذج ${esc(t.title)}</h1>
      <p>${esc(t.desc)}</p>
      <div class="btn-row">
        <a class="btn" href="../documents.html#${t.id}">✍️ عبّئ هذا النموذج الآن ونزّله Word / PDF</a>
        <button class="btn ghost" type="button" id="copy-sample">📋 نسخ النص</button>
      </div>
    </section>
    <div class="workspace" style="grid-template-columns: 1fr minmax(260px, 320px)">
      <div>
        <h2 style="margin-top:0">نص النموذج${hasGender ? " (صيغة المذكر)" : ""}</h2>
        <div class="paper" id="sample"><div class="doc-text">${fillTemplate(t, "m")}</div></div>
        <p class="muted small" style="margin-top:10px">العبارات بين القوسين المظللة تُستبدل ببياناتك. ${
          hasGender ? "عند التعبئة في المولّد تتحول الصيغ تلقائياً إلى المؤنث إذا اخترت ذلك." : ""
        }</p>
      </div>
      <aside>
        <div class="card">
          <h3>الحقول التي ستحتاجها</h3>
          <ul class="check small">${t.fields.filter((f) => f.type !== "gender").map((f) => `<li>${esc(f.label)}</li>`).join("")}</ul>
          <a class="btn small" href="../documents.html#${t.id}" style="margin-top:10px">ابدأ التعبئة</a>
        </div>
        ${
          related.length
            ? `<div class="card" style="margin-top:14px"><h3>نماذج ذات صلة</h3><ul class="check small">${related
                .map((r) => `<li><a href="${r.id}.html">${esc(r.title)}</a></li>`)
                .join("")}</ul></div>`
            : ""
        }
        <div class="card" style="margin-top:14px"><h3>أنشئ سيرتك الذاتية</h3><p class="muted small">منشئ سيرة ذاتية عربية متوافقة مع ATS، مع أمثلة جاهزة حسب المهنة.</p><a class="btn ghost small" href="../resume.html#builder">افتح المنشئ</a></div>
      </aside>
    </div>
    <p class="note small"><b>تنبيه:</b> هذا النموذج إرشادي للصياغة. راجع الإجراءات والمدد النظامية مع جهة عملك وقانون العمل في بلدك.</p>`;
  const html = page({
    path,
    title,
    description,
    body,
    jsonld: [crumbs([["الرئيسية", "/"], ["نماذج المستندات", "/documents"], [plainTitle, path]])],
    scripts: `  <script>document.getElementById("copy-sample").addEventListener("click", () => Masar.copy(document.getElementById("sample").innerText));</script>`,
  });
  writeFileSync(join(ROOT, "doc", `${t.id}.html`), html);
}

/* ======================= صفحات أمثلة السير ======================= */
const lines = (s) => String(s || "").split("\n").map((l) => l.trim()).filter(Boolean);
const list = (s) => String(s || "").split(/[،,\n]/).map((l) => l.trim()).filter(Boolean);
function renderResume(d) {
  const bul = (title, s) => (lines(s).length ? `<h2>${title}</h2><ul>${lines(s).map((l) => `<li>${escBidi(l)}</li>`).join("")}</ul>` : "");
  const range = (a, b) => [a, b].filter(Boolean).map(escBidi).join(" – ");
  const contact = [d.phone && `<span dir="ltr">${esc(d.phone)}</span>`, d.email && `<span dir="ltr">${esc(d.email)}</span>`, d.city && esc(d.city), d.linkedin && `<span dir="ltr">${esc(d.linkedin)}</span>`]
    .filter(Boolean)
    .map((c) => `<span>${c}</span>`)
    .join(" | ");
  return `<h1>${escBidi(d.name)}</h1><div class="r-title">${escBidi(d.title)}</div><div class="r-contact">${contact}</div>
    <h2>الملخص المهني</h2><p>${escBidi(d.summary)}</p>
    <h2>الخبرات العملية</h2>${d.experience
      .map(
        (x) => `<div class="r-item"><div class="r-item-head"><b>${escBidi(x.role)}</b><span class="r-dates">${range(x.from, x.to)}</span></div>
      <div class="r-org">${[x.org, x.city].filter(Boolean).map(escBidi).join(" – ")}</div><ul>${lines(x.points).map((l) => `<li>${escBidi(l)}</li>`).join("")}</ul></div>`
      )
      .join("")}
    <h2>التعليم</h2>${d.education
      .map(
        (x) => `<div class="r-item"><div class="r-item-head"><b>${escBidi(x.degree)}</b><span class="r-dates">${range(x.from, x.to)}</span></div>
      <div class="r-org">${escBidi(x.school)}</div>${lines(x.note).map((n) => `<div>${escBidi(n)}</div>`).join("")}</div>`
      )
      .join("")}
    ${list(d.skills).length ? `<h2>المهارات الفنية</h2><p>${list(d.skills).map(escBidi).join("، ")}</p>` : ""}
    ${list(d.soft).length ? `<h2>المهارات الشخصية</h2><p>${list(d.soft).map(escBidi).join("، ")}</p>` : ""}
    ${bul("الشهادات المهنية", d.certs)}${bul("الدورات التدريبية", d.courses)}${bul("اللغات", d.languages)}${bul("العمل التطوعي", d.volunteer)}`;
}

const cvPaths = [];
rmSync(join(ROOT, "cv"), { recursive: true, force: true });
mkdirSync(join(ROOT, "cv"), { recursive: true });
for (const x of EXAMPLES) {
  const path = `/cv/${x.id}`;
  cvPaths.push(path);
  const plain = x.title.replace(/\/ة|\/ي\/ة|\/ي/g, "");
  const title = `نموذج سيرة ذاتية ${plain} بالعربية متوافق مع ATS | مسار`;
  const description = `مثال كامل لسيرة ذاتية ${plain} باللغة العربية (${x.level})، بصياغة إنجازات رقمية وكلمات مفتاحية مناسبة لأنظمة الفرز الآلي ATS. عدّله مجاناً ونزّله PDF أو Word.`;
  const others = EXAMPLES.filter((o) => o.id !== x.id);
  const body = `
    ${crumbHtml([["الرئيسية", "../index.html"], ["منشئ السيرة", "../resume.html"], ["أمثلة السير", "../resume.html#examples"], [plain]])}
    <section class="page-hero">
      <p class="eyebrow">${x.icon} مثال سيرة ذاتية · ${esc(x.level)}</p>
      <h1>نموذج سيرة ذاتية ${esc(plain)} بالعربية</h1>
      <p>مثال كامل جاهز للتعديل، مكتوب بلغة عربية مهنية ومتوافق مع أنظمة الفرز الآلي (ATS): عناوين أقسام قياسية، وإنجازات رقمية، وكلمات مفتاحية من لغة إعلانات الوظائف.</p>
      <div class="btn-row">
        <a class="btn" href="../resume.html?example=${x.id}#builder">🛠️ استخدم هذا المثال في المنشئ</a>
        <a class="btn ghost" href="../resume.html#builder">ابدأ سيرة فارغة</a>
      </div>
    </section>
    <div class="workspace" style="grid-template-columns: 1fr minmax(260px, 320px)">
      <div class="paper resume ats">${renderResume(x.data)}</div>
      <aside>
        <div class="card">
          <h3>🔑 كلمات مفتاحية لهذه المهنة</h3>
          <div class="chips">${x.keywords.map((k) => `<span class="chip">${escBidi(k)}</span>`).join("")}</div>
          <p class="muted small" style="margin-top:8px">انسخ الكلمات الواردة في إعلان الوظيفة نفسه بنصها، فأنظمة ATS تطابق الكلمات حرفياً.</p>
        </div>
        <div class="card" style="margin-top:14px">
          <h3>لماذا يعمل هذا المثال؟</h3>
          <ul class="check small">
            <li>ملخص مهني من 3 أسطر يبدأ بالمسمى وسنوات الخبرة.</li>
            <li>كل نقطة تبدأ بمصدر قوي وتنتهي بنتيجة قابلة للقياس.</li>
            <li>عناوين أقسام قياسية تقرؤها أنظمة الفرز الآلي.</li>
            <li>المصطلحات التقنية بحروفها الأصلية (مثل <bdi>Excel</bdi>).</li>
          </ul>
        </div>
        <div class="card" style="margin-top:14px">
          <h3>أمثلة أخرى</h3>
          <ul class="check small">${others.map((o) => `<li><a href="${o.id}.html">${o.icon} ${esc(o.title)}</a></li>`).join("")}</ul>
        </div>
        <div class="card" style="margin-top:14px">
          <h3>ستحتاجها أيضاً</h3>
          <ul class="check small">
            <li><a href="../doc/cover-letter.html">خطاب التقديم على وظيفة</a></li>
            <li><a href="../doc/interview-thanks.html">رسالة شكر بعد المقابلة</a></li>
            <li><a href="../doc/offer-accept.html">قبول العرض الوظيفي</a></li>
          </ul>
        </div>
      </aside>
    </div>
    <p class="muted small">الأسماء والجهات والأرقام في هذا المثال خيالية لأغراض التوضيح.</p>`;
  writeFileSync(
    join(ROOT, "cv", `${x.id}.html`),
    page({ path, title, description, body, jsonld: [crumbs([["الرئيسية", "/"], ["منشئ السيرة", "/resume"], [plain, path]])] })
  );
}

/* ======================= sitemap ======================= */
const main = ["/", "/resume", "/documents", "/interview", "/writing", "/resources"];
const today = new Date().toISOString().slice(0, 10);
const prio = (p) => (p === "/" || p === "/resume" ? "1.0" : p.startsWith("/cv/") || p === "/documents" ? "0.9" : "0.8");
writeFileSync(
  join(ROOT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...main, ...cvPaths, ...docPaths]
  .map((p) => `  <url><loc>${BASE}${p}</loc><lastmod>${today}</lastmod><priority>${prio(p)}</priority></url>`)
  .join("\n")}
</urlset>
`
);

console.log(`doc pages: ${docPaths.length}, cv pages: ${cvPaths.length}, sitemap: ${main.length + cvPaths.length + docPaths.length} urls`);
