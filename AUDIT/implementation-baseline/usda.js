const FDC_API_ROOT = 'https://api.nal.usda.gov/fdc/v1';

function nutrientValue(food, names, units = []) {
  const nutrients = food.foodNutrients || [];
  const nutrient = nutrients.find((item) => (
    names.includes(item.nutrientName)
    && (!units.length || units.includes(String(item.unitName || '').toUpperCase()))
  ));
  const value = Number(nutrient?.value);
  return Number.isFinite(value) ? value : null;
}

function calorieValue(food) {
  const kilocalories = nutrientValue(food, ['Energy'], ['KCAL']);
  if (kilocalories !== null) return kilocalories;

  const kilojoules = nutrientValue(food, ['Energy'], ['KJ']);
  return kilojoules === null ? null : Math.round((kilojoules / 4.184) * 10) / 10;
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function normalizeFdcFood(food) {
  const fdcId = Number(food.fdcId);
  const brand = cleanText(food.brandOwner || food.brandName);
  const name = cleanText(food.description) || 'USDA food';
  const servingSize = Number(food.servingSize);
  const servingSizeUnit = cleanText(food.servingSizeUnit);
  return {
    id: `fdc-${fdcId}`,
    fdcId,
    name,
    displayName: brand ? `${name} — ${brand}` : name,
    brand,
    dataType: cleanText(food.dataType) || 'USDA food',
    category: cleanText(food.foodCategory) || 'USDA FoodData Central',
    barcode: cleanText(food.gtinUpc),
    servingSize: Number.isFinite(servingSize) && servingSize > 0 ? servingSize : null,
    servingSizeUnit: servingSizeUnit || 'g',
    householdServing: cleanText(food.householdServingFullText),
    nutrients: {
      calories: calorieValue(food),
      protein: nutrientValue(food, ['Protein']),
      carbs: nutrientValue(food, ['Carbohydrate, by difference']),
      fat: nutrientValue(food, ['Total lipid (fat)']),
    },
    source: 'USDA FoodData Central',
  };
}

export async function searchFoodDataCentral(query, type = 'all', signal) {
  const cleanQuery = cleanText(query);
  if (cleanQuery.length < 2) throw new Error('Enter at least two letters to search foods.');

  const params = new URLSearchParams({
    api_key: import.meta.env.VITE_FDC_API_KEY || 'DEMO_KEY',
    query: cleanQuery,
    pageSize: '18',
  });
  if (type === 'branded') params.set('dataType', 'Branded');
  if (type === 'generic') params.set('dataType', 'Foundation');

  const response = await fetch(`${FDC_API_ROOT}/foods/search?${params}`, { signal });
  if (!response.ok) {
    if (response.status === 429) throw new Error('USDA search is busy right now. Wait a moment and try again.');
    throw new Error('USDA FoodData Central could not be reached.');
  }
  const payload = await response.json();
  return {
    totalHits: Number(payload.totalHits || 0),
    foods: (payload.foods || []).map(normalizeFdcFood),
  };
}

export function caloriesForServing(food, amount) {
  const per100g = Number(food?.nutrients?.calories);
  const grams = Number(amount || food?.servingSize || 100);
  if (!Number.isFinite(per100g) || !Number.isFinite(grams)) return 0;
  return Math.max(Math.round(per100g * grams / 100), 0);
}

export const USING_FDC_DEMO_KEY = !import.meta.env.VITE_FDC_API_KEY || import.meta.env.VITE_FDC_API_KEY === 'DEMO_KEY';
