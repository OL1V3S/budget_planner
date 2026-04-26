import { useMemo, useState } from "react";
import { usedPercentage } from "../../../utils/budgets";
import { DEFAULT_CATEGORIES } from "../../../shared/constants/categories";
import { displayText, normalizeText } from "../../../utils/text";

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
      limitAmount: Math.round(parseFloat(limitAmount) * 100) / 100,
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
    setEditingBudgetData({ limitAmount: limit?.limitAmount ?? "" });
  }

  function cancelEditBudget() {
    setEditingBudgetCategory(null);
    setEditingBudgetData({});
  }

  async function saveBudgetEdit(category) {
    const payload = {
      category,
      limitAmount: Math.round(parseFloat(editingBudgetData.limitAmount) * 100) / 100,
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
    <div style={{ marginBottom: "2rem", marginTop: "2rem" }}>
      <h2 className="h2">Budget Limits for {limitMonthYear}</h2>

      {limitsLoading ? (
        <p>Loading budget limits...</p>
      ) : Object.keys(budgetLimitsByCategory).length === 0 ? (
        <p>No budget limits set for this month.</p>
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
                const used = Math.round((totalsByCategory[cat] || 0) * 100) / 100;
                const limitAmt = Number(limit.limitAmount || 0);
                const pct = limitAmt ? usedPercentage(used, limitAmt) : 0;

                const nextResetDate = (() => {
                  const [yr, mon] = limitMonthYear.split("-").map(Number);
                  return new Date(yr, mon, 1);
                })();

                return (
                  <tr
                    key={cat}
                    style={{ backgroundColor: used >= limitAmt * 0.9 ? "rgba(255,0,0,.55)" : undefined }}
                  >
                    <td>{displayText(cat)}</td>

                    <td>
                      {editingBudgetCategory === cat ? (
                        <input
                          type="number"
                          value={editingBudgetData.limitAmount}
                          onChange={(e) =>
                            setEditingBudgetData((p) => ({ ...p, limitAmount: e.target.value }))
                          }
                          step="0.01"
                          min="0"
                        />
                      ) : (
                        limitAmt.toFixed(2)
                      )}
                    </td>

                    <td>
                      {used.toFixed(2)}
                      {limitAmt ? (
                        <span style={{ marginLeft: 6, color: pct >= 90 ? "red" : "white" }}>
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

      <div style={{ marginBottom: "2rem", marginTop: "2rem" }}>
        <h2 className="h2">Set Budget Limit</h2>

        <div className="form-row">
          <select value={limitCategory} onChange={(e) => setLimitCategory(e.target.value)}>
            <option value="">Category</option>
            {DEFAULT_CATEGORIES.map((c) => (
              <option key={c} value={c.toLowerCase()}>
                {displayText(c)}
              </option>
            ))}
            <option value="other">Other</option>
          </select>

          {limitCategory === "other" && (
            <input
              type="text"
              placeholder="Custom Category"
              value={limitCustomCategory}
              onChange={(e) => setLimitCustomCategory(e.target.value)}
            />
          )}

          <input
            type="number"
            placeholder="Limit Amount"
            value={limitAmount}
            onChange={(e) => setLimitAmount(e.target.value)}
            min="0"
            step="0.01"
          />

          <input
            type="month"
            value={limitMonthYear}
            onChange={(e) => setLimitMonthYear(e.target.value)}
          />

          <button onClick={handleSetBudgetLimit}>Save Limit</button>
        </div>
      </div>
    </div>
  );
}
