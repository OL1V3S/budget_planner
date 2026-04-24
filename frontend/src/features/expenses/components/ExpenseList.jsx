import ExpenseItem from "./ExpenseItem";

export default function ExpenseList({
  expenses,
  filteredCount,
  entriesPerPage,
  showAll,
  onShowAll,
  editingExpenseId,
  editingExpenseData,
  setEditingExpenseData,
  onStartEdit,
  onSave,
  onCancel,
  onDelete,
}) {
  if (!expenses || expenses.length === 0) return <p>No expenses found.</p>;

  return (
    <>
      <div className="table-wrapper">
        <table className="data-table" border="1" cellPadding="6">
          <thead>
            <tr>
              <th>Description</th>
              <th>Amount ($)</th>
              <th>Date</th>
              <th>Category</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {expenses.map((expense) => (
              <ExpenseItem
                key={expense.id}
                expense={expense}
                isEditing={editingExpenseId === expense.id}
                editingData={editingExpenseData}
                setEditingData={setEditingExpenseData}
                onStartEdit={onStartEdit}
                onSave={onSave}
                onCancel={onCancel}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>
      </div>

      {!showAll && filteredCount > entriesPerPage && (
        <button style={{ marginTop: "1rem" }} onClick={onShowAll}>
          Show More
        </button>
      )}
    </>
  );
}