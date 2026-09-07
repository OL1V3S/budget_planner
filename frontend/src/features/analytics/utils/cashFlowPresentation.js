const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function minorUnits(value) {
  if (typeof value !== "string" || !/^(0|-?[1-9]\d*)$/.test(value)) {
    throw new Error("Invalid cash-flow amount");
  }
  return BigInt(value);
}

export function formatCash(value, { signed = false } = {}) {
  const amount = minorUnits(value);
  const absolute = amount < 0n ? -amount : amount;
  const dollars = (absolute / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const sign = amount < 0n ? "−" : signed && amount > 0n ? "+" : "";
  return `${sign}$${dollars}.${(absolute % 100n).toString().padStart(2, "0")}`;
}

// Round the exact ratio to one percentage decimal, with halfway values upward.
// Never convert a financial amount or ratio intermediate to Number.
export function cashPercentage(numerator, denominator) {
  const part = minorUnits(numerator);
  const whole = minorUnits(denominator);
  if (whole <= 0n) return null;
  const tenths = (part * 2000n + whole) / (whole * 2n);
  return `${tenths / 10n}.${tenths % 10n}%`;
}

// Approximation is exclusively for decorative chart/bar geometry.
export function barWidth(amount, maximum) {
  const part = minorUnits(amount);
  const whole = minorUnits(maximum);
  return whole > 0n ? `${Number((part * 10000n) / whole) / 100}%` : "0%";
}

export function localThroughDate(now = new Date()) {
  return `${String(now.getFullYear()).padStart(4, "0")}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function cashMonthLabel(month, { short = false } = {}) {
  const name = monthNames[Number(month.slice(5, 7)) - 1];
  return `${short ? name.slice(0, 3) : name} ${month.slice(0, 4)}`;
}

export function cashDateLabel(date) {
  return `${monthNames[Number(date.slice(5, 7)) - 1]} ${Number(date.slice(8, 10))}, ${date.slice(0, 4)}`;
}

export function periodNotes(bucket, throughDate) {
  const notes = [];
  if (bucket.month === throughDate.slice(0, 7)) notes.push(`Through ${cashDateLabel(bucket.to)}`);
  if (bucket.cashInMinor === "0") notes.push("No cash in recorded");
  if (bucket.spentMinor === "0") notes.push("No spending recorded");
  return notes.join(" · ") || "—";
}
