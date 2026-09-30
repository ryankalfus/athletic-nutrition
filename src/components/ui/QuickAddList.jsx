import { Plus } from "lucide-react";

// One quick-add list (At home "Quick add", search "Quick basics"): secondary
// buttons with a Plus icon in one row that scrolls sideways on phones, so a
// set never wraps into an orphan. Action buttons, not selection chips.
export function QuickAddList({ items, onAdd, disabled = false, label }) {
  return (
    <ul className="quick-add-list" aria-label={label}>
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            disabled={disabled}
            aria-label={`Add ${item.name}`}
            onClick={() => onAdd(item)}
          >
            <Plus size={18} strokeWidth={1.75} aria-hidden="true" />
            {item.name}
          </button>
        </li>
      ))}
    </ul>
  );
}
