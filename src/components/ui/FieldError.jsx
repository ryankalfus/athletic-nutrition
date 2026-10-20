import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { CircleAlert } from "lucide-react";
import {
  errorAfterBlur,
  errorAfterChange,
  normalizeError as normalize,
} from "../../domain/validation.js";

// Field-level errors (DS-13, A11Y-09). A form wraps its fields in
// <FieldErrors error={…}>; an error is "" (none), a string (about the whole
// form) or { message, field }. The named field gets aria-invalid and
// aria-describedby pointing at the message shown under it by <FieldError>,
// and the first invalid field takes focus when the error appears (not for a
// `quiet` error, which live validation shows while the athlete is typing).
const Context = createContext(null);

export function FieldErrors({ error, children }) {
  const id = useId();
  const value = normalize(error);
  const ref = useRef(null);
  useEffect(() => {
    if (!value?.field || value.quiet) return;
    const root = ref.current?.parentElement;
    const invalid = root?.querySelector('[aria-invalid="true"]');
    const target = invalid?.matches("input, select, textarea, button")
      ? invalid
      : invalid?.querySelector(
          "input:not(:disabled), select, textarea, button:not(:disabled)",
        );
    target?.focus();
    // UX-BUG-03: focus shows the field; the message under it must show too,
    // above a pinned action bar (scroll-margin-bottom in the stylesheets).
    document
      .getElementById(`${id}error`)
      ?.scrollIntoView?.({ block: "nearest" });
  }, [error]);
  return (
    <Context.Provider value={{ error: value, id: `${id}error` }}>
      <span ref={ref} hidden />
      {children}
    </Context.Provider>
  );
}

const matches = (error, field) =>
  Boolean(error?.field) && [].concat(field).includes(error.field);

// Props for the control or group that `field` names.
export function useFieldInvalid(field) {
  const context = useContext(Context);
  if (!field || !matches(context?.error, field)) return {};
  return { "aria-invalid": true, "aria-describedby": context.id };
}

// One form's validation (UX-BUG-02), shared by setup, Schedule, You and the
// log sheets. `values` are the form's current values and `validate(values)`
// returns the first problem ({ message, field }) or null. A field's error
// clears on the first change that makes it valid; once an error has shown,
// leaving a field re-checks the form; any change clears an error about the
// whole form. Pass `state` ([error, setError]) when the form already owns its
// error; otherwise the hook keeps it. `check()` validates for a submit, shows
// the problem (focusing its field) and returns true when the values are valid.
// Spread `onBlur` on the <form>.
export function useFieldValidation(values, validate, state) {
  const own = useState(null);
  const [error, setError] = state || own;
  const key = JSON.stringify(values ?? null);
  const seen = useRef(key);
  const shown = useRef(false);
  const latest = useRef(null);
  latest.current = () => validate?.(values) || null;
  useEffect(() => {
    if (error) shown.current = true;
  }, [error]);
  useEffect(() => {
    if (seen.current === key) return;
    seen.current = key;
    if (error) setError(errorAfterChange(error, latest.current()));
  }, [key]);
  return {
    error,
    setError,
    check() {
      const problem = latest.current();
      shown.current = shown.current || Boolean(problem);
      setError(problem);
      return !problem;
    },
    onBlur() {
      if (!shown.current) return;
      const next = errorAfterBlur(error, latest.current());
      if (next !== error) setError(next);
    },
  };
}

// The message under a field, with the error icon.
export function FieldError({ field }) {
  const context = useContext(Context);
  if (!matches(context?.error, field)) return null;
  return (
    <p id={context.id} className="field-error">
      <CircleAlert size={16} strokeWidth={2} aria-hidden="true" />
      <span>{context.error.message}</span>
    </p>
  );
}

// An error about the whole form (a failed save): announced as an alert.
export function FormError() {
  const context = useContext(Context);
  const error = context?.error;
  if (!error || error.field) return null;
  return (
    <div className="inline-error" role="alert">
      <span>{error.message}</span>
    </div>
  );
}

// An <input> that `field` names; use it inside a <label>, with <FieldError>
// after the label.
export function Input({ field, ...props }) {
  const invalid = useFieldInvalid(field);
  const describedBy =
    [invalid["aria-describedby"], props["aria-describedby"]]
      .filter(Boolean)
      .join(" ") || undefined;
  return <input {...props} {...invalid} aria-describedby={describedBy} />;
}
