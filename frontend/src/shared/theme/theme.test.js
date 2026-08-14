import { beforeEach, describe, expect, it } from "vitest";
import { applyTheme, getStoredTheme, persistTheme, THEME_STORAGE_KEY } from "./theme";

describe("theme preference", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("uses system preference by default without forcing a document theme", () => {
    expect(getStoredTheme()).toBe("system");
    applyTheme("system");
    expect(document.documentElement).not.toHaveAttribute("data-theme");
  });

  it("falls back to system when reading from storage fails", () => {
    const unavailableStorage = { getItem: () => { throw new Error("unavailable"); } };
    expect(getStoredTheme(unavailableStorage)).toBe("system");
  });

  it.each(["light", "dark"])("persists and applies the %s override", (theme) => {
    persistTheme(theme);
    applyTheme(theme);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe(theme);
    expect(getStoredTheme()).toBe(theme);
    expect(document.documentElement).toHaveAttribute("data-theme", theme);
  });

  it("returns to system preference and removes the persisted override", () => {
    persistTheme("dark");
    applyTheme("dark");
    persistTheme("system");
    applyTheme("system");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(document.documentElement).not.toHaveAttribute("data-theme");
  });
});
