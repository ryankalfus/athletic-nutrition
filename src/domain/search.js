// Food search logic shared by the browser and the server gateway (P1-07).
// Pure functions only: the server imports this file for ranking in both the
// local SQLite catalog mode and the live USDA API mode.

export const SEARCH_PAGE_SIZE = 18;
export const SEARCH_DEBOUNCE_MS = 300;
export const MIN_QUERY_LENGTH = 2;

const clean = (value) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

// One word, singular and lower case, so "Bananas" and "banana" compare equal.
function singular(word) {
  if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 4 && /(ches|shes|xes|oes)$/.test(word))
    return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s") && !/(ss|us|is)$/.test(word))
    return word.slice(0, -1);
  return word;
}

/** Lower case, punctuation removed, each word singular. */
export function normalizeFoodText(value) {
  return clean(value)
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map(singular)
    .join(" ");
}

export const isBarcodeQuery = (query) => /^\d{8,14}$/.test(clean(query));

// Company suffixes that do not change which product a brand line names.
const COMPANY_WORDS = new Set([
  "inc",
  "llc",
  "co",
  "corp",
  "corporation",
  "company",
  "ltd",
  "sale",
  "the",
]);
const brandKey = (brand) =>
  normalizeFoodText(brand)
    .split(" ")
    .filter((word) => !COMPANY_WORDS.has(word))
    .join(" ");

/** Near-duplicate key: same name and brand after normalizing (SRCH-02). */
export function foodMatchKey(food) {
  return `${normalizeFoodText(food.name ?? food.description)}|${brandKey(
    food.brand ?? food.brandOwner ?? food.brandName,
  )}`;
}

