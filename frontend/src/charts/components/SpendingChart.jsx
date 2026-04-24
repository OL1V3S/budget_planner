// src/components/charts/SpendingChart.jsx
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

export default function SpendingChart({ totalsByCategory, budgetLimitsByCategory }) {
  const totals = totalsByCategory ?? {};
  const limits = budgetLimitsByCategory ?? {};

  const categories = Array.from(
    new Set([...Object.keys(totals), ...Object.keys(limits)])
  );

  if (categories.length === 0) return <p>No data to display chart.</p>;

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

  return <Bar data={data} options={options} />;
}