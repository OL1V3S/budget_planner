import { formatInflowDate, formatInflowMoney } from "../utils/inflowForm";

function actionName(action, inflow, formattedDate) {
  return `${action} cash in ${inflow.description} from ${formattedDate}, record ${inflow.id}`;
}

export default function InflowList({
  inflows,
  totalCount,
  filteredCount,
  showAll,
  onShowAll,
  onEdit,
  onDelete,
  disabled = false,
  readUnavailable = false,
  taskRecordId = null,
}) {
  if (!inflows || inflows.length === 0) {
    const hasRecordedInflows = typeof totalCount === "number" && totalCount > 0;
    return (
      <p className="empty-state inflow-list__empty">
        {hasRecordedInflows ? "No cash in matches this search." : "No cash in recorded yet."}
      </p>
    );
  }

  const actionsDisabled = disabled || readUnavailable;

  return (
    <div className="inflow-list">
      <div className="table-wrapper inflow-list__table-wrapper" role="region" aria-label="Cash in table" tabIndex="0">
        <table className="data-table inflow-table">
          <caption className="sr-only">Cash in</caption>
          <thead>
            <tr>
              <th>Description</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {inflows.map((inflow) => {
              const formattedDate = formatInflowDate(inflow.date);
              const isTaskRecord = taskRecordId === inflow.id;
              return (
                <tr key={inflow.id} className={`inflow-row${isTaskRecord ? " inflow-row--task" : ""}`} aria-current={isTaskRecord ? "true" : undefined}>
                  <td className="inflow-cell inflow-cell--description" data-label="Description">{inflow.description}</td>
                  <td className="inflow-cell inflow-cell--amount" data-label="Amount">{formatInflowMoney(inflow.amount)}</td>
                  <td className="inflow-cell inflow-cell--date" data-label="Date">{formattedDate}</td>
                  <td className="inflow-cell inflow-cell--actions" data-label="Actions">
                    <div className="inline-actions inflow-row__actions">
                      <button
                        type="button"
                        className="button-ghost"
                        disabled={actionsDisabled}
                        aria-label={actionName("Edit", inflow, formattedDate)}
                        onClick={(event) => onEdit(inflow, event.currentTarget)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="button-ghost"
                        disabled={actionsDisabled}
                        aria-label={actionName("Delete", inflow, formattedDate)}
                        onClick={(event) => onDelete(inflow, event.currentTarget)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!showAll && filteredCount > 10 && (
        <button type="button" className="button-ghost inflow-list__show-all" onClick={onShowAll} disabled={disabled}>
          Show all cash in
        </button>
      )}
    </div>
  );
}
