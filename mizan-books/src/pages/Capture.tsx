import { useEffect, useRef, useState } from "react";
import { useStore } from "../lib/store";
import { AccountSelect, AmountInput, Card, Dropzone } from "../components/ui";
import { previewFile, scanFile } from "../lib/ocr";
import { decodeZatcaQr, parseInvoiceText, type ExtractedInvoice } from "../lib/invoiceParser";
import { aiAvailable, aiReadInvoice } from "../lib/ai";
import { classify, SYS } from "../lib/coa";
import { indicativeRate, COUNTRIES } from "../lib/countries";
import { invoiceToEntry, type Settlement } from "../lib/ledger";
import { todayISO, toMils, uid } from "../lib/money";
import type { Books } from "../lib/types";

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
  settlement: Settlement;
}

interface Item {
  id: string;
  file: File;
  status: "queued" | "scanning" | "ready" | "posted" | "failed";
  progress?: string;
  extracted?: ExtractedInvoice;
  text?: string;
  preview?: string;
  draft?: Draft;
  error?: string;
  engine?: "openocr" | "tesseract";
}

function toDraft(x: ExtractedInvoice, books: Books, vatRate: number, category?: string): Draft {
  const own = books.company.trn.replace(/\D/g, "");
  let kind: Draft["kind"] = x.kind ?? "purchase";
  if (own && x.supplierTrn === own) kind = "sales";
  const currency = x.currency ?? books.company.currency;
  const fxRate = indicativeRate(currency, books.company.currency) ?? 1;
  const party = kind === "sales" ? x.customer ?? "" : x.supplier ?? "";
  const partyTrn = (kind === "sales" ? x.customerTrn : x.supplierTrn) ?? "";
  const guess = classify(`${party} ${category ?? ""}`, books.rules);
  const account = kind === "sales"
    ? (guess && books.accounts.find((a) => a.code === guess)?.type === "revenue" ? guess : SYS.sales)
    : (guess && books.accounts.find((a) => a.code === guess && (a.type === "expense" || a.type === "asset")) ? guess : SYS.generalExpense);
  return {
    kind,
    date: x.date ?? todayISO(),
    number: x.number ?? "",
    party, partyTrn, currency, fxRate,
    net: toMils(x.subtotal ?? x.total ?? 0),
    vat: toMils(x.vat ?? 0),
    vatRate: x.vatRate ?? vatRate,
    account,
    settlement: "credit",
  };
}

