import { DEFAULT_CATEGORIES } from "../../../shared/constants/categories";
import { formatLocalCalendarDate, localCalendarDateDaysAgo } from "./calendarDate";

export function filterExpenses(expenses, filters) {
  let filtered = [...(expenses ?? [])];
  const now = new Date();
  const today = formatLocalCalendarDate(now);

  const {
    dateFilter,
    customStartDate,
    customEndDate,
    categoryFilter,
    searchTerm,
  } = filters;

  if (dateFilter === "last7") {
    const sevenDayStart = localCalendarDateDaysAgo(6, now);
    filtered = filtered.filter((exp) => exp.date >= sevenDayStart && exp.date <= today);
  } else if (dateFilter === "last30") {
    const thirtyDayStart = localCalendarDateDaysAgo(29, now);
    filtered = filtered.filter((exp) => exp.date >= thirtyDayStart && exp.date <= today);
  } else if (dateFilter === "thisMonth") {
    const currentMonth = today.slice(0, 7);
    filtered = filtered.filter((exp) => exp.date.startsWith(`${currentMonth}-`));
  } else if (dateFilter === "custom" && customStartDate && customEndDate) {
    filtered = filtered.filter(
      (exp) => exp.date >= customStartDate && exp.date <= customEndDate
    );
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
