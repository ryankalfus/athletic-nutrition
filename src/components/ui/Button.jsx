import { forwardRef } from "react";

// Buttons (CMP-02, DS-11). The look lives in components.css; these components
// pick the class, default type="button", and carry the busy state so every
// button shows the spinner and verb label the same way.
const variants = {
  secondary: "",
  primary: "primary",
  text: "text-button",
  destructive: "danger-button",
};

export const Button = forwardRef(function Button(
  {
    variant = "secondary",
    busy = false,
    busyLabel,
    block = false,
    className = "",
    type = "button",
    disabled,
    children,
    ...props
  },
  ref,
) {
  const classes = [variants[variant], block && "button-block", className]
    .filter(Boolean)
    .join(" ");
  return (
    <button
      ref={ref}
      type={type}
      className={classes || undefined}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...props}
    >
      {busy && busyLabel ? busyLabel : children}
    </button>
  );
});

// A 44 × 44 icon-only button. `label` is required: it is the accessible name.
export const IconButton = forwardRef(function IconButton(
  { label, icon: Icon, className = "", type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`icon-button ${className}`.trim()}
      aria-label={label}
      {...props}
    >
      <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
    </button>
  );
});
