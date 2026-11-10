/* مكتبة المستندات: عرض النماذج، ومولّد المستند، وقائمة التهيئة */
(function () {
  const { esc } = Masar;
  const CATS = window.MASAR_CATEGORIES;
  const TPLS = window.MASAR_TEMPLATES;

  /* ---------------- قائمة النماذج ---------------- */
  const listEl = document.getElementById("doc-list");
  const searchEl = document.getElementById("doc-search");
  const chipsEl = document.getElementById("cat-chips");
  let activeCat = "";

  chipsEl.innerHTML =
    `<button class="chip" data-cat="" aria-pressed="true">الكل (${TPLS.length})</button>` +
    CATS.map((c) => `<button class="chip" data-cat="${c.id}" aria-pressed="false">${c.icon} ${esc(c.title)}</button>`).join("");
  chipsEl.addEventListener("click", (e) => {
    const b = e.target.closest("[data-cat]");
    if (!b) return;
    activeCat = b.dataset.cat;
    chipsEl.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", String(c === b)));
    renderList();
  });
  searchEl.addEventListener("input", renderList);

  const norm = (s) =>
    String(s)
      .replace(/[ً-ْـ]/g, "") // التشكيل والتطويل
      .replace(/[أإآ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .toLowerCase();

  function renderList() {
    const q = norm(searchEl.value.trim());
    let html = "";
    let total = 0;
    for (const c of CATS) {
      if (activeCat && c.id !== activeCat) continue;
      const items = TPLS.filter((t) => t.cat === c.id && (!q || norm(t.title + " " + t.desc).includes(q)));
      if (!items.length) continue;
      total += items.length;
      html += `<h3 class="cat-title"><span>${c.icon}</span> ${esc(c.title)} <span class="badge">${items.length}</span></h3>
        <p class="muted small">${esc(c.desc)}</p>
        <div class="grid">${items
          .map(
            (t) => `<article class="card doc-card">
              ${t.audience === "employer" ? '<span class="badge gold">لجهة العمل</span>' : ""}
              <h3>${esc(t.title)}</h3>
              <p>${esc(t.desc)}</p>
              <div class="btn-row">
                <button class="btn small" data-open="${t.id}">✍️ تعبئة وإنشاء</button>
                <a class="btn ghost small" href="doc/${t.id}.html">عرض النص</a>
              </div>
            </article>`
          )
          .join("")}</div>`;
    }
    listEl.innerHTML = total ? html : `<p class="muted">لا توجد نماذج مطابقة للبحث.</p>`;
  }
  listEl.addEventListener("click", (e) => {
    const b = e.target.closest("[data-open]");
    if (b) openGenerator(b.dataset.open);
  });

  /* ---------------- المولّد ---------------- */
  const dlg = document.getElementById("generator");
  const formEl = document.getElementById("gen-form");
  const paperEl = document.getElementById("gen-paper");
  const titleEl = document.getElementById("gen-title");
  const digitsEl = document.getElementById("gen-digits");
  let current = null;
  let values = {};

  function defaultValue(f) {
    if (f.type === "date") return Masar.formatDate("gregory");
    if (f.type === "gender") return f.value || "m";
    return f.value ?? "";
  }

  function openGenerator(id) {
    current = TPLS.find((t) => t.id === id);
    if (!current) return;
    const saved = Masar.store.get("tpl:" + id, null);
    // الحقول المشتركة (الاسم، الجوال...) تُملأ من آخر استخدام
    const shared = Masar.store.get("shared-fields", {});
    values = {};
    for (const f of current.fields) {
      values[f.key] = saved?.[f.key] ?? (f.type !== "date" && shared[f.key] != null ? shared[f.key] : defaultValue(f));
    }
    titleEl.textContent = current.title;
    renderForm();
    renderPaper();
    if (!dlg.open) dlg.showModal();
    history.replaceState(null, "", "#" + id);
  }

  function renderForm() {
    formEl.innerHTML = current.fields
      .map((f) => {
        const id = "f-" + f.key;
        const hint = f.hint ? ` <span class="hint">(${esc(f.hint)})</span>` : "";
        let input;
        if (f.type === "textarea") {
          input = `<textarea id="${id}" data-key="${f.key}">${esc(values[f.key])}</textarea>`;
        } else if (f.type === "gender") {
          input = `<select id="${id}" data-key="${f.key}">
            <option value="m" ${values[f.key] === "m" ? "selected" : ""}>مذكّر</option>
            <option value="f" ${values[f.key] === "f" ? "selected" : ""}>مؤنّث</option></select>`;
        } else if (f.type === "select") {
          input = `<select id="${id}" data-key="${f.key}">${f.options
            .map((o) => `<option ${o === values[f.key] ? "selected" : ""}>${esc(o)}</option>`)
            .join("")}</select>`;
        } else if (f.type === "date") {
          input = `<input type="text" id="${id}" data-key="${f.key}" value="${esc(values[f.key])}">
            <div class="btn-row" style="margin-top:6px">
              <button type="button" class="btn ghost small" data-date="gregory" data-for="${f.key}">ميلادي اليوم</button>
              <button type="button" class="btn ghost small" data-date="islamic-umalqura" data-for="${f.key}">هجري اليوم</button>
              <button type="button" class="btn ghost small" data-date="both" data-for="${f.key}">كلاهما</button>
            </div>`;
        } else {
          input = `<input type="text" id="${id}" data-key="${f.key}" value="${esc(values[f.key])}">`;
        }
        return `<div class="field"><label for="${id}">${esc(f.label)}${hint}</label>${input}</div>`;
      })
      .join("");
  }

  formEl.addEventListener("input", (e) => {
    const k = e.target.dataset.key;
    if (!k) return;
    values[k] = e.target.value;
    persist();
    renderPaper();
  });
  formEl.addEventListener("click", (e) => {
    const b = e.target.closest("[data-date]");
    if (!b) return;
    const cal = b.dataset.date;
    const v =
      cal === "both"
        ? `${Masar.formatDate("islamic-umalqura")} الموافق ${Masar.formatDate("gregory")}`
        : Masar.formatDate(cal);
    values[b.dataset.for] = v;
    formEl.querySelector(`[data-key="${b.dataset.for}"]`).value = v;
    persist();
    renderPaper();
  });
  digitsEl.addEventListener("change", renderPaper);

  function persist() {
    Masar.store.set("tpl:" + current.id, values);
    const shared = Masar.store.get("shared-fields", {});
    for (const k of ["name", "phone", "email", "idno", "empno", "company", "job", "dept", "manager", "gender"]) {
      if (k in values) shared[k] = values[k];
    }
    Masar.store.set("shared-fields", shared);
  }

  /** يحوّل النص إلى نص نهائي، وmark=true يميّز الحقول الفارغة */
  function fill(mark) {
    const g = values.gender === "f" ? 1 : 0;
    let out = esc(current.body)
      .replace(/\{\{g:([^|}]*)\|([^}]*)\}\}/g, (_, m, f) => (g ? f : m))
      .replace(/\{\{(\w+)\}\}/g, (_, k) => {
        const v = String(values[k] ?? "").trim();
        if (!v) return mark ? `<span class="ph">[${esc(labelOf(k))}]</span>` : "....................";
        return Masar.escBidi(v);
      });
    // تحويل الأرقام في النص فقط دون المساس بوسوم HTML
    if (digitsEl.checked) out = out.replace(/(^|>)([^<]*)/g, (_, a, t) => a + Masar.toArabicDigits(t));
    return out;
  }
  const labelOf = (k) => current.fields.find((f) => f.key === k)?.label || k;

  function renderPaper() {
    paperEl.innerHTML = `<div class="doc-text">${fill(true)}</div>`;
  }

  const plainText = () => {
    const d = document.createElement("div");
    d.innerHTML = fill(false);
    return d.textContent;
  };

  document.getElementById("gen-copy").addEventListener("click", () => Masar.copy(plainText()));
  document.getElementById("gen-word").addEventListener("click", () => {
    const html = plainText()
      .split("\n")
      .map((line) => `<p>${esc(line) || "&nbsp;"}</p>`)
      .join("");
    Masar.downloadWord("masar-" + current.id, html, "", current.title);
  });
  document.getElementById("gen-print").addEventListener("click", () => {
    paperEl.innerHTML = `<div class="doc-text">${fill(false)}</div>`;
    Masar.printElement(paperEl);
    setTimeout(renderPaper, 300);
  });
  document.getElementById("gen-reset").addEventListener("click", () => {
    if (!confirm("مسح ما أدخلته في هذا النموذج والعودة إلى المثال؟")) return;
    Masar.store.set("tpl:" + current.id, null);
    values = {};
    for (const f of current.fields) values[f.key] = defaultValue(f);
    renderForm();
    renderPaper();
  });
  document.getElementById("gen-close").addEventListener("click", () => dlg.close());
  dlg.addEventListener("close", () => history.replaceState(null, "", location.pathname));

  /* ---------------- قائمة التهيئة ---------------- */
  const CHECK = window.MASAR_ONBOARDING;
  const checkEl = document.getElementById("onboarding");
  const done = Masar.store.get("onboarding", {});
  checkEl.innerHTML = CHECK.map(
    (stage, si) => `<div class="card">
      <h3>${stage.icon} ${esc(stage.title)}</h3>
      <p class="muted small">${esc(stage.desc)}</p>
      <div class="progress" aria-hidden="true"><span id="pg-${si}"></span></div>
      <ul class="checklist">${stage.items
        .map((it, ii) => {
          const id = `ob-${si}-${ii}`;
          return `<li><input type="checkbox" id="${id}" data-id="${id}" ${done[id] ? "checked" : ""}><label for="${id}">${it}</label></li>`;
        })
        .join("")}</ul></div>`
  ).join("");
  function updateProgress() {
    CHECK.forEach((stage, si) => {
      const n = stage.items.filter((_, ii) => done[`ob-${si}-${ii}`]).length;
      document.getElementById("pg-" + si).style.width = (100 * n) / stage.items.length + "%";
    });
  }
  checkEl.addEventListener("change", (e) => {
    const id = e.target.dataset.id;
    if (!id) return;
    done[id] = e.target.checked;
    Masar.store.set("onboarding", done);
    updateProgress();
  });
  document.getElementById("ob-reset").addEventListener("click", () => {
    Object.keys(done).forEach((k) => delete done[k]);
    Masar.store.set("onboarding", done);
    checkEl.querySelectorAll("input").forEach((i) => (i.checked = false));
    updateProgress();
  });
  document.getElementById("ob-print").addEventListener("click", () => Masar.printElement(checkEl));
  updateProgress();

  /* ---------------- البدء ---------------- */
  renderList();
  const hash = decodeURIComponent(location.hash.slice(1));
  if (hash && TPLS.some((t) => t.id === hash)) openGenerator(hash);
})();
