import { useRef, useState } from "react";
import { changeData, useStore } from "../../store.js";
import { useAsyncAction } from "../../hooks/useAsyncAction.js";
import { Dialog } from "../../components/Dialog.jsx";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog.jsx";
import { FoodSearch } from "../../components/FoodSearch.jsx";
import { addDays, eventsForDate, getDateKey } from "../../domain/timing.js";
import {
  groceryTrips,
  ingredientId,
  knownMoney,
  makeFoodRecord,
  purchase,
  sameProduct,
  shoppingAmount,
  tripUsage,
  undoPurchase,
  weeklyGroceryIdeas,
} from "../../domain/food.js";
import { uid } from "../../domain/storage.js";
import { formatDate, plural } from "../../format.js";
import {
  GroceryItemForm,
  PutAwaySheet,
  WeekIdeasSheet,
  money,
} from "./GrocerySheets.jsx";

const GROUPS = [
  ["plans", "For your plans", (i) => i.origin === "meal"],
  [
    "week",
    "For this week",
    (i) => ["generated", "recommendation"].includes(i.origin),
  ],
  [
    "mine",
    "Added by you",
    (i) => !["meal", "generated", "recommendation"].includes(i.origin),
  ],
];
const SPORTS_DRINK_NOTE =
  "Water works for most practices. Sports drinks can help in long or hot sessions.";
const items = (n) => `${n} ${plural(n, "item")}`;

