// P2-03 / ADD-13 / MOVE-12 / STATE-10: weekly rest-day pattern.
import test from "node:test";
import assert from "node:assert/strict";
import {
  getFuelingGuidance,
  isRestDay,
  setRestDay,
  toggleRestWeekday,
} from "../src/domain/timing.js";
import { weekSummary } from "../src/domain/log.js";
import { DEFAULT_PROFILE } from "../src/domain/catalog.js";
import { emptyData, validateData } from "../src/domain/storage.js";

const sunday = "2026-10-11";
const monday = "2026-10-12";
const profile = { ...structuredClone(DEFAULT_PROFILE), restWeekdays: [0] };
const school = {
  enabled: true,
  startDate: "2026-09-01",
  endDate: "2027-06-30",
  weekdays: [1, 2, 3, 4, 5],
  startTime: "08:00",
  endTime: "15:00",
  lunchStartTime: "11:30",
  lunchEndTime: "12:00",
  foodAccess: { cafeteria: true },
};
const guidance = (dateKey, time, override = {}) =>
  getFuelingGuidance({
    now: new Date(`${dateKey}T${time}:00`),
    todayKey: dateKey,
    events: [],
    schoolSchedule: school,
    profile,
    ...override,
  });

test("P2-03: a weekly rest weekday shows REST with no daily tap", () => {
  assert.equal(isRestDay(profile, sunday), true);
  assert.equal(isRestDay(profile, monday), false);
  const rest = guidance(sunday, "12:00");
  assert.equal(rest.state, "rest");
  assert.equal(rest.label, "Rest day");
  // The next Sunday too, with nothing stored for that date.
  assert.equal(guidance("2026-10-18", "12:00").state, "rest");
  assert.notEqual(guidance(monday, "12:00").state, "rest");
  // Without any school or activity, a rest weekday is not "No schedule yet".
  assert.equal(
    guidance(sunday, "12:00", { schoolSchedule: null }).state,
    "rest",
  );
});

test("P2-03: a practice on a rest weekday still leads", () => {
  const events = [
    {
      id: "p",
      type: "practice",
      title: "Practice",
      date: sunday,
      startTime: "16:00",
      endTime: "17:30",
    },
  ];
  assert.notEqual(guidance(sunday, "12:00", { events }).state, "rest");
});

test("STATE-10: one day can be changed without changing the pattern", () => {
  const off = setRestDay(profile, sunday, false);
  assert.equal(isRestDay(off, sunday), false);
  assert.equal(isRestDay(off, "2026-10-18"), true);
  assert.deepEqual(off.restWeekdays, [0]);
  assert.notEqual(guidance(sunday, "12:00", { profile: off }).state, "rest");
  // And back again.
  const on = setRestDay(off, sunday, true);
  assert.equal(isRestDay(on, sunday), true);
  assert.deepEqual(on.restExceptions, []);
  assert.deepEqual(on.restDays, []);
  // A single extra rest day on a training weekday.
  const extra = setRestDay(profile, monday, true);
  assert.deepEqual(extra.restDays, [monday]);
  assert.equal(guidance(monday, "16:00", { profile: extra }).state, "rest");
  assert.equal(isRestDay(setRestDay(extra, monday, false), monday), false);
});

test("ADD-13: weekday chips add and remove days from the pattern", () => {
  const two = toggleRestWeekday(toggleRestWeekday(profile, 3), 6);
  assert.deepEqual(two.restWeekdays, [0, 3, 6]);
  assert.deepEqual(toggleRestWeekday(two, 0).restWeekdays, [3, 6]);
  assert.deepEqual(toggleRestWeekday({}, 5).restWeekdays, [5]);
});

test("P2-03: Log › Week marks rest weekdays and respects a one-day change", () => {
  const week = weekSummary({ endKey: sunday, profile });
  assert.equal(week.days.find((d) => d.dateKey === sunday).rest, true);
  assert.equal(week.days.find((d) => d.dateKey === "2026-10-10").rest, false);
  const changed = weekSummary({
    endKey: sunday,
    profile: setRestDay(profile, sunday, false),
  });
  assert.equal(changed.days.find((d) => d.dateKey === sunday).rest, false);
});

test("P2-03: stored rest days are validated", () => {
  const data = validateData({
    ...emptyData(),
    profile: {
      ...emptyData().profile,
      restWeekdays: [0, 6],
      restExceptions: [sunday],
    },
  });
  assert.deepEqual(data.profile.restWeekdays, [0, 6]);
  for (const bad of [
    { restWeekdays: [7] },
    { restWeekdays: ["Sunday"] },
    { restWeekdays: "0" },
    { restExceptions: ["Oct 11"] },
    { restDays: [20261011] },
  ])
    assert.throws(
      () =>
        validateData({
          ...emptyData(),
          profile: { ...emptyData().profile, ...bad },
        }),
      /rest days/,
      JSON.stringify(bad),
    );
});
