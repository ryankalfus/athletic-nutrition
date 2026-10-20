import { formatActivityType, formatPlanStatus, formatTime } from "../format.js";
import { timeToMinutes } from "./timing.js";

const RECOVERY_MINUTES = 90;

export function minutesClock(n) {
  const v = Math.max(0, Math.min(n, 24 * 60 - 1));
  return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
}

// A food moment's name: "Recovery snack", "Pre-practice snack" (a plan for
// an activity), "Lunch" (inside the school lunch time) or "Snack".
/** @param {any} plan @param {{events?: any[], schoolSchedule?: any}} [context] */
export function foodMomentTitle(plan, { events = [], schoolSchedule } = {}) {
  if (plan?.moment === "recovery") return "Recovery snack";
  const event = plan?.eventId && events.find((e) => e.id === plan.eventId);
  if (event) {
    const type = formatActivityType(event.type)?.toLowerCase();
    return `Pre-${["practice", "game", "workout"].includes(type) ? type : "activity"} snack`;
  }
  const at = timeToMinutes(plan?.eatAt || plan?.intendedTime);
  if (
    schoolSchedule?.lunchStartTime &&
    Number.isFinite(at) &&
    at >= timeToMinutes(schoolSchedule.lunchStartTime) &&
    at <=
      timeToMinutes(
        schoolSchedule.lunchEndTime || schoolSchedule.lunchStartTime,
      )
  )
    return "Lunch";
  return "Snack";
}

// "about 2:30 PM" for a plan with a time, else "".
const aboutTime = (plan) =>
  plan.eatAt || plan.intendedTime
    ? `about ${formatTime(plan.eatAt || plan.intendedTime)}`
    : "";

// A plan's rail sub-line and status, as a short sentence (UX-COPY-01):
// "Banana + pretzels, about 2:30 PM", "Packed".
function foodMomentParts(plan) {
  return {
    detail: [plan.template?.name, aboutTime(plan)].filter(Boolean).join(", "),
    status: formatPlanStatus(plan.status) || "",
  };
}

// TODAY-02 food moment line, under the food's name in its sheet:
// "Pre-practice snack, about 2:30 PM".
export function foodMomentLine(plan, context) {
  return [foodMomentTitle(plan, context), aboutTime(plan)]
    .filter(Boolean)
    .join(", ");
}

// TODAY-02: one row per item, sorted by time, with a "Now" marker.
export function buildRailRows({
  events,
  schoolSchedule,
  schoolToday,
  mealPlans,
  todayKey,
  now,
}) {
  const context = { events, schoolSchedule };
  const plans = mealPlans.filter((p) => p.date === todayKey);
  // A recovery plan for an activity joins that activity's Recovery row, so
  // one moment is one row (not "Recovery" and "Recovery snack" at 5:30).
  const recoveryPlan = (e) =>
    plans.find((p) => p.moment === "recovery" && p.eventId === e.id);
  const rows = events.flatMap((e) => {
    const travel = Number(e.travelMinutes) || 0;
    const end = timeToMinutes(e.endTime);
    const recovery = recoveryPlan(e);
    const recoveryParts = recovery && foodMomentParts(recovery);
    return [
      {
        kind: "activity",
        type: e.type,
        game: e.type === "game",
        time: e.startTime,
        title: e.title,
        // A sentence meta (UX-COPY-01): "Until 5:30 PM, home".
        detail: `Until ${formatTime(e.endTime)}, ${e.location === "away" ? "away" : "home"}`,
        // TODAY-02: the row opens the activity sheet for this activity.
        eventId: e.id,
      },
      ...(travel > 0
        ? [
            {
              kind: "travel",
              time: minutesClock(timeToMinutes(e.startTime) - travel),
              title: `Leave by ${formatTime(minutesClock(timeToMinutes(e.startTime) - travel))}`,
              detail: `${travel} min to ${e.title}`,
              eventId: e.id,
            },
          ]
        : []),
      {
        kind: "recovery",
        time: e.endTime,
        title: "Recovery",
        // "Milk + banana, until 7:00 PM" or "Until 7:00 PM".
        detail: [
          recovery?.template?.name,
          `${recovery?.template?.name ? "until" : "Until"} ${formatTime(minutesClock(end + RECOVERY_MINUTES))}`,
        ]
          .filter(Boolean)
          .join(", "),
        ...(recovery
          ? { planId: recovery.id, status: recoveryParts.status }
          : { route: "food/ideas?moment=after" }),
      },
    ];
  });
  if (schoolToday && schoolSchedule) {
    rows.push({
      kind: "school",
      time: schoolSchedule.startTime,
      title: "School",
      // "Until 3:00 PM, lunch 11:30 AM" (UX-COPY-01).
      detail: `Until ${formatTime(schoolSchedule.endTime)}${schoolSchedule.lunchStartTime ? `, lunch ${formatTime(schoolSchedule.lunchStartTime)}` : ""}`,
      // TODAY-02: the row opens the School day sheet.
      sheet: "school",
    });
    for (const time of [
      schoolSchedule.morningSnackTime,
      schoolSchedule.afternoonSnackTime,
    ].filter(Boolean))
      rows.push({
        kind: "window",
        time,
        title: "Snack time at school",
        detail: formatTime(time),
        route: "food/ideas",
      });
  }
  const merged = new Set(events.map(recoveryPlan).filter(Boolean));
  for (const plan of plans.filter((p) => !merged.has(p))) {
    const { detail, status } = foodMomentParts(plan);
    rows.push({
      kind: "food",
      time: plan.eatAt || plan.intendedTime,
      title: foodMomentTitle(plan, context),
      detail,
      status,
      planId: plan.id,
    });
  }
  rows.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
  const current = now.getHours() * 60 + now.getMinutes();
  const at = rows.findIndex((row) => timeToMinutes(row.time) > current);
  // The time column already shows the time, so the marker reads "Now".
  const marker = {
    kind: "now",
    time: minutesClock(current),
    title: "Now",
    now: true,
  };
  rows.splice(at === -1 ? rows.length : at, 0, marker);
  return rows.map((row) => ({
    ...row,
    past: !row.now && timeToMinutes(row.time) < current,
  }));
}

// TODAY-01 pick availability chip: "Bananas at home" / "Pretzels to buy".
export function availabilityLabel(ingredient) {
  return `${ingredient.name} ${ingredient.sufficient ? "at home" : "to buy"}`;
}
