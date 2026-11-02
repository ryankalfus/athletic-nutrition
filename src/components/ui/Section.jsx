// Section (UX-CMP-03): a sentence-case title (20/26 650) with an optional
// trailing text button, then its content. It never draws a box. Replaces
// .card, .today-section-header and the grouped-card patterns.
export function Section({
  title,
  action,
  as: Tag = "section",
  className = "",
  children,
  ...props
}) {
  return (
    <Tag className={`section ${className}`.trim()} {...props}>
      <header className="section-head">
        <h2>{title}</h2>
        {action && (
          <button
            type="button"
            className="text-button"
            data-kind="text"
            onClick={action.onClick}
          >
            {action.label}
          </button>
        )}
      </header>
      {children}
    </Tag>
  );
}
