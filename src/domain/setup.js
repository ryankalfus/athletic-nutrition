// Schedule-first setup (6.2, ONB-01 to ONB-06, ADD-01). Pure step logic: each
// step turns its draft into saved data, so "Next" saves and a reload resumes
// at data.setupStep.
import { formatTime } from "../format.js";
import { activityTitle, normalizeSport } from "./sport.js";
import { addDays, eventsForDate, getDateKey, timeToMinutes } from "./timing.js";
import { uid } from "./storage.js";
import { SCHOOL_ACCESS } from "./you.js";

export const SETUP_STEPS = [
  "What do you play?",
  "Your school day",
  "Practices and games",
  "Food at school",
  "Food needs",
  "You're set",
];
export const SETUP_STEP_COUNT = SETUP_STEPS.length;

// A stored step outside 0..6 falls back to 0 (not started).
export function normalizeSetupStep(value) {
  return Number.isInteger(value) && value >= 0 && value <= SETUP_STEP_COUNT
    ? value
    : 0;
}

// Step to show when setup is open: never 0 (that is Welcome).
export const resumeStep = (data) =>
  Math.min(Math.max(normalizeSetupStep(data?.setupStep), 1), SETUP_STEP_COUNT);

// The school year that contains `todayKey` (Aug 15 – Jun 15), as Schedule uses.
export function defaultSchoolYear(todayKey = getDateKey()) {
  const date = new Date(`${todayKey}T12:00:00`);
  const start =
    date.getMonth() >= 6 ? date.getFullYear() : date.getFullYear() - 1;
  return { startDate: `${start}-08-15`, endDate: `${start + 1}-06-15` };
}

export const DEFAULT_SCHOOL_DAY = {
  weekdays: [1, 2, 3, 4, 5],
  startTime: "08:00",
  endTime: "15:00",
  lunchStartTime: "11:30",
  lunchEndTime: "12:00",
};

// An empty date or time in the activity sheet: the app's own message on the
// field (aria-invalid, linked by aria-describedby), not the browser's popup
// (A11Y-09). Returns null when every required value is there.
export function missingActivityField({
  date,
  startTime,
  endTime,
  repeatMode,
  repeatEndDate,
  oneDate = false,
}) {
  if (!oneDate && repeatMode !== "weekly" && !date)
    return { message: "Choose a date.", field: "date" };
  if (!oneDate && repeatMode === "weekly" && !repeatEndDate)
    return { message: "Choose the last date it repeats.", field: "repeatEnd" };
  if (!startTime)
    return { message: "Choose a start time.", field: "startTime" };
  if (!endTime) return { message: "Choose an end time.", field: "endTime" };
  return null;
}

// Shared with Schedule's school editor: the same messages for the same rules.
// The problem names the field so forms can mark and focus it (A11Y-09).
export function schoolDayProblem(fields) {
  if (fields.startDate && fields.endDate && fields.endDate < fields.startDate)
    return {
      message: "The school year must end after it starts.",
      field: "endDate",
    };
  if (
    !fields.startTime ||
    !fields.endTime ||
    fields.endTime <= fields.startTime
  )
    return {
      message: "The school day must end after it starts.",
      field: "endTime",
    };
  if (!fields.weekdays?.length)
    return { message: "Choose at least one school day.", field: "weekdays" };
  if (
    !fields.lunchStartTime ||
    !fields.lunchEndTime ||
    fields.lunchEndTime <= fields.lunchStartTime ||
    fields.lunchStartTime < fields.startTime ||
    fields.lunchEndTime > fields.endTime
  )
    return {
      message: "Lunch must fit inside the school day and end after it starts.",
      field: "lunch",
    };
  return null;
}
export function schoolDayError(fields) {
  return schoolDayProblem(fields)?.message || "";
}

