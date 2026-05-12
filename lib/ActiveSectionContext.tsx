"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface ActiveSectionContextValue {
  activeId: string;
  setActiveId: (id: string) => void;
}

const ActiveSectionContext = createContext<ActiveSectionContextValue | null>(null);

/**
 * ActiveSectionProvider
 * ----
 * Single source of truth for which property section is currently in view.
 * Both the sticky sub-nav and the scroll-spy ToC subscribe to this so they
 * never desync. ScrollSpyContent is what writes to it (via section
 * intersection observers); navs read from it.
 */
export function ActiveSectionProvider({ children }: { children: ReactNode }) {
  const [activeId, setActiveIdState] = useState<string>("overview");

  // Stable setter so consumers can include it in deps without re-running
  const setActiveId = useCallback((id: string) => {
    setActiveIdState((prev) => (prev === id ? prev : id));
  }, []);

  return (
    <ActiveSectionContext.Provider value={{ activeId, setActiveId }}>
      {children}
    </ActiveSectionContext.Provider>
  );
}

export function useActiveSection() {
  const ctx = useContext(ActiveSectionContext);
  if (!ctx) {
    throw new Error("useActiveSection must be used within ActiveSectionProvider");
  }
  return ctx;
}
