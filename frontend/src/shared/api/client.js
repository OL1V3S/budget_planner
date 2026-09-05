import axios from "axios";
import { getSessionSnapshot, invalidateSession } from "../auth/session";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

const requestSessions = new WeakMap();

client.interceptors.request.use((config) => {
  const session = getSessionSnapshot();

  if (session.token) {
    config.headers.Authorization = `Bearer ${session.token}`;
    if (!config.skipSessionInvalidation) requestSessions.set(config, session);
  }

  return config;
});

client.interceptors.response.use(
  (response) => {
    requestSessions.delete(response.config);
    return response;
  },
  (error) => {
    const session = requestSessions.get(error.config);
    requestSessions.delete(error.config);
    if (error.response?.status === 401 && session) invalidateSession(session);
    return Promise.reject(error);
  },
);

export default client;
