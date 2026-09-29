import { formatActivityType, formatDate, formatTime } from "../../format.js";
import {
  addDays,
  eventsForDate,
  getDateKey,
  isSchoolDay,
  timeToMinutes,
} from "../../domain/timing.js";

export default function ScheduleWeek({
  events,
  schoolSchedule,
  todayKey,
  selectedKey,
  selectedDate,
  selectedEvents,
  weekStart,
  weekDays,
  selectDay,
  goToToday,
  getEventsForDay,
  isConfiguredSchoolDay,
  setShowForm,
  openSchoolForm,
  editEvent,
  cancelSchoolDay,
  skipRecurringOccurrence,
  deleteEvent,
}) {
  return (
    <div className="schedule-week">
      <div className="schedule-week-switcher">
        <button
          aria-label={`Previous week, ${formatDate(getDateKey(addDays(weekStart, -7)))} to ${formatDate(getDateKey(addDays(weekStart, -1)))}`}
          onClick={() => selectDay(addDays(selectedDate, -7))}
        >
          ‹
        </button>
        <strong>
          {formatDate(getDateKey(weekStart))} –{" "}
          {formatDate(getDateKey(weekDays[6]))}
        </strong>
        <button
          aria-label={`Next week, ${formatDate(getDateKey(addDays(weekStart, 7)))} to ${formatDate(getDateKey(addDays(weekStart, 13)))}`}
          onClick={() => selectDay(addDays(selectedDate, 7))}
        >
          ›
        </button>
        <button onClick={goToToday}>This week</button>
      </div>
      {weekDays.map((date) => {
        const key = getDateKey(date);
        const dayEvents = getEventsForDay(date);
        const schoolOff =
          isConfiguredSchoolDay(date) && !isSchoolDay(key, schoolSchedule);
        if (!dayEvents.length)
          return (
            <details className="schedule-week-day schedule-empty-day" key={key}>
              <summary>
                <h2>
                  {formatDate(key)}
                  {key === todayKey ? " · Today" : ""}
                </h2>
                <span>{schoolOff ? "No school" : "Nothing scheduled"}</span>
              </summary>
              <button
                onClick={() => {
                  selectDay(date);
                  setShowForm(true);
                }}
              >
                Add practice
              </button>
            </details>
          );
        return (
          <section
            className="schedule-week-day"
            key={key}
            aria-labelledby={`schedule-day-${key}`}
          >
            <div className="schedule-week-day-head">
              <h2 id={`schedule-day-${key}`}>
                {formatDate(key)}
                {key === todayKey ? " · Today" : ""}
              </h2>
              <button
                onClick={() => {
                  selectDay(date);
                  setShowForm(true);
                }}
              >
                + Add
              </button>
            </div>
            {schoolOff && <p className="schedule-day-off">No school</p>}
            {!dayEvents.length && !schoolOff && (
              <p className="schedule-day-empty">Nothing scheduled</p>
            )}
            {dayEvents.map((event) => (
              <article
                className={`schedule-week-row ${event.type}`}
                key={event.occurrenceId || event.id}
              >
                <span className="schedule-week-time">
                  {formatTime(event.startTime)}–{formatTime(event.endTime)}
                </span>
                <button
                  className="schedule-week-row-main"
                  onClick={() => {
                    selectDay(date);
                    if (event.type === "school") openSchoolForm();
                    else editEvent(event, key);
                  }}
                >
                  <strong>{event.title}</strong>
                  <small>
                    {event.type === "school"
                      ? `School · Lunch ${formatTime(schoolSchedule.lunchStartTime)}`
                      : event.location === "away"
                        ? `Away${event.travelMinutes ? ` · Leave by ${formatTime(`${String(Math.floor((timeToMinutes(event.startTime) - event.travelMinutes) / 60)).padStart(2, "0")}:${String((timeToMinutes(event.startTime) - event.travelMinutes) % 60).padStart(2, "0")}`)}` : ""}`
                        : formatActivityType(event.type)}
                  </small>
                </button>
                <details className="schedule-row-menu">
                  <summary
                    aria-haspopup="menu"
                    aria-label={`Actions for ${event.title}`}
                  >
                    Actions
                  </summary>
                  <div role="menu">
                    <button
                      role="menuitem"
                      onClick={() => {
                        selectDay(date);
                        if (event.type === "school") openSchoolForm();
                        else editEvent(event, key);
                      }}
                    >
                      Edit
                    </button>
                    {event.type === "school" ? (
                      <button
                        role="menuitem"
                        onClick={() => cancelSchoolDay(key)}
                      >
                        Skip this day
                      </button>
                    ) : event.recurringSeries ? (
                      <button
                        role="menuitem"
                        onClick={() => skipRecurringOccurrence(event, key)}
                      >
                        Skip this day
                      </button>
                    ) : null}
                    {event.type !== "school" && (
                      <button
                        role="menuitem"
                        onClick={() => deleteEvent(event.id, key)}
                      >
                        Delete…
                      </button>
                    )}
                  </div>
                </details>
              </article>
            ))}
          </section>
        );
      })}
      <aside className="schedule-week-glance card">
        <h2>This week at a glance</h2>
        <p>
          {weekDays.reduce(
            (count, day) =>
              count +
              eventsForDate(events, getDateKey(day)).filter(
                (event) => event.type === "practice",
              ).length,
            0,
          )}{" "}
          practices
        </p>
        <p>
          {weekDays.reduce(
            (count, day) =>
              count +
              eventsForDate(events, getDateKey(day)).filter(
                (event) => event.type === "game",
              ).length,
            0,
          )}{" "}
          games
        </p>
        <p>
          {weekDays.reduce(
            (count, day) =>
              count +
              eventsForDate(events, getDateKey(day)).filter(
                (event) => event.location === "away",
              ).length,
            0,
          )}{" "}
          away trips
        </p>
        <h3>{formatDate(selectedKey)}</h3>
        <p>
          {selectedEvents.length
            ? selectedEvents.map((event) => event.title).join(", ")
            : "Nothing scheduled"}
        </p>
      </aside>
    </div>
  );
}