// Draft values for step 2 from what is already saved.
export function schoolDraft(schoolSchedule) {
  if (!schoolSchedule) return { ...DEFAULT_SCHOOL_DAY };
  return {
    weekdays: schoolSchedule.weekdays || DEFAULT_SCHOOL_DAY.weekdays,
    startTime: schoolSchedule.startTime || DEFAULT_SCHOOL_DAY.startTime,
    endTime: schoolSchedule.endTime || DEFAULT_SCHOOL_DAY.endTime,
    lunchStartTime:
      schoolSchedule.lunchStartTime || DEFAULT_SCHOOL_DAY.lunchStartTime,
    lunchEndTime:
      schoolSchedule.lunchEndTime || DEFAULT_SCHOOL_DAY.lunchEndTime,
  };
}

// A full school schedule, in the shape Schedule saves, from the step 2 draft.
export function schoolFromSetup(draft, existing, todayKey = getDateKey()) {
  const year = defaultSchoolYear(todayKey);
  return {
    enabled: true,
    name: existing?.name || "School",
    startDate: existing?.startDate || year.startDate,
    endDate: existing?.endDate || year.endDate,
    morningSnackTime: existing?.morningSnackTime || "",
    afternoonSnackTime: existing?.afternoonSnackTime || "",
    commuteMinutes: existing?.commuteMinutes ?? 20,
    foodAccess: existing?.foodAccess || {
      cafeteria: true,
      refrigerator: false,
      microwave: false,
      eatInClass: false,
    },
    excludedDates: existing?.excludedDates || [],
    excludedRanges: existing?.excludedRanges || [],
    pausedFrom: existing?.pausedFrom || "",
    pausedUntil: existing?.pausedUntil || "",
    ...draft,
    weekdays: [...draft.weekdays].sort(),
  };
}

export const DEFAULT_PRACTICE = {
  weekdays: [],
  startTime: "16:00",
  endTime: "17:30",
  location: "home",
};

// Step 3 draft from the events setup created before (Back keeps values).
export function activitiesDraft(schedule = []) {
  const practice = schedule.find((e) => e.setupSource === "practice");
  const game = schedule.find((e) => e.setupSource === "game");
  return {
    practice: practice
      ? {
          weekdays: practice.recurrence?.weekdays || [],
          startTime: practice.startTime,
          endTime: practice.endTime,
          location: practice.location || "home",
        }
      : { ...DEFAULT_PRACTICE },
    game: game
      ? {
          date: game.date,
          startTime: game.startTime,
          endTime: game.endTime,
          location: game.location || "home",
        }
      : null,
  };
}

export function activitiesProblem({ practice, game }) {
  if (practice.weekdays.length && practice.endTime <= practice.startTime)
    return {
      message: "End time must be after start time.",
      field: "practiceEnd",
    };
  if (game && !game.date)
    return { message: "Choose the game date.", field: "gameDate" };
  if (game && game.endTime <= game.startTime)
    return { message: "End time must be after start time.", field: "gameEnd" };
  return null;
}
export function activitiesError(draft) {
  return activitiesProblem(draft)?.message || "";
}

// Replaces the practice and game setup made earlier, so Back → Next never
// duplicates them. Events the athlete added in Schedule are kept.
/**
 * @param {any} draft
 * @param {any[]} [schedule]
 * @param {{sport?: string, todayKey?: string, schoolYearEnd?: string}} [options]
 */
export function activitiesFromSetup(
  { practice, game },
  schedule = [],
  { sport = "", todayKey = getDateKey(), schoolYearEnd } = {},
) {
  const kept = schedule.filter(
    (e) => !["practice", "game"].includes(e.setupSource),
  );
  const prior = (source) => schedule.find((e) => e.setupSource === source);
  const common = {
    intensity: "medium",
    travelMinutes: 0,
    notes: "",
  };
  const next = [...kept];
  if (practice.weekdays.length)
    next.push({
      id: prior("practice")?.id || uid(),
      type: "practice",
      title: activityTitle(sport, "practice"),
      startTime: practice.startTime,
      endTime: practice.endTime,
      location: practice.location,
      ...common,
      setupSource: "practice",
      recurrence: {
        startDate: todayKey,
        endDate:
          schoolYearEnd && schoolYearEnd > todayKey
            ? schoolYearEnd
            : getDateKey(addDays(new Date(`${todayKey}T12:00:00`), 84)),
        weekdays: [...practice.weekdays].sort(),
        excludedDates: [],
        overrides: {},
      },
    });
  if (game)
    next.push({
      id: prior("game")?.id || uid(),
      type: "game",
      title: activityTitle(sport, "game"),
      date: game.date,
      startTime: game.startTime,
      endTime: game.endTime,
      location: game.location,
      ...common,
      setupSource: "game",
    });
  return next;
}

