import test from "node:test";
import assert from "node:assert/strict";
import {
  activityFormProblem,
  saveSportSeason,
  schoolDayProblem,
  schoolSheetProblem,
} from "../src/domain/setup.js";
import { lowOrOut, manualFood, startingAmount } from "../src/domain/food.js";
import {
  errorAfterBlur,
  errorAfterChange,
  portionAmountProblem,
  portionFormProblem,
} from "../src/domain/validation.js";
import { FOOD_IDEAS, DEFAULT_PROFILE } from "../src/domain/catalog.js";
import {
  addDays,
  applyOccurrenceOverride,
  changeSeriesWeekday,
  deleteSeriesWeekday,
  weekdayOf,
  getDateKey,
  getFuelingGuidance,
  eventsForDate,
  isSchoolDay,
  schoolOffReason,
  skipOccurrence,
  tomorrowPrepTasks,
} from "../src/domain/timing.js";
import {
  consumeStock,
  findMatchingFoodItem,
  generateGroceryItems,
  groceryTrips,
  ingredientId,
  ingredientsForMeal,
  knownMoney,
  makeLog,
  makeFoodRecord,
  missingGroceries,
  portionCalories,
  purchase,
  putAwayPlace,
  sameProduct,
  removeLogEntry,
  reviseLogEntry,
  toggleStockOut,
  stepStockCount,
  stockStatus,
  setStockStatus,
  shoppingAmount,
  stockToGroceries,
  tripUsage,
  undoConsumption,
  undoPurchase,
  validPortion,
  weeklyGroceryIdeas,
} from "../src/domain/food.js";
import {
  emptyData,
  migrateLegacy,
  validateData,
  validateDocument,
} from "../src/domain/storage.js";
import { addHydration, undoHydration } from "../src/domain/hydration.js";
import {
  logPlanAsEaten,
  markPlanLogged,
  markPlanPacked,
  planMeal,
  planNeedsReview,
  syncPlanPreparation,
  undoPlan,
} from "../src/domain/plans.js";
import {
  ideasFor,
  lowCostHiddenCount,
  noIdeaReason,
  rankIdeas,
  searchableFavorites,
} from "../src/domain/ranking.js";
import {
  availabilityChips,
  ideaTags,
  ideasForMoment,
} from "../src/domain/ideaMoments.js";
import { ideaFitsProfile } from "../src/domain/timing.js";
import { MEAL_INGREDIENTS } from "../src/domain/catalog.js";
import { api } from "../server/api.js";
import {
  BACKUP_ERRORS,
  backupDocument,
  backupFilename,
  readBackupText,
} from "../src/domain/backup.js";
import {
  DIET_CHOICES,
  DISLIKE_CHOICES,
  accessSummary,
  athleteLabel,
  backupPreview,
  backupPreviewText,
  lastBackupText,
  needsSummary,
  parseBudget,
  sportSummary,
} from "../src/domain/you.js";
import {
  canDeliverReminders,
  reminderCandidates,
  deliverReminders,
  describePermission,
  normalizeReminderSettings,
  notificationPermission,
  reminderSummary,
  REMINDER_HONESTY_LINE,
} from "../src/domain/reminders.js";
import {
  lookupBarcode,
  normalizeFdcFood,
  normalizeOffFood,
  OfflineError,
  searchFoodDataCentral,
} from "../src/usda.js";
import {
  formatAmount,
  formatCountdown,
  formatDate,
  formatDuration,
  formatPlanStatus,
  formatDateRange,
  formatShortTime,
  formatTime,
  formatWeekdays,
  plural,
} from "../src/format.js";
import {
  activityTitle,
  activityToast,
  normalizeSport,
} from "../src/domain/sport.js";
import { missingActivityField } from "../src/domain/setup.js";
import {
  availabilityLabel,
  buildRailRows,
  foodMomentLine,
} from "../src/domain/dayRail.js";
import { createSignedOutFlag } from "../src/session.js";
import {
  ML_PER_OZ,
  WATER_MAX,
  WATER_STEPS,
  formatWater,
  toOunces,
  waterAmount,
  waterUnit,
} from "../src/format.js";
import { addWater, waterToast } from "../src/domain/hydration.js";
import {
  isMonday,
  lastWeekCard,
  lastWeekSentence,
  weekSummary,
} from "../src/domain/log.js";
import { RULES, rulesFor } from "../src/domain/rules.js";
const day = "2026-09-14";
const profile = { ...DEFAULT_PROFILE, budget: "standard" };
const idea = (id) => FOOD_IDEAS.find((i) => i.id === id);
const food = {
  id: "fdc-1",
  name: "Cereal",
  nutrients: { calories: 359 },
  nutrientBasis: "g",
  servingSize: 30,
  servingSizeUnit: "g",
};
const school = {
  enabled: true,
  startDate: "2026-09-01",
  endDate: "2027-06-30",
  weekdays: [1, 2, 3, 4, 5],
  startTime: "08:00",
  endTime: "15:00",
  lunchStartTime: "11:30",
  lunchEndTime: "12:00",
  afternoonSnackTime: "14:30",
  foodAccess: { cafeteria: true },
};
const guidance = (time, events = [], override = {}) =>
  getFuelingGuidance({
    now: new Date(`${day}T${time}:00`),
    todayKey: day,
    events,
    schoolSchedule: school,
    profile,
    ...override,
  });

