import HomePage from "../pages/Food/HomePage.jsx";
import IdeasPage from "../pages/Food/IdeasPage.jsx";
import GroceriesPage from "../pages/Food/GroceriesPage.jsx";
import { useEffect, useRef, useState } from "react";
import {
  consumeStock,
  ingredientId,
  ingredientsForMeal,
  makeLog,
  portionCalories,
  removeLogEntry,
  reviseLogEntry,
  stockStatus,
  undoConsumption,
  validPortion,
} from "../domain/food.js";
import { markPlanLogged } from "../domain/plans.js";
import { getDateKey } from "../domain/timing.js";
import { uid } from "../domain/storage.js";
import { changeData, useStore } from "../store.js";
import { useAsyncAction } from "../hooks/useAsyncAction.js";
import { useRoute } from "../routing.js";
import { formatAmount, formatDate, formatTime, plural } from "../format.js";
import { Shell } from "./AppFrame.jsx";
import { Dialog } from "./Dialog.jsx";
import { LabelCheck } from "./ui/LabelCheck.jsx";
import { FoodSearch } from "./FoodSearch.jsx";
import { PortionEditor } from "./PortionEditor.jsx";
import { EmptyState } from "./ui/EmptyState.jsx";

const foodFor = (item) =>
  item.food || {
    id: `manual-${item.id}`,
    name: item.name,
    source: "Manual",
    nutrients: { calories: null },
    nutrientBasis: "g",
    ingredientId: ingredientId(item),
  };
const tabs = [
  ["ideas", "Ideas"],
  ["home", "At home"],
  ["groceries", "Groceries"],
  ["log", "Log"],
];

export default function FoodHub({ now, todayKey }) {
  const { current } = useStore();
  const data = current.data;
  const grocery = data.groceryState;
  const [, navigate, subroute] = useRoute();
  const section = tabs.some(([key]) => key === subroute) ? subroute : "ideas";
  const heading = useRef(null);
  const foodNav = useRef(null);
  const [mealLog, setMealLog] = useState(null);
  useEffect(() => {
    const planId = sessionStorage.getItem("nourally-log-plan");
    if (!planId) return;
    sessionStorage.removeItem("nourally-log-plan");
    const plan = data.mealPlans.find((entry) => entry.id === planId);
    if (plan && plan.status !== "eaten") setMealLog(plan);
  }, [data.mealPlans]);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    foodNav.current
      ?.querySelector(".active")
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [section]);
  const unchecked = grocery.items.filter(
    (i) => !i.checked && i.status !== "bought",
  ).length;
  const lowOrOut = grocery.pantry.filter(
    (i) => stockStatus(i) !== "have",
  ).length;

  return (
    <Shell>
      <section className="dashboard-head">
        <div>
          <h1 className="page-title">Food</h1>
        </div>
      </section>
      <nav className="food-sections" aria-label="Food sections" ref={foodNav}>
        {tabs.map(([key, label]) => (
          <a
            key={key}
            href={`#/food/${key}`}
            aria-current={section === key ? "page" : undefined}
            className={section === key ? "active" : ""}
            onClick={() => navigate(`food/${key}`)}
          >
            {label}
            {key === "groceries" && unchecked > 0 && (
              <span className="tab-badge" aria-label={`, ${unchecked} to buy`}>
                {unchecked}
              </span>
            )}
            {key === "home" && lowOrOut > 0 && (
              <span
                aria-label={`, ${lowOrOut} ${plural(lowOrOut, "item")} low or out`}
              >
                {" "}
                ·
              </span>
            )}
          </a>
        ))}
      </nav>
      <span ref={heading} tabIndex={-1} className="sr-only">
        {tabs.find(([key]) => key === section)[1]}
      </span>

      {section === "home" && <HomePage todayKey={todayKey} />}
      {section === "groceries" && <GroceriesPage todayKey={todayKey} />}
      {section === "ideas" && <IdeasPage now={now} todayKey={todayKey} />}
      {section === "log" && <FoodLog date={todayKey} />}
      {mealLog && (
        <Dialog title="Log the meal you ate" onClose={() => setMealLog(null)}>
          <MealLog
            plan={mealLog}
            date={todayKey}
            onDone={() => {
              setMealLog(null);
              navigate("food/log");
            }}
          />
        </Dialog>
      )}
    </Shell>
  );
}

