import { useEffect, useMemo, useRef, useState } from "react";
import { accountName, useStore } from "../lib/store";
import { AccountSelect, AmountInput, Card, Dropzone, Money } from "../components/ui";
import { previewFile, scanFile } from "../lib/ocr";
import { decodeZatcaQr, parseInvoiceText, type ExtractedInvoice } from "../lib/invoiceParser";
import { aiAvailable, aiReadInvoice } from "../lib/ai";
import { classifyDetailed, SYS } from "../lib/coa";
import { indicativeRate, COUNTRIES } from "../lib/countries";
import { invoiceToEntry, validateEntry, type Settlement } from "../lib/ledger";
import { todayISO, toMils, uid } from "../lib/money";
import { suggestTreatment, TREATMENTS, verifyInvoice, type VatTreatment } from "../lib/vat";
import type { Books, JournalEntry } from "../lib/types";

interface Draft {
  kind: "purchase" | "sales";
  date: string;
  number: string;
  party: string;
  partyTrn: string;
  currency: string;
  fxRate: number;
  net: number; // mils in document currency
  vat: number;
  vatRate: number;
  account: string;
  /** Why the account was chosen: [en, ar]. */
  accountReason?: [string, string];
  treatment: VatTreatment;
  treatmentReason?: [string, string];
  /** True once the user picks a treatment, so later edits don't overwrite it. */
  treatmentManual?: boolean;
  settlement: Settlement;
  description: string;
}

interface Item {
  id: string;
  file?: File;
  status: "queued" | "scanning" | "ready" | "posted" | "failed";
  progress?: string;
  extracted?: ExtractedInvoice;
  text?: string;
  preview?: string;
  draft?: Draft;
  error?: string;
  engine?: "openocr" | "tesseract";
  entryId?: string;
}

const isPurchaseAccount = (b: Books, code: string) => b.accounts.some((a) => a.code === code && (a.type === "expense" || a.subtype === "non_current_asset" || a.subtype === "current_asset"));
const isRevenueAccount = (b: Books, code: string) => b.accounts.some((a) => a.code === code && a.type === "revenue");

/** Chooses the expense / revenue account: supplier name first, then AI category, then the invoice's line items. */
function pickAccount(kind: Draft["kind"], books: Books, party: string, category: string | undefined, text: string): { account: string; reason?: [string, string] } {
  const ok = (code: string) => (kind === "sales" ? isRevenueAccount(books, code) : isPurchaseAccount(books, code));
  const tries: [string, string, string][] = [
    [party, "supplier name", "اسم المورد"],
    [category ?? "", "AI category", "تصنيف الذكاء الاصطناعي"],
    [text, "invoice items", "بنود الفاتورة"],
  ];
  for (const [src, en, ar] of tries) {
    if (!src.trim()) continue;
    const r = classifyDetailed(src, books.rules);
    if (r && ok(r.account)) {
      const how = r.learned ? ["learned from your earlier posting", "مستفاد من ترحيل سابق"] : [en, ar];
      return { account: r.account, reason: [`matched "${r.keyword.trim()}" in ${how[0]}`, `تطابق "${r.keyword.trim()}" في ${how[1]}`] };
    }
  }
  return kind === "sales"
    ? { account: SYS.sales }
    : { account: SYS.generalExpense, reason: ["no match – general expenses; please choose a category", "لا يوجد تطابق – مصروفات عامة؛ يرجى اختيار التصنيف"] };
}

function withTreatment(d: Draft, books: Books, text = ""): Draft {
  if (d.treatmentManual) return d;
  const s = suggestTreatment({
    kind: d.kind, text: `${d.party} ${d.description} ${text}`, account: d.account, partyTrn: d.partyTrn,
    vat: d.vat, country: books.company.country, currency: d.currency, baseCurrency: books.company.currency,
  });
  return { ...d, treatment: books.company.vatRegistered || s.treatment === "out_of_scope" ? s.treatment : "out_of_scope", treatmentReason: s.reason };
}

