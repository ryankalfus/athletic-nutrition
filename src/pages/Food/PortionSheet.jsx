import { useState } from "react";
import { portionCalories, validPortion } from "../../domain/food.js";
import { portionHint, sourceLine } from "../../domain/search.js";
import { APPROX_TIMES, clockTime, entryClock } from "../../domain/log.js";
import { LabelCheck } from "../../components/ui/LabelCheck.jsx";
import { DialogCancel, useReportDirty, DialogError } from "../../components/Dialog.jsx";
import {
  FieldError,
  FieldErrors,
  FormError,
  Input,
  useFieldInvalid,
} from "../../components/ui/FieldError.jsx";
import { SegmentedControl } from "../../components/ui/SelectionControls.jsx";

// When the food was eaten (LOG-04). Today starts at the current time; a past
// day asks for an approximate time or an exact one; an edit keeps the entry's
// time until the athlete changes it.
export function useWhen({ entry, isToday }) {
  const [approx, setApprox] = useState(entry?.approxTime || "");
  const [exact, setExact] = useState(() =>
    entry ? entryClock(entry) : isToday ? clockTime() : "",
  );
  return {
    approx,
    exact,
    setApprox,
    setExact,
    // An edit with no readable time keeps whatever the entry had.
    missing: !approx && !exact && !entry,
    value: exact ? { exact } : approx ? { approx } : {},
  };
}

export function WhenField({ when, isToday }) {
  const invalid = useFieldInvalid("when");
  return (
    <fieldset className="when-field" {...invalid}>
      {/* Today asks one thing, so its label is the only name. */}
      <legend className={isToday ? "sr-only" : undefined}>
        {isToday ? "Time" : "About when?"}
      </legend>
      {!isToday && (
        <SegmentedControl
          label="About when"
          options={APPROX_TIMES.map(([key, label]) => [key, label])}
          value={when.exact ? "" : when.approx}
          onChange={(value) => {
            when.setApprox(value);
            when.setExact("");
          }}
        />
      )}
      <label>
        {isToday ? "Time eaten" : "Or an exact time"}
        <input
          type="time"
          value={when.exact}
          onChange={(e) => {
            when.setExact(e.target.value);
            if (e.target.value) when.setApprox("");
          }}
        />
      </label>
      <FieldError field="when" />
    </fieldset>
  );
}

// The log portion sheet (CMP-13): amount, time, a quiet source line (LOG-06)
// and calories only under "Nutrition details (optional)" (LOG-02).
// `onDirty(bool)` reports unsaved changes so the dialog can ask first (DS-15).
export function PortionSheet({ food, entry, isToday, onSave, onDirty }) {
  const hint = portionHint(food);
  const [name, setName] = useState(
    entry?.name || food.displayName || food.name,
  );
  const [amount, setAmount] = useState(
    entry?.portion?.amount ?? entry?.servingGrams ?? hint?.amount ?? 100,
  );
  const [unit, setUnit] = useState(
    entry?.portion?.unit ||
      (entry?.servingGrams ? "g" : "") ||
      hint?.unit ||
      food.nutrientBasis ||
      "g",
  );
  const [override, setOverride] = useState(
    entry && (entry.userAdjusted || !entry.food) ? (entry.calories ?? "") : "",
  );
  const when = useWhen({ entry, isToday });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const calories = portionCalories(food, amount, unit);
  useReportDirty(
    JSON.stringify([name, amount, unit, override, when.value]),
    onDirty,
  );
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
      setError({
        message:
          "Check the name and amount. Amount must be above zero, up to 2000 g or ml, or 100 of anything else.",
        field: name.trim() ? "amount" : "name",
      });
      return;
    }
    if (when.missing) {
      setError({ message: "Choose about when you ate it.", field: "when" });
      return;
    }
    setBusy(true);
    try {
      await onSave({
        name: name.trim(),
        amount: Number(amount),
        unit,
        override,
        when: when.value,
      });
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  }
  return (
    <form className="portion-form" onSubmit={save}>
      <FieldErrors error={error}>
        <label>
          Food name
          <Input
            field="name"
            required
            maxLength={240}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <FieldError field="name" />
        {hint && <p className="muted">Usual portion: {hint.label}</p>}
        <div className="form-grid">
          <label>
            Amount eaten
            <Input
              field="amount"
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
        <FieldError field="amount" />
        <WhenField when={when} isToday={isToday} />
        <LabelCheck food={food} />
        <p className="food-source">{sourceLine(food)}</p>
        <details>
          <summary>Nutrition details (optional)</summary>
          <p role="status">
            {calories == null
              ? "Calories aren't known for this amount."
              : `About ${calories} kcal for this amount.`}
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
        <FormError />
      </FieldErrors>
      <DialogError />
      <div className="sheet-footer">
        <DialogCancel disabled={busy} />
        <button
          aria-busy={busy || undefined}
          className="primary"
          disabled={busy || !validPortion(amount, unit)}
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