export function FoodLog({ date }) {
  const { current } = useStore();
  const { pending, run } = useAsyncAction();
  const searchInput = useRef(null);
  const [dialog, setDialog] = useState(null);
  const [query, setQuery] = useState(
    () => sessionStorage.getItem(`food-query-${current.id}`) || "",
  );
  useEffect(() => {
    sessionStorage.setItem(`food-query-${current.id}`, query);
  }, [query, current.id]);
  const log = current.data.dailyLogs[date] || { entries: [] };
  async function save(portion) {
    return run("save-food-log", async () => {
      const ok = await changeData((data) => {
        const entry = makeLog(dialog.food, portion, date, {
          name: portion.name,
        });
        const day = data.dailyLogs[date] || { entries: [], water: 0 };
        if (dialog.entry) {
          const old = day.entries.find((e) => e.id === dialog.entry.id);
          if (!old) throw new Error("This entry was removed in another tab.");
          day.entries = day.entries.map((e) =>
            e.id === old.id ? reviseLogEntry(old, entry) : e,
          );
        } else day.entries.push(entry);
        data.dailyLogs[date] = day;
        data.recentFoods = [
          dialog.food,
          ...data.recentFoods.filter((f) => f.id !== dialog.food.id),
        ].slice(0, 30);
      });
      if (ok) setDialog(null);
      return ok;
    });
  }
  return (
    <section>
      <div className="section-toolbar">
        <p>
          {date === getDateKey() ? "Today · " : ""}
          {formatDate(date)}
        </p>
        <button className="primary small" onClick={() => setDialog({})}>
          Log food
        </button>
      </div>
      <LabelCheck />
      {!log.entries.length && (
        <EmptyState>
          Nothing logged yet. Log a meal or snack when you want to.
        </EmptyState>
      )}
      <div className="data-list">
        {log.entries.map((entry) => (
          <article className="data-row" key={entry.id}>
            <div>
              <h3>{entry.name}</h3>
              <p>
                {entry.portion
                  ? `${formatAmount(entry.portion.amount, entry.portion.unit)} · `
                  : entry.servingGrams
                    ? `${entry.servingGrams} g · `
                    : ""}
                {entry.calories == null
                  ? "Calories unknown"
                  : `${entry.calories} kcal`}
                {entry.userAdjusted ? " · your number" : ""}
                {entry.time ? ` · ${formatTime(entry.time)}` : ""}
              </p>
              <details>
                <summary>Details</summary>
                <LabelCheck />
                {entry.food?.brand && <p>Brand: {entry.food.brand}</p>}
                {entry.food?.retrievedAt && (
                  <p>Nutrition as of {formatDate(entry.food.retrievedAt)}.</p>
                )}
                {entry.ingredients?.map((i, index) => (
                  <p key={index}>
                    {formatAmount(i.amount, i.unit, i.name)} ·{" "}
                    {i.calories == null
                      ? "unknown calories"
                      : `${i.calories} kcal`}
                  </p>
                ))}
                {entry.original && (
                  <p>
                    First logged as {entry.original.name}
                    {entry.original.calories == null
                      ? ""
                      : ` · ${entry.original.calories} kcal`}
                    .
                  </p>
                )}
              </details>
            </div>
            <div className="row-actions">
              <button
                disabled={!!pending}
                onClick={() => setDialog({ food: foodFor(entry), entry })}
              >
                Edit
              </button>
              <button
                disabled={!!pending}
                onClick={() => setDialog({ consume: entry })}
              >
                Use from home
              </button>
              {current.data.operations.some(
                (op) =>
                  op.type === "consume" && op.logId === entry.id && !op.undone,
              ) && (
                <button
                  disabled={!!pending}
                  onClick={() =>
                    run(`restock-${entry.id}`, () =>
                      changeData(
                        (data) => undoConsumption(data, entry.id),
                        "Put the food back at home.",
                      ),
                    )
                  }
                >
                  {pending === `restock-${entry.id}` ? "Saving…" : "Put back"}
                </button>
              )}
              <button
                disabled={!!pending}
                onClick={() =>
                  run(`remove-${entry.id}`, () =>
                    changeData(
                      (data) => removeLogEntry(data, date, entry.id),
                      `Removed ${entry.name}.`,
                    ),
                  )
                }
              >
                {pending === `remove-${entry.id}` ? "Removing…" : "Remove"}
              </button>
            </div>
          </article>
        ))}
      </div>
      {dialog && (
        <Dialog
          initialFocusRef={searchInput}
          className={
            !dialog.food && !dialog.consume ? "food-search-dialog" : ""
          }
          title={
            dialog.consume
              ? "Use food from home"
              : dialog.entry
                ? "Edit food"
                : "Log food"
          }
          onClose={() => setDialog(null)}
        >
          {dialog.consume ? (
            <Consumption
              entry={dialog.consume}
              onDone={() => setDialog(null)}
            />
          ) : dialog.food ? (
            <PortionEditor
              food={dialog.food}
              initial={
                dialog.entry
                  ? {
                      ...dialog.entry,
                      amount:
                        dialog.entry.portion?.amount ||
                        dialog.entry.servingGrams ||
                        1,
                      unit:
                        dialog.entry.portion?.unit ||
                        (dialog.entry.servingGrams ? "g" : "portion"),
                      override:
                        dialog.entry.userAdjusted || !dialog.entry.food
                          ? (dialog.entry.calories ?? "")
                          : "",
                    }
                  : {}
              }
              onSave={save}
              onCancel={() => setDialog(null)}
            />
          ) : (
            <FoodSearch
              searchInputRef={searchInput}
              initialQuery={query}
              onQuery={setQuery}
              onChoose={(food) => setDialog({ ...dialog, food })}
            />
          )}
        </Dialog>
      )}
    </section>
  );
}

