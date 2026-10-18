import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";
const KEY = "eventpilot.theme";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() =>
    document.documentElement.classList.contains("dark") ? "dark" : "light",
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggle = useCallback(() => {
    setThemeState((cur) => {
      const next: Theme = cur === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(KEY, next);
      } catch {
        /* storage unavailable: theme just won't persist */
      }
      return next;
    });
  }, []);

  return { theme, toggle };
}
