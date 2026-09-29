// Food › Log Day and Week calculations (P1-08).
import test from "node:test";
import assert from "node:assert/strict";
import {
  dayTimeline,
  dayWater,
  entryClock,
  entryMinutes,
  entryTimeFields,
  homeMatches,
  homePrompt,
  parseLogRoute,
  plansForActivity,
  shiftDate,
  unconfirmedPlans,
  weekDates,
  weekSentence,
  weekSummary,
} from "../src/domain/log.js";
import { makeLog, reviseLogEntry } from "../src/domain/food.js";
import { formatDateRange } from "../src/format.js";

const today = "2026-09-28"; // a Monday

test("entry times read 24-hour, 12-hour, approximate and created times", () => {
  assert.equal(entryMinutes({ time: "14:45" }), 14 * 60 + 45);
  assert.equal(entryMinutes({ time: "2:45 PM" }), 14 * 60 + 45);
  assert.equal(entryMinutes({ time: "12:05 AM" }), 5);
  assert.equal(entryMinutes({ time: "12:30 pm" }), 12 * 60 + 30);
  assert.equal(entryMinutes({ approxTime: "evening" }), 19 * 60);
  assert.equal(
    entryMinutes({ createdAt: new Date(2026, 8, 28, 7, 15).toISOString() }),
    7 * 60 + 15,
  );
  assert.equal(entryMinutes({}), null);
  assert.equal(entryClock({ time: "2:45 PM" }), "14:45");
  assert.equal(entryClock({ approxTime: "morning" }), "");
});

test("LOG-04: an edit keeps its time; a past day needs an approximate or exact time", () => {
  const now = new Date(2026, 8, 28, 16, 5);
  assert.deepEqual(entryTimeFields({ date: today, todayKey: today, now }), {
    time: "16:05",
    approxTime: null,
  });
  assert.throws(
    () => entryTimeFields({ date: "2026-09-27", todayKey: today, now }),
    /about when/,
  );
  assert.deepEqual(
    entryTimeFields({ date: "2026-09-27", todayKey: today, approx: "midday" }),
    { time: null, approxTime: "midday" },
  );
  assert.deepEqual(
    entryTimeFields({ date: "2026-09-27", todayKey: today, exact: "07:30" }),
    { time: "07:30", approxTime: null },
  );
  const original = { time: "7:10 AM", approxTime: null };
  assert.deepEqual(
    entryTimeFields({ date: today, todayKey: today, now, original }),
    { time: "7:10 AM", approxTime: null },
  );
  // Editing an entry through makeLog + reviseLogEntry keeps the time.
  const food = { id: "f", name: "Banana", nutrients: { calories: 89 } };
  const first = makeLog(food, { amount: 118, unit: "g" }, today, {
    time: "07:10",
  });
  const edited = reviseLogEntry(
    first,
    makeLog(food, { amount: 150, unit: "g" }, today, {
      ...entryTimeFields({
        date: today,
        todayKey: today,
        now,
        original: first,
      }),
    }),
  );
  assert.equal(edited.time, "07:10");
  assert.equal(edited.portion.amount, 150);
});

test("HIST-03: the day timeline mixes activities and food in time order", () => {
  const events = [
    {
      id: "practice",
      title: "Practice",
      type: "practice",
      startTime: "15:30",
      endTime: "17:30",
      recurrence: {
        startDate: "2026-09-01",
        endDate: "2026-12-01",
        weekdays: [1],
        excludedDates: [],
      },
    },
    {
      id: "other-day",
      title: "Game",
      type: "game",
      date: "2026-09-27",
      startTime: "10:00",
    },
  ];
  const log = {
    entries: [
      { id: "b", name: "Late snack", time: "20:00" },
      { id: "a", name: "Banana", time: "2:45 PM" },
      { id: "c", name: "Oatmeal", approxTime: "morning" },
    ],
  };
  const items = dayTimeline({ log, events, dateKey: today });
  assert.deepEqual(
    items.map((item) => item.entry?.name || item.event.title),
    ["Oatmeal", "Banana", "Practice", "Late snack"],
  );
  assert.equal(items[2].kind, "activity");
});

