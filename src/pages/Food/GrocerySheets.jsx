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
import {
  DialogCancel,
  DialogError,
  useReportDirty,
} from "../../components/Dialog.jsx";
import {
  FieldError,
  FieldErrors,
  FormError,
  Input,
} from "../../components/ui/FieldError.jsx";

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
export function PutAwaySheet({ items, pantry, pending, onDirty, onConfirm }) {
  const [places, setPlaces] = useState(() =>
    Object.fromEntries(items.map((i) => [i.id, putAwayPlace(pantry, i)])),
  );
  // A changed place asks "Discard changes?" on Escape, × and Cancel (DLG-02).
  useReportDirty(JSON.stringify(places), onDirty);
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
                <small>
                  {match
                    ? `Already at home: ${match.name} will be marked Have`
                    : "New at home"}
                </small>
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
      <DialogError />
      <div className="sheet-footer">
        <DialogCancel disabled={pending} />
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
export function WeekIdeasSheet({ ideas, summary, pending, onDirty, onAdd }) {
  const [selected, setSelected] = useState([]);
  // A checked suggestion asks "Discard changes?" before closing (DLG-02).
  useReportDirty(selected.length > 0 ? "dirty" : "", onDirty);
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
      <DialogError />
      <div className="sheet-footer">
        <DialogCancel disabled={pending} />
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
  onDirty,
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
    // Prices read as money: 0.3 shows as 0.30.
    price:
      item?.price == null || item.price === ""
        ? ""
        : Number(item.price).toFixed(2),
  }));
  const [error, setError] = useState(null);
  const set = (key, value) => {
    setDraft((d) => ({ ...d, [key]: value }));
    onDirty?.();
  };
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
          return setError({
            message: "Add a name and an amount from 1 to 100.",
            field: draft.name.trim() ? "quantity" : "name",
          });
        if (showPrices && draft.price !== "" && !(Number(draft.price) >= 0))
          return setError({
            message: "Prices can't be negative.",
            field: "price",
          });
        setError(null);
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
      <FieldErrors error={error}>
        {food && <LabelCheck food={food} />}
        <label>
          Name
          <Input
            field="name"
            required
            maxLength={240}
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </label>
        <FieldError field="name" />
        <div className="form-grid">
          <label>
            Amount
            <Input
              field="quantity"
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
                  {unit.charAt(0).toUpperCase() + unit.slice(1)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <FieldError field="quantity" />
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
          <>
            <label>
              Price estimate ($, optional)
              <Input
                field="price"
                type="number"
                min="0"
                step="0.01"
                value={draft.price}
                onChange={(e) => set("price", e.target.value)}
              />
            </label>
            <FieldError field="price" />
          </>
        )}
        <label>
          Notes (optional)
          <textarea
            maxLength={500}
            value={draft.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </label>
        <FormError />
      </FieldErrors>
      <DialogError />
      <div className="sheet-footer">
        <DialogCancel disabled={pending} />
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
