import { describe, expect, it } from "vitest";
import { initialPaycheckForm, isCalendarDate, parseAmount, validatePaycheckForm, validSemimonthlyPair } from "./paycheckForm";
import { makeCandidate, makePaycheck } from "../test/paycheckFixtures";

function manual(overrides = {}) {
  return { ...initialPaycheckForm("manual"), displayName: "  My payroll  ", firstAnchorDay: "10", fixedAmount: "1234.56", ...overrides };
}

describe("paycheck form contracts", () => {
  it.each(["weekly", "biweekly", "monthly", "semimonthly"])("builds the complete exclusive %s schedule", (cadence) => {
    const interval = cadence === "weekly" || cadence === "biweekly";
    const { payload, errors } = validatePaycheckForm(manual({ cadence, referenceAnchorDate: "2026-03-08",
      firstAnchorDay: "15", secondAnchorKind: "month_end" }), "manual");
    expect(errors).toEqual({});
    expect(payload).toEqual({ displayName: "My payroll", windowBeforeDays: 0, windowAfterDays: 0,
      schedule: { cadence, referenceAnchorDate: interval ? "2026-03-08" : null,
        firstMonthAnchor: interval ? null : { kind: "day_of_month", day: 15 },
        secondMonthAnchor: cadence === "semimonthly" ? { kind: "month_end", day: null } : null },
      amount: { mode: "fixed", fixedAmount: "1234.56", minimumAmount: null, maximumAmount: null } });
  });

  it("keeps candidate schedule and origin exact while edit payloads omit them", () => {
    const candidate = makeCandidate();
    const confirm = validatePaycheckForm(initialPaycheckForm("confirm", candidate), "confirm", candidate).payload;
    expect(confirm.schedule).toBe(candidate.schedule);
    expect(confirm.algorithmVersion).toBe(candidate.algorithmVersion);
    expect(confirm.fingerprint).toBe(candidate.fingerprint);
    expect(confirm).not.toHaveProperty("evidence");
    const profile = makePaycheck();
    const edit = validatePaycheckForm(initialPaycheckForm("edit", profile), "edit", profile).payload;
    expect(Object.keys(edit)).toEqual(["displayName", "windowBeforeDays", "windowAfterDays", "amount"]);
  });

  it("never adopts variable observation bounds and requires explicit acceptance", () => {
    const candidate = makeCandidate({ observedAmount: { mode: "variable", minimumAmount: 1000, maximumAmount: 2000, lowerMedianAmount: 1500 } });
    const form = initialPaycheckForm("confirm", candidate);
    expect(form).toMatchObject({ amountMode: "range", minimumAmount: "", maximumAmount: "", fixedAmount: "" });
    expect(validatePaycheckForm(form, "confirm", candidate).payload).toBeNull();
    expect(validatePaycheckForm({ ...form, amountMode: "fixed", fixedAmount: "1500" }, "confirm", candidate).errors.amountMode).toBeTruthy();
    expect(validatePaycheckForm({ ...form, minimumAmount: "1200", maximumAmount: "1800" }, "confirm", candidate).payload.amount)
      .toEqual({ mode: "range", fixedAmount: null, minimumAmount: "1200", maximumAmount: "1800" });
  });

  it.each(["", " ", "0", "-1", "1.001", "1e2", "1,000", "NaN", "Infinity", "10000000000000000", "9999999999999999.991"])("rejects invalid amount %s without rounding", (value) => {
    expect(parseAmount(value)).toBeNull();
  });

  it("preserves exact cents beyond Number's safe range and validates strict increasing ranges", () => {
    expect(parseAmount("9999999999999999.99")).toEqual({ value: "9999999999999999.99", cents: 999999999999999999n });
    expect(parseAmount(" .50 ")).toEqual({ value: "0.50", cents: 50n });
    const valid = validatePaycheckForm(manual({ amountMode: "range", minimumAmount: "9999999999999999.98", maximumAmount: "9999999999999999.99" }), "manual");
    expect(valid.payload.amount.maximumAmount).toBe("9999999999999999.99");
    for (const maximumAmount of ["100", "99.99"])
      expect(validatePaycheckForm(manual({ amountMode: "range", minimumAmount: "100", maximumAmount }), "manual").errors.maximumAmount).toBeTruthy();
  });

  it.each(["", "4", "-1", "1.5", "1e0", " 1 "])("rejects noncanonical window %s", (value) => {
    const result = validatePaycheckForm(manual({ windowBeforeDays: value, windowAfterDays: value }), "manual");
    expect(result.errors.windowBeforeDays).toBeTruthy();
    expect(result.errors.windowAfterDays).toBeTruthy();
  });

  it.each([[1, 7], [1, 31], [22, 31], [15, 15], [31, 15], [0, 15], [15, 32]])("rejects semimonthly pair %s/%s", (first, second) => {
    expect(validSemimonthlyPair(first, second)).toBe(false);
  });
  it.each([[1, 8], [7, 31], [15, 31], [21, 28]])("accepts semimonthly pair %s/%s", (first, second) => {
    expect(validSemimonthlyPair(first, second)).toBe(true);
  });

  it("validates actual calendar dates without Date/UTC conversions", () => {
    for (const value of ["2024-02-29", "0001-01-01", "2026-03-08", "2026-11-01"]) expect(isCalendarDate(value)).toBe(true);
    for (const value of ["2026-02-29", "0000-01-01", "2026-04-31", "2026-13-01", "2026-1-01", "2026-01-01T00:00:00Z"]) expect(isCalendarDate(value)).toBe(false);
  });

  it("requires explicit entry when a numeric API amount cannot retain reliable cents", () => {
    const profile = makePaycheck({ amount: { mode: "fixed", fixedAmount: 1e16 } });
    const form = initialPaycheckForm("edit", profile);
    expect(form.fixedAmount).toBe("");
    expect(validatePaycheckForm(form, "edit", profile).payload).toBeNull();
    expect(initialPaycheckForm("edit", makePaycheck({ amount: { mode: "fixed", fixedAmount: "9999999999999999.99" } })).fixedAmount).toBe("9999999999999999.99");
  });
});
