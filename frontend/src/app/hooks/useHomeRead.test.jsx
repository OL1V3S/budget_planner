import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearSession, establishSession } from "../../shared/auth/session";
import { useHomeRead } from "./useHomeRead";

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

describe("Home read lifecycle", () => {
  beforeEach(() => {
    establishSession("owner-a", "a@example.test");
  });

  afterEach(() => {
    clearSession();
  });

  it("keeps data unavailable while loading and preserves a successful empty array", async () => {
    const request = deferred();
    const load = vi.fn(() => request.promise);
    const { result } = renderHook(() => useHomeRead(load));

    expect(result.current).toMatchObject({ data: null, loading: true, error: false });
    expect(load).toHaveBeenCalledWith(null);

    await act(() => request.resolve({ data: [] }));

    expect(result.current).toMatchObject({ data: [], loading: false, error: false });
  });

  it("reports a failed read without substituting empty data", async () => {
    const load = vi.fn().mockRejectedValue(new Error("unavailable"));
    const { result } = renderHook(() => useHomeRead(load));

    await waitFor(() => expect(result.current.error).toBe(true));

    expect(result.current).toMatchObject({ data: null, loading: false });
  });

  it("clears stale success and failure state synchronously when retrying", async () => {
    const retry = deferred();
    const load = vi.fn()
      .mockResolvedValueOnce({ data: ["old"] })
      .mockRejectedValueOnce(new Error("failed"))
      .mockReturnValueOnce(retry.promise);
    const { result } = renderHook(() => useHomeRead(load));

    await waitFor(() => expect(result.current.data).toEqual(["old"]));

    act(() => result.current.refresh());
    expect(result.current).toMatchObject({ data: null, loading: true, error: false });
    await waitFor(() => expect(result.current.error).toBe(true));

    act(() => result.current.refresh());
    expect(result.current).toMatchObject({ data: null, loading: true, error: false });

    await act(() => retry.resolve({ data: ["current"] }));
    expect(result.current).toMatchObject({ data: ["current"], loading: false, error: false });
  });

  it("keeps the latest retry when an older request settles last", async () => {
    const old = deferred();
    const recent = deferred();
    const load = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(recent.promise);
    const { result } = renderHook(() => useHomeRead(load));

    act(() => result.current.refresh());
    await act(() => recent.resolve({ data: ["current"] }));
    await act(() => old.resolve({ data: ["stale"] }));

    expect(result.current.data).toEqual(["current"]);
  });

  it("hides the prior result when the key changes and ignores its late completion", async () => {
    const old = deferred();
    const recent = deferred();
    const load = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(recent.promise);
    const { result, rerender } = renderHook(
      ({ key }) => useHomeRead(load, key),
      { initialProps: { key: "2026-08" } },
    );

    rerender({ key: "2026-07" });
    expect(result.current).toMatchObject({ data: null, loading: true, error: false });
    expect(load).toHaveBeenLastCalledWith("2026-07");

    await act(() => recent.resolve({ data: ["July"] }));
    await act(() => old.resolve({ data: ["August"] }));
    expect(result.current.data).toEqual(["July"]);
  });

  it("hides the prior result when the loader changes and ignores its late completion", async () => {
    const old = deferred();
    const recent = deferred();
    const oldLoad = vi.fn(() => old.promise);
    const recentLoad = vi.fn(() => recent.promise);
    const { result, rerender } = renderHook(
      ({ load }) => useHomeRead(load, "month"),
      { initialProps: { load: oldLoad } },
    );

    rerender({ load: recentLoad });
    expect(result.current).toMatchObject({ data: null, loading: true, error: false });

    await act(() => recent.resolve({ data: ["current loader"] }));
    await act(() => old.resolve({ data: ["old loader"] }));
    expect(result.current.data).toEqual(["current loader"]);
  });

  it("clears owner data and ignores completion from an older session generation", async () => {
    const old = deferred();
    const recent = deferred();
    const load = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(recent.promise);
    const { result } = renderHook(() => useHomeRead(load));

    act(() => establishSession("owner-a", "a@example.test"));
    expect(result.current).toMatchObject({ data: null, loading: true, error: false });

    await act(() => old.resolve({ data: ["owner a"] }));
    expect(result.current.data).toBeNull();

    await act(() => recent.resolve({ data: ["current session"] }));
    expect(result.current.data).toEqual(["current session"]);
  });

  it("does not request while logged out", () => {
    clearSession();
    const load = vi.fn();
    const { result } = renderHook(() => useHomeRead(load));

    expect(result.current).toMatchObject({ data: null, loading: false, error: false });
    expect(load).not.toHaveBeenCalled();
  });

  it("drops a prior session result on logout without another request", async () => {
    const load = vi.fn().mockResolvedValue({ data: ["private"] });
    const { result } = renderHook(() => useHomeRead(load));
    await waitFor(() => expect(result.current.data).toEqual(["private"]));

    act(() => clearSession());

    expect(result.current).toMatchObject({ data: null, loading: false, error: false });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("ignores completion after unmount", async () => {
    const request = deferred();
    const load = vi.fn(() => request.promise);
    const { unmount } = renderHook(() => useHomeRead(load));

    unmount();
    await act(() => request.resolve({ data: ["late"] }));

    expect(load).toHaveBeenCalledTimes(1);
  });
});
