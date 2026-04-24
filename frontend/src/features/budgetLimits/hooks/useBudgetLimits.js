import { useEffect, useState } from "react";
import { budgetLimitsApi } from "../api/budgetLimitsApi";

export function useBudgetLimits(monthYear) {
  const [budgetLimits, setBudgetLimits] = useState([]);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    if (!monthYear) return;
    setLoading(true);
    try {
      const res = await budgetLimitsApi.getByMonth(monthYear);
      setBudgetLimits(res.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, [monthYear]);

  async function upsertLimit(payload) {
    await budgetLimitsApi.upsert(payload);
    await refresh();
  }

  async function deleteLimit(id) {
    await budgetLimitsApi.remove(id);
    await refresh();
  }

  return { budgetLimits, loading, refresh, upsertLimit, deleteLimit };
}