function toDraft(x: ExtractedInvoice, books: Books, vatRate: number, category: string | undefined, text: string): Draft {
  const own = books.company.trn.replace(/\D/g, "");
  let kind: Draft["kind"] = x.kind ?? "purchase";
  if (own && x.supplierTrn === own) kind = "sales";
  const currency = x.currency ?? books.company.currency;
  const fxRate = indicativeRate(currency, books.company.currency) ?? 1;
  const party = kind === "sales" ? x.customer ?? "" : x.supplier ?? "";
  const partyTrn = (kind === "sales" ? x.customerTrn : x.supplierTrn) ?? "";
  const { account, reason } = pickAccount(kind, books, party, category, text);
  return withTreatment({
    kind, date: x.date ?? todayISO(), number: x.number ?? "", party, partyTrn, currency, fxRate,
    net: toMils(x.subtotal ?? x.total ?? 0), vat: toMils(x.vat ?? 0), vatRate: x.vatRate ?? vatRate,
    account, accountReason: reason, treatment: "standard", settlement: "credit", description: category ?? "",
  }, books, text);
}

function blankDraft(books: Books, vatRate: number): Draft {
  return withTreatment({
    kind: "purchase", date: todayISO(), number: "", party: "", partyTrn: "", currency: books.company.currency, fxRate: 1,
    net: 0, vat: 0, vatRate, account: SYS.generalExpense, treatment: "standard", settlement: "credit", description: "",
  }, books);
}

/** Converts a draft to the journal entry that would be posted (amounts in base currency). */
function draftToEntry(d: Draft, books: Books, attachment?: string): JournalEntry {
  return invoiceToEntry({
    kind: d.kind, date: d.date, number: d.number, party: d.party, partyTrn: d.partyTrn,
    net: Math.round(d.net * d.fxRate), vat: Math.round(d.vat * d.fxRate), vatRate: d.vatRate,
    account: d.account, settlement: d.settlement, treatment: d.treatment, attachment,
    memo: d.description ? `${d.kind === "purchase" ? "Purchase" : "Sale"} – ${d.party || "—"}: ${d.description}` : undefined,
    fx: d.currency !== books.company.currency ? { currency: d.currency, rate: d.fxRate, total: (d.net + d.vat) / 1000 } : undefined,
  }, uid(), new Date().toISOString());
}

