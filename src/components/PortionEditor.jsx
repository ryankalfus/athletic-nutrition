import { useState } from "react";
import { portionCalories, validPortion } from "../domain/food.js";
import { LabelCheck } from "./ui/LabelCheck.jsx";

// Log portions only. At home uses HomeDetails (pages/Food/HomePage.jsx) and
// Groceries uses GroceryItemForm (pages/Food/GrocerySheets.jsx).
export function PortionEditor({ food, initial = {}, onSave, onCancel }) {
  const [name, setName] = useState(
    initial.name || food.displayName || food.name,
  );
  const [amount, setAmount] = useState(
    initial.amount ??
      ((["g", "ml"].includes(food.servingSizeUnit) ? food.servingSize : null) ||
        100),
  );
  const [unit, setUnit] = useState(
    initial.unit ||
      (["g", "ml"].includes(food.servingSizeUnit)
        ? food.servingSizeUnit
        : food.nutrientBasis) ||
      "g",
  );
  const [override, setOverride] = useState(initial.override ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const calories = portionCalories(food, amount, unit);
  async function save(e) {
    e.preventDefault();
    if (busy) return;
    if (
      !name.trim() ||
      !validPortion(amount, unit) ||
      (override !== "" &&
        (!Number.isFinite(Number(override)) ||
          Number(override) < 0 ||
          Number(override) > 20000))
    ) {
      setError(
        "Check the name and amount. Amount must be above zero, up to 2000 g or ml, or 100 of anything else.",
      );
      return;
    }
    setBusy(true);
    try {
      await onSave({ name: name.trim(), amount: Number(amount), unit, override });
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  }
  return (
    <form className="portion-form" onSubmit={save}>
      <label>
        Food name
        <input
          required
          maxLength={240}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      {food.householdServing && (
        <p className="muted">Label serving: {food.householdServing}</p>
      )}
      <LabelCheck food={food} />
      <div className="form-grid">
        <label>
          Amount eaten
          <input
            required
            type="number"
            step="any"
            min="0.01"
            max={["g", "ml"].includes(unit) ? 2000 : 100}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label>
          Unit
          <select value={unit} onChange={(e) => setUnit(e.target.value)}>
            {["g", "ml", "portion", "piece", "package"].map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </label>
      </div>
      <details>
        <summary>Nutrition details</summary>
        <p role="status">
          {calories == null
            ? "Calories aren't known for this amount."
            : `About ${calories} kcal`}
        </p>
        <label>
          Use your own calorie number (optional)
          <input
            type="number"
            min="0"
            max="20000"
            value={override}
            onChange={(e) => setOverride(e.target.value)}
          />
        </label>
      </details>
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      <div className="button-row">
        <button
          aria-busy={busy || undefined}
          className="primary"
          disabled={busy || !validPortion(amount, unit)}
        >
          {busy ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </div>
    </form>
  );
}