test("'Did you eat…?' shows unconfirmed plans for today and two days back", () => {
  const plans = [
    { id: "1", date: today, status: "planned", eatAt: "15:00" },
    { id: "2", date: today, status: "eaten" },
    { id: "3", date: today, status: "packed", eatAt: "07:00" },
    { id: "4", date: "2026-09-26", status: "planned" },
    { id: "5", date: "2026-09-25", status: "planned" },
    { id: "6", date: today, status: "skipped" },
  ];
  assert.deepEqual(
    unconfirmedPlans(plans, today, today).map((p) => p.id),
    ["3", "1"],
  );
  assert.deepEqual(
    unconfirmedPlans(plans, "2026-09-26", today).map((p) => p.id),
    ["4"],
  );
  assert.deepEqual(unconfirmedPlans(plans, "2026-09-25", today), []);
});

test("WEEK-03: missing water reads as not logged; explicit zero stays 0 oz", () => {
  assert.deepEqual(dayWater(undefined), { logged: false, ounces: 0 });
  assert.deepEqual(dayWater({ entries: [{}], water: 0 }), {
    logged: false,
    ounces: 0,
  });
  assert.deepEqual(
    dayWater({ water: 0, waterEntries: [{ amount: 8, undone: true }] }),
    { logged: true, ounces: 0 },
  );
  assert.deepEqual(dayWater({ water: 24, waterEntries: [{ amount: 24 }] }), {
    logged: true,
    ounces: 24,
  });
});

test("WEEK-04: 4 activities, 3 with a linked plan, counted per date", () => {
  const events = [
    {
      id: "practice",
      title: "Practice",
      type: "practice",
      startTime: "15:30",
      recurrence: {
        startDate: "2026-09-01",
        endDate: "2026-12-01",
        weekdays: [1, 3, 5], // Mon, Wed, Fri
        excludedDates: [],
      },
    },
    {
      id: "game",
      title: "Game",
      type: "game",
      date: "2026-09-26",
      startTime: "10:00",
    },
    { id: "old", title: "Old game", type: "game", date: "2026-09-10" },
    { id: "school", title: "School", type: "school", date: today },
  ];
  // In the week Sep 22 – 28: practices Wed 23, Fri 25, Mon 28 and the game Sat 26.
  const mealPlans = [
    { id: "p1", eventId: "practice", date: "2026-09-23", status: "eaten" },
    { id: "p2", eventId: "practice", date: "2026-09-23", status: "planned" },
    { id: "p3", eventId: "game", date: "2026-09-26", status: "planned" },
    { id: "p4", eventId: "practice", date: today, status: "packed" },
    // Same series, a date outside the week: not counted.
    { id: "p5", eventId: "practice", date: "2026-09-21", status: "eaten" },
    // Skipped plans and plans without an activity do not count.
    { id: "p6", eventId: "practice", date: "2026-09-25", status: "skipped" },
    { id: "p7", eventId: null, date: "2026-09-25", status: "planned" },
  ];
  const dailyLogs = {
    [today]: {
      entries: [{ id: "e1" }, { id: "e2" }],
      water: 24,
      waterEntries: [{ amount: 24 }],
    },
    "2026-09-24": { entries: [{ id: "e3" }], water: 0 },
  };
  const summary = weekSummary({ endKey: today, events, mealPlans, dailyLogs });
  assert.equal(summary.startKey, "2026-09-22");
  assert.equal(summary.activities, 4);
  assert.equal(summary.withPlan, 3);
  assert.deepEqual(summary.byType, { practice: 3, game: 1 });
  assert.equal(
    weekSentence(summary),
    "3 practices and 1 game. You planned food for 3 of them.",
  );
  assert.deepEqual(
    summary.days.map((day) => day.dateKey),
    weekDates(today),
  );
  assert.equal(summary.days[0].dateKey, today, "newest first");
  assert.equal(summary.days[0].foods, 2);
  assert.deepEqual(summary.days[0].water, { logged: true, ounces: 24 });
  assert.deepEqual(summary.days[4].water, { logged: false, ounces: 0 });
  assert.equal(summary.foods, 3);
  assert.equal(
    plansForActivity(
      mealPlans,
      { id: "practice", occurrenceId: "practice-2026-09-25" },
      "2026-09-25",
    ).length,
    0,
  );
});

