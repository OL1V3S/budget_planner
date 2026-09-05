import client from "./client";

const publicAuthRequest = { skipSessionInvalidation: true };

export const authApi = {
  register: (payload) => client.post("/api/auth/register", payload, publicAuthRequest),
  login: (payload) => client.post("/api/auth/login", payload, publicAuthRequest),

  resendConfirmation: (payload) =>
    client.post("/api/auth/resend-confirmation", payload, publicAuthRequest),

  confirmEmail: (payload) =>
    client.post("/api/auth/confirm-email", payload, publicAuthRequest),

  forgotPassword: (payload) =>
    client.post("/api/auth/forgot-password", payload, publicAuthRequest),

  resetPassword: (payload) =>
    client.post("/api/auth/reset-password", payload, publicAuthRequest),
};
