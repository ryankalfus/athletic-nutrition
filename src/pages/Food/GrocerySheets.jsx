import { useState } from "react";
import {
  INGREDIENTS,
  SHOPPING_UNIT_CHOICES,
  ingredientId,
  pantryMatch,
  putAwayPlace,
  shoppingAmount,
  shoppingDefaults,
} from "../../domain/food.js";
import { LabelCheck } from "../../components/ui/LabelCheck.jsx";

export const money = (value) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value,
  );
const PLACES = [
  ["pantry", "Kitchen"],
  ["fridge", "Fridge"],
  ["freezer", "Freezer"],
  ["bag", "Bag"],
];

/** GROC-03: "Put these away?" after Finish shopping. */
export function PutAwaySheet({ items, pantry, pending, onCancel, onConfirm }) {
  const [places, setPlaces] = useState(() =>
    Object.fromEntries(items.map((i) => [i.id, putAwayPlace(pantry, i)])),
  );
  return (
    <form
      className="grocery-sheet"
      onSubmit={(e) => {
        e.preventDefault();
        onConfirm(places);
      }}
    >
      <ul className="put-away-list">
        {items.map((item) => {
          const match = pantryMatch(pantry, item);
          return (
            <li key={item.id}>
              <div>
                <strong>{item.name}</strong>
                <small>{match ? `Updates ${match.name} · Have` : "Have"}</small>
              </div>
              <label>
                <span className="sr-only">Place for {item.name}</span>
                <select
                  value={places[item.id]}
                  onChange={(e) =>
                    setPlaces((p) => ({ ...p, [item.id]: e.target.value }))
                  }
                >
                  {PLACES.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </li>
          );
        })}
      </ul>
      <div className="sheet-footer">
        <button type="button" onClick={onCancel} disabled={pending}>
          Cancel
        </button>
        <button
          aria-busy={pending || undefined}
          className="primary"
          disabled={pending}
        >
          {pending ? "Saving…" : "Add to At home"}
        </button>
      </div>
    </form>
  );
}

/** "Add food for this week": suggestions start unchecked (J6 step 7). */
export function WeekIdeasSheet({ ideas, summary, pending, onCancel, onAdd }) {
  const [selected, setSelected] = useState([]);
  return (
    <form
      className="grocery-sheet"
      onSubmit={(e) => {
        e.preventDefault();
        onAdd(ideas.filter((i) => selected.includes(i.id)));
      }}
    >
      <p className="muted">{summary}</p>
      {!ideas.length && (
        <p>Everything we'd suggest is already on your list or at home.</p>
      )}
      <ul className="week-ideas">
        {ideas.map((item) => (
          <li key={item.id}>
            <label className="check-row">
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
                {item.name} · {shoppingAmount(item)}
                <small className="reason-chip">{item.reason}</small>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <div className="sheet-footer">
        <button type="button" onClick={onCancel} disabled={pending}>
          Cancel
        </button>
        <button
          aria-busy={pending || undefined}
          className="primary"
          disabled={!selected.length || pending}
        >
          {pending ? "Adding…" : "Add selected"}
        </button>
      </div>
    </form>
  );
}

/** Add, edit or swap one grocery item. Prices appear only with estimates on. */
export function GroceryItemForm({
  food,
  item,
  showPrices,
  pending,
  onCancel,
  onSave,
}) {
  const resolved = food ? ingredientId(food) : null;
  const [defaultQuantity, defaultUnit] = shoppingDefaults(
    resolved || item?.ingredientId,
  );
  const [draft, setDraft] = useState(() => ({
    name: food ? food.displayName || food.name : item.name,
    quantity: food ? defaultQuantity : (item.quantity ?? 1),
    unit: food ? defaultUnit : item.unit || "package",
    ingredientId: food ? resolved || "" : (ingredientId(item) ?? ""),
    notes: item?.notes || "",
    price: item?.price ?? "",
  }));
  const [error, setError] = useState("");
  const set = (key, value) => setDraft((d) => ({ ...d, [key]: value }));
  const units = SHOPPING_UNIT_CHOICES.includes(draft.unit)
    ? SHOPPING_UNIT_CHOICES
    : [...SHOPPING_UNIT_CHOICES, draft.unit];
  return (
    <form
      className="grocery-sheet home-details"
      onSubmit={(e) => {
        e.preventDefault();
        const quantity = Number(draft.quantity);
        if (!draft.name.trim() || !(quantity > 0) || quantity > 100)
          return setError("Add a name and an amount from 1 to 100.");
        if (showPrices && draft.price !== "" && !(Number(draft.price) >= 0))
          return setError("Prices can't be negative.");
        setError("");
        onSave({
          name: draft.name.trim(),
          quantity,
          unit: draft.unit,
          ingredientId: draft.ingredientId,
          notes: draft.notes,
          ...(showPrices
            ? {
                price: draft.price === "" ? null : Number(draft.price),
                priceKind: draft.price === "" ? null : "user-entered",
              }
            : {}),
        });
      }}
    >
      {food && <LabelCheck />}
      <label>
        Name
        <input
          required
          maxLength={240}
          value={draft.name}
          onChange={(e) => set("name", e.target.value)}
        />
      </label>
      <div className="form-grid">
        <label>
          Amount
          <input
            type="number"
            min="1"
            max="100"
            step="1"
            required
            value={draft.quantity}
            onChange={(e) => set("quantity", e.target.value)}
          />
        </label>
        <label>
          Unit
          <select
            value={draft.unit}
            onChange={(e) => set("unit", e.target.value)}
          >
            {units.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </label>
      </div>
      {!(food && resolved && food.source !== "Manual") && (
        <label>
          Counts as
          <select
            value={draft.ingredientId}
            onChange={(e) => set("ingredientId", e.target.value)}
          >
            <option value="">Nothing specific</option>
            {INGREDIENTS.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
          <small className="muted">
            Ideas that need this food will use it.
          </small>
        </label>
      )}
      {showPrices && (
        <label>
          Price estimate ($, optional)
          <input
            type="number"
            min="0"
            step="0.01"
            value={draft.price}
            onChange={(e) => set("price", e.target.value)}
          />
        </label>
      )}
      <label>
        Notes (optional)
        <textarea
          maxLength={500}
          value={draft.notes}
          onChange={(e) => set("notes", e.target.value)}
        />
      </label>
      {error && <p role="alert">{error}</p>}
      <div className="sheet-footer">
        <button type="button" onClick={onCancel} disabled={pending}>
          Cancel
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
  );
}
