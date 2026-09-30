import { changeData, exportBackup } from "../../store.js";
import { notificationPermission } from "../../domain/reminders.js";
import { backupNudge } from "../../domain/backupNudge.js";
import { showToast } from "../../components/ui/Toast.jsx";

// DATA-08 / ADD-12: the monthly backup nudge, after any reminder prompt.
function BackupPrompt({ nudge, pending, run, write }) {
  return (
    <aside className="today-prompt" aria-label="Backup">
      <p>{nudge.message}</p>
      <div className="button-row">
        <button
          className="primary"
          aria-busy={pending === "backup" || undefined}
          disabled={!!pending}
          onClick={() =>
            run("backup", async () => {
              const ok = await exportBackup({ stamp: true });
              if (ok) showToast("Backup saved. Keep the file somewhere safe.");
              return ok;
            })
          }
        >
          {pending === "backup" ? "Saving…" : "Save backup"}
        </button>
        <button
          disabled={!!pending}
          onClick={() =>
            write(
              "snooze-backup",
              (d) => {
                d.profile.backupNudgeSnoozedAt = new Date().toISOString();
              },
              "Backup reminder hidden for 30 days.",
            )
          }
        >
          Not now
        </button>
      </div>
    </aside>
  );
}

const dismiss = (d) => {
  d.profile.dismissedPrompts = [
    ...(d.profile.dismissedPrompts || []),
    "reminders",
  ];
};

function activityWord(type) {
  if (type === "practice") return "practice";
  if (type === "game") return "your game";
  return "your activity";
}

// TODAY-09 / IA-12: one contextual prompt at most. Settings live in
// You › Reminders; this slot only offers a one-time shortcut or surfaces a
// reminder problem with a way to fix it. Order: a reminder problem, then a
// due backup nudge (data safety, at most monthly), then the reminder offer.
export default function ContextPrompt({
  data,
  guidance,
  notificationError,
  pending,
  run,
  write,
  onNavigate,
  now = new Date(),
}) {
  const openReminders = {
    label: "Open",
    onClick: () => onNavigate("you/reminders"),
  };
  if (notificationError)
    return (
      <aside className="today-prompt" aria-label="Reminders">
        <p>{notificationError}</p>
        <button onClick={() => onNavigate("you/reminders")}>
          Open reminders
        </button>
      </aside>
    );
  const nudge = backupNudge(data, now);
  if (nudge) return <BackupPrompt {...{ nudge, pending, run, write }} />;
  if (
    !guidance.nextEvent ||
    data.reminderSettings.enabled ||
    data.profile.dismissedPrompts?.includes("reminders")
  )
    return null;
  return (
    <aside className="today-prompt" aria-label="Reminders">
      <p>
        Get a heads-up 60 min before {activityWord(guidance.nextEvent.type)}?
      </p>
      <div className="button-row">
        <button
          disabled={!!pending}
          onClick={() =>
            run("reminders", async () => {
              if (notificationPermission() === "unsupported")
                return changeData(
                  dismiss,
                  "This browser cannot show reminders.",
                  openReminders,
                );
              const permission = await window.Notification.requestPermission();
              if (permission === "granted")
                return changeData(
                  (d) => {
                    d.reminderSettings = {
                      ...d.reminderSettings,
                      enabled: true,
                      leadMinutes: 60,
                    };
                  },
                  "Reminders on · 60 min before.",
                  openReminders,
                );
              return changeData(
                dismiss,
                "Notifications are blocked. You can try again in You › Reminders.",
                openReminders,
              );
            })
          }
        >
          Turn on
        </button>
        <button
          disabled={!!pending}
          onClick={() => write("dismiss", dismiss, "Reminder prompt hidden.")}
        >
          Not now
        </button>
      </div>
    </aside>
  );
}
