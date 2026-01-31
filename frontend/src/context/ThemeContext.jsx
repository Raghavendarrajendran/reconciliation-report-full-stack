import { createContext, useContext, useState, useEffect } from "react";
import { db } from "../lib/db";

const ThemeContext = createContext(null);

const THEMES = ["light", "dark", "system"];

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState("system");

  useEffect(() => {
    (async () => {
      try {
        const stored = await db.getPreference("theme");
        if (stored && THEMES.includes(stored)) setThemeState(stored);
      } catch {}
    })();
  }, []);

  const resolvedTheme = (() => {
    if (theme === "system") {
      return window.matchMedia?.("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return theme;
  })();

  useEffect(() => {
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = (value) => {
    if (!THEMES.includes(value)) return;
    setThemeState(value);
    db.setPreference("theme", value).catch(() => {});
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
