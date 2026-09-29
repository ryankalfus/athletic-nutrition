const isClock = (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value || "");

export function formatDate(value, { year = false } = {}) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(value || "")) return value || "Date TBD";
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(year ? { year: "numeric" } : {}),
  }).format(date);
}

export function formatTime(value) {
  if (!isClock(value)) return value || "Time TBD";
  const [hours, minutes] = value.split(":").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(2000, 0, 1, hours, minutes));
}

export function formatDuration(start, end) {
  let minutes = start;
  if (end !== undefined) {
    if (!isClock(start) || !isClock(end)) return "Duration not set";
    const [startHour, startMinute] = start.split(":").map(Number);
    const [endHour, endMinute] = end.split(":").map(Number);
    minutes = endHour * 60 + endMinute - startHour * 60 - startMinute;
  }
  if (!Number.isFinite(minutes) || minutes < 0) return "Duration not set";
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return `${remainder} min`;
  return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
}

export function formatCountdown(minutes) {
  if (!Number.isFinite(minutes)) return "Time TBD";
  if (minutes === 0) return "now";
  return minutes < 0
    ? `${formatDuration(-minutes)} ago`
    : `in ${formatDuration(minutes)}`;
}

export function plural(count, word) {
  if (Number(count) === 1) return word;
  if (["g", "ml", "oz", "lb", "kg", "L"].includes(word)) return word;
  if (word === "piece") return "pieces";
  if (word.endsWith("y")) return `${word.slice(0, -1)}ies`;
  if (word.endsWith("s")) return word;
  return `${word}s`;
}

export function formatAmount(amount, unit, name) {
  const label = String(name || "")
    .trim()
    .toLowerCase();
  if (unit === "piece" && label === "bagels or bread" && Number(amount) === 2)
    return "2 slices of bread or 1 bagel";
  if (unit === "piece" && label === "whole-grain bread")
    return `${amount} ${plural(amount, "slice")} of whole-grain bread`;
  if (unit === "piece" && label === "fresh fruit")
    return `${amount} ${plural(amount, "piece")} of fresh fruit`;
  if (unit === "piece" && label) {
    const countable = label.endsWith("s") && !label.endsWith("ss");
    const noun = Number(amount) === 1 && countable ? label.slice(0, -1) : label;
    return `${amount} ${noun}`;
  }
  if (["portion", "package"].includes(unit) && label)
    return `${amount} ${plural(amount, unit)} of ${label}`;
  return `${amount} ${unit || ""}${label ? ` ${label}` : ""}`.trim();
}

export const formatAvailability = (value) =>
  ({
    some: "Have",
    have: "Have",
    low: "Low",
    out: "Out",
    exact: "Exact quantity",
  })[value] || value;
export const formatLocation = (value) =>
  ({
    home: "At home",
    away: "Away",
    travel: "Travel",
    pantry: "Pantry",
    fridge: "Fridge",
    freezer: "Freezer",
    school: "School",
  })[value] || value;
export const formatOrigin = (value) =>
  ({
    manual: "Added by you",
    search: "Added from search",
    generated: "Suggested for your plan",
    meal: "Needed for a meal",
    recommendation: "Suggested",
    preserved: "On your list",
  })[value] || value;
export const formatPlanStatus = (value) =>
  ({
    planned: "Planned",
    packed: "Packed",
    eaten: "Eaten",
    logged: "Eaten",
    skipped: "Skipped",
  })[value] || value;
export const formatActivityType = (value) =>
  ({
    practice: "Practice",
    workout: "Workout",
    game: "Game",
    other: "Other",
    school: "School",
    travel: "Travel",
  })[value] || value;
export const formatIntensity = (value) =>
  ({ low: "Light", medium: "Moderate", high: "Hard" })[value] || value;

// "Sep 22 – 28", or "Sep 29 – Oct 5" across months (Log › Week).
export function formatDateRange(startKey, endKey) {
  const month = (key) =>
    new Intl.DateTimeFormat("en-US", { month: "short" }).format(
      new Date(`${key}T12:00:00`),
    );
  const day = (key) => Number(key.slice(8, 10));
  return month(startKey) === month(endKey)
    ? `${month(startKey)} ${day(startKey)} – ${day(endKey)}`
    : `${month(startKey)} ${day(startKey)} – ${month(endKey)} ${day(endKey)}`;
}