export default function GroceriesPage({ todayKey }) {
  const { current } = useStore();
  const data = current.data;
  const grocery = data.groceryState;
  const showPrices = Boolean(grocery.showPrices);
  const { pending, run } = useAsyncAction();
  const [sheet, setSheet] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const searchInput = useRef(null);
  const write = (key, fn, message, action) =>
    run(key, () => changeData(fn, message, action));
  const events = Array.from({ length: 7 }, (_, i) =>
    eventsForDate(
      data.schedule,
      getDateKey(addDays(new Date(`${todayKey}T12:00:00`), i)),
    ),
  ).flat();
  const week = weeklyGroceryIdeas({
    profile: data.profile,
    events,
    pantry: grocery.pantry,
    items: grocery.items,
    date: todayKey,
  });
  const checked = grocery.items.filter((i) => i.checked);
  const trips = groceryTrips(grocery.purchases);
  const money$ = knownMoney(grocery.items);
  const closeSheet = () => {
    if (!pending) setSheet(null);
  };
  const updateItem = (id, fn) => (d) => {
    const target = d.groceryState.items.find((i) => i.id === id);
    if (!target)
      throw new Error("This item was removed in another tab. Add it again.");
    fn(target);
  };

  async function addFood(food, fields, choice) {
    const record = makeFoodRecord(
      {
        ...fields,
        food,
        catalogId: food.catalogId || food.id,
        price: fields.price ?? null,
        checked: false,
        reason: null,
      },
      { origin: food.source === "Manual" ? "manual" : "search" },
    );
    const existing = grocery.items.find(
      (i) =>
        sameProduct(i, record) ||
        (ingredientId(record) && ingredientId(i) === ingredientId(record)),
    );
    if (existing && !choice) {
      setSheet({ ...sheet, merge: { existing, fields } });
      return;
    }
    const ok = await write(
      "save-item",
      (d) => {
        const target =
          choice === "merge" &&
          d.groceryState.items.find((i) => i.id === existing.id);
        if (choice === "merge" && !target)
          throw new Error("That item changed. Review the list and try again.");
        if (target)
          target.quantity = Number(target.quantity) + Number(fields.quantity);
        else d.groceryState.items.push(record);
      },
      `Added ${fields.name}.`,
    );
    if (ok) setSheet(null);
  }

  async function saveEdit(item, food, fields) {
    const ok = await write(
      "save-item",
      updateItem(item.id, (target) => {
        Object.assign(target, fields);
        if (food) {
          // GROC-07: a swap keeps the reason and remembers what was needed.
          target.food = food;
          target.catalogId = food.catalogId || food.id;
          target.requirement = item.requirement || {
            name: item.name,
            amount: null,
            unit: null,
          };
        }
      }),
      food
        ? `Swapped ${item.name} for ${fields.name}.`
        : `Updated ${fields.name}.`,
    );
    if (ok) setSheet(null);
  }

  async function undoTrip(trip, skipUsed = false) {
    const ok = await write(
      "undo-trip",
      (d) => {
        d.groceryState = undoPurchase(d.groceryState, trip.id, { skipUsed });
      },
      "Trip undone. Those items are back on your list.",
    );
    if (ok) {
      setConfirm(null);
      setSheet(null);
    }
  }

  const row = (item) => (
    <li
      className={`grocery-row${item.checked ? " checked" : ""}`}
      key={item.id}
    >
      <label className="grocery-check">
        <input
          type="checkbox"
          aria-label={`Got ${item.name}`}
          checked={Boolean(item.checked)}
          disabled={pending === `check-${item.id}`}
          onChange={() =>
            write(
              `check-${item.id}`,
              updateItem(item.id, (t) => {
                t.checked = !t.checked;
              }),
              null,
            )
          }
        />
      </label>
      <div className="grocery-main">
        <strong>{item.name}</strong>
        <small>
          {shoppingAmount(item)}
          {showPrices && item.price != null && item.price !== ""
            ? ` · about ${money(Number(item.price) * Number(item.quantity ?? 1))}`
            : ""}
        </small>
        {item.reason && <span className="reason-chip">{item.reason}</span>}
        {ingredientId(item) === "sports-drink" && (
          <small className="muted">{SPORTS_DRINK_NOTE}</small>
        )}
      </div>
      <details
        className="row-menu"
        onClick={(e) => {
          if (e.target instanceof Element && e.target.closest("button"))
            e.currentTarget.open = false;
        }}
      >
        <summary aria-label={`${item.name} options`}>•••</summary>
        <button
          disabled={!!pending}
          onClick={() => setSheet({ type: "edit", item })}
        >
          Edit
        </button>
        <button
          disabled={!!pending}
          onClick={() => setSheet({ type: "swap", item })}
        >
          Swap for another food
        </button>
        <button
          disabled={!!pending}
          onClick={() =>
            write(
              `remove-${item.id}`,
              (d) => {
                d.groceryState.items = d.groceryState.items.filter(
                  (i) => i.id !== item.id,
                );
              },
              `Removed ${item.name}.`,
            )
          }
        >
          Remove
        </button>
      </details>
    </li>
  );

  const known = grocery.items.length - money$.unknown;
  return (
    <div className="groceries-page">
      <div className="today-section-header">
        <h2>Groceries</h2>
        <button className="primary" onClick={() => setSheet({ type: "add" })}>
          Add food
        </button>
      </div>
      <div className="week-ideas-prompt">
        <button
          onClick={() =>
            setSheet({ type: "week", ideas: week.items, summary: week.summary })
          }
        >
          Add food for this week
        </button>
        <p className="muted">{week.summary}</p>
      </div>
      {!grocery.items.length && (
        <div className="empty-state">
          <h3>Your list is empty</h3>
          <p>Add missing items from an idea, or add food yourself.</p>
          <button onClick={() => setSheet({ type: "add" })}>Add food</button>
        </div>
      )}
      {GROUPS.map(([id, label, test]) => {
        const list = grocery.items
          .filter(test)
          .sort(
            (a, b) => Number(Boolean(a.checked)) - Number(Boolean(b.checked)),
          );
        return (
          list.length > 0 && (
            <section key={id} aria-labelledby={`grocery-${id}`}>
              <h3 id={`grocery-${id}`}>{label}</h3>
              <ul className="grocery-list">{list.map(row)}</ul>
            </section>
          )
        );
      })}
      {showPrices && grocery.items.length > 0 && (
        <p className="grocery-estimate">
          {known
            ? `About ${money(money$.subtotal)} for ${known} of ${items(grocery.items.length)}`
            : "No price estimates yet."}
          {grocery.budgetAmount != null &&
            ` · Budget ${money(Number(grocery.budgetAmount))}`}
        </p>
      )}
      <p className="sr-only" aria-live="polite">
        {checked.length ? `${items(checked.length)} checked` : ""}
      </p>
      {checked.length > 0 && (
        <section className="finish-bar" aria-labelledby="finish-bar-title">
          <h2 id="finish-bar-title" className="sr-only">
            Shopping
          </h2>
          {checked.length === grocery.items.length && (
            <p>Everything's checked. Finish shopping?</p>
          )}
          <button
            className="primary"
            disabled={!!pending}
            onClick={() => setSheet({ type: "putaway" })}
          >
            Finish shopping ({checked.length})
          </button>
        </section>
      )}
      <div className="grocery-footer">
        {trips.length > 0 && (
          <button
            className="text-button"
            onClick={() => setSheet({ type: "trips" })}
          >
            Past trips
          </button>
        )}
      </div>

      {sheet?.type === "putaway" && (
        <Dialog title="Put these away?" onClose={closeSheet}>
          <PutAwaySheet
            items={checked}
            pantry={grocery.pantry}
            pending={pending === "finish"}
            onCancel={closeSheet}
            onConfirm={async (places) => {
              const ids = checked.map((i) => i.id);
              const ok = await write(
                "finish",
                (d) => {
                  d.groceryState = purchase(
                    d.groceryState,
                    ids.filter((id) =>
                      d.groceryState.items.some(
                        (i) => i.id === id && i.checked,
                      ),
                    ),
                    todayKey,
                    uid(),
                    { places },
                  );
                },
                `${items(ids.length)} added to At home.`,
              );
              if (ok) setSheet(null);
            }}
          />
        </Dialog>
      )}
      {sheet?.type === "week" && (
        <Dialog title="Add food for this week" onClose={closeSheet}>
          <WeekIdeasSheet
            ideas={sheet.ideas}
            summary={sheet.summary}
            pending={pending === "week"}
            onCancel={closeSheet}
            onAdd={async (chosen) => {
              const ok = await write(
                "week",
                (d) => {
                  for (const item of chosen)
                    if (
                      !d.groceryState.items.some(
                        (i) => ingredientId(i) === item.ingredientId,
                      )
                    )
                      d.groceryState.items.push(item);
                },
                `Added ${items(chosen.length)} to groceries.`,
              );
              if (ok) setSheet(null);
            }}
          />
        </Dialog>
      )}
      {["add", "swap"].includes(sheet?.type) && (
        <Dialog
          title={
            sheet.type === "swap"
              ? `Swap ${sheet.item.name}`
              : "Add to groceries"
          }
          initialFocusRef={searchInput}
          className={sheet.food || sheet.merge ? "" : "food-search-dialog"}
          onClose={closeSheet}
        >
          {sheet.merge ? (
            <div className="merge-prompt">
              <p>
                {sheet.merge.existing.name} is already on your list. Add to it
                or keep both?
              </p>
              <div className="dialog-actions">
                <button
                  disabled={!!pending}
                  onClick={() =>
                    addFood(sheet.food, sheet.merge.fields, "both")
                  }
                >
                  Keep both
                </button>
                <button
                  className="primary"
                  disabled={!!pending}
                  onClick={() =>
                    addFood(sheet.food, sheet.merge.fields, "merge")
                  }
                >
                  Add to it
                </button>
              </div>
            </div>
          ) : sheet.food ? (
            <GroceryItemForm
              food={sheet.food}
              item={sheet.type === "swap" ? sheet.item : null}
              showPrices={showPrices}
              pending={pending === "save-item"}
              onCancel={closeSheet}
              onSave={(fields) =>
                sheet.type === "swap"
                  ? saveEdit(sheet.item, sheet.food, fields)
                  : addFood(sheet.food, fields)
              }
            />
          ) : (
            <FoodSearch
              searchInputRef={searchInput}
              initialQuery={sheet.type === "swap" ? sheet.item.name : ""}
              onChoose={(food) => setSheet({ ...sheet, food })}
            />
          )}
        </Dialog>
      )}
      {sheet?.type === "edit" && (
        <Dialog title={`Edit ${sheet.item.name}`} onClose={closeSheet}>
          <GroceryItemForm
            item={sheet.item}
            showPrices={showPrices}
            pending={pending === "save-item"}
            onCancel={closeSheet}
            onSave={(fields) => saveEdit(sheet.item, null, fields)}
          />
        </Dialog>
      )}
      {sheet?.type === "trips" && (
        <Dialog title="Past trips" onClose={closeSheet}>
          <ul className="trip-list">
            {trips.map((trip, index) => (
              <li key={trip.id}>
                <span>
                  {formatDate(trip.date)} · {items(trip.count)}
                  {trip.undone ? " · Undone" : ""}
                </span>
                {index === 0 && trip.undoable && !trip.undone && (
                  <button
                    disabled={!!pending}
                    onClick={() => {
                      const usage = tripUsage(grocery, trip.id);
                      if (usage.used.length) setConfirm(trip);
                      else undoTrip(trip);
                    }}
                  >
                    {pending === "undo-trip" ? "Undoing…" : "Undo trip"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </Dialog>
      )}
      {confirm && (
        <ConfirmDialog
          title="Undo this trip?"
          body="Some of this trip's food was already used. Undo the rest?"
          confirmLabel="Undo the rest"
          cancelLabel="Keep"
          onCancel={() => setConfirm(null)}
          onConfirm={() => undoTrip(confirm, true)}
        />
      )}
    </div>
  );
}