test("B01/B14: ingredient identity is exact, shared, and never a fuzzy safety assertion", () => {
  for (const [a, b] of [
    ["Peanut butter", "Sunflower-seed butter"],
    ["Milk", "Soy milk"],
    ["Rice", "Rice cakes"],
    ["Chickpeas", "Canned beans"],
    ["Yogurt", "Soy yogurt"],
  ])
    assert.notEqual(ingredientId({ name: a }), ingredientId({ name: b }));
  assert.equal(ingredientId({ name: "mystery bean candy" }), null);
  const pantry = [
    { name: "Peanut butter", quantity: 1 },
    { name: "Bread", quantity: 1 },
    { name: "Bananas", quantity: 1 },
  ];
  const required = ingredientsForMeal(idea("sunbutter-sandwich"), pantry, day);
  assert.equal(required.filter((i) => i.available).length, 2);
  assert.equal(
    required.find((i) => i.ingredientId === "sunbutter").matches.length,
    0,
  );
  assert.equal(
    ingredientId({ name: "Odd product", ingredientId: "bananas", food }),
    "bananas",
  );
});
test("GROC-04: one generator preserves the list, uses shopping units and never pre-checks", () => {
  const state = emptyData().groceryState;
  state.items = [
    {
      id: "custom",
      name: "My granola",
      quantity: 2,
      price: 7.5,
      notes: "favorite",
      checked: true,
    },
    { id: "b", name: "Bananas", quantity: 1, unit: "bunch", checked: false },
  ];
  const { items, summary } = weeklyGroceryIdeas({
    profile: emptyData().profile,
    events: [
      { date: "2026-09-14", startTime: "16:00", type: "practice" },
      {
        date: "2026-09-19",
        startTime: "09:00",
        type: "game",
        location: "away",
      },
    ],
    pantry: [
      { name: "Rice", quantity: 1, unit: "package", availability: "have" },
    ],
    items: state.items,
    date: day,
  });
  assert.equal(summary, "Based on 1 practice and 1 away game.");
  assert.ok(items.length >= 5 && items.length <= 8);
  assert.ok(items.every((item) => item.checked === false));
  assert.ok(items.every((item) => item.reason));
  assert.ok(!items.some((item) => item.ingredientId === "bananas"));
  assert.ok(!items.some((item) => item.ingredientId === "rice"));
  assert.ok(!items.some((item) => item.ingredientId === "sports-drink"));
  assert.ok(items.some((item) => item.reason === "For Sat away game"));
  const pretzels = generateGroceryItems({
    candidates: [{ id: "pretzels", name: "Pretzels", reason: "Staple" }],
  })[0];
  assert.equal(shoppingAmount(pretzels), "1 bag");
  assert.equal(shoppingAmount({ quantity: 2, unit: "bunch" }), "2 bunches");
  const needs = ingredientsForMeal(idea("banana-pretzels"), [], day);
  const fromIdea = missingGroceries(needs, []);
  assert.ok(fromIdea.every((item) => item.checked === false));
  assert.equal(fromIdea[0].reason, "For Banana + pretzels");
  assert.equal(fromIdea[0].origin, "meal");
  assert.deepEqual(missingGroceries(needs, fromIdea), []);
});
test("GROC-05: budget defaults to none, estimates are hidden and unknown prices stay unknown", () => {
  assert.equal(emptyData().groceryState.budgetAmount, null);
  assert.equal(emptyData().groceryState.showPrices, false);
  const items = [{ price: null, name: "USDA item", quantity: 1 }];
  assert.deepEqual(knownMoney(items), { subtotal: 0, unknown: 1 });
  assert.equal(knownMoney([{ price: 0, quantity: 1 }]).unknown, 0);
});
test("GROC-02: stored cart items migrate to checked list items", () => {
  const data = emptyData();
  data.groceryState.items = [
    { id: "a", name: "Pretzels", status: "cart" },
    { id: "b", name: "Bread", status: "list" },
    { id: "c", name: "Rice" },
  ];
  const items = validateData(data).groceryState.items;
  assert.deepEqual(
    items.map((i) => [i.id, i.checked, i.status]),
    [
      ["a", true, undefined],
      ["b", false, undefined],
      ["c", false, undefined],
    ],
  );
  assert.deepEqual(validateData(validateData(data)).groceryState.items, items);
});
test("GROC-03/06: put away updates existing rows without duplicates and new rows are Have", () => {
  const state = emptyData().groceryState;
  state.pantry = [
    {
      id: "low-bananas",
      name: "Bananas",
      ingredientId: "bananas",
      quantity: 1,
      unit: "package",
      availability: "low",
      location: "pantry",
    },
    {
      id: "rice",
      name: "Rice",
      quantity: 2,
      unit: "package",
      availability: "exact",
      expiry: "",
    },
  ];
  state.items = [
    {
      id: "i1",
      name: "Bananas",
      ingredientId: "bananas",
      quantity: 1,
      unit: "bunch",
      checked: true,
    },
    {
      id: "i2",
      name: "Rice",
      quantity: 1,
      unit: "package",
      expiry: null,
      checked: true,
    },
    {
      id: "i3",
      name: "Hummus",
      ingredientId: "hummus",
      quantity: 1,
      unit: "tub",
      category: "Cold",
      checked: true,
    },
    { id: "i4", name: "Pretzels", quantity: 1, unit: "bag", checked: false },
  ];
  const done = purchase(state, ["i1", "i2", "i3"], day, "trip", {
    places: { i3: "fridge" },
  });
  assert.equal(done.pantry.length, 3);
  assert.equal(done.pantry[0].availability, "have");
  assert.equal(done.pantry[1].quantity, 3);
  assert.equal(done.pantry[2].availability, "have");
  assert.equal(done.pantry[2].location, "fridge");
  assert.deepEqual(
    done.items.map((i) => i.id),
    ["i4"],
  );
  assert.equal(putAwayPlace(state.pantry, state.items[2]), "fridge");
  assert.equal(putAwayPlace(state.pantry, state.items[0]), "pantry");
  const undone = undoPurchase(done, "trip");
  assert.deepEqual(undone.pantry, state.pantry);
  assert.deepEqual(undone.items.map((i) => i.id).sort(), [
    "i1",
    "i2",
    "i3",
    "i4",
  ]);
});
test("GROC-06/08: undo is scoped to the trip, detects used food and lists past trips", () => {
  const state = emptyData().groceryState;
  state.pantry = [
    {
      id: "other",
      name: "Apples",
      quantity: 0,
      unit: "piece",
      availability: "out",
    },
  ];
  state.items = [
    { id: "a", name: "Rice", quantity: 2, unit: "package" },
    { id: "b", name: "Yogurt", quantity: 1, unit: "tub" },
  ];
  const first = purchase(state, ["a", "b"], day, "t1");
  const rice = first.pantry.find((p) => p.name === "Rice");
  const used = {
    ...first,
    pantry: first.pantry.map((p) =>
      p.id === rice.id ? { ...p, availability: "low" } : p,
    ),
  };
  assert.deepEqual(tripUsage(used, "t1").used, ["Rice"]);
  assert.throws(() => undoPurchase(used, "t1"), /already used/);
  const rest = undoPurchase(used, "t1", { skipUsed: true });
  assert.deepEqual(
    rest.pantry.map((p) => p.name),
    ["Apples", "Rice"],
  );
  assert.deepEqual(
    rest.items.map((i) => i.id),
    ["b"],
  );
  assert.equal(tripUsage(first, "t1").used.length, 0);
  const trips = groceryTrips(
    purchase(
      {
        ...first,
        items: [{ id: "c", name: "Oats", quantity: 1, unit: "container" }],
      },
      ["c"],
      "2026-09-15",
      "t2",
    ).purchases,
  );
  assert.deepEqual(
    trips.map((t) => [t.id, t.date, t.count]),
    [
      ["t2", "2026-09-15", 1],
      ["t1", day, 2],
    ],
  );
});
test("B08/B19/B20: meaningful nutrition portions, unknown versus zero and bounded handler", () => {
  assert.equal(portionCalories(food, 100, "g"), 359);
  assert.equal(portionCalories(food, 1, "portion"), 108);
  assert.equal(portionCalories(food, 100, "ml"), null);
  assert.equal(
    portionCalories({ nutrients: { calories: null } }, 100, "g"),
    null,
  );
  assert.equal(
    makeLog({ nutrients: { calories: 0 } }, { amount: 100, unit: "g" }, day)
      .calories,
    0,
  );
  assert.throws(() => makeLog(food, { amount: 2500, unit: "g" }, day));
  assert.equal(validPortion(-1), false);
  assert.equal(validPortion(0), false);
  assert.equal(validPortion(NaN), false);
  const entry = makeLog(food, { amount: 100, unit: "g", override: "100" }, day);
  assert.equal(entry.calories, 100);
  assert.equal(entry.sourceCalories, 359);
  assert.equal(entry.userAdjusted, true);
  food.nutrients.calories = 360;
  assert.equal(entry.food.nutrients.calories, 359);
  food.nutrients.calories = 359;
});
test("Providers normalize zero, missing energy, kJ and valid household units", () => {
  assert.equal(
    normalizeFdcFood({
      fdcId: 10,
      foodNutrients: [{ nutrientName: "Energy", unitName: "KJ", value: 418.4 }],
    }).nutrients.calories,
    100,
  );
  assert.equal(
    normalizeFdcFood({ fdcId: 10, foodNutrients: [] }).nutrients.calories,
    null,
  );
  assert.equal(
    normalizeOffFood(
      { product_name: "Water", nutriments: { "energy-kcal_100g": 0 } },
      "12345678",
    ).nutrients.calories,
    0,
  );
  assert.equal(
    normalizeOffFood({ product_name: "No energy", nutriments: {} }, "12345678")
      .nutrients.calories,
    null,
  );
});
test("Purchases are atomic, preserve provider identity and can be undone once", () => {
  const state = emptyData().groceryState;
  state.items = [
    {
      id: "one",
      name: "Cereal",
      food,
      quantity: 2,
      unit: "package",
      price: null,
      status: "cart",
    },
  ];
  const bought = purchase(state, ["one"], day, "tx");
  assert.equal(bought.items.length, 0);
  assert.equal(bought.pantry[0].quantity, 2);
  assert.equal(bought.pantry[0].food.id, food.id);
  assert.deepEqual(purchase(bought, ["one"], day, "tx"), bought);
  const undone = undoPurchase(bought, "tx");
  assert.equal(undone.pantry.length, 0);
  assert.equal(undone.items.length, 1);
  assert.deepEqual(undoPurchase(undone, "tx"), undone);
});
test("Stock is only consumed by explicit transaction with independent undo", () => {
  const data = emptyData();
  data.groceryState.pantry = [
    { id: "p", name: "Rice", quantity: 5, unit: "g", availability: "exact" },
  ];
  consumeStock(data, "log", [{ id: "p", amount: 2 }]);
  assert.equal(data.groceryState.pantry[0].quantity, 3);
  assert.throws(() => consumeStock(data, "log", [{ id: "p", amount: 1 }]));
  undoConsumption(data, "log");
  assert.equal(data.groceryState.pantry[0].quantity, 5);
  undoConsumption(data, "log");
  assert.equal(data.groceryState.pantry[0].quantity, 5);
});
test("Missing ingredients subtract compatible pantry and queued quantities", () => {
  const pantry = [
    { name: "Bananas", quantity: 1, unit: "piece" },
    { name: "Pretzels", quantity: 10, unit: "g" },
  ];
  const requirements = ingredientsForMeal(idea("banana-pretzels"), pantry, day);
  const missing = missingGroceries(requirements, [
    { name: "Pretzels", quantity: 5, unit: "g" },
  ]);
  assert.equal(missing.length, 1);
  assert.equal(missing[0].requirement.amount, 15);
  assert.equal(missing[0].requirement.unit, "g");
  assert.equal(missing[0].unit, "bag");
  pantry[1].expiry = "2026-09-13";
  assert.equal(
    ingredientsForMeal(idea("banana-pretzels"), pantry, day)[1].available,
    false,
  );
});
test("B10: lunch boundary intervals are start-inclusive, end-exclusive", () => {
  assert.match(guidance("11:29").timing, /Lunch at/);
  for (const t of ["11:30", "11:45", "11:59"])
    assert.match(guidance(t).timing, /Lunch now/);
  assert.match(guidance("12:00").timing, /Afternoon snack/);
  assert.equal(guidance("15:00").inSchool, false);
});
test("B11: recent recovery preserves next-session context", () => {
  const events = [
    {
      id: "one",
      title: "First",
      date: day,
      startTime: "14:00",
      endTime: "15:00",
    },
    {
      id: "two",
      title: "Second",
      date: day,
      startTime: "18:00",
      endTime: "19:00",
    },
  ];
  const result = guidance("15:10", events);
  assert.equal(result.moment, "recovery");
  assert.equal(result.nextEvent.id, "two");
  assert.match(result.timing, /Second/);
});
test("Travel departure restricts home-only assumptions and empty-state explains access", () => {
  const events = [
    {
      id: "away",
      title: "Game",
      date: day,
      startTime: "18:00",
      endTime: "19:00",
      travelMinutes: 45,
      location: "away",
    },
  ];
  const result = guidance("17:30", events, {
    profile: { ...profile, foodSources: ["home"] },
  });
  assert.equal(result.departed, true);
  assert.match(result.departureLabel, /5:15/);
  assert.equal(result.ideas.length, 0);
  assert.match(result.emptyReason, /No food source/);
});
test("B17 and calendar dates: exclusions, restoration, year boundary and local day arithmetic", () => {
  const event = {
    id: "weekly",
    title: "Practice",
    startTime: "16:00",
    recurrence: {
      startDate: day,
      endDate: "2027-09-14",
      weekdays: [1],
      excludedDates: [day],
    },
  };
  assert.equal(eventsForDate([event], day).length, 0);
  event.recurrence.excludedDates = [];
  assert.equal(eventsForDate([event], day).length, 1);
  assert.equal(
    getDateKey(addDays(new Date("2026-12-31T12:00:00"), 1)),
    "2027-01-01",
  );
  assert.equal(
    getDateKey(addDays(new Date("2026-03-07T12:00:00"), 1)),
    "2026-03-08",
  );
  assert.equal(isSchoolDay(day, { ...school, excludedDates: [day] }), false);
});
test("Hydration undo removes the actual last amount and retains earlier concurrent operations", () => {
  let log = { entries: [], water: 52 };
  log = addHydration(log, 8);
  log = addHydration(log, 12);
  assert.equal(log.water, 72);
  log = undoHydration(log);
  assert.equal(log.water, 60);
  assert.equal(undoHydration(log).water, 52);
});
test("Plan replacement and undo retain independent shared preparation", () => {
  const data = emptyData();
  data.dayPlans[day] = [
    { id: "manual", label: "Take boots", kind: "gear", done: true },
  ];
  const first = planMeal(data, idea("banana-pretzels"), day, {});
  const second = planMeal(data, idea("sunbutter-sandwich"), day, {}, first.id);
  assert.equal(data.mealPlans.length, 1);
  assert.ok(data.dayPlans[day].some((t) => t.id === "manual" && t.done));
  undoPlan(data, second.id);
  assert.equal(data.mealPlans[0].id, first.id);
  assert.ok(data.dayPlans[day].some((t) => t.id === "manual"));
});
test("B03/B05: migration preserves raw originals and fresh profiles are independent", () => {
  const values = {
    "nourally-profile": JSON.stringify(profile),
    "nourally-step": "dashboard",
    "nourally-daily-logs": JSON.stringify({
      [day]: { entries: [], water: 52 },
    }),
  };
  const storage = {
    length: Object.keys(values).length,
    key: (i) => Object.keys(values)[i],
    getItem: (key) => values[key],
  };
  const a = migrateLegacy(storage),
    b = migrateLegacy(storage);
  assert.deepEqual(
    a.profiles[a.defaultProfileId].data,
    b.profiles[b.defaultProfileId].data,
  );
  assert.deepEqual(a.legacyBackup, values);
  const fresh = emptyData();
  fresh.profile.name = "Other";
  assert.equal(emptyData().profile.name, "");
  assert.equal(Object.keys(fresh.dailyLogs).length, 0);
  values["nourally-profile"] = "{broken";
  assert.throws(() => migrateLegacy(storage));
  assert.throws(() => validateData({ groceryState: { pantry: {} } }));
  assert.throws(() =>
    validateData({ dailyLogs: { [day]: { entries: "broken" } } }),
  );
  assert.throws(() => validateDocument({ version: 999, profiles: {} }));
});
test("B12: reminder uses remaining time and deduplicates a changed lead setting", async () => {
  const events = [
    {
      id: "practice",
      title: "Practice",
      date: day,
      startTime: "16:00",
      endTime: "17:00",
    },
  ];
  const now = new Date(`${day}T15:32:00`);
  const first = reminderCandidates(
    events,
    { enabled: true, leadMinutes: 30 },
    now,
  );
  const second = reminderCandidates(
    events,
    { enabled: true, leadMinutes: 60 },
    now,
  );
  assert.equal(first.length, 1);
  assert.equal(first[0].key, second[0].key);
  assert.match(first[0].title, /in 28 min/);
  let stored = "",
    deliveries = 0;
  const storage = {
    getItem: () => stored,
    setItem: (_key, value) => {
      stored = value;
    },
  };
  const notify = () => {
    deliveries += 1;
  };
  await deliverReminders({
    profileId: "p",
    candidates: first,
    storage,
    notify,
  });
  await deliverReminders({
    profileId: "p",
    candidates: second,
    storage,
    notify,
  });
  assert.equal(deliveries, 1);
  events[0].startTime = "16:15";
  await deliverReminders({
    profileId: "p",
    candidates: reminderCandidates(
      events,
      { enabled: true, leadMinutes: 60 },
      now,
    ),
    storage,
    notify,
  });
  assert.equal(deliveries, 2);
});
test("Grouped purchases and stock deductions cannot overdraw one pantry row", () => {
  const state = emptyData().groceryState;
  state.pantry = [
    { id: "p", name: "Rice", quantity: 2, unit: "g", availability: "exact" },
  ];
  state.items = [
    { id: "a", name: "Rice", quantity: 1, unit: "g" },
    { id: "b", name: "Rice", quantity: 1, unit: "g" },
  ];
  const bought = purchase(state, ["a", "b"], day, "trip");
  assert.equal(bought.pantry[0].quantity, 4);
  assert.equal(undoPurchase(bought, "trip").pantry[0].quantity, 2);
  const data = emptyData();
  data.groceryState.pantry = structuredClone(state.pantry);
  assert.throws(() =>
    consumeStock(data, "log", [
      { id: "p", amount: 1.5 },
      { id: "p", amount: 1.5 },
    ]),
  );
  assert.equal(data.groceryState.pantry[0].quantity, 2);
});
test("P0-08a: purchase matches missing and null optional package fields", () => {
  const state = emptyData().groceryState;
  state.pantry = [
    {
      id: "existing",
      name: "Rice",
      quantity: 2,
      unit: "package",
      packageAmount: null,
      packageUnit: null,
      expiry: null,
      availability: "exact",
    },
  ];
  state.items = [{ id: "new", name: "Rice", quantity: 1, unit: "package" }];
  const bought = purchase(state, ["new"], day, "null-match");
  assert.equal(bought.pantry.length, 1);
  assert.equal(bought.pantry[0].id, "existing");
  assert.equal(bought.pantry[0].quantity, 3);
});
test("P0-08b: undo purchase touches only rows from its trip", () => {
  const state = emptyData().groceryState;
  state.pantry = [
    {
      id: "untouched",
      name: "Apples",
      quantity: 0,
      unit: "piece",
      availability: "out",
    },
  ];
  state.items = [{ id: "rice", name: "Rice", quantity: 1, unit: "package" }];
  const undone = undoPurchase(
    purchase(state, ["rice"], day, "scoped"),
    "scoped",
  );
  assert.deepEqual(undone.pantry, state.pantry);
});
test("P0-08c/d: new food is exact and Out round-trip keeps exact quantity", () => {
  const item = makeFoodRecord(
    { name: "Bananas", quantity: 1, unit: "piece" },
    { id: "banana" },
  );
  assert.equal(item.lowThreshold, undefined);
  assert.equal(item.availability, "exact");
  const out = toggleStockOut(item, day);
  assert.equal(out.availability, "out");
  assert.equal(out.quantity, 1);
  const back = toggleStockOut(out, day);
  assert.equal(back.availability, "exact");
  assert.equal(back.quantity, 1);
});
test("P0-08e: editing a food log preserves its original time", () => {
  const original = {
    id: "entry",
    name: "Rice",
    time: "8:15 AM",
    createdAt: "earlier",
  };
  const revised = reviseLogEntry(original, {
    name: "Rice bowl",
    time: "5:00 PM",
  });
  assert.equal(revised.time, "8:15 AM");
  assert.equal(revised.id, "entry");
  assert.equal(revised.createdAt, "earlier");
});
test("P0-08f: removing a logged food restores linked stock or blocks if missing", () => {
  const data = emptyData();
  data.dailyLogs[day] = { entries: [{ id: "meal", name: "Rice" }], water: 0 };
  data.groceryState.pantry = [
    {
      id: "stock",
      name: "Rice",
      quantity: 3,
      unit: "g",
      availability: "exact",
    },
  ];
  consumeStock(data, "meal", [{ id: "stock", amount: 2 }]);
  removeLogEntry(data, day, "meal");
  assert.equal(data.groceryState.pantry[0].quantity, 3);
  assert.equal(data.dailyLogs[day].entries.length, 0);
  const blocked = emptyData();
  blocked.dailyLogs[day] = {
    entries: [{ id: "meal", name: "Rice" }],
    water: 0,
  };
  blocked.operations.push({
    id: "deduction",
    type: "consume",
    logId: "meal",
    deductions: [{ id: "missing", amount: 1 }],
  });
  assert.throws(() => removeLogEntry(blocked, day, "meal"));
  assert.equal(blocked.dailyLogs[day].entries.length, 1);
});
test("P0-08g: logging a planned meal changes its plan status", () => {
  const data = emptyData();
  const plan = planMeal(data, idea("banana-pretzels"), day, {});
  markPlanLogged(data, plan.id);
  assert.equal(data.mealPlans[0].status, "eaten");
});
test("P0-08h: adding an exact duplicate can be detected before merging", () => {
  const list = [
    {
      id: "one",
      name: "Bananas",
      quantity: 1,
      unit: "package",
      packageAmount: null,
      expiry: null,
      location: null,
    },
  ];
  const candidate = { name: "Bananas", quantity: 1, unit: "package" };
  assert.equal(findMatchingFoodItem(list, candidate)?.id, "one");
});
test("P0-10: 30, 90, and 180-minute practice boundaries keep their states", () => {
  const events = [
    {
      id: "practice",
      title: "Practice",
      date: day,
      startTime: "16:00",
      endTime: "17:30",
    },
  ];
  assert.equal(guidance("15:30", events).moment, "quick");
  assert.equal(guidance("14:30", events).moment, "pre");
  assert.equal(guidance("13:00", events).moment, "regular");
  assert.match(guidance("12:59", events).label, /Practice at 4:00 PM/);
});
test("P0-10: lunch at 11:45 remains visible before 4 PM practice", () => {
  const events = [
    {
      id: "practice",
      title: "Practice",
      date: day,
      startTime: "16:00",
      endTime: "17:30",
    },
  ];
  const result = guidance("11:45", events);
  assert.equal(result.activeSchoolWindow.label, "Lunch");
  assert.match(result.timing, /Lunch now/);
  assert.match(result.timing, /Practice/);
});
test("P0-10: an empty schedule is setup and a quiet late night has no action idea", () => {
  const withoutSchool = { ...school, enabled: false };
  const setup = guidance("12:00", [], { schoolSchedule: withoutSchool });
  assert.equal(setup.state, "setup");
  assert.equal(setup.ideas.length, 0);
  const late = guidance("22:00", [], { schoolSchedule: withoutSchool });
  assert.equal(late.state, "late");
  assert.equal(late.ideas.length, 0);
});
test("P0-10: non-school days avoid school handoff and zero travel durations", () => {
  const events = [
    {
      id: "game",
      title: "Game",
      date: day,
      startTime: "17:00",
      endTime: "18:00",
      location: "away",
      travelMinutes: 0,
    },
  ];
  const result = guidance("10:00", events, {
    schoolSchedule: { ...school, enabled: false },
  });
  assert.doesNotMatch(result.title, /school to sport/i);
  assert.doesNotMatch(result.timing, /0 min travel/);
  assert.equal(
    tomorrowPrepTasks(events[0]).some((task) =>
      /allow 0 minutes/.test(task.label),
    ),
    false,
  );
});
test("P0-11: away reminder fires before Leave by and uses singular minutes", () => {
  const event = {
    id: "away",
    title: "Game",
    date: day,
    startTime: "16:00",
    endTime: "18:00",
    location: "away",
    travelMinutes: 45,
  };
  const settings = { enabled: true, leadMinutes: 30 };
  assert.equal(
    reminderCandidates([event], settings, new Date(`${day}T14:44:00`)).length,
    0,
  );
  const oneMinute = reminderCandidates(
    [event],
    settings,
    new Date(`${day}T15:14:00`),
  );
  assert.equal(oneMinute.length, 1);
  assert.match(oneMinute[0].title, /Leave.*in 1 min/);
  assert.match(oneMinute[0].title, /3:15 PM/);
  assert.equal(
    reminderCandidates([event], settings, new Date(`${day}T15:16:00`)).length,
    0,
  );
});
test("P0-11: closed athlete and revoked permission block delivery", () => {
  assert.equal(
    canDeliverReminders({
      signedOut: true,
      enabled: true,
      permission: "granted",
    }),
    false,
  );
  assert.equal(
    canDeliverReminders({
      signedOut: false,
      enabled: true,
      permission: "denied",
    }),
    false,
  );
  assert.equal(
    canDeliverReminders({
      signedOut: false,
      enabled: true,
      permission: "granted",
    }),
    true,
  );
});
test("P0-12: athlete backup excludes other athletes and keeps version 2", () => {
  const document = {
    version: 2,
    revision: 4,
    defaultProfileId: "a",
    profiles: {
      a: { id: "a", name: "Ava", data: emptyData() },
      b: { id: "b", name: "Ben", data: emptyData() },
    },
  };
  const single = backupDocument(document, "a");
  assert.equal(single.scope, "current");
  assert.deepEqual(Object.keys(single.profiles), ["a"]);
  assert.equal(validateDocument(single).version, 3);
  const all = backupDocument(document, "a", "all");
  assert.deepEqual(Object.keys(all.profiles), ["a", "b"]);
  assert.equal(
    backupFilename("Ava", new Date(2026, 8, 29)),
    "nourally-ava-2026-09-29.json",
  );
});
test("P1-02: editing one weekly occurrence leaves its other dates unchanged", () => {
  const recurring = {
    id: "practice",
    title: "Soccer practice",
    type: "practice",
    startTime: "16:00",
    endTime: "17:30",
    recurrence: {
      startDate: "2026-09-14",
      endDate: "2026-10-31",
      weekdays: [1],
      excludedDates: [],
    },
  };
  const edited = applyOccurrenceOverride(recurring, "2026-09-21", {
    title: "Field practice",
    startTime: "15:30",
  });
  assert.equal(
    eventsForDate([edited], "2026-09-21")[0].title,
    "Field practice",
  );
  assert.equal(eventsForDate([edited], "2026-09-21")[0].startTime, "15:30");
  assert.equal(
    eventsForDate([edited], "2026-09-28")[0].title,
    "Soccer practice",
  );
  assert.equal(eventsForDate([edited], "2026-09-28")[0].startTime, "16:00");
  const skipped = skipOccurrence(edited, "2026-09-21");
  assert.equal(eventsForDate([skipped], "2026-09-21").length, 0);
  assert.equal(eventsForDate([skipped], "2026-09-28").length, 1);
});

