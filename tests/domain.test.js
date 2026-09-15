import test from "node:test";
import assert from "node:assert/strict";
import {
  FOOD_IDEAS,
  DEFAULT_PROFILE,
  GROCERY_CATALOG,
} from "../src/domain/catalog.js";
import {
  addDays,
  getDateKey,
  getFuelingGuidance,
  eventsForDate,
  isSchoolDay,
} from "../src/domain/timing.js";
import {
  acceptRecommendations,
  consumeStock,
  groceryPreview,
  ingredientId,
  ingredientsForMeal,
  knownMoney,
  makeLog,
  missingGroceries,
  portionCalories,
  purchase,
  undoConsumption,
  undoPurchase,
  validPortion,
} from "../src/domain/food.js";
import {
  emptyData,
  migrateLegacy,
  validateData,
  validateDocument,
} from "../src/domain/storage.js";
import { addHydration, undoHydration } from "../src/domain/hydration.js";
import { planMeal, undoPlan } from "../src/domain/plans.js";
import {
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
test("B02: generation preserves custom metadata, cart, quantity and notes", () => {
  const state = emptyData().groceryState;
  state.items = [
    {
      id: "custom",
      name: "My granola",
      quantity: 2,
      price: 7.5,
      notes: "favorite",
      status: "cart",
    },
  ];
  const result = groceryPreview(state, GROCERY_CATALOG);
  const next = acceptRecommendations(state, result.additions);
  assert.deepEqual(next.items[0], state.items[0]);
  assert.equal(state.items.length, 1);
  assert.deepEqual(
    acceptRecommendations(next, result.additions).items,
    next.items,
  );
});
test("B06/B07: budgets zero, tiny, unset and unknown prices remain distinct", () => {
  for (const limit of [0, 1, 5, 50]) {
    const result = groceryPreview(
      { ...emptyData().groceryState, budgetAmount: limit },
      GROCERY_CATALOG,
    );
    assert.ok(knownMoney(result.additions).subtotal <= limit);
    if (!limit) assert.equal(result.additions.length, 0);
  }
  assert.ok(
    groceryPreview(
      { ...emptyData().groceryState, budgetAmount: null },
      GROCERY_CATALOG,
    ).additions.length > 0,
  );
  const state = {
    ...emptyData().groceryState,
    items: [{ price: null, name: "USDA item", quantity: 1 }],
  };
  assert.deepEqual(knownMoney(state.items), { subtotal: 0, unknown: 1 });
  assert.equal(groceryPreview(state, GROCERY_CATALOG).additions.length, 0);
  assert.equal(knownMoney([{ price: 0, quantity: 1 }]).unknown, 0);
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
  assert.equal(missing[0].quantity, 15);
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
  assert.match(first[0].title, /in 28 minutes/);
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
