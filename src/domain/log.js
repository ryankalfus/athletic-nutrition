// Food › Log: Day timeline and Week summary (P1-08, LOG-01 to LOG-08,
// WEEK-01 to WEEK-04, HIST-03). Pure functions; the pages format the output.
import { ingredientId } from "./food.js";
import { addDays, eventsForDate, getDateKey } from "./timing.js";

// LOG-04: entries added to a past day can use an approximate time.
export const APPROX_TIMES = [
  ["morning", "Morning", "09:00"],
  ["midday", "Midday", "12:00"],
  ["afternoon", "Afternoon", "15:00"],
  ["evening", "Evening", "19:00"],
];

export const isDateKey = (value) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value || "") &&
  !Number.isNaN(new Date(`${value}T12:00:00`).getTime());

/**
 * Food › Log routes: food/log (today), food/log/2026-09-27, food/log/week,
 * food/log/week/2026-09-27. A future or malformed date shows today.
 * @param {string} subroute the part after "food/", e.g. "log/week"
 */
export function parseLogRoute(subroute, todayKey) {
  const parts = String(subroute || "")
    .split("/")
    .slice(1);
  const view = parts[0] === "week" ? "week" : "day";
  const raw = view === "week" ? parts[1] : parts[0];
  return { view, date: isDateKey(raw) && raw <= todayKey ? raw : todayKey };
}

/** "HH:MM" on a 24-hour clock. */
export function clockTime(date = new Date()) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** Shift a date key by whole days. */
export const shiftDate = (dateKey, days) =>
  getDateKey(addDays(new Date(`${dateKey}T12:00:00`), days));

/**
 * Minutes after midnight for a log entry. Reads "HH:MM", older "2:45 PM"
 * entries, an approximate time, then the creation time.
 * @returns {number|null}
 */
export function entryMinutes(entry) {
  const time = String(entry?.time || "").trim();
  let match = time.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (match) return Number(match[1]) * 60 + Number(match[2]);
  match = time.match(/^(\d{1,2}):([0-5]\d)\s*([AaPp])\.?\s*[Mm]\.?$/);
  if (match) {
    const hour = (Number(match[1]) % 12) + (/p/i.test(match[3]) ? 12 : 0);
    return hour * 60 + Number(match[2]);
  }
  const approx = APPROX_TIMES.find(([key]) => key === entry?.approxTime);
  if (approx) return entryMinutes({ time: approx[2] });
  if (entry?.createdAt) {
    const created = new Date(entry.createdAt);
    if (!Number.isNaN(created.getTime()))
      return created.getHours() * 60 + created.getMinutes();
  }
  return null;
}

