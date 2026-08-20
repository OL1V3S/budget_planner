import { useEffect, useState } from "react";
import { DEFAULT_CATEGORIES } from "../../../shared/constants/categories";
import { displayText, isDefaultCategory, normalizeText } from "../../../utils/text";

const STATUS_LABELS = {
  expense_candidate: "Expense candidate",
  non_expense: "Excluded credit",
  needs_review: "Needs review",
  invalid: "Invalid row",
};

function RowFields({ row, onUpdate }) {
  const defaultCategory = isDefaultCategory(row.category, DEFAULT_CATEGORIES) || row.category === "uncategorized";
  const [description, setDescription] = useState(row.editableExpenseDescription ?? "");
  const [categoryChoice, setCategoryChoice] = useState(defaultCategory ? row.category : "other");
  const [customCategory, setCustomCategory] = useState(defaultCategory ? "" : row.category ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDescription(row.editableExpenseDescription ?? "");
    const isDefault = isDefaultCategory(row.category, DEFAULT_CATEGORIES) || row.category === "uncategorized";
    setCategoryChoice(isDefault ? row.category : "other");
    setCustomCategory(isDefault ? "" : row.category ?? "");
  }, [row]);

  if (!row.isEligible) return <span className="muted">Not editable</span>;

  async function save() {
    setSaving(true);
    await onUpdate({
      editableExpenseDescription: description.trim(),
      category: categoryChoice === "other" ? normalizeText(customCategory) : categoryChoice,
      selectedForImport: row.selectedForImport,
    });
    setSaving(false);
  }

  return (
    <div className="import-row-fields">
      <label>
        <span>Expense description</span>
        <input value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
      <label>
        <span>Category</span>
        <select value={categoryChoice} onChange={(event) => setCategoryChoice(event.target.value)}>
          {DEFAULT_CATEGORIES.map((category) => (
            <option key={category} value={category.toLowerCase()}>{displayText(category)}</option>
          ))}
          <option value="uncategorized">Uncategorized</option>
          <option value="other">Other</option>
        </select>
      </label>
      {categoryChoice === "other" && (
        <label>
          <span>Custom category</span>
          <input value={customCategory} onChange={(event) => setCustomCategory(event.target.value)} />
        </label>
      )}
      <button type="button" className="button-ghost" disabled={saving} onClick={save}>
        {saving ? "Saving…" : "Save row"}
      </button>
    </div>
  );
}

function RowStatus({ row }) {
  return (
    <div className="import-row-status">
      <span className={`import-status import-status--${row.classification}`}>
        {STATUS_LABELS[row.classification] ?? "Review required"}
      </span>
      {row.isPossibleDuplicate && (
        <span className="import-warning">Possible duplicate — review before selecting</span>
      )}
      {row.errors.map((code) => <span className="import-error" key={code}>Issue: {code.replaceAll("_", " ")}</span>)}
      {row.warnings.filter((code) => code !== "possible_duplicate").map((code) => (
        <span className="import-warning" key={code}>Warning: {code.replaceAll("_", " ")}</span>
      ))}
    </div>
  );
}

export default function ImportPreviewRow({ row, onUpdate, presentation = "table" }) {
  async function updateSelection(selectedForImport) {
    await onUpdate({
      editableExpenseDescription: row.editableExpenseDescription,
      category: row.category,
      selectedForImport,
    });
  }

  const selection = (
    <label className="import-selection">
      <input
        type="checkbox"
        checked={row.selectedForImport}
        disabled={!row.isEligible}
        onChange={(event) => updateSelection(event.target.checked)}
      />
      <span>{row.isEligible ? "Select for future import" : "Not selectable"}</span>
    </label>
  );

  const details = (
    <>
      <div><span className="import-field-label">Date</span>{row.postedDate ?? "Unavailable"}</div>
      <div><span className="import-field-label">Amount</span>{row.amount == null ? "Unavailable" : `$${Number(row.amount).toFixed(2)}`}</div>
      <div><span className="import-field-label">Direction</span>{displayText(row.direction)}</div>
      <div><span className="import-field-label">Source</span>{row.sourceDescription || "Unavailable"}</div>
      <div><span className="import-field-label">Section</span>{displayText(row.sourceSection)}</div>
    </>
  );

  if (presentation === "card") {
    return (
      <article className="import-preview-card" aria-label={`Statement row ${row.sourceRowOrdinal}`}>
        <div className="import-preview-card__details">{details}</div>
        <RowStatus row={row} />
        {selection}
        <RowFields row={row} onUpdate={onUpdate} />
      </article>
    );
  }

  return (
    <tr>
      <td>{row.sourceRowOrdinal}</td>
      <td>{details}</td>
      <td><RowStatus row={row} /></td>
      <td>{selection}</td>
      <td><RowFields row={row} onUpdate={onUpdate} /></td>
    </tr>
  );
}
