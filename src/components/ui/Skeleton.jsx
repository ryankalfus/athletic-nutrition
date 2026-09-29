// Loading placeholder rows for a region (CMP-08). The label is read once;
// the rows are hidden from assistive technology.
export function Skeleton({ label, rows = 3, className = "" }) {
  return (
    <div
      role="status"
      aria-label={label}
      className={`skeleton-list ${className}`.trim()}
    >
      {Array.from({ length: rows }, (_, row) => (
        <span key={row} className="skeleton" aria-hidden="true" />
      ))}
    </div>
  );
}
