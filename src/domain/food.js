import { DIET_FILTERS, GROCERY_CATALOG, MEAL_INGREDIENTS } from "./catalog.js";
import { getDateKey } from "./timing.js";
import { uid } from "./storage.js";
import { activeAllergies, groceryAllergyMatches } from "./allergens.js";

const normalized = (name) =>
  String(name || "")
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const aliases = {
  bananas: [
    "banana",
    "bananas",
    "Bananas, raw",
    "Banana, raw",
    "Bananas, ripe and slightly ripe, raw",
    "Bananas, overripe, raw",
  ],
  apples: ["apple", "apples"],
  bread: [
    "bread",
    "whole grain bread",
    "whole wheat bread",
    "toast",
    "bagel",
    "bagels",
  ],
  sunbutter: ["sunbutter", "sunflower butter", "sunflower seed butter"],
  "peanut-butter": ["peanut butter"],
  "soy-milk": ["soy milk", "shelf stable soy milk"],
  milk: ["milk", "dairy milk"],
  "chocolate-milk": ["chocolate milk"],
  beans: ["canned beans", "black beans", "kidney beans"],
  chickpeas: ["chickpeas", "garbanzo beans"],
  rice: ["rice", "white rice", "brown rice"],
  "rice-cakes": ["rice cakes"],
  oats: ["oats", "oatmeal"],
  "frozen-berries": ["berries", "frozen berries"],
  "baby-carrots": ["baby carrots", "carrots"],
  "soy-yogurt": ["soy yogurt"],
  yogurt: ["yogurt"],
  cereal: ["cereal"],
  granola: ["granola"],
  pretzels: ["pretzels"],
  jam: ["jam"],
  pita: ["pita", "pita bread"],
  grapes: ["grapes"],
  turkey: ["turkey"],
  salsa: ["salsa"],
  pasta: ["pasta"],
  edamame: ["edamame"],
  "seed-mix": ["seed mix", "nut free seed mix"],
  "dried-fruit": ["dried fruit"],
  "fruit-cups": ["fruit cups", "fruit cup"],
  juice: ["juice", "juice boxes"],
};
for (const item of GROCERY_CATALOG)
  aliases[item.id] = [...(aliases[item.id] || []), item.name];
export const INGREDIENTS = Object.entries(aliases).map(([id, names]) => ({
  id,
  name: GROCERY_CATALOG.find((i) => i.id === id)?.name || names[0],
}));
const lookup = new Map(
  Object.entries(aliases).flatMap(([id, names]) =>
    names.map((name) => [normalized(name), id]),
  ),
);
export function ingredientId(item) {
  // A product's words are never evidence that it is allergy-safe or a substitute.
  if (item.ingredientId === "") return null;
  if (item.ingredientId) return item.ingredientId;
  if (aliases[item.catalogId]) return item.catalogId;
  return lookup.get(normalized(item.name)) || null;
}
// A catalog basic (Quick add, a grocery suggestion): its id is a catalog
// ingredient, not a branded product.
const catalogFood = (item) =>
  Boolean(aliases[item.food?.id] || aliases[item.catalogId]);
export function sameProduct(a, b) {
  const first =
    a.food?.source === "Manual"
      ? null
      : a.food?.id || (a.fdcId && `fdc-${a.fdcId}`);
  const second =
    b.food?.source === "Manual"
      ? null
      : b.food?.id || (b.fdcId && `fdc-${b.fdcId}`);
  if (first && second) return first === second;
  // HOME-05: a catalog basic matches a row with no product id (bought
  // through Groceries, typed in) when both are the same catalog ingredient,
  // so Quick add offers to merge instead of adding a duplicate row.
  if (first || second) {
    const [withId, without] = first ? [a, b] : [b, a];
    const id = ingredientId(withId);
    return Boolean(catalogFood(withId) && id && id === ingredientId(without));
  }
  return normalized(a.name) === normalized(b.name);
}
const optional = (value) =>
  value === undefined || value === "" ? null : value;
