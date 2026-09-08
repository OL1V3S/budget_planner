import { useCallback, useEffect, useRef, useState } from "react";
import { budgetLimitsApi } from "../api/budgetLimitsApi";

export function useBudgetLimits(monthYear) {
  const [budgetLimits, setBudgetLimits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [queryMonth, setQueryMonth] = useState(monthYear);
  const requestId = useRef(0);

  const refresh = useCallback(async function refresh({ rethrow = false } = {}) {
    if (!monthYear) {
      requestId.current += 1;
      setQueryMonth("");
      setBudgetLimits([]);
      setLoading(false);
      setError(null);
      return;
    }
    const currentRequestId = ++requestId.current;
    setQueryMonth(monthYear);
    setLoading(true);
    setError(null);
    setBudgetLimits([]);
    try {
      const res = await budgetLimitsApi.getByMonth(monthYear);
      if (currentRequestId === requestId.current) setBudgetLimits(res.data ?? []);
    } catch (requestError) {
      if (currentRequestId === requestId.current) {
        setError(requestError);
        if (rethrow) throw requestError;
      }
    } finally {
      if (currentRequestId === requestId.current) setLoading(false);
    }
  }, [monthYear]);

  useEffect(() => {
    refresh();
    return () => { requestId.current += 1; };
  }, [refresh]);

  async function refreshAfterWrite() {
    try {
      await refresh({ rethrow: true });
      return { refreshFailed: false };
    } catch {
      return { refreshFailed: true };
    }
  }

  async function upsertLimit(payload) {
    await budgetLimitsApi.upsert(payload);
    return refreshAfterWrite();
  }

  async function deleteLimit(id) {
    await budgetLimitsApi.remove(id);
    return refreshAfterWrite();
  }

  const currentMonth = queryMonth === monthYear;
  return {
    budgetLimits: currentMonth && monthYear ? budgetLimits : [],
    loading: Boolean(monthYear) && (loading || !currentMonth),
    error: currentMonth && monthYear ? error : null,
    refresh, upsertLimit, deleteLimit,
  };
}
