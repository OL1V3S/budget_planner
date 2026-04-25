import client from "./client";

export const authApi = {
  register: (payload) => client.post("/api/auth/register", payload),
  login: (payload) => client.post("/api/auth/login", payload),

  confirmEmail: (payload) =>
    client.post("/api/auth/confirm-email", payload),

  forgotPassword: (payload) =>
    client.post("/api/auth/forgot-password", payload),

  resetPassword: (payload) =>
    client.post("/api/auth/reset-password", payload),
};