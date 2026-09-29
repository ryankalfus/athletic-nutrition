import { useState } from "react";
import {
  INGREDIENTS,
  ingredientId,
  portionCalories,
  validPortion,
} from "../domain/food.js";
import { LabelCheck } from "./ui/LabelCheck.jsx";
export function PortionEditor({
  food,
  initial = {},
  destination = "log",
  onSave,
  onCancel,
}) {
  const [name, setName] = useState(
    initial.name || food.displayName || food.name,
  );
  const [amount, setAmount] = useState(
    initial.amount ??
      (destination === "log"
        ? (["g", "ml"].includes(food.servingSizeUnit)
            ? food.servingSize
            : null) || 100
        : 1),
  );
  const [unit, setUnit] = useState(
    initial.unit ||
      (destination === "log"
        ? (["g", "ml"].includes(food.servingSizeUnit)
            ? food.servingSizeUnit
            : food.nutrientBasis) || "g"
        : "package"),
  );
  const [override, setOverride] = useState(initial.override ?? "");
  const [identity, setIdentity] = useState(
    initial.ingredientId ?? ingredientId(food) ?? "",
  );
  const [price, setPrice] = useState(initial.price ?? "");
  const [packageAmount, setPackageAmount] = useState(
    initial.packageAmount ?? "",
  );
  const [packageUnit, setPackageUnit] = useState(initial.packageUnit || "g");
  const [availability, setAvailability] = useState(
    initial.availability || "exact",
  );
  const [location, setLocation] = useState(initial.location || "pantry");
  const [expiry, setExpiry] = useState(initial.expiry || "");
  const [threshold, setThreshold] = useState(initial.lowThreshold ?? 0);
  const [notes, setNotes] = useState(initial.notes || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const calories = portionCalories(food, amount, unit);
  async function save(e) {
    e.preventDefault();
    if (
      !name.trim() ||
      !validPortion(amount, unit) ||
      (price !== "" &&
        (!Number.isFinite(Number(price)) || Number(price) < 0)) ||
      (packageAmount !== "" &&
        (!Number.isFinite(Number(packageAmount)) ||
          !(Number(packageAmount) > 0))) ||
      !Number.isFinite(Number(threshold)) ||
      Number(threshold) < 0 ||
      (override !== "" &&
        (!Number.isFinite(Number(override)) ||
          Number(override) < 0 ||
          Number(override) > 20000))
    ) {
      setError(
        "Check the name, amount, and optional values. Amount must be above zero, up to 2000 g/ml or 100 other units.",
      );
      return;
    }
    setBusy(true);
    try {
      await onSave({
        name: name.trim(),
        amount: Number(amount),
        unit,
        override,
        ingredientId: identity,
        price: price === "" ? null : Number(price),
        packageAmount: packageAmount === "" ? null : Number(packageAmount),
        packageUnit,
        availability,
        location,
        expiry,
        lowThreshold: Number(threshold),
        notes,
      });
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
      <p className="muted">
        {food.nutrients?.calories == null
          ? "Energy unknown"
          : `${food.nutrients.calories} kcal per 100 ${food.nutrientBasis || "g"}`}
        {food.householdServing && ` · Label serving: ${food.householdServing}`}
      </p>
      <small className="food-source">
        Source: {food.source || "Manual food"}
      </small>
      <LabelCheck />
      <div className="form-grid">
        <label>
          {destination === "log" ? "Amount eaten" : "Quantity"}
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
          <select
            value={unit}
            onChange={(e) => {
              setUnit(e.target.value);
              if (destination === "groceries") setPrice("");
            }}
          >
            {["g", "ml", "portion", "piece", "package"].map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </label>
      </div>
      {destination === "log" ? (
        <>
          <p role="status">
            {calories == null
              ? "No verified conversion for this unit. Calories remain unknown unless you enter a value from the label."
              : `${calories} kcal calculated for this amount`}
          </p>
          <label>
            Calories override (optional)
            <input
              type="number"
              min="0"
              max="20000"
              value={override}
              onChange={(e) => setOverride(e.target.value)}
            />
          </label>
        </>
      ) : (
        <>
          <label>
            Counts as
            <select
              value={identity}
              onChange={(e) => setIdentity(e.target.value)}
            >
              <option value="">Choose an ingredient</option>
              {INGREDIENTS.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </label>
          <p className="muted">Ideas that need bananas will use this match.</p>
          <div className="form-grid">
            <label>
              Package contents (optional)
              <input
                type="number"
                min="0.01"
                step="any"
                value={packageAmount}
                onChange={(e) => setPackageAmount(e.target.value)}
              />
            </label>
            <label>
              Contents unit
              <select
                value={packageUnit}
                onChange={(e) => setPackageUnit(e.target.value)}
              >
                {["g", "ml", "portion", "piece"].map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            </label>
          </div>
          {destination === "groceries" && (
            <label>
              Price per selected unit ($, optional)
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </label>
          )}
          {destination === "pantry" && (
            <>
              <label>
                Stock tracking
                <select
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                >
                  <option value="exact">Exact quantity</option>
                  <option value="some">Some — amount approximate</option>
                  <option value="low">Low — amount approximate</option>
                  <option value="out">Out</option>
                </select>
              </label>
              <div className="form-grid">
                <label>
                  Location
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  >
                    <option value="pantry">Pantry</option>
                    <option value="fridge">Fridge</option>
                    <option value="freezer">Freezer</option>
                    <option value="bag">School/team bag</option>
                  </select>
                </label>
                <label>
                  Use-by date (optional)
                  <input
                    type="date"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                  />
                </label>
                <label>
                  Low-stock threshold
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                  />
                </label>
              </div>
            </>
          )}
          <label>
            Notes (optional)
            <input
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
        </>
      )}
      {error && <p role="alert">{error}</p>}
      <div className="button-row">
        <button
          className="primary"
          disabled={busy || !validPortion(amount, unit)}
        >
          Save{" "}
          {destination === "log"
            ? "check-in"
            : destination === "pantry"
              ? "at home"
              : "grocery item"}
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
