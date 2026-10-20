import { useState } from "react";
import { Dialog, DialogCancel, DialogError } from "../../components/Dialog.jsx";
import { Button } from "../../components/ui/Button.jsx";
import {
  FieldErrors,
  FormError,
  useFieldValidation,
} from "../../components/ui/FieldError.jsx";
import { showToast } from "../../components/ui/Toast.jsx";
import { useAsyncAction } from "../../hooks/useAsyncAction.js";

// One You settings sheet (YOU-06): Save closes it, shows "<Thing> saved."
// and stays on You. Cancel with changes asks "Discard changes?". `onSave`
// resolves to true on success, or to the write's Undo (a function, from
// changeDataUndoable or renameProfile) so the toast offers Undo (UX-BUG-22);
// a message to show inline, { message, field } for an error under one field,
// or false when the store already shows its own save error.
// `values` (the sheet's draft) and `validate` keep an error in step with the
// fields (UX-BUG-02).
export function SettingsSheet({
  title,
  dirty,
  onSave,
  onClose,
  children,
  className = "",
  savedToast = "Saved.",
  saveLabel = "Save",
  discardMessage = "Your changes to this section aren't saved yet.",
  values,
  validate,
}) {
  const [error, setError] = useState(null);
  const validation = useFieldValidation(values, validate, [error, setError]);
  const { pending, run } = useAsyncAction();
  const submit = (event) => {
    event.preventDefault();
    setError(null);
    run("save", async () => {
      let result;
      try {
        result = await onSave();
      } catch (cause) {
        result =
          cause?.message ||
          "Couldn't save on this device. Your changes are still on screen.";
      }
      const undo = typeof result === "function" ? result : undefined;
      if (result === true || undo) {
        onClose();
        // Closing changes the route, which clears toasts; show it after.
        if (savedToast)
          window.setTimeout(() => showToast(savedToast, undo), 0);
      } else if (result) setError(result);
      return result === true || Boolean(undo);
    });
  };
  return (
    <Dialog
      title={title}
      onClose={onClose}
      dirty={dirty}
      discardMessage={discardMessage}
      className={`settings-sheet ${className}`.trim()}
    >
      <form onSubmit={submit} onBlur={validation.onBlur} noValidate>
        <FieldErrors error={error}>
          {children}
          <FormError />
        </FieldErrors>
        <DialogError />
        <div className="dialog-actions">
          <DialogCancel />
          <Button
            type="submit"
            variant="primary"
            busy={!!pending}
            busyLabel="Saving…"
          >
            {saveLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export const toggle = (list, value) =>
  list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
