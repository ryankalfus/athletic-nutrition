import { ideasFor, ideaAccess, DIET_FILTERS, lowCostOn } from "./ranking.js";
import {
  formatCountdown,
  formatTime as formatClock,
  plural,
} from "../format.js";
import { ideaUsesDislike } from "./you.js";
import { activityTitle, normalizeSport } from "./sport.js";
import { activeAllergies, ideaAllergyMatches } from "./allergens.js";

export function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function timeToMinutes(value) {
  if (!value) return 0;
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export { formatClock };

const lowerFirst = (text) =>
  text ? `${text.charAt(0).toLowerCase()}${text.slice(1)}` : text;
const weekdayName = (dateKey, weekday) =>
  new Intl.DateTimeFormat("en-US", { weekday }).format(
    new Date(`${dateKey}T12:00:00`),
  );
const weekdayShort = (dateKey) => weekdayName(dateKey, "short");
const weekdayLong = (dateKey) => weekdayName(dateKey, "long");

// Why a configured school weekday has no school: "paused" (Pause school) or
// "off" (a day off or a days-off range). null on a school day, and on days
// that are never school days (weekends, outside the school year, no school).
export function schoolOffReason(dateKey, schoolSchedule) {
  if (
    !schoolSchedule?.enabled ||
    dateKey < schoolSchedule.startDate ||
    dateKey > schoolSchedule.endDate ||
    !schoolSchedule.weekdays?.includes(new Date(`${dateKey}T12:00:00`).getDay())
  )
    return null;
  if (
    schoolSchedule.pausedFrom &&
    schoolSchedule.pausedUntil &&
    dateKey >= schoolSchedule.pausedFrom &&
    dateKey <= schoolSchedule.pausedUntil
  )
    return "paused";
  if (
    schoolSchedule.excludedDates?.includes(dateKey) ||
    schoolSchedule.excludedRanges?.some(
      (range) => dateKey >= range.startDate && dateKey <= range.endDate,
    )
  )
    return "off";
  return null;
}

export function isSchoolDay(dateKey, schoolSchedule) {
  if (
    !schoolSchedule?.enabled ||
    dateKey < schoolSchedule.startDate ||
    dateKey > schoolSchedule.endDate ||
    schoolSchedule.excludedDates?.includes(dateKey) ||
    schoolSchedule.excludedRanges?.some(
      (range) => dateKey >= range.startDate && dateKey <= range.endDate,
    ) ||
    (schoolSchedule.pausedFrom &&
      schoolSchedule.pausedUntil &&
      dateKey >= schoolSchedule.pausedFrom &&
      dateKey <= schoolSchedule.pausedUntil)
  )
    return false;
  return schoolSchedule.weekdays.includes(
    new Date(`${dateKey}T12:00:00`).getDay(),
  );
}

export function applyOccurrenceOverride(event, dateKey, changes) {
  if (!event.recurrence) throw new Error("This activity does not repeat.");
  const fields = Object.fromEntries(
    Object.entries(changes).filter(
      ([key]) => !["date", "recurrence", "id"].includes(key),
    ),
  );
  return {
    ...event,
    recurrence: {
      ...event.recurrence,
      overrides: {
        ...event.recurrence.overrides,
        [dateKey]: { ...event.recurrence.overrides?.[dateKey], ...fields },
      },
    },
  };
}

export function skipOccurrence(event, dateKey) {
  if (!event.recurrence) throw new Error("This activity does not repeat.");
  return {
    ...event,
    recurrence: {
      ...event.recurrence,
      excludedDates: [
        ...new Set([...(event.recurrence.excludedDates || []), dateKey]),
      ],
    },
  };
}

export function eventOccursOn(event, dateKey) {
  if (event.date) return event.date === dateKey;
  if (!event.recurrence) return false;
  const {
    startDate,
    endDate,
    weekdays = [],
    excludedDates = [],
  } = event.recurrence;
  if (
    dateKey < startDate ||
    dateKey > endDate ||
    excludedDates.includes(dateKey)
  )
    return false;
  return weekdays.includes(new Date(`${dateKey}T12:00:00`).getDay());
}

export function eventsForDate(events, dateKey) {
  return events
    .filter((event) => eventOccursOn(event, dateKey))
    .map((event) =>
      event.recurrence
        ? {
            ...event,
            ...(event.recurrence.overrides?.[dateKey] || {}),
            date: dateKey,
            occurrenceId: `${event.id}-${dateKey}`,
            recurringSeries: true,
          }
        : event,
    )
    .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
}

// ADD-09 sport context: a plain "Practice" or an untitled game reads as
// "Soccer practice" / "Soccer game" once the athlete's sport is set. Names
// only; no sport-specific nutrition (audit 13.4).
const GENERIC_TITLES = new Set([
  "practice",
  "game",
  "workout",
  "activity",
  "other",
]);
export function sportEventTitle(event, sport) {
  const title = String(event?.title || "").trim();
  if (title && !GENERIC_TITLES.has(title.toLowerCase())) return title;
  if (!normalizeSport(sport)) return title || activityTitle("", event?.type);
  return activityTitle(sport, event?.type || "practice");
}
export function withSportTitles(events, sport) {
  return events.map((event) => ({
    ...event,
    title: sportEventTitle(event, sport),
  }));
}

/** @param {any} options */
export function planTasksForIdea(idea, options = {}) {
  const {
    travelMode = false,
    inSchool = false,
    schoolSchedule,
    event,
    date,
  } = options;
  const verb = idea.portable ? "Pack" : "Plan";
  /** @type {Array<{label: string, kind: string, foodId?: string}>} */
  const tasks = [
    { label: `${verb} ${idea.name}`, kind: "food", foodId: idea.id },
  ];
  if (idea.needsCold)
    tasks.push({ label: "Add an ice pack or refrigerate it", kind: "prep" });
  if (idea.needsHeat && inSchool)
    tasks.push({ label: "Confirm microwave access", kind: "prep" });
  if (travelMode)
    tasks.push({ label: "Fill and pack a water bottle", kind: "gear" });
  if (idea.portable)
    tasks.push({
      label: `Put ${idea.name} in your school bag`,
      kind: "gear",
    });
  let dueMinutes = null;
  if (schoolSchedule && date && isSchoolDay(date, schoolSchedule))
    dueMinutes = timeToMinutes(schoolSchedule.startTime) - 30;
  if (event?.location === "away" && Number(event.travelMinutes) > 0)
    dueMinutes =
      timeToMinutes(event.startTime) - Number(event.travelMinutes) - 30;
  return tasks.map((task) => ({
    ...task,
    dueAt:
      dueMinutes == null
        ? null
        : `${String(Math.floor(Math.max(0, dueMinutes) / 60)).padStart(2, "0")}:${String(Math.max(0, dueMinutes) % 60).padStart(2, "0")}`,
  }));
}

export function tomorrowPrepTasks(event) {
  const tasks = [
    { label: "Choose and set out breakfast", kind: "food" },
    { label: "Pack a familiar pre-activity snack", kind: "food" },
    { label: "Fill a water bottle", kind: "gear" },
    { label: "Put uniform, shoes, and gear by the door", kind: "gear" },
  ];
  if (event.location === "away" || Number(event.travelMinutes || 0) >= 30) {
    if (Number(event.travelMinutes) > 0)
      tasks.push({
        label: `Check the route and allow ${event.travelMinutes} ${plural(event.travelMinutes, "minute")} for travel`,
        kind: "prep",
      });
    tasks.push({ label: "Pack one extra shelf-stable snack", kind: "food" });
  }
  return tasks;
}

export function ideaFitsProfile(idea, profile, allergyTagsReviewed) {
  const needs = (profile.dietaryNeeds || []).filter((need) =>
    DIET_FILTERS.includes(need),
  );
  if (needs.includes("vegan") && !idea.vegan) return false;
  if (needs.includes("vegetarian") && !idea.vegetarian) return false;
  if (lowCostOn(profile) && idea.cost !== "save") return false;
  if (ideaUsesDislike(idea, profile.dislikes)) return false;
  if (
    ideaAllergyMatches(idea, activeAllergies(profile, allergyTagsReviewed))
      .length
  )
    return false;
  return true;
}

export function getFuelingGuidance({
  now,
  todayKey,
  events,
  schoolSchedule,
  profile,
  pantry = [],
  favorites = [],
}) {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const sport = profile?.sport;
  const training = withSportTitles(eventsForDate(events, todayKey), sport)
    .map((event) => ({
      ...event,
      start: timeToMinutes(event.startTime),
      end: timeToMinutes(event.endTime),
    }))
    .sort((a, b) => a.start - b.start);
  const active = training.find(
    (event) => currentMinutes >= event.start && currentMinutes < event.end,
  );
  const next = training.find((event) => event.start > currentMinutes);
  const recent = [...training]
    .reverse()
    .find(
      (event) =>
        currentMinutes >= event.end && currentMinutes - event.end <= 90,
    );
  const schoolToday = isSchoolDay(todayKey, schoolSchedule);
  const inSchool =
    schoolToday &&
    currentMinutes >= timeToMinutes(schoolSchedule.startTime) &&
    currentMinutes < timeToMinutes(schoolSchedule.endTime);
  const schoolWindows = inSchool
    ? [
        schoolSchedule.morningSnackTime && {
          label: "Morning snack time",
          start: schoolSchedule.morningSnackTime,
        },
        schoolSchedule.lunchStartTime && {
          label: "Lunch",
          start: schoolSchedule.lunchStartTime,
          end: schoolSchedule.lunchEndTime,
        },
        schoolSchedule.afternoonSnackTime && {
          label: "Afternoon snack time",
          start: schoolSchedule.afternoonSnackTime,
        },
      ]
        .filter(Boolean)
        .sort((a, b) => a.start.localeCompare(b.start))
    : [];
  const activeSchoolWindow = schoolWindows.find(
    (window) =>
      currentMinutes >= timeToMinutes(window.start) &&
      currentMinutes <
        (window.end
          ? timeToMinutes(window.end)
          : timeToMinutes(window.start) + 15),
  );
  const nextSchoolWindow =
    activeSchoolWindow ||
    schoolWindows.find(
      (window) => timeToMinutes(window.start) > currentMinutes,
    );
  const schoolWindowTiming = nextSchoolWindow
    ? `${nextSchoolWindow.label} ${activeSchoolWindow ? `now${nextSchoolWindow.end ? ` until ${formatClock(nextSchoolWindow.end)}` : ""}` : `at ${formatClock(nextSchoolWindow.start)}`}.`
    : "";

  let moment = "regular";
  let state = "regular";
  let label = "Today";
  let title = "Keep a regular eating rhythm today";
  let explanation =
    "No training is coming up soon. Choose a familiar meal or snack and use the next meal or snack instead of waiting until you are drained.";
  let timing = nextSchoolWindow
    ? schoolWindowTiming
    : inSchool
      ? schoolSchedule.foodAccess?.eatInClass
        ? "Use an allowed class or passing-period window."
        : "Use your next allowed meal or snack time."
      : "Eat when you are comfortably hungry.";
  let focusEvent = null;

  if (active) {
    focusEvent = active;
    moment =
      active.end - active.start >= 75 || active.intensity === "high"
        ? "during"
        : "quick";
    label = `${active.title} in progress`;
    title = "Hydrate now; keep mid-session fuel familiar";
    explanation =
      "For a longer or harder session, a familiar easy-to-carry carb may help. Avoid trying a brand-new food during competition or practice.";
    timing = `${formatClock(active.startTime)}–${formatClock(active.endTime)}`;
  } else if (recent) {
    focusEvent = recent;
    moment = "recovery";
    label = `After ${lowerFirst(recent.title)}`;
    title = "Refuel with carbs, protein, and fluids";
    explanation =
      "Choose a familiar option you can actually get now. A regular meal works; a snack can bridge the gap if dinner is later.";
    timing = `Ended ${currentMinutes - recent.end} min ago`;
    if (next)
      timing += ` · Next: ${next.title} at ${formatClock(next.startTime)}`;
  } else if (next) {
    focusEvent = next;
    const minutesUntil = next.start - currentMinutes;
    if (minutesUntil <= 30) {
      moment = "quick";
      label = `${next.title} ${formatCountdown(minutesUntil)}`;
      title = "Choose something small and easy right now";
      explanation =
        "There is not much digestion time. A familiar carb-forward snack and a few sips of water are the practical move.";
    } else if (minutesUntil <= 90) {
      moment = "pre";
      label = `${next.title} ${formatCountdown(minutesUntil)}`;
      title = "Have a practical pre-activity snack now";
      explanation =
        "Choose familiar carbs that fit where you are. Keep heavy, greasy, or brand-new foods for another time.";
    } else if (minutesUntil <= 180) {
      moment = "regular";
      label = `${next.title} ${formatCountdown(minutesUntil)}`;
      title = "Use this meal window before the rush";
      explanation =
        "A balanced meal or substantial snack now can make the school-to-sport transition easier later.";
    } else {
      label = `${next.title} at ${formatClock(next.startTime)}`;
      title = schoolToday
        ? "Plan the handoff from school to sport"
        : "Choose what you'll eat before the activity";
      explanation =
        "Your activity is later today. Choose food you can get and pack it before the day gets busy.";
    }
    timing = `${next.title} at ${formatClock(next.startTime)}${next.location === "away" ? " · away" : ""}${Number(next.travelMinutes) > 0 ? ` · ${next.travelMinutes} min travel` : ""}`;
  }
  if (next && schoolWindowTiming) timing = `${schoolWindowTiming} · ${timing}`;

  const departure = next ? next.start - Number(next.travelMinutes || 0) : null;
  const departed =
    next && Number(next.travelMinutes) > 0 && currentMinutes >= departure;
  const departureLabel =
    departure == null || !Number(next.travelMinutes)
      ? ""
      : `Leave by ${formatClock(`${String(Math.floor(Math.max(departure, 0) / 60)).padStart(2, "0")}:${String(Math.max(departure, 0) % 60).padStart(2, "0")}`)} (${next.travelMinutes} min drive)`;
  if (departureLabel) timing += ` · ${departureLabel}`;
  const tomorrowKey = getDateKey(addDays(new Date(`${todayKey}T12:00:00`), 1));
  const noSchedule =
    !events.length &&
    !schoolSchedule?.enabled &&
    !profile.restDays?.includes(todayKey) &&
    !profile.restWeekdays?.includes(new Date(`${todayKey}T12:00:00`).getDay());
  const quietLate =
    currentMinutes >= 21 * 60 + 30 &&
    !active &&
    !recent &&
    !next &&
    !eventsForDate(events, tomorrowKey).length &&
    !isSchoolDay(tomorrowKey, schoolSchedule);
  if (quietLate) {
    state = "late";
    // "Sat night", not "Tonight": the Tonight card owns that name.
    label = `${weekdayShort(todayKey)} night`;
    title = "Nothing to plan tonight";
    explanation = "There is no school or activity on tomorrow's schedule.";
    timing = "";
  } else if (noSchedule) {
    state = "setup";
    label = "No schedule yet";
    title = "Let's time your food to your day";
    explanation = "Add school and sports to see what is coming up.";
    timing = "";
  } else if (!training.length) {
    label =
      events.length || profile.restDays?.includes(todayKey)
        ? "No practice today"
        : "No schedule yet";
    explanation =
      events.length || profile.restDays?.includes(todayKey)
        ? "No sport is scheduled today. Keep regular meals and snacks that fit your day."
        : "Add school and sports for activity-based timing, or mark today as a rest day.";
  }
  const tomorrowEvent = withSportTitles(
    eventsForDate(events, tomorrowKey),
    sport,
  )[0];
  const markedRest =
    profile.restDays?.includes(todayKey) ||
    profile.restWeekdays?.includes(new Date(`${todayKey}T12:00:00`).getDay());
  if (!["late", "setup"].includes(state)) {
    state = active
      ? "during"
      : recent
        ? "recovery"
        : next
          ? next.start - currentMinutes > 180
            ? "plan_ahead"
            : next.start - currentMinutes > 90
              ? "meal_window"
              : next.start - currentMinutes > 30
                ? "pre"
                : "quick"
          : "no_sport";
    if (state === "plan_ahead")
      title = schoolToday
        ? "Choose your after-school snack"
        : "Choose your pre-activity snack";
    if (state === "meal_window")
      title = `Eat a snack or small meal by ${formatClock(`${String(Math.floor((next.start - 90) / 60)).padStart(2, "0")}:${String((next.start - 90) % 60).padStart(2, "0")}`)}`;
    if (state === "pre") title = "Have a small, familiar snack now";
    if (state === "quick") title = "Something small and easy, plus sips";
    if (state === "during") title = "Sip water. Keep food familiar.";
    if (state === "no_sport") {
      title = "No practice today";
      // The weekday, not "Today" (the page title already says it).
      label = weekdayLong(todayKey);
    }
    if (
      schoolToday &&
      next &&
      currentMinutes < timeToMinutes(schoolSchedule.startTime)
    ) {
      state = "before_school";
      label = `School ${formatCountdown(timeToMinutes(schoolSchedule.startTime) - currentMinutes)}`;
      title = schoolSchedule.foodAccess?.cafeteria
        ? "Pack your after-school snack"
        : "Pack lunch and your after-school snack";
      explanation = "Get your food ready before school starts.";
    } else if (
      next?.location === "away" &&
      Number(next.travelMinutes) > 0 &&
      !departed &&
      departure - currentMinutes <= 90
    ) {
      state = "travel";
      label = departureLabel;
      title = "Pack food and water before leaving";
      explanation =
        "Choose food that travels well and check your departure time.";
    }
    if (activeSchoolWindow && !active && !recent) {
      title =
        activeSchoolWindow.label === "Lunch"
          ? "Lunch time — choose something familiar"
          : "Snack time — choose something familiar";
      explanation = "Use the eating time in your school schedule.";
    }
    if (markedRest && !active && !next) {
      state = "rest";
      label = "Rest day";
      title = "Rest day — keep regular meals";
      explanation = "Keep regular meals and snacks that fit your day.";
    }
    if (
      currentMinutes >= 19 * 60 &&
      tomorrowEvent &&
      !active &&
      !next &&
      !recent
    ) {
      state = "evening";
      label = `Tomorrow: ${tomorrowEvent.title} at ${formatClock(tomorrowEvent.startTime)}`;
      title = "Set up tomorrow tonight";
      explanation = "Set out food, water, and gear for tomorrow.";
    }
  }
  const context = ideaAccess({
    profile,
    schoolSchedule,
    inSchool,
    departed,
    event: focusEvent,
  });
  const availableSources = context.access;
  const travelMode = context.travelMode;
  const ideas = ideasFor({
    moment,
    date: todayKey,
    profile,
    pantry,
    favorites,
    ...context,
  });

  return {
    label,
    state,
    moment,
    departureLabel,
    departed,
    nextEvent: next,
    recentEvent: recent,
    activeSchoolWindow,
    emptyReason: !availableSources.length
      ? "No food source is available in the current school or travel window. Review access or choose a manual food."
      : "No example matches all current timing, dietary, budget, and access settings.",
    title,
    explanation,
    timing,
    allIdeas: ideas,
    ideas: ["setup", "late"].includes(state) ? [] : ideas.slice(0, 3),
    alternates: ideas.slice(3, 9),
    travelMode,
    event: focusEvent,
    gameDay: focusEvent?.type === "game",
    tomorrowEvent,
    schoolSchedule,
    date: todayKey,
    schoolToday,
    inSchool,
  };
}
