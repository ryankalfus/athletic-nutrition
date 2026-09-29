import { MEAL_INGREDIENTS } from "./catalog.js";
import { normalizeSport } from "./sport.js";

// You › Sport & season (ADD-09): names only, no sport-specific nutrition.
export const SEASONS = [
  ["pre", "Preseason"],
  ["in", "In season"],
  ["off", "Off-season"],
];

// You › Food needs & allergies › "I don't eat" (YOU-02). Dairy-free and
// Gluten-free stay hidden until reviewed allergen tags exist (P0-06).
export const DIET_CHOICES = [
  ["vegetarian", "Vegetarian"],
  ["vegan", "Vegan"],
];

// "Not a fan of" hides ideas that use these ingredients. Foods that carry a
// major allergen are left out so this list is never used as an allergy filter.
export const DISLIKE_CHOICES = [
  ["bananas", "Bananas"],
  ["applesauce", "Applesauce"],
  ["grapes", "Grapes"],
  ["dried-fruit", "Dried fruit"],
  ["fig-bars", "Fig bars"],
  ["granola", "Granola"],
  ["oats", "Oats"],
  ["rice", "Rice"],
  ["rice-cakes", "Rice cakes"],
  ["pasta", "Pasta"],
  ["pretzels", "Pretzels"],
  ["beans", "Beans"],
  ["chickpeas", "Chickpeas"],
  ["salsa", "Salsa"],
  ["turkey", "Turkey"],
  ["chicken", "Chicken"],
];

export const FOOD_SOURCES = [
  ["packed", "Packed from home"],
  ["cafeteria", "School cafeteria"],
  ["home", "Home kitchen"],
  ["store", "Nearby store"],
];

export const SCHOOL_ACCESS = [
  ["cafeteria", "Cafeteria"],
  ["refrigerator", "Fridge"],
  ["microwave", "Microwave"],
];

const SOURCE_SHORT = {
  packed: "Packed",
  cafeteria: "Cafeteria",
  home: "Home kitchen",
  store: "Store",
};

const strings = (value) =>
  Array.isArray(value)
    ? [...new Set(value.filter((item) => typeof item === "string"))]
    : [];

// Additive defaults for the You settings (storage.js runs this on every load).
export function normalizeYouProfile(profile = {}) {
  const lowCostIdeas =
    typeof profile.lowCostIdeas === "boolean"
      ? profile.lowCostIdeas
      : profile.budget === undefined || profile.budget === "save";
  return {
    ...profile,
    sport: normalizeSport(profile.sport),
    season: SEASONS.some(([id]) => id === profile.season) ? profile.season : "",
    dislikes: strings(profile.dislikes).filter((id) =>
      DISLIKE_CHOICES.some(([choice]) => choice === id),
    ),
    lowCostIdeas,
    // Older readers (plan signatures, earlier backups) still use `budget`.
    budget: lowCostIdeas ? "save" : "standard",
    lastBackupAt:
      typeof profile.lastBackupAt === "string" &&
      !Number.isNaN(Date.parse(profile.lastBackupAt))
        ? profile.lastBackupAt
        : null,
  };
}

export function validateYouProfile(profile) {
  if (!profile) return;
  if (
    profile.season !== undefined &&
    profile.season !== null &&
    typeof profile.season !== "string"
  )
    throw new Error("Invalid profile season.");
  for (const key of ["dislikes"])
    if (profile[key] !== undefined && !Array.isArray(profile[key]))
      throw new Error("Invalid profile preferences.");
  if (
    profile.lowCostIdeas !== undefined &&
    typeof profile.lowCostIdeas !== "boolean"
  )
    throw new Error("Invalid low-cost setting.");
  if (
    profile.lastBackupAt != null &&
    (typeof profile.lastBackupAt !== "string" ||
      Number.isNaN(Date.parse(profile.lastBackupAt)))
  )
    throw new Error("Invalid last backup date.");
}

const label = (choices, id) => choices.find(([value]) => value === id)?.[1];

