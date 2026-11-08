"use client";

import { createContext, useCallback, useContext } from "react";
import { copyFor, type CopyKey, type CopyTable, type CopyVars } from "@/lib/theme/copy";

const ThemeCopy = createContext<CopyTable>({});

/** Hands the active theme's wording to client components (set once in the root layout). */
export function ThemeProvider({ copy, children }: { copy: CopyTable; children: React.ReactNode }) {
  return <ThemeCopy.Provider value={copy}>{children}</ThemeCopy.Provider>;
}

/** const t = useCopy(); t("placeBid") — the active theme's wording (or the default). */
export function useCopy() {
  const table = useContext(ThemeCopy);
  return useCallback((key: CopyKey, vars?: CopyVars) => copyFor(table, key, vars), [table]);
}
