import type { ExtractedInvoice } from "./invoiceParser";
import type { RawTxn } from "./bankParser";
import { fileToBase64, isPdf } from "./files";
import { imageForUpload } from "./ocr";
import { parseDate } from "./money";

let status: Promise<boolean> | null = null;

/** Whether the deployed site has the optional AI reader configured. */
export function aiAvailable(): Promise<boolean> {
  if (!status) {
    status = fetch("/api/extract", { method: "GET" })
      .then((r) => (r.ok ? r.json() : { enabled: false }))
      .then((j: { enabled?: boolean }) => Boolean(j.enabled))
      .catch(() => false);
  }
  return status;
}

async function payload(file: File) {
  if (isPdf(file)) {
    if (file.size > 4_200_000) throw new Error("fileTooLarge");
    return { mediaType: "application/pdf", data: await fileToBase64(file) };
  }
  return imageForUpload(file);
}

async function call<T>(kind: "invoice" | "statement", file: File, country: string): Promise<T> {
  const body = { kind, country, ...(await payload(file)) };
  const res = await fetch("/api/extract", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
  return j.data as T;
}

interface AiInvoice {
  document_type: string; supplier_name: string; supplier_trn: string; customer_name: string; customer_trn: string;
  invoice_number: string; invoice_date: string; currency: string; subtotal_excl_vat: number; vat_amount: number;
  total_incl_vat: number; vat_rate_percent: number; expense_category: string; notes: string;
}

export async function aiReadInvoice(file: File, country: string): Promise<ExtractedInvoice & { category?: string }> {
  const d = await call<AiInvoice>("invoice", file, country);
  return {
    supplier: d.supplier_name || undefined,
    supplierTrn: d.supplier_trn.replace(/\D/g, "") || undefined,
    customer: d.customer_name || undefined,
    customerTrn: d.customer_trn.replace(/\D/g, "") || undefined,
    number: d.invoice_number || undefined,
    date: parseDate(d.invoice_date) ?? undefined,
    currency: d.currency || undefined,
    subtotal: d.subtotal_excl_vat,
    vat: d.vat_amount,
    total: d.total_incl_vat,
    vatRate: d.vat_rate_percent,
    source: "ai",
    confidence: "high",
    notes: d.notes ? [d.notes] : [],
    category: d.expense_category,
  };
}

interface AiStatement {
  bank_name: string; account_currency: string; notes: string;
  transactions: { date: string; description: string; money_in: number; money_out: number; balance: number | null }[];
}

export async function aiReadStatement(file: File, country: string): Promise<RawTxn[]> {
  const d = await call<AiStatement>("statement", file, country);
  return d.transactions
    .map((t) => ({
      date: parseDate(t.date) ?? "",
      description: t.description,
      amount: (t.money_in || 0) - (t.money_out || 0),
      ...(t.balance != null ? { balance: t.balance } : {}),
    }))
    .filter((t) => t.date && t.amount !== 0);
}
