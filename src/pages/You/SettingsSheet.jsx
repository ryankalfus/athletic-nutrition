import { useState } from "react";
import { Dialog, DialogCancel, DialogError } from "../../components/Dialog.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { FieldErrors, FormError } from "../../components/ui/FieldError.jsx";
import { showToast } from "../../components/ui/Toast.jsx";
import { useAsyncAction } from "../../hooks/useAsyncAction.js";

// One You settings sheet (YOU-06): Save closes it, shows "Saved", and stays
// on You. Cancel with changes asks "Discard changes?". `onSave` resolves to
// true on success, a message to show inline, { message, field } for an error
// under one field, or false when the store already shows its own save error.
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
}) {
  const [error, setError] = useState(null);
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
      if (result === true) {
        onClose();
        // Closing changes the route, which clears toasts; show "Saved" after.
        if (savedToast) window.setTimeout(() => showToast(savedToast), 0);
      } else if (result) setError(result);
      return result === true;
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
      <form onSubmit={submit} noValidate>
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
