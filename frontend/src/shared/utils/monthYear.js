// monthYear.js
// Utilities for handling "YYYY-MM" strings consistently.

/**
 * Returns "YYYY-MM" for a Date (local time).
 */
export function getMonthYear(date = new Date()) {
    const d = date instanceof Date ? date : new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  }
  
  /**
   * Converts "YYYY-MM" to a Date at the first day of that month (local time).
   * Example: "2026-02" -> new Date(2026, 1, 1)
   */
  export function monthYearToDate(monthYear) {
    if (!monthYear || typeof monthYear !== "string") return null;
    const [yearStr, monthStr] = monthYear.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
    return new Date(year, month - 1, 1, 0, 0, 0, 0);
  }
  
  /**
   * Converts a Date to an ISO string for the first day of that month in UTC.
   * Useful when your backend expects monthYear as an ISO date string.
   */
  export function monthYearToMonthStartIso(monthYear) {
    const d = monthYearToDate(monthYear);
    if (!d) return null;
    // Create UTC midnight for the first day of the month
    const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0));
    return utc.toISOString();
  }
  