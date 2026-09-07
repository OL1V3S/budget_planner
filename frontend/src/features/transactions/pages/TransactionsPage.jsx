import { useEffect, useMemo, useRef, useState } from "react";
import { useExpenses } from "../../expenses/hooks/useExpenses";
import { filterExpenses } from "../../expenses/utils/filterExpenses";
import { DEFAULT_CATEGORIES } from "../../../shared/constants/categories";
import { normalizeText, isDefaultCategory } from "../../../utils/text";
import ExpenseForm from "../../expenses/components/ExpenseForm";
import ExpenseFilters from "../../expenses/components/ExpenseFilters";
import ExpenseList from "../../expenses/components/ExpenseList";
import ImportPreviewPanel from "../../importPreview/components/ImportPreviewPanel";
import { useImportPreview } from "../../importPreview/hooks/useImportPreview";
import StatusMessage from "../../../shared/ui/StatusMessage";
import "../../../styles/activity.css";

const ENTRIES_PER_PAGE = 10;
function focusAfterRender(target) {
  window.requestAnimationFrame(() => target()?.focus());
}

export default function TransactionsPage() {
  const importState = useImportPreview();
  const {
    expenses, loading: expensesLoading, error: expensesError,
    refresh: refreshExpenses, addExpense, updateExpense, deleteExpense,
  } = useExpenses();
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [editingExpense, setEditingExpense] = useState(null);
  const [editingExpenseData, setEditingExpenseData] = useState({});
  const [dateFilter, setDateFilter] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [outcomeNeedsRefresh, setOutcomeNeedsRefresh] = useState(false);
  const writeInFlight = useRef(false);
  const addButton = useRef(null);
  const addInput = useRef(null);
  const importButton = useRef(null);
  const importRegion = useRef(null);
  const editButton = useRef(null);
  const activityHeading = useRef(null);
  const feedbackRegion = useRef(null);

  const filters = useMemo(() => ({
    dateFilter, customStartDate, customEndDate, categoryFilter, searchTerm,
  }), [dateFilter, customStartDate, customEndDate, categoryFilter, searchTerm]);
  const filteredExpenses = useMemo(() => filterExpenses(expenses, filters), [expenses, filters]);
  useEffect(() => { setShowAll(false); }, [filters]);
  const visibleExpenses = showAll ? filteredExpenses : filteredExpenses.slice(0, ENTRIES_PER_PAGE);
  // A filter, pagination reset, or failed refresh must not remove an open draft.
  const editIsPinned = editingExpense && !visibleExpenses.some((expense) => expense.id === editingExpense.id);
  const expensesToShow = editIsPinned ? [editingExpense, ...visibleExpenses] : visibleExpenses;
  const resumingImport = new URLSearchParams(window.location.search).has("importBatch");
  const importMustStayVisible = Boolean(importState.preview || importState.processing
    || (importState.loading && (resumingImport || importState.sourceType)) || importState.confirming || importState.error
    || importState.confirmation || importState.confirmationIssue);
  const showImport = importOpen || importMustStayVisible;

  function openAdd() {
    setAddOpen(true);
    focusAfterRender(() => addInput.current);
  }
  function clearAdd() {
    setNewName(""); setNewAmount(""); setNewDate(""); setNewCategory(""); setCustomCategory("");
    setAddOpen(false);
    focusAfterRender(() => addButton.current);
  }
  function startEditExpense(expense, opener) {
    if (editingExpense || writeInFlight.current) return;
    const currentCategory = expense.category || "";
    const categoryIsDefault = isDefaultCategory(currentCategory, DEFAULT_CATEGORIES);
    editButton.current = opener;
    setEditingExpense(expense);
    setEditingExpenseData({
      description: expense.description || "",
      amount: Number(expense.amount ?? 0).toFixed(2),
      date: expense.date || "",
      category: categoryIsDefault ? normalizeText(currentCategory) : "other",
      customCategory: categoryIsDefault ? "" : currentCategory,
    });
  }
  function cancelEditExpense() {
    setEditingExpense(null);
    setEditingExpenseData({});
    focusAfterRender(() => editButton.current?.isConnected ? editButton.current : activityHeading.current);
  }
  async function writeExpense(action, successMessage, onSuccess) {
    if (writeInFlight.current || outcomeNeedsRefresh || expensesLoading || expensesError) return;
    writeInFlight.current = true;
    setPending(true);
    setFeedback(null);
    try {
      const result = await action();
      onSuccess?.();
      setOutcomeNeedsRefresh(Boolean(result?.refreshFailed));
      setFeedback({
        tone: result?.refreshFailed ? "warning" : "success",
        message: result?.refreshFailed
          ? `${successMessage} Activity could not be refreshed. Refresh the list before making another change.`
          : successMessage,
      });
    } catch {
      setOutcomeNeedsRefresh(true);
      setFeedback({ tone: "danger", message: "We couldn’t confirm the change. Refresh activity and check the records before trying again." });
    } finally {
      writeInFlight.current = false;
      setPending(false);
      focusAfterRender(() => feedbackRegion.current);
    }
  }
  async function refreshActivity() {
    try {
      await refreshExpenses();
      setOutcomeNeedsRefresh(false);
      setFeedback(outcomeNeedsRefresh ? {
        tone: "info", message: "Activity refreshed. Check the records before retrying your change.",
      } : null);
    } catch {
      // Keep an uncertain write gated until a successful explicit list read.
    }
  }
  async function handleAddExpense() {
    if (!newName || !newAmount || !newDate || !newCategory) {
      alert("Complete all transaction fields.");
      return;
    }
    const categoryToUse = newCategory === "other"
      ? normalizeText(customCategory || "uncategorized") : normalizeText(newCategory);
    await writeExpense(() => addExpense({
      description: normalizeText(newName), amount: parseFloat(newAmount), date: newDate, category: categoryToUse,
    }), "Expense saved.", clearAdd);
  }
  async function saveExpenseEdit(id) {
    const finalCategory = editingExpenseData.category === "other"
      ? normalizeText(editingExpenseData.customCategory || "uncategorized")
      : normalizeText(editingExpenseData.category);
    await writeExpense(() => updateExpense(id, {
      id, description: normalizeText(editingExpenseData.description),
      amount: Math.round(parseFloat(editingExpenseData.amount) * 100) / 100,
      date: editingExpenseData.date, category: finalCategory,
    }), "Expense updated.", cancelEditExpense);
  }
  async function handleDeleteExpense(id) {
    if (writeInFlight.current || !window.confirm("Delete this expense?")) return;
    await writeExpense(() => deleteExpense(id), "Expense deleted.");
  }

  return (
    <div className="container activity-page">
      <header className="page-header">
        <div><h1>Activity</h1><p className="muted">Review and organize your spending.</p></div>
        <div className="inline-actions activity-task-openers">
          <button type="button" ref={addButton} aria-expanded={addOpen} aria-controls="add-expense-task" onClick={openAdd}>
            Add expense
          </button>
          <button type="button" className="button-ghost" ref={importButton} aria-expanded={showImport} aria-controls="statement-import-task"
            onClick={() => { setImportOpen(true); focusAfterRender(() => importRegion.current); }}>
            Import statement
          </button>
        </div>
      </header>
      <div ref={feedbackRegion} tabIndex={-1} className="activity-feedback">
        {feedback && <StatusMessage tone={feedback.tone}>{feedback.message}</StatusMessage>}
      </div>
      <div id="add-expense-task" hidden={!addOpen}>
        <ExpenseForm loading={expensesLoading || Boolean(expensesError) || outcomeNeedsRefresh} pending={pending} onAdd={handleAddExpense} onCancel={clearAdd} inputRef={addInput}
          newName={newName} setNewName={setNewName} newAmount={newAmount} setNewAmount={setNewAmount}
          newDate={newDate} setNewDate={setNewDate} newCategory={newCategory} setNewCategory={setNewCategory}
          customCategory={customCategory} setCustomCategory={setCustomCategory} />
      </div>
      <div id="statement-import-task" ref={importRegion} tabIndex={-1} hidden={!showImport} className="activity-import-task">
        <ImportPreviewPanel importState={importState} onImportConfirmed={refreshExpenses} />
        {!importMustStayVisible && <button type="button" className="button-ghost" onClick={() => {
          setImportOpen(false); focusAfterRender(() => importButton.current);
        }}>Close import</button>}
      </div>
      <section className="activity-spending" aria-labelledby="spending-activity-heading">
        <div className="activity-spending__header">
          <h2 id="spending-activity-heading" ref={activityHeading} tabIndex={-1}>Spending activity</h2>
          <button type="button" className="button-ghost" disabled={expensesLoading || pending}
            onClick={refreshActivity}>Refresh activity</button>
        </div>
        <ExpenseFilters searchTerm={searchTerm} setSearchTerm={setSearchTerm} dateFilter={dateFilter} setDateFilter={setDateFilter}
          customStartDate={customStartDate} setCustomStartDate={setCustomStartDate} customEndDate={customEndDate} setCustomEndDate={setCustomEndDate}
          categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter} />
        {expensesLoading && <StatusMessage>{expenses.length ? "Refreshing expenses…" : "Loading expenses..."}</StatusMessage>}
        {expensesError && <div>
          <StatusMessage tone="danger">We couldn’t load your expenses.</StatusMessage>
          <button type="button" disabled={expensesLoading || pending} onClick={refreshActivity}>Try again</button>
        </div>}
        {editIsPinned && <StatusMessage>Your open edit stays here while the list changes.</StatusMessage>}
        {((!expensesLoading && !expensesError) || expensesToShow.length > 0) && <ExpenseList
          expenses={expensesToShow} totalCount={expenses.length} filteredCount={filteredExpenses.length}
          entriesPerPage={ENTRIES_PER_PAGE} showAll={showAll} onShowAll={() => setShowAll(true)}
          editingExpenseId={editingExpense?.id ?? null} editingExpenseData={editingExpenseData} setEditingExpenseData={setEditingExpenseData}
          onStartEdit={startEditExpense} onSave={saveExpenseEdit} onCancel={cancelEditExpense} onDelete={handleDeleteExpense}
          busy={pending} taskLocked={Boolean(editingExpense)} readUnavailable={expensesLoading || Boolean(expensesError) || outcomeNeedsRefresh} />}
      </section>
    </div>
  );
}
