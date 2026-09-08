import { beforeEach, describe, expect, it, vi } from "vitest";
import client from "../../../shared/api/client";
import { inflowsApi } from "./inflowsApi";

vi.mock("../../../shared/api/client", () => ({ default: {
  get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(),
} }));

describe("inflow API contract", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reads the owner-scoped inflow list with cancellation", async () => {
    const signal = new AbortController().signal;
    await inflowsApi.getAll(signal);
    expect(client.get).toHaveBeenCalledWith("/api/inflows", { signal });
  });

  it("sends the exact create payload as quoted decimal and calendar date values", async () => {
    const payload = {
      description: "Quarterly distribution",
      amount: "9999999999999999.99",
      date: "2026-09-08",
      ownerId: "must-not-leave-the-browser",
    };
    await inflowsApi.create(payload);
    expect(client.post).toHaveBeenCalledWith("/api/inflows", {
      description: "Quarterly distribution",
      amount: "9999999999999999.99",
      date: "2026-09-08",
    });
  });

  it("forces the route id into the update body", async () => {
    const payload = {
      id: 999,
      description: "Corrected deposit",
      amount: "12.35",
      date: "2026-09-07",
      provenance: "must-not-leave-the-browser",
    };
    await inflowsApi.update(42, payload);
    expect(client.put).toHaveBeenCalledWith("/api/inflows/42", {
      id: 42,
      description: "Corrected deposit",
      amount: "12.35",
      date: "2026-09-07",
    });
  });

  it("deletes only the requested inflow", async () => {
    await inflowsApi.remove(42);
    expect(client.delete).toHaveBeenCalledWith("/api/inflows/42");
  });
});
