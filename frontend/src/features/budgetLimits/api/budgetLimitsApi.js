import { api } from "../../../shared/api/client";

export const budgetLimitsApi = {
  getByMonth: (monthYear) => api.get(`/api/budgetlimits?monthYear=${monthYear}`),
  upsert: (payload) => api.post("/api/budgetlimits", payload),
  remove: (id) => api.delete(`/api/budgetlimits/${id}`),
};
