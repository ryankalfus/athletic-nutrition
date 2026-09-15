import { GROCERY_CATALOG, MEAL_INGREDIENTS } from "./catalog.js";
import { getDateKey } from "./timing.js";
import { uid } from "./storage.js";

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
export function sameProduct(a, b) {
  const first =
    a.food?.source === "Manual"
      ? null
      : a.food?.id || (a.fdcId && `fdc-${a.fdcId}`);
  const second =
    b.food?.source === "Manual"
      ? null
      : b.food?.id || (b.fdcId && `fdc-${b.fdcId}`);
  return first || second
    ? Boolean(first && first === second)
    : normalized(a.name) === normalized(b.name);
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
    ([name, id, amount = 1, unit = "portion"]) => {
      const matches = pantry.filter(
        (item) => ingredientId(item) === id && usable(item, date),
      );
      const known = matches.reduce(
        (n, item) => n + (quantityIn(item, unit) ?? 0),
        0,
      );
      return {
        name,
        ingredientId: id,
        amount,
        unit,
        matches,
        available: matches.length > 0,
        sufficient: known >= amount,
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
export function missingGroceries(ingredients, items) {
  return ingredients.flatMap((ingredient) => {
    const queued = items.filter(
      (i) => ingredientId(i) === ingredient.ingredientId,
    );
    if (
      ingredient.approximate ||
      queued.some((i) => quantityIn(i, ingredient.unit) == null)
    )
      return [];
    const amount = Math.max(
      ingredient.missing -
        queued.reduce((n, i) => n + (quantityIn(i, ingredient.unit) || 0), 0),
      0,
    );
    return amount > 0
      ? [
          {
            id: uid(),
            name: ingredient.name,
            ingredientId: ingredient.ingredientId,
            catalogId: ingredient.ingredientId,
            quantity: amount,
            unit: ingredient.unit,
            price: null,
            status: "list",
            origin: "meal",
          },
        ]
      : [];
  });
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
export function groceryPreview(state, candidates) {
  const totals = knownMoney(state.items);
  const unlimited = state.budgetAmount === null || state.budgetAmount === "";
  let remaining = unlimited
    ? Infinity
    : Math.max(Number(state.budgetAmount) - totals.subtotal, 0);
  const additions = [],
    excluded = [];
  for (const item of candidates) {
    if (
      state.items.some(
        (existing) =>
          ingredientId(existing) === item.id || sameProduct(existing, item),
      ) ||
      state.pantry.some(
        (p) =>
          ingredientId(p) === item.id &&
          p.availability !== "low" &&
          usable(p, getDateKey()),
      )
    )
      continue;
    if (totals.unknown && !unlimited) {
      excluded.push({ ...item, reason: "Price existing items first" });
      continue;
    }
    if (item.price == null || Number(item.price) > remaining) {
      excluded.push({ ...item, reason: "Outside remaining estimate" });
      continue;
    }
    additions.push({
      ...item,
      id: uid(),
      catalogId: item.id,
      ingredientId: item.id,
      quantity: 1,
      unit: "package",
      status: "list",
      origin: "generated",
      priceKind: "estimate",
    });
    remaining -= Number(item.price);
  }
  return {
    additions,
    excluded,
    knownSubtotal: totals.subtotal,
    unknown: totals.unknown,
  };
}
export function acceptRecommendations(state, selected, operationId = uid()) {
  const additions = selected.filter(
    (item) =>
      !state.items.some(
        (existing) =>
          sameProduct(existing, item) ||
          (ingredientId(existing) &&
            ingredientId(existing) === ingredientId(item)),
      ),
  );
  return {
    ...state,
    items: [...state.items, ...additions],
    recommendationsUndo: { id: operationId, ids: additions.map((i) => i.id) },
  };
}
export function purchase(state, ids, date, operationId = uid()) {
  if (state.purchases.some((p) => p.transactionId === operationId))
    return state;
  const items = state.items.filter((item) => ids.includes(item.id));
  if (!items.length) return state;
  const pantry = structuredClone(state.pantry);
  const records = items.map((item) => {
    let target = pantry.find(
      (p) =>
        sameProduct(p, item) &&
        (p.unit || "package") === (item.unit || "package") &&
        p.packageAmount === item.packageAmount &&
        p.packageUnit === item.packageUnit &&
        (!p.availability || p.availability === "exact") &&
        p.expiry === item.expiry,
    );
    if (!target) {
      target = {
        ...item,
        id: uid(),
        quantity: 0,
        availability: "exact",
        location: "pantry",
      };
      pantry.push(target);
    }
    target.quantity = Number(target.quantity) + Number(item.quantity);
    target.availability = "exact";
    target.updatedDate = date;
    target.purchasedDate = date;
    return {
      ...item,
      purchaseId: uid(),
      transactionId: operationId,
      pantryId: target.id,
      purchasedDate: date,
      previousShopDate: state.lastShopDate,
    };
  });
  return {
    ...state,
    pantry,
    items: state.items.filter((i) => !ids.includes(i.id)),
    lastShopDate: date,
    purchases: [...records, ...state.purchases],
  };
}
export function undoPurchase(state, transactionId) {
  const records = state.purchases.filter(
    (p) => p.transactionId === transactionId && !p.undone,
  );
  if (!records.length) return state;
  for (const pantryId of new Set(records.map((r) => r.pantryId))) {
    const item = state.pantry.find((p) => p.id === pantryId);
    const total = records
      .filter((r) => r.pantryId === pantryId)
      .reduce((sum, r) => sum + Number(r.quantity), 0);
    if (!item || Number(item.quantity) < total)
      throw new Error(
        "Some purchased stock has been used. Restore that stock or correct the pantry before undoing this purchase.",
      );
  }
  return {
    ...state,
    pantry: state.pantry
      .map((p) => ({
        ...p,
        quantity:
          Number(p.quantity) -
          records
            .filter((r) => r.pantryId === p.id)
            .reduce((n, r) => n + Number(r.quantity), 0),
      }))
      .filter((p) => p.quantity > 0),
    items: [
      ...state.items,
      ...records
        .filter((r) => !state.items.some((i) => i.id === r.id))
        .map(
          ({
            purchaseId,
            transactionId: tx,
            pantryId,
            purchasedDate,
            previousShopDate,
            ...item
          }) => item,
        ),
    ],
    purchases: state.purchases.map((p) =>
      p.transactionId === transactionId ? { ...p, undone: true } : p,
    ),
    lastShopDate: state.purchases.some(
      (p) =>
        !p.undone &&
        p.transactionId !== transactionId &&
        p.purchasedDate >= records[0].purchasedDate,
    )
      ? state.lastShopDate
      : records[0].previousShopDate,
  };
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
