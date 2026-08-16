import { useMemo, useState } from "react";
import SpendingChart from "../../../charts/components/SpendingChart";
import { useBudgetLimits } from "../../budgetLimits/hooks/useBudgetLimits";
import { computeMonthlyTotalsByCategory } from "../../budgetLimits/utils/totalsByCategory";
import { useExpenses } from "../../expenses/hooks/useExpenses";
import { getMonthYear } from "../../../shared/utils/monthYear";
import Card from "../../../shared/ui/Card";
import FormField from "../../../shared/ui/FormField";
import StatusMessage from "../../../shared/ui/StatusMessage";

export default function AnalyticsPage() {
  const { expenses, loading: expensesLoading } = useExpenses();
  const [chartMonthYear, setChartMonthYear] = useState(getMonthYear(new Date()));
  const { budgetLimits, loading: limitsLoading } = useBudgetLimits(chartMonthYear);

  const totalsByCategory = useMemo(
    () => computeMonthlyTotalsByCategory(expenses, chartMonthYear),
    [expenses, chartMonthYear]
  );

  const budgetLimitsByCategory = useMemo(() => {
    const limitsByCategory = {};
    for (const limit of budgetLimits ?? []) limitsByCategory[limit.category] = limit;
    return limitsByCategory;
  }, [budgetLimits]);

  const loading = expensesLoading || limitsLoading;
  const hasBudgetLimits = (budgetLimits ?? []).length > 0;

  return (
    <div className="container">
      <header className="page-header">
        <div>
          <p className="page-header__eyebrow">Understand your spending</p>
          <h1>Analytics</h1>
          <p className="muted">Compare recorded spending with category limits for a selected month.</p>
        </div>
      </header>

      <Card as="section" className="section chart-frame">
        <div className="section__header">
          <h2 className="h2">Spending vs Budget Limits</h2>
          <FormField label="Chart month">{(id) => <input
            id={id}
            type="month"
            value={chartMonthYear}
            onChange={(event) => setChartMonthYear(event.target.value)}
          />}</FormField>
        </div>

        {loading ? (
          <StatusMessage>Loading spending analytics...</StatusMessage>
        ) : (
          <>
            {!hasBudgetLimits && Object.keys(totalsByCategory).length > 0 ? (
              <StatusMessage>No budget limits are set for this month. The chart shows recorded spending only.</StatusMessage>
            ) : null}
            <SpendingChart
              totalsByCategory={totalsByCategory}
              budgetLimitsByCategory={budgetLimitsByCategory}
            />
          </>
        )}
      </Card>
    </div>
  );
}
