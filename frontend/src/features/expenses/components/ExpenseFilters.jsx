import { DEFAULT_CATEGORIES } from "../../../shared/constants/categories";
import Card from "../../../shared/ui/Card";
import FormField from "../../../shared/ui/FormField";

const DATE_FILTER_LABELS = {
  last7: "Last 7 days",
  last30: "Last 30 days",
  thisMonth: "This month",
};

export default function ExpenseFilters({
  searchTerm,
  setSearchTerm,
  dateFilter,
  setDateFilter,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  categoryFilter,
  setCategoryFilter,
}) {
  const trimmedSearchTerm = searchTerm.trim();
  const customDateLabel = [customStartDate, customEndDate].filter(Boolean).join(" – ");
  const dateFilterLabel = dateFilter === "custom"
    ? `Custom range${customDateLabel ? `: ${customDateLabel}` : ""}`
    : DATE_FILTER_LABELS[dateFilter];
  const activeFilters = [
    trimmedSearchTerm ? `Search: “${trimmedSearchTerm}”` : "",
    dateFilter !== "all" ? dateFilterLabel : "",
    categoryFilter ? `Category: ${categoryFilter}` : "",
  ].filter(Boolean);

  function clearFilters() {
    setSearchTerm("");
    setDateFilter("all");
    setCustomStartDate("");
    setCustomEndDate("");
    setCategoryFilter("");
  }

  return (
    <Card className="section card--subtle expense-filters">
      <div className="expense-filters__primary">
        <FormField label="Search expenses" className="expense-filters__search">
          {(id) => (
            <input
              id={id}
              type="search"
              placeholder="Search description or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          )}
        </FormField>
        {activeFilters.length > 0 ? (
          <button type="button" className="button-ghost expense-filters__clear" onClick={clearFilters}>
            Clear filters
          </button>
        ) : null}
      </div>

      {activeFilters.length > 0 ? (
        <p className="expense-filters__summary" aria-live="polite">
          <span className="sr-only">Active filters: </span>
          {activeFilters.join(" · ")}
        </p>
      ) : null}

      <details className="filter-disclosure">
        <summary>Filter by date or category</summary>
        <div className="filters filter-disclosure__content">
          <FormField label="Date range">
            {(id) => (
              <select id={id} value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
                <option value="all">All Time</option>
                <option value="last7">Last 7 Days</option>
                <option value="last30">Last 30 Days</option>
                <option value="thisMonth">This Month</option>
                <option value="custom">Custom Range</option>
              </select>
            )}
          </FormField>

          {dateFilter === "custom" ? (
            <>
              <FormField label="Start date">
                {(id) => (
                  <input
                    id={id}
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                )}
              </FormField>
              <FormField label="End date">
                {(id) => (
                  <input
                    id={id}
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                )}
              </FormField>
            </>
          ) : null}

          <FormField label="Category">
            {(id) => (
              <select id={id} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="">All</option>
                {DEFAULT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
                <option value="Other">Other</option>
              </select>
            )}
          </FormField>
        </div>
      </details>
    </Card>
  );
}