const sameOptional = (a, b) => optional(a) === optional(b);
export function findMatchingFoodItem(list, item) {
  return list.find(
    (candidate) =>
      sameProduct(candidate, item) &&
      (candidate.unit || "package") === (item.unit || "package") &&
      sameOptional(candidate.packageAmount, item.packageAmount) &&
      sameOptional(candidate.packageUnit, item.packageUnit) &&
      sameOptional(candidate.expiry, item.expiry) &&
      sameOptional(candidate.location, item.location),
  );
}
export function makeFoodRecord(fields, { id = uid(), origin = "manual" } = {}) {
  // Low is a status or an exact quantity of 1 or less; no separate threshold (HOME-03).
  const { lowThreshold: _threshold, status: _status, ...rest } = fields;
  return {
    id,
    ...rest,
    availability: fields.availability || "exact",
    origin: fields.origin || origin,
  };
}
export function toggleStockOut(item, date) {
  if (item.availability === "out") {
    const { previousAvailability, ...rest } = item;
    return {
      ...rest,
      availability: previousAvailability || "have",
      updatedDate: date,
    };
  }
  return {
    ...item,
    previousAvailability: item.availability || "exact",
    availability: "out",
    updatedDate: date,
  };
}
/**
 * One −/+ step on an exact count (HOME-04). An Out row has none left, so "+"
 * restocks from 0 ("1 left") rather than from the count it had before it ran
 * out; reaching 0 marks it Out.
 * @param {any} item a pantry row
 * @param {number} delta
 * @param {string} date
 * @param {number|null} [from] the count on screen while steps are pending
 */
