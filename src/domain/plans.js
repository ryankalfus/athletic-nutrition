import { uid } from "./storage.js";
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
  const old = replaceId && data.mealPlans.find((p) => p.id === replaceId);
  const previousTasks = structuredClone(data.dayPlans[date] || []);
  const plan = {
    id: uid(),
    templateId: idea.id,
    templateVersion: 1,
    template: structuredClone(idea),
    date,
    eventId: guidance.event?.id || null,
    intendedTime: guidance.event?.startTime || "",
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
    } else tasks.push({ ...task, id: uid(), owners: [plan.id], done: false });
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
