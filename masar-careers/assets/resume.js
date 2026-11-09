/* منشئ السيرة الذاتية العربية */
(function () {
  const { esc } = Masar;
  const tx = Masar.escBidi;

  const SAMPLE = {
    name: "ريم خالد المطيري",
    title: "أخصائية تسويق رقمي",
    phone: "+966 50 000 0000",
    email: "reem@example.com",
    city: "الرياض، المملكة العربية السعودية",
    linkedin: "linkedin.com/in/reem-example",
    summary:
      "أخصائية تسويق رقمي بخبرة 5 سنوات في إدارة الحملات الإعلانية وتحسين محركات البحث للعلامات التجارية في قطاعي التجزئة والتقنية. أسهمتُ في رفع المبيعات الإلكترونية بنسبة 45% عبر حملات مبنية على البيانات، وأتطلع إلى قيادة استراتيجية النمو الرقمي في جهة طموحة.",
    personal: { show: true, nationality: "سعودية", dob: "", marital: "", visa: "" },
    experience: [
      {
        role: "أخصائية تسويق رقمي أولى",
        org: "شركة نجد للتجزئة",
        city: "الرياض",
        from: "2023",
        to: "حتى الآن",
        points:
          "قيادة الحملات الإعلانية على منصات التواصل بميزانية سنوية تتجاوز مليوني ريال\nرفع معدل التحويل في المتجر الإلكتروني من 1.8% إلى 3.1% خلال 9 أشهر\nبناء لوحة مؤشرات أداء أسبوعية للإدارة العليا باستخدام Google Analytics 4 وLooker Studio\nالإشراف على فريق من 3 أخصائيين محتوى ووكالة إبداعية خارجية",
      },
      {
        role: "أخصائية تسويق رقمي",
        org: "شركة حلول السحابة",
        city: "الرياض",
        from: "2021",
        to: "2023",
        points:
          "تحسين ظهور الموقع في محركات البحث (SEO) وزيادة الزيارات العضوية بنسبة 120%\nإطلاق برنامج تسويق بالبريد الإلكتروني حقق معدل فتح 32% مقارنة بمتوسط القطاع 21%",
      },
    ],
    education: [
      { degree: "بكالوريوس التسويق", school: "جامعة الملك سعود", from: "2016", to: "2020", note: "مرتبة الشرف الثانية – المعدل 4.5 من 5" },
    ],
    certs: "Google Ads Search Certification – Google، 2024\nشهادة التسويق بالمحتوى – HubSpot Academy، 2023",
    courses: "أساسيات تحليل البيانات – منصة إدراك، 2022",
    skills: "إدارة الحملات المدفوعة، تحسين محركات البحث (SEO)، Google Analytics 4، Meta Ads Manager، تحليل البيانات، كتابة المحتوى الإعلاني",
    soft: "القيادة، التواصل الفعال، إدارة الوقت، التفكير التحليلي",
    languages: "العربية – اللغة الأم\nالإنجليزية – متقدم (IELTS 7.0)",
    volunteer: "متطوعة في تنظيم معرض الرياض الدولي للكتاب، 2022",
  };

  const EMPTY = {
    name: "", title: "", phone: "", email: "", city: "", linkedin: "", summary: "",
    personal: { show: false, nationality: "", dob: "", marital: "", visa: "" },
    experience: [{ role: "", org: "", city: "", from: "", to: "", points: "" }],
    education: [{ degree: "", school: "", from: "", to: "", note: "" }],
    certs: "", courses: "", skills: "", soft: "", languages: "", volunteer: "",
  };

  const clone = (o) => JSON.parse(JSON.stringify(o));
  let data = Masar.store.get("resume", null) || clone(SAMPLE);
  let opts = Masar.store.get("resume-opts", { theme: "classic", digits: false });

  const formEl = document.getElementById("cv-form");
  const outEl = document.getElementById("cv-preview");
  const themeEl = document.getElementById("cv-theme");
  const digitsEl = document.getElementById("cv-digits");
  themeEl.value = opts.theme;
  digitsEl.checked = opts.digits;

  /* ---------------- النموذج ---------------- */
  const input = (path, label, val, { area = false, ltr = false, hint = "", ph = "" } = {}) => {
    const id = "cv-" + path.replace(/\W/g, "-");
    const h = hint ? ` <span class="hint">${esc(hint)}</span>` : "";
    const cls = ltr ? ' class="ltr"' : "";
    const field = area
      ? `<textarea id="${id}" data-path="${path}" placeholder="${esc(ph)}"${cls}>${esc(val)}</textarea>`
      : `<input type="text" id="${id}" data-path="${path}" value="${esc(val)}" placeholder="${esc(ph)}"${cls}>`;
    return `<div class="field"><label for="${id}">${esc(label)}${h}</label>${field}</div>`;
  };

  const repeatHead = (list, i, label) => `<div class="repeat-head"><span>${label} ${i + 1}</span>
      <span class="btn-row">
        <button type="button" class="btn ghost small" data-move="${list}:${i}:-1" aria-label="تحريك للأعلى" ${i === 0 ? "disabled" : ""}>▲</button>
        <button type="button" class="btn ghost small" data-move="${list}:${i}:1" aria-label="تحريك للأسفل" ${i === data[list].length - 1 ? "disabled" : ""}>▼</button>
        <button type="button" class="btn danger small" data-remove="${list}:${i}">حذف</button>
      </span></div>`;

  function renderForm() {
    const p = data.personal;
    formEl.innerHTML = `
      <fieldset><legend>١. البيانات الأساسية</legend>
        ${input("name", "الاسم الكامل", data.name, { ph: "الاسم الأول واسم العائلة" })}
        ${input("title", "المسمى المهني", data.title, { hint: "يظهر تحت الاسم", ph: "مثال: مهندس برمجيات" })}
        <div class="row-2">${input("phone", "الجوال", data.phone, { ltr: true })}${input("email", "البريد الإلكتروني", data.email, { ltr: true })}</div>
        <div class="row-2">${input("city", "المدينة والدولة", data.city)}${input("linkedin", "لينكدإن / موقع شخصي", data.linkedin, { ltr: true })}</div>
      </fieldset>

      <fieldset><legend>٢. البيانات الشخصية (اختيارية)</legend>
        <label class="inline" style="display:flex;gap:8px;align-items:center;font-weight:400">
          <input type="checkbox" data-path="personal.show" ${p.show ? "checked" : ""}> إظهارها في السيرة
        </label>
        <p class="muted small">شائعة في سير الخليج العربي، لكن لا تُدرج إلا ما يخدم طلبك.</p>
        <div class="row-2">${input("personal.nationality", "الجنسية", p.nationality)}${input("personal.dob", "تاريخ الميلاد", p.dob)}</div>
        <div class="row-2">${input("personal.marital", "الحالة الاجتماعية", p.marital)}${input("personal.visa", "حالة الإقامة / قابلية نقل الخدمات", p.visa)}</div>
      </fieldset>

      <fieldset><legend>٣. الملخص المهني</legend>
        ${input("summary", "نبذة من 3 إلى 4 أسطر", data.summary, { area: true, hint: "من أنت + سنوات الخبرة + أبرز إنجاز + ما تبحث عنه" })}
      </fieldset>

      <fieldset><legend>٤. الخبرات العملية</legend>
        ${data.experience
          .map(
            (x, i) => `<div class="repeat">${repeatHead("experience", i, "خبرة")}
              <div class="row-2">${input(`experience.${i}.role`, "المسمى الوظيفي", x.role)}${input(`experience.${i}.org`, "جهة العمل", x.org)}</div>
              <div class="row-2">${input(`experience.${i}.from`, "من", x.from, { ph: "2021 أو مارس 2021" })}${input(`experience.${i}.to`, "إلى", x.to, { ph: "حتى الآن" })}</div>
              ${input(`experience.${i}.city`, "المدينة", x.city)}
              ${input(`experience.${i}.points`, "المهام والإنجازات (سطر لكل نقطة)", x.points, { area: true, hint: "ابدأ بمصدر أو فعل قوي، واختم بنتيجة رقمية" })}
            </div>`
          )
          .join("")}
        <button type="button" class="btn ghost small" data-add="experience">＋ إضافة خبرة</button>
      </fieldset>

      <fieldset><legend>٥. التعليم</legend>
        ${data.education
          .map(
            (x, i) => `<div class="repeat">${repeatHead("education", i, "مؤهل")}
              <div class="row-2">${input(`education.${i}.degree`, "الدرجة والتخصص", x.degree)}${input(`education.${i}.school`, "الجامعة / المؤسسة", x.school)}</div>
              <div class="row-2">${input(`education.${i}.from`, "من", x.from)}${input(`education.${i}.to`, "إلى", x.to)}</div>
              ${input(`education.${i}.note`, "ملاحظة (المعدل، مرتبة الشرف، مشروع التخرج)", x.note)}
            </div>`
          )
          .join("")}
        <button type="button" class="btn ghost small" data-add="education">＋ إضافة مؤهل</button>
      </fieldset>

      <fieldset><legend>٦. المهارات واللغات</legend>
        ${input("skills", "المهارات الفنية", data.skills, { area: true, hint: "افصل بينها بفاصلة (،)" })}
        ${input("soft", "المهارات الشخصية", data.soft, { area: true, hint: "افصل بينها بفاصلة (،)" })}
        ${input("languages", "اللغات (سطر لكل لغة)", data.languages, { area: true, ph: "العربية – اللغة الأم" })}
      </fieldset>

      <fieldset><legend>٧. الشهادات والدورات والتطوع</legend>
        ${input("certs", "الشهادات المهنية (سطر لكل شهادة)", data.certs, { area: true })}
        ${input("courses", "الدورات التدريبية (سطر لكل دورة)", data.courses, { area: true })}
        ${input("volunteer", "العمل التطوعي (سطر لكل نشاط)", data.volunteer, { area: true })}
      </fieldset>`;
  }

  const setPath = (path, value) => {
    const keys = path.split(".");
    let o = data;
    for (let i = 0; i < keys.length - 1; i++) o = o[keys[i]];
    o[keys.at(-1)] = value;
  };

  formEl.addEventListener("input", (e) => {
    const path = e.target.dataset.path;
    if (!path) return;
    setPath(path, e.target.type === "checkbox" ? e.target.checked : e.target.value);
    save();
    renderPreview();
  });
  formEl.addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]");
    const rm = e.target.closest("[data-remove]");
    const mv = e.target.closest("[data-move]");
    if (add) data[add.dataset.add].push(clone(EMPTY[add.dataset.add][0]));
    else if (rm) {
      const [list, i] = rm.dataset.remove.split(":");
      data[list].splice(+i, 1);
    } else if (mv) {
      const [list, i, d] = mv.dataset.move.split(":");
      const a = data[list], j = +i + +d;
      [a[i], a[j]] = [a[j], a[i]];
    } else return;
    save();
    renderForm();
    renderPreview();
  });

  /* ---------------- المعاينة ---------------- */
  const lines = (s) => String(s || "").split("\n").map((l) => l.replace(/^[\s•\-–*]+/, "").trim()).filter(Boolean);
  const list = (s) => String(s || "").split(/[،,\n]/).map((l) => l.trim()).filter(Boolean);
  const range = (a, b) => [a, b].filter(Boolean).map((x) => Masar.escBidi(x)).join(" – ");

  function sections() {
    const S = {};
    if (data.summary.trim()) S.summary = `<h2>الملخص المهني</h2><p>${tx(data.summary)}</p>`;
    const exp = data.experience.filter((x) => x.role || x.org);
    if (exp.length)
      S.experience = `<h2>الخبرات العملية</h2>${exp
        .map(
          (x) => `<div class="r-item"><div class="r-item-head"><b>${tx(x.role)}</b><span class="r-dates">${range(x.from, x.to)}</span></div>
          <div class="r-org">${[x.org, x.city].filter(Boolean).map(tx).join(" – ")}</div>
          ${lines(x.points).length ? `<ul>${lines(x.points).map((l) => `<li>${tx(l)}</li>`).join("")}</ul>` : ""}</div>`
        )
        .join("")}`;
    const edu = data.education.filter((x) => x.degree || x.school);
    if (edu.length)
      S.education = `<h2>التعليم</h2>${edu
        .map(
          (x) => `<div class="r-item"><div class="r-item-head"><b>${tx(x.degree)}</b><span class="r-dates">${range(x.from, x.to)}</span></div>
          <div class="r-org">${tx(x.school)}</div>${x.note ? `<div>${tx(x.note)}</div>` : ""}</div>`
        )
        .join("")}`;
    const bul = (title, s) => (lines(s).length ? `<h2>${title}</h2><ul>${lines(s).map((l) => `<li>${tx(l)}</li>`).join("")}</ul>` : "");
    S.certs = bul("الشهادات المهنية", data.certs);
    S.courses = bul("الدورات التدريبية", data.courses);
    S.volunteer = bul("العمل التطوعي", data.volunteer);
    const tags = (title, s) => (list(s).length ? `<h2>${title}</h2><div class="r-skills">${list(s).map((l) => `<span>${tx(l)}</span>`).join("")}</div>` : "");
    S.skills = tags("المهارات الفنية", data.skills);
    S.soft = tags("المهارات الشخصية", data.soft);
    S.languages = bul("اللغات", data.languages);
    const p = data.personal;
    const pers = [["الجنسية", p.nationality], ["تاريخ الميلاد", p.dob], ["الحالة الاجتماعية", p.marital], ["الإقامة", p.visa]].filter((x) => x[1]);
    S.personal = p.show && pers.length ? `<h2>البيانات الشخصية</h2><div class="r-personal">${pers.map(([k, v]) => `<div><b>${k}:</b> ${tx(v)}</div>`).join("")}</div>` : "";
    return S;
  }

  const contactBits = () =>
    [data.phone && `📞 <span dir="ltr">${esc(data.phone)}</span>`, data.email && `✉️ <span dir="ltr">${esc(data.email)}</span>`, data.city && `📍 ${esc(data.city)}`, data.linkedin && `🔗 <span dir="ltr">${esc(data.linkedin)}</span>`].filter(Boolean);

  function buildHtml(theme) {
    const S = sections();
    const head = `<h1>${tx(data.name) || "الاسم الكامل"}</h1>${data.title ? `<div class="r-title">${tx(data.title)}</div>` : ""}`;
    const contactPlain = contactBits().map((c) => c.replace(/^\S+\s/, ""));
    if (theme === "modern") {
      return `<aside class="r-side">
          <h2>التواصل</h2><div class="r-contact">${contactBits().map((c) => `<span>${c}</span>`).join("")}</div>
          ${S.skills}${S.soft}${S.languages}${S.personal}
        </aside>
        <div class="r-main">${head}${S.summary || ""}${S.experience || ""}${S.education || ""}${S.certs}${S.courses}${S.volunteer}</div>`;
    }
    const contact = theme === "ats" ? contactPlain : contactBits();
    return `${head}<div class="r-contact">${contact.map((c) => `<span>${c}</span>`).join(theme === "ats" ? " | " : "")}</div>
      ${S.summary || ""}${S.experience || ""}${S.education || ""}${S.skills}${S.soft}${S.certs}${S.courses}${S.languages}${S.volunteer}${S.personal}`;
  }

  const applyDigits = (html) => (opts.digits ? html.replace(/(^|>)([^<]*)/g, (_, a, t) => a + Masar.toArabicDigits(t)) : html);

  function renderPreview() {
    outEl.className = "paper resume " + opts.theme;
    outEl.innerHTML = applyDigits(buildHtml(opts.theme));
    renderScore();
  }

  /* ---------------- مؤشر الاكتمال ---------------- */
  function renderScore() {
    const checks = [
      [!!data.name.trim(), "الاسم"],
      [!!data.title.trim(), "المسمى المهني"],
      [!!(data.phone.trim() && data.email.trim()), "الجوال والبريد"],
      [data.summary.trim().length >= 120, "ملخص مهني لا يقل عن سطرين"],
      [data.experience.some((x) => lines(x.points).length >= 2), "نقطتان على الأقل في خبرة واحدة"],
      [/\d/.test(data.experience.map((x) => x.points).join(" ")), "إنجاز رقمي واحد على الأقل (نسبة، مبلغ، عدد)"],
      [data.education.some((x) => x.degree), "المؤهل العلمي"],
      [list(data.skills).length >= 4, "أربع مهارات فنية على الأقل"],
      [lines(data.languages).length >= 1, "اللغات"],
    ];
    const ok = checks.filter((c) => c[0]).length;
    const pct = Math.round((100 * ok) / checks.length);
    document.getElementById("cv-score-bar").style.width = pct + "%";
    document.getElementById("cv-score-num").textContent = Masar.toArabicDigits(pct) + "٪";
    const miss = checks.filter((c) => !c[0]).map((c) => c[1]);
    document.getElementById("cv-score-miss").textContent = miss.length ? "ينقصك: " + miss.join("، ") : "ممتاز! سيرتك مكتملة العناصر الأساسية.";
  }

  /* ---------------- الأدوات ---------------- */
  function save() {
    Masar.store.set("resume", data);
  }
  themeEl.addEventListener("change", () => {
    opts.theme = themeEl.value;
    Masar.store.set("resume-opts", opts);
    renderPreview();
  });
  digitsEl.addEventListener("change", () => {
    opts.digits = digitsEl.checked;
    Masar.store.set("resume-opts", opts);
    renderPreview();
  });
  document.getElementById("cv-print").addEventListener("click", () => Masar.printElement(outEl));
  document.getElementById("cv-word").addEventListener("click", () => {
    // Word لا يدعم التخطيط بعمودين جيداً، لذلك نصدّر التصميم الكلاسيكي
    const html = applyDigits(buildHtml("classic"))
      .replace(/<div class="r-skills">([\s\S]*?)<\/div>/g, (_, inner) => "<p>" + inner.replace(/<\/span><span>/g, "، ").replace(/<\/?span>/g, "") + "</p>");
    Masar.downloadWord(
      "resume-masar",
      html,
      `h1{font-size:22pt;margin:0} h2{font-size:14pt;color:#0b6b5d;border-bottom:1.5pt solid #0b6b5d;margin:14pt 0 4pt}
       .r-title{color:#0b6b5d;font-size:13pt} .r-contact span{margin-left:12pt} .r-dates{color:#555}
       .r-item-head b{font-size:13pt} ul{margin-top:2pt} li{margin-bottom:2pt}`,
      "السيرة الذاتية - " + (data.name || "مسار")
    );
  });
  document.getElementById("cv-export").addEventListener("click", () =>
    Masar.downloadText("resume-masar.json", JSON.stringify(data, null, 2))
  );
  document.getElementById("cv-import").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const imported = JSON.parse(await file.text());
      data = Object.assign(clone(EMPTY), imported);
      data.personal = Object.assign(clone(EMPTY.personal), imported.personal || {});
      save();
      renderForm();
      renderPreview();
      Masar.toast("تم استيراد السيرة ✓");
    } catch {
      alert("تعذّر قراءة الملف. تأكد أنه ملف JSON صدّرته من هذه الصفحة.");
    }
    e.target.value = "";
  });
  document.getElementById("cv-sample").addEventListener("click", () => {
    if (!confirm("استبدال البيانات الحالية بالمثال التوضيحي؟")) return;
    data = clone(SAMPLE);
    save();
    renderForm();
    renderPreview();
  });
  document.getElementById("cv-clear").addEventListener("click", () => {
    if (!confirm("مسح جميع بيانات السيرة والبدء من جديد؟")) return;
    data = clone(EMPTY);
    save();
    renderForm();
    renderPreview();
  });

  // نقر أي فعل في قائمة الأفعال ينسخه
  document.querySelectorAll("[data-copy]").forEach((b) => b.addEventListener("click", () => Masar.copy(b.dataset.copy)));

  renderForm();
  renderPreview();
})();
