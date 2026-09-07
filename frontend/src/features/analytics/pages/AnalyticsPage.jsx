import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useBudgetLimits } from "../../budgetLimits/hooks/useBudgetLimits";
import { useExpenses } from "../../expenses/hooks/useExpenses";
import { formatExpenseDate } from "../../expenses/utils/calendarDate";
import { useCashFlow } from "../hooks/useCashFlow";
import CashFlowSummary from "../components/CashFlowSummary";
import CashFlowTrendChart from "../components/CashFlowTrendChart";
import { barWidth, cashMonthLabel, cashPercentage, formatCash, localThroughDate, minorUnits } from "../utils/cashFlowPresentation";
import { displayText } from "../../../utils/text";
import Card from "../../../shared/ui/Card";
import FormField from "../../../shared/ui/FormField";
import StatusMessage from "../../../shared/ui/StatusMessage";
import {
  buildBudgetStatuses,
  buildMonthlySpendingInsights,
  formatMonthLabel,
} from "../utils/monthlySpendingInsights";

const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function formatPercentage(value, { signed = false } = {}) {
  if (value === null) return "Not applicable";
  const sign = signed && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export default function AnalyticsPage() {
  const [selectedMonth, setSelectedMonth] = useState(() => localThroughDate().slice(0, 7));
  const cashFlow = useCashFlow(selectedMonth);
  const {
    expenses, loading: expensesLoading, error: expensesError, refresh: refreshExpenses,
  } = useExpenses();
  const {
    budgetLimits, loading: limitsLoading, error: limitsError, refresh: refreshLimits,
  } = useBudgetLimits(selectedMonth);

  const availableMonths = [...new Set([localThroughDate().slice(0, 7), selectedMonth, ...cashFlow.availableMonths])].sort().reverse();
  const categories = useMemo(() => [...(cashFlow.data?.categories ?? [])].sort((left, right) => {
    const difference = minorUnits(right.amountMinor) - minorUnits(left.amountMinor);
    return difference > 0n ? 1 : difference < 0n ? -1 : left.category.localeCompare(right.category, "en");
  }), [cashFlow.data]);
  const insights = useMemo(
    () => buildMonthlySpendingInsights(expenses, selectedMonth),
    [expenses, selectedMonth]
  );
  const budgetStatuses = useMemo(
    () => buildBudgetStatuses(budgetLimits, insights.totalsByCategory),
    [budgetLimits, insights.totalsByCategory]
  );

  async function retryExpenses() {
    try {
      await refreshExpenses();
    } catch {
      // The hook owns the user-facing error state.
    }
  }

  return (
    <div className="container analytics-page">
      <header className="page-header analytics-page__header">
        <div>
          <p className="page-header__eyebrow">Understand your cash flow</p>
          <h1>Analytics</h1>
          <p className="muted">See recorded cash in and spending, month by month.</p>
        </div>
        <FormField label="Month">
          {(id) => (
            <select id={id} value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>
              {availableMonths.map((month) => (
                <option key={month} value={month}>{cashMonthLabel(month)}</option>
              ))}
            </select>
          )}
        </FormField>
      </header>

      {expensesLoading ? <StatusMessage>Loading spending insights...</StatusMessage> : null}
      {!expensesLoading && expensesError ? (
        <Card as="section" className="section">
          <StatusMessage tone="danger">We couldn’t load recorded expenses.</StatusMessage>
          <button type="button" onClick={retryExpenses}>Try again</button>
        </Card>
      ) : null}

      <section className="cash-flow-region" aria-label="Recorded cash flow" aria-busy={cashFlow.loading}>
        {cashFlow.loading ? <StatusMessage>Loading recorded cash flow...</StatusMessage> : null}
        {!cashFlow.loading && cashFlow.error ? (
          <div className="card analytics-panel">
            <StatusMessage tone="danger">{cashFlow.error}</StatusMessage>
            <button type="button" onClick={cashFlow.refresh}>Retry cash flow</button>
          </div>
        ) : null}
        {!cashFlow.loading && cashFlow.data ? (
          <>
            <CashFlowSummary data={cashFlow.data} />
            <section className="card analytics-panel cash-flow-categories" aria-labelledby="category-breakdown-heading">
              <div className="analytics-panel__header">
                <div>
                  <p className="analytics-kicker">Ranked by amount</p>
                  <h2 id="category-breakdown-heading" className="h2">Where it went</h2>
                </div>
              </div>
              {categories.length === 0 ? (
                <StatusMessage>No spending recorded</StatusMessage>
              ) : (
                <ol className="analytics-list analytics-category-list">
                  {categories.map((category) => (
                    <li key={category.category} className="analytics-list__item">
                      <div className="analytics-row">
                        <strong>{displayText(category.category)}</strong>
                        <span>{formatCash(category.amountMinor)} · {cashPercentage(category.amountMinor, cashFlow.data.selected.spentMinor) ?? "Not applicable"}</span>
                      </div>
                      <div className="analytics-bar" aria-hidden="true">
                        <span style={{ width: barWidth(category.amountMinor, cashFlow.data.selected.spentMinor) }} />
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
            <CashFlowTrendChart data={cashFlow.data} />
            <button type="button" className="cash-flow-refresh" onClick={cashFlow.refresh}>Refresh cash flow</button>
          </>
        ) : null}
      </section>

      {!expensesLoading && !expensesError ? (
        <>
          <div className="analytics-grid">
            <Card as="section" className="analytics-panel" aria-labelledby="budget-status-heading">
              <div className="analytics-panel__header">
                <div>
                  <p className="analytics-kicker">Configured limits</p>
                  <h2 id="budget-status-heading" className="h2">Budget status by category</h2>
                </div>
                <Link to="/budgets">Manage budgets</Link>
              </div>
              {limitsLoading ? <StatusMessage>Loading budget limits...</StatusMessage> : null}
              {!limitsLoading && limitsError ? (
                <>
                  <StatusMessage tone="danger">Budget limits are unavailable. Other insights are still shown.</StatusMessage>
                  <button type="button" onClick={refreshLimits}>Try again</button>
                </>
              ) : null}
              {!limitsLoading && !limitsError && budgetStatuses.length === 0 ? (
                <StatusMessage>No budget limits are set for this month.</StatusMessage>
              ) : null}
              {!limitsLoading && !limitsError && budgetStatuses.length > 0 ? (
                <ul className="analytics-list">
                  {budgetStatuses.map((budget) => (
                    <li key={budget.id ?? budget.category} className="analytics-list__item analytics-budget-row">
                      <div className="analytics-row">
                        <strong>{displayText(budget.category)}</strong>
                        <span className={`analytics-status analytics-status--${budget.status.replace(" ", "-")}`}>{displayText(budget.status)}</span>
                      </div>
                      <p>{currencyFormatter.format(budget.spent)} spent of {currencyFormatter.format(budget.limitAmount)}</p>
                      <p>{budget.over !== null
                        ? `${currencyFormatter.format(budget.over)} over`
                        : `${currencyFormatter.format(budget.remaining)} remaining`}</p>
                      <p>{budget.percentage === null
                        ? "Percentage used: Not applicable for a $0 limit"
                        : `${formatPercentage(budget.percentage)} used`}</p>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Card>

            <Card as="section" className="analytics-panel" aria-labelledby="comparison-heading">
              <p className="analytics-kicker">Compared with {formatMonthLabel(insights.previousMonth)}</p>
              <h2 id="comparison-heading" className="h2">Month-over-month change</h2>
              <p className="analytics-comparison__value">
                {insights.comparison.difference > 0 ? "+" : ""}{currencyFormatter.format(insights.comparison.difference)}
              </p>
              {insights.comparison.previousTotal === 0 && insights.total === 0 ? (
                <p className="muted">Neither month has recorded spending.</p>
              ) : insights.comparison.percentage === null ? (
                <p className="muted">Percentage comparison is unavailable because the previous month had $0.00 recorded spending.</p>
              ) : (
                <p className="muted">{formatPercentage(insights.comparison.percentage, { signed: true })} from {currencyFormatter.format(insights.comparison.previousTotal)}</p>
              )}
              {insights.increases.length === 0 && insights.decreases.length === 0 ? (
                <StatusMessage>No category changes to show between these months.</StatusMessage>
              ) : (
                <div className="analytics-change-grid">
                  <div>
                    <h3>Largest increases</h3>
                    {insights.increases.length === 0 ? <p className="muted">No increases.</p> : (
                      <ul>{insights.increases.map((change) => <li key={change.category}>{displayText(change.category)} <strong>+{currencyFormatter.format(change.difference)}</strong></li>)}</ul>
                    )}
                  </div>
                  <div>
                    <h3>Largest decreases</h3>
                    {insights.decreases.length === 0 ? <p className="muted">No decreases.</p> : (
                      <ul>{insights.decreases.map((change) => <li key={change.category}>{displayText(change.category)} <strong>{currencyFormatter.format(change.difference)}</strong></li>)}</ul>
                    )}
                  </div>
                </div>
              )}
            </Card>

            <Card as="section" className="analytics-panel" aria-labelledby="largest-expenses-heading">
              <div className="analytics-panel__header">
                <div>
                  <p className="analytics-kicker">Top five</p>
                  <h2 id="largest-expenses-heading" className="h2">Largest expenses</h2>
                </div>
                <Link to="/transactions">Review transactions</Link>
              </div>
              {insights.largestExpenses.length === 0 ? (
                <StatusMessage>No expenses to rank for this month.</StatusMessage>
              ) : (
                <ol className="analytics-list">
                  {insights.largestExpenses.map((expense) => (
                    <li key={expense.id} className="analytics-list__item analytics-row">
                      <span><strong>{expense.description}</strong><small>{displayText(expense.category)} · {formatExpenseDate(expense.date)}</small></span>
                      <strong>{currencyFormatter.format(expense.amount)}</strong>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
