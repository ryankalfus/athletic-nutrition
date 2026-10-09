import { Plus } from "lucide-react";
import { useState } from "react";
import { Shell } from "../../components/AppFrame.jsx";
import { useStore } from "../../store.js";
import { formatDate, formatTime, formatWeekdays } from "../../format.js";
import {
  getDateKey,
  addDays,
  eventsForDate,
  isSchoolDay,
  sportEventTitle,
  withSportTitles,
} from "../../domain/timing.js";
import { useActivityEditor } from "./useActivityEditor.jsx";
import { useSchoolEditor } from "./useSchoolEditor.jsx";
import ScheduleWeek from "./ScheduleWeek.jsx";
import ScheduleRow from "./ScheduleRow.jsx";
import MonthGrid from "./MonthGrid.jsx";
import { SegmentedControl } from "../../components/ui/SelectionControls.jsx";
export default function ScheduleCalendar({
  events,
  setEvents,
  schoolSchedule,
  setSchoolSchedule,
  todayKey,
}) {
  const { current } = useStore();
  const sport = current.data.profile.sport || "";
  const today = new Date(`${todayKey}T12:00:00`);
  const [selectedKey, setSelectedKey] = useState(todayKey);
  const [monthCursor, setMonthCursor] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [showForm] = useState(
    () =>
      new URLSearchParams(window.location.hash.split("?")[1]).get("add") ===
      "practice",
  );
  const [calendarMode, setCalendarMode] = useState(() =>
    localStorage.getItem("nourally-schedule-view") === "month"
      ? "month"
      : "week",
  );
  // #/schedule?school=edit (Today's "Add school day") opens the editor.
  const [showSchoolForm] = useState(
    () =>
      new URLSearchParams(window.location.hash.split("?")[1]).get("school") ===
      "edit",
  );
  const activity = useActivityEditor({
    events,
    setEvents,
    sport,
    todayKey,
    initiallyAdding: showForm,
  });
  const school = useSchoolEditor({
    schoolSchedule,
    setSchoolSchedule,
    todayKey,
    initiallyOpen: showSchoolForm,
  });
  const monthStart = new Date(
    monthCursor.getFullYear(),
    monthCursor.getMonth(),
    1,
  );
  const gridStart = addDays(monthStart, -monthStart.getDay());
  const calendarDays = Array.from({ length: 42 }, (_, index) =>
    addDays(gridStart, index),
  );
  const selectedDate = new Date(`${selectedKey}T12:00:00`);
  const weekStart = addDays(selectedDate, -((selectedDate.getDay() + 6) % 7));
  const weekDays = Array.from({ length: 7 }, (_, index) =>
    addDays(weekStart, index),
  );
  const selectedEvents = getEventsForDay(selectedDate);
  const selectedSchoolCanceled =
    schoolSchedule?.enabled &&
    isConfiguredSchoolDay(selectedDate) &&
    !isSchoolDay(selectedKey, schoolSchedule);
  const selectedSingleDayOff =
    schoolSchedule?.excludedDates?.includes(selectedKey) &&
    !schoolSchedule?.excludedRanges?.some(
      (range) => selectedKey >= range.startDate && selectedKey <= range.endDate,
    ) &&
    !(
      schoolSchedule?.pausedFrom &&
      schoolSchedule?.pausedUntil &&
      selectedKey >= schoolSchedule.pausedFrom &&
      selectedKey <= schoolSchedule.pausedUntil
    );

  function isConfiguredSchoolDay(date) {
    if (
      !schoolSchedule ||
      getDateKey(date) < schoolSchedule.startDate ||
      getDateKey(date) > schoolSchedule.endDate
    )
      return false;
    return schoolSchedule.weekdays.includes(date.getDay());
  }

  function getSchoolEvent(date) {
    const key = getDateKey(date);
    if (!isSchoolDay(key, schoolSchedule)) return null;
    return {
      id: `school-${key}`,
      date: key,
      type: "school",
      // COPY-29: the agenda row reads "School day".
      title: "School day",
      startTime: schoolSchedule.startTime,
      endTime: schoolSchedule.endTime,
      intensity: "school day",
      recurring: true,
    };
  }

  function getEventsForDay(date) {
    const key = getDateKey(date);
    // SCH-09: "Soccer practice", as on Today, in rows, menus and dialogs.
    const dayEvents = withSportTitles(eventsForDate(events, key), sport);
    const schoolEvent = getSchoolEvent(date);
    return (schoolEvent ? [...dayEvents, schoolEvent] : dayEvents).sort(
      (a, b) => a.startTime.localeCompare(b.startTime),
    );
  }

  function selectDay(date) {
    const key = getDateKey(date);
    setSelectedKey(key);
    if (
      date.getMonth() !== monthCursor.getMonth() ||
      date.getFullYear() !== monthCursor.getFullYear()
    ) {
      setMonthCursor(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  }

  function goToToday() {
    setSelectedKey(todayKey);
    setMonthCursor(new Date(today.getFullYear(), today.getMonth(), 1));
  }

  function chooseCalendarMode(mode) {
    setCalendarMode(mode);
    localStorage.setItem("nourally-schedule-view", mode);
  }

  function cancelSchoolDay(dateKey) {
    setSchoolSchedule(
      (current) => ({
        ...current,
        excludedDates: [
          ...new Set([...(current.excludedDates || []), dateKey]),
        ],
      }),
      "No school that day.",
    );
  }

  function restoreSchoolDay(dateKey) {
    setSchoolSchedule(
      (current) => ({
        ...current,
        excludedDates: (current.excludedDates || []).filter(
          (date) => date !== dateKey,
        ),
      }),
      "School day restored.",
    );
  }

  const addOn = (date) => {
    selectDay(date);
    activity.openNew(getDateKey(date));
  };
  const addActivity = () => activity.openNew(selectedKey);
  const openSchoolForm = () => school.open(selectedKey);
  const editEvent = (event, key = selectedKey) => activity.edit(event, key);
  const deleteEvent = (id, key = selectedKey) => activity.remove(id, key);
  const skipRecurringOccurrence = (event, key = selectedKey) =>
    activity.skip(event, key);
  const onEditRow = (event, key) => {
    if (event.type === "school") openSchoolForm();
    else editEvent(event, key);
  };
  const skippedHere = events.filter((e) =>
    e.recurrence?.excludedDates?.includes(selectedKey),
  );

  return (
    <Shell action={{ label: "+ Add", onClick: addActivity }}>
      <header className="calendar-head">
        <h1 className="page-title">Schedule</h1>
        <div className="page-head-tools">
          <button className="primary" onClick={addActivity}>
            + Add
          </button>
        </div>
      </header>
      {/* School row (6.9): one line and one way in, "Edit". */}
      <section className="card school-schedule-card">
        <div className="school-schedule-summary">
          <div>
            <h2>School day</h2>
            {schoolSchedule ? (
              <>
                <p>
                  <span className="nowrap">
                    {formatWeekdays(schoolSchedule.weekdays)}
                  </span>
                  {" · "}
                  <span className="nowrap">
                    {formatTime(schoolSchedule.startTime)}–
                    {formatTime(schoolSchedule.endTime)}
                  </span>
                  {schoolSchedule.lunchStartTime && (
                    <>
                      {" · "}
                      <span className="nowrap">
                        Lunch {formatTime(schoolSchedule.lunchStartTime)}
                      </span>
                    </>
                  )}
                </p>
                {schoolSchedule.pausedFrom &&
                  schoolSchedule.pausedUntil &&
                  todayKey >= schoolSchedule.pausedFrom &&
                  todayKey <= schoolSchedule.pausedUntil && (
                    <p>
                      Paused {formatDate(schoolSchedule.pausedFrom)} –{" "}
                      {formatDate(schoolSchedule.pausedUntil)}
                    </p>
                  )}
                {schoolSchedule.excludedRanges?.length > 0 && (
                  <p>
                    No school:{" "}
                    {schoolSchedule.excludedRanges
                      .map((range) =>
                        range.startDate === range.endDate
                          ? formatDate(range.startDate)
                          : `${formatDate(range.startDate)} – ${formatDate(range.endDate)}`,
                      )
                      .join(", ")}
                  </p>
                )}
              </>
            ) : (
              <p>Add your school hours so food fits around class.</p>
            )}
          </div>
          <button
            className="text-button"
            aria-label={
              schoolSchedule ? "Edit school day" : "Set up school day"
            }
            onClick={openSchoolForm}
          >
            {schoolSchedule ? "Edit" : "Set up"}
          </button>
        </div>
        {school.element}
      </section>
      <div className="agenda-date-strip">
        <SegmentedControl
          label="Schedule view"
          options={[
            ["week", "Week"],
            ["month", "Month"],
          ]}
          value={calendarMode}
          onChange={chooseCalendarMode}
        />
      </div>
      {calendarMode === "week" && (
        <ScheduleWeek
          {...{
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
          }}
        />
      )}
      {calendarMode === "month" && (
        <section className="calendar-layout">
          <MonthGrid
            {...{
              monthCursor,
              setMonthCursor,
              calendarDays,
              getEventsForDay,
              todayKey,
              selectedKey,
              selectDay,
              goToToday,
            }}
          />
          {/* The selected day: the same heading and rows as Week view. */}
          <aside className="card day-agenda" aria-labelledby="day-agenda-title">
            <div className="schedule-week-day-head">
              <h2 id="day-agenda-title">
                {formatDate(selectedKey)}
                {selectedKey === todayKey && (
                  <>
                    {" "}
                    <span className="badge badge-today">Today</span>
                  </>
                )}
              </h2>
              <button
                type="button"
                className="icon-button schedule-day-add"
                aria-label={`Add activity on ${formatDate(selectedKey)}`}
                onClick={() => addOn(selectedDate)}
              >
                <Plus size={20} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>
            {skippedHere.map((e) => (
              <div className="school-canceled" key={e.id}>
                <span>{sportEventTitle(e, sport)} · Skipped this day</span>
                <button
                  onClick={() =>
                    setEvents(
                      (list) =>
                        list.map((item) =>
                          item.id === e.id
                            ? {
                                ...item,
                                recurrence: {
                                  ...item.recurrence,
                                  excludedDates:
                                    item.recurrence.excludedDates.filter(
                                      (date) => date !== selectedKey,
                                    ),
                                },
                              }
                            : item,
                        ),
                      "Day restored.",
                    )
                  }
                >
                  Restore this day
                </button>
              </div>
            ))}
            {selectedSchoolCanceled && (
              <div className="school-canceled">
                <span>No school this day.</span>
                {selectedSingleDayOff && (
                  <button onClick={() => restoreSchoolDay(selectedKey)}>
                    Restore
                  </button>
                )}
              </div>
            )}
            {selectedEvents.map((event) => (
              <ScheduleRow
                key={event.occurrenceId || event.id}
                event={event}
                dateKey={selectedKey}
                schoolSchedule={schoolSchedule}
                onEdit={onEditRow}
                onSkipSchool={cancelSchoolDay}
                onSkip={skipRecurringOccurrence}
                onDelete={deleteEvent}
              />
            ))}
            {!selectedEvents.length && !selectedSchoolCanceled && (
              <p className="schedule-day-empty">Nothing scheduled</p>
            )}
          </aside>
        </section>
      )}
      {activity.element}
    </Shell>
  );
}
