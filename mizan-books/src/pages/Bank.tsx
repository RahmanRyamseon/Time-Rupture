import { useEffect, useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { AccountSelect, Card, Dropzone, Money } from "../components/ui";
import { detectColumns, parseStatementText, rowsToTxns, type RawTxn } from "../lib/bankParser";
import { isPdf, isSpreadsheet, readGrid } from "../lib/files";
import { openPdf, pdfText, scanFile } from "../lib/ocr";
import { aiAvailable, aiReadStatement } from "../lib/ai";
import { classify, learnKeyword, SYS } from "../lib/coa";
import { COUNTRIES } from "../lib/countries";
import { bankLineToEntry, type BankLine } from "../lib/ledger";
import { toMils, uid } from "../lib/money";

const VAT_ACCOUNTS = new Set(["6100", "6200", "6210", "6300", "6400", "6500", "6600", "6700", "6850", "6860", "6950", "6990", "5000", "5100"]);

export default function Bank() {
  const { t, books, addEntries, update, vatRate, settings, lang } = useStore();
  const [lines, setLines] = useState<BankLine[]>([]);
  const [bankAcct, setBankAcct] = useState<string>(SYS.bank);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [fileName, setFileName] = useState("");
  const [learn, setLearn] = useState(true);
  const [ai, setAi] = useState(false);
  const [filter, setFilter] = useState("");

  useEffect(() => { aiAvailable().then(setAi); }, []);

  const toLines = (raw: RawTxn[]): BankLine[] =>
    raw.map((r) => {
      const account = classify(r.description, books.rules) ?? (r.amount > 0 ? SYS.ar : SYS.suspense);
      return {
        id: uid(), date: r.date, description: r.description, amount: toMils(r.amount),
        balance: r.balance != null ? toMils(r.balance) : undefined,
        account, withVat: vatRate > 0 && r.amount < 0 && VAT_ACCOUNTS.has(account) && account !== "6950", include: true,
      };
    });

  const load = async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setError(""); setLines([]); setFileName(f.name);
    try {
      let raw: RawTxn[] = [];
      if (isSpreadsheet(f)) {
        setStatus("reading spreadsheet");
        const grid = await readGrid(f);
        const map = detectColumns(grid);
        if (map) raw = rowsToTxns(grid, map);
      } else if (isPdf(f)) {
        setStatus("reading PDF");
        const text = await pdfText(await openPdf(f));
        raw = parseStatementText(text);
        if (raw.length < 2 && ai && settings.aiEnabled) {
          setStatus("AI");
          raw = await aiReadStatement(f, COUNTRIES[books.company.country].name).catch(() => []);
        }
        if (raw.length < 2) {
          const scan = await scanFile(f, (m, p) => setStatus(`${m}${p != null ? ` ${Math.round(p * 100)}%` : ""}`), 20);
          raw = parseStatementText(scan.text);
        }
      } else {
        if (ai && settings.aiEnabled) {
          setStatus("AI");
          raw = await aiReadStatement(f, COUNTRIES[books.company.country].name).catch(() => []);
        }
        if (!raw.length) {
          const scan = await scanFile(f, (m, p) => setStatus(`${m}${p != null ? ` ${Math.round(p * 100)}%` : ""}`));
          raw = parseStatementText(scan.text);
        }
      }
      if (!raw.length) setError(t("noTxns"));
      setLines(toLines(raw));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg === "legacyXls" ? t("legacyXls") : msg);
    } finally {
      setStatus("");
    }
  };

  const recon = useMemo(() => {
    const withBal = lines.filter((l) => l.balance != null);
    if (withBal.length < 2) return null;
    let bad = 0;
    // Try both orders – some banks print newest first.
    const check = (arr: BankLine[]) => { let b = 0; for (let i = 1; i < arr.length; i++) if (arr[i].balance! - arr[i - 1].balance! !== arr[i].amount) b++; return b; };
    bad = Math.min(check(withBal), check([...withBal].reverse()));
    return bad;
  }, [lines]);

  const exists = (l: BankLine) => books.entries.some((e) => e.source === "bank" && e.date === l.date && e.lines.some((x) => x.account === bankAcct && (x.debit - x.credit) === l.amount));

  const set = (id: string, p: Partial<BankLine>) => setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...p } : l)));

  const postSelected = () => {
    const now = new Date().toISOString();
    const chosen = lines.filter((l) => l.include);
    addEntries(chosen.map((l) => ({ ...bankLineToEntry(l, bankAcct, vatRate, uid(), now), attachment: fileName })));
    if (learn) {
      const newRules = chosen
        .filter((l) => l.account !== SYS.suspense && classify(l.description, books.rules) !== l.account)
        .map((l) => ({ keyword: learnKeyword(l.description), account: l.account, learned: true }))
        .filter((r): r is { keyword: string; account: string; learned: true } => Boolean(r.keyword));
      if (newRules.length) update((b) => ({ ...b, rules: [...b.rules.filter((r) => !newRules.some((n) => n.keyword === r.keyword && r.learned)), ...newRules] }));
    }
    setLines((ls) => ls.filter((l) => !l.include));
  };

  const shown = lines.filter((l) => !filter || l.description.toLowerCase().includes(filter.toLowerCase()));
  const totIn = lines.filter((l) => l.include && l.amount > 0).reduce((s, l) => s + l.amount, 0);
  const totOut = lines.filter((l) => l.include && l.amount < 0).reduce((s, l) => s + l.amount, 0);

  return (
    <div className="page">
      <Card title={t("bank")}>
        <div className="toolbar">
          <label>{t("bankAccount")} <AccountSelect value={bankAcct} onChange={setBankAcct} filter={(a) => a.subtype === "cash" || a.code === "2400"} /></label>
        </div>
        <Dropzone onFiles={load} accept=".csv,.tsv,.txt,.xlsx,.xlsm,.pdf,image/*" label={t("bankDrop")} hint="Emirates NBD, ADCB, FAB, Mashreq, Al Rajhi, SNB, QNB, NBK, NBB, Bank Muscat… CSV / Excel / PDF" />
        {status && <div className="progress">{t("scanning")} {status}</div>}
        {error && <div className="error">{error}</div>}
      </Card>
      {lines.length > 0 && (
        <Card title={<>{fileName} · {lines.length} {t("linesFound")}</>} actions={
          <>
            <input className="search" placeholder={t("search")} value={filter} onChange={(e) => setFilter(e.target.value)} />
            <label className="chk"><input type="checkbox" checked={learn} onChange={(e) => setLearn(e.target.checked)} /> {t("rememberRule")}</label>
            <button onClick={postSelected}>{t("postSelected")} ({lines.filter((l) => l.include).length})</button>
          </>
        }>
          {recon != null && <div className={recon === 0 ? "ok-msg" : "warn"}>{recon === 0 ? `✓ ${t("reconcileOk")}` : `⚠ ${t("reconcileBad")} (${recon})`}</div>}
          <div className="summary-row">
            <span>{t("moneyIn")}: <Money m={totIn} /></span>
            <span>{t("moneyOut")}: <Money m={-totOut} /></span>
            {lines.some((l) => l.account === SYS.suspense) && <span className="warn">⚠ {lines.filter((l) => l.account === SYS.suspense).length} → {lang === "ar" ? "حساب معلق" : "Suspense"}</span>}
          </div>
          <div className="table-wrap">
            <table className="grid">
              <thead>
                <tr>
                  <th><input type="checkbox" checked={lines.every((l) => l.include)} onChange={(e) => setLines((ls) => ls.map((l) => ({ ...l, include: e.target.checked })))} /></th>
                  <th>{t("date")}</th><th>{t("description")}</th><th className="amt">{t("moneyIn")}</th><th className="amt">{t("moneyOut")}</th><th className="amt">{t("balance")}</th><th>{t("account")}</th>{vatRate > 0 && <th>{t("withVat")}</th>}
                </tr>
              </thead>
              <tbody>
                {shown.map((l) => (
                  <tr key={l.id} className={`${l.include ? "" : "muted"} ${l.account === SYS.suspense ? "suspense" : ""}`}>
                    <td><input type="checkbox" checked={l.include} onChange={(e) => set(l.id, { include: e.target.checked })} /></td>
                    <td><input type="date" value={l.date} onChange={(e) => set(l.id, { date: e.target.value })} /></td>
                    <td dir="auto" className="desc">{l.description}{exists(l) && <div className="warn small">⚠ {t("duplicateWarn")}</div>}</td>
                    <td className="amt">{l.amount > 0 && <Money m={l.amount} />}</td>
                    <td className="amt">{l.amount < 0 && <Money m={-l.amount} />}</td>
                    <td className="amt">{l.balance != null && <Money m={l.balance} />}</td>
                    <td>
                      <AccountSelect value={l.account} onChange={(account) => set(l.id, { account })} filter={(a) => a.code !== bankAcct} />
                      <button className="ghost small" title="↔" onClick={() => set(l.id, { amount: -l.amount })}>⇄</button>
                    </td>
                    {vatRate > 0 && <td><input type="checkbox" checked={l.withVat} onChange={(e) => set(l.id, { withVat: e.target.checked })} /></td>}
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
