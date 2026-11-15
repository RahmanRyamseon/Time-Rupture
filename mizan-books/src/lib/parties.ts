// Supplier (payables) and customer (receivables) sub-ledgers built from the party
// tagged on AP / AR journal lines, with FIFO ageing of open balances.
import { SYS } from "./coa";
import type { Books, JournalEntry, JournalLine, Mils } from "./types";

export type PartyKind = "supplier" | "customer";

export interface PartyBalance {
  name: string; // "" = postings with no supplier/customer assigned
  kind: PartyKind;
  balance: Mils; // amount owed to the supplier / by the customer
  aging: [Mils, Mils, Mils, Mils]; // 0–30, 31–60, 61–90, 90+ days
  lastDate: string;
  trn?: string;
}

const kindOf = (account: string): PartyKind | null => (account === SYS.ap ? "supplier" : account === SYS.ar ? "customer" : null);

const daysBetween = (a: string, b: string) => Math.floor((Date.parse(b) - Date.parse(a)) / 86_400_000);

export function partyBalances(books: Books, asOf: string): PartyBalance[] {
  const groups = new Map<string, { kind: PartyKind; name: string; items: { date: string; amt: Mils }[]; trn?: string }>();
  const sorted = books.entries.filter((e) => e.date <= asOf).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  for (const e of sorted) {
    for (const l of e.lines) {
      const kind = kindOf(l.account);
      if (!kind) continue;
      const name = l.party ?? "";
      const key = `${kind}|${name.toLowerCase()}`;
      const g = groups.get(key) ?? { kind, name, items: [] };
      // Positive = increases what is owed (supplier invoice / customer sale).
      const amt = kind === "supplier" ? l.credit - l.debit : l.debit - l.credit;
      g.items.push({ date: e.date, amt });
      if (e.tax?.partyTrn && name) g.trn = e.tax.partyTrn;
      groups.set(key, g);
    }
  }
  const out: PartyBalance[] = [];
  for (const g of groups.values()) {
    // FIFO: payments and credit notes settle the oldest open items first.
    const open: { date: string; amt: Mils }[] = [];
    let credit = 0;
    for (const it of g.items) {
      if (it.amt > 0) open.push({ ...it });
      else credit += -it.amt;
    }
    for (const o of open) {
      const used = Math.min(o.amt, credit);
      o.amt -= used;
      credit -= used;
    }
    const aging: [Mils, Mils, Mils, Mils] = [0, 0, 0, 0];
    for (const o of open) {
      if (!o.amt) continue;
      const d = daysBetween(o.date, asOf);
      aging[d <= 30 ? 0 : d <= 60 ? 1 : d <= 90 ? 2 : 3] += o.amt;
    }
    aging[0] -= credit; // unapplied payments / advances show as a negative current balance
    const balance = g.items.reduce((s, it) => s + it.amt, 0);
    out.push({ name: g.name, kind: g.kind, balance, aging, lastDate: g.items[g.items.length - 1]?.date ?? "", trn: g.trn });
  }
  return out.sort((a, b) => a.kind.localeCompare(b.kind) || (a.name ? 0 : 1) - (b.name ? 0 : 1) || b.balance - a.balance);
}

export interface StatementRow { entry: JournalEntry; line: JournalLine; running: Mils }

/** Statement of account for one supplier or customer. */
export function partyStatement(books: Books, name: string, account: string): StatementRow[] {
  const kind = kindOf(account);
  let running = 0;
  const rows: StatementRow[] = [];
  const sorted = [...books.entries].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  for (const entry of sorted) {
    for (const line of entry.lines) {
      if (line.account !== account || (line.party ?? "").toLowerCase() !== name.toLowerCase()) continue;
      running += kind === "supplier" ? line.credit - line.debit : line.debit - line.credit;
      rows.push({ entry, line, running });
    }
  }
  return rows;
}

/** Known supplier / customer names (for pick lists and matching bank narrations). */
export function partyNames(books: Books, kind?: PartyKind): string[] {
  const set = new Map<string, string>();
  for (const e of books.entries) {
    for (const l of e.lines) {
      const k = kindOf(l.account);
      if (!k || !l.party || (kind && k !== kind)) continue;
      set.set(l.party.toLowerCase(), l.party);
    }
  }
  return [...set.values()].sort((a, b) => a.localeCompare(b));
}

/** Finds a known party whose name appears in a bank narration ("TRANSFER FROM GULF HARDWARE CO"). */
export function matchParty(narration: string, names: string[]): string | undefined {
  const norm = (s: string) => s.toLowerCase().replace(/\b(w\.?l\.?l|llc|co|company|est|trading|bsc|spc|ltd|the)\b\.?/g, " ").replace(/[^a-z0-9؀-ۿ]+/g, " ").trim();
  const n = ` ${norm(narration)} `;
  let best: string | undefined;
  for (const name of names) {
    const k = norm(name);
    if (k.length >= 3 && n.includes(` ${k} `) && (!best || k.length > norm(best).length)) best = name;
  }
  return best;
}
