import client from "../../../shared/api/client";

export const inflowsApi = {
  getAll: (signal) => client.get("/api/inflows", { signal }),
  create: (payload) => client.post("/api/inflows", {
    description: payload.description,
    amount: payload.amount,
    date: payload.date,
  }),
  update: (id, payload) => client.put(`/api/inflows/${id}`, {
    id,
    description: payload.description,
    amount: payload.amount,
    date: payload.date,
  }),
  remove: (id) => client.delete(`/api/inflows/${id}`),
};