export function stepStockCount(item, delta, date, from = null) {
  const start =
    from != null
      ? Number(from)
      : item.availability === "out"
        ? 0
        : Number(item.quantity ?? 0);
  const quantity = Math.max(0, start + delta);
  const { previousAvailability: _previous, ...rest } = item;
  return {
    ...rest,
    quantity,
    availability: quantity === 0 ? "out" : "exact",
    updatedDate: date,
  };
}
export function usable(item, date) {
  return (
    item.availability !== "out" &&
    Number(item.quantity ?? 1) > 0 &&
    (!item.expiry || item.expiry >= date)
  );
}
export function ingredientsForMeal(idea, pantry, date) {
  return (MEAL_INGREDIENTS[idea.id] || []).map(
    ([name, id, amount = 1, unit = "portion", displayAmount]) => {
      const matches = pantry.filter(
        (item) => ingredientId(item) === id && usable(item, date),
      );
      const known = matches.reduce(
        (n, item) => n + (quantityIn(item, unit) ?? 0),
        0,
      );
      return {
        name,
        displayAmount: displayAmount || name,
        forIdea: idea.name,
        ingredientId: id,
        amount,
        unit,
        matches,
        available: matches.length > 0,
        sufficient:
          known >= amount ||
          matches.some(
            (item) =>
              ["have", "some"].includes(item.availability) ||
              // An exact count in another unit ("3 bunches") still means some is at home.
              (quantityIn(item, unit) == null && Number(item.quantity) > 0),
          ),
        missing: Math.max(amount - known, 0),
        approximate: matches.some((item) => quantityIn(item, unit) == null),
      };
    },
  );
}
export function quantityIn(item, unit) {
  if (item.availability && item.availability !== "exact") return null;
  if (item.unit === unit) return Number(item.quantity);
  if (
    item.unit === "package" &&
    item.packageUnit === unit &&
    item.packageAmount > 0
  )
    return Number(item.quantity) * item.packageAmount;
  return null;
}
// Shopping units are what a family buys ("1 bag"), not the recipe amount ("30 g").
const SHOPPING_UNITS = {
  bananas: [1, "bunch"],
  apples: [1, "bag"],
  "frozen-berries": [1, "bag"],
  "baby-carrots": [1, "bag"],
  bread: [1, "loaf"],
  tortillas: [1, "pack"],
  oats: [1, "container"],
  rice: [1, "bag"],
  pretzels: [1, "bag"],
  applesauce: [1, "box"],
  "fig-bars": [1, "box"],
  crackers: [1, "box"],
  beans: [2, "can"],
  chickpeas: [2, "can"],
  eggs: [1, "carton"],
  chicken: [1, "pack"],
  tofu: [1, "block"],
  "tuna-pouches": [1, "pack"],
  sunbutter: [1, "jar"],
  "peanut-butter": [1, "jar"],
  yogurt: [1, "tub"],
  "soy-yogurt": [1, "tub"],
  "soy-milk": [1, "carton"],
  milk: [1, "carton"],
  "chocolate-milk": [1, "carton"],
  "cheese-sticks": [1, "pack"],
  hummus: [1, "tub"],
  "rice-cakes": [1, "pack"],
  cereal: [1, "box"],
  granola: [1, "bag"],
  jam: [1, "jar"],
  pita: [1, "pack"],
  grapes: [1, "bag"],
  turkey: [1, "pack"],
  salsa: [1, "jar"],
  pasta: [1, "box"],
  edamame: [1, "bag"],
  "seed-mix": [1, "bag"],
  "dried-fruit": [1, "bag"],
  "fruit-cups": [1, "pack"],
  juice: [1, "pack"],
};
export const SHOPPING_UNIT_CHOICES = [
  "bag",
  "box",
  "bunch",
  "can",
  "carton",
  "container",
  "jar",
  "loaf",
  "pack",
  "tub",
  "bottle",
  "package",
  "piece",
];
export const shoppingDefaults = (id) => SHOPPING_UNITS[id] || [1, "package"];
const unitWord = (count, unit) => {
  if (Number(count) === 1 || ["g", "ml"].includes(unit)) return unit;
  if (unit === "piece") return "pieces";
  return /(ch|sh|x|s)$/.test(unit) ? `${unit}es` : `${unit}s`;
};
export function shoppingAmount(item) {
  const quantity = Number(item.quantity ?? 1);
  const unit = item.unit || "package";
  return `${quantity} ${unitWord(quantity, unit)}`;
}
const requirementIn = (item, unit) =>
  item.requirement?.unit === unit && item.requirement.amount != null
    ? Number(item.requirement.amount)
    : quantityIn(item, unit);
function groceryItem(id, name, extra) {
  const catalog = GROCERY_CATALOG.find((entry) => entry.id === id);
  const [quantity, unit] = SHOPPING_UNITS[id] || [1, "package"];
  return {
    id: uid(),
    name: name || catalog?.name || id,
    ingredientId: id,
    catalogId: id,
    quantity,
    unit,
    price: catalog?.price ?? null,
    priceKind: catalog?.price == null ? null : "estimate",
    category: catalog?.category || "Other",
    checked: false,
    reason: null,
    requirement: null,
    origin: "generated",
    ...extra,
  };
}
/**
 * The one grocery generator (GROC-04). `needs` are ingredient shortfalls from
 * ideas; `candidates` are weekly staples. Output uses shopping units, carries a
 * reason, and is never pre-checked.
 * @param {{needs?: any[], candidates?: any[], existing?: any[], pantry?: any[], date?: string}} input
 */
