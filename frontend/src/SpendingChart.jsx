import React from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

function SpendingChart({ totalsByCategory, budgetLimits }) {
  // Combine categories from both totals and limits to show all relevant categories
  const categories = Array.from(
    new Set([...Object.keys(totalsByCategory), ...Object.keys(budgetLimits)])
  );

  const spentAmounts = categories.map((cat) => totalsByCategory[cat] || 0);
  const limitAmounts = categories.map((cat) => budgetLimits[cat] || 0);

  const data = {
    labels: categories,
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
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 10 },
      },
    },
    plugins: {
      legend: {
        position: "top",
      },
      tooltip: {
        enabled: true,
      },
    },
  };

  if (categories.length === 0) {
    return <p>No data to display chart.</p>;
  }

  return <Bar data={data} options={options} />;
}

export default SpendingChart;
