import { useMemo, useState } from "react";
import { usedPercentage } from "../../../utils/budgets";
import { DEFAULT_CATEGORIES } from "../../../shared/constants/categories";
import { displayText, normalizeText } from "../../../utils/text";
import Card from "../../../shared/ui/Card";
import FormField from "../../../shared/ui/FormField";
import StatusMessage from "../../../shared/ui/StatusMessage";

export default function BudgetLimitsPanel({
  limitMonthYear,
  setLimitMonthYear,
  budgetLimits,
  limitsLoading,
  totalsByCategory,
  upsertLimit,
  deleteLimit,
}) {
  const budgetLimitsByCategory = useMemo(() => {
    const obj = {};
    for (const l of budgetLimits ?? []) obj[l.category] = l;
    return obj;
  }, [budgetLimits]);

  const [limitCategory, setLimitCategory] = useState("");
  const [limitCustomCategory, setLimitCustomCategory] = useState("");
  const [limitAmount, setLimitAmount] = useState("");

  const [editingBudgetCategory, setEditingBudgetCategory] = useState(null);
  const [editingBudgetData, setEditingBudgetData] = useState({});

  const roundMoney = (val) => Number(parseFloat(val || 0).toFixed(2));
  const isValidMoney = (val) => /^\d*\.?\d{0,2}$/.test(val);

  async function handleSetBudgetLimit() {
    if (!limitCategory || !limitAmount || !limitMonthYear) {
      alert("Fill all budget limit fields");
      return;
    }

    const finalCategory =
      limitCategory === "other"
        ? normalizeText(limitCustomCategory || "uncategorized")
        : normalizeText(limitCategory);

    const payload = {
      category: finalCategory,
      limitAmount: roundMoney(limitAmount),
      monthYear: new Date(limitMonthYear + "-01T00:00:00").toISOString(),
    };

    await upsertLimit(payload);

    setLimitCategory("");
    setLimitCustomCategory("");
    setLimitAmount("");
  }

  function startEditBudget(category) {
    const limit = budgetLimitsByCategory[category];

    setEditingBudgetCategory(category);
    setEditingBudgetData({
      limitAmount: Number(limit?.limitAmount ?? 0).toFixed(2),
    });
  }

  function cancelEditBudget() {
    setEditingBudgetCategory(null);
    setEditingBudgetData({});
  }

  async function saveBudgetEdit(category) {
    const payload = {
      category,
      limitAmount: roundMoney(editingBudgetData.limitAmount),
      monthYear: new Date(limitMonthYear + "-01T00:00:00").toISOString(),
    };

    await upsertLimit(payload);
    cancelEditBudget();
  }

  async function handleDeleteBudgetLimit(limitId, category) {
    if (!window.confirm(`Delete budget limit for category "${displayText(category)}"?`)) return;
    await deleteLimit(limitId);
  }

  return (
    <Card as="section" className="section">
      <h2 className="h2">Budget Limits for {limitMonthYear}</h2>

      {limitsLoading ? (
        <StatusMessage>Loading budget limits...</StatusMessage>
      ) : Object.keys(budgetLimitsByCategory).length === 0 ? (
        <p className="empty-state">No budget limits set for this month.</p>
      ) : (
        <div className="table-wrapper">
          <table className="data-table" border="1" cellPadding="6">
            <thead>
              <tr>
                <th>Category</th>
                <th>Limit Amount ($)</th>
                <th>Used ($)</th>
                <th>Next Reset</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {Object.entries(budgetLimitsByCategory).map(([cat, limit]) => {
                const used = Number((totalsByCategory[cat] || 0).toFixed(2));
                const limitAmt = Number((limit.limitAmount || 0).toFixed(2));
                const pct = limitAmt ? usedPercentage(used, limitAmt) : 0;

                const nextResetDate = (() => {
                  const [yr, mon] = limitMonthYear.split("-").map(Number);
                  return new Date(yr, mon, 1);
                })();

                return (
                  <tr key={cat} className={used >= limitAmt * 0.9 ? "budget-row--warning" : undefined}>
                    <td>{displayText(cat)}</td>

                    <td>
                      {editingBudgetCategory === cat ? (
                        <input
                          type="text"
                          value={editingBudgetData.limitAmount}
                          onChange={(e) => {
                            const value = e.target.value;

                            if (isValidMoney(value)) {
                              setEditingBudgetData((p) => ({
                                ...p,
                                limitAmount: value,
                              }));
                            }
                          }}
                        />
                      ) : (
                        limitAmt.toFixed(2)
                      )}
                    </td>

                    <td>
                      {used.toFixed(2)}
                      {limitAmt ? (
                        <span className={pct >= 90 ? "budget-usage--warning" : undefined}>
                          ({Math.round(pct)}%)
                        </span>
                      ) : null}
                    </td>

                    <td>{nextResetDate.toLocaleDateString()}</td>

                    <td>
                      {editingBudgetCategory === cat ? (
                        <div className="inline-actions">
                          <button onClick={() => saveBudgetEdit(cat)}>Save</button>
                          <button className="button-ghost" onClick={cancelEditBudget}>
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="inline-actions">
                          <button onClick={() => startEditBudget(cat)}>Edit</button>
                          <button
                            className="button-danger"
                            onClick={() => handleDeleteBudgetLimit(limit.id, cat)}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="section">
        <h2 className="h2">Set Budget Limit</h2>

        <div className="form-grid">
          <FormField label="Category">{(id) => <select id={id} value={limitCategory} onChange={(e) => setLimitCategory(e.target.value)}>
            <option value="">Category</option>
            {DEFAULT_CATEGORIES.map((c) => (
              <option key={c} value={c.toLowerCase()}>
                {displayText(c)}
              </option>
            ))}
            <option value="other">Other</option>
          </select>}</FormField>

          {limitCategory === "other" && (
            <FormField label="Custom category">{(id) => <input id={id}
              type="text"
              placeholder="Custom Category"
              value={limitCustomCategory}
              onChange={(e) => setLimitCustomCategory(e.target.value)}
            />}</FormField>
          )}

          <FormField label="Limit amount">{(id) => <input id={id}
            type="text"
            placeholder="Limit Amount"
            value={limitAmount}
            onChange={(e) => {
              const value = e.target.value;

              if (isValidMoney(value)) {
                setLimitAmount(value);
              }
            }}
          />}</FormField>

          <FormField label="Budget month">{(id) => <input id={id}
            type="month"
            value={limitMonthYear}
            onChange={(e) => setLimitMonthYear(e.target.value)}
          />}</FormField>

          <button onClick={handleSetBudgetLimit}>Save Limit</button>
        </div>
      </div>
    </Card>
  );
}
