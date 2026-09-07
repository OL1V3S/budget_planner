import { useEffect, useRef, useState } from "react";
import { Plus, WalletCards } from "lucide-react";
import Card from "../../../shared/ui/Card";
import StatusMessage from "../../../shared/ui/StatusMessage";
import PaycheckEvidence from "../components/PaycheckEvidence";
import PaycheckForm from "../components/PaycheckForm";
import { usePaychecks } from "../hooks/usePaychecks";
import { cadenceLabel, formatAmount, formatDate, formatMoney, formatSchedule, formatWindow } from "../utils/formatPaychecks";

const LIFECYCLE_LABELS = { active: "Active", paused: "Paused", ended: "Ended" };
const STALE_CODES = new Set(["candidate_changed", "candidate_dismissed", "confirmation_conflict", "paycheck_not_found"]);

function CandidateCard({ candidate, dismissed, evaluatedOn, busy, actionsDisabled, editor, onReview, onCancel, onConfirm, onDecision }) {
  const name = candidate.normalizedDescriptionIdentity;
  const reviewing = editor?.mode === "confirm" && editor.key === candidate.fingerprint;
  const observed = candidate.observedAmount;
  return (
    <Card as="article" className="paycheck-card">
      <header className="paycheck-card__header">
        <div>
          {dismissed && <p className="paycheck-status">Dismissed possible paycheck</p>}
          <h3>{name}</h3>
          <p className="muted">{cadenceLabel(candidate.schedule.cadence)}</p>
        </div>
        <div className="paycheck-card__amount">
          <span>Observed deposits</span>
          <strong>{observed.mode === "fixed" ? formatMoney(observed.fixedAmount) : `${formatMoney(observed.minimumAmount)}–${formatMoney(observed.maximumAmount)}`}</strong>
        </div>
      </header>
      <p className="paycheck-candidate-count">Based on {candidate.occurrenceCount} deposits{observed.mode !== "fixed" && ". Observed history, not an accepted range."}</p>
      <details className="paycheck-details">
        <summary aria-label={`Details for ${name}`}>Details</summary>
        <dl className="paycheck-facts">
          <div><dt>Schedule</dt><dd>{formatSchedule(candidate.schedule)}</dd></div>
          <div><dt>Records covered</dt><dd>{formatDate(candidate.coveredFrom)}–{formatDate(candidate.coveredTo)}</dd></div>
          <div><dt>Observed timing</dt><dd>{formatWindow(candidate.windowBeforeDays, candidate.windowAfterDays)}</dd></div>
          <div><dt>Observed amounts</dt><dd>{observed.mode === "fixed" ? "The same amount in each deposit" : `Variable · lower median ${formatMoney(observed.lowerMedianAmount)}. This history is not an accepted range.`}</dd></div>
          {evaluatedOn && <div><dt>Evaluated</dt><dd>{formatDate(evaluatedOn)}</dd></div>}
          <div><dt>Detection details</dt><dd>{candidate.algorithmVersion}</dd></div>
        </dl>
        <PaycheckEvidence evidence={candidate.evidence} disclosure={false} />
      </details>
      {reviewing ? (
        <PaycheckForm key={candidate.fingerprint} mode="confirm" model={editor.model} busy={busy} onSubmit={onConfirm} onCancel={onCancel} />
      ) : (
        <div className="inline-actions paycheck-actions">
          {dismissed ? (
            <button type="button" disabled={actionsDisabled} onClick={() => onDecision(candidate, true)} aria-label={`Reconsider ${name}`}>Reconsider</button>
          ) : (
            <>
              <button type="button" disabled={actionsDisabled} onClick={(event) => onReview(candidate, event.currentTarget)} aria-label={`Review and confirm ${name}`}>Review and confirm</button>
              <button type="button" className="button-ghost" disabled={actionsDisabled} onClick={() => onDecision(candidate, false)} aria-label={`Dismiss ${name}`}>Dismiss</button>
            </>
          )}
        </div>
      )}
    </Card>
  );
}

