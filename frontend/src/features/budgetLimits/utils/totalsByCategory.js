export function computeMonthlyTotalsByCategory(expenses, limitMonthYear) {
  const [yr, mon] = String(limitMonthYear).split("-").map(Number);

  const monthStart = new Date(yr, mon - 1, 1, 0, 0, 0, 0);
  const monthEndFull = new Date(yr, mon, 0, 23, 59, 59, 999);

  const now = new Date();
  const endOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23, 59, 59, 999
  );

  const isCurrentMonth = yr === now.getFullYear() && mon === now.getMonth() + 1;

  const selectedMonthIsFuture =
    yr > now.getFullYear() || (yr === now.getFullYear() && mon > now.getMonth() + 1);

  if (selectedMonthIsFuture) return {};

  const rangeEnd = isCurrentMonth ? endOfToday : monthEndFull;

  const totals = {};
  for (const exp of expenses ?? []) {
    const d = new Date(exp.date);
    if (d < monthStart || d > rangeEnd) continue;

    const cat = exp.category || "Uncategorized";

    const current = totals[cat] || 0;
    const next = current + Number(exp.amount || 0);

    totals[cat] = Math.round(next * 100) / 100; // 🔥 fix
  }

  return totals;
}