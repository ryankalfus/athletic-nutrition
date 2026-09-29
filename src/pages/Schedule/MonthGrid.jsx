import { getDateKey } from "../../domain/timing.js";
import { plural } from "../../format.js";

export default function MonthGrid({
  monthCursor,
  setMonthCursor,
  calendarDays,
  getEventsForDay,
  todayKey,
  selectedKey,
  selectDay,
  goToToday,
}) {
  return (
    <div className="card month-calendar">
      <div className="calendar-toolbar">
        <div className="calendar-month-controls">
          <button
            onClick={() =>
              setMonthCursor(
                new Date(
                  monthCursor.getFullYear(),
                  monthCursor.getMonth() - 1,
                  1,
                ),
              )
            }
            aria-label="Previous month"
          >
            ‹
          </button>
          <button
            onClick={() =>
              setMonthCursor(
                new Date(
                  monthCursor.getFullYear(),
                  monthCursor.getMonth() + 1,
                  1,
                ),
              )
            }
            aria-label="Next month"
          >
            ›
          </button>
        </div>
        <h2>
          {new Intl.DateTimeFormat("en-US", {
            month: "long",
            year: "numeric",
          }).format(monthCursor)}
        </h2>
        <button className="today-button" onClick={goToToday}>
          Go to today
        </button>
      </div>
      <div className="weekday-row">
        {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="calendar-grid">
        {calendarDays.map((date) => {
          const key = getDateKey(date);
          const dayEvents = getEventsForDay(date);
          const outsideMonth = date.getMonth() !== monthCursor.getMonth();
          return (
            <button
              type="button"
              className={`calendar-day${outsideMonth ? " outside" : ""}${key === todayKey ? " today" : ""}${key === selectedKey ? " selected" : ""}`}
              key={key}
              onClick={() => {
                selectDay(date);
                window.requestAnimationFrame(() =>
                  document
                    .querySelector(".day-agenda")
                    ?.scrollIntoView({ block: "start" }),
                );
              }}
              aria-label={
                new Intl.DateTimeFormat("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                }).format(date) +
                `, ${dayEvents.length} ${plural(dayEvents.length, "activity")}`
              }
            >
              <span className="day-number">{date.getDate()}</span>
              <span className="day-events">
                {dayEvents.slice(0, 3).map((event) => (
                  <span
                    className={`calendar-event-dot ${event.type}`}
                    key={event.occurrenceId || event.id}
                    aria-hidden="true"
                  />
                ))}
                {dayEvents.length > 0 && (
                  <span className="more-events" aria-hidden="true">
                    {dayEvents.length}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
