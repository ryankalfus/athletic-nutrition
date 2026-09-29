import { portionCalories } from "./domain/food.js";
function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}
export function sentenceCaseFoodName(name) {
  const text = cleanText(name);
  return text && text === text.toLocaleUpperCase()
    ? text[0].toLocaleUpperCase() + text.slice(1).toLocaleLowerCase()
    : text;
}
export function collapseFoodMatches(foods) {
  const seen = new Set();
  return foods.filter((food) => {
    const key = `${cleanText(food.name).toLocaleLowerCase()}|${cleanText(food.brand).toLocaleLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function nutrientValue(food, names, units = []) {
  const nutrient = (food.foodNutrients || []).find(
    (item) =>
      names.includes(item.nutrientName || item.nutrient?.name) &&
      (!units.length ||
        units.includes(
          String(item.unitName || item.nutrient?.unitName || "").toUpperCase(),
        )),
  );
  const value = nutrient?.value ?? nutrient?.amount;
  return value != null && Number.isFinite(Number(value)) ? Number(value) : null;
}
export function normalizeFdcFood(food) {
  const kcal = nutrientValue(
    food,
    [
      "Energy",
      "Energy (Atwater General Factors)",
      "Energy (Atwater Specific Factors)",
    ],
    ["KCAL"],
  );
  const kj = nutrientValue(food, ["Energy"], ["KJ"]);
  const brand = cleanText(food.brandOwner || food.brandName);
  const name = cleanText(food.description) || "USDA food";
  return {
    id: `fdc-${food.fdcId}`,
    fdcId: Number(food.fdcId),
    name,
    displayName: brand ? `${name} — ${brand}` : name,
    brand,
    dataType: food.dataType,
    barcode: cleanText(food.gtinUpc),
    source: "USDA FoodData Central",
    retrievedAt: new Date().toISOString(),
    catalogSnapshot: food.catalogSnapshot || null,
    nutrientBasis: "g",
    servingSize: Number(food.servingSize) > 0 ? Number(food.servingSize) : null,
    servingSizeUnit:
      { grm: "g", gram: "g", grams: "g" }[
        cleanText(food.servingSizeUnit).toLowerCase()
      ] ||
      cleanText(food.servingSizeUnit).toLowerCase() ||
      null,
    householdServing: cleanText(food.householdServingFullText),
    nutrients: {
      calories:
        kcal ?? (kj == null ? null : Math.round((kj / 4.184) * 10) / 10),
      protein: nutrientValue(food, ["Protein"]),
      carbs: nutrientValue(food, ["Carbohydrate, by difference"]),
      fat: nutrientValue(food, ["Total lipid (fat)"]),
    },
  };
}
export function normalizeOffFood(item, barcode) {
  const unit = String(item.serving_quantity_unit || "").toLowerCase();
  const value = item.nutriments?.["energy-kcal_100g"];
  const name = item.product_name || "Scanned food";
  const brand = item.brands || "";
  return {
    id: `off-${barcode}`,
    barcode,
    name,
    displayName: brand ? `${name} — ${brand}` : name,
    brand,
    source: "Open Food Facts",
    dataType: "Community product",
    allergenTags: Array.isArray(item.allergens_tags)
      ? item.allergens_tags.filter((tag) => typeof tag === "string")
      : [],
    traceTags: Array.isArray(item.traces_tags)
      ? item.traces_tags.filter((tag) => typeof tag === "string")
      : [],
    retrievedAt: new Date().toISOString(),
    nutrientBasis: unit === "ml" ? "ml" : "g",
    servingSize:
      Number(item.serving_quantity) > 0 ? Number(item.serving_quantity) : null,
    servingSizeUnit: ["g", "ml"].includes(unit) ? unit : null,
    householdServing: item.serving_size || "",
    nutrients: {
      calories:
        value == null || !Number.isFinite(Number(value)) ? null : Number(value),
      protein: item.nutriments?.proteins_100g ?? null,
      carbs: item.nutriments?.carbohydrates_100g ?? null,
      fat: item.nutriments?.fat_100g ?? null,
    },
  };
}
export const OFFLINE_MESSAGE =
  "You're offline. Recent and saved foods still work.";
export const BARCODE_NOT_FOUND =
  "We couldn't find that barcode. Add the food yourself.";
// fetch() rejects with a TypeError when the network is unreachable (SRCH-06).
export class OfflineError extends Error {
  constructor(message = OFFLINE_MESSAGE) {
    super(message);
    this.name = "OfflineError";
  }
}
async function json(url, signal) {
  let response;
  try {
    response = await fetch(url, { signal });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    // A TypeError while the browser reports a connection is an outage, not
    // offline; keep the two messages distinct (SRCH-04, SRCH-06).
    if (
      error instanceof TypeError &&
      !(typeof navigator !== "undefined" && navigator.onLine === true)
    )
      throw new OfflineError();
    throw new Error(
      "Food lookup isn't working right now. Try again or add manually.",
    );
  }
  if (!response.ok) {
    let message =
      url.startsWith("/api/barcode/") && response.status === 404
        ? BARCODE_NOT_FOUND
        : response.status === 429
          ? "Search is busy. Try again in a minute."
          : "Food lookup isn't working right now. Try again or add manually.";
    try {
      const details = await response.json();
      if (
        details?.error &&
        !(url.startsWith("/api/barcode/") && response.status === 404)
      )
        message = details.error;
    } catch {
      // An upstream outage may return an HTML or empty response.
    }
    throw new Error(message);
  }
  return response.json();
}
export async function searchFoodDataCentral(
  query,
  type = "all",
  signal,
  page = 1,
) {
  if (query.trim().length < 2) throw new Error("Enter at least two letters.");
  const data = await json(
    `/api/foods/search?${new URLSearchParams({ q: query.trim(), type, page: String(page) })}`,
    signal,
  );
  return {
    ...data,
    foods: collapseFoodMatches(
      (data.foods || []).map((food) =>
        normalizeFdcFood({ ...food, catalogSnapshot: data.snapshot || null }),
      ),
    ),
  };
}
export async function lookupBarcode(barcode, signal) {
  if (!/^\d{8,14}$/.test(barcode))
    throw new Error("Enter 8–14 barcode digits.");
  const data = await json(`/api/barcode/${barcode}`, signal);
  if (!data.product) throw new Error(BARCODE_NOT_FOUND);
  return normalizeOffFood(data.product, barcode);
}
export async function foodDetails(id, signal) {
  return normalizeFdcFood(await json(`/api/foods/${id}`, signal));
}
export const caloriesForServing = (food, amount) =>
  portionCalories(food, amount, "g");
export const USING_FDC_DEMO_KEY = false;
