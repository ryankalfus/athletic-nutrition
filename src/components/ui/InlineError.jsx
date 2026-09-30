import { Button } from "./Button.jsx";

export function InlineError({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="inline-error" role="alert">
      <span>{message}</span>
      {onRetry && <Button onClick={onRetry}>Try again</Button>}
    </div>
  );
}
