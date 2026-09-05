import { useEffect, useRef, useState } from "react";
import { Plus, WalletCards } from "lucide-react";
import Card from "../../../shared/ui/Card";
import StatusMessage from "../../../shared/ui/StatusMessage";
import PaycheckEvidence from "../components/PaycheckEvidence";
import PaycheckForm from "../components/PaycheckForm";
import { usePaychecks } from "../hooks/usePaychecks";
import { formatAmount, formatDate, formatMoney, formatSchedule, formatWindow } from "../utils/formatPaychecks";

const LIFECYCLES = ["active", "paused", "ended"];
const LIFECYCLE_LABELS = { active: "Active", paused: "Paused", ended: "Ended" };
const STALE_CODES = new Set(["candidate_changed", "candidate_dismissed", "confirmation_conflict", "paycheck_not_found"]);

function CandidateCard({ candidate, dismissed, busy, editor, onReview, onCancel, onConfirm, onDecision }) {
  const name = candidate.normalizedDescriptionIdentity;
  const reviewing = editor?.mode === "confirm" && editor.key === candidate.fingerprint;
  const observed = candidate.observedAmount;
  return (
    <Card as="article" className="paycheck-card">
      <header className="paycheck-card__header">
        <div>
          <p className="paycheck-eyebrow">{dismissed ? "Dismissed candidate" : "Possible paycheck"}</p>
          <h3>{name}</h3>
          <p className="muted">{formatSchedule(candidate.schedule)}</p>
        </div>
        <div className="paycheck-card__amount">
          <span>Observed deposits</span>
          <strong>{observed.mode === "fixed" ? formatMoney(observed.fixedAmount) : `${formatMoney(observed.minimumAmount)}–${formatMoney(observed.maximumAmount)}`}</strong>
        </div>
      </header>
      <dl className="paycheck-facts">
        <div><dt>Evidence</dt><dd>{candidate.occurrenceCount} deposits · {formatDate(candidate.coveredFrom)}–{formatDate(candidate.coveredTo)}</dd></div>
        <div><dt>Observed timing</dt><dd>{formatWindow(candidate.windowBeforeDays, candidate.windowAfterDays)}</dd></div>
        <div><dt>Observed amounts</dt><dd>{observed.mode === "fixed" ? "The same amount in each deposit" : `Variable · lower median ${formatMoney(observed.lowerMedianAmount)}. This history is not an accepted range.`}</dd></div>
      </dl>
      <PaycheckEvidence evidence={candidate.evidence} />
      {reviewing ? (
        <PaycheckForm key={candidate.fingerprint} mode="confirm" model={editor.model} busy={busy} onSubmit={onConfirm} onCancel={onCancel} />
      ) : (
        <div className="inline-actions paycheck-actions">
          {dismissed ? (
            <button type="button" disabled={busy} onClick={() => onDecision(candidate, true)} aria-label={`Reconsider ${name}`}>Reconsider</button>
          ) : (
            <>
              <button type="button" disabled={busy} onClick={(event) => onReview(candidate, event.currentTarget)} aria-label={`Review and confirm ${name}`}>Review and confirm</button>
              <button type="button" className="button-ghost" disabled={busy} onClick={() => onDecision(candidate, false)} aria-label={`Dismiss ${name}`}>Dismiss</button>
            </>
          )}
        </div>
      )}
    </Card>
  );
}

