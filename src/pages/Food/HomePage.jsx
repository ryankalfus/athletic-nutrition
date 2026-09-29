import { useState, useRef } from "react";
import { useStore, changeData } from "../../store.js";
import { useAsyncAction } from "../../hooks/useAsyncAction.js";
import { Dialog } from "../../components/Dialog.jsx";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog.jsx";
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
} from "../../domain/food.js";

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
  const [discard, setDiscard] = useState(false);
  const [counts, setCounts] = useState({});
  const [countsAs, setCountsAs] = useState(null);
  const timers = useRef({});
  const low = rows.filter((i) => stockStatus(i) !== "have");
  const write = (key, fn, message, action) =>
    run(key, () => changeData(fn, message, action));
  const quick = GROCERY_CATALOG.filter((i) =>
    (data.profile.avoid || data.profile.dietaryNeeds || [])
      .filter((n) => n !== "nutFree")
      .every((n) => i[n]),
  ).slice(0, 8);
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
    if (dirty) setDiscard(true);
    else setEdit(null);
  };
  return (
    <div className="home-page">
      <div className="today-section-header">
        <h2>At home</h2>
        <button className="primary" onClick={() => setSearch(true)}>
          Add food
        </button>
      </div>
      <div className="stock-filters" role="group" aria-label="Stock filter">
        {[
          ["all", "All"],
          ["low", "Low or out"],
          ["bag", "In my bag"],
        ].map(([key, label]) => (
          <button
            key={key}
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {!rows.length && (
        <div className="empty-state">
          <h3>What’s in your kitchen?</h3>
          <p>Add a few staples. Ideas that use them move to the top.</p>
          <button onClick={() => setSearch(true)}>Add food</button>
        </div>
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
                  <h2 id={`place-${id}`}>{label}</h2>
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
                        {!row.availability ||
                        row.availability === "exact" ||
                        (row.availability === "out" &&
                          row.previousAvailability === "exact") ? (
                          <div className="stock-amount">
                            <button
                              aria-label={`Decrease ${row.name}`}
                              disabled={
                                Number(counts[row.id] ?? row.quantity) <= 0 ||
                                row.availability === "out"
                              }
                              onClick={() => step(row, -1)}
                            >
                              −
                            </button>
                            <span>{counts[row.id] ?? row.quantity} left</span>
                            <button
                              aria-label={`Increase ${row.name}`}
                              onClick={() => step(row, 1)}
                            >
                              +
                            </button>
                            {row.availability === "out" && (
                              <button
                                disabled={!!pending}
                                onClick={() =>
                                  write(
                                    "status",
                                    (d) => {
                                      d.groceryState.pantry =
                                        d.groceryState.pantry.map((i) =>
                                          i.id === row.id
                                            ? setStockStatus(
                                                i,
                                                "have",
                                                todayKey,
                                              )
                                            : i,
                                        );
                                    },
                                    null,
                                  )
                                }
                              >
                                Have
                              </button>
                            )}
                          </div>
                        ) : (
                          <div
                            className="stock-control"
                            role="radiogroup"
                            aria-label={`${row.name} stock`}
                          >
                            {[
                              ["have", "Have"],
                              ["low", "Low"],
                              ["out", "Out"],
                            ].map(([status, text]) => (
                              <button
                                key={status}
                                role="radio"
                                aria-checked={stockStatus(row) === status}
                                disabled={!!pending}
                                onClick={() =>
                                  write(
                                    "status",
                                    (d) => {
                                      d.groceryState.pantry =
                                        d.groceryState.pantry.map((i) =>
                                          i.id === row.id
                                            ? setStockStatus(
                                                i,
                                                status,
                                                todayKey,
                                              )
                                            : i,
                                        );
                                    },
                                    null,
                                  )
                                }
                              >
                                {text}
                              </button>
                            ))}
                          </div>
                        )}
                        <details className="row-menu">
                          <summary aria-label={`${row.name} options`}>
                            •••
                          </summary>
                          <button
                            disabled={!!pending}
                            onClick={() =>
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
                              )
                            }
                          >
                            {row.availability === "out"
                              ? "Back in stock"
                              : "Mark out"}
                          </button>
                          <button
                            onClick={() => {
                              setEdit(row);
                              setDirty(false);
                            }}
                          >
                            Edit details
                          </button>
                          {places.flatMap(([, group, locations]) =>
                            locations.filter(location=>location!=="kitchen").map((location) => (
                              <button
                                key={location}
                                disabled={!!pending}
                                onClick={() =>
                                  write(
                                    "move",
                                    (d) => {
                                      d.groceryState.pantry.find(
                                        (i) => i.id === row.id,
                                      ).location = location;
                                    },
                                    `Moved ${row.name} to ${group.toLowerCase()}.`,
                                  )
                                }
                              >
                                Move to{" "}
                                {location === "pantry" ? "kitchen" : location === "bag" ? "my bag" : location}
                              </button>
                            )),
                          )}
                          {stockStatus(row) !== "have" && (
                            <button
                              disabled={!!pending}
                              onClick={() =>
                                write(
                                  "groceries",
                                  (d) => stockToGroceries(d, [row]),
                                  `Added ${row.name} to groceries.`,
                                )
                              }
                            >
                              Add to groceries
                            </button>
                          )}
                          <button
                            disabled={!!pending}
                            onClick={() =>
                              write(
                                "remove",
                                (d) => {
                                  d.groceryState.pantry =
                                    d.groceryState.pantry.filter(
                                      (i) => i.id !== row.id,
                                    );
                                },
                                `Removed ${row.name}.`,
                              )
                            }
                          >
                            Remove
                          </button>
                        </details>
                      </li>
                    ))}
                  </ul>
                </section>
              )
            );
          })}
        </div>
        {low.length > 0 && (
          <aside className="low-summary">
            <h2>Low or out</h2>
            <p>{low.map((i) => i.name).join(", ")}</p>
            <button
              disabled={!!pending}
              onClick={() =>
                write(
                  "all-low",
                  (d) => stockToGroceries(d, low),
                  "Added low or out foods to groceries.",
                )
              }
            >
              Add all to groceries
            </button>
          </aside>
        )}
      </div>
      <section className="quick-add">
        <h2>Quick add</h2>
        <div>
          {quick.map((food) => (
            <button
              key={food.id}
              disabled={!!pending}
              onClick={() =>
                add({ ...food, source: "Quick basic", catalogId: food.id })
              }
            >
              + {food.name}
            </button>
          ))}
        </div>
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
          <button
            disabled={!!pending}
            onClick={() => add(merge.food, "update")}
          >
            Update it
          </button>
          <button disabled={!!pending} onClick={() => add(merge.food, "both")}>
            Keep both
          </button>
        </Dialog>
      )}
      {edit && (
        <Dialog title={`Edit ${edit.name}`} onClose={close}>
          <HomeDetails
            initial={edit}
            pending={pending}
            onDirty={() => setDirty(true)}
            onCancel={close}
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
        <Dialog title="Counts as?" onClose={() => setCountsAs(null)}>
          <CountsAsForm
            row={countsAs}
            pending={!!pending}
            onSkip={() => setCountsAs(null)}
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
        </Dialog>
      )}
      {discard && (
        <ConfirmDialog
          title="Discard changes?"
          body="Your unsaved food details will be lost."
          confirmLabel="Discard changes"
          onCancel={() => setDiscard(false)}
          onConfirm={() => {
            setDiscard(false);
            setEdit(null);
            setDirty(false);
          }}
        />
      )}
    </div>
  );
}
function CountsAsForm({ row, pending, onSkip, onSave }) {
  const [id, setId] = useState("");
  return (
    <form
      className="home-details"
      onSubmit={(e) => {
        e.preventDefault();
        if (id) onSave(id);
        else onSkip();
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
      <div className="sheet-footer">
        <button type="button" onClick={onSkip} disabled={pending}>
          Skip
        </button>
        <button className="primary" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
function HomeDetails({ initial, pending, onDirty, onCancel, onSave }) {
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
      <div className="sheet-footer">
        <button type="button" onClick={onCancel} disabled={!!pending}>
          Cancel
        </button>
        <button className="primary" disabled={!!pending}>
          {pending ? "Saving…" : "Save details"}
        </button>
      </div>
    </form>
  );
}
