import { useState, useRef } from "react";
import { Shell } from "../../components/AppFrame.jsx";
import { Dialog } from "../../components/Dialog.jsx";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog.jsx";
import { useStore } from "../../store.js";
import { uid } from "../../domain/storage.js";
import {
  formatActivityType,
  formatDate,
  formatDuration,
  formatLocation,
  formatTime,
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
export default function ScheduleCalendar({
  events,
  setEvents,
  schoolSchedule,
  setSchoolSchedule,
  todayKey,
}) {
  const { current } = useStore();
  const sport = current.data.profile.sport?.trim() || "";
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
  const [showSchoolForm, setShowSchoolForm] = useState(false);
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
  const activityPlaceholder = `${sport ? `${sport[0].toUpperCase()}${sport.slice(1)} ` : ""}${type}`;
  const [excludedRanges, setExcludedRanges] = useState(
    schoolSchedule?.excludedRanges || [],
  );
  const [daysOffStart, setDaysOffStart] = useState(selectedKey);
  const [daysOffEnd, setDaysOffEnd] = useState(selectedKey);
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

  function closeActivitySheet() {
    if (activityDraft() !== initialActivityDraft.current) {
      setConfirmation({
        title: "Discard changes?",
        body: "Your unsaved activity changes will be lost.",
        confirmLabel: "Discard changes",
        destructive: true,
        onConfirm: () => {
          resetForm();
          setConfirmation(null);
        },
      });
    } else resetForm();
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
      setFormError(
        "End time must be later than start time on the same day. Overnight events are not supported.",
      );
      return;
    }
    if (
      location === "away" &&
      (!Number.isFinite(Number(travelMinutes)) ||
        Number(travelMinutes) < 0 ||
        Number(travelMinutes) > 360)
    ) {
      setFormError("Travel time must be between 0 and 360 minutes.");
      return;
    }
    if (
      editingScope !== "date" &&
      repeatMode === "weekly" &&
      !repeatWeekdays.length
    ) {
      setFormError("Choose at least one repeat day.");
      return;
    }
    if (
      editingScope !== "date" &&
      repeatMode === "weekly" &&
      repeatEndDate < selectedKey
    ) {
      setFormError(
        "The repeat end date must be on or after the first activity.",
      );
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
      setFormError(
        "Travel cannot begin on the previous day. Adjust the start or travel time.",
      );
      return;
    }
    const existingEvent = events.find((item) => item.id === editingId);
    const eventFields = {
      type,
      title:
        title.trim() ||
        `${activityPlaceholder[0].toUpperCase()}${activityPlaceholder.slice(1)}`,
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
    if (schoolEndDate < schoolStartDate) {
      setSchoolError("The school year must end after it starts.");
      return;
    }
    if (schoolEndTime <= schoolStartTime) {
      setSchoolError("The school day must end after it starts.");
      return;
    }
    if (!schoolWeekdays.length) {
      setSchoolError("Choose at least one school day.");
      return;
    }
    if (
      lunchEndTime <= lunchStartTime ||
      lunchStartTime < schoolStartTime ||
      lunchEndTime > schoolEndTime
    ) {
      setSchoolError(
        "Lunch must fit inside the school day and end after it starts.",
      );
      return;
    }
    if (
      [morningSnackTime, afternoonSnackTime].some(
        (time) => time && (time < schoolStartTime || time > schoolEndTime),
      )
    ) {
      setSchoolError("Optional snack times must fall inside the school day.");
      return;
    }
    const parsedCommuteMinutes = Number(commuteMinutes);
    if (
      !Number.isFinite(parsedCommuteMinutes) ||
      parsedCommuteMinutes < 0 ||
      parsedCommuteMinutes > 180
    ) {
      setSchoolError("Commute time must be between 0 and 180 minutes.");
      return;
    }
    if (pauseSchool && pausedUntil < pausedFrom) {
      setSchoolError("Pause end must be on or after its start.");
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
      setSchoolError(
        "Choose a days-off range with an end on or after its start.",
      );
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

  return (
    <Shell eyebrow="NOURALLY / SCHEDULE">
      <section className="calendar-head">
        <div>
          <p className="kicker">SCHOOL + TRAINING SCHEDULE</p>
          <h1>Schedule</h1>
        </div>
        <div className="page-head-tools">
          <button
            className="primary"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
          >
            + Add
          </button>
          <button className="school-button" onClick={openSchoolForm}>
            School day
          </button>
        </div>
      </section>
      {(schoolSchedule || showSchoolForm) && (
        <section className="card school-schedule-card">
          <div className="school-schedule-summary">
            <div>
              <div className="section-label">SCHOOL CALENDAR</div>
              <h2>{schoolSchedule?.name || "Set your school schedule"}</h2>
              {schoolSchedule && (
                <>
                  <p>
                    {formatDate(schoolSchedule.startDate, { year: true })} –{" "}
                    {formatDate(schoolSchedule.endDate, { year: true })} ·{" "}
                    {formatTime(schoolSchedule.startTime)}–
                    {formatTime(schoolSchedule.endTime)}
                  </p>
                  {schoolSchedule.lunchStartTime && (
                    <p className="school-food-summary">
                      Lunch {formatTime(schoolSchedule.lunchStartTime)}–
                      {formatTime(schoolSchedule.lunchEndTime)} ·{" "}
                      {schoolSchedule.commuteMinutes ?? 20} min commute
                    </p>
                  )}
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
              )}
            </div>
            <div className="school-summary-actions">
              <button
                className="text-button"
                onClick={() =>
                  showSchoolForm ? setShowSchoolForm(false) : openSchoolForm()
                }
              >
                {showSchoolForm ? "Close" : schoolSchedule ? "Edit" : "Set up"}
              </button>
            </div>
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
      )}
      <div className="agenda-date-strip">
        {calendarMode === "month" && (
          <label>
            Selected date
            <input
              type="date"
              value={selectedKey}
              onChange={(e) => {
                if (e.target.value)
                  selectDay(new Date(`${e.target.value}T12:00:00`));
              }}
            />
          </label>
        )}
        <div
          className="schedule-view-control"
          role="radiogroup"
          aria-label="Schedule view"
        >
          {[
            ["week", "Week"],
            ["month", "Month"],
          ].map(([mode, label]) => (
            <button
              key={mode}
              role="radio"
              aria-checked={calendarMode === mode}
              className={calendarMode === mode ? "selected" : ""}
              onClick={() => chooseCalendarMode(mode)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {calendarMode === "week" && (
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
                <details
                  className="schedule-week-day schedule-empty-day"
                  key={key}
                >
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
      )}
      <section
        className={`calendar-layout ${calendarMode === "week" ? "week-mode" : ""}`}
      >
        {calendarMode === "month" && (
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
        )}
        {calendarMode === "month" && (
          <aside className="card day-agenda">
            <div className="agenda-head">
              <div>
                <span>
                  {new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(
                    selectedDate,
                  )}
                </span>
                <strong>
                  {new Intl.DateTimeFormat("en-US", {
                    month: "long",
                    day: "numeric",
                  }).format(selectedDate)}
                </strong>
              </div>
              <button
                className="primary small"
                onClick={() => {
                  setShowSchoolForm(false);
                  if (showForm) closeActivitySheet();
                  else {
                    resetForm();
                    setShowForm(true);
                  }
                }}
              >
                {showForm ? "Cancel" : "+ Add"}
              </button>
            </div>
            {events
              .filter((e) => e.recurrence?.excludedDates?.includes(selectedKey))
              .map((e) => (
                <div className="school-canceled" key={e.id}>
                  <span>
                    {e.title} · Skipped on {formatDate(selectedKey)}
                  </span>
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
            {!showForm && (
              <>
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
                {selectedEvents.length ? (
                  <div className="agenda-events">
                    {selectedEvents.map((event) => (
                      <article
                        className={`agenda-event ${event.type}`}
                        key={event.occurrenceId || event.id}
                      >
                        <div className="event-time">
                          <strong>{formatTime(event.startTime)}</strong>
                          <span>{formatTime(event.endTime)}</span>
                        </div>
                        <div className="event-details">
                          <span>{formatActivityType(event.type)}</span>
                          <h3>{event.title}</h3>
                          <p>
                            {formatDuration(event.startTime, event.endTime)}
                            {!event.recurring && event.location
                              ? ` · ${event.location === "home" ? "Home" : formatLocation(event.location)}${event.travelMinutes ? ` · ${event.travelMinutes} min travel` : ""}`
                              : ""}
                          </p>
                        </div>
                        <div className="event-actions">
                          {event.recurring ? (
                            <>
                              <button onClick={openSchoolForm}>
                                Edit schedule
                              </button>
                              <button
                                className="danger"
                                onClick={() => cancelSchoolDay(selectedKey)}
                                aria-label={`Cancel school on ${formatDate(selectedKey)}`}
                              >
                                Cancel this day
                              </button>
                            </>
                          ) : event.recurringSeries ? (
                            <>
                              <button
                                onClick={() => editEvent(event)}
                                aria-label={`Edit ${event.title}`}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => skipRecurringOccurrence(event)}
                                aria-label={`Skip ${event.title} on ${formatDate(selectedKey)}`}
                              >
                                Skip this day
                              </button>
                              <button
                                className="danger"
                                onClick={() => deleteEvent(event.id)}
                                aria-label={`Delete ${event.title}`}
                              >
                                Delete…
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => editEvent(event)}
                                aria-label={`Edit ${event.title}`}
                              >
                                Edit
                              </button>
                              <button
                                className="danger"
                                onClick={() => deleteEvent(event.id)}
                                aria-label={`Delete ${event.title}`}
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  !selectedSchoolCanceled && (
                    <div className="agenda-empty">
                      <span>＋</span>
                      <h3>Nothing scheduled.</h3>
                      <p>
                        Add a workout, practice, or game—or set your school
                        schedule.
                      </p>
                    </div>
                  )
                )}
              </>
            )}
          </aside>
        )}
      </section>
      {showForm && (
        <ActivitySheet
          model={{
            editingId,
            selectedKey,
            type,
            closeActivitySheet,
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
            <button
              className="primary"
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
