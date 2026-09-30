import { Menu } from "../../components/ui/Menu.jsx";
import { formatTime } from "../../format.js";
import { timeToMinutes } from "../../domain/timing.js";
import { minutesClock } from "../../domain/dayRail.js";

// Sub-line for an activity row (SCH-03): "Home", or "Away · Leave by 3:35 PM".
export function activitySubLine(event) {
  if (event.location !== "away") return "Home";
  const travel = Number(event.travelMinutes) || 0;
  return travel
    ? `Away · Leave by ${formatTime(minutesClock(timeToMinutes(event.startTime) - travel))}`
    : "Away";
}

// One row in a Schedule day (Week view and the Month day panel): time range
// with an activity-colour dot, title, sub-line and a row menu. School is one
// muted line with its own menu.
export default function ScheduleRow({
  event,
  dateKey,
  schoolSchedule,
  onEdit,
  onSkipSchool,
  onSkip,
  onDelete,
}) {
  const school = event.type === "school";
  const items = [
    { label: "Edit", onSelect: () => onEdit(event, dateKey) },
    school
      ? { label: "Skip this day", onSelect: () => onSkipSchool(dateKey) }
      : event.recurringSeries && {
          label: "Skip this day",
          onSelect: () => onSkip(event, dateKey),
        },
    !school && {
      label: event.recurringSeries ? "Delete…" : "Delete",
      danger: true,
      onSelect: () => onDelete(event.id, dateKey),
    },
  ];
  const time = (
    <span className="nowrap">
      {formatTime(event.startTime)}–{formatTime(event.endTime)}
    </span>
  );
  return (
    <article
      className={`schedule-week-row ${event.type}${school ? " schedule-school-row" : ""}`}
    >
      {school ? (
        // One muted line: "8:00 AM–3:00 PM · School · Lunch 11:30 AM".
        <button
          className="schedule-week-row-main"
          onClick={() => onEdit(event, dateKey)}
        >
          <span className="schedule-week-time">{time}</span>
          <span>
            {" · "}
            <strong>{event.title}</strong>
            {schoolSchedule?.lunchStartTime && (
              <>
                {" · "}
                <span className="nowrap">
                  Lunch {formatTime(schoolSchedule.lunchStartTime)}
                </span>
              </>
            )}
          </span>
        </button>
      ) : (
        <>
          <span className="schedule-week-time">{time}</span>
          <button
            className="schedule-week-row-main"
            onClick={() => onEdit(event, dateKey)}
          >
            <strong>{event.title}</strong>
            <small>{activitySubLine(event)}</small>
          </button>
        </>
      )}
      <Menu
        className="schedule-row-menu"
        label={`Actions for ${event.title}`}
        items={items}
      />
    </article>
  );
}
