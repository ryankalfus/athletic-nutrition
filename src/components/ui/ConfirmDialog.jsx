import { useState } from "react";
import { Dialog } from "../Dialog.jsx";
import { InlineError } from "./InlineError.jsx";

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
      <div className="confirm-actions">
        <button type="button" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={destructive ? "danger-button" : "primary"}
          disabled={pending || (requireText && typed !== requireText)}
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
          {pending ? "Working…" : confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
