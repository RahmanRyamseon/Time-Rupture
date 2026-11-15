import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { del, get, set } from "idb-keyval";
import { defaultAccounts, defaultRules } from "./coa";
import { COUNTRIES } from "./countries";
import { financialYear, type Period } from "./ledger";
import { todayISO, uid } from "./money";
import { t as translate, type TKey } from "./i18n";
import { setOcrEngine } from "./ocr";
import type { AuditEvent, Books, Company, CountryCode, JournalEntry, Lang, Settings } from "./types";

const K_SETTINGS = "mizan:settings";
const K_COMPANIES = "mizan:companies";
const kBooks = (id: string) => `mizan:books:${id}`;

export function newCompany(country: CountryCode = "BH", name = "My Company"): Company {
  return {
    id: uid(), name, nameAr: "", trn: "", country, currency: COUNTRIES[country].currency,
    fyStartMonth: 1, vatRegistered: COUNTRIES[country].vatRate > 0,
  };
}

/** Adds chart-of-accounts entries introduced in later versions to older saved books. */
export function migrateBooks(b: Books): Books {
  const have = new Set(b.accounts.map((a) => a.code));
  const missing = defaultAccounts().filter((a) => a.system && !have.has(a.code));
  if (!missing.length) return b;
  const accounts = [...b.accounts, ...missing].sort((x, y) => x.code.localeCompare(y.code, "en", { numeric: true }));
  return { ...b, accounts };
}

export function emptyBooks(company: Company): Books {
  return { version: 1, company, accounts: defaultAccounts(), entries: [], rules: defaultRules() };
}

