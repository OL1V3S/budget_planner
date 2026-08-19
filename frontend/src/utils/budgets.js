// compute spent/percent

export function amountSpentForCategoryMonth(expenses, category, monthYear) {
  return expenses
    .filter(e => e.category === category && e.date.startsWith(`${monthYear}-`))
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
}

export function usedPercentage(amountSpent, limitAmount) {
  const limit = Number(limitAmount || 0);
  if (!limit) return 0;
  return (Number(amountSpent || 0) / limit) * 100;
}
