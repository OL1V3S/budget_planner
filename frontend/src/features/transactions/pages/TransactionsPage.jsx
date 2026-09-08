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
import { getSessionSnapshot } from "../../../shared/auth/session";
import { useInflows } from "../../inflows/hooks/useInflows";
import InflowForm from "../../inflows/components/InflowForm";
import InflowList from "../../inflows/components/InflowList";
import { initialInflowDraft, validateInflow, isUnsafeAmount, formatInflowDate } from "../../inflows/utils/inflowForm";
import StatusMessage from "../../../shared/ui/StatusMessage";
import "../../../styles/activity.css";
import "../../../styles/inflows.css";

const ENTRIES_PER_PAGE = 10;
function focusAfterRender(target) {
  window.requestAnimationFrame(() => target()?.focus());
}

export default function TransactionsPage() {
  const importState = useImportPreview();
  const cash = useInflows();
  const [cashTask, setCashTask] = useState(null);
  const [cashPending, setCashPending] = useState(false);
  const [cashGate, setCashGate] = useState(null);
  const [cashCheckedRead, setCashCheckedRead] = useState(false);
  const [cashFeedback, setCashFeedback] = useState(null);
  const [cashErrors, setCashErrors] = useState({});
  const [cashSearch, setCashSearch] = useState("");
  const [cashShowAll, setCashShowAll] = useState(false);
  const cashWrite = useRef(false);
  const cashLock = useRef(false);
  const legacyLock = useRef(false);
  const cashOpener = useRef(null);
  const cashAddButton = useRef(null);
  const cashHeading = useRef(null);
  const cashFeedbackRegion = useRef(null);
  const cashDeleteButton = useRef(null);
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
  const cashLocked = Boolean(cashTask || cashPending || cashGate);
  cashLock.current = cashLocked;
  const legacyBlocked = Boolean(addOpen || editingExpense || pending || outcomeNeedsRefresh
    || (importOpen && !importState.confirmation) || importState.preview || importState.processing
    || importState.confirming || importState.loading || importState.error || importState.confirmationIssue);
  legacyLock.current = legacyBlocked;
  const cashReadUnavailable = cash.loading || Boolean(cash.error);
  const filteredCash = cash.inflows.filter((record) => record.description.toLowerCase().includes(cashSearch.trim().toLowerCase()));
  const visibleCash = cashShowAll ? filteredCash : filteredCash.slice(0, ENTRIES_PER_PAGE);
  const cashPinned = cashTask?.record && !visibleCash.some((record) => record.id === cashTask.record.id);
  const cashRows = cashPinned ? [cashTask.record, ...visibleCash] : visibleCash;
  const cashTargetMissing = cashTask?.record && !cashReadUnavailable
    && !cash.inflows.some((record) => record.id === cashTask.record.id);
  useEffect(() => { setCashShowAll(false); }, [cashSearch]);

  function focusCashTask() {
    focusAfterRender(() => document.querySelector('#cash-in-task input') ?? cashDeleteButton.current ?? cashFeedbackRegion.current);
  }
  function openCashTask(type, record, opener) {
    if (cashLock.current || cashWrite.current) { focusCashTask(); return; }
    if (legacyLock.current) {
      setCashFeedback({ tone: "info", message: "Finish or close the open expense or import task before changing cash in." });
      focusAfterRender(() => addOpen ? addInput.current : editingExpense
        ? document.querySelector('[aria-label="Edit description"]') : importRegion.current);
      return;
    }
    if (cashReadUnavailable) return;
    cashLock.current = true;
    cashOpener.current = opener;
    setCashErrors({});
    setCashFeedback(null);
    setCashTask({ type, record, draft: type === "delete" ? null : initialInflowDraft(record) });
    if (type === "delete") focusAfterRender(() => cashDeleteButton.current);
  }
  function cancelCashTask() {
    if (cashWrite.current) return;
    setCashTask(null);
    setCashErrors({});
    focusAfterRender(() => cashOpener.current?.isConnected && !cashOpener.current.disabled
      ? cashOpener.current : cashHeading.current);
  }
  async function refreshCash() {
    if (cashWrite.current) return;
    const session = getSessionSnapshot();
    setCashCheckedRead(false);
    try {
      const result = await cash.refresh();
      if (result?.stale || session !== getSessionSnapshot()) return;
      if (cashGate === "unknown") {
        setCashCheckedRead(true);
        setCashFeedback({ tone: "warning", message: "Cash in refreshed. Check whether the change was saved before allowing another attempt." });
      } else {
        setCashGate(null);
        if (cashGate) setCashFeedback({ tone: "info", message: "Cash in refreshed. Check the current records before making another change." });
      }
    } catch {
      // An unsuccessful read cannot release an uncertain write.
    }
  }
  async function writeCash(action, successMessage) {
    if (cashWrite.current || cashGate || legacyLock.current || cashReadUnavailable) return;
    const session = getSessionSnapshot();
    cashWrite.current = true;
    cashLock.current = true;
    setCashPending(true);
    setCashFeedback(null);
    setCashErrors({});
    let focusOutcome = true;
    try {
      const result = await action();
      if (result?.stale || session !== getSessionSnapshot()) return;
      setCashTask(null);
      setCashGate(result?.refreshFailed ? "refresh" : null);
      setCashFeedback({ tone: result?.refreshFailed ? "warning" : "success", saved: true,
        message: result?.refreshFailed
          ? `${successMessage} The cash-in list could not be refreshed. Refresh cash in before another change.` : successMessage });
    } catch (error) {
      if (session !== getSessionSnapshot()) return;
      const status = error?.response?.status;
      if (status === 400) {
        const fields = error.response?.data?.errors;
        const errors = {};
        for (const field of ["description", "amount", "date"]) {
          if (fields && Object.keys(fields).some((key) => key.toLowerCase() === field)) {
            errors[field] = { description: "Enter a description of 1 to 500 characters.",
              amount: "Enter a positive amount with at most two decimals, up to 9999999999999999.99.",
              date: "Enter a valid calendar date." }[field];
          }
        }
        setCashErrors(errors);
        focusOutcome = Object.keys(errors).length === 0;
        setCashFeedback({ tone: "danger", message: "Cash in was not saved. Check the details and try again." });
      } else if (status === 401 || status === 403) {
        setCashFeedback({ tone: "danger", message: status === 401 ? "Your session ended. Sign in again." : "You do not have permission to change this cash-in record." });
      } else {
        setCashGate(status === 404 ? "missing" : "unknown");
        setCashCheckedRead(false);
        setCashFeedback({ tone: "danger", message: status === 404
          ? "This cash-in record is unavailable. Refresh cash in before making another change."
          : "We couldn’t confirm the change. Refresh cash in and check the records before trying again." });
      }
    } finally {
      cashWrite.current = false;
      if (session === getSessionSnapshot()) {
        setCashPending(false);
        if (focusOutcome) focusAfterRender(() => cashFeedbackRegion.current);
      }
    }
  }
  function saveCash() {
    if (!cashTask || cashTargetMissing) return;
    const { errors, payload } = validateInflow(cashTask.draft);
    setCashErrors(errors);
    if (!payload) return;
    return writeCash(() => cashTask.type === "create" ? cash.createInflow(payload)
      : cash.updateInflow(cashTask.record.id, { id: cashTask.record.id, ...payload }),
    cashTask.type === "create" ? "Cash in saved. Reports use this entry’s posted date." : "Cash in updated. Reports use this entry’s posted date.");
  }
  async function refreshImportedActivity(result) {
    const requests = [];
    if (result.importedExpenseCount > 0) requests.push({ name: "expenses", request: refreshExpenses() });
    if (result.importedInflowCount > 0) requests.push({ name: "cash in", request: cash.refresh() });
    const outcomes = await Promise.allSettled(requests.map(({ request }) => request));
    return { failedLists: requests.filter((_, index) => outcomes[index].status === "rejected").map(({ name }) => name) };
  }

  function openAdd() {
    if (cashLock.current) { focusCashTask(); return; }
    legacyLock.current = true;
    setAddOpen(true);
    focusAfterRender(() => addInput.current);
  }
  function clearAdd() {
    setNewName(""); setNewAmount(""); setNewDate(""); setNewCategory(""); setCustomCategory("");
    setAddOpen(false);
    focusAfterRender(() => addButton.current);
  }
  function startEditExpense(expense, opener) {
    if (cashLock.current || editingExpense || writeInFlight.current) return;
    legacyLock.current = true;
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
    if (cashLock.current || writeInFlight.current || outcomeNeedsRefresh || expensesLoading || expensesError) return;
    legacyLock.current = true;
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
    if (cashLock.current || writeInFlight.current || !window.confirm("Delete this expense?")) return;
    await writeExpense(() => deleteExpense(id), "Expense deleted.");
  }

  return (
    <div className="container activity-page">
      <header className="page-header">
        <div><h1>Activity</h1><p className="muted">Review recorded spending and incoming money.</p></div>
        <div className="inline-actions activity-task-openers">
          <button type="button" ref={addButton} aria-expanded={addOpen} aria-controls="add-expense-task" onClick={openAdd}>
            Add expense
          </button>
          <button type="button" ref={cashAddButton} aria-expanded={cashTask?.type === "create"} aria-controls="cash-in-task"
            disabled={cashReadUnavailable || cashPending || Boolean(cashGate)}
            onClick={(event) => openCashTask("create", null, event.currentTarget)}>Add cash in</button>
          <button type="button" className="button-ghost" ref={importButton} aria-expanded={showImport} aria-controls="statement-import-task"
            onClick={() => { if (cashLock.current) { focusCashTask(); return; } legacyLock.current = true; setImportOpen(true); focusAfterRender(() => importRegion.current); }}>
            Import statement
          </button>
        </div>
      </header>
      <nav className="activity-section-links" aria-label="Activity sections">
        <a href="#spending-activity-heading">Spending</a><a href="#cash-in-heading">Cash in</a>
      </nav>
      {cashLocked && <p className="muted">Finish the cash-in task or its refresh check before starting an expense or import task.</p>}
      <div ref={feedbackRegion} tabIndex={-1} className="activity-feedback">
        {feedback && <StatusMessage tone={feedback.tone}>{feedback.message}</StatusMessage>}
      </div>
      <div id="add-expense-task" hidden={!addOpen}>
        <ExpenseForm loading={cashLocked || expensesLoading || Boolean(expensesError) || outcomeNeedsRefresh} pending={pending} onAdd={handleAddExpense} onCancel={clearAdd} inputRef={addInput}
          newName={newName} setNewName={setNewName} newAmount={newAmount} setNewAmount={setNewAmount}
          newDate={newDate} setNewDate={setNewDate} newCategory={newCategory} setNewCategory={setNewCategory}
          customCategory={customCategory} setCustomCategory={setCustomCategory} />
      </div>
      <div id="statement-import-task" ref={importRegion} tabIndex={-1} hidden={!showImport} className="activity-import-task">
        <ImportPreviewPanel importState={importState} onImportConfirmed={refreshImportedActivity}
          externalLocked={cashLocked} isExternallyLocked={() => cashLock.current} />
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
          busy={pending} taskLocked={cashLocked || Boolean(editingExpense)} readUnavailable={expensesLoading || Boolean(expensesError) || outcomeNeedsRefresh} />}
      </section>
      <section className="activity-cash-in" aria-labelledby="cash-in-heading">
        <div className="activity-spending__header">
          <h2 id="cash-in-heading" ref={cashHeading} tabIndex={-1}>Cash in</h2>
          <button type="button" className="button-ghost" disabled={cash.loading || cashPending} onClick={refreshCash}>Refresh cash in</button>
        </div>
        <p className="muted">Recorded incoming money, including transfers and refunds. A cash-in record is not automatically income or a paycheck.</p>
        <div ref={cashFeedbackRegion} tabIndex={-1} className="activity-feedback">
          {cashFeedback && <StatusMessage tone={cashFeedback.tone}>{cashFeedback.message}</StatusMessage>}
          {cashFeedback?.saved && <a href="/analytics">View Insights</a>}
        </div>
        {cashGate === "unknown" && <button type="button" className="button-ghost"
          disabled={!cashCheckedRead || cashReadUnavailable || cashPending}
          onClick={() => { if (!cashCheckedRead || cashReadUnavailable || cashWrite.current) return; setCashGate(null); setCashCheckedRead(false);
            setCashFeedback({ tone: "info", message: "You checked the records. Another attempt is now available; it will not run automatically." }); }}>I checked cash in</button>}
        <div id="cash-in-task" hidden={!cashTask}>
          {cashTask && cashTask.type !== "delete" && <InflowForm mode={cashTask.type} draft={cashTask.draft}
            onChange={(draft) => { setCashTask((current) => ({ ...current, draft })); setCashErrors({}); }}
            fieldErrors={cashErrors} onSubmit={saveCash} onCancel={cancelCashTask} pending={cashPending}
            disabled={cashReadUnavailable || Boolean(cashGate) || legacyBlocked || Boolean(cashTargetMissing)}
            amountNeedsReview={cashTask.type === "edit" && isUnsafeAmount(cashTask.record.amount)} />}
          {cashTask?.type === "delete" && <div className="inflow-delete-confirmation" role="group" aria-labelledby="cash-in-delete-heading">
            <h3 id="cash-in-delete-heading">Delete cash in: {cashTask.record.description} ({formatInflowDate(cashTask.record.date)})?</h3>
            <p>This removes the record from cash-flow history. Any supporting paycheck link is removed; the saved paycheck expectation remains.</p>
            <p>If this entry was imported, importing the same confirmed statement again will not restore it.</p>
            <div className="inline-actions">
              <button type="button" ref={cashDeleteButton} className="button-danger"
                disabled={cashPending || cashReadUnavailable || Boolean(cashGate) || legacyBlocked || Boolean(cashTargetMissing)}
                onClick={() => writeCash(() => cash.deleteInflow(cashTask.record.id), "Cash in deleted. Recorded reports will reflect its removal.")}>{cashPending ? "Deleting…" : "Confirm delete cash in"}</button>
              <button type="button" className="button-ghost" disabled={cashPending} onClick={cancelCashTask}>Cancel</button>
            </div>
          </div>}
          {cashTargetMissing && <StatusMessage>This entry is no longer in the current list. Cancel this task to choose another record.</StatusMessage>}
        </div>
        <label className="field">Search cash in<input type="search" value={cashSearch} onChange={(event) => setCashSearch(event.target.value)} /></label>
        {cash.loading && <StatusMessage>{cash.inflows.length ? "Refreshing cash in…" : "Loading cash in…"}</StatusMessage>}
        {cash.error && <StatusMessage tone="danger">We couldn’t load cash in. Refresh cash in to try again.</StatusMessage>}
        {cashPinned && <StatusMessage>Your open cash-in record stays visible while the list changes.</StatusMessage>}
        {(!cashReadUnavailable || cashRows.length > 0) && <InflowList inflows={cashRows} totalCount={cash.inflows.length}
          filteredCount={filteredCash.length} showAll={cashShowAll} onShowAll={() => setCashShowAll(true)}
          onEdit={(record, opener) => openCashTask("edit", record, opener)} onDelete={(record, opener) => openCashTask("delete", record, opener)}
          disabled={cashLocked || legacyBlocked} readUnavailable={cashReadUnavailable} taskRecordId={cashTask?.record?.id ?? null} />}
      </section>
    </div>
  );
}
