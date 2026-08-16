import { useMemo, useState } from "react";
import { useExpenses } from "../../expenses/hooks/useExpenses";
import { useBudgetLimits } from "../hooks/useBudgetLimits";
import { computeMonthlyTotalsByCategory } from "../utils/totalsByCategory";
import { getMonthYear } from "../../../shared/utils/monthYear";
import BudgetLimitsPanel from "../components/BudgetLimitsPanel";

export default function BudgetsPage() {
  const { expenses } = useExpenses();
  const [limitMonthYear, setLimitMonthYear] = useState(getMonthYear(new Date()));
  const {
    budgetLimits,
    loading: limitsLoading,
    upsertLimit,
    deleteLimit,
  } = useBudgetLimits(limitMonthYear);

  const totalsByCategory = useMemo(
    () => computeMonthlyTotalsByCategory(expenses, limitMonthYear),
    [expenses, limitMonthYear]
  );

  return (
    <div className="container">
      <header className="page-header">
        <div>
          <p className="page-header__eyebrow">Plan your spending</p>
          <h1>Budgets</h1>
          <p className="muted">Set monthly category limits and track how much you have used.</p>
        </div>
      </header>

      <BudgetLimitsPanel
        limitMonthYear={limitMonthYear}
        setLimitMonthYear={setLimitMonthYear}
        budgetLimits={budgetLimits}
        limitsLoading={limitsLoading}
        totalsByCategory={totalsByCategory}
        upsertLimit={upsertLimit}
        deleteLimit={deleteLimit}
      />
    </div>
  );
}
