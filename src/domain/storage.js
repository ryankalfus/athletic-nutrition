import { DEFAULT_PROFILE } from "./catalog.js";

export const SCHEMA_VERSION = 2;
export const uid = () => globalThis.crypto.randomUUID();
export const emptyData = () => ({
  step: "setup",
  profile: structuredClone(DEFAULT_PROFILE),
  schedule: [],
  schoolSchedule: null,
  dailyLogs: {},
  dayPlans: {},
  mealPlans: [],
  favorites: [],
  recentFoods: [],
  operations: [],
  reminderSettings: { enabled: false, leadMinutes: 60, eveningPrep: true },
  groceryState: {
    budgetAmount: 50,
    goal: "school-week",
    lastShopDate: "",
    pantry: [],
    items: [],
    purchases: [],
  },
});

const object = (value) =>
  value && typeof value === "object" && !Array.isArray(value);
export function validateData(data) {
  if (!object(data)) throw new Error("The profile data is not an object.");
  for (const field of [
    "schedule",
    "mealPlans",
    "favorites",
    "recentFoods",
    "operations",
  ]) {
    if (data[field] !== undefined && !Array.isArray(data[field]))
      throw new Error(`Invalid ${field}: expected a list.`);
  }
  for (const field of [
    "profile",
    "dailyLogs",
    "dayPlans",
    "reminderSettings",
    "groceryState",
  ]) {
    if (data[field] !== undefined && !object(data[field]))
      throw new Error(`Invalid ${field}: expected an object.`);
  }
  for (const key of ["pantry", "items", "purchases"]) {
    if (
      data.groceryState?.[key] !== undefined &&
      (!Array.isArray(data.groceryState[key]) ||
        data.groceryState[key].some(
          (v) => !object(v) || typeof v.name !== "string",
        ))
    )
      throw new Error(`Invalid grocery ${key}.`);
  }
  for (const [date, log] of Object.entries(data.dailyLogs || {})) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !object(log) ||
      !Array.isArray(log.entries) ||
      log.entries.some((e) => !object(e) || typeof e.name !== "string")
    )
      throw new Error(`Invalid daily log: ${date}.`);
    if (
      log.water !== undefined &&
      (!Number.isFinite(log.water) || log.water < 0)
    )
      throw new Error(`Invalid water log: ${date}.`);
  }
  if (
    Object.values(data.dayPlans || {}).some(
      (tasks) =>
        !Array.isArray(tasks) ||
        tasks.some((t) => !object(t) || typeof t.label !== "string"),
    )
  )
    throw new Error("Invalid preparation tasks.");
  if (
    data.schedule?.some(
      (e) =>
        !object(e) ||
        typeof e.title !== "string" ||
        (e.recurrence && !Array.isArray(e.recurrence.weekdays)),
    )
  )
    throw new Error("Invalid activity schedule.");
  if (
    data.schoolSchedule &&
    (!object(data.schoolSchedule) ||
      !Array.isArray(data.schoolSchedule.weekdays))
  )
    throw new Error("Invalid school schedule.");
  if (
    data.profile &&
    ["foodSources", "dietaryNeeds"].some(
      (k) => data.profile[k] !== undefined && !Array.isArray(data.profile[k]),
    )
  )
    throw new Error("Invalid profile preferences.");
  for (const log of Object.values(data.dailyLogs || {}))
    if (
      log.waterEntries !== undefined &&
      (!Array.isArray(log.waterEntries) ||
        log.waterEntries.some(
          (e) => !object(e) || !Number.isFinite(e.amount) || e.amount <= 0,
        ))
    )
      throw new Error("Invalid hydration history.");
  const defaults = emptyData();
  for (const field of ["favorites", "recentFoods"])
    if (
      data[field]?.some(
        (food) =>
          !object(food) ||
          typeof food.id !== "string" ||
          typeof food.name !== "string",
      )
    )
      throw new Error(`Invalid saved food in ${field}.`);
  if (
    data.mealPlans?.some(
      (plan) =>
        !object(plan) ||
        typeof plan.id !== "string" ||
        !object(plan.template) ||
        typeof plan.template.name !== "string",
    )
  )
    throw new Error("Invalid meal plans.");
  if (data.operations?.some((op) => !object(op) || typeof op.type !== "string"))
    throw new Error("Invalid operation history.");
  for (const key of ["pantry", "items", "purchases"])
    for (const item of data.groceryState?.[key] || []) {
      if (
        item.quantity != null &&
        (!Number.isFinite(Number(item.quantity)) || Number(item.quantity) < 0)
      )
        throw new Error(`Invalid quantity for ${item.name}.`);
      if (
        item.price != null &&
        (!Number.isFinite(Number(item.price)) || Number(item.price) < 0)
      )
        throw new Error(`Invalid price for ${item.name}.`);
    }
  if (
    data.groceryState?.budgetAmount != null &&
    (!Number.isFinite(Number(data.groceryState.budgetAmount)) ||
      Number(data.groceryState.budgetAmount) < 0)
  )
    throw new Error("Invalid shop budget.");
  return {
    ...defaults,
    ...data,
    profile: { ...defaults.profile, ...data.profile },
    groceryState: { ...defaults.groceryState, ...data.groceryState },
  };
}

