import { uid } from "./storage.js";
import { ingredientsForMeal } from "./food.js";
import { planTasksForIdea } from "./timing.js";
export const profileSignature = (profile) =>
  JSON.stringify([
    profile.budget,
    [...profile.dietaryNeeds].sort(),
    [...profile.foodSources].sort(),
  ]);
export function planMeal(
  data,
  idea,
  date,
  guidance,
  replaceId = null,
  servings = 1,
) {
  if (!Number.isFinite(servings) || servings <= 0 || servings > 100)
    throw new Error("Choose 1–100 servings.");
  const existing =
    !replaceId &&
    data.mealPlans.find(
      (p) =>
        p.date === date &&
        p.templateId === idea.id &&
        p.eventId === (guidance.event?.id || null) &&
        p.moment === (guidance.moment || "regular") &&
        p.status !== "eaten",
    );
  if (existing) return existing;
  const old = replaceId && data.mealPlans.find((p) => p.id === replaceId);
  const previousTasks = structuredClone(data.dayPlans[date] || []);
  const plan = {
    id: uid(),
    templateId: idea.id,
    templateVersion: 1,
    template: structuredClone(idea),
    date,
    eventId: guidance.event?.id || null,
    intendedTime: intendedEatTime(guidance),
    eatAt: intendedEatTime(guidance),
    eventStartTime: guidance.event?.startTime || "",
    moment: guidance.moment || "regular",
    packedAt: null,
    eatenAt: null,
    logEntryId: null,
    servings,
    profileSignature: profileSignature(data.profile),
    createdAt: new Date().toISOString(),
    status: "planned",
    context: {
      travelMode: !!guidance.travelMode,
      inSchool: !!guidance.inSchool,
    },
  };
  data.mealPlans = [...data.mealPlans.filter((p) => p.id !== replaceId), plan];
  let tasks = (data.dayPlans[date] || [])
    .filter(
      (t) =>
        !replaceId ||
        !t.owners?.includes(replaceId) ||
        t.owners.length > 1 ||
        t.independent,
    )
    .map((t) => ({
      ...t,
      owners: (t.owners || []).filter((id) => id !== replaceId),
    }))
    .filter((t) => !old || t.foodId !== old.templateId || t.owners.length);
  for (const task of planTasksForIdea(idea, guidance)) {
    const existing = tasks.find((t) => t.label === task.label);
    if (existing) {
      if (!existing.owners?.length) existing.independent = true;
      existing.owners = [...(existing.owners || []), plan.id];
    } else
      tasks.push({
        ...task,
        id: uid(),
        planId: plan.id,
        owners: [plan.id],
        done: false,
      });
  }
  data.dayPlans[date] = tasks;
  data.operations.push({
    id: uid(),
    type: "plan",
    planId: plan.id,
    previous: old || null,
    previousTasks,
    date,
  });
  return plan;
}
export function undoPlan(data, planId) {
  const op = data.operations.find(
    (o) => o.type === "plan" && o.planId === planId && !o.undone,
  );
  if (!op) return;
  data.mealPlans = data.mealPlans.filter((p) => p.id !== planId);
  if (op.previous) data.mealPlans.push(op.previous);
  data.dayPlans[op.date] = (data.dayPlans[op.date] || [])
    .filter(
      (t) =>
        !t.owners?.includes(planId) || t.owners.length > 1 || t.independent,
    )
    .map((t) => ({
      ...t,
      owners: (t.owners || []).filter((id) => id !== planId),
    }));
  if (op.previous) {
    for (const task of (
      op.previousTasks ||
      planTasksForIdea(op.previous.template, op.previous.context)
    ).filter((t) => !t.owners || t.owners.includes(op.previous.id))) {
      const existing = data.dayPlans[op.date].find(
        (t) => t.label === task.label,
      );
      if (existing) existing.owners.push(op.previous.id);
      else
        data.dayPlans[op.date].push({
          ...task,
          id: uid(),
          owners: [op.previous.id],
          done: task.done || false,
        });
    }
  }
  op.undone = true;
}
export function intendedEatTime(guidance) {
  if (guidance.eatAt) return guidance.eatAt;
  if (!guidance.event?.startTime) return "";
  const [hour, minute] = guidance.event.startTime.split(":").map(Number);
  const total =
    guidance.moment === "recovery"
      ? guidance.event.endTime
          .split(":")
          .reduce((n, v, i) => n + Number(v) * (i ? 1 : 60), 0)
      : Math.max(0, hour * 60 + minute - 90);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
export function markPlanLogged(
  data,
  planId,
  logEntryId = null,
  at = new Date().toISOString(),
) {
  const plan = data.mealPlans.find((item) => item.id === planId);
  if (!plan) throw new Error("This food plan was removed on another screen.");
  plan.status = "eaten";
  plan.eatenAt = at;
  plan.logEntryId = logEntryId;
}
export function markPlanPacked(data, planId, at = new Date().toISOString()) {
  const plan = data.mealPlans.find((item) => item.id === planId);
  if (!plan) throw new Error("This food plan was removed on another screen.");
  if (plan.status === "eaten") throw new Error("This plan was already eaten.");
  for (const task of data.dayPlans[plan.date] || []) {
    if (task.kind === "food" && task.owners?.includes(plan.id))
      task.done = true;
  }
  plan.status = "packed";
  plan.packedAt = at;
}
export function syncPlanPreparation(data, date, at = new Date().toISOString()) {
  for (const plan of data.mealPlans.filter(
    (item) => item.date === date && item.status !== "eaten",
  )) {
    const foodTasks = (data.dayPlans[date] || []).filter(
      (task) => task.kind === "food" && task.owners?.includes(plan.id),
    );
    if (foodTasks.length && foodTasks.every((task) => task.done)) {
      plan.status = "packed";
      plan.packedAt ||= at;
    } else if (plan.status === "packed") {
      plan.status = "planned";
      plan.packedAt = null;
    }
  }
}
export function logPlanAsEaten(data, planId, now = new Date()) {
  const plan = data.mealPlans.find((item) => item.id === planId);
  if (!plan) throw new Error("This food plan was removed on another screen.");
  const day = data.dailyLogs[plan.date] || { entries: [], water: 0 };
  const existing = day.entries.find((entry) => entry.mealPlanId === planId);
  if (existing) return existing;
  const entry = {
    id: uid(),
    name: plan.template.name,
    date: plan.date,
    time: now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }),
    createdAt: now.toISOString(),
    mealPlanId: plan.id,
    ingredients: ingredientsForMeal(
      plan.template,
      data.groceryState.pantry,
      plan.date,
    ).map((ingredient) => ({
      name: ingredient.name,
      ingredientId: ingredient.ingredientId,
      amount: ingredient.amount * plan.servings,
      unit: ingredient.unit,
    })),
    calories: null,
    source: "Planned food",
  };
  day.entries.push(entry);
  data.dailyLogs[plan.date] = day;
  markPlanLogged(data, plan.id, entry.id, now.toISOString());
  return entry;
}
