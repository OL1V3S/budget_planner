import { DEFAULT_CATEGORIES } from "../../../shared/constants/categories";
import Card from "../../../shared/ui/Card";
import FormField from "../../../shared/ui/FormField";

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
  return (
    <Card as="section" className="section card--subtle">
      <h2 className="h2">Expense Table</h2>
      <div className="filters">
        <FormField label="Search">
        {(id) => <input id={id}
          placeholder="Search description or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />}
        </FormField>
        <FormField label="Date range">{(id) => <select id={id} value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
            <option value="all">All Time</option>
            <option value="last7">Last 7 Days</option>
            <option value="last30">Last 30 Days</option>
            <option value="thisMonth">This Month</option>
            <option value="custom">Custom Range</option>
          </select>}</FormField>

        {dateFilter === "custom" && (
          <>
            <FormField label="Start date">{(id) => <input id={id}
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
            />}</FormField>
            <FormField label="End date">{(id) => <input id={id}
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
            />}</FormField>
          </>
        )}

        <FormField label="Category">{(id) => <select id={id} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">All</option>
            {DEFAULT_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
            <option value="Other">Other</option>
          </select>}</FormField>
      </div>
    </Card>
  );
}
