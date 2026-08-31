"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import { currentCycleKey } from "@/lib/format";
import type { MerchantCategoryId } from "@/lib/types";

const WALLET_KEY = "nuqati.wallet.v1";
const USAGE_KEY = "nuqati.usage.v1";
const BALANCES_KEY = "nuqati.balances.v1";

type UsageLog = Record<string, Record<string, number>>; // cycleKey -> "cardId::category" -> spentBhd

/** Hydration-safe binding to a JSON value in localStorage, backed by useSyncExternalStore. */
function createLocalStorageStore<T>(key: string, fallback: T) {
  let cache: T | undefined;
  const listeners = new Set<() => void>();

  function read(): T {
    if (typeof window === "undefined") return fallback;
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  }

  return {
    subscribe(onChange: () => void) {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    getSnapshot(): T {
      if (cache === undefined) cache = read();
      return cache;
    },
    getServerSnapshot(): T {
      return fallback;
    },
    set(next: T) {
      cache = next;
      if (typeof window !== "undefined") window.localStorage.setItem(key, JSON.stringify(next));
      listeners.forEach((l) => l());
    },
  };
}

const walletStore = createLocalStorageStore<string[]>(WALLET_KEY, []);
const usageStore = createLocalStorageStore<UsageLog>(USAGE_KEY, {});
const balancesStore = createLocalStorageStore<Record<string, number>>(BALANCES_KEY, {});

const emptySubscribe = () => () => {};
/** True once mounted on the client — lets pages avoid flashing empty-state UI during SSR. */
function useHydrated() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
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
  hydrated: boolean;
  /** User-entered points/miles balance per loyalty program, for the valuation engine. */
  balanceFor: (programId: string) => number;
  setBalance: (programId: string, balance: number) => void;
}

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const cardIds = useSyncExternalStore(walletStore.subscribe, walletStore.getSnapshot, walletStore.getServerSnapshot);
  const usage = useSyncExternalStore(usageStore.subscribe, usageStore.getSnapshot, usageStore.getServerSnapshot);
  const balances = useSyncExternalStore(
    balancesStore.subscribe,
    balancesStore.getSnapshot,
    balancesStore.getServerSnapshot,
  );
  const hydrated = useHydrated();
  const cycleKey = currentCycleKey();

  const addCard = useCallback((id: string) => {
    if (!walletStore.getSnapshot().includes(id)) walletStore.set([...walletStore.getSnapshot(), id]);
  }, []);

  const removeCard = useCallback((id: string) => {
    walletStore.set(walletStore.getSnapshot().filter((c) => c !== id));
  }, []);

  const hasCard = useCallback((id: string) => cardIds.includes(id), [cardIds]);

  const usageForCard = useCallback(
    (cardId: string, category: MerchantCategoryId) => usage[cycleKey]?.[`${cardId}::${category}`] ?? 0,
    [usage, cycleKey],
  );

  const logSwipe = useCallback(
    (cardId: string, category: MerchantCategoryId, amountBhd: number) => {
      const prev = usageStore.getSnapshot();
      const cycle = { ...(prev[cycleKey] ?? {}) };
      const key = `${cardId}::${category}`;
      cycle[key] = (cycle[key] ?? 0) + amountBhd;
      usageStore.set({ ...prev, [cycleKey]: cycle });
    },
    [cycleKey],
  );

  const balanceFor = useCallback((programId: string) => balances[programId] ?? 0, [balances]);

  const setBalance = useCallback((programId: string, balance: number) => {
    balancesStore.set({ ...balancesStore.getSnapshot(), [programId]: Math.max(0, balance) });
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
    }),
    [cardIds, addCard, removeCard, hasCard, usageForCard, logSwipe, cycleKey, hydrated, balanceFor, setBalance],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