function ProfileCard({ profile, busy, editor, onEdit, onCancel, onSave, onLifecycle }) {
  const [ending, setEnding] = useState(false);
  const endTrigger = useRef(null);
  const endConfirm = useRef(null);
  const editing = editor?.mode === "edit" && editor.key === profile.id;
  const projection = profile.lifecycle === "active" ? profile.nextProjection : null;

  useEffect(() => {
    if (ending) endConfirm.current?.focus();
  }, [ending]);

  async function end() {
    const result = await onLifecycle(profile.id, "ended");
    if (result?.ok) setEnding(false);
  }

  return (
    <Card as="article" className={`paycheck-card paycheck-card--${profile.lifecycle}`}>
      <header className="paycheck-card__header">
        <div>
          <p className="paycheck-eyebrow">{LIFECYCLE_LABELS[profile.lifecycle]} · {profile.source === "manual" ? "Entered by you" : "Confirmed from deposits"}</p>
          <h3>{profile.displayName}</h3>
          <p className="muted">{formatSchedule(profile.schedule)}</p>
        </div>
        <div className="paycheck-card__amount"><span>Accepted expectation</span><strong>{formatAmount(profile.amount)}</strong></div>
      </header>
      {projection ? (
        <div className="paycheck-projection">
          <p className="paycheck-eyebrow">Next expected paycheck</p>
          <p className="paycheck-projection__date">{formatDate(projection.earliestExpectedDate)}{projection.earliestExpectedDate !== projection.latestExpectedDate && `–${formatDate(projection.latestExpectedDate)}`}</p>
          <p>{formatAmount(projection.amount)} · schedule date {formatDate(projection.anchor)}</p>
          <p className="muted">Expected based on your confirmed pattern; payment is not guaranteed. Evaluated {formatDate(projection.evaluatedOn)}.</p>
        </div>
      ) : (
        <p className="paycheck-inactive">{profile.lifecycle === "active" ? "No expected projection is available." : `${LIFECYCLE_LABELS[profile.lifecycle]} profiles have no active payment projection.`}</p>
      )}
      <dl className="paycheck-facts">
        <div><dt>Accepted timing window</dt><dd>{formatWindow(profile.windowBeforeDays, profile.windowAfterDays)}</dd></div>
        <div><dt>Confirmation evidence</dt><dd>{profile.evidence.length} linked deposit(s)</dd></div>
      </dl>
      <PaycheckEvidence evidence={profile.evidence} confirmed />
      {editing ? (
        <PaycheckForm key={profile.id} mode="edit" model={editor.model} busy={busy} onSubmit={(payload) => onSave(profile.id, payload)} onCancel={onCancel} />
      ) : (
        <>
          <p className="muted paycheck-schedule-note">To change this schedule, end this profile and create or confirm a replacement. Linked evidence stays with this profile.</p>
          {ending ? (
            <div className="paycheck-end-confirmation" role="group" aria-label={`End ${profile.displayName}`}>
              <p>End {profile.displayName}? Its projection will stop. The profile and linked evidence will remain, and you can reactivate it.</p>
              <div className="inline-actions">
                <button ref={endConfirm} type="button" disabled={busy} onClick={end}>Confirm end</button>
                <button type="button" className="button-ghost" disabled={busy} onClick={() => { setEnding(false); requestAnimationFrame(() => endTrigger.current?.focus()); }}>Cancel ending</button>
              </div>
            </div>
          ) : (
            <div className="inline-actions paycheck-actions">
              <button type="button" className="button-ghost" disabled={busy} onClick={(event) => onEdit(profile, event.currentTarget)} aria-label={`Edit ${profile.displayName}`}>Edit expectation</button>
              {profile.lifecycle !== "active" && <button type="button" disabled={busy} onClick={() => onLifecycle(profile.id, "active")} aria-label={`Reactivate ${profile.displayName}`}>Reactivate</button>}
              {profile.lifecycle !== "paused" && <button type="button" className="button-ghost" disabled={busy} onClick={() => onLifecycle(profile.id, "paused")} aria-label={`Pause ${profile.displayName}`}>Pause</button>}
              {profile.lifecycle !== "ended" && <button ref={endTrigger} type="button" className="button-ghost" disabled={busy} onClick={() => setEnding(true)} aria-label={`End ${profile.displayName}`}>End</button>}
            </div>
          )}
        </>
      )}
    </Card>
  );
}

