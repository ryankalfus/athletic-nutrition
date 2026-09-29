import { FOOD_IDEAS } from "./catalog.js";
import { ingredientsForMeal } from "./food.js";

export function rankIdeas(
  ideas,
  { pantry = [], favorites = [], hiddenIdeas = [], date } = {},
) {
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

export function ideasFor({
  moment = "regular",
  date,
  profile = {},
  pantry = [],
  favorites = [],
  access,
  inSchool = false,
  schoolAccess = {},
  travelMode = false,
}) {
  const sources = access ||
    profile.foodSources || ["home", "packed", "cafeteria"];
  const needs = profile.avoid || profile.dietaryNeeds || [];
  const selectedMoment =
    { now: "regular", before: "pre", after: "recovery", tomorrow: "regular" }[
      moment
    ] || moment;
  const ideas = FOOD_IDEAS.filter((idea) => {
    if (!idea.moments.includes(selectedMoment)) return false;
    if (needs.includes("vegan") && !idea.vegan) return false;
    if (needs.includes("vegetarian") && !idea.vegetarian) return false;
    if (needs.includes("dairyFree") && !idea.dairyFree) return false;
    if (needs.includes("glutenFree") && !idea.glutenFree) return false;
    if (
      (profile.lowCostIdeas ?? profile.budget === "save") &&
      idea.cost !== "save"
    )
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
