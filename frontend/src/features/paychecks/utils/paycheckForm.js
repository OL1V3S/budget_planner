export const CADENCES = ["weekly", "biweekly", "semimonthly", "monthly"];
const MAX_CENTS = 999999999999999999n;

// Keep accepted decimals exact through JSON serialization. ASP.NET Core's web
// JSON defaults accept quoted numbers for the existing decimal DTO properties.
export function parseAmount(value) {
  const text = String(value ?? "").trim();
  if (!/^(?:\d+(?:\.\d{1,2})?|\.\d{1,2})$/.test(text)) return null;
  const [whole = "0", fraction = ""] = text.split(".");
  const canonicalWhole = (whole || "0").replace(/^0+(?=\d)/, "");
  if (canonicalWhole.length > 16) return null;
  const cents = BigInt(canonicalWhole) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (cents <= 0n || cents > MAX_CENTS) return null;
  return { cents, value: `${canonicalWhole}${fraction ? `.${fraction}` : ""}` };
}

export function isCalendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1 || year > 9999 || month < 1 || month > 12) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return day >= 1 && day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

export function validSemimonthlyPair(first, second) {
  return Number.isInteger(first) && Number.isInteger(second)
    && first >= 1 && second <= 31 && first < second
    && Math.min(second, 28) - Math.min(first, 28) >= 7
    && 28 - Math.min(second, 28) + Math.min(first, 28) >= 7;
}

export function isUnsafeNumericAmount(value) {
  // At 2^46 dollars, adjacent binary floats are farther apart than one cent.
  // Distinct valid API decimals can therefore decode to the same JS number.
  return typeof value === "number" && (!Number.isFinite(value) || Math.abs(value) >= 2 ** 46);
}

function initialAmount(value) {
  // JSON numbers outside this boundary cannot reliably retain individual cents.
  if (isUnsafeNumericAmount(value)) return "";
  return value == null ? "" : String(value);
}

export function initialPaycheckForm(mode, model = {}) {
  const amount = mode === "confirm" ? model.observedAmount : model.amount;
  const variable = mode === "confirm" && amount?.mode === "variable";
  return {
    displayName: model.displayName ?? model.normalizedDescriptionIdentity ?? "",
    cadence: "monthly", referenceAnchorDate: "",
    firstAnchorKind: "day_of_month", firstAnchorDay: "",
    secondAnchorKind: "day_of_month", secondAnchorDay: "",
    windowBeforeDays: String(model.windowBeforeDays ?? 0),
    windowAfterDays: String(model.windowAfterDays ?? 0),
    amountMode: variable || amount?.mode === "range" ? "range" : "fixed",
    fixedAmount: variable ? "" : initialAmount(amount?.fixedAmount),
    minimumAmount: mode === "confirm" ? "" : initialAmount(amount?.minimumAmount),
    maximumAmount: mode === "confirm" ? "" : initialAmount(amount?.maximumAmount),
  };
}

function integerInRange(value, minimum, maximum) {
  return /^\d+$/.test(value) && Number(value) >= minimum && Number(value) <= maximum;
}

export function validatePaycheckForm(form, mode, model) {
  const errors = {};
  const name = form.displayName.trim();
  if (!name || name.length > 500) errors.displayName = "Enter a display name of 1 to 500 characters.";
  let schedule;
  if (mode === "manual") {
    if (!CADENCES.includes(form.cadence)) errors.cadence = "Choose a supported cadence.";
    const interval = form.cadence === "weekly" || form.cadence === "biweekly";
    const readAnchor = (prefix) => {
      if (form[`${prefix}AnchorKind`] === "month_end") return { kind: "month_end", day: null };
      if (form[`${prefix}AnchorKind`] !== "day_of_month") {
        errors[`${prefix}AnchorKind`] = "Choose a day of month or month end.";
      } else if (!integerInRange(form[`${prefix}AnchorDay`], 1, 30)) {
        errors[`${prefix}AnchorDay`] = "Enter a whole day from 1 to 30, or choose month end.";
      }
      return { kind: "day_of_month", day: Number(form[`${prefix}AnchorDay`]) };
    };
    if (interval && !isCalendarDate(form.referenceAnchorDate))
      errors.referenceAnchorDate = "Enter a valid reference anchor date.";
    const first = interval ? null : readAnchor("first");
    const second = form.cadence === "semimonthly" ? readAnchor("second") : null;
    if (second && !errors.firstAnchorDay && !errors.secondAnchorDay
      && !errors.firstAnchorKind && !errors.secondAnchorKind
      && !validSemimonthlyPair(first.day ?? 31, second.day ?? 31)) {
      errors.secondAnchorKind = "Choose ordered anchors at least seven days apart, including across February's month boundary.";
    }
    schedule = { cadence: form.cadence, referenceAnchorDate: interval ? form.referenceAnchorDate : null,
      firstMonthAnchor: first, secondMonthAnchor: second };
  }
  for (const field of ["windowBeforeDays", "windowAfterDays"])
    if (!integerInRange(form[field], 0, 3)) errors[field] = "Enter a whole number from 0 to 3.";

  const fixed = form.amountMode === "fixed";
  const variableCandidate = mode === "confirm" && model?.observedAmount?.mode === "variable";
  if (!["fixed", "range"].includes(form.amountMode) || (variableCandidate && fixed))
    errors.amountMode = "Variable evidence requires an explicit amount range.";
  const fields = fixed ? ["fixedAmount"] : ["minimumAmount", "maximumAmount"];
  const amounts = {};
  for (const field of fields) {
    amounts[field] = parseAmount(form[field]);
    if (!amounts[field]) errors[field] = "Enter a positive amount with at most two decimals, up to 9999999999999999.99.";
  }
  if (!fixed && amounts.minimumAmount && amounts.maximumAmount
    && amounts.minimumAmount.cents >= amounts.maximumAmount.cents)
    errors.maximumAmount = "Maximum amount must be greater than minimum amount.";

  if (Object.keys(errors).length) return { errors, payload: null };
  return { errors, payload: {
    displayName: name,
    ...(mode === "manual" ? { schedule } : {}),
    ...(mode === "confirm" ? {
      algorithmVersion: model.algorithmVersion, fingerprint: model.fingerprint, schedule: model.schedule,
    } : {}),
    windowBeforeDays: Number(form.windowBeforeDays), windowAfterDays: Number(form.windowAfterDays),
    amount: { mode: form.amountMode,
      fixedAmount: fixed ? amounts.fixedAmount.value : null,
      minimumAmount: fixed ? null : amounts.minimumAmount.value,
      maximumAmount: fixed ? null : amounts.maximumAmount.value },
  } };
}
