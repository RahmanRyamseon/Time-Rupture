import { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { Card, Money, ReportHeader } from "../components/ui";
import { partyBalances, partyStatement, type PartyBalance, type PartyKind } from "../lib/parties";
import { SYS } from "../lib/coa";
import { todayISO } from "../lib/money";

export default function Parties() {
  const { t, books, period } = useStore();
  const asOf = period.to < todayISO() ? period.to : todayISO();
  const list = useMemo(() => partyBalances(books, asOf), [books, asOf]);
  const [sel, setSel] = useState<{ name: string; kind: PartyKind } | null>(null);
  const [hideZero, setHideZero] = useState(true);

  const table = (kind: PartyKind) => {
    const rows = list.filter((p) => p.kind === kind && (!hideZero || p.balance !== 0));
    const total = rows.reduce((s, r) => s + r.balance, 0);
    const ag = [0, 1, 2, 3].map((i) => rows.reduce((s, r) => s + r.aging[i], 0));
    return (
      <Card title={`${kind === "supplier" ? t("suppliers") : t("customers")} (${rows.length})`}>
        {!rows.length && <p className="muted">{t("none")}</p>}
        {rows.length > 0 && (
          <div className="table-wrap">
            <table className="grid">
              <thead>
                <tr>
                  <th>{kind === "supplier" ? t("supplier") : t("customer")}</th><th>{t("trn")}</th>
                  <th className="amt">0–30</th><th className="amt">31–60</th><th className="amt">61–90</th><th className="amt">90+</th>
                  <th className="amt">{t("owed")}</th><th>{t("lastActivity")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: PartyBalance) => (
                  <tr key={r.kind + r.name} className={`clickable ${sel?.name === r.name && sel.kind === r.kind ? "selected" : ""} ${r.name ? "" : "suspense"}`}
                    onClick={() => setSel({ name: r.name, kind: r.kind })}>
                    <td dir="auto">{r.name || <i>{t("unassigned")}</i>}</td><td>{r.trn}</td>
                    {r.aging.map((a, i) => <td key={i} className="amt"><Money m={a} blankZero /></td>)}
                    <td className="amt"><b><Money m={r.balance} /></b></td><td>{r.lastDate}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="total"><td>{t("total")}</td><td />{ag.map((a, i) => <td key={i} className="amt"><Money m={a} /></td>)}<td className="amt"><Money m={total} /></td><td /></tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    );
  };

  const account = sel?.kind === "supplier" ? SYS.ap : SYS.ar;
  const st = sel ? partyStatement(books, sel.name, account) : [];

  return (
    <div className="page">
      <div className="toolbar no-print">
        <span className="muted">{t("asAt")} {asOf} · {t("aging")}</span>
        <label className="chk"><input type="checkbox" checked={hideZero} onChange={(e) => setHideZero(e.target.checked)} /> {t("hideSettled")}</label>
      </div>
      {table("customer")}
      {table("supplier")}
      {sel && (
        <Card className="report" actions={<button className="secondary no-print" onClick={() => window.print()}>🖨 {t("print")}</button>}>
          <ReportHeader title={`${t("statementOfAccount")} – ${sel.name || t("unassigned")}`} sub={`${sel.kind === "supplier" ? t("suppliers") : t("customers")} · ${t("asAt")} ${asOf}`} />
          <div className="table-wrap">
            <table className="grid">
              <thead><tr><th>{t("date")}</th><th>{t("reference")}</th><th>{t("description")}</th><th className="amt">{t("debit")}</th><th className="amt">{t("credit")}</th><th className="amt">{t("owed")}</th></tr></thead>
              <tbody>
                {st.map((r, i) => (
                  <tr key={i}>
                    <td>{r.entry.date}</td><td>{r.entry.ref}</td><td dir="auto">{r.entry.memo}</td>
                    <td className="amt">{r.line.debit ? <Money m={r.line.debit} /> : ""}</td>
                    <td className="amt">{r.line.credit ? <Money m={r.line.credit} /> : ""}</td>
                    <td className="amt"><Money m={r.running} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
