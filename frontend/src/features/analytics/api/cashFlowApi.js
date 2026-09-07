import client from "../../../shared/api/client";

export const cashFlowApi = {
  get: (month, throughDate, signal) => client.get("/api/analytics/cash-flow", {
    params: { month, throughDate },
    signal,
  }),
};
