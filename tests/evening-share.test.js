// P1-12: sport context (ADD-09), evening planner (ADD-11), share lists
// (ADD-06) and the monthly backup nudge (ADD-12, DATA-08).
// Kept in its own file so parallel work on domain.test.js does not collide.
import test from "node:test";
import assert from "node:assert/strict";
import {
  getFuelingGuidance,
  sportEventTitle,
  withSportTitles,
} from "../src/domain/timing.js";
import {
  buildTomorrowTasks,
  eveningPlan,
  mergeTomorrowTasks,
  nextDateKey,
  shouldShowTonight,
  tomorrowEventLine,
} from "../src/domain/tonight.js";
import {
  canWebShare,
  checklistLine,
  formatChecklistText,
  formatGroceryText,
  groceryShareItems,
  shareActionLabel,
  shareOrCopy,
  SHARE_ERROR,
} from "../src/domain/share.js";
import {
  BACKUP_NUDGE_DAYS,
  backupNudge,
  daysSince,
  firstUseDate,
} from "../src/domain/backupNudge.js";
import { buildRailRows } from "../src/domain/dayRail.js";

const at = (key, time) => new Date(`${key}T${time}:00`);
const TODAY = "2026-09-29"; // a Tuesday
const TOMORROW = "2026-09-30";
const profile = { dietaryNeeds: [], foodSources: ["packed", "home"] };
const school = {
  enabled: true,
  startDate: "2026-08-20",
  endDate: "2027-06-10",
  weekdays: [1, 2, 3, 4, 5],
  startTime: "08:00",
  endTime: "15:00",
  foodAccess: { cafeteria: false },
};

test("ADD-09: a generic title reads as the athlete's sport", () => {
  assert.equal(
    sportEventTitle({ title: "Practice", type: "practice" }, "Soccer"),
    "Soccer practice",
  );
  assert.equal(
    sportEventTitle({ title: "", type: "game" }, "Soccer"),
    "Soccer game",
  );
  assert.equal(
    sportEventTitle({ title: "game", type: "game" }, "Cross country"),
    "Cross country game",
  );
  // A name the athlete typed is kept as is.
  assert.equal(
    sportEventTitle({ title: "Film session", type: "other" }, "Soccer"),
    "Film session",
  );
  // No sport set: nothing changes except an empty title.
  assert.equal(sportEventTitle({ title: "Practice" }, ""), "Practice");
  assert.equal(sportEventTitle({ title: "", type: "game" }, ""), "Game");
  const [event] = withSportTitles(
    [{ id: "a", title: "Practice", type: "practice" }],
    "Basketball",
  );
  assert.equal(event.id, "a");
  assert.equal(event.title, "Basketball practice");
});

test("ADD-09: the Now card countdown and GAME chip use sport context", () => {
  const events = [
    {
      id: "g",
      date: TODAY,
      title: "Game",
      type: "game",
      startTime: "16:00",
      endTime: "17:30",
      location: "home",
    },
  ];
  const guidance = getFuelingGuidance({
    now: at(TODAY, "14:10"),
    todayKey: TODAY,
    events,
    schoolSchedule: null,
    profile: { ...profile, sport: "Soccer" },
  });
  assert.match(guidance.label, /^Soccer game in /);
  assert.equal(guidance.gameDay, true);
  assert.equal(guidance.event.title, "Soccer game");
  const rows = buildRailRows({
    events: withSportTitles(events, "Soccer"),
    schoolSchedule: null,
    schoolToday: false,
    mealPlans: [],
    todayKey: TODAY,
    now: at(TODAY, "14:10"),
  });
  const game = rows.find((r) => r.kind === "activity");
  assert.equal(game.title, "Soccer game");
  assert.equal(game.game, true);
});

test("ADD-11: Tonight shows after 7:00 PM for any start time, and any time for early starts", () => {
  const late = { startTime: "16:00" };
  const early = { startTime: "07:30" };
  assert.equal(shouldShowTonight(at(TODAY, "18:59"), late), false);
  assert.equal(shouldShowTonight(at(TODAY, "19:00"), late), true);
  assert.equal(shouldShowTonight(at(TODAY, "12:00"), early), true);
  assert.equal(shouldShowTonight(at(TODAY, "21:00"), undefined), false);
  assert.equal(nextDateKey("2026-12-31"), "2027-01-01");
});

