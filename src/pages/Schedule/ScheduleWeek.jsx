import { CalendarPlus, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { formatDate, formatDateRange, plural } from "../../format.js";
import {
  addDays,
  eventsForDate,
  getDateKey,
  schoolOffReason,
} from "../../domain/timing.js";
import { EmptyState } from "../../components/ui/EmptyState.jsx";
import ScheduleRow from "./ScheduleRow.jsx";

const OFF_LABEL = { paused: "School paused", off: "Day off" };

// A day heading: "Tue, Sep 29" and a Today badge.
function DayTitle({ dateKey, todayKey, id }) {
  return (
    <h2 id={id}>
      {formatDate(dateKey)}
      {dateKey === todayKey && (
        <>
          {" "}
          <span className="badge badge-today">Today</span>
        </>
      )}
    </h2>
  );
}

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
  addOn,
  openSchoolForm,
  editEvent,
  cancelSchoolDay,
  skipRecurringOccurrence,
  deleteEvent,
}) {
  const days = weekDays.map((date) => ({
    date,
    key: getDateKey(date),
    events: getEventsForDay(date),
  }));
  const weekEmpty = days.every((day) => !day.events.length);
  const count = (test) =>
    weekDays.reduce(
      (total, day) =>
        total + eventsForDate(events, getDateKey(day)).filter(test).length,
      0,
    );
  const glance = [
    [count((e) => e.type === "practice"), "practice"],
    [count((e) => e.type === "game"), "game"],
    [count((e) => e.location === "away"), "away trip"],
  ];
  const onEdit = (event, key) => {
    selectDay(new Date(`${key}T12:00:00`));
    if (event.type === "school") openSchoolForm();
    else editEvent(event, key);
  };
  // Consecutive empty days share one compact list (SCH: collapsible when empty).
  const groups = [];
  for (const day of days) {
    const last = groups.at(-1);
    if (!day.events.length && last?.empty) last.days.push(day);
    else groups.push({ empty: !day.events.length, days: [day] });
  }
  const addButton = (day) => (
    <button
      type="button"
      className="icon-button schedule-day-add"
      aria-label={`Add activity on ${formatDate(day.key)}`}
      onClick={() => addOn(day.date)}
    >
      <Plus size={20} strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
  return (
    <div className="schedule-week">
      <div className="schedule-week-switcher">
        <button
          aria-label={`Previous week, ${formatDate(getDateKey(addDays(weekStart, -7)))} to ${formatDate(getDateKey(addDays(weekStart, -1)))}`}
          onClick={() => selectDay(addDays(selectedDate, -7))}
        >
          <ChevronLeft size={20} strokeWidth={1.75} aria-hidden="true" />
        </button>
        <strong>
          {formatDateRange(getDateKey(weekStart), getDateKey(weekDays[6]))}
        </strong>
        <button
          aria-label={`Next week, ${formatDate(getDateKey(addDays(weekStart, 7)))} to ${formatDate(getDateKey(addDays(weekStart, 13)))}`}
          onClick={() => selectDay(addDays(selectedDate, 7))}
        >
          <ChevronRight size={20} strokeWidth={1.75} aria-hidden="true" />
        </button>
        <button className="text-button schedule-today" onClick={goToToday}>
          Today
        </button>
      </div>
      {weekEmpty ? (
        <EmptyState
          icon={CalendarPlus}
          title="Nothing scheduled this week"
          actions={
            <>
              <button className="primary" onClick={() => addOn(selectedDate)}>
                Add practice
              </button>
              {!schoolSchedule && (
                <button onClick={openSchoolForm}>Set school day</button>
              )}
            </>
          }
        >
          Add practices and games, or set your school day.
        </EmptyState>
      ) : (
        groups.map((group) =>
          group.empty ? (
            <ul className="schedule-empty-days" key={group.days[0].key}>
              {group.days.map((day) => {
                const off = schoolOffReason(day.key, schoolSchedule);
                return (
                  <li key={day.key}>
                    <DayTitle dateKey={day.key} todayKey={todayKey} />
                    <span>{off ? OFF_LABEL[off] : "Nothing scheduled"}</span>
                    {addButton(day)}
                  </li>
                );
              })}
            </ul>
          ) : (
            group.days.map((day) => {
              const off = schoolOffReason(day.key, schoolSchedule);
              return (
                <section
                  className="schedule-week-day"
                  key={day.key}
                  aria-labelledby={`schedule-day-${day.key}`}
                >
                  <div className="schedule-week-day-head">
                    <DayTitle
                      id={`schedule-day-${day.key}`}
                      dateKey={day.key}
                      todayKey={todayKey}
                    />
                    {addButton(day)}
                  </div>
                  {off && <p className="schedule-day-off">{OFF_LABEL[off]}</p>}
                  {day.events.map((event) => (
                    <ScheduleRow
                      key={event.occurrenceId || event.id}
                      event={event}
                      dateKey={day.key}
                      schoolSchedule={schoolSchedule}
                      onEdit={onEdit}
                      onSkipSchool={cancelSchoolDay}
                      onSkip={skipRecurringOccurrence}
                      onDelete={deleteEvent}
                    />
                  ))}
                </section>
              );
            })
          ),
        )
      )}
      <aside className="schedule-week-glance card">
        <h2>This week at a glance</h2>
        {glance.every(([n]) => !n) ? (
          <p>Nothing scheduled this week.</p>
        ) : (
          <ul className="glance-counts">
            {glance.map(([n, word]) => (
              <li key={word}>
                <span className="numeral">{n}</span> {plural(n, word)}
              </li>
            ))}
          </ul>
        )}
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
