import { useEffect, useRef, useState } from "react";
import { GROCERY_CATALOG, GROCERY_GOALS } from "../domain/catalog.js";
import {
  addDays,
  eventsForDate,
  getDateKey,
  getFuelingGuidance,
  planTasksForIdea,
} from "../domain/timing.js";
import {
  acceptRecommendations,
  consumeStock,
  groceryPreview,
  ingredientId,
  ingredientsForMeal,
  knownMoney,
  makeLog,
  missingGroceries,
  portionCalories,
  purchase,
  sameProduct,
  undoConsumption,
  undoPurchase,
  usable,
  validPortion,
} from "../domain/food.js";
import { planMeal, profileSignature, undoPlan } from "../domain/plans.js";
import { uid } from "../domain/storage.js";
import { changeData, useStore } from "../store.js";
import { useRoute } from "../routing.js";
import { AppNavigation, Shell } from "./AppFrame.jsx";
import { Dialog } from "./Dialog.jsx";
import { FoodSearch } from "./FoodSearch.jsx";
import { PortionEditor } from "./PortionEditor.jsx";

const money = (value) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value,
  );
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
  ["overview", "Overview"],
  ["pantry", "At home"],
  ["groceries", "Groceries"],
  ["meals", "Meals"],
  ["log", "Food log"],
];

