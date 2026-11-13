import { useEffect, useRef, useState } from "react";
import { newCompany, useStore } from "../lib/store";
import { Card } from "../components/ui";
import { COUNTRIES, decimalsFor } from "../lib/countries";
import { MONTH_NAMES } from "../lib/i18n";
import { download } from "../lib/files";
import { aiAvailable } from "../lib/ai";
import { openocrAvailable } from "../lib/openocr";
import type { Books, CountryCode } from "../lib/types";

export default function Settings() {
  const { t, books, update, lang, settings, setSettings, companies, createCompany, switchCompany, deleteCompany } = useStore();
  const c = books.company;
  const [confirmText, setConfirmText] = useState("");
  const [ai, setAi] = useState(false);
  const [ocrSrv, setOcrSrv] = useState(false);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => { aiAvailable().then(setAi); openocrAvailable().then(setOcrSrv); }, []);

  const setCo = (p: Partial<typeof c>) => update((b) => ({ ...b, company: { ...b.company, ...p } }));
  const hasEntries = books.entries.length > 0;

  const restore = async (f: File) => {
    try {
      const data = JSON.parse(await f.text()) as Books;
      if (data.version !== 1 || !data.company?.id || !Array.isArray(data.entries) || !Array.isArray(data.accounts)) throw new Error("Not a Mizan backup file");
      await createCompany(data.company, data);
      setMsg(`✓ ${data.company.name}`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="page">
      <Card title={t("settings")}>
        <div className="grid-form">
          <label>{t("companyName")}<input value={c.name} onChange={(e) => setCo({ name: e.target.value })} /></label>
          <label>{t("companyNameAr")}<input dir="rtl" value={c.nameAr} onChange={(e) => setCo({ nameAr: e.target.value })} /></label>
          <label>{t("trn")}<input inputMode="numeric" value={c.trn} onChange={(e) => setCo({ trn: e.target.value.replace(/[^\d]/g, "") })} /></label>
          <label>{t("country")}
            <select value={c.country} onChange={(e) => {
              const cc = e.target.value as CountryCode;
              setCo({ country: cc, ...(hasEntries ? {} : { currency: COUNTRIES[cc].currency }), vatRegistered: COUNTRIES[cc].vatRate > 0 && c.vatRegistered });
            }}>
              {Object.values(COUNTRIES).map((p) => <option key={p.code} value={p.code}>{lang === "ar" ? p.nameAr : p.name} ({p.vatRate ? `VAT ${p.vatRate}%` : "no VAT"})</option>)}
            </select>
          </label>
          <label>{t("baseCurrency")}
            <select value={c.currency} disabled={hasEntries} onChange={(e) => setCo({ currency: e.target.value })}>
              {["AED", "SAR", "QAR", "KWD", "BHD", "OMR", "USD"].map((x) => <option key={x} value={x}>{x} ({decimalsFor(x)} dp)</option>)}
            </select>
          </label>
          <label>{t("fyStart")}
            <select value={c.fyStartMonth} onChange={(e) => setCo({ fyStartMonth: Number(e.target.value) })}>
              {MONTH_NAMES[lang].map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </label>
          <label className="chk"><input type="checkbox" checked={c.vatRegistered} disabled={COUNTRIES[c.country].vatRate === 0} onChange={(e) => setCo({ vatRegistered: e.target.checked })} /> {t("vatRegistered")} ({COUNTRIES[c.country].vatRate}% · {lang === "ar" ? COUNTRIES[c.country].vatAuthorityAr : COUNTRIES[c.country].vatAuthority})</label>
          <label className="wide">{t("address")}<input dir="auto" value={c.address ?? ""} onChange={(e) => setCo({ address: e.target.value })} /></label>
          <label>{t("language")}
            <select value={lang} onChange={(e) => setSettings({ lang: e.target.value as "en" | "ar" })}>
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </select>
          </label>
        </div>
        <label className="chk block"><input type="checkbox" checked={settings.aiEnabled} onChange={(e) => setSettings({ aiEnabled: e.target.checked })} /> {t("aiSetting")} — <span className={ai ? "good" : "muted"}>{ai ? t("aiOn") : t("aiOff")}</span></label>
        <p className="muted small">{t("aiPrivacy")}</p>
        <div className="grid-form">
          <label className="wide">{t("ocrEngine")} — <span className={ocrSrv ? "good" : "muted"}>{ocrSrv ? t("ocrServerOn") : t("ocrServerOff")}</span>
            <select value={settings.ocrEngine ?? "auto"} onChange={(e) => setSettings({ ocrEngine: e.target.value as "auto" | "tesseract" | "openocr" })}>
              <option value="auto">{t("ocrAuto")}</option>
              <option value="tesseract">{t("ocrTesseract")}</option>
              <option value="openocr" disabled={!ocrSrv}>{t("ocrOpen")}</option>
            </select>
          </label>
        </div>
      </Card>

      <Card title={t("companies")} actions={<button className="secondary" onClick={() => createCompany(newCompany(c.country, lang === "ar" ? "منشأة جديدة" : "New company"))}>+ {t("newCompany")}</button>}>
        <ul className="company-list">
          {companies.map((x) => (
            <li key={x.id} className={x.id === c.id ? "active" : ""}>
              <span>{x.name}{x.nameAr ? ` · ${x.nameAr}` : ""} <span className="muted small">({x.country} · {x.currency})</span></span>
              {x.id !== c.id && <button className="ghost small" onClick={() => switchCompany(x.id)}>{t("switchTo")}</button>}
            </li>
          ))}
        </ul>
      </Card>

      <Card title={t("backup")}>
        <p className="muted">{t("backupHint")}</p>
        <div className="row-actions">
          <button onClick={() => download(`${c.name.replace(/\W+/g, "_")}_mizan_backup_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(books, null, 1), "application/json")}>⬇ {t("downloadBackup")}</button>
          <button className="secondary" onClick={() => fileRef.current?.click()}>⇪ {t("restore")}</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) restore(f); e.target.value = ""; }} />
        </div>
        {msg && <div className="muted">{msg}</div>}
        <hr />
        <div className="danger-zone">
          <label>{t("deleteCompany")} – {t("confirmDelete")} <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} /></label>
          <button className="danger" disabled={confirmText !== "DELETE"} onClick={() => { deleteCompany(c.id); setConfirmText(""); }}>{t("delete")}</button>
        </div>
      </Card>
    </div>
  );
}