export default function Capture() {
  const { t, books, settings, addEntries, update, vatRate, lang, removeEntry } = useStore();
  const [items, setItems] = useState<Item[]>([]);
  const [ai, setAi] = useState(false);
  const busy = useRef(false);

  useEffect(() => { aiAvailable().then(setAi); }, []);
  const useAi = ai && settings.aiEnabled;

  const patch = (id: string, p: Partial<Item>) => setItems((list) => list.map((i) => (i.id === id ? { ...i, ...p } : i)));
  const patchDraft = (id: string, p: Partial<Draft>) =>
    setItems((list) => list.map((i) => {
      if (i.id !== id || !i.draft) return i;
      let d = { ...i.draft, ...p };
      // Changing the category or kind re-picks the VAT treatment unless the user chose one.
      if ("account" in p || "kind" in p || "partyTrn" in p || "vat" in p || "currency" in p) d = withTreatment(d, books, i.text);
      if ("account" in p) d.accountReason = undefined;
      return { ...i, draft: d };
    }));

  // Process the queue one file at a time (OCR uses a single worker).
  useEffect(() => {
    if (busy.current) return;
    const next = items.find((i) => i.status === "queued" && i.file);
    if (!next?.file) return;
    const file = next.file;
    busy.current = true;
    (async () => {
      patch(next.id, { status: "scanning", progress: "…" });
      const country = COUNTRIES[books.company.country].name;
      try {
        let extracted: ExtractedInvoice | null = null;
        let category: string | undefined;
        let text = "";
        let preview: string | undefined;
        let engine: Item["engine"];
        if (settings.aiEnabled && (await aiAvailable())) {
          try {
            patch(next.id, { progress: "AI" });
            const r = await aiReadInvoice(file, country);
            extracted = r; category = r.category;
          } catch (e) {
            console.warn("AI read failed, falling back to OCR", e);
          }
        }
        if (extracted) {
          preview = await previewFile(file);
        } else {
          const scan = await scanFile(file, (m, p) => patch(next.id, { progress: `${m}${p != null ? ` ${Math.round(p * 100)}%` : ""}` }));
          text = scan.text; preview = scan.preview; engine = scan.engine;
          if (scan.qr) extracted = decodeZatcaQr(scan.qr);
          if (!extracted) extracted = parseInvoiceText(scan.text, vatRate, books.company.trn.replace(/\D/g, "") || undefined);
          if (extracted.source === "ocr" && scan.method === "pdf-text") extracted.source = "text";
        }
        patch(next.id, { status: "ready", engine, extracted, text, preview, draft: toDraft(extracted, books, vatRate, category, text), progress: undefined });
      } catch (e) {
        patch(next.id, { status: "failed", error: e instanceof Error ? e.message : String(e) });
      } finally {
        busy.current = false;
        setItems((l) => [...l]); // trigger next
      }
    })();
  }, [items, settings.aiEnabled, books, vatRate]);

  const add = (files: File[]) => setItems((l) => [...l, ...files.map((file) => ({ id: uid(), file, status: "queued" as const }))]);
  const addManual = () => setItems((l) => [{ id: uid(), status: "ready", draft: blankDraft(books, vatRate) }, ...l]);

  const post = (it: Item) => {
    const d = it.draft!;
    const entry = draftToEntry(d, books, it.file?.name);
    if (validateEntry(entry, books.accounts).length) return;
    addEntries([entry]);
    // Learn supplier → account so the next invoice from them is pre-classified.
    const key = d.party.trim().toLowerCase().split(/\s+/).slice(0, 2).join(" ");
    if (key.length > 2 && d.account !== SYS.generalExpense && d.account !== SYS.sales) {
      update((b) => ({ ...b, rules: [...b.rules.filter((r) => !(r.learned && r.keyword === key)), { keyword: key, account: d.account, learned: true }] }));
    }
    patch(it.id, { status: "posted", entryId: entry.id });
  };

  const undo = (it: Item) => {
    if (it.entryId) removeEntry(it.entryId);
    patch(it.id, { status: "ready", entryId: undefined });
  };

  const isDuplicate = (d: Draft) => {
    const total = Math.round((d.net + d.vat) * d.fxRate);
    return books.entries.some((e) => e.source === "invoice" && e.tax && (
      (d.number && e.ref === d.number && Math.abs(e.tax.net + e.tax.vat - total) < 20) ||
      (e.date === d.date && d.party && e.party === d.party && Math.abs(e.tax.net + e.tax.vat - total) < 20)));
  };

  const ready = items.filter((i) => i.status === "ready" && i.draft && i.draft.net > 0);

  return (
    <div className="page">
      <Card title={t("capture")} actions={<>
        <span className={`pill ${useAi ? "ok" : ""}`}>{useAi ? t("aiOn") : ai ? t("aiAvailOff") : t("aiOff")}</span>
        <button className="secondary" onClick={addManual}>+ {t("enterInvoice")}</button>
      </>}>
        <Dropzone onFiles={add} accept="image/*,application/pdf" label={t("dropFiles")} hint={t("supported")} capture />
      </Card>
      {ready.length > 1 && (
        <div className="toolbar">
          <button onClick={() => ready.forEach(post)}>{t("postAllReady")} ({ready.length})</button>
        </div>
      )}
      {items.map((it) => (
        <Card key={it.id} className={`doc doc-${it.status}`}
          title={<span>{it.file?.name ?? t("manualInvoice")} <span className={`pill st-${it.status}`}>{t(it.status === "scanning" ? "scanning" : it.status)}</span></span>}
          actions={<button className="ghost" onClick={() => setItems((l) => l.filter((x) => x.id !== it.id))}>✕</button>}>
          {it.status === "scanning" && <div className="progress">{t("scanning")} {it.progress}</div>}
          {it.status === "failed" && <div className="error">{it.error}</div>}
          {it.draft && it.status !== "posted" && (
            <div className={it.preview ? "doc-body" : ""}>
              {it.preview && <img className="doc-preview" src={it.preview} alt="" />}
              <div className="doc-form">
                {it.extracted && (
                  <div className="meta">
                    {t("readBy")}: <b>{it.extracted.source === "zatca-qr" ? "ZATCA QR" : it.extracted.source === "ai" ? "AI (Claude)" : it.extracted.source === "text" ? "PDF text" : it.engine === "openocr" ? "OpenOCR" : "OCR (Tesseract)"}</b> ·{" "}
                    {t("confidence")}: <b className={`conf-${it.extracted.confidence}`}>{it.extracted.confidence}</b>
                    {it.extracted.notes?.map((n) => <div key={n} className="warn">⚠ {["vatAssumed", "totalGuessed", "totalsMismatch"].includes(n) ? t(n as "vatAssumed") : n}</div>)}
                  </div>
                )}
                {isDuplicate(it.draft) && <div className="warn">⚠ {t("duplicateWarn")}</div>}
                <DraftForm d={it.draft} onChange={(p) => patchDraft(it.id, p)} />
                <PostingPreview d={it.draft} onPost={() => post(it)} />
                {it.text && (
                  <details>
                    <summary>{t("rawText")}</summary>
                    <pre className="raw" dir="auto">{it.text}</pre>
                  </details>
                )}
              </div>
            </div>
          )}
          {it.status === "posted" && (
            <div className="ok-msg">
              ✓ {t("posted")} – {it.draft?.party || "—"} · {accountName(books, it.draft!.account, lang)} · {lang === "ar" ? TREATMENTS[it.draft!.treatment][1] : TREATMENTS[it.draft!.treatment][0]}
              {" "}<button className="ghost small" onClick={() => undo(it)}>↶ {t("undoPost")}</button>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

/** Shows VAT checks and the exact journal entry before posting. */
function PostingPreview({ d, onPost }: { d: Draft; onPost: () => void }) {
  const { t, books, lang, period } = useStore();
  const entry = useMemo(() => draftToEntry(d, books), [d, books]);
  const findings = useMemo(() => verifyInvoice({
    kind: d.kind, number: d.number, date: d.date, party: d.party, partyTrn: d.partyTrn,
    net: d.net, vat: d.vat, rate: d.vatRate, treatment: d.treatment, country: books.company.country,
    currency: d.currency, baseCurrency: books.company.currency, period,
  }), [d, books, period]);
  const errs = validateEntry(entry, books.accounts);
  const L = (pair: [string, string]) => (lang === "ar" ? pair[1] : pair[0]);
  return (
    <div className="posting">
      {findings.length > 0 && (
        <div className="findings">
          <div className="findings-h">{t("vatChecks")}</div>
          {findings.map((f, i) => <div key={i} className={f.level === "error" ? "error" : "warn"}>{f.level === "error" ? "✖" : "⚠"} {lang === "ar" ? f.ar : f.en}</div>)}
        </div>
      )}
      {findings.length === 0 && <div className="ok-msg">✓ {t("vatChecksOk")}</div>}
      <div className="findings-h">{t("entryPreview")}</div>
      <table className="grid lines preview">
        <thead><tr><th>{t("account")}</th><th className="amt">{t("debit")}</th><th className="amt">{t("credit")}</th></tr></thead>
        <tbody>
          {entry.lines.map((l, i) => (
            <tr key={i}>
              <td className={l.credit ? "cr-indent" : ""}>{l.account} · {accountName(books, l.account, lang)}{l.note ? <span className="muted small"> ({l.note})</span> : null}</td>
              <td className="amt">{l.debit ? <Money m={l.debit} /> : ""}</td>
              <td className="amt">{l.credit ? <Money m={l.credit} /> : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {d.treatmentReason && <div className="muted small">{t("vatTreatment")}: {L(TREATMENTS[d.treatment] as unknown as [string, string])} – {L(d.treatmentReason)}</div>}
      <div className="row-actions">
        <button onClick={onPost} disabled={errs.length > 0 || d.net <= 0}>{t("post")}</button>
        {errs.length > 0 && d.net > 0 && <span className="error small">{errs.map((e) => t(e as "unbalanced")).join(" · ")}</span>}
      </div>
    </div>
  );
}

function DraftForm({ d, onChange }: { d: Draft; onChange: (p: Partial<Draft>) => void }) {
  const { t, books, lang } = useStore();
  const base = books.company.currency;
  const currencies = ["AED", "SAR", "QAR", "KWD", "BHD", "OMR", "USD", "EUR", "GBP", "INR"];
  const noVat = ["zero", "export", "exempt", "out_of_scope"].includes(d.treatment);
  const setNet = (net: number) => onChange({ net, vat: noVat || d.treatment === "reverse_charge" ? 0 : Math.round((net * d.vatRate) / 100) });
  const setTotal = (total: number) => {
    if (noVat || d.treatment === "reverse_charge") { onChange({ net: total, vat: 0 }); return; }
    const net = Math.round(total / (1 + d.vatRate / 100));
    onChange({ net, vat: total - net });
  };
  const treatments = (Object.keys(TREATMENTS) as VatTreatment[]).filter((k) => TREATMENTS[k][2].includes(d.kind));
  return (
    <div className="grid-form">
      <label>{t("docType")}
        <select value={d.kind} onChange={(e) => onChange({ kind: e.target.value as Draft["kind"], account: e.target.value === "sales" ? SYS.sales : SYS.generalExpense, treatmentManual: false })}>
          <option value="purchase">{t("purchase")}</option>
          <option value="sales">{t("sale")}</option>
        </select>
      </label>
      <label>{t("date")}<input type="date" value={d.date} onChange={(e) => onChange({ date: e.target.value })} /></label>
      <label>{t("invoiceNo")}<input value={d.number} onChange={(e) => onChange({ number: e.target.value })} /></label>
      <label>{d.kind === "purchase" ? t("supplier") : t("customer")}<input dir="auto" value={d.party} onChange={(e) => onChange({ party: e.target.value })} /></label>
      <label>{t("trn")}<input inputMode="numeric" value={d.partyTrn} onChange={(e) => onChange({ partyTrn: e.target.value.replace(/[^\d٠-٩]/g, "") })} /></label>
      <label className="wide">{t("description")}<input dir="auto" value={d.description} placeholder={lang === "ar" ? "مثال: ورق وحبر طابعة" : "e.g. printer paper and toner"} onChange={(e) => onChange({ description: e.target.value })} /></label>
      <label className="wide">{t("category")}
        <AccountSelect value={d.account} onChange={(account) => onChange({ account })} filter={(a) => d.kind === "sales" ? a.type === "revenue" : a.type === "expense" || a.subtype === "non_current_asset" || a.subtype === "current_asset"} />
        {d.accountReason && <span className="hint">✨ {lang === "ar" ? d.accountReason[1] : d.accountReason[0]}</span>}
      </label>
      <label className="wide">{t("vatTreatment")}
        <select value={d.treatment} onChange={(e) => onChange({ treatment: e.target.value as VatTreatment, treatmentManual: true, ...(["zero", "export", "exempt", "out_of_scope", "reverse_charge"].includes(e.target.value) ? { vat: 0 } : {}) })}>
          {treatments.map((k) => <option key={k} value={k}>{lang === "ar" ? TREATMENTS[k][1] : TREATMENTS[k][0]}</option>)}
        </select>
      </label>
      <label>{t("currency")}
        <select value={d.currency} onChange={(e) => onChange({ currency: e.target.value, fxRate: indicativeRate(e.target.value, base) ?? 1 })}>
          {currencies.map((c) => <option key={c}>{c}</option>)}
        </select>
      </label>
      {d.currency !== base && (
        <label>{t("fxRate")} {base}<input inputMode="decimal" value={d.fxRate} onChange={(e) => onChange({ fxRate: Number(e.target.value) || 0 })} /></label>
      )}
      <label>{t("vatRate")}<input inputMode="decimal" value={d.vatRate} onChange={(e) => { const r = Number(e.target.value) || 0; onChange({ vatRate: r, ...(noVat || d.treatment === "reverse_charge" ? {} : { vat: Math.round((d.net * r) / 100) }) }); }} /></label>
      <label>{t("netAmount")}<AmountInput value={d.net} onChange={setNet} /></label>
      <label>{t("vatAmount")}<AmountInput value={d.vat} onChange={(vat) => onChange({ vat })} /></label>
      <label>{t("grossAmount")}<AmountInput value={d.net + d.vat} onChange={setTotal} /></label>
      <label>{t("paidHow")}
        <select value={d.settlement} onChange={(e) => onChange({ settlement: e.target.value as Settlement })}>
          <option value="credit">{t("onCredit")}</option>
          <option value="bank">{t("paidBank")}</option>
          <option value="cash">{t("paidCash")}</option>
        </select>
      </label>
    </div>
  );
}