export const SCHOOL_FOOD_CHOICES = SCHOOL_ACCESS;

export function foodAccessDraft(data) {
  const access = data.schoolSchedule?.foodAccess;
  const selected = access
    ? SCHOOL_FOOD_CHOICES.map(([id]) => id).filter((id) => access[id])
    : (data.profile.foodSources || []).includes("cafeteria")
      ? ["cafeteria"]
      : [];
  return { selected, familyPrep: data.profile.familyPrep !== false };
}

// Step 4 writes school food access and the matching food sources.
export function applyFoodAccess(data, { selected, familyPrep }) {
  const sources = new Set(data.profile.foodSources || []);
  sources.add("packed");
  sources.add("home");
  if (selected.includes("cafeteria")) sources.add("cafeteria");
  else sources.delete("cafeteria");
  data.profile.foodSources = ["packed", "cafeteria", "home", "store"].filter(
    (id) => sources.has(id),
  );
  data.profile.familyPrep = familyPrep;
  if (data.schoolSchedule)
    data.schoolSchedule = {
      ...data.schoolSchedule,
      foodAccess: Object.fromEntries(
        SCHOOL_FOOD_CHOICES.map(([id]) => [id, selected.includes(id)]),
      ),
    };
}

export function sportStepData(profile = {}) {
  return {
    name: ["My profile", "Athlete"].includes(profile.name)
      ? ""
      : profile.name || "",
    sport: profile.sport || "",
    season: profile.season || "",
  };
}

export function sportStepError(draft) {
  return normalizeSport(draft.sport) ? "" : "Enter your sport.";
}
export function sportStepProblem(draft) {
  const message = sportStepError(draft);
  return message ? { message, field: "sport" } : null;
}

// Step 6: "Here's your first plan: Soccer practice today at 4:00 PM. Plan a
// snack for about 2:30." Uses the same 90-minute pre-activity window as Today.
export function firstPlanPreview(events = [], now = new Date()) {
  const minutes = now.getHours() * 60 + now.getMinutes();
  for (let offset = 0; offset < 8; offset++) {
    const day = addDays(now, offset);
    const key = getDateKey(day);
    const next = eventsForDate(events, key).find(
      (e) => offset > 0 || timeToMinutes(e.startTime) > minutes,
    );
    if (!next) continue;
    const when =
      offset === 0
        ? "today"
        : offset === 1
          ? "tomorrow"
          : `${offset === 7 ? "next " : ""}${new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(day)}`;
    const start = timeToMinutes(next.startTime);
    const snack = start - 90;
    const clock = (m) =>
      `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    const snackText =
      snack >= 0 && (offset > 0 || snack > minutes)
        ? ` Plan a snack for about ${formatTime(clock(snack)).replace(/ [AP]M$/, "")}.`
        : "";
    return {
      event: next,
      text: `Here's your first plan: ${next.title} ${when} at ${formatTime(next.startTime)}.${snackText}`,
    };
  }
  return {
    event: null,
    text: "Add a practice or game any time on Schedule. Today will time your snacks around it.",
  };
}

// "Last used Mon" on Welcome tiles (ENTRY-03).
export function lastUsedText(iso, now = new Date()) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const start = (d) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((start(now) - start(date)) / 86400000);
  if (days <= 0) return "Last used today";
  if (days === 1) return "Last used yesterday";
  if (days < 7)
    return `Last used ${new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date)}`;
  return `Last used ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date)}`;
}