test("week sentences stay counts, never scores", () => {
  const base = { byType: {}, activities: 0, withPlan: 0, foods: 0 };
  assert.equal(
    weekSentence(base),
    "Nothing logged this week. That's fine — logging is optional.",
  );
  assert.equal(
    weekSentence({ ...base, foods: 2 }),
    "No practices or games this week.",
  );
  assert.equal(
    weekSentence({ ...base, byType: { game: 1 }, activities: 1, withPlan: 1 }),
    "1 game. You planned food for it.",
  );
  assert.equal(
    weekSentence({
      ...base,
      byType: { practice: 2 },
      activities: 2,
      withPlan: 0,
    }),
    "2 practices. None had a food plan.",
  );
  assert.equal(
    weekSentence({
      ...base,
      byType: { practice: 1, workout: 1, other: 1 },
      activities: 3,
      withPlan: 3,
    }),
    "1 practice, 1 workout and 1 other activity. You planned food for all of them.",
  );
  for (const sentence of [
    weekSentence({
      ...base,
      byType: { practice: 4 },
      activities: 4,
      withPlan: 3,
    }),
  ])
    assert.doesNotMatch(sentence, /%|streak|score/i);
});

test("LOG-05: only exact At home rows for the same food match a log", () => {
  const pantry = [
    {
      id: "b",
      name: "Bananas",
      quantity: 3,
      unit: "piece",
      availability: "exact",
    },
    {
      id: "b2",
      name: "Bananas",
      quantity: 2,
      unit: "bunch",
      availability: "exact",
    },
    {
      id: "p",
      name: "Pretzels",
      quantity: 1,
      unit: "package",
      availability: "have",
    },
    { id: "o", name: "Oats", quantity: 0, unit: "g", availability: "exact" },
    {
      id: "pb",
      name: "Peanut butter",
      quantity: 400,
      unit: "g",
      availability: "exact",
    },
  ];
  const banana = {
    id: "e1",
    name: "Bananas, raw",
    food: { name: "Bananas, raw", source: "USDA FoodData Central" },
    portion: { amount: 118, unit: "g" },
  };
  assert.deepEqual(homeMatches(pantry, banana), [
    { id: "b", name: "Bananas", unit: "piece", amount: null },
    { id: "b2", name: "Bananas", unit: "bunch", amount: null },
  ]);
  assert.equal(
    homePrompt(homeMatches(pantry, banana)),
    "Used bananas from home?",
  );
  const pb = {
    id: "e2",
    name: "Peanut butter, smooth style, with salt",
    food: { name: "Peanut butter, smooth style, with salt" },
    portion: { amount: 32, unit: "g" },
  };
  assert.deepEqual(homeMatches(pantry, pb), [
    { id: "pb", name: "Peanut butter", unit: "g", amount: 32 },
  ]);
  const plan = {
    id: "e3",
    name: "Banana + pretzels",
    ingredients: [
      { name: "banana", ingredientId: "bananas", amount: 1, unit: "piece" },
      {
        name: "pretzels",
        ingredientId: "pretzels",
        amount: 1,
        unit: "portion",
      },
    ],
  };
  assert.deepEqual(
    homeMatches(pantry, plan).map(({ id, amount }) => [id, amount]),
    [
      ["b", 1],
      ["b2", null],
    ],
    "pretzels are not an exact count, so they are never deducted",
  );
  assert.deepEqual(homeMatches(pantry, { id: "x", name: "Mystery stew" }), []);
  assert.equal(
    homePrompt([{ name: "Bananas" }, { name: "Peanut butter" }]),
    "Used bananas and peanut butter from home?",
  );
});

test("log routes: day, week, dates, and no future dates", () => {
  assert.deepEqual(parseLogRoute("log", today), { view: "day", date: today });
  assert.deepEqual(parseLogRoute("log/2026-09-27", today), {
    view: "day",
    date: "2026-09-27",
  });
  assert.deepEqual(parseLogRoute("log/week", today), {
    view: "week",
    date: today,
  });
  assert.deepEqual(parseLogRoute("log/week/2026-09-14", today), {
    view: "week",
    date: "2026-09-14",
  });
  assert.deepEqual(parseLogRoute("log/2026-10-01", today), {
    view: "day",
    date: today,
  });
  assert.deepEqual(parseLogRoute("log/2026-02-31x", today), {
    view: "day",
    date: today,
  });
  assert.equal(shiftDate("2026-03-01", -1), "2026-02-28");
  assert.equal(
    shiftDate("2026-11-01", 1),
    "2026-11-02",
    "across the DST change",
  );
});

test("week ranges read 'Sep 22 – 28' and cross months", () => {
  assert.equal(formatDateRange("2026-09-22", "2026-09-28"), "Sep 22 – 28");
  assert.equal(formatDateRange("2026-09-29", "2026-10-05"), "Sep 29 – Oct 5");
});
