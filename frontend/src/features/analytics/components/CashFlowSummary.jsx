import { useId } from "react";
import { barWidth, cashDateLabel, cashMonthLabel, cashPercentage, formatCash, minorUnits } from "../utils/cashFlowPresentation";

export default function CashFlowSummary({ data }) {
  const headingId = useId();
  const bucket = data.selected;
  const maximum = minorUnits(bucket.cashInMinor) > minorUnits(bucket.spentMinor) ? bucket.cashInMinor : bucket.spentMinor;
  const cashInSpent = cashPercentage(bucket.spentMinor, bucket.cashInMinor);
  return (
    <section className="card analytics-total cash-flow-summary" aria-labelledby={headingId}>
      <p className="analytics-kicker">{cashMonthLabel(data.month)}</p>
      <h2 id={headingId} className="h2">Recorded cash in vs Spent</h2>
      {data.month === data.throughDate.slice(0, 7) && <p className="muted">Through {cashDateLabel(data.to)}</p>}
      <p className="muted">Based on your recorded transactions.</p>
      <div className="cash-flow-summary__comparison">
        <div className="cash-flow-comparison">
          <div className="cash-flow-comparison__row">
            <div className="analytics-row"><strong>Recorded cash in</strong><strong>{formatCash(bucket.cashInMinor)}</strong></div>
            <div className="cash-flow-bar" aria-hidden="true">
              <span className="cash-flow-bar__paychecks" style={{ width: barWidth(bucket.paycheckCashInMinor, maximum) }} />
              <span className="cash-flow-bar__other" style={{ width: barWidth(bucket.otherCashInMinor, maximum) }} />
            </div>
            {bucket.cashInMinor === "0" && <p className="muted">No cash in recorded</p>}
          </div>
          <div className="cash-flow-comparison__row">
            <div className="analytics-row"><strong>Spent</strong><strong>{formatCash(bucket.spentMinor)}</strong></div>
            <div className="cash-flow-bar" aria-hidden="true"><span className="cash-flow-bar__spent" style={{ width: barWidth(bucket.spentMinor, maximum) }} /></div>
            {bucket.spentMinor === "0" && <p className="muted">No spending recorded</p>}
          </div>
          <ul className="cash-flow-legend cash-flow-legend--amounts" aria-label="Recorded cash in breakdown">
            <li><span className="cash-flow-swatch cash-flow-bar__paychecks" aria-hidden="true" />Confirmed paychecks <strong>{formatCash(bucket.paycheckCashInMinor)}</strong></li>
            <li><span className="cash-flow-swatch cash-flow-bar__other" aria-hidden="true" />Other cash in <strong>{formatCash(bucket.otherCashInMinor)}</strong></li>
          </ul>
        </div>
        <div className="cash-flow-net">
          <h3>Net recorded cash flow</h3>
          <p className="analytics-total__value">{formatCash(bucket.netMinor, { signed: true })}</p>
          <p className="muted">Recorded cash in minus Spent</p>
        </div>
      </div>
      <details className="cash-flow-disclosure">
        <summary>About these figures</summary>
        <p>These figures reflect saved transactions and may not cover all account activity. Net recorded cash flow describes this period; it is not an account balance, savings, or money available to spend.</p>
        <p>Confirmed paychecks are the recorded inflows linked to an owner-confirmed paycheck profile, including active, paused, and ended profiles. Other cash in is every remaining recorded inflow and can include unlinked paychecks, refunds, transfers, and reimbursements. Both parts count toward recorded cash in; receiving cash does not classify it as income.</p>
        <p>Spent includes all recorded outflows, including purchases, transfers, debt payments, and investment funding. Refunds count as cash in without reducing their original spending category. Budgets, paycheck expectations, projections, and unsaved import previews do not add to these figures.</p>
        <p>Amounts and dates reflect the current saved records. Editing or deleting a transaction can change these historical figures. Confirming a paycheck changes the cash-in breakdown, without changing total cash in or net flow.</p>
        <dl className="cash-flow-facts">
          <div><dt>Cash in spent</dt><dd>{cashInSpent ?? "Not applicable — no cash in recorded"}</dd></div>
          <div><dt>Confirmed paycheck share</dt><dd>{cashPercentage(bucket.paycheckCashInMinor, bucket.cashInMinor) ?? "Not applicable — no cash in recorded"}</dd></div>
          <div><dt>Other cash in share</dt><dd>{cashPercentage(bucket.otherCashInMinor, bucket.cashInMinor) ?? "Not applicable — no cash in recorded"}</dd></div>
          <div><dt>Recorded inflows</dt><dd>{bucket.inflowCount} ({bucket.paycheckInflowCount} paycheck-linked, {bucket.otherInflowCount} other)</dd></div>
          <div><dt>Recorded expenses</dt><dd>{bucket.expenseCount}</dd></div>
          <div><dt>Contributing paycheck profiles</dt><dd>{bucket.paycheckProfileCount}</dd></div>
          <div><dt>Edited linked inflows</dt><dd>{bucket.editedPaycheckInflowCount}</dd></div>
        </dl>
        <p className="muted">Edited linked inflows retain their assignment and use their current posted date and amount. Percentages round to the nearest tenth, with halfway values rounded upward; rounded shares may not sum to 100.0%.</p>
      </details>
    </section>
  );
}
