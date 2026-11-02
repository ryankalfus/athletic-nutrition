// Food art (UX-CMP-23, owner decision A): every catalog ingredient, grocery
// item and idea maps to one Fluent Emoji flat SVG in src/assets/food-art.
// An idea shows its first ingredient. Foods with no match (search results,
// custom foods) get a letter tile. tests/foodArt.test.js proves every file
// exists.
import { FOOD_IDEAS, GROCERY_CATALOG, MEAL_INGREDIENTS } from "./catalog.js";

// Ingredient key (MEAL_INGREDIENTS, GROCERY_CATALOG ids) → file name.
export const FOOD_ART = {
  apples: "red_apple_flat.svg",
  applesauce: "green_apple_flat.svg",
  "baby-carrots": "carrot_flat.svg",
  bananas: "banana_flat.svg",
  beans: "canned_food_flat.svg",
  bread: "bread_flat.svg",
  cereal: "bowl_with_spoon_flat.svg",
  "cheese-sticks": "cheese_wedge_flat.svg",
  chicken: "poultry_leg_flat.svg",
  chickpeas: "beans_flat.svg",
  "chocolate-milk": "glass_of_milk_flat.svg",
  crackers: "cookie_flat.svg",
  "dried-fruit": "strawberry_flat.svg",
  edamame: "pea_pod_flat.svg",
  eggs: "egg_flat.svg",
  "fig-bars": "moon_cake_flat.svg",
  "frozen-berries": "blueberries_flat.svg",
  "fruit-cups": "peach_flat.svg",
  granola: "sheaf_of_rice_flat.svg",
  grapes: "grapes_flat.svg",
  hummus: "falafel_flat.svg",
  jam: "jar_flat.svg",
  juice: "beverage_box_flat.svg",
  oats: "bowl_with_spoon_flat.svg",
  pasta: "spaghetti_flat.svg",
  pita: "flatbread_flat.svg",
  pretzels: "pretzel_flat.svg",
  rice: "cooked_rice_flat.svg",
  "rice-cakes": "rice_cracker_flat.svg",
  salsa: "tomato_flat.svg",
  "seed-mix": "chestnut_flat.svg",
  "soy-milk": "glass_of_milk_flat.svg",
  "soy-yogurt": "custard_flat.svg",
  "sports-drink": "cup_with_straw_flat.svg",
  sunbutter: "sunflower_flat.svg",
  tofu: "butter_flat.svg",
  tortillas: "burrito_flat.svg",
  "tuna-pouches": "fish_flat.svg",
  turkey: "sandwich_flat.svg",
  yogurt: "custard_flat.svg",
};

/** The art file for an ingredient or grocery key, or null. */
export function artForFood(key) {
  return FOOD_ART[key] || null;
}

/** The art file for an idea: its first ingredient's, or null. */
export function artForIdea(ideaId) {
  const first = MEAL_INGREDIENTS[ideaId]?.[0];
  return first ? artForFood(first[1]) : null;
}

/** The letter tile's text for a food with no art: its first letter. */
export function foodInitial(name) {
  const letter = String(name || "")
    .trim()
    .match(/\p{L}/u);
  return letter ? letter[0].toUpperCase() : "?";
}

/** Every key the catalog needs art for (for the test). */
export function foodArtKeys() {
  const keys = new Set(GROCERY_CATALOG.map((item) => item.id));
  for (const list of Object.values(MEAL_INGREDIENTS))
    for (const [, key] of list) keys.add(key);
  return [...keys];
}

export function foodArtIdeaIds() {
  return FOOD_IDEAS.map((idea) => idea.id);
}
