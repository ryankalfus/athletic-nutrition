import { changeData } from "../../store.js";
import { notificationPermission } from "../../domain/reminders.js";

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
// reminder problem with a way to fix it.
export default function ContextPrompt({
  data,
  guidance,
  notificationError,
  pending,
  run,
  write,
  onNavigate,
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
    </aside>
  );
}
