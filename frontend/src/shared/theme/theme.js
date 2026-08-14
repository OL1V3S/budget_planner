export const THEME_STORAGE_KEY = "budget-planner-theme";
export const THEME_OPTIONS = ["system", "light", "dark"];

export function getStoredTheme(storage = localStorage) {
  try {
    const value = storage.getItem(THEME_STORAGE_KEY);
    return THEME_OPTIONS.includes(value) ? value : "system";
  } catch {
    return "system";
  }
}

export function applyTheme(theme, root = document.documentElement) {
  if (theme === "light" || theme === "dark") root.dataset.theme = theme;
  else root.removeAttribute("data-theme");
}

export function persistTheme(theme, storage = localStorage) {
  try {
    if (theme === "system") storage.removeItem(THEME_STORAGE_KEY);
    else storage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Persistence is best-effort; the selected theme still applies in memory.
  }
}