interface Ctx {
  ready: boolean;
  lang: Lang;
  t: (k: TKey) => string;
  settings: Settings;
  setSettings: (s: Partial<Settings>) => void;
  companies: Company[];
  books: Books;
  update: (fn: (b: Books) => Books) => void;
  /** Adds entries; ones dated in a locked period are skipped. Returns how many were added. */
  addEntries: (e: JournalEntry[]) => number;
  /** Returns false if the entry is in a locked period. */
  removeEntry: (id: string) => boolean;
  /** Replaces an existing entry (edit). Returns false if either date is locked. */
  replaceEntry: (e: JournalEntry) => boolean;
  isLocked: (date: string) => boolean;
  setLockDate: (date: string | undefined) => void;
  createCompany: (c: Company, b?: Books) => Promise<void>;
  switchCompany: (id: string) => Promise<void>;
  deleteCompany: (id: string) => Promise<void>;
  period: Period;
  setPeriod: (p: Period) => void;
  decimals: number;
  vatRate: number;
}

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettingsState] = useState<Settings>({ lang: "en", aiEnabled: false, activeCompanyId: null });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [books, setBooks] = useState<Books>(() => emptyBooks(newCompany()));
  const [period, setPeriod] = useState<Period>(() => financialYear(1, todayISO()));
  const saveTimer = useRef<number | undefined>(undefined);

  // initial load
  useEffect(() => {
    (async () => {
      const s = (await get<Settings>(K_SETTINGS)) ?? null;
      let list = (await get<Company[]>(K_COMPANIES)) ?? [];
      let b: Books | undefined;
      if (s?.activeCompanyId) b = await get<Books>(kBooks(s.activeCompanyId));
      if (!b && list[0]) b = await get<Books>(kBooks(list[0].id));
      if (!b) {
        const c = newCompany();
        b = emptyBooks(c);
        list = [c];
        await set(K_COMPANIES, list);
        await set(kBooks(c.id), b);
      }
      const lang: Lang = s?.lang ?? (navigator.language.startsWith("ar") ? "ar" : "en");
      setSettingsState({ lang, aiEnabled: s?.aiEnabled ?? false, ocrEngine: s?.ocrEngine ?? "auto", activeCompanyId: b.company.id });
      setCompanies(list);
      setBooks(migrateBooks(b));
      setPeriod(financialYear(b.company.fyStartMonth, todayISO()));
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    document.documentElement.lang = settings.lang;
    document.documentElement.dir = settings.lang === "ar" ? "rtl" : "ltr";
  }, [settings.lang]);

  useEffect(() => {
    if (ready) set(K_SETTINGS, settings);
    setOcrEngine(settings.ocrEngine ?? "auto");
  }, [settings, ready]);

  const persist = useCallback((b: Books) => {
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      set(kBooks(b.company.id), b);
      setCompanies((list) => {
        const next = list.map((c) => (c.id === b.company.id ? b.company : c));
        set(K_COMPANIES, next);
        return next;
      });
    }, 250);
  }, []);

  const update = useCallback((fn: (b: Books) => Books) => {
    setBooks((prev) => {
      const next = fn(prev);
      persist(next);
      return next;
    });
  }, [persist]);

  const value = useMemo<Ctx>(() => {
    const lang = settings.lang;
    const preset = COUNTRIES[books.company.country];
    const isLocked = (date: string) => Boolean(books.lockDate && date <= books.lockDate);
    const ev = (action: AuditEvent["action"], e: JournalEntry): AuditEvent => ({
      at: new Date().toISOString(), action, entryId: e.id, date: e.date, memo: e.memo, source: e.source,
      amount: e.lines.reduce((s, l) => s + l.debit, 0),
    });
    return {
      ready, lang, settings, companies, books, period, setPeriod,
      t: (k: TKey) => translate(lang, k),
      setSettings: (s) => setSettingsState((p) => ({ ...p, ...s })),
      update,
      isLocked,
      addEntries: (es) => {
        const ok = es.filter((e) => !isLocked(e.date));
        if (ok.length) update((b) => ({ ...b, entries: [...b.entries, ...ok], audit: [...(b.audit ?? []), ...ok.map((e) => ev("create", e))] }));
        return ok.length;
      },
      removeEntry: (id) => {
        const e = books.entries.find((x) => x.id === id);
        if (!e || isLocked(e.date)) return false;
        update((b) => ({ ...b, entries: b.entries.filter((x) => x.id !== id), audit: [...(b.audit ?? []), ev("delete", e)] }));
        return true;
      },
      replaceEntry: (e) => {
        const old = books.entries.find((x) => x.id === e.id);
        if (!old || isLocked(old.date) || isLocked(e.date)) return false;
        update((b) => ({ ...b, entries: b.entries.map((x) => (x.id === e.id ? e : x)), audit: [...(b.audit ?? []), ev("edit", e)] }));
        return true;
      },
      setLockDate: (date) => update((b) => ({
        ...b, lockDate: date || undefined,
        audit: [...(b.audit ?? []), { at: new Date().toISOString(), action: date ? "lock" : "unlock", date: date || b.lockDate }],
      })),
      createCompany: async (c, b) => {
        const nb = b ?? emptyBooks(c);
        await set(kBooks(c.id), nb);
        const list = [...companies.filter((x) => x.id !== c.id), nb.company];
        await set(K_COMPANIES, list);
        setCompanies(list);
        setBooks(migrateBooks(nb));
        setPeriod(financialYear(nb.company.fyStartMonth, todayISO()));
        setSettingsState((p) => ({ ...p, activeCompanyId: c.id }));
      },
      switchCompany: async (id) => {
        const b = await get<Books>(kBooks(id));
        if (!b) return;
        setBooks(migrateBooks(b));
        setPeriod(financialYear(b.company.fyStartMonth, todayISO()));
        setSettingsState((p) => ({ ...p, activeCompanyId: id }));
      },
      deleteCompany: async (id) => {
        await del(kBooks(id));
        let list = companies.filter((c) => c.id !== id);
        let b: Books | undefined = list[0] ? await get<Books>(kBooks(list[0].id)) : undefined;
        if (!b) {
          const c = newCompany();
          b = emptyBooks(c);
          list = [c];
          await set(kBooks(c.id), b);
        }
        await set(K_COMPANIES, list);
        setCompanies(list);
        setBooks(migrateBooks(b));
        setSettingsState((p) => ({ ...p, activeCompanyId: b!.company.id }));
      },
      decimals: preset.currency === books.company.currency ? preset.decimals : (["BHD", "KWD", "OMR"].includes(books.company.currency) ? 3 : 2),
      vatRate: books.company.vatRegistered ? preset.vatRate : 0,
    };
  }, [ready, settings, companies, books, period, update]);

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore(): Ctx {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("StoreProvider missing");
  return c;
}

export function accountName(books: Books, code: string, lang: Lang): string {
  const a = books.accounts.find((x) => x.code === code);
  if (!a) return code;
  return lang === "ar" ? a.nameAr || a.name : a.name;
}
