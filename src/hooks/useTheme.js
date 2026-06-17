import { useEffect, useState } from "react";

const STORAGE_KEY = "theme";

/** Read the theme the no-FOUC inline script already applied to <html>. */
function currentTheme() {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

/**
 * Light/dark theme with localStorage persistence. The initial value is set by
 * an inline script in index.html (before paint) to avoid a flash; this hook is
 * the source of truth afterwards. Side effects live in an effect (not in the
 * setState updater) so they stay correct under React's double-invoked updaters.
 */
export function useTheme() {
  const [theme, setTheme] = useState(currentTheme);

  // Apply theme → DOM whenever it changes.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "light" ? "#f4efe6" : "#0e0d0a");
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore private-mode storage errors */
    }
  }, [theme]);

  // Keep in sync with other tabs / windows.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY && (e.newValue === "light" || e.newValue === "dark")) {
        setTheme(e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggle = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  return [theme, toggle];
}
