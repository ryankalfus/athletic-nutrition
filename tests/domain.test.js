import test from "node:test";
import assert from "node:assert/strict";
import {
  FOOD_IDEAS,
  DEFAULT_PROFILE,
} from "../src/domain/catalog.js";
import {
  addDays,
  applyOccurrenceOverride,
  getDateKey,
  getFuelingGuidance,
  eventsForDate,
  isSchoolDay,
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
  removeLogEntry,
  reviseLogEntry,
  toggleStockOut,
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
  syncPlanPreparation,
  undoPlan,
} from "../src/domain/plans.js";
import { ideasFor, rankIdeas } from "../src/domain/ranking.js";
import { backupDocument, backupFilename } from "../src/domain/backup.js";
import {
  canDeliverReminders,
  reminderCandidates,
  deliverReminders,
} from "../src/domain/reminders.js";
import { normalizeFdcFood, normalizeOffFood } from "../src/usda.js";
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
      { date: "2026-09-19", startTime: "09:00", type: "game", location: "away" },
    ],
    pantry: [{ name: "Rice", quantity: 1, unit: "package", availability: "have" }],
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
  assert.equal(
    shoppingAmount({ quantity: 2, unit: "bunch" }),
    "2 bunches",
  );
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
    { id: "i1", name: "Bananas", ingredientId: "bananas", quantity: 1, unit: "bunch", checked: true },
    { id: "i2", name: "Rice", quantity: 1, unit: "package", expiry: null, checked: true },
    { id: "i3", name: "Hummus", ingredientId: "hummus", quantity: 1, unit: "tub", category: "Cold", checked: true },
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
  assert.deepEqual(done.items.map((i) => i.id), ["i4"]);
  assert.equal(putAwayPlace(state.pantry, state.items[2]), "fridge");
  assert.equal(putAwayPlace(state.pantry, state.items[0]), "pantry");
  const undone = undoPurchase(done, "trip");
  assert.deepEqual(undone.pantry, state.pantry);
  assert.deepEqual(
    undone.items.map((i) => i.id).sort(),
    ["i1", "i2", "i3", "i4"],
  );
});
test("GROC-06/08: undo is scoped to the trip, detects used food and lists past trips", () => {
  const state = emptyData().groceryState;
  state.pantry = [
    { id: "other", name: "Apples", quantity: 0, unit: "piece", availability: "out" },
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
  assert.deepEqual(rest.items.map((i) => i.id), ["b"]);
  assert.equal(tripUsage(first, "t1").used.length, 0);
  const trips = groceryTrips(
    purchase(
      { ...first, items: [{ id: "c", name: "Oats", quantity: 1, unit: "container" }] },
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
