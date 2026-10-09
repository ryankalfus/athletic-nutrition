import { BatteryLow, CircleCheck, CircleOff, Minus, Plus } from "lucide-react";
import { useState, useRef } from "react";
import { useStore, changeData } from "../../store.js";
import { useAsyncAction } from "../../hooks/useAsyncAction.js";
import { Dialog, DialogCancel, DialogError } from "../../components/Dialog.jsx";
import { Menu } from "../../components/ui/Menu.jsx";
import { FoodSearch } from "../../components/FoodSearch.jsx";
import { GROCERY_CATALOG } from "../../domain/catalog.js";
import {
  ingredientId,
  INGREDIENTS,
  makeFoodRecord,
  sameProduct,
  stockStatus,
  setStockStatus,
  stockToGroceries,
  toggleStockOut,
  groceryFitsProfile,
} from "../../domain/food.js";
import { EmptyState } from "../../components/ui/EmptyState.jsx";
import { SegmentedControl } from "../../components/ui/SelectionControls.jsx";
import { QuickAddList } from "../../components/ui/QuickAddList.jsx";

// Have · Low · Out with an icon; below 360px only the icon shows and the
// word stays for screen readers (6.5 mobile layout).
const STOCK_OPTIONS = [
  ["have", "Have", CircleCheck],
  ["low", "Low", BatteryLow],
  ["out", "Out", CircleOff],
].map(([value, label, Icon]) => [
  value,
  <>
    <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
    <span className="stock-label">{label}</span>
  </>,
]);
const PLACE_NAMES = {
  pantry: "kitchen",
  kitchen: "kitchen",
  fridge: "fridge",
  freezer: "freezer",
  bag: "my bag",
};

