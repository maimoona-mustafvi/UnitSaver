"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { UserData } from "@/types";
import { openStore, type Store } from "@/lib/db";
import { summarize, type Summary } from "@/lib/billing";
import { demoData } from "@/lib/demo";

interface DataState {
  store?: Store;
  data?: UserData;
  warning?: string;
  error?: string;
}

interface DataContext extends DataState {
  loading: boolean;
  summary: Summary | null;
  /** Runs a write against the store, then reloads so every page sees the saved state. */
  run: (fn: (store: Store) => Promise<unknown>) => Promise<void>;
  loadDemo: () => Promise<void>;
  reset: () => Promise<void>;
}

const Ctx = createContext<DataContext | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DataState>({});

  useEffect(() => {
    openStore()
      .then(setState)
      .catch((e) => setState({ error: e instanceof Error ? e.message : String(e) }));
  }, []);

  const run = useCallback(
    async (fn: (store: Store) => Promise<unknown>) => {
      const store = state.store;
      if (!store) throw new Error("Data is still loading");
      await fn(store);
      const data = await store.load();
      setState((s) => ({ ...s, data }));
    },
    [state.store],
  );

  const value = useMemo<DataContext>(
    () => ({
      ...state,
      loading: !state.data && !state.error,
      summary: state.data ? summarize(state.data) : null,
      run,
      loadDemo: () => run((s) => s.replaceAll(demoData())),
      reset: () => run((s) => s.replaceAll(null)),
    }),
    [state, run],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useData must be used inside <DataProvider>");
  return ctx;
}
