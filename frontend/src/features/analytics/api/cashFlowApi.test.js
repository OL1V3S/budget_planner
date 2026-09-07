import { describe, expect, it, vi } from "vitest";
import client from "../../../shared/api/client";
import { cashFlowApi } from "./cashFlowApi";

vi.mock("../../../shared/api/client", () => ({ default: { get: vi.fn() } }));

describe("cash-flow API", () => {
  it("uses the authenticated shared client with explicit calendar filters and cancellation", async () => {
    const data = { selected: { cashInMinor: "999999999999999999" } };
    client.get.mockResolvedValue({ data });
    const signal = new AbortController().signal;
    expect(await cashFlowApi.get("2026-08", "2026-08-14", signal)).toEqual({ data });
    expect(client.get).toHaveBeenCalledWith("/api/analytics/cash-flow", {
      params: { month: "2026-08", throughDate: "2026-08-14" }, signal,
    });
  });
});