export function generateGroceryItems({
  needs = [],
  candidates = [],
  existing = [],
  pantry = [],
  date = getDateKey(),
}) {
  const out = new Map();
  const queued = (id, item) =>
    existing.filter(
      (entry) =>
        (id && ingredientId(entry) === id) ||
        (item && sameProduct(entry, item)),
    );
  for (const need of needs) {
    const id = need.ingredientId;
    if (!id || out.has(id) || need.approximate) continue;
    const already = queued(id);
    if (already.some((entry) => requirementIn(entry, need.unit) == null))
      continue;
    const remaining = Math.max(
      Number(need.missing ?? need.amount ?? 1) -
        already.reduce(
          (total, entry) => total + (requirementIn(entry, need.unit) || 0),
          0,
        ),
      0,
    );
    if (!(remaining > 0)) continue;
    out.set(
      id,
      groceryItem(id, need.name, {
        origin: "meal",
        reason: need.reason || (need.forIdea ? `For ${need.forIdea}` : null),
        requirement: { name: need.name, amount: remaining, unit: need.unit },
      }),
    );
  }
  for (const candidate of candidates) {
    const id = candidate.ingredientId || candidate.id;
    if (!id || out.has(id) || queued(id, candidate).length) continue;
    if (
      pantry.some(
        (row) =>
          ingredientId(row) === id &&
          usable(row, date) &&
          stockStatus(row) === "have",
      )
    )
      continue;
    out.set(
      id,
      groceryItem(id, candidate.name, {
        origin: "generated",
        reason: candidate.reason || "Staple",
      }),
    );
  }
  return [...out.values()];
}
export function missingGroceries(ingredients, items) {
  return generateGroceryItems({ needs: ingredients, existing: items });
}
const weekday = (date) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
  });
const isAway = (event) => ["away", "travel"].includes(event.location);
const eventLabel = (event) =>
  event.type === "game"
    ? isAway(event)
      ? "away game"
      : "game"
    : event.type === "workout"
      ? "workout"
      : "practice";
// A grocery suggestion fits the diet choices and, once the allergen tags are
// approved, lists none of the athlete's allergies (P1-09).
export function groceryFitsProfile(item, profile = {}, allergyTagsReviewed) {
  const needs = (profile.avoid || profile.dietaryNeeds || []).filter((need) =>
    DIET_FILTERS.includes(need),
  );
  return (
    needs.every((need) => item[need]) &&
    !groceryAllergyMatches(item, activeAllergies(profile, allergyTagsReviewed))
      .length
  );
}

/**
 * "Add food for this week": 5–8 unchecked staples with a reason each.
 * Sports drinks are never suggested (no new sports-drink recommendation).
 * @param {{profile?: any, events?: any[], pantry?: any[], items?: any[], date?: string, limit?: number, allergyTagsReviewed?: boolean}} input
 */
export function weeklyGroceryIdeas({
  profile = {},
  events = [],
  pantry = [],
  items = [],
  date = getDateKey(),
  limit = 8,
  allergyTagsReviewed,
}) {
  const sorted = [...events].sort((a, b) =>
    `${a.date} ${a.startTime || ""}`.localeCompare(
      `${b.date} ${b.startTime || ""}`,
    ),
  );
  const away = sorted.find(isAway);
  const first = sorted[0];
  const reasonFor = (item) =>
    away && item.goals.includes("away-game")
      ? `For ${weekday(away.date)} ${eventLabel(away)}`
      : first &&
          item.goals.some((goal) =>
            ["practice-fuel", "recovery-meals"].includes(goal),
          )
        ? `For ${weekday(first.date)} ${eventLabel(first)}`
        : "Staple";
  const goals = sorted.length
    ? ["practice-fuel", "recovery-meals", "away-game", "school-week"]
    : ["school-week", "restock-basics"];
  const candidates = GROCERY_CATALOG.filter(
    (item) =>
      item.id !== "sports-drink" &&
      item.goals.some((goal) => goals.includes(goal)) &&
      groceryFitsProfile(item, profile, allergyTagsReviewed),
  )
    .map((item) => ({ ...item, reason: reasonFor(item) }))
    .sort(
      (a, b) =>
        Number(b.reason !== "Staple") - Number(a.reason !== "Staple") ||
        Number(b.goals.includes("restock-basics")) -
          Number(a.goals.includes("restock-basics")),
    );
  const counts = {};
  for (const event of sorted) {
    const label = eventLabel(event);
    counts[label] = (counts[label] || 0) + 1;
  }
  const parts = Object.entries(counts).map(
    ([label, count]) =>
      `${count} ${count === 1 ? label : label.replace(/(game|practice|workout)$/, "$1s")}`,
  );
  const summary = parts.length
    ? `Based on ${parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : parts[0]}.`
    : "Staples for school days and practice.";
  return {
    items: generateGroceryItems({
      candidates,
      existing: items,
      pantry,
      date,
    }).slice(0, limit),
    summary,
  };
}
export function knownMoney(items) {
  const unknown = items.filter(
    (i) =>
      i.price == null || i.price === "" || !Number.isFinite(Number(i.price)),
  );
  return {
    subtotal: items
      .filter((i) => !unknown.includes(i))
      .reduce((sum, i) => sum + Number(i.price) * Number(i.quantity ?? 1), 0),
    unknown: unknown.length,
  };
}
const exactRow = (row) =>
  !row.availability ||
  row.availability === "exact" ||
  (row.availability === "out" && row.previousAvailability === "exact");
