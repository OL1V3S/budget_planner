import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PaychecksPage from "./PaychecksPage";
import { paychecksApi } from "../api/paychecksApi";
import { makeCandidate, makeCandidateResponse, makePaycheck, makePaychecksResponse } from "../test/paycheckFixtures";

vi.mock("../api/paychecksApi", () => ({ paychecksApi: {
  getCandidates: vi.fn(), getPaychecks: vi.fn(), confirmCandidate: vi.fn(),
  dismissCandidate: vi.fn(), reconsiderCandidate: vi.fn(), createPaycheck: vi.fn(),
  updatePaycheck: vi.fn(), updateLifecycle: vi.fn(),
} }));
const response = (data) => ({ data });
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const card = (name) => screen.getByRole("heading", { name, exact: true }).closest("article");

function loadState({ candidates = [makeCandidate()], dismissedCandidates = [], paychecks = [makePaycheck()] } = {}) {
  paychecksApi.getCandidates.mockResolvedValue(response(makeCandidateResponse({ candidates, dismissedCandidates })));
  paychecksApi.getPaychecks.mockResolvedValue(response(makePaychecksResponse({ paychecks })));
}
async function renderPage() {
  render(<PaychecksPage />);
  await screen.findByRole("heading", { name: "Your paychecks" });
}
async function fillManual(user, name = "Manual salary") {
  await user.click(screen.getByRole("button", { name: "Add paycheck manually" }));
  const form = screen.getByRole("form", { name: "Create paycheck" });
  await user.type(within(form).getByLabelText("Display name"), name);
  await user.type(within(form).getByLabelText("Monthly anchor day"), "10");
  await user.type(within(form).getByLabelText("Fixed amount"), "2500.00");
  return form;
}

beforeEach(() => {
  vi.resetAllMocks();
  loadState();
  paychecksApi.confirmCandidate.mockResolvedValue(response({ paycheck: makePaycheck(), alreadyConfirmed: false }));
  paychecksApi.dismissCandidate.mockResolvedValue(response(null));
  paychecksApi.reconsiderCandidate.mockResolvedValue(response(null));
  paychecksApi.createPaycheck.mockResolvedValue(response(makePaycheck({ source: "manual", origin: null, evidence: [] })));
  paychecksApi.updatePaycheck.mockResolvedValue(response(makePaycheck()));
  paychecksApi.updateLifecycle.mockResolvedValue(response(makePaycheck()));
});

