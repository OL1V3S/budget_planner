import { useEffect, useId, useRef, useState } from "react";
import FormField from "../../../shared/ui/FormField";
import { CADENCES, initialPaycheckForm, isUnsafeNumericAmount, validatePaycheckForm } from "../utils/paycheckForm";
import { cadenceLabel, formatSchedule } from "../utils/formatPaychecks";

export default function PaycheckForm({ mode, model, busy = false, submitDisabled = false, onSubmit, onCancel, formId }) {
  const generatedId = useId();
  const [form, setForm] = useState(() => initialPaycheckForm(mode, model));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const formRef = useRef(null);
  const pending = useRef(false);
  const disabled = busy || submitting;
  const variable = mode === "confirm" && model?.observedAmount?.mode === "variable";
  const sourceAmount = mode === "confirm" ? model?.observedAmount : model?.amount;
  const amountNeedsReview = Object.values(sourceAmount ?? {}).some(isUnsafeNumericAmount);
  const submitLabel = { confirm: "Confirm paycheck", manual: "Create paycheck", edit: "Save changes" }[mode];

  useEffect(() => { formRef.current?.querySelector("input")?.focus(); }, []);
  useEffect(() => {
    if (Object.keys(errors).length) formRef.current?.querySelector('[aria-invalid="true"]')?.focus();
  }, [errors]);

  function update(name, value) {
    setForm((current) => {
      const next = { ...current, [name]: value };
      if (name === "cadence") Object.assign(next, { referenceAnchorDate: "", firstAnchorKind: "day_of_month",
        firstAnchorDay: "", secondAnchorKind: "day_of_month", secondAnchorDay: "" });
      if (name === "firstAnchorKind") next.firstAnchorDay = "";
      if (name === "secondAnchorKind") next.secondAnchorDay = "";
      if (name === "amountMode") Object.assign(next, { fixedAmount: "", minimumAmount: "", maximumAmount: "" });
      return next;
    });
    setErrors({});
    setSubmitError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (disabled || submitDisabled || pending.current) return;
    const result = validatePaycheckForm(form, mode, model);
    setErrors(result.errors);
    if (!result.payload) return;
    pending.current = true;
    setSubmitting(true);
    setSubmitError("");
    try { await onSubmit(result.payload); }
    catch { setSubmitError("The action could not be completed. Check the page message before trying again."); }
    finally { pending.current = false; setSubmitting(false); }
  }

  function field(name, label, options = {}) {
    const { choices, ...inputProps } = options;
    const errorId = `${generatedId}-${name}-error`;
    return <div className="paycheck-form__field" key={name}><FormField label={label}>{(id) => <>
      {choices ? <select id={id} value={form[name]} onChange={(event) => update(name, event.target.value)}
        aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? errorId : undefined}>
        {choices.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
      </select> : <input id={id} value={form[name]} onChange={(event) => update(name, event.target.value)}
        required aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? errorId : undefined} {...inputProps} />}
    </>}</FormField>{errors[name] && <span className="paycheck-form__error" id={errorId}>{errors[name]}</span>}</div>;
  }

  function anchorFields(prefix, label) {
    return <>
      {field(`${prefix}AnchorKind`, label, { choices: [["day_of_month", "Day of month"], ["month_end", "Month end"]] })}
      {form[`${prefix}AnchorKind`] === "day_of_month" && field(`${prefix}AnchorDay`, `${label} day`, { inputMode: "numeric" })}
    </>;
  }

  return <form id={formId ?? generatedId} ref={formRef} className="paycheck-form" aria-label={submitLabel}
    aria-busy={disabled} onSubmit={handleSubmit} noValidate>
    {mode === "manual" && <p className="paycheck-form__note">Create an active profile for your expected paycheck. This is your expectation and is not employer-verified.</p>}
    {mode !== "manual" && <div className="paycheck-form__schedule">
      <strong>Schedule</strong><p>{formatSchedule(model?.schedule)}</p>
      <p>{mode === "confirm" ? "Review and accept this schedule unchanged. To use a different schedule, create a paycheck manually."
        : "The schedule cannot be edited. End this profile and create a replacement to change its schedule. Evidence stays assigned to this profile."}</p>
    </div>}
    {variable && <p className="paycheck-form__note">Observed amounts vary. Enter the minimum and maximum you explicitly accept; observed bounds are not filled in.</p>}
    {amountNeedsReview && <p className="paycheck-form__note">This amount could not be loaded with reliable cent precision. Enter the exact amount you accept before saving.</p>}
    {Object.keys(errors).length > 0 && <p className="paycheck-form__error" role="alert">Check the highlighted fields.</p>}
    {submitError && <p className="paycheck-form__error" role="alert">{submitError}</p>}
    <fieldset className="paycheck-form__fields" disabled={disabled}>
      <legend className="sr-only">Paycheck expectation</legend>
      <div className="paycheck-form__grid">
        {field("displayName", "Display name", { maxLength: 500 })}
        {mode === "manual" && <>
          {field("cadence", "Cadence", { choices: CADENCES.map((cadence) => [cadence, cadenceLabel(cadence)]) })}
          {["weekly", "biweekly"].includes(form.cadence)
            ? field("referenceAnchorDate", "Reference anchor date", { type: "date", min: "0001-01-01", max: "9999-12-31" })
            : <>{anchorFields("first", form.cadence === "monthly" ? "Monthly anchor" : "First anchor")}
              {form.cadence === "semimonthly" && anchorFields("second", "Second anchor")}</>}
        </>}
        {field("windowBeforeDays", "Days before", { inputMode: "numeric" })}
        {field("windowAfterDays", "Days after", { inputMode: "numeric" })}
        {field("amountMode", "Amount model", { choices: variable ? [["range", "Amount range"]]
          : [["fixed", "Fixed amount"], ["range", "Amount range"]] })}
        {form.amountMode === "fixed" ? field("fixedAmount", "Fixed amount", { inputMode: "decimal" }) : <>
          {field("minimumAmount", "Minimum amount", { inputMode: "decimal" })}
          {field("maximumAmount", "Maximum amount", { inputMode: "decimal" })}
        </>}
      </div>
    </fieldset>
    <div className="paycheck-form__actions inline-actions">
      <button type="submit" disabled={disabled || submitDisabled}>{disabled ? "Saving…" : submitLabel}</button>
      <button type="button" className="button-ghost" disabled={disabled} onClick={onCancel}>Cancel</button>
    </div>
  </form>;
}