test("ADD-11: tomorrow's list covers every activity with approved due offsets", () => {
  const events = [
    {
      id: "p",
      title: "Soccer practice",
      type: "practice",
      startTime: "16:00",
      endTime: "17:30",
      location: "away",
      travelMinutes: 45,
    },
    {
      id: "w",
      title: "Lift",
      type: "workout",
      startTime: "19:00",
      endTime: "20:00",
      location: "home",
    },
  ];
  // School day, no cafeteria: due 30 min before school (7:30 AM).
  const tasks = buildTomorrowTasks(events, {
    schoolTomorrow: true,
    schoolSchedule: school,
  });
  const labels = tasks.map((t) => t.label);
  assert.equal(new Set(labels).size, labels.length, "no duplicate tasks");
  assert.ok(labels.includes("Fill a water bottle"));
  assert.ok(labels.includes("Pack lunch for school"));
  assert.ok(labels.includes("Check the route and allow 45 minutes for travel"));
  assert.equal(
    tasks.find((t) => t.label === "Fill a water bottle").dueAt,
    "07:30",
  );
  assert.equal(
    tasks.find((t) => t.label.startsWith("Choose and set out breakfast")).dueAt,
    "07:30",
  );
  // The route check is due 30 min before Leave by (3:15 PM → 2:45 PM).
  assert.equal(
    tasks.find((t) => t.label.startsWith("Check the route")).dueAt,
    "14:45",
  );
  // No school, afternoon away game: gear is due before Leave by, breakfast is not.
  const weekend = buildTomorrowTasks(events, { schoolTomorrow: false });
  assert.equal(
    weekend.find((t) => t.label === "Fill a water bottle").dueAt,
    "14:45",
  );
  assert.equal(
    weekend.find((t) => t.label.startsWith("Choose and set out breakfast"))
      .dueAt,
    null,
  );
  assert.ok(!weekend.some((t) => t.label === "Pack lunch for school"));
  // Home only, no school: no due times are invented.
  const home = buildTomorrowTasks([events[1]], {});
  assert.ok(home.every((t) => t.dueAt === null));
  assert.ok(!home.some((t) => /travel/.test(t.label)));
  // Cafeteria access: no lunch task.
  assert.ok(
    !buildTomorrowTasks(events, {
      schoolTomorrow: true,
      schoolSchedule: { ...school, foodAccess: { cafeteria: true } },
    }).some((t) => t.label === "Pack lunch for school"),
  );
  assert.deepEqual(buildTomorrowTasks([], { schoolTomorrow: true }), []);
});

test("ADD-11: eveningPlan reads tomorrow and merges without duplicates", () => {
  const events = [
    {
      id: "g",
      date: TOMORROW,
      title: "Game",
      type: "game",
      startTime: "09:00",
      endTime: "10:30",
      location: "away",
      travelMinutes: 30,
    },
  ];
  const input = {
    now: at(TODAY, "20:15"),
    todayKey: TODAY,
    events,
    schoolSchedule: school,
    profile: { sport: "Soccer" },
    dayPlans: {},
  };
  const plan = eveningPlan(input);
  assert.equal(plan.show, true);
  assert.equal(plan.tomorrowKey, TOMORROW);
  assert.equal(plan.gameDay, true);
  assert.deepEqual(plan.lines, [
    "Soccer game · 9:00–10:30 AM · Away · Leave by 8:30 AM",
  ]);
  assert.equal(plan.built, false);
  assert.ok(plan.toAdd.length >= 5);
  let n = 0;
  const makeId = () => `t${++n}`;
  const list = mergeTomorrowTasks([], plan.toAdd, makeId);
  assert.equal(list.length, plan.toAdd.length);
  assert.ok(list.every((t) => t.id && t.done === false && t.independent));
  // A checked task stays checked and is not added twice.
  list[0].done = true;
  const again = mergeTomorrowTasks(list, plan.toAdd, makeId);
  assert.equal(again.length, list.length);
  assert.equal(again[0].done, true);
  const built = eveningPlan({ ...input, dayPlans: { [TOMORROW]: again } });
  assert.equal(built.built, true);
  assert.equal(built.done, 1);
  assert.equal(built.toAdd.length, 0);
  // Evening state on the Now card for the same inputs.
  const guidance = getFuelingGuidance({ ...input, profile });
  assert.equal(guidance.state, "evening");
  // Nothing tomorrow: no Tonight card.
  assert.equal(eveningPlan({ ...input, events: [] }).show, false);
  assert.equal(
    tomorrowEventLine({
      title: "Practice",
      startTime: "16:00",
      endTime: "17:30",
      location: "home",
    }),
    "Practice · 4:00–5:30 PM · Home",
  );
});

