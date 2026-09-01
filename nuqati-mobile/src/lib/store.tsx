import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { currentCycleKey } from "@/lib/format";
import type { MerchantCategoryId } from "@/lib/types";

const WALLET_KEY = "nuqati.wallet.v1";
const USAGE_KEY = "nuqati.usage.v1";
const BALANCES_KEY = "nuqati.balances.v1";
const STATEMENTS_KEY = "nuqati.statements.v1";

type UsageLog = Record<string, Record<string, number>>; // cycleKey -> "cardId::category" -> spentBhd

export interface StatementSummaryRecord {
  id: string;
  cardId: string;
  periodStart: string; // ISO date
  periodEnd: string; // ISO date
  totalSpendBhd: number;
  totalEarnedValueFils: number;
  txnCount: number;
  importedAt: string; // ISO date
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

interface AppState {
  cardIds: string[];
  addCard: (id: string) => void;
  removeCard: (id: string) => void;
  hasCard: (id: string) => boolean;
  /** Spend already logged toward this card+category's monthly cap in the current cycle. */
  usageForCard: (cardId: string, category: MerchantCategoryId) => number;
  /** Log a purchase against a card+category, counting toward that cycle's cap. */
  logSwipe: (cardId: string, category: MerchantCategoryId, amountBhd: number) => void;
  cycleKey: string;
  /** True once AsyncStorage has been read — lets screens avoid flashing empty-state UI. */
  hydrated: boolean;
  /** User-entered points/miles balance per loyalty program, for the valuation engine. */
  balanceFor: (programId: string) => number;
  setBalance: (programId: string, balance: number) => void;
  /** Saved statement-import summaries, for the Fee-ROI report. */
  statementSummaries: StatementSummaryRecord[];
  addStatementSummary: (summary: Omit<StatementSummaryRecord, "id" | "importedAt">) => void;
  removeStatementSummary: (id: string) => void;
}

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [cardIds, setCardIds] = useState<string[]>([]);
  const [usage, setUsage] = useState<UsageLog>({});
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [statementSummaries, setStatementSummaries] = useState<StatementSummaryRecord[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const cycleKey = currentCycleKey();

  useEffect(() => {
    (async () => {
      const [w, u, b, s] = await Promise.all([
        readJson<string[]>(WALLET_KEY, []),
        readJson<UsageLog>(USAGE_KEY, {}),
        readJson<Record<string, number>>(BALANCES_KEY, {}),
        readJson<StatementSummaryRecord[]>(STATEMENTS_KEY, []),
      ]);
      setCardIds(w);
      setUsage(u);
      setBalances(b);
      setStatementSummaries(s);
      setHydrated(true);
    })();
  }, []);

  useEffect(() => {
    if (hydrated) AsyncStorage.setItem(WALLET_KEY, JSON.stringify(cardIds));
  }, [cardIds, hydrated]);

  useEffect(() => {
    if (hydrated) AsyncStorage.setItem(USAGE_KEY, JSON.stringify(usage));
  }, [usage, hydrated]);

  useEffect(() => {
    if (hydrated) AsyncStorage.setItem(BALANCES_KEY, JSON.stringify(balances));
  }, [balances, hydrated]);

  useEffect(() => {
    if (hydrated) AsyncStorage.setItem(STATEMENTS_KEY, JSON.stringify(statementSummaries));
  }, [statementSummaries, hydrated]);

  const addCard = useCallback((id: string) => {
    setCardIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const removeCard = useCallback((id: string) => {
    setCardIds((prev) => prev.filter((c) => c !== id));
  }, []);

  const hasCard = useCallback((id: string) => cardIds.includes(id), [cardIds]);

  const usageForCard = useCallback(
    (cardId: string, category: MerchantCategoryId) => usage[cycleKey]?.[`${cardId}::${category}`] ?? 0,
    [usage, cycleKey],
  );

  const logSwipe = useCallback(
    (cardId: string, category: MerchantCategoryId, amountBhd: number) => {
      setUsage((prev) => {
        const cycle = { ...(prev[cycleKey] ?? {}) };
        const key = `${cardId}::${category}`;
        cycle[key] = (cycle[key] ?? 0) + amountBhd;
        return { ...prev, [cycleKey]: cycle };
      });
    },
    [cycleKey],
  );

  const balanceFor = useCallback((programId: string) => balances[programId] ?? 0, [balances]);

  const setBalance = useCallback((programId: string, balance: number) => {
    setBalances((prev) => ({ ...prev, [programId]: Math.max(0, balance) }));
  }, []);

  const addStatementSummary = useCallback((summary: Omit<StatementSummaryRecord, "id" | "importedAt">) => {
    const record: StatementSummaryRecord = {
      ...summary,
      id: `stmt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      importedAt: new Date().toISOString(),
    };
    setStatementSummaries((prev) => [...prev, record]);
  }, []);

  const removeStatementSummary = useCallback((id: string) => {
    setStatementSummaries((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const value = useMemo<AppState>(
    () => ({
      cardIds,
      addCard,
      removeCard,
      hasCard,
      usageForCard,
      logSwipe,
      cycleKey,
      hydrated,
      balanceFor,
      setBalance,
      statementSummaries,
      addStatementSummary,
      removeStatementSummary,
    }),
    [
      cardIds,
      addCard,
      removeCard,
      hasCard,
      usageForCard,
      logSwipe,
      cycleKey,
      hydrated,
      balanceFor,
      setBalance,
      statementSummaries,
      addStatementSummary,
      removeStatementSummary,
    ],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
