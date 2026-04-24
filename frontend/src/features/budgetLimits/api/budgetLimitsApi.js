import client from "../../../shared/api/client";

export const budgetLimitsApi = {
  getByMonth: (monthYear) => client.get(`/api/budgetlimits?monthYear=${monthYear}`),
  upsert: (payload) => client.post("/api/budgetlimits", payload),
  remove: (id) => client.delete(`/api/budgetlimits/${id}`),
};
