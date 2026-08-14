import { useEffect, useMemo, useState } from "react";
import { applyTheme, getStoredTheme, persistTheme } from "./theme";
import { ThemeContext } from "./ThemeContext";

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getStoredTheme);

  useEffect(() => applyTheme(theme), [theme]);

  const value = useMemo(() => ({
    theme,
    setTheme(nextTheme) {
      persistTheme(nextTheme);
      applyTheme(nextTheme);
      setThemeState(nextTheme);
    },
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
