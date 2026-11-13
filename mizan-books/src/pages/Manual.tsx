import { useEffect, useState } from "react";
import { useStore } from "../lib/store";
import { AccountSelect, AmountInput, Card, Money } from "../components/ui";
import { entryTotals, validateEntry } from "../lib/ledger";
import { todayISO, uid } from "../lib/money";
import { SYS } from "../lib/coa";
import type { JournalEntry, JournalLine } from "../lib/types";
import type { TKey } from "../lib/i18n";

const blank = (): JournalLine => ({ account: "", debit: 0, credit: 0 });

export default function Manual({ editId, onDone }: { editId?: string; onDone: () => void }) {
  const { t, books, update, addEntries, lang } = useStore();
  const editing = editId ? books.entries.find((e) => e.id === editId) : undefined;
  const [date, setDate] = useState(editing?.date ?? todayISO());
  const [memo, setMemo] = useState(editing?.memo ?? "");
  const [ref, setRef] = useState(editing?.ref ?? "");
  const [party, setParty] = useState(editing?.party ?? "");
  const [lines, setLines] = useState<JournalLine[]>(editing?.lines.map((l) => ({ ...l })) ?? [blank(), blank()]);
  const [errors, setErrors] = useState<string[]>([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (editing) { setDate(editing.date); setMemo(editing.memo); setRef(editing.ref ?? ""); setParty(editing.party ?? ""); setLines(editing.lines.map((l) => ({ ...l }))); }
  }, [editId]); // eslint-disable-line react-hooks/exhaustive-deps

  const setLine = (i: number, p: Partial<JournalLine>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...p } : l)));
  const tot = entryTotals({ lines });
  const diff = tot.debit - tot.credit;

  const template = (k: string) => {
    const L = (account: string, debit = 0, credit = 0): JournalLine => ({ account, debit, credit });
    switch (k) {
      case "capital": setMemo(lang === "ar" ? "إيداع رأس مال" : "Capital introduced by owner"); setLines([L(SYS.bank), L("3000")]); break;
      case "dep": setMemo(lang === "ar" ? "إهلاك شهري" : "Monthly depreciation"); setLines([L("6900"), L("1550")]); break;
      case "eosb": setMemo(lang === "ar" ? "مخصص مكافأة نهاية الخدمة" : "End-of-service benefits provision"); setLines([L("6010"), L("2500")]); break;
      case "opening": setMemo(lang === "ar" ? "أرصدة افتتاحية" : "Opening balances"); setLines([L(SYS.bank), L(SYS.ar), L("1200"), L("1500"), L(SYS.ap), L("3000"), L(SYS.retained), L(SYS.openingEquity)]); break;
      case "vat": {
        const vin = books.entries.reduce((s, e) => s + e.lines.filter((l) => l.account === SYS.vatIn).reduce((a, l) => a + l.debit - l.credit, 0), 0);
        const vout = -books.entries.reduce((s, e) => s + e.lines.filter((l) => l.account === SYS.vatOut).reduce((a, l) => a + l.debit - l.credit, 0), 0);
        setMemo(lang === "ar" ? "تسوية إقرار ضريبة القيمة المضافة" : "VAT return settlement");
        const net = vout - vin;
        setLines([L(SYS.vatOut, Math.max(vout, 0)), L(SYS.vatIn, 0, Math.max(vin, 0)), net >= 0 ? L(SYS.bank, 0, net) : L(SYS.bank, -net, 0)]);
        break;
      }
    }
  };

  const save = () => {
    const clean = lines.filter((l) => l.account && (l.debit || l.credit));
    const e: JournalEntry = {
      id: editing?.id ?? uid(), date, memo: memo || (lang === "ar" ? "قيد يدوي" : "Manual journal"), ref: ref || undefined, party: party || undefined,
      source: editing?.source ?? (lines.length > 4 && /opening|افتتاح/i.test(memo) ? "opening" : "manual"),
      lines: clean, tax: editing?.tax, attachment: editing?.attachment, fx: editing?.fx, createdAt: editing?.createdAt ?? new Date().toISOString(),
    };
    const errs = validateEntry(e, books.accounts);
    setErrors(errs);
    if (errs.length) return;
    if (editing) update((b) => ({ ...b, entries: b.entries.map((x) => (x.id === e.id ? e : x)) }));
    else addEntries([e]);
    setMsg(t("entrySaved"));
    setLines([blank(), blank()]); setMemo(""); setRef(""); setParty("");
    if (editing) onDone();
  };

  return (
    <div className="page">
      <Card title={editing ? `${t("edit")} – ${editing.memo}` : t("newEntry")} actions={!editing && (
        <select value="" onChange={(e) => template(e.target.value)}>
          <option value="">{t("quickTemplates")}…</option>
          <option value="opening">{t("tplOpening")}</option>
          <option value="capital">{t("tplCapital")}</option>
          <option value="dep">{t("tplDep")}</option>
          <option value="eosb">{t("tplEosb")}</option>
          <option value="vat">{t("tplVatSettle")}</option>
        </select>
      )}>
        <div className="grid-form">
          <label>{t("date")}<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <label>{t("reference")}<input value={ref} onChange={(e) => setRef(e.target.value)} /></label>
          <label>{t("party")}<input dir="auto" value={party} onChange={(e) => setParty(e.target.value)} /></label>
          <label className="wide">{t("memo")}<input dir="auto" value={memo} onChange={(e) => setMemo(e.target.value)} /></label>
        </div>
        <table className="grid lines">
          <thead><tr><th>{t("account")}</th><th>{t("memo")}</th><th className="amt">{t("debit")}</th><th className="amt">{t("credit")}</th><th /></tr></thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i}>
                <td><AccountSelect value={l.account} onChange={(account) => setLine(i, { account })} /></td>
                <td><input dir="auto" value={l.note ?? ""} onChange={(e) => setLine(i, { note: e.target.value || undefined })} /></td>
                <td><AmountInput value={l.debit} onChange={(debit) => setLine(i, { debit, credit: debit ? 0 : l.credit })} /></td>
                <td><AmountInput value={l.credit} onChange={(credit) => setLine(i, { credit, debit: credit ? 0 : l.debit })} /></td>
                <td><button className="ghost" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>✕</button></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td><button className="secondary" onClick={() => setLines((ls) => [...ls, blank()])}>+ {t("addLine")}</button></td>
              <td className="amt">{t("totals")}</td>
              <td className="amt"><Money m={tot.debit} /></td>
              <td className="amt"><Money m={tot.credit} /></td>
              <td />
            </tr>
            <tr>
              <td />
              <td className="amt">{t("difference")}</td>
              <td colSpan={2} className={`amt ${diff ? "bad" : "good"}`}>{diff ? <Money m={diff} /> : `✓ ${t("balanced")}`}
                {diff !== 0 && <button className="ghost small" onClick={() => {
                  const i = lines.findIndex((l) => l.account && !l.debit && !l.credit);
                  const target = i >= 0 ? i : lines.length;
                  if (i < 0) setLines((ls) => [...ls, blank()]);
                  setTimeout(() => setLine(target, diff > 0 ? { credit: diff, debit: 0 } : { debit: -diff, credit: 0 }));
                }}>⇢ {lang === "ar" ? "موازنة" : "balance"}</button>}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
        {errors.length > 0 && <div className="error">{errors.map((e) => t(e as TKey)).join(" · ")}</div>}
        {msg && !errors.length && <div className="ok-msg">✓ {msg}</div>}
        <div className="row-actions">
          <button onClick={save}>{t("post")}</button>
          {editing && <button className="secondary" onClick={onDone}>{t("cancel")}</button>}
        </div>
      </Card>
    </div>
  );
}
