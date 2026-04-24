import { DEFAULT_CATEGORIES } from "../../../shared/constants/categories";
import { displayText } from "../../../utils/text";

export default function ExpenseItem({
  expense,
  isEditing,
  editingData,
  setEditingData,
  onStartEdit,
  onSave,
  onCancel,
  onDelete,
}) {
  const selectedCategory = editingData.category || "";

  return (
    <tr>
      <td>
        {isEditing ? (
          <input
            value={editingData.description || ""}
            onChange={(e) =>
              setEditingData((prev) => ({
                ...prev,
                description: e.target.value,
              }))
            }
          />
        ) : (
          displayText(expense.description)
        )}
      </td>

      <td>
        {isEditing ? (
          <input
            type="number"
            value={editingData.amount || ""}
            onChange={(e) =>
              setEditingData((prev) => ({
                ...prev,
                amount: e.target.value,
              }))
            }
            min="0"
            step="0.01"
          />
        ) : (
          Number(expense.amount).toFixed(2)
        )}
      </td>

      <td>
        {isEditing ? (
          <input
            type="date"
            value={editingData.date ? editingData.date.slice(0, 10) : ""}
            onChange={(e) =>
              setEditingData((prev) => ({
                ...prev,
                date: e.target.value,
              }))
            }
          />
        ) : (
          new Date(expense.date).toLocaleDateString()
        )}
      </td>

      <td>
        {isEditing ? (
          <>
            <select
              value={selectedCategory}
              onChange={(e) =>
                setEditingData((prev) => ({
                  ...prev,
                  category: e.target.value,
                }))
              }
            >
              <option value="">Category</option>
              {DEFAULT_CATEGORIES.map((c) => (
                <option key={c} value={c.toLowerCase()}>
                  {displayText(c)}
                </option>
              ))}
              <option value="other">Other</option>
            </select>

            {selectedCategory === "other" && (
              <input
                type="text"
                placeholder="Custom Category"
                value={editingData.customCategory || ""}
                onChange={(e) =>
                  setEditingData((prev) => ({
                    ...prev,
                    customCategory: e.target.value,
                  }))
                }
              />
            )}
          </>
        ) : (
          displayText(expense.category)
        )}
      </td>

      <td>
        {isEditing ? (
          <div className="inline-actions">
            <button onClick={() => onSave(expense.id)}>Save</button>
            <button className="button-ghost" onClick={onCancel}>
              Cancel
            </button>
          </div>
        ) : (
          <div className="inline-actions">
            <button onClick={() => onStartEdit(expense)}>Edit</button>
            <button className="button-danger" onClick={() => onDelete(expense.id)}>
              Delete
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}