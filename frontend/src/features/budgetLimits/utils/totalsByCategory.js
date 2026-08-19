import { formatLocalCalendarDate } from "../../expenses/utils/calendarDate";

export function computeMonthlyTotalsByCategory(expenses, limitMonthYear) {
  const [yr, mon] = String(limitMonthYear).split("-").map(Number);

  const now = new Date();
  const today = formatLocalCalendarDate(now);

  const isCurrentMonth = yr === now.getFullYear() && mon === now.getMonth() + 1;

  const selectedMonthIsFuture =
    yr > now.getFullYear() || (yr === now.getFullYear() && mon > now.getMonth() + 1);

  if (selectedMonthIsFuture) return {};

  const totals = {};
  for (const exp of expenses ?? []) {
    if (!exp.date.startsWith(`${limitMonthYear}-`)) continue;
    if (isCurrentMonth && exp.date > today) continue;

    const cat = exp.category || "Uncategorized";

    const current = totals[cat] || 0;
    const next = current + Number(exp.amount || 0);

    totals[cat] = Math.round(next * 100) / 100; // 🔥 fix
  }

  return totals;
}
