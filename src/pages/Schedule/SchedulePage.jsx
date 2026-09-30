import { Plus } from "lucide-react";
import { useState, useRef } from "react";
import { Shell } from "../../components/AppFrame.jsx";
import { Dialog, DialogCancel } from "../../components/Dialog.jsx";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog.jsx";
import { useStore } from "../../store.js";
import { uid } from "../../domain/storage.js";
import {
  formatDate,
  formatTime,
  formatWeekdays,
  plural,
} from "../../format.js";
import {
  getDateKey,
  addDays,
  timeToMinutes,
  eventsForDate,
  isSchoolDay,
  applyOccurrenceOverride,
  skipOccurrence,
} from "../../domain/timing.js";
import { SchoolDayEditor } from "./SchoolDayEditor.jsx";
import { ActivitySheet } from "./ActivitySheet.jsx";
import { activityTitle } from "../../domain/sport.js";
import { schoolDayProblem } from "../../domain/setup.js";
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
  const schoolYearStart =
    today.getMonth() >= 6 ? today.getFullYear() : today.getFullYear() - 1;
  const [selectedKey, setSelectedKey] = useState(todayKey);
  const [monthCursor, setMonthCursor] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [showForm, setShowForm] = useState(
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
  const [showSchoolForm, setShowSchoolForm] = useState(
    () =>
      new URLSearchParams(window.location.hash.split("?")[1]).get("school") ===
      "edit",
  );
  const [editingId, setEditingId] = useState(null);
  const [editingScope, setEditingScope] = useState("all");
  const [scopePrompt, setScopePrompt] = useState(null);
  const [type, setType] = useState("practice");
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("16:00");
  const [endTime, setEndTime] = useState("17:30");
  const [intensity, setIntensity] = useState("medium");
  const [location, setLocation] = useState("home");
  const [travelMinutes, setTravelMinutes] = useState("0");
  const [notes, setNotes] = useState("");
  const [repeatMode, setRepeatMode] = useState("once");
  const [repeatWeekdays, setRepeatWeekdays] = useState([today.getDay()]);
  const [repeatEndDate, setRepeatEndDate] = useState(
    getDateKey(addDays(today, 84)),
  );
  const [formError, setFormError] = useState("");
  const initialActivityDraft = useRef("");
  const [confirmation, setConfirmation] = useState(null);
  const [schoolName, setSchoolName] = useState(
    schoolSchedule?.name || "School",
  );
  const [schoolStartDate, setSchoolStartDate] = useState(
    schoolSchedule?.startDate || `${schoolYearStart}-08-15`,
  );
  const [schoolEndDate, setSchoolEndDate] = useState(
    schoolSchedule?.endDate || `${schoolYearStart + 1}-06-15`,
  );
  const [schoolStartTime, setSchoolStartTime] = useState(
    schoolSchedule?.startTime || "08:00",
  );
  const [schoolEndTime, setSchoolEndTime] = useState(
    schoolSchedule?.endTime || "15:00",
  );
  const [schoolWeekdays, setSchoolWeekdays] = useState(
    schoolSchedule?.weekdays || [1, 2, 3, 4, 5],
  );
  const [lunchStartTime, setLunchStartTime] = useState(
    schoolSchedule?.lunchStartTime || "11:30",
  );
  const [lunchEndTime, setLunchEndTime] = useState(
    schoolSchedule?.lunchEndTime || "12:00",
  );
  const [morningSnackTime, setMorningSnackTime] = useState(
    schoolSchedule?.morningSnackTime || "",
  );
  const [afternoonSnackTime, setAfternoonSnackTime] = useState(
    schoolSchedule?.afternoonSnackTime || "",
  );
  const [commuteMinutes, setCommuteMinutes] = useState(
    String(schoolSchedule?.commuteMinutes ?? 20),
  );
  const [foodAccess, setFoodAccess] = useState(
    schoolSchedule?.foodAccess || {
      cafeteria: true,
      refrigerator: false,
      microwave: false,
      eatInClass: false,
    },
  );
  const [schoolError, setSchoolError] = useState("");
  const activityPlaceholder = activityTitle(sport, type);
  const [excludedRanges, setExcludedRanges] = useState(
    schoolSchedule?.excludedRanges || [],
  );
  // Days off start empty: no range is suggested until one is picked.
  const [daysOffStart, setDaysOffStart] = useState("");
  const [daysOffEnd, setDaysOffEnd] = useState("");
  const [pauseSchool, setPauseSchool] = useState(
    Boolean(schoolSchedule?.pausedUntil || schoolSchedule?.enabled === false),
  );
  const [pausedFrom, setPausedFrom] = useState(
    schoolSchedule?.pausedFrom || todayKey,
  );
  const [pausedUntil, setPausedUntil] = useState(
    schoolSchedule?.pausedUntil ||
      schoolSchedule?.endDate ||
      `${schoolYearStart + 1}-06-15`,
  );
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

  function activityDraft(fields = {}) {
    return JSON.stringify({
      type,
      title,
      startTime,
      endTime,
      intensity,
      location,
      travelMinutes,
      notes,
      repeatMode,
      repeatWeekdays,
      repeatEndDate,
      selectedKey,
      ...fields,
    });
  }

  if (!initialActivityDraft.current)
    initialActivityDraft.current = activityDraft();

  // The sheet's Dialog asks "Discard changes?" when this is dirty (DS-15).
  const activityDirty = activityDraft() !== initialActivityDraft.current;
  function closeActivitySheet() {
    resetForm();
  }

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
      title: schoolSchedule.name,
      startTime: schoolSchedule.startTime,
      endTime: schoolSchedule.endTime,
      intensity: "school day",
      recurring: true,
    };
  }

  function getEventsForDay(date) {
    const key = getDateKey(date);
    const dayEvents = eventsForDate(events, key);
    const schoolEvent = getSchoolEvent(date);
    return (schoolEvent ? [...dayEvents, schoolEvent] : dayEvents).sort(
      (a, b) => a.startTime.localeCompare(b.startTime),
    );
  }

  function resetForm(resetKey = selectedKey) {
    initialActivityDraft.current = activityDraft({
      type: "practice",
      title: "",
      startTime: "16:00",
      endTime: "17:30",
      intensity: "medium",
      location: "home",
      travelMinutes: "0",
      notes: "",
      repeatMode: "once",
      repeatWeekdays: [new Date(`${resetKey}T12:00:00`).getDay()],
      repeatEndDate: getDateKey(addDays(new Date(`${resetKey}T12:00:00`), 84)),
      selectedKey: resetKey,
    });
    setEditingId(null);
    setEditingScope("all");
    setType("practice");
    setTitle("");
    setStartTime("16:00");
    setEndTime("17:30");
    setIntensity("medium");
    setLocation("home");
    setTravelMinutes("0");
    setNotes("");
    setRepeatMode("once");
    setRepeatWeekdays([new Date(`${resetKey}T12:00:00`).getDay()]);
    setRepeatEndDate(getDateKey(addDays(new Date(`${resetKey}T12:00:00`), 84)));
    setFormError("");
    setShowForm(false);
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
    resetForm(key);
  }

  function goToToday() {
    setSelectedKey(todayKey);
    setMonthCursor(new Date(today.getFullYear(), today.getMonth(), 1));
    resetForm(todayKey);
  }

  function chooseCalendarMode(mode) {
    setCalendarMode(mode);
    localStorage.setItem("nourally-schedule-view", mode);
  }

  async function saveEvent(event, approvedOverlap = false) {
    event.preventDefault();
    if (endTime <= startTime) {
      setFormError({
        message:
          "End time must be later than start time on the same day. Overnight events are not supported.",
        field: "endTime",
      });
      return;
    }
    if (
      location === "away" &&
      (!Number.isFinite(Number(travelMinutes)) ||
        Number(travelMinutes) < 0 ||
        Number(travelMinutes) > 360)
    ) {
      setFormError({
        message: "Travel time must be between 0 and 360 minutes.",
        field: "travel",
      });
      return;
    }
    if (
      editingScope !== "date" &&
      repeatMode === "weekly" &&
      !repeatWeekdays.length
    ) {
      setFormError({
        message: "Choose at least one repeat day.",
        field: "repeatDays",
      });
      return;
    }
    if (
      editingScope !== "date" &&
      repeatMode === "weekly" &&
      repeatEndDate < selectedKey
    ) {
      setFormError({
        message: "The repeat end date must be on or after the first activity.",
        field: "repeatEnd",
      });
      return;
    }
    const overlap = eventsForDate(events, selectedKey).find(
      (e) =>
        e.id !== editingId && startTime < e.endTime && endTime > e.startTime,
    );
    if (overlap && !approvedOverlap) {
      setConfirmation({
        title: "Overlapping activity",
        body: `This overlaps ${overlap.title}. Save anyway?`,
        confirmLabel: "Save anyway",
        onConfirm: async () => {
          if (await saveEvent({ preventDefault() {} }, true))
            setConfirmation(null);
        },
      });
      return;
    }
    if (
      location === "away" &&
      Number(travelMinutes) > timeToMinutes(startTime)
    ) {
      setFormError({
        message:
          "Travel cannot begin on the previous day. Adjust the start or travel time.",
        field: "travel",
      });
      return;
    }
    const existingEvent = events.find((item) => item.id === editingId);
    const eventFields = {
      type,
      title: title.trim() || activityPlaceholder,
      startTime,
      endTime,
      intensity,
      location,
      travelMinutes: location === "away" ? Number(travelMinutes || 0) : 0,
      notes: notes.trim(),
    };
    const scheduledEvent = {
      id: editingId || uid(),
      ...eventFields,
      ...(repeatMode === "weekly"
        ? {
            recurrence: {
              startDate:
                editingId && existingEvent?.recurrence
                  ? existingEvent.recurrence.startDate
                  : selectedKey,
              endDate: repeatEndDate,
              weekdays: [...repeatWeekdays].sort(),
              excludedDates: existingEvent?.recurrence?.excludedDates || [],
              overrides: existingEvent?.recurrence?.overrides || {},
            },
          }
        : { date: selectedKey }),
    };
    const saved = await setEvents((current) =>
      editingId
        ? current.map((item) =>
            item.id !== editingId
              ? item
              : item.recurrence && editingScope === "date"
                ? applyOccurrenceOverride(item, selectedKey, eventFields)
                : scheduledEvent,
          )
        : [...current, scheduledEvent],
    );
    if (saved) resetForm();
    return saved;
  }

  function openEventEditor(event, dateKey, scope = "all") {
    const source =
      scope === "all" && event.recurrence
        ? events.find((item) => item.id === event.id) || event
        : event;
    initialActivityDraft.current = activityDraft({
      type: source.type,
      title: source.title,
      startTime: source.startTime,
      endTime: source.endTime,
      intensity: source.intensity,
      location:
        source.location === "travel" ? "away" : source.location || "home",
      travelMinutes: String(source.travelMinutes || 0),
      notes: source.notes || "",
      repeatMode: source.recurrence ? "weekly" : "once",
      repeatWeekdays: source.recurrence?.weekdays || [
        new Date(`${dateKey}T12:00:00`).getDay(),
      ],
      repeatEndDate:
        source.recurrence?.endDate ||
        getDateKey(addDays(new Date(`${dateKey}T12:00:00`), 84)),
      selectedKey: dateKey,
    });
    setSelectedKey(dateKey);
    setEditingId(event.id);
    setEditingScope(scope);
    setType(source.type);
    setTitle(source.title);
    setStartTime(source.startTime);
    setEndTime(source.endTime);
    setIntensity(source.intensity);
    setLocation(
      source.location === "travel" ? "away" : source.location || "home",
    );
    setTravelMinutes(String(source.travelMinutes || 0));
    setNotes(source.notes || "");
    setRepeatMode(source.recurrence ? "weekly" : "once");
    setRepeatWeekdays(
      source.recurrence?.weekdays || [new Date(`${dateKey}T12:00:00`).getDay()],
    );
    setRepeatEndDate(
      source.recurrence?.endDate ||
        getDateKey(addDays(new Date(`${dateKey}T12:00:00`), 84)),
    );
    setFormError("");
    setShowForm(true);
  }

  function editEvent(event, dateKey = selectedKey) {
    if (event.recurrence) {
      setScopePrompt({ kind: "edit", event, dateKey });
      return;
    }
    openEventEditor(event, dateKey);
  }

  function deleteEvent(id, dateKey = selectedKey) {
    const target = events.find((e) => e.id === id);
    if (target?.recurrence) {
      setScopePrompt({ kind: "delete", event: target, dateKey });
      return;
    }
    setConfirmation({
      title: `Delete ${target?.title}?`,
      body: "This removes this activity.",
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: async () => {
        if (
          await setEvents((current) =>
            current.filter((event) => event.id !== id),
          )
        ) {
          if (editingId === id) resetForm();
          setConfirmation(null);
        }
      },
    });
  }

  function skipRecurringOccurrence(event, dateKey = selectedKey) {
    setEvents((current) =>
      current.map((item) =>
        item.id === event.id ? skipOccurrence(item, dateKey) : item,
      ),
    );
  }

  function toggleRepeatDay(day) {
    setRepeatWeekdays((days) =>
      days.includes(day) ? days.filter((item) => item !== day) : [...days, day],
    );
  }

  async function saveSchoolSchedule(event) {
    event.preventDefault();
    const dayError = schoolDayProblem({
      startDate: schoolStartDate,
      endDate: schoolEndDate,
      startTime: schoolStartTime,
      endTime: schoolEndTime,
      weekdays: schoolWeekdays,
      lunchStartTime,
      lunchEndTime,
    });
    if (dayError) {
      setSchoolError(dayError);
      return;
    }
    if (
      [morningSnackTime, afternoonSnackTime].some(
        (time) => time && (time < schoolStartTime || time > schoolEndTime),
      )
    ) {
      setSchoolError({
        message: "Optional snack times must fall inside the school day.",
        field: "snacks",
      });
      return;
    }
    const parsedCommuteMinutes = Number(commuteMinutes);
    if (
      !Number.isFinite(parsedCommuteMinutes) ||
      parsedCommuteMinutes < 0 ||
      parsedCommuteMinutes > 180
    ) {
      setSchoolError({
        message: "Commute time must be between 0 and 180 minutes.",
        field: "commute",
      });
      return;
    }
    if (pauseSchool && pausedUntil < pausedFrom) {
      setSchoolError({
        message: "Pause end must be on or after its start.",
        field: "pause",
      });
      return;
    }
    const saved = await setSchoolSchedule({
      enabled: true,
      name: schoolName.trim() || "School",
      startDate: schoolStartDate,
      endDate: schoolEndDate,
      startTime: schoolStartTime,
      endTime: schoolEndTime,
      weekdays: [...schoolWeekdays].sort(),
      lunchStartTime,
      lunchEndTime,
      morningSnackTime,
      afternoonSnackTime,
      commuteMinutes: parsedCommuteMinutes,
      foodAccess,
      excludedDates: schoolSchedule?.excludedDates || [],
      excludedRanges,
      pausedFrom: pauseSchool ? pausedFrom : "",
      pausedUntil: pauseSchool ? pausedUntil : "",
    });
    if (saved) {
      setSchoolError("");
      setShowSchoolForm(false);
    }
  }

  function openSchoolForm() {
    if (schoolSchedule) {
      setSchoolName(schoolSchedule.name);
      setSchoolStartDate(schoolSchedule.startDate);
      setSchoolEndDate(schoolSchedule.endDate);
      setSchoolStartTime(schoolSchedule.startTime);
      setSchoolEndTime(schoolSchedule.endTime);
      setSchoolWeekdays(schoolSchedule.weekdays);
      setLunchStartTime(schoolSchedule.lunchStartTime || "11:30");
      setLunchEndTime(schoolSchedule.lunchEndTime || "12:00");
      setMorningSnackTime(schoolSchedule.morningSnackTime || "");
      setAfternoonSnackTime(schoolSchedule.afternoonSnackTime || "");
      setCommuteMinutes(String(schoolSchedule.commuteMinutes ?? 20));
      setFoodAccess(
        schoolSchedule.foodAccess || {
          cafeteria: true,
          refrigerator: false,
          microwave: false,
          eatInClass: false,
        },
      );
      setExcludedRanges(schoolSchedule.excludedRanges || []);
      setPauseSchool(
        Boolean(schoolSchedule.pausedUntil || schoolSchedule.enabled === false),
      );
      setPausedFrom(schoolSchedule.pausedFrom || todayKey);
      setPausedUntil(schoolSchedule.pausedUntil || schoolSchedule.endDate);
    }
    setDaysOffStart(selectedKey);
    setDaysOffEnd(selectedKey);
    setSchoolError("");
    setShowSchoolForm(true);
    resetForm();
  }

  function toggleSchoolDay(day) {
    setSchoolWeekdays((days) =>
      days.includes(day) ? days.filter((item) => item !== day) : [...days, day],
    );
  }

  function toggleFoodAccess(option) {
    setFoodAccess((access) => ({ ...access, [option]: !access[option] }));
  }

  function addDaysOff() {
    if (!daysOffStart || !daysOffEnd || daysOffEnd < daysOffStart) {
      setSchoolError({
        message: "Choose a days-off range with an end on or after its start.",
        field: "daysOff",
      });
      return;
    }
    setExcludedRanges((ranges) =>
      ranges.some(
        (range) =>
          range.startDate === daysOffStart && range.endDate === daysOffEnd,
      )
        ? ranges
        : [...ranges, { startDate: daysOffStart, endDate: daysOffEnd }].sort(
            (a, b) => a.startDate.localeCompare(b.startDate),
          ),
    );
    setSchoolError("");
  }

  function cancelSchoolDay(dateKey) {
    setSchoolSchedule((current) => ({
      ...current,
      excludedDates: [...new Set([...(current.excludedDates || []), dateKey])],
    }));
  }

  function restoreSchoolDay(dateKey) {
    setSchoolSchedule((current) => ({
      ...current,
      excludedDates: (current.excludedDates || []).filter(
        (date) => date !== dateKey,
      ),
    }));
  }

  const addOn = (date) => {
    selectDay(date);
    resetForm(getDateKey(date));
    setShowForm(true);
  };
  const addActivity = () => {
    resetForm();
    setShowForm(true);
  };
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
            <h2>{schoolSchedule?.name || "School day"}</h2>
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
        {showSchoolForm && (
          <SchoolDayEditor
            model={{
              setShowSchoolForm,
              saveSchoolSchedule,
              schoolName,
              setSchoolName,
              schoolStartDate,
              setSchoolStartDate,
              schoolEndDate,
              setSchoolEndDate,
              schoolStartTime,
              setSchoolStartTime,
              schoolEndTime,
              setSchoolEndTime,
              schoolWeekdays,
              toggleSchoolDay,
              lunchStartTime,
              setLunchStartTime,
              lunchEndTime,
              setLunchEndTime,
              morningSnackTime,
              setMorningSnackTime,
              afternoonSnackTime,
              setAfternoonSnackTime,
              commuteMinutes,
              setCommuteMinutes,
              foodAccess,
              toggleFoodAccess,
              daysOffStart,
              setDaysOffStart,
              daysOffEnd,
              setDaysOffEnd,
              addDaysOff,
              excludedRanges,
              setExcludedRanges,
              pauseSchool,
              setPauseSchool,
              pausedFrom,
              setPausedFrom,
              pausedUntil,
              setPausedUntil,
              schoolError,
            }}
          />
        )}
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
                <span>{e.title} · Skipped this day</span>
                <button
                  onClick={() =>
                    setEvents((list) =>
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
      {showForm && (
        <ActivitySheet
          model={{
            editingId,
            selectedKey,
            type,
            closeActivitySheet,
            activityDirty,
            saveEvent,
            setType,
            title,
            setTitle,
            activityPlaceholder,
            editingScope,
            repeatMode,
            setRepeatMode,
            setSelectedKey,
            repeatWeekdays,
            toggleRepeatDay,
            repeatEndDate,
            setRepeatEndDate,
            startTime,
            setStartTime,
            endTime,
            setEndTime,
            location,
            setLocation,
            travelMinutes,
            setTravelMinutes,
            intensity,
            setIntensity,
            notes,
            setNotes,
            formError,
          }}
        />
      )}
      {scopePrompt && (
        <Dialog
          title={
            scopePrompt.kind === "edit"
              ? "Change repeating activity"
              : "Delete repeating activity"
          }
          onClose={() => setScopePrompt(null)}
        >
          <p>
            {scopePrompt.event.title} repeats. Choose which dates to{" "}
            {scopePrompt.kind === "edit" ? "change" : "delete"}.
          </p>
          <div className="scope-options">
            {/* Deleting reads as destructive: "only" outlined in the error
                colour, "all" filled; both 48 px, with Cancel (ACT-03). */}
            <button
              className={
                scopePrompt.kind === "edit" ? "primary" : "danger-outline"
              }
              onClick={async () => {
                const { event, dateKey, kind } = scopePrompt;
                if (kind === "edit") {
                  setScopePrompt(null);
                  openEventEditor(event, dateKey, "date");
                } else if (
                  await setEvents((current) =>
                    current.map((item) =>
                      item.id === event.id
                        ? skipOccurrence(item, dateKey)
                        : item,
                    ),
                  )
                )
                  setScopePrompt(null);
              }}
            >
              {scopePrompt.kind === "edit" ? "Change" : "Delete"} only{" "}
              {formatDate(scopePrompt.dateKey)}
            </button>
            <button
              className={
                scopePrompt.kind === "edit" ? undefined : "danger-button"
              }
              onClick={async () => {
                const { event, dateKey, kind } = scopePrompt;
                if (kind === "edit") {
                  setScopePrompt(null);
                  openEventEditor(event, dateKey, "all");
                } else if (
                  await setEvents((current) =>
                    current.filter((item) => item.id !== event.id),
                  )
                ) {
                  setScopePrompt(null);
                  if (editingId === event.id) resetForm();
                }
              }}
            >
              {scopePrompt.kind === "edit" ? "Change" : "Delete"} all{" "}
              {new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(
                new Date(`${scopePrompt.dateKey}T12:00:00`),
              )}{" "}
              {plural(2, scopePrompt.event.type)}
            </button>
            <DialogCancel />
          </div>
        </Dialog>
      )}
      {confirmation && (
        <ConfirmDialog
          {...confirmation}
          onCancel={() => setConfirmation(null)}
        />
      )}
    </Shell>
  );
}