function ProfileCard({ profile, evaluatedOn, busy, actionsDisabled, ending, onEndingChange, editor, onEdit, onCancel, onSave, onLifecycle }) {
  const detailsRef = useRef(null);
  const endTrigger = useRef(null);
  const endConfirm = useRef(null);
  const editing = editor?.mode === "edit" && editor.key === profile.id;
  const projection = profile.lifecycle === "active" ? profile.nextProjection : null;

  useEffect(() => {
    if (ending) endConfirm.current?.focus();
  }, [ending]);

  async function end() {
    const result = await onLifecycle(profile.id, "ended");
    if (result?.ok) onEndingChange(null);
  }

  return (
    <Card as="article" className={`paycheck-card paycheck-card--${profile.lifecycle}`}>
      <header className="paycheck-card__header">
        <div>
          <p className="paycheck-status">{LIFECYCLE_LABELS[profile.lifecycle]}</p>
          <h3>{profile.displayName}</h3>
          <p className="muted">{cadenceLabel(profile.schedule.cadence)}</p>
        </div>
        <div className="paycheck-card__amount"><span>Expected amount</span><strong>{formatAmount(profile.amount)}</strong></div>
      </header>
      {projection ? (
        <div className="paycheck-projection">
          <p className="muted">Next expected window</p>
          <p className="paycheck-projection__date">{formatDate(projection.earliestExpectedDate)}{projection.earliestExpectedDate !== projection.latestExpectedDate && `–${formatDate(projection.latestExpectedDate)}`}</p>
          <p>Expected, not guaranteed.</p>
        </div>
      ) : (
        <p className="paycheck-inactive">{profile.lifecycle === "active" ? "No expected window is available. Expected, not guaranteed." : `${LIFECYCLE_LABELS[profile.lifecycle]} paychecks have no active expected window.`}</p>
      )}
      <details ref={detailsRef} className="paycheck-details">
        <summary aria-label={`Details for ${profile.displayName}`}>Details</summary>
        <dl className="paycheck-facts">
          <div><dt>Source</dt><dd>{profile.source === "manual" ? "Entered by you" : "Confirmed from deposits"}</dd></div>
          {profile.origin?.algorithmVersion && <div><dt>Detection details</dt><dd>{profile.origin.algorithmVersion}</dd></div>}
          <div><dt>Schedule</dt><dd>{formatSchedule(profile.schedule)}</dd></div>
          <div><dt>Expected date window</dt><dd>{formatWindow(profile.windowBeforeDays, profile.windowAfterDays)}</dd></div>
          <div><dt>Records used to confirm</dt><dd>{profile.evidence.length} linked deposit(s)</dd></div>
          {evaluatedOn && <div><dt>Profiles evaluated</dt><dd>{formatDate(evaluatedOn)}</dd></div>}
          {projection && <>
            <div><dt>Projection amount</dt><dd>{formatAmount(projection.amount)}</dd></div>
            <div><dt>Schedule date</dt><dd>{formatDate(projection.anchor)}</dd></div>
            <div><dt>Projection evaluated</dt><dd>{formatDate(projection.evaluatedOn)}</dd></div>
            <div><dt>Projection details</dt><dd>{projection.algorithmVersion}</dd></div>
          </>}
        </dl>
        <PaycheckEvidence evidence={profile.evidence} confirmed disclosure={false} />
        <p className="muted paycheck-schedule-note">To change this schedule, end this profile and create or confirm a replacement. Linked evidence stays with this profile.</p>
        {!editing && !ending && <div className="inline-actions paycheck-actions">
          {profile.lifecycle === "ended" && <button type="button" className="button-ghost" disabled={actionsDisabled} onClick={() => onLifecycle(profile.id, "paused")} aria-label={`Pause ${profile.displayName}`}>Pause</button>}
          {profile.lifecycle !== "ended" && <button ref={endTrigger} type="button" className="button-ghost" disabled={actionsDisabled} onClick={() => onEndingChange({ id: profile.id, lifecycle: profile.lifecycle })} aria-label={`End ${profile.displayName}`}>End</button>}
        </div>}
      </details>
      {editing ? (
        <PaycheckForm key={profile.id} mode="edit" model={editor.model} busy={busy} onSubmit={(payload) => onSave(profile.id, payload)} onCancel={onCancel} />
      ) : ending ? (
        <div className="paycheck-end-confirmation" role="group" aria-label={`End ${profile.displayName}`}>
          <p>End {profile.displayName}? Its projection will stop. The profile and linked evidence will remain, and you can reactivate it.</p>
          <div className="inline-actions">
            <button ref={endConfirm} type="button" disabled={busy} onClick={end}>Confirm end</button>
            <button type="button" className="button-ghost" disabled={busy} onClick={() => { onEndingChange(null); if (detailsRef.current) detailsRef.current.open = true; requestAnimationFrame(() => endTrigger.current?.focus()); }}>Cancel ending</button>
          </div>
        </div>
      ) : (
        <div className="inline-actions paycheck-actions">
          <button type="button" className="button-ghost" disabled={actionsDisabled} onClick={(event) => onEdit(profile, event.currentTarget)} aria-label={`Edit ${profile.displayName}`}>Edit</button>
          {profile.lifecycle !== "active" ? (
            <button type="button" disabled={actionsDisabled} onClick={() => onLifecycle(profile.id, "active")} aria-label={`Reactivate ${profile.displayName}`}>Reactivate</button>
          ) : (
            <button type="button" className="button-ghost" disabled={actionsDisabled} onClick={() => onLifecycle(profile.id, "paused")} aria-label={`Pause ${profile.displayName}`}>Pause</button>
          )}
        </div>
      )}
    </Card>
  );
}