export default function Capture() {
  const { t, books, settings, addEntries, update, vatRate, lang } = useStore();
  const [items, setItems] = useState<Item[]>([]);
  const [ai, setAi] = useState(false);
  const busy = useRef(false);

  useEffect(() => { aiAvailable().then(setAi); }, []);
  const useAi = ai && settings.aiEnabled;

  const patch = (id: string, p: Partial<Item>) => setItems((list) => list.map((i) => (i.id === id ? { ...i, ...p } : i)));
  const patchDraft = (id: string, p: Partial<Draft>) =>
    setItems((list) => list.map((i) => (i.id === id && i.draft ? { ...i, draft: { ...i.draft, ...p } } : i)));

  // Process the queue one file at a time (OCR uses a single worker).
  useEffect(() => {
    if (busy.current) return;
    const next = items.find((i) => i.status === "queued");
    if (!next) return;
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
            const r = await aiReadInvoice(next.file, country);
            extracted = r; category = r.category;
          } catch (e) {
            console.warn("AI read failed, falling back to OCR", e);
          }
        }
        if (extracted) {
          preview = await previewFile(next.file);
        } else {
          const scan = await scanFile(next.file, (m, p) => patch(next.id, { progress: `${m}${p != null ? ` ${Math.round(p * 100)}%` : ""}` }));
          text = scan.text; preview = scan.preview; engine = scan.engine;
          if (scan.qr) extracted = decodeZatcaQr(scan.qr);
          if (!extracted) extracted = parseInvoiceText(scan.text, vatRate, books.company.trn.replace(/\D/g, "") || undefined);
          if (extracted.source === "ocr" && scan.method === "pdf-text") extracted.source = "text";
        }
        patch(next.id, { status: "ready", engine, extracted, text, preview, draft: toDraft(extracted, books, vatRate, category), progress: undefined });
      } catch (e) {
        patch(next.id, { status: "failed", error: e instanceof Error ? e.message : String(e) });
      } finally {
        busy.current = false;
        setItems((l) => [...l]); // trigger next
      }
    })();
  }, [items, settings.aiEnabled, books, vatRate]);

  const add = (files: File[]) => setItems((l) => [...l, ...files.map((file) => ({ id: uid(), file, status: "queued" as const }))]);

  const post = (it: Item) => {
    const d = it.draft!;
    const net = Math.round(d.net * d.fxRate);
    const vat = Math.round(d.vat * d.fxRate);
    const entry = invoiceToEntry({
      kind: d.kind, date: d.date, number: d.number, party: d.party, partyTrn: d.partyTrn,
      net, vat, vatRate: d.vatRate, account: d.account, settlement: d.settlement, attachment: it.file.name,
      fx: d.currency !== books.company.currency ? { currency: d.currency, rate: d.fxRate, total: (d.net + d.vat) / 1000 } : undefined,
    }, uid(), new Date().toISOString());
    addEntries([entry]);
    // Learn supplier → account so the next invoice from them is pre-classified.
    const key = d.party.trim().toLowerCase().split(/\s+/).slice(0, 2).join(" ");
    if (key.length > 2 && d.account !== SYS.generalExpense && d.account !== SYS.sales) {
      update((b) => ({ ...b, rules: [...b.rules.filter((r) => !(r.learned && r.keyword === key)), { keyword: key, account: d.account, learned: true }] }));
    }
    patch(it.id, { status: "posted" });
  };

  const isDuplicate = (d: Draft) => {
    const total = Math.round((d.net + d.vat) * d.fxRate);
    return books.entries.some((e) => e.source === "invoice" && e.tax && (
      (d.number && e.ref === d.number && Math.abs(e.tax.net + e.tax.vat - total) < 20) ||
      (e.date === d.date && e.party === d.party && Math.abs(e.tax.net + e.tax.vat - total) < 20)));
  };

  const ready = items.filter((i) => i.status === "ready");

  return (
    <div className="page">
      <Card title={t("capture")} actions={<span className={`pill ${useAi ? "ok" : ""}`}>{useAi ? t("aiOn") : ai ? t("aiAvailOff") : t("aiOff")}</span>}>
        <Dropzone onFiles={add} accept="image/*,application/pdf" label={t("dropFiles")} hint={t("supported")} capture />
      </Card>
      {ready.length > 1 && (
        <div className="toolbar">
          <button onClick={() => ready.forEach(post)}>{t("postAllReady")} ({ready.length})</button>
        </div>
      )}
      {items.map((it) => (
        <Card key={it.id} className={`doc doc-${it.status}`} title={<span>{it.file.name} <span className={`pill st-${it.status}`}>{t(it.status === "scanning" ? "scanning" : it.status)}</span></span>}
          actions={<button className="ghost" onClick={() => setItems((l) => l.filter((x) => x.id !== it.id))}>✕</button>}>
          {it.status === "scanning" && <div className="progress">{t("scanning")} {it.progress}</div>}
          {it.status === "failed" && <div className="error">{it.error}</div>}
          {it.draft && it.status !== "posted" && (
            <div className="doc-body">
              {it.preview && <img className="doc-preview" src={it.preview} alt="" />}
              <div className="doc-form">
                <div className="meta">
                  {t("readBy")}: <b>{it.extracted?.source === "zatca-qr" ? "ZATCA QR" : it.extracted?.source === "ai" ? "AI (Claude)" : it.extracted?.source === "text" ? "PDF text" : it.engine === "openocr" ? "OpenOCR" : "OCR (Tesseract)"}</b> ·{" "}
                  {t("confidence")}: <b className={`conf-${it.extracted?.confidence}`}>{it.extracted?.confidence}</b>
                  {it.extracted?.notes?.map((n) => <div key={n} className="warn">⚠ {["vatAssumed", "totalGuessed", "totalsMismatch"].includes(n) ? t(n as "vatAssumed") : n}</div>)}
                  {isDuplicate(it.draft) && <div className="warn">⚠ {t("duplicateWarn")}</div>}
                </div>
                <DraftForm d={it.draft} onChange={(p) => patchDraft(it.id, p)} />
                <div className="row-actions">
                  <button onClick={() => post(it)}>{t("post")}</button>
                </div>
                {it.text && (
                  <details>
                    <summary>{t("rawText")}</summary>
                    <pre className="raw" dir="auto">{it.text}</pre>
                  </details>
                )}
              </div>
            </div>
          )}
          {it.status === "posted" && <div className="ok-msg">✓ {t("posted")} – {it.draft?.party} · {lang === "ar" ? "يمكن مراجعته في دفتر اليومية" : "see Journal"}</div>}
        </Card>
      ))}
    </div>
  );
}