/** Keep the first of each near-duplicate (same name + brand) in order. */
export function collapseFoodMatches(foods, keyOf = foodMatchKey) {
  const seen = new Set();
  return foods.filter((food) => {
    const key = keyOf(food);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// USDA "SR Legacy", "Foundation" and "Survey (FNDDS)" rows are basic foods;
// "Branded" rows are packaged products.
const isBasic = (food) =>
  food.basic ?? (food.dataType ? food.dataType !== "Branded" : !food.brand);

function describe(food) {
  const name = clean(food.name ?? food.description);
  const segments = name
    .split(",")
    .map((part) => normalizeFoodText(part))
    .filter(Boolean);
  const rest = segments.slice(1);
  const extras = rest.filter((part) => !isPlainDescriptor(part));
  return {
    basic: Boolean(isBasic(food)),
    full: normalizeFoodText(name),
    // The words the name really names: "Gumbo, no rice" names gumbo only.
    named: segments.map(affirmed).filter(Boolean).join(" "),
    first: segments[0] || "",
    rest,
    // Descriptors that change the food ("white", "fried"), not plain ones.
    extras,
    brand: brandKey(food.brand ?? food.brandOwner ?? food.brandName),
    brandName: normalizeFoodText(food.brandName),
    length: name.length,
    source: SOURCE_ORDER[food.dataType] ?? 2,
  };
}

const SOURCE_ORDER = { Foundation: 0, "SR Legacy": 1 };
const words = (text) => (text ? text.split(" ") : []);
// A word that negates the words after it within one name segment.
const NEGATIONS = new Set(["no", "without", "not", "non"]);
/** The part of a name segment before a negation ("no rice" → ""). */
function affirmed(segment) {
  const list = words(segment);
  const stop = list.findIndex((word) => NEGATIONS.has(word));
  return stop < 0 ? segment : list.slice(0, stop).join(" ");
}
// Descriptors that leave a basic food in its everyday form. USDA writes
// "NFS" (not further specified) and "NS as to fat" on the generic FNDDS row.
const PLAIN = new Set([
  "raw",
  "plain",
  "fresh",
  "whole",
  "cooked",
  "nfs",
  "regular",
  "enriched",
  "unenriched",
  "unsalted",
]);
function isPlainDescriptor(part) {
  return (
    PLAIN.has(part) ||
    part.startsWith("ns as to ") ||
    NEGATIONS.has(words(part)[0])
  );
}
const containsAll = (text, needle) => {
  const have = new Set(words(text));
  return words(needle).every((word) => have.has(word));
};
const startsWithWords = (text, needle) =>
  text === needle || text.startsWith(`${needle} `);

// The name does not name the query at all.
const NO_MATCH = 9;

// How closely a basic food's name matches the query (lower is closer):
// 0 the food itself in a plain form ("Rice, cooked, NFS"), 1 the food in
// another form ("Rice, white, cooked"), 3 a food whose name starts with it
// ("Rice cake"), 4 a food that contains it ("Soup, rice").
function basicTier(item, q) {
  if (item.first === q) return item.extras.length ? 1 : 0;
  if (startsWithWords(item.first, q)) return 3;
  if (containsAll(item.named, q)) return 4;
  return NO_MATCH;
}

// How closely a product's name or brand matches the query (lower is closer).
function productTier(item, q) {
  if (item.full === q || item.brand === q || item.brandName === q) return 0;
  if (
    startsWithWords(item.first, q) ||
    startsWithWords(item.brand, q) ||
    startsWithWords(item.brandName, q)
  )
    return 1;
  if (containsAll(`${item.named} ${item.brand} ${item.brandName}`, q)) return 2;
  return NO_MATCH;
}

const tierOf = (item, q) =>
  item.basic ? basicTier(item, q) : productTier(item, q);

/** True when the food's name or brand names the query (not "no rice"). */
export function namesQuery(food, query) {
  return tierOf(describe(food), normalizeFoodText(query)) !== NO_MATCH;
}

/**
 * A query names a brand or product line when no basic food starts with it but
 * a product's name or brand does ("cheerios"), or when it is a barcode.
 */
export function isBrandQuery(foods, query) {
  if (isBarcodeQuery(query)) return true;
  const q = normalizeFoodText(query);
  if (!q) return false;
  const items = foods.map(describe);
  if (items.some((item) => item.basic && basicTier(item, q) <= 3)) return false;
  return items.some((item) => !item.basic && productTier(item, q) <= 1);
}

/**
 * Rank search results: basic foods first, plainest match first, unless the
 * query names a brand or is a barcode (SRCH-01). Works on USDA rows
 * ({description, dataType, brandOwner}) and on normalized foods
 * ({name, brand, dataType}). Ties keep the provider's order.
 */
export function rankFoods(foods, query) {
  const q = normalizeFoodText(query);
  const brandFirst = isBrandQuery(foods, query);
  const scored = foods.map((food, index) => {
    const item = describe(food);
    const closeness = tierOf(item, q);
    // Names that do not name the query ("Gumbo, no rice") sink below all.
    const tier =
      closeness === NO_MATCH
        ? 30
        : closeness + (item.basic === brandFirst ? 10 : 0);
    return { food, index, tier, item };
  });
  // How many basic forms share a descriptor ("Rice, white, ..."): the form
  // USDA lists most often is the everyday one, so "white" rice comes before
  // "black" rice when both are one step from plain.
  const forms = new Map();
  for (const { item } of scored)
    if (item.basic && item.first === q && item.extras.length)
      forms.set(item.extras[0], (forms.get(item.extras[0]) || 0) + 1);
  const common = (item) =>
    item.basic && item.first === q ? forms.get(item.extras[0]) || 0 : 0;
  scored.sort(
    (a, b) =>
      a.tier - b.tier ||
      // Among equally close basic foods, the plainest, most common form with
      // the simplest name reads best; Foundation and SR Legacy rows (fuller
      // nutrient data) before FNDDS survey rows.
      (a.item.basic && b.item.basic
        ? a.item.extras.length - b.item.extras.length ||
          common(b.item) - common(a.item) ||
          a.item.source - b.item.source ||
          a.item.rest.length - b.item.rest.length ||
          a.item.length - b.item.length
        : 0) ||
      a.index - b.index,
  );
  return scored.map(({ food }) => food);
}

/** True when the list already has the query's basic food in a plain form. */
export function hasBasicMatch(foods, query) {
  const q = normalizeFoodText(query);
  return foods
    .map(describe)
    .some((item) => item.basic && basicTier(item, q) === 0);
}

// Common household portions for basic foods, from USDA SR Legacy food
// measures. Shown as a hint and used as the starting amount.
export const BASIC_PORTIONS = {
  apple: ["1 medium", 182],
  banana: ["1 medium", 118],
  orange: ["1 medium", 131],
  grape: ["1 cup", 151],
  rice: ["1 cup cooked", 158],
  pasta: ["1 cup cooked", 140],
  oat: ["1 cup cooked", 234],
  "peanut butter": ["2 tbsp", 32],
  egg: ["1 large", 50],
  bread: ["1 slice", 28],
  milk: ["1 cup", 244],
  yogurt: ["1 container", 170],
  "baby carrot": ["10 carrots", 100],
  pretzel: ["1 oz", 28],
  bagel: ["1 medium", 105],
  "sweet potato": ["1 medium", 114],
  potato: ["1 medium", 173],
  "chicken breast": ["3 oz cooked", 85],
};

const round = (value) => Math.round(value * 10) / 10;

/**
 * The portion hint shown under a result ("1 medium, 118 g"). Prefers the
 * label serving, then a USDA food measure, then the basic-food table.
 * @param {any} food a normalized food
 * @returns {{label: string, amount: number|null, unit: string|null}|null}
 */
export function portionHint(food) {
  const unit = ["g", "ml"].includes(food.servingSizeUnit)
    ? food.servingSizeUnit
    : null;
  const size = Number(food.servingSize) > 0 ? round(food.servingSize) : null;
  const household = clean(food.householdServing);
  if (household && size && unit)
    return { label: `${household}, ${size} ${unit}`, amount: size, unit };
  if (household) return { label: household, amount: null, unit: null };
  if (size && unit)
    return { label: `${size} ${unit} serving`, amount: size, unit };
  const measure = food.portion;
  if (measure?.label && Number(measure.grams) > 0)
    return {
      label: `${measure.label}, ${round(measure.grams)} g`,
      amount: round(measure.grams),
      unit: "g",
    };
  if (isPackagedProduct(food)) return null;
  const first = normalizeFoodText(clean(food.name).split(",")[0]);
  const known = BASIC_PORTIONS[first];
  return known
    ? { label: `${known[0]}, ${known[1]} g`, amount: known[1], unit: "g" }
    : null;
}

/** The one sub-line under a result: "Basic food · 1 medium, 118 g". */
export function resultSubline(food) {
  const hint = portionHint(food);
  const kind = food.brand
    ? `Brand: ${food.brand}`
    : isPackagedProduct(food)
      ? "Packaged food"
      : "Basic food";
  return [kind, hint?.label].filter(Boolean).join(" · ");
}

// Open Food Facts allergen tags ("en:milk") as plain names. Known tags get
// their everyday name; others drop the language prefix and dashes.
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
        OFF_NAMES[tag.trim().toLowerCase()] ||
        tag
          .trim()
          .replace(/^[a-z]{2}:/i, "")
          .replace(/-/g, " ")
          .toLowerCase(),
    );
  return [...new Set(names)].filter(Boolean);
}

/** A packaged product rather than a basic food. */
export function isPackagedProduct(food) {
  return (
    Boolean(food?.brand) ||
    food?.source === "Open Food Facts" ||
    food?.dataType === "Branded"
  );
}

/**
 * The allergen line for a packaged product (SRCH-07, P1-09). The one source
 * of product allergen text: search rows, the barcode result, the portion
 * sheet and grocery sheets all show it through LabelCheck. Basic foods return
 * null; the "Allergies: check every label." line still shows everywhere.
 * @returns {string|null}
 */
export function allergenLine(food) {
  if (!isPackagedProduct(food)) return null;
  const listed = offAllergenNames(food.allergenTags);
  const traces = offAllergenNames(food.traceTags).filter(
    (name) => !listed.includes(name),
  );
  if (!listed.length && !traces.length) return "Allergens: check the package.";
  return [
    listed.length ? `Allergens listed: ${listed.join(", ")}.` : "",
    traces.length ? `May contain: ${traces.join(", ")}.` : "",
    "This list may be incomplete. Check the package.",
  ]
    .filter(Boolean)
    .join(" ");
}

/** The quiet source line in the portion sheet (SRCH-03, LOG-06). */
export function sourceLine(food) {
  const source = food?.source || "";
  if (source.startsWith("USDA")) return "From USDA food data";
  if (source === "Open Food Facts")
    return "From Open Food Facts (community data)";
  if (source === "Meal example" || source === "Planned food")
    return "From your plan";
  return "Added by you";
}

/**
 * When to run a search for the current text (SRCH-01): after 300 ms of no
 * typing with the local catalog, or only on Enter in API fallback mode, which
 * protects the limited USDA key.
 * @param {string} query
 * @param {{mode?: "local"|"api", submitted?: boolean, offline?: boolean}} options
 * @returns {{run: boolean, delay: number}}
 */
export function searchSchedule(query, options = {}) {
  const { mode = "api", submitted = false, offline = false } = options;
  if (offline || clean(query).length < MIN_QUERY_LENGTH)
    return { run: false, delay: 0 };
  if (submitted) return { run: true, delay: 0 };
  return mode === "local"
    ? { run: true, delay: SEARCH_DEBOUNCE_MS }
    : { run: false, delay: 0 };
}

/**
 * A trailing debounce with injectable timers for tests.
 * @param {(...args: any[]) => void} fn
 * @param {number} wait
 */
export function debounce(
  fn,
  wait = SEARCH_DEBOUNCE_MS,
  timers = { set: setTimeout, clear: clearTimeout },
) {
  let timer = null;
  const debounced = (...args) => {
    if (timer != null) timers.clear(timer);
    timer = timers.set(() => {
      timer = null;
      fn(...args);
    }, wait);
  };
  debounced.cancel = () => {
    if (timer != null) timers.clear(timer);
    timer = null;
  };
  return debounced;
}
