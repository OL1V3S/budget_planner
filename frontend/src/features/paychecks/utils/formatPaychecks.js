import { isCalendarDate, isUnsafeNumericAmount } from "./paycheckForm";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDate(value) {
  if (!isCalendarDate(String(value ?? ""))) return "Unknown date";
  const [year, month, day] = value.split("-");
  return `${MONTHS[Number(month) - 1]} ${Number(day)}, ${year}`;
}

export function formatMoney(value) {
  if (isUnsafeNumericAmount(value)) return "Amount needs review";
  if (value == null || value === "" || !Number.isFinite(Number(value))) return "Amount unavailable";
  // String decimal values retain their cents, including at numeric(18,2)'s limit.
  const match = String(value).match(/^(-?)(\d+)(?:\.(\d{1,2}))?$/);
  if (match) return `${match[1]}$${match[2].replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${(match[3] ?? "").padEnd(2, "0")}`;
  return "Amount needs review";
}

export function cadenceLabel(cadence) {
  return { weekly: "Weekly", biweekly: "Every two weeks", semimonthly: "Twice a month", monthly: "Monthly" }[cadence] ?? "Unknown cadence";
}

function formatAnchor(anchor) {
  return anchor?.kind === "month_end" ? "month end" : `day ${anchor?.day ?? "?"}`;
}

export function formatSchedule(schedule) {
  if (!schedule) return "Schedule unavailable";
  const cadence = cadenceLabel(schedule.cadence);
  if (["weekly", "biweekly"].includes(schedule.cadence))
    return `${cadence}, reference date ${formatDate(schedule.referenceAnchorDate)}`;
  if (schedule.cadence === "semimonthly")
    return `${cadence}, ${formatAnchor(schedule.firstMonthAnchor)} and ${formatAnchor(schedule.secondMonthAnchor)}`;
  return `${cadence}, ${formatAnchor(schedule.firstMonthAnchor)}`;
}

export function formatAmount(amount) {
  if (!amount) return "Amount unavailable";
  if (amount.mode === "fixed") return formatMoney(amount.fixedAmount);
  return `${formatMoney(amount.minimumAmount)} – ${formatMoney(amount.maximumAmount)}`;
}

export function formatWindow(before, after) {
  return `${before} ${Number(before) === 1 ? "day" : "days"} before · ${after} ${Number(after) === 1 ? "day" : "days"} after`;
}
