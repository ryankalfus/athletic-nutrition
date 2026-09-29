import { DIET_FILTERS, FOOD_IDEAS } from "./catalog.js";
import { ingredientsForMeal } from "./food.js";

// Diet preferences the catalog flags reliably. Allergen-style flags
// (nutFree, glutenFree) are hand-coded and not reviewed per ingredient, so no
// idea is filtered on them until ADD-03 allergen tags exist (P0-06).
export { DIET_FILTERS };
export const UNREVIEWED_ALLERGEN_NEEDS = ["nutFree", "glutenFree"];

export const isMealFavorite = (favorite) =>
  favorite?.source === "Meal example" ||
  FOOD_IDEAS.some((idea) => idea.id === favorite?.id);

// Food search shows saved foods only; saved meal ideas stay on Ideas (IDEA-05).
export const searchableFavorites = (favorites = []) =>
  favorites.filter((favorite) => !isMealFavorite(favorite));

// The food access both Today and Ideas use for a moment (P1-01 shared ranking).
/** @param {any} options */
export function ideaAccess(options) {
  const {
    profile = {},
    schoolSchedule,
    inSchool = false,
    departed = false,
    event,
  } = options;
  const sources = profile.foodSources || [];
  return {
    access: departed
      ? sources.filter((source) => ["packed", "store"].includes(source))
      : inSchool
        ? [
            ...(schoolSchedule?.foodAccess?.cafeteria ? ["cafeteria"] : []),
            ...(sources.includes("packed") ? ["packed"] : []),
          ]
        : sources,
    inSchool,
    schoolAccess: schoolSchedule?.foodAccess || {},
    travelMode:
      ["away", "travel"].includes(event?.location) ||
      Number(event?.travelMinutes || 0) >= 30,
  };
}

export function rankIdeas(ideas, options = {}) {
  /** @type {any} */
  const { pantry = [], favorites = [], hiddenIdeas = [], date } = options;
  const saved = new Set(
    favorites.map((food) => (typeof food === "string" ? food : food.id)),
  );
  return ideas
    .filter((idea) => !hiddenIdeas.includes(idea.id))
    .map((idea, index) => {
      const ingredients = ingredientsForMeal(idea, pantry, date);
      return {
        idea,
        index,
        score:
          (saved.has(idea.id) ? 10000 : 0) +
          (ingredients.length && ingredients.every((i) => i.sufficient)
            ? 1000
            : 0) +
          ingredients.filter((i) => i.sufficient).length * 10 +
          ingredients.filter((i) => i.available).length * 2 +
          (!idea.needsHeat ? 1 : 0),
      };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((item) => item.idea);
}

export const lowCostOn = (profile = {}) =>
  profile.lowCostIdeas ?? profile.budget === "save";

// How many ideas the low-cost setting hides for these inputs (IDEA-08).
/** @param {any} options */
export function lowCostHiddenCount(options) {
  if (!lowCostOn(options.profile)) return 0;
  return (
    ideasFor({ ...options, ignoreLowCost: true }).length -
    ideasFor(options).length
  );
}

/** @param {any} options */
export function ideasFor(options) {
  const {
    moment = "regular",
    date,
    profile = {},
    pantry = [],
    favorites = [],
    access,
    inSchool = false,
    schoolAccess = {},
    travelMode = false,
    ignoreLowCost = false,
  } = options;
  const sources = access ||
    profile.foodSources || ["home", "packed", "cafeteria"];
  const needs = (profile.avoid || profile.dietaryNeeds || []).filter((need) =>
    DIET_FILTERS.includes(need),
  );
  const selectedMoment =
    { now: "regular", before: "pre", after: "recovery", tomorrow: "regular" }[
      moment
    ] || moment;
  const ideas = FOOD_IDEAS.filter((idea) => {
    if (!idea.moments.includes(selectedMoment)) return false;
    if (needs.includes("vegan") && !idea.vegan) return false;
    if (needs.includes("vegetarian") && !idea.vegetarian) return false;
    if (!ignoreLowCost && lowCostOn(profile) && idea.cost !== "save")
      return false;
    const matches = idea.sources.filter((source) => sources.includes(source));
    if (!matches.length || (travelMode && !idea.portable)) return false;
    const cafeteria = inSchool && matches.includes("cafeteria");
    if (inSchool && !cafeteria && idea.needsCold && !schoolAccess.refrigerator)
      return false;
    if (inSchool && !cafeteria && idea.needsHeat && !schoolAccess.microwave)
      return false;
    return true;
  });
  return rankIdeas(ideas, {
    pantry,
    favorites,
    date,
    hiddenIdeas: profile.hiddenIdeas || [],
  });
}

// A completed pre-activity plan moves the next action to the recovery moment.
export function advanceCompletedMoment(guidance, data, date) {
  if (
    !guidance.nextEvent ||
    !data.mealPlans.some(
      (p) =>
        p.date === date &&
        p.eventId === guidance.event?.id &&
        p.status === "eaten" &&
        p.moment !== "recovery",
    )
  )
    return guidance;
  const ideas = ideasFor({
    moment: "recovery",
    date,
    profile: data.profile,
    pantry: data.groceryState.pantry,
    favorites: data.favorites,
    ...ideaAccess({
      profile: data.profile,
      schoolSchedule: data.schoolSchedule,
      inSchool: guidance.inSchool,
      departed: guidance.departed,
      event: guidance.event,
    }),
  });
  return {
    ...guidance,
    moment: "recovery",
    state: "plan_ahead",
    eatAt: guidance.event.endTime,
    title: "Your snack is logged. Plan food for after practice.",
    explanation: "Choose a familiar recovery option for after your activity.",
    allIdeas: ideas,
    ideas: ideas.slice(0, 3),
  };
}
