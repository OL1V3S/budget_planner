import { formatDate, formatMoney } from "../utils/formatPaychecks";

export default function PaycheckEvidence({ evidence = [], confirmed = false }) {
  if (!evidence.length) return <p className="muted">No linked deposit evidence. This is your saved expectation.</p>;

  return (
    <details className="paycheck-evidence">
      <summary>{confirmed ? "Linked deposit evidence" : "Review every deposit"} ({evidence.length})</summary>
      <ul className="paycheck-evidence__list">
        {evidence.map((row) => (
          <li key={row.accountInflowId} className="paycheck-evidence__row">
            <div>
              <strong>{row.description}</strong>
              <span><time dateTime={row.postedDate}>{formatDate(row.postedDate)}</time> · {row.source === "imported" ? "Imported deposit" : "Manual deposit"}</span>
              <span>Schedule date {formatDate(row.slotAnchor)} · {row.timingOffsetDays === 0 ? "On schedule date" : `${Math.abs(row.timingOffsetDays)} day(s) ${row.timingOffsetDays < 0 ? "before" : "after"}`}</span>
              {confirmed && row.editedSinceConfirmation && <span className="paycheck-evidence__edited">Edited since confirmation. The saved expectation is unchanged.</span>}
            </div>
            <strong>{formatMoney(row.amount)}</strong>
          </li>
        ))}
      </ul>
    </details>
  );
}
