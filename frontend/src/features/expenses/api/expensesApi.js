import { api } from "../../../shared/api/client";

export const expensesApi = {
  getAll: () => api.get("/api/expenses"),
  create: (payload) => api.post("/api/expenses", payload),
  update: (id, payload) => api.put(`/api/expenses/${id}`, payload),
  remove: (id) => api.delete(`/api/expenses/${id}`),
};