test("ADD-06: shared lists are plain text, one task per line, no IDs", () => {
  const tasks = [
    {
      id: "x1",
      label: "Pack Banana + pretzels",
      dueAt: "07:30",
      done: false,
      kind: "food",
    },
    { id: "x2", label: "Fill a water bottle", done: true, kind: "gear" },
  ];
  assert.equal(
    checklistLine(tasks[0]),
    "[ ] Pack Banana + pretzels · by 7:30 AM",
  );
  const text = formatChecklistText({
    title: "Pack & prep",
    subtitle: "Tue, Sep 29",
    context: ["Soccer practice · 4:00–5:30 PM · Home"],
    tasks,
  });
  assert.equal(
    text,
    [
      "Pack & prep · Tue, Sep 29",
      "Soccer practice · 4:00–5:30 PM · Home",
      "[ ] Pack Banana + pretzels · by 7:30 AM",
      "[x] Fill a water bottle",
    ].join("\n"),
  );
  assert.doesNotMatch(text, /x1|x2|food|gear/);

  const items = [
    { id: "g1", name: "Bananas", quantity: 1, unit: "bunch", checked: false },
    {
      id: "g2",
      name: "Pretzels",
      quantity: 2,
      unit: "package",
      checked: false,
    },
    { id: "g3", name: "Rice", quantity: 1, unit: "bag", checked: true },
    { id: "g4", name: "  ", quantity: 1 },
  ];
  assert.deepEqual(
    groceryShareItems(items).map((i) => i.id),
    ["g1", "g2"],
  );
  const groceries = formatGroceryText(items);
  assert.equal(groceries.split("\n")[0], "Groceries · 2 items");
  assert.match(groceries, /^\[ \] Bananas · 1 bunch$/m);
  assert.match(groceries, /^\[ \] Pretzels · 2 packages$/m);
  assert.doesNotMatch(groceries, /Rice|g1|g2/);
});

test("ADD-06: Web Share first, clipboard fallback, cancel is quiet", async () => {
  const shared = [];
  const withShare = {
    navigator: { share: async (data) => shared.push(data) },
  };
  assert.equal(canWebShare(withShare), true);
  assert.equal(shareActionLabel(withShare), "Share list");
  assert.equal(
    await shareOrCopy({ title: "Groceries", text: "a" }, withShare),
    "shared",
  );
  assert.deepEqual(shared, [{ title: "Groceries", text: "a" }]);

  const abort = Object.assign(new Error("cancel"), { name: "AbortError" });
  const cancelled = {
    navigator: {
      share: async () => {
        throw abort;
      },
    },
  };
  assert.equal(
    await shareOrCopy({ title: "t", text: "b" }, cancelled),
    "cancelled",
  );

  let copied = "";
  const clipboardOnly = {
    navigator: { clipboard: { writeText: async (t) => (copied = t) } },
  };
  assert.equal(shareActionLabel(clipboardOnly), "Copy list");
  assert.equal(
    await shareOrCopy({ title: "t", text: "c" }, clipboardOnly),
    "copied",
  );
  assert.equal(copied, "c");

  // Share refused (not a cancel) falls back to the clipboard.
  const refused = {
    navigator: {
      share: async () => {
        throw Object.assign(new Error("no"), { name: "NotAllowedError" });
      },
      clipboard: { writeText: async (t) => (copied = t) },
    },
  };
  assert.equal(await shareOrCopy({ title: "t", text: "d" }, refused), "copied");
  assert.equal(copied, "d");

  await assert.rejects(
    shareOrCopy({ title: "t", text: "e" }, { navigator: {} }),
    { message: SHARE_ERROR },
  );
});

test("ADD-12 / DATA-08: the backup nudge is monthly and snoozes for 30 days", () => {
  const now = at("2026-09-29", "09:00");
  assert.equal(BACKUP_NUDGE_DAYS, 30);
  assert.equal(daysSince("2026-08-28T20:00:00.000Z", now) >= 31, true);
  assert.equal(daysSince(null, now), null);
  assert.equal(daysSince("not a date", now), null);
  const backedUp = (iso, extra = {}) => ({
    profile: { lastBackupAt: iso, ...extra },
  });
  assert.equal(backupNudge(backedUp("2026-09-10T12:00:00"), now), null);
  assert.equal(backupNudge(backedUp("2026-08-31T12:00:00"), now), null); // 29 days
  const due = backupNudge(backedUp("2026-08-28T12:00:00"), now);
  assert.equal(due.days, 32);
  assert.equal(due.message, "Last backup 32 days ago. Save a backup file?");
  // "Not now" hides it for 30 days, then it returns.
  assert.equal(
    backupNudge(
      backedUp("2026-08-28T12:00:00", {
        backupNudgeSnoozedAt: "2026-09-20T12:00:00",
      }),
      now,
    ),
    null,
  );
  assert.ok(
    backupNudge(
      backedUp("2026-07-01T12:00:00", {
        backupNudgeSnoozedAt: "2026-08-25T12:00:00",
      }),
      now,
    ),
  );
  // Never backed up: wait until 30 days after the first saved log or plan.
  assert.equal(backupNudge({ profile: {} }, now), null);
  const fresh = { profile: {}, dayPlans: { "2026-09-20": [{ id: "t" }] } };
  assert.equal(firstUseDate(fresh), "2026-09-20");
  assert.equal(backupNudge(fresh, now), null);
  const old = {
    profile: {},
    dailyLogs: {
      "2026-08-15": { entries: [], water: 16 },
      "2026-08-01": { entries: [], water: 0 },
    },
    mealPlans: [{ date: "2026-08-20" }],
  };
  assert.equal(firstUseDate(old), "2026-08-15");
  assert.equal(
    backupNudge(old, now).message,
    "No backup saved yet. Save a backup file?",
  );
});
