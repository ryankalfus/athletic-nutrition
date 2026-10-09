import { useState } from "react";
import {
  INGREDIENTS,
  SHOPPING_UNIT_CHOICES,
  ingredientId,
  setStockStatus,
  shoppingDefaults,
} from "../../domain/food.js";
import { LabelCheck } from "../../components/ui/LabelCheck.jsx";
import { DialogCancel, DialogError } from "../../components/Dialog.jsx";
import {
  FieldError,
  FieldErrors,
  FormError,
  Input,
} from "../../components/ui/FieldError.jsx";

const HOME_PLACES = [
  ["pantry", "Kitchen & pantry"],
  ["fridge", "Fridge"],
  ["freezer", "Freezer"],
  ["bag", "In my bag"],
];
const AMOUNT_TYPES = [
  ["have", "Have"],
  ["low", "Low"],
  ["out", "Out"],
  ["exact", "Exact quantity"],
];

function startDraft(mode, food, item) {
  if (mode === "home")
    return {
      ...item,
      availability:
        item.availability === "some" ? "have" : item.availability || "exact",
    };
  const resolved = food ? ingredientId(food) : null;
  const [quantity, unit] = shoppingDefaults(resolved || item?.ingredientId);
  return {
    name: food ? food.displayName || food.name : item.name,
    quantity: food ? quantity : (item.quantity ?? 1),
    unit: food ? unit : item.unit || "package",
    ingredientId: food ? resolved || "" : (ingredientId(item) ?? ""),
    notes: item?.notes || "",
    // Prices read as money: 0.3 shows as 0.30.
    price:
      item?.price == null || item.price === ""
        ? ""
        : Number(item.price).toFixed(2),
  };
}

/**
 * One food's details, shared by At home and Groceries (CMP-13). Both show the
 * label line for a product, the name, "Counts as" and notes. At home adds
 * place, amount type, amount left and use-by date; Groceries adds amount,
 * unit and (with estimates on) a price.
 * @param {{
 *   mode: "home"|"grocery",
 *   food?: any,
 *   item?: any,
 *   showPrices?: boolean,
 *   pending?: boolean,
 *   onDirty?: () => void,
 *   onSave: (fields: any) => void,
 * }} props
 * `item` is the At home row or grocery item being edited; `food` is a food
 * just chosen in search (grocery add or swap).
 */
export function FoodDetailsSheet({
  mode,
  food = null,
  item = null,
  showPrices = false,
  pending = false,
  onDirty,
  onSave,
}) {
  const home = mode === "home";
  const [draft, setDraft] = useState(() => startDraft(mode, food, item));
  const [error, setError] = useState(null);
  const set = (key, value) => {
    setDraft((d) =>
      home && key === "availability" && value === "out"
        ? setStockStatus(d, value, item.updatedDate)
        : { ...d, [key]: value },
    );
    onDirty?.();
  };
  // A food chosen in search that already maps to an ingredient needs no
  // "Counts as" choice in Groceries.
  const resolved = food ? ingredientId(food) : null;
  const askCountsAs = home || !(food && resolved && food.source !== "Manual");
  const labelFood = food || item?.food || null;
  const units = SHOPPING_UNIT_CHOICES.includes(draft.unit)
    ? SHOPPING_UNIT_CHOICES
    : [...SHOPPING_UNIT_CHOICES, draft.unit];

  const submit = (e) => {
    e.preventDefault();
    if (home) return onSave(draft);
    const quantity = Number(draft.quantity);
    if (!draft.name.trim() || !(quantity > 0) || quantity > 100)
      return setError({
        message: "Add a name and an amount from 1 to 100.",
        field: draft.name.trim() ? "quantity" : "name",
      });
    if (showPrices && draft.price !== "" && !(Number(draft.price) >= 0))
      return setError({ message: "Prices can't be negative.", field: "price" });
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
  };

  return (
    <form
      className={`food-details home-details${home ? "" : " grocery-sheet"}`}
      onSubmit={submit}
    >
      <FieldErrors error={error}>
        {labelFood && <LabelCheck food={labelFood} />}
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
        {!home && (
          <>
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
          </>
        )}
        {askCountsAs && (
          <label>
            Counts as
            <select
              value={
                home
                  ? draft.ingredientId || ingredientId(draft) || ""
                  : draft.ingredientId
              }
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
        {home && (
          <>
            <label>
              Place
              <select
                value={draft.location || "pantry"}
                onChange={(e) => set("location", e.target.value)}
              >
                {HOME_PLACES.map(([key, label]) => (
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
                onChange={(e) => set("availability", e.target.value)}
              >
                {AMOUNT_TYPES.map(([key, label]) => (
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
                  onChange={(e) => set("quantity", Number(e.target.value))}
                />
              </label>
            )}
            <label>
              Use-by date (optional)
              <input
                type="date"
                value={draft.expiry || ""}
                onChange={(e) => set("expiry", e.target.value)}
              />
            </label>
          </>
        )}
        {!home && showPrices && (
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
            value={draft.notes || ""}
            onChange={(e) => set("notes", e.target.value)}
          />
        </label>
        <FormError />
      </FieldErrors>
      <DialogError />
      <div className="sheet-footer">
        <DialogCancel disabled={!!pending} />
        <button
          aria-busy={pending || undefined}
          className="primary"
          disabled={!!pending}
        >
          {pending ? "Saving…" : home ? "Save details" : "Save"}
        </button>
      </div>
    </form>
  );
}
