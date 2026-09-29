import { formatPlanStatus, formatTime } from "../format.js";
import { timeToMinutes } from "./timing.js";

const RECOVERY_MINUTES = 90;

export function minutesClock(n) {
  const v = Math.max(0, Math.min(n, 24 * 60 - 1));
  return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
}

export function foodMomentTitle(plan) {
  return plan?.moment === "recovery" ? "Recovery snack" : "Snack";
}

// TODAY-02 food moment row: "Snack · about 2:30 PM · Banana + pretzels · packed".
export function foodMomentLine(plan) {
  return [
    foodMomentTitle(plan),
    (plan.eatAt || plan.intendedTime) &&
      `about ${formatTime(plan.eatAt || plan.intendedTime)}`,
    plan.template?.name,
    formatPlanStatus(plan.status)?.toLowerCase(),
  ]
    .filter(Boolean)
    .join(" · ");
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
  const rows = events.flatMap((e) => {
    const travel = Number(e.travelMinutes) || 0;
    const end = timeToMinutes(e.endTime);
    return [
      {
        kind: "activity",
        time: e.startTime,
        title: e.title,
        detail: `${formatTime(e.startTime)}–${formatTime(e.endTime)} · ${e.location === "away" ? "Away" : "Home"}`,
        route: "schedule",
      },
      ...(travel > 0
        ? [
            {
              kind: "travel",
              time: minutesClock(timeToMinutes(e.startTime) - travel),
              title: `Leave by ${formatTime(minutesClock(timeToMinutes(e.startTime) - travel))}`,
              detail: `${travel} min to ${e.title}`,
              route: "schedule",
            },
          ]
        : []),
      {
        kind: "recovery",
        time: e.endTime,
        title: "Recovery",
        detail: `${formatTime(e.endTime)}–${formatTime(minutesClock(end + RECOVERY_MINUTES))}`,
        route: "food/ideas?moment=after",
      },
    ];
  });
  if (schoolToday && schoolSchedule) {
    rows.push({
      kind: "school",
      time: schoolSchedule.startTime,
      title: "School",
      detail: `${formatTime(schoolSchedule.startTime)}–${formatTime(schoolSchedule.endTime)}${schoolSchedule.lunchStartTime ? ` · Lunch ${formatTime(schoolSchedule.lunchStartTime)}` : ""}`,
      route: "schedule",
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
  for (const plan of mealPlans.filter((p) => p.date === todayKey)) {
    const line = foodMomentLine(plan);
    const title = foodMomentTitle(plan);
    rows.push({
      kind: "food",
      time: plan.eatAt || plan.intendedTime,
      title,
      detail: line.slice(title.length + 3),
      planId: plan.id,
    });
  }
  rows.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
  const current = now.getHours() * 60 + now.getMinutes();
  const at = rows.findIndex((row) => timeToMinutes(row.time) > current);
  const marker = {
    kind: "now",
    time: minutesClock(current),
    title: `Now · ${formatTime(minutesClock(current))}`,
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
