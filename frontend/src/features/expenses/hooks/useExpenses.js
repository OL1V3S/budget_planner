import { useEffect, useState } from "react";
import { expensesApi } from "../api/expensesApi";

//fetch/state

export function useExpenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const res = await expensesApi.getAll();
      setExpenses(res.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function addExpense(payload) {
    await expensesApi.create(payload);
    await refresh();
  }

  async function updateExpense(id, payload) {
    await expensesApi.update(id, payload);
    await refresh();
  }

  async function deleteExpense(id) {
    await expensesApi.remove(id);
    await refresh();
  }

  return { expenses, loading, refresh, addExpense, updateExpense, deleteExpense };
}
