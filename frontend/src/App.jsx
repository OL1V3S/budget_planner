// src/App.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import SpendingChart from "./SpendingChart.jsx";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const apiBase = import.meta.env.VITE_API_BASE_URL;

function App() {
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);

  // Pagination state
  const [showAll, setShowAll] = useState(false);
  const entriesPerPage = 10;

  // add / edit expense fields
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  // recurrence for expense: "", "Weekly", "Biweekly", "Monthly"
  const [newRecurrence, setNewRecurrence] = useState("");

  // editing expense
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [editingExpenseData, setEditingExpenseData] = useState({});

  const [dateFilter, setDateFilter] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [recurringFilter, setRecurringFilter] = useState("");

  // search bar
  const [searchTerm, setSearchTerm] = useState("");

  // Budget limits state stores full objects now (keyed by category)
  const [budgetLimits, setBudgetLimits] = useState({});

  // Budget limit inputs including recurrence days
  const [limitCategory, setLimitCategory] = useState("");
  const [limitAmount, setLimitAmount] = useState("");
  const [limitMonthYear, setLimitMonthYear] = useState(
    new Date().toISOString().slice(0, 7)
  ); // YYYY-MM
  // recurrence in days for limits: "" | "7" | "14" | "30"
  const [limitRecurrence, setLimitRecurrence] = useState("");

  // editing budget limit
  const [editingBudgetCategory, setEditingBudgetCategory] = useState(null);
  const [editingBudgetData, setEditingBudgetData] = useState({});

  // Fetch expenses on mount
  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        const res = await axios.get(`${apiBase}/api/expenses`);
        setExpenses(res.data || []);
      } catch (err) {
        console.error("Error fetching expenses:", err);
      }
    };
    fetchExpenses();
  }, []);

  // Fetch budget limits when month changes
  useEffect(() => {
    const fetchBudgetLimits = async () => {
      try {
        const res = await axios.get(
          `${apiBase}/api/budgetlimits?monthYear=${limitMonthYear}`
        );
        const limitsObj = {};
        (res.data || []).forEach((limit) => {
          // store full object keyed by category
          limitsObj[limit.category] = limit;
        });
        setBudgetLimits(limitsObj);
      } catch (err) {
        console.error("Error fetching budget limits:", err);
      }
    };
    fetchBudgetLimits();
  }, [limitMonthYear]);

  // Filtering expenses (includes search)
  useEffect(() => {
    let filtered = [...expenses];
    const now = new Date();

    // date filters
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
      filtered = filtered.filter((exp) => {
        const expDate = new Date(exp.date);
        return expDate >= new Date(customStartDate) && expDate <= new Date(customEndDate);
      });
    }

    // category filter (keeps your "Other" behavior)
    if (categoryFilter) {
      const defaultCategories = ["Food", "Transport", "Bills", "Entertainment"];
      if (categoryFilter === "Other") {
        filtered = filtered.filter((exp) => !defaultCategories.includes(exp.category));
      } else {
        filtered = filtered.filter(
          (exp) =>
            exp.category &&
            exp.category.toString().toLowerCase() === categoryFilter.toLowerCase()
        );
      }
    }

    // recurring boolean filter (existing)
    if (recurringFilter === "true") {
      filtered = filtered.filter((exp) => exp.recurring === true);
    } else if (recurringFilter === "false") {
      filtered = filtered.filter((exp) => exp.recurring === false);
    }

    // search term filter (description or category)
    if (searchTerm && searchTerm.trim() !== "") {
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (exp) =>
          (exp.description && exp.description.toLowerCase().includes(s)) ||
          (exp.category && exp.category.toString().toLowerCase().includes(s))
      );
    }

    setFilteredExpenses(filtered);
    setShowAll(false); // Reset pagination when filters change
  }, [
    expenses,
    dateFilter,
    customStartDate,
    customEndDate,
    categoryFilter,
    recurringFilter,
    searchTerm,
  ]);

  // Add a new expense (includes recurrence field)
  const handleAdd = async () => {
    if (!newName || !newAmount || !newDate) {
      alert("Please fill out all fields.");
      return;
    }

    const categoryToUse =
      newCategory === "Other" ? customCategory.trim() || "Uncategorized" : newCategory;

    const payload = {
      description: newName,
      amount: parseFloat(newAmount),
      date: newDate,
      category: categoryToUse,
      recurring: newRecurrence ? true : false,
      recurrence: newRecurrence || null, // string like "Weekly" or null
    };

    try {
      const res = await axios.post(`${apiBase}/api/expenses`, payload);
      setExpenses([...expenses, res.data || payload]); // fallback if backend echoes different shape
      // clear inputs
      setNewName("");
      setNewAmount("");
      setNewDate("");
      setNewCategory("");
      setCustomCategory("");
      setNewRecurrence("");
    } catch (err) {
      console.error("Error adding expense:", err);
    }
  };

  // Delete expense
  const handleDelete = async (id) => {
    try {
      await axios.delete(`${apiBase}/api/expenses/${id}`);
      setExpenses(expenses.filter((exp) => exp.id !== id));
    } catch (err) {
      console.error("Error deleting expense:", err);
    }
  };

  // Start editing an expense
  const startEditExpense = (expense) => {
    setEditingExpenseId(expense.id);
    setEditingExpenseData({
      description: expense.description || "",
      amount: expense.amount || 0,
      date: expense.date ? new Date(expense.date).toISOString().slice(0, 10) : "",
      category: expense.category || "",
      recurrence: expense.recurrence || "", // may be string
    });
  };

  const cancelEditExpense = () => {
    setEditingExpenseId(null);
    setEditingExpenseData({});
  };

  const saveExpenseEdit = async (id) => {
    try {
      const body = {
        id,
        description: editingExpenseData.description,
        amount: parseFloat(editingExpenseData.amount),
        date: editingExpenseData.date,
        category: editingExpenseData.category,
        // send recurrence as string if present
        recurrence: editingExpenseData.recurrence || null,
        recurring: editingExpenseData.recurrence ? true : false,
      };
      await axios.put(`${apiBase}/api/expenses/${id}`, body);
      // update local state
      setExpenses(
        expenses.map((e) => (e.id === id ? { ...e, ...body } : e))
      );
      setEditingExpenseId(null);
      setEditingExpenseData({});
    } catch (err) {
      console.error("Error saving expense edit:", err);
      alert("Save failed. Check backend supports PUT /api/expenses/:id");
    }
  };

  // Create or update budget limit (UI uses same function for create/update)
  const handleSetBudgetLimit = async () => {
    if (!limitCategory || !limitAmount || !limitMonthYear) {
      alert("Fill all budget limit fields");
      return;
    }

    try {
      const monthYearDate = new Date(limitMonthYear + "-01").toISOString();

      const payload = {
        category: limitCategory,
        limitAmount: parseFloat(limitAmount),
        monthYear: monthYearDate,
        // recurrenceDays numeric or null
        recurrenceDays: limitRecurrence ? parseInt(limitRecurrence) : null,
      };

      await axios.post(`${apiBase}/api/budgetlimits`, payload);

      // Refresh limits for the same month
      const res = await axios.get(
        `${apiBase}/api/budgetlimits?monthYear=${limitMonthYear}`
      );

      const limitsObj = {};
      (res.data || []).forEach((limit) => {
        limitsObj[limit.category] = limit;
      });
      setBudgetLimits(limitsObj);

      setLimitCategory("");
      setLimitAmount("");
      setLimitRecurrence("");
    } catch (err) {
      console.error("Error setting budget limit:", err);
    }
  };

  // Edit budget limit inline
  const startEditBudget = (category) => {
    const limit = budgetLimits[category];
  
    // Determine recurrenceDays as number from either recurrenceDays or resetFrequency string
    let recurrenceDays = null;
  
    if (limit.recurrenceDays != null) {
      recurrenceDays = Number(limit.recurrenceDays);
    } else if (limit.resetFrequency) {
      switch (limit.resetFrequency) {
        case "Weekly":
          recurrenceDays = 7;
          break;
        case "Biweekly":
          recurrenceDays = 14;
          break;
        case "Monthly":
          recurrenceDays = 30;
          break;
        default:
          recurrenceDays = null;
      }
    }
  
    setEditingBudgetCategory(category);
    setEditingBudgetData({
      limitAmount: limit.limitAmount,
      recurrenceDays: recurrenceDays,  // <-- properly set initial state here
    });
  };
  

  const cancelEditBudget = () => {
    setEditingBudgetCategory(null);
    setEditingBudgetData({});
  };

  const saveBudgetEdit = async (category) => {
    try {
      const payload = {
        category,
        limitAmount: parseFloat(editingBudgetData.limitAmount),
        monthYear: new Date(limitMonthYear + "-01").toISOString(),
        recurrenceDays: editingBudgetData.recurrenceDays
          ? parseInt(editingBudgetData.recurrenceDays)
          : null,
      };

      await axios.post(`${apiBase}/api/budgetlimits`, payload);

      // Refresh limits
      const res = await axios.get(
        `${apiBase}/api/budgetlimits?monthYear=${limitMonthYear}`
      );
      const limitsObj = {};
      (res.data || []).forEach((limit) => {
        limitsObj[limit.category] = limit;
      });
      setBudgetLimits(limitsObj);

      cancelEditBudget();
    } catch (err) {
      console.error("Error saving budget edit:", err);
      alert("Save failed for budget limit.");
    }
  };

  // Delete budget limit
  const handleDeleteBudgetLimit = async (id, category) => {
    if (!window.confirm(`Delete budget limit for category "${category}"?`)) return;

    try {
      await axios.delete(`${apiBase}/api/budgetlimits/${id}`);

      // Remove from local state
      setBudgetLimits((prev) => {
        const copy = { ...prev };
        delete copy[category];
        return copy;
      });
    } catch (err) {
      console.error("Error deleting budget limit:", err);
      alert("Failed to delete budget limit.");
    }
  };

  // Totals by category for selected month (limitMonthYear)
  const [yr, mon] = limitMonthYear.split("-");
  const totalsByCategory = {};
  expenses.forEach((exp) => {
    const expDate = new Date(exp.date);
    if (
      expDate.getFullYear() === parseInt(yr, 10) &&
      expDate.getMonth() === parseInt(mon, 10) - 1
    ) {
      totalsByCategory[exp.category] = (totalsByCategory[exp.category] || 0) + exp.amount;
    }
  });

  // isNearOrExceeded uses limit object
  const isNearOrExceeded = (category) => {
    const spent = totalsByCategory[category] || 0;
    const limitObj = budgetLimits[category];
    if (!limitObj) return false;
    const limitAmt = Number(limitObj.limitAmount || 0);
    if (!limitAmt) return false;
    return spent >= limitAmt * 0.9;
  };

  // helper: compute recurrence days from limit object (supports multiple shapes)
  const getRecurrenceDays = (limit) => {
    if (!limit) return 0;
    if (limit.recurrenceDays != null) return Number(limit.recurrenceDays);
    if (limit.RecurrenceDays != null) return Number(limit.RecurrenceDays);
    // if limit.recurrence is string like "7" or "Weekly"
    if (limit.recurrence && !isNaN(Number(limit.recurrence))) return Number(limit.recurrence);
    if (limit.recurrence === "Weekly" || limit.resetFrequency === "Weekly") return 7;
    if (limit.recurrence === "Biweekly" || limit.resetFrequency === "Biweekly") return 14;
    if (limit.recurrence === "Monthly" || limit.resetFrequency === "Monthly") return 30;
    return 0;
  };

  // Friendly recurrence label for display
  const recurrenceLabel = (days) => {
    switch (days) {
      case 7:
        return "Weekly";
      case 14:
        return "Biweekly";
      case 30:
        return "Monthly";
      default:
        return days ? `${days} days` : "—";
    }
  };

  // helper: find base date to compute next reset
  const getBaseDate = (limit) => {
    const candidates = [
      limit.lastReset,
      limit.LastReset,
      limit.last_reset,
      limit.monthYear,
      limit.MonthYear,
      limit.createdAt,
      limit.CreatedAt,
      limit.created_at,
    ];
    for (const c of candidates) {
      if (c) {
        const d = new Date(c);
        if (!isNaN(d)) return d;
      }
    }
    return null;
  };

  const addDays = (d, days) => {
    const copy = new Date(d);
    copy.setDate(copy.getDate() + days);
    return copy;
  };

  // compute next reset date (returns formatted string or "—")
  const computeNextReset = (limit) => {
    if (!limit) return "—";
    const days = getRecurrenceDays(limit);
    if (!days || days <= 0) return "—";

    const base = getBaseDate(limit) || new Date(); // if no base, assume now
    // Typically next = base + days; if that's <= now, advance until > now
    let next = addDays(base, days);
    const now = new Date();
    // If next is before now, iterate forward
    // To avoid infinite loops in degenerate cases, limit iterations
    let iter = 0;
    while (next <= now && iter < 1000) {
      next = addDays(next, days);
      iter++;
    }
    if (isNaN(next)) return "—";
    return next.toLocaleDateString();
  };

  // Pagination slice
  const expensesToShow = showAll
    ? filteredExpenses
    : filteredExpenses.slice(0, entriesPerPage);

  // Calculate monthly totals for last 12 months for line chart
  const getMonthlyTotals = () => {
    const totals = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = d.toLocaleDateString(undefined, { year: "numeric", month: "short" });

      let total = 0;
      expenses.forEach((exp) => {
        const expDate = new Date(exp.date);
        if (expDate.getFullYear() === d.getFullYear() && expDate.getMonth() === d.getMonth()) {
          total += exp.amount;
        }
      });

      totals.push({ month: monthStr, total: Number(total.toFixed(2)) });
    }

    return totals;
  };

  const monthlyTotals = getMonthlyTotals();

  return (
    <div
      style={{
        padding: "1rem",
        fontFamily: "sans-serif",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div style={{ maxWidth: 900, width: "100%" }}>
        <h1>Budget Planner</h1>

        {/* Input Bar */}
        <h2>Add Entry</h2>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <input
            placeholder="Description"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <input
            type="number"
            placeholder="Amount"
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
            min="0"
            step="0.01"
          />
          <input
            type="date"
            placeholder="Date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
          />

          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            title="Select category for this expense"
          >
            <option value="">Category</option>
            <option value="Food">Food</option>
            <option value="Transport">Transport</option>
            <option value="Bills">Bills</option>
            <option value="Entertainment">Entertainment</option>
            <option value="Other">Other</option>
          </select>
          {newCategory === "Other" && (
            <input
              type="text"
              placeholder="Custom Category"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
            />
          )}

          <select
            value={newRecurrence}
            onChange={(e) => setNewRecurrence(e.target.value)}
            title="Set recurrence frequency for this expense (optional)"
          >
            <option value="">No recurrence</option>
            <option value="Weekly">Weekly</option>
            <option value="Biweekly">Biweekly</option>
            <option value="Monthly">Monthly</option>
          </select>

          <button onClick={handleAdd}>Add</button>
        </div>

        {/* Budget Limits Table */}
        <div style={{ marginBottom: "2rem" }}>
          <h2>Budget Limits for {limitMonthYear}</h2>

          {Object.keys(budgetLimits).length === 0 ? (
            <p>No budget limits set for this month.</p>
          ) : (
            <table
              border="1"
              cellPadding="6"
              style={{ borderCollapse: "collapse", width: "100%" }}
            >
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Limit Amount ($)</th>
                  <th>Used ($)</th>
                  <th>Recurrence</th>
                  <th>Next Reset</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(budgetLimits).map(([cat, limit]) => {
                  const used = totalsByCategory[cat] || 0;
                  const limitAmt = Number(limit.limitAmount || 0);
                  const percentUsed = limitAmt ? ((used / limitAmt) * 100).toFixed(0) : null;

                  return (
                    <tr
                      key={cat}
                      style={{
                        backgroundColor: used >= limitAmt * 0.9 ? "lightcoral" : undefined,
                      }}
                    >
                      <td>{cat}</td>
                      <td>
                        {editingBudgetCategory === cat ? (
                          <input
                            type="number"
                            value={editingBudgetData.limitAmount}
                            onChange={(e) =>
                              setEditingBudgetData({
                                ...editingBudgetData,
                                limitAmount: e.target.value,
                              })
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
                        {percentUsed !== null && (
                          <span
                            style={{ marginLeft: 6, color: percentUsed >= 90 ? "red" : "black" }}
                          >
                            ({percentUsed}%)
                          </span>
                        )}
                      </td>
                      <td>
                        {editingBudgetCategory === cat ? (
                          <select
                            value={
                              (() => {
                                const days = Number(editingBudgetData.recurrenceDays);
                                if (days === 7) return "Weekly";
                                if (days === 14) return "Biweekly";
                                if (days === 30) return "Monthly";
                                return "";
                              })()
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              let days = null;
                              if (val === "Weekly") days = 7;
                              else if (val === "Biweekly") days = 14;
                              else if (val === "Monthly") days = 30;

                              setEditingBudgetData({
                                ...editingBudgetData,
                                recurrenceDays: days,
                              });
                            }}
                          >
                            <option value="">No Recurrence</option>
                            <option value="Weekly">Weekly</option>
                            <option value="Biweekly">Biweekly</option>
                            <option value="Monthly">Monthly</option>
                          </select>
                        ) : (
                          recurrenceLabel(
                            Number(limit.recurrenceDays ?? 0) ||
                              (limit.resetFrequency === "Weekly"
                                ? 7
                                : limit.resetFrequency === "Biweekly"
                                ? 14
                                : limit.resetFrequency === "Monthly"
                                ? 30
                                : 0)
                          )
                        )}
                      </td>

                      <td>{computeNextReset(limit)}</td>
                      <td>
                        {editingBudgetCategory === cat ? (
                          <>
                            <button onClick={() => saveBudgetEdit(cat)}>Save</button>
                            <button onClick={cancelEditBudget} style={{ marginLeft: 6 }}>
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEditBudget(cat)}>Edit</button>
                            <button
                              onClick={() => handleDeleteBudgetLimit(limit.id, cat)}
                              style={{ marginLeft: 6, color: "red" }}
                              title={`Delete budget limit for ${cat}`}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Budget Limit Setter */}
        <div style={{ marginBottom: "2rem" }}>
          <h2>Set / Update Budget Limit</h2>
          <input
            placeholder="Category"
            value={limitCategory}
            onChange={(e) => setLimitCategory(e.target.value)}
            style={{ marginRight: "0.5rem" }}
          />
          <input
            type="number"
            placeholder="Limit Amount"
            value={limitAmount}
            onChange={(e) => setLimitAmount(e.target.value)}
            min="0"
            step="0.01"
            style={{ marginRight: "0.5rem" }}
          />
          <input
            type="month"
            value={limitMonthYear}
            onChange={(e) => setLimitMonthYear(e.target.value)}
            style={{ marginRight: "0.5rem" }}
          />
          <select
            value={limitRecurrence}
            onChange={(e) => setLimitRecurrence(e.target.value)}
            style={{ marginRight: "0.5rem" }}
          >
            <option value="">No Recurrence</option>
            <option value="7">Every 7 days</option>
            <option value="14">Every 14 days</option>
            <option value="30">Every 30 days (Monthly)</option>
          </select>
          <button onClick={handleSetBudgetLimit}>Save Limit</button>
        </div>

        
        <h2>Expense Table</h2>
        {/* Search */}
        <div style={{ marginBottom: "1rem" }}>
          <input
            placeholder="Search description or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </div>
        {/* Filter Bar */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "1rem",
            marginBottom: "1rem",
          }}
        >
          <div>
            <label>
              <strong>Filters:</strong>
            </label>
          </div>

          <div>
            <label>Date:</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <option value="all">All Time</option>
              <option value="last7">Last 7 Days</option>
              <option value="last30">Last 30 Days</option>
              <option value="thisMonth">This Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {dateFilter === "custom" && (
            <>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
              />
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
              />
            </>
          )}

          <div>
            <label>Category:</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All</option>
              <option value="Food">Food</option>
              <option value="Transport">Transport</option>
              <option value="Bills">Bills</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label>Recurring:</label>
            <select
              value={recurringFilter}
              onChange={(e) => setRecurringFilter(e.target.value)}
            >
              <option value="">All</option>
              <option value="true">Recurring</option>
              <option value="false">One-time</option>
            </select>
          </div>
        </div>

        {/* Expenses Table */}
        {filteredExpenses.length === 0 ? (
          <p>No expenses found.</p>
        ) : (
          <>
            <table
              border="1"
              cellPadding="6"
              style={{ width: "100%", borderCollapse: "collapse" }}
            >
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Amount ($)</th>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Recurrence</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expensesToShow.map((expense) => (
                  <tr key={expense.id}>
                    <td>
                      {editingExpenseId === expense.id ? (
                        <input
                          value={editingExpenseData.description}
                          onChange={(e) =>
                            setEditingExpenseData({
                              ...editingExpenseData,
                              description: e.target.value,
                            })
                          }
                        />
                      ) : (
                        expense.description
                      )}
                    </td>

                    <td>
                      {editingExpenseId === expense.id ? (
                        <input
                          type="number"
                          value={editingExpenseData.amount}
                          onChange={(e) =>
                            setEditingExpenseData({
                              ...editingExpenseData,
                              amount: e.target.value,
                            })
                          }
                          step="0.01"
                          min="0"
                        />
                      ) : (
                        Number(expense.amount || 0).toFixed(2)
                      )}
                    </td>

                    <td>
                      {editingExpenseId === expense.id ? (
                        <input
                          type="date"
                          value={editingExpenseData.date}
                          onChange={(e) =>
                            setEditingExpenseData({
                              ...editingExpenseData,
                              date: e.target.value,
                            })
                          }
                        />
                      ) : (
                        new Date(expense.date).toLocaleDateString()
                      )}
                    </td>

                    <td>
                      {editingExpenseId === expense.id ? (
                        <input
                          value={editingExpenseData.category}
                          onChange={(e) =>
                            setEditingExpenseData({
                              ...editingExpenseData,
                              category: e.target.value,
                            })
                          }
                        />
                      ) : (
                        expense.category || "—"
                      )}
                    </td>

                    <td>
                      {editingExpenseId === expense.id ? (
                        <select
                          value={editingExpenseData.recurrence || ""}
                          onChange={(e) =>
                            setEditingExpenseData({
                              ...editingExpenseData,
                              recurrence: e.target.value,
                            })
                          }
                        >
                          <option value="">No recurrence</option>
                          <option value="Weekly">Weekly</option>
                          <option value="Biweekly">Biweekly</option>
                          <option value="Monthly">Monthly</option>
                        </select>
                      ) : (
                        expense.recurrence || (expense.recurring ? "Recurring" : "One-time")
                      )}
                    </td>

                    <td>
                      {editingExpenseId === expense.id ? (
                        <>
                          <button onClick={() => saveExpenseEdit(expense.id)}>Save</button>
                          <button onClick={cancelEditExpense} style={{ marginLeft: 6 }}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEditExpense(expense)}>Edit</button>
                          <button
                            onClick={() => handleDelete(expense.id)}
                            style={{ marginLeft: 6 }}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!showAll && filteredExpenses.length > entriesPerPage && (
              <button
                style={{ marginTop: "1rem" }}
                onClick={() => setShowAll(true)}
              >
                Show More
              </button>
            )}
          </>
        )}

        {/* Spending Chart
        <div style={{ marginTop: "2rem" }}>
          <h2>Spending vs Budget Limits</h2>
          <SpendingChart totalsByCategory={totalsByCategory} budgetLimits={budgetLimits} />
        </div> */}

        {/* Monthly Spending Line Chart */}
        <div style={{ height: 300, marginTop: "2rem", marginBottom: "2rem" }}>
          <h2>Monthly Spending Trend (Last 12 months)</h2>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyTotals}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#8884d8"
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default App;