const compatible = (row, item) =>
  (row.unit || "package") === (item.unit || "package") &&
  sameOptional(row.packageAmount, item.packageAmount) &&
  sameOptional(row.packageUnit, item.packageUnit);
/** The At home row a grocery item updates when put away (GROC-06). */
export function pantryMatch(pantry, item) {
  const id = ingredientId(item);
  const same = pantry.filter(
    (row) => sameProduct(row, item) || (id && ingredientId(row) === id),
  );
  return (
    same.find(
      (row) =>
        exactRow(row) &&
        compatible(row, item) &&
        sameOptional(row.expiry, item.expiry),
    ) ||
    same.find((row) => sameProduct(row, item)) ||
    same[0] ||
    null
  );
}
export function putAwayPlace(pantry, item) {
  return (
    pantryMatch(pantry, item)?.location ||
    (["Cold", "Protein"].includes(item.category) &&
    !["beans", "tuna-pouches", "sunbutter"].includes(ingredientId(item))
      ? "fridge"
      : "pantry")
  );
}
/**
 * Finish shopping: put checked items away (GROC-03/06). Existing At home rows
 * are updated in place; items with no match create a "Have" row.
 * @param {any} state
 * @param {string[]} ids
 * @param {string} date
 * @param {string} [operationId]
 * @param {{places?: Record<string, string>}} [options]
 */