export default function FoodHub({ now, todayKey, onNavigate }) {
  const { current } = useStore();
  const data = current.data;
  const grocery = data.groceryState;
  const [, navigate, subroute] = useRoute();
  const section = tabs.some(([key]) => key === subroute)
    ? subroute
    : "overview";
  const heading = useRef(null);
  const foodNav = useRef(null);
  const [dialog, setDialog] = useState(null);
  const [query, setQuery] = useState(
    () => sessionStorage.getItem(`food-query-${current.id}`) || "",
  );
  useEffect(() => {
    sessionStorage.setItem(`food-query-${current.id}`, query);
  }, [query, current.id]);
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState(null);
  const [selected, setSelected] = useState([]);
  const [budget, setBudget] = useState(grocery.budgetAmount ?? "");
  const [tripDate, setTripDate] = useState(grocery.lastShopDate || "");
  const [replaceId, setReplaceId] = useState("");
  const [mealLimit, setMealLimit] = useState(6);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    foodNav.current
      ?.querySelector(".active")
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [section]);
  useEffect(() => {
    setBudget(grocery.budgetAmount ?? "");
    setTripDate(grocery.lastShopDate || "");
  }, [grocery.budgetAmount, grocery.lastShopDate]);
  const guidance = getFuelingGuidance({
    now,
    todayKey,
    events: data.schedule,
    schoolSchedule: data.schoolSchedule,
    profile: data.profile,
  });
  const candidates = guidance.allIdeas;
  const meals = candidates
    .map((idea) => ({
      idea,
      ingredients: ingredientsForMeal(idea, grocery.pantry, todayKey),
    }))
    .sort((a, b) => {
      const score = (meal) =>
        (meal.ingredients.every((i) => i.sufficient) ? 1000 : 0) +
        meal.ingredients.filter((i) => i.sufficient).length * 10 +
        meal.ingredients.filter((i) => i.available).length * 2 +
        (data.favorites.some((f) => f.id === meal.idea.id) ? 3 : 0) +
        (!meal.idea.needsHeat ? 1 : 0);
      return score(b) - score(a);
    });
  const plans = data.mealPlans.filter((p) => p.date === todayKey);
  const totals = knownMoney(grocery.items);
  const upcoming = Array.from({ length: 7 }, (_, i) =>
    eventsForDate(
      data.schedule,
      getDateKey(addDays(new Date(`${todayKey}T12:00:00`), i)),
    ),
  ).flat();
  const low = grocery.pantry.filter(
    (p) =>
      p.availability === "low" ||
      !usable(p, todayKey) ||
      Number(p.quantity) <= Number(p.lowThreshold ?? 0),
  );
  const openAdd = (destination) => setDialog({ destination });
  async function saveFood(portion) {
    const { destination, food, item, substitute } = dialog;
    const ok = await changeData((draft) => {
      draft.recentFoods = [
        food,
        ...draft.recentFoods.filter((f) => f.id !== food.id),
      ].slice(0, 30);
      const fields = {
        ...portion,
        quantity: portion.amount,
        priceKind: portion.price == null ? null : "user-entered",
        food,
        updatedDate: todayKey,
      };
      delete fields.amount;
      delete fields.override;
      const list = destination === "pantry" ? "pantry" : "items";
      if (item) {
        const existing = draft.groceryState[list].find((i) => i.id === item.id);
        if (!existing)
          throw new Error(
            "This item was removed in another tab. Add it again instead.",
          );
        Object.assign(
          existing,
          fields,
          substitute
            ? {
                requirement: item.requirement || {
                  name: item.name,
                  ingredientId: ingredientId(item),
                  quantity: item.quantity,
                  unit: item.unit,
                },
              }
            : {},
        );
      } else {
        const existing = draft.groceryState[list].find(
          (i) =>
            sameProduct(i, fields) &&
            i.unit === portion.unit &&
            i.packageAmount === portion.packageAmount &&
            i.expiry === portion.expiry &&
            i.location === portion.location,
        );
        if (existing)
          existing.quantity = Number(existing.quantity) + portion.amount;
        else
          draft.groceryState[list].push({
            id: uid(),
            ...fields,
            status: "list",
            origin: food.source === "Manual" ? "manual" : "search",
          });
      }
    });
    if (ok) {
      setDialog(null);
      setNotice("Saved.");
    }
  }
  function buildPreview() {
    const goals = [
      grocery.goal,
      ...(upcoming.length ? ["practice-fuel", "recovery-meals"] : []),
      ...(upcoming.some((e) => ["away", "travel"].includes(e.location))
        ? ["away-game"]
        : []),
    ];
    const candidates = GROCERY_CATALOG.filter(
      (item) =>
        goals.some((goal) => item.goals.includes(goal)) &&
        data.profile.dietaryNeeds.every((need) => item[need]),
    ).sort(
      (a, b) =>
        Number(b.goals.includes(grocery.goal)) -
          Number(a.goals.includes(grocery.goal)) || a.price - b.price,
    );
    const result = groceryPreview(
      grocery,
      candidates.map((item) => {
        const matchingEvent = item.goals.includes("away-game")
          ? upcoming.find((event) =>
              ["away", "travel"].includes(event.location),
            )
          : item.goals.some((goal) =>
                ["practice-fuel", "recovery-meals"].includes(goal),
              )
            ? upcoming[0]
            : null;
        return {
          ...item,
          activityReason: matchingEvent
            ? `Useful around ${matchingEvent.title} (${matchingEvent.date})${["away", "travel"].includes(matchingEvent.location) ? " — pack for travel" : ""}`
            : "For your selected shopping goal and regular meals",
        };
      }),
    );
    setPreview(result);
    setSelected(result.additions.map((i) => i.id));
  }
  async function acceptPreview() {
    const ok = await changeData((draft) => {
      const additions = preview.additions.filter((i) =>
        selected.includes(i.id),
      );
      const next = acceptRecommendations(draft.groceryState, additions);
      const amount = knownMoney(next.items);
      if (
        next.budgetAmount != null &&
        (amount.unknown || amount.subtotal > Number(next.budgetAmount))
      )
        throw new Error(
          "Budget or prices changed. Close and regenerate the preview.",
        );
      draft.groceryState = next;
    });
    if (ok) {
      setPreview(null);
      setNotice("Selected suggestions added. Existing items kept.");
    }
  }
  const remove = (list, id) =>
    changeData((draft) => {
      const item = draft.groceryState[list].find((i) => i.id === id);
      draft.operations.push({ id: uid(), type: "remove-food", list, item });
      draft.groceryState[list] = draft.groceryState[list].filter(
        (i) => i.id !== id,
      );
    });
  const latestRemove = [...data.operations]
    .reverse()
    .find((o) => o.type === "remove-food" && !o.undone);
  const addMissing = (idea) =>
    changeData((draft) => {
      const required = ingredientsForMeal(
        idea,
        draft.groceryState.pantry,
        todayKey,
      );
      const additions = missingGroceries(required, draft.groceryState.items);
      draft.groceryState.items.push(...additions);
      setNotice(
        additions.length
          ? `${additions.length} missing ingredients added. Prices need confirmation.`
          : "Already queued or stocked. Confirm approximate amounts before adding more.",
      );
    });

  return (
    <Shell eyebrow="NOURALLY / FOOD">
      <section className="dashboard-head">
        <div>
          <p className="kicker">YOUR FOOD WORKSPACE</p>
          <h1>Food</h1>
        </div>
        <AppNavigation active="food" onNavigate={onNavigate} />
      </section>
      <nav className="food-sections" aria-label="Food workspace" ref={foodNav}>
        {tabs.map(([key, label]) => (
          <button
            key={key}
            aria-current={section === key ? "page" : undefined}
            className={section === key ? "active" : ""}
            onClick={() => navigate(`food/${key}`)}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="section-toolbar">
        <h2 ref={heading} tabIndex={-1}>
          {tabs.find(([key]) => key === section)[1]}
        </h2>
        {["pantry", "groceries"].includes(section) && (
          <button className="primary small" onClick={() => openAdd(section)}>
            + Add food
          </button>
        )}
      </div>
      <p role="status" className="status-line">
        {notice}
      </p>
      {latestRemove && (
        <button
          className="text-button"
          onClick={() =>
            changeData((draft) => {
              const op = draft.operations.find((o) => o.id === latestRemove.id);
              if (op && !op.undone) {
                if (
                  !draft.groceryState[op.list].some((i) => i.id === op.item.id)
                )
                  draft.groceryState[op.list].push(op.item);
                op.undone = true;
              }
            })
          }
        >
          Undo removal of {latestRemove.item?.name}
        </button>
      )}

      {section === "overview" && (
        <div className="food-overview-grid">
          <article className="card">
            <p className="kicker">UP NEXT</p>
            <h3>{plans[0]?.template.name || guidance.title}</h3>
            <p>{guidance.timing}</p>
            <button onClick={() => navigate("food/meals")}>
              {plans.length ? "Review meal & prep" : "Choose a meal"}
            </button>
          </article>
          <article className="card">
            <h3>{low.length} low, out, or past use-by</h3>
            <p>
              {low
                .slice(0, 3)
                .map((i) => i.name)
                .join(", ") || "Your tracked stock looks up to date."}
            </p>
            <button onClick={() => navigate("food/pantry")}>
              Review at home
            </button>
          </article>
          <article className="card">
            <h3>{grocery.items.length} items to shop</h3>
            <p>
              {money(totals.subtotal)} known subtotal
              {totals.unknown ? ` · ${totals.unknown} need prices` : ""}
            </p>
            <button onClick={() => navigate("food/groceries")}>
              Open groceries
            </button>
          </article>
          <article className="card">
            <h3>
              {data.dailyLogs[todayKey]?.entries.length || 0} food check-ins
              today
            </h3>
            <p>
              {data.dailyLogs[todayKey]?.entries.at(-1)?.name ||
                "Capture what you ate, with optional nutrition details."}
            </p>
            <button onClick={() => navigate("food/log")}>Open food log</button>
          </article>
        </div>
      )}

      {section === "pantry" && (
        <>
          <p className="muted">
            Track exact quantities or use Some / Low / Out. Ingredient
            relationships are explicit, not guessed from similar product names.
          </p>
          {!grocery.pantry.length && (
            <div className="empty-state">
              <h3>Start with what is already at home</h3>
              <p>
                Add staples like bread, peanut butter, or fruit. Groceries
                marked bought will appear here too.
              </p>
              <button onClick={() => openAdd("pantry")}>
                Add your first food
              </button>
            </div>
          )}
          <div className="data-list">
            {grocery.pantry.map((item) => (
              <article className="data-row" key={item.id}>
                <div>
                  <h3>{item.name}</h3>
                  <p>
                    {item.availability && item.availability !== "exact"
                      ? item.availability
                      : `${item.quantity} ${item.unit || "package"}`}{" "}
                    · {item.location || "pantry"}
                    {item.packageAmount
                      ? ` · ${item.packageAmount} ${item.packageUnit} per package`
                      : ""}
                  </p>
                  <p>
                    {ingredientId(item)
                      ? `Ingredient: ${ingredientId(item).replaceAll("-", " ")}`
                      : "Ingredient unresolved — edit to connect to meals"}
                    {item.expiry
                      ? ` · Use by ${item.expiry}${item.expiry < todayKey ? " (past date)" : ""}`
                      : ""}
                    {item.updatedDate ? ` · Updated ${item.updatedDate}` : ""}
                  </p>
                  {item.notes && <p>{item.notes}</p>}
                </div>
                <div className="row-actions">
                  <button
                    onClick={() =>
                      setDialog({
                        destination: "pantry",
                        food: foodFor(item),
                        item,
                      })
                    }
                  >
                    Edit
                  </button>
                  <button
                    onClick={() =>
                      changeData((draft) => {
                        const p = draft.groceryState.pantry.find(
                          (p) => p.id === item.id,
                        );
                        if (p) {
                          p.availability =
                            p.availability === "out" ? "some" : "out";
                          p.updatedDate = todayKey;
                        }
                      })
                    }
                  >
                    {item.availability === "out" ? "Some left" : "Mark out"}
                  </button>
                  <button
                    onClick={() => remove("pantry", item.id)}
                    aria-label={`Remove ${item.name}`}
                  >
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {section === "groceries" && (
        <>
          <div className="budget-banner">
            <div>
              <h3>{money(totals.subtotal)} known subtotal</h3>
              <p>
                {totals.unknown
                  ? `${totals.unknown} unpriced items — total and remaining budget are incomplete.`
                  : grocery.budgetAmount == null
                    ? "No budget limit set."
                    : `${money(Math.max(grocery.budgetAmount - totals.subtotal, 0))} remaining estimate${totals.subtotal > grocery.budgetAmount ? ` · ${money(totals.subtotal - grocery.budgetAmount)} over budget` : ""}`}
              </p>
            </div>
            <button onClick={buildPreview}>Suggest groceries</button>
          </div>
          <p className="muted">
            {upcoming.length
              ? `${upcoming.length} upcoming activities in 7 days inform packable fuel and recovery basics.`
              : "No upcoming sports saved. Suggestions use your selected shopping goal."}{" "}
            Estimates are not live store prices. The cart is an in-app
            checklist, not retailer checkout.
          </p>
          <details className="settings-details">
            <summary>Budget, shopping goal & last trip</summary>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (
                  budget !== "" &&
                  (!Number.isFinite(Number(budget)) || Number(budget) < 0)
                )
                  return setNotice(
                    "Budget must be zero or greater, or blank for no limit.",
                  );
                if (tripDate && tripDate > todayKey)
                  return setNotice("Last trip cannot be in the future.");
                if (
                  await changeData((draft) => {
                    draft.groceryState.budgetAmount =
                      budget === "" ? null : Number(budget);
                    draft.groceryState.lastShopDate = tripDate;
                    draft.groceryState.recency = "";
                  })
                )
                  setNotice("Shopping settings saved.");
              }}
            >
              <div className="form-grid">
                <label>
                  Budget for this shop ($)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                  />
                </label>
                <label>
                  Last grocery trip
                  <input
                    type="date"
                    max={todayKey}
                    value={tripDate}
                    onChange={(e) => setTripDate(e.target.value)}
                  />
                </label>
              </div>
              <p>
                Blank budget means no limit. $0 means no spending. Future trip
                dates cannot be saved.
              </p>
              <button>Save shopping settings</button>
            </form>
            <label>
              Approximate last trip
              <select
                value={grocery.recency || ""}
                onChange={(e) =>
                  changeData((draft) => {
                    draft.groceryState.recency = e.target.value;
                    draft.groceryState.lastShopDate = "";
                  })
                }
              >
                <option value="">Use exact date / unknown</option>
                <option value="this-week">Sometime this week</option>
                <option value="last-week">Sometime last week</option>
                <option value="longer">More than two weeks ago</option>
              </select>
            </label>
            <label>
              Shopping goal
              <select
                value={grocery.goal}
                onChange={(e) =>
                  changeData((draft) => {
                    draft.groceryState.goal = e.target.value;
                  })
                }
              >
                {GROCERY_GOALS.map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.label}
                  </option>
                ))}
              </select>
            </label>
          </details>
          {grocery.recommendationsUndo && (
            <button
              className="text-button"
              onClick={() =>
                changeData((draft) => {
                  const ids = draft.groceryState.recommendationsUndo?.ids || [];
                  draft.groceryState.items = draft.groceryState.items.filter(
                    (i) => !ids.includes(i.id),
                  );
                  draft.groceryState.recommendationsUndo = null;
                })
              }
            >
              Undo last accepted suggestions
            </button>
          )}
          {["list", "cart"].map((status) => (
            <section className="list-section" key={status}>
              <div className="section-toolbar">
                <h3>{status === "list" ? "Shopping list" : "In-app cart"}</h3>
                {status === "cart" && (
                  <button
                    disabled={!grocery.items.some((i) => i.status === "cart")}
                    onClick={() =>
                      changeData((draft) => {
                        draft.groceryState = purchase(
                          draft.groceryState,
                          draft.groceryState.items
                            .filter((i) => i.status === "cart")
                            .map((i) => i.id),
                          todayKey,
                        );
                      })
                    }
                  >
                    Record cart as bought
                  </button>
                )}
              </div>
              {!grocery.items.some((i) => (i.status || "list") === status) && (
                <p className="muted">
                  {status === "list"
                    ? "Your list is empty. Add foods or preview suggestions."
                    : "Add list items to your cart as you shop."}
                </p>
              )}
              {grocery.items
                .filter((i) => (i.status || "list") === status)
                .map((item) => (
                  <article className="data-row" key={item.id}>
                    <div>
                      <h3>{item.name}</h3>
                      <p>
                        {item.quantity} {item.unit || "package"} ·{" "}
                        {item.price == null
                          ? "Price unknown"
                          : `${money(item.price)} per ${item.unit || "package"}${item.priceKind === "estimate" ? " (estimate)" : ""}`}{" "}
                        · {item.origin || "preserved"}
                      </p>
                      {item.requirement && (
                        <p>Originally needed: {item.requirement.name}</p>
                      )}
                      {item.notes && <p>{item.notes}</p>}
                    </div>
                    <div className="row-actions">
                      <button
                        onClick={() =>
                          setDialog({
                            destination: "groceries",
                            food: foodFor(item),
                            item,
                          })
                        }
                      >
                        Edit
                      </button>
                      <button
                        onClick={() =>
                          setDialog({
                            destination: "groceries",
                            item,
                            substitute: true,
                          })
                        }
                      >
                        Substitute
                      </button>
                      <button
                        onClick={() =>
                          changeData((draft) => {
                            const target = draft.groceryState.items.find(
                              (i) => i.id === item.id,
                            );
                            if (target)
                              target.status =
                                status === "list" ? "cart" : "list";
                          })
                        }
                      >
                        {status === "list" ? "Add to cart" : "Back to list"}
                      </button>
                      <button
                        onClick={() =>
                          changeData((draft) => {
                            draft.groceryState = purchase(
                              draft.groceryState,
                              [item.id],
                              todayKey,
                            );
                          })
                        }
                      >
                        Bought
                      </button>
                      <button
                        onClick={() => remove("items", item.id)}
                        aria-label={`Remove ${item.name}`}
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                ))}
            </section>
          ))}
          <details className="settings-details">
            <summary>
              Purchase history ({grocery.purchases.length} items)
            </summary>
            {!grocery.purchases.length && <p>No purchases recorded.</p>}
            {grocery.purchases.map((record) => (
              <div className="data-row" key={record.purchaseId || record.id}>
                <div>
                  <h3>{record.name}</h3>
                  <p>
                    {record.quantity} {record.unit || "package"} ·{" "}
                    {record.purchasedDate} ·{" "}
                    {record.price == null
                      ? "Price unknown"
                      : money(record.price * record.quantity)}
                    {record.undone ? " · Undone" : ""}
                  </p>
                </div>
                {record.transactionId && !record.undone && (
                  <button
                    onClick={() =>
                      changeData((draft) => {
                        draft.groceryState = undoPurchase(
                          draft.groceryState,
                          record.transactionId,
                        );
                      })
                    }
                  >
                    Undo this trip
                  </button>
                )}
              </div>
            ))}
          </details>
        </>
      )}

      {section === "meals" && (
        <>
          <p>{guidance.timing}</p>
          <p className="muted">
            Example meal amounts, not a prescribed target. Adjust to appetite
            and your team or clinician’s guidance. Check actual product labels
            for dietary needs.
          </p>
          {plans.length > 0 && (
            <section className="planned-meals">
              <h3>Planned today</h3>
              {plans.map((plan) => (
                <article className="data-row" key={plan.id}>
                  <div>
                    <h3>{plan.template.name}</h3>
                    <p>
                      {plan.servings} serving(s) ·{" "}
                      {plan.intendedTime || "Time flexible"} · {plan.status}
                    </p>
                    {plan.profileSignature !==
                      profileSignature(data.profile) && (
                      <p role="status">
                        Preferences changed — review this meal before using it.
                      </p>
                    )}
                  </div>
                  <div className="row-actions">
                    <button
                      onClick={() => {
                        setReplaceId(plan.id);
                        setNotice(
                          "Choose a new meal below to replace this plan. Shared gear tasks will stay.",
                        );
                      }}
                    >
                      Replace
                    </button>
                    <button
                      onClick={() =>
                        changeData((draft) => {
                          const tasks = draft.dayPlans[todayKey] || [];
                          for (const t of planTasksForIdea(
                            plan.template,
                            guidance,
                          ))
                            if (
                              !tasks.some(
                                (existing) => existing.label === t.label,
                              )
                            )
                              tasks.push({
                                ...t,
                                id: uid(),
                                owners: [plan.id],
                                done: false,
                              });
                          draft.dayPlans[todayKey] = tasks;
                        })
                      }
                    >
                      Rebuild missing prep
                    </button>
                    <button onClick={() => setDialog({ mealLog: plan })}>
                      Log what I ate
                    </button>
                    <button
                      onClick={() =>
                        changeData((draft) => undoPlan(draft, plan.id))
                      }
                    >
                      Undo plan
                    </button>
                  </div>
                </article>
              ))}
            </section>
          )}
          {!meals.length && (
            <div className="empty-state">
              <h3>No meals fit the current access settings</h3>
              <p>
                {guidance.emptyReason ||
                  "Your timing, budget, dietary needs, or school food access exclude the current examples."}
              </p>
              <button onClick={() => onNavigate("profile")}>
                Review food preferences
              </button>
              <button onClick={() => onNavigate("calendar")}>
                Review school access
              </button>
              <button onClick={() => navigate("food/log")}>
                Log food manually
              </button>
            </div>
          )}
          <div className="meal-grid">
            {meals.slice(0, mealLimit).map(({ idea, ingredients }) => (
              <article className="card meal-card" key={idea.id}>
                <p className="kicker">
                  {ingredients.every((i) => i.sufficient)
                    ? "READY NOW"
                    : ingredients.some((i) => i.available)
                      ? "PARTLY STOCKED / CHECK AMOUNTS"
                      : "NEEDS INGREDIENTS"}
                </p>
                <h3>{idea.name}</h3>
                <p>{idea.note}</p>
                <ul>
                  {ingredients.map((i) => (
                    <li key={i.ingredientId}>
                      <strong>
                        {i.amount} {i.unit} {i.name}
                      </strong>
                      <span>
                        {i.matches.length
                          ? `At home: ${i.matches.map((m) => m.name).join(", ")}${i.approximate ? " — confirm amount" : i.sufficient ? " — enough" : ` — need ${i.missing} ${i.unit} more`}`
                          : `Missing ${i.amount} ${i.unit}`}
                      </span>
                    </li>
                  ))}
                </ul>
                <details>
                  <summary>Preparation & storage</summary>
                  <ol>
                    <li>
                      Check package labels and adjust these example portions.
                    </li>
                    <li>
                      {idea.needsHeat
                        ? "Prepare and heat the ingredients safely; confirm kitchen or microwave access."
                        : "Assemble the ingredients before your next food window."}
                    </li>
                    <li>
                      {idea.needsCold
                        ? "Keep perishable ingredients refrigerated or use an insulated bag with ice packs."
                        : idea.portable
                          ? "Pack in a sealed container for school or sport."
                          : "Serve when ready."}
                    </li>
                  </ol>
                </details>
                <div className="button-row">
                  <button
                    className="primary small"
                    onClick={async () => {
                      if (
                        await changeData((draft) =>
                          planMeal(
                            draft,
                            idea,
                            todayKey,
                            guidance,
                            replaceId || null,
                          ),
                        )
                      ) {
                        setReplaceId("");
                        setNotice(
                          "Meal planned. Preparation tasks are on Today.",
                        );
                      }
                    }}
                  >
                    {replaceId ? "Replace selected meal" : "Plan meal"}
                  </button>
                  <button onClick={() => addMissing(idea)}>
                    Add missing to groceries
                  </button>
                  <button
                    aria-pressed={data.favorites.some((f) => f.id === idea.id)}
                    onClick={() =>
                      changeData((draft) => {
                        draft.favorites = draft.favorites.some(
                          (f) => f.id === idea.id,
                        )
                          ? draft.favorites.filter((f) => f.id !== idea.id)
                          : [
                              ...draft.favorites,
                              { ...idea, source: "Meal example" },
                            ];
                      })
                    }
                  >
                    Favorite
                  </button>
                </div>
              </article>
            ))}
          </div>
          {meals.length > mealLimit && (
            <button
              className="show-more-meals"
              onClick={() => setMealLimit((count) => count + 6)}
            >
              Show more meals ({meals.length - mealLimit} remaining)
            </button>
          )}
        </>
      )}

      {section === "log" && <FoodLog date={todayKey} />}
      {dialog && !dialog.mealLog && (
        <Dialog
          title={`${dialog.item && !dialog.substitute ? "Edit" : "Add"} ${dialog.destination === "pantry" ? "food at home" : "grocery food"}`}
          onClose={() => setDialog(null)}
        >
          {dialog.food ? (
            <PortionEditor
              food={dialog.food}
              initial={
                dialog.item
                  ? {
                      ...dialog.item,
                      amount: dialog.item.quantity,
                      ...(dialog.substitute
                        ? {
                            name: dialog.food.displayName || dialog.food.name,
                            ingredientId: ingredientId(dialog.food) || "",
                          }
                        : {}),
                    }
                  : {}
              }
              destination={dialog.destination}
              onSave={saveFood}
              onCancel={() => setDialog(null)}
            />
          ) : (
            <FoodSearch
              initialQuery={query}
              onQuery={setQuery}
              onChoose={(food) => setDialog({ ...dialog, food })}
            />
          )}
        </Dialog>
      )}
      {dialog?.mealLog && (
        <Dialog title="Log the meal you ate" onClose={() => setDialog(null)}>
          <MealLog
            plan={dialog.mealLog}
            date={todayKey}
            onDone={() => {
              setDialog(null);
              navigate("food/log");
            }}
          />
        </Dialog>
      )}
      {preview && (
        <Dialog
          title="Review grocery suggestions"
          onClose={() => setPreview(null)}
        >
          <p>
            Existing list items, prices, quantities, notes, and cart contents
            will stay. Select additions below. These are approximate package
            estimates, not a store quote.
          </p>
          {preview.additions.map((item) => (
            <label className="check-row" key={item.id}>
              <input
                type="checkbox"
                checked={selected.includes(item.id)}
                onChange={(e) =>
                  setSelected((ids) =>
                    e.target.checked
                      ? [...ids, item.id]
                      : ids.filter((id) => id !== item.id),
                  )
                }
              />
              <span>
                {item.name} · {money(item.price)} estimated/package
                <small className="suggestion-reason">
                  {item.activityReason}
                </small>
              </span>
            </label>
          ))}
          {!preview.additions.length && (
            <p>
              No additions fit the current budget and known stock. Price
              unpriced items, change the limit, or add specific needs manually.
            </p>
          )}
          <details>
            <summary>
              {preview.excluded.length} suggestions outside the available
              estimate
            </summary>
            {preview.excluded.map((item) => (
              <p key={item.id}>
                {item.name}: {item.reason}
              </p>
            ))}
          </details>
          <button
            className="primary"
            onClick={acceptPreview}
            disabled={!selected.length}
          >
            Add selected suggestions
          </button>
        </Dialog>
      )}
    </Shell>
  );
}

export function FoodLog({ date }) {
  const { current } = useStore();
  const [dialog, setDialog] = useState(null);
  const [query, setQuery] = useState(
    () => sessionStorage.getItem(`food-query-${current.id}`) || "",
  );
  useEffect(() => {
    sessionStorage.setItem(`food-query-${current.id}`, query);
  }, [query, current.id]);
  const log = current.data.dailyLogs[date] || { entries: [] };
  async function save(portion) {
    const ok = await changeData((data) => {
      const entry = makeLog(dialog.food, portion, date, { name: portion.name });
      const day = data.dailyLogs[date] || { entries: [], water: 0 };
      if (dialog.entry) {
        const old = day.entries.find((e) => e.id === dialog.entry.id);
        if (!old) throw new Error("This entry was removed in another tab.");
        day.entries = day.entries.map((e) =>
          e.id === old.id
            ? {
                ...old,
                ...entry,
                id: old.id,
                createdAt: old.createdAt,
                original: old.original || structuredClone(old),
                correctedAt: new Date().toISOString(),
              }
            : e,
        );
      } else day.entries.push(entry);
      data.dailyLogs[date] = day;
      data.recentFoods = [
        dialog.food,
        ...data.recentFoods.filter((f) => f.id !== dialog.food.id),
      ].slice(0, 30);
    });
    if (ok) setDialog(null);
  }
  return (
    <section>
      <div className="section-toolbar">
        <p>Food check-ins · {date}</p>
        <button className="primary small" onClick={() => setDialog({})}>
          + Log food
        </button>
      </div>
      {!log.entries.length && (
        <p className="empty-state">
          No foods logged for this day. Calories are optional.
        </p>
      )}
      <div className="data-list">
        {log.entries.map((entry) => (
          <article className="data-row" key={entry.id}>
            <div>
              <h3>{entry.name}</h3>
              <p>
                {entry.portion
                  ? `${entry.portion.amount} ${entry.portion.unit} · `
                  : entry.servingGrams
                    ? `${entry.servingGrams} g (legacy) · `
                    : ""}
                {entry.calories == null
                  ? "Calories unknown"
                  : `${entry.calories} kcal`}
                {entry.userAdjusted ? " · user-adjusted" : ""} ·{" "}
                {entry.time || "Checked in"}
              </p>
              <details>
                <summary>Source & details</summary>
                <p>
                  {entry.source || "Manual / legacy record"}
                  {entry.food?.fdcId ? ` · USDA ${entry.food.fdcId}` : ""}
                  {entry.food?.barcode
                    ? ` · Barcode ${entry.food.barcode}`
                    : ""}
                </p>
                {entry.food?.retrievedAt && (
                  <p>
                    Source retrieved {entry.food.retrievedAt}. This saved
                    snapshot is not changed by later provider updates.
                  </p>
                )}
                {entry.ingredients?.map((i, index) => (
                  <p key={index}>
                    {i.amount} {i.unit} {i.name} ·{" "}
                    {i.calories == null
                      ? "unknown calories"
                      : `${i.calories} kcal`}
                  </p>
                ))}
                {entry.original && (
                  <p>
                    Original check-in retained: {entry.original.name} ·{" "}
                    {entry.original.calories ?? "unknown"} kcal.
                  </p>
                )}
              </details>
            </div>
            <div className="row-actions">
              <button
                onClick={() => setDialog({ food: foodFor(entry), entry })}
              >
                Edit portion
              </button>
              <button onClick={() => setDialog({ consume: entry })}>
                Update pantry used
              </button>
              {current.data.operations.some(
                (op) =>
                  op.type === "consume" && op.logId === entry.id && !op.undone,
              ) && (
                <button
                  onClick={() =>
                    changeData((data) => undoConsumption(data, entry.id))
                  }
                >
                  Undo pantry deduction
                </button>
              )}
              <button
                onClick={() =>
                  changeData((data) => {
                    const day = data.dailyLogs[date];
                    const removed = day.entries.find((e) => e.id === entry.id);
                    data.operations.push({
                      id: uid(),
                      type: "remove-log",
                      date,
                      entry: removed,
                    });
                    day.entries = day.entries.filter((e) => e.id !== entry.id);
                  })
                }
              >
                Remove check-in
              </button>
            </div>
          </article>
        ))}
      </div>
      {[...current.data.operations]
        .reverse()
        .filter(
          (op) => op.type === "remove-log" && op.date === date && !op.undone,
        )
        .slice(0, 1)
        .map((op) => (
          <button
            key={op.id}
            onClick={() =>
              changeData((data) => {
                const target = data.operations.find((o) => o.id === op.id);
                if (!target.undone) {
                  data.dailyLogs[date].entries.push(target.entry);
                  target.undone = true;
                }
              })
            }
          >
            Undo removed check-in (pantry unchanged)
          </button>
        ))}
      {dialog && (
        <Dialog
          title={
            dialog.consume
              ? "Confirm pantry used"
              : dialog.entry
                ? "Edit food portion"
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
          await changeData((data) =>
            consumeStock(
              data,
              entry.id,
              Object.entries(amounts).map(([id, amount]) => ({
                id,
                amount: Number(amount),
              })),
            ),
          )
        )
          onDone();
      }}
    >
      <p>
        Logging does not automatically use stock. Enter only the quantities
        actually used from these exact pantry records. You can undo this
        separately from the food log.
      </p>
      {!items.length && (
        <p>
          No exact stock quantities. Edit At home to record quantities first.
        </p>
      )}
      {items.map((item) => (
        <label key={item.id}>
          {item.name} — {item.quantity} {item.unit || "package"} available
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
      <button className="primary">Confirm quantities used</button>
    </form>
  );
}

function MealLog({ plan, date, onDone }) {
  const { current } = useStore();
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
        const ok = await changeData((data) => {
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
          const target = data.mealPlans.find((p) => p.id === plan.id);
          if (target) target.status = "logged";
        });
        if (ok) onDone();
      }}
    >
      <p>
        Adjust to what you actually ate. Quantities are editable examples. No
        pantry stock is deducted until you confirm it from the log.
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
      <button className="primary">Log actual meal</button>
    </form>
  );
}
