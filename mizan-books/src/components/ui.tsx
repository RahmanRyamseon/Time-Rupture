import { useRef, useState, type ReactNode } from "react";
import { useStore } from "../lib/store";
import { formatMoney, parseAmount, toMils } from "../lib/money";
import { financialYear, type Line } from "../lib/ledger";
import { MONTH_NAMES } from "../lib/i18n";
import type { Account } from "../lib/types";

export function Money({ m, blankZero, className }: { m: number; blankZero?: boolean; className?: string }) {
  const { decimals, lang } = useStore();
  return <span className={`num ${m < 0 ? "neg" : ""} ${className ?? ""}`}>{formatMoney(m, decimals, lang, { blankZero })}</span>;
}

/** Amount input that accepts English or Arabic-Indic digits; value in mils. */
export function AmountInput({ value, onChange, placeholder, className }: { value: number; onChange: (m: number) => void; placeholder?: string; className?: string }) {
  const { decimals } = useStore();
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? (value ? (value / 1000).toFixed(decimals) : "");
  return (
    <input
      className={`num-input ${className ?? ""}`}
      inputMode="decimal"
      value={shown}
      placeholder={placeholder ?? "0.00"}
      onChange={(e) => {
        setText(e.target.value);
        const n = parseAmount(e.target.value);
        onChange(Number.isFinite(n) ? Math.abs(toMils(n)) : 0);
      }}
      onBlur={() => setText(null)}
    />
  );
}

export function AccountSelect({ value, onChange, filter, allowEmpty, className }: { value: string; onChange: (code: string) => void; filter?: (a: Account) => boolean; allowEmpty?: boolean; className?: string }) {
  const { books, lang } = useStore();
  const groups: [string, string, (a: Account) => boolean][] = [
    ["Assets", "الأصول", (a) => a.type === "asset"],
    ["Liabilities", "الالتزامات", (a) => a.type === "liability"],
    ["Equity", "حقوق الملكية", (a) => a.type === "equity"],
    ["Revenue", "الإيرادات", (a) => a.type === "revenue"],
    ["Expenses", "المصروفات", (a) => a.type === "expense"],
  ];
  const list = books.accounts.filter((a) => (!a.archived || a.code === value) && (!filter || filter(a)));
  return (
    <select className={`acct-select ${className ?? ""}`} value={value} onChange={(e) => onChange(e.target.value)}>
      {(allowEmpty || !value) && <option value="">—</option>}
      {groups.map(([en, ar, pick]) => {
        const items = list.filter(pick);
        if (!items.length) return null;
        return (
          <optgroup key={en} label={lang === "ar" ? ar : en}>
            {items.map((a) => (
              <option key={a.code} value={a.code}>{a.code} · {lang === "ar" ? a.nameAr || a.name : a.name}</option>
            ))}
          </optgroup>
        );
      })}
    </select>
  );
}

export function PeriodPicker() {
  const { period, setPeriod, t, books, lang } = useStore();
  const fy = (offset: number) => {
    const y = Number(period.to.slice(0, 4)) + offset;
    return financialYear(books.company.fyStartMonth, `${y}-${String(books.company.fyStartMonth).padStart(2, "0")}-15`);
  };
  const thisFy = financialYear(books.company.fyStartMonth, new Date().toISOString().slice(0, 10));
  const quarter = () => {
    const now = new Date();
    const q = Math.floor(now.getMonth() / 3);
    const from = new Date(Date.UTC(now.getFullYear(), q * 3, 1)).toISOString().slice(0, 10);
    const to = new Date(Date.UTC(now.getFullYear(), q * 3 + 3, 0)).toISOString().slice(0, 10);
    return { from, to };
  };
  return (
    <div className="period">
      <label>{t("from")} <input type="date" value={period.from} onChange={(e) => e.target.value && setPeriod({ ...period, from: e.target.value })} /></label>
      <label>{t("to")} <input type="date" value={period.to} onChange={(e) => e.target.value && setPeriod({ ...period, to: e.target.value })} /></label>
      <select value="" onChange={(e) => {
        const v = e.target.value;
        if (v === "fy") setPeriod(thisFy);
        if (v === "prev") setPeriod(fy(-1));
        if (v === "q") setPeriod(quarter());
        if (v === "all") setPeriod({ from: "1990-01-01", to: "2099-12-31" });
      }}>
        <option value="">{lang === "ar" ? "اختصارات…" : "Presets…"}</option>
        <option value="fy">{lang === "ar" ? `السنة المالية الحالية (تبدأ ${MONTH_NAMES.ar[books.company.fyStartMonth - 1]})` : `Current financial year (starts ${MONTH_NAMES.en[books.company.fyStartMonth - 1]})`}</option>
        <option value="prev">{lang === "ar" ? "السنة المالية السابقة" : "Previous financial year"}</option>
        <option value="q">{lang === "ar" ? "الربع الحالي (لإقرار الضريبة)" : "Current quarter (VAT return)"}</option>
        <option value="all">{lang === "ar" ? "كل الفترات" : "All time"}</option>
      </select>
    </div>
  );
}

