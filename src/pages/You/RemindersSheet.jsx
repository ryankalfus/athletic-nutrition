import { useState } from "react";
import { changeData } from "../../store.js";
import {
  REMINDER_HONESTY_LINE,
  REMINDER_LEAD_OPTIONS,
  describePermission,
  normalizeReminderSettings,
  notificationPermission,
} from "../../domain/reminders.js";
import { SettingsSheet } from "./SettingsSheet.jsx";
import {
  SegmentedControl,
  SwitchRow,
} from "../../components/ui/SelectionControls.jsx";

// You › Reminders (IA-12, YOU-05, DATA-06).
export function RemindersSheet({ settings, onClose }) {
  const [initial] = useState(() => normalizeReminderSettings(settings));
  const [draft, setDraft] = useState(initial);
  const [permission, setPermission] = useState(notificationPermission);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  // A browser that blocks or cannot show notifications can't turn reminders
  // on; the switch stays usable only to turn them off.
  const unavailable = permission === "denied" || permission === "unsupported";
  const blocked = unavailable && !draft.enabled;
  // The timing and evening options depend on reminders that can fire: they
  // are disabled (and dimmed) while the switch is off or the browser blocks
  // notifications, even if reminders were left on (UX-BUG-15, UX-CMP-08).
  const dependentOff = !draft.enabled || unavailable;

  const save = async () => {
    const next = draft;
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
      return current === "unsupported"
        ? "Reminders are off because this browser cannot show notifications."
        : "Reminders are off because this browser blocked notifications.";
    }
    return changeData((data) => {
      data.reminderSettings = { ...data.reminderSettings, ...next };
    }, null);
  };

  return (
    <SettingsSheet
      title="Reminders"
      dirty={dirty}
      onSave={save}
      onClose={onClose}
      className="reminders-sheet"
    >
      <SwitchRow
        label="Remind me before activities"
        checked={draft.enabled}
        disabled={blocked}
        hint={describePermission(permission)}
        onChange={(enabled) => setDraft({ ...draft, enabled })}
      />
      <fieldset className="choice-field" disabled={dependentOff}>
        <legend>How long before</legend>
        <SegmentedControl
          label="How long before"
          options={REMINDER_LEAD_OPTIONS.map((minutes) => [
            minutes,
            `${minutes} min`,
          ])}
          value={draft.leadMinutes}
          onChange={(minutes) => setDraft({ ...draft, leadMinutes: minutes })}
        />
      </fieldset>
      <label className="check-row">
        <input
          type="checkbox"
          checked={draft.eveningPrep}
          disabled={dependentOff}
          onChange={(event) =>
            setDraft({ ...draft, eveningPrep: event.target.checked })
          }
        />
        <span>Evening reminder when tomorrow starts before 10 AM</span>
      </label>
      <p className="reminder-honesty">{REMINDER_HONESTY_LINE}</p>
    </SettingsSheet>
  );
}