describe("Paychecks page", () => {
  it("separates lifecycle/candidate groups, exact evidence and evaluation dates; projects only active profiles", async () => {
    const active = makePaycheck();
    active.evidence[0].editedSinceConfirmation = true;
    const paused = makePaycheck({ id: "22222222-2222-2222-2222-222222222222", displayName: "Paused pay", lifecycle: "paused" });
    const ended = makePaycheck({ id: "33333333-3333-3333-3333-333333333333", displayName: "Ended pay", lifecycle: "ended", nextProjection: null });
    const dismissed = makeCandidate({ fingerprint: "d".repeat(64), normalizedDescriptionIdentity: "old payroll" });
    loadState({ paychecks: [active, paused, ended], dismissedCandidates: [dismissed] });
    paychecksApi.getCandidates.mockResolvedValue(response(makeCandidateResponse({ evaluatedOn: "2026-07-13", dismissedCandidates: [dismissed] })));
    await renderPage();
    expect(screen.getByText("Evaluated Jul 12, 2026")).toBeInTheDocument();
    expect(screen.getByText("Evaluated Jul 13, 2026")).toBeInTheDocument();
    for (const lifecycle of ["Active", "Paused", "Ended"]) expect(screen.getByRole("group", { name: `${lifecycle} paychecks` })).toBeInTheDocument();
    expect(screen.getAllByText(/Expected based on your confirmed pattern; payment is not guaranteed/)).toHaveLength(1);
    expect(screen.getByText("Paused profiles have no active payment projection.")).toBeInTheDocument();
    expect(screen.getByText("Ended profiles have no active payment projection.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "old payroll" })).toBeInTheDocument();
    const profile = within(card("Acme Payroll"));
    await userEvent.setup().click(profile.getByText("Linked deposit evidence (3)"));
    expect(profile.getByText(/Edited since confirmation\. The saved expectation is unchanged/)).toBeVisible();
    expect(profile.getAllByRole("listitem")).toHaveLength(3);
    expect(profile.getByText(/May 10, 2026/, { selector: "time" })).toHaveAttribute("datetime", "2026-05-10");
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
  });

  it("shows initial loading and durable load error, then retries to intentional empty states", async () => {
    const pending = deferred();
    paychecksApi.getCandidates.mockReturnValue(pending.promise);
    render(<PaychecksPage />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading paychecks");
    await act(async () => pending.reject(new Error("offline")));
    expect(await screen.findByRole("alert")).toHaveTextContent("Paychecks could not be loaded");
    loadState({ candidates: [], dismissedCandidates: [], paychecks: [] });
    await userEvent.setup().click(screen.getByRole("button", { name: "Refresh paychecks" }));
    expect(await screen.findByText("No paycheck profiles yet")).toBeInTheDocument();
    expect(screen.getByText(/No paycheck candidates need review/)).toBeInTheDocument();
    expect(screen.getByText("No dismissed candidates.")).toBeInTheDocument();
  });

  it.each([true, false])("handles the candidates/profiles-only empty combination (candidates=%s)", async (candidatesOnly) => {
    loadState({ candidates: candidatesOnly ? [makeCandidate()] : [], paychecks: candidatesOnly ? [] : [makePaycheck()] });
    await renderPage();
    expect(Boolean(screen.queryByText("No paycheck profiles yet"))).toBe(candidatesOnly);
    expect(Boolean(screen.queryByText(/No paycheck candidates need review/))).toBe(!candidatesOnly);
  });

  it("requires explicit fixed confirmation and sends the exact candidate schedule and accepted decimal", async () => {
    const user = userEvent.setup();
    await renderPage();
    await user.click(within(card("acme payroll")).getByRole("button", { name: "Review and confirm acme payroll" }));
    const form = within(screen.getByRole("form", { name: "Confirm paycheck" }));
    expect(form.queryByLabelText("Cadence")).not.toBeInTheDocument();
    expect(form.getByText("Monthly, day 10")).toBeInTheDocument();
    await user.clear(form.getByLabelText("Display name"));
    await user.type(form.getByLabelText("Display name"), "Acme salary");
    await user.clear(form.getByLabelText("Fixed amount"));
    await user.type(form.getByLabelText("Fixed amount"), "2500.10");
    loadState({ candidates: [], paychecks: [makePaycheck({ displayName: "Acme salary" })] });
    await user.click(form.getByRole("button", { name: "Confirm paycheck" }));
    expect(paychecksApi.confirmCandidate).toHaveBeenCalledExactlyOnceWith({
      algorithmVersion: "paycheck-candidate-v1", fingerprint: makeCandidate().fingerprint,
      displayName: "Acme salary", schedule: makeCandidate().schedule, windowBeforeDays: 1, windowAfterDays: 1,
      amount: { mode: "fixed", fixedAmount: "2500.10", minimumAmount: null, maximumAmount: null },
    });
    expect(await screen.findByRole("heading", { name: "Acme salary" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("heading", { name: "Your paychecks" })).toHaveFocus());
  });

  it("requires typed bounds for variable candidates and refreshes exact dismissal/reconsideration decisions", async () => {
    const user = userEvent.setup();
    const variable = makeCandidate({ fingerprint: "c".repeat(64), observedAmount: { mode: "variable", fixedAmount: null, minimumAmount: 1800, maximumAmount: 2600, lowerMedianAmount: 2100 } });
    const other = makeCandidate({ fingerprint: "d".repeat(64), normalizedDescriptionIdentity: "other payroll" });
    loadState({ candidates: [variable, other], paychecks: [] });
    await renderPage();
    await user.click(within(card("acme payroll")).getByRole("button", { name: "Review and confirm acme payroll" }));
    const form = within(screen.getByRole("form", { name: "Confirm paycheck" }));
    expect(form.getByLabelText("Minimum amount")).toHaveValue("");
    expect(form.getByLabelText("Maximum amount")).toHaveValue("");
    await user.click(form.getByRole("button", { name: "Confirm paycheck" }));
    expect(paychecksApi.confirmCandidate).not.toHaveBeenCalled();
    expect(form.getByRole("alert")).toHaveTextContent("Check the highlighted fields");
    await user.type(form.getByLabelText("Minimum amount"), "1800.00");
    await user.type(form.getByLabelText("Maximum amount"), "2600.25");
    loadState({ candidates: [other] });
    await user.click(form.getByRole("button", { name: "Confirm paycheck" }));
    expect(paychecksApi.confirmCandidate).toHaveBeenCalledWith(expect.objectContaining({ amount: { mode: "range", fixedAmount: null, minimumAmount: "1800.00", maximumAmount: "2600.25" } }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Dismiss other payroll" })).toBeEnabled());
    loadState({ candidates: [], dismissedCandidates: [other] });
    await user.click(screen.getByRole("button", { name: "Dismiss other payroll" }));
    await screen.findByRole("button", { name: "Reconsider other payroll" });
    const tuple = { algorithmVersion: other.algorithmVersion, cadence: "monthly", fingerprint: other.fingerprint };
    expect(paychecksApi.dismissCandidate).toHaveBeenCalledExactlyOnceWith(tuple);
    loadState({ candidates: [other] });
    await user.click(screen.getByRole("button", { name: "Reconsider other payroll" }));
    expect(paychecksApi.reconsiderCandidate).toHaveBeenCalledExactlyOnceWith(tuple);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Candidates to review" })).toHaveFocus());
  });

  it("keeps a known manual creation successful when refresh fails, without offering repeat submission", async () => {
    const user = userEvent.setup();
    await renderPage();
    const form = await fillManual(user);
    paychecksApi.getCandidates.mockRejectedValue(new Error("refresh failed"));
    await user.click(within(form).getByRole("button", { name: "Create paycheck" }));
    expect(paychecksApi.createPaycheck).toHaveBeenCalledExactlyOnceWith({
      displayName: "Manual salary", schedule: makeCandidate().schedule, windowBeforeDays: 0, windowAfterDays: 0,
      amount: { mode: "fixed", fixedAmount: "2500.00", minimumAmount: null, maximumAmount: null },
    });
    expect(await screen.findByRole("alert")).toHaveTextContent("Paychecks could not be loaded");
    expect(screen.getByRole("status")).toHaveTextContent("Paycheck created");
    expect(screen.queryByRole("form", { name: "Create paycheck" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add paycheck manually" })).toBeDisabled();
  });

  it("disables conflicting actions while saving and protects an uncertain manual result until checked", async () => {
    const user = userEvent.setup();
    const pending = deferred();
    paychecksApi.createPaycheck.mockReturnValue(pending.promise);
    await renderPage();
    const form = await fillManual(user);
    await user.click(within(form).getByRole("button", { name: "Create paycheck" }));
    expect(screen.getByRole("button", { name: "Dismiss acme payroll" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Edit Acme Payroll" })).toBeDisabled();
    await act(async () => pending.reject(new Error("network lost")));
    expect(await screen.findByRole("alert")).toHaveTextContent("could not confirm whether the paycheck was created");
    expect(within(form).getByRole("button", { name: "Create paycheck" })).toBeDisabled();
    expect(within(form).getByRole("button", { name: "Cancel" })).toBeEnabled();
    expect(paychecksApi.createPaycheck).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Refresh paychecks" }));
    await waitFor(() => expect(within(form).getByRole("button", { name: "Create paycheck" })).toBeEnabled());
    expect(screen.getByRole("status")).toHaveTextContent("Check the saved profiles");
    expect(paychecksApi.createPaycheck).toHaveBeenCalledTimes(1);
  });

  it("closes a stale review with a visible conflict and requires explicit review of replacement evidence", async () => {
    const user = userEvent.setup();
    await renderPage();
    await user.click(screen.getByRole("button", { name: "Review and confirm acme payroll" }));
    paychecksApi.confirmCandidate.mockRejectedValue({ response: { status: 409, data: { code: "candidate_changed" } } });
    loadState({ candidates: [makeCandidate({ fingerprint: "e".repeat(64) })] });
    await user.click(screen.getByRole("button", { name: "Confirm paycheck" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Review the latest evidence");
    await waitFor(() => expect(screen.queryByRole("form", { name: "Confirm paycheck" })).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Review and confirm acme payroll" })).toBeEnabled();
    expect(paychecksApi.confirmCandidate).toHaveBeenCalledTimes(1);
  });

  it("preserves edit restrictions and restores focus for cancel, then moves profiles through lifecycle groups", async () => {
    const user = userEvent.setup();
    await renderPage();
    await user.click(screen.getByRole("button", { name: "Edit Acme Payroll" }));
    expect(screen.getByLabelText("Display name")).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Edit Acme Payroll" })).toHaveFocus());
    await user.click(screen.getByRole("button", { name: "Edit Acme Payroll" }));
    await user.clear(screen.getByLabelText("Display name"));
    await user.type(screen.getByLabelText("Display name"), "Renamed payroll");
    const profile = makePaycheck({ displayName: "Renamed payroll" });
    loadState({ paychecks: [profile] });
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(paychecksApi.updatePaycheck).toHaveBeenCalledExactlyOnceWith(profile.id, {
      displayName: "Renamed payroll", windowBeforeDays: 1, windowAfterDays: 1,
      amount: { mode: "fixed", fixedAmount: "2500", minimumAmount: null, maximumAmount: null },
    });
    await screen.findByRole("button", { name: "Pause Renamed payroll" });
    loadState({ paychecks: [{ ...profile, lifecycle: "paused", nextProjection: null }] });
    await user.click(screen.getByRole("button", { name: "Pause Renamed payroll" }));
    expect(await screen.findByRole("group", { name: "Paused paychecks" })).toHaveTextContent("Renamed payroll");
    expect(paychecksApi.updateLifecycle).toHaveBeenLastCalledWith(profile.id, "paused");
    await user.click(screen.getByRole("button", { name: "End Renamed payroll" }));
    expect(screen.getByRole("button", { name: "Confirm end" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Cancel ending" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "End Renamed payroll" })).toHaveFocus());
    await user.click(screen.getByRole("button", { name: "End Renamed payroll" }));
    loadState({ paychecks: [{ ...profile, lifecycle: "ended", nextProjection: null }] });
    await user.click(screen.getByRole("button", { name: "Confirm end" }));
    expect(await screen.findByRole("group", { name: "Ended paychecks" })).toHaveTextContent("Renamed payroll");
    expect(paychecksApi.updateLifecycle).toHaveBeenLastCalledWith(profile.id, "ended");
    loadState({ paychecks: [profile] });
    await user.click(screen.getByRole("button", { name: "Reactivate Renamed payroll" }));
    expect(await screen.findByRole("group", { name: "Active paychecks" })).toHaveTextContent("Renamed payroll");
    expect(paychecksApi.updateLifecycle).toHaveBeenLastCalledWith(profile.id, "active");
  });
});
