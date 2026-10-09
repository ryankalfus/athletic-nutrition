import { useState } from "react";
import {
  pantryMatch,
  putAwayPlace,
  shoppingAmount,
} from "../../domain/food.js";
// Grocery item add, edit and swap use the shared FoodDetailsSheet (CMP-13).
import {
  DialogCancel,
  DialogError,
  useReportDirty,
} from "../../components/Dialog.jsx";

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
