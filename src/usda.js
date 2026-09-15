import { portionCalories } from "./domain/food.js";
function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
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
    servingSizeUnit: cleanText(food.servingSizeUnit).toLowerCase() || null,
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
async function json(url, signal) {
  const response = await fetch(url, { signal });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      data.error || "Food lookup unavailable. Try again or add manually.",
    );
  return data;
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
    foods: (data.foods || []).map((food) =>
      normalizeFdcFood({ ...food, catalogSnapshot: data.snapshot || null }),
    ),
  };
}
export async function lookupBarcode(barcode, signal) {
  if (!/^\d{8,14}$/.test(barcode))
    throw new Error("Enter 8–14 barcode digits.");
  const data = await json(`/api/barcode/${barcode}`, signal);
  if (!data.product) throw new Error("No product found. Add it manually.");
  return normalizeOffFood(data.product, barcode);
}
export async function foodDetails(id, signal) {
  return normalizeFdcFood(await json(`/api/foods/${id}`, signal));
}
export const caloriesForServing = (food, amount) =>
  portionCalories(food, amount, "g");
export const USING_FDC_DEMO_KEY = false;