export function StatementTable({ lines, showCodes }: { lines: Line[]; showCodes?: boolean }) {
  const { lang, books } = useStore();
  return (
    <table className="statement">
      <thead>
        <tr><th />{showCodes && <th className="code" />}<th className="amt">{books.company.currency}</th></tr>
      </thead>
      <tbody>
        {lines.map((l, i) => (
          <tr key={i} className={`${l.kind ?? ""} ${l.bold ? "bold" : ""}`}>
            <td style={{ paddingInlineStart: `${0.6 + (l.indent ?? 0) * 1.2}rem` }}>{lang === "ar" ? l.labelAr : l.label}</td>
            {showCodes && <td className="code">{l.code}</td>}
            <td className="amt">{l.kind === "header" ? "" : <Money m={l.amount} />}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Dropzone({ onFiles, accept, label, hint, capture }: { onFiles: (f: File[]) => void; accept: string; label: string; hint?: string; capture?: boolean }) {
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const cam = useRef<HTMLInputElement>(null);
  const { t } = useStore();
  return (
    <div
      className={`dropzone ${over ? "over" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); onFiles([...e.dataTransfer.files]); }}
      onClick={() => input.current?.click()}
      role="button"
      tabIndex={0}
    >
      <div className="dz-icon">⇪</div>
      <div className="dz-label">{label}</div>
      {hint && <div className="dz-hint">{hint}</div>}
      <div className="dz-actions" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={() => input.current?.click()}>{t("chooseFiles")}</button>
        {capture && <button type="button" className="secondary" onClick={() => cam.current?.click()}>📷 {t("takePhoto")}</button>}
      </div>
      <input ref={input} type="file" accept={accept} multiple hidden onChange={(e) => { onFiles([...(e.target.files ?? [])]); e.target.value = ""; }} />
      {capture && <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { onFiles([...(e.target.files ?? [])]); e.target.value = ""; }} />}
    </div>
  );
}

export function Card({ title, children, actions, className }: { title?: ReactNode; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={`card ${className ?? ""}`}>
      {(title || actions) && <header className="card-h"><h2>{title}</h2><div className="card-actions">{actions}</div></header>}
      {children}
    </section>
  );
}

export function ReportHeader({ title, sub }: { title: string; sub: string }) {
  const { books, lang, t } = useStore();
  const c = books.company;
  return (
    <div className="report-head">
      <div className="rh-company">{lang === "ar" && c.nameAr ? c.nameAr : c.name}</div>
      {lang === "ar" ? c.name && c.nameAr && <div className="rh-alt">{c.name}</div> : c.nameAr && <div className="rh-alt" dir="rtl">{c.nameAr}</div>}
      <div className="rh-title">{title}</div>
      <div className="rh-sub">{sub} · {t("currency")}: {c.currency}{c.trn ? ` · ${t("trn")}: ${c.trn}` : ""}</div>
    </div>
  );
}