export function sportSummary(profile = {}) {
  const parts = [
    normalizeSport(profile.sport),
    label(SEASONS, profile.season),
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Not set";
}

export function needsSummary(profile = {}) {
  const diet = (profile.dietaryNeeds || [])
    .map((id) => label(DIET_CHOICES, id))
    .filter(Boolean);
  const dislikes = (profile.dislikes || []).filter((id) =>
    label(DISLIKE_CHOICES, id),
  );
  const parts = [...diet];
  if (dislikes.length)
    parts.push(
      dislikes.length === 1
        ? `Not a fan of ${label(DISLIKE_CHOICES, dislikes[0]).toLowerCase()}`
        : `Not a fan of ${dislikes.length} foods`,
    );
  return parts.length ? parts.join(" · ") : "None set";
}

export function accessSummary(profile = {}, schoolSchedule = null) {
  const sources = (profile.foodSources || [])
    .map((id) => SOURCE_SHORT[id])
    .filter(Boolean);
  if (schoolSchedule?.foodAccess?.refrigerator) sources.push("fridge");
  const where = sources.length
    ? sources.map((s, i) => (i ? s.toLowerCase() : s)).join(", ")
    : "No food access set";
  const lowCost =
    (profile.lowCostIdeas ?? profile.budget === "save")
      ? "Low-cost ideas on"
      : "Low-cost ideas off";
  return `${where} · ${lowCost}`;
}

// "Not a fan of": an idea is hidden when it uses a disliked ingredient.
export function ideaUsesDislike(idea, dislikes = []) {
  if (!dislikes.length) return false;
  return (MEAL_INGREDIENTS[idea.id] || []).some(([, id]) =>
    dislikes.includes(id),
  );
}

// Grocery budget is optional: blank means no budget (GROC-05).
export function parseBudget(value) {
  const text = String(value ?? "")
    .replace(/[$,\s]/g, "")
    .trim();
  if (!text) return { amount: null };
  const amount = Number(text);
  if (!Number.isFinite(amount) || amount < 0)
    return { error: "Enter a dollar amount, like 40, or leave it blank." };
  return { amount: Math.round(amount * 100) / 100 };
}

const shortDate = (date) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    date,
  );

export function lastBackupText(iso, now = new Date()) {
  if (!iso) return "No backup saved yet.";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "No backup saved yet.";
  const start = (d) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((start(now) - start(date)) / 86400000);
  const ago =
    days <= 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
  return `Last backup: ${shortDate(date)} (${ago})`;
}

// DATA-07: imported athletes read "(from backup)" until renamed.
export function athleteName(profile) {
  const name =
    profile?.data?.profile?.name ||
    String(profile?.name || "").replace(/ \(imported\)$/, "") ||
    "Athlete";
  return name.trim() || "Athlete";
}
export function athleteLabel(profile) {
  const fromBackup =
    Boolean(profile?.fromBackup) || / \(imported\)$/.test(profile?.name || "");
  return `${athleteName(profile)}${fromBackup ? " (from backup)" : ""}`;
}

// DATA-04: what a backup file holds, before anything is added.
export function backupPreview(doc) {
  const profiles = Object.values(doc?.profiles || {});
  let through = "";
  for (const profile of profiles) {
    const data = profile.data || {};
    const dates = [
      ...Object.keys(data.dailyLogs || {}),
      ...Object.keys(data.dayPlans || {}),
      ...(data.mealPlans || []).map((plan) => plan.date),
      ...(data.schedule || []).map((event) => event.date),
    ].filter((d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d));
    for (const date of dates) if (date > through) through = date;
  }
  return { count: profiles.length, names: profiles.map(athleteName), through };
}

export function backupPreviewText({ count, names, through }) {
  const who =
    count === 1
      ? `This file has 1 athlete: ${names[0]}.`
      : `This file has ${count} athletes: ${names.join(", ")}.`;
  const when = through
    ? ` Plans and logs through ${shortDate(new Date(`${through}T12:00:00`))}.`
    : " It has no plans or logs yet.";
  return `${who}${when} Nothing on this device will be removed.`;
}

export const PERSIST_COPY = {
  granted: "Your browser will keep Nourally's data unless you clear it.",
  denied: "Your browser may still clear data. Save backups.",
  unsupported: "This browser can't promise to keep data. Save backups.",
};
