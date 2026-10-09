import { useState } from "react";
import { Dialog, DialogError } from "../Dialog.jsx";
import { InlineError } from "./InlineError.jsx";
import { Button } from "./Button.jsx";

export function ConfirmDialog({
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  destructive = false,
  requireText,
}) {
  const [typed, setTyped] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return (
    <Dialog title={title} onClose={onCancel}>
      <p>{body}</p>
      <InlineError message={error} onRetry={() => setError("")} />
      {requireText && (
        <label>
          Type {requireText} to confirm
          <input
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
          />
        </label>
      )}
      <DialogError />
      <div className="confirm-actions">
        <Button onClick={onCancel}>{cancelLabel}</Button>
        <Button
          variant={destructive ? "destructive" : "primary"}
          busy={pending}
          busyLabel="Working…"
          disabled={requireText && typed !== requireText}
          onClick={async () => {
            if (pending) return;
            setPending(true);
            try {
              await onConfirm();
            } catch (cause) {
              setError(cause.message || "Could not complete this action.");
            } finally {
              setPending(false);
            }
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
