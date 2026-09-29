// P1-11 schedule-first setup: step logic, resume, and the first plan preview.
import test from "node:test";
import assert from "node:assert/strict";
import {
  activitiesDraft,
  activitiesError,
  activitiesFromSetup,
  applyFoodAccess,
  defaultSchoolYear,
  firstPlanPreview,
  foodAccessDraft,
  lastUsedText,
  normalizeSetupStep,
  resumeStep,
  schoolDayError,
  schoolFromSetup,
  sportStepData,
  sportStepError,
  DEFAULT_SCHOOL_DAY,
} from "../src/domain/setup.js";
import { emptyData, validateData } from "../src/domain/storage.js";
import { isSchoolDay, eventsForDate } from "../src/domain/timing.js";

const tuesday9am = new Date(2026, 8, 29, 9, 0);

test("ONB-06: setupStep is stored, validated and resumed", () => {
  const data = emptyData();
  assert.equal(data.step, "setup");
  assert.equal(data.setupStep, 0);
  assert.equal(resumeStep(data), 1, "Welcome passed means step 1");
  data.setupStep = 4;
  assert.equal(validateData(data).setupStep, 4);
  assert.equal(resumeStep(validateData(data)), 4);
  assert.equal(validateData({ ...data, setupStep: 12 }).setupStep, 6);
  assert.throws(() => validateData({ ...data, setupStep: "4" }), /setup step/);
  const legacy = emptyData();
  delete legacy.setupStep;
  assert.equal(validateData(legacy).setupStep, 0);
  assert.equal(normalizeSetupStep(-1), 0);
  assert.throws(
    () => validateData({ ...data, lastUsedAt: "never" }),
    /last used/,
  );
});

test("ONB-03: a new athlete starts with low-cost ideas off", () => {
  assert.equal(emptyData().profile.lowCostIdeas, false);
});

test("Step 1: sport is required; the migrated 'My profile' name is not prefilled", () => {
  assert.equal(sportStepError({ sport: "  " }), "Enter your sport.");
  assert.equal(sportStepError({ sport: "Soccer" }), "");
  assert.equal(sportStepData({ name: "My profile" }).name, "");
  assert.equal(
    sportStepData({ name: "Maya", sport: "Soccer" }).sport,
    "Soccer",
  );
});

test("Step 2: school validation matches Schedule and saves a full school schedule", () => {
  assert.equal(schoolDayError(DEFAULT_SCHOOL_DAY), "");
  assert.equal(
    schoolDayError({ ...DEFAULT_SCHOOL_DAY, endTime: "07:00" }),
    "The school day must end after it starts.",
  );
  assert.equal(
    schoolDayError({ ...DEFAULT_SCHOOL_DAY, weekdays: [] }),
    "Choose at least one school day.",
  );
  assert.equal(
    schoolDayError({ ...DEFAULT_SCHOOL_DAY, lunchEndTime: "16:00" }),
    "Lunch must fit inside the school day and end after it starts.",
  );
  assert.deepEqual(defaultSchoolYear("2026-09-29"), {
    startDate: "2026-08-15",
    endDate: "2027-06-15",
  });
  assert.deepEqual(defaultSchoolYear("2027-03-01").startDate, "2026-08-15");
  const school = schoolFromSetup(
    { ...DEFAULT_SCHOOL_DAY, weekdays: [5, 1] },
    null,
    "2026-09-29",
  );
  assert.deepEqual(school.weekdays, [1, 5]);
  assert.equal(school.enabled, true);
  assert.ok(isSchoolDay("2026-09-28", school), "Monday is a school day");
  assert.ok(!isSchoolDay("2026-09-29", school), "Tuesday is not");
  const data = emptyData();
  data.schoolSchedule = school;
  assert.doesNotThrow(() => validateData(data));
});

