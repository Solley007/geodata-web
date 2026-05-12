"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  toggle: () => {},
});

const STORAGE_KEY = "geodata-theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Start with "light" to match SSR — the inline script in <head>
  // has already set the correct class on <html> before JS hydrates,
  // so there's no flash. We sync state here after mount.
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    // Read what the inline script already applied to <html>
    const current = document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";
    setTheme(current);
  }, []);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {}
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

/**
 * Inline script injected into <head> — runs synchronously before any render,
 * preventing flash of wrong theme. Reads localStorage then falls back to
 * OS preference.
 */
export const themeScript = `(function(){
  try {
    var saved = localStorage.getItem("${STORAGE_KEY}");
    var preferred = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    var theme = saved || preferred;
    if (theme === "dark") document.documentElement.classList.add("dark");
  } catch(e) {}
})();`;