export function purchase(state, ids, date, operationId = uid(), options = {}) {
  const places = options.places || {};
  if (state.purchases.some((p) => p.transactionId === operationId))
    return state;
  const items = state.items.filter((item) => ids.includes(item.id));
  if (!items.length) return state;
  const pantry = structuredClone(state.pantry);
  const records = items.map((item) => {
    let target = pantryMatch(pantry, item);
    const pantryCreated = !target;
    const place = places[item.id];
    let pantryBefore = null;
    if (!target) {
      target = {
        id: uid(),
        name: item.name,
        ...(item.food ? { food: item.food } : {}),
        ingredientId: ingredientId(item),
        catalogId: item.catalogId ?? null,
        quantity: Number(item.quantity ?? 1),
        unit: item.unit || "package",
        packageAmount: optional(item.packageAmount),
        packageUnit: optional(item.packageUnit),
        availability: "have",
        location: place || putAwayPlace([], item),
        origin: "groceries",
      };
      pantry.push(target);
    } else {
      pantryBefore = {
        availability: target.availability ?? null,
        previousAvailability: target.previousAvailability ?? null,
        quantity: target.quantity ?? null,
        location: target.location ?? null,
        updatedDate: target.updatedDate ?? null,
        purchasedDate: target.purchasedDate ?? null,
      };
      if (exactRow(target) && compatible(target, item)) {
        target.quantity =
          (target.availability === "out" ? 0 : Number(target.quantity) || 0) +
          Number(item.quantity ?? 1);
        target.availability = "exact";
      } else target.availability = "have";
      delete target.previousAvailability;
      if (place) target.location = place;
    }
    target.updatedDate = date;
    target.purchasedDate = date;
    return {
      ...item,
      purchaseId: uid(),
      transactionId: operationId,
      pantryId: target.id,
      pantryCreated,
      pantryBefore,
      purchasedDate: date,
      previousShopDate: state.lastShopDate,
    };
  });
  // Record what each touched row looks like after the trip, to detect later use.
  for (const record of records) {
    const row = pantry.find((p) => p.id === record.pantryId);
    record.pantryAfter = {
      availability: row.availability,
      quantity: row.quantity ?? null,
    };
  }
  return {
    ...state,
    pantry,
    items: state.items.filter((i) => !ids.includes(i.id)),
    lastShopDate: date,
    purchases: [...records, ...state.purchases],
  };
}
function tripGroups(state, transactionId) {
  const records = state.purchases.filter(
    (p) => p.transactionId === transactionId && !p.undone,
  );
  const groups = new Map();
  // purchases are stored newest-first within a trip in item order; the last
  // record for a row holds its final state, the first its original state.
  for (const record of records) {
    const group = groups.get(record.pantryId) || {
      pantryId: record.pantryId,
      created: record.pantryCreated,
      before: record.pantryBefore,
      after: record.pantryAfter,
      records: [],
    };
    group.after = record.pantryAfter || group.after;
    group.records.push(record);
    groups.set(record.pantryId, group);
  }
  return [...groups.values()].map((group) => {
    const row = state.pantry.find((p) => p.id === group.pantryId);
    const after = group.after;
    const used =
      !row ||
      (after &&
        (row.availability !== after.availability ||
          (row.availability === "exact" &&
            Number(row.quantity) < Number(after.quantity))));
    return { ...group, row, used: Boolean(used) };
  });
}
/** Which parts of a trip were already used (J6 "Undo the rest?"). */
export function tripUsage(state, transactionId) {
  const groups = tripGroups(state, transactionId);
  return {
    total: groups.length,
    used: groups
      .filter((g) => g.used)
      .flatMap((g) => g.records.map((r) => r.name)),
  };
}
const stripPurchase = ({
  purchaseId: _purchaseId,
  transactionId: _transactionId,
  pantryId: _pantryId,
  pantryCreated: _pantryCreated,
  pantryBefore: _pantryBefore,
  pantryAfter: _pantryAfter,
  purchasedDate: _purchasedDate,
  previousShopDate: _previousShopDate,
  undone: _undone,
  ...item
}) => item;
/**
 * Undo one trip. Only rows the trip created or changed are touched (GROC-06).
 * Rows used since the trip block the undo unless `skipUsed` is set, which
 * undoes the rest and keeps the used food at home.
 * @param {any} state
 * @param {string} transactionId
 * @param {{skipUsed?: boolean}} [options]
 */