export function validateDocument(doc) {
  if (!object(doc) || doc.version !== SCHEMA_VERSION)
    throw new Error(
      "Unsupported backup version. Keep this file; a matching app version is required.",
    );
  if (!object(doc.profiles) || !Object.keys(doc.profiles).length)
    throw new Error("No profiles found.");
  if (
    !doc.profiles[doc.defaultProfileId] ||
    !Number.isInteger(doc.revision) ||
    doc.revision < 0
  )
    throw new Error("Invalid profile index or revision.");
  for (const [id, profile] of Object.entries(doc.profiles)) {
    if (!object(profile) || typeof profile.id !== "string" || profile.id !== id)
      throw new Error("Invalid device profile.");
    profile.data = validateData(profile.data);
  }
  return doc;
}

export function migrateLegacy(storage) {
  const raw = {};
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (/^(nourally|fuel)-/.test(key)) raw[key] = storage.getItem(key);
  }
  const read = (key, fallback) => {
    const value = raw[`nourally-${key}`] ?? raw[`fuel-${key}`];
    return value == null ? fallback : JSON.parse(value);
  };
  const base = emptyData();
  const id = uid();
  const account = read("account", null);
  let logs = read("daily-logs", null);
  if (!logs) {
    const entries = read("entries", []).filter(
      (e) =>
        !(
          (e.id === 1 && e.name === "Breakfast") ||
          (e.id === 2 && e.name === "Chicken rice bowl")
        ),
    );
    const date = new Date();
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    logs = entries.length ? { [key]: { entries, water: 0 } } : {};
  }
  const data = validateData({
    ...base,
    step:
      (raw["nourally-step"] ?? raw["fuel-step"]) === "dashboard"
        ? "dashboard"
        : "setup",
    profile: read("profile", base.profile),
    schedule: read("schedule", []),
    schoolSchedule: read("school-schedule", null),
    dailyLogs: logs,
    dayPlans: read("day-plans", {}),
    reminderSettings: read("reminders", base.reminderSettings),
    groceryState: read("groceries", base.groceryState),
  });
  // Legacy USDA zero estimates were placeholders, not evidence that the food was free.
  data.groceryState.pantry = data.groceryState.pantry.map((item) => ({
    ...item,
    ...(!item.unit
      ? {
          unit: "package",
          availability: "some",
          notes: [
            item.notes,
            "Legacy amount: confirm the actual unit and quantity.",
          ]
            .filter(Boolean)
            .join(" "),
        }
      : {}),
  }));
  data.groceryState.items = data.groceryState.items.map((item) => ({
    ...item,
    origin: item.origin || "preserved",
    price: item.food && item.price === 0 ? null : (item.price ?? null),
  }));
  return {
    version: SCHEMA_VERSION,
    revision: 0,
    defaultProfileId: id,
    profiles: {
      [id]: {
        id,
        name: account?.name || data.profile.name || "My profile",
        email: account?.email || "",
        data,
      },
    },
    legacyBackup: raw,
  };
}
