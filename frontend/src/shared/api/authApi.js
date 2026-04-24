import client from "./client";

export const authApi = {
  register: (payload) => client.post("/api/auth/register", payload),
  login: (payload) => client.post("/api/auth/login", payload),
};