// Athlete avatar: the first letter of the name on the selected tint.
// One look everywhere (rail, You, This device, Welcome); lime stays reserved
// for "now". Sizes: sm 32px (frame), md 40px (lists), lg 48px (Welcome tiles).
export function Avatar({ name = "", size = "md", className = "" }) {
  return (
    <span
      className={`avatar avatar-${size} ${className}`.trim()}
      aria-hidden="true"
    >
      {String(name).trim().charAt(0).toUpperCase() || "A"}
    </span>
  );
}
