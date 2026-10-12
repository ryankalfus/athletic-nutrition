import { useState } from "react";
import { useAsyncAction } from "../../hooks/useAsyncAction.js";
import { Dialog, DialogCancel, DialogError } from "../../components/Dialog.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { Menu } from "../../components/ui/Menu.jsx";
import { changeData, useStore } from "../../store.js";
import { getDateKey, toggleRestWeekday } from "../../domain/timing.js";
import { formatDate, formatTime, formatWeekdays } from "../../format.js";
import { WeekdayPicker } from "./ScheduleFields.jsx";
import { ImportSheet } from "./ImportSheet.jsx";
import { refreshCalendars, refreshMessage } from "./calendarSync.js";
import { showToast } from "../../components/ui/Toast.jsx";

// "Updated 9:41 AM" today, else "Updated Tue, Oct 6".
function updatedLabel(iso) {
  if (!iso) return "Not updated yet";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Not updated yet";
  const key = getDateKey(date);
  return key === getDateKey()
    ? `Updated ${formatTime(`${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`)}`
    : `Updated ${formatDate(key)}`;
}

// ADD-13 / STATE-10: the weekly rest-day pattern, edited like the school day.
function RestDaysSheet({ restWeekdays, onClose }) {
  const [days, setDays] = useState(restWeekdays);
  const { pending, run } = useAsyncAction();
  const dirty = [...days].sort().join() !== [...restWeekdays].sort().join();
  return (
    <Dialog
      title="Rest days"
      className="rest-days-sheet"
      onClose={onClose}
      dirty={dirty}
      discardMessage="Your rest day changes will be lost."
    >
      <form
        className="schedule-form"
        onSubmit={(event) => {
          event.preventDefault();
          run("rest", async () => {
            const next = [...days].sort((a, b) => a - b);
            const ok = await changeData((data) => {
              data.profile.restWeekdays = next;
            }, "Rest days saved.");
            if (ok) onClose();
          });
        }}
      >
        <div className="schedule-form-scroll">
          <WeekdayPicker
            legend="Rest every week on"
            value={days}
            onToggle={(day) =>
              setDays(
                (current) =>
                  toggleRestWeekday({ restWeekdays: current }, day)
                    .restWeekdays,
              )
            }
          />
          <p className="muted field-hint">
            Today shows a rest day on these days. A practice or game on that day
            still comes first, and you can undo a rest day on Today.
          </p>
        </div>
        <DialogError />
        <div className="schedule-form-footer">
          <DialogCancel />
          <Button
            variant="primary"
            type="submit"
            busy={pending === "rest"}
            busyLabel="Saving…"
          >
            Save
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// The rows under the school day: weekly rest days (P2-03) and team
// calendars (P2-01, P2-02, SCH-10).
export default function WeekSettings({ events, todayKey }) {
  const { current } = useStore();
  const data = current.data;
  const restWeekdays = data.profile.restWeekdays || [];
  const subscriptions = data.calendarSubscriptions || [];
  const [sheet, setSheet] = useState(null);
  const [refreshing, setRefreshing] = useState(null);
  const athleteId = current.id;

  async function refresh(list) {
    setRefreshing(list.length > 1 ? "all" : list[0].id);
    try {
      const totals = await refreshCalendars(athleteId, list, { todayKey });
      showToast(
        totals.failed
          ? "Couldn't update the team calendar. Try again later."
          : refreshMessage(totals) || "Team calendar is up to date.",
      );
    } finally {
      setRefreshing(null);
    }
  }

  function stopUpdating(sub) {
    changeData((draft) => {
      draft.calendarSubscriptions = (draft.calendarSubscriptions || []).filter(
        (item) => item.id !== sub.id,
      );
      // Its events stay as they are, now like any imported event.
      draft.schedule = (draft.schedule || []).map((event) =>
        event.source?.feedId === sub.id
          ? { ...event, source: { ...event.source, feedId: null } }
          : event,
      );
    }, "Calendar link removed. Its events stay in your schedule.");
  }

  return (
    <section className="card schedule-settings-card">
      <div className="school-schedule-summary">
        <div>
          <h2>Rest days</h2>
          <p>
            {restWeekdays.length
              ? `Every ${formatWeekdays(restWeekdays)}`
              : "No weekly rest days"}
          </p>
        </div>
        <button
          className="text-button"
          aria-label={restWeekdays.length ? "Edit rest days" : "Set rest days"}
          onClick={() => setSheet("rest")}
        >
          {restWeekdays.length ? "Edit" : "Set"}
        </button>
      </div>
      <div className="school-schedule-summary">
        <div>
          <h2>Team calendar</h2>
          {subscriptions.length ? (
            <ul className="calendar-links">
              {subscriptions.map((sub) => (
                <li key={sub.id}>
                  <span>
                    <strong>{sub.name || "Team calendar"}</strong>
                    <small>
                      {refreshing === sub.id || refreshing === "all"
                        ? "Updating…"
                        : sub.lastError
                          ? `Couldn't update. ${updatedLabel(sub.refreshedAt)}.`
                          : updatedLabel(sub.refreshedAt)}
                    </small>
                  </span>
                  <Menu
                    label={`Actions for ${sub.name || "team calendar"}`}
                    items={[
                      {
                        label: "Refresh",
                        disabled: Boolean(refreshing),
                        onSelect: () => refresh([sub]),
                      },
                      {
                        label: "Stop updating",
                        danger: true,
                        separated: true,
                        onSelect: () => stopUpdating(sub),
                      },
                    ]}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p>Add games and practices from your team app.</p>
          )}
        </div>
        <button
          className="text-button"
          aria-label="Import team calendar"
          onClick={() => setSheet("import")}
        >
          Import
        </button>
      </div>
      {sheet === "rest" && (
        <RestDaysSheet
          restWeekdays={restWeekdays}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === "import" && (
        <ImportSheet
          events={events}
          subscriptions={subscriptions}
          todayKey={todayKey}
          onClose={() => setSheet(null)}
        />
      )}
    </section>
  );
}
