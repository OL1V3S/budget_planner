import { useId } from "react";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";
import { useCashFlowColors } from "../hooks/useCashFlowColors";
import { cashMonthLabel, formatCash, periodNotes } from "../utils/cashFlowPresentation";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function CashFlowTrendChart({ data }) {
  const headingId = useId();
  const tableId = useId();
  const colors = useCashFlowColors();
  const fields = ["paycheckCashInMinor", "otherCashInMinor", "spentMinor"];
  const chartData = {
    labels: data.months.map((bucket) => [...cashMonthLabel(bucket.month, { short: true }).split(" "),
      ...(bucket.month === data.throughDate.slice(0, 7) ? ["MTD"] : [])]),
    datasets: [
      { label: "Confirmed paychecks", stack: "cash-in", backgroundColor: colors.paychecks, borderWidth: 1 },
      { label: "Other cash in", stack: "cash-in", backgroundColor: colors.other, borderWidth: 3 },
      { label: "Spent", stack: "spent", backgroundColor: colors.spent, borderWidth: 1 },
    ].map((dataset, index) => ({ ...dataset,
      // Numbers are used only by Chart.js for plotting. Tooltips/table use exact strings.
      data: data.months.map((bucket) => Number(bucket[fields[index]]) / 100),
      borderColor: colors.text,
      borderSkipped: false,
    })),
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    scales: {
      x: { stacked: true, ticks: { color: colors.text, autoSkip: false, maxRotation: 0, minRotation: 0 }, grid: { display: false }, border: { color: colors.border } },
      y: { stacked: true, beginAtZero: true, ticks: { color: colors.text }, grid: { color: colors.grid }, border: { color: colors.border }, title: { display: true, text: "USD", color: colors.text } },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        titleColor: colors.text, bodyColor: colors.text, backgroundColor: colors.surface,
        borderColor: colors.border, borderWidth: 1,
        callbacks: {
          title: (items) => items.length ? cashMonthLabel(data.months[items[0].dataIndex].month) : "",
          label: (context) => `${context.dataset.label}: ${formatCash(data.months[context.dataIndex][fields[context.datasetIndex]])}`,
          footer: (items) => items.length ? `Recorded cash in: ${formatCash(data.months[items[0].dataIndex].cashInMinor)}` : "",
        },
      },
    },
  };

  return (
    <section className="card analytics-panel cash-flow-trend" aria-labelledby={headingId}>
      <p className="analytics-kicker">{data.months.length === 6 ? "Six calendar months" : `${data.months.length} calendar ${data.months.length === 1 ? "month" : "months"} from January 0001`}</p>
      <h2 id={headingId} className="h2">Cash in vs spending over time</h2>
      <ul className="cash-flow-legend" aria-label="Chart legend">
        <li><span className="cash-flow-swatch cash-flow-bar__paychecks" aria-hidden="true" />Confirmed paychecks</li>
        <li><span className="cash-flow-swatch cash-flow-bar__other" aria-hidden="true" />Other cash in</li>
        <li><span className="cash-flow-swatch cash-flow-bar__spent" aria-hidden="true" />Spent</li>
      </ul>
      <div className="cash-flow-trend__canvas" aria-hidden="true"><Bar data={chartData} options={options} /></div>
      {data.months.some((bucket) => bucket.month === data.throughDate.slice(0, 7)) && <p className="muted cash-flow-trend__note">MTD: month to date</p>}
      <details className="cash-flow-disclosure">
        <summary>View chart data</summary>
        <div className="cash-flow-table-scroll" role="region" aria-labelledby={tableId} tabIndex={0}>
          <table className="cash-flow-table">
            <caption id={tableId}>Monthly recorded cash flow in US dollars</caption>
            <thead><tr><th scope="col">Month</th><th scope="col">Recorded cash in</th><th scope="col">Confirmed paychecks</th><th scope="col">Other cash in</th><th scope="col">Spent</th><th scope="col">Net recorded cash flow</th><th scope="col">Period note</th></tr></thead>
            <tbody>{data.months.map((bucket) => <tr key={bucket.month}>
              <th scope="row">{cashMonthLabel(bucket.month)}</th>
              <td>{formatCash(bucket.cashInMinor)}</td><td>{formatCash(bucket.paycheckCashInMinor)}</td>
              <td>{formatCash(bucket.otherCashInMinor)}</td><td>{formatCash(bucket.spentMinor)}</td>
              <td>{formatCash(bucket.netMinor, { signed: true })}</td><td>{periodNotes(bucket, data.throughDate)}</td>
            </tr>)}</tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
