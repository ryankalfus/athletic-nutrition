import { DEFAULT_PROFILE } from "./catalog.js";
import { normalizeSport } from "./sport.js";

export const SCHEMA_VERSION = 3;
export const uid = () => globalThis.crypto.randomUUID();
export const emptyData = () => ({
  step: "setup",
  profile: { ...structuredClone(DEFAULT_PROFILE), sport: "" },
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
    budgetAmount: null,
    showPrices: false,
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
        (e.recurrence &&
          (!Array.isArray(e.recurrence.weekdays) ||
            (e.recurrence.overrides !== undefined &&
              (!object(e.recurrence.overrides) ||
                Object.entries(e.recurrence.overrides).some(
                  ([date, override]) =>
                    !/^\d{4}-\d{2}-\d{2}$/.test(date) || !object(override),
                ))))),
    )
  )
    throw new Error("Invalid activity schedule.");
  if (
    data.schoolSchedule &&
    (!object(data.schoolSchedule) ||
      !Array.isArray(data.schoolSchedule.weekdays) ||
      (data.schoolSchedule.excludedRanges !== undefined &&
        (!Array.isArray(data.schoolSchedule.excludedRanges) ||
          data.schoolSchedule.excludedRanges.some(
            (range) =>
              !object(range) ||
              !/^\d{4}-\d{2}-\d{2}$/.test(range.startDate) ||
              !/^\d{4}-\d{2}-\d{2}$/.test(range.endDate) ||
              range.endDate < range.startDate,
          ))))
  )
    throw new Error("Invalid school schedule.");
  if (
    data.profile &&
    ["foodSources", "dietaryNeeds"].some(
      (k) => data.profile[k] !== undefined && !Array.isArray(data.profile[k]),
    )
  )
    throw new Error("Invalid profile preferences.");
  if (
    data.profile &&
    data.profile.sport !== undefined &&
    data.profile.sport !== null &&
    typeof data.profile.sport !== "string"
  )
    throw new Error("Invalid profile sport.");
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
  const mealPlans = (data.mealPlans || []).map((plan) => {
    const log = (data.dailyLogs?.[plan.date]?.entries || []).find(
      (entry) => entry.mealPlanId === plan.id,
    );
    const originalStart = plan.eventStartTime ?? plan.intendedTime ?? "";
    const minutes = originalStart
      ? originalStart
          .split(":")
          .reduce((n, value, index) => n + Number(value) * (index ? 1 : 60), 0)
      : null;
    const eatMinutes = minutes == null ? null : Math.max(0, minutes - 90);
    const eatAt =
      plan.eatAt ??
      (eatMinutes == null
        ? ""
        : `${String(Math.floor(eatMinutes / 60)).padStart(2, "0")}:${String(eatMinutes % 60).padStart(2, "0")}`);
    const status =
      plan.status === "logged" ? "eaten" : plan.status || "planned";
    if (!["planned", "packed", "eaten"].includes(status))
      throw new Error("Invalid food plan status.");
    return {
      ...plan,
      status,
      eatAt,
      intendedTime: eatAt,
      eventStartTime: originalStart,
      moment: plan.moment || "regular",
      packedAt: plan.packedAt ?? null,
      eatenAt: plan.eatenAt ?? log?.createdAt ?? null,
      logEntryId: plan.logEntryId ?? log?.id ?? null,
    };
  });
  const dayPlans = Object.fromEntries(
    Object.entries(data.dayPlans || {}).map(([date, tasks]) => [
      date,
      tasks.map((task) => ({
        ...task,
        planId: task.planId ?? task.owners?.[0] ?? null,
      })),
    ]),
  );
  return {
    ...defaults,
    ...data,
    mealPlans,
    dayPlans,
    profile: {
      ...defaults.profile,
      ...data.profile,
      sport: normalizeSport(data.profile?.sport),
    },
    groceryState: {
      ...defaults.groceryState,
      ...data.groceryState,
      pantry: (data.groceryState?.pantry || []).map((item) =>
        item.availability === "some" ? { ...item, availability: "have" } : item,
      ),
      items: (data.groceryState?.items || []).map(migrateGroceryItem),
    },
  };
}

// GROC-02: the in-app cart is gone; a carted item is simply checked off.
function migrateGroceryItem(item) {
  const { status, ...rest } = item;
  const next = { ...rest, checked: Boolean(item.checked ?? status === "cart") };
  return status && !["cart", "list"].includes(status)
    ? { ...next, status }
    : next;
}

export function validateDocument(doc) {
  if (object(doc) && doc.version === 2) {
    const original = structuredClone(doc);
    doc = {
      ...doc,
      version: SCHEMA_VERSION,
      migrationBackup: original,
      migratedAt: new Date().toISOString(),
    };
  }
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
          availability: "have",
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
