import HomePage from "../pages/Food/HomePage.jsx";
import IdeasPage from "../pages/Food/IdeasPage.jsx";
import { useEffect, useRef, useState } from "react";
import { GROCERY_CATALOG, GROCERY_GOALS } from "../domain/catalog.js";
import { addDays, eventsForDate, getDateKey } from "../domain/timing.js";
import {
  acceptRecommendations,
  consumeStock,
  findMatchingFoodItem,
  groceryPreview,
  ingredientId,
  ingredientsForMeal,
  knownMoney,
  makeLog,
  makeFoodRecord,
  portionCalories,
  purchase,
  removeLogEntry,
  reviseLogEntry,
  undoConsumption,
  undoPurchase,
  validPortion,
} from "../domain/food.js";
import { markPlanLogged } from "../domain/plans.js";
import { uid } from "../domain/storage.js";
import { changeData, useStore } from "../store.js";
import { useToast } from "./ui/Toast.jsx";
import { useAsyncAction } from "../hooks/useAsyncAction.js";
import { useRoute } from "../routing.js";
import {
  formatAmount,
  formatDate,
  formatOrigin,
  formatTime,
  plural,
} from "../format.js";
import { Shell } from "./AppFrame.jsx";
import { Dialog } from "./Dialog.jsx";
import { LabelCheck } from "./ui/LabelCheck.jsx";
import { ConfirmDialog } from "./ui/ConfirmDialog.jsx";
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
  const searchInput = useRef(null);
  const [dialog, setDialog] = useState(null);
  const [mergePrompt, setMergePrompt] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [query, setQuery] = useState(
    () => sessionStorage.getItem(`food-query-${current.id}`) || "",
  );
  useEffect(() => {
    sessionStorage.setItem(`food-query-${current.id}`, query);
  }, [query, current.id]);
  useEffect(() => {
    const planId = sessionStorage.getItem("nourally-log-plan");
    if (!planId) return;
    sessionStorage.removeItem("nourally-log-plan");
    const plan = data.mealPlans.find((entry) => entry.id === planId);
    if (plan && plan.status !== "eaten") setDialog({ mealLog: plan });
  }, [data.mealPlans]);
  const { pending, run } = useAsyncAction();
  const showToast = useToast();
  const [preview, setPreview] = useState(null);
  const [selected, setSelected] = useState([]);
  const [budget, setBudget] = useState(grocery.budgetAmount ?? "");
  const [tripDate, setTripDate] = useState(grocery.lastShopDate || "");
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
  const totals = knownMoney(grocery.items);
  const upcoming = Array.from({ length: 7 }, (_, i) =>
    eventsForDate(
      data.schedule,
      getDateKey(addDays(new Date(`${todayKey}T12:00:00`), i)),
    ),
  ).flat();
  const openAdd = (destination) => setDialog({ destination });
  async function saveFood(portion, mergeChoice = null) {
    const { destination, food, item, substitute } = dialog;
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
    if (!item && !mergeChoice) {
      const existing = findMatchingFoodItem(grocery[list], fields);
      if (existing) {
        setDialog({ ...dialog, portionDraft: portion });
        setMergePrompt({ portion, existing });
        return false;
      }
    }
    return run("save-food", async () => {
      const ok = await changeData((draft) => {
        draft.recentFoods = [
          food,
          ...draft.recentFoods.filter((f) => f.id !== food.id),
        ].slice(0, 30);
        if (item) {
          const existing = draft.groceryState[list].find(
            (i) => i.id === item.id,
          );
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
          const existing = findMatchingFoodItem(
            draft.groceryState[list],
            fields,
          );
          if (mergeChoice === "merge" && !existing)
            throw new Error(
              "That matching food changed. Review the list and try again.",
            );
          if (mergeChoice === "merge")
            existing.quantity = Number(existing.quantity) + portion.amount;
          else
            draft.groceryState[list].push(
              makeFoodRecord(fields, {
                origin: food.source === "Manual" ? "manual" : "search",
              }),
            );
        }
      });
      if (ok) {
        setDialog(null);
        setMergePrompt(null);
      }
      return ok;
    });
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
        data.profile.dietaryNeeds
          .filter((need) => need !== "nutFree")
          .every((need) => item[need]),
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
            ? `Useful around ${matchingEvent.title} (${formatDate(matchingEvent.date)})${["away", "travel"].includes(matchingEvent.location) ? " — pack for travel" : ""}`
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

  return (
    <Shell eyebrow="NOURALLY / FOOD">
      <section className="dashboard-head">
        <div>
          <h1>Food</h1>
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
            {key === "groceries" &&
              grocery.items.filter((i) => !i.checked && i.status !== "bought")
                .length > 0 && (
                <span
                  aria-label={`${grocery.items.filter((i) => !i.checked && i.status !== "bought").length} unchecked items`}
                >
                  {" "}
                  {
                    grocery.items.filter(
                      (i) => !i.checked && i.status !== "bought",
                    ).length
                  }
                </span>
              )}
            {key === "home" &&
              grocery.pantry.some((i) =>
                ["low", "out"].includes(i.availability),
              ) && <span aria-label="Some items are low or out"> ·</span>}
          </a>
        ))}
      </nav>
      <div className="section-toolbar">
        <span ref={heading} tabIndex={-1} className="sr-only">
          {tabs.find(([key]) => key === section)[1]}
        </span>
        {section === "groceries" && (
          <button
            className="primary small"
            onClick={() => openAdd(section === "home" ? "pantry" : section)}
          >
            + Add food
          </button>
        )}
      </div>
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

      {section === "home" && <HomePage todayKey={todayKey} />}

      {section === "groceries" && (
        <>
          <LabelCheck />
          <div className="budget-banner">
            <div>
              <h3>
                {!grocery.items.length
                  ? "Your list is empty"
                  : totals.unknown
                    ? "Prices still needed"
                    : `About ${money(totals.subtotal)} so far`}
              </h3>
              <p>
                {!grocery.items.length
                  ? "Add foods you need this week."
                  : totals.unknown
                    ? totals.unknown === 1
                      ? "1 item needs a price."
                      : `${totals.unknown} items need prices.`
                    : grocery.budgetAmount == null
                      ? "No budget limit set."
                      : `${money(Math.max(grocery.budgetAmount - totals.subtotal, 0))} remaining estimate${totals.subtotal > grocery.budgetAmount ? ` · ${money(totals.subtotal - grocery.budgetAmount)} over budget` : ""}`}
              </p>
            </div>
            <button onClick={buildPreview}>Suggest groceries</button>
          </div>
          <p className="muted">
            {upcoming.length
              ? `Based on your ${upcoming.length} upcoming ${plural(upcoming.length, "activity")} this week.`
              : "Add a practice or game for tailored grocery ideas."}
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
                  return showToast(
                    "Budget must be zero or greater, or blank for no limit.",
                  );
                if (tripDate && tripDate > todayKey)
                  return showToast("Last trip cannot be in the future.");
                await run("shopping-settings", () =>
                  changeData((draft) => {
                    draft.groceryState.budgetAmount =
                      budget === "" ? null : Number(budget);
                    draft.groceryState.lastShopDate = tripDate;
                    draft.groceryState.recency = "";
                  }),
                );
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
              <button disabled={pending === "shopping-settings"}>
                {pending === "shopping-settings"
                  ? "Saving…"
                  : "Save shopping settings"}
              </button>
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
          <section className="list-section">
            <div className="section-toolbar">
              <h3>Shopping list</h3>
              <button
                disabled={
                  !grocery.items.some((i) => i.status === "cart") ||
                  pending === "finish-shopping"
                }
                onClick={() =>
                  run("finish-shopping", () =>
                    changeData((draft) => {
                      draft.groceryState = purchase(
                        draft.groceryState,
                        draft.groceryState.items
                          .filter((i) => i.status === "cart")
                          .map((i) => i.id),
                        todayKey,
                      );
                    }),
                  )
                }
              >
                {pending === "finish-shopping" ? "Saving…" : "Finish shopping"}
              </button>
            </div>
            {!grocery.items.length && (
              <p className="muted">
                Your list is empty. Add foods or preview suggestions.
              </p>
            )}
            {grocery.items.map((item) => (
              <article className="data-row" key={item.id}>
                <div>
                  <h3>{item.name}</h3>
                  <p>
                    {item.quantity}{" "}
                    {plural(item.quantity, item.unit || "package")} ·{" "}
                    {item.price == null
                      ? "Price unknown"
                      : `${money(item.price)} per ${item.unit || "package"}${item.priceKind === "estimate" ? " (estimate)" : ""}`}{" "}
                    · {formatOrigin(item.origin || "preserved")}
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
                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={item.status === "cart"}
                      onChange={() =>
                        changeData((draft) => {
                          const target = draft.groceryState.items.find(
                            (i) => i.id === item.id,
                          );
                          if (target)
                            target.status =
                              target.status === "cart" ? "list" : "cart";
                        })
                      }
                    />
                    Got it
                  </label>
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
          <details className="settings-details">
            <summary>
              Past trips ({grocery.purchases.length}{" "}
              {plural(grocery.purchases.length, "item")})
            </summary>
            {!grocery.purchases.length && <p>No purchases recorded.</p>}
            {grocery.purchases.map((record) => (
              <div className="data-row" key={record.purchaseId || record.id}>
                <div>
                  <h3>{record.name}</h3>
                  <p>
                    {record.quantity}{" "}
                    {plural(record.quantity, record.unit || "package")} ·{" "}
                    {formatDate(record.purchasedDate)} ·{" "}
                    {record.price == null
                      ? "Price unknown"
                      : money(record.price * record.quantity)}
                    {record.undone ? " · Undone" : ""}
                  </p>
                </div>
                {record.transactionId && !record.undone && (
                  <button
                    onClick={() =>
                      setConfirmation({
                        title: "Undo this shopping trip?",
                        body: "Purchased quantities will be removed from At home and returned to Groceries. This cannot proceed if some of that stock has already been used.",
                        confirmLabel: "Undo trip",
                        destructive: true,
                        onConfirm: async () => {
                          if (
                            await changeData((draft) => {
                              draft.groceryState = undoPurchase(
                                draft.groceryState,
                                record.transactionId,
                              );
                            })
                          )
                            setConfirmation(null);
                        },
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

      {section === "ideas" && <IdeasPage now={now} todayKey={todayKey} />}

      {section === "log" && <FoodLog date={todayKey} />}
      {dialog && !dialog.mealLog && (
        <Dialog
          title={`${dialog.item && !dialog.substitute ? "Edit" : "Add"} ${dialog.destination === "pantry" ? "food at home" : "grocery food"}`}
          initialFocusRef={searchInput}
          className={!dialog.food && !mergePrompt ? "food-search-dialog" : ""}
          onClose={() => {
            setMergePrompt(null);
            setDialog(null);
          }}
        >
          {mergePrompt ? (
            <div className="merge-prompt">
              <p>
                {mergePrompt.existing.name} is already here. Add the amount to
                that food, or keep this as a separate item?
              </p>
              <div className="dialog-actions">
                <button autoFocus onClick={() => setMergePrompt(null)}>
                  Review details
                </button>
                <button
                  disabled={pending === "save-food"}
                  onClick={() => saveFood(mergePrompt.portion, "separate")}
                >
                  Keep separate
                </button>
                <button
                  className="primary"
                  disabled={pending === "save-food"}
                  onClick={() => saveFood(mergePrompt.portion, "merge")}
                >
                  Add to existing
                </button>
              </div>
            </div>
          ) : dialog.food ? (
            <PortionEditor
              food={dialog.food}
              initial={
                dialog.portionDraft ||
                (dialog.item
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
                  : {})
              }
              destination={dialog.destination}
              onSave={saveFood}
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
            onClick={() => run("accept-preview", acceptPreview)}
            disabled={!selected.length || pending === "accept-preview"}
          >
            Add selected suggestions
          </button>
        </Dialog>
      )}
      {confirmation && (
        <ConfirmDialog
          {...confirmation}
          onCancel={() => setConfirmation(null)}
        />
      )}
    </Shell>
  );
}

export function FoodLog({ date }) {
  const { current } = useStore();
  const { run } = useAsyncAction();
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
        <p>Food check-ins · {formatDate(date)}</p>
        <button className="primary small" onClick={() => setDialog({})}>
          + Log food
        </button>
      </div>
      <LabelCheck />
      {!log.entries.length && (
        <p className="empty-state">
          Nothing logged yet. Log a meal or snack when you want to.
        </p>
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
                    ? `${entry.servingGrams} g (legacy) · `
                    : ""}
                {entry.calories == null
                  ? "Calories unknown"
                  : `${entry.calories} kcal`}
                {entry.userAdjusted ? " · user-adjusted" : ""} ·{" "}
                {entry.time ? formatTime(entry.time) : "Checked in"}
              </p>
              <details>
                <summary>Source & details</summary>
                <LabelCheck />
                <p>
                  {entry.source || "Manual / legacy record"}
                  {entry.food?.fdcId ? ` · USDA ${entry.food.fdcId}` : ""}
                  {entry.food?.barcode
                    ? ` · Barcode ${entry.food.barcode}`
                    : ""}
                </p>
                {entry.food?.retrievedAt && (
                  <p>
                    Source retrieved {formatDate(entry.food.retrievedAt)}. This
                    saved snapshot is not changed by later provider updates.
                  </p>
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
                  changeData((data) => removeLogEntry(data, date, entry.id))
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
          initialFocusRef={searchInput}
          className={
            !dialog.food && !dialog.consume ? "food-search-dialog" : ""
          }
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
          {item.name} — {item.quantity}{" "}
          {plural(item.quantity, item.unit || "package")} available
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
      <button className="primary" disabled={pending === "consume"}>
        {pending === "consume" ? "Saving…" : "Confirm quantities used"}
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
      <button className="primary" disabled={pending === "meal-log"}>
        {pending === "meal-log" ? "Saving…" : "Log actual meal"}
      </button>
    </form>
  );
}