export default function PaychecksPage() {
  const state = usePaychecks();
  const [editor, setEditor] = useState(null);
  const editorTrigger = useRef(null);
  const editorLocation = useRef(null);
  const profilesHeading = useRef(null);
  const candidatesHeading = useRef(null);
  const dismissedHeading = useRef(null);
  const feedback = useRef(null);
  const busy = Boolean(state.busyKey) || state.loading || state.refreshing;
  const hasContent = state.paychecks.length + state.candidates.length + state.dismissedCandidates.length > 0;
  const showContent = hasContent || (!state.loading && !state.loadError);

  function focus(ref) {
    requestAnimationFrame(() => ref.current?.focus());
  }

  function openEditor(mode, model, trigger) {
    editorTrigger.current = trigger;
    editorLocation.current = { container: trigger.closest("article"), label: trigger.getAttribute("aria-label") };
    state.clearMessages();
    setEditor({ mode, model, key: mode === "confirm" ? model.fingerprint : model?.id ?? "manual" });
  }

  function cancelEditor() {
    setEditor(null);
    requestAnimationFrame(() => {
      const original = editorTrigger.current;
      const location = editorLocation.current;
      const replacement = Array.from(location?.container?.querySelectorAll("button[aria-label]") ?? [])
        .find((button) => button.getAttribute("aria-label") === location.label);
      const target = original?.isConnected ? original : replacement?.isConnected ? replacement : profilesHeading.current;
      target?.focus();
    });
  }

  async function submit(operation) {
    const result = await operation();
    if (result?.ok) {
      setEditor(null);
      focus(profilesHeading);
    } else if (STALE_CODES.has(result?.code)) {
      setEditor(null);
      focus(feedback);
    } else {
      focus(feedback);
    }
    return result;
  }

  async function decide(candidate, reconsider) {
    const tuple = { algorithmVersion: candidate.algorithmVersion, cadence: candidate.schedule.cadence, fingerprint: candidate.fingerprint };
    const result = await (reconsider ? state.reconsiderCandidate(tuple) : state.dismissCandidate(tuple));
    focus(result?.ok ? (reconsider ? candidatesHeading : dismissedHeading) : feedback);
  }

  async function lifecycle(id, value) {
    const result = await state.updateLifecycle(id, value);
    focus(result?.ok ? profilesHeading : feedback);
    return result;
  }

  return (
    <div className="container paychecks-page">
      <header className="page-header">
        <div>
          <p className="page-header__eyebrow">Plan around your pay</p>
          <h1>Paychecks</h1>
          <p className="muted">Review recurring deposits and save the paycheck expectations you choose.</p>
        </div>
        <button type="button" className="paycheck-create" disabled={busy || Boolean(state.loadError) || state.uncertainCreate} onClick={(event) => openEditor("manual", null, event.currentTarget)}>
          <Plus size={18} aria-hidden="true" /> Add paycheck manually
        </button>
      </header>

      <div ref={feedback} tabIndex={-1} className="paycheck-feedback">
        {state.loadError && <StatusMessage tone="danger">{state.loadError}</StatusMessage>}
        {state.actionError && <StatusMessage tone="danger">{state.actionError}</StatusMessage>}
        {state.notice && <StatusMessage tone="success">{state.notice}</StatusMessage>}
        {(state.loadError || state.actionError) && <button type="button" className="button-ghost" disabled={busy} onClick={() => state.refresh()}>Refresh paychecks</button>}
        {state.uncertainCreate && <button type="button" className="button-ghost" disabled={busy} onClick={state.acknowledgeUncertainCreate}>I checked my profiles; allow another attempt</button>}
        {state.busyKey && <StatusMessage>Saving your decision…</StatusMessage>}
        {state.refreshing && <StatusMessage>Refreshing paychecks…</StatusMessage>}
      </div>

      {editor?.mode === "manual" && (
        <section className="paycheck-manual" aria-labelledby="manual-paycheck-heading">
          <h2 id="manual-paycheck-heading">Add a paycheck expectation</h2>
          <p className="muted">This is your own expectation, not employer-verified. It will be active without attaching any deposit evidence.</p>
          <PaycheckForm key="manual" mode="manual" busy={busy} submitDisabled={state.uncertainCreate} onSubmit={(payload) => submit(() => state.createPaycheck(payload))} onCancel={cancelEditor} />
        </section>
      )}

      {state.loading && <StatusMessage>Loading paychecks…</StatusMessage>}
      {showContent && (
        <>
          <section className="paycheck-section" aria-labelledby="paycheck-profiles-heading" aria-busy={Boolean(state.busyKey)}>
            <header className="paycheck-section__header">
              <div><h2 id="paycheck-profiles-heading" ref={profilesHeading} tabIndex={-1}>Your paychecks</h2><p className="muted">Saved expectations, kept separate from unconfirmed deposit patterns.</p></div>
              {state.paychecksEvaluatedOn && <p className="paycheck-evaluated">Evaluated {formatDate(state.paychecksEvaluatedOn)}</p>}
            </header>
            {state.paychecks.length === 0 ? (
              <div className="paycheck-empty"><WalletCards size={28} aria-hidden="true" /><h3>No paycheck profiles yet</h3><p>Review a candidate below or add an expectation manually. A deposit alone is not a confirmed paycheck.</p></div>
            ) : LIFECYCLES.map((lifecycleValue) => {
              const profiles = state.paychecks.filter((profile) => profile.lifecycle === lifecycleValue);
              return profiles.length > 0 && (
                <div key={lifecycleValue} className="paycheck-group" role="group" aria-label={`${LIFECYCLE_LABELS[lifecycleValue]} paychecks`}>
                  <p className="paycheck-group__label">{LIFECYCLE_LABELS[lifecycleValue]} <span>{profiles.length}</span></p>
                  {profiles.map((profile) => <ProfileCard key={profile.id} profile={profile} busy={busy} editor={editor} onEdit={(model, trigger) => openEditor("edit", model, trigger)} onCancel={cancelEditor} onSave={(id, payload) => submit(() => state.updatePaycheck(id, payload))} onLifecycle={lifecycle} />)}
                </div>
              );
            })}
          </section>

          <section className="paycheck-section" aria-labelledby="paycheck-candidates-heading">
            <header className="paycheck-section__header">
              <div><h2 id="paycheck-candidates-heading" ref={candidatesHeading} tabIndex={-1}>Candidates to review</h2><p className="muted">These deposits may form a paycheck pattern. Review the evidence before accepting an expectation.</p></div>
              {state.candidatesEvaluatedOn && <p className="paycheck-evaluated">Evaluated {formatDate(state.candidatesEvaluatedOn)}</p>}
            </header>
            {state.candidates.length === 0 ? <p className="paycheck-empty">No paycheck candidates need review. You can still add a manual expectation.</p> : state.candidates.map((candidate) => <CandidateCard key={candidate.fingerprint} candidate={candidate} busy={busy} editor={editor} onReview={(model, trigger) => openEditor("confirm", model, trigger)} onCancel={cancelEditor} onConfirm={(payload) => submit(() => state.confirmCandidate(payload))} onDecision={decide} />)}
          </section>

          <section className="paycheck-section" aria-labelledby="paycheck-dismissed-heading">
            <header><h2 id="paycheck-dismissed-heading" ref={dismissedHeading} tabIndex={-1}>Dismissed candidates</h2><p className="muted">Dismissal applies to the exact evidence reviewed. Reconsider a candidate to review it again.</p></header>
            {state.dismissedCandidates.length === 0 ? <p className="muted">No dismissed candidates.</p> : state.dismissedCandidates.map((candidate) => <CandidateCard key={candidate.fingerprint} candidate={candidate} dismissed busy={busy} onDecision={decide} />)}
          </section>
        </>
      )}
    </div>
  );
}
