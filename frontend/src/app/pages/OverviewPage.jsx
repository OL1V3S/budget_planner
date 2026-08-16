import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, ChartNoAxesCombined, Landmark, ReceiptText } from "lucide-react";
import { useBudgetLimits } from "../../features/budgetLimits/hooks/useBudgetLimits";
import { computeMonthlyTotalsByCategory } from "../../features/budgetLimits/utils/totalsByCategory";
import { useExpenses } from "../../features/expenses/hooks/useExpenses";
import { getMonthYear } from "../../shared/utils/monthYear";
import { usedPercentage } from "../../utils/budgets";
import Card from "../../shared/ui/Card";
import StatusMessage from "../../shared/ui/StatusMessage";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default function OverviewPage() {
  const currentMonth = getMonthYear(new Date());
  const { expenses, loading: expensesLoading } = useExpenses();
  const { budgetLimits, loading: limitsLoading } = useBudgetLimits(currentMonth);

  const totalsByCategory = useMemo(
    () => computeMonthlyTotalsByCategory(expenses, currentMonth),
    [expenses, currentMonth]
  );

  const recordedSpending = Object.values(totalsByCategory)
    .reduce((sum, amount) => sum + Number(amount || 0), 0);
  const spendingCategoryCount = Object.keys(totalsByCategory).length;
  const totalLimits = (budgetLimits ?? []).length;
  const attentionCount = (budgetLimits ?? []).filter((limit) => (
    usedPercentage(totalsByCategory[limit.category] || 0, limit.limitAmount) >= 90
  )).length;
  const loading = expensesLoading || limitsLoading;
  const isEmpty = spendingCategoryCount === 0 && totalLimits === 0;

  return (
    <div className="shell-page">
      <section className="overview-grid" aria-label="Planning tools">
          <div className="overview-hero">
            <div className="overview-hero__content">
              <p className="page-header__eyebrow">Personal finance workspace</p>
              <h1>Welcome back</h1>
              <p>Your finances now have a clearer home. Use the tools already available today while dedicated experiences continue to take shape.</p>
              <Link className="button-link" to="/transactions">Open transactions <ArrowRight size={18} aria-hidden="true" /></Link>
            </div>
          </div>
          <section className="overview-summary" aria-labelledby="overview-summary-heading">
            <div className="overview-summary__header">
              <div>
                <p className="overview-kicker">Current month</p>
                <h2 id="overview-summary-heading" className="h2">Recorded spending summary</h2>
              </div>
            </div>
            {loading ? (
              <StatusMessage>Loading current-month summary...</StatusMessage>
            ) : (
              <>
                {isEmpty ? (
                  <StatusMessage>No recorded spending or budget limits for this month yet.</StatusMessage>
                ) : null}
                <div className="overview-metrics">
                  <Card className="overview-metric">
                    <p className="overview-metric__label">Recorded spending this month</p>
                    <p className="overview-metric__value">{currencyFormatter.format(recordedSpending)}</p>
                    <p className="overview-metric__context">Includes recorded expenses through today.</p>
                  </Card>
                  <Card className="overview-metric">
                    <p className="overview-metric__label">Categories with recorded spending</p>
                    <p className="overview-metric__value">{spendingCategoryCount}</p>
                    <p className="overview-metric__context">Uses the existing exact category grouping.</p>
                  </Card>
                  <Card className="overview-metric">
                    <p className="overview-metric__label">Budget-limit attention</p>
                    {totalLimits > 0 ? (
                      <>
                        <p className="overview-metric__value">{attentionCount}</p>
                        <p className="overview-metric__context">
                          {attentionCount === 1 ? "limit is" : "limits are"} at or above 90% used · {totalLimits} {totalLimits === 1 ? "limit" : "limits"} set
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="overview-metric__value">0</p>
                        <p className="overview-metric__context">No budget limits are set for this month.</p>
                        <Link to="/budgets">Set budget limits <span aria-hidden="true">→</span></Link>
                      </>
                    )}
                  </Card>
                </div>
              </>
            )}
          </section>
          <Card className="overview-module overview-module--transactions">
            <div className="overview-module__heading">
              <ReceiptText size={24} aria-hidden="true" />
              <span className="overview-module__status">Available now</span>
            </div>
            <div><h2 className="h2">Transactions</h2><p>Record, edit, search, filter, and review expenses in the established workspace.</p></div>
            <Link to="/transactions">Open transactions <span aria-hidden="true">→</span></Link>
          </Card>
          <Card className="overview-module overview-module--budgets">
            <div className="overview-module__heading"><BarChart3 size={22} aria-hidden="true" /><span className="overview-module__status">Available now</span></div>
            <div><h2 className="h2">Budgets</h2><p>Set and review monthly category limits.</p></div>
            <Link to="/budgets">Open budgets <span aria-hidden="true">→</span></Link>
          </Card>
          <Card className="overview-module overview-module--analytics">
            <div className="overview-module__heading"><ChartNoAxesCombined size={22} aria-hidden="true" /><span className="overview-module__status">Available now</span></div>
            <div><h2 className="h2">Analytics</h2><p>Compare recorded spending with category limits by month.</p></div>
            <Link to="/analytics">Open analytics <span aria-hidden="true">→</span></Link>
          </Card>
          <Card className="overview-module overview-module--investing">
            <div className="overview-module__heading"><Landmark size={22} aria-hidden="true" /><span className="overview-module__status">Coming later</span></div>
            <div><h2 className="h2">Investing</h2><p>No portfolio or external service is connected today.</p></div>
            <Link to="/investing">See status <span aria-hidden="true">→</span></Link>
          </Card>
      </section>
    </div>
  );
}
