import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

const STORAGE_KEY = "gws_wishlist";

function readStored(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

/**
 * Persists a saved-properties wishlist in localStorage so it survives page
 * reloads and stays in sync across every component that uses this hook.
 */
export function useWishlist() {
  const [saved, setSaved] = useState<Set<string>>(() => readStored());

  // Keep in sync if the wishlist changes in another tab/component instance
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setSaved(readStored());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const persist = useCallback((next: Set<string>) => {
    setSaved(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
    } catch {
      // localStorage unavailable (e.g. private mode) — fail silently
    }
  }, []);

  const isSaved = useCallback((id: string) => saved.has(id), [saved]);

  const toggle = useCallback(
    (id: string, label?: string) => {
      const next = new Set(saved);
      if (next.has(id)) {
        next.delete(id);
        toast(label ? `Removed "${label}" from saved properties` : "Removed from saved properties");
      } else {
        next.add(id);
        toast.success(label ? `Saved "${label}"` : "Added to saved properties!");
      }
      persist(next);
    },
    [saved, persist]
  );

  return { saved, isSaved, toggle, count: saved.size };
}
