// Optional AI reading of invoices and bank statements (English & Arabic) with Claude.
// Enabled only when ANTHROPIC_API_KEY is set on the Netlify site. The browser falls back
// to on-device OCR (Tesseract) when this endpoint is disabled or fails.
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { Config } from "@netlify/functions";
import { z } from "zod";

const MODEL = Netlify.env.get("ANTHROPIC_MODEL") || "claude-opus-5-5";
const MAX_BYTES = 4_400_000; // Netlify buffered payload limit is ~4.5 MB of binary

const Invoice = z.object({
  document_type: z.enum(["tax_invoice", "simplified_invoice", "receipt", "credit_note", "other"]),
  supplier_name: z.string().describe("Seller / issuer name as printed (keep Arabic script if Arabic)"),
  supplier_trn: z.string().describe("Seller VAT/TRN number, digits only, or empty"),
  customer_name: z.string(),
  customer_trn: z.string(),
  invoice_number: z.string(),
  invoice_date: z.string().describe("YYYY-MM-DD, or empty if not shown"),
  currency: z.string().describe("ISO 4217 code such as AED, SAR, QAR, KWD, BHD, OMR, USD"),
  subtotal_excl_vat: z.number(),
  vat_amount: z.number(),
  total_incl_vat: z.number(),
  vat_rate_percent: z.number(),
  expense_category: z.string().describe("Short English category, e.g. rent, utilities, fuel, office supplies, inventory, professional fees"),
  notes: z.string().describe("Anything uncertain or illegible; empty if none"),
});

const Statement = z.object({
  bank_name: z.string(),
  account_currency: z.string(),
  transactions: z.array(
    z.object({
      date: z.string().describe("YYYY-MM-DD"),
      description: z.string(),
      money_in: z.number().describe("Credit amount, 0 if none"),
      money_out: z.number().describe("Debit amount, 0 if none"),
      balance: z.number().nullable(),
    }),
  ),
  notes: z.string(),
});

const PROMPTS = {
  invoice: `Extract the accounting data from this invoice or receipt. It may be in English, Arabic, or both, and may use Arabic-Indic digits (convert them to normal numbers). Dates on GCC documents are usually day-first (DD/MM/YYYY). Use the totals printed on the document; if the subtotal or VAT is not printed, derive it so that subtotal + VAT = total. Use 0 for unknown amounts and empty strings for unknown text. Never invent a TRN.`,
  statement: `Extract every transaction from this bank statement. It may be in English, Arabic, or both, and may use Arabic-Indic digits. Dates are usually day-first. Return transactions in the order printed. Skip opening/closing balance rows and page totals. Put credits/deposits in money_in and debits/withdrawals in money_out.`,
};

type Body = { kind: "invoice" | "statement"; mediaType: string; data: string; country?: string };

export default async (req: Request) => {
  const apiKey = Netlify.env.get("ANTHROPIC_API_KEY");
  if (req.method === "GET") return Response.json({ enabled: Boolean(apiKey), model: apiKey ? MODEL : null });
  if (!apiKey) return Response.json({ error: "AI extraction is not configured on this site." }, { status: 503 });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { kind, mediaType, data } = body;
  if (kind !== "invoice" && kind !== "statement") return Response.json({ error: "Unknown kind" }, { status: 400 });
  if (!data || data.length * 0.75 > MAX_BYTES) return Response.json({ error: "File missing or too large (max ~4 MB)" }, { status: 413 });

  const isPdf = mediaType === "application/pdf";
  const imageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
  if (!isPdf && !imageTypes.includes(mediaType as (typeof imageTypes)[number])) {
    return Response.json({ error: `Unsupported file type ${mediaType}` }, { status: 415 });
  }

  const client = new Anthropic({ apiKey, maxRetries: 1, timeout: 55_000 });
  const doc = isPdf
    ? ({ type: "document", source: { type: "base64", media_type: "application/pdf", data } } as const)
    : ({ type: "image", source: { type: "base64", media_type: mediaType as (typeof imageTypes)[number], data } } as const);
  const country = body.country ? ` The business is in ${body.country}.` : "";

  try {
    const params = {
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default" as const,
      output_config: { effort: "low" as const },
      messages: [{ role: "user" as const, content: [doc, { type: "text" as const, text: PROMPTS[kind] + country }] }],
    };
    const res =
      kind === "invoice"
        ? await client.beta.messages.parse({ ...params, output_config: { ...params.output_config, format: betaZodOutputFormat(Invoice) } })
        : await client.beta.messages.parse({ ...params, output_config: { ...params.output_config, format: betaZodOutputFormat(Statement) } });

    if (res.stop_reason === "refusal") return Response.json({ error: "The document could not be processed." }, { status: 422 });
    if (res.stop_reason === "max_tokens") return Response.json({ error: "Document too long to read in one pass; split the PDF." }, { status: 422 });
    if (!res.parsed_output) return Response.json({ error: "Could not read structured data from the document." }, { status: 502 });
    return Response.json({ kind, data: res.parsed_output, model: res.model });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return Response.json({ error: "AI service is busy, try again shortly." }, { status: 429 });
    if (err instanceof Anthropic.AuthenticationError) return Response.json({ error: "AI service key is invalid." }, { status: 500 });
    if (err instanceof Anthropic.BadRequestError) return Response.json({ error: `AI request rejected: ${err.message}` }, { status: 400 });
    if (err instanceof Anthropic.APIError) return Response.json({ error: `AI service error (${err.status ?? "network"})` }, { status: 502 });
    console.error(err);
    return Response.json({ error: "Unexpected error" }, { status: 500 });
  }
};

export const config: Config = { path: "/api/extract", method: ["GET", "POST"] };
