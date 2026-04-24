// compute spent/percent

import { monthYearToDate } from "../shared/utils/monthYear";

export function amountSpentForCategoryMonth(expenses, category, monthYear) {
  const start = monthYearToDate(monthYear);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);

  return expenses
    .filter(e => {
      const d = new Date(e.date);
      return e.category === category && d >= start && d < end;
    })
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
}

export function usedPercentage(amountSpent, limitAmount) {
  const limit = Number(limitAmount || 0);
  if (!limit) return 0;
  return (Number(amountSpent || 0) / limit) * 100;
}