function Consumption({ entry, onDone }) {
  const { current } = useStore();
  const { pending, run } = useAsyncAction();
  const [amounts, setAmounts] = useState({});
  const items = current.data.groceryState.pantry.filter(
    (p) =>
      Number(p.quantity) > 0 && (!p.availability || p.availability === "exact"),
  );
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (
          await run("consume", () =>
            changeData((data) =>
              consumeStock(
                data,
                entry.id,
                Object.entries(amounts).map(([id, amount]) => ({
                  id,
                  amount: Number(amount),
                })),
              ),
            ),
          )
        )
          onDone();
      }}
    >
      <p>
        How much did you use from home? Only foods with a count are listed. You
        can put it back later.
      </p>
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
      <button
        aria-busy={pending === "consume" || undefined}
        className="primary"
        disabled={pending === "consume"}
      >
        {pending === "consume" ? "Saving…" : "Save"}
      </button>
    </form>
  );
}

function MealLog({ plan, date, onDone }) {
  const { current } = useStore();
  const { pending, run } = useAsyncAction();
  const [ingredients, setIngredients] = useState(() =>
    ingredientsForMeal(
      plan.template,
      current.data.groceryState.pantry,
      date,
    ).map((i) => ({
      ...i,
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
  const [error, setError] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (ingredients.some((i) => !validPortion(i.amount, i.unit)))
          return setError("Check each amount and unit.");
        const ok = await run("meal-log", () =>
          changeData((data) => {
            const actual = ingredients.map((i) => ({
              name: i.name,
              food: i.food,
              amount: Number(i.amount),
              unit: i.unit,
              calories: portionCalories(i.food, i.amount, i.unit),
            }));
            const day = data.dailyLogs[date] || { entries: [], water: 0 };
            day.entries.push({
              id: uid(),
              name: plan.template.name,
              date,
              time: new Date().toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              }),
              calories: actual.every((i) => i.calories != null)
                ? actual.reduce((n, i) => n + i.calories, 0)
                : null,
              ingredients: actual,
              mealPlanId: plan.id,
              source: "Meal with actual ingredient portions",
              createdAt: new Date().toISOString(),
            });
            data.dailyLogs[date] = day;
            markPlanLogged(data, plan.id, day.entries.at(-1).id);
          }),
        );
        if (ok) onDone();
      }}
    >
      <p>
        Change the amounts to what you ate. Nothing is taken from At home unless
        you choose "Use from home" in the log.
      </p>
      {ingredients.map((i, index) => (
        <div key={i.ingredientId} className="form-grid">
          <label>
            {i.name}
            <input
              type="number"
              min="0.01"
              max={["g", "ml"].includes(i.unit) ? 2000 : 100}
              step="any"
              value={i.amount}
              onChange={(e) =>
                setIngredients((list) =>
                  list.map((v, n) =>
                    n === index ? { ...v, amount: e.target.value } : v,
                  ),
                )
              }
            />
          </label>
          <label>
            Unit
            <select
              value={i.unit}
              onChange={(e) =>
                setIngredients((list) =>
                  list.map((v, n) =>
                    n === index ? { ...v, unit: e.target.value } : v,
                  ),
                )
              }
            >
              {["g", "ml", "portion", "piece", "package"].map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </label>
        </div>
      ))}
      {error && <p role="alert">{error}</p>}
      <button
        aria-busy={pending === "meal-log" || undefined}
        className="primary"
        disabled={pending === "meal-log"}
      >
        {pending === "meal-log" ? "Saving…" : "Log it"}
      </button>
    </form>
  );
}
