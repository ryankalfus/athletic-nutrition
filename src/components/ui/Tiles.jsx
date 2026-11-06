// Visual food/category choices (UX-CMP-22). Action tiles omit `selected`;
// multi-select tiles expose their state through aria-pressed. Native buttons
// keep Tab, Space and Enter behavior for both uses.
export function Tiles({
  label,
  items,
  onChoose,
  selected,
  disabled = false,
  buttonLabel,
  iconFor,
}) {
  return (
    <ul className="tiles" aria-label={label}>
      {items.map((item) => {
        const Icon = iconFor ? iconFor(item) : item.icon;
        return (
          <li key={item.id}>
            <button
              type="button"
              disabled={disabled}
              aria-label={buttonLabel?.(item)}
              aria-pressed={selected ? selected.includes(item.id) : undefined}
              onClick={() => onChoose(item)}
            >
              <Icon size={28} strokeWidth={1.75} aria-hidden="true" />
              <span>{item.name}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
