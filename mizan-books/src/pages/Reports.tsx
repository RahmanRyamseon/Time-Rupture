import { useMemo, useState } from "react";
import { accountName, useStore } from "../lib/store";
import { AccountSelect, Card, Money, PeriodPicker, ReportHeader, StatementTable } from "../components/ui";
import { balanceSheet, cashFlow, generalLedger, incomeStatement, trialBalance, vatSummary } from "../lib/ledger";
import { exportWorkbook } from "../lib/exporter";
import { COUNTRIES } from "../lib/countries";
import { SYS } from "../lib/coa";
import { returnBoxes, TREATMENTS } from "../lib/vat";

function ReportActions() {
  const { t, books, period, lang, decimals } = useStore();
  const [busy, setBusy] = useState(false);
  return (
    <div className="no-print report-actions">
      <PeriodPicker />
      <button className="secondary" onClick={() => window.print()}>🖨 {t("print")}</button>
      <button className="secondary" disabled={busy} onClick={async () => { setBusy(true); try { await exportWorkbook(books, period, lang, decimals); } finally { setBusy(false); } }}>⬇ {t("exportExcel")}</button>
    </div>
  );
}

export function Journal({ onEdit }: { onEdit: (id: string) => void }) {
  const { t, books, period, removeEntry, lang } = useStore();
  const [q, setQ] = useState("");
  const [src, setSrc] = useState("");
  const list = books.entries
    .filter((e) => e.date >= period.from && e.date <= period.to)
    .filter((e) => !src || e.source === src)
    .filter((e) => !q || `${e.memo} ${e.ref ?? ""} ${e.party ?? ""}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const label: Record<string, [string, string]> = { manual: ["Manual", "يدوي"], invoice: ["Invoice", "فاتورة"], bank: ["Bank", "بنك"], import: ["Import", "استيراد"], opening: ["Opening", "افتتاحي"] };
  return (
    <div className="page">
      <ReportActions />
      <Card title={`${t("journal")} (${list.length})`} actions={<>
        <input className="search" placeholder={t("search")} value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={src} onChange={(e) => setSrc(e.target.value)}>
          <option value="">{t("source")}: {t("all")}</option>
          {Object.entries(label).map(([k, v]) => <option key={k} value={k}>{lang === "ar" ? v[1] : v[0]}</option>)}
        </select>
      </>}>
        {!list.length && <p className="muted">{t("none")}</p>}
        <div className="table-wrap">
          <table className="grid journal">
            <thead><tr><th>{t("date")}</th><th>{t("description")}</th><th>{t("account")}</th><th className="amt">{t("debit")}</th><th className="amt">{t("credit")}</th><th className="no-print" /></tr></thead>
            {list.map((e) => (
              <tbody key={e.id} className="entry">
                {e.lines.map((l, i) => (
                  <tr key={i}>
                    {i === 0 && (
                      <>
                        <td rowSpan={e.lines.length}>{e.date}<div className="tag">{lang === "ar" ? label[e.source][1] : label[e.source][0]}</div></td>
                        <td rowSpan={e.lines.length} dir="auto"><b>{e.memo}</b>{e.ref && <div className="muted small">#{e.ref}</div>}{e.attachment && <div className="muted small">📎 {e.attachment}</div>}{e.fx && <div className="muted small">{e.fx.total} {e.fx.currency} @ {e.fx.rate}</div>}</td>
                      </>
                    )}
                    <td className={l.credit ? "cr-indent" : ""}>{l.account} · {accountName(books, l.account, lang)}{l.account === SYS.suspense && " ⚠"}</td>
                    <td className="amt">{l.debit ? <Money m={l.debit} /> : ""}</td>
                    <td className="amt">{l.credit ? <Money m={l.credit} /> : ""}</td>
                    {i === 0 && (
                      <td rowSpan={e.lines.length} className="no-print actions">
                        <button className="ghost small" onClick={() => onEdit(e.id)}>{t("edit")}</button>
                        <button className="ghost small danger" onClick={() => confirm(`${t("delete")}?`) && removeEntry(e.id)}>{t("delete")}</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      </Card>
    </div>
  );
}

export function Ledger() {
  const { t, books, period, lang } = useStore();
  const [code, setCode] = useState<string>(SYS.bank);
  const gl = generalLedger(books, code, period);
  return (
    <div className="page">
      <ReportActions />
      <Card title={t("ledger")} actions={<AccountSelect value={code} onChange={setCode} />}>
        <ReportHeader title={`${t("ledger")} – ${code} ${accountName(books, code, lang)}`} sub={`${period.from} → ${period.to}`} />
        <div className="table-wrap">
          <table className="grid">
            <thead><tr><th>{t("date")}</th><th>{t("reference")}</th><th>{t("description")}</th><th className="amt">{t("debit")}</th><th className="amt">{t("credit")}</th><th className="amt">{t("balance")}</th></tr></thead>
            <tbody>
              <tr className="subtotal"><td /><td /><td>{t("opening")}</td><td /><td /><td className="amt"><Money m={gl.opening} /></td></tr>
              {gl.rows.map((r, i) => (
                <tr key={i}>
                  <td>{r.entry.date}</td><td>{r.entry.ref}</td><td dir="auto">{r.entry.memo}{r.line.note ? ` – ${r.line.note}` : ""}</td>
                  <td className="amt">{r.line.debit ? <Money m={r.line.debit} /> : ""}</td>
                  <td className="amt">{r.line.credit ? <Money m={r.line.credit} /> : ""}</td>
                  <td className="amt"><Money m={r.running} /></td>
                </tr>
              ))}
              <tr className="total"><td /><td /><td>{t("closing")}</td><td /><td /><td className="amt"><Money m={gl.closing} /></td></tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export function TrialBalance() {
  const { t, books, period, lang } = useStore();
  const [detailed, setDetailed] = useState(false);
  const tb = useMemo(() => trialBalance(books, period), [books, period]);
  const ok = tb.totals.closingDr === tb.totals.closingCr;
  return (
    <div className="page">
      <ReportActions />
      <Card actions={<label className="chk no-print"><input type="checkbox" checked={detailed} onChange={(e) => setDetailed(e.target.checked)} /> {t("detailed")}</label>}>
        <ReportHeader title={t("trialBalance")} sub={`${t("asAt")} ${period.to} (${t("movement")} ${period.from} → ${period.to})`} />
        <div className="table-wrap">
          <table className="grid tb">
            <thead>
              <tr>
                <th>{t("code")}</th><th>{t("account")}</th>
                {detailed && <><th className="amt">{t("opening")}</th><th className="amt">{t("debit")}</th><th className="amt">{t("credit")}</th></>}
                <th className="amt">{t("debit")}</th><th className="amt">{t("credit")}</th>
              </tr>
            </thead>
            <tbody>
              {tb.rows.map((r) => (
                <tr key={r.account.code} className={r.account.subtype === "suspense" ? "suspense" : ""}>
                  <td>{r.account.code}</td>
                  <td>{lang === "ar" ? r.account.nameAr || r.account.name : r.account.name}</td>
                  {detailed && <><td className="amt"><Money m={r.opening} blankZero /></td><td className="amt"><Money m={r.debit} blankZero /></td><td className="amt"><Money m={r.credit} blankZero /></td></>}
                  <td className="amt">{r.closing > 0 ? <Money m={r.closing} /> : ""}</td>
                  <td className="amt">{r.closing < 0 ? <Money m={-r.closing} /> : ""}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="total">
                <td /><td>{t("totals")}</td>
                {detailed && <><td className="amt"><Money m={tb.totals.opening} /></td><td className="amt"><Money m={tb.totals.debit} /></td><td className="amt"><Money m={tb.totals.credit} /></td></>}
                <td className="amt"><Money m={tb.totals.closingDr} /></td>
                <td className="amt"><Money m={tb.totals.closingCr} /></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className={ok ? "ok-msg" : "error"}>{ok ? `✓ ${t("balanced")}` : `${t("notBalanced")}: ${t("difference")} ${(tb.totals.closingDr - tb.totals.closingCr) / 1000}`}</div>
        <p className="footnote">{t("preparedBy")}</p>
      </Card>
    </div>
  );
}

export function Statements() {
  const { t, books, period } = useStore();
  const [tab, setTab] = useState<"is" | "bs" | "cf" | "all">("all");
  const is = useMemo(() => incomeStatement(books, period), [books, period]);
  const bs = useMemo(() => balanceSheet(books, period), [books, period]);
  const cf = useMemo(() => cashFlow(books, period), [books, period]);
  const show = (k: string) => tab === "all" || tab === k;
  return (
    <div className="page">
      <ReportActions />
      <div className="tabs no-print">
        {(["all", "is", "bs", "cf"] as const).map((k) => (
          <button key={k} className={tab === k ? "active" : ""} onClick={() => setTab(k)}>
            {k === "all" ? t("all") : k === "is" ? t("incomeStatement") : k === "bs" ? t("balanceSheet") : t("cashFlow")}
          </button>
        ))}
      </div>
      {show("is") && (
        <Card className="report">
          <ReportHeader title={t("incomeStatement")} sub={`${t("forPeriod")} ${period.from} → ${period.to}`} />
          <StatementTable lines={is.lines} />
        </Card>
      )}
      {show("bs") && (
        <Card className="report page-break">
          <ReportHeader title={t("balanceSheet")} sub={`${t("asAt")} ${period.to}`} />
          <StatementTable lines={bs.lines} />
          <div className={bs.difference === 0 ? "ok-msg" : "error"}>{t("bsCheck")}: {bs.difference === 0 ? `✓ ${t("balanced")}` : <Money m={bs.difference} />}</div>
        </Card>
      )}
      {show("cf") && (
        <Card className="report page-break">
          <ReportHeader title={t("cashFlow")} sub={`${t("forPeriod")} ${period.from} → ${period.to}`} />
          <StatementTable lines={cf.lines} />
          <div className={cf.check === 0 ? "ok-msg" : "error"}>{t("cfCheck")}: {cf.check === 0 ? "✓" : <Money m={cf.check} />}</div>
        </Card>
      )}
      <p className="footnote">{t("preparedBy")} · {books.entries.some((e) => e.lines.some((l) => l.account === SYS.suspense)) ? "⚠ Suspense" : ""}</p>
    </div>
  );
}

export function Vat() {
  const { t, books, period, lang } = useStore();
  const preset = COUNTRIES[books.company.country];
  const v = useMemo(() => vatSummary(books, period), [books, period]);
  return (
    <div className="page">
      <ReportActions />
      <Card>
        <ReportHeader title={`${t("vat")} – ${lang === "ar" ? preset.vatAuthorityAr : preset.vatAuthority}`} sub={`${period.from} → ${period.to}`} />
        {preset.vatRate === 0 && <div className="warn">{t("noVatCountry")}</div>}
        <p className="muted">{t("vatReturnHint")}</p>
        <h3 className="sub-h">{t("returnBoxes")}</h3>
        <table className="grid boxes">
          <thead><tr><th>{t("box")}</th><th>{t("description")}</th><th className="amt">{t("amount")}</th><th className="amt">{t("vatAmount")}</th></tr></thead>
          <tbody>
            {returnBoxes(books.company.country, v).map((r) => (
              <tr key={r.box} className={r.bold ? "total" : ""}>
                <td>{r.box}</td><td>{lang === "ar" ? r.labelAr : r.label}</td>
                <td className="amt">{r.amount != null ? <Money m={r.amount} /> : ""}</td>
                <td className="amt">{r.vat != null ? <Money m={r.vat} /> : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted small">{t("boxesHint")}</p>
        {v.blocked.vat > 0 && <div className="warn">{t("blockedVat")}: <Money m={v.blocked.vat} /> ({t("netAmount")} <Money m={v.blocked.net} />)</div>}
        {(v.outputLedger !== v.outputVat || v.inputLedger !== v.inputVat) && (
          <div className="warn">{t("ledgerCheck")}: {t("outputVat")} <Money m={v.outputLedger} /> / {t("inputVat")} <Money m={v.inputLedger} /> {lang === "ar" ? "(تتضمن قيوداً يدوية على حسابات الضريبة)" : "(includes manual postings to VAT accounts)"}</div>
        )}
      </Card>
      <Card title={`${t("journal")} – VAT`}>
        <div className="table-wrap">
          <table className="grid">
            <thead><tr><th>{t("date")}</th><th>{t("reference")}</th><th>{t("party")}</th><th>{t("trn")}</th><th>{t("type")}</th><th>{t("vatTreatment")}</th><th className="amt">{t("netAmount")}</th><th className="amt">{t("vatAmount")}</th><th className="amt">{t("total")}</th></tr></thead>
            <tbody>
              {v.entries.map((e) => (
                <tr key={e.id}>
                  <td>{e.date}</td><td>{e.ref}</td><td dir="auto">{e.party ?? e.memo}</td><td>{e.tax?.partyTrn}</td>
                  <td>{e.tax?.kind === "sales" ? t("sale") : t("purchase")}</td>
                  <td>{TREATMENTS[e.tax?.treatment ?? "standard"][lang === "ar" ? 1 : 0]}</td>
                  <td className="amt"><Money m={e.tax!.net} /></td><td className="amt"><Money m={e.tax!.vat} /></td>
                  <td className="amt"><Money m={e.tax!.net + e.tax!.vat} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
