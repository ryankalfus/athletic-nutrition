import {
  addDays,
  eventsForDate,
  getDateKey,
  getFuelingGuidance,
  isSchoolDay,
  timeToMinutes,
} from "./timing.js";
import { advanceCompletedMoment, ideaAccess, ideasFor } from "./ranking.js";
import { intendedEatTime } from "./plans.js";

// Moment picker ids (IDEA-01) and the timing moment each one ranks for.
export const IDEA_MOMENT_TARGETS = {
  before: "pre",
  after: "recovery",
  tomorrow: "regular",
};

/**
 * Ideas for a picker moment, ranked with the same inputs Today uses (P1-01).
 * Returns the guidance a plan is made from, the ranked ideas, and the exact
 * ideasFor options so callers can explain filters with the same inputs.
 * @param {any} options
 */
export function ideasForMoment(options) {
  const { moment = "now", now, todayKey, data } = options;
  const { profile, schoolSchedule } = data;
  const shared = {
    profile,
    pantry: data.groceryState.pantry,
    favorites: data.favorites,
  };
  const current = advanceCompletedMoment(
    getFuelingGuidance({
      now,
      todayKey,
      events: data.schedule,
      schoolSchedule,
      ...shared,
    }),
    data,
    todayKey,
  );
  const currentInputs = {
    moment: current.moment,
    date: todayKey,
    ...shared,
    ...ideaAccess({
      profile,
      schoolSchedule,
      inSchool: current.inSchool,
      departed: current.departed,
      event: current.event,
    }),
  };
  if (!IDEA_MOMENT_TARGETS[moment])
    return {
      date: todayKey,
      event: current.event,
      guidance: current,
      ideas: current.allIdeas,
      inputs: currentInputs,
    };

  const target = IDEA_MOMENT_TARGETS[moment];
  const date =
    moment === "tomorrow"
      ? getDateKey(addDays(new Date(`${todayKey}T12:00:00`), 1))
      : todayKey;
  const events = eventsForDate(data.schedule, date)
    .slice()
    .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const event =
    date !== todayKey
      ? events[0]
      : moment === "before"
        ? events.find((e) => timeToMinutes(e.startTime) > nowMinutes) ||
          events[0]
        : moment === "after"
          ? events.find((e) => timeToMinutes(e.endTime) > nowMinutes - 90) ||
            events[events.length - 1]
          : events[0];

  // Today is already ranking this moment for this activity: reuse it exactly.
  if (
    date === todayKey &&
    current.moment === target &&
    (current.event?.id ?? null) === (event?.id ?? null)
  )
    return {
      date,
      event,
      guidance: current,
      ideas: current.allIdeas,
      inputs: currentInputs,
    };

  // Otherwise rank with the access that will apply when the food is eaten.
  const eatAt = intendedEatTime({ event, moment: target });
  const eatMinutes = eatAt ? timeToMinutes(eatAt) : null;
  const inSchool =
    eatMinutes != null &&
    isSchoolDay(date, schoolSchedule) &&
    eatMinutes >= timeToMinutes(schoolSchedule.startTime) &&
    eatMinutes < timeToMinutes(schoolSchedule.endTime);
  const context = ideaAccess({ profile, schoolSchedule, inSchool, event });
  const inputs = { moment: target, date, ...shared, ...context };
  return {
    date,
    event,
    guidance: {
      event,
      moment: target,
      date,
      schoolSchedule,
      travelMode: context.travelMode,
      inSchool,
      departed: false,
    },
    ideas: ideasFor(inputs),
    inputs,
  };
}

/**
 * The small tags an idea card shows with an icon (IDEA-02), from the idea's
 * own flags: "Packs well" for portable ideas, then what it needs to stay
 * good or be ready.
 * @param {{portable?: boolean, needsCold?: boolean, needsHeat?: boolean}} idea
 * @returns {{id: "packs"|"no-fridge"|"cold"|"microwave", label: string}[]}
 */
export function ideaTags(idea) {
  return /** @type {{id: "packs"|"no-fridge"|"cold"|"microwave", label: string}[]} */ (
    [
      idea.portable && { id: "packs", label: "Packs well" },
      idea.needsCold
        ? { id: "cold", label: "Keep cold" }
        : { id: "no-fridge", label: "No fridge needed" },
      idea.needsHeat && { id: "microwave", label: "Needs a microwave" },
    ].filter(Boolean)
  );
}

/**
 * One availability chip per ingredient (IDEA-02): what is at home reads as
 * its amount, what is missing reads "Buy: <amount>".
 * @param {{ingredientId: string, displayAmount: string, sufficient: boolean}[]} ingredients
 */
export function availabilityChips(ingredients) {
  return ingredients.map((item) => ({
    id: item.ingredientId,
    have: Boolean(item.sufficient),
    label: item.sufficient ? item.displayAmount : `Buy: ${item.displayAmount}`,
  }));
}