const places = [
  ["kitchen", "Kitchen & pantry", ["pantry", "kitchen"]],
  ["cold", "Fridge & freezer", ["fridge", "freezer"]],
  ["bag", "In my bag", ["bag"]],
];
export default function HomePage({ todayKey }) {
  const { current } = useStore();
  const data = current.data,
    rows = data.groceryState.pantry;
  const { pending, run } = useAsyncAction();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState(false);
  const [edit, setEdit] = useState(null);
  const [merge, setMerge] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [counts, setCounts] = useState({});
  const [countsAs, setCountsAs] = useState(null);
  const timers = useRef({});
  const low = rows.filter((i) => stockStatus(i) !== "have");
  const write = (key, fn, message, action) =>
    run(key, () => changeData(fn, message, action));
  const quick = GROCERY_CATALOG.filter((i) =>
    groceryFitsProfile(i, data.profile),
  ).slice(0, 6);
  const addLow = () =>
    write(
      "all-low",
      (d) => stockToGroceries(d, low),
      "Added low or out foods to groceries.",
    );
  const add = async (food, choice = null) => {
    const record = makeFoodRecord({
      name: food.name,
      food,
      ingredientId: ingredientId(food),
      catalogId: food.catalogId || food.id,
      quantity: 1,
      unit: "package",
      availability: "have",
      location: "pantry",
      price: null,
    });
    const existing = rows.find((i) => sameProduct(i, record));
    if (existing && !choice) {
      setSearch(false);
      setMerge({ food, existing });
      return;
    }
    const ok = await write(
      "add",
      (d) => {
        if (existing && choice === "update") {
          const row = d.groceryState.pantry.find((i) => i.id === existing.id);
          row.availability = "have";
          row.updatedDate = todayKey;
        } else d.groceryState.pantry.push(record);
      },
      `Added ${food.name}.`,
      {
        label: "Edit details",
        onClick: () => {
          setEdit(
            existing && choice === "update"
              ? { ...existing, availability: "have" }
              : record,
          );
          setDirty(false);
        },
      },
    );
    if (ok) {
      setSearch(false);
      setMerge(null);
      // HOME-07: catalog foods resolve on their own; ask only when nothing matched.
      if (!(existing && choice === "update") && !ingredientId(record))
        setCountsAs(record);
    }
  };
  const step = (row, delta) => {
    const quantity = Math.max(
      0,
      Number(counts[row.id] ?? row.quantity) + delta,
    );
    setCounts((c) => ({ ...c, [row.id]: quantity }));
    clearTimeout(timers.current[row.id]);
    timers.current[row.id] = setTimeout(async () => {
      await changeData((d) => {
        const target = d.groceryState.pantry.find((i) => i.id === row.id);
        if (target) {
          target.quantity = quantity;
          target.availability = quantity === 0 ? "out" : "exact";
          target.updatedDate = todayKey;
        }
      }, null);
      setCounts((c) => {
        const next = { ...c };
        delete next[row.id];
        return next;
      });
    }, 600);
  };
  const close = () => {
    if (pending) return;
    setEdit(null);
    setDirty(false);
  };
  return (
    <div className="home-page">
      {/* The tab already names the page (FOOD-06): the H2 is for screen
          readers and the action sits in a right-aligned toolbar. */}
      <div className="food-toolbar">
        <h2 className="sr-only">At home</h2>
        <button className="primary" onClick={() => setSearch(true)}>
          Add food
        </button>
      </div>
      {rows.length > 0 && (
        <SegmentedControl
          label="Stock filter"
          options={[
            ["all", "All"],
            ["low", "Low or out"],
            ["bag", "In my bag"],
          ]}
          value={filter}
          onChange={setFilter}
        />
      )}
      {low.length > 0 && (
        <div className="low-bar">
          <p>{low.length} low or out</p>
          <button disabled={!!pending} onClick={addLow}>
            Add to groceries
          </button>
        </div>
      )}
      {!rows.length && (
        <EmptyState title="What’s in your kitchen?">
          Add a few staples. Ideas that use them move to the top.
        </EmptyState>
      )}
      <div className="home-layout">
        <div>
          {places.map(([id, label, locations]) => {
            const list = rows.filter(
              (i) =>
                locations.includes(i.location || "pantry") &&
                (filter === "all" ||
                  (filter === "low" && stockStatus(i) !== "have") ||
                  (filter === "bag" && i.location === "bag")),
            );
            return (
              list.length > 0 && (
                <section key={id} aria-labelledby={`place-${id}`}>
                  <h2 id={`place-${id}`} className="food-group-title">
                    {label}
                  </h2>
                  <ul className="stock-list">
                    {list.map((row) => (
                      <li className="stock-row" key={row.id}>
                        <div>
                          <strong>{row.name}</strong>
                          {row.food?.brand && <small>{row.food.brand}</small>}
                          {row.expiry && row.expiry < todayKey && (
                            <small className="stock-warning">
                              Use-by passed
                            </small>
                          )}
                        </div>
                        {row.availability === "out" &&
                        row.previousAvailability === "exact" ? (
                          // Out after an exact count: "Out" and one restock
                          // step; "Back in stock" lives in the row menu.
                          <div className="stock-amount">
                            <span>Out</span>
                            <button
                              aria-label={`Increase ${row.name}`}
                              onClick={() => step(row, 1)}
                            >
                              <Plus
                                size={20}
                                strokeWidth={1.75}
                                aria-hidden="true"
                              />
                            </button>
                          </div>
                        ) : !row.availability ||
                          row.availability === "exact" ? (
                          <div className="stock-amount">
                            <button
                              aria-label={`Decrease ${row.name}`}
                              disabled={
                                Number(counts[row.id] ?? row.quantity) <= 0
                              }
                              onClick={() => step(row, -1)}
                            >
                              <Minus
                                size={20}
                                strokeWidth={1.75}
                                aria-hidden="true"
                              />
                            </button>
                            <span>{counts[row.id] ?? row.quantity} left</span>
                            <button
                              aria-label={`Increase ${row.name}`}
                              onClick={() => step(row, 1)}
                            >
                              <Plus
                                size={20}
                                strokeWidth={1.75}
                                aria-hidden="true"
                              />
                            </button>
                          </div>
                        ) : (
                          <SegmentedControl
                            label={`${row.name} stock`}
                            options={STOCK_OPTIONS}
                            value={stockStatus(row)}
                            disabled={!!pending}
                            onChange={(status) =>
                              write(
                                "status",
                                (d) => {
                                  d.groceryState.pantry =
                                    d.groceryState.pantry.map((i) =>
                                      i.id === row.id
                                        ? setStockStatus(i, status, todayKey)
                                        : i,
                                    );
                                },
                                null,
                              )
                            }
                          />
                        )}
                        <Menu
                          label={`${row.name} options`}
                          items={[
                            {
                              label:
                                row.availability === "out"
                                  ? "Back in stock"
                                  : "Mark out",
                              disabled: !!pending,
                              onSelect: () =>
                                write(
                                  "toggle",
                                  (d) => {
                                    d.groceryState.pantry =
                                      d.groceryState.pantry.map((i) =>
                                        i.id === row.id
                                          ? toggleStockOut(i, todayKey)
                                          : i,
                                      );
                                  },
                                  null,
                                ),
                            },
                            {
                              label: "Edit details",
                              onSelect: () => {
                                setEdit(row);
                                setDirty(false);
                              },
                            },
                            // Every place except the one the food is in.
                            ...places.flatMap(([, group, locations]) =>
                              locations
                                .filter(
                                  (location) =>
                                    location !== "kitchen" &&
                                    PLACE_NAMES[location] !==
                                      PLACE_NAMES[row.location || "pantry"],
                                )
                                .map((location) => ({
                                  key: location,
                                  label: `Move to ${PLACE_NAMES[location]}`,
                                  disabled: !!pending,
                                  onSelect: () =>
                                    write(
                                      "move",
                                      (d) => {
                                        d.groceryState.pantry.find(
                                          (i) => i.id === row.id,
                                        ).location = location;
                                      },
                                      `Moved ${row.name} to ${group.toLowerCase()}.`,
                                    ),
                                })),
                            ),
                            stockStatus(row) !== "have" && {
                              label: "Add to groceries",
                              disabled: !!pending,
                              onSelect: () =>
                                write(
                                  "groceries",
                                  (d) => stockToGroceries(d, [row]),
                                  `Added ${row.name} to groceries.`,
                                ),
                            },
                            {
                              label: "Remove",
                              danger: true,
                              separated: true,
                              disabled: !!pending,
                              onSelect: () =>
                                write(
                                  "remove",
                                  (d) => {
                                    d.groceryState.pantry =
                                      d.groceryState.pantry.filter(
                                        (i) => i.id !== row.id,
                                      );
                                  },
                                  `Removed ${row.name}.`,
                                ),
                            },
                          ]}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              )
            );
          })}
        </div>
        {/* From 1200px a sticky summary; below, the compact bar above. */}
        {low.length > 0 && (
          <aside className="low-summary">
            <h2 className="food-group-title">Low or out</h2>
            <p>{low.map((i) => i.name).join(", ")}</p>
            <button disabled={!!pending} onClick={addLow}>
              Add all to groceries
            </button>
          </aside>
        )}
      </div>
      <section className="quick-add" aria-labelledby="quick-add-title">
        <h2 id="quick-add-title" className="food-group-title">
          Quick add
        </h2>
        <QuickAddList
          label="Quick add"
          items={quick}
          disabled={!!pending}
          onAdd={(food) =>
            add({ ...food, source: "Quick basic", catalogId: food.id })
          }
        />
      </section>
      {search && (
        <Dialog
          title="Add food at home"
          className="food-search-dialog"
          onClose={() => setSearch(false)}
        >
          <FoodSearch onChoose={add} />
        </Dialog>
      )}
      {merge && (
        <Dialog title="Food already at home" onClose={() => setMerge(null)}>
          <p>
            You already have {merge.existing.name} (
            {stockStatus(merge.existing) === "have"
              ? "Have"
              : stockStatus(merge.existing) === "low"
                ? "Low"
                : "Out"}
            ). Update it or keep both?
          </p>
          <DialogError />
          <div className="dialog-actions">
            <button
              disabled={!!pending}
              onClick={() => add(merge.food, "update")}
            >
              Update it
            </button>
            <button
              disabled={!!pending}
              onClick={() => add(merge.food, "both")}
            >
              Keep both
            </button>
          </div>
        </Dialog>
      )}
      {edit && (
        <Dialog
          title={`Edit ${edit.name}`}
          onClose={close}
          dirty={dirty}
          discardMessage="Your unsaved food details will be lost."
        >
          <HomeDetails
            initial={edit}
            pending={pending}
            onDirty={() => setDirty(true)}
            onSave={(fields) =>
              write(
                "edit",
                (d) => {
                  d.groceryState.pantry = d.groceryState.pantry.map((i) =>
                    i.id === edit.id
                      ? { ...i, ...fields, updatedDate: todayKey }
                      : i,
                  );
                },
                `Updated ${fields.name}.`,
              ).then((ok) => {
                if (ok) {
                  setEdit(null);
                  setDirty(false);
                }
              })
            }
          />
        </Dialog>
      )}
      {countsAs && (
        <CountsAsSheet
          row={countsAs}
          pending={!!pending}
          onClose={() => setCountsAs(null)}
          onSave={(id) =>
            write(
              "counts-as",
              (d) => {
                const target = d.groceryState.pantry.find(
                  (i) => i.id === countsAs.id,
                );
                if (target) target.ingredientId = id;
              },
              null,
            ).then((ok) => ok && setCountsAs(null))
          }
        />
      )}
    </div>
  );
}
function CountsAsSheet({ row, pending, onClose, onSave }) {
  const [id, setId] = useState("");
  return (
    <Dialog title="Counts as?" onClose={onClose} dirty={id !== ""}>
      <form
        className="home-details"
        onSubmit={(e) => {
          e.preventDefault();
          if (id) onSave(id);
          else onClose();
        }}
      >
        <label>
          What does {row.name} count as?
          <select value={id} onChange={(e) => setId(e.target.value)}>
            <option value="">Nothing specific</option>
            {INGREDIENTS.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
          <small>Ideas that need this food will use it.</small>
        </label>
        <DialogError />
        <div className="sheet-footer">
          <button type="button" onClick={onClose} disabled={pending}>
            Skip
          </button>
          <button
            aria-busy={pending || undefined}
            className="primary"
            disabled={pending}
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
function HomeDetails({ initial, pending, onDirty, onSave }) {
  const [draft, setDraft] = useState({
    ...initial,
    availability:
      initial.availability === "some"
        ? "have"
        : initial.availability || "exact",
  });
  const change = (key, value) => {
    setDraft((d) =>
      key === "availability" && value === "out"
        ? setStockStatus(d, value, initial.updatedDate)
        : { ...d, [key]: value },
    );
    onDirty();
  };
  return (
    <form
      className="home-details"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(draft);
      }}
    >
      <label>
        Name
        <input
          required
          maxLength={240}
          value={draft.name}
          onChange={(e) => change("name", e.target.value)}
        />
      </label>
      <label>
        Counts as
        <select
          value={draft.ingredientId || ingredientId(draft) || ""}
          onChange={(e) => change("ingredientId", e.target.value)}
        >
          <option value="">No ingredient match</option>
          {INGREDIENTS.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Place
        <select
          value={draft.location || "pantry"}
          onChange={(e) => change("location", e.target.value)}
        >
          {[
            ["pantry", "Kitchen & pantry"],
            ["fridge", "Fridge"],
            ["freezer", "Freezer"],
            ["bag", "In my bag"],
          ].map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Amount type
        <select
          value={draft.availability}
          onChange={(e) => change("availability", e.target.value)}
        >
          {[
            ["have", "Have"],
            ["low", "Low"],
            ["out", "Out"],
            ["exact", "Exact quantity"],
          ].map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {draft.availability === "exact" && (
        <label>
          Amount left
          <input
            type="number"
            min="0"
            max="100"
            required
            value={draft.quantity}
            onChange={(e) => change("quantity", Number(e.target.value))}
          />
        </label>
      )}
      <label>
        Use-by date (optional)
        <input
          type="date"
          value={draft.expiry || ""}
          onChange={(e) => change("expiry", e.target.value)}
        />
      </label>
      <label>
        Notes (optional)
        <textarea
          maxLength={500}
          value={draft.notes || ""}
          onChange={(e) => change("notes", e.target.value)}
        />
      </label>
      <DialogError />
      <div className="sheet-footer">
        <DialogCancel disabled={!!pending} />
        <button
          aria-busy={pending || undefined}
          className="primary"
          disabled={!!pending}
        >
          {pending ? "Saving…" : "Save details"}
        </button>
      </div>
    </form>
  );
}
