import { DEFAULT_CATEGORIES } from "../../../shared/constants/categories";

export function filterExpenses(expenses, filters) {
  let filtered = [...(expenses ?? [])];
  const now = new Date();

  const {
    dateFilter,
    customStartDate,
    customEndDate,
    categoryFilter,
    searchTerm,
  } = filters;

  if (dateFilter === "last7") {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    filtered = filtered.filter((exp) => new Date(exp.date) >= sevenDaysAgo);
  } else if (dateFilter === "last30") {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
    filtered = filtered.filter((exp) => new Date(exp.date) >= thirtyDaysAgo);
  } else if (dateFilter === "thisMonth") {
    filtered = filtered.filter((exp) => {
      const d = new Date(exp.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  } else if (dateFilter === "custom" && customStartDate && customEndDate) {
    const start = new Date(customStartDate);
    const end = new Date(customEndDate);
    filtered = filtered.filter((exp) => {
      const d = new Date(exp.date);
      return d >= start && d <= end;
    });
  }

  if (categoryFilter) {
    if (categoryFilter === "Other") {
      filtered = filtered.filter((exp) => !DEFAULT_CATEGORIES.includes(exp.category));
    } else {
      filtered = filtered.filter(
        (exp) =>
          exp.category &&
          exp.category.toString().toLowerCase() === categoryFilter.toLowerCase()
      );
    }
  }

  if (searchTerm?.trim()) {
    const s = searchTerm.toLowerCase();
    filtered = filtered.filter(
      (exp) =>
        (exp.description && exp.description.toLowerCase().includes(s)) ||
        (exp.category && exp.category.toString().toLowerCase().includes(s))
    );
  }

  return filtered;
}