export function undoPurchase(state, transactionId, options = {}) {
  const groups = tripGroups(state, transactionId);
  if (!groups.length) return state;
  if (groups.some((g) => g.used) && !options.skipUsed)
    throw new Error(
      "Some of this trip's food was already used. Undo the rest?",
    );
  const undo = groups.filter((g) => !g.used);
  const removeIds = new Set(
    undo.filter((g) => g.created).map((g) => g.pantryId),
  );
  const restore = new Map(
    undo.filter((g) => !g.created).map((g) => [g.pantryId, g]),
  );
  const pantry = state.pantry
    .filter((p) => !removeIds.has(p.id))
    .map((p) => {
      const group = restore.get(p.id);
      if (!group) return p;
      const before = group.before || {};
      const next = {
        ...p,
        availability: before.availability ?? undefined,
        location: before.location ?? p.location,
        updatedDate: before.updatedDate ?? undefined,
        purchasedDate: before.purchasedDate ?? undefined,
      };
      if (before.quantity != null)
        next.quantity =
          Number(before.quantity) +
          (Number(p.quantity) - Number(group.after?.quantity ?? p.quantity));
      if (before.previousAvailability)
        next.previousAvailability = before.previousAvailability;
      for (const key of [
        "availability",
        "location",
        "updatedDate",
        "purchasedDate",
      ])
        if (next[key] === undefined) delete next[key];
      return next;
    });
  const returned = undo
    .flatMap((g) => g.records)
    .filter((r) => !state.items.some((i) => i.id === r.id))
    .map(stripPurchase);
  const first = groups[0].records[0];
  return {
    ...state,
    pantry,
    items: [...state.items, ...returned],
    purchases: state.purchases.map((p) =>
      p.transactionId === transactionId ? { ...p, undone: true } : p,
    ),
    lastShopDate: state.purchases.some(
      (p) =>
        !p.undone &&
        p.transactionId !== transactionId &&
        p.purchasedDate >= first.purchasedDate,
    )
      ? state.lastShopDate
      : first.previousShopDate,
  };
}
/** Past trips, newest first (GROC-08). */
export function groceryTrips(purchases) {
  const trips = new Map();
  for (const record of purchases) {
    const id = record.transactionId || record.purchaseId || record.id;
    const trip = trips.get(id) || {
      id,
      date: record.purchasedDate,
      count: 0,
      undone: Boolean(record.undone),
      undoable: Boolean(record.transactionId),
    };
    trip.count += 1;
    trips.set(id, trip);
  }
  return [...trips.values()];
}
export function validPortion(amount, unit = "g") {
  return (
    ["g", "ml", "portion", "package", "piece"].includes(unit) &&
    Number.isFinite(Number(amount)) &&
    Number(amount) > 0 &&
    Number(amount) <= (["g", "ml"].includes(unit) ? 2000 : 100)
  );
}
export function portionCalories(food, amount, unit) {
  if (!validPortion(amount, unit) || food?.nutrients?.calories == null)
    return null;
  let basisAmount = Number(amount);
  if (unit !== (food.nutrientBasis || "g")) {
    if (
      unit === "portion" &&
      food.servingSizeUnit === (food.nutrientBasis || "g") &&
      food.servingSize > 0
    )
      basisAmount *= food.servingSize;
    else return null;
  }
  return Math.round((food.nutrients.calories * basisAmount) / 100);
}
export function makeLog(food, portion, date, overrides = {}) {
  if (!validPortion(portion.amount, portion.unit))
    throw new Error(
      "Enter an amount from above zero to 2000 g/ml, or up to 100 pieces/portions/packages.",
    );
  const calculated = portionCalories(food, portion.amount, portion.unit);
  const calories =
    portion.override === "" || portion.override == null
      ? calculated
      : Number(portion.override);
  if (
    calories != null &&
    (!Number.isFinite(calories) || calories < 0 || calories > 20000)
  )
    throw new Error("Calories must be blank or between 0 and 20,000.");
  return {
    id: uid(),
    name: food.displayName || food.name,
    date,
    time: new Date().toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    }),
    createdAt: new Date().toISOString(),
    food: structuredClone(food),
    portion: { amount: Number(portion.amount), unit: portion.unit },
    calories,
    sourceCalories: calculated,
    userAdjusted: portion.override !== "" && portion.override != null,
    source: food.source,
    ...overrides,
  };
}
export function consumeStock(data, logId, deductions) {
  if (
    deductions.some(
      (d) => !Number.isFinite(Number(d.amount)) || Number(d.amount) < 0,
    )
  )
    throw new Error("Choose nonnegative finite stock quantities.");
  const grouped = new Map();
  for (const d of deductions)
    grouped.set(d.id, (grouped.get(d.id) || 0) + Number(d.amount));
  const validated = [...grouped]
    .filter(([, amount]) => amount > 0)
    .map(([id, amount]) => ({ id, amount }));
  if (!validated.length) return;
  if (
    data.operations.some(
      (op) => op.type === "consume" && op.logId === logId && !op.undone,
    )
  )
    throw new Error("Stock was already deducted for this check-in.");
  for (const d of validated) {
    const stock = data.groceryState.pantry.find((p) => p.id === d.id);
    if (
      !stock ||
      !Number.isFinite(Number(d.amount)) ||
      Number(d.amount) > Number(stock.quantity) ||
      (stock.availability && stock.availability !== "exact")
    )
      throw new Error(
        "Choose exact stock quantities within the amount at home.",
      );
  }
  data.groceryState.pantry = data.groceryState.pantry.map((p) => ({
    ...p,
    quantity:
      Number(p.quantity) -
      validated
        .filter((d) => d.id === p.id)
        .reduce((n, d) => n + Number(d.amount), 0),
  }));
  data.operations.push({
    id: uid(),
    type: "consume",
    logId,
    deductions: validated,
    createdAt: new Date().toISOString(),
  });
}
export function undoConsumption(data, logId) {
  const op = data.operations.find(
    (o) => o.type === "consume" && o.logId === logId && !o.undone,
  );
  if (!op) return;
  if (
    op.deductions.some(
      (d) => !data.groceryState.pantry.some((p) => p.id === d.id),
    )
  )
    throw new Error(
      "A linked pantry record was removed. Restore it from a backup before undoing.",
    );
  data.groceryState.pantry = data.groceryState.pantry.map((p) => ({
    ...p,
    quantity:
      Number(p.quantity) +
      op.deductions
        .filter((d) => d.id === p.id)
        .reduce((n, d) => n + Number(d.amount), 0),
  }));
  op.undone = true;
}
export function reviseLogEntry(original, update) {
  return {
    ...original,
    ...update,
    id: original.id,
    time: original.time,
    createdAt: original.createdAt,
    original: original.original || structuredClone(original),
    correctedAt: new Date().toISOString(),
  };
}
export function removeLogEntry(data, date, entryId) {
  const day = data.dailyLogs[date];
  const removed = day?.entries.find((entry) => entry.id === entryId);
  if (!removed) throw new Error("This food entry was already removed.");
  undoConsumption(data, entryId);
  data.operations.push({ id: uid(), type: "remove-log", date, entry: removed });
  day.entries = day.entries.filter((entry) => entry.id !== entryId);
}

