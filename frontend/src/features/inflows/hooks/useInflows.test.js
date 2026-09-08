import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearSession, establishSession } from "../../../shared/auth/session";
import { inflowsApi } from "../api/inflowsApi";
import { useInflows } from "./useInflows";

vi.mock("../api/inflowsApi", () => ({ inflowsApi: {
  getAll: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(),
} }));

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

const record = { id: 1, description: "Refund", amount: 12.35, date: "2026-09-01" };

describe("inflow state boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    establishSession("owner-a", "a@example.test");
    inflowsApi.getAll.mockResolvedValue({ data: [] });
    inflowsApi.create.mockResolvedValue({ status: 201, data: record });
    inflowsApi.update.mockResolvedValue({ status: 204 });
    inflowsApi.remove.mockResolvedValue({ status: 204 });
  });
  afterEach(() => clearSession());

  it("starts loading, passes an abort signal, and publishes a successful empty list", async () => {
    const request = deferred();
    inflowsApi.getAll.mockReturnValueOnce(request.promise);
    const { result } = renderHook(() => useInflows());
    expect(result.current).toMatchObject({ inflows: [], loading: true, error: null });
    expect(inflowsApi.getAll).toHaveBeenCalledWith(expect.any(AbortSignal));
    await act(() => request.resolve({ data: [] }));
    expect(result.current).toMatchObject({ inflows: [], loading: false, error: null });
  });

  it("keeps current refresh failures observable and distinct from an empty list", async () => {
    inflowsApi.getAll.mockResolvedValueOnce({ data: [record] });
    const { result } = renderHook(() => useInflows());
    await waitFor(() => expect(result.current.inflows).toEqual([record]));
    const failure = new Error("read unavailable");
    inflowsApi.getAll.mockRejectedValueOnce(failure);
    await act(async () => { await expect(result.current.refresh()).rejects.toBe(failure); });
    expect(result.current).toMatchObject({ inflows: [record], loading: false, error: failure });
  });

  it("treats a malformed list response as a failed read instead of an empty ledger", async () => {
    inflowsApi.getAll.mockResolvedValueOnce({ data: [record] });
    const { result } = renderHook(() => useInflows());
    await waitFor(() => expect(result.current.inflows).toEqual([record]));
    inflowsApi.getAll.mockResolvedValueOnce({ data: { inflows: [] } });
    await act(async () => { await expect(result.current.refresh()).rejects.toThrow("Invalid inflow list response"); });
    expect(result.current.inflows).toEqual([record]);
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it("aborts and resolves an older overlapping read as stale", async () => {
    const old = deferred();
    const recent = deferred();
    inflowsApi.getAll.mockReturnValueOnce(old.promise).mockReturnValueOnce(recent.promise);
    const { result } = renderHook(() => useInflows());
    const firstSignal = inflowsApi.getAll.mock.calls[0][0];
    let latest;
    act(() => { latest = result.current.refresh(); });
    expect(firstSignal.aborted).toBe(true);
    await act(() => recent.resolve({ data: [record] }));
    expect(await latest).toEqual({ stale: false });
    await act(() => old.resolve({ data: [{ ...record, id: 99 }] }));
    expect(result.current.inflows).toEqual([record]);
  });

  it("resolves an explicit obsolete refresh as stale when a newer refresh wins", async () => {
    const { result } = renderHook(() => useInflows());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const old = deferred();
    const recent = deferred();
    inflowsApi.getAll.mockReturnValueOnce(old.promise).mockReturnValueOnce(recent.promise);
    let oldOutcome;
    act(() => { oldOutcome = result.current.refresh(); });
    let recentOutcome;
    act(() => { recentOutcome = result.current.refresh(); });
    await act(() => recent.resolve({ data: [record] }));
    expect(await recentOutcome).toEqual({ stale: false });
    await act(() => old.resolve({ data: [] }));
    expect(await oldOutcome).toEqual({ stale: true });
  });

  it("masks prior owner data on the first render of a new session and ignores late data", async () => {
    inflowsApi.getAll.mockResolvedValueOnce({ data: [record] });
    const { result } = renderHook(() => useInflows());
    await waitFor(() => expect(result.current.inflows).toEqual([record]));
    const next = deferred();
    inflowsApi.getAll.mockReturnValueOnce(next.promise);
    act(() => establishSession("owner-b", "b@example.test"));
    expect(result.current).toMatchObject({ inflows: [], loading: true, error: null });
    await act(() => next.resolve({ data: [{ ...record, id: 2 }] }));
    expect(result.current.inflows).toEqual([{ ...record, id: 2 }]);
  });

  it("resolves a read from a changed session as stale even when cancellation is ignored", async () => {
    const { result } = renderHook(() => useInflows());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const old = deferred();
    const current = deferred();
    inflowsApi.getAll.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
    let oldOutcome;
    act(() => { oldOutcome = result.current.refresh(); });
    act(() => establishSession("owner-b", "b@example.test"));
    await act(() => old.resolve({ data: [record] }));
    expect(await oldOutcome).toEqual({ stale: true });
    expect(result.current.inflows).toEqual([]);
    await act(() => current.resolve({ data: [{ ...record, id: 2 }] }));
    expect(result.current.inflows).toEqual([{ ...record, id: 2 }]);
  });

  it("returns stale and skips the follow-up read when the session changes during a completed write", async () => {
    const write = deferred();
    inflowsApi.create.mockReturnValueOnce(write.promise);
    const { result } = renderHook(() => useInflows());
    await waitFor(() => expect(result.current.loading).toBe(false));
    let outcome;
    act(() => { outcome = result.current.createInflow({ description: "Refund", amount: "12.35", date: "2026-09-01" }); });
    act(() => establishSession("owner-b", "b@example.test"));
    const readsAfterSessionChange = inflowsApi.getAll.mock.calls.length;
    await act(() => write.resolve({ status: 201, data: record }));
    expect(await outcome).toEqual({ refreshFailed: false, stale: true, record });
    expect(inflowsApi.getAll).toHaveBeenCalledTimes(readsAfterSessionChange);
  });

  it("returns the created record after the completed write and successful refresh", async () => {
    inflowsApi.getAll.mockResolvedValueOnce({ data: [] }).mockResolvedValueOnce({ data: [record] });
    const { result } = renderHook(() => useInflows());
    await waitFor(() => expect(result.current.loading).toBe(false));
    let outcome;
    await act(async () => { outcome = await result.current.createInflow({
      description: "Refund", amount: "12.35", date: "2026-09-01",
    }); });
    expect(outcome).toEqual({ refreshFailed: false, record });
    expect(result.current.inflows).toEqual([record]);
  });

  it.each([
    ["updateInflow", "update", [1, { id: 1, description: "Updated", amount: "13", date: "2026-09-02" }]],
    ["deleteInflow", "remove", [1]],
  ])("completes %s and refreshes", async (method, apiMethod, args) => {
    const { result } = renderHook(() => useInflows());
    await waitFor(() => expect(result.current.loading).toBe(false));
    let outcome;
    await act(async () => { outcome = await result.current[method](...args); });
    expect(inflowsApi[apiMethod]).toHaveBeenCalledWith(...args);
    expect(outcome).toEqual({ refreshFailed: false });
    expect(inflowsApi.getAll).toHaveBeenCalledTimes(2);
  });

  it("throws the original write failure and does not refresh", async () => {
    const failure = new Error("write unavailable");
    inflowsApi.create.mockRejectedValueOnce(failure);
    const { result } = renderHook(() => useInflows());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await expect(result.current.createInflow({})).rejects.toBe(failure); });
    expect(inflowsApi.getAll).toHaveBeenCalledTimes(1);
  });

  it("reports a completed write separately when its refresh fails", async () => {
    const failure = new Error("refresh unavailable");
    inflowsApi.getAll.mockResolvedValueOnce({ data: [] }).mockRejectedValueOnce(failure);
    const { result } = renderHook(() => useInflows());
    await waitFor(() => expect(result.current.loading).toBe(false));
    let outcome;
    await act(async () => { outcome = await result.current.updateInflow(1, { id: 1 }); });
    expect(outcome).toEqual({ refreshFailed: true });
    expect(result.current.error).toBe(failure);
  });

  it("reports refresh failure when a same-session read supersedes the post-write refresh", async () => {
    const { result } = renderHook(() => useInflows());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const postWriteRead = deferred();
    inflowsApi.getAll.mockReturnValueOnce(postWriteRead.promise)
      .mockResolvedValueOnce({ data: [{ ...record, id: 2 }] });
    let writeOutcome;
    act(() => { writeOutcome = result.current.createInflow({}); });
    await waitFor(() => expect(inflowsApi.getAll).toHaveBeenCalledTimes(2));

    let competingRefresh;
    act(() => { competingRefresh = result.current.refresh(); });
    await act(async () => { expect(await competingRefresh).toEqual({ stale: false }); });
    await act(() => postWriteRead.resolve({ data: [record] }));

    expect(await writeOutcome).toEqual({ refreshFailed: true, record });
    expect(result.current.inflows).toEqual([{ ...record, id: 2 }]);
  });

  it("returns stale when the session changes during the post-write refresh", async () => {
    const { result } = renderHook(() => useInflows());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const postWriteRead = deferred();
    const newSessionRead = deferred();
    inflowsApi.getAll.mockReturnValueOnce(postWriteRead.promise)
      .mockReturnValueOnce(newSessionRead.promise);
    let writeOutcome;
    act(() => { writeOutcome = result.current.createInflow({}); });
    await waitFor(() => expect(inflowsApi.getAll).toHaveBeenCalledTimes(2));

    act(() => establishSession("owner-b", "b@example.test"));
    await waitFor(() => expect(inflowsApi.getAll).toHaveBeenCalledTimes(3));
    await act(() => postWriteRead.resolve({ data: [record] }));

    expect(await writeOutcome).toEqual({ refreshFailed: false, stale: true, record });
    expect(result.current.inflows).toEqual([]);
    await act(() => newSessionRead.resolve({ data: [{ ...record, id: 2 }] }));
    expect(result.current.inflows).toEqual([{ ...record, id: 2 }]);
  });

  it("synchronously rejects an overlapping write without sending it", async () => {
    const pending = deferred();
    inflowsApi.create.mockReturnValueOnce(pending.promise);
    const { result } = renderHook(() => useInflows());
    await waitFor(() => expect(result.current.loading).toBe(false));
    let first;
    act(() => { first = result.current.createInflow({}); });
    await expect(result.current.deleteInflow(1)).rejects.toThrow("already in progress");
    expect(inflowsApi.remove).not.toHaveBeenCalled();
    await act(async () => {
      pending.resolve({ status: 201, data: record });
      await first;
    });
  });

  it("aborts an active read on unmount without leaking a completion", async () => {
    const request = deferred();
    inflowsApi.getAll.mockReturnValueOnce(request.promise);
    const { result, unmount } = renderHook(() => useInflows());
    const actions = result.current;
    const signal = inflowsApi.getAll.mock.calls[0][0];
    unmount();
    expect(signal.aborted).toBe(true);
    await act(() => request.resolve({ data: [record] }));
    await expect(actions.refresh()).resolves.toEqual({ stale: true });
  });
});
