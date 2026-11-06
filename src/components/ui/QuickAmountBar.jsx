// Joined quick amounts (UX-CMP-21). Labels arrive already formatted by the
// caller, so the same control can show water units or food portion amounts.
export function QuickAmountBar({
  label,
  options,
  onChoose,
  onCustom,
  disabled,
}) {
  return (
    <div className="quick-amount-bar" role="group" aria-label={label}>
      {options.map(([value, text]) => (
        <button
          key={value}
          type="button"
          disabled={disabled}
          onClick={() => onChoose(value)}
        >
          <span className="numeral">{text}</span>
        </button>
      ))}
      <button type="button" disabled={disabled} onClick={onCustom}>
        Custom
      </button>
    </div>
  );
}