function DraftForm({ d, onChange }: { d: Draft; onChange: (p: Partial<Draft>) => void }) {
  const { t, books } = useStore();
  const base = books.company.currency;
  const currencies = ["AED", "SAR", "QAR", "KWD", "BHD", "OMR", "USD", "EUR", "GBP", "INR"];
  const setNet = (net: number) => onChange({ net, vat: Math.round((net * d.vatRate) / 100) });
  const setTotal = (total: number) => {
    const net = Math.round(total / (1 + d.vatRate / 100));
    onChange({ net, vat: total - net });
  };
  return (
    <div className="grid-form">
      <label>{t("docType")}
        <select value={d.kind} onChange={(e) => onChange({ kind: e.target.value as Draft["kind"], account: e.target.value === "sales" ? SYS.sales : SYS.generalExpense })}>
          <option value="purchase">{t("purchase")}</option>
          <option value="sales">{t("sale")}</option>
        </select>
      </label>
      <label>{t("date")}<input type="date" value={d.date} onChange={(e) => onChange({ date: e.target.value })} /></label>
      <label>{t("invoiceNo")}<input value={d.number} onChange={(e) => onChange({ number: e.target.value })} /></label>
      <label>{d.kind === "purchase" ? t("supplier") : t("customer")}<input dir="auto" value={d.party} onChange={(e) => onChange({ party: e.target.value })} /></label>
      <label>{t("trn")}<input inputMode="numeric" value={d.partyTrn} onChange={(e) => onChange({ partyTrn: e.target.value.replace(/[^\d٠-٩]/g, "") })} /></label>
      <label>{t("category")}
        <AccountSelect value={d.account} onChange={(account) => onChange({ account })} filter={(a) => d.kind === "sales" ? a.type === "revenue" : a.type === "expense" || a.subtype === "non_current_asset" || a.subtype === "current_asset"} />
      </label>
      <label>{t("currency")}
        <select value={d.currency} onChange={(e) => onChange({ currency: e.target.value, fxRate: indicativeRate(e.target.value, base) ?? 1 })}>
          {currencies.map((c) => <option key={c}>{c}</option>)}
        </select>
      </label>
      {d.currency !== base && (
        <label>{t("fxRate")} {base}<input inputMode="decimal" value={d.fxRate} onChange={(e) => onChange({ fxRate: Number(e.target.value) || 0 })} /></label>
      )}
      <label>{t("vatRate")}<input inputMode="decimal" value={d.vatRate} onChange={(e) => { const r = Number(e.target.value) || 0; onChange({ vatRate: r, vat: Math.round((d.net * r) / 100) }); }} /></label>
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
