import { useEffect, useMemo, useState } from "react";
import { useExpenses } from "../hooks/useExpenses";
import { useBudgetLimits } from "../../budgetLimits/hooks/useBudgetLimits";

import { getMonthYear } from "../../../shared/utils/monthYear";
import { filterExpenses } from "../utils/filterExpenses";
import { computeMonthlyTotalsByCategory } from "../../budgetLimits/utils/totalsByCategory";
import { DEFAULT_CATEGORIES } from "../../../shared/constants/categories";
import { normalizeText, isDefaultCategory } from "../../../utils/text";

import SpendingChart from "../../../charts/components/SpendingChart";
import BudgetLimitsPanel from "../../budgetLimits/components/BudgetLimitsPanel";
import ExpenseForm from "./ExpenseForm";
import ExpenseFilters from "./ExpenseFilters";
import ExpenseList from "./ExpenseList";
const ENTRIES_PER_PAGE = 10;

export default function ExpensesPage() {
  const {
    expenses,
    loading: expensesLoading,
    addExpense,
    updateExpense,
    deleteExpense,
  } = useExpenses();

  const [limitMonthYear, setLimitMonthYear] = useState(getMonthYear(new Date()));

  const {
    budgetLimits,
    loading: limitsLoading,
    upsertLimit,
    deleteLimit,
  } = useBudgetLimits(limitMonthYear);

  const budgetLimitsByCategory = useMemo(() => {
    const obj = {};
    for (const l of budgetLimits ?? []) obj[l.category] = l;
    return obj;
  }, [budgetLimits]);

  // Add expense UI state
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");

  // edit expense
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [editingExpenseData, setEditingExpenseData] = useState({});

  // filters
  const [dateFilter, setDateFilter] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // pagination
  const [showAll, setShowAll] = useState(false);

  const filters = useMemo(
    () => ({
      dateFilter,
      customStartDate,
      customEndDate,
      categoryFilter,
      searchTerm,
    }),
    [dateFilter, customStartDate, customEndDate, categoryFilter, searchTerm]
  );

  const filteredExpenses = useMemo(
    () => filterExpenses(expenses, filters),
    [expenses, filters]
  );

  useEffect(() => {
    setShowAll(false);
  }, [filters]);

  const expensesToShow = showAll
    ? filteredExpenses
    : filteredExpenses.slice(0, ENTRIES_PER_PAGE);

  const totalsByCategory = useMemo(
    () => computeMonthlyTotalsByCategory(expenses, limitMonthYear),
    [expenses, limitMonthYear]
  );

  async function handleAddExpense() {
    if (!newName || !newAmount || !newDate || !newCategory) {
      alert("Fill out all the fields you silly goose 0_0");
      return;
    }
  
    const categoryToUse =
      newCategory === "other"
        ? normalizeText(customCategory || "uncategorized")
        : normalizeText(newCategory);
  
    const payload = {
      description: normalizeText(newName),
      amount: parseFloat(newAmount),
      date: newDate,
      category: categoryToUse,
    };
  
    await addExpense(payload);
  
    setNewName("");
    setNewAmount("");
    setNewDate("");
    setNewCategory("");
    setCustomCategory("");
  }

  function startEditExpense(expense) {
    const currentCategory = expense.category || "";
    const categoryIsDefault = isDefaultCategory(currentCategory, DEFAULT_CATEGORIES);
  
    setEditingExpenseId(expense.id);
    setEditingExpenseData({
      description: expense.description || "",
      amount: Number(expense.amount ?? 0).toFixed(2),
      date: expense.date ? String(expense.date).slice(0, 10) : "",
      category: categoryIsDefault ? normalizeText(currentCategory) : "other",
      customCategory: categoryIsDefault ? "" : currentCategory,
    });
  }

  function cancelEditExpense() {
    setEditingExpenseId(null);
    setEditingExpenseData({});
  }

  async function saveExpenseEdit(id) {
    const finalCategory =
      editingExpenseData.category === "other"
        ? normalizeText(editingExpenseData.customCategory || "uncategorized")
        : normalizeText(editingExpenseData.category);
  
    const body = {
      id,
      description: normalizeText(editingExpenseData.description),
      amount: Math.round(parseFloat(editingExpenseData.amount) * 100) / 100,
      date: editingExpenseData.date,
      category: finalCategory,
    };
  
    await updateExpense(id, body);
    cancelEditExpense();
  }

  return (
    <div className="container">
      <h1>Budget Planner</h1>
  
      <ExpenseForm
        loading={expensesLoading}
        onAdd={handleAddExpense}
        newName={newName}
        setNewName={setNewName}
        newAmount={newAmount}
        setNewAmount={setNewAmount}
        newDate={newDate}
        setNewDate={setNewDate}
        newCategory={newCategory}
        setNewCategory={setNewCategory}
        customCategory={customCategory}
        setCustomCategory={setCustomCategory}
      />
  
      <BudgetLimitsPanel
        limitMonthYear={limitMonthYear}
        setLimitMonthYear={setLimitMonthYear}
        budgetLimits={budgetLimits}
        limitsLoading={limitsLoading}
        totalsByCategory={totalsByCategory}
        upsertLimit={upsertLimit}
        deleteLimit={deleteLimit}
      />
  
      <ExpenseFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
      />
  
      <ExpenseList
        expenses={expensesToShow}
        filteredCount={filteredExpenses.length}
        entriesPerPage={ENTRIES_PER_PAGE}
        showAll={showAll}
        onShowAll={() => setShowAll(true)}
        editingExpenseId={editingExpenseId}
        editingExpenseData={editingExpenseData}
        setEditingExpenseData={setEditingExpenseData}
        onStartEdit={startEditExpense}
        onSave={saveExpenseEdit}
        onCancel={cancelEditExpense}
        onDelete={deleteExpense}
      />
  
      <div style={{ marginTop: "2rem" }}>
        <h2 className="h2">Spending vs Budget Limits</h2>
        <SpendingChart
          totalsByCategory={totalsByCategory}
          budgetLimitsByCategory={budgetLimitsByCategory}
        />
      </div>
    </div>
  );
}
