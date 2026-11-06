// A unit inside a field (UX-CMP-04): "$" before the value, "min" or "oz"
// after it. Wrap the input; keep the unit in the label for screen readers
// (a visually hidden "(min)"), since the affix itself is decorative.
export function FieldAffix({ prefix, suffix, children }) {
  return (
    <span className="field-affix">
      {prefix && (
        <span className="field-prefix" aria-hidden="true">
          {prefix}
        </span>
      )}
      {children}
      {suffix && (
        <span className="field-suffix" aria-hidden="true">
          {suffix}
        </span>
      )}
    </span>
  );
}
