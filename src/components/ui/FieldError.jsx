import { createContext, useContext, useEffect, useId, useRef } from "react";
import { CircleAlert } from "lucide-react";

// Field-level errors (DS-13, A11Y-09). A form wraps its fields in
// <FieldErrors error={…}>; an error is "" (none), a string (about the whole
// form) or { message, field }. The named field gets aria-invalid and
// aria-describedby pointing at the message shown under it by <FieldError>,
// and the first invalid field takes focus when the error appears.
const Context = createContext(null);

const normalize = (error) =>
  !error
    ? null
    : typeof error === "string"
      ? { message: error, field: "" }
      : error.message
        ? error
        : null;

export function FieldErrors({ error, children }) {
  const id = useId();
  const value = normalize(error);
  const ref = useRef(null);
  useEffect(() => {
    if (!value?.field) return;
    const root = ref.current?.parentElement;
    const invalid = root?.querySelector('[aria-invalid="true"]');
    const target = invalid?.matches("input, select, textarea, button")
      ? invalid
      : invalid?.querySelector(
          "input:not(:disabled), select, textarea, button:not(:disabled)",
        );
    target?.focus();
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
