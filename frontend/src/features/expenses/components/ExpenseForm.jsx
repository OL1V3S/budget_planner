import { DEFAULT_CATEGORIES } from "../../../shared/constants/categories";
import { displayText } from "../../../utils/text";
import Card from "../../../shared/ui/Card";
import FormField from "../../../shared/ui/FormField";

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
    <Card as="section" className="section">
      <h2 className="h2">Add Entry</h2>
      <div className="form-grid">
        <FormField label="Description">{(id) => <input id={id}
          placeholder="Description"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />}</FormField>

        <FormField label="Amount">{(id) => <input id={id}
          type="number"
          placeholder="Amount"
          value={newAmount}
          onChange={(e) => setNewAmount(e.target.value)}
          min="0"
          step="0.01"
        />}</FormField>

        <FormField label="Date">{(id) => <input id={id}
          type="date"
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
        />}</FormField>

        <FormField label="Category">{(id) => <select id={id} value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
          <option value="">Category</option>

          {DEFAULT_CATEGORIES.map((c) => (
            <option key={c} value={c.toLowerCase()}>
              {displayText(c)}
            </option>
          ))}

          <option value="other">Other</option>
        </select>}</FormField>

        {newCategory === "other" && (
          <FormField label="Custom category">{(id) => <input id={id}
            type="text"
            placeholder="Custom Category"
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
          />}</FormField>
        )}

        <button onClick={onAdd} disabled={loading}>
          Add
        </button>
      </div>
    </Card>
  );
}
