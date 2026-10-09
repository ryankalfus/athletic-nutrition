import { useRef, useState } from "react";
import { Dialog, DialogCancel } from "../../components/Dialog.jsx";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog.jsx";
import { uid } from "../../domain/storage.js";
import { activityTitle } from "../../domain/sport.js";
import { formatDate, plural } from "../../format.js";
import {
  addDays,
  applyOccurrenceOverride,
  changeSeriesWeekday,
  deleteSeriesWeekday,
  eventsForDate,
  getDateKey,
  skipOccurrence,
  sportEventTitle,
  timeToMinutes,
  weekdayOf,
} from "../../domain/timing.js";
import { ActivitySheet } from "./ActivitySheet.jsx";

const weekdayName = (dateKey) =>
  new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(
    new Date(`${dateKey}T12:00:00`),
  );
const endFor = (dateKey) =>
  getDateKey(addDays(new Date(`${dateKey}T12:00:00`), 84));

// The activity sheet, the repeat scope question and the delete confirm, shared
// by Schedule and Today's Day rail (TODAY-02: a rail row opens the same
// sheet). Edit scopes: "all" (a one-off or a one-weekday series), "weekday"
// (ACT-02: only that weekday of a multi-weekday series) and "date" (one day).
export function useActivityEditor({
  events,
  setEvents,
  sport = "",
  todayKey,
  initiallyAdding = false,
}) {
  const [showForm, setShowForm] = useState(initiallyAdding);
  const [formDate, setFormDate] = useState(todayKey);
  const [editingId, setEditingId] = useState(null);
  const [editingScope, setEditingScope] = useState("all");
  const [scopePrompt, setScopePrompt] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [type, setType] = useState("practice");
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("16:00");
  const [endTime, setEndTime] = useState("17:30");
  const [intensity, setIntensity] = useState("medium");
  const [location, setLocation] = useState("home");
  const [travelMinutes, setTravelMinutes] = useState("0");
  const [notes, setNotes] = useState("");
  const [repeatMode, setRepeatMode] = useState("once");
  const [repeatWeekdays, setRepeatWeekdays] = useState([weekdayOf(todayKey)]);
  const [repeatEndDate, setRepeatEndDate] = useState(endFor(todayKey));
  const [formError, setFormError] = useState("");
  const initialDraft = useRef("");
  const activityPlaceholder = activityTitle(sport, type);
  const titleOf = (event) => sportEventTitle(event, sport);

  function draft(fields = {}) {
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
      formDate,
      ...fields,
    });
  }
  if (!initialDraft.current) initialDraft.current = draft();
  // The sheet's Dialog asks "Discard changes?" when this is dirty (DS-15).
  const activityDirty = draft() !== initialDraft.current;

  function fill(source, dateKey, scope, id) {
    const values = {
      type: source.type || "practice",
      title: source.title || "",
      startTime: source.startTime || "16:00",
      endTime: source.endTime || "17:30",
      intensity: source.intensity || "medium",
      location:
        source.location === "travel" ? "away" : source.location || "home",
      travelMinutes: String(source.travelMinutes || 0),
      notes: source.notes || "",
      repeatMode: source.recurrence ? "weekly" : "once",
      repeatWeekdays:
        scope === "weekday"
          ? [weekdayOf(dateKey)]
          : source.recurrence?.weekdays || [weekdayOf(dateKey)],
      repeatEndDate: source.recurrence?.endDate || endFor(dateKey),
      formDate: dateKey,
    };
    initialDraft.current = draft(values);
    setEditingId(id);
    setEditingScope(scope);
    setType(values.type);
    setTitle(values.title);
    setStartTime(values.startTime);
    setEndTime(values.endTime);
    setIntensity(values.intensity);
    setLocation(values.location);
    setTravelMinutes(values.travelMinutes);
    setNotes(values.notes);
    setRepeatMode(values.repeatMode);
    setRepeatWeekdays(values.repeatWeekdays);
    setRepeatEndDate(values.repeatEndDate);
    setFormDate(dateKey);
    setFormError("");
  }

  function close() {
    setShowForm(false);
    setEditingId(null);
    setEditingScope("all");
    setFormError("");
  }

  function openNew(dateKey = todayKey) {
    fill({}, dateKey, "all", null);
    setShowForm(true);
  }

  function openEditor(event, dateKey, scope) {
    const series = events.find((item) => item.id === event.id) || event;
    const source =
      scope === "date"
        ? eventsForDate(events, dateKey).find((item) => item.id === event.id) ||
          series
        : series;
    fill(source, dateKey, scope, event.id);
    setShowForm(true);
  }

  // Tapping a row: a repeating activity first asks which dates to change.
  function edit(event, dateKey) {
    const series = events.find((item) => item.id === event.id) || event;
    if (series.recurrence) {
      setScopePrompt({ kind: "edit", event: series, dateKey });
      return;
    }
    openEditor(series, dateKey, "all");
  }

  function remove(id, dateKey) {
    const target = events.find((e) => e.id === id);
    if (!target) return;
    if (target.recurrence) {
      setScopePrompt({ kind: "delete", event: target, dateKey });
      return;
    }
    setConfirmation({
      title: `Delete ${titleOf(target)}?`,
      body: "This removes this activity.",
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: async () => {
        if (await setEvents((current) => current.filter((e) => e.id !== id))) {
          if (editingId === id) close();
          setConfirmation(null);
        }
      },
    });
  }

  function skip(event, dateKey) {
    return setEvents((current) =>
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

  async function saveEvent(event, approvedOverlap = false) {
    event.preventDefault();
    const weekly = editingScope === "weekday" || repeatMode === "weekly";
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
    if (editingScope !== "date" && weekly && !repeatWeekdays.length) {
      setFormError({
        message: "Choose at least one repeat day.",
        field: "repeatDays",
      });
      return;
    }
    if (editingScope !== "date" && weekly && repeatEndDate < formDate) {
      setFormError({
        message: "The repeat end date must be on or after the first activity.",
        field: "repeatEnd",
      });
      return;
    }
    const overlap = eventsForDate(events, formDate).find(
      (e) =>
        e.id !== editingId && startTime < e.endTime && endTime > e.startTime,
    );
    if (overlap && !approvedOverlap) {
      setConfirmation({
        title: "Overlapping activity",
        body: `This overlaps ${titleOf(overlap)}. Save anyway?`,
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
    const existing = events.find((item) => item.id === editingId);
    const fields = {
      type,
      title: title.trim() || activityPlaceholder,
      startTime,
      endTime,
      intensity,
      location,
      travelMinutes: location === "away" ? Number(travelMinutes || 0) : 0,
      notes: notes.trim(),
    };
    const scheduled = {
      id: editingId || uid(),
      ...fields,
      ...(repeatMode === "weekly"
        ? {
            recurrence: {
              startDate: existing?.recurrence
                ? existing.recurrence.startDate
                : formDate,
              endDate: repeatEndDate,
              weekdays: [...repeatWeekdays].sort((a, b) => a - b),
              excludedDates: existing?.recurrence?.excludedDates || [],
              overrides: existing?.recurrence?.overrides || {},
            },
          }
        : { date: formDate }),
    };
    const newId = uid();
    const saved = await setEvents((current) => {
      if (!editingId) return [...current, scheduled];
      const series = current.find((item) => item.id === editingId);
      if (series?.recurrence && editingScope === "date")
        return current.map((item) =>
          item.id === editingId
            ? applyOccurrenceOverride(item, formDate, fields)
            : item,
        );
      if (series?.recurrence && editingScope === "weekday")
        return changeSeriesWeekday(
          current,
          editingId,
          weekdayOf(formDate),
          { fields, weekdays: repeatWeekdays, endDate: repeatEndDate },
          newId,
        );
      return current.map((item) => (item.id === editingId ? scheduled : item));
    });
    if (saved) close();
    return saved;
  }

  async function chooseOnly() {
    const { event, dateKey, kind } = scopePrompt;
    if (kind === "edit") {
      setScopePrompt(null);
      openEditor(event, dateKey, "date");
    } else if (await skip(event, dateKey)) setScopePrompt(null);
  }

  async function chooseAll() {
    const { event, dateKey, kind } = scopePrompt;
    const several = event.recurrence.weekdays.length > 1;
    if (kind === "edit") {
      setScopePrompt(null);
      openEditor(event, dateKey, several ? "weekday" : "all");
      return;
    }
    // ACT-03: "Delete all Friday practices" removes Fridays only; a series
    // that repeats on Fridays alone is removed.
    if (
      await setEvents((current) =>
        deleteSeriesWeekday(current, event.id, weekdayOf(dateKey)),
      )
    ) {
      setScopePrompt(null);
      if (editingId === event.id && !several) close();
    }
  }

  const element = (
    <>
      {showForm && (
        <ActivitySheet
          model={{
            editingId,
            selectedKey: formDate,
            type,
            closeActivitySheet: close,
            activityDirty,
            saveEvent,
            setType,
            title,
            setTitle,
            activityPlaceholder,
            editingScope,
            repeatMode,
            setRepeatMode,
            setSelectedKey: setFormDate,
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
            {titleOf(scopePrompt.event)} repeats. Choose which dates to{" "}
            {scopePrompt.kind === "edit" ? "change" : "delete"}.
          </p>
          <div className="scope-options">
            {/* Deleting reads as destructive: "only" outlined in the error
                colour, "all" filled; both 48 px, with Cancel (ACT-03). */}
            <button
              className={
                scopePrompt.kind === "edit" ? "primary" : "danger-outline"
              }
              onClick={chooseOnly}
            >
              {scopePrompt.kind === "edit" ? "Change" : "Delete"} only{" "}
              {formatDate(scopePrompt.dateKey)}
            </button>
            <button
              className={
                scopePrompt.kind === "edit" ? undefined : "danger-button"
              }
              onClick={chooseAll}
            >
              {scopePrompt.kind === "edit" ? "Change" : "Delete"} all{" "}
              {weekdayName(scopePrompt.dateKey)}{" "}
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
    </>
  );

  return { openNew, edit, remove, skip, element, isOpen: showForm };
}
