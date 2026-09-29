import {
  ALLERGY_TAGS_REVIEWED,
  INGREDIENT_ALLERGENS,
  MAJOR_ALLERGENS,
  MEAL_INGREDIENTS,
} from "./catalog.js";

// Allergy model (P1-09, ADD-03). Every filter here is gated by
// ALLERGY_TAGS_REVIEWED; callers may pass `reviewed` to test both states.

export const ALLERGY_CHOICES = [...MAJOR_ALLERGENS, ["other", "Other"]];
const MAJOR_IDS = MAJOR_ALLERGENS.map(([id]) => id);
const ALLERGY_IDS = ALLERGY_CHOICES.map(([id]) => id);

export const ALLERGY_WAITING =
  "Allergy filtering is waiting for review. Check every label.";
export const SETUP_ALLERGY_LINE =
  "Nourally hides ideas that list your allergies, but always check labels.";
export const OTHER_ALLERGY_LINE =
  "Nourally can't filter other allergies. Check every label.";

export const allergyLabel = (id) =>
  ALLERGY_CHOICES.find(([value]) => value === id)?.[1] || id;

// Valid, de-duplicated allergy ids in the chip order.
export function normalizeAllergies(value) {
  if (!Array.isArray(value)) return [];
  return ALLERGY_IDS.filter((id) => value.includes(id));
}

// The allergies that actually filter: none until the tags are reviewed, and
// never "other", which has no tags.
export function activeAllergies(
  profile = {},
  reviewed = ALLERGY_TAGS_REVIEWED,
) {
  if (!reviewed) return [];
  return normalizeAllergies(profile.allergies).filter((id) =>
    MAJOR_IDS.includes(id),
  );
}

// Tags for one ingredient, or null when it has none (unknown).
export function ingredientAllergens(id) {
  return INGREDIENT_ALLERGENS[id] || null;
}

// Allergens an idea lists through its ingredients. `unknown` names
// ingredients without tags; the filter treats those as a match.
export function ideaAllergens(idea) {
  const allergens = new Set();
  const mayContain = new Set();
  const unknown = [];
  for (const [, id] of MEAL_INGREDIENTS[idea?.id] || []) {
    const tags = ingredientAllergens(id);
    if (!tags) {
      unknown.push(id);
      continue;
    }
    tags.allergens.forEach((a) => allergens.add(a));
    tags.mayContain.forEach((a) => mayContain.add(a));
  }
  if (!MEAL_INGREDIENTS[idea?.id]) unknown.push(idea?.id);
  return {
    allergens: MAJOR_IDS.filter((a) => allergens.has(a)),
    mayContain: MAJOR_IDS.filter((a) => mayContain.has(a) && !allergens.has(a)),
    unknown,
  };
}

const matches = (tags, allergies) =>
  !allergies.length
    ? []
    : !tags
      ? [...allergies]
      : allergies.filter(
          (a) => tags.allergens.includes(a) || tags.mayContain.includes(a),
        );

// Which of these allergies an idea lists (contains or may contain).
export function ideaAllergyMatches(idea, allergies = []) {
  if (!allergies.length) return [];
  const tags = ideaAllergens(idea);
  return tags.unknown.length ? [...allergies] : matches(tags, allergies);
}

// Which of these allergies a grocery catalog item lists.
export function groceryAllergyMatches(item, allergies = []) {
  const tags = Array.isArray(item?.allergens)
    ? { allergens: item.allergens, mayContain: item.mayContain || [] }
    : ingredientAllergens(item?.id);
  return matches(tags, allergies);
}

const joinNames = (names) =>
  names.length <= 1
    ? names.join("")
    : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;

// "Ideas that list peanuts are hidden. Check labels on products."
export function allergyStatusLine(
  profile = {},
  reviewed = ALLERGY_TAGS_REVIEWED,
) {
  if (!reviewed) return ALLERGY_WAITING;
  const active = activeAllergies(profile, reviewed);
  if (!active.length) return "";
  return `Ideas that list ${joinNames(active.map((id) => allergyLabel(id).toLowerCase()))} are hidden. Check labels on products.`;
}

// Legacy "Nut-free" etc. never become an allergy automatically (P1-09).
const LEGACY = [
  ["nutFree", "Nut-free"],
  ["glutenFree", "Gluten-free"],
  ["dairyFree", "Dairy-free"],
];
export function legacyAllergyPrompts(
  profile = {},
  reviewed = ALLERGY_TAGS_REVIEWED,
) {
  const needs = profile.dietaryNeeds || [];
  return LEGACY.filter(([id]) => needs.includes(id)).map(([, label]) =>
    reviewed
      ? `Your earlier ${label} choice no longer filters foods. Choose each allergy under Allergies, and check every label.`
      : `Your earlier ${label} choice no longer filters foods. Review each label and discuss allergy needs with a qualified professional.`,
  );
}

// Open Food Facts allergen tags ("en:milk") as plain names for product views.
const OFF_NAMES = {
  "en:milk": "milk",
  "en:eggs": "eggs",
  "en:fish": "fish",
  "en:crustaceans": "shellfish (crustaceans)",
  "en:molluscs": "molluscs",
  "en:nuts": "tree nuts",
  "en:peanuts": "peanuts",
  "en:gluten": "gluten",
  "en:soybeans": "soy",
  "en:sesame-seeds": "sesame",
  "en:mustard": "mustard",
  "en:celery": "celery",
  "en:lupin": "lupin",
  "en:sulphur-dioxide-and-sulphites": "sulphites",
};
export function offAllergenNames(tags = []) {
  const names = (Array.isArray(tags) ? tags : [])
    .filter((tag) => typeof tag === "string" && tag.trim())
    .map(
      (tag) =>
        OFF_NAMES[tag.toLowerCase()] ||
        tag
          .replace(/^[a-z]{2}:/i, "")
          .replace(/-/g, " ")
          .toLowerCase(),
    );
  return [...new Set(names)];
}

// Product label lines from Open Food Facts data; null when the product has no
// listed allergens. Never implies a product is free of anything.
export function productAllergenText(food) {
  const contains = offAllergenNames(food?.allergenTags);
  const traces = offAllergenNames(food?.traceTags).filter(
    (name) => !contains.includes(name),
  );
  if (!contains.length && !traces.length) return null;
  const parts = [];
  if (contains.length) parts.push(`Label lists: ${joinNames(contains)}.`);
  if (traces.length) parts.push(`May contain: ${joinNames(traces)}.`);
  parts.push("From Open Food Facts; this list may be incomplete.");
  return parts.join(" ");
}
