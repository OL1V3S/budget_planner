import { DEFAULT_CATEGORIES } from "../../../shared/constants/categories";
import { displayText } from "../../../utils/text";

export default function ExpenseForm({
  loading,
  onAdd,
  newName,
  setNewName,
  newAmount,
  setNewAmount,
  newDate,
  setNewDate,
  newCategory,
  setNewCategory,
  customCategory,
  setCustomCategory,
}) {
  return (
    <>
      <h2 className="h2">Add Entry</h2>
      <div className="form-row">
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
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
        />

        <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
          <option value="">Category</option>

          {DEFAULT_CATEGORIES.map((c) => (
            <option key={c} value={c.toLowerCase()}>
              {displayText(c)}
            </option>
          ))}

          <option value="other">Other</option>
        </select>

        {newCategory === "other" && (
          <input
            type="text"
            placeholder="Custom Category"
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
          />
        )}

        <button onClick={onAdd} disabled={loading}>
          Add
        </button>
      </div>
    </>
  );
}