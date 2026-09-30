import { useState } from "react";
import {
  consumeStock,
  ingredientId,
  ingredientsForMeal,
  portionCalories,
  validPortion,
} from "../../domain/food.js";
import { markPlanLogged } from "../../domain/plans.js";
import { entryTimeFields } from "../../domain/log.js";
import { uid } from "../../domain/storage.js";
import { changeData, useStore } from "../../store.js";
import { useAsyncAction } from "../../hooks/useAsyncAction.js";
import { plural } from "../../format.js";
import { DialogCancel, useReportDirty } from "../../components/Dialog.jsx";
import {
  FieldError,
  FieldErrors,
  FormError,
  Input,
} from "../../components/ui/FieldError.jsx";
import { LabelCheck } from "../../components/ui/LabelCheck.jsx";
import { useWhen, WhenField } from "./PortionSheet.jsx";

export const foodFor = (item) =>
  item.food || {
    id: `manual-${item.id}`,
    name: item.name,
    source: "Manual",
    nutrients: { calories: null },
    nutrientBasis: "g",
    ingredientId: ingredientId(item),
  };

// "Used from At home…": take exact counts from At home for one entry. `only`
// limits the list to the rows the entry matched (LOG-05).
export function UseFromHomeSheet({ entry, only, onDone, onDirty }) {
  const { current } = useStore();
  const { pending, run } = useAsyncAction();
  const [amounts, setAmounts] = useState(() =>
    Object.fromEntries(
      (only || [])
        .filter((row) => row.amount != null)
        .map((row) => [row.id, String(row.amount)]),
    ),
  );
  useReportDirty(JSON.stringify(amounts), onDirty);
  const items = current.data.groceryState.pantry.filter(
    (p) =>
      Number(p.quantity) > 0 &&
      (!p.availability || p.availability === "exact") &&
      (!only || only.some((row) => row.id === p.id)),
  );
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const deductions = Object.entries(amounts).map(([id, amount]) => ({
          id,
          amount: Number(amount),
        }));
        const used = deductions.filter((d) => d.amount > 0).length;
        if (
          await run("consume", () =>
            changeData(
              (data) => consumeStock(data, entry.id, deductions),
              used
                ? `Took ${used} ${plural(used, "food")} from At home.`
                : "Nothing taken from At home.",
            ),
          )
        )
          onDone();
      }}
    >
      <p>How much did you use from home? You can put it back later.</p>
      {!items.length && (
        <p>Nothing at home has a count yet. Set one in At home first.</p>
      )}
      {items.map((item) => (
        <label key={item.id}>
          {item.name} — {item.quantity}{" "}
          {plural(item.quantity, item.unit || "package")} left
          <input
            type="number"
            step="any"
            min="0"
            max={item.quantity}
            value={amounts[item.id] || ""}
            onChange={(e) =>
              setAmounts({ ...amounts, [item.id]: e.target.value })
            }
          />
        </label>
      ))}
      <div className="button-row">
        <button
          aria-busy={pending === "consume" || undefined}
          className="primary"
          disabled={pending === "consume" || !items.length}
        >
          {pending === "consume" ? "Saving…" : "Save"}
        </button>
        <DialogCancel />
      </div>
    </form>
  );
}

// "Changed it": log a plan with the amounts actually eaten (LOG-03).
export function ChangedPlanSheet({ plan, date, todayKey, onDone, onDirty }) {
  const { current } = useStore();
  const { pending, run } = useAsyncAction();
  const isToday = date === todayKey;
  const when = useWhen({
    entry: isToday ? null : plan.eatAt ? { time: plan.eatAt } : null,
    isToday,
  });
  const [ingredients, setIngredients] = useState(() =>
    ingredientsForMeal(
      plan.template,
      current.data.groceryState.pantry,
      date,
    ).map((i) => ({
      ...i,
      amount: i.amount * (plan.servings || 1),
      food: i.matches[0]
        ? foodFor(i.matches[0])
        : {
            name: i.name,
            nutrients: { calories: null },
            nutrientBasis: "g",
            source: "Meal example",
          },
    })),
  );
  const [error, setError] = useState(null);
  useReportDirty(JSON.stringify([ingredients, when.value]), onDirty);
  const update = (index, field, value) =>
    setIngredients((list) =>
      list.map((v, n) => (n === index ? { ...v, [field]: value } : v)),
    );
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const bad = ingredients.findIndex(
          (i) => !validPortion(i.amount, i.unit),
        );
        if (bad >= 0)
          return setError({
            message: "Check each amount and unit.",
            field: `amount-${bad}`,
          });
        if (!isToday && !when.exact && !when.approx)
          return setError({
            message: "Choose about when you ate it.",
            field: "when",
          });
        setError(null);
        const actual = ingredients.map((i) => ({
          name: i.name,
          ingredientId: i.ingredientId,
          food: i.food,
          amount: Number(i.amount),
          unit: i.unit,
          calories: portionCalories(i.food, i.amount, i.unit),
        }));
        const entry = {
          id: uid(),
          name: plan.template.name,
          date,
          ...entryTimeFields({ date, todayKey, ...when.value }),
          calories: actual.every((i) => i.calories != null)
            ? actual.reduce((n, i) => n + i.calories, 0)
            : null,
          ingredients: actual,
          mealPlanId: plan.id,
          source: "Planned food",
          createdAt: new Date().toISOString(),
        };
        const ok = await run("meal-log", () =>
          changeData((data) => {
            const day = data.dailyLogs[date] || { entries: [], water: 0 };
            day.entries.push(structuredClone(entry));
            data.dailyLogs[date] = day;
            markPlanLogged(data, plan.id, entry.id);
          }, `Logged ${plan.template.name}.`),
        );
        if (ok) onDone(entry);
      }}
    >
      <p>Change the amounts to what you ate.</p>
      <FieldErrors error={error}>
        {ingredients.map((i, index) => (
          <div key={i.ingredientId || index} className="form-grid">
            <label>
              {i.name}
              <Input
                field={`amount-${index}`}
                type="number"
                min="0.01"
                max={["g", "ml"].includes(i.unit) ? 2000 : 100}
                step="any"
                value={i.amount}
                onChange={(e) => update(index, "amount", e.target.value)}
              />
            </label>
            <label>
              Unit
              <select
                value={i.unit}
                onChange={(e) => update(index, "unit", e.target.value)}
              >
                {["g", "ml", "portion", "piece", "package"].map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </label>
            <FieldError field={`amount-${index}`} />
          </div>
        ))}
        <WhenField when={when} isToday={isToday} />
        <LabelCheck />
        <p className="food-source">From your plan</p>
        <FormError />
      </FieldErrors>
      <div className="button-row">
        <button
          aria-busy={pending === "meal-log" || undefined}
          className="primary"
          disabled={pending === "meal-log"}
        >
          {pending === "meal-log" ? "Saving…" : "Log it"}
        </button>
        <DialogCancel />
      </div>
    </form>
  );
}