// ACT-02 / ACT-03: weekday scope on a Mon–Fri series. Week of Oct 5, 2026:
// Mon 5, Tue 6, Wed 7, Thu 8, Fri 9.
const deepFreeze = (value) => {
  if (value && typeof value === "object") {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};
const weekDates = [
  "2026-10-05",
  "2026-10-06",
  "2026-10-07",
  "2026-10-08",
  "2026-10-09",
];
const monFri = () => ({
  id: "series",
  title: "Practice",
  type: "practice",
  startTime: "16:00",
  endTime: "17:30",
  recurrence: {
    startDate: "2026-09-01",
    endDate: "2026-12-14",
    weekdays: [1, 2, 3, 4, 5],
    excludedDates: ["2026-10-02", "2026-10-07"],
    overrides: { "2026-10-09": { startTime: "15:00" } },
  },
});
const onDays = (events) =>
  weekDates.map((date) => eventsForDate(events, date).map((e) => e.startTime));

test("ACT-03: deleting all Friday practices keeps Mon–Thu", () => {
  const before = deepFreeze([monFri(), { id: "game", date: "2026-10-10" }]);
  const after = deleteSeriesWeekday(before, "series", weekdayOf("2026-10-09"));
  assert.deepEqual(onDays(after), [["16:00"], ["16:00"], [], ["16:00"], []]);
  assert.deepEqual(after[0].recurrence.weekdays, [1, 2, 3, 4]);
  // The Friday override and the Friday skip go with Friday; Wed's skip stays.
  assert.deepEqual(after[0].recurrence.overrides, {});
  assert.deepEqual(after[0].recurrence.excludedDates, ["2026-10-07"]);
  assert.equal(after[0].id, "series");
  assert.equal(after[1].id, "game");
  // Undo: the input list is untouched, so restoring it restores every day.
  assert.deepEqual(onDays(before), [
    ["16:00"],
    ["16:00"],
    [],
    ["16:00"],
    ["15:00"],
  ]);
});

test("ACT-03: on a one-weekday series, 'all' removes the series", () => {
  const tuesdays = { ...monFri(), recurrence: { ...monFri().recurrence } };
  tuesdays.recurrence.weekdays = [2];
  const after = deleteSeriesWeekday([tuesdays], "series", 2);
  assert.deepEqual(after, []);
});

test("ACT-02: changing all Tuesday practices leaves the other weekdays", () => {
  const before = deepFreeze([monFri()]);
  const after = changeSeriesWeekday(
    before,
    "series",
    2,
    { fields: { startTime: "17:00", endTime: "18:30", id: "x", date: "y" } },
    "tuesdays",
  );
  assert.deepEqual(onDays(after), [
    ["16:00"],
    ["17:00"],
    [],
    ["16:00"],
    ["15:00"],
  ]);
  const [rest, split] = after;
  assert.equal(rest.id, "series");
  assert.deepEqual(rest.recurrence.weekdays, [1, 3, 4, 5]);
  assert.equal(split.id, "tuesdays");
  assert.deepEqual(split.recurrence.weekdays, [2]);
  assert.equal(split.recurrence.startDate, "2026-09-01");
  assert.deepEqual(split.recurrence.overrides, {});
  // A later Tuesday and a later Thursday.
  assert.equal(eventsForDate(after, "2026-10-13")[0].endTime, "18:30");
  assert.equal(eventsForDate(after, "2026-10-15")[0].endTime, "17:30");
  // Undo restores the untouched input.
  assert.deepEqual(onDays(before)[1], ["16:00"]);
});

test("ACT-02: picking more days in the sheet moves them too", () => {
  const after = changeSeriesWeekday(
    [monFri()],
    "series",
    2,
    { fields: { startTime: "17:00" }, weekdays: [2, 4], endDate: "2026-11-30" },
    "split",
  );
  assert.deepEqual(after[0].recurrence.weekdays, [1, 3, 5]);
  assert.deepEqual(after[1].recurrence.weekdays, [2, 4]);
  assert.equal(after[1].recurrence.endDate, "2026-11-30");
  assert.equal(after[0].recurrence.endDate, "2026-12-14");
  assert.deepEqual(onDays(after), [
    ["16:00"],
    ["17:00"],
    [],
    ["17:00"],
    ["15:00"],
  ]);
});

test("ACT-02: on a one-weekday series, 'all' changes the series in place", () => {
  const tuesdays = { ...monFri(), recurrence: { ...monFri().recurrence } };
  tuesdays.recurrence.weekdays = [2];
  const after = changeSeriesWeekday(
    [tuesdays],
    "series",
    2,
    { fields: { title: "Field practice" } },
    "unused",
  );
  assert.equal(after.length, 1);
  assert.equal(after[0].id, "series");
  assert.equal(after[0].title, "Field practice");
  assert.deepEqual(after[0].recurrence.weekdays, [2]);
  assert.throws(() =>
    changeSeriesWeekday([{ id: "one", date: "2026-10-06" }], "one", 2, {
      fields: {},
    }),
  );
});

test("P1-02: days-off range and pause remove school from timing", () => {
  const off = {
    ...school,
    excludedRanges: [{ startDate: day, endDate: "2026-09-15" }],
  };
  assert.equal(isSchoolDay(day, off), false);
  assert.equal(
    guidance("11:45", [], { schoolSchedule: off }).schoolToday,
    false,
  );
  assert.equal(isSchoolDay("2026-09-16", off), true);
  const paused = { ...school, pausedFrom: day, pausedUntil: "2026-09-30" };
  assert.equal(isSchoolDay(day, paused), false);
  assert.equal(isSchoolDay("2026-10-01", paused), true);
});

test("P1-01: Today and Ideas share pantry-aware ranking and exclude hidden ideas", () => {
  const pantry = [
    {
      id: "b",
      name: "Bananas",
      ingredientId: "bananas",
      availability: "have",
      quantity: 1,
    },
    {
      id: "p",
      name: "Pretzels",
      ingredientId: "pretzels",
      availability: "have",
      quantity: 1,
    },
  ];
  const options = {
    moment: "pre",
    date: day,
    profile,
    pantry,
    access: profile.foodSources,
  };
  const ranked = ideasFor(options);
  const current = guidance(
    "14:30",
    [
      {
        id: "practice",
        title: "Practice",
        date: day,
        startTime: "16:00",
        endTime: "17:30",
      },
    ],
    { pantry, schoolSchedule: null },
  );
  assert.equal(ranked[0].id, "banana-pretzels");
  assert.equal(current.ideas[0].id, ranked[0].id);
  assert.equal(
    ingredientsForMeal(ranked[0], pantry, day).every((i) => i.sufficient),
    true,
  );
  assert.equal(
    rankIdeas(ranked, { pantry, date: day, hiddenIdeas: [ranked[0].id] }).some(
      (i) => i.id === ranked[0].id,
    ),
    false,
  );
  assert.equal(
    ideasFor({ ...options, favorites: [{ id: "bagel-jam" }] })[0].id,
    "bagel-jam",
  );
});

test("P1-01: preparation and one-tap eating advance a plan without duplicate logs", () => {
  const data = emptyData();
  const plan = planMeal(data, idea("banana-pretzels"), day, {
    moment: "pre",
    event: { id: "p", startTime: "16:00" },
  });
  assert.equal(plan.eatAt, "14:30");
  assert.equal(plan.intendedTime, "14:30");
  assert.equal(plan.eventStartTime, "16:00");
  data.dayPlans[day]
    .filter((t) => t.kind === "food")
    .forEach((t) => {
      t.done = true;
    });
  syncPlanPreparation(data, day);
  assert.equal(plan.status, "packed");
  assert.ok(plan.packedAt);
  const entry = logPlanAsEaten(data, plan.id, new Date(`${day}T14:30:00`));
  assert.equal(plan.status, "eaten");
  assert.equal(plan.logEntryId, entry.id);
  assert.equal(entry.mealPlanId, plan.id);
  assert.equal(logPlanAsEaten(data, plan.id).id, entry.id);
  assert.equal(data.dailyLogs[day].entries.length, 1);
  assert.throws(() => markPlanPacked(data, plan.id), /already eaten/);
});

test("P1-01: v2 migration preserves original backup and links eaten plans to logs", () => {
  const data = emptyData();
  const plan = planMeal(data, idea("banana-pretzels"), day, {
    event: { id: "p", startTime: "16:00" },
  });
  plan.status = "logged";
  delete plan.eatAt;
  plan.intendedTime = "16:00";
  data.dailyLogs[day] = {
    entries: [
      {
        id: "entry",
        name: plan.template.name,
        mealPlanId: plan.id,
        createdAt: "2026-09-14T18:00:00Z",
      },
    ],
  };
  const original = {
    version: 2,
    revision: 4,
    defaultProfileId: "athlete",
    profiles: { athlete: { id: "athlete", name: "Sam", data } },
    legacyBackup: { kept: "original" },
  };
  const upgraded = validateDocument(structuredClone(original));
  assert.equal(upgraded.version, 3);
  assert.deepEqual(upgraded.legacyBackup, { kept: "original" });
  assert.deepEqual(upgraded.migrationBackup, original);
  assert.equal(upgraded.profiles.athlete.data.mealPlans[0].status, "eaten");
  assert.equal(upgraded.profiles.athlete.data.mealPlans[0].logEntryId, "entry");
  assert.equal(upgraded.profiles.athlete.data.mealPlans[0].eatAt, "14:30");
  const reloaded = validateDocument(upgraded);
  assert.deepEqual(reloaded.migrationBackup, original);
});

test("P1-03: school morning, evening and rest states match the day", () => {
  const events = [
    {
      id: "practice",
      type: "practice",
      title: "Soccer practice",
      date: day,
      startTime: "16:00",
      endTime: "17:30",
    },
    {
      id: "tomorrow",
      title: "Practice",
      date: "2026-09-15",
      startTime: "16:00",
      endTime: "17:30",
    },
  ];
  assert.equal(guidance("07:00", events).state, "before_school");
  assert.match(guidance("07:00", events).title, /Pack/);
  assert.equal(guidance("19:01", events).state, "evening");
  assert.equal(
    guidance("12:00", [], { profile: { ...profile, restDays: [day] } }).state,
    "rest",
  );
  assert.match(guidance("11:45", events).title, /Lunch/);
});

test("P1-04: ideas use readable amounts and tomorrow plans stay on tomorrow", () => {
  const date = "2026-09-15";
  const data = emptyData();
  const ideas = ideasFor({
    moment: "tomorrow",
    date,
    profile: data.profile,
    pantry: [],
  });
  assert.ok(ideas.length);
  for (const idea of ideas)
    for (const ingredient of ingredientsForMeal(idea, [], date))
      assert.doesNotMatch(
        ingredient.displayAmount,
        /\b(piece|portion|servings?)\b/i,
      );
  const plan = planMeal(data, ideas[0], date, {
    moment: "regular",
    event: { id: "next", startTime: "16:00", endTime: "17:30" },
  });
  const repeated = planMeal(data, ideas[0], date, {
    moment: "regular",
    event: { id: "next", startTime: "16:00", endTime: "17:30" },
  });
  assert.equal(repeated.id, plan.id);
  assert.equal(data.mealPlans.length, 1);
  assert.equal(plan.date, date);
  assert.equal(plan.eatAt, "14:30");
  data.profile.hiddenIdeas = [ideas[0].id];
  assert.ok(
    !ideasFor({ moment: "tomorrow", date, profile: data.profile }).some(
      (i) => i.id === ideas[0].id,
    ),
  );
});

test("P1-05: quick Have, exact restoration, legacy migration and low restock", () => {
  const data = emptyData();
  const date = "2026-09-29";
  const row = makeFoodRecord({
    name: "Bananas",
    ingredientId: "bananas",
    availability: "have",
    quantity: 1,
    unit: "package",
  });
  assert.equal(stockStatus(row), "have");
  const exact = { ...row, availability: "exact", quantity: 3 };
  const restored = setStockStatus(
    setStockStatus(exact, "out", date),
    "have",
    date,
  );
  assert.equal(restored.quantity, 3);
  assert.equal(restored.availability, "exact");
  data.groceryState.pantry = [{ ...row, availability: "some" }];
  assert.equal(validateData(data).groceryState.pantry[0].availability, "have");
  stockToGroceries(data, [setStockStatus(row, "low", date)]);
  stockToGroceries(data, [row]);
  assert.equal(data.groceryState.items.length, 1);
  assert.equal(data.groceryState.items[0].checked, false);
});

test("P0-06: no idea ranking or filter depends on unreviewed allergen flags", () => {
  const ids = (list) => list.map((i) => i.id);
  const base = { moment: "regular", date: day, pantry: [] };
  const practice = [
    {
      id: "p",
      title: "Practice",
      date: day,
      startTime: "16:00",
      endTime: "17:30",
    },
  ];
  for (const moment of ["quick", "pre", "regular", "recovery"])
    for (const need of ["glutenFree", "nutFree", "dairyFree"])
      assert.deepEqual(
        ids(
          ideasFor({
            ...base,
            moment,
            profile: { ...profile, dietaryNeeds: [need] },
          }),
        ),
        ids(ideasFor({ ...base, moment, profile })),
        `${need} changed ${moment} ideas`,
      );
  // Flipping every allergen flag must not change filtering or order.
  const saved = FOOD_IDEAS.map((i) => [i.glutenFree, i.nutFree]);
  const before = ids(
    ideasFor({
      ...base,
      profile: { ...profile, dietaryNeeds: ["glutenFree"] },
    }),
  );
  const guided = ids(guidance("14:40", practice).allIdeas);
  try {
    for (const i of FOOD_IDEAS) {
      i.glutenFree = !i.glutenFree;
      i.nutFree = !i.nutFree;
    }
    assert.deepEqual(
      ids(
        ideasFor({
          ...base,
          profile: { ...profile, dietaryNeeds: ["glutenFree"] },
        }),
      ),
      before,
    );
    assert.deepEqual(
      ids(
        guidance("14:40", practice, {
          profile: { ...profile, dietaryNeeds: ["glutenFree", "nutFree"] },
        }).allIdeas,
      ),
      guided,
    );
    for (const i of FOOD_IDEAS)
      assert.equal(
        ideaFitsProfile(i, {
          ...profile,
          dietaryNeeds: ["glutenFree", "nutFree"],
        }),
        ideaFitsProfile(i, profile),
      );
  } finally {
    FOOD_IDEAS.forEach((i, n) => ([i.glutenFree, i.nutFree] = saved[n]));
  }
  // Real diet preferences still filter.
  assert.ok(
    ideasFor({
      ...base,
      profile: { ...profile, dietaryNeeds: ["vegan"] },
    }).every((i) => i.vegan),
  );
});

test("P1-01: Ideas and Today rank with the same school-context inputs", () => {
  const data = emptyData();
  data.profile = { ...profile, foodSources: ["packed", "cafeteria", "home"] };
  data.schoolSchedule = { ...school, foodAccess: { cafeteria: false } };
  data.schedule = [
    {
      id: "p",
      title: "Practice",
      date: day,
      startTime: "15:30",
      endTime: "17:00",
    },
  ];
  const at = (time) => new Date(`${day}T${time}:00`);
  // 14:15 is 75 minutes before practice, inside school: Today ranks "pre".
  const today = getFuelingGuidance({
    now: at("14:15"),
    todayKey: day,
    events: data.schedule,
    schoolSchedule: data.schoolSchedule,
    profile: data.profile,
    pantry: [],
    favorites: [],
  });
  assert.equal(today.moment, "pre");
  assert.equal(today.inSchool, true);
  const ideasNow = ideasForMoment({
    moment: "before",
    now: at("14:15"),
    todayKey: day,
    data,
  });
  assert.deepEqual(
    ideasNow.ideas.map((i) => i.id),
    today.allIdeas.map((i) => i.id),
  );
  // Planning from the morning ranks for the eat time, still at school.
  const early = ideasForMoment({
    moment: "before",
    now: at("10:00"),
    todayKey: day,
    data,
  });
  assert.equal(early.guidance.inSchool, true);
  assert.equal(early.ideas[0].id, today.ideas[0].id);
  assert.deepEqual(
    early.ideas.map((i) => i.id),
    today.allIdeas.map((i) => i.id),
  );
  // The old Ideas call had no school context and let home-only ideas in.
  const naive = ideasFor({ moment: "pre", date: day, profile: data.profile });
  assert.ok(naive.some((i) => !i.sources.includes("packed")));
  assert.ok(early.ideas.every((i) => i.sources.includes("packed")));
  // "Tomorrow" ranks the regular moment on tomorrow's date.
  const tomorrow = ideasForMoment({
    moment: "tomorrow",
    now: at("10:00"),
    todayKey: day,
    data,
  });
  assert.equal(tomorrow.date, "2026-09-15");
  assert.equal(tomorrow.guidance.moment, "regular");
});

test("P1-04: saved ideas rank first and stay out of food search", () => {
  const favorites = [
    { id: "fdc-1", name: "Cereal", source: "USDA FoodData Central" },
    { ...idea("bagel-jam"), source: "Meal example" },
    { id: "old-saved-meal", name: "Old saved meal", source: "Meal example" },
  ];
  assert.deepEqual(
    searchableFavorites(favorites).map((f) => f.id),
    ["fdc-1"],
  );
  const options = { moment: "regular", date: day, profile, pantry: [] };
  assert.notEqual(ideasFor(options)[0].id, "bagel-jam");
  assert.equal(ideasFor({ ...options, favorites })[0].id, "bagel-jam");
});

test("P1-04: every idea ingredient has a readable household amount", () => {
  for (const [id, rows] of Object.entries(MEAL_INGREDIENTS))
    for (const row of rows) {
      const text = row[4];
      assert.ok(text, `${id}/${row[1]} has no display amount`);
      assert.doesNotMatch(
        text,
        /to suit|\b\d+\s?(g|ml)\b|\b(piece|portion|servings?)\b/i,
        `${id}/${row[1]}: ${text}`,
      );
    }
});

test("P1-04: the low-cost note only appears when the setting hides ideas", () => {
  const options = { moment: "regular", date: day, pantry: [] };
  assert.equal(lowCostHiddenCount({ ...options, profile }), 0);
  const saving = { ...profile, lowCostIdeas: true };
  assert.ok(lowCostHiddenCount({ ...options, profile: saving }) > 0);
  assert.ok(
    ideasFor({ ...options, profile: saving }).every((i) => i.cost === "save"),
  );
});

test("P0-09: barcode 404, outage and offline stay distinct", async () => {
  const realFetch = globalThis.fetch;
  const htmlBody = async () => {
    throw new SyntaxError("Unexpected token <");
  };
  try {
    // Server maps an Open Food Facts 404 to a 404 "not found" response.
    globalThis.fetch = async () => ({ ok: false, status: 404 });
    const sent = {};
    await api(
      {
        url: "/api/barcode/00000000",
        method: "GET",
        socket: { remoteAddress: "p0-09" },
      },
      {
        writeHead: (status) => (sent.status = status),
        end: (body) => (sent.body = JSON.parse(body)),
      },
      () => {},
    );
    assert.equal(sent.status, 404);
    assert.match(sent.body.error, /couldn't find that barcode/);
    // Client: a 404 barcode reads as not found, without parsing the body.
    globalThis.fetch = async () => ({ ok: false, status: 404, json: htmlBody });
    await assert.rejects(lookupBarcode("00000000"), {
      message: "We couldn't find that barcode. Add the food yourself.",
    });
    // STATE-13: a barcode outage or timeout is not "not found".
    globalThis.fetch = async () => ({
      ok: false,
      status: 503,
      json: async () => ({ error: "Provider timed out." }),
    });
    await assert.rejects(lookupBarcode("00000000"), {
      message: "Barcode lookup isn't working right now. Try again.",
    });
    // An outage returning HTML is checked with response.ok before JSON.
    globalThis.fetch = async () => ({ ok: false, status: 502, json: htmlBody });
    await assert.rejects(searchFoodDataCentral("banana"), {
      message:
        "Food lookup isn't working right now. Try again or add manually.",
    });
    // A network TypeError becomes a typed offline error.
    globalThis.fetch = async () => {
      throw new TypeError("Failed to fetch");
    };
    await assert.rejects(searchFoodDataCentral("banana"), (error) => {
      assert.ok(error instanceof OfflineError);
      assert.equal(
        error.message,
        "You're offline. Recent and saved foods still work.",
      );
      return true;
    });
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("P0-05: format helpers return human dates, times, durations, and counts", () => {
  assert.equal(formatDate("2026-09-21"), "Mon, Sep 21");
  assert.equal(formatDate("2026-09-21", { year: true }), "Mon, Sep 21, 2026");
  assert.equal(formatDate(""), "Date TBD");
  assert.equal(formatTime("16:00"), "4:00 PM");
  assert.equal(formatTime("09:05"), "9:05 AM");
  assert.equal(formatTime("25:00"), "25:00");
  assert.equal(formatTime(""), "Time TBD");
  assert.equal(formatDuration(90), "1 hr 30 min");
  assert.equal(formatDuration(60), "1 hr");
  assert.equal(formatDuration(1), "1 min");
  assert.equal(formatDuration("15:00", "16:45"), "1 hr 45 min");
  assert.equal(formatDuration("16:00", "15:00"), "Duration not set");
  assert.equal(formatCountdown(110), "in 1 hr 50 min");
  assert.equal(formatCountdown(0), "now");
  assert.equal(formatCountdown(-5), "5 min ago");
  assert.equal(formatCountdown(NaN), "Time TBD");
  assert.equal(plural(1, "banana"), "banana");
  assert.equal(plural(2, "banana"), "bananas");
  assert.equal(plural(2, "activity"), "activities");
  assert.equal(plural(3, "oz"), "oz");
  assert.equal(formatAmount(1, "piece", "Bananas"), "1 banana");
  assert.equal(formatAmount(2, "piece", "Bananas"), "2 bananas");
  assert.equal(
    formatAmount(2, "portion", "pretzels"),
    "2 portions of pretzels",
  );
  assert.equal(formatAmount(12, "oz", "water"), "12 oz water");
  assert.equal(formatPlanStatus("planned"), "Planned");
  assert.equal(formatPlanStatus("packed"), "Packed");
  assert.equal(formatPlanStatus("eaten"), "Eaten");
  assert.equal(formatPlanStatus("logged"), "Eaten");
});

test("P1-02 SCH-09: sport names new activities and migrates as an empty default", () => {
  assert.equal(activityTitle("soccer", "practice"), "Soccer practice");
  assert.equal(activityTitle("Cross country", "game"), "Cross country game");
  assert.equal(activityTitle("", "practice"), "Practice");
  assert.equal(activityTitle("  Soccer  ", "other"), "Soccer activity");
  assert.equal(normalizeSport(42), "");
  assert.equal(normalizeSport("  Track   and field "), "Track and field");
  assert.equal(emptyData().profile.sport, "");
  const legacy = validateData({ profile: { ...DEFAULT_PROFILE } });
  assert.equal(legacy.profile.sport, "");
  const kept = validateData({
    profile: { ...DEFAULT_PROFILE, sport: " Soccer " },
  });
  assert.equal(kept.profile.sport, "Soccer");
  assert.throws(
    () => validateData({ profile: { ...DEFAULT_PROFILE, sport: ["soccer"] } }),
    /sport/,
  );
});

test("P0-11 DATA-06/DATA-09: Welcome and a closed athlete never deliver reminders", () => {
  const storage = new Map();
  const fake = {
    getItem: (k) => storage.get(k) ?? null,
    setItem: (k, v) => storage.set(k, v),
    removeItem: (k) => storage.delete(k),
  };
  const flag = createSignedOutFlag(fake);
  let notified = 0;
  flag.subscribe(() => notified++);
  assert.equal(flag.get(), false);
  flag.set(true);
  assert.equal(flag.get(), true);
  assert.equal(notified, 1);
  assert.equal(
    createSignedOutFlag(fake).get(),
    true,
    "a remounted app stays signed out",
  );
  const open = { enabled: true, permission: "granted" };
  assert.equal(canDeliverReminders({ ...open, signedOut: flag.get() }), false);
  assert.equal(
    canDeliverReminders({ ...open, signedOut: false, view: "welcome" }),
    false,
  );
  assert.equal(
    canDeliverReminders({ ...open, signedOut: false, view: "today" }),
    true,
  );
  flag.set(false);
  assert.equal(storage.has("nourally-signed-out"), false);
  assert.equal(
    REMINDER_HONESTY_LINE,
    "Reminders work while Nourally is open in a desktop browser. On phones, add Nourally to your home screen (coming soon).",
  );
});

test("IA-12 YOU-05: reminder settings summary, permission state, and lead options", () => {
  assert.equal(
    reminderSummary({ enabled: true, leadMinutes: 90 }, "granted"),
    "On · 90 min before",
  );
  assert.equal(
    reminderSummary({ enabled: true, leadMinutes: 60 }, "denied"),
    "Off",
  );
  assert.equal(reminderSummary({ enabled: false }, "granted"), "Off");
  assert.deepEqual(normalizeReminderSettings({ enabled: 1, leadMinutes: 45 }), {
    enabled: true,
    leadMinutes: 60,
    eveningPrep: true,
  });
  assert.equal(
    normalizeReminderSettings({ leadMinutes: "30" }).leadMinutes,
    30,
  );
  assert.equal(notificationPermission(undefined), "unsupported");
  assert.equal(notificationPermission({ permission: "denied" }), "denied");
  assert.match(describePermission("denied"), /blocked/);
  assert.match(describePermission("unsupported"), /cannot/);
  const early = {
    id: "e",
    title: "Soccer practice",
    date: "2026-09-15",
    startTime: "09:59",
    endTime: "11:00",
  };
  const ten = { ...early, id: "t", startTime: "10:00" };
  const evening = new Date(`${day}T19:30:00`);
  const settings = { enabled: true, leadMinutes: 60, eveningPrep: true };
  assert.equal(reminderCandidates([early], settings, evening).length, 1);
  assert.equal(reminderCandidates([ten], settings, evening).length, 0);
  assert.equal(
    reminderCandidates([early], { ...settings, eveningPrep: false }, evening)
      .length,
    0,
  );
});

test("TODAY-02: Day rail rows use readable sub-lines and open plans", () => {
  const plan = {
    id: "plan-1",
    date: day,
    moment: "regular",
    eatAt: "14:30",
    status: "packed",
    template: { name: "Banana + pretzels" },
  };
  assert.equal(
    foodMomentLine(plan),
    "Snack · about 2:30 PM · Banana + pretzels · packed",
  );
  assert.equal(
    foodMomentLine({ ...plan, moment: "recovery", status: "planned" }),
    "Recovery snack · about 2:30 PM · Banana + pretzels · planned",
  );
  const practice = {
    id: "p",
    title: "Soccer practice",
    date: day,
    startTime: "16:00",
    endTime: "17:30",
    location: "away",
    travelMinutes: 45,
  };
  const rows = buildRailRows({
    events: [practice],
    schoolSchedule: school,
    schoolToday: true,
    mealPlans: [plan, { ...plan, id: "other-day", date: "2026-09-15" }],
    todayKey: day,
    now: new Date(`${day}T14:08:00`),
  });
  assert.deepEqual(
    rows.map((r) => r.kind),
    ["school", "now", "window", "food", "travel", "activity", "recovery"],
  );
  assert.equal(rows[0].detail, "8:00 AM–3:00 PM · Lunch 11:30 AM");
  assert.equal(rows[0].past, true);
  // The time column shows 2:08 PM; the marker itself reads "Now".
  assert.equal(rows[1].title, "Now");
  assert.equal(rows[1].time, "14:08");
  const foodRow = rows.find((r) => r.kind === "food");
  assert.equal(foodRow.planId, "plan-1");
  assert.equal(foodRow.route, undefined, "food rows open plan details");
  // The status is its own badge, not the end of the sub-line.
  assert.equal(foodRow.detail, "about 2:30 PM · Banana + pretzels");
  assert.equal(foodRow.status, "Packed");
  assert.equal(
    [foodRow.title, foodRow.detail, foodRow.status.toLowerCase()].join(" · "),
    foodMomentLine(plan),
  );
  assert.equal(rows.find((r) => r.kind === "travel").title, "Leave by 3:15 PM");
  assert.equal(
    rows.find((r) => r.kind === "recovery").detail,
    "5:30 PM–7:00 PM",
  );
  assert.equal(
    rows.find((r) => r.kind === "activity").detail,
    "4:00 PM–5:30 PM · Away",
  );
  for (const r of rows)
    assert.doesNotMatch(
      `${r.title} ${r.detail || ""}`,
      / \d+ MIN|\d{4}-\d{2}-\d{2}/,
    );
  assert.equal(
    availabilityLabel({ name: "Bananas", sufficient: true }),
    "Bananas at home",
  );
  assert.equal(
    availabilityLabel({ name: "Pretzels", sufficient: false }),
    "Pretzels to buy",
  );
});

test("TODAY-02: rail names moments and merges a recovery plan into its Recovery row", () => {
  const practice = {
    id: "p",
    type: "practice",
    title: "Soccer practice",
    date: day,
    startTime: "16:00",
    endTime: "17:30",
  };
  const plan = (id, patch) => ({
    id,
    date: day,
    moment: "regular",
    status: "planned",
    template: { name: id },
    ...patch,
  });
  const context = { events: [practice], schoolSchedule: school };
  assert.equal(
    foodMomentLine(
      plan("a", { eventId: "p", moment: "pre", eatAt: "14:30" }),
      context,
    ),
    "Pre-practice snack · about 2:30 PM · a · planned",
  );
  assert.equal(
    foodMomentLine(plan("b", { eatAt: "11:30", status: "eaten" }), context),
    "Lunch · about 11:30 AM · b · eaten",
  );
  const rows = buildRailRows({
    events: [practice],
    schoolSchedule: school,
    schoolToday: true,
    mealPlans: [
      plan("Milk + banana", {
        eventId: "p",
        moment: "recovery",
        eatAt: "17:45",
      }),
    ],
    todayKey: day,
    now: new Date(`${day}T10:00:00`),
  });
  assert.equal(rows.filter((r) => /Recovery/.test(r.title)).length, 1);
  const recovery = rows.find((r) => r.kind === "recovery");
  assert.equal(recovery.detail, "5:30 PM–7:00 PM · Milk + banana");
  assert.equal(recovery.status, "Planned");
  assert.ok(recovery.planId, "the merged Recovery row opens the plan");
  assert.equal(rows.find((r) => r.kind === "activity").type, "practice");
});

test("6.3 day chips and Now labels: short times, no period, weekday labels", () => {
  assert.equal(formatShortTime("16:00"), "4:00");
  assert.equal(formatShortTime("08:00", { hourOnly: true }), "8");
  assert.equal(formatShortTime("11:30", { hourOnly: true }), "11:30");
  const practice = {
    id: "p",
    type: "practice",
    title: "Soccer practice",
    date: day,
    startTime: "16:00",
    endTime: "17:30",
  };
  const after = guidance("17:45", [practice]);
  assert.equal(after.label, "After soccer practice");
  assert.doesNotMatch(after.title, /\.$/);
  const late = guidance("22:00", [], {
    todayKey: "2026-09-19",
    now: new Date("2026-09-19T22:00:00"),
  });
  assert.equal(late.state, "late");
  assert.equal(late.label, "Sat night");
  assert.equal(late.title, "Nothing to plan tonight");
  const setup = guidance("10:00", [], { schoolSchedule: null });
  assert.equal(setup.title, "Let's time your food to your day");
  const noSport = guidance("10:00", [{ ...practice, date: "2026-09-15" }]);
  assert.equal(noSport.state, "no_sport");
  assert.equal(noSport.label, "Monday");
});

test("6.9: school weekdays and the week switcher read short", () => {
  assert.equal(formatWeekdays([1, 2, 3, 4, 5]), "Mon–Fri");
  assert.equal(formatWeekdays([5, 1, 3]), "Mon, Wed, Fri");
  assert.equal(formatWeekdays([2, 3]), "Tue, Wed");
  assert.equal(formatWeekdays([]), "");
  assert.equal(formatDateRange("2026-09-28", "2026-10-04"), "Sep 28 – Oct 4");
  assert.equal(plural(1, "game"), "game");
  assert.equal(plural(2, "away trip"), "away trips");
});

test("6.3/6.9: school off reasons for Today's chip and the week view", () => {
  const paused = {
    ...school,
    pausedFrom: "2026-09-21",
    pausedUntil: "2026-09-25",
  };
  const off = {
    ...school,
    excludedDates: [day],
    excludedRanges: [{ startDate: "2026-09-16", endDate: "2026-09-17" }],
  };
  assert.equal(schoolOffReason(day, school), null);
  assert.equal(schoolOffReason(day, off), "off");
  assert.equal(schoolOffReason("2026-09-17", off), "off");
  assert.equal(schoolOffReason("2026-09-22", paused), "paused");
  assert.equal(
    schoolOffReason("2026-09-13", off),
    null,
    "Sunday is never a school day",
  );
  assert.equal(schoolOffReason(day, null), null);
});

test("TODAY-01/04: countdown labels are sentence case, never legacy codes", () => {
  const later = {
    id: "x",
    title: "Game",
    date: "2026-09-16",
    startTime: "16:00",
    endTime: "17:00",
  };
  const labels = [
    guidance("10:00").label,
    guidance("10:00", [], { schoolSchedule: null }).label,
    guidance("10:00", [later], { schoolSchedule: null }).label,
    guidance("13:00", [{ ...later, id: "y", date: day }]).label,
  ];
  for (const label of labels) {
    assert.doesNotMatch(
      label,
      /SCHEDULE NOT SET|STEADY-DAY FUELING|NO SPORT TODAY|NEXT RECOMMENDED ACTION| \d+ MIN/,
    );
    assert.notEqual(label, label.toUpperCase());
  }
});

test("HOME-05: Quick add matches an existing row without a product id", () => {
  // A Bananas row bought through Groceries or seeded has no food.id.
  const bought = { id: "r1", name: "Bananas", availability: "have" };
  const quick = {
    name: "Bananas",
    food: { id: "bananas", name: "Bananas", source: "Quick basic" },
    catalogId: "bananas",
    ingredientId: "bananas",
  };
  assert.equal(sameProduct(bought, quick), true);
  assert.equal(sameProduct(quick, bought), true);
  // Different ingredients, or a branded product, still stay apart.
  assert.equal(sameProduct({ name: "Pretzels" }, quick), false);
  const branded = { name: "Bananas", food: { id: "off-123", name: "Bananas" } };
  assert.equal(sameProduct(bought, branded), false);
  // Two product ids compare by id.
  assert.equal(
    sameProduct(
      { name: "A", food: { id: "fdc-1" } },
      { name: "B", food: { id: "fdc-1" } },
    ),
    true,
  );
});

test("HOME-04/07: Out toggles back to the previous state, legacy rows are Have, catalog foods resolve", () => {
  const low = { id: "l", name: "Pretzels", availability: "low", quantity: 1 };
  assert.equal(
    toggleStockOut(toggleStockOut(low, day), day).availability,
    "low",
  );
  const bare = { id: "o", name: "Oats", availability: "out" };
  assert.equal(toggleStockOut(bare, day).availability, "have");
  const values = {
    "nourally-groceries": JSON.stringify({
      pantry: [{ id: "p", name: "Rice" }],
      items: [{ id: "i", name: "Oats", status: "cart" }],
    }),
  };
  const storage = {
    length: 1,
    key: () => "nourally-groceries",
    getItem: (key) => values[key],
  };
  const doc = migrateLegacy(storage);
  const grocery = doc.profiles[doc.defaultProfileId].data.groceryState;
  assert.equal(grocery.pantry[0].availability, "have");
  assert.equal(grocery.items[0].checked, true);
  assert.equal(ingredientId({ name: "Bananas, raw" }), "bananas");
  assert.equal(ingredientId({ name: "x", catalogId: "hummus" }), "hummus");
  assert.equal(ingredientId({ name: "Mystery bar" }), null);
});

test("IDEA-02: idea tags come from the idea's flags; chips name what to buy", () => {
  const label = (idea) => ideaTags(idea).map((tag) => tag.label);
  assert.deepEqual(label({ portable: true }), [
    "Packs well",
    "No fridge needed",
  ]);
  assert.deepEqual(label({ portable: false, needsHeat: true }), [
    "No fridge needed",
    "Needs a microwave",
  ]);
  assert.deepEqual(label({ needsCold: true }), ["Keep cold"]);
  for (const idea of FOOD_IDEAS)
    assert.ok(ideaTags(idea).length > 0, `${idea.name} has no tags`);
  assert.deepEqual(
    availabilityChips([
      { ingredientId: "bananas", displayAmount: "1 banana", sufficient: true },
      {
        ingredientId: "pretzels",
        displayAmount: "1 small bag of pretzels",
        sufficient: false,
      },
    ]),
    [
      { id: "bananas", have: true, label: "1 banana" },
      { id: "pretzels", have: false, label: "Buy: 1 small bag of pretzels" },
    ],
  );
});

test("HOME-04: + on an Out row with an exact count restocks from 0, not the hidden count", () => {
  const three = { id: "a", name: "Apples", availability: "exact", quantity: 3 };
  const out = toggleStockOut(three, day);
  assert.equal(out.quantity, 3, "Out keeps the count for Back in stock");
  const plus = stepStockCount(out, 1, day);
  assert.equal(plus.quantity, 1);
  assert.equal(plus.availability, "exact");
  assert.equal(plus.previousAvailability, undefined);
  assert.equal(stockStatus(plus), "low");
  // Back in stock still restores the exact count of 3.
  assert.equal(toggleStockOut(out, day).quantity, 3);
  assert.equal(toggleStockOut(out, day).availability, "exact");
  // Counting down to 0 marks it Out; + then gives 1 left.
  const zero = stepStockCount({ ...three, quantity: 1 }, -1, day);
  assert.equal(zero.availability, "out");
  assert.equal(stepStockCount(zero, 1, day).quantity, 1);
  // Pending steps count from the number shown on screen, even on an Out row.
  assert.equal(stepStockCount(three, 1, day, 5).quantity, 6);
  assert.equal(stepStockCount(out, 1, day, 1).quantity, 2);
});

test("P0-06: grocery suggestions ignore unreviewed gluten and nut flags", () => {
  const ids = (result) => result.items.map((i) => i.name);
  const base = { events: [], pantry: [], items: [], date: day, limit: 20 };
  const plain = ids(
    weeklyGroceryIdeas({ ...base, profile: { dietaryNeeds: [] } }),
  );
  for (const need of ["glutenFree", "nutFree", "dairyFree"])
    assert.deepEqual(
      ids(weeklyGroceryIdeas({ ...base, profile: { dietaryNeeds: [need] } })),
      plain,
      `${need} changed grocery suggestions`,
    );
});

test("YOU-01 to YOU-04: You settings migrate additively and validate", () => {
  const fresh = emptyData().profile;
  // ONB-03: setup no longer asks about budget, so new athletes start off.
  assert.equal(fresh.lowCostIdeas, false);
  assert.equal(fresh.season, "");
  assert.deepEqual(fresh.dislikes, []);
  assert.equal(fresh.lastBackupAt, null);
  // Budget tiers map to one boolean; "Flexible" is dropped (J10).
  for (const [budget, on] of [
    ["save", true],
    ["standard", false],
    ["flexible", false],
  ]) {
    const profile = validateData({
      profile: { ...DEFAULT_PROFILE, budget },
    }).profile;
    assert.equal(profile.lowCostIdeas, on);
    assert.equal(profile.budget, on ? "save" : "standard");
  }
  // lowCostIdeas wins over a stale budget (Ideas "Show all" writes it).
  const shown = validateData({
    profile: { ...DEFAULT_PROFILE, budget: "save", lowCostIdeas: false },
  }).profile;
  assert.equal(shown.budget, "standard");
  const kept = validateData({
    profile: {
      ...DEFAULT_PROFILE,
      season: "in",
      dislikes: ["bananas", "bananas", "eggs", 4],
      lastBackupAt: "2026-09-12T10:00:00.000Z",
    },
  }).profile;
  assert.equal(kept.season, "in");
  assert.deepEqual(kept.dislikes, ["bananas"]);
  assert.equal(kept.lastBackupAt, "2026-09-12T10:00:00.000Z");
  assert.equal(
    validateData({ profile: { ...DEFAULT_PROFILE, season: "winter" } }).profile
      .season,
    "",
  );
  for (const bad of [
    { season: 3 },
    { dislikes: "bananas" },
    { lowCostIdeas: "yes" },
    { lastBackupAt: "not a date" },
  ])
    assert.throws(() =>
      validateData({ profile: { ...DEFAULT_PROFILE, ...bad } }),
    );
});

test("YOU-01: row summaries match the settings list copy", () => {
  assert.equal(
    sportSummary({ sport: "Soccer", season: "in" }),
    "Soccer · In season",
  );
  assert.equal(sportSummary({}), "Not set");
  assert.equal(
    needsSummary({ dietaryNeeds: ["vegetarian", "nutFree"], dislikes: [] }),
    "Vegetarian",
  );
  assert.equal(
    needsSummary({ dietaryNeeds: [], dislikes: ["bananas"] }),
    "Not a fan of bananas",
  );
  assert.equal(
    needsSummary({ dietaryNeeds: ["vegan"], dislikes: ["rice", "pasta"] }),
    "Vegan · Not a fan of 2 foods",
  );
  assert.equal(needsSummary({}), "None set");
  assert.equal(
    accessSummary(
      { foodSources: ["cafeteria"], lowCostIdeas: false },
      { foodAccess: { refrigerator: true } },
    ),
    "Cafeteria, fridge · Low-cost ideas off",
  );
  assert.equal(
    accessSummary({ foodSources: [], budget: "save" }),
    "No food access set · Low-cost ideas on",
  );
});

test("YOU-02/03: no allergen chips; Not a fan of hides ideas by ingredient", () => {
  const ids = [...DIET_CHOICES, ...DISLIKE_CHOICES].map(([id]) => id);
  for (const hidden of ["nutFree", "glutenFree", "dairyFree"])
    assert.ok(!ids.includes(hidden));
  // No disliked food carries a major allergen, so it can't pose as an allergy filter.
  for (const allergen of [
    "eggs",
    "yogurt",
    "cheese-sticks",
    "chocolate-milk",
    "tuna-pouches",
    "tofu",
    "edamame",
    "soy-milk",
    "soy-yogurt",
    "hummus",
    "bread",
  ])
    assert.ok(!ids.includes(allergen), allergen);
  const base = {
    ...DEFAULT_PROFILE,
    lowCostIdeas: false,
    foodSources: ["packed", "cafeteria", "home", "store"],
  };
  const all = ideasFor({ moment: "pre", profile: base });
  assert.ok(all.some((idea) => idea.id === "banana-pretzels"));
  const noBananas = ideasFor({
    moment: "pre",
    profile: { ...base, dislikes: ["bananas"] },
  });
  assert.ok(noBananas.length > 0);
  for (const idea of noBananas)
    assert.ok(
      !(MEAL_INGREDIENTS[idea.id] || []).some(([, id]) => id === "bananas"),
      idea.id,
    );
  assert.equal(
    ideaFitsProfile(
      FOOD_IDEAS.find((i) => i.id === "banana-pretzels"),
      { ...base, dislikes: ["bananas"] },
    ),
    false,
  );
});

test("YOU-04: grocery budget is optional and never negative", () => {
  assert.deepEqual(parseBudget(""), { amount: null });
  assert.deepEqual(parseBudget("  "), { amount: null });
  assert.deepEqual(parseBudget("$40"), { amount: 40 });
  assert.deepEqual(parseBudget("1,250.555"), { amount: 1250.56 });
  assert.ok(parseBudget("-5").error);
  assert.ok(parseBudget("lots").error);
});

test("DATA-04/07 ADD-12: restore preview, backup errors, names, last backup", () => {
  const data = emptyData();
  data.dailyLogs["2026-09-20"] = { entries: [], water: 0 };
  data.schedule = [{ id: "e", title: "Practice", date: "2026-09-27" }];
  const doc = {
    version: 3,
    revision: 1,
    defaultProfileId: "a",
    profiles: { a: { id: "a", name: "Maya", data } },
  };
  const read = (value) =>
    readBackupText(JSON.stringify(value), {
      validate: validateDocument,
      schemaVersion: 3,
    });
  const preview = backupPreview(read(doc));
  assert.deepEqual(preview, {
    count: 1,
    names: ["Maya"],
    through: "2026-09-27",
  });
  assert.equal(
    backupPreviewText(preview),
    "This file has 1 athlete: Maya. Plans and logs through Sep 27. Nothing on this device will be removed.",
  );
  assert.match(
    backupPreviewText({ count: 2, names: ["Maya", "Sam"], through: "" }),
    /^This file has 2 athletes: Maya, Sam\. It has no plans/,
  );
  assert.throws(() => read({ ...doc, version: 9 }), {
    message: BACKUP_ERRORS.newer,
  });
  assert.throws(
    () =>
      readBackupText("not json", {
        validate: validateDocument,
        schemaVersion: 3,
      }),
    { message: BACKUP_ERRORS.notBackup },
  );
  assert.throws(() => read({ hello: "world" }), {
    message: BACKUP_ERRORS.notBackup,
  });
  assert.equal(
    athleteLabel({ name: "Maya", fromBackup: true, data }),
    "Maya (from backup)",
  );
  assert.equal(
    athleteLabel({ name: "Sam (imported)", data: emptyData() }),
    "Sam (from backup)",
  );
  assert.equal(athleteLabel({ name: "Sam", data: emptyData() }), "Sam");
  const now = new Date(2026, 8, 28, 9);
  assert.equal(lastBackupText(null, now), "No backup saved yet.");
  assert.equal(
    lastBackupText(new Date(2026, 8, 12, 20).toISOString(), now),
    "Last backup: Sep 12 (16 days ago)",
  );
  assert.equal(
    lastBackupText(new Date(2026, 8, 28, 7).toISOString(), now),
    "Last backup: Sep 28 (today)",
  );
});

test("At home: an exact count in another unit still covers an idea", () => {
  const idea = FOOD_IDEAS.find((i) => i.id === "banana-pretzels");
  const pantry = [
    {
      id: "b",
      name: "Bananas",
      ingredientId: "bananas",
      availability: "exact",
      quantity: 3,
      unit: "bunch",
    },
  ];
  const banana = ingredientsForMeal(idea, pantry, day).find(
    (i) => i.ingredientId === "bananas",
  );
  assert.equal(banana.sufficient, true);
  assert.equal(banana.approximate, true);
  const none = ingredientsForMeal(idea, [{ ...pantry[0], quantity: 0 }], day);
  assert.equal(
    none.find((i) => i.ingredientId === "bananas").sufficient,
    false,
  );
});

test("Idea prep: amounts match the idea name and use defined units", () => {
  const shown = (ideaId, ingredient) =>
    MEAL_INGREDIENTS[ideaId].find((row) => row[1] === ingredient)[4];
  assert.equal(shown("fig-bar-fruit", "bananas"), "1 banana or other fruit");
  assert.equal(shown("banana-pretzels", "bananas"), "1 banana");
  assert.equal(shown("bagel-jam", "bread"), "1 bagel or 2 slices of toast");
  assert.equal(
    shown("bean-burrito", "tortillas"),
    "1 large tortilla (or 2 small)",
  );
  assert.ok(
    MEAL_INGREDIENTS["smoothie-toast"].some((row) => row[1] === "soy-milk"),
  );
  for (const rows of Object.values(MEAL_INGREDIENTS))
    for (const row of rows)
      assert.doesNotMatch(row[4], /\b(scoop|bowl|a few)\b/i, row[4]);
});

test("P0-05: travel prep pluralizes minutes", () => {
  const event = { location: "away", travelMinutes: 1, startTime: "16:00" };
  const labels = tomorrowPrepTasks(event).map((task) => task.label);
  assert.ok(labels.includes("Check the route and allow 1 minute for travel"));
  assert.ok(!labels.some((label) => /\b1 minutes\b/.test(label)));
  assert.ok(
    tomorrowPrepTasks({ ...event, travelMinutes: 45 }).some(
      (task) =>
        task.label === "Check the route and allow 45 minutes for travel",
    ),
  );
});

test("STATE-01: Schedule toasts name the activity and the verb", () => {
  assert.equal(activityToast("practice", "added"), "Practice added.");
  assert.equal(activityToast("game", "deleted"), "Game deleted.");
  assert.equal(activityToast("workout", "updated"), "Workout updated.");
  assert.equal(activityToast("other", "added"), "Activity added.");
  assert.equal(activityToast(undefined, "deleted"), "Activity deleted.");
});

test("A11Y-09: an empty activity date or time is the app's own field error", () => {
  const filled = {
    date: "2026-10-09",
    startTime: "16:00",
    endTime: "17:30",
    repeatMode: "once",
    repeatEndDate: "2026-12-31",
  };
  assert.equal(missingActivityField(filled), null);
  assert.deepEqual(missingActivityField({ ...filled, date: "" }), {
    message: "Choose a date.",
    field: "date",
  });
  assert.equal(
    missingActivityField({ ...filled, date: "", oneDate: true }),
    null,
  );
  assert.equal(
    missingActivityField({ ...filled, repeatMode: "weekly", repeatEndDate: "" })
      .field,
    "repeatEnd",
  );
  assert.equal(
    missingActivityField({ ...filled, startTime: "" }).field,
    "startTime",
  );
  assert.equal(
    missingActivityField({ ...filled, endTime: "" }).field,
    "endTime",
  );
});

// ADD-14 / P2-04: water units.
test("P2-04: water converts between oz and ml and rounds for display", () => {
  assert.equal(waterUnit({}), "oz");
  assert.equal(waterUnit({ units: "ml" }), "ml");
  assert.equal(waterUnit({ units: "cups" }), "oz");
  assert.deepEqual(WATER_STEPS, { oz: [8, 16, 24], ml: [250, 500, 750] });
  assert.equal(toOunces(8, "oz"), 8);
  assert.ok(Math.abs(toOunces(250, "ml") - 250 / ML_PER_OZ) < 1e-9);
  // Stored oz totals read as whole ml, and oz to one decimal.
  assert.equal(formatWater(24, "oz"), "24 oz");
  assert.equal(formatWater(24, "ml"), "710 ml");
  assert.equal(formatWater(8, "ml"), "237 ml");
  assert.equal(formatWater(toOunces(500, "ml"), "oz"), "16.9 oz");
  assert.equal(formatWater(0, "ml"), "0 ml");
  // ml entries round-trip exactly, even after many adds.
  let total = 0;
  for (let i = 0; i < 20; i++) total += toOunces(250, "ml");
  assert.equal(waterAmount(total, "ml"), 5000);
  // The per-entry limit is the same amount in both units (128 oz).
  assert.ok(toOunces(WATER_MAX.ml, "ml") <= 128);
  assert.ok(toOunces(WATER_MAX.ml + 1, "ml") > 128);
});

test("P2-04: ml water is stored as ounces, so oz logs stay valid", () => {
  let log = { entries: [], water: 16 };
  log = addWater(log, 250, "ml");
  log = addWater(log, 500, "ml");
  assert.equal(formatWater(log.water, "ml"), "1223 ml");
  assert.ok(Math.abs(log.waterEntries[0].amount - 250 / ML_PER_OZ) < 1e-9);
  assert.equal(undoHydration(log).waterEntries.at(-1).undone, true);
  assert.equal(formatWater(undoHydration(log).water, "ml"), "723 ml");
  assert.throws(() => addWater(log, 4000, "ml"));
  assert.equal(waterToast(250, "ml"), "Added 250 ml of water.");
  assert.equal(waterToast(8, "oz"), "Added 8 oz of water.");
  // A day's water still validates and the profile unit defaults to oz.
  const data = emptyData();
  data.dailyLogs["2026-10-12"] = log;
  assert.equal(validateData(data).profile.units, "oz");
  assert.equal(
    validateData({ ...data, profile: { units: "ml" } }).profile.units,
    "ml",
  );
  assert.throws(
    () => validateData({ ...data, profile: { units: "cups" } }),
    /Invalid water units/,
  );
  assert.equal(
    accessSummary({ foodSources: ["packed"], lowCostIdeas: true, units: "ml" }),
    "Packed · Low-cost ideas on · Water in ml",
  );
});

// WEEK-05 / P2-05: the Monday "last week" card.
const lastWeekData = (extra = {}) => ({
  schedule: [
    {
      id: "practice",
      title: "Practice",
      type: "practice",
      startTime: "15:30",
      recurrence: {
        startDate: "2026-09-01",
        endDate: "2027-06-01",
        weekdays: [2, 4], // Tue, Thu
        excludedDates: [],
      },
    },
  ],
  mealPlans: [],
  dailyLogs: {},
  profile: {},
  ...extra,
});

test("P2-05: Monday detection holds across months, years and DST", () => {
  const tz = process.env.TZ;
  try {
    for (const zone of ["America/New_York", "Australia/Sydney", "UTC"]) {
      process.env.TZ = zone;
      assert.equal(isMonday("2026-10-12"), true, zone);
      assert.equal(isMonday("2026-10-11"), false, zone);
      assert.equal(isMonday("2026-11-02"), true, zone); // US DST ended Sun Nov 1
      assert.equal(isMonday("2026-03-09"), true, zone); // US DST began Sun Mar 8
      assert.equal(isMonday("2026-10-05"), true, zone); // Sydney DST began Sun Oct 4
      assert.equal(isMonday("2027-01-04"), true, zone);
      assert.equal(isMonday("2026-11-03"), false, zone);
      // Last week is the 7 days before Monday, even over a DST change.
      const card = lastWeekCard({
        todayKey: "2026-11-02",
        data: lastWeekData(),
      });
      assert.equal(card.startKey, "2026-10-26", zone);
      assert.equal(card.endKey, "2026-11-01", zone);
      assert.equal(card.route, "food/log/week/2026-11-01", zone);
      const sydney = lastWeekCard({
        todayKey: "2026-10-05",
        data: lastWeekData(),
      });
      assert.equal(sydney.startKey, "2026-09-28", zone);
      assert.equal(sydney.endKey, "2026-10-04", zone);
      const newYear = lastWeekCard({
        todayKey: "2027-01-04",
        data: lastWeekData(),
      });
      assert.equal(newYear.startKey, "2026-12-28", zone);
      assert.equal(newYear.endKey, "2027-01-03", zone);
    }
  } finally {
    if (tz === undefined) delete process.env.TZ;
    else process.env.TZ = tz;
  }
  assert.equal(isMonday("not a date"), false);
});

test("P2-05: the card shows on Mondays only, counts only, until hidden", () => {
  const data = lastWeekData({
    mealPlans: [
      { id: "p1", eventId: "practice", date: "2026-10-06", status: "eaten" },
    ],
    dailyLogs: { "2026-10-08": { entries: [{ id: "e1", name: "Banana" }] } },
  });
  const card = lastWeekCard({ todayKey: "2026-10-12", data });
  assert.equal(
    card.message,
    "Last week: 2 practices. You planned food for 1 of them.",
  );
  assert.equal(card.weekKey, "2026-10-12");
  assert.doesNotMatch(card.message, /%|streak|score|goal|target/i);
  // Not on other days of the week.
  for (const day of ["2026-10-11", "2026-10-13", "2026-10-17"])
    assert.equal(lastWeekCard({ todayKey: day, data }), null, day);
  // Hidden for this Monday only; the next Monday shows again.
  const hidden = { ...data, profile: { lastWeekHidden: "2026-10-12" } };
  assert.equal(lastWeekCard({ todayKey: "2026-10-12", data: hidden }), null);
  assert.ok(lastWeekCard({ todayKey: "2026-10-19", data: hidden }));
  // The hidden Monday survives validation (save and reload).
  assert.equal(
    validateData({ ...emptyData(), profile: { lastWeekHidden: "2026-10-12" } })
      .profile.lastWeekHidden,
    "2026-10-12",
  );
  // Nothing to describe: no card.
  assert.equal(
    lastWeekCard({ todayKey: "2026-10-12", data: { profile: {} } }),
    null,
  );
});

test("P2-05: last week sentences without activities stay neutral", () => {
  const summary = (extra) => ({
    activities: 0,
    withPlan: 0,
    byType: {},
    foods: 0,
    waterDays: 0,
    ...extra,
  });
  assert.equal(
    lastWeekSentence(summary({ foods: 3 })),
    "Last week: no practices or games. You logged 3 foods.",
  );
  assert.equal(
    lastWeekSentence(summary({ waterDays: 1 })),
    "Last week: no practices or games. You logged water on 1 day.",
  );
  const full = weekSummary({
    endKey: "2026-10-11",
    events: lastWeekData().schedule,
    mealPlans: [
      { id: "a", eventId: "practice", date: "2026-10-06", status: "planned" },
      { id: "b", eventId: "practice", date: "2026-10-08", status: "eaten" },
    ],
  });
  assert.equal(
    lastWeekSentence(full),
    "Last week: 2 practices. You planned food for both.",
  );
});

test("P2-06: every Now card state has a rule with https sources and a checked date", () => {
  const practice = (over = {}) => ({
    id: "p",
    type: "practice",
    title: "Practice",
    date: day,
    startTime: "16:00",
    endTime: "17:30",
    ...over,
  });
  const tomorrow = {
    id: "t",
    title: "Practice",
    date: "2026-09-15",
    startTime: "16:00",
    endTime: "17:30",
  };
  const noSchool = { ...school, enabled: false };
  const saturday = "2026-09-19";
  const on = (dateKey, time, events, override = {}) =>
    getFuelingGuidance({
      now: new Date(`${dateKey}T${time}:00`),
      todayKey: dateKey,
      events,
      schoolSchedule: school,
      profile,
      ...override,
    });
  const seen = new Map([
    ["setup", guidance("10:00", [], { schoolSchedule: noSchool })],
    ["late", on(saturday, "22:00", [])],
    ["before_school", guidance("07:00", [practice()])],
    ["plan_ahead", guidance("09:00", [practice()])],
    ["meal_window", guidance("13:30", [practice()])],
    ["pre", guidance("15:00", [practice()])],
    ["quick", guidance("15:45", [practice()])],
    ["during", guidance("16:30", [practice()])],
    ["recovery", guidance("18:00", [practice()])],
    ["no_sport", guidance("12:00", [tomorrow])],
    [
      "travel",
      guidance("15:00", [
        practice({ location: "away", travelMinutes: 45, startTime: "16:30" }),
      ]),
    ],
    [
      "rest",
      guidance("12:00", [], { profile: { ...profile, restDays: [day] } }),
    ],
    ["evening", guidance("19:30", [tomorrow])],
  ]);
  for (const [expected, g] of seen) {
    assert.equal(g.state, expected);
    const list = rulesFor(g);
    assert.equal(list[0].key, g.state);
  }
  // Every state the engine can return, plus the school-window and game-day
  // add-ons, has a rule.
  const school11 = guidance("11:45", [practice()]);
  assert.ok(rulesFor(school11).some((r) => r.key === "school_window"));
  const game = guidance("13:30", [practice({ type: "game" })]);
  assert.ok(rulesFor(game).some((r) => r.key === "game"));
  for (const key of [...seen.keys(), "school_window", "game"]) {
    const rule = RULES[key];
    assert.ok(rule, `${key} has a rule`);
    assert.ok(rule.rule.length > 0 && rule.rule.length <= 220, key);
    assert.ok(
      rule.rule.split(/[.!?](\s|$)/).filter((s) => s.trim()).length <= 2,
      key,
    );
    assert.doesNotMatch(
      rule.rule,
      /\bmust\b|\bsafe\b|calorie|\d+\s*(g|kcal|mL|oz)\b/i,
    );
    assert.ok(rule.sources.length >= 1, `${key} has a source`);
    for (const source of rule.sources) {
      assert.match(source.url, /^https:\/\/\S+$/);
      assert.ok(source.title && source.publisher, key);
      assert.doesNotMatch(`${source.title} ${source.publisher}`, /Foundation/);
    }
    assert.match(rule.checked, /^\d{4}-\d{2}-\d{2}$/);
    const checked = new Date(`${rule.checked}T12:00:00`);
    assert.ok(!Number.isNaN(checked.getTime()));
    assert.equal(rule.checked, "2026-10-11");
    assert.equal(
      formatDate(rule.checked, { year: true, weekday: false }),
      "Oct 11, 2026",
    );
  }
  assert.deepEqual(
    Object.keys(RULES).sort(),
    [...seen.keys(), "school_window", "game"].sort(),
  );
});

test("P2-08: Today names why no idea fits, in the words Ideas uses", () => {
  const school = { foodAccess: { cafeteria: false } };
  assert.equal(
    noIdeaReason({
      guidance: { inSchool: true },
      profile: { foodSources: ["home"] },
      schoolSchedule: school,
    }),
    "Nothing is available at school right now. Pack a snack next time.",
  );
  assert.equal(
    noIdeaReason({
      guidance: { departed: true },
      profile: { foodSources: ["home"] },
    }),
    "Nothing is available on the way right now. Pack a snack next time.",
  );
  assert.equal(
    noIdeaReason({
      guidance: { inSchool: true },
      profile: { foodSources: ["home", "packed"] },
      schoolSchedule: school,
    }),
    "No ideas fit these settings. Check your food needs and access.",
  );
});

test("J7: a prep due time already past when the plan is made is not a missed task", () => {
  // 2026-09-14 is a Monday; school 8:00 AM, so food tasks are due 7:30 AM.
  const school = {
    enabled: true,
    startDate: "2026-08-01",
    endDate: "2027-06-01",
    weekdays: [1, 2, 3, 4, 5],
    startTime: "08:00",
    endTime: "15:00",
  };
  const guidance = (now, event = { id: "p", startTime: "17:00" }) => ({
    moment: "pre",
    schoolSchedule: school,
    event,
    now,
  });
  const due = (data) => data.dayPlans[day].map((t) => t.dueAt);
  // Planned before school: due 7:30 AM.
  let data = emptyData();
  planMeal(
    data,
    idea("banana-pretzels"),
    day,
    guidance(new Date(`${day}T06:45:00`)),
  );
  assert.ok(due(data).every((d) => d === "07:30"));
  // Planned at 1 PM, after school started: no "Was due 7:30 AM".
  data = emptyData();
  planMeal(
    data,
    idea("banana-pretzels"),
    day,
    guidance(new Date(`${day}T13:00:00`)),
  );
  assert.ok(due(data).every((d) => d === null));
  // Away session at 5:00 PM with 45 min travel: Leave by 4:15, due 3:45 PM.
  const away = {
    id: "a",
    startTime: "17:00",
    location: "away",
    travelMinutes: 45,
  };
  data = emptyData();
  planMeal(
    data,
    idea("banana-pretzels"),
    day,
    guidance(new Date(`${day}T13:00:00`), away),
  );
  assert.ok(due(data).every((d) => d === "15:45"));
  // Past that too: no due time.
  data = emptyData();
  planMeal(
    data,
    idea("banana-pretzels"),
    day,
    guidance(new Date(`${day}T16:00:00`), away),
  );
  assert.ok(due(data).every((d) => d === null));
  // Planning a later day keeps its due time, whatever the clock says now.
  data = emptyData();
  planMeal(
    data,
    idea("banana-pretzels"),
    day,
    guidance(new Date("2026-09-13T21:00:00")),
  );
  assert.ok(due(data).every((d) => d === "07:30"));
});

test("STATE: changed food needs prompt planned and packed plans, never eaten ones", () => {
  const data = emptyData();
  const plan = planMeal(data, idea("banana-pretzels"), day, {});
  assert.equal(planNeedsReview(plan, data.profile), false);
  data.profile = { ...data.profile, foodSources: ["home"] };
  assert.equal(planNeedsReview(plan, data.profile), true);
  markPlanPacked(data, plan.id);
  assert.equal(planNeedsReview(plan, data.profile), true);
  logPlanAsEaten(data, plan.id);
  assert.equal(plan.status, "eaten");
  assert.equal(planNeedsReview(plan, data.profile), false);
});

// U1-01 (UX-BUG-01): You › Sport & season uses setup's rule; an empty sport
// is an error and the stored profile is not changed.
test("Profile save rejects an empty sport and keeps the stored one", () => {
  const profile = { sport: "Soccer", season: "in" };
  assert.deepEqual(saveSportSeason(profile, { sport: "  ", season: "off" }), {
    message: "Enter your sport.",
    field: "sport",
  });
  assert.deepEqual(profile, { sport: "Soccer", season: "in" });
  assert.equal(
    saveSportSeason(profile, { sport: " Swimming ", season: "" }),
    null,
  );
  assert.equal(profile.sport, "Swimming");
  assert.equal(profile.season, "");
});

// U1-01 (UX-BUG-02): a field error clears on the first change that makes the
// field valid; a form error clears on any change; blur re-checks.
test("Field errors follow the values: clear when fixed, stay while invalid", () => {
  const sportError = { message: "Enter your sport.", field: "sport" };
  assert.equal(errorAfterChange(sportError, null), null);
  assert.equal(errorAfterChange(sportError, sportError), sportError);
  assert.equal(
    errorAfterChange(sportError, { message: "Other.", field: "season" }),
    null,
  );
  assert.deepEqual(
    errorAfterChange(sportError, { message: "Too long.", field: "sport" }),
    { message: "Too long.", field: "sport", quiet: true },
  );
  assert.equal(errorAfterChange("Couldn't save.", sportError), null);
  assert.equal(errorAfterChange(null, sportError), null);
  assert.equal(errorAfterBlur(sportError, null), null);
  assert.equal(errorAfterBlur("Couldn't save.", null), "Couldn't save.");
  assert.deepEqual(errorAfterBlur(null, sportError), {
    ...sportError,
    quiet: true,
  });
  const activity = {
    date: "2026-10-13",
    startTime: "16:00",
    endTime: "15:00",
    repeatMode: "once",
    repeatEndDate: "2026-12-01",
    location: "home",
    travelMinutes: "0",
  };
  const ended = activityFormProblem(activity);
  assert.equal(ended.field, "endTime");
  assert.match(ended.message, /^End time must be later than start time/);
  assert.equal(
    errorAfterChange(
      ended,
      activityFormProblem({ ...activity, endTime: "17:30" }),
    ),
    null,
  );
  assert.equal(
    activityFormProblem({
      ...activity,
      endTime: "17:30",
      location: "away",
      travelMinutes: "999",
    }).field,
    "travel",
  );
});

// U1-01 (UX-BUG-03): the lunch message names the school hours, in setup step 2
// and the School day sheet alike.
test("Lunch outside school says when school is", () => {
  const day = {
    weekdays: [1, 2, 3, 4, 5],
    startTime: "08:00",
    endTime: "15:00",
    lunchStartTime: "16:00",
    lunchEndTime: "16:30",
  };
  const expected = {
    message: "Lunch has to be during school (8:00 AM–3:00 PM).",
    field: "lunch",
  };
  assert.deepEqual(schoolDayProblem(day), expected);
  assert.deepEqual(
    schoolSheetProblem({ ...day, commuteMinutes: "20", pauseSchool: false }),
    expected,
  );
});

// U1-01 (UX-BUG-06): an amount of 0 has a message, not a disabled Save.
test("Portion amount above zero, with a message for each limit", () => {
  assert.deepEqual(portionAmountProblem("0", "g"), {
    message: "Enter an amount above 0.",
    field: "amount",
  });
  assert.equal(
    portionAmountProblem("", "g").message,
    "Enter an amount above 0.",
  );
  assert.equal(
    portionAmountProblem("-3", "piece").message,
    "Enter an amount above 0.",
  );
  assert.equal(portionAmountProblem("28", "g"), null);
  assert.equal(
    portionAmountProblem("2500", "g").message,
    "Enter an amount up to 2,000 g.",
  );
  assert.equal(
    portionAmountProblem("101", "piece").message,
    "Enter an amount up to 100 pieces.",
  );
  const valid = { name: "Bananas", amount: "118", unit: "g", override: "" };
  assert.equal(portionFormProblem(valid), null);
  assert.equal(portionFormProblem({ ...valid, amount: "0" }).field, "amount");
  assert.equal(portionFormProblem({ ...valid, name: " " }).field, "name");
  assert.equal(
    portionFormProblem({ ...valid, override: "-1" }).field,
    "override",
  );
  assert.equal(
    portionFormProblem({ ...valid, whenMissing: true }).field,
    "when",
  );
});

// U1-03 (UX-BUG-07, UX-BUG-18): a hand-added food is named after the search,
// carries a not-found barcode, and starts with no amount.
test("Add it yourself starts from the search or barcode with no amount", () => {
  const typed = manualFood({ name: " trail mix " });
  assert.equal(typed.name, "trail mix");
  assert.equal(typed.source, "Manual");
  assert.equal("barcode" in typed, false);
  assert.equal(startingAmount(typed, null, null), "");
  const scanned = manualFood({ barcode: "0123456789012" });
  assert.equal(scanned.name, "");
  assert.equal(scanned.barcode, "0123456789012");
  assert.equal(startingAmount(scanned, null, null), "");
  assert.notEqual(typed.id, scanned.id);
  // Search results and quick basics keep their usual portion or 100 g.
  assert.equal(startingAmount({ name: "Rice" }, null, { amount: 45 }), 45);
  assert.equal(startingAmount({ name: "Rice" }, null, null), 100);
  // An edit keeps the logged amount.
  assert.equal(
    startingAmount(typed, { portion: { amount: 28, unit: "g" } }, null),
    28,
  );
});

// U1-05 (UX-BUG-20): a counted At home item at 0 is Out, and the "low or out"
// summary counts it once.
test("A counted At home item at 0 is Out and counts once in low or out", () => {
  const zero = { id: "a", name: "Bananas", availability: "exact", quantity: 0 };
  const legacyZero = { id: "b", name: "Apples", quantity: 0 };
  const low = { id: "c", name: "Rice", availability: "low" };
  const have = { id: "d", name: "Oats", availability: "exact", quantity: 4 };
  const out = { id: "e", name: "Milk", availability: "out" };
  assert.equal(stockStatus(zero), "out");
  assert.equal(stockStatus(legacyZero), "out");
  assert.equal(stockStatus({ ...zero, quantity: 1 }), "low");
  assert.equal(stockStatus(have), "have");
  assert.deepEqual(
    lowOrOut([zero, low, have, out]).map((row) => row.id),
    ["a", "c", "e"],
  );
  // Back in stock on a counted item that ran out gives "1 left", not 0.
  assert.equal(toggleStockOut(zero, "2026-10-20").quantity, 1);
  const marked = {
    ...zero,
    availability: "out",
    previousAvailability: "exact",
  };
  const restocked = toggleStockOut(marked, "2026-10-20");
  assert.equal(restocked.availability, "exact");
  assert.equal(restocked.quantity, 1);
  assert.equal(stockStatus(restocked), "low");
});

// U1-05 (KEEP-15): loading prunes undo-ledger entries older than 30 days.
test("Loading keeps undo-ledger entries for 30 days only", () => {
  const day = 86400000;
  const at = (days) => new Date(Date.now() - days * day).toISOString();
  const data = emptyData();
  data.operations = [
    {
      id: "new",
      type: "consume",
      logId: "x",
      deductions: [],
      createdAt: at(29),
    },
    {
      id: "old",
      type: "consume",
      logId: "y",
      deductions: [],
      createdAt: at(31),
    },
  ];
  const doc = {
    version: 3,
    revision: 1,
    defaultProfileId: "p",
    profiles: { p: { id: "p", name: "Maya", data } },
  };
  const loaded = validateDocument(structuredClone(doc));
  assert.deepEqual(
    loaded.profiles.p.data.operations.map((op) => op.id),
    ["new"],
  );
  // Older entries without a timestamp age from their date.
  const dated = validateData({
    ...emptyData(),
    operations: [
      { id: "a", type: "plan", planId: "1", date: at(40).slice(0, 10) },
      { id: "b", type: "remove-log", date: at(2).slice(0, 10), entry: {} },
    ],
  });
  assert.deepEqual(
    dated.operations.map((op) => op.id),
    ["b"],
  );
});
