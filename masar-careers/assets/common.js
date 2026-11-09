/* أدوات مشتركة بين صفحات الموقع */
(function () {
  const Masar = {};

  Masar.esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c]));

  /** يهرّب النص ويعزل المقاطع اللاتينية (مثل IELTS 7.0) بوسم <bdi> لتجنب انقلاب الاتجاه داخل النص العربي */
  Masar.escBidi = (s) =>
    String(s ?? "")
      .split(/(\([A-Za-z][A-Za-z0-9 .,&+#@\/_-]*\)|[A-Za-z][A-Za-z0-9 .,&+#@\/_-]*[A-Za-z0-9+#]|[A-Za-z])/)
      .map((part, i) => (i % 2 ? `<bdi>${Masar.esc(part)}</bdi>` : Masar.esc(part)))
      .join("");

  const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
  /** تحويل الأرقام الغربية (0-9) إلى أرقام عربية مشرقية (٠-٩) */
  Masar.toArabicDigits = (s) => String(s).replace(/[0-9]/g, (d) => AR_DIGITS[d]);
  /** تحويل الأرقام المشرقية إلى غربية */
  Masar.toLatinDigits = (s) => String(s).replace(/[٠-٩]/g, (d) => AR_DIGITS.indexOf(d));

  /** التاريخ بصيغة عربية؛ calendar = "gregory" أو "islamic-umalqura" */
  Masar.formatDate = (calendar = "gregory", date = new Date()) => {
    try {
      const fmt = new Intl.DateTimeFormat(`ar-SA-u-ca-${calendar}-nu-latn`, { day: "numeric", month: "long", year: "numeric" });
      let out = fmt.format(date);
      if (calendar === "gregory" && !/م$/.test(out)) out += "م";
      return out;
    } catch {
      return date.toLocaleDateString("ar");
    }
  };

  Masar.toast = (msg) => {
    let t = document.querySelector(".toast");
    if (!t) {
      t = document.createElement("div");
      t.className = "toast";
      t.setAttribute("role", "status");
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove("show"), 2200);
  };

  Masar.copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    Masar.toast("تم النسخ ✓");
  };

  /**
   * تنزيل محتوى HTML كملف Word (‎.doc) باتجاه من اليمين إلى اليسار.
   * filename لاتيني (بعض المتصفحات تتجاهل الأسماء العربية في التنزيل)، وtitle عنوان المستند العربي.
   */
  Masar.downloadWord = (filename, bodyHtml, extraCss = "", title = filename) => {
    const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40" lang="ar" dir="rtl">
<head><meta charset="utf-8"><title>${Masar.esc(title)}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>
  @page { size: 21cm 29.7cm; margin: 2cm; }
  body { direction: rtl; font-family: "Sakkal Majalla", "Traditional Arabic", "Arial", sans-serif; font-size: 14pt; line-height: 1.6; }
  p { margin: 0 0 6pt; direction: rtl; text-align: right; }
  h1, h2, h3 { direction: rtl; text-align: right; }
  .doc-title { text-align: center; font-weight: bold; text-decoration: underline; font-size: 16pt; }
  table { border-collapse: collapse; width: 100%; }
  td, th { border: 1px solid #999; padding: 4pt 6pt; text-align: right; }
  ${extraCss}
</style></head>
<body dir="rtl">${bodyHtml}</body></html>`;
    const blob = new Blob(["﻿", html], { type: "application/msword" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename.replace(/[\\/:*?"<>|]/g, "-") + ".doc";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 500);
  };

  Masar.downloadText = (filename, text, type = "application/json") => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 500);
  };

  Masar.store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem("masar:" + key);
        return v == null ? fallback : JSON.parse(v);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem("masar:" + key, JSON.stringify(value));
      } catch {
        /* التخزين غير متاح (وضع التصفح الخاص مثلاً) */
      }
    },
  };

  /** يجهّز نسخة من العنصر في حاوية الطباعة ويخفي بقية الصفحة */
  Masar.preparePrint = (el) => {
    let root = document.getElementById("print-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "print-root";
      document.body.appendChild(root);
    }
    const copy = el.cloneNode(true);
    copy.removeAttribute("id");
    // نقل حالة مربعات الاختيار (الخاصية لا تُنسخ مع cloneNode)
    const src = el.querySelectorAll("input[type=checkbox]");
    copy.querySelectorAll("input[type=checkbox]").forEach((c, i) => c.toggleAttribute("checked", src[i].checked));
    root.replaceChildren(copy);
    document.body.classList.add("printing");
  };

  /** طباعة عنصر واحد فقط من الصفحة */
  Masar.printElement = (el) => {
    Masar.preparePrint(el);
    window.print();
  };
  window.addEventListener("afterprint", () => document.body.classList.remove("printing"));

  // تمييز رابط الصفحة الحالية في القائمة
  document.addEventListener("DOMContentLoaded", () => {
    const here = location.pathname.split("/").pop().replace(/\.html$/, "") || "index";
    document.querySelectorAll(".nav a").forEach((a) => {
      const target = a.getAttribute("href").replace(/\.html$/, "").replace(/^\.\//, "") || "index";
      if (target === here) a.setAttribute("aria-current", "page");
    });
    const y = document.getElementById("year");
    if (y) y.textContent = new Date().getFullYear();
  });

  window.Masar = Masar;
})();