test("Step 3: the usual practice repeats weekly and Back → Next never duplicates it", () => {
  const draft = activitiesDraft([]);
  assert.deepEqual(draft.practice.weekdays, []);
  assert.equal(draft.game, null);
  draft.practice.weekdays = [2, 4];
  const options = { sport: "Soccer", todayKey: "2026-09-29" };
  const once = activitiesFromSetup(draft, [], options);
  assert.equal(once.length, 1);
  assert.equal(once[0].title, "Soccer practice");
  assert.equal(once[0].recurrence.startDate, "2026-09-29");
  assert.equal(eventsForDate(once, "2026-10-01").length, 1, "Thursday");
  assert.equal(eventsForDate(once, "2026-09-30").length, 0, "Wednesday");
  const manual = { id: "m", title: "Lift", date: "2026-09-30" };
  const again = activitiesFromSetup(
    {
      ...activitiesDraft(once),
      game: {
        date: "2026-10-03",
        startTime: "10:00",
        endTime: "11:30",
        location: "away",
      },
    },
    [...once, manual],
    options,
  );
  assert.equal(again.filter((e) => e.setupSource === "practice").length, 1);
  assert.equal(again.find((e) => e.setupSource === "practice").id, once[0].id);
  assert.equal(
    again.find((e) => e.setupSource === "game").title,
    "Soccer game",
  );
  assert.ok(again.includes(manual), "Schedule events are kept");
  assert.deepEqual(activitiesDraft(again).practice.weekdays, [2, 4]);
  assert.equal(
    activitiesError({
      practice: { ...draft.practice, endTime: "15:00" },
      game: null,
    }),
    "End time must be after start time.",
  );
  assert.equal(
    activitiesError({
      practice: { ...draft.practice, weekdays: [] },
      game: null,
    }),
    "",
  );
  const data = emptyData();
  data.schedule = again;
  assert.doesNotThrow(() => validateData(data));
});

test("Step 4: food at school sets school access and food sources", () => {
  const data = emptyData();
  data.schoolSchedule = schoolFromSetup(DEFAULT_SCHOOL_DAY, null, "2026-09-29");
  applyFoodAccess(data, {
    selected: ["refrigerator", "eatInClass"],
    familyPrep: false,
  });
  assert.deepEqual(data.schoolSchedule.foodAccess, {
    cafeteria: false,
    refrigerator: true,
    microwave: false,
    eatInClass: true,
  });
  assert.deepEqual(data.profile.foodSources, ["packed", "home"]);
  assert.equal(data.profile.familyPrep, false);
  assert.deepEqual(foodAccessDraft(data).selected, [
    "refrigerator",
    "eatInClass",
  ]);
  const noSchool = emptyData();
  applyFoodAccess(noSchool, { selected: ["cafeteria"], familyPrep: true });
  assert.equal(noSchool.schoolSchedule, null);
  assert.deepEqual(noSchool.profile.foodSources, [
    "packed",
    "cafeteria",
    "home",
  ]);
});

test("Step 6: the first plan names the next practice and a snack about 90 minutes before", () => {
  const draft = activitiesDraft([]);
  draft.practice.weekdays = [2];
  const events = activitiesFromSetup(draft, [], {
    sport: "Soccer",
    todayKey: "2026-09-29",
  });
  assert.equal(
    firstPlanPreview(events, tuesday9am).text,
    "Here's your first plan: Soccer practice today at 4:00 PM. Plan a snack for about 2:30.",
  );
  assert.equal(
    firstPlanPreview(events, new Date(2026, 8, 29, 18, 0)).text,
    "Here's your first plan: Soccer practice next Tuesday at 4:00 PM. Plan a snack for about 2:30.",
    "after today's practice, the next one is a week out",
  );
  assert.match(
    firstPlanPreview(events, new Date(2026, 8, 29, 15, 0)).text,
    /today at 4:00 PM\.$/,
    "no snack time in the past",
  );
  assert.equal(firstPlanPreview([], tuesday9am).event, null);
});

test("ENTRY-03: last used reads today, yesterday, a weekday, then a date", () => {
  const now = new Date(2026, 8, 29, 12, 0);
  assert.equal(
    lastUsedText(new Date(2026, 8, 29, 8).toISOString(), now),
    "Last used today",
  );
  assert.equal(
    lastUsedText(new Date(2026, 8, 28, 8).toISOString(), now),
    "Last used yesterday",
  );
  assert.equal(
    lastUsedText(new Date(2026, 8, 28 - 2, 8).toISOString(), now),
    "Last used Sat",
  );
  assert.equal(
    lastUsedText(new Date(2026, 8, 12, 8).toISOString(), now),
    "Last used Sep 12",
  );
  assert.equal(lastUsedText(null, now), "");
});