export default function PaychecksPage() {
  const state = usePaychecks();
  const [editor, setEditor] = useState(null);
  const [endingTarget, setEndingTarget] = useState(null);
  const [historyOpen, setHistoryOpen] = useState({ paused: false, ended: false, dismissed: false });
  const editorTrigger = useRef(null);
  const editorLocation = useRef(null);
  const profilesHeading = useRef(null);
  const candidatesHeading = useRef(null);
  const dismissedSummary = useRef(null);
  const feedback = useRef(null);
  const busy = Boolean(state.busyKey) || state.loading || state.refreshing;
  const actionsDisabled = busy || Boolean(editor) || endingTarget !== null;
  const hasContent = state.paychecks.length + state.candidates.length + state.dismissedCandidates.length > 0;
  const showContent = hasContent || (!state.loading && !state.loadError);

  useEffect(() => {
    // Match the former card-local confirmation lifetime when a refresh removes
    // the profile or moves it to another group; same-card refreshes keep it open.
    if (endingTarget && !state.paychecks.some((profile) => profile.id === endingTarget.id && profile.lifecycle === endingTarget.lifecycle)) setEndingTarget(null);
  }, [endingTarget, state.paychecks]);

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
    if (result?.ok && !reconsider) setHistory("dismissed", true);
    focus(result?.ok ? (reconsider ? candidatesHeading : dismissedSummary) : feedback);
  }

  async function lifecycle(id, value) {
    const result = await state.updateLifecycle(id, value);
    if (result?.ok && value !== "active") setHistoryOpen((current) => ({ ...current, [value]: true }));
    // These targets remain mounted. Delayed focus could steal focus from a
    // subsequent End confirmation opened after the lifecycle read completes.
    (result?.ok ? profilesHeading : feedback).current?.focus();
    return result;
  }

  function setHistory(kind, open) {
    setHistoryOpen((current) => current[kind] === open ? current : { ...current, [kind]: open });
  }

  function profileCard(profile) {
    return <ProfileCard key={profile.id} profile={profile} evaluatedOn={state.paychecksEvaluatedOn}
      busy={busy} actionsDisabled={actionsDisabled} ending={endingTarget?.id === profile.id && endingTarget.lifecycle === profile.lifecycle} onEndingChange={setEndingTarget}
      editor={editor} onEdit={(model, trigger) => openEditor("edit", model, trigger)} onCancel={cancelEditor}
      onSave={(id, payload) => submit(() => state.updatePaycheck(id, payload))} onLifecycle={lifecycle} />;
  }

  const activeProfiles = state.paychecks.filter((profile) => profile.lifecycle === "active");

  return (
    <div className="container paychecks-page">
      <header className="page-header">
        <div>
          <h1>Paychecks</h1>
          <p className="muted">Manage expected pay and review possible paychecks.</p>
        </div>
        <button type="button" className="paycheck-create" disabled={actionsDisabled || Boolean(state.loadError) || state.uncertainCreate} onClick={(event) => openEditor("manual", null, event.currentTarget)}>
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
              <h2 id="paycheck-profiles-heading" ref={profilesHeading} tabIndex={-1}>Your paychecks</h2>
            </header>
            {activeProfiles.length === 0 ? (
              <div className="paycheck-empty"><WalletCards size={28} aria-hidden="true" /><h3>{state.paychecks.length === 0 ? "No paycheck profiles yet" : "No active paychecks"}</h3><p>Review a possible paycheck below or add an expectation manually. A deposit alone is not a confirmed paycheck.</p></div>
            ) : (
              <div className="paycheck-group" role="group" aria-label="Active paychecks">
                {activeProfiles.map(profileCard)}
              </div>
            )}
          </section>

          <section className="paycheck-section" aria-labelledby="paycheck-candidates-heading">
            <header className="paycheck-section__header">
              <div><h2 id="paycheck-candidates-heading" ref={candidatesHeading} tabIndex={-1}>Possible paychecks</h2><p className="muted">Review the deposits before confirming an expectation.</p></div>
              {state.candidates.length > 0 && <p className="muted">{state.candidates.length} to review</p>}
            </header>
            {state.candidates.length === 0 ? <p className="paycheck-empty">No possible paychecks need review. You can still add a manual expectation.</p> : state.candidates.map((candidate) => <CandidateCard key={candidate.fingerprint} candidate={candidate} evaluatedOn={state.candidatesEvaluatedOn} busy={busy} actionsDisabled={actionsDisabled} editor={editor} onReview={(model, trigger) => openEditor("confirm", model, trigger)} onCancel={cancelEditor} onConfirm={(payload) => submit(() => state.confirmCandidate(payload))} onDecision={decide} />)}
          </section>

          {["paused", "ended"].map((kind) => {
            const profiles = state.paychecks.filter((profile) => profile.lifecycle === kind);
            const locked = profiles.some((profile) => (endingTarget?.id === profile.id && endingTarget.lifecycle === profile.lifecycle) || (editor?.mode === "edit" && editor.key === profile.id) || state.busyKey === `lifecycle:${profile.id}`);
            return profiles.length > 0 && (
              <details key={kind} className="paycheck-history" open={historyOpen[kind] || locked} onToggle={(event) => { if (!locked) setHistory(kind, event.currentTarget.open); }}>
                <summary aria-disabled={locked || undefined} onClick={(event) => { if (locked) event.preventDefault(); }}><h2>{LIFECYCLE_LABELS[kind]} paychecks <span>({profiles.length})</span></h2></summary>
                <div className="paycheck-history__content paycheck-group" role="group" aria-label={`${LIFECYCLE_LABELS[kind]} paychecks`}>
                  {locked && <p className="muted paycheck-history-note">Finish or cancel the open action before closing this group.</p>}
                  {profiles.map(profileCard)}
                </div>
              </details>
            );
          })}

          <details className="paycheck-history" open={historyOpen.dismissed || state.busyKey?.startsWith("reconsider:")} onToggle={(event) => { if (!state.busyKey?.startsWith("reconsider:")) setHistory("dismissed", event.currentTarget.open); }}>
            <summary ref={dismissedSummary} aria-disabled={state.busyKey?.startsWith("reconsider:") || undefined} onClick={(event) => { if (state.busyKey?.startsWith("reconsider:")) event.preventDefault(); }}><h2 id="paycheck-dismissed-heading">Dismissed possible paychecks <span>({state.dismissedCandidates.length})</span></h2></summary>
            <div className="paycheck-history__content">
              <p className="muted">Dismissal applies to the exact evidence reviewed. Reconsider a possible paycheck to review it again.</p>
              {state.dismissedCandidates.length === 0 ? <p className="muted">No dismissed possible paychecks.</p> : state.dismissedCandidates.map((candidate) => <CandidateCard key={candidate.fingerprint} candidate={candidate} evaluatedOn={state.candidatesEvaluatedOn} dismissed busy={busy} actionsDisabled={actionsDisabled} onDecision={decide} />)}
            </div>
          </details>
        </>
      )}
    </div>
  );
}
