// Selection primitives (DS-12, CMP-03). State is always carried by
// aria-checked / aria-pressed, which the CSS styles directly.

// 2-4 single choices. mode "radio" is a radio group with arrow-key movement;
// mode "pressed" keeps toggle buttons (aria-pressed) for existing forms.
export function SegmentedControl({
  label,
  options,
  value,
  onChange,
  mode = "radio",
  disabled = false,
  firstRef,
}) {
  const radio = mode === "radio";
  const move = (event, index) => {
    if (!radio) return;
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[
      event.key
    ];
    if (!step) return;
    event.preventDefault();
    const next = (index + step + options.length) % options.length;
    onChange(options[next][0]);
    event.currentTarget.parentElement.children[next]?.focus();
  };
  const selectedIndex = options.findIndex(([option]) => option === value);
  return (
    <div
      className="segmented"
      role={radio ? "radiogroup" : "group"}
      aria-label={label}
    >
      {options.map(([option, text], index) => {
        const selected = option === value;
        return (
          <button
            key={option}
            ref={index === 0 ? firstRef : undefined}
            type="button"
            role={radio ? "radio" : undefined}
            aria-checked={radio ? selected : undefined}
            aria-pressed={radio ? undefined : selected}
            tabIndex={
              radio && !(selected || (selectedIndex < 0 && index === 0))
                ? -1
                : undefined
            }
            disabled={disabled}
            onClick={() => onChange(option)}
            onKeyDown={(event) => move(event, index)}
          >
            {text}
          </button>
        );
      })}
    </div>
  );
}

// Multi-select chips with a leading check when selected.
export function ChipGroup({ legend, hint, options, selected, onToggle }) {
  return (
    <fieldset className="choice-field">
      <legend>{legend}</legend>
      {hint && <p className="muted field-hint">{hint}</p>}
      <div className="chip-group">
        {options.map(([value, label]) => (
          <button
            type="button"
            key={value}
            aria-pressed={selected.includes(value)}
            onClick={() => onToggle(value)}
          >
            {label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

// A labelled on/off switch (checkbox with role="switch").
export function SwitchRow({ checked, onChange, label, hint, disabled }) {
  return (
    <label className="check-row switch-row">
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        {label}
        {hint && <small className="muted field-hint">{hint}</small>}
      </span>
    </label>
  );
}
