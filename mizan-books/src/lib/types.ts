// All money in the ledger is stored as integer thousandths ("mils") of the
// company's base currency, so 3-decimal GCC currencies (BHD, KWD, OMR) are
// exact and floating-point drift never unbalances a trial balance.
export type Mils = number;

export type CountryCode = "AE" | "SA" | "QA" | "KW" | "BH" | "OM";
export type Lang = "en" | "ar";

export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";

export type AccountSubtype =
  | "cash"
  | "current_asset"
  | "non_current_asset"
  | "contra_asset"
  | "current_liability"
  | "non_current_liability"
  | "equity"
  | "revenue"
  | "other_income"
  | "cogs"
  | "expense"
  | "finance_cost"
  | "tax"
  | "suspense";

/** How a balance-sheet account's movement is shown in the cash flow statement. */
export type CashFlowClass = "cash" | "operating" | "investing" | "financing" | "none";

export interface Account {
  code: string;
  name: string;
  nameAr: string;
  type: AccountType;
  subtype: AccountSubtype;
  cf: CashFlowClass;
  /** Built-in accounts the posting logic relies on; cannot be deleted. */
  system?: boolean;
  archived?: boolean;
}

export type EntrySource = "manual" | "invoice" | "bank" | "import" | "opening";

export interface JournalLine {
  account: string;
  debit: Mils;
  credit: Mils;
  note?: string;
}

export interface TaxInfo {
  kind: "sales" | "purchase";
  net: Mils;
  vat: Mils;
  rate: number; // percent
  partyTrn?: string;
}

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  ref?: string;
  memo: string;
  party?: string;
  source: EntrySource;
  lines: JournalLine[];
  tax?: TaxInfo;
  attachment?: string; // original file name
  /** Original document currency and amount when not the base currency. */
  fx?: { currency: string; rate: number; total: number };
  createdAt: string;
}

export interface CategoryRule {
  /** Lower-cased keyword matched against the bank narration / supplier name. */
  keyword: string;
  account: string;
  learned?: boolean;
}

export interface Company {
  id: string;
  name: string;
  nameAr: string;
  trn: string;
  country: CountryCode;
  currency: string;
  /** Month (1-12) the financial year starts in. */
  fyStartMonth: number;
  vatRegistered: boolean;
  address?: string;
}

export interface Books {
  version: 1;
  company: Company;
  accounts: Account[];
  entries: JournalEntry[];
  rules: CategoryRule[];
}

export interface Settings {
  lang: Lang;
  aiEnabled: boolean;
  activeCompanyId: string | null;
}
