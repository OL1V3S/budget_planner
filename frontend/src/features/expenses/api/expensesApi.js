import client from "../../../shared/api/client";

export const expensesApi = {
  getAll: () => client.get("/api/expenses"),
  create: (payload) => client.post("/api/expenses", payload),
  update: (id, payload) => client.put(`/api/expenses/${id}`, payload),
  remove: (id) => client.delete(`/api/expenses/${id}`),
};
