import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ThemeControl from "./ThemeControl";
import { ThemeProvider } from "./ThemeProvider";
import { THEME_STORAGE_KEY } from "./theme";

describe("ThemeControl", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  afterEach(() => vi.restoreAllMocks());

  it("lets the user persist an explicit theme and return to system preference", async () => {
    const user = userEvent.setup();
    render(<ThemeProvider><ThemeControl /></ThemeProvider>);
    const control = screen.getByRole("combobox", { name: "Theme" });

    expect(control).toHaveValue("system");
    await user.selectOptions(control, "dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");

    await user.selectOptions(control, "system");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(document.documentElement).not.toHaveAttribute("data-theme");
  });

  it("applies a selected theme when persistence fails", async () => {
    const user = userEvent.setup();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("unavailable");
    });
    render(<ThemeProvider><ThemeControl /></ThemeProvider>);

    await user.selectOptions(screen.getByRole("combobox", { name: "Theme" }), "dark");

    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  });

  it("gives multiple controls unique ids and synchronizes them through one provider", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeControl label="Header theme" />
        <ThemeControl label="Theme preference" />
      </ThemeProvider>
    );

    const headerControl = screen.getByRole("combobox", { name: "Header theme" });
    const settingsControl = screen.getByRole("combobox", { name: "Theme preference" });
    expect(headerControl.id).not.toBe(settingsControl.id);

    await user.selectOptions(settingsControl, "dark");
    expect(headerControl).toHaveValue("dark");
    expect(settingsControl).toHaveValue("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });
});