export function stockStatus(item) {
  if (item.availability === "out") return "out";
  if (
    item.availability === "low" ||
    ((!item.availability || item.availability === "exact") &&
      Number(item.quantity) <= 1)
  )
    return "low";
  return "have";
}
export function setStockStatus(item, status, date) {
  if (status === "out")
    return item.availability === "out" ? item : toggleStockOut(item, date);
  if (
    status === "have" &&
    item.availability === "out" &&
    item.previousAvailability === "exact"
  )
    return toggleStockOut(item, date);
  return { ...item, availability: status, updatedDate: date };
}
export function stockToGroceries(data, rows) {
  const added = [];
  for (const row of rows) {
    if (
      data.groceryState.items.some(
        (i) =>
          (ingredientId(i) === ingredientId(row) && ingredientId(row)) ||
          sameProduct(i, row),
      )
    )
      continue;
    const record = makeFoodRecord({
      name: row.name,
      food: row.food,
      ingredientId: ingredientId(row),
      catalogId: row.catalogId,
      quantity: 1,
      unit: "package",
      price: null,
      checked: false,
      reason: "Low or out at home",
      category:
        GROCERY_CATALOG.find((i) => i.id === ingredientId(row))?.category ||
        "Other",
    });
    data.groceryState.items.push(record);
    added.push(record);
  }
  return added;
}
