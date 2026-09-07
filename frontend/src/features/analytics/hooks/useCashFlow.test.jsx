import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { establishSession, clearSession } from "../../../shared/auth/session";
import { cashFlowApi } from "../api/cashFlowApi";
import { cashFlowFixture } from "../testFixtures";
import { useCashFlow } from "./useCashFlow";

vi.mock("../api/cashFlowApi", () => ({ cashFlowApi: { get: vi.fn() } }));

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function response(month = "2026-08") {
  return { data: { ...cashFlowFixture(month), throughDate: "2026-08-14" } };
}

describe("cash-flow snapshot lifecycle", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 7, 14, 12));
    establishSession("owner-a", "a@example.test");
    cashFlowApi.get.mockReset();
  });
  afterEach(() => { clearSession(); vi.useRealTimers(); });

  it("starts loading without zero data, then publishes the single whole response", async () => {
    const request = deferred();
    cashFlowApi.get.mockReturnValue(request.promise);
    const { result } = renderHook(() => useCashFlow("2026-08"));
    expect(result.current).toMatchObject({ loading: true, data: null, error: null });
    expect(cashFlowApi.get).toHaveBeenCalledWith("2026-08", "2026-08-14", expect.any(AbortSignal));
    await act(() => request.resolve(response()));
    expect(result.current).toMatchObject({ loading: false, data: response().data, availableMonths: ["2026-08", "2026-07"] });
  });
  it("discards older month responses, even when cancellation is ignored", async () => {
    const old = deferred();
    const recent = deferred();
    cashFlowApi.get.mockReturnValueOnce(old.promise).mockReturnValueOnce(recent.promise);
    const { result, rerender } = renderHook(({ month }) => useCashFlow(month), { initialProps: { month: "2026-08" } });
    rerender({ month: "2026-07" });
    expect(result.current.data).toBeNull();
    await act(() => recent.resolve(response("2026-07")));
    await act(() => old.resolve(response()));
    expect(result.current.data.month).toBe("2026-07");
  });
  it("does not relabel prior complete results while another month loads or fails", async () => {
    cashFlowApi.get.mockResolvedValueOnce(response()).mockRejectedValueOnce(new Error("failed"));
    const { result, rerender } = renderHook(({ month }) => useCashFlow(month), { initialProps: { month: "2026-08" } });
    await waitFor(() => expect(result.current.loading).toBe(false));
    rerender({ month: "2026-07" });
    expect(result.current.data).toBeNull();
    await waitFor(() => expect(result.current.error).toContain("couldn’t load"));
    expect(result.current.data).toBeNull();
  });
  it("fails unavailable and retries with a newly captured local cutoff", async () => {
    cashFlowApi.get.mockRejectedValueOnce(new Error("failed"));
    const { result } = renderHook(() => useCashFlow("2026-08"));
    await waitFor(() => expect(result.current.error).toContain("couldn’t load"));
    const next = deferred();
    cashFlowApi.get.mockReturnValueOnce(next.promise);
    vi.setSystemTime(new Date(2026, 7, 15, 0, 1));
    act(() => result.current.refresh());
    expect(result.current).toMatchObject({ loading: true, data: null });
    expect(cashFlowApi.get).toHaveBeenLastCalledWith("2026-08", "2026-08-15", expect.any(AbortSignal));
    await act(() => next.resolve({ data: { ...response().data, throughDate: "2026-08-15", to: "2026-08-15" } }));
    expect(result.current.data.throughDate).toBe("2026-08-15");
  });
  it("removes a successful snapshot when a refresh fails instead of retaining unlabeled stale figures", async () => {
    cashFlowApi.get.mockResolvedValueOnce(response()).mockRejectedValueOnce(new Error("failed"));
    const { result } = renderHook(() => useCashFlow("2026-08"));
    await waitFor(() => expect(result.current.data).not.toBeNull());
    act(() => result.current.refresh());
    expect(result.current.data).toBeNull();
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.data).toBeNull();
  });
  it("clears owner data and ignores old-session completion on a same-page session change", async () => {
    const old = deferred();
    const recent = deferred();
    cashFlowApi.get.mockReturnValueOnce(old.promise).mockReturnValueOnce(recent.promise);
    const { result } = renderHook(() => useCashFlow("2026-08"));
    act(() => establishSession("owner-b", "b@example.test"));
    expect(result.current.data).toBeNull();
    await act(() => old.resolve(response()));
    expect(result.current.data).toBeNull();
    await act(() => recent.resolve(response()));
    expect(result.current.data).not.toBeNull();
    act(() => clearSession());
    expect(result.current.data).toBeNull();
    expect(result.current.error).toContain("Sign in");
  });
  it("rejects mismatched echoed periods and aborts on unmount", async () => {
    cashFlowApi.get.mockResolvedValueOnce(response("2026-07"));
    const { result, unmount } = renderHook(() => useCashFlow("2026-08"));
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.data).toBeNull();
    const signal = cashFlowApi.get.mock.calls[0][2];
    unmount();
    expect(signal.aborted).toBe(true);
  });
});
