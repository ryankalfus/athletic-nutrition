import { useState } from "react";
import { Dialog } from "../../components/Dialog.jsx";
import { changeData } from "../../store.js";
import { showToast } from "../../components/ui/Toast.jsx";
import { useAsyncAction } from "../../hooks/useAsyncAction.js";
import {
  REMINDER_HONESTY_LINE,
  REMINDER_LEAD_OPTIONS,
  describePermission,
  normalizeReminderSettings,
  notificationPermission,
  reminderSummary,
} from "../../domain/reminders.js";

export function RemindersRow({ settings, onOpen }) {
  const summary = reminderSummary(settings, notificationPermission());
  return (
    <section className="card you-row" aria-labelledby="you-reminders-title">
      <div>
        <h2 id="you-reminders-title">Reminders</h2>
        <p className="muted">{summary}</p>
      </div>
      <button
        type="button"
        className="action-secondary"
        aria-label={`Reminders — ${summary}`}
        onClick={onOpen}
      >
        Edit
      </button>
    </section>
  );
}

export function RemindersSheet({ settings, onClose }) {
  const [draft, setDraft] = useState(() => normalizeReminderSettings(settings));
  const [permission, setPermission] = useState(notificationPermission);
  const [error, setError] = useState("");
  const { pending, run } = useAsyncAction();

  const save = (event) => {
    event.preventDefault();
    run("reminders", async () => {
      let next = draft;
      let current = notificationPermission();
      if (next.enabled && current === "default") {
        try {
          current = await window.Notification.requestPermission();
        } catch {
          current = notificationPermission();
        }
        setPermission(current);
      }
      if (next.enabled && current !== "granted") {
        setDraft({ ...next, enabled: false });
        setError(
          current === "unsupported"
            ? "Reminders are off because this browser cannot show notifications."
            : "Reminders are off because this browser blocked notifications.",
        );
        return false;
      }
      const ok = await changeData((data) => {
        data.reminderSettings = { ...data.reminderSettings, ...next };
      }, null);
      if (ok) {
        onClose();
        // Closing changes the route, which clears toasts; show "Saved" after.
        window.setTimeout(() => showToast("Saved."), 0);
      }
      return ok;
    });
  };

  return (
    <Dialog title="Reminders" onClose={onClose} className="reminders-sheet">
      <form onSubmit={save}>
        <label className="check-row">
          <input
            type="checkbox"
            role="switch"
            checked={draft.enabled}
            onChange={(event) => {
              setError("");
              setDraft({ ...draft, enabled: event.target.checked });
            }}
          />
          <span>Remind me before activities</span>
        </label>
        <fieldset className="choice-field" disabled={!draft.enabled}>
          <legend>How early</legend>
          <div className="choice-grid" role="radiogroup">
            {REMINDER_LEAD_OPTIONS.map((minutes) => (
              <button
                type="button"
                role="radio"
                key={minutes}
                aria-checked={draft.leadMinutes === minutes}
                className={draft.leadMinutes === minutes ? "selected" : ""}
                onClick={() => setDraft({ ...draft, leadMinutes: minutes })}
              >
                {minutes} min before
              </button>
            ))}
          </div>
        </fieldset>
        <label className="check-row">
          <input
            type="checkbox"
            checked={draft.eveningPrep}
            disabled={!draft.enabled}
            onChange={(event) =>
              setDraft({ ...draft, eveningPrep: event.target.checked })
            }
          />
          <span>Evening reminder when tomorrow starts before 10 AM</span>
        </label>
        <p className="reminder-permission" data-permission={permission}>
          {describePermission(permission)}
        </p>
        <p className="reminder-honesty">{REMINDER_HONESTY_LINE}</p>
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" type="submit" disabled={!!pending}>
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
