"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

/**
 * Saved Residences Context
 * ----
 * - Persists to localStorage under `geodata_saved_residences` as a JSON array of slugs
 * - Syncs across browser tabs via the `storage` event
 * - SSR-safe, starts empty server-side, hydrates on mount
 */

const STORAGE_KEY = "geodata_saved_residences";

interface SavedContext {
  saved: string[];               // array of property slugs
  count: number;
  isSaved: (slug: string) => boolean;
  toggle: (slug: string) => void;
  remove: (slug: string) => void;
  clear: () => void;
  /** True after first client-side hydration, use to avoid SSR/CSR mismatch */
  hydrated: boolean;
}

const Ctx = createContext<SavedContext | null>(null);

function readStorage(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

function writeStorage(slugs: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
  } catch {
    /* ignore quota errors */
  }
}

export function SavedResidencesProvider({ children }: { children: React.ReactNode }) {
  const [saved, setSaved] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setSaved(readStorage());
    setHydrated(true);
  }, []);

  // Cross-tab sync, listen for changes from other tabs
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return;
      setSaved(readStorage());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const isSaved = useCallback((slug: string) => saved.includes(slug), [saved]);

  const toggle = useCallback((slug: string) => {
    setSaved((prev) => {
      const next = prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug];
      writeStorage(next);
      return next;
    });
  }, []);

  const remove = useCallback((slug: string) => {
    setSaved((prev) => {
      const next = prev.filter((s) => s !== slug);
      writeStorage(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setSaved([]);
    writeStorage([]);
  }, []);

  return (
    <Ctx.Provider
      value={{ saved, count: saved.length, isSaved, toggle, remove, clear, hydrated }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useSavedResidences(): SavedContext {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useSavedResidences must be used within SavedResidencesProvider");
  }
  return ctx;
}
