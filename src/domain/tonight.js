// ADD-11 / TODAY-07: the evening planner behind the Tonight card and the
// Now card's EVENING state. Pure logic; the Today page renders it.
import {
  addDays,
  eventsForDate,
  getDateKey,
  isSchoolDay,
  timeToMinutes,
  tomorrowPrepTasks,
  withSportTitles,
} from "./timing.js";
import { minutesClock } from "./dayRail.js";
import { formatTime, formatTimeRange } from "../format.js";

// Audit 6.3: show Tonight after 7:00 PM when tomorrow has any activity, and
// any time tomorrow starts before 10:00 AM.
export const EVENING_START_MINUTES = 19 * 60;
export const EARLY_START_MINUTES = 10 * 60;
// Owner decision 2026.09.29: prep is due 30 minutes before school starts or
// before an away activity's Leave by time.
export const PREP_LEAD_MINUTES = 30;

export function nextDateKey(dateKey) {
  return getDateKey(addDays(new Date(`${dateKey}T12:00:00`), 1));
}

export function leaveByMinutes(event) {
  const travel = Number(event?.travelMinutes) || 0;
  if (event?.location !== "away" || travel <= 0) return null;
  return timeToMinutes(event.startTime) - travel;
}

// The Tonight row's sub-line, a short sentence (UX-COPY-01): "Away, leave by
// 8:15 AM" or "Home".
export function tomorrowEventDetail(event) {
  const leave = leaveByMinutes(event);
  return leave != null
    ? `Away, leave by ${formatTime(minutesClock(leave))}`
    : event.location === "away"
      ? "Away"
      : "Home";
}

// The shared list's line: "Soccer game 8:00–9:30 AM, away, leave by 7:30 AM".
export function tomorrowEventLine(event) {
  const detail = tomorrowEventDetail(event);
  return `${event.title} ${formatTimeRange(event.startTime, event.endTime)}, ${detail.charAt(0).toLowerCase()}${detail.slice(1)}`;
}

/**
 * Tomorrow's prep list for every activity (not only the first or an early
 * one). Morning tasks are due 30 min before school or the earliest Leave by.
 * @param {any[]} events tomorrow's events, sorted by start
 * @param {{schoolTomorrow?: boolean, schoolSchedule?: any}} options
 */
export function buildTomorrowTasks(events, options = {}) {
  const { schoolTomorrow = false, schoolSchedule = null } = options;
  if (!events.length) return [];
  const anchors = [
    schoolTomorrow && schoolSchedule?.startTime
      ? timeToMinutes(schoolSchedule.startTime)
      : null,
    ...events.map(leaveByMinutes),
  ].filter((n) => n != null);
  const dueBefore = (list) =>
    list.length ? minutesClock(Math.min(...list) - PREP_LEAD_MINUTES) : null;
  const due = dueBefore(anchors);
  // Breakfast is only due before a morning start, never before a 3 PM bus.
  const breakfastDue = dueBefore(
    anchors.filter((n) => n < EARLY_START_MINUTES),
  );
  /** @type {Array<{label: string, kind: string, dueAt: string | null}>} */
  const tasks = [];
  const add = (task, dueAt = due) => {
    if (!tasks.some((t) => t.label === task.label))
      tasks.push({ label: task.label, kind: task.kind, dueAt });
  };
  for (const event of events) {
    const leave = leaveByMinutes(event);
    for (const task of tomorrowPrepTasks(event))
      add(
        task,
        task.kind === "prep" && leave != null
          ? minutesClock(leave - PREP_LEAD_MINUTES)
          : /breakfast/i.test(task.label)
            ? breakfastDue
            : due,
      );
  }
  if (schoolTomorrow && schoolSchedule && !schoolSchedule.foodAccess?.cafeteria)
    add({ label: "Pack lunch for school", kind: "food" });
  return tasks;
}

export function shouldShowTonight(now, firstEvent) {
  if (!firstEvent) return false;
  const minutes = now.getHours() * 60 + now.getMinutes();
  return (
    minutes >= EVENING_START_MINUTES ||
    timeToMinutes(firstEvent.startTime) < EARLY_START_MINUTES
  );
}

/**
 * Everything the Tonight card needs for tomorrow.
 * @param {{now: Date, todayKey: string, events: any[], schoolSchedule?: any, profile?: any, dayPlans?: Record<string, any[]>}} input
 */
export function eveningPlan({
  now,
  todayKey,
  events,
  schoolSchedule = null,
  profile = {},
  dayPlans = {},
}) {
  const tomorrowKey = nextDateKey(todayKey);
  const tomorrowEvents = withSportTitles(
    eventsForDate(events, tomorrowKey),
    profile?.sport,
  );
  const schoolTomorrow = isSchoolDay(tomorrowKey, schoolSchedule);
  const tasks = dayPlans[tomorrowKey] || [];
  const suggested = buildTomorrowTasks(tomorrowEvents, {
    schoolTomorrow,
    schoolSchedule,
  });
  const toAdd = suggested.filter(
    (task) => !tasks.some((t) => t.label === task.label),
  );
  return {
    show: shouldShowTonight(now, tomorrowEvents[0]),
    tomorrowKey,
    events: tomorrowEvents,
    lines: tomorrowEvents.map(tomorrowEventLine),
    gameDay: tomorrowEvents.some((e) => e.type === "game"),
    schoolTomorrow,
    tasks,
    toAdd,
    done: tasks.filter((t) => t.done).length,
    built: tasks.length > 0 && toAdd.length === 0,
  };
}

// Adds missing tasks without touching ones already checked or edited.
export function mergeTomorrowTasks(list, additions, makeId) {
  const next = [...(list || [])];
  for (const task of additions)
    if (!next.some((t) => t.label === task.label))
      next.push({ ...task, id: makeId(), done: false, independent: true });
  return next;
}
