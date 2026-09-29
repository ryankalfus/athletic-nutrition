export function InlineError({ message, onRetry }) {
  if (!message) return null;
  return (
    <div className="inline-error" role="alert">
      <span>{message}</span>
      {onRetry && (
        <button type="button" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
