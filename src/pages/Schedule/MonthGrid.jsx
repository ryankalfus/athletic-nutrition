import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, getDateKey } from "../../domain/timing.js";
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
  // One tab stop for the grid (the selected day, else the 1st); arrows move by
  // day or week, Home/End to the week's ends, Page Up/Down by month.
  const grid = useRef(null);
  const moved = useRef(false);
  const keys = calendarDays.map(getDateKey);
  const focusKey = keys.includes(selectedKey)
    ? selectedKey
    : getDateKey(
        new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1),
      );
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    grid.current?.querySelector(`[data-key="${selectedKey}"]`)?.focus();
  }, [selectedKey, monthCursor]);
  const onKeyDown = (event, date) => {
    const step = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
      Home: -date.getDay(),
      End: 6 - date.getDay(),
    }[event.key];
    let next;
    if (step !== undefined) next = addDays(date, step);
    else if (event.key === "PageUp" || event.key === "PageDown")
      next = new Date(
        date.getFullYear(),
        date.getMonth() + (event.key === "PageUp" ? -1 : 1),
        Math.min(date.getDate(), 28),
      );
    if (!next) return;
    event.preventDefault();
    moved.current = true;
    selectDay(next);
  };
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
            <ChevronLeft size={20} strokeWidth={1.75} aria-hidden="true" />
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
            <ChevronRight size={20} strokeWidth={1.75} aria-hidden="true" />
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
      <div
        className="calendar-grid"
        ref={grid}
        role="group"
        aria-label={`Days in ${new Intl.DateTimeFormat("en-US", {
          month: "long",
          year: "numeric",
        }).format(monthCursor)}`}
      >
        {calendarDays.map((date) => {
          const key = getDateKey(date);
          const dayEvents = getEventsForDay(date);
          const outsideMonth = date.getMonth() !== monthCursor.getMonth();
          return (
            <button
              type="button"
              className={`calendar-day${outsideMonth ? " outside" : ""}${key === todayKey ? " today" : ""}${key === selectedKey ? " selected" : ""}`}
              key={key}
              data-key={key}
              tabIndex={key === focusKey ? 0 : -1}
              aria-pressed={key === selectedKey}
              aria-current={key === todayKey ? "date" : undefined}
              onKeyDown={(event) => onKeyDown(event, date)}
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
