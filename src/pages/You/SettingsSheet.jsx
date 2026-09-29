import { useEffect, useState } from "react";
import { Dialog } from "../../components/Dialog.jsx";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog.jsx";
import { showToast } from "../../components/ui/Toast.jsx";
import { useAsyncAction } from "../../hooks/useAsyncAction.js";

// One You settings sheet (YOU-06): Save closes it, shows "Saved", and stays
// on You. Cancel with changes asks "Discard changes?". `onSave` resolves to
// true on success, a message to show inline, or false when the store already
// shows its own save error.
export function SettingsSheet({
  title,
  dirty,
  onSave,
  onClose,
  children,
  className = "",
  savedToast = "Saved.",
}) {
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [error, setError] = useState("");
  const { pending, run } = useAsyncAction();
  useEffect(() => {
    const warn = (event) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const close = () => (dirty ? setConfirmDiscard(true) : onClose());
  const submit = (event) => {
    event.preventDefault();
    setError("");
    run("save", async () => {
      let result;
      try {
        result = await onSave();
      } catch (cause) {
        result =
          cause?.message ||
          "Couldn't save on this device. Your changes are still on screen.";
      }
      if (result === true) {
        onClose();
        // Closing changes the route, which clears toasts; show "Saved" after.
        if (savedToast) window.setTimeout(() => showToast(savedToast), 0);
      } else if (typeof result === "string") setError(result);
      return result === true;
    });
  };
  return (
    <Dialog
      title={title}
      onClose={close}
      className={`settings-sheet ${className}`.trim()}
    >
      <form onSubmit={submit} noValidate>
        {children}
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" onClick={close}>
            Cancel
          </button>
          <button className="primary" type="submit" disabled={!!pending}>
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
      {confirmDiscard && (
        <ConfirmDialog
          title="Discard changes?"
          body="Your changes to this section aren't saved yet."
          confirmLabel="Discard"
          cancelLabel="Keep editing"
          destructive
          onCancel={() => setConfirmDiscard(false)}
          onConfirm={() => {
            setConfirmDiscard(false);
            onClose();
          }}
        />
      )}
    </Dialog>
  );
}

// A chip group backed by a list (aria-pressed toggles).
export function ChipGroup({ legend, hint, options, selected, onToggle }) {
  return (
    <fieldset className="choice-field">
      <legend>{legend}</legend>
      {hint && <p className="muted field-hint">{hint}</p>}
      <div className="choice-grid">
        {options.map(([value, label]) => (
          <button
            type="button"
            key={value}
            className={selected.includes(value) ? "selected" : ""}
            aria-pressed={selected.includes(value)}
            onClick={() => onToggle(value)}
          >
            {label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function SwitchRow({ checked, onChange, label, hint }) {
  return (
    <label className="check-row switch-row">
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        {label}
        {hint && <small className="muted field-hint">{hint}</small>}
      </span>
    </label>
  );
}

export const toggle = (list, value) =>
  list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