/** The "HH:MM" an entry was eaten at, for the time field in the edit sheet. */
export function entryClock(entry) {
  if (entry?.approxTime) return "";
  const minutes = entryMinutes({ time: entry?.time });
  return minutes == null
    ? ""
    : `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/**
 * The time fields for a new or edited entry (LOG-04). Editing keeps the
 * original time unless the athlete changed it; a new entry on today uses now;
 * a new entry on a past day needs an approximate or exact time.
 * @param {{date: string, todayKey: string, now?: Date, original?: any,
 *   exact?: string, approx?: string}} options
 * @returns {{time: string|null, approxTime: string|null}}
 */
export function entryTimeFields(options) {
  const { date, todayKey, now = new Date(), original, exact, approx } = options;
  if (exact && /^([01]\d|2[0-3]):[0-5]\d$/.test(exact))
    return { time: exact, approxTime: null };
  if (approx && APPROX_TIMES.some(([key]) => key === approx))
    return { time: null, approxTime: approx };
  if (original)
    return {
      time: original.time ?? null,
      approxTime: original.approxTime ?? null,
    };
  if (date === todayKey) return { time: clockTime(now), approxTime: null };
  throw new Error("Choose about when you ate it.");
}

const isSkipped = (plan) => plan.status === "skipped";

/** Plans linked to one activity on one date (WEEK-04). */
export function plansForActivity(mealPlans, event, dateKey) {
  return (mealPlans || []).filter(
    (plan) =>
      !isSkipped(plan) &&
      plan.date === dateKey &&
      plan.eventId &&
      (plan.eventId === event.id || plan.eventId === event.occurrenceId),
  );
}

/**
 * Plans for a day that were never confirmed. "Did you eat…?" stays available
 * for today and the two days before (6.12).
 */
export function unconfirmedPlans(mealPlans, dateKey, todayKey) {
  if (dateKey > todayKey || dateKey < shiftDate(todayKey, -2)) return [];
  return (mealPlans || [])
    .filter(
      (plan) =>
        plan.date === dateKey &&
        !isSkipped(plan) &&
        !["eaten", "logged"].includes(plan.status),
    )
    .sort((a, b) => String(a.eatAt || "").localeCompare(String(b.eatAt || "")));
}

/**
 * The Day timeline (HIST-03): activities as context rows and food entries,
 * in time order. Entries without a time go last in the order they were added.
 */
export function dayTimeline({ log, events = [], dateKey }) {
  const activities = eventsForDate(events, dateKey).map((event) => ({
    kind: "activity",
    id: event.occurrenceId || event.id,
    event,
    minutes: entryMinutes({ time: event.startTime }),
  }));
  const entries = (log?.entries || []).map((entry, index) => ({
    kind: "entry",
    id: entry.id,
    entry,
    index,
    minutes: entryMinutes(entry),
  }));
  return [...activities, ...entries].sort(
    (a, b) =>
      (a.minutes ?? 24 * 60) - (b.minutes ?? 24 * 60) ||
      (a.kind === b.kind ? 0 : a.kind === "activity" ? -1 : 1) ||
      (a.index ?? 0) - (b.index ?? 0),
  );
}

/**
 * Water for one day (WEEK-03): logged only when there is a water entry, so a
 * day with food and no water reads "No water logged", not "0 oz".
 * @returns {{logged: boolean, ounces: number}}
 */
export function dayWater(log) {
  const logged = (log?.waterEntries || []).length > 0 || Number(log?.water) > 0;
  return { logged, ounces: logged ? Number(log?.water) || 0 : 0 };
}

/** The last seven dates ending on endKey, newest first. */
export const weekDates = (endKey) =>
  Array.from({ length: 7 }, (_, index) => shiftDate(endKey, -index));

const isRestDay = (profile, dateKey) =>
  Boolean(
    profile?.restDays?.includes(dateKey) ||
    profile?.restWeekdays?.includes(new Date(`${dateKey}T12:00:00`).getDay()),
  );

/**
 * The Week view rows and counts (WEEK-01, WEEK-04). No streaks, scores or
 * percentages: counts only.
 */
export function weekSummary({
  endKey,
  events = [],
  mealPlans = [],
  dailyLogs = {},
  profile = {},
}) {
  const days = weekDates(endKey).map((dateKey) => {
    const activities = eventsForDate(events, dateKey)
      .filter((event) => event.type !== "school")
      .map((event) => ({
        event,
        planned: plansForActivity(mealPlans, event, dateKey).length > 0,
      }));
    const log = dailyLogs[dateKey];
    return {
      dateKey,
      activities,
      foods: log?.entries?.length || 0,
      water: dayWater(log),
      rest: !activities.length && isRestDay(profile, dateKey),
    };
  });
  const all = days.flatMap((day) => day.activities);
  const byType = {};
  for (const { event } of all) {
    const type = ["practice", "game", "workout"].includes(event.type)
      ? event.type
      : "other";
    byType[type] = (byType[type] || 0) + 1;
  }
  return {
    startKey: days.at(-1).dateKey,
    endKey,
    days,
    byType,
    activities: all.length,
    withPlan: all.filter((item) => item.planned).length,
    foods: days.reduce((sum, day) => sum + day.foods, 0),
    waterDays: days.filter((day) => day.water.logged).length,
  };
}

const TYPE_WORDS = {
  practice: ["practice", "practices"],
  game: ["game", "games"],
  workout: ["workout", "workouts"],
  other: ["other activity", "other activities"],
};
const joinWords = (parts) =>
  parts.length < 2
    ? parts.join("")
    : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;

/** "4 practices and 1 game. You planned food for 3 of them." (6.11) */
export function weekSentence(summary) {
  if (!summary.activities)
    return summary.foods
      ? "No practices or games this week."
      : "Nothing logged this week. That's fine — logging is optional.";
  const counts = joinWords(
    ["practice", "game", "workout", "other"]
      .filter((type) => summary.byType[type])
      .map((type) => {
        const n = summary.byType[type];
        return `${n} ${TYPE_WORDS[type][n === 1 ? 0 : 1]}`;
      }),
  );
  const one = summary.activities === 1;
  const plans =
    summary.withPlan === 0
      ? one
        ? "It had no food plan."
        : "None had a food plan."
      : summary.withPlan === summary.activities
        ? one
          ? "You planned food for it."
          : summary.activities === 2
            ? "You planned food for both."
            : "You planned food for all of them."
        : `You planned food for ${summary.withPlan} of them.`;
  return `${counts[0].toUpperCase()}${counts.slice(1)}. ${plans}`;
}

const exactStock = (row) =>
  Number(row.quantity) > 0 &&
  (!row.availability || row.availability === "exact");

// The ingredient ids a log entry names: the food itself, its first name part
// ("Bananas, raw" -> bananas), or each ingredient of a logged meal.
function entryIngredients(entry) {
  const ids = new Set();
  const add = (item) => {
    const id =
      ingredientId(item) ||
      ingredientId({ name: String(item.name || "").split(",")[0] });
    if (id) ids.add(id);
  };
  if (entry.ingredients?.length)
    for (const item of entry.ingredients)
      add(item.food ? { ...item.food, name: item.name } : item);
  else add({ ...(entry.food || {}), name: entry.food?.name || entry.name });
  return ids;
}

const PIECE_UNITS = new Set(["piece", "portion", "package", "item", ""]);

/**
 * At home rows a log entry used (LOG-05). Only exact-count rows for the same
 * food match. The amount is the logged amount in the row's unit, one piece
 * when both sides count pieces, or null when the units differ and the
 * athlete has to say how much.
 * @returns {{id: string, name: string, unit: string, amount: number|null}[]}
 */
export function homeMatches(pantry, entry) {
  const ids = entryIngredients(entry);
  if (!ids.size) return [];
  const portions = entry.ingredients?.length
    ? entry.ingredients
    : entry.portion
      ? [{ ...entry.portion, name: entry.name }]
      : [];
  return (pantry || [])
    .filter((row) => exactStock(row) && ids.has(ingredientId(row)))
    .map((row) => {
      const unit = row.unit || "";
      const portion = portions.find(
        (item) =>
          (entry.ingredients?.length
            ? ingredientId(item) === ingredientId(row)
            : true) && item.unit === unit,
      );
      const pieces =
        !portion &&
        PIECE_UNITS.has(unit) &&
        portions.some((item) => PIECE_UNITS.has(item.unit || ""));
      const amount = portion ? Number(portion.amount) : pieces ? 1 : null;
      return {
        id: row.id,
        name: row.name,
        unit,
        amount: amount == null ? null : Math.min(amount, Number(row.quantity)),
      };
    });
}

/** "Used bananas from home?" (LOG-05) */
export function homePrompt(matches) {
  const names = [
    ...new Set(matches.map((row) => row.name.toLocaleLowerCase())),
  ];
  return `Used ${joinWords(names)} from home?`;
}
