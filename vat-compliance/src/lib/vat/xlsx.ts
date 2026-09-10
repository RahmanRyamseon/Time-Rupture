import * as XLSX from "xlsx";

// Canonical field -> accepted header aliases, normalized (lowercased,
// non-alphanumeric stripped) before matching, so "Net (excl.)", "net_excl",
// and "Net Excl VAT" all resolve to the same field regardless of spacing,
// punctuation or case.
const FIELD_ALIASES: Record<string, string[]> = {
  invoice: ["invoice", "invoiceno", "invoicenumber", "invno", "invref", "invoicereference", "invoiceref"],
  date: ["date", "invoicedate", "taxpointdate", "transdate", "transactiondate", "billdate"],
  supplier: ["supplier", "suppliername", "vendor", "vendorname", "payee"],
  customer: ["customer", "customername", "client", "clientname", "buyer"],
  trn: ["trn", "taxregistrationnumber", "suppliertrn", "customertrn", "vatnumber", "vatno", "taxid"],
  description: ["description", "goodsservicedescription", "itemdescription", "narrative", "particulars", "goodservicedescription"],
  net: ["net", "netamount", "amountexclvat", "netexcl", "valueexclvat", "taxablevalue", "netvalue", "netexclvat"],
  vat: ["vat", "vatamount", "taxamount", "outputvat", "inputvat", "vatvalue"],
  gross: ["gross", "total", "totalamount", "amountinclvat", "grossincl", "grossvalue", "totalinclvat"],
  country: ["country", "suppliercountry", "customercountry", "origincountry", "destinationcountry"],
  currency: ["currency", "ccy", "curr", "transactioncurrency"],
};

type ColumnMap = Partial<Record<keyof typeof FIELD_ALIASES, number>>;
export type Kind = "ap" | "ar" | "unknown";

function normalizeHeader(h: unknown): string {
  return String(h ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function detectHeaderRow(rows: unknown[][]): number {
  let bestRow = 0;
  let bestScore = -1;
  const scanLimit = Math.min(rows.length, 15);
  for (let r = 0; r < scanLimit; r++) {
    const normalized = (rows[r] ?? []).map(normalizeHeader);
    let score = 0;
    for (const aliases of Object.values(FIELD_ALIASES)) {
      if (normalized.some((h) => aliases.includes(h))) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestRow = r;
    }
  }
  return bestRow;
}

function buildColumnMap(headerRow: unknown[]): ColumnMap {
  const map: ColumnMap = {};
  const normalized = headerRow.map(normalizeHeader);
  for (const field of Object.keys(FIELD_ALIASES) as (keyof typeof FIELD_ALIASES)[]) {
    const idx = normalized.findIndex((h) => FIELD_ALIASES[field].includes(h));
    if (idx !== -1) map[field] = idx;
  }
  return map;
}

export function classifyKind(map: ColumnMap): Kind {
  if (map.supplier !== undefined) return "ap";
  if (map.customer !== undefined) return "ar";
  return "unknown";
}

function excelSerialToIso(serial: number): string {
  // Excel's epoch is 1899-12-30 (accounting for the historical leap-year bug).
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  return new Date(ms).toISOString().slice(0, 10);
}

export function toIsoDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "number") return excelSerialToIso(value);
  const s = String(value ?? "").trim();
  if (!s) return "";
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return s;
}

export function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  const cleaned = String(value ?? "").replace(/[^0-9.-]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export interface ParsedRow {
  invoice: string;
  date: unknown;
  party: string;
  trn: string;
  description: string;
  net: unknown;
  vat: unknown;
  gross: unknown;
  country: string;
  currency: string;
}

export interface ParsedSheet {
  kind: Kind;
  headerRowIndex: number;
  columnMap: ColumnMap;
  matchedFieldCount: number;
  rows: ParsedRow[];
}

const MAX_ROWS = 5000;

export async function parseWorkbook(file: File): Promise<ParsedSheet> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" });

  const headerRowIndex = detectHeaderRow(rows);
  const columnMap = buildColumnMap(rows[headerRowIndex] ?? []);
  const kind = classifyKind(columnMap);
  const partyField = kind === "ar" ? "customer" : "supplier";

  const dataRows = rows
    .slice(headerRowIndex + 1, headerRowIndex + 1 + MAX_ROWS)
    .filter((r) => r.some((c) => c !== "" && c !== undefined && c !== null));

  const get = (r: unknown[], field: keyof typeof FIELD_ALIASES) =>
    columnMap[field] !== undefined ? r[columnMap[field]!] : "";

  const parsedRows: ParsedRow[] = dataRows.map((r) => ({
    invoice: String(get(r, "invoice") ?? ""),
    date: get(r, "date"),
    party: String(get(r, partyField) ?? ""),
    trn: String(get(r, "trn") ?? ""),
    description: String(get(r, "description") ?? ""),
    net: get(r, "net"),
    vat: get(r, "vat"),
    gross: get(r, "gross"),
    country: String(get(r, "country") ?? ""),
    currency: String(get(r, "currency") ?? ""),
  }));

  return { kind, headerRowIndex, columnMap, matchedFieldCount: Object.keys(columnMap).length, rows: parsedRows };
}
