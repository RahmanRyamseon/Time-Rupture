export type LineStatus = "Verified" | "Warning" | "Exception";

export interface VatLine {
  id: string;
  inv: string;
  date: string; // ISO yyyy-mm-dd
  party: string; // supplier (AP) or customer (AR)
  trn: string;
  desc: string;
  net: number;
  vat: number;
  gross: number;
  country: string;
  lineCurrency: string;
  nature: string;
  status: LineStatus;
  findings: string[];
}

export type Category = "Movable (5 yr)" | "Real estate (10 yr)";

export interface CapitalAsset {
  id: string;
  asset: string;
  category: Category;
  inputVat: number;
  basePct: number;
  curPct: number;
  firstUseYear: number;
}

export interface ReturnBoxEntry {
  box: string;
  label: string;
  amount: number;
  vat: number;
  filedVat: number | null;
}
