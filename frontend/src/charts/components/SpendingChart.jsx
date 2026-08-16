// src/components/charts/SpendingChart.jsx
import { useId } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { displayText } from "../../utils/text";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export default function SpendingChart({ totalsByCategory, budgetLimitsByCategory }) {
  const summaryHeadingId = useId();
  const totals = totalsByCategory ?? {};
  const limits = budgetLimitsByCategory ?? {};

  const categories = Array.from(
    new Set([...Object.keys(totals), ...Object.keys(limits)])
  );

  if (categories.length === 0) return <p className="empty-state">No data to display chart.</p>;

  const spentAmounts = categories.map((cat) => Number(totals[cat] || 0));
  const limitAmounts = categories.map((cat) =>
    Number(limits[cat]?.limitAmount || 0)
  );

  const data = {
    labels: categories.map((cat) => displayText(cat)),
    datasets: [
      {
        label: "Spent",
        data: spentAmounts,
        backgroundColor: "rgba(75, 192, 192, 0.6)",
      },
      {
        label: "Budget Limit",
        data: limitAmounts,
        backgroundColor: "rgba(255, 99, 132, 0.6)",
      },
    ],
  };

  const options = {
    responsive: true,
    scales: {
      y: { beginAtZero: true },
    },
    plugins: {
      legend: { position: "top" },
      tooltip: { enabled: true },
    },
  };

  const chartRows = data.labels.map((label, index) => ({
    categoryKey: categories[index],
    label,
    spent: spentAmounts[index],
    limit: limitAmounts[index],
  }));

  return (
    <>
      <div aria-hidden="true">
        <Bar data={data} options={options} />
      </div>
      <section className="chart-summary" aria-labelledby={summaryHeadingId}>
        <h3 id={summaryHeadingId}>Spending and budget limit data</h3>
        <ul className="chart-summary__list">
          {chartRows.map((row) => (
            <li key={row.categoryKey} className="chart-summary__item">
              <strong>{row.label}</strong>
              <span>Spent: {currencyFormatter.format(row.spent)}</span>
              <span>Budget limit: {currencyFormatter.format(row.limit)}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
