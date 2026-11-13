import { useMemo } from "react";
import { useStore } from "../lib/store";
import { Card, Money, PeriodPicker } from "../components/ui";
import { incomeStatement, trialBalance, vatSummary } from "../lib/ledger";
import { SYS } from "../lib/coa";
import { demoBooks } from "../lib/demo";

export default function Dashboard({ go }: { go: (page: string) => void }) {
  const { t, books, period, createCompany, lang } = useStore();
  const is = useMemo(() => incomeStatement(books, period), [books, period]);
  const tb = useMemo(() => trialBalance(books, period), [books, period]);
  const vat = useMemo(() => vatSummary(books, period), [books, period]);
  const bal = (pred: (code: string, subtype: string) => boolean) => tb.rows.filter((r) => pred(r.account.code, r.account.subtype)).reduce((s, r) => s + r.closing, 0);
  const cash = bal((_, st) => st === "cash");
  const ar = bal((c) => c === SYS.ar);
  const ap = -bal((c) => c === SYS.ap);
  const suspenseCount = books.entries.filter((e) => e.lines.some((l) => l.account === SYS.suspense)).length;

  // Monthly revenue vs expenses for a simple bar chart.
  const months = useMemo(() => {
    const m = new Map<string, { rev: number; exp: number }>();
    const types = new Map(books.accounts.map((a) => [a.code, a.type]));
    for (const e of books.entries) {
      if (e.date < period.from || e.date > period.to) continue;
      const k = e.date.slice(0, 7);
      const v = m.get(k) ?? { rev: 0, exp: 0 };
      for (const l of e.lines) {
        const ty = types.get(l.account);
        if (ty === "revenue") v.rev += l.credit - l.debit;
        if (ty === "expense") v.exp += l.debit - l.credit;
      }
      m.set(k, v);
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-12);
  }, [books, period]);
  const max = Math.max(1, ...months.flatMap(([, v]) => [v.rev, v.exp]));

  const empty = books.entries.length === 0;
  return (
    <div className="page">
      <div className="no-print report-actions"><PeriodPicker /></div>
      {suspenseCount > 0 && <div className="warn banner" onClick={() => go("journal")}>⚠ {suspenseCount} {t("suspenseWarn")}</div>}
      <div className="kpis">
        <Kpi label={t("revenue")} m={is.revenue} />
        <Kpi label={t("netProfit")} m={is.netProfit} tone={is.netProfit >= 0 ? "good" : "bad"} />
        <Kpi label={t("cashBank")} m={cash} />
        <Kpi label={t("receivables")} m={ar} />
        <Kpi label={t("payables")} m={ap} />
        <Kpi label={t("vatDue")} m={vat.netPayable} />
      </div>
      {months.length > 0 && (
        <Card title={`${t("revenue")} / ${t("expenses")}`}>
          <div className="chart" role="img" aria-label="Monthly revenue and expenses">
            {months.map(([k, v]) => (
              <div key={k} className="bar-group" title={`${k}`}>
                <div className="bars">
                  <div className="bar rev" style={{ height: `${(Math.max(0, v.rev) / max) * 100}%` }} title={`${t("revenue")} ${v.rev / 1000}`} />
                  <div className="bar exp" style={{ height: `${(Math.max(0, v.exp) / max) * 100}%` }} title={`${t("expenses")} ${v.exp / 1000}`} />
                </div>
                <div className="bar-label">{k.slice(5)}/{k.slice(2, 4)}</div>
              </div>
            ))}
          </div>
          <div className="legend"><span className="sw rev" /> {t("revenue")} <span className="sw exp" /> {t("expenses")}</div>
        </Card>
      )}
      <Card title={t("quickStart")}>
        <ol className="steps">
          <li><a onClick={() => go("settings")}>{t("qs1")}</a></li>
          <li><a onClick={() => go("capture")}>{t("qs2")}</a></li>
          <li><a onClick={() => go("bank")}>{t("qs3")}</a></li>
          <li><a onClick={() => go("tb")}>{t("qs4")}</a></li>
        </ol>
        {empty && (
          <button className="secondary" onClick={() => { const b = demoBooks(); createCompany(b.company, b); }}>
            {t("loadDemo")}
          </button>
        )}
        <p className="muted small">{t("entriesCount")}: {books.entries.length} · {lang === "ar" ? "البيانات محفوظة على هذا الجهاز" : "Data is stored on this device"}</p>
      </Card>
    </div>
  );
}

function Kpi({ label, m, tone }: { label: string; m: number; tone?: "good" | "bad" }) {
  return (
    <div className={`kpi ${tone ?? ""}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value"><Money m={m} /></div>
    </div>
  );
}
