import { forwardRef } from "react";
import { Button } from "./Button.jsx";

export const InlineError = forwardRef(function InlineError(
  { message, onRetry },
  ref,
) {
  if (!message) return null;
  return (
    <div ref={ref} className="inline-error" role="alert">
      <span>{message}</span>
      {onRetry && <Button onClick={onRetry}>Try again</Button>}
    </div>
  );
});
